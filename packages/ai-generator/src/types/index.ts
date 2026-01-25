/**
 * AI 代码生成系统类型定义
 */

// ========================================
// 文件解析类型
// ========================================

/** 支持的语言类型 */
export type FileLanguage = 'tsx' | 'ts' | 'css' | 'json' | 'html';

/** 解析后的文件 */
export interface ParsedFile {
  /** 文件路径 (相对于项目根目录) */
  path: string;
  /** 文件内容 */
  content: string;
  /** 语言类型 */
  language: FileLanguage;
}

/** 解析结果 */
export interface ParseResult {
  /** 是否成功 */
  success: boolean;
  /** 解析出的文件列表 */
  files: ParsedFile[];
  /** 错误信息 */
  errors: string[];
}

// ========================================
// 项目配置类型
// ========================================

/** 项目配置 */
export interface ProjectConfig {
  /** 项目 ID */
  projectId: string;
  /** 项目名称 */
  projectName: string;
  /** 项目描述 */
  description: string;
}

/** 脚手架结果 */
export interface ScaffoldResult {
  /** 是否成功 */
  success: boolean;
  /** 生成的文件列表 */
  files: ScaffoldFile[];
}

/** 脚手架文件 */
export interface ScaffoldFile {
  /** 文件路径 */
  path: string;
  /** 文件内容 */
  content: string;
}

// ========================================
// 代码验证类型
// ========================================

/** 代码验证错误 */
export interface ValidationError {
  /** 文件路径 */
  file: string;
  /** 行号 */
  line?: number;
  /** 列号 */
  column?: number;
  /** 错误消息 */
  message: string;
  /** 规则 ID */
  ruleId?: string;
}

/** 代码验证警告 */
export interface ValidationWarning {
  /** 文件路径 */
  file: string;
  /** 行号 */
  line?: number;
  /** 警告消息 */
  message: string;
  /** 规则 ID */
  ruleId?: string;
}

/** 代码验证结果 */
export interface ValidationResult {
  /** 是否通过验证 */
  success: boolean;
  /** 错误列表 */
  errors: ValidationError[];
  /** 警告列表 */
  warnings: ValidationWarning[];
}

// ========================================
// TypeScript 类型检查
// ========================================

/** TypeScript 检查错误 */
export interface TypeCheckError {
  /** 文件路径 */
  file: string;
  /** 行号 */
  line: number;
  /** 列号 */
  column: number;
  /** 错误消息 */
  message: string;
  /** TypeScript 错误代码 */
  code: number;
}

/** TypeScript 检查警告 */
export interface TypeCheckWarning {
  /** 文件路径 */
  file: string;
  /** 行号 */
  line: number;
  /** 警告消息 */
  message: string;
}

/** TypeScript 检查结果 */
export interface TypeCheckResult {
  /** 是否通过检查 */
  success: boolean;
  /** 错误列表 */
  errors: TypeCheckError[];
  /** 警告列表 */
  warnings: TypeCheckWarning[];
}

// ========================================
// ESLint 检查
// ========================================

/** ESLint 问题 */
export interface LintIssue {
  /** 文件路径 */
  file: string;
  /** 行号 */
  line: number;
  /** 列号 */
  column: number;
  /** 消息 */
  message: string;
  /** 规则 ID */
  ruleId: string | null;
  /** 严重程度 */
  severity: 'error' | 'warning';
}

/** ESLint 检查结果 */
export interface LintResult {
  /** 是否通过检查 */
  success: boolean;
  /** 错误列表 */
  errors: LintIssue[];
  /** 警告列表 */
  warnings: LintIssue[];
  /** 修复后的代码 (如果启用了 fix) */
  fixedCode?: Map<string, string>;
}

// ========================================
// AI 生成类型
// ========================================

/** AI 生成请求 */
export interface GenerateRequest {
  /** 项目描述 */
  description: string;
  /** 项目配置 */
  config: ProjectConfig;
  /** 额外选项 */
  options?: GenerateOptions;
}

/** 生成选项 */
export interface GenerateOptions {
  /** 是否包含示例组件 */
  includeExamples?: boolean;
  /** 主题颜色 */
  primaryColor?: string;
  /** 语言 */
  language?: 'zh' | 'en';
}

/** AI 生成结果 */
export interface GenerateResult {
  /** 是否成功 */
  success: boolean;
  /** 脚手架文件 */
  scaffoldFiles: ScaffoldFile[];
  /** AI 生成的组件文件 */
  componentFiles: ParsedFile[];
  /** 验证结果 */
  validation: ValidationResult;
  /** 错误信息 */
  error?: string;
}
