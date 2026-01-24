# Visual Edit 升级改造方案

## 对标 Lovable Visual Edit 全功能实现

> 基于 Lovable 官方博客 (https://lovable.dev/blog/visual-edits) 的技术分析

---

## 一、当前系统 vs Lovable 对比分析

### 1. 功能对比矩阵

| 功能模块 | 当前系统 | Lovable | 差距分析 |
|---------|---------|---------|---------|
| **代码标记** | CSS 选择器 | Stable JSX Tagging | ❌ 缺失编译时标记 |
| **源码定位** | 无 | 双向映射 (UI ↔ 源码) | ❌ 无法定位到源码位置 |
| **代码修改** | 正则替换 HTML | AST 解析修改 | ❌ 不安全，不支持 JSX |
| **样式系统** | 内联 style | Tailwind CSS 生成 | ❌ 代码质量差 |
| **热更新** | 全页刷新 | HMR 热模块替换 | ❌ 体验差，状态丢失 |
| **乐观更新** | 有 (DOM 操作) | 有 (AST + DOM) | ⚠️ 部分支持 |
| **撤销/重做** | 有 (50 条历史) | 有 | ✅ 已支持 |
| **多设备预览** | 有 (3 种视口) | 有 | ✅ 已支持 |

### 2. 架构对比

```
当前系统架构:
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │───▶│   Backend   │───▶│   Fly.io    │
│   (React)   │    │   (Bun)     │    │   (Volume)  │
└─────────────┘    └─────────────┘    └─────────────┘
      │                  │
      ▼                  ▼
┌─────────────┐    ┌─────────────┐
│   iframe    │    │  PostgreSQL │
│ (注入脚本)  │    │  (持久化)   │
└─────────────┘    └─────────────┘

问题:
- 无编译时 JSX 标记
- 依赖 CSS 选择器定位元素
- HTML 字符串操作，无 AST
- 无法生成标准 JSX 代码
- 热更新依赖全量 HTML 替换


Lovable 架构 (目标):
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Vite Plugin  │  │ AST Parser   │  │ Visual Editor│   │
│  │ (JSX Tag)    │  │ (Babel/SWC)  │  │ (Tailwind)   │   │
│  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │ 编译时   │      │ 运行时   │      │ 实时     │
    │ 标记注入 │─────▶│ AST修改  │─────▶│ HMR更新  │
    └──────────┘      └──────────┘      └──────────┘
```

---

## 二、核心升级模块

### 模块 1: Stable JSX Tagging (编译时标记)

#### 1.1 技术方案

```
┌─────────────────────────────────────────────────────────┐
│                 Vite Plugin: jsx-tagger                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  源码 (编写时):                                          │
│  ┌─────────────────────────────────────┐                │
│  │ <div className="hero">              │                │
│  │   <h1>Hello World</h1>              │                │
│  │ </div>                              │                │
│  └─────────────────────────────────────┘                │
│                      │                                   │
│                      ▼ 编译时转换                        │
│                                                          │
│  编译后 (运行时):                                        │
│  ┌─────────────────────────────────────┐                │
│  │ <div                                │                │
│  │   className="hero"                  │                │
│  │   data-jsx-id="a1b2c3"             │ ← 唯一标识      │
│  │   data-jsx-file="src/Hero.tsx"     │ ← 文件路径      │
│  │   data-jsx-line="12"               │ ← 行号          │
│  │   data-jsx-col="4"                 │ ← 列号          │
│  │ >                                   │                │
│  │   <h1 data-jsx-id="d4e5f6" ...>    │                │
│  │     Hello World                     │                │
│  │   </h1>                             │                │
│  │ </div>                              │                │
│  └─────────────────────────────────────┘                │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### 1.2 Vite 插件实现

```typescript
// vite-plugin-jsx-tagger.ts

import { Plugin, TransformResult } from 'vite';
import * as babel from '@babel/core';
import * as t from '@babel/types';
import { createHash } from 'crypto';

interface JsxTagInfo {
  id: string;
  file: string;
  line: number;
  col: number;
  component: string;
}

// 生成稳定的 JSX ID (基于文件路径 + 位置)
function generateStableId(file: string, line: number, col: number): string {
  const hash = createHash('md5')
    .update(`${file}:${line}:${col}`)
    .digest('hex')
    .slice(0, 8);
  return hash;
}

// 源码映射表 (用于双向定位)
const sourceMap = new Map<string, JsxTagInfo>();

export function jsxTaggerPlugin(): Plugin {
  return {
    name: 'vite-plugin-jsx-tagger',
    enforce: 'pre',

    transform(code: string, id: string): TransformResult | null {
      // 只处理 JSX/TSX 文件
      if (!/\.[jt]sx?$/.test(id)) return null;

      // 排除 node_modules
      if (id.includes('node_modules')) return null;

      const result = babel.transformSync(code, {
        filename: id,
        plugins: [
          ['@babel/plugin-syntax-jsx'],
          ['@babel/plugin-syntax-typescript', { isTSX: true }],

          // 自定义 Babel 插件
          function jsxTaggerBabelPlugin() {
            return {
              visitor: {
                JSXOpeningElement(path: any) {
                  const loc = path.node.loc;
                  if (!loc) return;

                  const line = loc.start.line;
                  const col = loc.start.column;
                  const jsxId = generateStableId(id, line, col);

                  // 记录源码映射
                  sourceMap.set(jsxId, {
                    id: jsxId,
                    file: id,
                    line,
                    col,
                    component: path.node.name.name || 'unknown'
                  });

                  // 注入 data 属性
                  const attributes = [
                    t.jsxAttribute(
                      t.jsxIdentifier('data-jsx-id'),
                      t.stringLiteral(jsxId)
                    ),
                    t.jsxAttribute(
                      t.jsxIdentifier('data-jsx-file'),
                      t.stringLiteral(id)
                    ),
                    t.jsxAttribute(
                      t.jsxIdentifier('data-jsx-line'),
                      t.stringLiteral(String(line))
                    ),
                    t.jsxAttribute(
                      t.jsxIdentifier('data-jsx-col'),
                      t.stringLiteral(String(col))
                    ),
                  ];

                  // 只给 HTML 元素添加属性 (不给自定义组件)
                  const elementName = path.node.name.name;
                  if (elementName && /^[a-z]/.test(elementName)) {
                    path.node.attributes.push(...attributes);
                  }
                }
              }
            };
          }
        ],
        sourceMaps: true,
      });

      return {
        code: result?.code || code,
        map: result?.map,
      };
    },

    // 暴露源码映射 API
    configureServer(server) {
      server.middlewares.use('/__jsx_source_map', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(Object.fromEntries(sourceMap)));
      });

      // 通过 JSX ID 获取源码位置
      server.middlewares.use('/__jsx_locate', (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const jsxId = url.searchParams.get('id');

        if (jsxId && sourceMap.has(jsxId)) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(sourceMap.get(jsxId)));
        } else {
          res.statusCode = 404;
          res.end('Not found');
        }
      });
    }
  };
}
```

#### 1.3 双向映射功能

```typescript
// jsx-source-bridge.ts

