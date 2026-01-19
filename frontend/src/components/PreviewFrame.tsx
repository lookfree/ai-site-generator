import { useState, useEffect } from 'react';

interface PreviewFrameProps {
  projectId: string;
  previewUrl: string;
  editModeEnabled?: boolean;
}

type DeviceType = 'desktop' | 'tablet' | 'mobile';

const deviceSizes = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '667px' },
};

function PreviewFrame({ projectId, previewUrl, editModeEnabled = false }: PreviewFrameProps) {
  const [device, setDevice] = useState<DeviceType>('desktop');
  const [key, setKey] = useState(0);

  const handleRefresh = () => {
    setKey((k) => k + 1);
  };

  // iframe 加载完成后发送编辑模式状态
  const handleIframeLoad = () => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      setTimeout(() => {
        iframe.contentWindow?.postMessage(
          { type: editModeEnabled ? 'ENABLE_EDIT_MODE' : 'DISABLE_EDIT_MODE' },
          '*'
        );
      }, 100);
    }
  };

  // 当 editModeEnabled 变化时，发送消息到 iframe
  useEffect(() => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage(
        { type: editModeEnabled ? 'ENABLE_EDIT_MODE' : 'DISABLE_EDIT_MODE' },
        '*'
      );
    }
  }, [editModeEnabled]);

  return (
    <div className="h-full flex flex-col">
      {/* 预览工具栏 */}
      <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">预览</span>

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
            🖥️ 桌面
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              device === 'tablet'
                ? 'bg-white shadow text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📱 平板
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              device === 'mobile'
                ? 'bg-white shadow text-gray-800'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            📱 手机
          </button>
        </div>

        {/* 刷新按钮 */}
        <button
          onClick={handleRefresh}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="刷新预览"
        >
          🔄
        </button>
      </div>

      {/* iframe 容器 */}
      <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
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
        <span>Project ID: {projectId.slice(0, 8)}...</span>
        <span>
          {device === 'desktop' ? '自适应' : `${deviceSizes[device].width} × ${deviceSizes[device].height}`}
        </span>
      </div>
    </div>
  );
}

export default PreviewFrame;
