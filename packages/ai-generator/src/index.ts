/**
 * AI 代码生成系统
 * React + TypeScript + Tailwind CSS 项目生成
 */

// 服务导出
export {
  // Prompt
  REACT_SYSTEM_PROMPT,
  REACT_SYSTEM_PROMPT_EN,
  getSystemPrompt,
  createUserPrompt,
  // 代码解析
  parseAIResponse,
  isValidFilePath,
  normalizeLanguage,
  parseLegacyFormat,
  validateTsxCode,
  extractComponentName,
  extractPropsInterface,
  extractImports,
  inferComponentNameFromPath,
  // 脚手架生成
  generateScaffold,
  generateViteConfigWithTagger,
  generateTailwindConfigWithColor,
  generateDefaultAppTsx,
  // TypeScript 检查
  typeCheck,
  syntaxCheck,
  formatTypeCheckErrors,
  // 代码验证
  validateFiles,
  validateProjectStructure,
  mergeValidationResults,
  formatValidationResult,
  type ValidateOptions,
  // AI 生成器
  AIGenerator,
  createAIGenerator,
  aiGenerator,
  type AIClient,
  type GeneratorOptions,
} from './services';

// 类型导出
export type {
  // 文件类型
  FileLanguage,
  ParsedFile,
  ParseResult,
  // 项目配置
  ProjectConfig,
  ScaffoldResult,
  ScaffoldFile,
  // 验证类型
  ValidationError,
  ValidationWarning,
  ValidationResult,
  // TypeScript 检查
  TypeCheckError,
  TypeCheckWarning,
  TypeCheckResult,
  // ESLint 检查
  LintIssue,
  LintResult,
  // AI 生成
  GenerateRequest,
  GenerateOptions,
  GenerateResult,
} from './types';
