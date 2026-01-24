/**
 * 文本变换器
 * 用于修改 JSX 元素的文本内容
 */

import { BaseTransformer, TransformResult, createJSXText } from './base';

export interface TextPayload {
  /** 新的文本内容 */
  text: string;
}

/**
 * 文本变换器类
 */
export class TextTransformer extends BaseTransformer {
  transform(jsxId: string, payload: TextPayload): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { parent } = nodeInfo;
    const parentObj = parent as Record<string, unknown> | null;

    // 确保父节点是 JSXElement
    if (!parentObj || parentObj.type !== 'JSXElement') {
      return this.createResult(false, 'Parent is not a JSX element');
    }

    // 记录旧值
    const oldChildren = parentObj.children;

    // 更新 children 为新的文本节点
    parentObj.children = [createJSXText(payload.text)];

    this.recordChange({
      type: 'modify',
      path: [...nodeInfo.path.slice(0, -1), 'children'],
      oldValue: oldChildren,
      newValue: parentObj.children,
    });

    return this.createResult(true);
  }
}

/**
 * 更新文本内容的便捷函数
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @param text 新的文本内容
 * @returns 变换结果
 */
export function updateText(ast: unknown, jsxId: string, text: string): TransformResult {
  const transformer = new TextTransformer(ast);
  return transformer.transform(jsxId, { text });
}

/**
 * 追加文本内容
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @param text 要追加的文本
 * @returns 变换结果
 */
export function appendText(ast: unknown, jsxId: string, text: string): TransformResult {
  const transformer = new AppendTextTransformer(ast);
  return transformer.transform(jsxId, { text });
}

/**
 * 追加文本变换器
 */
class AppendTextTransformer extends BaseTransformer {
  transform(jsxId: string, payload: TextPayload): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { parent } = nodeInfo;
    const parentObj = parent as Record<string, unknown> | null;

    if (!parentObj || parentObj.type !== 'JSXElement') {
      return this.createResult(false, 'Parent is not a JSX element');
    }

    const oldChildren = parentObj.children as unknown[] || [];
    const newTextNode = createJSXText(payload.text);

    // 追加文本节点
    parentObj.children = [...oldChildren, newTextNode];

    this.recordChange({
      type: 'add',
      path: [...nodeInfo.path.slice(0, -1), 'children'],
      oldValue: oldChildren,
      newValue: parentObj.children,
    });

    return this.createResult(true);
  }
}

/**
 * 清除所有子节点
 * @param ast AST 根节点
 * @param jsxId JSX ID
 * @returns 变换结果
 */
export function clearChildren(ast: unknown, jsxId: string): TransformResult {
  const transformer = new ClearChildrenTransformer(ast);
  return transformer.transform(jsxId, {});
}

/**
 * 清除子节点变换器
 */
class ClearChildrenTransformer extends BaseTransformer {
  transform(jsxId: string, _payload: unknown): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { parent } = nodeInfo;
    const parentObj = parent as Record<string, unknown> | null;

    if (!parentObj || parentObj.type !== 'JSXElement') {
      return this.createResult(false, 'Parent is not a JSX element');
    }

    const oldChildren = parentObj.children;
    parentObj.children = [];

    this.recordChange({
      type: 'remove',
      path: [...nodeInfo.path.slice(0, -1), 'children'],
      oldValue: oldChildren,
      newValue: [],
    });

    return this.createResult(true);
  }
}
