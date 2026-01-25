/**
 * 变更队列
 * 管理待处理的文件变更
 */

import { EventEmitter } from 'events';
import type { QueuedChange, QueueStats } from '../types';

export interface ChangeQueueOptions {
  /** 最大队列长度 */
  maxLength?: number;
  /** 处理间隔 (ms) */
  processInterval?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 重试延迟 (ms) */
  retryDelay?: number;
}

type ChangeProcessor = (change: QueuedChange) => Promise<boolean>;

/**
 * 变更队列管理器
 */
export class ChangeQueue extends EventEmitter {
  private queue: QueuedChange[] = [];
  private processing = new Set<string>();
  private completed = new Set<string>();
  private failed = new Map<string, string>(); // id -> error message
  private processor: ChangeProcessor | null = null;
  private processTimer: ReturnType<typeof setInterval> | null = null;
  private idCounter = 0;
  private options: Required<ChangeQueueOptions>;

  constructor(options: ChangeQueueOptions = {}) {
    super();
    this.options = {
      maxLength: options.maxLength ?? 1000,
      processInterval: options.processInterval ?? 50,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
    };
  }

  /**
   * 设置变更处理器
   */
  setProcessor(processor: ChangeProcessor): void {
    this.processor = processor;
  }

  /**
   * 启动队列处理
   */
  start(): void {
    if (this.processTimer) return;

    this.processTimer = setInterval(() => {
      this.processNext();
    }, this.options.processInterval);

    this.emit('started');
  }

  /**
   * 停止队列处理
   */
  stop(): void {
    if (this.processTimer) {
      clearInterval(this.processTimer);
      this.processTimer = null;
    }

    this.emit('stopped');
  }

  /**
   * 检查是否运行中
   */
  isRunning(): boolean {
    return this.processTimer !== null;
  }

  /**
   * 添加变更到队列
   */
  enqueue(
    projectId: string,
    filePath: string,
    changeType: QueuedChange['changeType'],
    content: string | null,
    priority: number = 0
  ): string {
    // 检查队列长度
    if (this.queue.length >= this.options.maxLength) {
      // 移除最低优先级的项
      this.queue.sort((a, b) => b.priority - a.priority);
      const removed = this.queue.pop();
      if (removed) {
        this.emit('change-dropped', { id: removed.id, reason: 'queue-full' });
      }
    }

    const id = this.generateId();

    const change: QueuedChange = {
      id,
      projectId,
      filePath,
      changeType,
      content,
      priority,
      createdAt: Date.now(),
      retries: 0,
    };

    // 检查是否已有相同文件的变更
    const existingIndex = this.queue.findIndex(
      c => c.projectId === projectId && c.filePath === filePath
    );

    if (existingIndex !== -1) {
      // 合并变更 (保留最新的)
      this.queue[existingIndex] = change;
      this.emit('change-merged', { id, filePath });
    } else {
      // 按优先级插入
      const insertIndex = this.queue.findIndex(c => c.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(change);
      } else {
        this.queue.splice(insertIndex, 0, change);
      }
      this.emit('change-enqueued', { id, filePath });
    }

    return id;
  }

  /**
   * 批量添加变更
   */
  enqueueBatch(
    changes: Array<{
      projectId: string;
      filePath: string;
      changeType: QueuedChange['changeType'];
      content: string | null;
      priority?: number;
    }>
  ): string[] {
    return changes.map(c =>
      this.enqueue(c.projectId, c.filePath, c.changeType, c.content, c.priority)
    );
  }

  /**
   * 处理下一个变更
   */
  private async processNext(): Promise<void> {
    if (!this.processor || this.queue.length === 0) return;

    // 获取下一个未处理的变更
    const change = this.queue.find(c => !this.processing.has(c.id));
    if (!change) return;

    this.processing.add(change.id);
    this.emit('change-processing', { id: change.id });

    try {
      const success = await this.processor(change);

      if (success) {
        // 成功处理
        this.queue = this.queue.filter(c => c.id !== change.id);
        this.processing.delete(change.id);
        this.completed.add(change.id);
        this.emit('change-completed', { id: change.id });
      } else {
        // 处理失败，安排重试
        this.handleFailure(change, 'Processing returned false');
      }
    } catch (error: any) {
      this.handleFailure(change, error.message);
    }
  }

  /**
   * 处理失败
   */
  private handleFailure(change: QueuedChange, errorMessage: string): void {
    this.processing.delete(change.id);

    if (change.retries < this.options.maxRetries) {
      // 增加重试次数
      change.retries++;
      change.priority -= 1; // 降低优先级

      this.emit('change-retry', {
        id: change.id,
        retries: change.retries,
        error: errorMessage,
      });

      // 延迟后重试
      setTimeout(() => {
        // 确保还在队列中
        const index = this.queue.findIndex(c => c.id === change.id);
        if (index !== -1) {
          // 重新排序
          this.queue.splice(index, 1);
          const insertIndex = this.queue.findIndex(c => c.priority < change.priority);
          if (insertIndex === -1) {
            this.queue.push(change);
          } else {
            this.queue.splice(insertIndex, 0, change);
          }
        }
      }, this.options.retryDelay);

    } else {
      // 重试次数用完，标记为失败
      this.queue = this.queue.filter(c => c.id !== change.id);
      this.failed.set(change.id, errorMessage);
      this.emit('change-failed', { id: change.id, error: errorMessage });
    }
  }

  /**
   * 获取变更状态
   */
  getStatus(id: string): 'queued' | 'processing' | 'completed' | 'failed' | 'unknown' {
    if (this.completed.has(id)) return 'completed';
    if (this.failed.has(id)) return 'failed';
    if (this.processing.has(id)) return 'processing';
    if (this.queue.some(c => c.id === id)) return 'queued';
    return 'unknown';
  }

  /**
   * 获取失败原因
   */
  getFailureReason(id: string): string | undefined {
    return this.failed.get(id);
  }

  /**
   * 获取队列统计
   */
  getStats(): QueueStats {
    return {
      length: this.queue.length,
      pending: this.queue.length - this.processing.size,
      processing: this.processing.size,
      completed: this.completed.size,
      failed: this.failed.size,
    };
  }

  /**
   * 获取队列中的变更
   */
  getQueued(): QueuedChange[] {
    return [...this.queue];
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = [];
    this.processing.clear();
    this.emit('queue-cleared');
  }

  /**
   * 清理历史记录
   */
  clearHistory(): void {
    this.completed.clear();
    this.failed.clear();
  }

  /**
   * 移除特定变更
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex(c => c.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.emit('change-removed', { id });
      return true;
    }
    return false;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `change_${Date.now()}_${this.idCounter++}`;
  }
}

// 导出单例
export const changeQueue = new ChangeQueue();
