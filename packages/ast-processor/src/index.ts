/**
 * AST 处理系统主入口
 *
 * 提供客户端 AST 处理能力，支持安全的声明式代码修改
 */

// Parser - SWC WASM 集成
export { parser, Parser } from './parser';
export type { ParsedModule } from './parser';
export { parse, print, initSWC, isInitialized, resetSWC } from './parser/swc-wasm';
export type { ParseOptions, PrintOptions } from './parser/swc-wasm';
export * from './parser/types';

// Traverser - AST 遍历器
export {
  traverse,
  collect,
  find,
} from './traverser/visitor';
export type {
  Visitor,
  VisitorContext,
  VisitorFunction,
  NodeType,
} from './traverser/visitor';

export {
  findNodeByJsxId,
  findAllJsxNodes,
  findNodeByLocation,
  findNodesByElement,
  hasAttribute,
  getAttribute,
  getClassName,
} from './traverser/jsx-locator';
export type { JSXNodeInfo } from './traverser/jsx-locator';

// Transformers - AST 变换器
export {
  transformCode,
  batchTransformCode,
  applyOperations,
} from './transformers';
export type {
  TransformRequest,
  TransformOperation,
} from './transformers';

export {
  BaseTransformer,
  createStringLiteral,
  createIdentifier,
  createJSXAttribute,
  createJSXText,
  createJSXExpressionContainer,
  createObjectExpression,
} from './transformers/base';
export type {
  TransformResult,
  TransformChange,
} from './transformers/base';

export {
  TextTransformer,
  updateText,
  appendText,
  clearChildren,
} from './transformers/text';
export type { TextPayload } from './transformers/text';

export {
  StyleTransformer,
  updateStyle,
  addClasses,
  removeClasses as removeStyleClasses,
  setClassName,
  setInlineStyle,
} from './transformers/style';
export type { StylePayload } from './transformers/style';

export {
  AttributeTransformer,
  updateAttribute,
  setAttributes,
  removeAttribute,
} from './transformers/attribute';
export type { AttributePayload } from './transformers/attribute';

export {
  StructureTransformer,
  removeNode,
  insertNode,
  replaceNode,
  wrapNode,
  unwrapNode,
} from './transformers/structure';
export type {
  InsertPayload,
  WrapPayload,
} from './transformers/structure';

// Generator - 代码生成器
export {
  Generator,
  createGenerator,
  generateCode,
  generateCodeSync,
  Printer,
  createPrinter,
  printAST,
} from './generator';
export type {
  GeneratorOptions,
  PrinterOptions,
} from './generator';

// Tailwind - CSS 到 Tailwind 映射
export {
  cssToTailwind,
  cssObjectToTailwind,
  parseCSSString,
  cssStringToTailwind,
} from './tailwind/mapper';

export {
  mergeClasses,
  removeClasses,
  normalizeClassString,
  classesToString,
  mergeClassStrings,
  findConflict,
  deduplicateClasses,
  sortClasses,
} from './tailwind/merger';

export {
  getPreset,
  getPresetClasses,
  searchPresets,
  getPresetsByCategory,
  LAYOUT_PRESETS,
  SPACING_PRESETS,
  TEXT_PRESETS,
  BUTTON_PRESETS,
  CARD_PRESETS,
  INPUT_PRESETS,
  STATE_PRESETS,
  ALL_PRESETS,
} from './tailwind/presets';
export type { StylePreset } from './tailwind/presets';

// Utils - 工具函数
export {
  cloneDeep,
  cloneShallow,
  cloneWith,
  deepFreeze,
} from './utils/clone';

export {
  isEqual,
  diff,
  isNodeType,
  getNodeType,
  hasSpan,
} from './utils/compare';
export type { DiffResult } from './utils/compare';

/**
 * 创建 AST 处理器实例
 * 提供便捷的一站式 API
 */
export function createASTProcessor() {
  const { parser } = require('./parser');
  const { generateCode } = require('./generator');
  const { transformCode, batchTransformCode } = require('./transformers');
  const { findNodeByJsxId, findAllJsxNodes } = require('./traverser/jsx-locator');
  const { cssObjectToTailwind } = require('./tailwind/mapper');
  const { mergeClasses } = require('./tailwind/merger');

  return {
    // 初始化
    async initialize() {
      await parser.initialize();
    },

    // 解析
    async parse(code: string, filePath: string) {
      return parser.parseFile(code, filePath);
    },

    // 生成
    async generate(ast: unknown) {
      return generateCode(ast);
    },

    // 变换
    async transform(
      code: string,
      filePath: string,
      request: { jsxId: string; operation: unknown }
    ) {
      return transformCode(code, filePath, request as any);
    },

    // 批量变换
    async batchTransform(
      code: string,
      filePath: string,
      requests: Array<{ jsxId: string; operation: unknown }>
    ) {
      return batchTransformCode(code, filePath, requests as any);
    },

    // 查找节点
    findNode(ast: unknown, jsxId: string) {
      return findNodeByJsxId(ast, jsxId);
    },

    // 查找所有节点
    findAllNodes(ast: unknown) {
      return findAllJsxNodes(ast);
    },

    // CSS 转 Tailwind
    cssToTailwind(styles: Record<string, string>) {
      return cssObjectToTailwind(styles);
    },

    // 合并类名
    mergeClasses(existing: string[], incoming: string[]) {
      return mergeClasses(existing, incoming);
    },

    // 清除缓存
    clearCache() {
      parser.clearCache();
    },
  };
}

// 默认导出处理器工厂
export default createASTProcessor;
