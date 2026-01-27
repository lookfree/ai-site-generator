/**
 * AST 处理器适配层
 * 统一接口，复用现有 SWC core 实现
 */

import type { IASTProcessor, TransformRequest, TransformResult, TransformOperation } from './types';
import {
  astEditor,
  batchEditCode,
  editCode,
  editCodeByPosition,
  editCodeByText,
  editCodeByClassName,
  findNodeById,
  findNodes,
  findNodeByText,
  findNodeByClassName,
} from './index';

export class ASTProcessorAdapter implements IASTProcessor {
  async initialize(): Promise<void> {
    return;
  }

  async parse(code: string, filePath: string): Promise<unknown> {
    return astEditor.parse(code, filePath);
  }

  async generate(ast: unknown): Promise<string> {
    return astEditor.generate(ast as any);
  }

  async transform(code: string, filePath: string, request: TransformRequest): Promise<TransformResult> {
    return editCode(code, filePath, {
      jsxId: request.jsxId,
      operation: request.operation,
    });
  }

  async batchTransform(code: string, filePath: string, requests: TransformRequest[]): Promise<TransformResult> {
    return batchEditCode(code, filePath, requests.map(r => ({ jsxId: r.jsxId, operation: r.operation })));
  }

  async transformByText(
    code: string,
    filePath: string,
    originalText: string,
    newText: string,
    tagName?: string
  ): Promise<TransformResult> {
    return editCodeByText(code, filePath, originalText, newText, tagName);
  }

  async transformByPosition(
    code: string,
    filePath: string,
    line: number,
    column: number,
    operation: TransformOperation
  ): Promise<TransformResult> {
    return editCodeByPosition(code, filePath, line, column, operation);
  }

  findAllNodes(code: string, filePath: string) {
    return findNodes(code, filePath);
  }

  findNodeById(code: string, filePath: string, jsxId: string) {
    return findNodeById(code, filePath, jsxId);
  }

  findNodeByText(code: string, filePath: string, textContent: string, tagName?: string) {
    return findNodeByText(code, filePath, textContent, tagName);
  }

  findNodeByClassName(code: string, filePath: string, className: string, tagName?: string) {
    return findNodeByClassName(code, filePath, className, tagName);
  }

  async transformByClassName(
    code: string,
    filePath: string,
    oldClassName: string,
    operation: TransformOperation,
    tagName?: string
  ): Promise<TransformResult> {
    return editCodeByClassName(code, filePath, oldClassName, operation, tagName);
  }

  clearCache(): void {
    astEditor.clearCache();
  }

  invalidateCache(filePath: string): void {
    astEditor.invalidate(filePath);
  }
}

export const astProcessor = new ASTProcessorAdapter();
