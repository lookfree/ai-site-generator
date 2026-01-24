# SPEC-0005: AI 代码生成升级 + 全功能测试

> **阶段**: M5 (第 9-10 周)
> **状态**: 待开始
> **优先级**: P0 - 最终交付
> **依赖**: SPEC-0001, SPEC-0002, SPEC-0003, SPEC-0004

---

## 1. 目标概述

### 1.1 核心目标

升级 AI 代码生成系统，从生成纯 HTML/CSS/JS 升级为生成完整的 React + Tailwind CSS 项目，并完成全功能集成测试。

### 1.2 交付物清单

| 序号 | 交付物 | 描述 | 验收标准 |
|------|--------|------|---------|
| D1 | 升级版 Prompt 系统 | React + Tailwind 生成 | 生成标准 TSX 代码 |
| D2 | 代码解析器升级 | 多文件 TSX 解析 | 正确提取组件文件 |
| D3 | 项目脚手架生成 | 完整项目结构 | 可直接运行 |
| D4 | 代码质量检查 | TypeScript + ESLint | 无错误警告 |
| D5 | 全功能集成测试 | E2E 测试套件 | 测试通过率 > 95% |

---

## 2. AI 代码生成升级

### 2.1 新版 System Prompt

```typescript
// services/ai-generator.ts

export const REACT_SYSTEM_PROMPT = `你是一个专业的 React 前端开发工程师，专门生成高质量的 React + TypeScript + Tailwind CSS 项目代码。

## 技术栈要求

- **框架**: React 18 + TypeScript
- **样式**: Tailwind CSS (使用类名，不使用内联样式)
- **构建**: Vite 5
- **代码规范**: ESLint + Prettier

## 生成规则

### 1. 组件规范

\`\`\`tsx
// 组件文件命名: PascalCase.tsx
// 文件路径: src/components/sections/Hero.tsx

import React from 'react';

interface HeroProps {
  title?: string;
  subtitle?: string;
}

export default function Hero({
  title = "默认标题",
  subtitle = "默认副标题"
}: HeroProps) {
  return (
    <section className="py-20 bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
          {title}
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          {subtitle}
        </p>
      </div>
    </section>
  );
}
\`\`\`

### 2. 样式规范

- 所有样式必须使用 Tailwind CSS 类名
- 禁止使用内联 style 属性
- 使用响应式前缀: sm:, md:, lg:, xl:
- 颜色使用 Tailwind 调色板或自定义 [#hex]

### 3. 文件结构

生成的项目必须包含以下结构:

\`\`\`
src/
├── main.tsx           # 应用入口
├── App.tsx            # 主应用组件
├── components/
│   ├── layout/        # 布局组件
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── sections/      # 页面区块
│   │   ├── Hero.tsx
│   │   ├── Features.tsx
│   │   └── CTA.tsx
│   └── ui/            # 通用 UI 组件
│       ├── Button.tsx
│       └── Card.tsx
└── styles/
    └── globals.css    # 全局样式 (@tailwind 指令)
\`\`\`

### 4. 输出格式

请按以下格式输出代码，每个文件使用独立的代码块:

\`\`\`tsx:src/main.tsx
// main.tsx 内容
\`\`\`

\`\`\`tsx:src/App.tsx
// App.tsx 内容
\`\`\`

\`\`\`tsx:src/components/sections/Hero.tsx
// Hero.tsx 内容
\`\`\`

### 5. 设计原则

- 现代简洁的视觉设计
- 良好的空白和间距
- 清晰的视觉层次
- 一致的颜色方案
- 移动优先的响应式设计

## 重要提醒

1. 每个组件必须有明确的 Props 接口定义
2. 使用函数组件 + Hooks
3. 导出默认组件 (export default)
4. 所有文本内容使用中文
5. 生成完整可运行的代码，不要省略任何部分
`;
```

### 2.2 代码解析器

```typescript
// services/code-parser.ts

interface ParsedFile {
  path: string;
  content: string;
  language: 'tsx' | 'ts' | 'css' | 'json' | 'html';
}

interface ParseResult {
  success: boolean;
  files: ParsedFile[];
  errors: string[];
}

/**
 * 解析 AI 生成的代码响应
 */
