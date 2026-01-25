/**
 * 尺寸输入控件
 */

import { useState, useCallback, useEffect } from 'react';

interface SizeInputProps {
  /** 当前值 */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 可用单位 */
  units?: string[];
  /** 是否禁用 */
  disabled?: boolean;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步进值 */
  step?: number;
  /** 占位符 */
  placeholder?: string;
}

const DEFAULT_UNITS = ['px', '%', 'em', 'rem', 'vw', 'vh', 'auto'];

export default function SizeInput({
  value,
  onChange,
  units = DEFAULT_UNITS,
  disabled,
  min,
  max,
  step = 1,
  placeholder = '0',
}: SizeInputProps) {
  const [numberValue, setNumberValue] = useState('');
  const [unitValue, setUnitValue] = useState('px');

  // 解析初始值
  useEffect(() => {
    if (value === 'auto') {
      setNumberValue('');
      setUnitValue('auto');
      return;
    }

    const match = value.match(/^(-?\d+\.?\d*)(px|%|em|rem|vw|vh)?$/);
    if (match) {
      setNumberValue(match[1]);
      setUnitValue(match[2] || 'px');
    }
  }, [value]);

  const handleNumberChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const num = e.target.value;
    setNumberValue(num);

    if (unitValue === 'auto') {
      onChange('auto');
    } else if (num) {
      onChange(`${num}${unitValue}`);
    } else {
      onChange('');
    }
  }, [unitValue, onChange]);

  const handleUnitChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const unit = e.target.value;
    setUnitValue(unit);

    if (unit === 'auto') {
      onChange('auto');
    } else if (numberValue) {
      onChange(`${numberValue}${unit}`);
    }
  }, [numberValue, onChange]);

  const handleIncrement = useCallback((delta: number) => {
    if (unitValue === 'auto') return;

    const current = parseFloat(numberValue) || 0;
    let newValue = current + delta;

    if (min !== undefined) newValue = Math.max(min, newValue);
    if (max !== undefined) newValue = Math.min(max, newValue);

    setNumberValue(String(newValue));
    onChange(`${newValue}${unitValue}`);
  }, [numberValue, unitValue, min, max, onChange]);

  return (
    <div className="size-input">
      <div className="input-group">
        <button
          className="increment-btn"
          onClick={() => handleIncrement(-step)}
          disabled={disabled || unitValue === 'auto'}
          aria-label="减少"
        >
          −
        </button>

        <input
          type="number"
          value={unitValue === 'auto' ? '' : numberValue}
          onChange={handleNumberChange}
          disabled={disabled || unitValue === 'auto'}
          min={min}
          max={max}
          step={step}
          placeholder={unitValue === 'auto' ? 'auto' : placeholder}
          className="number-input"
        />

        <button
          className="increment-btn"
          onClick={() => handleIncrement(step)}
          disabled={disabled || unitValue === 'auto'}
          aria-label="增加"
        >
          +
        </button>

        <select
          value={unitValue}
          onChange={handleUnitChange}
          disabled={disabled}
          className="unit-select"
        >
          {units.map((unit) => (
            <option key={unit} value={unit}>
              {unit}
            </option>
          ))}
        </select>
      </div>

      <style>{`
        .size-input {
          width: 100%;
        }

        .input-group {
          display: flex;
          align-items: stretch;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          overflow: hidden;
        }

        .input-group:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .increment-btn {
          padding: 4px 8px;
          background: #f3f4f6;
          border: none;
          cursor: pointer;
          font-size: 14px;
          color: #6b7280;
          transition: background-color 0.1s;
        }

        .increment-btn:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .increment-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .number-input {
          flex: 1;
          min-width: 0;
          padding: 6px 8px;
          border: none;
          text-align: center;
          font-size: 13px;
          -moz-appearance: textfield;
        }

        .number-input::-webkit-outer-spin-button,
        .number-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .number-input:focus {
          outline: none;
        }

        .number-input:disabled {
          background: #f9fafb;
        }

        .unit-select {
          padding: 4px 8px;
          border: none;
          border-left: 1px solid #e5e7eb;
          background: #f3f4f6;
          font-size: 12px;
          cursor: pointer;
        }

        .unit-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