interface SourceLocation {
  file: string;
  line: number;
  col: number;
}

class JsxSourceBridge {
  private sourceMap: Map<string, SourceLocation> = new Map();

  // 从服务器加载源码映射
  async loadSourceMap(): Promise<void> {
    const response = await fetch('/__jsx_source_map');
    const data = await response.json();
    this.sourceMap = new Map(Object.entries(data));
  }

  // 点击 UI 元素 → 获取源码位置
  getSourceLocation(jsxId: string): SourceLocation | null {
    return this.sourceMap.get(jsxId) || null;
  }

  // 打开 IDE 到指定位置 (通过 vscode:// 协议)
  openInIDE(jsxId: string): void {
    const location = this.getSourceLocation(jsxId);
    if (location) {
      const url = `vscode://file/${location.file}:${location.line}:${location.col}`;
      window.open(url);
    }
  }

  // 监听元素点击，返回源码位置
  setupClickListener(callback: (location: SourceLocation, element: HTMLElement) => void): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const jsxId = target.closest('[data-jsx-id]')?.getAttribute('data-jsx-id');

      if (jsxId) {
        const location = this.getSourceLocation(jsxId);
        if (location) {
          callback(location, target);
        }
      }
    });
  }
}
```

---

### 模块 2: 客户端 AST 处理

#### 2.1 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                    AST 处理流水线                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │  源代码  │───▶│  解析器  │───▶│   AST    │           │
│  │  (JSX)   │    │ (SWC)    │    │  (JSON)  │           │
│  └──────────┘    └──────────┘    └──────────┘           │
│                                       │                  │
│                                       ▼                  │
│  ┌──────────────────────────────────────────────┐       │
│  │              AST 变换器                       │       │
│  │  ┌────────────┐  ┌────────────┐  ┌────────┐ │       │
│  │  │ 文本修改器 │  │ 样式修改器 │  │ 结构   │ │       │
│  │  │ (text)     │  │ (class)    │  │ 修改器 │ │       │
│  │  └────────────┘  └────────────┘  └────────┘ │       │
│  └──────────────────────────────────────────────┘       │
│                        │                                 │
│                        ▼                                 │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐           │
│  │  新 AST  │───▶│  生成器  │───▶│  新代码  │           │
│  │  (JSON)  │    │ (SWC)    │    │  (JSX)   │           │
│  └──────────┘    └──────────┘    └──────────┘           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### 2.2 使用 SWC 进行 AST 解析

```typescript
// ast-parser.ts

import init, { parseSync, printSync } from '@swc/wasm-web';

// 初始化 SWC WASM
let initialized = false;

async function initSWC(): Promise<void> {
  if (!initialized) {
    await init();
    initialized = true;
  }
}

interface ParsedModule {
  ast: any;
  sourceCode: string;
}

