/**
 * AST 访问者模式实现
 * 提供灵活的节点遍历功能
 */

export type NodeType =
  | 'Module'
  | 'ExportDefaultExpression'
  | 'ExportDeclaration'
  | 'ExportDefaultDeclaration'
  | 'ExportAllDeclaration'
  | 'ImportDeclaration'
  | 'FunctionDeclaration'
  | 'FunctionExpression'
  | 'ArrowFunctionExpression'
  | 'VariableDeclaration'
  | 'VariableDeclarator'
  | 'BlockStatement'
  | 'ExpressionStatement'
  | 'ReturnStatement'
  | 'IfStatement'
  | 'JSXElement'
  | 'JSXOpeningElement'
  | 'JSXClosingElement'
  | 'JSXAttribute'
  | 'JSXSpreadAttribute'
  | 'JSXText'
  | 'JSXExpressionContainer'
  | 'JSXFragment'
  | 'JSXOpeningFragment'
  | 'JSXClosingFragment'
  | 'StringLiteral'
  | 'NumericLiteral'
  | 'BooleanLiteral'
  | 'NullLiteral'
  | 'Identifier'
  | 'CallExpression'
  | 'MemberExpression'
  | 'ObjectExpression'
  | 'ArrayExpression'
  | 'BinaryExpression'
  | 'UnaryExpression'
  | 'ConditionalExpression'
  | 'KeyValueProperty'
  | 'SpreadElement';

export interface VisitorContext {
  /** 父节点 */
  parent: unknown | null;
  /** 从根到当前节点的路径 */
  parentPath: string[];
  /** 当前深度 */
  depth: number;
  /** 停止整个遍历 */
  stop: () => void;
  /** 跳过当前节点的子节点 */
  skip: () => void;
  /** 替换当前节点 */
  replace: (newNode: unknown) => void;
  /** 移除当前节点 */
  remove: () => void;
}

export type VisitorFunction = (node: unknown, context: VisitorContext) => void;

export interface VisitorHandler {
  enter?: VisitorFunction;
  exit?: VisitorFunction;
}

export type Visitor = {
  [key in NodeType]?: VisitorFunction | VisitorHandler;
};

interface TraverseState {
  shouldStop: boolean;
  shouldSkip: boolean;
  replacement: unknown | null;
  shouldRemove: boolean;
}

/**
 * 遍历 AST
 * @param ast AST 根节点
 * @param visitor 访问者对象
 */
export function traverse(ast: unknown, visitor: Visitor): void {
  const state: TraverseState = {
    shouldStop: false,
    shouldSkip: false,
    replacement: null,
    shouldRemove: false,
  };

  visit(ast, null, [], 0, visitor, state);
}

function visit(
  node: unknown,
  parent: unknown | null,
  parentPath: string[],
  depth: number,
  visitor: Visitor,
  state: TraverseState
): unknown {
  if (!node || typeof node !== 'object' || state.shouldStop) {
    return node;
  }

  const nodeObj = node as Record<string, unknown>;
  const nodeType = nodeObj.type as NodeType | undefined;

  state.shouldSkip = false;
  state.replacement = null;
  state.shouldRemove = false;

  const context: VisitorContext = {
    parent,
    parentPath,
    depth,
    stop: () => { state.shouldStop = true; },
    skip: () => { state.shouldSkip = true; },
    replace: (newNode: unknown) => { state.replacement = newNode; },
    remove: () => { state.shouldRemove = true; },
  };

  // 调用 enter 回调
  if (nodeType && visitor[nodeType]) {
    const handler = visitor[nodeType];
    if (typeof handler === 'function') {
      handler(node, context);
    } else if (handler?.enter) {
      handler.enter(node, context);
    }
  }

  // 处理替换或移除
  if (state.shouldRemove) {
    return undefined;
  }
  if (state.replacement !== null) {
    return state.replacement;
  }

  if (state.shouldStop || state.shouldSkip) {
    return node;
  }

  // 递归遍历子节点
  for (const key of Object.keys(nodeObj)) {
    if (key === 'type' || key === 'span') continue;

    const child = nodeObj[key];
    const childPath = [...parentPath, key];

    if (Array.isArray(child)) {
      const newArray: unknown[] = [];
      for (let i = 0; i < child.length; i++) {
        if (state.shouldStop) break;
        const result = visit(child[i], node, [...childPath, String(i)], depth + 1, visitor, state);
        if (result !== undefined) {
          newArray.push(result);
        }
      }
      nodeObj[key] = newArray;
    } else if (child && typeof child === 'object') {
      const result = visit(child, node, childPath, depth + 1, visitor, state);
      if (result !== undefined) {
        nodeObj[key] = result;
      }
    }
  }

  // 调用 exit 回调
  if (nodeType && visitor[nodeType] && !state.shouldStop) {
    const handler = visitor[nodeType];
    if (typeof handler === 'object' && handler?.exit) {
      handler.exit(node, context);
    }
  }

  return node;
}

/**
 * 遍历并收集匹配的节点
 * @param ast AST 根节点
 * @param predicate 匹配条件
 * @returns 匹配的节点数组
 */
export function collect<T = unknown>(
  ast: unknown,
  predicate: (node: unknown, context: VisitorContext) => boolean
): T[] {
  const results: T[] = [];

  const visitor: Visitor = {};

  // 为所有可能的节点类型创建访问器
  const allTypes: NodeType[] = [
    'Module', 'ExportDefaultExpression', 'ExportDeclaration',
    'ExportDefaultDeclaration', 'ExportAllDeclaration', 'ImportDeclaration',
    'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression',
    'VariableDeclaration', 'VariableDeclarator', 'BlockStatement',
    'ExpressionStatement', 'ReturnStatement', 'IfStatement',
    'JSXElement', 'JSXOpeningElement', 'JSXClosingElement',
    'JSXAttribute', 'JSXSpreadAttribute', 'JSXText',
    'JSXExpressionContainer', 'JSXFragment', 'JSXOpeningFragment',
    'JSXClosingFragment', 'StringLiteral', 'NumericLiteral',
    'BooleanLiteral', 'NullLiteral', 'Identifier',
    'CallExpression', 'MemberExpression', 'ObjectExpression',
    'ArrayExpression', 'BinaryExpression', 'UnaryExpression',
    'ConditionalExpression', 'KeyValueProperty', 'SpreadElement',
  ];

  for (const type of allTypes) {
    visitor[type] = (node: unknown, context: VisitorContext) => {
      if (predicate(node, context)) {
        results.push(node as T);
      }
    };
  }

  traverse(ast, visitor);
  return results;
}

/**
 * 查找第一个匹配的节点
 * @param ast AST 根节点
 * @param predicate 匹配条件
 * @returns 匹配的节点或 null
 */
export function find<T = unknown>(
  ast: unknown,
  predicate: (node: unknown, context: VisitorContext) => boolean
): T | null {
  let result: T | null = null;

  const visitor: Visitor = {
    JSXElement: (node, context) => {
      if (predicate(node, context)) {
        result = node as T;
        context.stop();
      }
    },
    JSXOpeningElement: (node, context) => {
      if (predicate(node, context)) {
        result = node as T;
        context.stop();
      }
    },
  };

  traverse(ast, visitor);
  return result;
}
