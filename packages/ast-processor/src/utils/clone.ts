/**
 * AST 深拷贝工具
 * 提供高效的 AST 节点克隆功能
 */

/**
 * 深拷贝 AST 节点
 * @param obj 要克隆的对象
 * @returns 克隆后的对象
 */
export function cloneDeep<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => cloneDeep(item)) as unknown as T;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof Map) {
    const result = new Map();
    obj.forEach((value, key) => {
      result.set(cloneDeep(key), cloneDeep(value));
    });
    return result as unknown as T;
  }

  if (obj instanceof Set) {
    const result = new Set();
    obj.forEach(value => {
      result.add(cloneDeep(value));
    });
    return result as unknown as T;
  }

  // 普通对象
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(obj as object)) {
    result[key] = cloneDeep((obj as Record<string, unknown>)[key]);
  }

  return result as T;
}

/**
 * 浅拷贝 AST 节点
 * @param obj 要克隆的对象
 * @returns 克隆后的对象
 */
export function cloneShallow<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return [...obj] as unknown as T;
  }

  return { ...obj as object } as T;
}

/**
 * 克隆 AST 节点并应用修改
 * @param obj 要克隆的对象
 * @param modifications 要应用的修改
 * @returns 修改后的克隆对象
 */
export function cloneWith<T extends object>(
  obj: T,
  modifications: Partial<T>
): T {
  const cloned = cloneDeep(obj);
  return Object.assign(cloned, modifications);
}

/**
 * 冻结对象（防止修改）
 * @param obj 要冻结的对象
 * @returns 冻结后的对象
 */
export function deepFreeze<T extends object>(obj: T): Readonly<T> {
  Object.freeze(obj);

  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value as object);
    }
  }

  return obj as Readonly<T>;
}
