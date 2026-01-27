/**
 * 间距标签页 - Lovable style
 */

import { usePropertySync } from '../../../hooks/usePropertySync';
import type { SelectedElementInfo } from '../../../types';

interface SpacingTabProps {
  element: SelectedElementInfo;
}

export default function SpacingTab({ element }: SpacingTabProps) {
  const { updateStyle, getCurrentClasses } = usePropertySync(element.jsxId);
  const currentClasses = getCurrentClasses();

  const paddingValues = extractSpacingValues(currentClasses, 'p');
  const marginValues = extractSpacingValues(currentClasses, 'm');

  const handlePaddingChange = (side: string, value: string) => {
    const prefix = side === 'all' ? 'p' : `p${side[0]}`;
    const numValue = parseInt(value) || 0;
    const tailwindValue = numValue === 0 ? '' : Math.round(numValue / 4).toString();
    const newClass = tailwindValue ? `${prefix}-${tailwindValue}` : '';

    const oldClasses = currentClasses.filter(c => {
      if (side === 'all') return c.match(/^p-[^x]/);
      return c.match(new RegExp(`^p${side[0]}-`));
    });

    updateStyle({
      addClasses: newClass ? [newClass] : [],
      removeClasses: oldClasses,
    });
  };

  const handleMarginChange = (side: string, value: string) => {
    const prefix = side === 'all' ? 'm' : `m${side[0]}`;
    const numValue = parseInt(value) || 0;
    const tailwindValue = numValue === 0 ? '' : Math.round(numValue / 4).toString();
    const newClass = tailwindValue ? `${prefix}-${tailwindValue}` : '';

    const oldClasses = currentClasses.filter(c => {
      if (side === 'all') return c.match(/^m-[^x]/);
      return c.match(new RegExp(`^m${side[0]}-`));
    });

    updateStyle({
      addClasses: newClass ? [newClass] : [],
      removeClasses: oldClasses,
    });
  };

  const tailwindToPixels = (value: string) => {
    const num = parseInt(value) || 0;
    return (num * 4).toString();
  };

  return (
    <div className="spacing-tab">
      <h3 className="section-title">Spacing</h3>

      {/* Padding - Visual box representation */}
      <div className="spacing-section">
        <label className="subsection-label">Padding</label>
        <div className="spacing-box-container">
          <div className="spacing-box padding-box">
            <input
              type="number"
              className="spacing-input top"
              value={tailwindToPixels(paddingValues.top)}
              onChange={(e) => handlePaddingChange('top', e.target.value)}
              placeholder="0"
            />
            <input
              type="number"
              className="spacing-input right"
              value={tailwindToPixels(paddingValues.right)}
              onChange={(e) => handlePaddingChange('right', e.target.value)}
              placeholder="0"
            />
            <input
              type="number"
              className="spacing-input bottom"
              value={tailwindToPixels(paddingValues.bottom)}
              onChange={(e) => handlePaddingChange('bottom', e.target.value)}
              placeholder="0"
            />
            <input
              type="number"
              className="spacing-input left"
              value={tailwindToPixels(paddingValues.left)}
              onChange={(e) => handlePaddingChange('left', e.target.value)}
              placeholder="0"
            />
            <div className="spacing-center">
              <span className="spacing-label">P</span>
            </div>
          </div>
        </div>
      </div>

      {/* Margin - Visual box representation */}
      <div className="spacing-section">
        <label className="subsection-label">Margin</label>
        <div className="spacing-box-container">
          <div className="spacing-box margin-box">
            <input
              type="number"
              className="spacing-input top"
              value={tailwindToPixels(marginValues.top)}
              onChange={(e) => handleMarginChange('top', e.target.value)}
              placeholder="0"
            />
            <input
              type="number"
              className="spacing-input right"
              value={tailwindToPixels(marginValues.right)}
              onChange={(e) => handleMarginChange('right', e.target.value)}
              placeholder="0"
            />
            <input
              type="number"
              className="spacing-input bottom"
              value={tailwindToPixels(marginValues.bottom)}
              onChange={(e) => handleMarginChange('bottom', e.target.value)}
              placeholder="0"
            />
            <input
              type="number"
              className="spacing-input left"
              value={tailwindToPixels(marginValues.left)}
              onChange={(e) => handleMarginChange('left', e.target.value)}
              placeholder="0"
            />
            <div className="spacing-center">
              <span className="spacing-label">M</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .spacing-tab {
          padding: 16px;
        }

        .section-title {
          font-size: 15px;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 16px 0;
        }

        .spacing-section {
          margin-bottom: 20px;
        }

        .subsection-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #6b7280;
          margin-bottom: 12px;
        }

        .spacing-box-container {
          display: flex;
          justify-content: center;
        }

        .spacing-box {
          position: relative;
          width: 180px;
          height: 120px;
          background: #f5f5f0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spacing-input {
          position: absolute;
          width: 40px;
          height: 28px;
          border: none;
          border-radius: 6px;
          background: #fff;
          text-align: center;
          font-size: 12px;
          color: #1f2937;
          outline: none;
        }

        .spacing-input:focus {
          box-shadow: 0 0 0 2px #3b82f6;
        }

        .spacing-input::-webkit-inner-spin-button,
        .spacing-input::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .spacing-input.top {
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
        }

        .spacing-input.right {
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
        }

        .spacing-input.bottom {
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
        }

        .spacing-input.left {
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
        }

        .spacing-center {
          width: 60px;
          height: 40px;
          background: #e5e5dc;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spacing-label {
          font-size: 14px;
          font-weight: 600;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}

function extractSpacingValues(
  classes: string[],
  prefix: string
): { top: string; right: string; bottom: string; left: string } {
  const result = {
    top: '0', right: '0', bottom: '0', left: '0'
  };

  for (const cls of classes) {
    const match = cls.match(new RegExp(`^${prefix}([trblxy])?-(.+)$`));
    if (match) {
      const [, side, value] = match;
      if (!side) {
        result.top = result.right = result.bottom = result.left = value;
      } else if (side === 'x') {
        result.left = result.right = value;
      } else if (side === 'y') {
        result.top = result.bottom = value;
      } else {
        const sideMap: Record<string, keyof typeof result> = {
          t: 'top', r: 'right', b: 'bottom', l: 'left'
        };
        result[sideMap[side]] = value;
      }
    }
  }

  return result;
}
