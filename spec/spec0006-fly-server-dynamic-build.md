# SPEC-0006: Fly-Server 动态构建升级

> **阶段**: M6 (第 11-12 周)
> **状态**: ✅ 已完成
> **优先级**: P0 - 核心基础设施
> **依赖**: SPEC-0001, SPEC-0005

## 实施状态

### Week 11 完成情况

| 任务 ID | 任务描述 | 状态 |
|---------|---------|------|
| T11.1 | 重构 fly-server 项目结构 | ✅ 完成 |
| T11.2 | 实现 ViteDevServerManager | ✅ 完成 |
| T11.3 | 实现 HmrWebSocketProxy | ✅ 完成 |
| T11.4 | 实现 ProjectManager | ✅ 完成 |
| T11.5 | 实现 DependencyManager | ✅ 完成 |
| T11.6 | 集成 scaffolder | ✅ 完成 |
| T11.7 | 实现 REST API 路由 | ✅ 完成 |
| T11.8 | 单元测试编写 | ✅ 完成 (25 测试通过) |

### 已创建文件

```
fly-server/
├── src/
│   ├── index.ts                    # 主入口 (Hono + WebSocket)
│   ├── types/
│   │   └── index.ts                # 类型定义
│   ├── services/
│   │   ├── index.ts                # 服务导出
│   │   ├── vite-manager.ts         # Vite 进程管理
│   │   ├── hmr-proxy.ts            # HMR WebSocket 代理
│   │   ├── project-manager.ts      # 项目管理
│   │   ├── dependency-manager.ts   # 依赖管理
│   │   └── scaffolder.ts           # 项目脚手架
│   └── routes/
│       ├── projects.ts             # 项目 API
│       └── health.ts               # 健康检查
├── tests/
│   ├── scaffolder.test.ts          # 脚手架测试
│   ├── vite-manager.test.ts        # Vite 管理器测试
│   └── routes.test.ts              # API 路由测试
├── package.json                    # 更新依赖
├── tsconfig.json                   # TypeScript 配置
├── Dockerfile                      # 容器配置
└── fly.toml                        # Fly.io 部署配置
```

---

## 1. 目标概述

### 1.1 核心目标

将 fly-server 从静态文件服务升级为支持动态 Vite 构建的完整开发服务器，实现 AI 生成代码的实时预览和热更新。

### 1.2 当前状态 vs 目标状态

| 功能 | 当前状态 | 目标状态 |
|------|---------|---------|
| 文件服务 | 静态 HTML/CSS/JS | 动态 Vite Dev Server |
| 热更新 | 无 (需刷新页面) | HMR + React Fast Refresh |
| 依赖管理 | 无 | 自动安装 (Bun) |
| 项目隔离 | 目录隔离 | 独立进程 + 端口 |
| 资源管理 | 无限制 | 配额 + 自动清理 |

### 1.3 交付物清单