// 解析 JSX/TSX 代码为 AST
async function parseJSX(code: string, filename: string): Promise<ParsedModule> {
  await initSWC();

  const ast = parseSync(code, {
    syntax: 'typescript',
    tsx: true,
    decorators: true,
    dynamicImport: true,
  });

  return { ast, sourceCode: code };
}

// 将 AST 转回代码
async function generateCode(ast: any): Promise<string> {
  await initSWC();

  const output = printSync(ast, {
    minify: false,
    isModule: true,
  });

  return output.code;
}

// 根据 JSX ID 在 AST 中定位节点
function findNodeByJsxId(ast: any, jsxId: string): any | null {
  let found: any = null;

  function traverse(node: any): void {
    if (!node || typeof node !== 'object') return;

    // 检查 JSX 元素
    if (node.type === 'JSXOpeningElement') {
      const idAttr = node.attributes?.find(
        (attr: any) =>
          attr.type === 'JSXAttribute' &&
          attr.name?.value === 'data-jsx-id' &&
          attr.value?.value === jsxId
      );

      if (idAttr) {
        found = node;
        return;
      }
    }

    // 递归遍历
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (Array.isArray(child)) {
        child.forEach(traverse);
      } else if (child && typeof child === 'object') {
        traverse(child);
      }
    }
  }

  traverse(ast);
  return found;
}
```

#### 2.3 AST 变换器实现

```typescript
// ast-transformers.ts

interface TransformOptions {
  jsxId: string;
  operation: 'updateText' | 'updateStyle' | 'addClass' | 'removeClass' | 'updateAttribute';
  payload: any;
}

// 更新文本内容
function updateTextContent(ast: any, jsxId: string, newText: string): any {
  const node = findNodeByJsxId(ast, jsxId);
  if (!node) return ast;

  // 找到父 JSXElement 并修改 children
  const parent = findParentJSXElement(ast, node);
  if (parent && parent.children) {
    parent.children = [{
      type: 'JSXText',
      value: newText,
      raw: newText,
    }];
  }

  return ast;
}

// 更新 Tailwind 类名
function updateClassName(ast: any, jsxId: string, classes: string[]): any {
  const node = findNodeByJsxId(ast, jsxId);
  if (!node) return ast;

  // 找到或创建 className 属性
  let classAttr = node.attributes?.find(
    (attr: any) => attr.name?.value === 'className'
  );

  const classValue = classes.join(' ');

  if (classAttr) {
    // 更新现有属性
    if (classAttr.value.type === 'StringLiteral') {
      classAttr.value.value = classValue;
    }
  } else {
    // 添加新属性
    node.attributes = node.attributes || [];
    node.attributes.push({
      type: 'JSXAttribute',
      name: { type: 'JSXIdentifier', value: 'className' },
      value: { type: 'StringLiteral', value: classValue },
    });
  }

  return ast;
}

// 更新任意属性
function updateAttribute(ast: any, jsxId: string, attrName: string, attrValue: string): any {
  const node = findNodeByJsxId(ast, jsxId);
  if (!node) return ast;

  let attr = node.attributes?.find(
    (a: any) => a.name?.value === attrName
  );

  if (attr) {
    attr.value = { type: 'StringLiteral', value: attrValue };
  } else {
    node.attributes = node.attributes || [];
    node.attributes.push({
      type: 'JSXAttribute',
      name: { type: 'JSXIdentifier', value: attrName },
      value: { type: 'StringLiteral', value: attrValue },
    });
  }

  return ast;
}

// 统一的变换入口
async function transformAST(
  sourceCode: string,
  filename: string,
  options: TransformOptions
): Promise<string> {
  const { ast } = await parseJSX(sourceCode, filename);

  let newAst = ast;

  switch (options.operation) {
    case 'updateText':
      newAst = updateTextContent(ast, options.jsxId, options.payload.text);
      break;
    case 'updateStyle':
      newAst = updateClassName(ast, options.jsxId, options.payload.classes);
      break;
    case 'updateAttribute':
      newAst = updateAttribute(ast, options.jsxId, options.payload.name, options.payload.value);
      break;
  }

  return generateCode(newAst);
}
```

---

### 模块 3: Tailwind CSS 智能生成

#### 3.1 样式属性到 Tailwind 类名映射

```typescript
// tailwind-mapper.ts

interface StyleProperty {
  property: string;
  value: string;
}

