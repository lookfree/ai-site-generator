/**
 * 结构变换器
 * 用于修改 JSX 元素的结构（添加、删除、移动节点）
 */

import { BaseTransformer, TransformResult } from './base';
import { cloneDeep } from '../utils/clone';

export interface InsertPayload {
  /** 要插入的节点 */
  node: unknown;
  /** 插入位置 ('before' | 'after' | 'first' | 'last') */
  position: 'before' | 'after' | 'first' | 'last';
}

export interface WrapPayload {
  /** 包装元素名称 */
  element: string;
  /** 包装元素属性 */
  attributes?: Record<string, string>;
}

interface JSXElementNode {
  type: string;
  opening: unknown;
  closing?: unknown;
  children: unknown[];
}

/**
 * 结构变换器类
 */
export class StructureTransformer extends BaseTransformer {
  /**
   * 删除节点
   */
  remove(jsxId: string): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { parent, path } = nodeInfo;
    const parentObj = parent as JSXElementNode | null;

    if (!parentObj) {
      return this.createResult(false, 'Cannot remove root node');
    }

    // 找到当前节点在父节点 children 中的位置
    const childIndex = this.findChildIndex(parentObj, path);
    if (childIndex === -1) {
      return this.createResult(false, 'Could not find node in parent children');
    }

    const removedNode = parentObj.children[childIndex];
    parentObj.children.splice(childIndex, 1);

    this.recordChange({
      type: 'remove',
      path: [...path.slice(0, -2), 'children', String(childIndex)],
      oldValue: removedNode,
    });

