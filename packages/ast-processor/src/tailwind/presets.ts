/**
 * Tailwind 预设映射表
 * 常用样式组合预设
 */

export interface StylePreset {
  name: string;
  description: string;
  classes: string[];
}

// 布局预设
export const LAYOUT_PRESETS: StylePreset[] = [
  {
    name: 'center',
    description: '水平垂直居中',
    classes: ['flex', 'items-center', 'justify-center'],
  },
  {
    name: 'center-x',
    description: '水平居中',
    classes: ['flex', 'justify-center'],
  },
  {
    name: 'center-y',
    description: '垂直居中',
    classes: ['flex', 'items-center'],
  },
  {
    name: 'stack',
    description: '垂直堆叠',
    classes: ['flex', 'flex-col'],
  },
  {
    name: 'row',
    description: '水平排列',
    classes: ['flex', 'flex-row'],
  },
  {
    name: 'space-between',
    description: '两端对齐',
    classes: ['flex', 'justify-between'],
  },
  {
    name: 'space-around',
    description: '等间距分布',
    classes: ['flex', 'justify-around'],
  },
  {
    name: 'wrap',
    description: '自动换行',
    classes: ['flex', 'flex-wrap'],
  },
  {
    name: 'full-screen',
    description: '全屏容器',
    classes: ['w-screen', 'h-screen'],
  },
  {
    name: 'container-center',
    description: '居中容器',
    classes: ['container', 'mx-auto'],
  },
];

// 间距预设
export const SPACING_PRESETS: StylePreset[] = [
  {
    name: 'gap-sm',
    description: '小间距',
    classes: ['gap-2'],
  },
  {
    name: 'gap-md',
    description: '中间距',
    classes: ['gap-4'],
  },
  {
    name: 'gap-lg',
    description: '大间距',
    classes: ['gap-6'],
  },
  {
    name: 'gap-xl',
    description: '超大间距',
    classes: ['gap-8'],
  },
  {
    name: 'padding-sm',
    description: '小内边距',
    classes: ['p-2'],
  },
  {
    name: 'padding-md',
    description: '中内边距',
    classes: ['p-4'],
  },
  {
    name: 'padding-lg',
    description: '大内边距',
    classes: ['p-6'],
  },
  {
    name: 'padding-xl',
    description: '超大内边距',
    classes: ['p-8'],
  },
];

// 文本预设
export const TEXT_PRESETS: StylePreset[] = [
  {
    name: 'heading-1',
    description: '一级标题',
    classes: ['text-4xl', 'font-bold'],
  },
  {
    name: 'heading-2',
    description: '二级标题',
    classes: ['text-3xl', 'font-semibold'],
  },
  {
    name: 'heading-3',
    description: '三级标题',
    classes: ['text-2xl', 'font-semibold'],
  },
  {
    name: 'heading-4',
    description: '四级标题',
    classes: ['text-xl', 'font-medium'],
  },
  {
    name: 'body',
    description: '正文',
    classes: ['text-base', 'leading-relaxed'],
  },
  {
    name: 'body-sm',
    description: '小正文',
    classes: ['text-sm', 'leading-normal'],
  },
  {
    name: 'caption',
    description: '说明文字',
    classes: ['text-xs', 'text-gray-500'],
  },
  {
    name: 'truncate',
    description: '文本截断',
    classes: ['truncate'],
  },
  {
    name: 'line-clamp-2',
    description: '两行截断',
    classes: ['line-clamp-2'],
  },
  {
    name: 'line-clamp-3',
    description: '三行截断',
    classes: ['line-clamp-3'],
  },
];

// 按钮预设
export const BUTTON_PRESETS: StylePreset[] = [
  {
    name: 'btn-base',
    description: '基础按钮',
    classes: ['px-4', 'py-2', 'rounded', 'font-medium', 'transition-colors'],
  },
  {
    name: 'btn-primary',
    description: '主要按钮',
    classes: ['px-4', 'py-2', 'rounded', 'font-medium', 'bg-blue-500', 'text-white', 'hover:bg-blue-600'],
  },
  {
    name: 'btn-secondary',
    description: '次要按钮',
    classes: ['px-4', 'py-2', 'rounded', 'font-medium', 'bg-gray-200', 'text-gray-800', 'hover:bg-gray-300'],
  },
  {
    name: 'btn-outline',
    description: '边框按钮',
    classes: ['px-4', 'py-2', 'rounded', 'font-medium', 'border', 'border-gray-300', 'hover:bg-gray-50'],
  },
  {
    name: 'btn-ghost',
    description: '透明按钮',
    classes: ['px-4', 'py-2', 'rounded', 'font-medium', 'hover:bg-gray-100'],
  },
  {
    name: 'btn-sm',
    description: '小按钮',
    classes: ['px-3', 'py-1.5', 'text-sm', 'rounded'],
  },
  {
    name: 'btn-lg',
    description: '大按钮',
    classes: ['px-6', 'py-3', 'text-lg', 'rounded-lg'],
  },
];

