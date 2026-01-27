# Visual Edit 升级改造方案

## 对标 Lovable Visual Edit 全功能实现

> 基于 Lovable 官方博客 (https://lovable.dev/blog/visual-edits) 的技术分析

---

## 实现状态总览 (2025-01)

### ✅ 已完成的核心功能

| 模块 | 包名 | 状态 | 说明 |
|------|-----|------|------|
| **Vite JSX Tagger** | `vite-plugin-jsx-tagger` | ✅ 已实现 | Babel 插件注入 data-jsx-* 属性 |
| **位置信息注入** | `vite-plugin-jsx-tagger` | ✅ 已实现 | data-jsx-file, data-jsx-line, data-jsx-col |
| **源码映射 API** | `vite-plugin-jsx-tagger` | ✅ 已实现 | /__jsx-source-map, /__jsx-locate API |
| **AST 处理系统** | `ast-processor` | ✅ 已实现 | SWC WASM 解析、变换、生成 |
| **Tailwind 映射** | `ast-processor` | ✅ 已实现 | CSS 到 Tailwind 类名转换 |
| **Visual Editor UI** | `visual-editor` | ✅ 已实现 | PropertyPanel, 控件组件 |
| **注入脚本** | `visual-editor/injection` | ✅ 已实现 | 元素选择、高亮、拖拽 |
| **HMR 系统** | `hmr-system` | ✅ 已实现 | Vite 进程管理、WebSocket 代理 |

### ⚠️ 待迁移 (内联实现 → packages)

| 当前位置 | 迁移目标 | 优先级 |
|---------|---------|--------|
| `fly-server/src/services/scaffolder.ts` generateJsxIdPlugin() | `vite-plugin-jsx-tagger` | 高 |
| `fly-server/static/visual-edit-script.js` | `visual-editor/injection` | 高 |
| `backend/src/routes/proxy.ts` VISUAL_EDIT_SCRIPT | `visual-editor/injection` | 中 |
| `frontend/src/components/VisualEditPanel.tsx` | `visual-editor` PropertyPanel | 中 |

### 📦 Packages 模块化架构

```
packages/
├── vite-plugin-jsx-tagger/     # 编译时 JSX 标记注入
│   ├── src/
│   │   ├── index.ts            # Vite 插件入口
│   │   ├── babel-plugin.ts     # Babel 变换插件
│   │   ├── id-generator.ts     # 稳定 ID 生成
│   │   ├── source-map.ts       # 源码映射管理
│   │   └── types.ts            # 类型定义
│   └── tests/
│
├── ast-processor/              # AST 解析与变换
│   ├── src/
│   │   ├── parser/             # SWC WASM 解析器
│   │   ├── traverser/          # AST 遍历器
│   │   ├── transformers/       # 变换器 (text, style, attribute, structure)
│   │   ├── generator/          # 代码生成器
│   │   ├── tailwind/           # Tailwind 映射 & 预设
│   │   └── utils/              # 工具函数
│   └── tests/
│
├── visual-editor/              # Visual Editor UI 组件
│   ├── src/
│   │   ├── components/         # React 组件
│   │   ├── hooks/              # 自定义 Hooks
│   │   ├── stores/             # Zustand 状态管理
│   │   ├── services/           # 服务层
│   │   └── utils/              # 工具函数
│   ├── injection/              # 注入脚本
│   │   └── visual-edit-script.ts
│   └── tests/
│
├── hmr-system/                 # HMR 热更新系统
│   ├── src/
│   │   ├── server/             # Vite 服务器管理
│   │   ├── client/             # HMR 客户端
│   │   └── sync/               # 文件同步、冲突解决
│   └── tests/
│
├── ai-generator/               # AI 代码生成
├── template-generator/         # 模板生成器
└── project-template/           # 项目模板
```

### 依赖关系

```
vite-plugin-jsx-tagger (基础层 - 编译时标记)
         ↓
    ast-processor (代码处理 - 运行时变换)
         ↓
    visual-editor (UI + 注入脚本)
         ↓
     hmr-system (实时同步)
```

---

## 一、当前系统 vs Lovable 对比分析

### 1. 功能对比矩阵

| 功能模块 | 当前系统 | Lovable | 实现状态 |
|---------|---------|---------|---------|
| **代码标记** | Babel 插件 + data-jsx-* | Stable JSX Tagging | ✅ 已实现 (fly-server 内联 + packages) |
| **源码定位** | data-jsx-file/line/col | 双向映射 (UI ↔ 源码) | ✅ 已实现 |
| **代码修改** | SWC WASM AST | AST 解析修改 | ✅ 已实现 (ast-processor) |
| **样式系统** | Tailwind 映射 | Tailwind CSS 生成 | ✅ 已实现 (ast-processor/tailwind) |
| **热更新** | Vite Dev Server + HMR | HMR 热模块替换 | ✅ 已实现 (hmr-system) |
| **乐观更新** | DOM + AST | AST + DOM | ✅ 已实现 (visual-editor) |
| **撤销/重做** | useEditHistory | 有 | ✅ 已实现 |
| **多设备预览** | DeviceSelector | 有 | ✅ 已实现 |

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

## 重构路线图：从内联实现迁移到 packages

### Phase 1: vite-plugin-jsx-tagger 集成
**风险: 低** | **影响: fly-server**

```
当前: fly-server/src/services/scaffolder.ts → generateJsxIdPlugin() (内联 Babel 插件)
目标: 使用 packages/vite-plugin-jsx-tagger
```

**步骤:**
1. 在生成的项目 `package.json` 中添加 `vite-plugin-jsx-tagger` 依赖
2. 更新 `generateViteConfig()` 使用包导入而非内联插件
3. 删除 `generateJsxIdPlugin()` 函数 (~90行)
4. 测试生成的项目是否正确注入 data-jsx-* 属性

**验证:**
- 生成新项目
- 检查 DOM 元素是否有 `data-jsx-id`, `data-jsx-file`, `data-jsx-line`, `data-jsx-col`
- 验证 HMR 热更新正常

### Phase 2: visual-edit-script 集成
**风险: 中** | **影响: fly-server, backend**

```
当前:
  - fly-server/static/visual-edit-script.js (~600行)
  - backend/src/routes/proxy.ts VISUAL_EDIT_SCRIPT (~500行内联)

目标: 使用 packages/visual-editor/injection/visual-edit-script.ts
```

**步骤:**
1. 构建 `packages/visual-editor` 确保 injection 脚本可用
2. 更新 `fly-server/src/index.ts` 脚本注入路径
3. 更新 `backend/src/routes/proxy.ts` 使用包版本脚本
4. 删除 `fly-server/static/visual-edit-script.js`
5. 测试元素选择、高亮、拖拽功能

**验证:**
- 点击预览中的元素
- 检查元素高亮、选中框
- 验证 postMessage 通信
- 测试拖拽调整大小

### Phase 3: VisualEditPanel UI 集成
**风险: 中高** | **影响: frontend**

```
当前: frontend/src/components/VisualEditPanel.tsx (内联控件)
目标: 使用 packages/visual-editor PropertyPanel 组件
```

**步骤:**
1. 在 `frontend/package.json` 添加 `visual-editor` 依赖
2. 创建适配层匹配现有 props 接口
3. 逐步替换内联控件为包组件
4. 迁移状态管理到 `useEditorStore`
5. 测试所有编辑操作 (文本、样式、布局)

**验证:**
- 打开属性面板
- 修改文本内容 → 验证实时更新
- 修改样式属性 → 验证 Tailwind 类生成
- 测试撤销/重做
- 保存更改 → 验证持久化

### Phase 4: AST 处理服务适配
**风险: 高** | **影响: backend**

```
当前: backend/src/services/ast/index.ts (服务端 SWC 原生)
目标: 统一 API 接口与 packages/ast-processor 一致
```

**策略:** 保留服务端原生 SWC，但统一 API 接口

**步骤:**
1. 定义统一的 AST 处理接口 (TransformRequest, TransformResult)
2. 创建 `backend/src/services/ast/adapter.ts` 适配层
3. 逐步重构 `code-editor.ts` 使用新接口
4. 提取通用类型到共享 types 包
5. 测试所有编辑操作保持正常

**验证:**
- 位置匹配编辑测试
- 文本匹配编辑测试
- 批量编辑测试
- 性能基准测试

### 风险与回滚策略

| Phase | 风险 | 回滚策略 |
|-------|------|---------|
| 1 | 生成项目构建失败 | 恢复内联插件生成 |
| 2 | 元素选择不工作 | 恢复静态脚本文件 |
| 3 | UI 功能缺失 | 保留原组件作为备份 |
| 4 | AST 处理错误 | 保持原有服务不变 |

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
import { jsxTaggerPlugin } from './vite-1er';

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

当前 fly-server 仅提供静态文件服务，需要升级为支持动态 Vite 构建的完整开发服务器。

---

## B. 动态构建 (Fly-Server 升级方案)

### B.1 架构概述

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        动态构建架构 (Fly.io)                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────┐         ┌──────────────────────────────────────┐   │
│  │   Visual Editor │         │           Fly.io Machine              │   │
│  │   (Frontend)    │         │  ┌────────────────────────────────┐  │   │
│  │                 │◄───────►│  │      Fly-Server (Bun)          │  │   │
│  │  - 编辑面板     │  REST   │  │  ┌──────────────────────────┐  │  │   │
│  │  - 预览 iframe  │  +WS    │  │  │  Project Manager         │  │  │   │
│  │  - 代码编辑器   │         │  │  │  - 项目生命周期管理       │  │  │   │
│  └─────────────────┘         │  │  │  - 依赖安装               │  │  │   │
│                              │  │  │  - 文件 CRUD              │  │  │   │
│                              │  │  └──────────────────────────┘  │  │   │
│                              │  │                                 │  │   │
│                              │  │  ┌──────────────────────────┐  │  │   │
│                              │  │  │  Vite Dev Server Pool    │  │  │   │
│                              │  │  │  - 每项目独立 Vite 进程   │  │  │   │
│                              │  │  │  - HMR WebSocket 代理    │  │  │   │
│                              │  │  │  - 热更新推送            │  │  │   │
│                              │  │  └──────────────────────────┘  │  │   │
│                              │  │                                 │  │   │
│                              │  │  ┌──────────────────────────┐  │  │   │
│                              │  │  │  Volume Storage          │  │  │   │
│                              │  │  │  /data/projects/{id}/    │  │  │   │
│                              │  │  │  - 源码文件              │  │  │   │
│                              │  │  │  - node_modules         │  │  │   │
│                              │  │  │  - 构建缓存              │  │  │   │
│                              │  │  └──────────────────────────┘  │  │   │
│                              │  └────────────────────────────────┘  │   │
│                              └──────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### B.2 项目目录结构

```
/data/projects/{projectId}/
├── package.json              # 项目依赖配置
├── vite.config.ts            # Vite 配置 (含 jsx-tagger 插件)
├── tailwind.config.js        # Tailwind 配置
├── postcss.config.js         # PostCSS 配置
├── tsconfig.json             # TypeScript 配置
├── index.html                # 入口 HTML
├── src/
│   ├── main.tsx              # React 入口
│   ├── App.tsx               # 根组件
│   ├── components/           # 组件目录
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   └── ...
│   └── styles/
│       └── globals.css       # Tailwind 全局样式
├── node_modules/             # 依赖 (懒加载安装)
└── .vite/                    # Vite 缓存
```

### B.3 Fly-Server API 设计

```typescript
// fly-server/src/api/projects.ts

/**
 * 项目管理 API
 */

// 创建项目 (AI 生成后调用)
POST /api/projects
  Body: {
    projectId: string;
    projectName: string;
    description: string;
    files: Array<{
      path: string;      // 相对路径: src/App.tsx
      content: string;   // 文件内容
      language: string;  // tsx | ts | css | json
    }>;
  }
  Response: {
    success: boolean;
    projectUrl: string;  // https://preview.fly.dev/p/{projectId}/
    devServerPort: number;
  }

// 启动 Vite Dev Server
POST /api/projects/:projectId/dev-server/start
  Response: {
    success: boolean;
    port: number;
    wsUrl: string;       // HMR WebSocket URL
  }

// 停止 Vite Dev Server
POST /api/projects/:projectId/dev-server/stop
  Response: { success: boolean }

// 获取项目状态
GET /api/projects/:projectId/status
  Response: {
    exists: boolean;
    devServerRunning: boolean;
    port?: number;
    lastActive: string;
    fileCount: number;
  }

// 读取源文件
GET /api/projects/:projectId/files/:filePath
  Response: {
    content: string;
    language: string;
    lastModified: string;
  }

// 写入源文件 (触发 HMR)
PUT /api/projects/:projectId/files/:filePath
  Body: { content: string }
  Response: {
    success: boolean;
    hmrTriggered: boolean;
  }

// 批量更新文件
PATCH /api/projects/:projectId/files
  Body: {
    updates: Array<{
      path: string;
      content: string;
      operation: 'create' | 'update' | 'delete';
    }>;
  }
  Response: {
    success: boolean;
    updatedFiles: string[];
  }

// 获取 JSX Source Map
GET /api/projects/:projectId/jsx-source-map
  Response: {
    [jsxId: string]: {
      file: string;
      line: number;
      col: number;
      component: string;
    }
  }

// 生产构建
POST /api/projects/:projectId/build
  Response: {
    success: boolean;
    buildId: string;
    outputPath: string;
  }

// 获取构建状态
GET /api/projects/:projectId/build/:buildId
  Response: {
    status: 'pending' | 'building' | 'success' | 'failed';
    progress: number;
    logs: string[];
    outputUrl?: string;
  }
```

### B.4 Vite Dev Server 进程管理

```typescript
// fly-server/src/services/vite-manager.ts

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface ViteInstance {
  projectId: string;
  port: number;
  process: ChildProcess;
  wsPort: number;
  startedAt: Date;
  lastActive: Date;
}

class ViteDevServerManager extends EventEmitter {
  private instances: Map<string, ViteInstance> = new Map();
  private portPool: number[] = [];
  private readonly BASE_PORT = 5200;
  private readonly MAX_INSTANCES = 20;
  private readonly IDLE_TIMEOUT = 30 * 60 * 1000; // 30 分钟无活动自动停止

  constructor() {
    super();
    // 初始化端口池
    for (let i = 0; i < this.MAX_INSTANCES; i++) {
      this.portPool.push(this.BASE_PORT + i);
    }
    // 定时清理空闲实例
    setInterval(() => this.cleanupIdleInstances(), 60 * 1000);
  }

  async startDevServer(projectId: string, projectPath: string): Promise<ViteInstance> {
    // 检查是否已运行
    if (this.instances.has(projectId)) {
      const instance = this.instances.get(projectId)!;
      instance.lastActive = new Date();
      return instance;
    }

    // 获取可用端口
    const port = this.allocatePort();
    if (!port) {
      throw new Error('No available ports. Max instances reached.');
    }

    // 启动 Vite Dev Server
    const process = spawn('bun', ['run', 'vite', '--host', '0.0.0.0', '--port', String(port)], {
      cwd: projectPath,
      env: {
        ...process.env,
        NODE_ENV: 'development',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const instance: ViteInstance = {
      projectId,
      port,
      process,
      wsPort: port,
      startedAt: new Date(),
      lastActive: new Date(),
    };

    // 监听进程事件
    process.stdout?.on('data', (data) => {
      console.log(`[Vite:${projectId}] ${data}`);
      this.emit('log', { projectId, type: 'stdout', data: data.toString() });
    });

    process.stderr?.on('data', (data) => {
      console.error(`[Vite:${projectId}] ${data}`);
      this.emit('log', { projectId, type: 'stderr', data: data.toString() });
    });

    process.on('exit', (code) => {
      console.log(`[Vite:${projectId}] Process exited with code ${code}`);
      this.releasePort(port);
      this.instances.delete(projectId);
      this.emit('exit', { projectId, code });
    });

    // 等待服务器就绪
    await this.waitForServerReady(port);

    this.instances.set(projectId, instance);
    this.emit('started', { projectId, port });

    return instance;
  }

  async stopDevServer(projectId: string): Promise<void> {
    const instance = this.instances.get(projectId);
    if (!instance) return;

    instance.process.kill('SIGTERM');

    // 等待进程退出
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        instance.process.kill('SIGKILL');
        resolve();
      }, 5000);

      instance.process.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.releasePort(instance.port);
    this.instances.delete(projectId);
  }

  getDevServerUrl(projectId: string): string | null {
    const instance = this.instances.get(projectId);
    if (!instance) return null;
    return `http://localhost:${instance.port}`;
  }

  getHmrWebSocketUrl(projectId: string): string | null {
    const instance = this.instances.get(projectId);
    if (!instance) return null;
    return `ws://localhost:${instance.port}/__vite_hmr`;
  }

  markActive(projectId: string): void {
    const instance = this.instances.get(projectId);
    if (instance) {
      instance.lastActive = new Date();
    }
  }

  private allocatePort(): number | null {
    return this.portPool.shift() || null;
  }

  private releasePort(port: number): void {
    if (!this.portPool.includes(port)) {
      this.portPool.push(port);
    }
  }

  private async waitForServerReady(port: number, timeout = 30000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const response = await fetch(`http://localhost:${port}`, { method: 'HEAD' });
        if (response.ok) return;
      } catch {
        // 服务器尚未就绪
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error('Vite server startup timeout');
  }

  private cleanupIdleInstances(): void {
    const now = Date.now();
    for (const [projectId, instance] of this.instances) {
      if (now - instance.lastActive.getTime() > this.IDLE_TIMEOUT) {
        console.log(`[Vite:${projectId}] Stopping idle instance`);
        this.stopDevServer(projectId);
      }
    }
  }
}

