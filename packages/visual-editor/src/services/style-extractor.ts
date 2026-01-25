/**
 * 样式提取服务
 * 从计算样式中提取 Tailwind 类名
 */

import type { SelectedElementInfo } from '../types';

/**
 * CSS 值到 Tailwind 类名的映射
 */
const CSS_TO_TAILWIND: Record<string, Record<string, string>> = {
  fontSize: {
    '12px': 'text-xs',
    '14px': 'text-sm',
    '16px': 'text-base',
    '18px': 'text-lg',
    '20px': 'text-xl',
    '24px': 'text-2xl',
    '30px': 'text-3xl',
    '36px': 'text-4xl',
    '48px': 'text-5xl',
    '60px': 'text-6xl',
    '72px': 'text-7xl',
    '96px': 'text-8xl',
    '128px': 'text-9xl',
  },
  fontWeight: {
    '100': 'font-thin',
    '200': 'font-extralight',
    '300': 'font-light',
    '400': 'font-normal',
    '500': 'font-medium',
    '600': 'font-semibold',
    '700': 'font-bold',
    '800': 'font-extrabold',
    '900': 'font-black',
  },
  textAlign: {
    'left': 'text-left',
    'center': 'text-center',
    'right': 'text-right',
    'justify': 'text-justify',
  },
  display: {
    'none': 'hidden',
    'block': 'block',
    'inline-block': 'inline-block',
    'inline': 'inline',
    'flex': 'flex',
    'inline-flex': 'inline-flex',
    'grid': 'grid',
    'inline-grid': 'inline-grid',
  },
  flexDirection: {
    'row': 'flex-row',
    'row-reverse': 'flex-row-reverse',
    'column': 'flex-col',
    'column-reverse': 'flex-col-reverse',
  },
  justifyContent: {
    'flex-start': 'justify-start',
    'flex-end': 'justify-end',
    'center': 'justify-center',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly',
  },
  alignItems: {
    'flex-start': 'items-start',
    'flex-end': 'items-end',
    'center': 'items-center',
    'baseline': 'items-baseline',
    'stretch': 'items-stretch',
  },
  position: {
    'static': 'static',
    'relative': 'relative',
    'absolute': 'absolute',
    'fixed': 'fixed',
    'sticky': 'sticky',
  },
};

/**
 * 间距值到 Tailwind 的映射
 */
const SPACING_MAP: Record<string, string> = {
  '0px': '0',
  '1px': 'px',
  '2px': '0.5',
  '4px': '1',
  '6px': '1.5',
  '8px': '2',
  '10px': '2.5',
  '12px': '3',
  '14px': '3.5',
  '16px': '4',
  '20px': '5',
  '24px': '6',
  '28px': '7',
  '32px': '8',
  '36px': '9',
  '40px': '10',
  '44px': '11',
  '48px': '12',
  '56px': '14',
  '64px': '16',
  '80px': '20',
  '96px': '24',
  '112px': '28',
  '128px': '32',
  '144px': '36',
  '160px': '40',
  '176px': '44',
  '192px': '48',
  '208px': '52',
  '224px': '56',
  '240px': '60',
  '256px': '64',
  '288px': '72',
  '320px': '80',
  '384px': '96',
};

/**
 * 从计算样式提取 Tailwind 类名
 */
export function extractTailwindClasses(element: SelectedElementInfo): string[] {
  const classes: string[] = [];
  const { computedStyles } = element;

  // 提取基本样式
  for (const [prop, mapping] of Object.entries(CSS_TO_TAILWIND)) {
    const value = computedStyles[prop];
    if (value && mapping[value]) {
      classes.push(mapping[value]);
    }
  }

  // 提取间距
  const spacingProps = ['padding', 'margin'];
  const sides = ['Top', 'Right', 'Bottom', 'Left'];

  for (const baseProp of spacingProps) {
    const prefix = baseProp === 'padding' ? 'p' : 'm';

    for (const side of sides) {
      const prop = `${baseProp}${side}`;
      const value = computedStyles[prop];
      const tailwindValue = SPACING_MAP[value];

      if (tailwindValue) {
        const sidePrefix = side[0].toLowerCase();
        classes.push(`${prefix}${sidePrefix}-${tailwindValue}`);
      }
    }
  }

  return classes;
}

