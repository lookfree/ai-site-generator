/**
 * AST 比较工具
 * 提供 AST 节点比较功能
 */

export interface DiffResult {
  /** 是否相等 */
  equal: boolean;
  /** 差异路径 */
  path?: string;
  /** 旧值 */
  oldValue?: unknown;
  /** 新值 */
  newValue?: unknown;
  /** 差异类型 */
  type?: 'add' | 'remove' | 'modify' | 'type-change';
}

/**
 * 深度比较两个 AST 节点是否相等
 * @param a 第一个节点
 * @param b 第二个节点
 * @returns 是否相等
 */
export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;

  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') {
    return a === b;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => isEqual(item, b[index]));
  }

  if (Array.isArray(a) !== Array.isArray(b)) return false;

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every(key => isEqual(aObj[key], bObj[key]));
}

/**
 * 比较两个 AST 节点并返回差异
 * @param a 第一个节点
 * @param b 第二个节点
 * @param path 当前路径
 * @returns 差异结果数组
 */
export function diff(a: unknown, b: unknown, path = ''): DiffResult[] {
  const results: DiffResult[] = [];

  if (a === b) {
    return results;
  }

  if (a === null || a === undefined) {
    if (b !== null && b !== undefined) {
      results.push({
        equal: false,
        path,
        oldValue: a,
        newValue: b,
        type: 'add',
      });
    }
    return results;
  }

  if (b === null || b === undefined) {
    results.push({
      equal: false,
      path,
      oldValue: a,
      newValue: b,
      type: 'remove',
    });
    return results;
  }

  if (typeof a !== typeof b) {
    results.push({
      equal: false,
      path,
      oldValue: a,
      newValue: b,
      type: 'type-change',
    });
    return results;
  }

  if (typeof a !== 'object') {
    if (a !== b) {
      results.push({
        equal: false,
        path,
        oldValue: a,
        newValue: b,
        type: 'modify',
      });
    }
    return results;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    const maxLen = Math.max(a.length, b.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;
      if (i >= a.length) {
        results.push({
          equal: false,
          path: itemPath,
          oldValue: undefined,
          newValue: b[i],
          type: 'add',
        });
      } else if (i >= b.length) {
        results.push({
          equal: false,
          path: itemPath,
          oldValue: a[i],
          newValue: undefined,
          type: 'remove',
        });
      } else {
        results.push(...diff(a[i], b[i], itemPath));
      }
    }
    return results;
  }

  if (Array.isArray(a) !== Array.isArray(b)) {
    results.push({
      equal: false,
      path,
      oldValue: a,
      newValue: b,
      type: 'type-change',
    });
    return results;
  }

  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)]);

  for (const key of allKeys) {
    const keyPath = path ? `${path}.${key}` : key;

    if (!(key in aObj)) {
      results.push({
        equal: false,
        path: keyPath,
        oldValue: undefined,
        newValue: bObj[key],
        type: 'add',
      });
    } else if (!(key in bObj)) {
      results.push({
        equal: false,
        path: keyPath,
        oldValue: aObj[key],
        newValue: undefined,
        type: 'remove',
      });
    } else {
      results.push(...diff(aObj[key], bObj[key], keyPath));
    }
  }

  return results;
}

/**
 * 检查节点是否为指定类型
 * @param node AST 节点
 * @param type 节点类型
 * @returns 是否为指定类型
 */
export function isNodeType(node: unknown, type: string): boolean {
  if (!node || typeof node !== 'object') return false;
  return (node as Record<string, unknown>).type === type;
}

/**
 * 获取节点类型
 * @param node AST 节点
 * @returns 节点类型或 undefined
 */
export function getNodeType(node: unknown): string | undefined {
  if (!node || typeof node !== 'object') return undefined;
  const type = (node as Record<string, unknown>).type;
  return typeof type === 'string' ? type : undefined;
}

/**
 * 检查节点是否有 span 信息
 * @param node AST 节点
 * @returns 是否有 span 信息
 */
export function hasSpan(node: unknown): boolean {
  if (!node || typeof node !== 'object') return false;
  const span = (node as Record<string, unknown>).span;
  return span !== undefined && span !== null;
}