export const viteManager = new ViteDevServerManager();
```

### B.5 HMR WebSocket 代理

```typescript
// fly-server/src/services/hmr-proxy.ts

import { WebSocket, WebSocketServer } from 'ws';
import http from 'http';

interface HmrProxyConfig {
  server: http.Server;
  path: string;  // /hmr/:projectId
}

class HmrWebSocketProxy {
  private clientConnections: Map<string, Set<WebSocket>> = new Map();
  private viteConnections: Map<string, WebSocket> = new Map();
  private wss: WebSocketServer;

  constructor(config: HmrProxyConfig) {
    this.wss = new WebSocketServer({
      server: config.server,
      path: config.path,
    });

    this.wss.on('connection', (ws, req) => {
      const projectId = this.extractProjectId(req.url);
      if (!projectId) {
        ws.close(1008, 'Missing projectId');
        return;
      }

      this.handleClientConnection(projectId, ws);
    });
  }

  private extractProjectId(url: string | undefined): string | null {
    if (!url) return null;
    const match = url.match(/\/hmr\/([^\/\?]+)/);
    return match ? match[1] : null;
  }

  private handleClientConnection(projectId: string, clientWs: WebSocket): void {
    // 记录客户端连接
    if (!this.clientConnections.has(projectId)) {
      this.clientConnections.set(projectId, new Set());
    }
    this.clientConnections.get(projectId)!.add(clientWs);

    // 确保连接到 Vite HMR
    this.ensureViteConnection(projectId);

    // 转发客户端消息到 Vite
    clientWs.on('message', (data) => {
      const viteWs = this.viteConnections.get(projectId);
      if (viteWs && viteWs.readyState === WebSocket.OPEN) {
        viteWs.send(data);
      }
    });

    // 清理断开的连接
    clientWs.on('close', () => {
      this.clientConnections.get(projectId)?.delete(clientWs);

      // 如果没有客户端连接，断开 Vite 连接
      if (this.clientConnections.get(projectId)?.size === 0) {
        this.viteConnections.get(projectId)?.close();
        this.viteConnections.delete(projectId);
      }
    });
  }

