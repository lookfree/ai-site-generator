/**
 * Element Info Component - Lovable style
 */

import type { SelectedElementInfo } from '../../types';

interface ElementInfoProps {
  element: SelectedElementInfo;
}

export default function ElementInfo({ element }: ElementInfoProps) {
  const { tagName } = element;

  return (
    <div className="element-info">
      {/* Top bar with Select parent and undo buttons */}
      <div className="info-header">
        <button className="select-parent-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          Select parent
        </button>
        <button className="undo-btn" title="Undo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
          </svg>
        </button>
      </div>

      {/* Element tag badge at the bottom of header */}
      <div className="element-badge-row">
        <span className="element-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          </svg>
          {tagName.toLowerCase()}
        </span>
      </div>

      <style>{`
        .element-info {
          padding: 12px 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .info-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .select-parent-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          font-size: 13px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s;
        }

        .select-parent-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .undo-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
        }

        .undo-btn:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .element-badge-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .element-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
        }

        .element-badge svg {
          opacity: 0.7;
        }
      `}</style>
    </div>
  );
}
