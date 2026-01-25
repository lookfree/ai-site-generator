/**
 * HMR WebSocket 代理
 * 将客户端 HMR 连接代理到对应项目的 Vite Dev Server
 */

import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { viteManager } from './vite-manager';
import type { HmrMessage } from '../types';

export class HmrWebSocketProxy {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>> = new Map();
  private viteConnections: Map<string, WebSocket> = new Map();

  constructor(server: Server, path: string = '/hmr') {
    this.wss = new WebSocketServer({ server, path });
    this.setupServer();
    console.log(`[HMR Proxy] WebSocket server started on path: ${path}`);
  }

  private setupServer(): void {
    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const projectId = url.searchParams.get('projectId');

      if (!projectId) {
        console.warn('[HMR Proxy] Connection rejected: missing projectId');
        ws.close(1008, 'Missing projectId');
        return;
      }

      console.log(`[HMR Proxy] Client connected: ${projectId}`);
      this.addClient(projectId, ws);

      ws.on('message', (data) => {
        this.forwardToVite(projectId, data);
      });

      ws.on('close', () => {
        console.log(`[HMR Proxy] Client disconnected: ${projectId}`);
        this.removeClient(projectId, ws);
      });

      ws.on('error', (error) => {
        console.error(`[HMR Proxy] Client error for ${projectId}:`, error.message);
      });
    });

    this.wss.on('error', (error) => {
      console.error('[HMR Proxy] Server error:', error);
    });
  }

  private addClient(projectId: string, ws: WebSocket): void {
    if (!this.clients.has(projectId)) {
      this.clients.set(projectId, new Set());
    }
    this.clients.get(projectId)!.add(ws);

    // 确保连接到 Vite
    this.ensureViteConnection(projectId);

    // 标记项目活跃
    viteManager.markActive(projectId);
  }

  private removeClient(projectId: string, ws: WebSocket): void {
    const clients = this.clients.get(projectId);
    if (clients) {
      clients.delete(ws);

      // 如果没有客户端了，断开 Vite 连接
      if (clients.size === 0) {
        this.clients.delete(projectId);
        this.disconnectVite(projectId);
      }
    }
  }

  private ensureViteConnection(projectId: string): void {
    if (this.viteConnections.has(projectId)) {
      return;
    }

    const hmrUrl = viteManager.getHmrUrl(projectId);
    if (!hmrUrl) {
      console.warn(`[HMR Proxy] No Vite HMR URL for ${projectId}`);
      return;
    }

    const viteWsUrl = `${hmrUrl}/__vite_hmr`;

    try {
      const viteWs = new WebSocket(viteWsUrl);

      viteWs.on('open', () => {
        console.log(`[HMR Proxy] Connected to Vite: ${projectId}`);
        this.viteConnections.set(projectId, viteWs);
      });

      viteWs.on('message', (data) => {
        this.broadcastToClients(projectId, data);
      });

      viteWs.on('close', () => {
        console.log(`[HMR Proxy] Disconnected from Vite: ${projectId}`);
        this.viteConnections.delete(projectId);
      });

      viteWs.on('error', (error) => {
        console.error(`[HMR Proxy] Vite connection error for ${projectId}:`, error.message);
        this.viteConnections.delete(projectId);
      });
    } catch (error) {
      console.error(`[HMR Proxy] Failed to connect to Vite for ${projectId}:`, error);
    }
  }

  private disconnectVite(projectId: string): void {
    const viteWs = this.viteConnections.get(projectId);
    if (viteWs) {
      viteWs.close();
      this.viteConnections.delete(projectId);
      console.log(`[HMR Proxy] Disconnected Vite connection: ${projectId}`);
    }
  }

  private forwardToVite(projectId: string, data: WebSocket.RawData): void {
    const viteWs = this.viteConnections.get(projectId);
    if (viteWs && viteWs.readyState === WebSocket.OPEN) {
      viteWs.send(data);
    }
  }

  private broadcastToClients(projectId: string, data: WebSocket.RawData): void {
    const clients = this.clients.get(projectId);
    if (!clients) return;

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /**
   * 主动推送 HMR 更新
   */
  pushUpdate(projectId: string, message: HmrMessage): void {
    const data = JSON.stringify(message);
    const clients = this.clients.get(projectId);
    if (!clients) return;

    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }

  /**
   * 获取连接的客户端数
   */
  getClientCount(projectId: string): number {
    return this.clients.get(projectId)?.size ?? 0;
  }

  /**
   * 获取所有连接的项目
   */
  getConnectedProjects(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * 关闭代理
   */
  close(): void {
    // 关闭所有 Vite 连接
    for (const ws of this.viteConnections.values()) {
      ws.close();
    }
    this.viteConnections.clear();

    // 关闭所有客户端连接
    for (const clients of this.clients.values()) {
      for (const client of clients) {
        client.close();
      }
    }
    this.clients.clear();

    // 关闭 WebSocket 服务器
    this.wss.close();
    console.log('[HMR Proxy] Closed');
  }
}