  private ensureViteConnection(projectId: string): void {
    if (this.viteConnections.has(projectId)) return;

    const viteWsUrl = viteManager.getHmrWebSocketUrl(projectId);
    if (!viteWsUrl) return;

    const viteWs = new WebSocket(viteWsUrl);

    viteWs.on('open', () => {
      console.log(`[HMR Proxy] Connected to Vite for project ${projectId}`);
    });

    // 转发 Vite 消息到所有客户端
    viteWs.on('message', (data) => {
      const clients = this.clientConnections.get(projectId);
      if (clients) {
        for (const client of clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        }
      }
    });

    viteWs.on('close', () => {
      console.log(`[HMR Proxy] Disconnected from Vite for project ${projectId}`);
      this.viteConnections.delete(projectId);
    });

    viteWs.on('error', (error) => {
      console.error(`[HMR Proxy] Error for project ${projectId}:`, error);
    });

    this.viteConnections.set(projectId, viteWs);
  }

  // 广播 HMR 更新
  broadcastUpdate(projectId: string, update: any): void {
    const clients = this.clientConnections.get(projectId);
    if (!clients) return;

    const message = JSON.stringify(update);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}

export { HmrWebSocketProxy };
```

### B.6 项目脚手架生成

```typescript
// fly-server/src/services/project-scaffold.ts

import { mkdir, writeFile, exists } from 'fs/promises';
import { join } from 'path';

interface ProjectConfig {
  projectId: string;
  projectName: string;
  description: string;
}

interface GeneratedFile {
  path: string;
  content: string;
}

async function generateProjectScaffold(
  config: ProjectConfig,
  files: GeneratedFile[]
): Promise<string> {
  const projectPath = `/data/projects/${config.projectId}`;

  // 创建项目目录
  await mkdir(projectPath, { recursive: true });
  await mkdir(join(projectPath, 'src/components'), { recursive: true });
  await mkdir(join(projectPath, 'src/styles'), { recursive: true });
  await mkdir(join(projectPath, 'public'), { recursive: true });

  // 生成配置文件
  const scaffoldFiles = [
    {
      path: 'package.json',
      content: generatePackageJson(config),
    },
    {
      path: 'vite.config.ts',
      content: generateViteConfig(config),
    },
    {
      path: 'tsconfig.json',
      content: generateTsConfig(),
    },
    {
      path: 'tailwind.config.js',
      content: generateTailwindConfig(),
    },
    {
      path: 'postcss.config.js',
      content: generatePostCssConfig(),
    },
    {
      path: 'index.html',
      content: generateIndexHtml(config),
    },
    {
      path: 'src/styles/globals.css',
      content: generateGlobalsCss(),
    },
  ];

  // 写入脚手架文件
  for (const file of scaffoldFiles) {
    await writeFile(join(projectPath, file.path), file.content);
  }

  // 写入 AI 生成的文件
  for (const file of files) {
    const filePath = join(projectPath, file.path);
    await mkdir(join(projectPath, file.path, '..'), { recursive: true });
    await writeFile(filePath, file.content);
  }

  return projectPath;
}

function generatePackageJson(config: ProjectConfig): string {
  return JSON.stringify({
    name: config.projectName.toLowerCase().replace(/\s+/g, '-'),
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
    },
    devDependencies: {
      '@types/react': '^18.2.0',
      '@types/react-dom': '^18.2.0',
      '@vitejs/plugin-react': '^4.2.0',
      autoprefixer: '^10.4.16',
      postcss: '^8.4.32',
      tailwindcss: '^3.4.0',
      typescript: '^5.3.0',
      vite: '^5.0.0',
      'vite-plugin-jsx-tagger': 'workspace:*',
    },
  }, null, 2);
}

