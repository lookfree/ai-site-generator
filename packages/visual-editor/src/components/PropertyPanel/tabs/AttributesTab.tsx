/**
 * 属性标签页
 */

import { useState } from 'react';
import { usePropertySync } from '../../../hooks/usePropertySync';
import { TextInput } from '../controls';
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
      {/* 文本内容 */}
      <div className="property-group">
        <label className="property-label">文本内容</label>
        <TextInput
          value={element.textContent}
          onChange={handleTextChange}
          multiline
          rows={3}
          debounce={300}
        />
      </div>

      <div className="section-divider" />

      {/* 现有属性 */}
      <div className="attributes-section">
        <h4 className="section-title">HTML 属性</h4>

        {displayAttributes.length === 0 ? (
          <p className="empty-message">暂无自定义属性</p>
        ) : (
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
                  aria-label="删除属性"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 添加新属性 */}
      <div className="add-attribute">
        <h4 className="section-title">添加属性</h4>
        <div className="add-attribute-form">
          <input
            type="text"
            placeholder="属性名"
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            className="add-input"
          />
          <input
            type="text"
            placeholder="属性值"
            value={newAttrValue}
            onChange={(e) => setNewAttrValue(e.target.value)}
            className="add-input"
          />
          <button
            onClick={handleAddAttribute}
            disabled={!newAttrName || !newAttrValue}
            className="add-btn"
          >
            添加
          </button>
        </div>
      </div>

      <style>{`
        .attributes-tab {
          padding: 12px;
        }

        .property-group {
          margin-bottom: 16px;
        }

        .property-label {
          display: block;
          margin-bottom: 6px;
          font-size: 12px;
          font-weight: 500;
          color: #374151;
        }

        .section-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 16px 0;
        }

        .attributes-section {
          margin-bottom: 16px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 12px 0;
        }

        .empty-message {
          color: #9ca3af;
          font-size: 13px;
          text-align: center;
          padding: 12px;
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
        }

        .attr-name {
          min-width: 80px;
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
        }

        .attr-value-input {
          flex: 1;
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 12px;
        }

        .attr-value-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .remove-btn {
          width: 24px;
          height: 24px;
          border: none;
          background: #fee2e2;
          color: #ef4444;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
        }

        .remove-btn:hover {
          background: #fecaca;
        }

        .add-attribute {
          margin-top: 16px;
        }

        .add-attribute-form {
          display: flex;
          gap: 8px;
        }

        .add-input {
          flex: 1;
          padding: 6px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 12px;
        }

        .add-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .add-btn {
          padding: 6px 12px;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
        }

        .add-btn:hover {
          background: #2563eb;
        }

        .add-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
