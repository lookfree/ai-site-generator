/**
 * HMR 客户端
 * 在浏览器中连接 Vite HMR WebSocket
 */

import { EventEmitter } from 'events';
import type { HmrUpdate, HmrError, HmrMessage } from '../types';

export interface HmrClientOptions {
  /** 服务器 URL */
  serverUrl: string;
  /** 项目 ID */
  projectId: string;
  /** 更新回调 */
  onUpdate?: (update: HmrUpdate) => void;
  /** 错误回调 */
  onError?: (error: HmrError) => void;
  /** 连接回调 */
  onConnected?: () => void;
  /** 断开回调 */
  onDisconnected?: () => void;
  /** 完全重载回调 */
  onFullReload?: () => void;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 重连延迟 (ms) */
  reconnectDelay?: number;
}

/**
 * HMR 客户端
 */
export class HmrClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private options: HmrClientOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private reconnectDelay: number;
  private isConnecting = false;
  private isManualDisconnect = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: HmrClientOptions) {
    super();
    this.options = options;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
    this.reconnectDelay = options.reconnectDelay ?? 1000;
  }

  /**
   * 连接到 Vite HMR 服务器
   */
  connect(): void {
    if (this.ws || this.isConnecting) return;

    this.isConnecting = true;
    this.isManualDisconnect = false;

    // 构建 WebSocket URL
    const wsUrl = this.options.serverUrl.replace(/^http/, 'ws') + '/__vite_hmr';

    try {
      this.ws = new WebSocket(wsUrl, 'vite-hmr');

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log(`[HMR Client] Connected to ${this.options.projectId}`);
        this.options.onConnected?.();
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.ws = null;
        console.log(`[HMR Client] Disconnected from ${this.options.projectId}`);
        this.options.onDisconnected?.();
        this.emit('disconnected');

        if (!this.isManualDisconnect) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        console.error(`[HMR Client] Error:`, error);
        this.emit('error', error);
      };

    } catch (error) {
      this.isConnecting = false;
      console.error(`[HMR Client] Connection failed:`, error);
      this.scheduleReconnect();
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.isManualDisconnect = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 获取连接状态
   */
  getState(): 'connecting' | 'connected' | 'disconnected' | 'reconnecting' {
    if (this.isConnecting) return 'connecting';
    if (this.isConnected()) return 'connected';
    if (this.reconnectTimer) return 'reconnecting';
    return 'disconnected';
  }

  /**
   * 处理 HMR 消息
   */
  private handleMessage(data: string): void {
    try {
      const message: HmrMessage = JSON.parse(data);

      switch (message.type) {
        case 'connected':
          console.log('[HMR] Handshake complete');
          this.emit('handshake');
          break;

        case 'update':
          this.handleUpdate(message);
          break;

        case 'full-reload':
          console.log('[HMR] Full reload triggered');
          this.options.onFullReload?.();
          this.emit('full-reload', message);
          break;

        case 'prune':
          console.log('[HMR] Modules pruned:', message.paths);
          this.emit('prune', { paths: message.paths });
          break;

        case 'error':
          console.error('[HMR] Error:', message.err);
          if (message.err) {
            this.options.onError?.(message.err);
            this.emit('hmr-error', message.err);
          }
          break;

        case 'custom':
          this.emit('custom', message.data);
          break;

        default:
          console.log('[HMR] Unknown message type:', message);
      }

    } catch (error) {
      console.error('[HMR Client] Failed to parse message:', error);
    }
  }

  /**
   * 处理更新消息
   */
  private handleUpdate(message: HmrMessage): void {
    const updates = message.updates || [];

    for (const update of updates) {
      const hmrUpdate: HmrUpdate = {
        type: update.type,
        path: update.path,
        acceptedPath: update.acceptedPath,
        timestamp: update.timestamp,
      };

      console.log(`[HMR] Update: ${update.type} - ${update.path}`);

      this.options.onUpdate?.(hmrUpdate);
      this.emit('update', hmrUpdate);
    }
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[HMR Client] Max reconnect attempts reached');
      this.emit('max-reconnect-reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(`[HMR Client] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * 发送自定义消息
   */
  send(type: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  /**
   * 重置重连计数
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
  }
}

/**
 * 创建 HMR 客户端
 */
export function createHmrClient(options: HmrClientOptions): HmrClient {
  return new HmrClient(options);
}
