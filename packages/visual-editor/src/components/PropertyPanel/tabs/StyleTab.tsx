/**
 * 样式标签页
 */

import { usePropertySync } from '../../../hooks/usePropertySync';
import { ColorPicker, SelectControl } from '../controls';
import type { SelectedElementInfo } from '../../../types';

interface StyleTabProps {
  element: SelectedElementInfo;
}

const FONT_SIZES = [
  { value: 'text-xs', label: '12px (xs)' },
  { value: 'text-sm', label: '14px (sm)' },
  { value: 'text-base', label: '16px (base)' },
  { value: 'text-lg', label: '18px (lg)' },
  { value: 'text-xl', label: '20px (xl)' },
  { value: 'text-2xl', label: '24px (2xl)' },
  { value: 'text-3xl', label: '30px (3xl)' },
  { value: 'text-4xl', label: '36px (4xl)' },
  { value: 'text-5xl', label: '48px (5xl)' },
];

const FONT_WEIGHTS = [
  { value: 'font-light', label: 'Light (300)' },
  { value: 'font-normal', label: 'Normal (400)' },
  { value: 'font-medium', label: 'Medium (500)' },
  { value: 'font-semibold', label: 'Semibold (600)' },
  { value: 'font-bold', label: 'Bold (700)' },
];

const TEXT_ALIGNS = [
  { value: 'text-left', label: '左对齐' },
  { value: 'text-center', label: '居中' },
  { value: 'text-right', label: '右对齐' },
  { value: 'text-justify', label: '两端对齐' },
];

export default function StyleTab({ element }: StyleTabProps) {
  const { updateStyle, getCurrentClasses } = usePropertySync(element.jsxId);
  const currentClasses = getCurrentClasses();

  const handleFontSizeChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: FONT_SIZES.map(s => s.value).filter(v => v !== value),
    });
  };

  const handleFontWeightChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: FONT_WEIGHTS.map(w => w.value).filter(v => v !== value),
    });
  };

  const handleTextAlignChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: TEXT_ALIGNS.map(a => a.value).filter(v => v !== value),
    });
  };

  const handleColorChange = (color: string) => {
    const newClass = `text-[${color}]`;
    updateStyle({
      addClasses: [newClass],
      removeClasses: currentClasses.filter(c => c.startsWith('text-[#') || c.startsWith('text-[')),
    });
  };

  const handleBgColorChange = (color: string) => {
    const newClass = `bg-[${color}]`;
    updateStyle({
      addClasses: [newClass],
      removeClasses: currentClasses.filter(c => c.startsWith('bg-[#') || c.startsWith('bg-[')),
    });
  };

  return (
    <div className="style-tab">
      {/* 文字颜色 */}
      <div className="property-group">
        <label className="property-label">文字颜色</label>
        <ColorPicker
          value={element.computedStyles.color || '#000000'}
          onChange={handleColorChange}
        />
      </div>

      {/* 背景颜色 */}
      <div className="property-group">
        <label className="property-label">背景颜色</label>
        <ColorPicker
          value={element.computedStyles.backgroundColor || 'transparent'}
          onChange={handleBgColorChange}
        />
      </div>

      {/* 字号 */}
      <div className="property-group">
        <label className="property-label">字号</label>
        <SelectControl
          options={FONT_SIZES}
          value={findCurrentClass(currentClasses, FONT_SIZES)}
          onChange={handleFontSizeChange}
          allowClear
          placeholder="默认"
        />
      </div>

      {/* 字重 */}
      <div className="property-group">
        <label className="property-label">字重</label>
        <SelectControl
          options={FONT_WEIGHTS}
          value={findCurrentClass(currentClasses, FONT_WEIGHTS)}
          onChange={handleFontWeightChange}
          allowClear
          placeholder="默认"
        />
      </div>

      {/* 对齐 */}
      <div className="property-group">
        <label className="property-label">对齐方式</label>
        <SelectControl
          options={TEXT_ALIGNS}
          value={findCurrentClass(currentClasses, TEXT_ALIGNS)}
          onChange={handleTextAlignChange}
          allowClear
          placeholder="默认"
        />
      </div>

      <style>{`
        .style-tab {
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