/**
 * 将颜色值转换为 Tailwind 类名
 */
export function colorToTailwindClass(
  color: string,
  type: 'text' | 'bg' | 'border'
): string | null {
  // 如果是 rgb/rgba 格式，转换为 hex
  const hex = rgbToHex(color);
  if (hex) {
    return `${type}-[${hex}]`;
  }
  return null;
}

/**
 * RGB 转 Hex
 */
function rgbToHex(color: string): string | null {
  const match = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return null;

  const r = parseInt(match[1], 10);
  const g = parseInt(match[2], 10);
  const b = parseInt(match[3], 10);

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * 解析 className 字符串
 */
export function parseClassName(className: string): {
  tailwindClasses: string[];
  customClasses: string[];
} {
  const classes = className.split(/\s+/).filter(Boolean);
  const tailwindClasses: string[] = [];
  const customClasses: string[] = [];

  for (const cls of classes) {
    if (isTailwindClass(cls)) {
      tailwindClasses.push(cls);
    } else {
      customClasses.push(cls);
    }
  }

  return { tailwindClasses, customClasses };
}

/**
 * 判断是否是 Tailwind 类名
 */
function isTailwindClass(className: string): boolean {
  // 常见 Tailwind 前缀
  const prefixes = [
    'text-', 'bg-', 'border-', 'rounded-', 'shadow-', 'opacity-',
    'p-', 'px-', 'py-', 'pt-', 'pr-', 'pb-', 'pl-',
    'm-', 'mx-', 'my-', 'mt-', 'mr-', 'mb-', 'ml-',
    'w-', 'h-', 'min-', 'max-',
    'flex', 'grid', 'block', 'inline', 'hidden',
    'items-', 'justify-', 'gap-', 'space-',
    'font-', 'leading-', 'tracking-',
    'z-', 'top-', 'right-', 'bottom-', 'left-',
    'overflow-', 'cursor-', 'select-',
    'transition-', 'duration-', 'ease-', 'animate-',
    'hover:', 'focus:', 'active:', 'disabled:',
    'sm:', 'md:', 'lg:', 'xl:', '2xl:',
    'dark:',
  ];

  return prefixes.some(prefix => className.startsWith(prefix));
}

/**
 * 获取 Tailwind 类名的类别
 */
export function getClassCategory(className: string): string {
  if (className.startsWith('text-') && !className.startsWith('text-[')) {
    if (className.match(/text-(xs|sm|base|lg|xl|[2-9]xl)/)) {
      return 'fontSize';
    }
    if (className.match(/text-(left|center|right|justify)/)) {
      return 'textAlign';
    }
    return 'textColor';
  }
  if (className.startsWith('bg-')) return 'backgroundColor';
  if (className.startsWith('border-')) return 'border';
  if (className.startsWith('rounded-')) return 'borderRadius';
  if (className.startsWith('shadow-')) return 'boxShadow';
  if (className.startsWith('opacity-')) return 'opacity';
  if (className.match(/^p[trblxy]?-/)) return 'padding';
  if (className.match(/^m[trblxy]?-/)) return 'margin';
  if (className.startsWith('w-')) return 'width';
  if (className.startsWith('h-')) return 'height';
  if (className.match(/^(flex|grid|block|inline|hidden)/)) return 'display';
  if (className.startsWith('items-')) return 'alignItems';
  if (className.startsWith('justify-')) return 'justifyContent';
  if (className.startsWith('gap-')) return 'gap';
  if (className.startsWith('font-')) return 'fontWeight';

  return 'other';
}
