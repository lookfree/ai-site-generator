# SPEC-0002: AST 处理系统

> **阶段**: M2 (第 3-4 周)
> **状态**: 待开始
> **优先级**: P0 - 核心功能
> **依赖**: SPEC-0001

---

## 1. 目标概述

### 1.1 核心目标

实现客户端 AST 处理系统，支持安全的声明式代码修改，替代当前的字符串/正则操作方式。

### 1.2 交付物清单

| 序号 | 交付物 | 描述 | 验收标准 |
|------|--------|------|---------|
| D1 | SWC WASM 集成 | 浏览器端 AST 解析 | 可解析 TSX 代码为 AST |
| D2 | AST 遍历器 | 节点查找和遍历 | 可通过 JSX ID 定位节点 |
| D3 | AST 变换器 | 代码修改操作 | 支持文本/样式/属性修改 |
| D4 | 代码生成器 | AST 转回代码 | 保留格式和注释 |
| D5 | Tailwind 映射器 | CSS → Tailwind | 自动生成 Tailwind 类名 |

---

## 2. 技术规格

### 2.1 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        AST 处理系统                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   源代码    │───▶│  SWC 解析   │───▶│    AST     │         │
│  │   (TSX)     │    │   (WASM)    │    │   (JSON)   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                              │                   │
│                                              ▼                   │
│                     ┌────────────────────────────────────┐      │
│                     │          AST 处理管线               │      │
│                     │  ┌──────────┐  ┌──────────────┐   │      │
│                     │  │  遍历器  │──│ JSX ID 定位  │   │      │
│                     │  └──────────┘  └──────────────┘   │      │
│                     │        │                           │      │
│                     │        ▼                           │      │
│                     │  ┌──────────────────────────┐     │      │
│                     │  │       变换器集合          │     │      │
│                     │  │ ┌────────┐ ┌──────────┐ │     │      │
│                     │  │ │ 文本   │ │ 样式     │ │     │      │
│                     │  │ └────────┘ └──────────┘ │     │      │
│                     │  │ ┌────────┐ ┌──────────┐ │     │      │
│                     │  │ │ 属性   │ │ 结构     │ │     │      │
│                     │  │ └────────┘ └──────────┘ │     │      │
│                     │  └──────────────────────────┘     │      │
│                     └────────────────────────────────────┘      │
│                                              │                   │
│                                              ▼                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐         │
│  │   新代码    │◀───│  代码生成   │◀───│   新 AST   │         │
│  │   (TSX)     │    │   (SWC)     │    │   (JSON)   │         │
│  └─────────────┘    └─────────────┘    └─────────────┘         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 文件结构

```
packages/ast-processor/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                 # 主入口
│   ├── parser/
│   │   ├── index.ts             # 解析器入口
│   │   ├── swc-wasm.ts          # SWC WASM 封装
│   │   └── types.ts             # AST 类型定义
│   ├── traverser/
│   │   ├── index.ts             # 遍历器
│   │   ├── visitor.ts           # 访问者模式实现
│   │   └── jsx-locator.ts       # JSX ID 定位器
│   ├── transformers/
│   │   ├── index.ts             # 变换器入口
│   │   ├── text.ts              # 文本变换
│   │   ├── style.ts             # 样式变换
│   │   ├── attribute.ts         # 属性变换
│   │   ├── structure.ts         # 结构变换
│   │   └── base.ts              # 基础变换类
│   ├── generator/
│   │   ├── index.ts             # 代码生成器
│   │   └── printer.ts           # 代码打印器
│   ├── tailwind/
│   │   ├── index.ts             # Tailwind 入口
│   │   ├── mapper.ts            # CSS → Tailwind 映射
│   │   ├── merger.ts            # 类名合并器
│   │   └── presets.ts           # 预设映射表
│   └── utils/
│       ├── clone.ts             # AST 深拷贝
│       └── compare.ts           # AST 比较
├── tests/
│   ├── parser.test.ts
│   ├── traverser.test.ts
│   ├── transformers.test.ts
│   ├── generator.test.ts
│   ├── tailwind.test.ts
│   └── fixtures/
└── README.md
```

---

### 2.3 SWC WASM 集成

#### 2.3.1 初始化和配置

```typescript
// src/parser/swc-wasm.ts

import initSwc, {
  parseSync as swcParseSync,
  printSync as swcPrintSync,
  transformSync as swcTransformSync
} from '@swc/wasm-web';

let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * 初始化 SWC WASM 模块
 * 支持并发调用，只初始化一次
 */
export async function initSWC(): Promise<void> {
  if (initialized) return;

  if (!initPromise) {
    initPromise = (async () => {
      await initSwc();
      initialized = true;
    })();
  }

  await initPromise;
}

/**
 * 检查是否已初始化
 */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * 解析配置
 */
export interface ParseOptions {
  syntax: 'typescript' | 'ecmascript';
  tsx?: boolean;
  jsx?: boolean;
  decorators?: boolean;
  dynamicImport?: boolean;
}

const DEFAULT_PARSE_OPTIONS: ParseOptions = {
  syntax: 'typescript',
  tsx: true,
  decorators: true,
  dynamicImport: true,
};

/**
 * 解析代码为 AST
 */
export async function parse(
  code: string,
  options: Partial<ParseOptions> = {}
): Promise<any> {
  await initSWC();

  const mergedOptions = { ...DEFAULT_PARSE_OPTIONS, ...options };

  return swcParseSync(code, {
    syntax: mergedOptions.syntax,
    tsx: mergedOptions.tsx,
    decorators: mergedOptions.decorators,
    dynamicImport: mergedOptions.dynamicImport,
  });
}

/**
 * 打印配置
 */
export interface PrintOptions {
  minify?: boolean;
  isModule?: boolean;
}

const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  minify: false,
  isModule: true,
};

/**
 * 将 AST 打印为代码
 */
export async function print(
  ast: any,
  options: Partial<PrintOptions> = {}
): Promise<string> {
  await initSWC();

  const mergedOptions = { ...DEFAULT_PRINT_OPTIONS, ...options };

  const result = swcPrintSync(ast, mergedOptions);
  return result.code;
}
```