| 序号 | 交付物 | 描述 | 验收标准 |
|------|--------|------|---------|
| D1 | Vite Dev Server 管理器 | 进程池管理 | 支持 20+ 并发项目 |
| D2 | HMR WebSocket 代理 | HMR 消息转发 | 延迟 < 50ms |
| D3 | 项目脚手架服务 | 自动生成项目结构 | 完整可运行项目 |
| D4 | 依赖安装服务 | Bun 依赖管理 | 安装时间 < 30s |
| D5 | 项目管理 API | RESTful API | 完整 CRUD |
| D6 | 资源管理器 | 配额和清理 | 自动清理空闲项目 |
| D7 | 监控服务 | Prometheus 指标 | 可观测性 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Fly-Server 动态构建架构                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        Bun HTTP Server (:3000)                   │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │    │
│  │  │ REST API    │  │ WebSocket   │  │ Static Assets           │  │    │
│  │  │ /api/*      │  │ /hmr/:id    │  │ /p/:id/*                │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│          ┌───────────────────┼───────────────────┐                      │
│          ▼                   ▼                   ▼                       │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │ Project      │    │ Vite Dev     │    │ Dependency   │              │
│  │ Manager      │    │ Server Pool  │    │ Manager      │              │
│  │              │    │              │    │              │              │
│  │ - 生命周期   │    │ - 进程管理   │    │ - Bun 安装   │              │
│  │ - 文件 CRUD  │    │ - 端口分配   │    │ - 缓存复用   │              │
│  │ - 脚手架生成 │    │ - HMR 代理   │    │ - 版本锁定   │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│          │                   │                   │                       │
│          └───────────────────┼───────────────────┘                      │
│                              ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Volume Storage (/data)                       │    │
│  │  /data/projects/{projectId}/                                     │    │
│  │  ├── package.json                                                │    │
│  │  ├── vite.config.ts                                              │    │
│  │  ├── src/                                                        │    │
│  │  │   ├── main.tsx                                                │    │
│  │  │   ├── App.tsx                                                 │    │
│  │  │   └── components/                                             │    │
│  │  └── node_modules/                                               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 端口分配

| 端口范围 | 用途 |
|---------|------|
| 3000 | 主 HTTP 服务 |
| 5200-5219 | Vite Dev Server 池 (20 个) |

---

## 3. 核心模块实现

### 3.1 Vite Dev Server 管理器

```typescript
// src/services/vite-manager.ts

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface ViteInstance {
  projectId: string;
  port: number;
  process: ChildProcess;
  startedAt: Date;
  lastActive: Date;
  status: 'starting' | 'running' | 'stopping' | 'stopped';
}

interface ViteManagerConfig {
  basePort: number;
  maxInstances: number;
  idleTimeout: number;  // ms
  startupTimeout: number;  // ms
}

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

  constructor(config: Partial<ViteManagerConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };

    // 初始化端口池
    for (let i = 0; i < this.config.maxInstances; i++) {
      this.portPool.add(this.config.basePort + i);
    }

    // 启动空闲清理定时器
    setInterval(() => this.cleanupIdle(), 60 * 1000);
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
      throw new Error('No available ports');
    }

    // 创建实例
    const instance: ViteInstance = {
      projectId,
      port,
      process: null!,
      startedAt: new Date(),
      lastActive: new Date(),
      status: 'starting',
    };

    this.instances.set(projectId, instance);

    try {
      // 启动 Vite 进程
      instance.process = spawn('bun', [
        'run', 'vite',
        '--host', '0.0.0.0',
        '--port', String(port),
        '--strictPort',
      ], {
        cwd: projectPath,
        env: { ...process.env, NODE_ENV: 'development' },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 监听输出
      this.setupProcessListeners(instance);

      // 等待服务器就绪
      await this.waitForReady(port);

      instance.status = 'running';
      this.emit('started', { projectId, port });

      return instance;
    } catch (error) {
      this.releasePort(port);
      this.instances.delete(projectId);
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
        instance.process.on('exit', resolve);
      }),
      new Promise<void>(resolve => {
        setTimeout(() => {
          instance.process.kill('SIGKILL');
          resolve();
        }, 5000);
      }),
    ]);

    instance.status = 'stopped';
    this.releasePort(instance.port);
    this.instances.delete(projectId);
    this.emit('stopped', { projectId });
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

  private allocatePort(): number | null {
    const port = this.portPool.values().next().value;
    if (port !== undefined) {
      this.portPool.delete(port);
      return port;
    }
    return null;
  }

  private releasePort(port: number): void {
    this.portPool.add(port);
  }

  private setupProcessListeners(instance: ViteInstance): void {
    const { process, projectId } = instance;

    process.stdout?.on('data', (data: Buffer) => {
      this.emit('log', {
        projectId,
        type: 'stdout',
        message: data.toString()
      });
    });

    process.stderr?.on('data', (data: Buffer) => {
      this.emit('log', {
        projectId,
        type: 'stderr',
        message: data.toString()
      });
    });

    process.on('exit', (code: number | null) => {
      this.emit('exit', { projectId, code });
      if (instance.status !== 'stopping') {
        // 非正常退出
        this.releasePort(instance.port);
        this.instances.delete(projectId);
      }
    });
  }

  private async waitForReady(port: number): Promise<void> {
    const start = Date.now();

    while (Date.now() - start < this.config.startupTimeout) {
      try {
        const response = await fetch(`http://localhost:${port}`, {
          method: 'HEAD',
        });
        if (response.ok || response.status === 404) {
          return;
        }
      } catch {
        // 服务器尚未就绪
      }
      await new Promise(r => setTimeout(r, 200));
    }

    throw new Error('Vite startup timeout');
  }

  private cleanupIdle(): void {
    const now = Date.now();

    for (const [projectId, instance] of this.instances) {
      if (instance.status === 'running') {
        const idleTime = now - instance.lastActive.getTime();
        if (idleTime > this.config.idleTimeout) {
          console.log(`[ViteManager] Stopping idle: ${projectId}`);
          this.stop(projectId);
        }
      }
    }
  }
}

export const viteManager = new ViteDevServerManager();
```

### 3.2 HMR WebSocket 代理

```typescript
// src/services/hmr-proxy.ts

import { WebSocket, WebSocketServer } from 'ws';
import type { Server } from 'http';
import { viteManager } from './vite-manager';

interface HmrMessage {
  type: string;
  [key: string]: any;
}

export class HmrWebSocketProxy {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocket>> = new Map();
  private viteConnections: Map<string, WebSocket> = new Map();

  constructor(server: Server, path: string = '/hmr') {
    this.wss = new WebSocketServer({ server, path });
    this.setupServer();
  }

  private setupServer(): void {
    this.wss.on('connection', (ws, req) => {
      const url = new URL(req.url!, `http://${req.headers.host}`);
      const projectId = url.searchParams.get('projectId');

      if (!projectId) {
        ws.close(1008, 'Missing projectId');
        return;
      }

      this.addClient(projectId, ws);

      ws.on('message', (data) => {
        this.forwardToVite(projectId, data);
      });

      ws.on('close', () => {
        this.removeClient(projectId, ws);
      });

      ws.on('error', (error) => {
        console.error(`[HMR] Client error: ${error.message}`);
      });
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
    if (this.viteConnections.has(projectId)) return;

    const hmrUrl = viteManager.getHmrUrl(projectId);
    if (!hmrUrl) return;

    const viteWs = new WebSocket(hmrUrl);

    viteWs.on('open', () => {
      console.log(`[HMR] Connected to Vite: ${projectId}`);
    });

    viteWs.on('message', (data) => {
      this.broadcastToClients(projectId, data);
    });

    viteWs.on('close', () => {
      this.viteConnections.delete(projectId);
    });

    viteWs.on('error', (error) => {
      console.error(`[HMR] Vite connection error: ${error.message}`);
    });

    this.viteConnections.set(projectId, viteWs);
  }

  private disconnectVite(projectId: string): void {
    const viteWs = this.viteConnections.get(projectId);
    if (viteWs) {
      viteWs.close();
      this.viteConnections.delete(projectId);
    }
  }

  private forwardToVite(projectId: string, data: any): void {
    const viteWs = this.viteConnections.get(projectId);
    if (viteWs && viteWs.readyState === WebSocket.OPEN) {
      viteWs.send(data);
    }
  }

  private broadcastToClients(projectId: string, data: any): void {
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
    this.broadcastToClients(projectId, JSON.stringify(message));
  }

  /**
   * 获取连接的客户端数
   */
  getClientCount(projectId: string): number {
    return this.clients.get(projectId)?.size ?? 0;
  }
}
```

### 3.3 项目管理器

```typescript
// src/services/project-manager.ts

