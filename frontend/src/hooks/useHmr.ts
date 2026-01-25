/**
 * HMR Hook
 * 提供 HMR WebSocket 连接管理和状态
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getHmrWebSocketUrl } from '../services/api';

export type HmrConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface HmrUpdate {
  type: string;
  path: string;
  acceptedPath?: string;
  timestamp?: number;
}

export interface HmrError {
  message: string;
  stack?: string;
}

interface HmrMessage {
  type: string;
  updates?: HmrUpdate[];
  path?: string;
  paths?: string[];
  err?: HmrError;
  data?: unknown;
}

export interface UseHmrOptions {
  /** 是否自动连接 */
  autoConnect?: boolean;
  /** 更新回调 */
  onUpdate?: (update: HmrUpdate) => void;
  /** 错误回调 */
  onError?: (error: HmrError) => void;
  /** 连接成功回调 */
  onConnected?: () => void;
  /** 断开连接回调 */
  onDisconnected?: () => void;
  /** 完全重载回调 */
  onFullReload?: () => void;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 重连基础延迟 (ms) */
  reconnectDelay?: number;
}

export interface UseHmrReturn {
  /** 连接状态 */
  status: HmrConnectionStatus;
  /** 是否已连接 */
  isConnected: boolean;
  /** 当前错误 */
  error: HmrError | null;
  /** 更新计数 */
  updateCount: number;
  /** 手动连接 */
  connect: () => void;
  /** 手动断开 */
  disconnect: () => void;
  /** 重置错误 */
  clearError: () => void;
  /** 重置重连计数 */
  resetReconnectAttempts: () => void;
}

const DEFAULT_MAX_RECONNECT_ATTEMPTS = 10;
const DEFAULT_RECONNECT_DELAY = 1000;

export function useHmr(projectId: string, options: UseHmrOptions = {}): UseHmrReturn {
  const {
    autoConnect = true,
    onUpdate,
    onError,
    onConnected,
    onDisconnected,
    onFullReload,
    maxReconnectAttempts = DEFAULT_MAX_RECONNECT_ATTEMPTS,
    reconnectDelay = DEFAULT_RECONNECT_DELAY,
  } = options;

  const [status, setStatus] = useState<HmrConnectionStatus>('disconnected');
  const [error, setError] = useState<HmrError | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManualDisconnectRef = useRef(false);

  // 处理 HMR 消息
  const handleMessage = useCallback(
    (message: HmrMessage) => {
      switch (message.type) {
        case 'connected':
          console.log('[useHmr] Handshake complete');
          break;

        case 'update':
          console.log('[useHmr] Update:', message.updates);
          setUpdateCount((c) => c + 1);
          setError(null);
          if (message.updates) {
            message.updates.forEach((update) => onUpdate?.(update));
          }
          break;

        case 'full-reload':
          console.log('[useHmr] Full reload');
          setError(null);
          onFullReload?.();
          break;

        case 'prune':
          console.log('[useHmr] Prune:', message.paths);
          break;

        case 'error':
          console.error('[useHmr] Error:', message.err);
          if (message.err) {
            setError(message.err);
            onError?.(message.err);
          }
          break;

        case 'custom':
          console.log('[useHmr] Custom:', message.data);
          break;

        default:
          console.log('[useHmr] Unknown message:', message);
      }
    },
    [onUpdate, onError, onFullReload]
  );

  // 安排重连
  const scheduleReconnect = useCallback(() => {
    if (isManualDisconnectRef.current) return;
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn('[useHmr] Max reconnect attempts reached');
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = reconnectDelay * Math.pow(1.5, reconnectAttemptsRef.current - 1);

    console.log(`[useHmr] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current})`);
    setStatus('reconnecting');

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connect();
    }, delay);
  }, [maxReconnectAttempts, reconnectDelay]);

  // 连接 HMR
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (!projectId) return;

    isManualDisconnectRef.current = false;
    setStatus('connecting');
    setError(null);

    const wsUrl = getHmrWebSocketUrl(projectId);
    console.log(`[useHmr] Connecting: ${wsUrl}`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[useHmr] Connected');
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
        onConnected?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: HmrMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (err) {
          console.error('[useHmr] Failed to parse message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[useHmr] Disconnected');
        wsRef.current = null;
        setStatus('disconnected');
        onDisconnected?.();

        if (!isManualDisconnectRef.current) {
          scheduleReconnect();
        }
      };

      ws.onerror = (err) => {
        console.error('[useHmr] WebSocket error:', err);
        setStatus('disconnected');
      };
    } catch (err) {
      console.error('[useHmr] Failed to connect:', err);
      setStatus('disconnected');
      scheduleReconnect();
    }
  }, [projectId, handleMessage, onConnected, onDisconnected, scheduleReconnect]);

  // 断开 HMR
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus('disconnected');
  }, []);

  // 清除错误
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // 重置重连计数
  const resetReconnectAttempts = useCallback(() => {
    reconnectAttemptsRef.current = 0;
  }, []);

  // 自动连接
  useEffect(() => {
    if (autoConnect && projectId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [projectId, autoConnect, connect, disconnect]);

  return {
    status,
    isConnected: status === 'connected',
    error,
    updateCount,
    connect,
    disconnect,
    clearError,
    resetReconnectAttempts,
  };
}

export default useHmr;