function generateViteConfig(config: ProjectConfig): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { jsxTaggerPlugin } from 'vite-plugin-jsx-tagger';

export default defineConfig({
  plugins: [
    jsxTaggerPlugin({
      idPrefix: '${config.projectId.slice(0, 8)}',
    }),
    react(),
  ],
  server: {
    host: '0.0.0.0',
    hmr: {
      protocol: 'ws',
    },
  },
});
`;
}

function generateTsConfig(): string {
  return JSON.stringify({
    compilerOptions: {
      target: 'ES2020',
      useDefineForClassFields: true,
      lib: ['ES2020', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      skipLibCheck: true,
      moduleResolution: 'bundler',
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: 'react-jsx',
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
      paths: {
        '@/*': ['./src/*'],
      },
    },
    include: ['src'],
  }, null, 2);
}

function generateTailwindConfig(): string {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;
}

function generatePostCssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

function generateIndexHtml(config: ProjectConfig): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${escapeHtml(config.description)}" />
    <title>${escapeHtml(config.projectName)}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function generateGlobalsCss(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export { generateProjectScaffold };
```

### B.7 依赖安装管理

```typescript
// fly-server/src/services/dependency-manager.ts

import { spawn } from 'child_process';
import { exists } from 'fs/promises';
import { join } from 'path';

interface InstallResult {
  success: boolean;
  duration: number;
  logs: string[];
}

class DependencyManager {
  private installQueue: Map<string, Promise<InstallResult>> = new Map();

  async ensureDependencies(projectPath: string): Promise<InstallResult> {
    const nodeModulesPath = join(projectPath, 'node_modules');

    // 检查是否已安装
    if (await exists(nodeModulesPath)) {
      return { success: true, duration: 0, logs: ['Dependencies already installed'] };
    }

    // 避免重复安装
    const existingInstall = this.installQueue.get(projectPath);
    if (existingInstall) {
      return existingInstall;
    }

    // 执行安装
    const installPromise = this.runInstall(projectPath);
    this.installQueue.set(projectPath, installPromise);

    try {
      const result = await installPromise;
      return result;
    } finally {
      this.installQueue.delete(projectPath);
    }
  }

  private async runInstall(projectPath: string): Promise<InstallResult> {
    const start = Date.now();
    const logs: string[] = [];

    return new Promise((resolve) => {
      const process = spawn('bun', ['install'], {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      process.stdout?.on('data', (data) => {
        logs.push(data.toString());
      });

      process.stderr?.on('data', (data) => {
        logs.push(data.toString());
      });

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          duration: Date.now() - start,
          logs,
        });
      });

      process.on('error', (error) => {
        logs.push(`Error: ${error.message}`);
        resolve({
          success: false,
          duration: Date.now() - start,
          logs,
        });
      });
    });
  }

  async addDependency(projectPath: string, packageName: string, isDev = false): Promise<InstallResult> {
    const start = Date.now();
    const logs: string[] = [];
    const args = ['add', packageName];
    if (isDev) args.push('-D');

    return new Promise((resolve) => {
      const process = spawn('bun', args, {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      process.stdout?.on('data', (data) => logs.push(data.toString()));
      process.stderr?.on('data', (data) => logs.push(data.toString()));

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          duration: Date.now() - start,
          logs,
        });
      });
    });
  }
}

export const dependencyManager = new DependencyManager();
```

