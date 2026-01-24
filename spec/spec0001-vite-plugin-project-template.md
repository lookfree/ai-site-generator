# SPEC-0001: Vite 插件 + 项目模板

> **阶段**: M1 (第 1-2 周)
> **状态**: 待开始
> **优先级**: P0 - 基础设施

---

## 1. 目标概述

### 1.1 核心目标

实现 Lovable 风格的 Stable JSX Tagging 系统，为后续的 Visual Edit 功能奠定基础。

### 1.2 交付物清单

| 序号 | 交付物 | 描述 | 验收标准 |
|------|--------|------|---------|
| D1 | vite-plugin-jsx-tagger | Vite 编译时插件 | 所有 JSX 元素自动注入 data-jsx-* 属性 |
| D2 | React 项目模板 | 标准化项目结构 | 可运行的 Vite + React + Tailwind 项目 |
| D3 | 源码映射 API | JSX ID ↔ 源码位置映射 | API 可正确返回文件路径和行号 |
| D4 | 模板生成器 | 项目初始化工具 | 一键生成完整项目结构 |

---

## 2. 技术规格

### 2.1 Vite 插件: vite-plugin-jsx-tagger

#### 2.1.1 插件职责

```
源代码 (JSX/TSX)
    │
    ▼ Babel Transform
编译时注入 data-jsx-* 属性
    │
    ▼
运行时可追溯源码位置
```

#### 2.1.2 文件结构

```
packages/
└── vite-plugin-jsx-tagger/
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts              # 插件入口
    │   ├── babel-plugin.ts       # Babel 转换插件
    │   ├── source-map.ts         # 源码映射管理
    │   ├── id-generator.ts       # 稳定 ID 生成器
    │   └── types.ts              # TypeScript 类型定义
    ├── tests/
    │   ├── transform.test.ts     # 转换测试
    │   ├── source-map.test.ts    # 映射测试
    │   └── fixtures/             # 测试用例
    └── README.md
```

#### 2.1.3 核心实现

```typescript
// src/index.ts
import { Plugin } from 'vite';
import { transformSync } from '@babel/core';
import { jsxTaggerBabelPlugin } from './babel-plugin';
import { SourceMapManager } from './source-map';

export interface JsxTaggerOptions {
  // 是否在生产环境中移除标记
  removeInProduction?: boolean;
  // 要排除的文件模式
  exclude?: string[];
  // 自定义 ID 前缀
  idPrefix?: string;
}

export function jsxTaggerPlugin(options: JsxTaggerOptions = {}): Plugin {
  const sourceMapManager = new SourceMapManager();
  const isDev = process.env.NODE_ENV !== 'production';

  return {
    name: 'vite-plugin-jsx-tagger',
    enforce: 'pre',

    transform(code: string, id: string) {
      // 仅处理 JSX/TSX
      if (!/\.[jt]sx$/.test(id)) return null;

      // 排除 node_modules
      if (id.includes('node_modules')) return null;

      // 生产环境可选跳过
      if (!isDev && options.removeInProduction) return null;

      const result = transformSync(code, {
        filename: id,
        plugins: [
          ['@babel/plugin-syntax-typescript', { isTSX: true }],
          [jsxTaggerBabelPlugin, {
            sourceMapManager,
            filePath: id,
            idPrefix: options.idPrefix
          }],
        ],
        sourceMaps: true,
      });

      if (!result) return null;

      return {
        code: result.code!,
        map: result.map,
      };
    },

    configureServer(server) {
      // 源码映射查询 API
      server.middlewares.use('/__jsx-source-map', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify(sourceMapManager.getAll()));
      });

      // 单个 JSX ID 定位 API
      server.middlewares.use('/__jsx-locate', (req, res) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const jsxId = url.searchParams.get('id');

        if (!jsxId) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Missing id parameter' }));
          return;
        }

        const location = sourceMapManager.get(jsxId);
        if (location) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(location));
        } else {
          res.statusCode = 404;
          res.end(JSON.stringify({ error: 'JSX ID not found' }));
        }
      });
    },
  };
}
```

#### 2.1.4 Babel 插件实现