#### 2.3.2 高级解析器

```typescript
// src/parser/index.ts

import { parse, print, initSWC } from './swc-wasm';
import type { Module, Program } from './types';

export interface ParsedModule {
  ast: Module;
  sourceCode: string;
  filePath: string;
}

export class Parser {
  private cache = new Map<string, ParsedModule>();

  async initialize(): Promise<void> {
    await initSWC();
  }

  /**
   * 解析 TSX/JSX 文件
   */
  async parseFile(code: string, filePath: string): Promise<ParsedModule> {
    // 检查缓存
    const cacheKey = `${filePath}:${this.hashCode(code)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const ast = await parse(code, {
      syntax: 'typescript',
      tsx: filePath.endsWith('.tsx') || filePath.endsWith('.jsx'),
    });

    const result: ParsedModule = {
      ast,
      sourceCode: code,
      filePath,
    };

    // 缓存结果
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * 将 AST 转换回代码
   */
  async generate(ast: Module): Promise<string> {
    return print(ast, { minify: false });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 从缓存中移除特定文件
   */
  invalidate(filePath: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(filePath)) {
        this.cache.delete(key);
      }
    }
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

export const parser = new Parser();
```

---

### 2.4 AST 遍历器

#### 2.4.1 访问者模式

```typescript
// src/traverser/visitor.ts

export type NodeType =
  | 'Module'
  | 'ExportDefaultExpression'
  | 'FunctionDeclaration'
  | 'FunctionExpression'
  | 'ArrowFunctionExpression'
  | 'ReturnStatement'
  | 'JSXElement'
  | 'JSXOpeningElement'
  | 'JSXClosingElement'
  | 'JSXAttribute'
  | 'JSXSpreadAttribute'
  | 'JSXText'
  | 'JSXExpressionContainer'
  | 'JSXFragment'
  | 'StringLiteral'
  | 'Identifier'
  // ... 其他节点类型

export interface VisitorContext {
  parent: any | null;
  parentPath: string[];
  depth: number;
  stop: () => void;
  skip: () => void;
}

export type VisitorFunction = (node: any, context: VisitorContext) => void;

export interface Visitor {
  [key: string]: VisitorFunction | {
    enter?: VisitorFunction;
    exit?: VisitorFunction;
  };
}

/**
 * 遍历 AST
 */
export function traverse(ast: any, visitor: Visitor): void {
  let shouldStop = false;

  function visit(node: any, parent: any, parentPath: string[], depth: number): void {
    if (!node || typeof node !== 'object' || shouldStop) return;

    let shouldSkip = false;

    const context: VisitorContext = {
      parent,
      parentPath,
      depth,
      stop: () => { shouldStop = true; },
      skip: () => { shouldSkip = true; },
    };

    const nodeType = node.type;

    // 调用 enter 回调
    if (nodeType && visitor[nodeType]) {
      const handler = visitor[nodeType];
      if (typeof handler === 'function') {
        handler(node, context);
      } else if (handler.enter) {
        handler.enter(node, context);
      }
    }

    if (shouldStop || shouldSkip) return;

    // 递归遍历子节点
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'span') continue;

      const child = node[key];
      const childPath = [...parentPath, key];

      if (Array.isArray(child)) {
        child.forEach((item, index) => {
          visit(item, node, [...childPath, String(index)], depth + 1);
        });
      } else if (child && typeof child === 'object') {
        visit(child, node, childPath, depth + 1);
      }
    }

    // 调用 exit 回调
    if (nodeType && visitor[nodeType]) {
      const handler = visitor[nodeType];
      if (typeof handler === 'object' && handler.exit) {
        handler.exit(node, context);
      }
    }
  }

  visit(ast, null, [], 0);
}
```

#### 2.4.2 JSX ID 定位器

```typescript
// src/traverser/jsx-locator.ts

import { traverse } from './visitor';

export interface JSXNodeInfo {
  node: any;
  parent: any;
  path: string[];
  jsxId: string;
  element: string;
  attributes: Map<string, any>;
  children: any[];
}

/**
 * 根据 JSX ID 查找节点
 */
export function findNodeByJsxId(ast: any, jsxId: string): JSXNodeInfo | null {
  let result: JSXNodeInfo | null = null;

  traverse(ast, {
    JSXOpeningElement(node, context) {
      // 查找 data-jsx-id 属性
      const idAttr = node.attributes?.find((attr: any) => {
        if (attr.type !== 'JSXAttribute') return false;
        if (attr.name?.type !== 'Identifier') return false;
        return attr.name.value === 'data-jsx-id';
      });

      if (idAttr?.value?.value === jsxId) {
        // 找到匹配的元素
        const elementName = getElementName(node.name);

        result = {
          node,
          parent: context.parent,
          path: context.parentPath,
          jsxId,
          element: elementName,
          attributes: extractAttributes(node.attributes),
          children: context.parent?.children || [],
        };

        context.stop();
      }
    },
  });

  return result;
}

