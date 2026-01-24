/**
 * Tailwind 类名合并器
 * 处理类名冲突和合并
 */

// 类名前缀分组
const CLASS_GROUPS: Record<string, string[]> = {
  'text-size': [
    'text-xs', 'text-sm', 'text-base', 'text-lg',
    'text-xl', 'text-2xl', 'text-3xl', 'text-4xl',
    'text-5xl', 'text-6xl', 'text-7xl', 'text-8xl', 'text-9xl',
  ],
  'text-color': ['text-'],  // 前缀匹配
  'bg-color': ['bg-'],
  'font-weight': [
    'font-thin', 'font-extralight', 'font-light', 'font-normal',
    'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black',
  ],
  'font-family': ['font-sans', 'font-serif', 'font-mono'],
  'rounded': [
    'rounded-none', 'rounded-sm', 'rounded', 'rounded-md',
    'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',
  ],
  'shadow': [
    'shadow-none', 'shadow-sm', 'shadow', 'shadow-md',
    'shadow-lg', 'shadow-xl', 'shadow-2xl', 'shadow-inner',
  ],
  'display': [
    'block', 'inline-block', 'inline', 'flex', 'inline-flex',
    'grid', 'inline-grid', 'hidden', 'contents', 'flow-root',
  ],
  'flex-direction': ['flex-row', 'flex-row-reverse', 'flex-col', 'flex-col-reverse'],
  'justify': [
    'justify-start', 'justify-end', 'justify-center',
    'justify-between', 'justify-around', 'justify-evenly',
  ],
  'items': ['items-start', 'items-end', 'items-center', 'items-baseline', 'items-stretch'],
  'position': ['static', 'relative', 'absolute', 'fixed', 'sticky'],
  'text-align': ['text-left', 'text-center', 'text-right', 'text-justify'],
  'leading': [
    'leading-none', 'leading-tight', 'leading-snug',
    'leading-normal', 'leading-relaxed', 'leading-loose',
  ],
  'tracking': [
    'tracking-tighter', 'tracking-tight', 'tracking-normal',
    'tracking-wide', 'tracking-wider', 'tracking-widest',
  ],
  'flex-wrap': ['flex-nowrap', 'flex-wrap', 'flex-wrap-reverse'],
  'overflow': ['overflow-auto', 'overflow-hidden', 'overflow-visible', 'overflow-scroll'],
  'overflow-x': ['overflow-x-auto', 'overflow-x-hidden', 'overflow-x-visible', 'overflow-x-scroll'],
  'overflow-y': ['overflow-y-auto', 'overflow-y-hidden', 'overflow-y-visible', 'overflow-y-scroll'],
};

// 前缀优先级 (同前缀的类名，后者覆盖前者)
const PREFIX_CONFLICTS = [
  'p-', 'pt-', 'pr-', 'pb-', 'pl-', 'px-', 'py-',
  'm-', 'mt-', 'mr-', 'mb-', 'ml-', 'mx-', 'my-',
  'w-', 'min-w-', 'max-w-',
  'h-', 'min-h-', 'max-h-',
  'top-', 'right-', 'bottom-', 'left-', 'inset-',
  'gap-', 'gap-x-', 'gap-y-',
  'z-',
  'opacity-',
  'border-', 'border-t-', 'border-r-', 'border-b-', 'border-l-',
  'grow-', 'shrink-',
  'grid-cols-', 'grid-rows-',
  'self-',
];

/**
 * 获取类名所属的冲突组
 * @param className 类名
 * @returns 冲突组名或 null
 */
