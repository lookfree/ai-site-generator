/**
 * 高级解析器
 * 提供缓存和便捷的解析接口
 */

import { parse, print, initSWC } from './swc-wasm';
import type { Module } from './types';

export interface ParsedModule {
  ast: Module;
  sourceCode: string;
  filePath: string;
}

/**
 * AST 解析器类
 */
export class Parser {
  private cache = new Map<string, ParsedModule>();

  /**
   * 初始化解析器
   */
  async initialize(): Promise<void> {
    await initSWC();
  }

  /**
   * 解析 TSX/JSX 文件
   */
  async parseFile(code: string, filePath: string): Promise<ParsedModule> {
    // 检查缓存
    const cacheKey = `${filePath}:${this.hashCode(code)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const isTsx = filePath.endsWith('.tsx') || filePath.endsWith('.jsx');

    const ast = await parse(code, {
      syntax: 'typescript',
      tsx: isTsx,
    });

    const result: ParsedModule = {
      ast: ast as Module,
      sourceCode: code,
      filePath,
    };

    // 缓存结果
    this.cache.set(cacheKey, result);

    return result;
  }

  /**
   * 将 AST 转换回代码
   */
  async generate(ast: Module): Promise<string> {
    return print(ast, { minify: false });
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 从缓存中移除特定文件
   */
  invalidate(filePath: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(filePath)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 获取缓存大小
   */
  get cacheSize(): number {
    return this.cache.size;
  }

  /**
   * 简单哈希函数
   */
  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}

// 单例导出
export const parser = new Parser();

// 重新导出
export * from './swc-wasm';
export * from './types';