// 核心映射规则
const TAILWIND_MAPPINGS: Record<string, (value: string) => string | null> = {
  // 颜色
  'color': (v) => `text-[${v}]`,
  'background-color': (v) => `bg-[${v}]`,
  'border-color': (v) => `border-[${v}]`,

  // 字体
  'font-size': (v) => {
    const sizeMap: Record<string, string> = {
      '12px': 'text-xs', '14px': 'text-sm', '16px': 'text-base',
      '18px': 'text-lg', '20px': 'text-xl', '24px': 'text-2xl',
      '30px': 'text-3xl', '36px': 'text-4xl', '48px': 'text-5xl',
    };
    return sizeMap[v] || `text-[${v}]`;
  },
  'font-weight': (v) => {
    const weightMap: Record<string, string> = {
      '100': 'font-thin', '200': 'font-extralight', '300': 'font-light',
      '400': 'font-normal', '500': 'font-medium', '600': 'font-semibold',
      '700': 'font-bold', '800': 'font-extrabold', '900': 'font-black',
    };
    return weightMap[v] || `font-[${v}]`;
  },

  // 间距
  'padding': (v) => `p-[${v}]`,
  'padding-top': (v) => `pt-[${v}]`,
  'padding-right': (v) => `pr-[${v}]`,
  'padding-bottom': (v) => `pb-[${v}]`,
  'padding-left': (v) => `pl-[${v}]`,
  'margin': (v) => `m-[${v}]`,
  'margin-top': (v) => `mt-[${v}]`,
  'margin-right': (v) => `mr-[${v}]`,
  'margin-bottom': (v) => `mb-[${v}]`,
  'margin-left': (v) => `ml-[${v}]`,
  'gap': (v) => `gap-[${v}]`,

  // 尺寸
  'width': (v) => v === '100%' ? 'w-full' : `w-[${v}]`,
  'height': (v) => v === '100%' ? 'h-full' : `h-[${v}]`,
  'max-width': (v) => `max-w-[${v}]`,
  'min-width': (v) => `min-w-[${v}]`,

  // 边框
  'border-radius': (v) => {
    const radiusMap: Record<string, string> = {
      '0': 'rounded-none', '2px': 'rounded-sm', '4px': 'rounded',
      '6px': 'rounded-md', '8px': 'rounded-lg', '12px': 'rounded-xl',
      '16px': 'rounded-2xl', '24px': 'rounded-3xl', '9999px': 'rounded-full',
    };
    return radiusMap[v] || `rounded-[${v}]`;
  },
  'border-width': (v) => v === '1px' ? 'border' : `border-[${v}]`,

  // 阴影
  'box-shadow': (v) => {
    if (v === 'none') return 'shadow-none';
    if (v.includes('0 1px 2px')) return 'shadow-sm';
    if (v.includes('0 4px 6px')) return 'shadow';
    if (v.includes('0 10px 15px')) return 'shadow-lg';
    return `shadow-[${v.replace(/\s/g, '_')}]`;
  },

  // 布局
  'display': (v) => {
    const displayMap: Record<string, string> = {
      'flex': 'flex', 'grid': 'grid', 'block': 'block',
      'inline': 'inline', 'inline-block': 'inline-block',
      'none': 'hidden', 'inline-flex': 'inline-flex',
    };
    return displayMap[v] || null;
  },
  'flex-direction': (v) => {
    const dirMap: Record<string, string> = {
      'row': 'flex-row', 'column': 'flex-col',
      'row-reverse': 'flex-row-reverse', 'column-reverse': 'flex-col-reverse',
    };
    return dirMap[v] || null;
  },
  'justify-content': (v) => {
    const justifyMap: Record<string, string> = {
      'flex-start': 'justify-start', 'flex-end': 'justify-end',
      'center': 'justify-center', 'space-between': 'justify-between',
      'space-around': 'justify-around', 'space-evenly': 'justify-evenly',
    };
    return justifyMap[v] || null;
  },
  'align-items': (v) => {
    const alignMap: Record<string, string> = {
      'flex-start': 'items-start', 'flex-end': 'items-end',
      'center': 'items-center', 'baseline': 'items-baseline',
      'stretch': 'items-stretch',
    };
    return alignMap[v] || null;
  },

  // 定位
  'position': (v) => {
    const posMap: Record<string, string> = {
      'static': 'static', 'relative': 'relative', 'absolute': 'absolute',
      'fixed': 'fixed', 'sticky': 'sticky',
    };
    return posMap[v] || null;
  },
  'top': (v) => `top-[${v}]`,
  'right': (v) => `right-[${v}]`,
  'bottom': (v) => `bottom-[${v}]`,
  'left': (v) => `left-[${v}]`,

  // 其他
  'opacity': (v) => `opacity-[${v}]`,
  'overflow': (v) => `overflow-${v}`,
  'cursor': (v) => `cursor-${v}`,
  'text-align': (v) => `text-${v}`,
};

class TailwindMapper {
  // 将 CSS 样式对象转换为 Tailwind 类名数组
  cssToTailwind(styles: Record<string, string>): string[] {
    const classes: string[] = [];

    for (const [property, value] of Object.entries(styles)) {
      const mapper = TAILWIND_MAPPINGS[property];
      if (mapper) {
        const className = mapper(value);
        if (className) {
          classes.push(className);
        }
      }
    }

    return classes;
  }

