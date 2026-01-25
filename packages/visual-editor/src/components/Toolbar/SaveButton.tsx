/**
 * 保存按钮
 */

import { useState } from 'react';

interface SaveButtonProps {
  onSave?: () => Promise<void>;
}

export default function SaveButton({ onSave }: SaveButtonProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (isSaving || !onSave) return;

    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      className={`save-btn ${isSaving ? 'saving' : ''}`}
      onClick={handleSave}
      disabled={isSaving}
    >
      {isSaving ? (
        <>
          <span className="spinner" />
          保存中...
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M2 2h9.586L14 4.414V14H2V2zm1 1v10h10V5h-3V2H3zm8 0v2h2.586L11 2z"/>
          </svg>
          保存
        </>
      )}

      <style>{`
        .save-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: none;
          background: #3b82f6;
          color: white;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.1s;
        }

        .save-btn:hover:not(:disabled) {
          background: #2563eb;
        }

        .save-btn:disabled {
          background: #93c5fd;
          cursor: not-allowed;
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </button>
  );
}
