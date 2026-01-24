/**
 * JSX ID 定位器
 * 根据 JSX ID 查找和定位 AST 节点
 */

import { traverse, VisitorContext } from './visitor';

export interface JSXNodeInfo {
  /** 找到的 JSXOpeningElement 节点 */
  node: unknown;
  /** 父 JSXElement 节点 */
  parent: unknown;
  /** 节点路径 */
  path: string[];
  /** JSX ID 值 */
  jsxId: string;
  /** 元素名称 */
  element: string;
  /** 属性 Map */
  attributes: Map<string, unknown>;
  /** 子节点数组 */
  children: unknown[];
}

interface JSXAttributeNode {
  type: string;
  name?: { type: string; value: string };
  value?: { type: string; value: unknown } | null;
}

interface JSXNameNode {
  type: string;
  value?: string;
  object?: JSXNameNode;
  property?: { value: string };
}

interface JSXElementNode {
  type: string;
  opening?: unknown;
  children?: unknown[];
  span?: { start: { line: number; column: number } };
}

/**
 * 根据 JSX ID 查找节点
 * @param ast AST 根节点
 * @param jsxId 要查找的 JSX ID
 * @returns 节点信息或 null
 */
export function findNodeByJsxId(ast: unknown, jsxId: string): JSXNodeInfo | null {
  let result: JSXNodeInfo | null = null;

  traverse(ast, {
    JSXOpeningElement(node: unknown, context: VisitorContext) {
      const nodeObj = node as Record<string, unknown>;
      const attributes = nodeObj.attributes as JSXAttributeNode[] | undefined;

      // 查找 data-jsx-id 属性
      const idAttr = attributes?.find((attr) => {
        if (attr.type !== 'JSXAttribute') return false;
        if (!attr.name || attr.name.type !== 'Identifier') return false;
        return attr.name.value === 'data-jsx-id';
      });

      const attrValue = idAttr?.value as { value?: string } | undefined;
      if (attrValue?.value === jsxId) {
        const elementName = getElementName(nodeObj.name as JSXNameNode);
        const parentElement = context.parent as JSXElementNode | null;

        result = {
          node,
          parent: context.parent,
          path: [...context.parentPath],
          jsxId,
          element: elementName,
          attributes: extractAttributes(attributes || []),
          children: parentElement?.children || [],
        };

        context.stop();
      }
    },
  });

  return result;
}

/**
 * 获取所有带 JSX ID 的节点
 * @param ast AST 根节点
 * @returns 节点信息数组
 */
export function findAllJsxNodes(ast: unknown): JSXNodeInfo[] {
  const results: JSXNodeInfo[] = [];

  traverse(ast, {
    JSXOpeningElement(node: unknown, context: VisitorContext) {
      const nodeObj = node as Record<string, unknown>;
      const attributes = nodeObj.attributes as JSXAttributeNode[] | undefined;

      const idAttr = attributes?.find((attr) => {
        if (attr.type !== 'JSXAttribute') return false;
        return attr.name?.value === 'data-jsx-id';
      });

      const attrValue = idAttr?.value as { value?: string } | undefined;
      if (attrValue?.value) {
        const parentElement = context.parent as JSXElementNode | null;

        results.push({
          node,
          parent: context.parent,
          path: [...context.parentPath],
          jsxId: attrValue.value,
          element: getElementName(nodeObj.name as JSXNameNode),
          attributes: extractAttributes(attributes || []),
          children: parentElement?.children || [],
        });
      }
    },
  });

  return results;
}

/**
 * 根据文件位置查找最近的节点
 * @param ast AST 根节点
 * @param line 行号
 * @param column 列号
 * @returns 最近的节点信息或 null
 */