```typescript
// src/babel-plugin.ts
import { PluginObj, types as t } from '@babel/core';
import { generateStableId } from './id-generator';
import { SourceMapManager, JsxLocation } from './source-map';

interface PluginOptions {
  sourceMapManager: SourceMapManager;
  filePath: string;
  idPrefix?: string;
}

export function jsxTaggerBabelPlugin(): PluginObj {
  return {
    name: 'jsx-tagger',

    visitor: {
      JSXOpeningElement(path, state) {
        const opts = state.opts as PluginOptions;
        const { sourceMapManager, filePath, idPrefix = '' } = opts;

        // 获取位置信息
        const loc = path.node.loc;
        if (!loc) return;

        const line = loc.start.line;
        const column = loc.start.column;

        // 获取元素名称
        const elementName = getElementName(path.node.name);

        // 只处理原生 HTML 元素 (小写开头)
        if (!elementName || !/^[a-z]/.test(elementName)) return;

        // 检查是否已有 data-jsx-id (避免重复处理)
        const hasJsxId = path.node.attributes.some(
          attr => t.isJSXAttribute(attr) &&
                  t.isJSXIdentifier(attr.name) &&
                  attr.name.name === 'data-jsx-id'
        );
        if (hasJsxId) return;

        // 生成稳定 ID
        const jsxId = generateStableId(filePath, line, column, idPrefix);

        // 记录源码映射
        sourceMapManager.set(jsxId, {
          id: jsxId,
          file: filePath,
          line,
          column,
          element: elementName,
        });

        // 注入属性
        const attributes: t.JSXAttribute[] = [
          t.jsxAttribute(
            t.jsxIdentifier('data-jsx-id'),
            t.stringLiteral(jsxId)
          ),
          t.jsxAttribute(
            t.jsxIdentifier('data-jsx-file'),
            t.stringLiteral(filePath)
          ),
          t.jsxAttribute(
            t.jsxIdentifier('data-jsx-line'),
            t.stringLiteral(String(line))
          ),
          t.jsxAttribute(
            t.jsxIdentifier('data-jsx-col'),
            t.stringLiteral(String(column))
          ),
        ];

        path.node.attributes.push(...attributes);
      },
    },
  };
}

function getElementName(name: t.JSXIdentifier | t.JSXMemberExpression | t.JSXNamespacedName): string | null {
  if (t.isJSXIdentifier(name)) {
    return name.name;
  }
  if (t.isJSXMemberExpression(name)) {
    return getElementName(name.object) + '.' + name.property.name;
  }
  return null;
}
```

#### 2.1.5 ID 生成器

```typescript
// src/id-generator.ts
import { createHash } from 'crypto';

/**
 * 生成稳定的 JSX ID
 * 基于文件路径 + 行号 + 列号生成，确保同一位置的元素 ID 不变
 */
export function generateStableId(
  filePath: string,
  line: number,
  column: number,
  prefix: string = ''
): string {
  const input = `${filePath}:${line}:${column}`;
  const hash = createHash('md5').update(input).digest('hex').slice(0, 8);
  return prefix ? `${prefix}-${hash}` : hash;
}

/**
 * 解析 JSX ID 获取位置信息 (用于调试)
 */
export function parseJsxId(jsxId: string): { prefix?: string; hash: string } {
  const parts = jsxId.split('-');
  if (parts.length === 2) {
    return { prefix: parts[0], hash: parts[1] };
  }
  return { hash: jsxId };
}
```

#### 2.1.6 源码映射管理器

```typescript
// src/source-map.ts

export interface JsxLocation {
  id: string;
  file: string;
  line: number;
  column: number;
  element: string;
}

export class SourceMapManager {
  private map = new Map<string, JsxLocation>();

  set(id: string, location: JsxLocation): void {
    this.map.set(id, location);
  }

  get(id: string): JsxLocation | undefined {
    return this.map.get(id);
  }

  getAll(): Record<string, JsxLocation> {
    return Object.fromEntries(this.map);
  }

  clear(): void {
    this.map.clear();
  }

  delete(id: string): boolean {
    return this.map.delete(id);
  }

  // 根据文件路径获取所有 JSX 元素
  getByFile(filePath: string): JsxLocation[] {
    return Array.from(this.map.values()).filter(loc => loc.file === filePath);
  }

  // 根据行号范围获取 JSX 元素
  getByLineRange(filePath: string, startLine: number, endLine: number): JsxLocation[] {
    return this.getByFile(filePath).filter(
      loc => loc.line >= startLine && loc.line <= endLine
    );
  }
}
```

