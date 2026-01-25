/**
 * Vite Dev Server 管理器
 * 管理多个项目的 Vite 开发服务器进程
 */

import { spawn, type ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import type { ViteInstance, ViteManagerConfig, ViteStatus, LogEvent, ExitEvent } from '../types';

const DEFAULT_CONFIG: ViteManagerConfig = {
  basePort: 5200,
  maxInstances: 20,
  idleTimeout: 30 * 60 * 1000,  // 30 分钟
  startupTimeout: 60 * 1000,    // 60 秒
};

export class ViteDevServerManager extends EventEmitter {
  private instances: Map<string, ViteInstance> = new Map();
  private portPool: Set<number> = new Set();
  private config: ViteManagerConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<ViteManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 初始化端口池
    for (let i = 0; i < this.config.maxInstances; i++) {
      this.portPool.add(this.config.basePort + i);
    }

    // 启动空闲清理定时器
    this.cleanupTimer = setInterval(() => this.cleanupIdle(), 60 * 1000);
  }

  /**
   * 启动项目的 Vite Dev Server
   */
  async start(projectId: string, projectPath: string): Promise<ViteInstance> {
    // 如果已运行，更新活跃时间并返回
    const existing = this.instances.get(projectId);
    if (existing && existing.status === 'running') {
      existing.lastActive = new Date();
      return existing;
    }

    // 分配端口
    const port = this.allocatePort();
    if (port === null) {
      throw new Error('No available ports. Max instances reached.');
    }

    // 创建实例
    const instance: ViteInstance = {
      projectId,
      port,
      process: null as unknown as ChildProcess,
      startedAt: new Date(),
      lastActive: new Date(),
      status: 'starting',
    };

    this.instances.set(projectId, instance);

    try {
      // 确保 vite.config 允许所有 hosts
      await this.ensureAllowedHosts(projectPath);

      // 启动 Vite 进程
      const proc = spawn('bun', [
        'run', 'vite',
        '--host', '0.0.0.0',
        '--port', String(port),
        '--strictPort',
      ], {
        cwd: projectPath,
        env: { ...process.env, NODE_ENV: 'development' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      instance.process = proc;

      // 监听输出
      this.setupProcessListeners(instance);

      // 等待服务器就绪
      await this.waitForReady(port);

      instance.status = 'running';
      this.emit('started', { projectId, port });

      console.log(`[ViteManager] Started: ${projectId} on port ${port}`);

      return instance;
    } catch (error) {
      instance.status = 'error';
      this.releasePort(port);
      this.instances.delete(projectId);
      console.error(`[ViteManager] Failed to start ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * 停止项目的 Vite Dev Server
   */
  async stop(projectId: string): Promise<void> {
    const instance = this.instances.get(projectId);
    if (!instance) return;

    instance.status = 'stopping';

    // 优雅关闭
    instance.process.kill('SIGTERM');

    // 等待进程退出 (最多 5 秒)
    await Promise.race([
      new Promise<void>(resolve => {
        instance.process.on('exit', () => resolve());
      }),
      new Promise<void>(resolve => {
        setTimeout(() => {
          if (instance.process.killed === false) {
            instance.process.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      }),
    ]);

    instance.status = 'stopped';
    this.releasePort(instance.port);
    this.instances.delete(projectId);
    this.emit('stopped', { projectId });

    console.log(`[ViteManager] Stopped: ${projectId}`);
  }

  /**
   * 确保 vite.config 允许所有 hosts
   */
  private async ensureAllowedHosts(projectPath: string): Promise<void> {
    const configPath = join(projectPath, 'vite.config.ts');

    try {
      let content = await readFile(configPath, 'utf-8');

      // 检查是否已经有 allowedHosts 配置
      if (content.includes('allowedHosts')) {
        return; // 已配置，无需修改
      }

      // 在 server 配置中添加 allowedHosts: 'all'
      if (content.includes('server:')) {
        content = content.replace(
          /server:\s*{/,
          "server: {\n    allowedHosts: 'all',"
        );
      } else if (content.includes('defineConfig({')) {
        // 如果没有 server 配置，添加一个
        content = content.replace(
          /defineConfig\({/,
          "defineConfig({\n  server: {\n    allowedHosts: 'all',\n  },"
        );
      }

      await writeFile(configPath, content, 'utf-8');
      console.log(`[ViteManager] Updated vite.config.ts with allowedHosts`);
    } catch (error) {
      console.warn(`[ViteManager] Failed to update vite.config.ts:`, error);
      // 不阻止启动，继续尝试
    }
  }

  /**
   * 获取实例信息
   */
  getInstance(projectId: string): ViteInstance | undefined {
    return this.instances.get(projectId);
  }

  /**
   * 获取预览 URL
   */
  getPreviewUrl(projectId: string): string | null {
    const instance = this.instances.get(projectId);
    if (!instance || instance.status !== 'running') return null;
    return `http://localhost:${instance.port}`;
  }

  /**
   * 获取 HMR WebSocket URL
   */
  getHmrUrl(projectId: string): string | null {
    const instance = this.instances.get(projectId);
    if (!instance || instance.status !== 'running') return null;
    return `ws://localhost:${instance.port}`;
  }

  /**
   * 标记活跃 (防止被清理)
   */
  markActive(projectId: string): void {
    const instance = this.instances.get(projectId);
    if (instance) {
      instance.lastActive = new Date();
    }
  }

  /**
   * 获取运行中的实例数
   */
  getRunningCount(): number {
    return Array.from(this.instances.values())
      .filter(i => i.status === 'running')
      .length;
  }

  /**
   * 获取所有实例的状态
   */
  getAllInstances(): Array<{ projectId: string; port: number; status: ViteStatus; lastActive: Date }> {
    return Array.from(this.instances.values()).map(i => ({
      projectId: i.projectId,
      port: i.port,
      status: i.status,
      lastActive: i.lastActive,
    }));
  }

  /**
   * 销毁管理器
   */
  async destroy(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    // 停止所有实例
    const stopPromises = Array.from(this.instances.keys()).map(id => this.stop(id));
    await Promise.all(stopPromises);
  }

  private allocatePort(): number | null {
    const iterator = this.portPool.values();
    const result = iterator.next();
    if (!result.done) {
      this.portPool.delete(result.value);
      return result.value;
    }
    return null;
  }

  private releasePort(port: number): void {
    this.portPool.add(port);
  }

  private setupProcessListeners(instance: ViteInstance): void {
    const { process: proc, projectId } = instance;

    proc.stdout?.on('data', (data: Buffer) => {
      const event: LogEvent = {
        projectId,
        type: 'stdout',
        message: data.toString()
      };
      this.emit('log', event);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const event: LogEvent = {
        projectId,
        type: 'stderr',
        message: data.toString()
      };
      this.emit('log', event);
    });

    proc.on('exit', (code: number | null) => {
      const event: ExitEvent = { projectId, code };
      this.emit('exit', event);

      if (instance.status !== 'stopping' && instance.status !== 'stopped') {
        // 非正常退出
        console.error(`[ViteManager] Process exited unexpectedly: ${projectId}, code: ${code}`);
        this.releasePort(instance.port);
        this.instances.delete(projectId);
      }
    });

    proc.on('error', (error: Error) => {
      console.error(`[ViteManager] Process error: ${projectId}`, error);
      instance.status = 'error';
    });
  }

  private async waitForReady(port: number): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < this.config.startupTimeout) {
      try {
        const response = await fetch(`http://localhost:${port}`, {
          method: 'HEAD',
        });
        // Vite 可能返回 200 或 404 (当没有 index.html 时)
        if (response.ok || response.status === 404) {
          return;
        }
      } catch {
        // 服务器尚未就绪，继续等待
      }
      await new Promise(r => setTimeout(r, 200));
    }

    throw new Error(`Vite startup timeout after ${this.config.startupTimeout}ms`);
  }

  private cleanupIdle(): void {
    const now = Date.now();

    for (const [projectId, instance] of this.instances) {
      if (instance.status === 'running') {
        const idleTime = now - instance.lastActive.getTime();
        if (idleTime > this.config.idleTimeout) {
          console.log(`[ViteManager] Stopping idle instance: ${projectId} (idle for ${Math.round(idleTime / 1000)}s)`);
          this.stop(projectId).catch(err => {
            console.error(`[ViteManager] Failed to stop idle instance ${projectId}:`, err);
          });
        }
      }
    }
  }
}

// 导出单例
export const viteManager = new ViteDevServerManager();