export function findNodeByLocation(
  ast: unknown,
  line: number,
  column: number
): JSXNodeInfo | null {
  let result: JSXNodeInfo | null = null;
  let closestDistance = Infinity;

  traverse(ast, {
    JSXOpeningElement(node: unknown, context: VisitorContext) {
      const nodeObj = node as Record<string, unknown>;
      const span = nodeObj.span as { start?: { line: number; column: number } } | undefined;

      if (!span?.start) return;

      // 计算距离
      const nodeLine = span.start.line;
      const nodeCol = span.start.column;
      const distance = Math.abs(nodeLine - line) * 1000 + Math.abs(nodeCol - column);

      if (distance < closestDistance) {
        closestDistance = distance;

        const attributes = nodeObj.attributes as JSXAttributeNode[] | undefined;
        const idAttr = attributes?.find((attr) =>
          attr.name?.value === 'data-jsx-id'
        );
        const attrValue = idAttr?.value as { value?: string } | undefined;
        const parentElement = context.parent as JSXElementNode | null;

        result = {
          node,
          parent: context.parent,
          path: [...context.parentPath],
          jsxId: attrValue?.value || '',
          element: getElementName(nodeObj.name as JSXNameNode),
          attributes: extractAttributes(attributes || []),
          children: parentElement?.children || [],
        };
      }
    },
  });

  return result;
}

/**
 * 根据元素名称查找所有匹配的节点
 * @param ast AST 根节点
 * @param elementName 元素名称
 * @returns 匹配的节点信息数组
 */
export function findNodesByElement(ast: unknown, elementName: string): JSXNodeInfo[] {
  const results: JSXNodeInfo[] = [];

  traverse(ast, {
    JSXOpeningElement(node: unknown, context: VisitorContext) {
      const nodeObj = node as Record<string, unknown>;
      const name = getElementName(nodeObj.name as JSXNameNode);

      if (name === elementName) {
        const attributes = nodeObj.attributes as JSXAttributeNode[] | undefined;
        const idAttr = attributes?.find((attr) =>
          attr.name?.value === 'data-jsx-id'
        );
        const attrValue = idAttr?.value as { value?: string } | undefined;
        const parentElement = context.parent as JSXElementNode | null;

        results.push({
          node,
          parent: context.parent,
          path: [...context.parentPath],
          jsxId: attrValue?.value || '',
          element: name,
          attributes: extractAttributes(attributes || []),
          children: parentElement?.children || [],
        });
      }
    },
  });

  return results;
}

/**
 * 获取元素名称
 */
function getElementName(name: JSXNameNode | undefined): string {
  if (!name) return 'unknown';

  if (name.type === 'Identifier') {
    return name.value || 'unknown';
  }
  if (name.type === 'JSXMemberExpression') {
    const objectName = getElementName(name.object);
    return `${objectName}.${name.property?.value || ''}`;
  }
  return 'unknown';
}

/**
 * 提取属性为 Map
 */
function extractAttributes(attrs: JSXAttributeNode[]): Map<string, unknown> {
  const result = new Map<string, unknown>();

  for (const attr of attrs) {
    if (attr.type === 'JSXAttribute' && attr.name?.value) {
      const name = attr.name.value;
      const value = extractAttributeValue(attr.value);
      result.set(name, value);
    }
  }

  return result;
}

/**
 * 提取属性值
 */
function extractAttributeValue(value: unknown): unknown {
  if (!value) return true; // 布尔属性

  const valueObj = value as { type?: string; value?: unknown; expression?: unknown };

  if (valueObj.type === 'StringLiteral') {
    return valueObj.value;
  }
  if (valueObj.type === 'JSXExpressionContainer') {
    // 表达式容器，返回表达式节点
    return valueObj.expression;
  }
  return value;
}

/**
 * 检查节点是否有指定的属性
 * @param nodeInfo 节点信息
 * @param attrName 属性名
 * @returns 是否存在该属性
 */
export function hasAttribute(nodeInfo: JSXNodeInfo, attrName: string): boolean {
  return nodeInfo.attributes.has(attrName);
}

/**
 * 获取属性值
 * @param nodeInfo 节点信息
 * @param attrName 属性名
 * @returns 属性值或 undefined
 */
export function getAttribute(nodeInfo: JSXNodeInfo, attrName: string): unknown {
  return nodeInfo.attributes.get(attrName);
}

/**
 * 获取 className 属性值
 * @param nodeInfo 节点信息
 * @returns className 字符串或空字符串
 */
export function getClassName(nodeInfo: JSXNodeInfo): string {
  const value = nodeInfo.attributes.get('className');
  if (typeof value === 'string') {
    return value;
  }
  return '';
}