  // 智能合并类名 (避免冲突)
  mergeClasses(existing: string[], newClasses: string[]): string[] {
    const result = new Set(existing);

    for (const newClass of newClasses) {
      // 提取前缀 (如 'text-' 'bg-' 'p-' 等)
      const prefix = this.getClassPrefix(newClass);

      // 移除同前缀的旧类名
      if (prefix) {
        for (const existingClass of result) {
          if (this.getClassPrefix(existingClass) === prefix) {
            result.delete(existingClass);
          }
        }
      }

      result.add(newClass);
    }

    return Array.from(result);
  }

  private getClassPrefix(className: string): string | null {
    const prefixes = [
      'text-', 'bg-', 'border-', 'rounded-', 'shadow-',
      'p-', 'pt-', 'pr-', 'pb-', 'pl-', 'px-', 'py-',
      'm-', 'mt-', 'mr-', 'mb-', 'ml-', 'mx-', 'my-',
      'w-', 'h-', 'min-w-', 'max-w-', 'min-h-', 'max-h-',
      'flex-', 'grid-', 'gap-', 'justify-', 'items-', 'self-',
      'font-', 'leading-', 'tracking-',
      'top-', 'right-', 'bottom-', 'left-',
      'opacity-', 'z-', 'overflow-', 'cursor-',
    ];

    for (const prefix of prefixes) {
      if (className.startsWith(prefix)) {
        return prefix;
      }
    }

    return null;
  }
}

export const tailwindMapper = new TailwindMapper();
```

#### 3.2 Visual Editor 样式面板

```typescript
// style-panel.tsx

interface StylePanelProps {
  selectedElement: {
    jsxId: string;
    tagName: string;
    currentClasses: string[];
    computedStyles: CSSStyleDeclaration;
  };
  onStyleChange: (jsxId: string, newClasses: string[]) => void;
}

