/**
 * 编辑历史 Hook
 */

import { useCallback } from 'react';
import { useEditorStore } from '../stores/editor-store';
import { useIframeCommunication } from './useIframeCommunication';
import type { EditAction } from '../types';

/**
 * 编辑历史 Hook
 */
export function useEditHistory() {
  const undo = useEditorStore(state => state.undo);
  const redo = useEditorStore(state => state.redo);
  const canUndo = useEditorStore(state => state.canUndo);
  const canRedo = useEditorStore(state => state.canRedo);
  const history = useEditorStore(state => state.history);
  const historyIndex = useEditorStore(state => state.historyIndex);
  const { updateElement } = useIframeCommunication();

  /**
   * 应用动作的逆操作
   */
  const applyInverse = useCallback((action: EditAction) => {
    updateElement(action.jsxId, action.type, action.oldValue);
  }, [updateElement]);

  /**
   * 应用动作
   */
  const applyAction = useCallback((action: EditAction) => {
    updateElement(action.jsxId, action.type, action.newValue);
  }, [updateElement]);

  /**
   * 执行撤销
   */
  const handleUndo = useCallback(() => {
    const action = undo();
    if (action) {
      applyInverse(action);
    }
    return action;
  }, [undo, applyInverse]);

  /**
   * 执行重做
   */
  const handleRedo = useCallback(() => {
    const action = redo();
    if (action) {
      applyAction(action);
    }
    return action;
  }, [redo, applyAction]);

  return {
    undo: handleUndo,
    redo: handleRedo,
    canUndo: canUndo(),
    canRedo: canRedo(),
    history,
    historyIndex,
  };
}
