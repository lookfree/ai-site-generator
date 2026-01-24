/**
 * 变换器模块入口
 * 提供统一的代码变换接口
 */

import { parser } from '../parser';
import { updateText, TextPayload } from './text';
import { updateStyle, StylePayload } from './style';
import { updateAttribute } from './attribute';
import { TransformResult } from './base';

export type TransformOperation =
  | { type: 'text'; payload: TextPayload }
  | { type: 'style'; payload: StylePayload }
  | { type: 'attribute'; payload: { name: string; value: string | boolean | null } };

export interface TransformRequest {
  /** 目标 JSX ID */
  jsxId: string;
  /** 变换操作 */
  operation: TransformOperation;
}

/**
 * 统一的代码变换接口
 * @param sourceCode 源代码
 * @param filePath 文件路径
 * @param request 变换请求
 * @returns 变换后的代码和结果
 */
export async function transformCode(
  sourceCode: string,
  filePath: string,
  request: TransformRequest
): Promise<{ code: string; result: TransformResult }> {
  // 1. 解析代码
  const { ast } = await parser.parseFile(sourceCode, filePath);

  // 2. 执行变换
  let result: TransformResult;

  switch (request.operation.type) {
    case 'text':
      result = updateText(ast, request.jsxId, request.operation.payload.text);
      break;
    case 'style':
      result = updateStyle(ast, request.jsxId, request.operation.payload);
      break;
    case 'attribute':
      result = updateAttribute(
        ast,
        request.jsxId,
        request.operation.payload.name,
        request.operation.payload.value
      );
      break;
    default:
      throw new Error('Unknown operation type');
  }

  if (!result.success) {
    return { code: sourceCode, result };
  }

  // 3. 生成新代码
  const code = await parser.generate(result.ast as import('../parser/types').Module);

  return { code, result };
}

/**
 * 批量变换
 * @param sourceCode 源代码
 * @param filePath 文件路径
 * @param requests 变换请求数组
 * @returns 变换后的代码和结果数组
 */
export async function batchTransformCode(
  sourceCode: string,
  filePath: string,
  requests: TransformRequest[]
): Promise<{ code: string; results: TransformResult[] }> {
  let currentCode = sourceCode;
  const results: TransformResult[] = [];

  for (const request of requests) {
    const { code, result } = await transformCode(currentCode, filePath, request);
    currentCode = code;
    results.push(result);

    // 如果有失败，停止处理
    if (!result.success) {
      break;
    }
  }

  return { code: currentCode, results };
}

/**
 * 应用多个变换操作到同一个节点
 * @param sourceCode 源代码
 * @param filePath 文件路径
 * @param jsxId 目标 JSX ID
 * @param operations 变换操作数组
 * @returns 变换后的代码和结果
 */
export async function applyOperations(
  sourceCode: string,
  filePath: string,
  jsxId: string,
  operations: TransformOperation[]
): Promise<{ code: string; results: TransformResult[] }> {
  const requests: TransformRequest[] = operations.map(operation => ({
    jsxId,
    operation,
  }));

  return batchTransformCode(sourceCode, filePath, requests);
}

// 重新导出子模块
export * from './text';
export * from './style';
export * from './attribute';
export * from './structure';
export * from './base';
