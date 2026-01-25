/**
 * iframe 包装器组件
 */

import { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../../stores/editor-store';
import { DEVICE_VIEWS } from '../../types';

interface IframeWrapperProps {
  /** 预览 URL */
  src: string;
  /** 注入脚本 URL */
  injectionScript?: string;
}

export default function IframeWrapper({ src, injectionScript }: IframeWrapperProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const deviceView = useEditorStore(state => state.deviceView);
  const setIframeRef = useEditorStore(state => state.setIframeRef);

  // 设置 iframe 引用
  useEffect(() => {
    setIframeRef(iframeRef.current);
    return () => setIframeRef(null);
  }, [setIframeRef]);

  // iframe 加载完成后注入脚本
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current?.contentWindow || !injectionScript) return;

    const iframe = iframeRef.current;

    // 注入脚本
    try {
      const script = iframe.contentDocument?.createElement('script');
      if (script) {
        script.src = injectionScript;
        iframe.contentDocument?.body.appendChild(script);
      }
    } catch (error) {
      console.warn('[IframeWrapper] Failed to inject script:', error);
    }
  }, [injectionScript]);

  const deviceWidth = DEVICE_VIEWS[deviceView].width;

  return (
    <div className="iframe-wrapper">
      <div
        className="iframe-container"
        style={{ width: deviceWidth }}
      >
        <iframe
          ref={iframeRef}
          src={src}
          onLoad={handleIframeLoad}
          title="Preview"
          className="preview-iframe"
        />
      </div>

      <style>{`
        .iframe-wrapper {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 24px;
          background: #f3f4f6;
          overflow: auto;
        }

        .iframe-container {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          transition: width 0.3s ease;
        }

        .preview-iframe {
          width: 100%;
          height: calc(100vh - 200px);
          min-height: 400px;
          border: none;
        }
      `}</style>
    </div>
  );
}
