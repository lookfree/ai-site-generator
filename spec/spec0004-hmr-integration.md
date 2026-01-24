# SPEC-0004: HMR 热模块替换集成

> **阶段**: M4 (第 7-8 周)
> **状态**: 待开始
> **优先级**: P0 - 核心体验
> **依赖**: SPEC-0001, SPEC-0002, SPEC-0003

---

## 1. 目标概述

### 1.1 核心目标

实现 Vite HMR + React Fast Refresh 集成，替代当前的全页刷新机制，实现真正的热模块替换。

### 1.2 交付物清单

| 序号 | 交付物 | 描述 | 验收标准 |
|------|--------|------|---------|
| D1 | Vite Dev Server 集成 | 为生成项目启动 Vite | Dev Server 正常运行 |
| D2 | HMR WebSocket 通道 | 双向通信通道 | 消息实时传递 |
| D3 | 乐观更新系统 | 即时 DOM 反馈 | < 50ms 响应 |
| D4 | React Fast Refresh | 组件状态保持 | 状态不丢失 |
| D5 | 文件同步服务 | 代码变更写入 | 触发 HMR |

---

## 2. 系统架构

### 2.1 HMR 工作流

```
┌─────────────────────────────────────────────────────────────────────┐
│                          HMR 热更新流程                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  用户修改 (Visual Editor)                                            │
│        │                                                             │
│        ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  1. 乐观更新 (Optimistic Update)                              │   │
│  │     ┌─────────────┐                                           │   │
│  │     │ 立即更新DOM │ ←── 用户感知延迟 < 50ms                   │   │
│  │     └─────────────┘                                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│        │                                                             │
│        ▼  (并行)                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  2. 代码变换 (AST Transform)                                   │   │
│  │     ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │   │
│  │     │  解析 AST   │───▶│  应用修改   │───▶│  生成代码   │    │   │
│  │     └─────────────┘    └─────────────┘    └─────────────┘    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│        │                                                             │
│        ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  3. 文件写入                                                   │   │
│  │     ┌─────────────┐                                           │   │
│  │     │ 写入源文件  │ ←── src/components/Hero.tsx               │   │
│  │     └─────────────┘                                           │   │
│  └──────────────────────────────────────────────────────────────┘   │
│        │                                                             │
│        ▼  (Vite 自动检测)                                            │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  4. Vite HMR 流程                                              │   │
│  │     ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │   │
│  │     │ 文件监听    │───▶│ 增量编译    │───▶│ WebSocket   │    │   │
│  │     │ (chokidar)  │    │ (esbuild)   │    │ 推送更新    │    │   │
│  │     └─────────────┘    └─────────────┘    └─────────────┘    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│        │                                                             │
│        ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  5. React Fast Refresh                                         │   │
│  │     ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │   │
│  │     │ 接收模块    │───▶│ 热替换组件  │───▶│ 保持状态    │    │   │
│  │     └─────────────┘    └─────────────┘    └─────────────┘    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│        │                                                             │
│        ▼                                                             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  6. 完成更新                                                   │   │
│  │     - 组件重新渲染                                             │   │
│  │     - 状态保持                                                 │   │
│  │     - 无页面刷新                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 文件结构

```
packages/hmr-system/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # 主入口
│   ├── server/
│   │   ├── vite-server.ts          # Vite Dev Server 管理
│   │   ├── file-watcher.ts         # 文件监听
│   │   └── project-manager.ts      # 项目实例管理
│   ├── client/
│   │   ├── hmr-client.ts           # HMR 客户端
│   │   ├── optimistic-updater.ts   # 乐观更新
│   │   └── state-preserver.ts      # 状态保持
│   ├── sync/
│   │   ├── file-sync.ts            # 文件同步
│   │   ├── change-queue.ts         # 变更队列
│   │   └── conflict-resolver.ts    # 冲突解决
│   └── types/
│       └── index.ts
└── tests/
    └── ...
```

---

## 3. 核心模块规格

### 3.1 Vite Dev Server 管理

```typescript
// src/server/vite-server.ts

