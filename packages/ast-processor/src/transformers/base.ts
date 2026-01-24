/**
 * 基础变换器
 * 提供 AST 变换的通用功能
 */

import { findNodeByJsxId, JSXNodeInfo } from '../traverser/jsx-locator';
import { cloneDeep } from '../utils/clone';

export interface TransformResult {
  /** 变换是否成功 */
  success: boolean;
  /** 变换后的 AST */
  ast: unknown;
  /** 错误信息 */
  error?: string;
  /** 变换记录 */
  changes?: TransformChange[];
}

export interface TransformChange {
  /** 变换类型 */
  type: 'add' | 'modify' | 'remove';
  /** 变换路径 */
  path: string[];
  /** 旧值 */
  oldValue?: unknown;
  /** 新值 */
  newValue?: unknown;
}

/**
 * 基础变换器抽象类
 */
export abstract class BaseTransformer {
  protected ast: unknown;
  protected changes: TransformChange[] = [];

  constructor(ast: unknown) {
    // 深拷贝 AST，避免修改原始数据
    this.ast = cloneDeep(ast);
  }

  /**
   * 执行变换
   * @param jsxId 目标 JSX ID
   * @param payload 变换参数
   * @returns 变换结果
   */
  abstract transform(jsxId: string, payload: unknown): TransformResult;

  /**
   * 查找节点
   * @param jsxId JSX ID
   * @returns 节点信息或 null
   */
  protected findNode(jsxId: string): JSXNodeInfo | null {
    return findNodeByJsxId(this.ast, jsxId);
  }

  /**
   * 记录变换
   * @param change 变换记录
   */
  protected recordChange(change: TransformChange): void {
    this.changes.push(change);
  }

  /**
   * 创建变换结果
   * @param success 是否成功
   * @param error 错误信息
   * @returns 变换结果
   */
  protected createResult(success: boolean, error?: string): TransformResult {
    return {
      success,
      ast: this.ast,
      error,
      changes: this.changes,
    };
  }

  /**
   * 获取当前 AST
   */
  getAst(): unknown {
    return this.ast;
  }

  /**
   * 获取变换记录
   */
  getChanges(): TransformChange[] {
    return this.changes;
  }
}

/**
 * 创建默认 span 对象 (SWC 需要)
 * @returns 默认 span 对象
 */
function defaultSpan(): { start: number; end: number; ctxt: number } {
  return { start: 0, end: 0, ctxt: 0 };
}

/**
 * 创建字符串字面量节点
 * @param value 字符串值
 * @returns 字符串字面量 AST 节点
 */
export function createStringLiteral(value: string): Record<string, unknown> {
  return {
    type: 'StringLiteral',
    span: defaultSpan(),
    value,
    raw: JSON.stringify(value),
  };
}

/**
 * 创建标识符节点
 * @param name 标识符名称
 * @returns 标识符 AST 节点
 */
export function createIdentifier(name: string): Record<string, unknown> {
  return {
    type: 'Identifier',
    span: defaultSpan(),
    value: name,
    optional: false,
  };
}

/**
 * 创建 JSX 属性节点
 * @param name 属性名
 * @param value 属性值
 * @returns JSX 属性 AST 节点
 */
export function createJSXAttribute(
  name: string,
  value: string | boolean | null
): Record<string, unknown> {
  if (value === true || value === null) {
    // 布尔属性
    return {
      type: 'JSXAttribute',
      span: defaultSpan(),
      name: createIdentifier(name),
      value: null,
    };
  }

  return {
    type: 'JSXAttribute',
    span: defaultSpan(),
    name: createIdentifier(name),
    value: createStringLiteral(value as string),
  };
}

/**
 * 创建 JSX 文本节点
 * @param text 文本内容
 * @returns JSX 文本 AST 节点
 */
export function createJSXText(text: string): Record<string, unknown> {
  return {
    type: 'JSXText',
    span: defaultSpan(),
    value: text,
    raw: text,
  };
}

/**
 * 创建 JSX 表达式容器节点
 * @param expression 表达式
 * @returns JSX 表达式容器 AST 节点
 */
export function createJSXExpressionContainer(
  expression: unknown
): Record<string, unknown> {
  return {
    type: 'JSXExpressionContainer',
    span: defaultSpan(),
    expression,
  };
}

/**
 * 创建对象表达式节点
 * @param properties 属性数组
 * @returns 对象表达式 AST 节点
 */
export function createObjectExpression(
  properties: Array<{ key: string; value: unknown }>
): Record<string, unknown> {
  return {
    type: 'ObjectExpression',
    span: defaultSpan(),
    properties: properties.map(({ key, value }) => ({
      type: 'KeyValueProperty',
      key: createIdentifier(key),
      value,
    })),
  };
}
