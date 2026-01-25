/**
 * 编辑器主组件
 */

import { useEffect } from 'react';
import { useIframeCommunication } from '../hooks/useIframeCommunication';
import Toolbar from './Toolbar';
import Preview from './Preview';
import PropertyPanel from './PropertyPanel';

interface EditorProps {
  /** 预览 URL */
  previewUrl: string;
  /** 注入脚本 URL */
  injectionScript?: string;
  /** 保存回调 */
  onSave?: () => Promise<void>;
  /** 显示属性面板 */
  showPropertyPanel?: boolean;
  /** 显示工具栏 */
  showToolbar?: boolean;
}

export default function Editor({
  previewUrl,
  injectionScript,
  onSave,
  showPropertyPanel = true,
  showToolbar = true,
}: EditorProps) {
  const { onMessage } = useIframeCommunication();

  // 监听来自 iframe 的消息
  useEffect(() => {
    const unsubscribeHtml = onMessage('FULL_HTML', (payload) => {
      console.log('[Editor] Received full HTML:', payload);
    });

    const unsubscribeEditEnabled = onMessage('EDIT_MODE_ENABLED', () => {
      console.log('[Editor] Edit mode enabled');
    });

    const unsubscribeEditDisabled = onMessage('EDIT_MODE_DISABLED', () => {
      console.log('[Editor] Edit mode disabled');
    });

    return () => {
      unsubscribeHtml();
      unsubscribeEditEnabled();
      unsubscribeEditDisabled();
    };
  }, [onMessage]);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S: 保存
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  return (
    <div className="visual-editor">
      {/* 工具栏 */}
      {showToolbar && <Toolbar onSave={onSave} />}

      {/* 主内容区 */}
      <div className="editor-content">
        {/* 预览区域 */}
        <Preview src={previewUrl} injectionScript={injectionScript} />

        {/* 属性面板 */}
        {showPropertyPanel && (
          <div className="property-panel-container">
            <PropertyPanel />
          </div>
        )}
      </div>

      <style>{`
        .visual-editor {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: #f9fafb;
        }

        .editor-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .property-panel-container {
          width: 320px;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
