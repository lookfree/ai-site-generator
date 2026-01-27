/**
 * iframe 通信 Hook
 */

import { useEffect, useCallback, useRef } from 'react';
import { useEditorStore } from '../stores/editor-store';
import type { SelectedElementInfo, MessageType, EditorMessage, EditAction } from '../types';

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
  const addAction = useEditorStore(state => state.addAction);

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
    value: unknown,
    elementIndex?: number
  ) => {
    postMessage('UPDATE_ELEMENT', { jsxId, type, value, elementIndex });
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

        case 'ELEMENT_UPDATED': {
          // 元素属性更新后，只更新 computedStyles（需要从 iframe 获取）
          // className 由本地乐观更新处理，不需要从 iframe 同步
          const currentElement = useEditorStore.getState().selectedElement;
          const updatedInfo = payload as SelectedElementInfo;
          if (currentElement && currentElement.jsxId === updatedInfo.jsxId) {
            setSelectedElement({
              ...currentElement,
              // 更新计算样式（这些只能从 iframe 获取）
              computedStyles: updatedInfo.computedStyles,
              boundingRect: updatedInfo.boundingRect,
            });
          }
          break;
        }

        case 'TEXT_CHANGED': {
          // 用户在 iframe 中内联编辑文字时，记录到历史
          const { jsxId, text } = payload as { jsxId: string; text: string };
          const currentElement = useEditorStore.getState().selectedElement;
          console.log('[useIframeCommunication] TEXT_CHANGED received:', { jsxId, text, hasCurrentElement: !!currentElement });
          if (jsxId && currentElement) {
            console.log('[useIframeCommunication] Creating text action:', {
              jsxId,
              oldValue: currentElement.textContent,
              newValue: text,
              filePath: currentElement.jsxFile,
              jsxLine: currentElement.jsxLine,
              jsxCol: currentElement.jsxCol,
            });
            const action: EditAction = {
              id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              timestamp: Date.now(),
              jsxId,
              type: 'text',
              oldValue: currentElement.textContent,
              newValue: text,
              filePath: currentElement.jsxFile,
              jsxLine: currentElement.jsxLine,
              jsxCol: currentElement.jsxCol,
            };
            addAction(action);
            // 同步更新 selectedElement 的 textContent
            setSelectedElement({
              ...currentElement,
              textContent: text,
            });
          }
          break;
        }
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
  }, [setSelectedElement, addAction]);

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