export function parseAIResponse(response: string): ParseResult {
  const files: ParsedFile[] = [];
  const errors: string[] = [];

  // 匹配带路径的代码块: ```tsx:src/components/Hero.tsx
  const codeBlockRegex = /```(\w+):([^\n]+)\n([\s\S]*?)```/g;

  let match;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    const [, language, filePath, content] = match;

    // 验证文件路径
    if (!isValidFilePath(filePath)) {
      errors.push(`Invalid file path: ${filePath}`);
      continue;
    }

    // 验证语言类型
    const lang = normalizeLanguage(language);
    if (!lang) {
      errors.push(`Unknown language: ${language}`);
      continue;
    }

    files.push({
      path: filePath.trim(),
      content: content.trim(),
      language: lang,
    });
  }

  // 如果没有找到带路径的代码块，尝试解析旧格式
  if (files.length === 0) {
    const legacyFiles = parseLegacyFormat(response);
    files.push(...legacyFiles);
  }

  return {
    success: files.length > 0,
    files,
    errors,
  };
}

/**
 * 验证文件路径
 */
function isValidFilePath(path: string): boolean {
  // 必须在 src/ 目录下
  if (!path.startsWith('src/')) return false;

  // 不能包含 ..
  if (path.includes('..')) return false;

  // 必须有有效扩展名
  const validExtensions = ['.tsx', '.ts', '.css', '.json', '.html'];
  return validExtensions.some(ext => path.endsWith(ext));
}

/**
 * 规范化语言类型
 */
function normalizeLanguage(lang: string): ParsedFile['language'] | null {
  const langMap: Record<string, ParsedFile['language']> = {
    'tsx': 'tsx',
    'typescript': 'ts',
    'ts': 'ts',
    'css': 'css',
    'json': 'json',
    'html': 'html',
    'jsx': 'tsx',
    'javascript': 'ts',
    'js': 'ts',
  };

  return langMap[lang.toLowerCase()] || null;
}

/**
 * 解析旧格式 (兼容性)
 */
function parseLegacyFormat(response: string): ParsedFile[] {
  const files: ParsedFile[] = [];

  // 匹配 HTML 代码块
  const htmlMatch = response.match(/```html\n([\s\S]*?)```/);
  if (htmlMatch) {
    files.push({
      path: 'src/index.html',
      content: htmlMatch[1].trim(),
      language: 'html',
    });
  }

  // 匹配 CSS 代码块
  const cssMatch = response.match(/```css\n([\s\S]*?)```/);
  if (cssMatch) {
    files.push({
      path: 'src/styles/globals.css',
      content: cssMatch[1].trim(),
      language: 'css',
    });
  }

  // 匹配 JavaScript/TypeScript 代码块
  const jsMatch = response.match(/```(?:javascript|js|typescript|ts)\n([\s\S]*?)```/);
  if (jsMatch) {
    files.push({
      path: 'src/main.ts',
      content: jsMatch[1].trim(),
      language: 'ts',
    });
  }

  return files;
}

/**
 * 验证 TSX 代码质量
 */
export function validateTsxCode(code: string, filePath: string): string[] {
  const errors: string[] = [];

  // 检查是否有默认导出
  if (!code.includes('export default')) {
    errors.push(`${filePath}: Missing default export`);
  }

  // 检查是否使用了内联样式
  if (code.includes('style={{') || code.includes('style={')) {
    errors.push(`${filePath}: Avoid inline styles, use Tailwind classes instead`);
  }

  // 检查是否有 Props 接口 (对于组件文件)
  if (filePath.includes('/components/') && !code.includes('interface')) {
    errors.push(`${filePath}: Component should have Props interface`);
  }

  // 检查 React 导入
  if (code.includes('useState') || code.includes('useEffect')) {
    if (!code.includes("from 'react'")) {
      errors.push(`${filePath}: Missing React hooks import`);
    }
  }

  return errors;
}
```

### 2.3 项目脚手架生成器

```typescript
// services/scaffolder.ts

interface ProjectConfig {
  projectId: string;
  projectName: string;
  description: string;
}

interface ScaffoldResult {
  success: boolean;
  files: { path: string; content: string }[];
}

/**
 * 生成项目脚手架文件
 */
