/**
 * 文件同步服务
 * 处理代码变更的文件写入
 */

import { writeFile, readFile, mkdir, access } from 'fs/promises';
import { dirname, join } from 'path';
import { EventEmitter } from 'events';
import type { FileChange, SyncResult, BatchSyncResult } from '../types';

export interface FileSyncServiceOptions {
  /** 防抖延迟 (ms) */
  debounceDelay?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 写入超时 (ms) */
  writeTimeout?: number;
}

/**
 * 文件同步服务
 */
export class FileSyncService extends EventEmitter {
  private pendingChanges = new Map<string, FileChange>();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private options: Required<FileSyncServiceOptions>;
  private isProcessing = false;

  constructor(options: FileSyncServiceOptions = {}) {
    super();
    this.options = {
      debounceDelay: options.debounceDelay ?? 100,
      maxRetries: options.maxRetries ?? 3,
      writeTimeout: options.writeTimeout ?? 5000,
    };
  }

  /**
   * 启动同步服务
   */
  start(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.processPendingChanges();
    }, this.options.debounceDelay);

    this.emit('started');
  }

  /**
   * 停止同步服务
   */
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    this.emit('stopped');
  }

  /**
   * 检查是否运行中
   */
  isRunning(): boolean {
    return this.syncInterval !== null;
  }

  /**
   * 添加文件变更到队列
   */
  queueChange(
    projectId: string,
    filePath: string,
    content: string,
    source: 'editor' | 'external' = 'editor'
  ): void {
    const key = `${projectId}:${filePath}`;

    this.pendingChanges.set(key, {
      projectId,
      filePath,
      content,
      timestamp: Date.now(),
      source,
    });

    this.emit('change-queued', { projectId, filePath });
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
    const startTime = Date.now();
    const fullPath = join(projectPath, filePath);

    try {
      // 确保目录存在
      const dir = dirname(fullPath);
      await this.ensureDir(dir);

      // 写入文件
      await this.writeFileWithTimeout(fullPath, content);

      const duration = Date.now() - startTime;

      this.emit('file-synced', { projectId, filePath, duration });

      return {
        success: true,
        filePath,
        duration,
      };

    } catch (error: any) {
      const duration = Date.now() - startTime;

      this.emit('sync-error', { projectId, filePath, error: error.message });

      return {
        success: false,
        filePath,
        error: error.message,
        duration,
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
  ): Promise<BatchSyncResult> {
    const results = await Promise.all(
      files.map(file => this.syncImmediately(projectId, projectPath, file.path, file.content))
    );

    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    this.emit('batch-synced', { projectId, total: files.length, succeeded, failed });

    return {
      total: files.length,
      succeeded,
      failed,
      results,
    };
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
   * 检查文件是否存在
   */
  async fileExists(projectPath: string, filePath: string): Promise<boolean> {
    const fullPath = join(projectPath, filePath);

    try {
      await access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取待处理变更数
   */
  getPendingCount(): number {
    return this.pendingChanges.size;
  }

  /**
   * 获取待处理变更列表
   */
  getPendingChanges(): FileChange[] {
    return Array.from(this.pendingChanges.values());
  }

  /**
   * 清除待处理变更
   */
  clearPendingChanges(): void {
    this.pendingChanges.clear();
  }

  /**
   * 处理待处理的变更
   */
  private async processPendingChanges(): Promise<void> {
    if (this.pendingChanges.size === 0 || this.isProcessing) return;

    this.isProcessing = true;

    try {
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

        // 注意：这里需要知道项目路径
        // 实际使用时应该通过 ProjectManager 获取
        // 这里只是标记需要处理
        this.emit('changes-ready', {
          projectId,
          changes: projectChanges,
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDir(dir: string): Promise<void> {
    try {
      await access(dir);
    } catch {
      await mkdir(dir, { recursive: true });
    }
  }

  /**
   * 带超时的文件写入
   */
  private async writeFileWithTimeout(
    fullPath: string,
    content: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Write timeout for ${fullPath}`));
      }, this.options.writeTimeout);

      writeFile(fullPath, content, 'utf-8')
        .then(() => {
          clearTimeout(timeout);
          resolve();
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }
}

// 导出单例
export const fileSyncService = new FileSyncService();