### B.8 Dockerfile 配置

```dockerfile
# fly-server/Dockerfile

FROM oven/bun:1-alpine

# 安装必要工具
RUN apk add --no-cache git

WORKDIR /app

# 复制服务代码
COPY package.json bun.lock* ./
COPY src ./src

# 安装服务依赖
RUN bun install --production

# 创建数据目录
RUN mkdir -p /data/projects

# 环境变量
ENV NODE_ENV=production
ENV PROJECTS_PATH=/data/projects
ENV PORT=3000

# 暴露端口
# 3000: 主 API 服务
# 5200-5219: Vite Dev Server 端口池
EXPOSE 3000
EXPOSE 5200-5219

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 启动服务
CMD ["bun", "run", "src/index.ts"]
```

### B.9 Fly.io 配置

```toml
# fly-server/fly.toml

app = "ai-site-generator-preview"
primary_region = "hkg"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PROJECTS_PATH = "/data/projects"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false  # 保持运行以维持 Dev Server
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  internal_port = 3000
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    interval = "15s"
    timeout = "2s"
    grace_period = "5s"

# Vite Dev Server 端口代理
[[services]]
  internal_port = 5200
  protocol = "tcp"

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 5200

# Volume 持久化存储
[[mounts]]
  source = "projects_data"
  destination = "/data/projects"

[vm]
  cpu_kind = "shared"
  cpus = 2
  memory_mb = 2048

# 自动扩缩容
[[vm]]
  memory = "2gb"
  cpu_kind = "shared"
  cpus = 2

[checks]
  [checks.health]
    port = 3000
    type = "http"
    interval = "15s"
    timeout = "5s"
    path = "/health"
```

