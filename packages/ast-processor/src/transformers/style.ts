/**
 * 样式变换器
 * 用于修改 JSX 元素的 className 和 style 属性
 */

import {
  BaseTransformer,
  TransformResult,
  createStringLiteral,
  createIdentifier,
  createObjectExpression,
} from './base';

export interface StylePayload {
  /** 完全替换 className */
  className?: string;
  /** 要添加的类名 */
  addClasses?: string[];
  /** 要移除的类名 */
  removeClasses?: string[];
  /** 行内样式对象 */
  style?: Record<string, string>;
}

interface JSXAttributeNode {
  type: string;
  span?: { start: number; end: number; ctxt: number };
  name?: { type: string; value: string; span?: { start: number; end: number; ctxt: number } };
  value?: { type: string; value?: unknown; span?: { start: number; end: number; ctxt: number }; raw?: string } | null;
}

/**
 * 样式变换器类
 */
export class StyleTransformer extends BaseTransformer {
  transform(jsxId: string, payload: StylePayload): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { node, attributes } = nodeInfo;
    const nodeObj = node as Record<string, unknown>;

    // 处理 className
    if (payload.className !== undefined || payload.addClasses || payload.removeClasses) {
      this.updateClassName(nodeObj, attributes, payload);
    }

    // 处理 style
    if (payload.style) {
      this.updateStyle(nodeObj, payload.style);
    }

    return this.createResult(true);
  }

  private updateClassName(
    node: Record<string, unknown>,
    currentAttrs: Map<string, unknown>,
    payload: StylePayload
  ): void {
    let newClassName: string;

    if (payload.className !== undefined) {
      // 完全替换
      newClassName = payload.className;
    } else {
      // 增量修改
      const currentClassName = (currentAttrs.get('className') as string) || '';
      const currentClasses = new Set(currentClassName.split(/\s+/).filter(Boolean));

      // 添加新类
      for (const cls of payload.addClasses || []) {
        currentClasses.add(cls);
      }

      // 移除类
      for (const cls of payload.removeClasses || []) {
        currentClasses.delete(cls);
      }

      newClassName = Array.from(currentClasses).join(' ');
    }

    // 更新或添加 className 属性
    this.setAttributeValue(node, 'className', newClassName);
  }

  private updateStyle(node: Record<string, unknown>, style: Record<string, string>): void {
    const defaultSpan = { start: 0, end: 0, ctxt: 0 };
    const properties = Object.entries(style).map(([key, value]) => ({
      key: this.camelCase(key),
      value: createStringLiteral(value),
    }));

    const styleAttr: Record<string, unknown> = {
      type: 'JSXAttribute',
      span: defaultSpan,
      name: createIdentifier('style'),
      value: {
        type: 'JSXExpressionContainer',
        span: defaultSpan,
        expression: createObjectExpression(properties),
      },
    };

    this.setOrUpdateAttribute(node, 'style', styleAttr);
  }

  private setAttributeValue(node: Record<string, unknown>, name: string, value: string): void {
    const attributes = (node.attributes as JSXAttributeNode[]) || [];
    const attr = attributes.find(
      (a) => a.type === 'JSXAttribute' && a.name?.value === name
    );

    const defaultSpan = { start: 0, end: 0, ctxt: 0 };

    if (attr) {
      // 更新现有属性
      const oldValue = attr.value;
      attr.value = { type: 'StringLiteral', span: defaultSpan, value, raw: JSON.stringify(value) };

      this.recordChange({
        type: 'modify',
        path: ['attributes', name],
        oldValue,
        newValue: attr.value,
      });
    } else {
      // 添加新属性
      const newAttr = {
        type: 'JSXAttribute',
        span: defaultSpan,
        name: { type: 'Identifier', span: defaultSpan, value: name, optional: false },
        value: { type: 'StringLiteral', span: defaultSpan, value, raw: JSON.stringify(value) },
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

  private setOrUpdateAttribute(
    node: Record<string, unknown>,
    name: string,
    newAttr: Record<string, unknown>
  ): void {
    const attributes = (node.attributes as JSXAttributeNode[]) || [];
    const existingIndex = attributes.findIndex(
      (a) => a.type === 'JSXAttribute' && a.name?.value === name
    );

    if (existingIndex >= 0) {
      const oldValue = attributes[existingIndex];
      attributes[existingIndex] = newAttr as unknown as JSXAttributeNode;

      this.recordChange({
        type: 'modify',
        path: ['attributes', name],
        oldValue,
        newValue: newAttr,
      });
    } else {
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

  private camelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }
}

/**
 * 更新样式的便捷函数
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @param payload 样式变换参数
 * @returns 变换结果
 */
export function updateStyle(ast: unknown, jsxId: string, payload: StylePayload): TransformResult {
  const transformer = new StyleTransformer(ast);
  return transformer.transform(jsxId, payload);
}

/**
 * 添加类名的便捷函数
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @param classes 要添加的类名
 * @returns 变换结果
 */
export function addClasses(ast: unknown, jsxId: string, classes: string[]): TransformResult {
  return updateStyle(ast, jsxId, { addClasses: classes });
}

/**
 * 移除类名的便捷函数
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @param classes 要移除的类名
 * @returns 变换结果
 */
export function removeClasses(ast: unknown, jsxId: string, classes: string[]): TransformResult {
  return updateStyle(ast, jsxId, { removeClasses: classes });
}

/**
 * 替换类名的便捷函数
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @param className 新的类名
 * @returns 变换结果
 */
export function setClassName(ast: unknown, jsxId: string, className: string): TransformResult {
  return updateStyle(ast, jsxId, { className });
}

/**
 * 设置行内样式的便捷函数
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @param style 样式对象
 * @returns 变换结果
 */
export function setInlineStyle(
  ast: unknown,
  jsxId: string,
  style: Record<string, string>
): TransformResult {
  return updateStyle(ast, jsxId, { style });
}
