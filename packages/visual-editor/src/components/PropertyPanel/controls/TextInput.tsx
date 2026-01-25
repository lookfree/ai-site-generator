/**
 * 文本输入控件
 */

import { useState, useCallback, useEffect } from 'react';

interface TextInputProps {
  /** 当前值 */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否多行 */
  multiline?: boolean;
  /** 多行时的行数 */
  rows?: number;
  /** 前缀 */
  prefix?: React.ReactNode;
  /** 后缀 */
  suffix?: React.ReactNode;
  /** 防抖延迟 (ms) */
  debounce?: number;
}

export default function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  multiline,
  rows = 3,
  prefix,
  suffix,
  debounce = 0,
}: TextInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (debounce > 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setTimeoutId(setTimeout(() => {
        onChange(newValue);
      }, debounce));
    } else {
      onChange(newValue);
    }
  }, [onChange, debounce, timeoutId]);

  if (multiline) {
    return (
      <div className="text-input multiline">
        <textarea
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          className="textarea-input"
        />

        <style>{`
          .text-input.multiline {
            width: 100%;
          }

          .textarea-input {
            width: 100%;
            padding: 8px 10px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 13px;
            resize: vertical;
            font-family: inherit;
          }

          .textarea-input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          }

          .textarea-input:disabled {
            background: #f9fafb;
            opacity: 0.5;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="text-input">
      <div className="input-wrapper">
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="text-input-field"
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>

      <style>{`
        .text-input {
          width: 100%;
        }

        .input-wrapper {
          display: flex;
          align-items: stretch;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          overflow: hidden;
        }

        .input-wrapper:focus-within {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .input-prefix,
        .input-suffix {
          display: flex;
          align-items: center;
          padding: 6px 10px;
          background: #f3f4f6;
          color: #6b7280;
          font-size: 13px;
        }

        .input-prefix {
          border-right: 1px solid #e5e7eb;
        }

        .input-suffix {
          border-left: 1px solid #e5e7eb;
        }

        .text-input-field {
          flex: 1;
          min-width: 0;
          padding: 6px 10px;
          border: none;
          font-size: 13px;
        }

        .text-input-field:focus {
          outline: none;
        }

        .text-input-field:disabled {
          background: #f9fafb;
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
}
