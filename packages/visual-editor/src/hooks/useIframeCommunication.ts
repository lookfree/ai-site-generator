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

  /**
   * 刷新元素信息 (用于 HMR 后获取最新的位置信息)
   */
  const refreshElementInfo = useCallback(() => {
    postMessage('REFRESH_ELEMENT_INFO');
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
          // 文本编辑框实时输入时，只更新 selectedElement 的 textContent（用于实时预览）
          // 不添加到 history，避免每次按键都创建 action
          // 最终保存由 TEXT_EDIT_CONFIRMED 处理
          const {
            jsxId,
            text,
            tagName,
            className,
            jsxFile,
            jsxLine,
            jsxCol,
          } = payload as {
            jsxId: string;
            text: string;
            originalText?: string;
            tagName?: string;
            className?: string;
            jsxFile?: string;
            jsxLine?: number;
            jsxCol?: number;
          };
          const currentElement = useEditorStore.getState().selectedElement;

          // 只更新 selectedElement 的 textContent，不添加到 history
          if (currentElement && currentElement.jsxId === jsxId) {
            setSelectedElement({
              ...currentElement,
              textContent: text,
              // 如果 iframe 提供了新的元信息，也更新
              ...(tagName && { tagName }),
              ...(className && { className }),
              ...(jsxFile && { jsxFile }),
              ...(jsxLine && { jsxLine }),
              ...(jsxCol && { jsxCol }),
            });
          }
          break;
        }

        case 'ELEMENT_INFO_REFRESHED': {
          // HMR 后刷新元素信息，更新位置信息以避免后续编辑应用到错误元素
          const refreshedInfo = payload as SelectedElementInfo | null;
          const currentElement = useEditorStore.getState().selectedElement;
          console.log('[useIframeCommunication] ELEMENT_INFO_REFRESHED:', {
            hasRefreshedInfo: !!refreshedInfo,
            oldLine: currentElement?.jsxLine,
            newLine: refreshedInfo?.jsxLine,
            oldCol: currentElement?.jsxCol,
            newCol: refreshedInfo?.jsxCol,
          });

          if (refreshedInfo && currentElement && currentElement.jsxId === refreshedInfo.jsxId) {
            // 更新 selectedElement 的位置信息
            setSelectedElement({
              ...currentElement,
              jsxFile: refreshedInfo.jsxFile,
              jsxLine: refreshedInfo.jsxLine,
              jsxCol: refreshedInfo.jsxCol,
              // Also update other info that might have changed
              className: refreshedInfo.className,
              textContent: refreshedInfo.textContent,
              computedStyles: refreshedInfo.computedStyles,
              boundingRect: refreshedInfo.boundingRect,
            });
          }
          break;
        }

        case 'TEXT_EDIT_CONFIRMED': {
          // 文本编辑确认 - 添加 action 到 history，然后 handler 会触发保存
          const {
            jsxId,
            text,
            originalText,
            tagName,
            className,
            jsxFile,
            jsxLine,
            jsxCol,
          } = payload as {
            jsxId: string;
            text: string;
            originalText?: string;
            tagName?: string;
            className?: string;
            jsxFile?: string;
            jsxLine?: number;
            jsxCol?: number;
          };
          const currentElement = useEditorStore.getState().selectedElement;
          console.log('[useIframeCommunication] TEXT_EDIT_CONFIRMED received:', {
            jsxId,
            text,
            originalText,
          });

          if (jsxId && text !== originalText) {
            // 创建 action 并添加到 history
            const filePath = jsxFile ?? currentElement?.jsxFile;
            const line = jsxLine ?? currentElement?.jsxLine;
            const col = jsxCol ?? currentElement?.jsxCol;

            const action: EditAction = {
              id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
              timestamp: Date.now(),
              jsxId,
              type: 'text',
              oldValue: originalText,
              newValue: text,
              filePath: filePath,
              jsxLine: line,
              jsxCol: col,
              tagName: tagName ?? currentElement?.tagName,
              className: className ?? currentElement?.className,
            };
            addAction(action);
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
    refreshElementInfo,
  };
}
