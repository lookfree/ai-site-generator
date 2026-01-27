/**
 * AST 处理统一类型定义
 * 提供与 packages/ast-processor 一致的类型接口
 */

/**
 * 变换请求
 */
export interface TransformRequest {
  /** 目标 JSX ID */
  jsxId: string;
  /** 变换操作 */
  operation: TransformOperation;
}

/**
 * 变换操作联合类型
 */
export type TransformOperation =
  | TextOperation
  | StyleOperation
  | AttributeOperation
  | RemoveOperation
  | InsertOperation;

/**
 * 文本操作
 */
export interface TextOperation {
  type: 'text';
  payload: TextPayload;
}

export interface TextPayload {
  /** 新文本内容 */
  text: string;
  /** 是否追加而非替换 */
  append?: boolean;
}

/**
 * 样式操作
 */
export interface StyleOperation {
  type: 'style';
  payload: StylePayload;
}

export interface StylePayload {
  /** 完全替换 className */
  className?: string;
  /** 要添加的类名 */
  addClasses?: string[];
  /** 要移除的类名 */
  removeClasses?: string[];
  /** 行内样式对象 */
  style?: Record<string, string>;
}

/**
 * 属性操作
 */
export interface AttributeOperation {
  type: 'attribute';
  payload: AttributePayload;
}

export interface AttributePayload {
  /** 属性名 */
  name: string;
  /** 属性值，null 表示删除 */
  value: string | boolean | number | null;
}

/**
 * 删除操作
 */
export interface RemoveOperation {
  type: 'remove';
}

/**
 * 插入操作
 */
export interface InsertOperation {
  type: 'insert';
  payload: InsertPayload;
}

export interface InsertPayload {
  /** 要插入的 JSX 代码 */
  node: string;
  /** 插入位置 */
  position: 'before' | 'after' | 'first' | 'last';
}

/**
 * 变换结果
 */
export interface TransformResult {
  /** 是否成功 */
  success: boolean;
  /** 变换后的代码 */
  code?: string;
  /** 错误信息 */
  error?: string;
  /** 变更记录 */
  changes?: TransformChange[];
}

/**
 * 变更记录
 */
export interface TransformChange {
  /** 变更类型 */
  type: 'add' | 'modify' | 'remove';
  /** 变更路径 */
  path: string[];
  /** 旧值 */
  oldValue?: unknown;
  /** 新值 */
  newValue?: unknown;
}

/**
 * JSX 节点信息
 */
export interface JSXNodeInfo {
  /** 节点类型 */
  type: string;
  /** JSX ID */
  jsxId: string;
  /** 元素名称 */
  element: string;
  /** 属性 */
  attributes: Record<string, unknown>;
  /** 文本内容 */
  textContent?: string;
  /** 子节点数量 */
  childCount: number;
  /** 位置信息 */
  location?: NodeLocation;
}

/**
 * 节点位置信息
 */
export interface NodeLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

/**
 * AST 处理器接口
 * 定义统一的 API 契约
 */
export interface IASTProcessor {
  /**
   * 初始化处理器
   */
  initialize(): Promise<void>;

  /**
   * 解析代码为 AST
   */
  parse(code: string, filePath: string): Promise<unknown>;

  /**
   * 将 AST 生成为代码
   */
  generate(ast: unknown): Promise<string>;

  /**
   * 执行单个变换操作
   */
  transform(code: string, filePath: string, request: TransformRequest): Promise<TransformResult>;

  /**
   * 批量执行变换操作
   */
  batchTransform(code: string, filePath: string, requests: TransformRequest[]): Promise<TransformResult>;

  /**
   * 根据文本内容执行编辑
   */
  transformByText(
    code: string,
    filePath: string,
    originalText: string,
    newText: string,
    tagName?: string
  ): Promise<TransformResult>;

  /**
   * 根据位置执行编辑
   */
  transformByPosition(
    code: string,
    filePath: string,
    line: number,
    column: number,
    operation: TransformOperation
  ): Promise<TransformResult>;

  /**
   * 查找所有带 JSX ID 的节点
   */
  findAllNodes(code: string, filePath: string): JSXNodeInfo[];

  /**
   * 根据 JSX ID 查找节点
   */
  findNodeById(code: string, filePath: string, jsxId: string): JSXNodeInfo | null;

  /**
   * 根据文本内容查找节点
   */
  findNodeByText(code: string, filePath: string, textContent: string, tagName?: string): JSXNodeInfo | null;

  /**
   * 清除缓存
   */
  clearCache(): void;

  /**
   * 使指定文件缓存失效
   */
  invalidateCache(filePath: string): void;
}

/**
 * CSS 样式到 Tailwind 类的映射
 */
export interface TailwindMappingResult {
  /** 生成的 Tailwind 类名 */
  classes: string[];
  /** 无法映射的 CSS 属性 */
  unmapped: Record<string, string>;
}
