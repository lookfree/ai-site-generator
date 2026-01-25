/**
 * iframe 通信 Hook
 */

import { useEffect, useCallback, useRef } from 'react';
import { useEditorStore } from '../stores/editor-store';
import type { SelectedElementInfo, MessageType, EditorMessage } from '../types';

interface UseIframeCommunicationOptions {
  /** iframe 来源 */
  origin?: string;
}

/**
 * iframe 通信 Hook
 */
export function useIframeCommunication(options: UseIframeCommunicationOptions = {}) {
  const { origin = '*' } = options;
  const iframeRef = useEditorStore(state => state.iframeRef);
  const setSelectedElement = useEditorStore(state => state.setSelectedElement);
  const enableEditMode = useEditorStore(state => state.enableEditMode);
  const disableEditMode = useEditorStore(state => state.disableEditMode);

  const messageHandlersRef = useRef<Map<string, (payload: unknown) => void>>(new Map());

  /**
   * 向 iframe 发送消息
   */
  const postMessage = useCallback((type: MessageType, payload?: unknown) => {
    if (!iframeRef?.contentWindow) {
      console.warn('[VisualEditor] iframe not ready');
      return;
    }

    const message: EditorMessage = { type, payload };
    iframeRef.contentWindow.postMessage(message, origin);
  }, [iframeRef, origin]);

  /**
   * 注册消息处理器
   */
  const onMessage = useCallback((type: string, handler: (payload: unknown) => void) => {
    messageHandlersRef.current.set(type, handler);
    return () => {
      messageHandlersRef.current.delete(type);
    };
  }, []);

  /**
   * 启用编辑模式
   */
  const enableEdit = useCallback(() => {
    enableEditMode();
    postMessage('ENABLE_EDIT_MODE');
  }, [enableEditMode, postMessage]);

  /**
   * 禁用编辑模式
   */
  const disableEdit = useCallback(() => {
    disableEditMode();
    postMessage('DISABLE_EDIT_MODE');
  }, [disableEditMode, postMessage]);

  /**
   * 更新元素
   */
  const updateElement = useCallback((
    jsxId: string,
    type: 'text' | 'className' | 'style' | 'attribute',
    value: unknown
  ) => {
    postMessage('UPDATE_ELEMENT', { jsxId, type, value });
  }, [postMessage]);

  /**
   * 通过 JSX ID 选择元素
   */
  const selectByJsxId = useCallback((jsxId: string) => {
    postMessage('SELECT_BY_JSX_ID', { jsxId });
  }, [postMessage]);

  /**
   * 高亮元素
   */
  const highlightElement = useCallback((jsxId: string) => {
    postMessage('HIGHLIGHT_ELEMENT', { jsxId });
  }, [postMessage]);

  /**
   * 获取完整 HTML
   */
  const getFullHtml = useCallback(() => {
    postMessage('GET_FULL_HTML');
  }, [postMessage]);

  // 监听来自 iframe 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      // 处理内置消息
      switch (type) {
        case 'ELEMENT_SELECTED':
          setSelectedElement(payload as SelectedElementInfo);
          break;

        case 'ELEMENT_DESELECTED':
          setSelectedElement(null);
          break;
      }

      // 调用自定义处理器
      const handler = messageHandlersRef.current.get(type);
      if (handler) {
        handler(payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [setSelectedElement]);

  return {
    postMessage,
    onMessage,
    enableEdit,
    disableEdit,
    updateElement,
    selectByJsxId,
    highlightElement,
    getFullHtml,
  };
}
