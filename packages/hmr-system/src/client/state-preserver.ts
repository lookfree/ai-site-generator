/**
 * 状态保持管理
 * 在 HMR 过程中保持组件状态
 */

import { EventEmitter } from 'events';
import type { ComponentState } from '../types';

export interface StatePreserverOptions {
  /** 状态过期时间 (ms) */
  stateExpiry?: number;
  /** 最大保存状态数 */
  maxStates?: number;
}

/**
 * 状态保持器
 */
export class StatePreserver extends EventEmitter {
  private savedStates = new Map<string, ComponentState>();
  private iframe: HTMLIFrameElement | null = null;
  private messageHandler: ((event: MessageEvent) => void) | null = null;
  private options: Required<StatePreserverOptions>;

  constructor(options: StatePreserverOptions = {}) {
    super();
    this.options = {
      stateExpiry: options.stateExpiry ?? 30000,
      maxStates: options.maxStates ?? 100,
    };
  }

  /**
   * 设置 iframe 并开始监听消息
   */
  setIframe(iframe: HTMLIFrameElement | null): void {
    // 移除旧的监听器
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }

    this.iframe = iframe;

    // 设置新的监听器
    if (iframe) {
      this.messageHandler = (event: MessageEvent) => this.handleMessage(event);
      window.addEventListener('message', this.messageHandler);
    }
  }

  /**
   * 处理来自 iframe 的消息
   */
  private handleMessage(event: MessageEvent): void {
    const { type, payload } = event.data || {};

    switch (type) {
      case 'COMPONENT_STATE':
        if (payload?.jsxId && payload?.state) {
          this.receiveState(payload.jsxId, payload.state);
        }
        break;

      case 'ALL_STATES':
        if (payload?.states) {
          for (const [jsxId, state] of Object.entries(payload.states)) {
            this.receiveState(jsxId, state as Record<string, any>);
          }
        }
        break;
    }
  }

  /**
   * 请求保存组件状态
   */
  saveState(jsxId: string): void {
    if (!this.iframe?.contentWindow) return;

    this.iframe.contentWindow.postMessage({
      type: 'GET_COMPONENT_STATE',
      payload: { jsxId },
    }, '*');
  }

  /**
   * 接收保存的状态
   */
  receiveState(jsxId: string, state: Record<string, any>): void {
    // 检查是否超过最大限制
    if (this.savedStates.size >= this.options.maxStates) {
      // 删除最旧的状态
      const oldest = Array.from(this.savedStates.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) {
        this.savedStates.delete(oldest[0]);
      }
    }

    this.savedStates.set(jsxId, {
      componentId: jsxId,
      jsxId,
      state,
      timestamp: Date.now(),
    });

    this.emit('state-saved', { jsxId });
  }

  /**
   * 手动保存状态
   */
  saveStateManually(jsxId: string, state: Record<string, any>): void {
    this.receiveState(jsxId, state);
  }

  /**
   * 恢复组件状态
   */
  restoreState(jsxId: string): boolean {
    const saved = this.savedStates.get(jsxId);
    if (!saved || !this.iframe?.contentWindow) return false;

    this.iframe.contentWindow.postMessage({
      type: 'RESTORE_COMPONENT_STATE',
      payload: {
        jsxId,
        state: saved.state,
      },
    }, '*');

    // 清理已恢复的状态
    this.savedStates.delete(jsxId);

    this.emit('state-restored', { jsxId });

    return true;
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
   * 恢复所有保存的状态
   */
  restoreAllStates(): void {
    const jsxIds = Array.from(this.savedStates.keys());

    for (const jsxId of jsxIds) {
      this.restoreState(jsxId);
    }
  }

  /**
   * 获取保存的状态
   */
  getSavedState(jsxId: string): ComponentState | undefined {
    return this.savedStates.get(jsxId);
  }

  /**
   * 检查是否有保存的状态
   */
  hasSavedState(jsxId: string): boolean {
    return this.savedStates.has(jsxId);
  }

  /**
   * 获取所有保存的状态
   */
  getAllSavedStates(): ComponentState[] {
    return Array.from(this.savedStates.values());
  }

  /**
   * 获取保存状态的数量
   */
  getSavedCount(): number {
    return this.savedStates.size;
  }

  /**
   * 清除特定组件的状态
   */
  clearState(jsxId: string): void {
    this.savedStates.delete(jsxId);
  }

  /**
   * 清除所有保存的状态
   */
  clearAllStates(): void {
    this.savedStates.clear();
  }

  /**
   * 清理过期状态
   */
  cleanup(maxAge?: number): number {
    const expiry = maxAge ?? this.options.stateExpiry;
    const now = Date.now();
    let cleaned = 0;

    for (const [id, state] of this.savedStates) {
      if (now - state.timestamp > expiry) {
        this.savedStates.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.emit('states-cleaned', { count: cleaned });
    }

    return cleaned;
  }

  /**
   * 销毁
   */
  destroy(): void {
    if (this.messageHandler) {
      window.removeEventListener('message', this.messageHandler);
      this.messageHandler = null;
    }

    this.savedStates.clear();
    this.iframe = null;
  }
}

// 导出单例
export const statePreserver = new StatePreserver();
