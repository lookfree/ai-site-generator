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

    this.traverseAST(ast, (node: unknown, parent: unknown, _grandparent: unknown) => {
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
   * 根据文本内容查找节点
   * Used for text-based matching when data-jsx-id is not available
   */
  findNodeByText(code: string, filePath: string, textContent: string, tagName?: string): JSXNodeInfo | null {
    const ast = this.parse(code, filePath);
    let foundNode: JSXNodeInfo | null = null;
    const normalizedText = textContent.trim();

    this.traverseAST(ast, (node: unknown, parent: unknown, _grandparent: unknown) => {
      if (foundNode) return; // Already found

      const nodeObj = node as Record<string, unknown>;
      if (nodeObj.type === 'JSXOpeningElement') {
        const parentObj = parent as Record<string, unknown>;
        if (parentObj?.type !== 'JSXElement') return;

        // Check if element name matches (if provided)
        const elementName = this.getElementName(nodeObj.name);
        if (tagName && elementName.toLowerCase() !== tagName.toLowerCase()) return;

        // Extract text content from children
        const children = parentObj.children as unknown[];
        const nodeText = this.extractTextContent(children);

        if (nodeText && nodeText.trim() === normalizedText) {
          foundNode = {
            type: 'JSXElement',
            jsxId: `text-match-${normalizedText.slice(0, 20)}`,
            element: elementName,
            attributes: this.extractAttributes(nodeObj.attributes as unknown[]),
            textContent: nodeText,
            childCount: children?.length || 0,
            location: this.extractLocation(nodeObj.span),
          };
        }
      }
    });

    return foundNode;
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
   * 根据文本内容执行编辑操作
   * This is used when data-jsx-id is not available in source code
   */
  async editByText(
    code: string,
    filePath: string,
    originalText: string,
    newText: string,
    tagName?: string
  ): Promise<AstEditResult> {
    try {
      const ast = this.parse(code, filePath);
      const changes: TransformChange[] = [];
      // 规范化文本：去除首尾空格，合并连续空白字符
      const normalizedOriginal = originalText.trim().replace(/\s+/g, ' ');

      console.log(`[AST] editByText: looking for "${normalizedOriginal.slice(0, 50)}..." (tagName=${tagName})`);

      let modified = false;
      const foundTexts: string[] = [];
      let bestMatch: { parent: Record<string, unknown>; nodeText: string; similarity: number } | null = null;

      // 第一遍：查找匹配或最相似的节点
      this.traverseAST(ast, (node: unknown, parent: unknown, _grandparent: unknown) => {
        const nodeObj = node as Record<string, unknown>;
        if (nodeObj.type === 'JSXOpeningElement') {
          const parentObj = parent as Record<string, unknown>;
          if (parentObj?.type !== 'JSXElement') return;

          // Check element name if provided
          const elementName = this.getElementName(nodeObj.name);
          if (tagName && elementName.toLowerCase() !== tagName.toLowerCase()) return;

          // Check text content
          const children = parentObj.children as unknown[];
          const nodeText = this.extractTextContent(children);

          if (nodeText) {
            const normalizedNodeText = nodeText.trim().replace(/\s+/g, ' ');
            foundTexts.push(`${elementName}: "${normalizedNodeText.slice(0, 50)}..."`);

            // 精确匹配
            if (normalizedNodeText === normalizedOriginal) {
              bestMatch = { parent: parentObj, nodeText, similarity: 1 };
              return;
            }

            // 模糊匹配：检查是否包含原始文本或被包含
            if (!bestMatch || bestMatch.similarity < 1) {
              // 原始文本是节点文本的子串
              if (normalizedNodeText.includes(normalizedOriginal)) {
                const similarity = normalizedOriginal.length / normalizedNodeText.length;
                if (!bestMatch || similarity > bestMatch.similarity) {
                  bestMatch = { parent: parentObj, nodeText, similarity };
                }
              }
              // 节点文本是原始文本的子串（用户可能只选中了部分文字）
              else if (normalizedOriginal.includes(normalizedNodeText)) {
                const similarity = normalizedNodeText.length / normalizedOriginal.length;
                if (!bestMatch || similarity > bestMatch.similarity) {
                  bestMatch = { parent: parentObj, nodeText, similarity };
                }
              }
            }
          }
        }
      });

      // 如果找到了匹配，应用修改
      if (bestMatch !== null) {
        // TypeScript 不追踪回调内的变量变化，需要类型断言
        const match = bestMatch as { parent: Record<string, unknown>; nodeText: string; similarity: number };
        const matchType = match.similarity === 1 ? 'exact' : 'fuzzy';
        console.log(`[AST] Found ${matchType} match (similarity=${match.similarity.toFixed(2)}): "${match.nodeText.slice(0, 50)}..."`);

        // 对于模糊匹配，只有相似度足够高才替换
        if (match.similarity >= 0.5) {
          match.parent.children = [this.createJSXText(newText)];
          changes.push({
            type: 'modify',
            path: ['children'],
            oldValue: match.nodeText,
            newValue: newText,
          });
          modified = true;
        } else {
          console.log(`[AST] Similarity too low (${match.similarity.toFixed(2)}), skipping`);
        }
      }

      if (!modified) {
        console.log(`[AST] No JSX text match found, trying array/object data source...`);
        // 尝试在数组或对象字面量中查找并修改原始文本
        const dataSourceResult = await this.editDataSourceValue(code, filePath, originalText, newText);
        if (dataSourceResult.success) {
          return dataSourceResult;
        }
        console.log(`[AST] No match found. Found these texts:`, foundTexts.slice(0, 10));
        return {
          success: false,
          error: `Text "${normalizedOriginal.slice(0, 50)}..." not found in source code`,
        };
      }

      const newCode = this.generate(ast);
      this.cache.set(filePath, { code: newCode, ast });

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
   * 在数据源（数组或对象字面量）中查找并修改文本值
   * 用于处理循环渲染元素的文本修改
   * 例如: ["All", "Todo"] 或 [{ label: "All" }, { label: "Todo" }]
   */
  async editDataSourceValue(
    code: string,
    filePath: string,
    originalText: string,
    newText: string
  ): Promise<AstEditResult> {
    try {
      const ast = this.parse(code, filePath);
      const changes: TransformChange[] = [];
      const normalizedOriginal = originalText.trim();

      console.log(`[AST] editDataSourceValue: looking for "${normalizedOriginal}" in data sources`);

      let modified = false;
      const foundStrings: string[] = [];

      // 用于存储匹配结果，优先级：数组内精确匹配 > 数组内大小写不敏感 > 其他精确匹配 > 其他大小写不敏感
      let arrayExactMatch: { node: Record<string, unknown>; value: string } | null = null;
      let arrayCaseInsensitiveMatch: { node: Record<string, unknown>; value: string } | null = null;
      let otherExactMatch: { node: Record<string, unknown>; value: string } | null = null;
      let otherCaseInsensitiveMatch: { node: Record<string, unknown>; value: string } | null = null;

      // 遍历 AST 查找包含原始文本的字符串字面量
      this.traverseAST(ast, (node: unknown, parent: unknown, grandparent: unknown) => {
        if (modified) return; // 只修改第一个匹配

        const nodeObj = node as Record<string, unknown>;
        const parentObj = parent as Record<string, unknown> | null;
        const grandparentObj = grandparent as Record<string, unknown> | null;

        // 匹配字符串字面量 (用于数组元素或对象属性值)
        if (nodeObj.type === 'StringLiteral') {
          const value = nodeObj.value as string;
          // 只记录短字符串（避免日志过长）
          if (value.length < 50) {
            foundStrings.push(`"${value}"`);
          }

          const trimmedValue = value.trim();

          // 检查是否在数组内
          // 在 SWC AST 中，数组元素被包装在 ExprOrSpread 中: ArrayExpression -> elements[] -> { expression: StringLiteral }
          // 所以 StringLiteral 的直接父节点是 ExprOrSpread（没有 type），祖父节点是 ArrayExpression
          const isInArray = grandparentObj?.type === 'ArrayExpression' ||
            (parentObj && !parentObj.type && parentObj.expression === nodeObj && grandparentObj?.type === 'ArrayExpression');

          // 调试：打印与目标匹配的字符串的父节点类型
          if (trimmedValue.toLowerCase() === normalizedOriginal.toLowerCase()) {
            console.log(`[AST] Debug: Found "${value}", parent type: ${parentObj?.type}, grandparent type: ${grandparentObj?.type}, isInArray: ${isInArray}`);
          }

          // 1. 精确匹配（大小写敏感）
          if (trimmedValue === normalizedOriginal) {
            if (isInArray && !arrayExactMatch) {
              arrayExactMatch = { node: nodeObj, value };
            } else if (!isInArray && !otherExactMatch) {
              otherExactMatch = { node: nodeObj, value };
            }
          }
          // 2. 大小写不敏感匹配
          else if (trimmedValue.toLowerCase() === normalizedOriginal.toLowerCase()) {
            if (isInArray && !arrayCaseInsensitiveMatch) {
              arrayCaseInsensitiveMatch = { node: nodeObj, value };
            } else if (!isInArray && !otherCaseInsensitiveMatch) {
              otherCaseInsensitiveMatch = { node: nodeObj, value };
            }
          }
        }

        // 匹配模板字符串中的静态部分 (无表达式的模板字符串)
        if (nodeObj.type === 'TemplateLiteral') {
          const quasis = nodeObj.quasis as Array<Record<string, unknown>> | undefined;
          const expressions = nodeObj.expressions as unknown[] | undefined;

          // 只处理没有表达式的纯模板字符串
          if (quasis && quasis.length === 1 && (!expressions || expressions.length === 0)) {
            const quasi = quasis[0];
            const cooked = (quasi.cooked as string) || '';
            if (cooked.trim() === normalizedOriginal) {
              console.log(`[AST] Found TemplateLiteral match: "${cooked}"`);
              quasi.cooked = newText;
              quasi.raw = newText;
              changes.push({
                type: 'modify',
                path: ['quasis', '0', 'cooked'],
                oldValue: cooked,
                newValue: newText,
              });
              modified = true;
            }
          }
        }
      });

      // 选择最佳匹配，优先级：数组内精确 > 数组内大小写不敏感 > 其他精确 > 其他大小写不敏感
      const bestMatch = arrayExactMatch || arrayCaseInsensitiveMatch || otherExactMatch || otherCaseInsensitiveMatch;
      const isExactMatch = bestMatch === arrayExactMatch || bestMatch === otherExactMatch;
      const isInArrayMatch = bestMatch === arrayExactMatch || bestMatch === arrayCaseInsensitiveMatch;

      if (!modified && bestMatch !== null) {
        const match = bestMatch as { node: Record<string, unknown>; value: string };
        const { node: matchNode, value: matchValue } = match;

        const matchType = isExactMatch ? 'exact' : 'case-insensitive';
        const location = isInArrayMatch ? 'in array' : 'other location';
        console.log(`[AST] Found ${matchType} StringLiteral match (${location}): "${matchValue}" (searching for "${normalizedOriginal}")`);

        let finalNewText = newText;

        // 对于非精确匹配，保持原始字符串的大小写风格
        if (!isExactMatch) {
          const originalWasLowerCase = matchValue === matchValue.toLowerCase();
          const originalWasUpperCase = matchValue === matchValue.toUpperCase();
          const originalWasCapitalized = matchValue.charAt(0) === matchValue.charAt(0).toUpperCase() &&
            matchValue.slice(1) === matchValue.slice(1).toLowerCase();

          if (originalWasLowerCase && newText !== newText.toLowerCase()) {
            finalNewText = newText.toLowerCase();
            console.log(`[AST] Preserving lowercase style: "${newText}" -> "${finalNewText}"`);
          } else if (originalWasUpperCase && newText !== newText.toUpperCase()) {
            finalNewText = newText.toUpperCase();
            console.log(`[AST] Preserving uppercase style: "${newText}" -> "${finalNewText}"`);
          } else if (originalWasCapitalized) {
            finalNewText = newText.charAt(0).toUpperCase() + newText.slice(1).toLowerCase();
            console.log(`[AST] Preserving capitalized style: "${newText}" -> "${finalNewText}"`);
          }
        }

        matchNode.value = finalNewText;
        if (matchNode.raw) {
          const quote = (matchNode.raw as string).charAt(0);
          matchNode.raw = `${quote}${finalNewText}${quote}`;
        }
        changes.push({
          type: 'modify',
          path: ['value'],
          oldValue: matchValue,
          newValue: finalNewText,
        });
        modified = true;
      }

      if (!modified) {
        console.log(`[AST] No data source match found for "${normalizedOriginal}". Found strings:`, foundStrings.slice(0, 20));
        return {
          success: false,
          error: `Text "${normalizedOriginal}" not found in data sources`,
        };
      }

      const newCode = this.generate(ast);
      this.cache.set(filePath, { code: newCode, ast });

      // Debug: 检查生成的代码是否包含新值
      const hasNewValue = newCode.includes(changes[0]?.newValue as string || '');
      const hasOldValue = newCode.includes(changes[0]?.oldValue as string || '');
      console.log(`[AST] Successfully modified data source value. newValue in code: ${hasNewValue}, oldValue still in code: ${hasOldValue}`);

      // 显示修改附近的代码片段
      const newValueStr = changes[0]?.newValue as string || '';
      if (newValueStr) {
        const idx = newCode.indexOf(newValueStr);
        if (idx >= 0) {
          console.log(`[AST] Code snippet around change: ...${newCode.substring(Math.max(0, idx - 30), idx + newValueStr.length + 30)}...`);
        }
      }

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
   * 根据 className 查找节点
   * Used for className-based matching when position matching fails
   */
  findNodeByClassName(code: string, filePath: string, className: string, tagName?: string): JSXNodeInfo | null {
    const ast = this.parse(code, filePath);
    let foundNode: JSXNodeInfo | null = null;
    const normalizedClassName = className.trim();

    this.traverseAST(ast, (node: unknown, parent: unknown, _grandparent: unknown) => {
      if (foundNode) return; // Already found

      const nodeObj = node as Record<string, unknown>;
      if (nodeObj.type === 'JSXOpeningElement') {
        const parentObj = parent as Record<string, unknown>;
        if (parentObj?.type !== 'JSXElement') return;

        // Check if element name matches (if provided)
        const elementName = this.getElementName(nodeObj.name);
        if (tagName && elementName.toLowerCase() !== tagName.toLowerCase()) return;

        // Extract className from attributes
        const attributes = this.extractAttributes(nodeObj.attributes as unknown[]);
        const nodeClassName = (attributes.className as string) || '';

        if (nodeClassName.trim() === normalizedClassName) {
          foundNode = {
            type: 'JSXElement',
            jsxId: `class-match-${normalizedClassName.slice(0, 30)}`,
            element: elementName,
            attributes,
            textContent: this.extractTextContent((parentObj.children as unknown[])),
            childCount: ((parentObj.children as unknown[])?.length || 0),
            location: this.extractLocation(nodeObj.span),
          };
        }
      }
    });

    return foundNode;
  }

  /**
   * 根据 className 执行编辑操作
   * This is used when position matching fails - finds element by its current className
   */
  async editByClassName(
    code: string,
    filePath: string,
    oldClassName: string,
    operation: EditOperation,
    tagName?: string
  ): Promise<AstEditResult> {
    try {
      const ast = this.parse(code, filePath);
      const changes: TransformChange[] = [];
      const normalizedClassName = oldClassName.trim();

      let modified = false;
      const newAst = this.transformAST(ast, (node: unknown, parent: unknown) => {
        if (modified) return node; // Only modify first match

        const nodeObj = node as Record<string, unknown>;
        if (nodeObj.type === 'JSXOpeningElement') {
          const parentObj = parent as Record<string, unknown>;
          if (parentObj?.type !== 'JSXElement') return node;

          // Check element name if provided
          const elementName = this.getElementName(nodeObj.name);
          if (tagName && elementName.toLowerCase() !== tagName.toLowerCase()) return node;

          // Check className
          const attributes = nodeObj.attributes as unknown[];
          const classAttrIndex = attributes?.findIndex(
            attr => (attr as Record<string, unknown>)?.type === 'JSXAttribute' &&
              ((attr as Record<string, unknown>).name as Record<string, unknown>)?.value === 'className'
          ) ?? -1;

          if (classAttrIndex >= 0) {
            const classAttr = attributes[classAttrIndex] as Record<string, unknown>;
            const classValue = (classAttr.value as Record<string, unknown>)?.value as string;
            if (classValue?.trim() === normalizedClassName) {
              modified = true;
              return this.applyOperation(node, parent, operation, changes);
            }
          }
        }
        return node;
      });

      if (!modified) {
        return {
          success: false,
          error: `Element with className "${normalizedClassName.slice(0, 50)}..." not found in source code`,
        };
      }

      const newCode = this.generate(newAst);
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
   * 根据源代码位置执行编辑操作
   * Uses line and column information injected by jsx-id-plugin
   */
  async editByPosition(
    code: string,
    filePath: string,
    line: number,
    column: number,
    operation: EditOperation
  ): Promise<AstEditResult> {
    try {
      const ast = this.parse(code, filePath);
      const changes: TransformChange[] = [];

      // 将代码转换为行数组，计算每行的字节偏移
      const lines = code.split('\n');
      const lineOffsets = [0];
      for (let i = 0; i < lines.length; i++) {
        // 使用 Buffer.byteLength 计算多字节字符（如中文）的正确字节长度
        lineOffsets.push(lineOffsets[i] + Buffer.byteLength(lines[i], 'utf8') + 1); // +1 for newline
      }

      // 计算目标位置的字节偏移 (SWC 使用字节偏移)
      // Babel 的 column 是字符偏移，需要转换为字节偏移
      const lineContent = lines[line - 1] || '';
      const columnBytes = Buffer.byteLength(lineContent.substring(0, column), 'utf8');
      const targetOffset = lineOffsets[line - 1] + columnBytes;

      console.log(`[AST] editByPosition: line=${line}, col=${column}, targetOffset=${targetOffset}, lineContent="${lineContent.substring(0, 50)}..."`);

      let modified = false;
      let bestMatch: { node: unknown; parent: unknown; diff: number } | null = null;

      // 第一遍：找到最接近目标位置的节点
      // 收集同一行所有的 JSXOpeningElement，选择最接近目标位置的
      const lineStart = lineOffsets[line - 1];
      const lineEnd = line < lineOffsets.length ? lineOffsets[line] : code.length;

      this.traverseAST(ast, (node: unknown, parent: unknown, _grandparent: unknown) => {
        const nodeObj = node as Record<string, unknown>;
        if (nodeObj.type === 'JSXOpeningElement') {
          const span = nodeObj.span as { start: number; end: number } | undefined;
          if (span) {
            // 检查节点是否在目标行范围内
            const isOnTargetLine = span.start >= lineStart && span.start < lineEnd;
            const diff = Math.abs(span.start - targetOffset);

            // 允许 50 字节误差，或者节点在同一行
            const tolerance = 50;
            if (diff <= tolerance || isOnTargetLine) {
              if (!bestMatch || diff < bestMatch.diff) {
                bestMatch = { node, parent, diff };
              }
            }
          }
        }
      });

      if (bestMatch !== null) {
        // TypeScript 不追踪回调内的变量变化，需要类型断言
        const match = bestMatch as { node: unknown; parent: unknown; diff: number };
        console.log(`[AST] Found match with diff=${match.diff}`);
        // 第二遍：应用修改
        const newAst = this.transformAST(ast, (node: unknown, parent: unknown) => {
          if (modified) return node;
          if (node === match.node) {
            modified = true;
            return this.applyOperation(node, parent, operation, changes);
          }
          return node;
        });

        if (modified) {
          const newCode = this.generate(newAst);
          this.cache.set(filePath, { code: newCode, ast: newAst });
          return {
            success: true,
            code: newCode,
            changes,
          };
        }
      }

      console.log(`[AST] No match found at line ${line}, column ${column} (targetOffset=${targetOffset})`);
      return {
        success: false,
        error: `No JSX element found at line ${line}, column ${column}`,
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

  private traverseAST(
    node: unknown,
    visitor: (node: unknown, parent: unknown, grandparent: unknown) => void,
    parent: unknown = null,
    grandparent: unknown = null,
    depth: number = 0
  ): void {
    // Prevent stack overflow with depth limit
    const MAX_DEPTH = 500;
    if (depth > MAX_DEPTH) return;

    if (!node || typeof node !== 'object') return;

    visitor(node, parent, grandparent);

    const nodeObj = node as Record<string, unknown>;
    for (const key of Object.keys(nodeObj)) {
      // Skip internal SWC properties that shouldn't be traversed
      if (key === 'span' || key === 'ctxt') continue;

      const value = nodeObj[key];
      if (Array.isArray(value)) {
        for (const item of value) {
          this.traverseAST(item, visitor, node, parent, depth + 1);
        }
      } else if (value && typeof value === 'object') {
        this.traverseAST(value, visitor, node, parent, depth + 1);
      }
    }
  }

  private transformAST(
    node: unknown,
    transformer: (node: unknown, parent: unknown) => unknown,
    parent: unknown = null,
    depth: number = 0
  ): Module {
    // Prevent stack overflow with depth limit
    const MAX_DEPTH = 500;
    if (depth > MAX_DEPTH) {
      return node as Module;
    }

    if (!node || typeof node !== 'object') return node as Module;

    const transformed = transformer(node, parent);
    const nodeObj = transformed as Record<string, unknown>;

    for (const key of Object.keys(nodeObj)) {
      // Skip internal SWC properties that shouldn't be traversed
      if (key === 'span' || key === 'ctxt') continue;

      const value = nodeObj[key];
      if (Array.isArray(value)) {
        nodeObj[key] = value.map(item => this.transformAST(item, transformer, transformed, depth + 1));
      } else if (value && typeof value === 'object') {
        nodeObj[key] = this.transformAST(value, transformer, transformed, depth + 1);
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
        // 修改 parent 的 children，但返回原 node（不改变 AST 结构）
        this.applyTextOperation(parent, operation.payload.text, changes);
        return node;

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

    const oldChildren = parentObj.children as unknown[] | undefined;
    if (Array.isArray(oldChildren)) {
      const hasJsxText = oldChildren.some(child => {
        const childObj = child as Record<string, unknown>;
        return childObj.type === 'JSXText' && String(childObj.value || '').trim().length > 0;
      });
      const hasExpression = oldChildren.some(child => {
        const childObj = child as Record<string, unknown>;
        return childObj.type === 'JSXExpressionContainer';
      });
      if (!hasJsxText && hasExpression) {
        const expressionContainers = oldChildren.filter(child => {
          const childObj = child as Record<string, unknown>;
          return childObj.type === 'JSXExpressionContainer';
        }) as Array<Record<string, unknown>>;
        const allLiteralExpressions = expressionContainers.every(container => {
          const expr = container.expression as Record<string, unknown> | undefined;
          if (!expr) return false;
          if (expr.type === 'StringLiteral') return true;
          if (expr.type === 'TemplateLiteral') {
            const expressions = expr.expressions as unknown[] | undefined;
            return !expressions || expressions.length === 0;
          }
          return false;
        });

        if (!allLiteralExpressions) {
        throw new Error('Text is generated by a JSX expression and cannot be edited directly');
        }
      }
    }

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

export async function editCodeByText(
  code: string,
  filePath: string,
  originalText: string,
  newText: string,
  tagName?: string
): Promise<AstEditResult> {
  return astEditor.editByText(code, filePath, originalText, newText, tagName);
}

export async function editCodeByPosition(
  code: string,
  filePath: string,
  line: number,
  column: number,
  operation: EditOperation
): Promise<AstEditResult> {
  return astEditor.editByPosition(code, filePath, line, column, operation);
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

export function findNodeByText(
  code: string,
  filePath: string,
  textContent: string,
  tagName?: string
): JSXNodeInfo | null {
  return astEditor.findNodeByText(code, filePath, textContent, tagName);
}

export function findNodeByClassName(
  code: string,
  filePath: string,
  className: string,
  tagName?: string
): JSXNodeInfo | null {
  return astEditor.findNodeByClassName(code, filePath, className, tagName);
}

export async function editCodeByClassName(
  code: string,
  filePath: string,
  oldClassName: string,
  operation: EditOperation,
  tagName?: string
): Promise<AstEditResult> {
  return astEditor.editByClassName(code, filePath, oldClassName, operation, tagName);
}

// Re-export unified interface types (adapter should be imported separately to avoid circular deps)
export type {
  IASTProcessor,
  TransformRequest,
  TransformOperation,
  TransformResult,
  TextOperation,
  TextPayload,
  StyleOperation,
  StylePayload as UnifiedStylePayload,
  AttributeOperation,
  AttributePayload,
  RemoveOperation,
  InsertOperation,
  InsertPayload,
  TransformChange as UnifiedTransformChange,
  JSXNodeInfo as UnifiedJSXNodeInfo,
  NodeLocation,
  TailwindMappingResult,
} from './types';

// Note: For the unified IASTProcessor interface, import from './adapter' directly:
// import { ASTProcessorAdapter, astProcessor } from './services/ast/adapter';
