/**
 * AI 代码生成服务
 * 集成所有服务模块
 */

import type {
  ProjectConfig,
  GenerateRequest,
  GenerateResult,
  ParsedFile,
  ScaffoldFile,
  ValidationResult,
} from '../types';

import { getSystemPrompt, createUserPrompt } from './prompt';
import { parseAIResponse } from './code-parser';
import { generateScaffold, generateViteConfigWithTagger, generateDefaultAppTsx } from './scaffolder';
import { validateFiles, validateProjectStructure, mergeValidationResults } from './code-validator';

/** AI 客户端接口 */
export interface AIClient {
  /** 生成代码 */
  generate(systemPrompt: string, userPrompt: string): Promise<string>;
}

/** 生成器选项 */
export interface GeneratorOptions {
  /** AI 客户端 */
  aiClient?: AIClient;
  /** 是否验证代码 */
  validateCode?: boolean;
  /** 是否使用 jsx-tagger 插件 */
  useJsxTagger?: boolean;
  /** 语言 */
  language?: 'zh' | 'en';
}

const DEFAULT_OPTIONS: GeneratorOptions = {
  validateCode: true,
  useJsxTagger: true,
  language: 'zh',
};

/**
 * AI 代码生成器类
 */
export class AIGenerator {
  private options: GeneratorOptions;
  private aiClient: AIClient | null;

  constructor(options: GeneratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.aiClient = options.aiClient || null;
  }

  /**
   * 设置 AI 客户端
   */
  setAIClient(client: AIClient): void {
    this.aiClient = client;
  }

  /**
   * 生成完整项目
   */
  async generate(request: GenerateRequest): Promise<GenerateResult> {
    const { description, config, options } = request;

    try {
      // 1. 生成脚手架文件
      const scaffoldResult = generateScaffold(config);
      const scaffoldFiles = [...scaffoldResult.files];

      // 如果使用 jsx-tagger，替换 vite.config.ts
      if (this.options.useJsxTagger) {
        const viteConfigIndex = scaffoldFiles.findIndex(f => f.path === 'vite.config.ts');
        if (viteConfigIndex !== -1) {
          scaffoldFiles[viteConfigIndex] = {
            path: 'vite.config.ts',
            content: generateViteConfigWithTagger(config),
          };
        }
      }

      // 2. 使用 AI 生成组件代码
      let componentFiles: ParsedFile[] = [];

      if (this.aiClient) {
        const systemPrompt = getSystemPrompt(options?.language || this.options.language);
        const userPrompt = createUserPrompt(description, {
          primaryColor: options?.primaryColor,
          includeExamples: options?.includeExamples,
        });

        const aiResponse = await this.aiClient.generate(systemPrompt, userPrompt);
        const parseResult = parseAIResponse(aiResponse);

        if (!parseResult.success) {
          return {
            success: false,
            scaffoldFiles,
            componentFiles: [],
            validation: {
              success: false,
              errors: parseResult.errors.map(msg => ({
                file: 'AI Response',
                message: msg,
              })),
              warnings: [],
            },
            error: 'Failed to parse AI response',
          };
        }

        componentFiles = parseResult.files;
      } else {
        // 没有 AI 客户端时，生成默认的 App.tsx
        componentFiles = [{
          path: 'src/App.tsx',
          content: generateDefaultAppTsx(config.projectName),
          language: 'tsx',
        }];
      }

      // 3. 验证代码
      let validation: ValidationResult = {
        success: true,
        errors: [],
        warnings: [],
      };

      if (this.options.validateCode) {
        const codeValidation = validateFiles(componentFiles);
        const structureValidation = validateProjectStructure(componentFiles);
        validation = mergeValidationResults(codeValidation, structureValidation);
      }

      return {
        success: validation.success,
        scaffoldFiles,
        componentFiles,
        validation,
      };
    } catch (error) {
      return {
        success: false,
        scaffoldFiles: [],
        componentFiles: [],
        validation: {
          success: false,
          errors: [{
            file: 'Generator',
            message: error instanceof Error ? error.message : 'Unknown error',
          }],
          warnings: [],
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 只生成脚手架文件 (不调用 AI)
   */
  generateScaffoldOnly(config: ProjectConfig): ScaffoldFile[] {
    const result = generateScaffold(config);
    const files = [...result.files];

    if (this.options.useJsxTagger) {
      const viteConfigIndex = files.findIndex(f => f.path === 'vite.config.ts');
      if (viteConfigIndex !== -1) {
        files[viteConfigIndex] = {
          path: 'vite.config.ts',
          content: generateViteConfigWithTagger(config),
        };
      }
    }

    return files;
  }

  /**
   * 验证已有代码
   */
  validateExistingCode(files: ParsedFile[]): ValidationResult {
    const codeValidation = validateFiles(files);
    const structureValidation = validateProjectStructure(files);
    return mergeValidationResults(codeValidation, structureValidation);
  }

  /**
   * 解析 AI 响应
   */
  parseResponse(response: string): ParsedFile[] {
    const result = parseAIResponse(response);
    return result.files;
  }
}

/**
 * 创建 AI 生成器实例
 */
export function createAIGenerator(options?: GeneratorOptions): AIGenerator {
  return new AIGenerator(options);
}

/**
 * 默认的 AI 生成器实例
 */
export const aiGenerator = new AIGenerator();
