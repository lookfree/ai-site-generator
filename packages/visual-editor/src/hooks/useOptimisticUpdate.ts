/**
 * 乐观更新 Hook
 */

import { useCallback, useRef } from 'react';
import { useIframeCommunication } from './useIframeCommunication';

interface OptimisticUpdateOptions {
  /** 防抖延迟 (ms) */
  debounceDelay?: number;
}

/**
 * 乐观更新 Hook
 * 用于实现即时的 UI 反馈
 */
export function useOptimisticUpdate(options: OptimisticUpdateOptions = {}) {
  const { debounceDelay = 0 } = options;
  const { updateElement } = useIframeCommunication();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, unknown>>(new Map());

  /**
   * 立即更新 (乐观更新)
   */
  const immediateUpdate = useCallback((
    jsxId: string,
    type: 'text' | 'className' | 'style' | 'attribute',
    value: unknown
  ) => {
    updateElement(jsxId, type, value);
  }, [updateElement]);

  /**
   * 防抖更新
   * 用于频繁更新的场景 (如拖动滑块)
   */
  const debouncedUpdate = useCallback((
    jsxId: string,
    type: 'text' | 'className' | 'style' | 'attribute',
    value: unknown,
    onCommit?: () => void
  ) => {
    // 立即更新 UI (乐观)
    updateElement(jsxId, type, value);

    // 缓存更新
    const key = `${jsxId}:${type}`;
    pendingUpdatesRef.current.set(key, value);

    // 清除之前的定时器
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // 设置新的定时器
    debounceTimerRef.current = setTimeout(() => {
      // 提交更新
      if (onCommit) {
        onCommit();
      }
      pendingUpdatesRef.current.delete(key);
    }, debounceDelay);
  }, [updateElement, debounceDelay]);

  /**
   * 批量更新
   */
  const batchUpdate = useCallback((
    updates: Array<{
      jsxId: string;
      type: 'text' | 'className' | 'style' | 'attribute';
      value: unknown;
    }>
  ) => {
    for (const update of updates) {
      updateElement(update.jsxId, update.type, update.value);
    }
  }, [updateElement]);

  /**
   * 取消待定更新
   */
  const cancelPending = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingUpdatesRef.current.clear();
  }, []);

  return {
    immediateUpdate,
    debouncedUpdate,
    batchUpdate,
    cancelPending,
  };
}