### B.10 资源管理与限制

```typescript
// fly-server/src/services/resource-manager.ts

interface ResourceLimits {
  maxProjects: number;
  maxProjectSize: number;  // bytes
  maxFilesPerProject: number;
  devServerIdleTimeout: number;  // ms
  buildTimeout: number;  // ms
}

const DEFAULT_LIMITS: ResourceLimits = {
  maxProjects: 100,
  maxProjectSize: 50 * 1024 * 1024,  // 50MB
  maxFilesPerProject: 500,
  devServerIdleTimeout: 30 * 60 * 1000,  // 30 minutes
  buildTimeout: 5 * 60 * 1000,  // 5 minutes
};

class ResourceManager {
  private limits: ResourceLimits = DEFAULT_LIMITS;

  async checkProjectQuota(projectId: string): Promise<boolean> {
    const projectCount = await this.getProjectCount();
    return projectCount < this.limits.maxProjects;
  }

  async getProjectSize(projectPath: string): Promise<number> {
    // 使用 du 命令获取目录大小
    const { stdout } = await Bun.spawn(['du', '-sb', projectPath]);
    const size = parseInt(await new Response(stdout).text(), 10);
    return size;
  }

  async cleanupOldProjects(): Promise<string[]> {
    // 清理超过 7 天未活跃的项目
    const threshold = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const cleaned: string[] = [];

    // 实现清理逻辑...

    return cleaned;
  }

  getMemoryUsage(): { used: number; total: number; percent: number } {
    const used = process.memoryUsage().heapUsed;
    const total = process.memoryUsage().heapTotal;
    return {
      used,
      total,
      percent: Math.round((used / total) * 100),
    };
  }
}

export const resourceManager = new ResourceManager();
```