/**
 * 获取所有带 JSX ID 的节点
 */
export function findAllJsxNodes(ast: any): JSXNodeInfo[] {
  const results: JSXNodeInfo[] = [];

  traverse(ast, {
    JSXOpeningElement(node, context) {
      const idAttr = node.attributes?.find((attr: any) => {
        if (attr.type !== 'JSXAttribute') return false;
        return attr.name?.value === 'data-jsx-id';
      });

      if (idAttr?.value?.value) {
        results.push({
          node,
          parent: context.parent,
          path: context.parentPath,
          jsxId: idAttr.value.value,
          element: getElementName(node.name),
          attributes: extractAttributes(node.attributes),
          children: context.parent?.children || [],
        });
      }
    },
  });

  return results;
}

/**
 * 根据文件位置查找节点
 */
export function findNodeByLocation(
  ast: any,
  line: number,
  column: number
): JSXNodeInfo | null {
  let result: JSXNodeInfo | null = null;
  let closestDistance = Infinity;

  traverse(ast, {
    JSXOpeningElement(node, context) {
      const span = node.span;
      if (!span) return;

      // 计算距离
      const nodeLine = span.start.line;
      const nodeCol = span.start.column;
      const distance = Math.abs(nodeLine - line) * 1000 + Math.abs(nodeCol - column);

      if (distance < closestDistance) {
        closestDistance = distance;

        const idAttr = node.attributes?.find((attr: any) =>
          attr.name?.value === 'data-jsx-id'
        );

        result = {
          node,
          parent: context.parent,
          path: context.parentPath,
          jsxId: idAttr?.value?.value || '',
          element: getElementName(node.name),
          attributes: extractAttributes(node.attributes),
          children: context.parent?.children || [],
        };
      }
    },
  });

  return result;
}

function getElementName(name: any): string {
  if (name.type === 'Identifier') {
    return name.value;
  }
  if (name.type === 'JSXMemberExpression') {
    return `${getElementName(name.object)}.${name.property.value}`;
  }
  return 'unknown';
}

function extractAttributes(attrs: any[]): Map<string, any> {
  const result = new Map<string, any>();

  for (const attr of attrs || []) {
    if (attr.type === 'JSXAttribute' && attr.name?.value) {
      const name = attr.name.value;
      const value = extractAttributeValue(attr.value);
      result.set(name, value);
    }
  }

  return result;
}

function extractAttributeValue(value: any): any {
  if (!value) return true; // 布尔属性
  if (value.type === 'StringLiteral') return value.value;
  if (value.type === 'JSXExpressionContainer') {
    // 表达式容器，返回原始节点
    return value.expression;
  }
  return value;
}
```

---

### 2.5 AST 变换器

#### 2.5.1 基础变换器

```typescript
// src/transformers/base.ts

import { findNodeByJsxId, JSXNodeInfo } from '../traverser/jsx-locator';
import { cloneDeep } from '../utils/clone';

export interface TransformResult {
  success: boolean;
  ast: any;
  error?: string;
  changes?: TransformChange[];
}

export interface TransformChange {
  type: 'add' | 'modify' | 'remove';
  path: string[];
  oldValue?: any;
  newValue?: any;
}

export abstract class BaseTransformer {
  protected ast: any;
  protected changes: TransformChange[] = [];

  constructor(ast: any) {
    // 深拷贝 AST，避免修改原始数据
    this.ast = cloneDeep(ast);
  }

  abstract transform(jsxId: string, payload: any): TransformResult;

  protected findNode(jsxId: string): JSXNodeInfo | null {
    return findNodeByJsxId(this.ast, jsxId);
  }

  protected recordChange(change: TransformChange): void {
    this.changes.push(change);
  }

  protected createResult(success: boolean, error?: string): TransformResult {
    return {
      success,
      ast: this.ast,
      error,
      changes: this.changes,
    };
  }
}
```

#### 2.5.2 文本变换器

```typescript
// src/transformers/text.ts

import { BaseTransformer, TransformResult } from './base';

export interface TextPayload {
  text: string;
}

export class TextTransformer extends BaseTransformer {
  transform(jsxId: string, payload: TextPayload): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { parent } = nodeInfo;

    // 确保父节点是 JSXElement
    if (parent?.type !== 'JSXElement') {
      return this.createResult(false, 'Parent is not a JSX element');
    }

    // 记录旧值
    const oldChildren = parent.children;

    // 更新 children 为新的文本节点
    parent.children = [{
      type: 'JSXText',
      value: payload.text,
      raw: payload.text,
    }];

    this.recordChange({
      type: 'modify',
      path: [...nodeInfo.path.slice(0, -1), 'children'],
      oldValue: oldChildren,
      newValue: parent.children,
    });

    return this.createResult(true);
  }
}

/**
 * 更新文本内容的便捷函数
 */
export function updateText(ast: any, jsxId: string, text: string): TransformResult {
  const transformer = new TextTransformer(ast);
  return transformer.transform(jsxId, { text });
}
```

#### 2.5.3 样式变换器

```typescript
// src/transformers/style.ts

import { BaseTransformer, TransformResult } from './base';

export interface StylePayload {
  className?: string;
  addClasses?: string[];
  removeClasses?: string[];
  style?: Record<string, string>;
}

export class StyleTransformer extends BaseTransformer {
  transform(jsxId: string, payload: StylePayload): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { node, attributes } = nodeInfo;

    // 处理 className
    if (payload.className !== undefined || payload.addClasses || payload.removeClasses) {
      this.updateClassName(node, attributes, payload);
    }

