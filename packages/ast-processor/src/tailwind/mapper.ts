/**
 * CSS 到 Tailwind 映射器
 * 将 CSS 属性值转换为 Tailwind 类名
 */

export interface CSSProperty {
  property: string;
  value: string;
}

// 映射规则类型
type MapperFn = (value: string) => string | null;

// 核心映射规则
const MAPPER_RULES: Record<string, MapperFn> = {
  // ========== 颜色 ==========
  'color': (v) => v.startsWith('#') || v.startsWith('rgb')
    ? `text-[${v}]`
    : `text-${v}`,
  'background-color': (v) => v.startsWith('#') || v.startsWith('rgb')
    ? `bg-[${v}]`
    : `bg-${v}`,
  'border-color': (v) => v.startsWith('#') || v.startsWith('rgb')
    ? `border-[${v}]`
    : `border-${v}`,

  // ========== 字体 ==========
  'font-size': (v) => {
    const map: Record<string, string> = {
      '12px': 'text-xs', '0.75rem': 'text-xs',
      '14px': 'text-sm', '0.875rem': 'text-sm',
      '16px': 'text-base', '1rem': 'text-base',
      '18px': 'text-lg', '1.125rem': 'text-lg',
      '20px': 'text-xl', '1.25rem': 'text-xl',
      '24px': 'text-2xl', '1.5rem': 'text-2xl',
      '30px': 'text-3xl', '1.875rem': 'text-3xl',
      '36px': 'text-4xl', '2.25rem': 'text-4xl',
      '48px': 'text-5xl', '3rem': 'text-5xl',
      '60px': 'text-6xl', '3.75rem': 'text-6xl',
    };
    return map[v] || `text-[${v}]`;
  },

  'font-weight': (v) => {
    const map: Record<string, string> = {
      '100': 'font-thin',
      '200': 'font-extralight',
      '300': 'font-light',
      '400': 'font-normal',
      '500': 'font-medium',
      '600': 'font-semibold',
      '700': 'font-bold',
      '800': 'font-extrabold',
      '900': 'font-black',
      'normal': 'font-normal',
      'bold': 'font-bold',
    };
    return map[v] || `font-[${v}]`;
  },

  'font-family': (v) => {
    const lower = v.toLowerCase();
    if (lower.includes('sans')) return 'font-sans';
    if (lower.includes('serif')) return 'font-serif';
    if (lower.includes('mono')) return 'font-mono';
    return `font-[${v.replace(/\s+/g, '_')}]`;
  },

  'line-height': (v) => {
    const map: Record<string, string> = {
      '1': 'leading-none',
      '1.25': 'leading-tight',
      '1.375': 'leading-snug',
      '1.5': 'leading-normal',
      '1.625': 'leading-relaxed',
      '2': 'leading-loose',
    };
    return map[v] || `leading-[${v}]`;
  },

  'letter-spacing': (v) => {
    const map: Record<string, string> = {
      '-0.05em': 'tracking-tighter',
      '-0.025em': 'tracking-tight',
      '0': 'tracking-normal',
      '0.025em': 'tracking-wide',
      '0.05em': 'tracking-wider',
      '0.1em': 'tracking-widest',
    };
    return map[v] || `tracking-[${v}]`;
  },

  'text-align': (v) => `text-${v}`,

  'text-decoration': (v) => {
    const map: Record<string, string> = {
      'underline': 'underline',
      'line-through': 'line-through',
      'overline': 'overline',
      'none': 'no-underline',
    };
    return map[v] || null;
  },

  'text-transform': (v) => {
    const map: Record<string, string> = {
      'uppercase': 'uppercase',
      'lowercase': 'lowercase',
      'capitalize': 'capitalize',
      'none': 'normal-case',
    };
    return map[v] || null;
  },

  // ========== 间距 ==========
  'padding': (v) => parseSpacing('p', v),
  'padding-top': (v) => parseSpacing('pt', v),
  'padding-right': (v) => parseSpacing('pr', v),
  'padding-bottom': (v) => parseSpacing('pb', v),
  'padding-left': (v) => parseSpacing('pl', v),

  'margin': (v) => parseSpacing('m', v),
  'margin-top': (v) => parseSpacing('mt', v),
  'margin-right': (v) => parseSpacing('mr', v),
  'margin-bottom': (v) => parseSpacing('mb', v),
  'margin-left': (v) => parseSpacing('ml', v),

  'gap': (v) => parseSpacing('gap', v),
  'row-gap': (v) => parseSpacing('gap-y', v),
  'column-gap': (v) => parseSpacing('gap-x', v),

  // ========== 尺寸 ==========
  'width': (v) => {
    const map: Record<string, string> = {
      '100%': 'w-full',
      '100vw': 'w-screen',
      'auto': 'w-auto',
      'fit-content': 'w-fit',
      'min-content': 'w-min',
      'max-content': 'w-max',
      '50%': 'w-1/2',
      '33.333333%': 'w-1/3',
      '66.666667%': 'w-2/3',
      '25%': 'w-1/4',
      '75%': 'w-3/4',
    };
    return map[v] || `w-[${v}]`;
  },

  'height': (v) => {
    const map: Record<string, string> = {
      '100%': 'h-full',
      '100vh': 'h-screen',
      'auto': 'h-auto',
      'fit-content': 'h-fit',
      'min-content': 'h-min',
      'max-content': 'h-max',
      '50%': 'h-1/2',
    };
    return map[v] || `h-[${v}]`;
  },

  'min-width': (v) => {
    const map: Record<string, string> = {
      '0': 'min-w-0',
      '100%': 'min-w-full',
      'min-content': 'min-w-min',
      'max-content': 'min-w-max',
      'fit-content': 'min-w-fit',
    };
    return map[v] || `min-w-[${v}]`;
  },

  'max-width': (v) => {
    const map: Record<string, string> = {
      'none': 'max-w-none',
      '100%': 'max-w-full',
      '640px': 'max-w-screen-sm',
      '768px': 'max-w-screen-md',
      '1024px': 'max-w-screen-lg',
      '1280px': 'max-w-screen-xl',
      '1536px': 'max-w-screen-2xl',
    };
    return map[v] || `max-w-[${v}]`;
  },

  'min-height': (v) => {
    const map: Record<string, string> = {
      '0': 'min-h-0',
      '100%': 'min-h-full',
      '100vh': 'min-h-screen',
    };
    return map[v] || `min-h-[${v}]`;
  },

  'max-height': (v) => {
    const map: Record<string, string> = {
      'none': 'max-h-none',
      '100%': 'max-h-full',
      '100vh': 'max-h-screen',
    };
    return map[v] || `max-h-[${v}]`;
  },

  // ========== 边框 ==========
  'border-radius': (v) => {
    const map: Record<string, string> = {
      '0': 'rounded-none', '0px': 'rounded-none',
      '2px': 'rounded-sm', '0.125rem': 'rounded-sm',
      '4px': 'rounded', '0.25rem': 'rounded',
      '6px': 'rounded-md', '0.375rem': 'rounded-md',
      '8px': 'rounded-lg', '0.5rem': 'rounded-lg',
      '12px': 'rounded-xl', '0.75rem': 'rounded-xl',
      '16px': 'rounded-2xl', '1rem': 'rounded-2xl',
      '24px': 'rounded-3xl', '1.5rem': 'rounded-3xl',
      '9999px': 'rounded-full', '50%': 'rounded-full',
    };
    return map[v] || `rounded-[${v}]`;
  },

  'border-width': (v) => {
    const map: Record<string, string> = {
      '0': 'border-0', '0px': 'border-0',
      '1px': 'border',
      '2px': 'border-2',
      '4px': 'border-4',
      '8px': 'border-8',
    };
    return map[v] || `border-[${v}]`;
  },

  'border-style': (v) => {
    const map: Record<string, string> = {
      'solid': 'border-solid',
      'dashed': 'border-dashed',
      'dotted': 'border-dotted',
      'double': 'border-double',
      'hidden': 'border-hidden',
      'none': 'border-none',
    };
    return map[v] || null;
  },

  // ========== 阴影 ==========
  'box-shadow': (v) => {
    if (v === 'none') return 'shadow-none';
    if (v.includes('0 1px 2px')) return 'shadow-sm';
    if (v.includes('0 1px 3px')) return 'shadow';
    if (v.includes('0 4px 6px')) return 'shadow-md';
    if (v.includes('0 10px 15px')) return 'shadow-lg';
    if (v.includes('0 20px 25px')) return 'shadow-xl';
    if (v.includes('0 25px 50px')) return 'shadow-2xl';
    return `shadow-[${v.replace(/\s+/g, '_')}]`;
  },

  // ========== 布局 ==========
  'display': (v) => {
    const map: Record<string, string> = {
      'block': 'block',
      'inline-block': 'inline-block',
      'inline': 'inline',
      'flex': 'flex',
      'inline-flex': 'inline-flex',
      'grid': 'grid',
      'inline-grid': 'inline-grid',
      'none': 'hidden',
      'contents': 'contents',
      'flow-root': 'flow-root',
    };
    return map[v] || null;
  },

  'flex-direction': (v) => {
    const map: Record<string, string> = {
      'row': 'flex-row',
      'row-reverse': 'flex-row-reverse',
      'column': 'flex-col',
      'column-reverse': 'flex-col-reverse',
    };
    return map[v] || null;
  },

  'justify-content': (v) => {
    const map: Record<string, string> = {
      'flex-start': 'justify-start',
      'start': 'justify-start',
      'flex-end': 'justify-end',
      'end': 'justify-end',
      'center': 'justify-center',
      'space-between': 'justify-between',
      'space-around': 'justify-around',
      'space-evenly': 'justify-evenly',
    };
    return map[v] || null;
  },

  'align-items': (v) => {
    const map: Record<string, string> = {
      'flex-start': 'items-start',
      'start': 'items-start',
      'flex-end': 'items-end',
      'end': 'items-end',
      'center': 'items-center',
      'baseline': 'items-baseline',
      'stretch': 'items-stretch',
    };
    return map[v] || null;
  },

  'align-self': (v) => {
    const map: Record<string, string> = {
      'auto': 'self-auto',
      'flex-start': 'self-start',
      'start': 'self-start',
      'flex-end': 'self-end',
      'end': 'self-end',
      'center': 'self-center',
      'stretch': 'self-stretch',
    };
    return map[v] || null;
  },

  'flex-wrap': (v) => {
    const map: Record<string, string> = {
      'nowrap': 'flex-nowrap',
      'wrap': 'flex-wrap',
      'wrap-reverse': 'flex-wrap-reverse',
    };
    return map[v] || null;
  },

  'flex-grow': (v) => {
    const map: Record<string, string> = {
      '0': 'grow-0',
      '1': 'grow',
    };
    return map[v] || `grow-[${v}]`;
  },

  'flex-shrink': (v) => {
    const map: Record<string, string> = {
      '0': 'shrink-0',
      '1': 'shrink',
    };
    return map[v] || `shrink-[${v}]`;
  },

  // ========== Grid ==========
  'grid-template-columns': (v) => {
    const match = v.match(/repeat\((\d+),\s*1fr\)/);
    if (match) return `grid-cols-${match[1]}`;
    return `grid-cols-[${v.replace(/\s+/g, '_')}]`;
  },

  'grid-template-rows': (v) => {
    const match = v.match(/repeat\((\d+),\s*1fr\)/);
    if (match) return `grid-rows-${match[1]}`;
    return `grid-rows-[${v.replace(/\s+/g, '_')}]`;
  },

  // ========== 定位 ==========
  'position': (v) => {
    const map: Record<string, string> = {
      'static': 'static',
      'relative': 'relative',
      'absolute': 'absolute',
      'fixed': 'fixed',
      'sticky': 'sticky',
    };
    return map[v] || null;
  },

  'top': (v) => parseSpacing('top', v),
  'right': (v) => parseSpacing('right', v),
  'bottom': (v) => parseSpacing('bottom', v),
  'left': (v) => parseSpacing('left', v),

  'inset': (v) => parseSpacing('inset', v),

  // ========== 其他 ==========
  'opacity': (v) => {
    const num = parseFloat(v);
    if (isNaN(num)) return null;
    const percent = Math.round(num * 100);
    return `opacity-${percent}`;
  },

  'cursor': (v) => `cursor-${v}`,

  'overflow': (v) => `overflow-${v}`,
  'overflow-x': (v) => `overflow-x-${v}`,
  'overflow-y': (v) => `overflow-y-${v}`,

  'z-index': (v) => {
    const map: Record<string, string> = {
      '0': 'z-0',
      '10': 'z-10',
      '20': 'z-20',
      '30': 'z-30',
      '40': 'z-40',
      '50': 'z-50',
      'auto': 'z-auto',
    };
    return map[v] || `z-[${v}]`;
  },

  'visibility': (v) => {
    const map: Record<string, string> = {
      'visible': 'visible',
      'hidden': 'invisible',
      'collapse': 'collapse',
    };
    return map[v] || null;
  },

  'pointer-events': (v) => {
    const map: Record<string, string> = {
      'none': 'pointer-events-none',
      'auto': 'pointer-events-auto',
    };
    return map[v] || null;
  },

  'user-select': (v) => {
    const map: Record<string, string> = {
      'none': 'select-none',
      'text': 'select-text',
      'all': 'select-all',
      'auto': 'select-auto',
    };
    return map[v] || null;
  },
};