    return this.createResult(true);
  }

  /**
   * 在指定位置插入节点
   */
  insert(jsxId: string, payload: InsertPayload): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { parent, path } = nodeInfo;
    const parentObj = parent as JSXElementNode | null;

    if (!parentObj) {
      return this.createResult(false, 'Cannot insert at root level');
    }

    const newNode = cloneDeep(payload.node);
    const childIndex = this.findChildIndex(parentObj, path);

    let insertIndex: number;
    switch (payload.position) {
      case 'before':
        insertIndex = childIndex;
        break;
      case 'after':
        insertIndex = childIndex + 1;
        break;
      case 'first':
        insertIndex = 0;
        break;
      case 'last':
        insertIndex = parentObj.children.length;
        break;
      default:
        insertIndex = childIndex + 1;
    }

    parentObj.children.splice(insertIndex, 0, newNode);

    this.recordChange({
      type: 'add',
      path: [...path.slice(0, -2), 'children', String(insertIndex)],
      newValue: newNode,
    });

    return this.createResult(true);
  }

  /**
   * 用新节点替换当前节点
   */
  replace(jsxId: string, newNode: unknown): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { parent, path } = nodeInfo;
    const parentObj = parent as JSXElementNode | null;

    if (!parentObj) {
      return this.createResult(false, 'Cannot replace root node');
    }

    const childIndex = this.findChildIndex(parentObj, path);
    if (childIndex === -1) {
      return this.createResult(false, 'Could not find node in parent children');
    }

    const oldNode = parentObj.children[childIndex];
    const clonedNewNode = cloneDeep(newNode);
    parentObj.children[childIndex] = clonedNewNode;

    this.recordChange({
      type: 'modify',
      path: [...path.slice(0, -2), 'children', String(childIndex)],
      oldValue: oldNode,
      newValue: clonedNewNode,
    });

    return this.createResult(true);
  }

  /**
   * 将节点用另一个元素包装
   */
  wrap(jsxId: string, payload: WrapPayload): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { parent, path } = nodeInfo;
    const parentObj = parent as JSXElementNode | null;

    if (!parentObj) {
      return this.createResult(false, 'Cannot wrap root node');
    }

    const childIndex = this.findChildIndex(parentObj, path);
    if (childIndex === -1) {
      return this.createResult(false, 'Could not find node in parent children');
    }

    const originalNode = parentObj.children[childIndex];

    // 创建包装元素
    const wrapperAttributes = Object.entries(payload.attributes || {}).map(([name, value]) => ({
      type: 'JSXAttribute',
      name: { type: 'Identifier', value: name },
      value: { type: 'StringLiteral', value },
    }));

    const wrapperNode: JSXElementNode = {
      type: 'JSXElement',
      opening: {
        type: 'JSXOpeningElement',
        name: { type: 'Identifier', value: payload.element },
        attributes: wrapperAttributes,
        selfClosing: false,
      },
      closing: {
        type: 'JSXClosingElement',
        name: { type: 'Identifier', value: payload.element },
      },
      children: [cloneDeep(originalNode)],
    };

    parentObj.children[childIndex] = wrapperNode;

    this.recordChange({
      type: 'modify',
      path: [...path.slice(0, -2), 'children', String(childIndex)],
      oldValue: originalNode,
      newValue: wrapperNode,
    });

    return this.createResult(true);
  }

  /**
   * 解除包装（将子节点提升到父级）
   */
  unwrap(jsxId: string): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { parent, children, path } = nodeInfo;
    const parentObj = parent as JSXElementNode | null;

    if (!parentObj) {
      return this.createResult(false, 'Cannot unwrap root node');
    }

    if (children.length === 0) {
      return this.createResult(false, 'Node has no children to unwrap');
    }

    const childIndex = this.findChildIndex(parentObj, path);
    if (childIndex === -1) {
      return this.createResult(false, 'Could not find node in parent children');
    }

    const originalNode = parentObj.children[childIndex];

    // 用子节点替换当前节点
    parentObj.children.splice(childIndex, 1, ...children.map(c => cloneDeep(c)));

    this.recordChange({
      type: 'modify',
      path: [...path.slice(0, -2), 'children'],
      oldValue: originalNode,
      newValue: children,
    });

    return this.createResult(true);
  }

  transform(_jsxId: string, _payload: unknown): TransformResult {
    return this.createResult(false, 'Use specific methods like remove, insert, replace, wrap, unwrap');
  }

  private findChildIndex(_parent: JSXElementNode, path: string[]): number {
    // 从路径中提取子节点索引
    // 路径格式类似: ['body', '0', 'declaration', 'body', 'stmts', '0', 'argument', 'children', '0', 'opening']
    // 我们需要找到 'children' 后面的数字
    for (let i = path.length - 1; i >= 0; i--) {
      if (path[i] === 'opening' || path[i] === 'closing') {
        // 找到 opening/closing，检查前面是否有数字索引
        if (i > 0 && /^\d+$/.test(path[i - 1]) && i > 1 && path[i - 2] === 'children') {
          return parseInt(path[i - 1], 10);
        }
      }
    }
    return 0;
  }
}

/**
 * 删除节点的便捷函数
 */
export function removeNode(ast: unknown, jsxId: string): TransformResult {
  const transformer = new StructureTransformer(ast);
  return transformer.remove(jsxId);
}

/**
 * 插入节点的便捷函数
 */
export function insertNode(
  ast: unknown,
  jsxId: string,
  node: unknown,
  position: InsertPayload['position'] = 'after'
): TransformResult {
  const transformer = new StructureTransformer(ast);
  return transformer.insert(jsxId, { node, position });
}

/**
 * 替换节点的便捷函数
 */
export function replaceNode(ast: unknown, jsxId: string, newNode: unknown): TransformResult {
  const transformer = new StructureTransformer(ast);
  return transformer.replace(jsxId, newNode);
}

/**
 * 包装节点的便捷函数
 */
export function wrapNode(
  ast: unknown,
  jsxId: string,
  element: string,
  attributes?: Record<string, string>
): TransformResult {
  const transformer = new StructureTransformer(ast);
  return transformer.wrap(jsxId, { element, attributes });
}

/**
 * 解除包装的便捷函数
 */
export function unwrapNode(ast: unknown, jsxId: string): TransformResult {
  const transformer = new StructureTransformer(ast);
  return transformer.unwrap(jsxId);
}