    // 处理 style
    if (payload.style) {
      this.updateStyle(node, payload.style);
    }

    return this.createResult(true);
  }

  private updateClassName(
    node: any,
    currentAttrs: Map<string, any>,
    payload: StylePayload
  ): void {
    let newClassName: string;

    if (payload.className !== undefined) {
      // 完全替换
      newClassName = payload.className;
    } else {
      // 增量修改
      const currentClassName = currentAttrs.get('className') || '';
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

  private updateStyle(node: any, style: Record<string, string>): void {
    // 将 style 对象转换为 JSX 表达式
    const styleEntries = Object.entries(style)
      .map(([key, value]) => `${this.camelCase(key)}: "${value}"`)
      .join(', ');

    const styleExpression = `{ ${styleEntries} }`;

    // 创建 JSXExpressionContainer
    const styleAttr = {
      type: 'JSXAttribute',
      name: { type: 'Identifier', value: 'style' },
      value: {
        type: 'JSXExpressionContainer',
        expression: {
          type: 'ObjectExpression',
          properties: Object.entries(style).map(([key, value]) => ({
            type: 'KeyValueProperty',
            key: { type: 'Identifier', value: this.camelCase(key) },
            value: { type: 'StringLiteral', value },
          })),
        },
      },
    };

    this.setOrUpdateAttribute(node, 'style', styleAttr);
  }

  private setAttributeValue(node: any, name: string, value: string): void {
    const attr = node.attributes?.find(
      (a: any) => a.type === 'JSXAttribute' && a.name?.value === name
    );

    if (attr) {
      // 更新现有属性
      attr.value = { type: 'StringLiteral', value };

      this.recordChange({
        type: 'modify',
        path: [...this.findAttributePath(node, name)],
        newValue: value,
      });
    } else {
      // 添加新属性
      const newAttr = {
        type: 'JSXAttribute',
        name: { type: 'Identifier', value: name },
        value: { type: 'StringLiteral', value },
      };

      node.attributes = node.attributes || [];
      node.attributes.push(newAttr);

      this.recordChange({
        type: 'add',
        path: [],
        newValue: newAttr,
      });
    }
  }

  private setOrUpdateAttribute(node: any, name: string, newAttr: any): void {
    const existingIndex = node.attributes?.findIndex(
      (a: any) => a.type === 'JSXAttribute' && a.name?.value === name
    );

    if (existingIndex >= 0) {
      node.attributes[existingIndex] = newAttr;
    } else {
      node.attributes = node.attributes || [];
      node.attributes.push(newAttr);
    }
  }

  private findAttributePath(node: any, name: string): string[] {
    const index = node.attributes?.findIndex(
      (a: any) => a.name?.value === name
    );
    return index >= 0 ? ['attributes', String(index)] : [];
  }

  private camelCase(str: string): string {
    return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }
}

/**
 * 更新样式的便捷函数
 */
export function updateStyle(ast: any, jsxId: string, payload: StylePayload): TransformResult {
  const transformer = new StyleTransformer(ast);
  return transformer.transform(jsxId, payload);
}
```

#### 2.5.4 属性变换器

```typescript
// src/transformers/attribute.ts

import { BaseTransformer, TransformResult } from './base';

export interface AttributePayload {
  name: string;
  value: string | boolean | null;  // null 表示删除
}

export class AttributeTransformer extends BaseTransformer {
  transform(jsxId: string, payload: AttributePayload): TransformResult {
    const nodeInfo = this.findNode(jsxId);

    if (!nodeInfo) {
      return this.createResult(false, `Node with JSX ID "${jsxId}" not found`);
    }

    const { node } = nodeInfo;
    const { name, value } = payload;

    // 不允许修改 data-jsx-* 属性
    if (name.startsWith('data-jsx-')) {
      return this.createResult(false, 'Cannot modify JSX tracking attributes');
    }

    if (value === null) {
      // 删除属性
      this.removeAttribute(node, name);
    } else if (typeof value === 'boolean') {
      // 布尔属性
      this.setBooleanAttribute(node, name, value);
    } else {
      // 字符串属性
      this.setStringAttribute(node, name, value);
    }

    return this.createResult(true);
  }

  private removeAttribute(node: any, name: string): void {
    if (!node.attributes) return;

    const index = node.attributes.findIndex(
      (a: any) => a.type === 'JSXAttribute' && a.name?.value === name
    );

    if (index >= 0) {
      const removed = node.attributes.splice(index, 1)[0];
      this.recordChange({
        type: 'remove',
        path: ['attributes', String(index)],
        oldValue: removed,
      });
    }
  }

  private setBooleanAttribute(node: any, name: string, value: boolean): void {
    if (!value) {
      this.removeAttribute(node, name);
      return;
    }

    const existing = node.attributes?.find(
      (a: any) => a.type === 'JSXAttribute' && a.name?.value === name
    );

    if (!existing) {
      // 添加布尔属性 (无值)
      const newAttr = {
        type: 'JSXAttribute',
        name: { type: 'Identifier', value: name },
        value: null,
      };

      node.attributes = node.attributes || [];
      node.attributes.push(newAttr);

      this.recordChange({
        type: 'add',
        path: [],
        newValue: newAttr,
      });
    }
  }

  private setStringAttribute(node: any, name: string, value: string): void {
    const existing = node.attributes?.find(
      (a: any) => a.type === 'JSXAttribute' && a.name?.value === name
    );

    if (existing) {
      const oldValue = existing.value;
      existing.value = { type: 'StringLiteral', value };

      this.recordChange({
        type: 'modify',
        path: [],
        oldValue,
        newValue: existing.value,
      });
    } else {
      const newAttr = {
        type: 'JSXAttribute',
        name: { type: 'Identifier', value: name },
        value: { type: 'StringLiteral', value },
      };

      node.attributes = node.attributes || [];
      node.attributes.push(newAttr);

      this.recordChange({
        type: 'add',
        path: [],
        newValue: newAttr,
      });
    }
  }
}

/**
 * 更新属性的便捷函数
 */
export function updateAttribute(
  ast: any,
  jsxId: string,
  name: string,
  value: string | boolean | null
): TransformResult {
  const transformer = new AttributeTransformer(ast);
  return transformer.transform(jsxId, { name, value });
}
```

#### 2.5.5 统一变换入口

```typescript
// src/transformers/index.ts

import { Parser, parser } from '../parser';
import { updateText, TextPayload } from './text';
import { updateStyle, StylePayload } from './style';
import { updateAttribute } from './attribute';
import { TransformResult } from './base';

export type TransformOperation =
  | { type: 'text'; payload: TextPayload }
  | { type: 'style'; payload: StylePayload }
  | { type: 'attribute'; payload: { name: string; value: string | boolean | null } };

export interface TransformRequest {
  jsxId: string;
  operation: TransformOperation;
}

/**
 * 统一的代码变换接口
 */
export async function transformCode(
  sourceCode: string,
  filePath: string,
  request: TransformRequest
): Promise<{ code: string; result: TransformResult }> {
  // 1. 解析代码
  const { ast } = await parser.parseFile(sourceCode, filePath);

  // 2. 执行变换
  let result: TransformResult;

  switch (request.operation.type) {
    case 'text':
      result = updateText(ast, request.jsxId, request.operation.payload.text);
      break;
    case 'style':
      result = updateStyle(ast, request.jsxId, request.operation.payload);
      break;
    case 'attribute':
      result = updateAttribute(
        ast,
        request.jsxId,
        request.operation.payload.name,
        request.operation.payload.value
      );
      break;
    default:
      throw new Error(`Unknown operation type`);
  }

  if (!result.success) {
    return { code: sourceCode, result };
  }

  // 3. 生成新代码
  const code = await parser.generate(result.ast);

  return { code, result };
}

/**
 * 批量变换
 */
export async function batchTransformCode(
  sourceCode: string,
  filePath: string,
  requests: TransformRequest[]
): Promise<{ code: string; results: TransformResult[] }> {
  let currentCode = sourceCode;
  const results: TransformResult[] = [];

  for (const request of requests) {
    const { code, result } = await transformCode(currentCode, filePath, request);
    currentCode = code;
    results.push(result);

    // 如果有失败，停止处理
    if (!result.success) {
      break;
    }
  }

  return { code: currentCode, results };
}

export * from './text';
export * from './style';
export * from './attribute';
export * from './base';
```

---

### 2.6 Tailwind 映射器

#### 2.6.1 CSS 到 Tailwind 映射

```typescript
// src/tailwind/mapper.ts

export interface CSSProperty {
  property: string;
  value: string;
}

// 映射规则类型
type MapperFn = (value: string) => string | null;

// 核心映射规则
const MAPPER_RULES: Record<string, MapperFn> = {
  // ========== 颜色 ==========
  'color': (v) => v.startsWith('#') || v.startsWith('rgb')
    ? `text-[${v}]`
    : `text-${v}`,
  'background-color': (v) => v.startsWith('#') || v.startsWith('rgb')
    ? `bg-[${v}]`
    : `bg-${v}`,
  'border-color': (v) => v.startsWith('#') || v.startsWith('rgb')
    ? `border-[${v}]`
    : `border-${v}`,

  // ========== 字体 ==========
  'font-size': (v) => {
    const map: Record<string, string> = {
      '12px': 'text-xs', '0.75rem': 'text-xs',
      '14px': 'text-sm', '0.875rem': 'text-sm',
      '16px': 'text-base', '1rem': 'text-base',
      '18px': 'text-lg', '1.125rem': 'text-lg',
      '20px': 'text-xl', '1.25rem': 'text-xl',
      '24px': 'text-2xl', '1.5rem': 'text-2xl',
      '30px': 'text-3xl', '1.875rem': 'text-3xl',
      '36px': 'text-4xl', '2.25rem': 'text-4xl',
      '48px': 'text-5xl', '3rem': 'text-5xl',
      '60px': 'text-6xl', '3.75rem': 'text-6xl',
    };
    return map[v] || `text-[${v}]`;
  },

  'font-weight': (v) => {
    const map: Record<string, string> = {
      '100': 'font-thin',
      '200': 'font-extralight',
      '300': 'font-light',
      '400': 'font-normal',
      '500': 'font-medium',
      '600': 'font-semibold',
      '700': 'font-bold',
      '800': 'font-extrabold',
      '900': 'font-black',
    };
    return map[v] || `font-[${v}]`;
  },

  'line-height': (v) => {
    const map: Record<string, string> = {
      '1': 'leading-none',
      '1.25': 'leading-tight',
      '1.375': 'leading-snug',
      '1.5': 'leading-normal',
      '1.625': 'leading-relaxed',
      '2': 'leading-loose',
    };
    return map[v] || `leading-[${v}]`;
  },

  'text-align': (v) => `text-${v}`,

  // ========== 间距 ==========
  'padding': (v) => parseSpacing('p', v),
  'padding-top': (v) => parseSpacing('pt', v),
  'padding-right': (v) => parseSpacing('pr', v),
  'padding-bottom': (v) => parseSpacing('pb', v),
  'padding-left': (v) => parseSpacing('pl', v),

  'margin': (v) => parseSpacing('m', v),
  'margin-top': (v) => parseSpacing('mt', v),
  'margin-right': (v) => parseSpacing('mr', v),
  'margin-bottom': (v) => parseSpacing('mb', v),
  'margin-left': (v) => parseSpacing('ml', v),

  'gap': (v) => parseSpacing('gap', v),

  // ========== 尺寸 ==========
  'width': (v) => {
    const map: Record<string, string> = {
      '100%': 'w-full',
      '100vw': 'w-screen',
      'auto': 'w-auto',
      'fit-content': 'w-fit',
      'min-content': 'w-min',
      'max-content': 'w-max',
    };
    return map[v] || `w-[${v}]`;
  },

  'height': (v) => {
    const map: Record<string, string> = {
      '100%': 'h-full',
      '100vh': 'h-screen',
      'auto': 'h-auto',
      'fit-content': 'h-fit',
      'min-content': 'h-min',
      'max-content': 'h-max',
    };
    return map[v] || `h-[${v}]`;
  },

  'max-width': (v) => {
    const map: Record<string, string> = {
      'none': 'max-w-none',
      '100%': 'max-w-full',
      '640px': 'max-w-screen-sm',
      '768px': 'max-w-screen-md',
      '1024px': 'max-w-screen-lg',
      '1280px': 'max-w-screen-xl',
    };
    return map[v] || `max-w-[${v}]`;
  },

  // ========== 边框 ==========
  'border-radius': (v) => {
    const map: Record<string, string> = {
      '0': 'rounded-none', '0px': 'rounded-none',
      '2px': 'rounded-sm', '0.125rem': 'rounded-sm',
      '4px': 'rounded', '0.25rem': 'rounded',
      '6px': 'rounded-md', '0.375rem': 'rounded-md',
      '8px': 'rounded-lg', '0.5rem': 'rounded-lg',
      '12px': 'rounded-xl', '0.75rem': 'rounded-xl',
      '16px': 'rounded-2xl', '1rem': 'rounded-2xl',
      '24px': 'rounded-3xl', '1.5rem': 'rounded-3xl',
      '9999px': 'rounded-full', '50%': 'rounded-full',
    };
    return map[v] || `rounded-[${v}]`;
  },

  'border-width': (v) => {
    const map: Record<string, string> = {
      '0': 'border-0', '0px': 'border-0',
      '1px': 'border',
      '2px': 'border-2',
      '4px': 'border-4',
      '8px': 'border-8',
    };
    return map[v] || `border-[${v}]`;
  },

  // ========== 阴影 ==========
  'box-shadow': (v) => {
    if (v === 'none') return 'shadow-none';
    // 简单匹配常见阴影
    if (v.includes('0 1px 2px')) return 'shadow-sm';
    if (v.includes('0 1px 3px')) return 'shadow';
    if (v.includes('0 4px 6px')) return 'shadow-md';
    if (v.includes('0 10px 15px')) return 'shadow-lg';
    if (v.includes('0 20px 25px')) return 'shadow-xl';
    if (v.includes('0 25px 50px')) return 'shadow-2xl';
    return `shadow-[${v.replace(/\s+/g, '_')}]`;
  },

  // ========== 布局 ==========
  'display': (v) => {
    const map: Record<string, string> = {
      'block': 'block',
      'inline-block': 'inline-block',
      'inline': 'inline',
      'flex': 'flex',
      'inline-flex': 'inline-flex',
      'grid': 'grid',
      'inline-grid': 'inline-grid',
      'none': 'hidden',
      'contents': 'contents',
    };
    return map[v] || null;
  },

  'flex-direction': (v) => {
    const map: Record<string, string> = {
      'row': 'flex-row',
      'row-reverse': 'flex-row-reverse',
      'column': 'flex-col',
      'column-reverse': 'flex-col-reverse',
    };
    return map[v] || null;
  },

  'justify-content': (v) => {
    const map: Record<string, string> = {
      'flex-start': 'justify-start',
      'flex-end': 'justify-end',
      'center': 'justify-center',
      'space-between': 'justify-between',
      'space-around': 'justify-around',
      'space-evenly': 'justify-evenly',
    };
    return map[v] || null;
  },

  'align-items': (v) => {
    const map: Record<string, string> = {
      'flex-start': 'items-start',
      'flex-end': 'items-end',
      'center': 'items-center',
      'baseline': 'items-baseline',
      'stretch': 'items-stretch',
    };
    return map[v] || null;
  },

  'flex-wrap': (v) => {
    const map: Record<string, string> = {
      'nowrap': 'flex-nowrap',
      'wrap': 'flex-wrap',
      'wrap-reverse': 'flex-wrap-reverse',
    };
    return map[v] || null;
  },

  // ========== 定位 ==========
  'position': (v) => {
    const map: Record<string, string> = {
      'static': 'static',
      'relative': 'relative',
      'absolute': 'absolute',
      'fixed': 'fixed',
      'sticky': 'sticky',
    };
    return map[v] || null;
  },

  'top': (v) => parseSpacing('top', v),
  'right': (v) => parseSpacing('right', v),
  'bottom': (v) => parseSpacing('bottom', v),
  'left': (v) => parseSpacing('left', v),

  // ========== 其他 ==========
  'opacity': (v) => {
    const num = parseFloat(v);
    if (isNaN(num)) return null;
    const percent = Math.round(num * 100);
    return `opacity-${percent}`;
  },

  'cursor': (v) => `cursor-${v}`,

  'overflow': (v) => `overflow-${v}`,
  'overflow-x': (v) => `overflow-x-${v}`,
  'overflow-y': (v) => `overflow-y-${v}`,

  'z-index': (v) => {
    const map: Record<string, string> = {
      '0': 'z-0',
      '10': 'z-10',
      '20': 'z-20',
      '30': 'z-30',
      '40': 'z-40',
      '50': 'z-50',
      'auto': 'z-auto',
    };
    return map[v] || `z-[${v}]`;
  },
};

// 间距解析辅助函数
function parseSpacing(prefix: string, value: string): string {
  // 常用间距映射
  const spacingMap: Record<string, string> = {
    '0': '0', '0px': '0',
    '1px': 'px',
    '2px': '0.5', '0.125rem': '0.5',
    '4px': '1', '0.25rem': '1',
    '6px': '1.5', '0.375rem': '1.5',
    '8px': '2', '0.5rem': '2',
    '10px': '2.5', '0.625rem': '2.5',
    '12px': '3', '0.75rem': '3',
    '14px': '3.5', '0.875rem': '3.5',
    '16px': '4', '1rem': '4',
    '20px': '5', '1.25rem': '5',
    '24px': '6', '1.5rem': '6',
    '28px': '7', '1.75rem': '7',
    '32px': '8', '2rem': '8',
    '36px': '9', '2.25rem': '9',
    '40px': '10', '2.5rem': '10',
    '44px': '11', '2.75rem': '11',
    '48px': '12', '3rem': '12',
    '56px': '14', '3.5rem': '14',
    '64px': '16', '4rem': '16',
    'auto': 'auto',
  };

  const mapped = spacingMap[value];
  if (mapped) {
    return `${prefix}-${mapped}`;
  }

  return `${prefix}-[${value}]`;
}

/**
 * 将 CSS 属性转换为 Tailwind 类名
 */
export function cssToTailwind(property: string, value: string): string | null {
  const mapper = MAPPER_RULES[property];
  if (mapper) {
    return mapper(value);
  }
  return null;
}

/**
 * 将 CSS 样式对象转换为 Tailwind 类名数组
 */
export function cssObjectToTailwind(styles: Record<string, string>): string[] {
  const classes: string[] = [];

  for (const [property, value] of Object.entries(styles)) {
    const className = cssToTailwind(property, value);
    if (className) {
      classes.push(className);
    }
  }

  return classes;
}
```

#### 2.6.2 类名合并器

```typescript
// src/tailwind/merger.ts

// 类名前缀分组
const CLASS_GROUPS: Record<string, string[]> = {
  'text-size': ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-6xl'],
  'text-color': ['text-'],  // 前缀匹配
  'bg-color': ['bg-'],
  'font-weight': ['font-thin', 'font-extralight', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold', 'font-extrabold', 'font-black'],
  'rounded': ['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full'],
  'shadow': ['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'],
  'display': ['block', 'inline-block', 'inline', 'flex', 'inline-flex', 'grid', 'inline-grid', 'hidden', 'contents'],
  'flex-direction': ['flex-row', 'flex-row-reverse', 'flex-col', 'flex-col-reverse'],
  'justify': ['justify-start', 'justify-end', 'justify-center', 'justify-between', 'justify-around', 'justify-evenly'],
  'items': ['items-start', 'items-end', 'items-center', 'items-baseline', 'items-stretch'],
  'position': ['static', 'relative', 'absolute', 'fixed', 'sticky'],
};

// 前缀优先级 (同前缀的类名，后者覆盖前者)
const PREFIX_CONFLICTS = [
  'p-', 'pt-', 'pr-', 'pb-', 'pl-', 'px-', 'py-',
  'm-', 'mt-', 'mr-', 'mb-', 'ml-', 'mx-', 'my-',
  'w-', 'min-w-', 'max-w-',
  'h-', 'min-h-', 'max-h-',
  'top-', 'right-', 'bottom-', 'left-',
  'gap-', 'gap-x-', 'gap-y-',
  'z-',
  'opacity-',
  'border-', 'border-t-', 'border-r-', 'border-b-', 'border-l-',
];

/**
 * 获取类名所属的冲突组
 */
function getConflictGroup(className: string): string | null {
  // 检查是否属于已知分组
  for (const [group, patterns] of Object.entries(CLASS_GROUPS)) {
    for (const pattern of patterns) {
      if (pattern.endsWith('-')) {
        // 前缀匹配
        if (className.startsWith(pattern)) return group;
      } else {
        // 完全匹配
        if (className === pattern) return group;
      }
    }
  }

  // 检查前缀冲突
  for (const prefix of PREFIX_CONFLICTS) {
    if (className.startsWith(prefix)) {
      return `prefix:${prefix}`;
    }
  }

  return null;
}

/**
 * 合并类名，处理冲突
 */
export function mergeClasses(existing: string[], incoming: string[]): string[] {
  const result = new Map<string, string>();
  const noConflict: string[] = [];

  // 处理现有类名
  for (const className of existing) {
    const group = getConflictGroup(className);
    if (group) {
      result.set(group, className);
    } else {
      noConflict.push(className);
    }
  }

  // 处理新类名 (覆盖同组的旧类名)
  for (const className of incoming) {
    const group = getConflictGroup(className);
    if (group) {
      result.set(group, className);  // 覆盖
    } else if (!noConflict.includes(className)) {
      noConflict.push(className);
    }
  }

  // 合并结果
  return [...result.values(), ...noConflict];
}

/**
 * 从类名列表中移除指定类名
 */
export function removeClasses(existing: string[], toRemove: string[]): string[] {
  const removeSet = new Set(toRemove);
  return existing.filter(cls => !removeSet.has(cls));
}

/**
 * 规范化类名字符串
 */
export function normalizeClassString(classString: string): string[] {
  return classString
    .split(/\s+/)
    .filter(Boolean)
    .map(cls => cls.trim());
}

/**
 * 类名数组转字符串
 */
export function classesToString(classes: string[]): string {
  return classes.join(' ');
}
```

---

## 3. 实施任务

### 3.1 Week 3 任务列表

| 任务 ID | 任务描述 | 预估时间 | 依赖 | 负责人 |
|---------|---------|---------|------|--------|
| T3.1 | 创建 ast-processor 包结构 | 1h | SPEC-0001 | - |
| T3.2 | 集成 SWC WASM | 4h | T3.1 | - |
| T3.3 | 实现 Parser 类 | 3h | T3.2 | - |
| T3.4 | 实现 AST 遍历器 | 4h | T3.3 | - |
| T3.5 | 实现 JSX ID 定位器 | 3h | T3.4 | - |
| T3.6 | 实现基础变换器 | 2h | T3.5 | - |
| T3.7 | 实现文本变换器 | 2h | T3.6 | - |
| T3.8 | 实现样式变换器 | 3h | T3.6 | - |

### 3.2 Week 4 任务列表

| 任务 ID | 任务描述 | 预估时间 | 依赖 | 负责人 |
|---------|---------|---------|------|--------|
| T4.1 | 实现属性变换器 | 2h | T3.8 | - |
| T4.2 | 实现代码生成器 | 3h | T4.1 | - |
| T4.3 | 实现 Tailwind 映射器 | 4h | - | - |
| T4.4 | 实现类名合并器 | 2h | T4.3 | - |
| T4.5 | 实现统一变换接口 | 3h | T4.2, T4.4 | - |
| T4.6 | 编写单元测试 | 4h | T4.5 | - |
| T4.7 | 性能优化和缓存 | 3h | T4.6 | - |
| T4.8 | 文档和示例 | 2h | T4.7 | - |

---

## 4. 验收标准

### 4.1 功能验收

| 验收项 | 验收标准 | 测试方法 |
|--------|---------|---------|
| TSX 解析 | 正确解析 React TSX 代码 | 单元测试 |
| JSX ID 定位 | 准确找到目标节点 | 单元测试 |
| 文本修改 | 正确更新文本内容 | 单元测试 |
| 样式修改 | 正确更新 className | 单元测试 |
| 属性修改 | 正确增删改属性 | 单元测试 |
| 代码生成 | 生成有效的 TSX 代码 | 编译验证 |
| Tailwind 映射 | 正确转换 CSS 属性 | 单元测试 |

### 4.2 性能验收

| 指标 | 目标值 | 测量方法 |
|------|--------|---------|
| SWC WASM 加载 | < 500ms | 首次加载时间 |
| 解析 1000 行代码 | < 50ms | 性能测试 |
| 单次变换 | < 10ms | 性能测试 |
| 代码生成 | < 20ms | 性能测试 |

### 4.3 代码质量

| 指标 | 目标 |
|------|------|
| TypeScript 覆盖率 | 100% |
| 单元测试覆盖率 | > 85% |
| ESLint 错误 | 0 |

---

## 5. 测试用例

### 5.1 解析测试

```typescript
// tests/parser.test.ts

describe('Parser', () => {
  it('should parse simple TSX', async () => {
    const code = `
      export default function App() {
        return <div className="container">Hello</div>;
      }
    `;

    const { ast } = await parser.parseFile(code, 'App.tsx');
    expect(ast.type).toBe('Module');
  });

  it('should parse complex nested JSX', async () => {
    const code = `
      export default function App() {
        return (
          <div className="container">
            <Header />
            <main>
              <h1>Title</h1>
              <p>Content</p>
            </main>
            <Footer />
          </div>
        );
      }
    `;

    const { ast } = await parser.parseFile(code, 'App.tsx');
    // 验证 AST 结构
  });
});
```

### 5.2 变换测试

```typescript
// tests/transformers.test.ts

describe('TextTransformer', () => {
  it('should update text content', async () => {
    const code = `
      <div data-jsx-id="abc123">Hello World</div>
    `;

    const { code: newCode } = await transformCode(code, 'test.tsx', {
      jsxId: 'abc123',
      operation: { type: 'text', payload: { text: '你好世界' } },
    });

    expect(newCode).toContain('你好世界');
    expect(newCode).not.toContain('Hello World');
  });
});

describe('StyleTransformer', () => {
  it('should add Tailwind classes', async () => {
    const code = `
      <div data-jsx-id="abc123" className="p-4">Content</div>
    `;

    const { code: newCode } = await transformCode(code, 'test.tsx', {
      jsxId: 'abc123',
      operation: {
        type: 'style',
        payload: { addClasses: ['bg-blue-500', 'text-white'] }
      },
    });

    expect(newCode).toContain('p-4');
    expect(newCode).toContain('bg-blue-500');
    expect(newCode).toContain('text-white');
  });
});
```

---

## 6. 依赖清单

```json
{
  "dependencies": {
    "@swc/wasm-web": "^1.3.100"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@types/node": "^20.10.0"
  }
}
```

---

*规格版本: v1.0*
*创建日期: 2024*
*最后更新: 2024*