import { createServer, ViteDevServer, InlineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { jsxTaggerPlugin } from 'vite-plugin-jsx-tagger';
import path from 'path';

interface ProjectServerConfig {
  projectId: string;
  projectPath: string;
  port: number;
}

interface ProjectServer {
  server: ViteDevServer;
  config: ProjectServerConfig;
  status: 'starting' | 'running' | 'stopped' | 'error';
}

class ViteServerManager {
  private servers = new Map<string, ProjectServer>();
  private portPool: number[] = [];
  private basePort = 5173;
  private maxServers = 10;

  constructor() {
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
    if (this.servers.has(projectId)) {
      return this.servers.get(projectId)!;
    }

    // 获取可用端口
    const port = this.allocatePort();
    if (!port) {
      throw new Error('No available ports');
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

      return projectServer;

    } catch (error) {
      projectServer.status = 'error';
      this.releasePort(port);
      throw error;
    }
  }

  /**
   * 停止项目的 Dev Server
   */
  async stopServer(projectId: string): Promise<void> {
    const projectServer = this.servers.get(projectId);
    if (!projectServer) return;

    await projectServer.server.close();
    this.releasePort(projectServer.config.port);
    this.servers.delete(projectId);

    console.log(`[HMR] Project ${projectId} stopped`);
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
   * 创建 Vite 配置
   */
  private createViteConfig(config: ProjectServerConfig): InlineConfig {
    return {
      root: config.projectPath,

      plugins: [
        // JSX Tagger 必须在 React 之前
        jsxTaggerPlugin({
          idPrefix: config.projectId.slice(0, 8),
        }),

        // React Fast Refresh
        react({
          fastRefresh: true,
        }),
      ],

      server: {
        port: config.port,
        strictPort: true,
        host: true,

        hmr: {
          protocol: 'ws',
          host: 'localhost',
          port: config.port,
          overlay: false,  // 禁用错误覆盖层 (我们自己处理)
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
    server.ws.on('connection', (socket) => {
      console.log(`[HMR] Client connected for project ${projectId}`);

      socket.on('close', () => {
        console.log(`[HMR] Client disconnected for project ${projectId}`);
      });
    });

    // 监听 HMR 更新事件
    server.watcher.on('change', (file) => {
      console.log(`[HMR] File changed: ${file}`);
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
    const promises = Array.from(this.servers.keys()).map(id => this.stopServer(id));
    await Promise.all(promises);
  }
}

export const viteServerManager = new ViteServerManager();
```

### 3.2 文件同步服务

```typescript
// src/sync/file-sync.ts

import { writeFile, readFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { EventEmitter } from 'events';

interface FileChange {
  projectId: string;
  filePath: string;
  content: string;
  timestamp: number;
}

interface SyncResult {
  success: boolean;
  filePath: string;
  error?: string;
}

class FileSyncService extends EventEmitter {
  private pendingChanges = new Map<string, FileChange>();
  private syncInterval: NodeJS.Timer | null = null;
  private debounceMs = 100;  // 防抖时间

  constructor() {
    super();
  }

  /**
   * 启动同步服务
   */
  start(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.processPendingChanges();
    }, this.debounceMs);
  }

  /**
   * 停止同步服务
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * 添加文件变更到队列
   */
  queueChange(projectId: string, filePath: string, content: string): void {
    const key = `${projectId}:${filePath}`;

    this.pendingChanges.set(key, {
      projectId,
      filePath,
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * 立即同步文件
   */
  async syncImmediately(
    projectId: string,
    projectPath: string,
    filePath: string,
    content: string
  ): Promise<SyncResult> {
    const fullPath = join(projectPath, filePath);

    try {
      // 确保目录存在
      const dir = dirname(fullPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // 写入文件
      await writeFile(fullPath, content, 'utf-8');

      this.emit('file-synced', { projectId, filePath });

      return {
        success: true,
        filePath,
      };

    } catch (error: any) {
      return {
        success: false,
        filePath,
        error: error.message,
      };
    }
  }

  /**
   * 批量同步文件
   */
  async syncBatch(
    projectId: string,
    projectPath: string,
    files: { path: string; content: string }[]
  ): Promise<SyncResult[]> {
    const results = await Promise.all(
      files.map(file => this.syncImmediately(projectId, projectPath, file.path, file.content))
    );

    return results;
  }

  /**
   * 读取项目文件
   */
  async readFile(projectPath: string, filePath: string): Promise<string | null> {
    const fullPath = join(projectPath, filePath);

    try {
      return await readFile(fullPath, 'utf-8');
    } catch {
      return null;
    }
  }

  /**
   * 处理待处理的变更
   */
  private async processPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0) return;

    const changes = Array.from(this.pendingChanges.values());
    this.pendingChanges.clear();

    // 按项目分组
    const byProject = new Map<string, FileChange[]>();
    for (const change of changes) {
      const list = byProject.get(change.projectId) || [];
      list.push(change);
      byProject.set(change.projectId, list);
    }

    // 批量处理
    for (const [projectId, projectChanges] of byProject) {
      this.emit('batch-sync-start', { projectId, count: projectChanges.length });

      // 这里需要获取项目路径
      // 实际实现中需要从项目管理器获取
    }
  }
}

export const fileSyncService = new FileSyncService();
```

### 3.3 HMR 客户端

```typescript
// src/client/hmr-client.ts

import { EventEmitter } from 'events';

interface HmrUpdate {
  type: 'js-update' | 'css-update' | 'full-reload';
  path: string;
  acceptedPath?: string;
  timestamp: number;
}

interface HmrClientOptions {
  serverUrl: string;
  projectId: string;
  onUpdate?: (update: HmrUpdate) => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

class HmrClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private options: HmrClientOptions;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isConnecting = false;

  constructor(options: HmrClientOptions) {
    super();
    this.options = options;
  }

  /**
   * 连接到 Vite HMR 服务器
   */
  connect(): void {
    if (this.ws || this.isConnecting) return;

    this.isConnecting = true;
    const wsUrl = this.options.serverUrl.replace('http', 'ws') + '/__vite_hmr';

    try {
      this.ws = new WebSocket(wsUrl, 'vite-hmr');

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('[HMR Client] Connected');
        this.options.onConnected?.();
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        console.log('[HMR Client] Disconnected');
        this.options.onDisconnected?.();
        this.emit('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        this.isConnecting = false;
        console.error('[HMR Client] Error:', error);
        this.options.onError?.(new Error('WebSocket error'));
      };

    } catch (error) {
      this.isConnecting = false;
      console.error('[HMR Client] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 处理 HMR 消息
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'connected':
          console.log('[HMR] Handshake complete');
          break;

        case 'update':
          this.handleUpdate(message);
          break;

        case 'full-reload':
          console.log('[HMR] Full reload triggered');
          this.emit('full-reload', message);
          break;

        case 'prune':
          console.log('[HMR] Module pruned:', message.paths);
          break;

        case 'error':
          console.error('[HMR] Error:', message.err);
          this.emit('error', message.err);
          break;

        case 'custom':
          this.emit('custom', message);
          break;
      }

    } catch (error) {
      console.error('[HMR] Failed to parse message:', error);
    }
  }

  /**
   * 处理更新消息
   */
  private handleUpdate(message: any): void {
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
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1);

    console.log(`[HMR Client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
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
}

export { HmrClient, HmrClientOptions, HmrUpdate };
```

### 3.4 乐观更新系统

```typescript
// src/client/optimistic-updater.ts

import { EventEmitter } from 'events';

interface OptimisticUpdate {
  id: string;
  jsxId: string;
  type: 'text' | 'className' | 'style' | 'attribute';
  oldValue: any;
  newValue: any;
  timestamp: number;
  status: 'pending' | 'confirmed' | 'rolled-back';
}

interface UpdateResult {
  success: boolean;
  updateId: string;
  error?: string;
}

class OptimisticUpdater extends EventEmitter {
  private pendingUpdates = new Map<string, OptimisticUpdate>();
  private confirmedUpdates = new Map<string, OptimisticUpdate>();
  private iframe: HTMLIFrameElement | null = null;
  private updateIdCounter = 0;

  /**
   * 设置 iframe 引用
   */
  setIframe(iframe: HTMLIFrameElement): void {
    this.iframe = iframe;
  }

  /**
   * 应用乐观更新
   */
  applyUpdate(
    jsxId: string,
    type: OptimisticUpdate['type'],
    newValue: any
  ): string {
    const updateId = this.generateUpdateId();

    // 获取当前值
    const oldValue = this.getCurrentValue(jsxId, type);

    const update: OptimisticUpdate = {
      id: updateId,
      jsxId,
      type,
      oldValue,
      newValue,
      timestamp: Date.now(),
      status: 'pending',
    };

    this.pendingUpdates.set(updateId, update);

    // 立即应用到 DOM
    this.applyToDOM(update);

    this.emit('update-applied', update);

    return updateId;
  }

  /**
   * 确认更新 (HMR 完成后)
   */
  confirmUpdate(updateId: string): void {
    const update = this.pendingUpdates.get(updateId);
    if (!update) return;

    update.status = 'confirmed';
    this.pendingUpdates.delete(updateId);
    this.confirmedUpdates.set(updateId, update);

    this.emit('update-confirmed', update);
  }

  /**
   * 回滚更新
   */
  rollbackUpdate(updateId: string): void {
    const update = this.pendingUpdates.get(updateId);
    if (!update) return;

    update.status = 'rolled-back';

    // 恢复旧值
    this.applyToDOM({
      ...update,
      newValue: update.oldValue,
    });

    this.pendingUpdates.delete(updateId);

    this.emit('update-rolled-back', update);
  }

  /**
   * 应用到 DOM
   */
  private applyToDOM(update: OptimisticUpdate): void {
    if (!this.iframe?.contentWindow) return;

    // 发送消息到 iframe
    this.iframe.contentWindow.postMessage({
      type: 'UPDATE_ELEMENT',
      payload: {
        jsxId: update.jsxId,
        type: update.type,
        value: update.newValue,
      },
    }, '*');
  }

  /**
   * 获取当前值
   */
  private getCurrentValue(jsxId: string, type: string): any {
    if (!this.iframe?.contentDocument) return null;

    const element = this.iframe.contentDocument.querySelector(
      `[data-jsx-id="${jsxId}"]`
    ) as HTMLElement;

    if (!element) return null;

    switch (type) {
      case 'text':
        return this.getDirectTextContent(element);
      case 'className':
        return element.className;
      case 'style':
        return element.style.cssText;
      case 'attribute':
        return null;  // 需要知道具体属性名
      default:
        return null;
    }
  }

  private getDirectTextContent(element: HTMLElement): string {
    let text = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  private generateUpdateId(): string {
    return `update_${Date.now()}_${this.updateIdCounter++}`;
  }

  /**
   * 获取待处理更新数量
   */
  getPendingCount(): number {
    return this.pendingUpdates.size;
  }

  /**
   * 清理旧的确认更新
   */
  cleanup(maxAge: number = 60000): void {
    const now = Date.now();

    for (const [id, update] of this.confirmedUpdates) {
      if (now - update.timestamp > maxAge) {
        this.confirmedUpdates.delete(id);
      }
    }
  }
}

export const optimisticUpdater = new OptimisticUpdater();
```

### 3.5 状态保持管理

```typescript
// src/client/state-preserver.ts

interface ComponentState {
  componentId: string;
  jsxId: string;
  state: Record<string, any>;
  timestamp: number;
}

class StatePreserver {
  private savedStates = new Map<string, ComponentState>();
  private iframe: HTMLIFrameElement | null = null;

  setIframe(iframe: HTMLIFrameElement): void {
    this.iframe = iframe;
  }

  /**
   * 在 HMR 之前保存状态
   */
  saveState(jsxId: string): void {
    if (!this.iframe?.contentWindow) return;

    // 通过 postMessage 请求组件状态
    this.iframe.contentWindow.postMessage({
      type: 'GET_COMPONENT_STATE',
      payload: { jsxId },
    }, '*');
  }

  /**
   * 接收保存的状态
   */
  receiveState(jsxId: string, state: Record<string, any>): void {
    this.savedStates.set(jsxId, {
      componentId: jsxId,
      jsxId,
      state,
      timestamp: Date.now(),
    });
  }

  /**
   * 在 HMR 之后恢复状态
   */
  restoreState(jsxId: string): void {
    const saved = this.savedStates.get(jsxId);
    if (!saved || !this.iframe?.contentWindow) return;

    this.iframe.contentWindow.postMessage({
      type: 'RESTORE_COMPONENT_STATE',
      payload: {
        jsxId,
        state: saved.state,
      },
    }, '*');

    // 清理
    this.savedStates.delete(jsxId);
  }

  /**
   * 保存所有活动组件状态
   */
  saveAllStates(): void {
    if (!this.iframe?.contentWindow) return;

    this.iframe.contentWindow.postMessage({
      type: 'SAVE_ALL_STATES',
    }, '*');
  }

  /**
   * 恢复所有状态
   */
  restoreAllStates(): void {
    for (const [jsxId] of this.savedStates) {
      this.restoreState(jsxId);
    }
  }

  /**
   * 清理过期状态
   */
  cleanup(maxAge: number = 30000): void {
    const now = Date.now();

    for (const [id, state] of this.savedStates) {
      if (now - state.timestamp > maxAge) {
        this.savedStates.delete(id);
      }
    }
  }
}

export const statePreserver = new StatePreserver();
```

---

## 4. 集成流程

### 4.1 编辑器集成

```typescript
// 使用示例: 在 Visual Editor 中集成 HMR

import { viteServerManager } from './hmr-system/server/vite-server';
import { HmrClient } from './hmr-system/client/hmr-client';
import { fileSyncService } from './hmr-system/sync/file-sync';
import { optimisticUpdater } from './hmr-system/client/optimistic-updater';
import { transformCode } from './ast-processor';

async function initializeProject(projectId: string, projectPath: string) {
  // 1. 启动 Vite Dev Server
  const projectServer = await viteServerManager.startServer(projectId, projectPath);

  // 2. 连接 HMR 客户端
  const hmrClient = new HmrClient({
    serverUrl: `http://localhost:${projectServer.config.port}`,
    projectId,

    onUpdate: (update) => {
      console.log('HMR Update:', update);
      // 确认乐观更新
      // optimisticUpdater.confirmUpdate(pendingUpdateId);
    },

    onConnected: () => {
      console.log('HMR Connected');
    },
  });

  hmrClient.connect();

  // 3. 启动文件同步
  fileSyncService.start();

  return {
    previewUrl: viteServerManager.getPreviewUrl(projectId),
    hmrClient,
  };
}

async function handleStyleChange(
  projectId: string,
  projectPath: string,
  jsxId: string,
  newClasses: string[]
) {
  // 1. 乐观更新 (立即反馈)
  const updateId = optimisticUpdater.applyUpdate(
    jsxId,
    'className',
    newClasses.join(' ')
  );

  try {
    // 2. 获取源文件
    const filePath = await getFilePathByJsxId(jsxId);  // 通过 JSX Source Map 获取
    const sourceCode = await fileSyncService.readFile(projectPath, filePath);

    if (!sourceCode) {
      throw new Error('Source file not found');
    }

    // 3. AST 变换
    const { code } = await transformCode(sourceCode, filePath, {
      jsxId,
      operation: {
        type: 'style',
        payload: { className: newClasses.join(' ') },
      },
    });

    // 4. 写入文件 (触发 Vite HMR)
    await fileSyncService.syncImmediately(projectId, projectPath, filePath, code);

    // 5. HMR 完成后确认更新
    optimisticUpdater.confirmUpdate(updateId);

  } catch (error) {
    // 回滚乐观更新
    optimisticUpdater.rollbackUpdate(updateId);
    throw error;
  }
}
```

---

## 5. 实施任务

### 5.1 Week 7 任务列表

| 任务 ID | 任务描述 | 预估时间 | 依赖 |
|---------|---------|---------|------|
| T7.1 | 创建 hmr-system 包结构 | 1h | SPEC-0003 |
| T7.2 | 实现 Vite Server 管理器 | 6h | T7.1 |
| T7.3 | 实现项目实例管理 | 3h | T7.2 |
| T7.4 | 实现文件同步服务 | 4h | T7.2 |
| T7.5 | 实现变更队列 | 2h | T7.4 |
| T7.6 | 实现 HMR 客户端 | 4h | T7.2 |
| T7.7 | 测试 Vite HMR 集成 | 3h | T7.6 |

### 5.2 Week 8 任务列表

| 任务 ID | 任务描述 | 预估时间 | 依赖 |
|---------|---------|---------|------|
| T8.1 | 实现乐观更新系统 | 4h | T7.6 |
| T8.2 | 实现状态保持管理 | 3h | T8.1 |
| T8.3 | 集成到 Visual Editor | 4h | T8.2 |
| T8.4 | 实现冲突解决 | 3h | T8.3 |
| T8.5 | 端到端测试 | 4h | T8.4 |
| T8.6 | 性能优化 | 3h | T8.5 |
| T8.7 | 文档编写 | 2h | T8.6 |

---

## 6. 验收标准

### 6.1 功能验收

| 验收项 | 验收标准 |
|--------|---------|
| Dev Server 启动 | 项目能正常启动 Vite Dev Server |
| HMR 连接 | WebSocket 连接稳定 |
| 热更新 | 修改代码后组件热替换 |
| 状态保持 | HMR 后组件状态不丢失 |
| 乐观更新 | 修改即时反映到 UI |

### 6.2 性能验收

| 指标 | 目标值 |
|------|--------|
| 乐观更新延迟 | < 50ms |
| HMR 更新延迟 | < 500ms |
| WebSocket 重连 | < 3s |
| 文件写入 | < 100ms |

---

*规格版本: v1.0*
*创建日期: 2024*
*最后更新: 2024*
