/**
 * iframe 通信 Hook
 */

import { useEffect, useCallback } from 'react';
import { useEditorStore } from '../stores/editor-store';
import type { SelectedElementInfo, MessageType, EditorMessage, EditAction } from '../types';

interface UseIframeCommunicationOptions {
  /** iframe 来源 */
  origin?: string;
}

// 使用 window 对象存储全局消息处理器，确保跨 HMR 持久化
const GLOBAL_HANDLERS_KEY = '__visual_editor_message_handlers__';
const GLOBAL_LISTENER_KEY = '__visual_editor_listener_initialized__';
declare global {
  interface Window {
    [GLOBAL_HANDLERS_KEY]?: Map<string, (payload: unknown) => void>;
    [GLOBAL_LISTENER_KEY]?: boolean;
  }
}

// 获取或创建全局消息处理器 Map
function getGlobalMessageHandlers(): Map<string, (payload: unknown) => void> {
  if (!window[GLOBAL_HANDLERS_KEY]) {
    window[GLOBAL_HANDLERS_KEY] = new Map();
  }
  return window[GLOBAL_HANDLERS_KEY];
}

// 存储内置消息处理函数的引用，用于全局 listener
let builtInHandlers: {
  setSelectedElement: (element: SelectedElementInfo | null) => void;
  addAction: (action: EditAction) => void;
} | null = null;

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
    console.log(`[useIframeCommunication] onMessage called: registering handler for ${type}`);
    // 直接使用 window 上的 Map，确保始终访问同一个实例
    const handlers = getGlobalMessageHandlers();
    handlers.set(type, handler);
    console.log(`[useIframeCommunication] Handler registered, total handlers: ${handlers.size}, types: [${Array.from(handlers.keys()).join(',')}]`);
    return () => {
      const handlers = getGlobalMessageHandlers();
      handlers.delete(type);
      console.log(`[useIframeCommunication] Handler unregistered for ${type}`);
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

  /**
   * 通知文本保存完成 (用于关闭文本编辑框)
   */
  const notifyTextSaveComplete = useCallback(() => {
    postMessage('TEXT_SAVE_COMPLETE');
  }, [postMessage]);

  // 更新内置处理函数引用（用于全局 listener）
  useEffect(() => {
    builtInHandlers = { setSelectedElement, addAction };
  }, [setSelectedElement, addAction]);

  // 初始化全局消息监听器（只执行一次）
  useEffect(() => {
    if (window[GLOBAL_LISTENER_KEY]) {
      return; // 已经初始化过，跳过
    }
    window[GLOBAL_LISTENER_KEY] = true;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      if (!type) return;

      // Debug: log incoming messages (只打印一次)
      console.log(`[useIframeCommunication] Received message: type=${type}`);

      // 获取最新的内置处理函数
      const handlers = builtInHandlers;
      if (!handlers) return;

      const { setSelectedElement: setElement, addAction: addAct } = handlers;

      // 处理内置消息
      switch (type) {
        case 'ELEMENT_SELECTED':
          setElement(payload as SelectedElementInfo);
          break;

        case 'ELEMENT_DESELECTED':
          setElement(null);
          break;

        case 'ELEMENT_UPDATED': {
          const currentElement = useEditorStore.getState().selectedElement;
          const updatedInfo = payload as SelectedElementInfo;
          if (currentElement && currentElement.jsxId === updatedInfo.jsxId) {
            setElement({
              ...currentElement,
              computedStyles: updatedInfo.computedStyles,
              boundingRect: updatedInfo.boundingRect,
            });
          }
          break;
        }

        case 'TEXT_CHANGED': {
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

          if (currentElement && currentElement.jsxId === jsxId) {
            setElement({
              ...currentElement,
              textContent: text,
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
          const refreshedInfo = payload as SelectedElementInfo | null;
          const currentElement = useEditorStore.getState().selectedElement;
          console.log('[useIframeCommunication] ELEMENT_INFO_REFRESHED:', {
            hasRefreshedInfo: !!refreshedInfo,
            oldLine: currentElement?.jsxLine,
            newLine: refreshedInfo?.jsxLine,
          });

          if (refreshedInfo && currentElement && currentElement.jsxId === refreshedInfo.jsxId) {
            setElement({
              ...currentElement,
              jsxFile: refreshedInfo.jsxFile,
              jsxLine: refreshedInfo.jsxLine,
              jsxCol: refreshedInfo.jsxCol,
              className: refreshedInfo.className,
              textContent: refreshedInfo.textContent,
              computedStyles: refreshedInfo.computedStyles,
              boundingRect: refreshedInfo.boundingRect,
            });
          }
          break;
        }

        case 'TEXT_EDIT_CONFIRMED': {
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
            addAct(action);
          }
          break;
        }
      }

      // 调用自定义处理器
      const customHandlers = getGlobalMessageHandlers();
      const handler = customHandlers.get(type);
      const registeredTypes = Array.from(customHandlers.keys());
      console.log(`[useIframeCommunication] Looking for handler: type=${type}, hasHandler=${!!handler}, registered=[${registeredTypes.join(',')}]`);
      if (handler) {
        console.log(`[useIframeCommunication] Calling custom handler for: ${type}`);
        handler(payload);
      }
    };

    window.addEventListener('message', handleMessage);
    // 注意：不 cleanup，因为这是全局唯一的 listener
  }, []);

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
    notifyTextSaveComplete,
  };
}