function getConflictGroup(className: string): string | null {
  // 检查是否属于已知分组
  for (const [group, patterns] of Object.entries(CLASS_GROUPS)) {
    for (const pattern of patterns) {
      if (pattern.endsWith('-')) {
        // 前缀匹配
        if (className.startsWith(pattern)) return group;
      } else {
        // 完全匹配
        if (className === pattern) return group;
      }
    }
  }

  // 检查前缀冲突
  for (const prefix of PREFIX_CONFLICTS) {
    if (className.startsWith(prefix)) {
      return `prefix:${prefix}`;
    }
  }

  // 检查任意值类（如 text-[#fff]）
  const arbitraryMatch = className.match(/^([a-z-]+)-\[/);
  if (arbitraryMatch) {
    const prefix = arbitraryMatch[1];
    // 检查是否与已知分组相关
    for (const [group, patterns] of Object.entries(CLASS_GROUPS)) {
      for (const pattern of patterns) {
        if (pattern.endsWith('-') && pattern.startsWith(prefix + '-')) {
          return group;
        }
        if (pattern.startsWith(prefix + '-')) {
          return group;
        }
      }
    }
    return `arbitrary:${prefix}`;
  }

  return null;
}

/**
 * 合并类名，处理冲突
 * 后添加的类名会覆盖同组的前置类名
 * @param existing 现有类名数组
 * @param incoming 新类名数组
 * @returns 合并后的类名数组
 */
export function mergeClasses(existing: string[], incoming: string[]): string[] {
  const result = new Map<string, string>();
  const noConflict: string[] = [];

  // 处理现有类名
  for (const className of existing) {
    const group = getConflictGroup(className);
    if (group) {
      result.set(group, className);
    } else {
      noConflict.push(className);
    }
  }

  // 处理新类名 (覆盖同组的旧类名)
  for (const className of incoming) {
    const group = getConflictGroup(className);
    if (group) {
      result.set(group, className);  // 覆盖
    } else if (!noConflict.includes(className)) {
      noConflict.push(className);
    }
  }

  // 合并结果
  return [...result.values(), ...noConflict];
}

/**
 * 从类名列表中移除指定类名
 * @param existing 现有类名数组
 * @param toRemove 要移除的类名数组
 * @returns 移除后的类名数组
 */
export function removeClasses(existing: string[], toRemove: string[]): string[] {
  const removeSet = new Set(toRemove);
  return existing.filter(cls => !removeSet.has(cls));
}

/**
 * 规范化类名字符串
 * @param classString 类名字符串
 * @returns 类名数组
 */
export function normalizeClassString(classString: string): string[] {
  return classString
    .split(/\s+/)
    .filter(Boolean)
    .map(cls => cls.trim());
}

/**
 * 类名数组转字符串
 * @param classes 类名数组
 * @returns 类名字符串
 */
export function classesToString(classes: string[]): string {
  return classes.join(' ');
}

/**
 * 智能合并类名字符串
 * @param existing 现有类名字符串
 * @param incoming 新类名字符串
 * @returns 合并后的类名字符串
 */
export function mergeClassStrings(existing: string, incoming: string): string {
  const existingClasses = normalizeClassString(existing);
  const incomingClasses = normalizeClassString(incoming);
  const merged = mergeClasses(existingClasses, incomingClasses);
  return classesToString(merged);
}

/**
 * 检查类名是否会与现有类名冲突
 * @param existing 现有类名字符串
 * @param newClass 新类名
 * @returns 会被覆盖的类名或 null
 */
export function findConflict(existing: string, newClass: string): string | null {
  const existingClasses = normalizeClassString(existing);
  const newGroup = getConflictGroup(newClass);

  if (!newGroup) return null;

  for (const cls of existingClasses) {
    if (getConflictGroup(cls) === newGroup) {
      return cls;
    }
  }

  return null;
}

/**
 * 去重类名
 * @param classes 类名数组
 * @returns 去重后的类名数组
 */
export function deduplicateClasses(classes: string[]): string[] {
  return [...new Set(classes)];
}

/**
 * 排序类名（按分组和字母顺序）
 * @param classes 类名数组
 * @returns 排序后的类名数组
 */
export function sortClasses(classes: string[]): string[] {
  // 优先级顺序
  const groupOrder = [
    'display', 'position', 'flex-direction', 'flex-wrap',
    'justify', 'items', 'grid-cols-', 'grid-rows-',
    'prefix:w-', 'prefix:h-', 'prefix:min-w-', 'prefix:max-w-',
    'prefix:min-h-', 'prefix:max-h-',
    'prefix:p-', 'prefix:px-', 'prefix:py-', 'prefix:pt-', 'prefix:pr-', 'prefix:pb-', 'prefix:pl-',
    'prefix:m-', 'prefix:mx-', 'prefix:my-', 'prefix:mt-', 'prefix:mr-', 'prefix:mb-', 'prefix:ml-',
    'prefix:gap-', 'prefix:gap-x-', 'prefix:gap-y-',
    'text-size', 'font-weight', 'font-family', 'text-align', 'leading', 'tracking',
    'text-color', 'bg-color',
    'rounded', 'prefix:border-', 'shadow',
    'prefix:opacity-', 'prefix:z-',
    'overflow', 'overflow-x', 'overflow-y',
  ];

  return [...classes].sort((a, b) => {
    const groupA = getConflictGroup(a);
    const groupB = getConflictGroup(b);

    const indexA = groupA ? groupOrder.indexOf(groupA) : groupOrder.length;
    const indexB = groupB ? groupOrder.indexOf(groupB) : groupOrder.length;

    if (indexA !== indexB) {
      return (indexA === -1 ? groupOrder.length : indexA) - (indexB === -1 ? groupOrder.length : indexB);
    }

    return a.localeCompare(b);
  });
}