export function generateScaffold(config: ProjectConfig): ScaffoldResult {
  const files: { path: string; content: string }[] = [];

  // package.json
  files.push({
    path: 'package.json',
    content: generatePackageJson(config),
  });

  // vite.config.ts
  files.push({
    path: 'vite.config.ts',
    content: generateViteConfig(config),
  });

  // tsconfig.json
  files.push({
    path: 'tsconfig.json',
    content: generateTsConfig(),
  });

  // tsconfig.node.json
  files.push({
    path: 'tsconfig.node.json',
    content: generateTsConfigNode(),
  });

  // tailwind.config.js
  files.push({
    path: 'tailwind.config.js',
    content: generateTailwindConfig(),
  });

  // postcss.config.js
  files.push({
    path: 'postcss.config.js',
    content: generatePostcssConfig(),
  });

  // index.html
  files.push({
    path: 'index.html',
    content: generateIndexHtml(config),
  });

  // .eslintrc.cjs
  files.push({
    path: '.eslintrc.cjs',
    content: generateEslintConfig(),
  });

  // .prettierrc
  files.push({
    path: '.prettierrc',
    content: generatePrettierConfig(),
  });

  // .gitignore
  files.push({
    path: '.gitignore',
    content: generateGitignore(),
  });

  // src/vite-env.d.ts
  files.push({
    path: 'src/vite-env.d.ts',
    content: '/// <reference types="vite/client" />\n',
  });

  // src/styles/globals.css
  files.push({
    path: 'src/styles/globals.css',
    content: generateGlobalsCss(),
  });

  return {
    success: true,
    files,
  };
}

function generatePackageJson(config: ProjectConfig): string {
  const pkg = {
    name: config.projectName.toLowerCase().replace(/\s+/g, '-'),
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'vite',
      build: 'tsc && vite build',
      lint: 'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
      preview: 'vite preview',
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      clsx: '^2.0.0',
      'tailwind-merge': '^2.0.0',
    },
    devDependencies: {
      '@types/react': '^18.2.37',
      '@types/react-dom': '^18.2.15',
      '@typescript-eslint/eslint-plugin': '^6.10.0',
      '@typescript-eslint/parser': '^6.10.0',
      '@vitejs/plugin-react': '^4.2.0',
      autoprefixer: '^10.4.16',
      eslint: '^8.53.0',
      'eslint-plugin-react-hooks': '^4.6.0',
      'eslint-plugin-react-refresh': '^0.4.4',
      postcss: '^8.4.31',
      tailwindcss: '^3.3.5',
      typescript: '^5.2.2',
      vite: '^5.0.0',
      'vite-plugin-jsx-tagger': 'workspace:*',
    },
  };

  return JSON.stringify(pkg, null, 2);
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
    port: 5173,
    host: true,
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
      baseUrl: '.',
      paths: {
        '@/*': ['./src/*'],
      },
    },
    include: ['src'],
    references: [{ path: './tsconfig.node.json' }],
  }, null, 2);
}

