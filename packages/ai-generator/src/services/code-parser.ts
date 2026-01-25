/**
 * AI 响应代码解析器
 * 解析 AI 生成的代码块并提取文件
 */

import type { ParsedFile, ParseResult, FileLanguage } from '../types';

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
    if (!isValidFilePath(filePath.trim())) {
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
export function isValidFilePath(path: string): boolean {
  // 必须在 src/ 目录下
  if (!path.startsWith('src/')) return false;

  // 不能包含 ..
  if (path.includes('..')) return false;

  // 不能包含特殊字符
  if (/[<>:"|?*]/.test(path)) return false;

  // 必须有有效扩展名
  const validExtensions = ['.tsx', '.ts', '.css', '.json', '.html'];
  return validExtensions.some(ext => path.endsWith(ext));
}

/**
 * 规范化语言类型
 */
export function normalizeLanguage(lang: string): FileLanguage | null {
  const langMap: Record<string, FileLanguage> = {
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
export function parseLegacyFormat(response: string): ParsedFile[] {
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

  // 匹配 TSX/JSX 代码块
  const tsxMatch = response.match(/```(?:tsx|jsx)\n([\s\S]*?)```/);
  if (tsxMatch) {
    files.push({
      path: 'src/App.tsx',
      content: tsxMatch[1].trim(),
      language: 'tsx',
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
  if (filePath.includes('/components/') && !code.includes('interface') && !code.includes('type ')) {
    // 检查是否是无 props 的简单组件
    const hasPropsPattern = /function\s+\w+\s*\(\s*\{/;
    if (hasPropsPattern.test(code)) {
      errors.push(`${filePath}: Component should have Props interface`);
    }
  }

  // 检查 React hooks 导入
  if (code.includes('useState') || code.includes('useEffect') || code.includes('useCallback') || code.includes('useMemo')) {
    if (!code.includes("from 'react'") && !code.includes('from "react"')) {
      errors.push(`${filePath}: Missing React hooks import`);
    }
  }

  // 检查是否缺少 React 导入 (对于使用 JSX 的文件)
  // 注意: 在 React 17+ 的 jsx transform 中不再需要导入 React
  // 但如果使用了 React.xxx，则需要导入
  if (code.includes('React.') && !code.includes("from 'react'") && !code.includes('from "react"')) {
    errors.push(`${filePath}: Missing React import`);
  }

  return errors;
}

/**
 * 提取组件名称
 */
export function extractComponentName(code: string): string | null {
  // 匹配 export default function ComponentName
  const funcMatch = code.match(/export\s+default\s+function\s+(\w+)/);
  if (funcMatch) {
    return funcMatch[1];
  }

  // 匹配 const ComponentName = ... export default ComponentName
  const constMatch = code.match(/export\s+default\s+(\w+)/);
  if (constMatch) {
    return constMatch[1];
  }

  return null;
}

/**
 * 提取组件 Props 接口
 */
export function extractPropsInterface(code: string): string | null {
  // 匹配 interface XxxProps { ... }
  const interfaceMatch = code.match(/interface\s+(\w+Props)\s*\{[\s\S]*?\n\}/);
  if (interfaceMatch) {
    return interfaceMatch[0];
  }

  // 匹配 type XxxProps = { ... }
  const typeMatch = code.match(/type\s+(\w+Props)\s*=\s*\{[\s\S]*?\n\}/);
  if (typeMatch) {
    return typeMatch[0];
  }

  return null;
}

/**
 * 提取导入语句
 */
export function extractImports(code: string): string[] {
  const imports: string[] = [];
  const importRegex = /^import\s+.*?(?:from\s+['"].*?['"]|['"].*?['"])\s*;?\s*$/gm;

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    imports.push(match[0]);
  }

  return imports;
}

/**
 * 从文件路径推断组件名称
 */
export function inferComponentNameFromPath(filePath: string): string {
  // src/components/sections/Hero.tsx -> Hero
  const fileName = filePath.split('/').pop();
  if (!fileName) return 'Component';

  const name = fileName.replace(/\.(tsx|ts|jsx|js)$/, '');
  return name;
}
