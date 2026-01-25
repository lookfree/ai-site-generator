/**
 * 元素信息组件
 */

import { Fragment } from 'react';
import type { SelectedElementInfo } from '../../types';

interface ElementInfoProps {
  element: SelectedElementInfo;
}

export default function ElementInfo({ element }: ElementInfoProps) {
  const { tagName, jsxId, path } = element;

  return (
    <div className="element-info">
      <div className="element-tag">
        <span className="tag-bracket">&lt;</span>
        <span className="tag-name">{tagName}</span>
        <span className="tag-bracket">&gt;</span>
      </div>

      <div className="element-path">
        {path.map((id, index) => (
          <Fragment key={id}>
            {index > 0 && <span className="path-separator">/</span>}
            <span className={`path-item ${id === jsxId ? 'current' : ''}`}>
              {id.slice(0, 6)}
            </span>
          </Fragment>
        ))}
      </div>

      <style>{`
        .element-info {
          padding: 12px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .element-tag {
          font-family: 'SF Mono', Monaco, monospace;
          font-size: 14px;
          margin-bottom: 6px;
        }

        .tag-bracket {
          color: #9ca3af;
        }

        .tag-name {
          color: #3b82f6;
          font-weight: 600;
        }

        .element-path {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 4px;
          font-size: 11px;
          font-family: 'SF Mono', Monaco, monospace;
        }

        .path-separator {
          color: #d1d5db;
        }

        .path-item {
          padding: 2px 4px;
          background: #e5e7eb;
          border-radius: 3px;
          color: #6b7280;
        }

        .path-item.current {
          background: #dbeafe;
          color: #1d4ed8;
        }
      `}</style>
    </div>
  );
}
