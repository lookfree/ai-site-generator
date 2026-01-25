/**
 * 乐观更新系统
 * 实现即时 DOM 反馈
 */

import { EventEmitter } from 'events';
import type { OptimisticUpdate, UpdateResult } from '../types';

export interface OptimisticUpdaterOptions {
  /** 最大待处理更新数 */
  maxPendingUpdates?: number;
  /** 确认超时 (ms) */
  confirmTimeout?: number;
  /** 清理间隔 (ms) */
  cleanupInterval?: number;
}

/**
 * 乐观更新管理器
 */
export class OptimisticUpdater extends EventEmitter {
  private pendingUpdates = new Map<string, OptimisticUpdate>();
  private confirmedUpdates = new Map<string, OptimisticUpdate>();
  private iframe: HTMLIFrameElement | null = null;
  private updateIdCounter = 0;
  private options: Required<OptimisticUpdaterOptions>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  private confirmTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(options: OptimisticUpdaterOptions = {}) {
    super();
    this.options = {
      maxPendingUpdates: options.maxPendingUpdates ?? 100,
      confirmTimeout: options.confirmTimeout ?? 5000,
      cleanupInterval: options.cleanupInterval ?? 60000,
    };
  }

  /**
   * 设置 iframe 引用
   */
  setIframe(iframe: HTMLIFrameElement | null): void {
    this.iframe = iframe;
  }

  /**
   * 启动清理定时器
   */
  startCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 应用乐观更新
   */
  applyUpdate(
    jsxId: string,
    type: OptimisticUpdate['type'],
    newValue: any
  ): string {
    // 检查是否超过最大待处理数
    if (this.pendingUpdates.size >= this.options.maxPendingUpdates) {
      console.warn('[OptimisticUpdater] Max pending updates reached');
      // 清理最旧的待处理更新
      const oldest = Array.from(this.pendingUpdates.entries())[0];
      if (oldest) {
        this.rollbackUpdate(oldest[0]);
      }
    }

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

    // 设置确认超时
    const timeout = setTimeout(() => {
      console.warn(`[OptimisticUpdater] Update ${updateId} timed out, rolling back`);
      this.rollbackUpdate(updateId);
    }, this.options.confirmTimeout);

    this.confirmTimeouts.set(updateId, timeout);

    this.emit('update-applied', update);

    return updateId;
  }

  /**
   * 批量应用更新
   */
  applyBatchUpdate(
    updates: Array<{
      jsxId: string;
      type: OptimisticUpdate['type'];
      newValue: any;
    }>
  ): string[] {
    return updates.map(u => this.applyUpdate(u.jsxId, u.type, u.newValue));
  }

  /**
   * 确认更新 (HMR 完成后)
   */
  confirmUpdate(updateId: string): void {
    const update = this.pendingUpdates.get(updateId);
    if (!update) return;

    // 清除超时
    const timeout = this.confirmTimeouts.get(updateId);
    if (timeout) {
      clearTimeout(timeout);
      this.confirmTimeouts.delete(updateId);
    }

    update.status = 'confirmed';
    this.pendingUpdates.delete(updateId);
    this.confirmedUpdates.set(updateId, update);

    this.emit('update-confirmed', update);
  }

  /**
   * 批量确认更新
   */
  confirmBatchUpdate(updateIds: string[]): void {
    updateIds.forEach(id => this.confirmUpdate(id));
  }

  /**
   * 回滚更新
   */
  rollbackUpdate(updateId: string): void {
    const update = this.pendingUpdates.get(updateId);
    if (!update) return;

    // 清除超时
    const timeout = this.confirmTimeouts.get(updateId);
    if (timeout) {
      clearTimeout(timeout);
      this.confirmTimeouts.delete(updateId);
    }

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
   * 回滚所有待处理更新
   */
  rollbackAll(): void {
    const updateIds = Array.from(this.pendingUpdates.keys());
    updateIds.forEach(id => this.rollbackUpdate(id));
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
        return null; // 需要知道具体属性名
      default:
        return null;
    }
  }

  /**
   * 获取直接文本内容
   */
  private getDirectTextContent(element: HTMLElement): string {
    let text = '';
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  /**
   * 生成更新 ID
   */
  private generateUpdateId(): string {
    return `update_${Date.now()}_${this.updateIdCounter++}`;
  }

  /**
   * 获取待处理更新
   */
  getPendingUpdate(updateId: string): OptimisticUpdate | undefined {
    return this.pendingUpdates.get(updateId);
  }

  /**
   * 获取待处理更新数量
   */
  getPendingCount(): number {
    return this.pendingUpdates.size;
  }

  /**
   * 获取所有待处理更新
   */
  getAllPendingUpdates(): OptimisticUpdate[] {
    return Array.from(this.pendingUpdates.values());
  }

  /**
   * 检查是否有待处理的更新
   */
  hasPendingUpdates(): boolean {
    return this.pendingUpdates.size > 0;
  }

  /**
   * 获取指定 JSX ID 的待处理更新
   */
  getPendingUpdatesForElement(jsxId: string): OptimisticUpdate[] {
    return Array.from(this.pendingUpdates.values()).filter(u => u.jsxId === jsxId);
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

  /**
   * 销毁
   */
  destroy(): void {
    this.stopCleanup();

    // 清除所有超时
    this.confirmTimeouts.forEach(timeout => clearTimeout(timeout));
    this.confirmTimeouts.clear();

    // 回滚所有待处理更新
    this.rollbackAll();

    this.pendingUpdates.clear();
    this.confirmedUpdates.clear();
    this.iframe = null;
  }
}

// 导出单例
export const optimisticUpdater = new OptimisticUpdater();
