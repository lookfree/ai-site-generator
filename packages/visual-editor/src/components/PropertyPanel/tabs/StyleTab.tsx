/**
 * 样式标签页 - Lovable style (Typography section)
 */

import { usePropertySync } from '../../../hooks/usePropertySync';
import { ColorPicker } from '../controls';
import type { SelectedElementInfo } from '../../../types';

interface StyleTabProps {
  element: SelectedElementInfo;
}

const FONT_SIZES = [
  { value: 'text-xs', label: 'Extra Small' },
  { value: 'text-sm', label: 'Small' },
  { value: 'text-base', label: 'Base' },
  { value: 'text-lg', label: 'Large' },
  { value: 'text-xl', label: 'Extra Large' },
  { value: 'text-2xl', label: '2XL' },
  { value: 'text-3xl', label: '3XL' },
  { value: 'text-4xl', label: '4XL' },
];

const FONT_WEIGHTS = [
  { value: 'font-light', label: 'Light' },
  { value: 'font-normal', label: 'Normal' },
  { value: 'font-medium', label: 'Medium' },
  { value: 'font-semibold', label: 'Semibold' },
  { value: 'font-bold', label: 'Bold' },
];

const TEXT_ALIGNS = [
  { value: 'text-left', icon: 'left' },
  { value: 'text-center', icon: 'center' },
  { value: 'text-right', icon: 'right' },
  { value: 'text-justify', icon: 'justify' },
];

