/**
 * 布局标签页 - Lovable style
 */

import { usePropertySync } from '../../../hooks/usePropertySync';
import { SizeInput } from '../controls';
import type { SelectedElementInfo } from '../../../types';

interface LayoutTabProps {
  element: SelectedElementInfo;
}

const FLEX_DIRECTION_OPTIONS = [
  { value: 'flex-row', label: 'Horizontal (row)' },
  { value: 'flex-col', label: 'Vertical (col)' },
];

const JUSTIFY_OPTIONS = [
  { value: 'justify-start', label: 'Start' },
  { value: 'justify-center', label: 'Center' },
  { value: 'justify-end', label: 'End' },
];

const ALIGN_OPTIONS = [
  { value: 'items-start', label: 'Start' },
  { value: 'items-center', label: 'Center' },
  { value: 'items-end', label: 'End' },
];

const GAP_OPTIONS = [
  { value: 'gap-0', label: '0' },
  { value: 'gap-1', label: '4' },
  { value: 'gap-2', label: '8' },
  { value: 'gap-3', label: '12' },
  { value: 'gap-4', label: '16' },
  { value: 'gap-6', label: '24' },
  { value: 'gap-8', label: '32' },
];

export default function LayoutTab({ element }: LayoutTabProps) {
  const { updateStyle, getCurrentClasses } = usePropertySync(element.jsxId);
  const currentClasses = getCurrentClasses();

  const currentDirection = findCurrentClass(currentClasses, FLEX_DIRECTION_OPTIONS) || 'flex-row';
  const currentJustify = findCurrentClass(currentClasses, JUSTIFY_OPTIONS) || 'justify-start';
  const currentAlign = findCurrentClass(currentClasses, ALIGN_OPTIONS) || 'items-start';
  const currentGap = findCurrentClass(currentClasses, GAP_OPTIONS) || 'gap-0';
  const gapValue = GAP_OPTIONS.find(o => o.value === currentGap)?.label || '0';

  const handleFlexDirectionChange = (value: string) => {
    updateStyle({
      addClasses: ['flex', value],
      removeClasses: FLEX_DIRECTION_OPTIONS.map(o => o.value).filter(v => v !== value),
    });
  };

  const handleAlignmentChange = (justify: string, align: string) => {
    // Also add 'flex' to ensure alignment works
    const hasFlex = currentClasses.includes('flex') ||
                    currentClasses.includes('flex-row') ||
                    currentClasses.includes('flex-col');
    updateStyle({
      addClasses: hasFlex ? [justify, align] : ['flex', justify, align],
      removeClasses: [
        ...JUSTIFY_OPTIONS.map(o => o.value).filter(v => v !== justify),
        ...ALIGN_OPTIONS.map(o => o.value).filter(v => v !== align),
      ],
    });
  };

  const handleGapChange = (value: string) => {
    const gapClass = GAP_OPTIONS.find(o => o.label === value)?.value || 'gap-0';
    updateStyle({
      addClasses: [gapClass],
      removeClasses: GAP_OPTIONS.map(o => o.value).filter(v => v !== gapClass),
    });
  };

  const handleWidthChange = (value: string) => {
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

  // Build alignment grid positions
  const alignmentGrid = [
    ['justify-start', 'items-start'], ['justify-center', 'items-start'], ['justify-end', 'items-start'],
    ['justify-start', 'items-center'], ['justify-center', 'items-center'], ['justify-end', 'items-center'],
    ['justify-start', 'items-end'], ['justify-center', 'items-end'], ['justify-end', 'items-end'],
  ];

  return (
    <div className="layout-tab">
      <h3 className="section-title">Layout</h3>

      {/* Direction - Two toggle buttons like Lovable */}
      <div className="property-row">
        <label className="property-label">Direction</label>
        <label className="property-label">Flex align</label>
      </div>

      <div className="layout-controls">
        {/* Direction toggles */}
        <div className="direction-toggles">
          <button
            className={`direction-btn ${currentDirection === 'flex-row' ? 'active' : ''}`}
            onClick={() => handleFlexDirectionChange('flex-row')}
            title="Horizontal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
          <button
            className={`direction-btn ${currentDirection === 'flex-col' ? 'active' : ''}`}
            onClick={() => handleFlexDirectionChange('flex-col')}
            title="Vertical"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>

        {/* Alignment 3x3 grid like Lovable */}
        <div className="alignment-grid">
          {alignmentGrid.map(([justify, align], i) => {
            const isActive = currentJustify === justify && currentAlign === align;
            return (
              <button
                key={i}
                className={`alignment-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleAlignmentChange(justify, align)}
              >
                {isActive ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span className="alignment-dot" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gap */}
      <div className="property-group">
        <label className="property-label">Gap</label>
        <div className="gap-input-wrapper">
          <span className="gap-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v18M16 3v18" />
            </svg>
          </span>
          <input
            type="number"
            value={gapValue}
            onChange={(e) => handleGapChange(e.target.value)}
            className="gap-input"
            min="0"
            step="4"
          />
        </div>
      </div>

      {/* Dimensions - Two columns like Lovable */}
      <div className="dimensions-row">
        <div className="dimension-group">
          <label className="property-label">Width</label>
          <SizeInput
            value={element.computedStyles.width || ''}
            onChange={handleWidthChange}
          />
        </div>
        <div className="dimension-group">
          <label className="property-label">Height</label>
          <SizeInput
            value={element.computedStyles.height || ''}
            onChange={handleHeightChange}
          />
        </div>
      </div>

      <style>{`
        .layout-tab {
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
          margin-bottom: 8px;
        }

        .property-group {
          margin-bottom: 16px;
        }

        .property-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .layout-controls {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }

        .direction-toggles {
          display: flex;
          gap: 8px;
        }

        .direction-btn {
          flex: 1;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 8px;
          background: #f5f5f0;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.15s;
        }

        .direction-btn:hover {
          background: #ebebdf;
        }

        .direction-btn.active {
          background: #dbeafe;
          color: #1d4ed8;
        }

        .alignment-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 4px;
          background: #f5f5f0;
          padding: 4px;
          border-radius: 8px;
        }

        .alignment-btn {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          border-radius: 6px;
          background: transparent;
          cursor: pointer;
          transition: all 0.15s;
        }

        .alignment-btn:hover {
          background: #ebebdf;
        }

        .alignment-btn.active {
          background: #1d4ed8;
          color: white;
        }

        .alignment-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #9ca3af;
        }

        .gap-input-wrapper {
          display: flex;
          align-items: center;
          background: #f5f5f0;
          border-radius: 8px;
          padding: 0 12px;
          height: 44px;
        }

        .gap-icon {
          color: #9ca3af;
          margin-right: 8px;
          display: flex;
        }

        .gap-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 14px;
          color: #1f2937;
          outline: none;
        }

        .gap-input::-webkit-inner-spin-button,
        .gap-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .dimensions-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .dimension-group {
          display: flex;
          flex-direction: column;
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
