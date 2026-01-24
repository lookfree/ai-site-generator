/**
 * 属性变换器
 * 用于修改 JSX 元素的属性
 */

import { BaseTransformer, TransformResult, createIdentifier, createStringLiteral } from './base';

export interface AttributePayload {
  /** 属性名 */
  name: string;
  /** 属性值 (null 表示删除) */
  value: string | boolean | null;
}

interface JSXAttributeNode {
  type: string;
  span?: { start: number; end: number; ctxt: number };
  name?: { type: string; value: string; span?: { start: number; end: number; ctxt: number } };
  value?: { type: string; value?: unknown; span?: { start: number; end: number; ctxt: number }; raw?: string } | null;
}

/**
 * 属性变换器类
 */
export class AttributeTransformer extends BaseTransformer {
  transform(jsxId: string, payload: AttributePayload): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { node } = nodeInfo;
    const nodeObj = node as Record<string, unknown>;
    const { name, value } = payload;

    // 不允许修改 data-jsx-* 属性
    if (name.startsWith('data-jsx-')) {
      return this.createResult(false, 'Cannot modify JSX tracking attributes');
    }

    if (value === null) {
      // 删除属性
      this.removeAttribute(nodeObj, name);
    } else if (typeof value === 'boolean') {
      // 布尔属性
      this.setBooleanAttribute(nodeObj, name, value);
    } else {
      // 字符串属性
      this.setStringAttribute(nodeObj, name, value);
    }

    return this.createResult(true);
  }

  private removeAttribute(node: Record<string, unknown>, name: string): void {
    const attributes = node.attributes as JSXAttributeNode[] | undefined;
    if (!attributes) return;

    const index = attributes.findIndex(
      (a) => a.type === 'JSXAttribute' && a.name?.value === name
    );

    if (index >= 0) {
      const removed = attributes.splice(index, 1)[0];
      this.recordChange({
        type: 'remove',
        path: ['attributes', String(index)],
        oldValue: removed,
      });
    }
  }

  private setBooleanAttribute(node: Record<string, unknown>, name: string, value: boolean): void {
    if (!value) {
      this.removeAttribute(node, name);
      return;
    }

    const attributes = node.attributes as JSXAttributeNode[] | undefined;
    const existing = attributes?.find(
      (a) => a.type === 'JSXAttribute' && a.name?.value === name
    );

    if (!existing) {
      // 添加布尔属性 (无值)
      const defaultSpan = { start: 0, end: 0, ctxt: 0 };
      const newAttr = {
        type: 'JSXAttribute',
        span: defaultSpan,
        name: { type: 'Identifier', span: defaultSpan, value: name, optional: false },
        value: null,
      };

      if (!node.attributes) {
        node.attributes = [];
      }
      (node.attributes as JSXAttributeNode[]).push(newAttr as unknown as JSXAttributeNode);

      this.recordChange({
        type: 'add',
        path: ['attributes', name],
        newValue: newAttr,
      });
    }
  }

  private setStringAttribute(node: Record<string, unknown>, name: string, value: string): void {
    const attributes = node.attributes as JSXAttributeNode[] | undefined;
    const existing = attributes?.find(
      (a) => a.type === 'JSXAttribute' && a.name?.value === name
    );

    const defaultSpan = { start: 0, end: 0, ctxt: 0 };

    if (existing) {
      const oldValue = existing.value;
      existing.value = { type: 'StringLiteral', span: defaultSpan, value, raw: JSON.stringify(value) };

      this.recordChange({
        type: 'modify',
        path: ['attributes', name],
        oldValue,
        newValue: existing.value,
      });
    } else {
      const newAttr: Record<string, unknown> = {
        type: 'JSXAttribute',
        span: defaultSpan,
        name: createIdentifier(name),
        value: createStringLiteral(value),
      };

      if (!node.attributes) {
        node.attributes = [];
      }
      (node.attributes as JSXAttributeNode[]).push(newAttr as unknown as JSXAttributeNode);

      this.recordChange({
        type: 'add',
        path: ['attributes', name],
        newValue: newAttr,
      });
    }
  }
}

/**
 * 更新属性的便捷函数
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @param name 属性名
 * @param value 属性值
 * @returns 变换结果
 */
export function updateAttribute(
  ast: unknown,
  jsxId: string,
  name: string,
  value: string | boolean | null
): TransformResult {
  const transformer = new AttributeTransformer(ast);
  return transformer.transform(jsxId, { name, value });
}

/**
 * 设置多个属性的便捷函数
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @param attributes 属性对象
 * @returns 变换结果
 */
export function setAttributes(
  ast: unknown,
  jsxId: string,
  attributes: Record<string, string | boolean | null>
): TransformResult {
  let currentAst = ast;
  let lastResult: TransformResult = { success: true, ast: currentAst, changes: [] };

  for (const [name, value] of Object.entries(attributes)) {
    const transformer = new AttributeTransformer(currentAst);
    const result = transformer.transform(jsxId, { name, value });

    if (!result.success) {
      return result;
    }

    currentAst = result.ast;
    lastResult = {
      success: true,
      ast: currentAst,
      changes: [...(lastResult.changes || []), ...(result.changes || [])],
    };
  }

  return lastResult;
}

/**
 * 移除属性的便捷函数
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @param name 属性名
 * @returns 变换结果
 */
export function removeAttribute(ast: unknown, jsxId: string, name: string): TransformResult {
  return updateAttribute(ast, jsxId, name, null);
}

/**
 * 检查属性是否存在
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @param name 属性名
 * @returns 是否存在
 */
export function hasAttribute(ast: unknown, jsxId: string, name: string): boolean {
  const { findNodeByJsxId } = require('../traverser/jsx-locator');
  const nodeInfo = findNodeByJsxId(ast, jsxId);
  return nodeInfo ? nodeInfo.attributes.has(name) : false;
}

/**
 * 获取属性值
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @param name 属性名
 * @returns 属性值或 undefined
 */
export function getAttribute(ast: unknown, jsxId: string, name: string): unknown {
  const { findNodeByJsxId } = require('../traverser/jsx-locator');
  const nodeInfo = findNodeByJsxId(ast, jsxId);
  return nodeInfo ? nodeInfo.attributes.get(name) : undefined;
}