// Convert RGB/RGBA to hex
function rgbToHex(rgb: string): string {
  if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') {
    return 'transparent';
  }

  // Already hex
  if (rgb.startsWith('#')) {
    return rgb;
  }

  // Parse rgb/rgba
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    const r = parseInt(match[1]).toString(16).padStart(2, '0');
    const g = parseInt(match[2]).toString(16).padStart(2, '0');
    const b = parseInt(match[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  return rgb;
}

// Standard Tailwind bg color classes to remove
const BG_COLOR_CLASSES = [
  'bg-transparent', 'bg-current', 'bg-black', 'bg-white',
  'bg-slate-', 'bg-gray-', 'bg-zinc-', 'bg-neutral-', 'bg-stone-',
  'bg-red-', 'bg-orange-', 'bg-amber-', 'bg-yellow-', 'bg-lime-',
  'bg-green-', 'bg-emerald-', 'bg-teal-', 'bg-cyan-', 'bg-sky-',
  'bg-blue-', 'bg-indigo-', 'bg-violet-', 'bg-purple-', 'bg-fuchsia-',
  'bg-pink-', 'bg-rose-',
];

// Standard Tailwind text color classes to remove
const TEXT_COLOR_CLASSES = [
  'text-transparent', 'text-current', 'text-black', 'text-white',
  'text-slate-', 'text-gray-', 'text-zinc-', 'text-neutral-', 'text-stone-',
  'text-red-', 'text-orange-', 'text-amber-', 'text-yellow-', 'text-lime-',
  'text-green-', 'text-emerald-', 'text-teal-', 'text-cyan-', 'text-sky-',
  'text-blue-', 'text-indigo-', 'text-violet-', 'text-purple-', 'text-fuchsia-',
  'text-pink-', 'text-rose-',
];

export default function StyleTab({ element }: StyleTabProps) {
  const { updateStyle, getCurrentClasses } = usePropertySync(element.jsxId);
  const currentClasses = getCurrentClasses();

  const currentFontSize = findCurrentClass(currentClasses, FONT_SIZES);
  const currentFontWeight = findCurrentClass(currentClasses, FONT_WEIGHTS);
  const currentTextAlign = findCurrentClass(currentClasses, TEXT_ALIGNS);

  const handleFontSizeChange = (value: string) => {
    updateStyle({
      addClasses: value ? [value] : [],
      removeClasses: FONT_SIZES.map(s => s.value),
    });
  };

  const handleFontWeightChange = (value: string) => {
    updateStyle({
      addClasses: value ? [value] : [],
      removeClasses: FONT_WEIGHTS.map(w => w.value),
    });
  };

  const handleTextAlignChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: TEXT_ALIGNS.map(a => a.value).filter(v => v !== value),
    });
  };

  const handleColorChange = (color: string) => {
    console.log('[StyleTab] handleColorChange called with:', color);
    const newClass = `text-[${color}]`;
    // Remove both arbitrary and standard text color classes
    const classesToRemove = currentClasses.filter(c =>
      c.startsWith('text-[#') ||
      c.startsWith('text-[') ||
      TEXT_COLOR_CLASSES.some(prefix => c === prefix || c.startsWith(prefix))
    );
    console.log('[StyleTab] currentClasses:', currentClasses);
    console.log('[StyleTab] classesToRemove:', classesToRemove);
    console.log('[StyleTab] newClass:', newClass);
    updateStyle({
      addClasses: [newClass],
      removeClasses: classesToRemove,
      // Also apply inline style for immediate visual feedback
      style: { color },
    });
  };

  const handleBgColorChange = (color: string) => {
    console.log('[StyleTab] handleBgColorChange called with:', color);
    const newClass = `bg-[${color}]`;
    // Remove both arbitrary and standard bg color classes
    const classesToRemove = currentClasses.filter(c =>
      c.startsWith('bg-[#') ||
      c.startsWith('bg-[') ||
      BG_COLOR_CLASSES.some(prefix => c === prefix || c.startsWith(prefix))
    );
    console.log('[StyleTab] currentClasses:', currentClasses);
    console.log('[StyleTab] classesToRemove:', classesToRemove);
    console.log('[StyleTab] newClass:', newClass);
    updateStyle({
      addClasses: [newClass],
      removeClasses: classesToRemove,
      // Also apply inline style for immediate visual feedback
      style: { backgroundColor: color },
    });
  };

  const renderAlignIcon = (align: string) => {
    switch (align) {
      case 'left':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h12M3 18h15" />
          </svg>
        );
      case 'center':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M6 12h12M4 18h16" />
          </svg>
        );
      case 'right':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M9 12h12M6 18h15" />
          </svg>
        );
      case 'justify':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        );
    }
  };

  return (
    <div className="style-tab">
      <h3 className="section-title">Typography</h3>

      {/* Font size and Font style - Two columns */}
      <div className="property-row">
        <div className="property-group">
          <label className="property-label">Font size</label>
          <select
            value={currentFontSize}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="select-control"
          >
            <option value="">Select size</option>
            {FONT_SIZES.map(size => (
              <option key={size.value} value={size.value}>{size.label}</option>
            ))}
          </select>
        </div>
        <div className="property-group">
          <label className="property-label">Font style</label>
          <select className="select-control" disabled>
            <option>Select font style</option>
          </select>
        </div>
      </div>

      {/* Font weight and Alignment - Two columns */}
      <div className="property-row">
        <div className="property-group">
          <label className="property-label">Font weight</label>
          <select
            value={currentFontWeight}
            onChange={(e) => handleFontWeightChange(e.target.value)}
            className="select-control"
          >
            <option value="">Select weight</option>
            {FONT_WEIGHTS.map(weight => (
              <option key={weight.value} value={weight.value}>{weight.label}</option>
            ))}
          </select>
        </div>
        <div className="property-group">
          <label className="property-label">Text align</label>
          <div className="align-toggles">
            {TEXT_ALIGNS.map(align => (
              <button
                key={align.value}
                className={`align-btn ${currentTextAlign === align.value ? 'active' : ''}`}
                onClick={() => handleTextAlignChange(align.value)}
              >
                {renderAlignIcon(align.icon)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Colors - Two columns */}
      <div className="property-row">
        <div className="property-group">
          <label className="property-label">Text color</label>
          <ColorPicker
            value={rgbToHex(element.computedStyles.color) || '#000000'}
            onChange={handleColorChange}
          />
        </div>
        <div className="property-group">
          <label className="property-label">Background</label>
          <ColorPicker
            value={rgbToHex(element.computedStyles.backgroundColor) || 'transparent'}
            onChange={handleBgColorChange}
          />
        </div>
      </div>

      <style>{`
        .style-tab {
          padding: 16px;
        }

        .section-title {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 16px 0;
        }

        .property-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }

        .property-group {
          display: flex;
          flex-direction: column;
        }

        .property-label {
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .select-control {
          height: 44px;
          padding: 0 12px;
          border: none;
          border-radius: 8px;
          background: #f5f5f0;
          font-size: 14px;
          color: #1f2937;
          cursor: pointer;
          outline: none;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
        }

        .select-control:hover {
          background-color: #ebebdf;
        }

        .select-control:disabled {
          color: #9ca3af;
          cursor: not-allowed;
        }

        .align-toggles {
          display: flex;
          background: #f5f5f0;
          border-radius: 8px;
          padding: 4px;
          gap: 2px;
        }

        .align-btn {
          flex: 1;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 6px;
          background: transparent;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
        }

        .align-btn:hover {
          background: #ebebdf;
        }

        .align-btn.active {
          background: #dbeafe;
          color: #1d4ed8;
        }
      `}</style>
    </div>
  );
}

function findCurrentClass(
  classes: string[],
  options: { value: string }[]
): string {
  const values = options.map(o => o.value);
  return classes.find(c => values.includes(c)) || '';
}
