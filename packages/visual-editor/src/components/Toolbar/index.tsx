/**
 * 工具栏组件
 */

import { useEditorStore } from '../../stores/editor-store';
import { useIframeCommunication } from '../../hooks/useIframeCommunication';
import DeviceSelector from './DeviceSelector';
import HistoryButtons from './HistoryButtons';
import SaveButton from './SaveButton';

interface ToolbarProps {
  onSave?: () => Promise<void>;
}

export default function Toolbar({ onSave }: ToolbarProps) {
  const isEditMode = useEditorStore(state => state.isEditMode);
  const { enableEdit, disableEdit } = useIframeCommunication();

  const handleToggleEditMode = () => {
    if (isEditMode) {
      disableEdit();
    } else {
      enableEdit();
    }
  };

  return (
    <div className="toolbar">
      {/* 左侧: 编辑模式切换 */}
      <div className="toolbar-left">
        <button
          className={`edit-mode-btn ${isEditMode ? 'active' : ''}`}
          onClick={handleToggleEditMode}
        >
          {isEditMode ? (
            <>
              <span className="mode-indicator active" />
              编辑中
            </>
          ) : (
            <>
              <span className="mode-indicator" />
              预览
            </>
          )}
        </button>
      </div>

      {/* 中间: 设备切换 */}
      <div className="toolbar-center">
        <DeviceSelector />
      </div>

      {/* 右侧: 历史和保存 */}
      <div className="toolbar-right">
        <HistoryButtons />
        <SaveButton onSave={onSave} />
      </div>

      <style>{`
        .toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          background: #fff;
          border-bottom: 1px solid #e5e7eb;
        }

        .toolbar-left,
        .toolbar-center,
        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .edit-mode-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: #fff;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.1s;
        }

        .edit-mode-btn:hover {
          background: #f9fafb;
        }

        .edit-mode-btn.active {
          background: #dbeafe;
          border-color: #3b82f6;
          color: #1d4ed8;
        }

        .mode-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #9ca3af;
        }

        .mode-indicator.active {
          background: #22c55e;
          box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
        }
      `}</style>
    </div>
  );
}
