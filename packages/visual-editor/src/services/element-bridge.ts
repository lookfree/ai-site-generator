/**
 * 元素桥接服务
 * 处理父子窗口通信
 */

import type { EditorMessage, MessageType } from '../types';

type MessageHandler = (payload: unknown) => void;

/**
 * 元素桥接服务
 */
export class ElementBridge {
  private iframe: HTMLIFrameElement | null = null;
  private origin: string = '*';
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private isListening: boolean = false;

  /**
   * 设置 iframe 引用
   */
  setIframe(iframe: HTMLIFrameElement | null): void {
    this.iframe = iframe;
  }

  /**
   * 设置允许的来源
   */
  setOrigin(origin: string): void {
    this.origin = origin;
  }

  /**
   * 开始监听消息
   */
  startListening(): void {
    if (this.isListening) return;

    window.addEventListener('message', this.handleMessage);
    this.isListening = true;
  }

  /**
   * 停止监听消息
   */
  stopListening(): void {
    if (!this.isListening) return;

    window.removeEventListener('message', this.handleMessage);
    this.isListening = false;
  }

  /**
   * 发送消息到 iframe
   */
  send(type: MessageType, payload?: unknown): void {
    if (!this.iframe?.contentWindow) {
      console.warn('[ElementBridge] iframe not available');
      return;
    }

    const message: EditorMessage = { type, payload };
    this.iframe.contentWindow.postMessage(message, this.origin);
  }

  /**
   * 订阅消息
   */
  subscribe(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }

    this.handlers.get(type)!.add(handler);

    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * 启用编辑模式
   */
  enableEditMode(): void {
    this.send('ENABLE_EDIT_MODE');
  }

  /**
   * 禁用编辑模式
   */
  disableEditMode(): void {
    this.send('DISABLE_EDIT_MODE');
  }

  /**
   * 更新元素
   */
  updateElement(
    jsxId: string,
    type: 'text' | 'className' | 'style' | 'attribute',
    value: unknown,
    elementIndex?: number
  ): void {
    this.send('UPDATE_ELEMENT', { jsxId, type, value, elementIndex });
  }

  /**
   * 通过 JSX ID 选择元素
   */
  selectByJsxId(jsxId: string): void {
    this.send('SELECT_BY_JSX_ID', { jsxId });
  }

  /**
   * 高亮元素
   */
  highlightElement(jsxId: string): void {
    this.send('HIGHLIGHT_ELEMENT', { jsxId });
  }

  /**
   * 获取完整 HTML
   */
  requestFullHtml(): void {
    this.send('GET_FULL_HTML');
  }

  /**
   * 处理消息
   */
  private handleMessage = (event: MessageEvent): void => {
    const { type, payload } = event.data || {};

    const handlers = this.handlers.get(type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[ElementBridge] Error in handler for ${type}:`, error);
        }
      }
    }
  };

  /**
   * 销毁服务
   */
  destroy(): void {
    this.stopListening();
    this.handlers.clear();
    this.iframe = null;
  }
}

// 导出单例实例
export const elementBridge = new ElementBridge();
