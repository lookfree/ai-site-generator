/**
 * 间距标签页
 */

import { usePropertySync } from '../../../hooks/usePropertySync';
import { SpacingBox } from '../controls';
import type { SelectedElementInfo } from '../../../types';

interface SpacingTabProps {
  element: SelectedElementInfo;
}

export default function SpacingTab({ element }: SpacingTabProps) {
  const { updateStyle, getCurrentClasses } = usePropertySync(element.jsxId);
  const currentClasses = getCurrentClasses();

  const handlePaddingChange = (side: string, value: string) => {
    const prefix = side === 'all' ? 'p' : `p${side[0]}`;
    const newClass = value !== '0' ? `${prefix}-${value}` : '';

    // 移除同类型的旧类
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
    const newClass = value !== '0' ? `${prefix}-${value}` : '';

    const oldClasses = currentClasses.filter(c => {
      if (side === 'all') return c.match(/^m-[^x]/);
      return c.match(new RegExp(`^m${side[0]}-`));
    });

    updateStyle({
      addClasses: newClass ? [newClass] : [],
      removeClasses: oldClasses,
    });
  };

  return (
    <div className="spacing-tab">
      {/* Padding */}
      <div className="spacing-section">
        <h4 className="section-title">内边距 (Padding)</h4>
        <SpacingBox
          type="padding"
          values={extractSpacingValues(currentClasses, 'p')}
          onChange={handlePaddingChange}
        />
      </div>

      {/* Margin */}
      <div className="spacing-section">
        <h4 className="section-title">外边距 (Margin)</h4>
        <SpacingBox
          type="margin"
          values={extractSpacingValues(currentClasses, 'm')}
          onChange={handleMarginChange}
        />
      </div>

      <style>{`
        .spacing-tab {
          padding: 12px;
        }

        .spacing-section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 12px 0;
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
    // 匹配 p-4, pt-4, pr-4, pb-4, pl-4, px-4, py-4
    const match = cls.match(new RegExp(`^${prefix}([trblxy])?-(.+)$`));
    if (match) {
      const [, side, value] = match;
      if (!side) {
        // p-4 或 m-4
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
