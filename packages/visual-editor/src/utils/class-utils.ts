/**
 * 类名处理工具
 */

/**
 * 合并类名
 */
export function classNames(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * 解析类名字符串
 */
export function parseClasses(className: string): string[] {
  return className.split(/\s+/).filter(Boolean);
}

/**
 * 添加类名
 */
export function addClass(className: string, ...classesToAdd: string[]): string {
  const classes = new Set(parseClasses(className));
  for (const cls of classesToAdd) {
    classes.add(cls);
  }
  return Array.from(classes).join(' ');
}

/**
 * 移除类名
 */
export function removeClass(className: string, ...classesToRemove: string[]): string {
  const classes = parseClasses(className);
  const removeSet = new Set(classesToRemove);
  return classes.filter(cls => !removeSet.has(cls)).join(' ');
}

/**
 * 切换类名
 */
export function toggleClass(className: string, classToToggle: string, force?: boolean): string {
  const classes = new Set(parseClasses(className));

  if (force !== undefined) {
    if (force) {
      classes.add(classToToggle);
    } else {
      classes.delete(classToToggle);
    }
  } else {
    if (classes.has(classToToggle)) {
      classes.delete(classToToggle);
    } else {
      classes.add(classToToggle);
    }
  }

  return Array.from(classes).join(' ');
}

/**
 * 替换类名 (按前缀)
 */
export function replaceClassByPrefix(
  className: string,
  prefix: string,
  newClass: string
): string {
  const classes = parseClasses(className);
  const filtered = classes.filter(cls => !cls.startsWith(prefix));

  if (newClass) {
    filtered.push(newClass);
  }

  return filtered.join(' ');
}

/**
 * 查找匹配前缀的类名
 */
export function findClassByPrefix(className: string, prefix: string): string | null {
  const classes = parseClasses(className);
  return classes.find(cls => cls.startsWith(prefix)) || null;
}

/**
 * 查找所有匹配前缀的类名
 */
export function findAllClassesByPrefix(className: string, prefix: string): string[] {
  const classes = parseClasses(className);
  return classes.filter(cls => cls.startsWith(prefix));
}

/**
 * Tailwind 响应式前缀
 */
export const RESPONSIVE_PREFIXES = ['sm:', 'md:', 'lg:', 'xl:', '2xl:'];

/**
 * Tailwind 状态前缀
 */
export const STATE_PREFIXES = [
  'hover:',
  'focus:',
  'active:',
  'disabled:',
  'visited:',
  'first:',
  'last:',
  'odd:',
  'even:',
  'group-hover:',
  'focus-within:',
  'focus-visible:',
];

/**
 * 解析 Tailwind 类名的修饰符
 */
export function parseTailwindModifiers(className: string): {
  responsive: string | null;
  state: string | null;
  dark: boolean;
  baseClass: string;
} {
  let remaining = className;
  let responsive: string | null = null;
  let state: string | null = null;
  let dark = false;

  // 检查 dark 模式
  if (remaining.startsWith('dark:')) {
    dark = true;
    remaining = remaining.slice(5);
  }

  // 检查响应式前缀
  for (const prefix of RESPONSIVE_PREFIXES) {
    if (remaining.startsWith(prefix)) {
      responsive = prefix.slice(0, -1);
      remaining = remaining.slice(prefix.length);
      break;
    }
  }

  // 检查状态前缀
  for (const prefix of STATE_PREFIXES) {
    if (remaining.startsWith(prefix)) {
      state = prefix.slice(0, -1);
      remaining = remaining.slice(prefix.length);
      break;
    }
  }

  return {
    responsive,
    state,
    dark,
    baseClass: remaining,
  };
}

/**
 * 构建 Tailwind 类名
 */
export function buildTailwindClass(
  baseClass: string,
  options: {
    responsive?: string;
    state?: string;
    dark?: boolean;
  } = {}
): string {
  let result = baseClass;

  if (options.state) {
    result = `${options.state}:${result}`;
  }

  if (options.responsive) {
    result = `${options.responsive}:${result}`;
  }

  if (options.dark) {
    result = `dark:${result}`;
  }

  return result;
}

/**
 * 排序 Tailwind 类名
 * 按照类别和重要性排序
 */
export function sortTailwindClasses(className: string): string {
  const classes = parseClasses(className);

  const categoryOrder = [
    // 布局
    'container', 'box-', 'block', 'inline', 'flex', 'grid', 'hidden', 'visible',
    // 定位
    'static', 'relative', 'absolute', 'fixed', 'sticky',
    'top-', 'right-', 'bottom-', 'left-', 'inset-', 'z-',
    // 尺寸
    'w-', 'min-w-', 'max-w-', 'h-', 'min-h-', 'max-h-',
    // Flex/Grid
    'flex-', 'items-', 'justify-', 'gap-', 'space-', 'order-',
    'grid-', 'col-', 'row-',
    // 间距
    'p', 'px-', 'py-', 'pt-', 'pr-', 'pb-', 'pl-',
    'm', 'mx-', 'my-', 'mt-', 'mr-', 'mb-', 'ml-',
    // 排版
    'font-', 'text-', 'leading-', 'tracking-', 'truncate', 'break-',
    // 背景
    'bg-',
    // 边框
    'border', 'rounded-',
    // 效果
    'shadow-', 'opacity-', 'filter', 'blur-', 'brightness-',
    // 过渡
    'transition-', 'duration-', 'ease-', 'delay-',
    // 动画
    'animate-',
    // 其他
    'cursor-', 'select-', 'overflow-',
  ];

  const getOrder = (cls: string): number => {
    for (let i = 0; i < categoryOrder.length; i++) {
      if (cls.startsWith(categoryOrder[i])) {
        return i;
      }
    }
    return categoryOrder.length;
  };

  return classes.sort((a, b) => getOrder(a) - getOrder(b)).join(' ');
}
