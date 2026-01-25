/**
 * 项目脚手架生成器
 * 生成 React + Vite + Tailwind CSS 项目结构
 */

import type { ProjectConfig, ScaffoldResult, ScaffoldFile } from '../types';

/**
 * 生成项目脚手架文件
 */
export function generateScaffold(config: ProjectConfig): ScaffoldResult {
  const files: ScaffoldFile[] = [];

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

  return {
    success: true,
    files,
  };
}

/**
 * 生成 package.json
 */
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
    },
  };

  return JSON.stringify(pkg, null, 2);
}

/**
 * 生成 vite.config.ts
 */
function generateViteConfig(config: ProjectConfig): string {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
`;
}

/**
 * 生成带有 jsx-tagger 插件的 vite.config.ts
 */
export function generateViteConfigWithTagger(config: ProjectConfig): string {
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
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
`;
}

/**
 * 生成 tsconfig.json
 */
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

/**
 * 生成 tsconfig.node.json
 */
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

/**
 * 生成 tailwind.config.js
 */
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

/**
 * 生成带自定义主题色的 tailwind.config.js
 */
export function generateTailwindConfigWithColor(primaryColor: string): string {
  // 简单处理：如果传入的是 hex 颜色，将其设为 primary-500
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
          50: '${lightenColor(primaryColor, 0.9)}',
          100: '${lightenColor(primaryColor, 0.8)}',
          200: '${lightenColor(primaryColor, 0.6)}',
          300: '${lightenColor(primaryColor, 0.4)}',
          400: '${lightenColor(primaryColor, 0.2)}',
          500: '${primaryColor}',
          600: '${darkenColor(primaryColor, 0.1)}',
          700: '${darkenColor(primaryColor, 0.2)}',
          800: '${darkenColor(primaryColor, 0.3)}',
          900: '${darkenColor(primaryColor, 0.4)}',
          950: '${darkenColor(primaryColor, 0.5)}',
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

/**
 * 生成 postcss.config.js
 */
function generatePostcssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

/**
 * 生成 index.html
 */
function generateIndexHtml(config: ProjectConfig): string {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(config.projectName)}</title>
    <meta name="description" content="${escapeHtml(config.description)}" />
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

/**
 * 生成 .eslintrc.cjs
 */
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

/**
 * 生成 .prettierrc
 */
function generatePrettierConfig(): string {
  return JSON.stringify({
    semi: true,
    singleQuote: true,
    tabWidth: 2,
    trailingComma: 'es5',
    printWidth: 100,
  }, null, 2);
}

/**
 * 生成 .gitignore
 */
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

/**
 * 生成 globals.css
 */
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

/**
 * 生成默认的 main.tsx
 */
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

/**
 * 生成默认的 App.tsx
 */
export function generateDefaultAppTsx(projectName: string): string {
  return `export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container py-10">
        <h1 className="text-4xl font-bold text-gray-900">
          ${escapeHtml(projectName)}
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          欢迎使用 React + Tailwind CSS 项目模板
        </p>
      </main>
    </div>
  );
}
`;
}

// ========================================
// 工具函数
// ========================================

/**
 * HTML 转义
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 简单的颜色变亮函数
 */
function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.round(rgb.r + (255 - rgb.r) * amount);
  const g = Math.round(rgb.g + (255 - rgb.g) * amount);
  const b = Math.round(rgb.b + (255 - rgb.b) * amount);

  return rgbToHex(r, g, b);
}

/**
 * 简单的颜色变暗函数
 */
function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const r = Math.round(rgb.r * (1 - amount));
  const g = Math.round(rgb.g * (1 - amount));
  const b = Math.round(rgb.b * (1 - amount));

  return rgbToHex(r, g, b);
}

/**
 * Hex 转 RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * RGB 转 Hex
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}
