/**
 * 滑块控件
 */

import { useState, useCallback, useEffect } from 'react';

interface SliderControlProps {
  /** 当前值 */
  value: number;
  /** 值变化回调 */
  onChange: (value: number) => void;
  /** 最小值 */
  min?: number;
  /** 最大值 */
  max?: number;
  /** 步进值 */
  step?: number;
  /** 单位 */
  unit?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否显示数值输入框 */
  showInput?: boolean;
}

export default function SliderControl({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = '',
  disabled,
  showInput = true,
}: SliderControlProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    const clampedValue = Math.max(min, Math.min(max, newValue));
    setLocalValue(clampedValue);
    onChange(clampedValue);
  }, [onChange, min, max]);

  // 计算滑块填充百分比
  const percentage = ((localValue - min) / (max - min)) * 100;

  return (
    <div className="slider-control">
      <div className="slider-wrapper">
        <input
          type="range"
          value={localValue}
          onChange={handleSliderChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="slider-input"
          style={{
            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
          }}
        />
      </div>

      {showInput && (
        <div className="value-input-wrapper">
          <input
            type="number"
            value={localValue}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            className="value-input"
          />
          {unit && <span className="unit-label">{unit}</span>}
        </div>
      )}

      <style>{`
        .slider-control {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .slider-wrapper {
          flex: 1;
        }

        .slider-input {
          width: 100%;
          height: 6px;
          border-radius: 3px;
          appearance: none;
          cursor: pointer;
          outline: none;
        }

        .slider-input::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
          transition: transform 0.1s;
        }

        .slider-input::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        .slider-input::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #3b82f6;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .slider-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .value-input-wrapper {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .value-input {
          width: 60px;
          padding: 4px 8px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          text-align: center;
          font-size: 13px;
          -moz-appearance: textfield;
        }

        .value-input::-webkit-outer-spin-button,
        .value-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .value-input:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .value-input:disabled {
          background: #f9fafb;
          opacity: 0.5;
        }

        .unit-label {
          color: #6b7280;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}
