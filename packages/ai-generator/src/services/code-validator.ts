/**
 * 代码质量验证器
 * 验证生成的代码是否符合规范
 */

import type {
  ParsedFile,
  ValidationResult,
  ValidationError,
  ValidationWarning,
} from '../types';
import { validateTsxCode } from './code-parser';
import { syntaxCheck } from './type-checker';

/** 验证配置选项 */
export interface ValidateOptions {
  /** 是否检查内联样式 */
  checkInlineStyles?: boolean;
  /** 是否检查 Props 接口 */
  checkPropsInterface?: boolean;
  /** 是否检查 React 导入 */
  checkReactImports?: boolean;
  /** 是否进行语法检查 */
  checkSyntax?: boolean;
  /** 是否检查 Tailwind 类名 */
  checkTailwindClasses?: boolean;
}

const DEFAULT_OPTIONS: ValidateOptions = {
  checkInlineStyles: true,
  checkPropsInterface: true,
  checkReactImports: true,
  checkSyntax: true,
  checkTailwindClasses: false,
};

/**
 * 验证解析出的文件列表
 */
export function validateFiles(
  files: ParsedFile[],
  options: ValidateOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const file of files) {
    // 只验证 TSX/TS 文件
    if (file.language === 'tsx' || file.language === 'ts') {
      // TSX 代码质量检查
      const codeErrors = validateTsxCode(file.content, file.path);
      for (const msg of codeErrors) {
        // 根据配置过滤错误
        if (!opts.checkInlineStyles && msg.includes('inline styles')) continue;
        if (!opts.checkPropsInterface && msg.includes('Props interface')) continue;
        if (!opts.checkReactImports && msg.includes('import')) continue;

        errors.push({
          file: file.path,
          message: msg,
        });
      }

      // 额外的验证规则
      const extraValidation = validateTsxFile(file, opts);
      errors.push(...extraValidation.errors);
      warnings.push(...extraValidation.warnings);
    }

    // CSS 文件验证
    if (file.language === 'css') {
      const cssValidation = validateCssFile(file);
      errors.push(...cssValidation.errors);
      warnings.push(...cssValidation.warnings);
    }
  }

  // 语法检查
  if (opts.checkSyntax) {
    const fileMap = new Map<string, string>();
    for (const file of files) {
      if (file.language === 'tsx' || file.language === 'ts') {
        fileMap.set(file.path, file.content);
      }
    }

    if (fileMap.size > 0) {
      const syntaxResult = syntaxCheck(fileMap);
      for (const err of syntaxResult.errors) {
        errors.push({
          file: err.file,
          line: err.line,
          column: err.column,
          message: err.message,
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

/**
 * 验证 TSX 文件
 */
function validateTsxFile(
  file: ParsedFile,
  options: ValidateOptions
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const lines = file.content.split('\n');

  // 检查文件大小
  if (file.content.length > 50000) {
    warnings.push({
      file: file.path,
      message: 'File is very large (>50KB), consider splitting into smaller components',
    });
  }

  // 检查行数
  if (lines.length > 500) {
    warnings.push({
      file: file.path,
      message: 'File has many lines (>500), consider splitting into smaller components',
    });
  }

  // 检查是否有多个组件导出
  const defaultExports = (file.content.match(/export\s+default/g) || []).length;
  if (defaultExports > 1) {
    errors.push({
      file: file.path,
      message: 'File has multiple default exports',
    });
  }

  // 检查命名导出
  const namedExports = file.content.match(/export\s+(?:const|function|class)\s+\w+/g) || [];
  if (namedExports.length > 5) {
    warnings.push({
      file: file.path,
      message: `File has many named exports (${namedExports.length}), consider using barrel exports`,
    });
  }

  // 检查 TODO/FIXME 注释
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/\/\/\s*(TODO|FIXME|XXX)/i.test(line)) {
      warnings.push({
        file: file.path,
        line: i + 1,
        message: 'Found TODO/FIXME comment',
      });
    }
  }

  // 检查 console.log
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/console\.(log|warn|error|debug)/.test(line)) {
      warnings.push({
        file: file.path,
        line: i + 1,
        message: 'Found console statement, remove before production',
      });
    }
  }

  // 检查 any 类型
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/:\s*any\b/.test(line) || /<any>/.test(line)) {
      warnings.push({
        file: file.path,
        line: i + 1,
        message: 'Avoid using "any" type, prefer explicit types',
      });
    }
  }

  // 检查 Tailwind 类名 (可选)
  if (options.checkTailwindClasses) {
    const classNameMatches = file.content.matchAll(/className="([^"]+)"/g);
    for (const match of classNameMatches) {
      const classes = match[1].split(/\s+/);
      for (const cls of classes) {
        if (!isValidTailwindClass(cls)) {
          warnings.push({
            file: file.path,
            message: `Unknown Tailwind class: ${cls}`,
          });
        }
      }
    }
  }

  return { errors, warnings };
}

