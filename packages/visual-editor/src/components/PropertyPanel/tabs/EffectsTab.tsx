/**
 * 效果标签页 - Lovable style
 */

import { usePropertySync } from '../../../hooks/usePropertySync';
import { ColorPicker } from '../controls';
import type { SelectedElementInfo } from '../../../types';

interface EffectsTabProps {
  element: SelectedElementInfo;
}

const BORDER_RADIUS_OPTIONS = [
  { value: 'rounded-none', label: 'None' },
  { value: 'rounded-sm', label: 'Small' },
  { value: 'rounded', label: 'Default' },
  { value: 'rounded-md', label: 'Medium' },
  { value: 'rounded-lg', label: 'Large' },
  { value: 'rounded-xl', label: 'XL' },
  { value: 'rounded-2xl', label: '2XL' },
  { value: 'rounded-full', label: 'Full' },
];

const SHADOW_OPTIONS = [
  { value: 'shadow-none', label: 'None' },
  { value: 'shadow-sm', label: 'Small' },
  { value: 'shadow', label: 'Default' },
  { value: 'shadow-md', label: 'Medium' },
  { value: 'shadow-lg', label: 'Large' },
  { value: 'shadow-xl', label: 'XL' },
  { value: 'shadow-2xl', label: '2XL' },
];

const BORDER_WIDTH_OPTIONS = [
  { value: 'border-0', label: 'None' },
  { value: 'border', label: '1px' },
  { value: 'border-2', label: '2px' },
  { value: 'border-4', label: '4px' },
];

// Convert RGB/RGBA to hex
function rgbToHex(rgb: string): string {
  if (!rgb || rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') {
    return '#000000';
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

// Standard Tailwind border color classes to remove
const BORDER_COLOR_CLASSES = [
  'border-transparent', 'border-current', 'border-black', 'border-white',
  'border-slate-', 'border-gray-', 'border-zinc-', 'border-neutral-', 'border-stone-',
  'border-red-', 'border-orange-', 'border-amber-', 'border-yellow-', 'border-lime-',
  'border-green-', 'border-emerald-', 'border-teal-', 'border-cyan-', 'border-sky-',
  'border-blue-', 'border-indigo-', 'border-violet-', 'border-purple-', 'border-fuchsia-',
  'border-pink-', 'border-rose-',
];

export default function EffectsTab({ element }: EffectsTabProps) {
  const { updateStyle, getCurrentClasses } = usePropertySync(element.jsxId);
  const currentClasses = getCurrentClasses();

  const currentRadius = findCurrentClass(currentClasses, BORDER_RADIUS_OPTIONS);
  const currentShadow = findCurrentClass(currentClasses, SHADOW_OPTIONS);
  const currentBorderWidth = findCurrentClass(currentClasses, BORDER_WIDTH_OPTIONS);

  const opacityClass = currentClasses.find(c => c.startsWith('opacity-'));
  const currentOpacity = opacityClass
    ? parseInt(opacityClass.replace('opacity-', ''), 10)
    : 100;

  const handleBorderRadiusChange = (value: string) => {
    updateStyle({
      addClasses: value ? [value] : [],
      removeClasses: BORDER_RADIUS_OPTIONS.map(o => o.value),
    });
  };

  const handleShadowChange = (value: string) => {
    updateStyle({
      addClasses: value ? [value] : [],
      removeClasses: SHADOW_OPTIONS.map(o => o.value),
    });
  };

  const handleBorderWidthChange = (value: string) => {
    updateStyle({
      addClasses: value ? [value] : [],
      removeClasses: BORDER_WIDTH_OPTIONS.map(o => o.value),
    });
  };

  const handleBorderColorChange = (color: string) => {
    const newClass = `border-[${color}]`;
    // Remove both arbitrary and standard border color classes
    const classesToRemove = currentClasses.filter(c =>
      c.startsWith('border-[#') ||
      c.startsWith('border-[') ||
      BORDER_COLOR_CLASSES.some(prefix => c === prefix || c.startsWith(prefix))
    );
    updateStyle({
      addClasses: [newClass],
      removeClasses: classesToRemove,
    });
  };

  const handleOpacityChange = (value: number) => {
    const newClass = `opacity-${value}`;
    updateStyle({
      addClasses: [newClass],
      removeClasses: currentClasses.filter(c => c.startsWith('opacity-')),
    });
  };

  return (
    <div className="effects-tab">
      <h3 className="section-title">Effects</h3>

      {/* Border Radius and Shadow - Two columns */}
      <div className="property-row">
        <div className="property-group">
          <label className="property-label">Border radius</label>
          <select
            value={currentRadius}
            onChange={(e) => handleBorderRadiusChange(e.target.value)}
            className="select-control"
          >
            <option value="">Select</option>
            {BORDER_RADIUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="property-group">
          <label className="property-label">Shadow</label>
          <select
            value={currentShadow}
            onChange={(e) => handleShadowChange(e.target.value)}
            className="select-control"
          >
            <option value="">Select</option>
            {SHADOW_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Border Width and Color - Two columns */}
      <div className="property-row">
        <div className="property-group">
          <label className="property-label">Border width</label>
          <select
            value={currentBorderWidth}
            onChange={(e) => handleBorderWidthChange(e.target.value)}
            className="select-control"
          >
            <option value="">Select</option>
            {BORDER_WIDTH_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="property-group">
          <label className="property-label">Border color</label>
          <ColorPicker
            value={rgbToHex(element.computedStyles.borderColor)}
            onChange={handleBorderColorChange}
          />
        </div>
      </div>

      {/* Opacity */}
      <div className="property-group">
        <label className="property-label">Opacity</label>
        <div className="opacity-control">
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={currentOpacity}
            onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
            className="opacity-slider"
          />
          <div className="opacity-value-wrapper">
            <input
              type="number"
              min="0"
              max="100"
              value={currentOpacity}
              onChange={(e) => handleOpacityChange(parseInt(e.target.value) || 0)}
              className="opacity-input"
            />
            <span className="opacity-unit">%</span>
          </div>
        </div>
      </div>

      <style>{`
        .effects-tab {
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
          margin-bottom: 16px;
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

        .opacity-control {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .opacity-slider {
          flex: 1;
          height: 6px;
          border-radius: 3px;
          background: #e5e5dc;
          outline: none;
          -webkit-appearance: none;
        }

        .opacity-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #1d4ed8;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .opacity-value-wrapper {
          display: flex;
          align-items: center;
          background: #f5f5f0;
          border-radius: 8px;
          padding: 0 12px;
          height: 36px;
          min-width: 70px;
        }

        .opacity-input {
          width: 36px;
          border: none;
          background: transparent;
          font-size: 14px;
          color: #1f2937;
          outline: none;
          text-align: right;
        }

        .opacity-input::-webkit-inner-spin-button,
        .opacity-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .opacity-unit {
          font-size: 14px;
          color: #6b7280;
          margin-left: 2px;
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
