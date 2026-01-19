// 编辑历史 Hook - 支持撤销/重做
import { useState, useCallback } from 'react';

export interface EditAction {
  id: string;
  timestamp: number;
  selector: string;
  property: string;
  oldValue: string;
  newValue: string;
}

interface UseEditHistoryReturn {
  history: EditAction[];
  currentIndex: number;
  canUndo: boolean;
  canRedo: boolean;
  addAction: (action: Omit<EditAction, 'id' | 'timestamp'>) => void;
  undo: () => EditAction | null;
  redo: () => EditAction | null;
  clear: () => void;
}

export function useEditHistory(maxHistory: number = 50): UseEditHistoryReturn {
  const [history, setHistory] = useState<EditAction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // 添加新的编辑操作
  const addAction = useCallback((action: Omit<EditAction, 'id' | 'timestamp'>) => {
    const newAction: EditAction = {
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      // 如果当前不在历史末尾，删除当前位置之后的所有记录
      const newHistory = prev.slice(0, currentIndex + 1);
      newHistory.push(newAction);

      // 限制历史记录数量
      if (newHistory.length > maxHistory) {
        return newHistory.slice(-maxHistory);
      }
      return newHistory;
    });

    setCurrentIndex((prev) => Math.min(prev + 1, maxHistory - 1));
  }, [currentIndex, maxHistory]);

  // 撤销
  const undo = useCallback((): EditAction | null => {
    if (currentIndex < 0) return null;

    const action = history[currentIndex];
    setCurrentIndex((prev) => prev - 1);
    return action;
  }, [currentIndex, history]);

  // 重做
  const redo = useCallback((): EditAction | null => {
    if (currentIndex >= history.length - 1) return null;

    const nextIndex = currentIndex + 1;
    const action = history[nextIndex];
    setCurrentIndex(nextIndex);
    return action;
  }, [currentIndex, history]);

  // 清空历史
  const clear = useCallback(() => {
    setHistory([]);
    setCurrentIndex(-1);
  }, []);

  return {
    history,
    currentIndex,
    canUndo: currentIndex >= 0,
    canRedo: currentIndex < history.length - 1,
    addAction,
    undo,
    redo,
    clear,
  };
}