/**
 * 验证 CSS 文件
 */
function validateCssFile(
  file: ParsedFile
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 检查是否包含 Tailwind 指令
  if (!file.content.includes('@tailwind')) {
    warnings.push({
      file: file.path,
      message: 'CSS file does not contain @tailwind directives',
    });
  }

  // 检查是否有过多自定义样式
  const customRules = file.content.match(/\{[^}]+\}/g) || [];
  const tailwindLayers = file.content.match(/@layer\s+(base|components|utilities)/g) || [];

  if (customRules.length > 10 && tailwindLayers.length === 0) {
    warnings.push({
      file: file.path,
      message: 'Many custom CSS rules without @layer, consider using Tailwind @layer',
    });
  }

  return { errors, warnings };
}

/**
 * 检查是否是有效的 Tailwind 类名 (简化版)
 */
function isValidTailwindClass(className: string): boolean {
  // 基础类名模式
  const patterns = [
    // 布局
    /^(block|inline|inline-block|flex|inline-flex|grid|inline-grid|hidden)$/,
    /^(container|mx-auto)$/,
    // 间距
    /^[pm][xytblr]?-(\d+|auto|px)$/,
    // 尺寸
    /^[wh]-(full|screen|auto|\d+|px)$/,
    /^(min|max)-[wh]-(full|screen|auto|\d+|px)$/,
    // Flexbox/Grid
    /^(flex|grid)-(row|col|wrap|nowrap)$/,
    /^(items|justify|content|self)-(start|end|center|between|around|stretch)$/,
    /^gap-\d+$/,
    // 文字
    /^text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)$/,
    /^text-(left|center|right|justify)$/,
    /^text-(\w+)-(\d+)$/,
    /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/,
    /^(leading|tracking)-(\w+)$/,
    // 颜色
    /^(text|bg|border|ring)-(\w+)(-\d+)?$/,
    // 边框
    /^border(-\d+)?$/,
    /^rounded(-\w+)?$/,
    // 阴影
    /^shadow(-\w+)?$/,
    // 响应式前缀
    /^(sm|md|lg|xl|2xl):/,
    // 状态前缀
    /^(hover|focus|active|disabled|group-hover):/,
    // 其他常用
    /^(opacity|transition|duration|ease|cursor|overflow|z)-\w+$/,
    /^(absolute|relative|fixed|sticky)$/,
    /^(top|right|bottom|left)-(\d+|auto)$/,
    /^(visible|invisible)$/,
    /^(antialiased|subpixel-antialiased)$/,
  ];

  // 移除响应式和状态前缀后检查
  let cls = className;
  const prefixMatch = cls.match(/^(?:sm|md|lg|xl|2xl|hover|focus|active|disabled|group-hover):/);
  if (prefixMatch) {
    cls = cls.slice(prefixMatch[0].length);
  }

  // 任意值语法 [xxx]
  if (/\[.+\]/.test(cls)) {
    return true;
  }

  return patterns.some(pattern => pattern.test(className) || pattern.test(cls));
}

/**
 * 验证项目结构
 */
export function validateProjectStructure(files: ParsedFile[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const filePaths = files.map(f => f.path);

  // 必须的文件
  const requiredFiles = ['src/main.tsx', 'src/App.tsx'];
  for (const required of requiredFiles) {
    if (!filePaths.some(p => p === required)) {
      errors.push({
        file: required,
        message: `Missing required file: ${required}`,
      });
    }
  }

  // 推荐的目录结构
  const hasComponents = filePaths.some(p => p.includes('/components/'));
  if (!hasComponents) {
    warnings.push({
      file: 'src/components/',
      message: 'No components directory found, consider organizing components',
    });
  }

  // 检查是否有样式文件
  const hasStyles = filePaths.some(p => p.endsWith('.css'));
  if (!hasStyles) {
    warnings.push({
      file: 'src/styles/',
      message: 'No CSS files found',
    });
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 合并多个验证结果
 */
export function mergeValidationResults(...results: ValidationResult[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (const result of results) {
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * 格式化验证结果
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push('✓ Validation passed');
  } else {
    lines.push('✗ Validation failed');
  }

  if (result.errors.length > 0) {
    lines.push(`\nErrors (${result.errors.length}):`);
    for (const error of result.errors) {
      const location = error.line ? `:${error.line}${error.column ? `:${error.column}` : ''}` : '';
      lines.push(`  • ${error.file}${location}: ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push(`\nWarnings (${result.warnings.length}):`);
    for (const warning of result.warnings) {
      const location = warning.line ? `:${warning.line}` : '';
      lines.push(`  ⚠ ${warning.file}${location}: ${warning.message}`);
    }
  }

  return lines.join('\n');
}
