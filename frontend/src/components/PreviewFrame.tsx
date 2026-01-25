import { useState, useEffect, useRef, useCallback } from 'react';
import { getHmrWebSocketUrl } from '../services/api';

interface PreviewFrameProps {
  projectId: string;
  previewUrl: string;
  editModeEnabled?: boolean;
  onHmrUpdate?: () => void;
  onHmrError?: (error: { message: string; stack?: string }) => void;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';
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

const deviceSizes = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '667px' },
};

const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;

function PreviewFrame({ projectId, previewUrl, editModeEnabled = false, onHmrUpdate, onHmrError }: PreviewFrameProps) {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [key, setKey] = useState(0);
  const [hmrStatus, setHmrStatus] = useState<HmrConnectionStatus>('disconnected');
  const [hmrError, setHmrError] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // HMR WebSocket 连接
  const connectHmr = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (!projectId) return;

    setHmrStatus('connecting');
    setHmrError(null);

    const wsUrl = getHmrWebSocketUrl(projectId);
    console.log(`[PreviewFrame] Connecting to HMR: ${wsUrl}`);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[PreviewFrame] HMR connected');
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
        wsRef.current = null;
        setHmrStatus('disconnected');
        scheduleReconnect();
      };

      ws.onerror = (error) => {
        console.error('[PreviewFrame] HMR error:', error);
        setHmrStatus('disconnected');
      };
    } catch (err) {
      console.error('[PreviewFrame] Failed to connect HMR:', err);
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
        console.log('[PreviewFrame] HMR full reload requested');
        setKey((k) => k + 1);
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

  // 组件挂载时连接 HMR
  useEffect(() => {
    connectHmr();
    return () => {
      disconnectHmr();
    };
  }, [projectId, connectHmr, disconnectHmr]);

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

  // 获取 HMR 状态指示器
  const getHmrStatusIndicator = () => {
    switch (hmrStatus) {
      case 'connected':
        return { color: 'bg-green-500', text: 'HMR 已连接', pulse: false };
      case 'connecting':
        return { color: 'bg-yellow-500', text: '正在连接...', pulse: true };
      case 'reconnecting':
        return { color: 'bg-yellow-500', text: '重新连接中...', pulse: true };
      case 'disconnected':
        return { color: 'bg-red-500', text: 'HMR 断开', pulse: false };
    }
  };

  const statusIndicator = getHmrStatusIndicator();

  return (
    <div className="h-full flex flex-col">
      {/* 预览工具栏 */}
      <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">预览</span>
          {/* HMR 状态指示器 */}
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

        {/* 设备切换 */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setDevice('desktop')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              device === 'desktop'
                ? 'bg-white shadow text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            桌面
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              device === 'tablet'
                ? 'bg-white shadow text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            平板
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              device === 'mobile'
                ? 'bg-white shadow text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            手机
          </button>
        </div>

        {/* 工具按钮 */}
        <div className="flex items-center gap-2">
          {/* 重连按钮 */}
          {hmrStatus === 'disconnected' && (
            <button
              onClick={connectHmr}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-600 hover:bg-blue-200 rounded transition-colors"
              title="重新连接 HMR"
            >
              重连
            </button>
          )}
          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="刷新预览"
          >
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* HMR 错误提示 */}
      {hmrError && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800">编译错误</p>
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

      {/* iframe 容器 */}
      <div className="flex-1 p-4 flex items-center justify-center overflow-auto bg-gray-50">
        <div
          style={{
            width: deviceSizes[device].width,
            height: deviceSizes[device].height,
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

      {/* 底部状态栏 */}
      <div className="px-4 py-2 bg-white border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>Project: {projectId.slice(0, 8)}...</span>
          {editModeEnabled && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-xs">
              编辑模式
            </span>
          )}
        </div>
        <span>
          {device === 'desktop' ? '自适应' : `${deviceSizes[device].width} x ${deviceSizes[device].height}`}
        </span>
      </div>
    </div>
  );
}

export default PreviewFrame;