import { mkdir, writeFile, readFile, rm, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { viteManager } from './vite-manager';
import { dependencyManager } from './dependency-manager';
import { generateScaffold } from './scaffolder';

interface ProjectConfig {
  projectId: string;
  projectName: string;
  description: string;
}

interface ProjectFile {
  path: string;
  content: string;
  language?: string;
}

interface ProjectStatus {
  exists: boolean;
  devServerRunning: boolean;
  port?: number;
  fileCount: number;
  lastModified?: Date;
}

const PROJECTS_PATH = process.env.PROJECTS_PATH || '/data/projects';

export class ProjectManager {
  /**
   * 创建项目 (含脚手架 + AI 生成文件)
   */
  async createProject(
    config: ProjectConfig,
    files: ProjectFile[]
  ): Promise<{ projectPath: string; port: number }> {
    const projectPath = join(PROJECTS_PATH, config.projectId);

    // 创建目录结构
    await mkdir(projectPath, { recursive: true });
    await mkdir(join(projectPath, 'src/components'), { recursive: true });
    await mkdir(join(projectPath, 'src/styles'), { recursive: true });
    await mkdir(join(projectPath, 'public'), { recursive: true });

    // 生成脚手架文件
    const scaffold = generateScaffold(config);
    for (const file of scaffold.files) {
      await this.writeProjectFile(projectPath, file.path, file.content);
    }

    // 写入 AI 生成的文件
    for (const file of files) {
      await this.writeProjectFile(projectPath, file.path, file.content);
    }

    // 安装依赖
    await dependencyManager.install(projectPath);

    // 启动 Vite Dev Server
    const instance = await viteManager.start(config.projectId, projectPath);

    return {
      projectPath,
      port: instance.port,
    };
  }

  /**
   * 获取项目状态
   */
  async getStatus(projectId: string): Promise<ProjectStatus> {
    const projectPath = join(PROJECTS_PATH, projectId);

    try {
      await stat(projectPath);
    } catch {
      return { exists: false, devServerRunning: false, fileCount: 0 };
    }

    const instance = viteManager.getInstance(projectId);
    const files = await this.listFiles(projectPath);
    const stats = await stat(projectPath);

    return {
      exists: true,
      devServerRunning: instance?.status === 'running',
      port: instance?.port,
      fileCount: files.length,
      lastModified: stats.mtime,
    };
  }

  /**
   * 读取项目文件
   */
  async readFile(projectId: string, filePath: string): Promise<string> {
    const fullPath = join(PROJECTS_PATH, projectId, filePath);
    return readFile(fullPath, 'utf-8');
  }

  /**
   * 写入项目文件 (触发 HMR)
   */
  async writeFile(
    projectId: string,
    filePath: string,
    content: string
  ): Promise<void> {
    const projectPath = join(PROJECTS_PATH, projectId);
    await this.writeProjectFile(projectPath, filePath, content);

    // 标记活跃
    viteManager.markActive(projectId);
  }

  /**
   * 删除项目文件
   */
  async deleteFile(projectId: string, filePath: string): Promise<void> {
    const fullPath = join(PROJECTS_PATH, projectId, filePath);
    await rm(fullPath);
  }

  /**
   * 批量更新文件
   */
  async batchUpdate(
    projectId: string,
    updates: Array<{ path: string; content: string; operation: 'create' | 'update' | 'delete' }>
  ): Promise<void> {
    const projectPath = join(PROJECTS_PATH, projectId);

    for (const update of updates) {
      switch (update.operation) {
        case 'create':
        case 'update':
          await this.writeProjectFile(projectPath, update.path, update.content);
          break;
        case 'delete':
          await rm(join(projectPath, update.path), { force: true });
          break;
      }
    }

    viteManager.markActive(projectId);
  }

  /**
   * 删除项目
   */
  async deleteProject(projectId: string): Promise<void> {
    // 停止 Dev Server
    await viteManager.stop(projectId);

    // 删除文件
    const projectPath = join(PROJECTS_PATH, projectId);
    await rm(projectPath, { recursive: true, force: true });
  }

  /**
   * 启动 Dev Server
   */
  async startDevServer(projectId: string): Promise<number> {
    const projectPath = join(PROJECTS_PATH, projectId);
    const instance = await viteManager.start(projectId, projectPath);
    return instance.port;
  }

  /**
   * 停止 Dev Server
   */
  async stopDevServer(projectId: string): Promise<void> {
    await viteManager.stop(projectId);
  }

  /**
   * 列出所有项目
   */
  async listProjects(): Promise<string[]> {
    try {
      const entries = await readdir(PROJECTS_PATH, { withFileTypes: true });
      return entries
        .filter(e => e.isDirectory())
        .map(e => e.name);
    } catch {
      return [];
    }
  }

  private async writeProjectFile(
    projectPath: string,
    filePath: string,
    content: string
  ): Promise<void> {
    const fullPath = join(projectPath, filePath);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
  }

  private async listFiles(dir: string, prefix = ''): Promise<string[]> {
    const files: string[] = [];
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const path = join(prefix, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.vite') {
          files.push(...await this.listFiles(join(dir, entry.name), path));
        }
      } else {
        files.push(path);
      }
    }

    return files;
  }
}