// 样式分类
const STYLE_CATEGORIES = {
  typography: {
    label: '文字',
    properties: [
      { key: 'fontSize', label: '字号', type: 'select', options: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl', 'text-4xl'] },
      { key: 'fontWeight', label: '字重', type: 'select', options: ['font-thin', 'font-light', 'font-normal', 'font-medium', 'font-semibold', 'font-bold'] },
      { key: 'color', label: '颜色', type: 'color' },
      { key: 'textAlign', label: '对齐', type: 'select', options: ['text-left', 'text-center', 'text-right', 'text-justify'] },
    ]
  },
  spacing: {
    label: '间距',
    properties: [
      { key: 'padding', label: '内边距', type: 'spacing-box' },
      { key: 'margin', label: '外边距', type: 'spacing-box' },
      { key: 'gap', label: '间隙', type: 'slider', min: 0, max: 16, unit: 'rem' },
    ]
  },
  layout: {
    label: '布局',
    properties: [
      { key: 'display', label: '显示', type: 'select', options: ['block', 'flex', 'grid', 'inline', 'hidden'] },
      { key: 'flexDirection', label: '方向', type: 'select', options: ['flex-row', 'flex-col', 'flex-row-reverse', 'flex-col-reverse'] },
      { key: 'justifyContent', label: '主轴', type: 'select', options: ['justify-start', 'justify-center', 'justify-end', 'justify-between', 'justify-around'] },
      { key: 'alignItems', label: '交叉轴', type: 'select', options: ['items-start', 'items-center', 'items-end', 'items-stretch'] },
    ]
  },
  sizing: {
    label: '尺寸',
    properties: [
      { key: 'width', label: '宽度', type: 'size-input' },
      { key: 'height', label: '高度', type: 'size-input' },
      { key: 'maxWidth', label: '最大宽', type: 'size-input' },
    ]
  },
  decoration: {
    label: '装饰',
    properties: [
      { key: 'backgroundColor', label: '背景色', type: 'color' },
      { key: 'borderRadius', label: '圆角', type: 'select', options: ['rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full'] },
      { key: 'boxShadow', label: '阴影', type: 'select', options: ['shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg', 'shadow-xl', 'shadow-2xl'] },
      { key: 'border', label: '边框', type: 'border-config' },
    ]
  },
};

function StylePanel({ selectedElement, onStyleChange }: StylePanelProps) {
  const [activeTab, setActiveTab] = useState('typography');

  const handlePropertyChange = (property: string, value: string) => {
    const newClasses = tailwindMapper.mergeClasses(
      selectedElement.currentClasses,
      [value]
    );
    onStyleChange(selectedElement.jsxId, newClasses);
  };

  return (
    <div className="style-panel">
      {/* 标签页导航 */}
      <div className="tabs">
        {Object.entries(STYLE_CATEGORIES).map(([key, category]) => (
          <button
            key={key}
            className={activeTab === key ? 'active' : ''}
            onClick={() => setActiveTab(key)}
          >
            {category.label}
          </button>
        ))}
      </div>

      {/* 属性编辑区 */}
      <div className="properties">
        {STYLE_CATEGORIES[activeTab].properties.map(prop => (
          <PropertyEditor
            key={prop.key}
            property={prop}
            currentValue={getCurrentValue(selectedElement, prop.key)}
            onChange={(value) => handlePropertyChange(prop.key, value)}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### 模块 4: HMR 热模块替换

#### 4.1 HMR 流程架构

```
┌─────────────────────────────────────────────────────────┐
│                    HMR 热更新流程                         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  用户修改元素                                             │
│      │                                                   │
│      ▼                                                   │
│  ┌────────────────────────────────────────┐             │
│  │  1. 乐观更新 (Optimistic Update)        │             │
│  │     - 立即更新 DOM                       │             │
│  │     - 用户无感知延迟                     │             │
│  └────────────────────────────────────────┘             │
│      │                                                   │
│      ▼                                                   │
│  ┌────────────────────────────────────────┐             │
│  │  2. AST 变换                            │             │
│  │     - 解析源码为 AST                    │             │
│  │     - 定位目标节点                       │             │
│  │     - 应用修改                          │             │
│  │     - 生成新代码                        │             │
│  └────────────────────────────────────────┘             │
│      │                                                   │
│      ▼                                                   │
│  ┌────────────────────────────────────────┐             │
│  │  3. 文件系统写入                        │             │
│  │     - 保存到 Volume                     │             │
│  │     - 触发 Vite HMR                     │             │
│  └────────────────────────────────────────┘             │
│      │                                                   │
│      ▼                                                   │
│  ┌────────────────────────────────────────┐             │
│  │  4. HMR 更新                            │             │
│  │     - Vite 检测文件变化                 │             │
│  │     - 增量编译变化模块                  │             │
│  │     - WebSocket 推送更新                │             │
│  │     - 浏览器热替换模块                  │             │
│  │     - React 状态保持                    │             │
│  └────────────────────────────────────────┘             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### 4.2 HMR WebSocket 通道

```typescript
// hmr-channel.ts

interface HMRUpdate {
  type: 'update' | 'full-reload';
  file: string;
  timestamp: number;
  acceptedPath?: string;
}

class HMRChannel {
  private ws: WebSocket | null = null;
  private pendingUpdates: Map<string, any> = new Map();
  private updateQueue: HMRUpdate[] = [];

  constructor(private viteDevServerUrl: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`${this.viteDevServerUrl}/__vite_hmr`);

      this.ws.onopen = () => {
        console.log('[HMR] Connected');
        resolve();
      };

      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      };

      this.ws.onerror = (error) => {
        console.error('[HMR] Error:', error);
        reject(error);
      };
    });
  }

  private handleMessage(data: any): void {
    switch (data.type) {
      case 'connected':
        console.log('[HMR] Handshake complete');
        break;

      case 'update':
        this.queueUpdate({
          type: 'update',
          file: data.updates[0]?.path,
          timestamp: data.updates[0]?.timestamp,
          acceptedPath: data.updates[0]?.acceptedPath,
        });
        break;

      case 'full-reload':
        console.log('[HMR] Full reload required');
        window.location.reload();
        break;

      case 'prune':
        // 清理不再需要的模块
        break;
    }
  }

  private queueUpdate(update: HMRUpdate): void {
    this.updateQueue.push(update);
    this.processQueue();
  }

  private processQueue(): void {
    while (this.updateQueue.length > 0) {
      const update = this.updateQueue.shift()!;
      this.applyUpdate(update);
    }
  }

  private async applyUpdate(update: HMRUpdate): Promise<void> {
    if (update.acceptedPath) {
      // 热替换特定模块
      const newModule = await import(
        `${update.acceptedPath}?t=${update.timestamp}`
      );

      // React Fast Refresh 会自动处理组件更新
      console.log(`[HMR] Updated: ${update.file}`);
    }
  }

  // 触发文件更新
  async triggerUpdate(file: string, newContent: string): Promise<void> {
    // 1. 写入文件
    await fetch('/api/update-source', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file, content: newContent }),
    });

    // 2. Vite 会自动检测并触发 HMR
    // (通过 chokidar 文件监听)
  }
}
```

#### 4.3 React Fast Refresh 集成

```typescript
// vite.config.ts (完整配置)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { jsxTaggerPlugin } from './vite-plugin-jsx-tagger';

