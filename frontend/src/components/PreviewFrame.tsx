import { useState, useEffect, useRef, useCallback } from 'react';
import { getHmrWebSocketUrl } from '../services/api';
import { useEditorStore, DeviceSelector, DEVICE_VIEWS } from 'visual-editor';

interface PreviewFrameProps {
  projectId: string;
  previewUrl: string;
  editModeEnabled?: boolean;
  onHmrUpdate?: () => void;
  onHmrError?: (error: { message: string; stack?: string }) => void;
}

type HmrConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface HmrMessage {
  type: string;
  updates?: Array<{
    type: string;
    path: string;
    acceptedPath?: string;
    timestamp?: number;
  }>;
  path?: string;
  paths?: string[];
  err?: {
    message: string;
    stack?: string;
  };
  data?: unknown;
}

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;

function PreviewFrame({ projectId, previewUrl, editModeEnabled = false, onHmrUpdate, onHmrError }: PreviewFrameProps) {
  const [key, setKey] = useState(0);
  const [hmrStatus, setHmrStatus] = useState<HmrConnectionStatus>('disconnected');
  const [hmrError, setHmrError] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const setIframeRef = useEditorStore(state => state.setIframeRef);
  const deviceView = useEditorStore(state => state.deviceView);

  useEffect(() => {
    setIframeRef(iframeRef.current);
    return () => setIframeRef(null);
  }, [setIframeRef]);

  // HMR WebSocket 连接
  const connectHmr = useCallback(() => {
    // 如果已经在连接中，不要重复连接
    if (isConnectingRef.current) {
      console.log('[PreviewFrame] HMR connection in progress, skipping');
      return;
    }
    // 如果已连接，不要重复连接
    if (wsRef.current) {
      const state = wsRef.current.readyState;
      if (state === WebSocket.CONNECTING || state === WebSocket.OPEN) {
        console.log('[PreviewFrame] HMR already connecting/connected, skipping');
        return;
      }
    }
    if (!projectId) return;

    isConnectingRef.current = true;
    setHmrStatus('connecting');
    setHmrError(null);

    const wsUrl = getHmrWebSocketUrl(projectId);
    console.log(`[PreviewFrame] Connecting to HMR: ${wsUrl}`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[PreviewFrame] HMR connected');
        isConnectingRef.current = false;
        setHmrStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: HmrMessage = JSON.parse(event.data);
          handleHmrMessage(message);
        } catch (err) {
          console.error('[PreviewFrame] Failed to parse HMR message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[PreviewFrame] HMR disconnected');
        isConnectingRef.current = false;
        wsRef.current = null;
        setHmrStatus('disconnected');
        scheduleReconnect();
      };

      ws.onerror = (error) => {
        console.error('[PreviewFrame] HMR error:', error);
        isConnectingRef.current = false;
        setHmrStatus('disconnected');
      };
    } catch (err) {
      console.error('[PreviewFrame] Failed to connect HMR:', err);
      isConnectingRef.current = false;
      setHmrStatus('disconnected');
      scheduleReconnect();
    }
  }, [projectId]);

  // 处理 HMR 消息
  const handleHmrMessage = useCallback((message: HmrMessage) => {
    switch (message.type) {
      case 'connected':
        console.log('[PreviewFrame] HMR handshake complete');
        break;

      case 'update':
        console.log('[PreviewFrame] HMR update:', message.updates);
        setUpdateCount((c) => c + 1);
        setHmrError(null);
        onHmrUpdate?.();
        break;

      case 'full-reload':
        // 不主动触发 iframe 重载，让 Vite 内部客户端自己处理
        // 如果外部客户端也触发 setKey 会导致 iframe 重新挂载，造成白屏
        console.log('[PreviewFrame] HMR full reload requested (handled by Vite internal client)');
        setHmrError(null);
        break;

      case 'prune':
        console.log('[PreviewFrame] HMR prune:', message.paths);
        break;

      case 'error':
        console.error('[PreviewFrame] HMR error:', message.err);
        if (message.err) {
          setHmrError(message.err.message);
          onHmrError?.(message.err);
        }
        break;

      case 'custom':
        console.log('[PreviewFrame] HMR custom:', message.data);
        break;

      default:
        console.log('[PreviewFrame] Unknown HMR message:', message);
    }
  }, [onHmrUpdate, onHmrError]);

  // 安排重连
  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn('[PreviewFrame] Max HMR reconnect attempts reached');
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current - 1);

    console.log(`[PreviewFrame] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptsRef.current})`);
    setHmrStatus('reconnecting');

    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectHmr();
    }, delay);
  }, [connectHmr]);

  // 断开 HMR
  const disconnectHmr = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setHmrStatus('disconnected');
  }, []);

  // 外部 HMR 客户端暂时禁用
  // Vite 内部客户端（iframe 内的 @vite/client）会处理真正的 HMR
  // 外部客户端只用于 UI 状态显示，但可能导致连接不稳定
  // useEffect(() => {
  //   connectHmr();
  //   return () => {
  //     disconnectHmr();
  //   };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [projectId]);

  // 直接设置状态为连接中（Vite 内部客户端会实际处理）
  useEffect(() => {
    setHmrStatus('connected'); // 假设 Vite 内部会处理连接
  }, [projectId]);

  const handleRefresh = () => {
    setKey((k) => k + 1);
    setHmrError(null);
  };

  // iframe 加载完成后发送编辑模式状态
  const handleIframeLoad = () => {
    if (iframeRef.current?.contentWindow) {
      setTimeout(() => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: editModeEnabled ? 'ENABLE_EDIT_MODE' : 'DISABLE_EDIT_MODE' },
          '*'
        );
      }, 100);
    }
  };

  // 当 editModeEnabled 变化时，发送消息到 iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: editModeEnabled ? 'ENABLE_EDIT_MODE' : 'DISABLE_EDIT_MODE' },
        '*'
      );
    }
  }, [editModeEnabled]);

  // 视觉编辑消息由 visual-editor 的 useIframeCommunication 处理

  // Get HMR status indicator
  const getHmrStatusIndicator = () => {
    switch (hmrStatus) {
      case 'connected':
        return { color: 'bg-green-500', text: 'HMR Connected', pulse: false };
      case 'connecting':
        return { color: 'bg-yellow-500', text: 'Connecting...', pulse: true };
      case 'reconnecting':
        return { color: 'bg-yellow-500', text: 'Reconnecting...', pulse: true };
      case 'disconnected':
        return { color: 'bg-red-500', text: 'HMR Disconnected', pulse: false };
    }
  };

  const statusIndicator = getHmrStatusIndicator();

  return (
    <div className="h-full flex flex-col">
      {/* Preview toolbar */}
      <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Preview</span>
          {/* HMR status indicator */}
          <div className="flex items-center gap-1.5" title={statusIndicator.text}>
            <span
              className={`w-2 h-2 rounded-full ${statusIndicator.color} ${
                statusIndicator.pulse ? 'animate-pulse' : ''
              }`}
            />
            <span className="text-xs text-gray-500">{statusIndicator.text}</span>
            {updateCount > 0 && hmrStatus === 'connected' && (
              <span className="text-xs text-green-600">({updateCount} updates)</span>
            )}
          </div>
        </div>

        {/* Device switcher - from visual-editor package */}
        <DeviceSelector />

        {/* Tool buttons */}
        <div className="flex items-center gap-2">
          {/* Reconnect button */}
          {hmrStatus === 'disconnected' && (
            <button
              onClick={connectHmr}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-600 hover:bg-blue-200 rounded transition-colors"
              title="Reconnect HMR"
            >
              Reconnect
            </button>
          )}
          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh preview"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* HMR error display */}
      {hmrError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">Build Error</p>
              <pre className="text-xs text-red-600 mt-1 overflow-x-auto whitespace-pre-wrap break-words">
                {hmrError}
              </pre>
            </div>
            <button
              onClick={() => setHmrError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* iframe container */}
      <div className="flex-1 p-4 flex items-center justify-center overflow-auto bg-gray-50">
        <div
          style={{
            width: deviceView === 'desktop' ? '100%' : `${DEVICE_VIEWS[deviceView].width}px`,
            height: deviceView === 'desktop' ? '100%' : `${DEVICE_VIEWS[deviceView].height || 800}px`,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
          className="transition-all duration-300"
        >
          <iframe
            ref={iframeRef}
            key={key}
            src={previewUrl}
            className="w-full h-full bg-white rounded-lg shadow-lg border border-gray-200"
            title="Preview"
            onLoad={handleIframeLoad}
          />
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="px-4 py-2 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Project: {projectId.slice(0, 8)}...</span>
          {editModeEnabled && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">
              Edit Mode
            </span>
          )}
        </div>
        <span>
          {deviceView === 'desktop' ? 'Responsive' : `${DEVICE_VIEWS[deviceView].width}px`}
        </span>
      </div>
    </div>
  );
}

export default PreviewFrame;
