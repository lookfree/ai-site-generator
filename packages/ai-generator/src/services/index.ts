/**
 * Services 模块导出
 */

// Prompt 相关
export {
  REACT_SYSTEM_PROMPT,
  REACT_SYSTEM_PROMPT_EN,
  getSystemPrompt,
  createUserPrompt,
} from './prompt';

// 代码解析
export {
  parseAIResponse,
  isValidFilePath,
  normalizeLanguage,
  parseLegacyFormat,
  validateTsxCode,
  extractComponentName,
  extractPropsInterface,
  extractImports,
  inferComponentNameFromPath,
} from './code-parser';

// 脚手架生成
export {
  generateScaffold,
  generateViteConfigWithTagger,
  generateTailwindConfigWithColor,
  generateDefaultAppTsx,
} from './scaffolder';

// TypeScript 类型检查
export {
  typeCheck,
  syntaxCheck,
  formatTypeCheckErrors,
} from './type-checker';

// 代码验证
export {
  validateFiles,
  validateProjectStructure,
  mergeValidationResults,
  formatValidationResult,
  type ValidateOptions,
} from './code-validator';

// AI 生成器
export {
  AIGenerator,
  createAIGenerator,
  aiGenerator,
  type AIClient,
  type GeneratorOptions,
} from './ai-generator';
