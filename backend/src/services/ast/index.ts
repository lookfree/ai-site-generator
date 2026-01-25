/**
 * AST 编辑服务
 * 提供服务端 AST 处理能力，支持 React/TSX 代码的解析、变换和生成
 */

import { parseSync, printSync } from '@swc/core';
import type { Module, TsParserConfig, JscTarget } from '@swc/core';

// 类型定义
export interface AstEditRequest {
  /** 目标 JSX ID */
  jsxId: string;
  /** 编辑操作 */
  operation: EditOperation;
}

export type EditOperation =
  | { type: 'text'; payload: { text: string } }
  | { type: 'style'; payload: StylePayload }
  | { type: 'attribute'; payload: { name: string; value: string | boolean | null } }
  | { type: 'remove' }
  | { type: 'insert'; payload: { node: string; position: 'before' | 'after' | 'first' | 'last' } };

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

export interface AstEditResult {
  success: boolean;
  code?: string;
  error?: string;
  changes?: TransformChange[];
}

export interface TransformChange {
  type: 'add' | 'modify' | 'remove';
  path: string[];
  oldValue?: unknown;
  newValue?: unknown;
}

export interface JSXNodeInfo {
  /** 节点类型 */
  type: string;
  /** JSX ID */
  jsxId: string;
  /** 元素名称 */
  element: string;
  /** 属性 */
  attributes: Record<string, unknown>;
  /** 文本内容 */
  textContent?: string;
  /** 子节点数量 */
  childCount: number;
  /** 位置信息 */
  location?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
}

// 解析选项
const parseOptions = {
  syntax: 'typescript' as const,
  tsx: true,
  decorators: true,
  dynamicImport: true,
} satisfies TsParserConfig;

// 生成选项
const printOptions = {
  jsc: {
    target: 'es2020' as JscTarget,
    parser: parseOptions,
  },
  isModule: true,
};

/**
 * AST 编辑服务类
 */
export class AstEditorService {
  private cache: Map<string, { code: string; ast: Module }> = new Map();

  /**
   * 解析代码为 AST
   */
  parse(code: string, filePath: string): Module {
    const cached = this.cache.get(filePath);
    if (cached && cached.code === code) {
      return cached.ast;
    }

    const ast = parseSync(code, {
      ...parseOptions,
      comments: true,
    });

    this.cache.set(filePath, { code, ast: ast as Module });
    return ast as Module;
  }

  /**
   * 将 AST 转换回代码
   */
  generate(ast: Module): string {
    const result = printSync(ast, printOptions);
    return result.code;
  }

  /**
   * 查找所有带 data-jsx-id 的节点
   */
  findAllNodes(code: string, filePath: string): JSXNodeInfo[] {
    const ast = this.parse(code, filePath);
    const nodes: JSXNodeInfo[] = [];

    this.traverseAST(ast, (node: unknown, parent: unknown) => {
      const nodeObj = node as Record<string, unknown>;
      if (nodeObj.type === 'JSXOpeningElement') {
        const jsxId = this.getJsxId(nodeObj);
        if (jsxId) {
          const parentObj = parent as Record<string, unknown>;
          nodes.push({
            type: 'JSXElement',
            jsxId,
            element: this.getElementName(nodeObj.name),
            attributes: this.extractAttributes(nodeObj.attributes as unknown[]),
            textContent: this.extractTextContent(parentObj?.children as unknown[]),
            childCount: (parentObj?.children as unknown[])?.length || 0,
            location: this.extractLocation(nodeObj.span),
          });
        }
      }
    });

    return nodes;
  }

  /**
   * 根据 JSX ID 查找节点
   */
  findNode(code: string, filePath: string, jsxId: string): JSXNodeInfo | null {
    const nodes = this.findAllNodes(code, filePath);
    return nodes.find(n => n.jsxId === jsxId) || null;
  }

