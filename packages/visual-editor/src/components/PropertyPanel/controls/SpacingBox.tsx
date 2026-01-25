/**
 * 间距可视化控件
 */

interface SpacingBoxProps {
  /** 类型: padding 或 margin */
  type: 'padding' | 'margin';
  /** 间距值 */
  values: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  /** 值变化回调 */
  onChange: (side: string, value: string) => void;
}

/**
 * 间距选项
 */
const SPACING_OPTIONS = [
  { value: '0', label: '0' },
  { value: 'px', label: '1px' },
  { value: '0.5', label: '2px' },
  { value: '1', label: '4px' },
  { value: '2', label: '8px' },
  { value: '3', label: '12px' },
  { value: '4', label: '16px' },
  { value: '5', label: '20px' },
  { value: '6', label: '24px' },
  { value: '8', label: '32px' },
  { value: '10', label: '40px' },
  { value: '12', label: '48px' },
  { value: '16', label: '64px' },
];

export default function SpacingBox({ type, values, onChange }: SpacingBoxProps) {
  const color = type === 'padding' ? '#22c55e' : '#f97316';
  const bgColor = type === 'padding' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(249, 115, 22, 0.1)';

  return (
    <div className="spacing-box">
      <svg viewBox="0 0 200 160" className="spacing-svg">
        {/* 外框背景 */}
        <rect
          x="10" y="10" width="180" height="140"
          fill={bgColor}
          stroke={color}
          strokeWidth="2"
          strokeDasharray="4"
          rx="4"
        />

        {/* 内框 (元素) */}
        <rect
          x="50" y="40" width="100" height="80"
          fill="#f3f4f6"
          stroke="#9ca3af"
          strokeWidth="1"
          rx="2"
        />

        {/* Top 输入 */}
        <foreignObject x="70" y="14" width="60" height="24">
          <select
            value={values.top}
            onChange={(e) => onChange('top', e.target.value)}
            className="spacing-select"
            style={{ borderColor: color }}
          >
            {SPACING_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </foreignObject>

        {/* Right 输入 */}
        <foreignObject x="152" y="68" width="50" height="24">
          <select
            value={values.right}
            onChange={(e) => onChange('right', e.target.value)}
            className="spacing-select"
            style={{ borderColor: color }}
          >
            {SPACING_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </foreignObject>

        {/* Bottom 输入 */}
        <foreignObject x="70" y="122" width="60" height="24">
          <select
            value={values.bottom}
            onChange={(e) => onChange('bottom', e.target.value)}
            className="spacing-select"
            style={{ borderColor: color }}
          >
            {SPACING_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </foreignObject>

        {/* Left 输入 */}
        <foreignObject x="-2" y="68" width="50" height="24">
          <select
            value={values.left}
            onChange={(e) => onChange('left', e.target.value)}
            className="spacing-select"
            style={{ borderColor: color }}
          >
            {SPACING_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </foreignObject>

        {/* 中心文字 */}
        <text x="100" y="85" textAnchor="middle" fontSize="12" fill="#6b7280">
          Element
        </text>
      </svg>

      <style>{`
        .spacing-box {
          width: 100%;
          max-width: 240px;
          margin: 0 auto;
        }

        .spacing-svg {
          width: 100%;
          height: auto;
        }

        .spacing-select {
          width: 100%;
          height: 100%;
          padding: 2px 4px;
          border: 1px solid;
          border-radius: 4px;
          background: white;
          font-size: 11px;
          cursor: pointer;
        }

        .spacing-select:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </div>
  );
}
