/**
 * 预览区域组件
 */

import IframeWrapper from './IframeWrapper';

interface PreviewProps {
  /** 预览 URL */
  src: string;
  /** 注入脚本 URL */
  injectionScript?: string;
}

export default function Preview({ src, injectionScript }: PreviewProps) {
  return (
    <div className="preview">
      <IframeWrapper src={src} injectionScript={injectionScript} />

      <style>{`
        .preview {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
}

export { IframeWrapper };