### B.11 监控与日志

```typescript
// fly-server/src/services/monitoring.ts

interface Metrics {
  activeProjects: number;
  runningDevServers: number;
  totalRequests: number;
  avgResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
}

class MonitoringService {
  private requestCount = 0;
  private responseTimes: number[] = [];

  recordRequest(duration: number): void {
    this.requestCount++;
    this.responseTimes.push(duration);

    // 保持最近 1000 条记录
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  getMetrics(): Metrics {
    const avgResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length
      : 0;

    return {
      activeProjects: viteManager.getActiveCount(),
      runningDevServers: viteManager.getRunningCount(),
      totalRequests: this.requestCount,
      avgResponseTime: Math.round(avgResponseTime),
      memoryUsage: process.memoryUsage().heapUsed,
      cpuUsage: 0,  // 需要额外实现
    };
  }

  // 暴露 Prometheus 格式的指标
  getPrometheusMetrics(): string {
    const metrics = this.getMetrics();
    return `
# HELP fly_server_active_projects Number of active projects
# TYPE fly_server_active_projects gauge
fly_server_active_projects ${metrics.activeProjects}

# HELP fly_server_running_dev_servers Number of running Vite dev servers
# TYPE fly_server_running_dev_servers gauge
fly_server_running_dev_servers ${metrics.runningDevServers}

# HELP fly_server_total_requests Total number of requests
# TYPE fly_server_total_requests counter
fly_server_total_requests ${metrics.totalRequests}

# HELP fly_server_avg_response_time_ms Average response time in milliseconds
# TYPE fly_server_avg_response_time_ms gauge
fly_server_avg_response_time_ms ${metrics.avgResponseTime}

# HELP fly_server_memory_usage_bytes Memory usage in bytes
# TYPE fly_server_memory_usage_bytes gauge
fly_server_memory_usage_bytes ${metrics.memoryUsage}
`.trim();
  }
}

export const monitoring = new MonitoringService();
```

---

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
