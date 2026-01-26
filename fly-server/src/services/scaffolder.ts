/**
 * 项目脚手架生成器
 * 生成 React + Vite + Tailwind 项目的基础文件
 */

import type { ProjectConfig, ScaffoldResult } from '../types';

/**
 * 生成项目脚手架文件
 */
export function generateScaffold(config: ProjectConfig): ScaffoldResult {
  const files: Array<{ path: string; content: string }> = [];

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

  // src/main.tsx (默认入口)
  files.push({
    path: 'src/main.tsx',
    content: generateMainTsx(),
  });

  // jsx-id-plugin.js - 用于注入 data-jsx-id 属性的 Babel 插件
  files.push({
    path: 'jsx-id-plugin.js',
    content: generateJsxIdPlugin(),
  });

  return {
    success: true,
    files,
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function generatePackageJson(config: ProjectConfig): string {
  const pkg = {
    name: slugify(config.projectName),
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
      'react': '^18.2.0',
      'react-dom': '^18.2.0',
      'clsx': '^2.0.0',
      'tailwind-merge': '^2.0.0',
    },
    devDependencies: {
      '@types/react': '^18.2.37',
      '@types/react-dom': '^18.2.15',
      '@typescript-eslint/eslint-plugin': '^6.10.0',
      '@typescript-eslint/parser': '^6.10.0',
      '@vitejs/plugin-react': '^4.2.0',
      'autoprefixer': '^10.4.16',
      'eslint': '^8.53.0',
      'eslint-plugin-react-hooks': '^4.6.0',
      'eslint-plugin-react-refresh': '^0.4.4',
      'postcss': '^8.4.31',
      'tailwindcss': '^3.3.5',
      'typescript': '^5.2.2',
      'vite': '^5.0.0',
    },
  };

  return JSON.stringify(pkg, null, 2);
}

function generateViteConfig(config: ProjectConfig): string {
  const idPrefix = config.projectId.slice(0, 8);
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import jsxIdPlugin from './jsx-id-plugin.js';

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [jsxIdPlugin],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    hmr: {
      protocol: 'ws',
    },
  },
  define: {
    __PROJECT_ID__: JSON.stringify('${idPrefix}'),
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
  const title = escapeHtml(config.projectName);
  const description = escapeHtml(config.description);

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <meta name="description" content="${description}" />
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

function generateMainTsx(): string {
  return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
}

function generateJsxIdPlugin(): string {
  return `/**
 * Babel 插件：为 JSX 元素注入 data-jsx-* 属性
 * 用于 Visual Editor 的元素定位和源代码映射
 *
 * 注入属性:
 * - data-jsx-id: 稳定的唯一标识 (MD5 hash)
 * - data-jsx-file: 源文件路径 (相对路径)
 * - data-jsx-line: 源代码行号
 * - data-jsx-col: 源代码列号
 */

import { createHash } from 'crypto';

/**
 * 生成稳定的 JSX ID (基于文件路径+行号+列号的 MD5 哈希)
 */
function generateStableId(filePath, line, column) {
  const input = filePath + ':' + line + ':' + column;
  return createHash('md5').update(input).digest('hex').slice(0, 8);
}

/**
 * 将文件路径转换为相对路径 (去除项目根目录前缀)
 */
function normalizeFilePath(filename) {
  // 提取 src/ 开头的相对路径
  const srcIndex = filename.indexOf('src/');
  if (srcIndex !== -1) {
    return filename.slice(srcIndex);
  }
  // 如果没有 src/，返回文件名
  const lastSlash = filename.lastIndexOf('/');
  return lastSlash !== -1 ? filename.slice(lastSlash + 1) : filename;
}

/**
 * 创建 JSX 属性节点
 */
function createJsxAttr(name, value) {
  return {
    type: 'JSXAttribute',
    name: { type: 'JSXIdentifier', name },
    value: { type: 'StringLiteral', value },
  };
}

export default function jsxIdPlugin() {
  return {
    name: 'jsx-id-injector',
    visitor: {
      JSXOpeningElement(path, state) {
        const filename = state.filename || 'unknown';
        const { node } = path;

        // 跳过 Fragment
        if (node.name.type === 'JSXIdentifier' && node.name.name === 'Fragment') {
          return;
        }
        if (node.name.type === 'JSXMemberExpression' &&
            node.name.property?.name === 'Fragment') {
          return;
        }

        // 检查是否已有 data-jsx-id 属性
        const hasJsxId = node.attributes.some(attr =>
          attr.type === 'JSXAttribute' &&
          attr.name?.name === 'data-jsx-id'
        );
        if (hasJsxId) return;

        // 获取位置信息
        const line = node.loc?.start?.line || 0;
        const col = node.loc?.start?.column || 0;
        const filePath = normalizeFilePath(filename);

        // 生成稳定的唯一 ID
        const jsxId = generateStableId(filePath, line, col);

        // 注入 data-jsx-* 属性
        node.attributes.push(
          createJsxAttr('data-jsx-id', jsxId),
          createJsxAttr('data-jsx-file', filePath),
          createJsxAttr('data-jsx-line', String(line)),
          createJsxAttr('data-jsx-col', String(col))
        );
      },
    },
  };
}
`;
}

/**
 * 生成默认的 App.tsx
 */
export function generateDefaultAppTsx(projectName: string): string {
  const safeName = escapeHtml(projectName);

  return `export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container py-20">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 text-center">
          ${safeName}
        </h1>
        <p className="mt-4 text-lg text-gray-600 text-center">
          由 AI Site Generator 生成
        </p>
      </div>
    </div>
  );
}
`;
}
