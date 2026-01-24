/**
 * 代码生成器模块
 * 提供 AST 到代码的转换功能
 */

import { print as swcPrint } from '../parser/swc-wasm';
import { Printer, PrinterOptions, createPrinter, printAST } from './printer';

export interface GeneratorOptions {
  /** 是否压缩输出 */
  minify?: boolean;
  /** 打印器选项 */
  printer?: PrinterOptions;
  /** 使用 SWC 还是自定义打印器 */
  useSwc?: boolean;
}

const DEFAULT_OPTIONS: GeneratorOptions = {
  minify: false,
  useSwc: true,
};

/**
 * 代码生成器类
 */
export class Generator {
  private options: GeneratorOptions;

  constructor(options: GeneratorOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 从 AST 生成代码
   * @param ast AST 根节点
   * @returns 生成的代码字符串
   */
  async generate(ast: unknown): Promise<string> {
    if (this.options.useSwc) {
      return this.generateWithSwc(ast);
    }

    return this.generateWithPrinter(ast);
  }

  /**
   * 使用 SWC 生成代码
   */
  private async generateWithSwc(ast: unknown): Promise<string> {
    try {
      const code = await swcPrint(ast, {
        minify: this.options.minify,
      });

      return code;
    } catch (error) {
      // SWC 失败时回退到自定义打印器
      console.warn('SWC print failed, falling back to custom printer:', error);
      return this.generateWithPrinter(ast);
    }
  }

  /**
   * 使用自定义打印器生成代码
   */
  private generateWithPrinter(ast: unknown): string {
    const printer = createPrinter(this.options.printer);
    return printer.print(ast);
  }
}

/**
 * 创建生成器实例
 */
export function createGenerator(options?: GeneratorOptions): Generator {
  return new Generator(options);
}

/**
 * 快速生成代码
 * @param ast AST 根节点
 * @param options 生成选项
 * @returns 生成的代码字符串
 */
export async function generateCode(
  ast: unknown,
  options?: GeneratorOptions
): Promise<string> {
  const generator = new Generator(options);
  return generator.generate(ast);
}

/**
 * 同步生成代码（仅使用自定义打印器）
 * @param ast AST 根节点
 * @param options 打印器选项
 * @returns 生成的代码字符串
 */
export function generateCodeSync(
  ast: unknown,
  options?: PrinterOptions
): string {
  return printAST(ast, options);
}

// 重新导出
export { Printer, createPrinter, printAST };
export type { PrinterOptions };