export const projectManager = new ProjectManager();
```

### 3.4 依赖管理器

```typescript
// src/services/dependency-manager.ts

import { spawn } from 'child_process';
import { access, constants } from 'fs/promises';
import { join } from 'path';

interface InstallResult {
  success: boolean;
  duration: number;
  logs: string[];
}

export class DependencyManager {
  private installing: Map<string, Promise<InstallResult>> = new Map();

  /**
   * 安装项目依赖
   */
  async install(projectPath: string): Promise<InstallResult> {
    // 检查是否已安装
    const nodeModulesPath = join(projectPath, 'node_modules');
    try {
      await access(nodeModulesPath, constants.F_OK);
      return { success: true, duration: 0, logs: ['Already installed'] };
    } catch {
      // 需要安装
    }

    // 避免重复安装
    const existing = this.installing.get(projectPath);
    if (existing) {
      return existing;
    }

    const promise = this.runInstall(projectPath);
    this.installing.set(projectPath, promise);

    try {
      return await promise;
    } finally {
      this.installing.delete(projectPath);
    }
  }

  private async runInstall(projectPath: string): Promise<InstallResult> {
    const start = Date.now();
    const logs: string[] = [];

    return new Promise((resolve) => {
      const proc = spawn('bun', ['install', '--frozen-lockfile'], {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.stdout?.on('data', (data: Buffer) => {
        logs.push(data.toString());
      });

      proc.stderr?.on('data', (data: Buffer) => {
        logs.push(data.toString());
      });

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          duration: Date.now() - start,
          logs,
        });
      });

      proc.on('error', (error) => {
        logs.push(`Error: ${error.message}`);
        resolve({
          success: false,
          duration: Date.now() - start,
          logs,
        });
      });
    });
  }

  /**
   * 添加新依赖
   */
  async addPackage(
    projectPath: string,
    packageName: string,
    isDev = false
  ): Promise<InstallResult> {
    const start = Date.now();
    const logs: string[] = [];
    const args = ['add', packageName];
    if (isDev) args.push('-D');

    return new Promise((resolve) => {
      const proc = spawn('bun', args, {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      proc.stdout?.on('data', (data: Buffer) => logs.push(data.toString()));
      proc.stderr?.on('data', (data: Buffer) => logs.push(data.toString()));

      proc.on('close', (code) => {
        resolve({
          success: code === 0,
          duration: Date.now() - start,
          logs,
        });
      });
    });
  }
}

export const dependencyManager = new DependencyManager();
```

---

## 4. REST API 设计

### 4.1 项目管理 API

```typescript
// src/routes/projects.ts

import { Hono } from 'hono';
import { projectManager } from '../services/project-manager';
import { viteManager } from '../services/vite-manager';

const app = new Hono();

/**
 * POST /api/projects
 * 创建新项目
 */
app.post('/', async (c) => {
  const body = await c.req.json();
  const { projectId, projectName, description, files } = body;

  try {
    const result = await projectManager.createProject(
      { projectId, projectName, description },
      files
    );

    return c.json({
      success: true,
      projectId,
      projectPath: result.projectPath,
      previewUrl: `http://localhost:${result.port}`,
      port: result.port,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * GET /api/projects/:id/status
 * 获取项目状态
 */
app.get('/:id/status', async (c) => {
  const projectId = c.req.param('id');
  const status = await projectManager.getStatus(projectId);
  return c.json(status);
});

/**
 * GET /api/projects/:id/files/:path
 * 读取文件
 */
app.get('/:id/files/*', async (c) => {
  const projectId = c.req.param('id');
  const filePath = c.req.path.replace(`/api/projects/${projectId}/files/`, '');

  try {
    const content = await projectManager.readFile(projectId, filePath);
    return c.json({ content });
  } catch (error: any) {
    return c.json({ error: error.message }, 404);
  }
});

/**
 * PUT /api/projects/:id/files/:path
 * 写入文件 (触发 HMR)
 */
app.put('/:id/files/*', async (c) => {
  const projectId = c.req.param('id');
  const filePath = c.req.path.replace(`/api/projects/${projectId}/files/`, '');
  const { content } = await c.req.json();

  try {
    await projectManager.writeFile(projectId, filePath, content);
    return c.json({ success: true, hmrTriggered: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * PATCH /api/projects/:id/files
 * 批量更新文件
 */
app.patch('/:id/files', async (c) => {
  const projectId = c.req.param('id');
  const { updates } = await c.req.json();

  try {
    await projectManager.batchUpdate(projectId, updates);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * DELETE /api/projects/:id
 * 删除项目
 */
app.delete('/:id', async (c) => {
  const projectId = c.req.param('id');

  try {
    await projectManager.deleteProject(projectId);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/projects/:id/dev-server/start
 * 启动 Dev Server
 */
app.post('/:id/dev-server/start', async (c) => {
  const projectId = c.req.param('id');

  try {
    const port = await projectManager.startDevServer(projectId);
    return c.json({
      success: true,
      port,
      previewUrl: `http://localhost:${port}`,
      hmrUrl: `ws://localhost:${port}`,
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

/**
 * POST /api/projects/:id/dev-server/stop
 * 停止 Dev Server
 */
app.post('/:id/dev-server/stop', async (c) => {
  const projectId = c.req.param('id');

  try {
    await projectManager.stopDevServer(projectId);
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export { app as projectsRouter };
```

### 4.2 健康检查和监控

```typescript
// src/routes/health.ts

import { Hono } from 'hono';
import { viteManager } from '../services/vite-manager';
import { projectManager } from '../services/project-manager';

const app = new Hono();

/**
 * GET /health
 * 健康检查
 */
app.get('/', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /metrics
 * Prometheus 指标
 */
app.get('/metrics', async (c) => {
  const projects = await projectManager.listProjects();
  const runningServers = viteManager.getRunningCount();
  const memUsage = process.memoryUsage();

  const metrics = `
# HELP fly_server_projects_total Total number of projects
# TYPE fly_server_projects_total gauge
fly_server_projects_total ${projects.length}

# HELP fly_server_dev_servers_running Number of running Vite dev servers
# TYPE fly_server_dev_servers_running gauge
fly_server_dev_servers_running ${runningServers}

# HELP fly_server_memory_heap_used_bytes Heap memory used
# TYPE fly_server_memory_heap_used_bytes gauge
fly_server_memory_heap_used_bytes ${memUsage.heapUsed}

# HELP fly_server_memory_heap_total_bytes Heap memory total
# TYPE fly_server_memory_heap_total_bytes gauge
fly_server_memory_heap_total_bytes ${memUsage.heapTotal}

# HELP fly_server_memory_rss_bytes RSS memory
# TYPE fly_server_memory_rss_bytes gauge
fly_server_memory_rss_bytes ${memUsage.rss}
`.trim();

  c.header('Content-Type', 'text/plain');
  return c.text(metrics);
});

export { app as healthRouter };
```

---

## 5. 部署配置

### 5.1 Dockerfile

```dockerfile
# fly-server/Dockerfile

FROM oven/bun:1-alpine

# 安装必要工具
RUN apk add --no-cache git

WORKDIR /app

# 复制 package.json
COPY package.json bun.lockb* ./

# 安装依赖
RUN bun install --production

# 复制源码
COPY src ./src
COPY tsconfig.json ./

# 创建数据目录
RUN mkdir -p /data/projects

# 环境变量
ENV NODE_ENV=production
ENV PROJECTS_PATH=/data/projects
ENV PORT=3000

# 暴露端口
EXPOSE 3000 5200-5219

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动
CMD ["bun", "run", "src/index.ts"]
```

### 5.2 Fly.io 配置

```toml
# fly-server/fly.toml

app = "ai-site-generator-preview"
primary_region = "hkg"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PROJECTS_PATH = "/data/projects"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[[mounts]]
  source = "projects_data"
  destination = "/data/projects"

[vm]
  cpu_kind = "shared"
  cpus = 2
  memory_mb = 2048
```

---

## 6. 测试计划

### 6.1 单元测试

```typescript
// tests/unit/vite-manager.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ViteDevServerManager } from '../../src/services/vite-manager';

describe('ViteDevServerManager', () => {
  let manager: ViteDevServerManager;

  beforeEach(() => {
    manager = new ViteDevServerManager({
      maxInstances: 3,
      idleTimeout: 1000,
    });
  });

  afterEach(async () => {
    // 清理所有实例
  });

  describe('start', () => {
    it('should allocate port from pool', async () => {
      // Mock spawn
      vi.mock('child_process', () => ({
        spawn: vi.fn().mockReturnValue({
          stdout: { on: vi.fn() },
          stderr: { on: vi.fn() },
          on: vi.fn(),
          kill: vi.fn(),
        }),
      }));

      const instance = await manager.start('project-1', '/tmp/project-1');

      expect(instance.port).toBeGreaterThanOrEqual(5200);
      expect(instance.status).toBe('running');
    });

    it('should return existing instance if already running', async () => {
      const first = await manager.start('project-1', '/tmp/project-1');
      const second = await manager.start('project-1', '/tmp/project-1');

      expect(first.port).toBe(second.port);
    });

    it('should throw when no ports available', async () => {
      // 占满所有端口
      await manager.start('p1', '/tmp/p1');
      await manager.start('p2', '/tmp/p2');
      await manager.start('p3', '/tmp/p3');

      await expect(manager.start('p4', '/tmp/p4'))
        .rejects.toThrow('No available ports');
    });
  });

  describe('stop', () => {
    it('should release port after stop', async () => {
      await manager.start('project-1', '/tmp/project-1');
      await manager.stop('project-1');

      expect(manager.getInstance('project-1')).toBeUndefined();
    });
  });

  describe('idle cleanup', () => {
    it('should stop idle instances', async () => {
      vi.useFakeTimers();

      await manager.start('project-1', '/tmp/project-1');

      // 前进 2 秒 (超过 1 秒的 idleTimeout)
      vi.advanceTimersByTime(2000);

      expect(manager.getInstance('project-1')).toBeUndefined();

      vi.useRealTimers();
    });
  });
});
```

### 6.2 集成测试

```typescript
// tests/integration/project-lifecycle.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { projectManager } from '../../src/services/project-manager';

describe('Project Lifecycle', () => {
  const testProjectId = `test-${Date.now()}`;

  afterAll(async () => {
    await projectManager.deleteProject(testProjectId);
  });

  it('should create project with scaffold', async () => {
    const result = await projectManager.createProject(
      {
        projectId: testProjectId,
        projectName: 'Test Project',
        description: 'A test project',
      },
      [
        {
          path: 'src/App.tsx',
          content: 'export default function App() { return <div>Hello</div>; }',
        },
      ]
    );

    expect(result.projectPath).toContain(testProjectId);
    expect(result.port).toBeGreaterThanOrEqual(5200);
  });

  it('should read and write files', async () => {
    const content = 'export default function App() { return <div>Updated</div>; }';

    await projectManager.writeFile(testProjectId, 'src/App.tsx', content);
    const read = await projectManager.readFile(testProjectId, 'src/App.tsx');

    expect(read).toBe(content);
  });

  it('should return correct status', async () => {
    const status = await projectManager.getStatus(testProjectId);

    expect(status.exists).toBe(true);
    expect(status.devServerRunning).toBe(true);
    expect(status.fileCount).toBeGreaterThan(0);
  });

  it('should stop and restart dev server', async () => {
    await projectManager.stopDevServer(testProjectId);

    let status = await projectManager.getStatus(testProjectId);
    expect(status.devServerRunning).toBe(false);

    await projectManager.startDevServer(testProjectId);

    status = await projectManager.getStatus(testProjectId);
    expect(status.devServerRunning).toBe(true);
  });
});
```

### 6.3 API 测试

```typescript
// tests/api/projects.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE_URL = 'http://localhost:3000';
const testProjectId = `api-test-${Date.now()}`;

describe('Projects API', () => {
  afterAll(async () => {
    await fetch(`${BASE_URL}/api/projects/${testProjectId}`, {
      method: 'DELETE',
    });
  });

  it('POST /api/projects - should create project', async () => {
    const response = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: testProjectId,
        projectName: 'API Test',
        description: 'Test project',
        files: [
          {
            path: 'src/main.tsx',
            content: 'import React from "react";\nexport default function Main() {}',
          },
          {
            path: 'src/App.tsx',
            content: 'export default function App() { return <div>Test</div>; }',
          },
        ],
      }),
    });

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.port).toBeGreaterThanOrEqual(5200);
  });

  it('GET /api/projects/:id/status - should return status', async () => {
    const response = await fetch(`${BASE_URL}/api/projects/${testProjectId}/status`);

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.exists).toBe(true);
    expect(data.devServerRunning).toBe(true);
  });

  it('PUT /api/projects/:id/files/* - should update file', async () => {
    const response = await fetch(
      `${BASE_URL}/api/projects/${testProjectId}/files/src/App.tsx`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'export default function App() { return <div>Updated</div>; }',
        }),
      }
    );

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.hmrTriggered).toBe(true);
  });

  it('GET /health - should return healthy', async () => {
    const response = await fetch(`${BASE_URL}/health`);

    expect(response.ok).toBe(true);

    const data = await response.json();
    expect(data.status).toBe('healthy');
  });
});
```

---

## 7. 实施任务

### 7.1 Week 11 任务

| 任务 ID | 任务描述 | 预估时间 | 依赖 |
|---------|---------|---------|------|
| T11.1 | 重构 fly-server 项目结构 | 2h | - |
| T11.2 | 实现 ViteDevServerManager | 4h | T11.1 |
| T11.3 | 实现 HmrWebSocketProxy | 3h | T11.2 |
| T11.4 | 实现 ProjectManager | 4h | T11.2 |
| T11.5 | 实现 DependencyManager | 2h | T11.4 |
| T11.6 | 集成 scaffolder (从 ai-generator) | 2h | T11.4 |
| T11.7 | 实现 REST API 路由 | 3h | T11.4, T11.5 |
| T11.8 | 单元测试编写 | 4h | T11.7 |

### 7.2 Week 12 任务

| 任务 ID | 任务描述 | 预估时间 | 依赖 |
|---------|---------|---------|------|
| T12.1 | 集成测试编写 | 4h | T11.8 |
| T12.2 | API 测试编写 | 3h | T11.8 |
| T12.3 | Dockerfile 配置 | 2h | T12.1 |
| T12.4 | Fly.io 部署配置 | 2h | T12.3 |
| T12.5 | 监控和日志配置 | 2h | T12.4 |
| T12.6 | 部署测试 | 3h | T12.5 |
| T12.7 | Bug 修复和优化 | 4h | T12.6 |
| T12.8 | 文档编写 | 2h | T12.7 |

---

## 8. 验收标准

### 8.1 功能验收

| 验收项 | 验收标准 |
|--------|---------|
| 项目创建 | 30s 内完成创建并启动 Dev Server |
| HMR 更新 | 文件修改后 200ms 内触发热更新 |
| 并发支持 | 同时运行 20 个 Dev Server |
| 空闲清理 | 30 分钟无活动自动停止 |
| API 响应 | 95% 请求响应时间 < 100ms |

### 8.2 测试覆盖率

| 模块 | 目标覆盖率 |
|------|-----------|
| ViteDevServerManager | > 90% |
| ProjectManager | > 85% |
| DependencyManager | > 80% |
| API Routes | > 85% |
| **总体** | **> 85%** |

### 8.3 性能基准

| 指标 | 目标值 |
|------|--------|
| 项目创建时间 | < 30s |
| Dev Server 启动 | < 10s |
| HMR 延迟 | < 200ms |
| 内存占用 (单项目) | < 100MB |

---

## 9. 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| 端口耗尽 | 新项目无法启动 | 中 | 端口池 + 空闲清理 |
| 内存不足 | 服务崩溃 | 中 | 资源限制 + 监控告警 |
| 依赖安装慢 | 用户体验差 | 高 | 缓存 node_modules |
| Vite 进程泄漏 | 资源浪费 | 低 | 进程监控 + 自动清理 |

---

*规格版本: v1.0*
*创建日期: 2025-01*
*最后更新: 2025-01*
