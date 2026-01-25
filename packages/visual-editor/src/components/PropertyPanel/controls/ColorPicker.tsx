/**
 * 颜色选择器控件
 */

import { useState, useCallback } from 'react';

interface ColorPickerProps {
  /** 当前颜色值 */
  value: string;
  /** 颜色变化回调 */
  onChange: (color: string) => void;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 预设颜色
 */
const PRESET_COLORS = [
  '#000000', '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af',
  '#6b7280', '#4b5563', '#374151', '#1f2937', '#111827',
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e',
];

export default function ColorPicker({ value, onChange, disabled }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value);

  const handleColorSelect = useCallback((color: string) => {
    onChange(color);
    setIsOpen(false);
  }, [onChange]);

  const handleCustomColorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    onChange(color);
  }, [onChange]);

  return (
    <div className="color-picker">
      {/* 颜色预览按钮 */}
      <button
        className="color-preview"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        style={{ backgroundColor: value }}
        aria-label="选择颜色"
      >
        <span className="color-value">{value}</span>
      </button>

      {/* 颜色面板 */}
      {isOpen && (
        <div className="color-panel">
          {/* 预设颜色 */}
          <div className="preset-colors">
            {PRESET_COLORS.map(color => (
              <button
                key={color}
                className={`preset-color ${value === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                aria-label={color}
              />
            ))}
          </div>

          {/* 自定义颜色输入 */}
          <div className="custom-color">
            <input
              type="color"
              value={customColor}
              onChange={handleCustomColorChange}
              className="color-input"
            />
            <input
              type="text"
              value={customColor}
              onChange={(e) => {
                const val = e.target.value;
                setCustomColor(val);
                if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                  onChange(val);
                }
              }}
              placeholder="#000000"
              className="hex-input"
            />
          </div>
        </div>
      )}

      <style>{`
        .color-picker {
          position: relative;
        }

        .color-preview {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          cursor: pointer;
          font-size: 13px;
        }

        .color-preview:hover {
          border-color: #9ca3af;
        }

        .color-preview:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .color-value {
          flex: 1;
          text-align: left;
          font-family: monospace;
        }

        .color-panel {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 4px;
          padding: 12px;
          background: #fff;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          z-index: 100;
        }

        .preset-colors {
          display: grid;
          grid-template-columns: repeat(9, 1fr);
          gap: 4px;
          margin-bottom: 12px;
        }

        .preset-color {
          width: 24px;
          height: 24px;
          border: 2px solid transparent;
          border-radius: 4px;
          cursor: pointer;
          transition: transform 0.1s, border-color 0.1s;
        }

        .preset-color:hover {
          transform: scale(1.1);
        }

        .preset-color.selected {
          border-color: #3b82f6;
        }

        .custom-color {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .color-input {
          width: 40px;
          height: 32px;
          padding: 0;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          cursor: pointer;
        }

        .hex-input {
          flex: 1;
          padding: 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-family: monospace;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