// 间距解析辅助函数
function parseSpacing(prefix: string, value: string): string {
  // 常用间距映射
  const spacingMap: Record<string, string> = {
    '0': '0', '0px': '0',
    '1px': 'px',
    '2px': '0.5', '0.125rem': '0.5',
    '4px': '1', '0.25rem': '1',
    '6px': '1.5', '0.375rem': '1.5',
    '8px': '2', '0.5rem': '2',
    '10px': '2.5', '0.625rem': '2.5',
    '12px': '3', '0.75rem': '3',
    '14px': '3.5', '0.875rem': '3.5',
    '16px': '4', '1rem': '4',
    '20px': '5', '1.25rem': '5',
    '24px': '6', '1.5rem': '6',
    '28px': '7', '1.75rem': '7',
    '32px': '8', '2rem': '8',
    '36px': '9', '2.25rem': '9',
    '40px': '10', '2.5rem': '10',
    '44px': '11', '2.75rem': '11',
    '48px': '12', '3rem': '12',
    '56px': '14', '3.5rem': '14',
    '64px': '16', '4rem': '16',
    '80px': '20', '5rem': '20',
    '96px': '24', '6rem': '24',
    'auto': 'auto',
  };

  const mapped = spacingMap[value];
  if (mapped) {
    return `${prefix}-${mapped}`;
  }

  return `${prefix}-[${value}]`;
}

