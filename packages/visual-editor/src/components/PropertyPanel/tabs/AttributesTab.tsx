/**
 * 属性标签页 - Lovable style (Content section)
 */

import { useState } from 'react';
import { usePropertySync } from '../../../hooks/usePropertySync';
import type { SelectedElementInfo } from '../../../types';

interface AttributesTabProps {
  element: SelectedElementInfo;
}

export default function AttributesTab({ element }: AttributesTabProps) {
  const { updateText, updateAttribute } = usePropertySync(element.jsxId);
  const [newAttrName, setNewAttrName] = useState('');
  const [newAttrValue, setNewAttrValue] = useState('');

  const handleTextChange = (text: string) => {
    updateText(text);
  };

  const handleAttributeChange = (name: string, value: string) => {
    updateAttribute(name, value || null);
  };

  const handleAddAttribute = () => {
    if (newAttrName && newAttrValue) {
      updateAttribute(newAttrName, newAttrValue);
      setNewAttrName('');
      setNewAttrValue('');
    }
  };

  const handleRemoveAttribute = (name: string) => {
    updateAttribute(name, null);
  };

  // 过滤掉 data-jsx-* 属性
  const displayAttributes = Object.entries(element.attributes).filter(
    ([name]) => !name.startsWith('data-jsx-')
  );

  return (
    <div className="attributes-tab">
      <h3 className="section-title">Content</h3>

      {/* Text Content */}
      <div className="property-group">
        <label className="property-label">Text</label>
        <textarea
          value={element.textContent}
          onChange={(e) => handleTextChange(e.target.value)}
          className="text-input"
          rows={3}
          placeholder="Enter text content..."
        />
      </div>

      {/* Existing Attributes */}
      {displayAttributes.length > 0 && (
        <div className="attributes-section">
          <label className="property-label">Attributes</label>
          <div className="attributes-list">
            {displayAttributes.map(([name, value]) => (
              <div key={name} className="attribute-item">
                <span className="attr-name">{name}</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleAttributeChange(name, e.target.value)}
                  className="attr-value-input"
                />
                <button
                  onClick={() => handleRemoveAttribute(name)}
                  className="remove-btn"
                  aria-label="Remove attribute"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Attribute */}
      <div className="add-attribute">
        <label className="property-label">Add attribute</label>
        <div className="add-attribute-row">
          <input
            type="text"
            placeholder="Name"
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            className="add-input"
          />
          <input
            type="text"
            placeholder="Value"
            value={newAttrValue}
            onChange={(e) => setNewAttrValue(e.target.value)}
            className="add-input"
          />
          <button
            onClick={handleAddAttribute}
            disabled={!newAttrName || !newAttrValue}
            className="add-btn"
          >
            Add
          </button>
        </div>
      </div>

      <style>{`
        .attributes-tab {
          padding: 16px;
        }

        .section-title {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 16px 0;
        }

        .property-group {
          margin-bottom: 20px;
        }

        .property-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .text-input {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          background: #f5f5f0;
          font-size: 14px;
          color: #1f2937;
          resize: vertical;
          outline: none;
          font-family: inherit;
        }

        .text-input:focus {
          box-shadow: 0 0 0 2px #3b82f6;
        }

        .text-input::placeholder {
          color: #9ca3af;
        }

        .attributes-section {
          margin-bottom: 20px;
        }

        .attributes-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .attribute-item {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #f5f5f0;
          padding: 8px 12px;
          border-radius: 8px;
        }

        .attr-name {
          min-width: 80px;
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
        }

        .attr-value-input {
          flex: 1;
          padding: 8px 12px;
          border: none;
          border-radius: 6px;
          background: #fff;
          font-size: 13px;
          color: #1f2937;
          outline: none;
        }

        .attr-value-input:focus {
          box-shadow: 0 0 0 2px #3b82f6;
        }

        .remove-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: #9ca3af;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .remove-btn:hover {
          background: #fee2e2;
          color: #ef4444;
        }

        .add-attribute {
          margin-top: 8px;
        }

        .add-attribute-row {
          display: flex;
          gap: 8px;
        }

        .add-input {
          flex: 1;
          padding: 10px 12px;
          border: none;
          border-radius: 8px;
          background: #f5f5f0;
          font-size: 13px;
          color: #1f2937;
          outline: none;
        }

        .add-input:focus {
          box-shadow: 0 0 0 2px #3b82f6;
        }

        .add-input::placeholder {
          color: #9ca3af;
        }

        .add-btn {
          padding: 10px 16px;
          background: #1d4ed8;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }

        .add-btn:hover {
          background: #1e40af;
        }

        .add-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