  /**
   * 执行单个编辑操作
   */
  async edit(code: string, filePath: string, request: AstEditRequest): Promise<AstEditResult> {
    try {
      const ast = this.parse(code, filePath);
      const changes: TransformChange[] = [];

      let modified = false;
      const newAst = this.transformAST(ast, (node: unknown, parent: unknown) => {
        const nodeObj = node as Record<string, unknown>;
        if (nodeObj.type === 'JSXOpeningElement') {
          const nodeJsxId = this.getJsxId(nodeObj);
          if (nodeJsxId === request.jsxId) {
            modified = true;
            return this.applyOperation(node, parent, request.operation, changes);
          }
        }
        return node;
      });

      if (!modified) {
        return {
          success: false,
          error: `Node with JSX ID "${request.jsxId}" not found`,
        };
      }

      const newCode = this.generate(newAst);

      // 更新缓存
      this.cache.set(filePath, { code: newCode, ast: newAst });

      return {
        success: true,
        code: newCode,
        changes,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 批量执行编辑操作
   */
  async batchEdit(
    code: string,
    filePath: string,
    requests: AstEditRequest[]
  ): Promise<AstEditResult> {
    let currentCode = code;
    const allChanges: TransformChange[] = [];

    for (const request of requests) {
      const result = await this.edit(currentCode, filePath, request);
      if (!result.success) {
        return result;
      }
      currentCode = result.code!;
      if (result.changes) {
        allChanges.push(...result.changes);
      }
    }

    return {
      success: true,
      code: currentCode,
      changes: allChanges,
    };
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 使指定文件的缓存失效
   */
  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  // 私有方法

  private traverseAST(node: unknown, visitor: (node: unknown, parent: unknown) => void, parent: unknown = null): void {
    if (!node || typeof node !== 'object') return;

    visitor(node, parent);

    const nodeObj = node as Record<string, unknown>;
    for (const key of Object.keys(nodeObj)) {
      const value = nodeObj[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          this.traverseAST(item, visitor, node);
        }
      } else if (value && typeof value === 'object') {
        this.traverseAST(value, visitor, node);
      }
    }
  }

  private transformAST(
    node: unknown,
    transformer: (node: unknown, parent: unknown) => unknown,
    parent: unknown = null
  ): Module {
    if (!node || typeof node !== 'object') return node as Module;

    const transformed = transformer(node, parent);
    const nodeObj = transformed as Record<string, unknown>;

    for (const key of Object.keys(nodeObj)) {
      const value = nodeObj[key];
      if (Array.isArray(value)) {
        nodeObj[key] = value.map(item => this.transformAST(item, transformer, transformed));
      } else if (value && typeof value === 'object') {
        nodeObj[key] = this.transformAST(value, transformer, transformed);
      }
    }

    return nodeObj as unknown as Module;
  }

  private getJsxId(openingElement: Record<string, unknown>): string | null {
    const attributes = openingElement.attributes as unknown[];
    if (!attributes) return null;

    for (const attr of attributes) {
      const attrObj = attr as Record<string, unknown>;
      if (attrObj.type === 'JSXAttribute') {
        const name = attrObj.name as Record<string, unknown>;
        if (name?.value === 'data-jsx-id') {
          const value = attrObj.value as Record<string, unknown>;
          if (value?.type === 'StringLiteral') {
            return value.value as string;
          }
        }
      }
    }

    return null;
  }

  private getElementName(name: unknown): string {
    const nameObj = name as Record<string, unknown>;
    if (!nameObj) return 'unknown';

    if (nameObj.type === 'Identifier') {
      return nameObj.value as string;
    }
    if (nameObj.type === 'JSXMemberExpression') {
      const obj = this.getElementName(nameObj.object);
      const prop = (nameObj.property as Record<string, unknown>)?.value as string;
      return `${obj}.${prop}`;
    }

    return 'unknown';
  }

  private extractAttributes(attrs: unknown[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    if (!attrs) return result;

    for (const attr of attrs) {
      const attrObj = attr as Record<string, unknown>;
      if (attrObj.type === 'JSXAttribute') {
        const name = (attrObj.name as Record<string, unknown>)?.value as string;
        const value = attrObj.value;

        if (!value) {
          result[name] = true;
        } else {
          const valueObj = value as Record<string, unknown>;
          if (valueObj.type === 'StringLiteral') {
            result[name] = valueObj.value;
          } else if (valueObj.type === 'JSXExpressionContainer') {
            result[name] = '[expression]';
          }
        }
      }
    }

    return result;
  }

  private extractTextContent(children: unknown[]): string | undefined {
    if (!children || children.length === 0) return undefined;

    const texts: string[] = [];
    for (const child of children) {
      const childObj = child as Record<string, unknown>;
      if (childObj.type === 'JSXText') {
        const text = (childObj.value as string).trim();
        if (text) texts.push(text);
      }
    }

    return texts.length > 0 ? texts.join(' ') : undefined;
  }

  private extractLocation(span: unknown): JSXNodeInfo['location'] | undefined {
    const spanObj = span as { start: number; end: number } | undefined;
    if (!spanObj) return undefined;

    // SWC 的 span 是字节偏移，这里简化处理
    return {
      start: { line: 0, column: spanObj.start },
      end: { line: 0, column: spanObj.end },
    };
  }

  private applyOperation(
    node: unknown,
    parent: unknown,
    operation: EditOperation,
    changes: TransformChange[]
  ): unknown {
    const nodeObj = node as Record<string, unknown>;

    switch (operation.type) {
      case 'text':
        return this.applyTextOperation(parent, operation.payload.text, changes);

      case 'style':
        return this.applyStyleOperation(nodeObj, operation.payload, changes);

      case 'attribute':
        return this.applyAttributeOperation(
          nodeObj,
          operation.payload.name,
          operation.payload.value,
          changes
        );

      case 'remove':
        // 标记节点为删除
        changes.push({ type: 'remove', path: ['node'], oldValue: node });
        return null;

      default:
        return node;
    }
  }

  private applyTextOperation(
    parent: unknown,
    newText: string,
    changes: TransformChange[]
  ): unknown {
    const parentObj = parent as Record<string, unknown>;
    if (parentObj?.type !== 'JSXElement') return parent;

    const oldChildren = parentObj.children;
    parentObj.children = [this.createJSXText(newText)];

    changes.push({
      type: 'modify',
      path: ['children'],
      oldValue: oldChildren,
      newValue: parentObj.children,
    });

    return parent;
  }

  private applyStyleOperation(
    node: Record<string, unknown>,
    payload: StylePayload,
    changes: TransformChange[]
  ): unknown {
    const attributes = (node.attributes as unknown[]) || [];

    // 处理 className
    if (payload.className !== undefined || payload.addClasses || payload.removeClasses) {
      const classAttrIndex = attributes.findIndex(
        attr => (attr as Record<string, unknown>)?.type === 'JSXAttribute' &&
          ((attr as Record<string, unknown>).name as Record<string, unknown>)?.value === 'className'
      );

      let newClassName: string;
      if (payload.className !== undefined) {
        newClassName = payload.className;
      } else {
        const currentAttr = classAttrIndex >= 0 ? attributes[classAttrIndex] : null;
        const currentValue = currentAttr
          ? ((currentAttr as Record<string, unknown>).value as Record<string, unknown>)?.value as string
          : '';
        const currentClasses = new Set(currentValue.split(/\s+/).filter(Boolean));

        for (const cls of payload.addClasses || []) {
          currentClasses.add(cls);
        }
        for (const cls of payload.removeClasses || []) {
          currentClasses.delete(cls);
        }

        newClassName = Array.from(currentClasses).join(' ');
      }

      const newAttr = this.createJSXAttribute('className', newClassName);

      if (classAttrIndex >= 0) {
        const oldAttr = attributes[classAttrIndex];
        attributes[classAttrIndex] = newAttr;
        changes.push({
          type: 'modify',
          path: ['attributes', 'className'],
          oldValue: oldAttr,
          newValue: newAttr,
        });
      } else {
        attributes.push(newAttr);
        changes.push({
          type: 'add',
          path: ['attributes', 'className'],
          newValue: newAttr,
        });
      }

      node.attributes = attributes;
    }

    // 处理 style（暂时简化处理）
    if (payload.style) {
      // TODO: 实现行内样式处理
    }

    return node;
  }

  private applyAttributeOperation(
    node: Record<string, unknown>,
    name: string,
    value: string | boolean | null,
    changes: TransformChange[]
  ): unknown {
    const attributes = (node.attributes as unknown[]) || [];

    const attrIndex = attributes.findIndex(
      attr => (attr as Record<string, unknown>)?.type === 'JSXAttribute' &&
        ((attr as Record<string, unknown>).name as Record<string, unknown>)?.value === name
    );

    if (value === null) {
      // 删除属性
      if (attrIndex >= 0) {
        const oldAttr = attributes[attrIndex];
        attributes.splice(attrIndex, 1);
        changes.push({
          type: 'remove',
          path: ['attributes', name],
          oldValue: oldAttr,
        });
      }
    } else {
      // 添加或更新属性
      const newAttr = this.createJSXAttribute(name, value);

      if (attrIndex >= 0) {
        const oldAttr = attributes[attrIndex];
        attributes[attrIndex] = newAttr;
        changes.push({
          type: 'modify',
          path: ['attributes', name],
          oldValue: oldAttr,
          newValue: newAttr,
        });
      } else {
        attributes.push(newAttr);
        changes.push({
          type: 'add',
          path: ['attributes', name],
          newValue: newAttr,
        });
      }
    }

    node.attributes = attributes;
    return node;
  }

  private createJSXAttribute(name: string, value: string | boolean): Record<string, unknown> {
    const span = { start: 0, end: 0, ctxt: 0 };

    if (typeof value === 'boolean') {
      return {
        type: 'JSXAttribute',
        span,
        name: { type: 'Identifier', span, value: name, optional: false },
        value: value ? null : { type: 'StringLiteral', span, value: 'false', raw: '"false"' },
      };
    }

    return {
      type: 'JSXAttribute',
      span,
      name: { type: 'Identifier', span, value: name, optional: false },
      value: { type: 'StringLiteral', span, value, raw: JSON.stringify(value) },
    };
  }

  private createJSXText(text: string): Record<string, unknown> {
    return {
      type: 'JSXText',
      span: { start: 0, end: 0, ctxt: 0 },
      value: text,
      raw: text,
    };
  }
}

// 单例实例
export const astEditor = new AstEditorService();

// 便捷函数导出
export async function editCode(
  code: string,
  filePath: string,
  request: AstEditRequest
): Promise<AstEditResult> {
  return astEditor.edit(code, filePath, request);
}

export async function batchEditCode(
  code: string,
  filePath: string,
  requests: AstEditRequest[]
): Promise<AstEditResult> {
  return astEditor.batchEdit(code, filePath, requests);
}

export function findNodes(code: string, filePath: string): JSXNodeInfo[] {
  return astEditor.findAllNodes(code, filePath);
}

export function findNodeById(code: string, filePath: string, jsxId: string): JSXNodeInfo | null {
  return astEditor.findNode(code, filePath, jsxId);
}
