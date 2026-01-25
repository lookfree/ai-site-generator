/**
 * 历史操作按钮
 */

import { useEditHistory } from '../../hooks/useEditHistory';

export default function HistoryButtons() {
  const { undo, redo, canUndo, canRedo } = useEditHistory();

  return (
    <div className="history-buttons">
      <button
        className="history-btn"
        onClick={undo}
        disabled={!canUndo}
        title="撤销 (Cmd+Z)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M4.5 7.5L1 4l3.5-3.5v2.25c4.97 0 9 4.03 9 9 0 1.31-.28 2.55-.78 3.67l-1.33-1.33A6.5 6.5 0 004.5 7.5z"/>
        </svg>
      </button>

      <button
        className="history-btn"
        onClick={redo}
        disabled={!canRedo}
        title="重做 (Cmd+Shift+Z)"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ transform: 'scaleX(-1)' }}>
          <path d="M4.5 7.5L1 4l3.5-3.5v2.25c4.97 0 9 4.03 9 9 0 1.31-.28 2.55-.78 3.67l-1.33-1.33A6.5 6.5 0 004.5 7.5z"/>
        </svg>
      </button>

      <style>{`
        .history-buttons {
          display: flex;
          gap: 4px;
        }

        .history-btn {
          padding: 6px 8px;
          border: 1px solid #d1d5db;
          background: #fff;
          border-radius: 4px;
          cursor: pointer;
          color: #374151;
          transition: background-color 0.1s, color 0.1s;
        }

        .history-btn:hover:not(:disabled) {
          background: #f3f4f6;
        }

        .history-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
