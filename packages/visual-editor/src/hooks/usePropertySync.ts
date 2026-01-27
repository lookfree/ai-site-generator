/**
 * 属性同步 Hook
 */

import { useCallback } from 'react';
import { useEditorStore } from '../stores/editor-store';
import { useIframeCommunication } from './useIframeCommunication';
import type { StyleUpdatePayload, EditAction } from '../types';

/**
 * 属性同步 Hook
 * @param jsxId 目标元素的 JSX ID
 */
export function usePropertySync(jsxId: string) {
  const selectedElement = useEditorStore(state => state.selectedElement);
  const setSelectedElement = useEditorStore(state => state.setSelectedElement);
  const addAction = useEditorStore(state => state.addAction);
  const { updateElement } = useIframeCommunication();

  /**
   * 获取当前的类名列表
   */
  const getCurrentClasses = useCallback((): string[] => {
    if (!selectedElement || selectedElement.jsxId !== jsxId) {
      return [];
    }
    return selectedElement.className.split(/\s+/).filter(Boolean);
  }, [selectedElement, jsxId]);

  /**
   * 更新样式 (className)
   */
  const updateStyle = useCallback((payload: StyleUpdatePayload) => {
    if (!selectedElement || selectedElement.jsxId !== jsxId) {
      return;
    }

    const currentClasses = getCurrentClasses();
    let newClasses: string[];

    if (payload.className !== undefined) {
      // 完全替换
      newClasses = payload.className.split(/\s+/).filter(Boolean);
    } else {
      // 增量修改
      newClasses = [...currentClasses];

      // 移除类
      if (payload.removeClasses) {
        newClasses = newClasses.filter(c => !payload.removeClasses!.includes(c));
      }

      // 添加类
      if (payload.addClasses) {
        for (const cls of payload.addClasses) {
          if (!newClasses.includes(cls)) {
            newClasses.push(cls);
          }
        }
      }
    }

    const newClassName = newClasses.join(' ');

    // 记录历史 (携带位置信息用于精确 AST 定位)
    const action: EditAction = {
      id: `action-${Date.now()}`,
      timestamp: Date.now(),
      jsxId,
      type: 'className',
      oldValue: selectedElement.className,
      newValue: newClassName,
      filePath: selectedElement.jsxFile,
      jsxLine: selectedElement.jsxLine,
      jsxCol: selectedElement.jsxCol,
    };
    addAction(action);

    // 乐观更新: 立即更新本地状态以获得即时 UI 反馈
    setSelectedElement({
      ...selectedElement,
      className: newClassName,
    });

    // 更新 iframe 中的元素
    updateElement(jsxId, 'className', newClassName, selectedElement.elementIndex);

    // 处理行内样式
    if (payload.style) {
      updateElement(jsxId, 'style', payload.style, selectedElement.elementIndex);
    }
  }, [selectedElement, jsxId, getCurrentClasses, addAction, updateElement, setSelectedElement]);

  /**
   * 更新文本内容
   */
  const updateText = useCallback((text: string) => {
    if (!selectedElement || selectedElement.jsxId !== jsxId) {
      return;
    }

    // 记录历史 (携带位置信息用于精确 AST 定位)
    const action: EditAction = {
      id: `action-${Date.now()}`,
      timestamp: Date.now(),
      jsxId,
      type: 'text',
      oldValue: selectedElement.textContent,
      newValue: text,
      filePath: selectedElement.jsxFile,
      jsxLine: selectedElement.jsxLine,
      jsxCol: selectedElement.jsxCol,
    };
    addAction(action);

    // 更新 iframe 中的元素
    updateElement(jsxId, 'text', text, selectedElement.elementIndex);
  }, [selectedElement, jsxId, addAction, updateElement]);

  /**
   * 更新属性
   */
  const updateAttribute = useCallback((name: string, value: string | null) => {
    if (!selectedElement || selectedElement.jsxId !== jsxId) {
      return;
    }

    // 记录历史 (携带位置信息用于精确 AST 定位)
    const action: EditAction = {
      id: `action-${Date.now()}`,
      timestamp: Date.now(),
      jsxId,
      type: 'attribute',
      oldValue: { name, value: selectedElement.attributes[name] ?? null },
      newValue: { name, value },
      filePath: selectedElement.jsxFile,
      jsxLine: selectedElement.jsxLine,
      jsxCol: selectedElement.jsxCol,
    };
    addAction(action);

    // 更新 iframe 中的元素
    updateElement(jsxId, 'attribute', { name, value }, selectedElement.elementIndex);
  }, [selectedElement, jsxId, addAction, updateElement]);

  return {
    getCurrentClasses,
    updateStyle,
    updateText,
    updateAttribute,
  };
}
