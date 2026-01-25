/**
 * 下拉选择控件
 */

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectControlProps {
  /** 选项列表 */
  options: SelectOption[];
  /** 当前值 */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 占位符 */
  placeholder?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否允许清空 */
  allowClear?: boolean;
}

export default function SelectControl({
  options,
  value,
  onChange,
  placeholder = '请选择',
  disabled,
  allowClear,
}: SelectControlProps) {
  return (
    <div className="select-control">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="select-input"
      >
        {allowClear && (
          <option value="">{placeholder}</option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>

      <style>{`
        .select-control {
          position: relative;
        }

        .select-input {
          width: 100%;
          padding: 6px 28px 6px 10px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: #fff;
          font-size: 13px;
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M2 4l4 4 4-4'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
        }

        .select-input:hover {
          border-color: #9ca3af;
        }

        .select-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .select-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