function generateTsConfigNode(): string {
  return JSON.stringify({
    compilerOptions: {
      composite: true,
      skipLibCheck: true,
      module: 'ESNext',
      moduleResolution: 'bundler',
      allowSyntheticDefaultImports: true,
    },
    include: ['vite.config.ts'],
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
`;
}

function generatePostcssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

function generateIndexHtml(config: ProjectConfig): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${config.projectName}</title>
    <meta name="description" content="${config.description}" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;
}

function generateEslintConfig(): string {
  return `module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
};
`;
}

function generatePrettierConfig(): string {
  return JSON.stringify({
    semi: true,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'es5',
    printWidth: 100,
  }, null, 2);
}

function generateGitignore(): string {
  return `# Dependencies
node_modules

# Build
dist
dist-ssr
*.local

# Editor
.vscode/*
!.vscode/extensions.json
.idea

# Logs
logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local
`;
}

function generateGlobalsCss(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    font-family: 'Inter', system-ui, sans-serif;
  }

  body {
    @apply antialiased;
  }
}

@layer components {
  .container {
    @apply mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl;
  }
}
`;
}
```

---

## 3. 代码质量检查

### 3.1 TypeScript 类型检查

```typescript
// services/type-checker.ts

import ts from 'typescript';

interface TypeCheckResult {
  success: boolean;
  errors: TypeCheckError[];
  warnings: TypeCheckWarning[];
}

interface TypeCheckError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: number;
}

interface TypeCheckWarning {
  file: string;
  line: number;
  message: string;
}

/**
 * 对生成的代码进行 TypeScript 类型检查
 */
export function typeCheck(files: Map<string, string>): TypeCheckResult {
  const errors: TypeCheckError[] = [];
  const warnings: TypeCheckWarning[] = [];

  // 创建虚拟文件系统
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    resolveJsonModule: true,
    isolatedModules: true,
  };

  // 创建虚拟编译主机
  const host = createVirtualCompilerHost(files, compilerOptions);

  // 创建程序
  const program = ts.createProgram(
    Array.from(files.keys()),
    compilerOptions,
    host
  );

  // 获取诊断信息
  const diagnostics = [
    ...program.getSyntacticDiagnostics(),
    ...program.getSemanticDiagnostics(),
  ];

  for (const diagnostic of diagnostics) {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

    if (diagnostic.file && diagnostic.start !== undefined) {
      const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start
      );

      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        errors.push({
          file: diagnostic.file.fileName,
          line: line + 1,
          column: character + 1,
          message,
          code: diagnostic.code,
        });
      } else if (diagnostic.category === ts.DiagnosticCategory.Warning) {
        warnings.push({
          file: diagnostic.file.fileName,
          line: line + 1,
          message,
        });
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

function createVirtualCompilerHost(
  files: Map<string, string>,
  options: ts.CompilerOptions
): ts.CompilerHost {
  return {
    getSourceFile: (fileName, languageVersion) => {
      const content = files.get(fileName);
      if (content !== undefined) {
        return ts.createSourceFile(fileName, content, languageVersion);
      }
      return undefined;
    },
    getDefaultLibFileName: () => 'lib.d.ts',
    writeFile: () => {},
    getCurrentDirectory: () => '/',
    getCanonicalFileName: (fileName) => fileName,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    fileExists: (fileName) => files.has(fileName),
    readFile: (fileName) => files.get(fileName),
    directoryExists: () => true,
    getDirectories: () => [],
  };
}
```

### 3.2 ESLint 检查

```typescript
// services/lint-checker.ts

import { ESLint } from 'eslint';

interface LintResult {
  success: boolean;
  errors: LintIssue[];
  warnings: LintIssue[];
  fixedCode?: Map<string, string>;
}

interface LintIssue {
  file: string;
  line: number;
  column: number;
  message: string;
  ruleId: string | null;
  severity: 'error' | 'warning';
}

/**
 * 对生成的代码进行 ESLint 检查
 */
export async function lintCheck(
  files: Map<string, string>,
  fix: boolean = false
): Promise<LintResult> {
  const eslint = new ESLint({
    useEslintrc: false,
    fix,
    overrideConfig: {
      env: {
        browser: true,
        es2020: true,
      },
      extends: [
        'eslint:recommended',
      ],
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      plugins: ['@typescript-eslint', 'react-hooks'],
      rules: {
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'warn',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
  });

  const errors: LintIssue[] = [];
  const warnings: LintIssue[] = [];
  const fixedCode = new Map<string, string>();

  for (const [filePath, content] of files) {
    // 只检查 TS/TSX 文件
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      continue;
    }

    const results = await eslint.lintText(content, { filePath });

    for (const result of results) {
      for (const message of result.messages) {
        const issue: LintIssue = {
          file: filePath,
          line: message.line,
          column: message.column,
          message: message.message,
          ruleId: message.ruleId,
          severity: message.severity === 2 ? 'error' : 'warning',
        };

        if (message.severity === 2) {
          errors.push(issue);
        } else {
          warnings.push(issue);
        }
      }

      // 保存修复后的代码
      if (fix && result.output) {
        fixedCode.set(filePath, result.output);
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
    fixedCode: fix ? fixedCode : undefined,
  };
}
```

---

## 4. 全功能集成测试

### 4.1 测试架构

```
tests/
├── e2e/
│   ├── project-generation.test.ts    # 项目生成测试
│   ├── visual-editor.test.ts         # Visual Editor 测试
│   ├── hmr-update.test.ts            # HMR 热更新测试
│   └── full-workflow.test.ts         # 完整工作流测试
├── integration/
│   ├── ast-transform.test.ts         # AST 变换测试
│   ├── tailwind-mapping.test.ts      # Tailwind 映射测试
│   └── file-sync.test.ts             # 文件同步测试
├── unit/
│   ├── parser.test.ts
│   ├── scaffolder.test.ts
│   └── ...
└── fixtures/
    ├── sample-projects/
    └── expected-outputs/
```

### 4.2 E2E 测试用例

```typescript
// tests/e2e/full-workflow.test.ts

import { test, expect } from '@playwright/test';
import { createTestProject, cleanupTestProject } from '../helpers';

test.describe('Visual Edit Full Workflow', () => {
  let projectId: string;
  let projectPath: string;

  test.beforeAll(async () => {
    // 创建测试项目
    const result = await createTestProject({
      description: '一个现代化的 SaaS 产品着陆页，包含 Hero 区域、功能介绍、定价方案和 CTA',
    });
    projectId = result.projectId;
    projectPath = result.projectPath;
  });

  test.afterAll(async () => {
    await cleanupTestProject(projectId);
  });

  test('should generate valid React project', async ({ page }) => {
    // 验证项目结构
    const files = await getProjectFiles(projectPath);

    expect(files).toContain('package.json');
    expect(files).toContain('vite.config.ts');
    expect(files).toContain('src/main.tsx');
    expect(files).toContain('src/App.tsx');
    expect(files.some(f => f.includes('components/'))).toBe(true);
  });

  test('should start Vite dev server', async ({ page }) => {
    // 启动开发服务器
    const serverUrl = await startDevServer(projectId);

    // 访问页面
    await page.goto(serverUrl);

    // 验证页面加载
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('[data-jsx-id]')).toHaveCount({ min: 1 });
  });

  test('should select element in Visual Editor', async ({ page }) => {
    const serverUrl = await getDevServerUrl(projectId);
    await page.goto(`http://localhost:3000/editor/${projectId}`);

    // 等待 iframe 加载
    const iframe = page.frameLocator('iframe');
    await iframe.locator('body').waitFor();

    // 启用编辑模式
    await page.click('[data-testid="edit-mode-toggle"]');

    // 点击选择元素
    await iframe.locator('h1').first().click();

    // 验证属性面板显示
    await expect(page.locator('[data-testid="property-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="element-info"]')).toContainText('h1');
  });

  test('should update element style with HMR', async ({ page }) => {
    const serverUrl = await getDevServerUrl(projectId);
    await page.goto(`http://localhost:3000/editor/${projectId}`);

    const iframe = page.frameLocator('iframe');

    // 选择元素
    await page.click('[data-testid="edit-mode-toggle"]');
    await iframe.locator('h1').first().click();

    // 获取原始颜色
    const originalColor = await iframe.locator('h1').first().evaluate(
      el => getComputedStyle(el).color
    );

    // 修改颜色
    await page.click('[data-testid="color-picker"]');
    await page.fill('[data-testid="color-input"]', '#3b82f6');
    await page.click('[data-testid="apply-color"]');

    // 等待 HMR 更新
    await page.waitForTimeout(1000);

    // 验证颜色已更新
    const newColor = await iframe.locator('h1').first().evaluate(
      el => getComputedStyle(el).color
    );

    expect(newColor).not.toBe(originalColor);
  });

  test('should preserve state after HMR', async ({ page }) => {
    const serverUrl = await getDevServerUrl(projectId);
    await page.goto(`http://localhost:3000/editor/${projectId}`);

    const iframe = page.frameLocator('iframe');

    // 如果有交互组件（如计数器），测试状态保持
    const counter = iframe.locator('[data-testid="counter"]');
    if (await counter.count() > 0) {
      // 点击增加
      await counter.locator('button').first().click();
      await counter.locator('button').first().click();

      const valueBefore = await counter.locator('[data-testid="count"]').textContent();

      // 触发 HMR
      await triggerHmrUpdate(projectId);
      await page.waitForTimeout(500);

      // 验证状态保持
      const valueAfter = await counter.locator('[data-testid="count"]').textContent();
      expect(valueAfter).toBe(valueBefore);
    }
  });

  test('should support undo/redo', async ({ page }) => {
    const serverUrl = await getDevServerUrl(projectId);
    await page.goto(`http://localhost:3000/editor/${projectId}`);

    const iframe = page.frameLocator('iframe');

    // 选择元素
    await page.click('[data-testid="edit-mode-toggle"]');
    await iframe.locator('h1').first().click();

    // 获取原始文本
    const originalText = await iframe.locator('h1').first().textContent();

    // 修改文本
    await page.fill('[data-testid="text-input"]', '新标题');
    await page.click('[data-testid="apply-text"]');

    // 验证修改
    await expect(iframe.locator('h1').first()).toContainText('新标题');

    // 撤销
    await page.click('[data-testid="undo-button"]');
    await page.waitForTimeout(500);

    // 验证撤销
    await expect(iframe.locator('h1').first()).toContainText(originalText!);

    // 重做
    await page.click('[data-testid="redo-button"]');
    await page.waitForTimeout(500);

    // 验证重做
    await expect(iframe.locator('h1').first()).toContainText('新标题');
  });

  test('should generate valid exported code', async ({ page }) => {
    // 导出项目
    const exportedFiles = await exportProject(projectId);

    // 验证代码质量
    const typeCheckResult = await typeCheck(exportedFiles);
    expect(typeCheckResult.success).toBe(true);

    const lintResult = await lintCheck(exportedFiles);
    expect(lintResult.errors.length).toBe(0);
  });
});
```

### 4.3 测试覆盖率要求

| 模块 | 单元测试覆盖率 | 集成测试覆盖率 |
|------|--------------|--------------|
| AST 处理器 | > 90% | > 80% |
| Tailwind 映射 | > 95% | > 85% |
| Visual Editor | > 80% | > 75% |
| HMR 系统 | > 85% | > 80% |
| AI 生成器 | > 75% | > 70% |
| **总体** | **> 85%** | **> 80%** |

---

## 5. 实施任务

### 5.1 Week 9 任务列表

| 任务 ID | 任务描述 | 预估时间 | 依赖 |
|---------|---------|---------|------|
| T9.1 | 升级 System Prompt | 4h | SPEC-0004 |
| T9.2 | 实现新代码解析器 | 4h | T9.1 |
| T9.3 | 实现项目脚手架生成器 | 4h | T9.2 |
| T9.4 | 实现 TypeScript 类型检查 | 3h | T9.3 |
| T9.5 | 实现 ESLint 检查 | 2h | T9.3 |
| T9.6 | 集成到后端服务 | 4h | T9.5 |
| T9.7 | 单元测试编写 | 3h | T9.6 |

### 5.2 Week 10 任务列表

| 任务 ID | 任务描述 | 预估时间 | 依赖 |
|---------|---------|---------|------|
| T10.1 | E2E 测试框架搭建 | 3h | T9.7 |
| T10.2 | 项目生成 E2E 测试 | 3h | T10.1 |
| T10.3 | Visual Editor E2E 测试 | 4h | T10.1 |
| T10.4 | HMR E2E 测试 | 3h | T10.1 |
| T10.5 | 完整工作流 E2E 测试 | 4h | T10.4 |
| T10.6 | Bug 修复和优化 | 4h | T10.5 |
| T10.7 | 文档完善和发布准备 | 3h | T10.6 |

---

## 6. 验收标准

### 6.1 功能验收

| 验收项 | 验收标准 |
|--------|---------|
| AI 代码生成 | 生成标准 React + Tailwind 项目 |
| 代码质量 | TypeScript 无错误，ESLint 无 error |
| 项目可运行 | npm run dev 成功启动 |
| Visual Edit | 所有编辑功能正常工作 |
| HMR | 热更新正常，状态保持 |

### 6.2 测试验收

| 指标 | 目标值 |
|------|--------|
| 单元测试覆盖率 | > 85% |
| 集成测试覆盖率 | > 80% |
| E2E 测试通过率 | > 95% |
| 性能基准达标 | 100% |

### 6.3 性能验收

| 指标 | 目标值 |
|------|--------|
| 项目生成时间 | < 30s |
| 代码检查时间 | < 5s |
| HMR 更新时间 | < 500ms |
| 编辑响应时间 | < 50ms |

---

## 7. 发布清单

### 7.1 代码仓库

- [ ] 所有代码提交到主分支
- [ ] 版本标签 v1.0.0
- [ ] CHANGELOG 更新
- [ ] README 文档完善

### 7.2 文档

- [ ] API 文档
- [ ] 用户指南
- [ ] 开发者指南
- [ ] 部署指南

### 7.3 部署

- [ ] 前端部署
- [ ] 后端服务部署
- [ ] Fly.io 服务配置
- [ ] 监控和告警配置

---

*规格版本: v1.0*
*创建日期: 2024*
*最后更新: 2024*