export default defineConfig({
  plugins: [
    // 1. JSX 标记插件 (在 React 插件之前)
    jsxTaggerPlugin(),

    // 2. React Fast Refresh
    react({
      fastRefresh: true,
      // Babel 配置
      babel: {
        plugins: [
          // 保留行号信息
          '@babel/plugin-transform-react-jsx-source',
        ],
      },
    }),
  ],

  server: {
    port: 5173,
    hmr: {
      // HMR 配置
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      overlay: true,
    },
    watch: {
      // 监听源文件变化
      usePolling: false,
      interval: 100,
    },
  },

  // 优化 HMR
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
```

---

### 模块 5: 完整的 Visual Editor 工作流

#### 5.1 端到端流程

```
┌─────────────────────────────────────────────────────────────────┐
│                    Visual Editor 完整工作流                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. 用户点击预览中的元素                                     │ │
│  │    - 元素带有 data-jsx-id="abc123"                         │ │
│  │    - 触发 click 事件                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             │                                    │
│                             ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 2. 获取源码位置                                             │ │
│  │    - 查询 JSX Source Map                                   │ │
│  │    - 返回: { file: "src/Hero.tsx", line: 12, col: 4 }     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             │                                    │
│                             ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 3. 加载源文件到编辑器                                       │ │
│  │    - 读取 src/Hero.tsx                                     │ │
│  │    - 解析为 AST                                            │ │
│  │    - 高亮目标节点                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             │                                    │
│                             ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 4. 用户在编辑面板修改属性                                   │ │
│  │    - 修改文本: "Hello" → "你好"                            │ │
│  │    - 修改样式: 添加 text-blue-500                          │ │
│  │    - 修改属性: href="/new-link"                            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             │                                    │
│          ┌──────────────────┼──────────────────┐                │
│          ▼                  ▼                  ▼                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 5a. 乐观更新 │  │ 5b. AST变换  │  │ 5c. 代码生成 │          │
│  │ - 更新DOM    │  │ - 修改AST    │  │ - 生成代码   │          │
│  │ - 即时反馈   │  │ - 保留格式   │  │ - Tailwind   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│          │                  │                  │                 │
│          └──────────────────┼──────────────────┘                │
│                             ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 6. 保存到文件系统                                           │ │
│  │    - 写入 src/Hero.tsx                                     │ │
│  │    - 触发 Vite 文件监听                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             │                                    │
│                             ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 7. HMR 热更新                                               │ │
│  │    - Vite 增量编译                                         │ │
│  │    - WebSocket 推送                                        │ │
│  │    - React Fast Refresh                                    │ │
│  │    - 组件状态保持                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
│                             │                                    │
│                             ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 8. 预览更新完成                                             │ │
│  │    - 无需刷新页面                                          │ │
│  │    - 状态保持                                              │ │
│  │    - 流畅体验                                              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、升级实施计划

### Phase 1: 基础设施升级 (第 1-2 周)

#### 1.1 迁移到 Vite + React 完整项目

```bash
# 当前: 生成纯 HTML/CSS/JS
# 目标: 生成完整 React + Vite 项目

generated-project/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   └── Footer.tsx
│   └── styles/
│       └── globals.css
└── public/
    └── assets/
```

#### 1.2 实现 Vite JSX Tagger 插件

- [ ] 开发 `vite-plugin-jsx-tagger`
- [ ] 实现编译时 data 属性注入
- [ ] 实现源码映射 API
- [ ] 单元测试覆盖

#### 1.3 升级 Fly.io 服务器

```dockerfile
# 从纯静态服务 → Vite Dev Server
FROM oven/bun:1-alpine

WORKDIR /app

# 安装 Vite 和依赖
COPY package.json bun.lock* ./
RUN bun install

# 复制项目源码
COPY . .

# 启动 Vite Dev Server
EXPOSE 5173
CMD ["bun", "run", "dev", "--host", "0.0.0.0"]
```

### Phase 2: AST 处理系统 (第 3-4 周)

#### 2.1 集成 SWC WASM

- [ ] 安装 @swc/wasm-web
- [ ] 实现 JSX/TSX 解析器
- [ ] 实现 AST 遍历和查找
- [ ] 实现 AST 变换器
- [ ] 实现代码生成器

#### 2.2 实现 Tailwind 映射器

- [ ] 核心 CSS 属性映射
- [ ] 类名冲突处理
- [ ] 自定义值支持 (arbitrary values)
- [ ] 响应式类名生成

### Phase 3: Visual Editor 升级 (第 5-6 周)

#### 3.1 升级编辑面板 UI

- [ ] 分类样式面板
- [ ] 颜色选择器
- [ ] 间距可视化编辑器
- [ ] 布局配置器
- [ ] 尺寸调整器

#### 3.2 实现双向绑定

- [ ] 点击元素 → 定位源码
- [ ] 修改属性 → 更新代码
- [ ] 代码变化 → 更新预览
- [ ] 支持打开 VS Code

### Phase 4: HMR 集成 (第 7-8 周)

#### 4.1 Vite HMR 配置

- [ ] 配置 React Fast Refresh
- [ ] 配置文件监听
- [ ] WebSocket 通道
- [ ] 状态保持

#### 4.2 乐观更新系统

- [ ] DOM 即时更新
- [ ] 更新队列管理
- [ ] 冲突检测
- [ ] 回滚机制

### Phase 5: AI 代码生成升级 (第 9-10 周)

#### 5.1 升级 Prompt 系统

```typescript
const UPGRADED_SYSTEM_PROMPT = `
你是一个专业的 React 前端工程师，专门生成高质量的 React + Tailwind CSS 组件。

生成要求:
1. 使用 React 函数组件 + TypeScript
2. 所有样式使用 Tailwind CSS 类名
3. 组件必须遵循 JSX 最佳实践
4. 支持响应式设计 (sm/md/lg/xl 断点)
5. 导出默认组件

文件结构:
\`\`\`tsx
// src/components/ComponentName.tsx
import React from 'react';

interface ComponentNameProps {
  // props 定义
}

export default function ComponentName({ ...props }: ComponentNameProps) {
  return (
    <div className="...">
      {/* 组件内容 */}
    </div>
  );
}
\`\`\`

请根据用户需求生成完整的 React 项目文件。
`;
```

#### 5.2 代码质量保证

- [ ] TypeScript 类型检查
- [ ] ESLint 代码规范
- [ ] Prettier 格式化
- [ ] 组件 Props 验证

---

## 四、API 设计升级

### 新增 API 端点

```typescript
// Backend API

// 1. 源码操作
POST /api/projects/:id/source/read
  - 读取源文件内容

POST /api/projects/:id/source/write
  - 写入源文件 (触发 HMR)

POST /api/projects/:id/source/transform
  - AST 变换操作

// 2. JSX 映射
GET /api/projects/:id/jsx-source-map
  - 获取 JSX ID 到源码位置的映射

GET /api/projects/:id/jsx-locate?id=xxx
  - 根据 JSX ID 获取源码位置

// 3. HMR
WS /api/projects/:id/hmr
  - HMR WebSocket 连接

// 4. 编译
POST /api/projects/:id/build
  - 触发生产构建

GET /api/projects/:id/build/status
  - 获取构建状态
```

---

## 五、数据库 Schema 升级

```sql
-- 新增 source_files 表 (替代 project_files)
CREATE TABLE source_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,  -- 相对路径: src/components/Hero.tsx
  content TEXT NOT NULL,
  file_type VARCHAR(50),  -- tsx | ts | css | json
  ast_cache JSONB,  -- 缓存的 AST (可选)
  jsx_map JSONB,  -- JSX ID 映射
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_id, file_path)
);

