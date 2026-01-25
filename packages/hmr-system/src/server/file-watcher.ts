/**
 * 文件监听服务
 * 监控项目文件变化
 */

import chokidar, { type FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { join, relative } from 'path';

interface WatcherOptions {
  /** 忽略的模式 */
  ignored?: string[];
  /** 防抖延迟 (ms) */
  debounceDelay?: number;
  /** 使用轮询 */
  usePolling?: boolean;
  /** 轮询间隔 */
  pollInterval?: number;
}

interface FileChangeEvent {
  /** 项目 ID */
  projectId: string;
  /** 文件路径 (相对路径) */
  filePath: string;
  /** 完整路径 */
  fullPath: string;
  /** 变化类型 */
  type: 'add' | 'change' | 'unlink';
  /** 时间戳 */
  timestamp: number;
}

interface ProjectWatcher {
  /** Chokidar watcher */
  watcher: FSWatcher;
  /** 项目路径 */
  projectPath: string;
  /** 配置 */
  options: WatcherOptions;
}

const DEFAULT_IGNORED = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.cache/**',
  '**/coverage/**',
  '**/*.log',
  '**/.DS_Store',
];

/**
 * 文件监听管理器
 */
export class FileWatcherManager extends EventEmitter {
  private watchers = new Map<string, ProjectWatcher>();
  private changeBuffer = new Map<string, FileChangeEvent>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private defaultDebounceDelay = 100;

  /**
   * 开始监听项目
   */
  watch(
    projectId: string,
    projectPath: string,
    options: WatcherOptions = {}
  ): void {
    // 如果已经在监听，先停止
    if (this.watchers.has(projectId)) {
      this.unwatch(projectId);
    }

    const ignored = [
      ...DEFAULT_IGNORED,
      ...(options.ignored || []),
    ];

    const watcher = chokidar.watch(projectPath, {
      ignored,
      persistent: true,
      ignoreInitial: true,
      usePolling: options.usePolling ?? false,
      interval: options.pollInterval ?? 100,
      awaitWriteFinish: {
        stabilityThreshold: 50,
        pollInterval: 10,
      },
    });

    // 设置事件监听
    watcher
      .on('add', (fullPath) => this.handleChange(projectId, projectPath, fullPath, 'add'))
      .on('change', (fullPath) => this.handleChange(projectId, projectPath, fullPath, 'change'))
      .on('unlink', (fullPath) => this.handleChange(projectId, projectPath, fullPath, 'unlink'))
      .on('error', (error) => {
        console.error(`[FileWatcher] Error for ${projectId}:`, error);
        this.emit('error', { projectId, error });
      })
      .on('ready', () => {
        console.log(`[FileWatcher] Watching ${projectId} at ${projectPath}`);
        this.emit('ready', { projectId, projectPath });
      });

    this.watchers.set(projectId, {
      watcher,
      projectPath,
      options: {
        ...options,
        debounceDelay: options.debounceDelay ?? this.defaultDebounceDelay,
      },
    });
  }

  /**
   * 停止监听项目
   */
  async unwatch(projectId: string): Promise<void> {
    const projectWatcher = this.watchers.get(projectId);
    if (!projectWatcher) return;

    // 清理防抖定时器
    this.debounceTimers.forEach((timer, key) => {
      if (key.startsWith(`${projectId}:`)) {
        clearTimeout(timer);
        this.debounceTimers.delete(key);
      }
    });

    // 清理变更缓冲
    this.changeBuffer.forEach((_, key) => {
      if (key.startsWith(`${projectId}:`)) {
        this.changeBuffer.delete(key);
      }
    });

    await projectWatcher.watcher.close();
    this.watchers.delete(projectId);
    console.log(`[FileWatcher] Stopped watching ${projectId}`);
  }

  /**
   * 检查是否正在监听
   */
  isWatching(projectId: string): boolean {
    return this.watchers.has(projectId);
  }

  /**
   * 获取监听的项目列表
   */
  getWatchedProjects(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * 处理文件变化 (带防抖)
   */
  private handleChange(
    projectId: string,
    projectPath: string,
    fullPath: string,
    type: FileChangeEvent['type']
  ): void {
    const filePath = relative(projectPath, fullPath);
    const key = `${projectId}:${filePath}`;

    const event: FileChangeEvent = {
      projectId,
      filePath,
      fullPath,
      type,
      timestamp: Date.now(),
    };

    // 缓冲变更
    this.changeBuffer.set(key, event);

    // 清除现有定时器
    const existingTimer = this.debounceTimers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置新的防抖定时器
    const projectWatcher = this.watchers.get(projectId);
    const delay = projectWatcher?.options.debounceDelay ?? this.defaultDebounceDelay;

    const timer = setTimeout(() => {
      this.flushChange(key);
    }, delay);

    this.debounceTimers.set(key, timer);
  }

  /**
   * 触发缓冲的变更
   */
  private flushChange(key: string): void {
    const event = this.changeBuffer.get(key);
    if (!event) return;

    this.changeBuffer.delete(key);
    this.debounceTimers.delete(key);

    // 发送事件
    this.emit('change', event);
    this.emit(`change:${event.type}`, event);
  }

  /**
   * 立即触发所有待处理的变更
   */
  flushAll(): void {
    // 清除所有定时器
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();

    // 触发所有缓冲的变更
    this.changeBuffer.forEach((event, key) => {
      this.emit('change', event);
      this.emit(`change:${event.type}`, event);
    });
    this.changeBuffer.clear();
  }

  /**
   * 关闭所有监听器
   */
  async shutdown(): Promise<void> {
    const projectIds = Array.from(this.watchers.keys());
    await Promise.all(projectIds.map(id => this.unwatch(id)));
    console.log('[FileWatcher] All watchers closed');
  }
}

// 导出单例
export const fileWatcherManager = new FileWatcherManager();