/**
 * 将 CSS 属性转换为 Tailwind 类名
 * @param property CSS 属性名
 * @param value CSS 属性值
 * @returns Tailwind 类名或 null
 */
export function cssToTailwind(property: string, value: string): string | null {
  const mapper = MAPPER_RULES[property];
  if (mapper) {
    return mapper(value);
  }
  return null;
}

/**
 * 将 CSS 样式对象转换为 Tailwind 类名数组
 * @param styles CSS 样式对象
 * @returns Tailwind 类名数组
 */
export function cssObjectToTailwind(styles: Record<string, string>): string[] {
  const classes: string[] = [];

  for (const [property, value] of Object.entries(styles)) {
    const className = cssToTailwind(property, value);
    if (className) {
      classes.push(className);
    }
  }

  return classes;
}

/**
 * 将 CSS 样式字符串解析为对象
 * @param cssString CSS 样式字符串
 * @returns CSS 样式对象
 */
export function parseCSSString(cssString: string): Record<string, string> {
  const result: Record<string, string> = {};

  const declarations = cssString.split(';').filter(Boolean);
  for (const declaration of declarations) {
    const [property, value] = declaration.split(':').map(s => s.trim());
    if (property && value) {
      result[property] = value;
    }
  }

  return result;
}

/**
 * 将 CSS 样式字符串转换为 Tailwind 类名
 * @param cssString CSS 样式字符串
 * @returns Tailwind 类名字符串
 */
export function cssStringToTailwind(cssString: string): string {
  const styles = parseCSSString(cssString);
  const classes = cssObjectToTailwind(styles);
  return classes.join(' ');
}