-- 新增 edit_sessions 表 (Visual Edit 会话)
CREATE TABLE edit_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID,  -- 未来支持多用户
  created_at TIMESTAMP DEFAULT NOW(),
  last_active_at TIMESTAMP DEFAULT NOW()
);

-- 新增 edit_operations 表 (原子操作记录)
CREATE TABLE edit_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES edit_sessions(id) ON DELETE CASCADE,
  file_path VARCHAR(500) NOT NULL,
  operation_type VARCHAR(50) NOT NULL,  -- updateText | updateStyle | ...
  jsx_id VARCHAR(100),
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_source_files_project ON source_files(project_id);
CREATE INDEX idx_source_files_path ON source_files(file_path);
CREATE INDEX idx_edit_ops_session ON edit_operations(session_id);
```

---

## 六、技术栈升级总结

| 组件 | 当前 | 升级后 |
|------|------|--------|
| **代码生成** | HTML/CSS/JS | React + TypeScript + Tailwind |
| **代码标记** | CSS 选择器 | Stable JSX Tagging (Vite Plugin) |
| **代码修改** | 字符串操作 | AST 解析 (SWC WASM) |
| **样式系统** | 内联 style | Tailwind CSS 类名 |
| **热更新** | 全页刷新 | Vite HMR + React Fast Refresh |
| **预览服务** | 静态文件 | Vite Dev Server |
| **源码映射** | 无 | 双向映射 (UI ↔ 源码) |

---

## 七、预期效果

### 7.1 用户体验提升

| 指标 | 当前 | 升级后 |
|------|------|--------|
| 编辑响应时间 | ~500ms (DOM刷新) | <50ms (乐观更新) |
| 热更新时间 | ~2s (全页刷新) | ~200ms (HMR) |
| 代码质量 | HTML字符串 | 标准 React/TSX |
| 样式可维护性 | 低 (内联) | 高 (Tailwind) |
| 源码定位 | 不支持 | 双向映射 |

### 7.2 开发者体验提升

- ✅ 点击元素直接跳转到 VS Code 对应位置
- ✅ 生成的代码可直接导出为完整项目
- ✅ Tailwind 类名符合行业标准
- ✅ TypeScript 类型安全
- ✅ 支持组件级别的编辑和复用

---

## 八、风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| SWC WASM 体积大 | 首次加载慢 | 延迟加载、CDN 缓存 |
| AST 变换复杂 | 边界情况多 | 全面测试、回退机制 |
| HMR 状态丢失 | 用户困惑 | React Fast Refresh 优化 |
| Fly.io 资源占用 | 成本增加 | 按需启动、资源限制 |

---

## 九、里程碑

| 阶段 | 时间 | 交付物 |
|------|------|--------|
| M1 | 第 2 周 | Vite 插件 + 项目模板 |
| M2 | 第 4 周 | AST 处理系统 |
| M3 | 第 6 周 | Visual Editor 升级版 |
| M4 | 第 8 周 | HMR 集成完成 |
| M5 | 第 10 周 | AI 生成升级 + 全功能测试 |

---

*文档版本: v1.0*
*最后更新: 2024*