---

### 2.2 React 项目模板

#### 2.2.1 目录结构

```
project-template/
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .eslintrc.cjs
├── .prettierrc
├── .gitignore
├── index.html
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── vite-env.d.ts
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx
    │   │   ├── Footer.tsx
    │   │   └── Container.tsx
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Card.tsx
    │   │   └── Input.tsx
    │   └── sections/
    │       ├── Hero.tsx
    │       ├── Features.tsx
    │       └── CTA.tsx
    ├── hooks/
    │   └── useMediaQuery.ts
    ├── lib/
    │   └── utils.ts
    └── styles/
        └── globals.css
```

#### 2.2.2 核心配置文件

**package.json**
```json
{
  "name": "{{projectName}}",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@typescript-eslint/eslint-plugin": "^6.10.0",
    "@typescript-eslint/parser": "^6.10.0",
    "@vitejs/plugin-react": "^4.2.0",
    "autoprefixer": "^10.4.16",
    "eslint": "^8.53.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.4",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.2.2",
    "vite": "^5.0.0",
    "vite-plugin-jsx-tagger": "workspace:*"
  }
}
```

**vite.config.ts**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { jsxTaggerPlugin } from 'vite-plugin-jsx-tagger';

export default defineConfig({
  plugins: [
    // JSX Tagger 必须在 React 插件之前
    jsxTaggerPlugin({
      removeInProduction: false,  // 生产环境保留标记
      idPrefix: '{{projectId}}',
    }),
    react(),
  ],
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: true,
    },
  },
  build: {
    sourcemap: true,
  },
});
```

**tailwind.config.js**
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

**tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### 2.2.3 组件模板示例

**src/components/sections/Hero.tsx**
```tsx
import React from 'react';

interface HeroProps {
  title?: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
}

export default function Hero({
  title = 'Welcome to Our Platform',
  subtitle = 'Build something amazing with our powerful tools and services.',
  ctaText = 'Get Started',
  ctaLink = '#',
}: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white py-20 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
            {title}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            {subtitle}
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <a
              href={ctaLink}
              className="rounded-lg bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-colors"
            >
              {ctaText}
            </a>
            <a
              href="#features"
              className="text-sm font-semibold leading-6 text-gray-900 hover:text-primary-600 transition-colors"
            >
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
```

**src/components/ui/Button.tsx**
```tsx
import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const variants = {
  primary: 'bg-primary-600 text-white hover:bg-primary-500 shadow-sm',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  ghost: 'text-gray-700 hover:bg-gray-100',
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )
      )}
      {...props}
    >
      {children}
    </button>
  );
}
```

---

### 2.3 模板生成器

#### 2.3.1 生成器接口

```typescript
// template-generator/src/index.ts

export interface ProjectConfig {
  projectId: string;
  projectName: string;
  description?: string;
  components?: ComponentConfig[];
  theme?: ThemeConfig;
}

export interface ComponentConfig {
  name: string;
  type: 'header' | 'hero' | 'features' | 'cta' | 'footer' | 'custom';
  props?: Record<string, any>;
}

export interface ThemeConfig {
  primaryColor?: string;
  fontFamily?: string;
}

export async function generateProject(config: ProjectConfig): Promise<GeneratedProject> {
  // 1. 复制基础模板
  // 2. 替换模板变量
  // 3. 根据配置生成组件
  // 4. 返回文件列表
}
```

#### 2.3.2 文件输出格式

```typescript
export interface GeneratedProject {
  projectId: string;
  files: GeneratedFile[];
  entryPoint: string;
}

