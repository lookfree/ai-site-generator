/**
 * 布局标签页
 */

import { usePropertySync } from '../../../hooks/usePropertySync';
import { SelectControl, SizeInput } from '../controls';
import type { SelectedElementInfo } from '../../../types';

interface LayoutTabProps {
  element: SelectedElementInfo;
}

const DISPLAY_OPTIONS = [
  { value: 'block', label: 'Block' },
  { value: 'inline-block', label: 'Inline Block' },
  { value: 'inline', label: 'Inline' },
  { value: 'flex', label: 'Flex' },
  { value: 'inline-flex', label: 'Inline Flex' },
  { value: 'grid', label: 'Grid' },
  { value: 'hidden', label: 'Hidden' },
];

const FLEX_DIRECTION_OPTIONS = [
  { value: 'flex-row', label: '水平 (row)' },
  { value: 'flex-row-reverse', label: '水平反向' },
  { value: 'flex-col', label: '垂直 (col)' },
  { value: 'flex-col-reverse', label: '垂直反向' },
];

const JUSTIFY_OPTIONS = [
  { value: 'justify-start', label: '起始' },
  { value: 'justify-center', label: '居中' },
  { value: 'justify-end', label: '结束' },
  { value: 'justify-between', label: '两端对齐' },
  { value: 'justify-around', label: '分散对齐' },
  { value: 'justify-evenly', label: '均匀分布' },
];

const ALIGN_OPTIONS = [
  { value: 'items-start', label: '起始' },
  { value: 'items-center', label: '居中' },
  { value: 'items-end', label: '结束' },
  { value: 'items-baseline', label: '基线' },
  { value: 'items-stretch', label: '拉伸' },
];

const GAP_OPTIONS = [
  { value: 'gap-0', label: '0' },
  { value: 'gap-1', label: '4px' },
  { value: 'gap-2', label: '8px' },
  { value: 'gap-3', label: '12px' },
  { value: 'gap-4', label: '16px' },
  { value: 'gap-5', label: '20px' },
  { value: 'gap-6', label: '24px' },
  { value: 'gap-8', label: '32px' },
];

export default function LayoutTab({ element }: LayoutTabProps) {
  const { updateStyle, getCurrentClasses } = usePropertySync(element.jsxId);
  const currentClasses = getCurrentClasses();

  const isFlex = currentClasses.includes('flex') || currentClasses.includes('inline-flex');

  const handleDisplayChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: DISPLAY_OPTIONS.map(o => o.value).filter(v => v !== value),
    });
  };

  const handleFlexDirectionChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: FLEX_DIRECTION_OPTIONS.map(o => o.value).filter(v => v !== value),
    });
  };

  const handleJustifyChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: JUSTIFY_OPTIONS.map(o => o.value).filter(v => v !== value),
    });
  };

  const handleAlignChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: ALIGN_OPTIONS.map(o => o.value).filter(v => v !== value),
    });
  };

  const handleGapChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: GAP_OPTIONS.map(o => o.value).filter(v => v !== value),
    });
  };

  const handleWidthChange = (value: string) => {
    // 使用任意值
    const newClass = value ? `w-[${value}]` : '';
    updateStyle({
      addClasses: newClass ? [newClass] : [],
      removeClasses: currentClasses.filter(c => c.startsWith('w-')),
    });
  };

  const handleHeightChange = (value: string) => {
    const newClass = value ? `h-[${value}]` : '';
    updateStyle({
      addClasses: newClass ? [newClass] : [],
      removeClasses: currentClasses.filter(c => c.startsWith('h-')),
    });
  };

  return (
    <div className="layout-tab">
      {/* Display */}
      <div className="property-group">
        <label className="property-label">Display</label>
        <SelectControl
          options={DISPLAY_OPTIONS}
          value={findCurrentClass(currentClasses, DISPLAY_OPTIONS)}
          onChange={handleDisplayChange}
          allowClear
          placeholder="默认"
        />
      </div>

      {/* Flex 相关属性 */}
      {isFlex && (
        <>
          <div className="property-group">
            <label className="property-label">方向</label>
            <SelectControl
              options={FLEX_DIRECTION_OPTIONS}
              value={findCurrentClass(currentClasses, FLEX_DIRECTION_OPTIONS)}
              onChange={handleFlexDirectionChange}
              allowClear
              placeholder="默认"
            />
          </div>

          <div className="property-group">
            <label className="property-label">主轴对齐</label>
            <SelectControl
              options={JUSTIFY_OPTIONS}
              value={findCurrentClass(currentClasses, JUSTIFY_OPTIONS)}
              onChange={handleJustifyChange}
              allowClear
              placeholder="默认"
            />
          </div>

          <div className="property-group">
            <label className="property-label">交叉轴对齐</label>
            <SelectControl
              options={ALIGN_OPTIONS}
              value={findCurrentClass(currentClasses, ALIGN_OPTIONS)}
              onChange={handleAlignChange}
              allowClear
              placeholder="默认"
            />
          </div>

          <div className="property-group">
            <label className="property-label">间距 (Gap)</label>
            <SelectControl
              options={GAP_OPTIONS}
              value={findCurrentClass(currentClasses, GAP_OPTIONS)}
              onChange={handleGapChange}
              allowClear
              placeholder="默认"
            />
          </div>
        </>
      )}

      <div className="section-divider" />

      {/* 尺寸 */}
      <div className="property-group">
        <label className="property-label">宽度</label>
        <SizeInput
          value={element.computedStyles.width || ''}
          onChange={handleWidthChange}
        />
      </div>

      <div className="property-group">
        <label className="property-label">高度</label>
        <SizeInput
          value={element.computedStyles.height || ''}
          onChange={handleHeightChange}
        />
      </div>

      <style>{`
        .layout-tab {
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

        .section-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 16px 0;
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
