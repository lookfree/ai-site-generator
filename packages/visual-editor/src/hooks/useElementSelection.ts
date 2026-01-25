/**
 * 元素选择 Hook
 */

import { useCallback, useEffect } from 'react';
import { useEditorStore } from '../stores/editor-store';
import { useIframeCommunication } from './useIframeCommunication';
import type { SelectedElementInfo } from '../types';

/**
 * 元素选择 Hook
 */
export function useElementSelection() {
  const selectedElement = useEditorStore(state => state.selectedElement);
  const setSelectedElement = useEditorStore(state => state.setSelectedElement);
  const { selectByJsxId, highlightElement, onMessage } = useIframeCommunication();

  /**
   * 选择元素
   */
  const selectElement = useCallback((jsxId: string) => {
    selectByJsxId(jsxId);
  }, [selectByJsxId]);

  /**
   * 取消选择
   */
  const deselectElement = useCallback(() => {
    setSelectedElement(null);
  }, [setSelectedElement]);

  /**
   * 高亮元素 (临时)
   */
  const highlight = useCallback((jsxId: string) => {
    highlightElement(jsxId);
  }, [highlightElement]);

  // 监听文本变化
  useEffect(() => {
    return onMessage('TEXT_CHANGED', (payload) => {
      const { jsxId, text } = payload as { jsxId: string; text: string };

      // 更新选中元素的文本内容
      if (selectedElement && selectedElement.jsxId === jsxId) {
        setSelectedElement({
          ...selectedElement,
          textContent: text,
        });
      }
    });
  }, [onMessage, selectedElement, setSelectedElement]);

  return {
    selectedElement,
    selectElement,
    deselectElement,
    highlight,
  };
}

/**
 * 获取元素的显示名称
 */
export function getElementDisplayName(element: SelectedElementInfo): string {
  const { tagName, className, jsxId } = element;

  // 尝试从 className 中提取有意义的名称
  const classes = className.split(/\s+/).filter(Boolean);
  const meaningfulClass = classes.find(c =>
    !c.startsWith('text-') &&
    !c.startsWith('bg-') &&
    !c.startsWith('p-') &&
    !c.startsWith('m-') &&
    !c.startsWith('flex') &&
    !c.startsWith('grid')
  );

  if (meaningfulClass) {
    return `<${tagName} class="${meaningfulClass}">`;
  }

  return `<${tagName}> (${jsxId.slice(0, 8)})`;
}