export interface GeneratedFile {
  path: string;          // 相对路径: src/components/Hero.tsx
  content: string;       // 文件内容
  type: 'tsx' | 'ts' | 'json' | 'css' | 'html' | 'config';
}
```

---

## 3. 实施任务

### 3.1 Week 1 任务列表

| 任务 ID | 任务描述 | 预估时间 | 依赖 | 负责人 |
|---------|---------|---------|------|--------|
| T1.1 | 创建 vite-plugin-jsx-tagger 包结构 | 2h | - | - |
| T1.2 | 实现 Babel 转换插件核心逻辑 | 4h | T1.1 | - |
| T1.3 | 实现稳定 ID 生成器 | 2h | T1.1 | - |
| T1.4 | 实现源码映射管理器 | 3h | T1.1 | - |
| T1.5 | 实现 Vite 插件主入口 | 3h | T1.2-T1.4 | - |
| T1.6 | 添加服务端 API 端点 | 2h | T1.5 | - |
| T1.7 | 编写单元测试 | 4h | T1.5 | - |
| T1.8 | 测试与 Vite 集成 | 2h | T1.7 | - |

### 3.2 Week 2 任务列表

| 任务 ID | 任务描述 | 预估时间 | 依赖 | 负责人 |
|---------|---------|---------|------|--------|
| T2.1 | 创建项目模板基础结构 | 3h | T1.8 | - |
| T2.2 | 编写核心配置文件 | 2h | T2.1 | - |
| T2.3 | 创建基础 UI 组件库 | 4h | T2.1 | - |
| T2.4 | 创建布局组件 | 3h | T2.1 | - |
| T2.5 | 创建 Section 组件 | 4h | T2.3 | - |
| T2.6 | 实现模板生成器 | 4h | T2.5 | - |
| T2.7 | 集成测试 | 3h | T2.6 | - |
| T2.8 | 文档编写 | 2h | T2.7 | - |

---

## 4. 验收标准

### 4.1 功能验收

| 验收项 | 验收标准 | 测试方法 |
|--------|---------|---------|
| JSX 标记注入 | 所有原生 HTML 元素包含 data-jsx-* 属性 | 浏览器检查元素 |
| ID 稳定性 | 相同位置元素 ID 不随编译变化 | 多次编译对比 |
| 源码映射 | API 返回正确的文件路径和行号 | API 测试 |
| 项目模板 | 执行 npm run dev 成功启动 | 手动测试 |
| HMR | 修改代码后页面自动更新 | 手动测试 |

### 4.2 性能验收

| 指标 | 目标值 | 测量方法 |
|------|--------|---------|
| 编译时间增加 | < 10% | Vite 编译时间对比 |
| 运行时开销 | < 1KB gzip | Bundle 大小分析 |
| 源码映射查询 | < 5ms | API 响应时间 |

### 4.3 代码质量

| 指标 | 目标 |
|------|------|
| TypeScript 覆盖率 | 100% |
| 单元测试覆盖率 | > 80% |
| ESLint 错误 | 0 |

---

## 5. 风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| Babel 转换影响编译性能 | 中 | 中 | 使用缓存、增量编译 |
| 与其他 Babel 插件冲突 | 低 | 高 | 充分测试、插件顺序控制 |
| ID 冲突 | 低 | 中 | 使用 MD5 + 文件路径 |

---

## 6. 依赖清单

### 6.1 生产依赖

```json
{
  "vite": "^5.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "tailwindcss": "^3.3.5",
  "clsx": "^2.0.0",
  "tailwind-merge": "^2.0.0"
}
```

### 6.2 开发依赖

```json
{
  "@babel/core": "^7.23.0",
  "@babel/plugin-syntax-typescript": "^7.23.0",
  "@babel/types": "^7.23.0",
  "@types/babel__core": "^7.20.0",
  "vitest": "^1.0.0"
}
```

---

## 7. 文件清单

完成后应交付以下文件：

```
packages/vite-plugin-jsx-tagger/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── babel-plugin.ts
│   ├── source-map.ts
│   ├── id-generator.ts
│   └── types.ts
├── tests/
│   ├── transform.test.ts
│   └── fixtures/
└── README.md

packages/project-template/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    └── components/
        └── ...

packages/template-generator/
├── package.json
├── src/
│   ├── index.ts
│   └── templates/
└── tests/
```

---

*规格版本: v1.0*
*创建日期: 2024*
*最后更新: 2024*
