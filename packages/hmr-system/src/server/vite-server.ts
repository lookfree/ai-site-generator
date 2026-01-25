/**
 * Vite Dev Server 管理器
 */

import { createServer, type ViteDevServer, type InlineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { EventEmitter } from 'events';
import type { ProjectServerConfig, ProjectServer } from '../types';

interface ViteServerManagerOptions {
  /** 基础端口 */
  basePort?: number;
  /** 最大服务器数 */
  maxServers?: number;
  /** JSX Tagger 插件 */
  jsxTaggerPlugin?: (options: any) => any;
}

/**
 * Vite Dev Server 管理器
 * 管理多个项目的 Vite Dev Server 实例
 */
export class ViteServerManager extends EventEmitter {
  private servers = new Map<string, ProjectServer>();
  private portPool: number[] = [];
  private basePort: number;
  private maxServers: number;
  private jsxTaggerPlugin?: (options: any) => any;

  constructor(options: ViteServerManagerOptions = {}) {
    super();
    this.basePort = options.basePort ?? 5173;
    this.maxServers = options.maxServers ?? 10;
    this.jsxTaggerPlugin = options.jsxTaggerPlugin;

    // 初始化端口池
    for (let i = 0; i < this.maxServers; i++) {
      this.portPool.push(this.basePort + i);
    }
  }

  /**
   * 为项目启动 Vite Dev Server
   */
  async startServer(projectId: string, projectPath: string): Promise<ProjectServer> {
    // 检查是否已存在
    const existing = this.servers.get(projectId);
    if (existing) {
      if (existing.status === 'running') {
        return existing;
      }
      // 如果状态不是 running，先停止再重启
      await this.stopServer(projectId);
    }

    // 获取可用端口
    const port = this.allocatePort();
    if (!port) {
      throw new Error('No available ports. Maximum server limit reached.');
    }

    const config: ProjectServerConfig = {
      projectId,
      projectPath,
      port,
    };

    const projectServer: ProjectServer = {
      server: null as any,
      config,
      status: 'starting',
      startTime: Date.now(),
    };

    this.servers.set(projectId, projectServer);

    try {
      const viteConfig = this.createViteConfig(config);
      const server = await createServer(viteConfig);
      await server.listen();

      projectServer.server = server;
      projectServer.status = 'running';

      console.log(`[HMR] Project ${projectId} started on port ${port}`);

      // 设置 HMR 事件监听
      this.setupHmrListeners(server, projectId);

      this.emit('server:started', { projectId, port });

      return projectServer;

    } catch (error: any) {
      projectServer.status = 'error';
      projectServer.error = error.message;
      this.releasePort(port);
      this.emit('server:error', { projectId, error });
      throw error;
    }
  }

  /**
   * 停止项目的 Dev Server
   */
  async stopServer(projectId: string): Promise<void> {
    const projectServer = this.servers.get(projectId);
    if (!projectServer) return;

    try {
      if (projectServer.server) {
        await projectServer.server.close();
      }
      this.releasePort(projectServer.config.port);
      this.servers.delete(projectId);

      console.log(`[HMR] Project ${projectId} stopped`);
      this.emit('server:stopped', { projectId });

    } catch (error: any) {
      console.error(`[HMR] Error stopping project ${projectId}:`, error);
      // 仍然清理服务器记录
      this.servers.delete(projectId);
      this.releasePort(projectServer.config.port);
    }
  }

  /**
   * 重启项目的 Dev Server
   */
  async restartServer(projectId: string): Promise<ProjectServer> {
    const existing = this.servers.get(projectId);
    if (!existing) {
      throw new Error(`Server for project ${projectId} not found`);
    }

    const { projectPath } = existing.config;
    await this.stopServer(projectId);
    return this.startServer(projectId, projectPath);
  }

  /**
   * 获取项目的服务器信息
   */
  getServer(projectId: string): ProjectServer | undefined {
    return this.servers.get(projectId);
  }

  /**
   * 获取项目的预览 URL
   */
  getPreviewUrl(projectId: string): string | null {
    const server = this.servers.get(projectId);
    if (!server || server.status !== 'running') return null;
    return `http://localhost:${server.config.port}`;
  }

  /**
   * 获取所有活动的服务器
   */
  getAllServers(): Map<string, ProjectServer> {
    return new Map(this.servers);
  }

  /**
   * 获取服务器数量
   */
  getServerCount(): number {
    return this.servers.size;
  }

  /**
   * 检查服务器是否运行中
   */
  isRunning(projectId: string): boolean {
    const server = this.servers.get(projectId);
    return server?.status === 'running';
  }

  /**
   * 手动触发文件变更 (用于测试)
   */
  notifyFileChange(projectId: string, filePath: string): void {
    const projectServer = this.servers.get(projectId);
    if (!projectServer?.server) return;

    // Vite 会自动检测文件变化，但也可以手动触发
    projectServer.server.watcher.emit('change', filePath);
  }

  /**
   * 创建 Vite 配置
   */
  private createViteConfig(config: ProjectServerConfig): InlineConfig {
    const plugins: any[] = [];

    // JSX Tagger 插件 (如果提供)
    if (this.jsxTaggerPlugin) {
      plugins.push(
        this.jsxTaggerPlugin({
          idPrefix: config.projectId.slice(0, 8),
        })
      );
    }

    // React Fast Refresh (enabled by default)
    plugins.push(react());

    return {
      root: config.projectPath,

      plugins,

      server: {
        port: config.port,
        strictPort: true,
        host: true,

        hmr: {
          protocol: 'ws',
          host: 'localhost',
          port: config.port,
          overlay: false, // 禁用错误覆盖层 (我们自己处理)
        },

        watch: {
          usePolling: false,
          interval: 100,
        },

        // CORS 配置
        cors: true,

        // 允许外部访问
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      },

      // 优化依赖
      optimizeDeps: {
        include: ['react', 'react-dom'],
      },

      // 构建配置
      build: {
        sourcemap: true,
      },

      // 日志级别
      logLevel: 'info',
    };
  }

  /**
   * 设置 HMR 事件监听
   */
  private setupHmrListeners(server: ViteDevServer, projectId: string): void {
    // 监听 WebSocket 连接
    server.ws.on('connection', (socket) => {
      console.log(`[HMR] Client connected for project ${projectId}`);
      this.emit('hmr:connected', { projectId });

      socket.on('close', () => {
        console.log(`[HMR] Client disconnected for project ${projectId}`);
        this.emit('hmr:disconnected', { projectId });
      });
    });

    // 监听文件变化
    server.watcher.on('change', (file) => {
      console.log(`[HMR] File changed: ${file}`);
      this.emit('file:changed', { projectId, file });
    });

    server.watcher.on('add', (file) => {
      console.log(`[HMR] File added: ${file}`);
      this.emit('file:added', { projectId, file });
    });

    server.watcher.on('unlink', (file) => {
      console.log(`[HMR] File removed: ${file}`);
      this.emit('file:removed', { projectId, file });
    });
  }

  /**
   * 端口分配
   */
  private allocatePort(): number | null {
    return this.portPool.shift() || null;
  }

  private releasePort(port: number): void {
    if (!this.portPool.includes(port)) {
      this.portPool.push(port);
      this.portPool.sort((a, b) => a - b);
    }
  }

  /**
   * 关闭所有服务器
   */
  async shutdown(): Promise<void> {
    const projectIds = Array.from(this.servers.keys());
    await Promise.all(projectIds.map(id => this.stopServer(id)));
    console.log('[HMR] All servers shutdown');
  }
}

// 默认导出单例
export const viteServerManager = new ViteServerManager();