// 卡片预设
export const CARD_PRESETS: StylePreset[] = [
  {
    name: 'card',
    description: '基础卡片',
    classes: ['bg-white', 'rounded-lg', 'shadow', 'p-4'],
  },
  {
    name: 'card-bordered',
    description: '边框卡片',
    classes: ['bg-white', 'rounded-lg', 'border', 'border-gray-200', 'p-4'],
  },
  {
    name: 'card-elevated',
    description: '悬浮卡片',
    classes: ['bg-white', 'rounded-xl', 'shadow-lg', 'p-6'],
  },
  {
    name: 'card-interactive',
    description: '可交互卡片',
    classes: ['bg-white', 'rounded-lg', 'shadow', 'p-4', 'hover:shadow-md', 'transition-shadow', 'cursor-pointer'],
  },
];

// 输入框预设
export const INPUT_PRESETS: StylePreset[] = [
  {
    name: 'input',
    description: '基础输入框',
    classes: ['px-3', 'py-2', 'border', 'border-gray-300', 'rounded', 'focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500', 'focus:border-transparent'],
  },
  {
    name: 'input-lg',
    description: '大输入框',
    classes: ['px-4', 'py-3', 'text-lg', 'border', 'border-gray-300', 'rounded-lg'],
  },
  {
    name: 'input-error',
    description: '错误输入框',
    classes: ['px-3', 'py-2', 'border', 'border-red-500', 'rounded', 'focus:ring-red-500'],
  },
];

// 状态预设
export const STATE_PRESETS: StylePreset[] = [
  {
    name: 'disabled',
    description: '禁用状态',
    classes: ['opacity-50', 'cursor-not-allowed', 'pointer-events-none'],
  },
  {
    name: 'loading',
    description: '加载状态',
    classes: ['opacity-70', 'cursor-wait'],
  },
  {
    name: 'hidden',
    description: '隐藏',
    classes: ['hidden'],
  },
  {
    name: 'invisible',
    description: '不可见',
    classes: ['invisible'],
  },
];

// 所有预设
export const ALL_PRESETS: StylePreset[] = [
  ...LAYOUT_PRESETS,
  ...SPACING_PRESETS,
  ...TEXT_PRESETS,
  ...BUTTON_PRESETS,
  ...CARD_PRESETS,
  ...INPUT_PRESETS,
  ...STATE_PRESETS,
];

/**
 * 根据名称获取预设
 * @param name 预设名称
 * @returns 预设或 undefined
 */
export function getPreset(name: string): StylePreset | undefined {
  return ALL_PRESETS.find(p => p.name === name);
}

/**
 * 根据名称获取预设类名
 * @param name 预设名称
 * @returns 类名数组或空数组
 */
export function getPresetClasses(name: string): string[] {
  const preset = getPreset(name);
  return preset ? preset.classes : [];
}

/**
 * 搜索预设
 * @param query 搜索关键词
 * @returns 匹配的预设数组
 */
export function searchPresets(query: string): StylePreset[] {
  const lower = query.toLowerCase();
  return ALL_PRESETS.filter(p =>
    p.name.toLowerCase().includes(lower) ||
    p.description.toLowerCase().includes(lower)
  );
}

/**
 * 获取某个分类的所有预设
 * @param category 分类名
 * @returns 预设数组
 */
export function getPresetsByCategory(category: string): StylePreset[] {
  switch (category) {
    case 'layout':
      return LAYOUT_PRESETS;
    case 'spacing':
      return SPACING_PRESETS;
    case 'text':
      return TEXT_PRESETS;
    case 'button':
      return BUTTON_PRESETS;
    case 'card':
      return CARD_PRESETS;
    case 'input':
      return INPUT_PRESETS;
    case 'state':
      return STATE_PRESETS;
    default:
      return [];
  }
}
