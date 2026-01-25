/**
 * 效果标签页
 */

import { usePropertySync } from '../../../hooks/usePropertySync';
import { SelectControl, SliderControl } from '../controls';
import type { SelectedElementInfo } from '../../../types';

interface EffectsTabProps {
  element: SelectedElementInfo;
}

const BORDER_RADIUS_OPTIONS = [
  { value: 'rounded-none', label: '无' },
  { value: 'rounded-sm', label: '小 (2px)' },
  { value: 'rounded', label: '默认 (4px)' },
  { value: 'rounded-md', label: '中 (6px)' },
  { value: 'rounded-lg', label: '大 (8px)' },
  { value: 'rounded-xl', label: '更大 (12px)' },
  { value: 'rounded-2xl', label: '超大 (16px)' },
  { value: 'rounded-3xl', label: '最大 (24px)' },
  { value: 'rounded-full', label: '圆形' },
];

const SHADOW_OPTIONS = [
  { value: 'shadow-none', label: '无' },
  { value: 'shadow-sm', label: '小' },
  { value: 'shadow', label: '默认' },
  { value: 'shadow-md', label: '中' },
  { value: 'shadow-lg', label: '大' },
  { value: 'shadow-xl', label: '更大' },
  { value: 'shadow-2xl', label: '超大' },
];

const BORDER_WIDTH_OPTIONS = [
  { value: 'border-0', label: '无' },
  { value: 'border', label: '1px' },
  { value: 'border-2', label: '2px' },
  { value: 'border-4', label: '4px' },
  { value: 'border-8', label: '8px' },
];

export default function EffectsTab({ element }: EffectsTabProps) {
  const { updateStyle, getCurrentClasses } = usePropertySync(element.jsxId);
  const currentClasses = getCurrentClasses();

  // 解析当前透明度
  const opacityClass = currentClasses.find(c => c.startsWith('opacity-'));
  const currentOpacity = opacityClass
    ? parseInt(opacityClass.replace('opacity-', ''), 10)
    : 100;

  const handleBorderRadiusChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: BORDER_RADIUS_OPTIONS.map(o => o.value).filter(v => v !== value),
    });
  };

  const handleShadowChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: SHADOW_OPTIONS.map(o => o.value).filter(v => v !== value),
    });
  };

  const handleBorderWidthChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: BORDER_WIDTH_OPTIONS.map(o => o.value).filter(v => v !== value),
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
      {/* 圆角 */}
      <div className="property-group">
        <label className="property-label">圆角</label>
        <SelectControl
          options={BORDER_RADIUS_OPTIONS}
          value={findCurrentClass(currentClasses, BORDER_RADIUS_OPTIONS)}
          onChange={handleBorderRadiusChange}
          allowClear
          placeholder="默认"
        />
      </div>

      {/* 阴影 */}
      <div className="property-group">
        <label className="property-label">阴影</label>
        <SelectControl
          options={SHADOW_OPTIONS}
          value={findCurrentClass(currentClasses, SHADOW_OPTIONS)}
          onChange={handleShadowChange}
          allowClear
          placeholder="默认"
        />
      </div>

      {/* 边框宽度 */}
      <div className="property-group">
        <label className="property-label">边框宽度</label>
        <SelectControl
          options={BORDER_WIDTH_OPTIONS}
          value={findCurrentClass(currentClasses, BORDER_WIDTH_OPTIONS)}
          onChange={handleBorderWidthChange}
          allowClear
          placeholder="默认"
        />
      </div>

      {/* 透明度 */}
      <div className="property-group">
        <label className="property-label">透明度</label>
        <SliderControl
          value={currentOpacity}
          onChange={handleOpacityChange}
          min={0}
          max={100}
          step={5}
          unit="%"
        />
      </div>

      <style>{`
        .effects-tab {
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
