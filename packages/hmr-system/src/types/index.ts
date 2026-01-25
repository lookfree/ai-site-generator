/**
 * HMR System 类型定义
 */

// ========== Server Types ==========

export interface ProjectServerConfig {
  /** 项目 ID */
  projectId: string;
  /** 项目路径 */
  projectPath: string;
  /** 服务端口 */
  port: number;
}

export interface ProjectServer {
  /** Vite Dev Server 实例 */
  server: any; // ViteDevServer
  /** 配置 */
  config: ProjectServerConfig;
  /** 状态 */
  status: 'starting' | 'running' | 'stopped' | 'error';
  /** 启动时间 */
  startTime?: number;
  /** 错误信息 */
  error?: string;
}

export interface ProjectInfo {
  /** 项目 ID */
  projectId: string;
  /** 项目路径 */
  projectPath: string;
  /** 项目名称 */
  name: string;
  /** 预览 URL */
  previewUrl: string | null;
  /** 状态 */
  status: ProjectServer['status'];
}

// ========== HMR Types ==========

export interface HmrUpdate {
  /** 更新类型 */
  type: 'js-update' | 'css-update' | 'full-reload';
  /** 文件路径 */
  path: string;
  /** 接受路径 */
  acceptedPath?: string;
  /** 时间戳 */
  timestamp: number;
}

export interface HmrError {
  /** 错误消息 */
  message: string;
  /** 错误堆栈 */
  stack?: string;
  /** 文件路径 */
  file?: string;
  /** 行号 */
  line?: number;
  /** 列号 */
  column?: number;
}

export interface HmrMessage {
  /** 消息类型 */
  type: 'connected' | 'update' | 'full-reload' | 'prune' | 'error' | 'custom';
  /** 更新列表 */
  updates?: HmrUpdate[];
  /** 错误信息 */
  err?: HmrError;
  /** 清理的路径 */
  paths?: string[];
  /** 自定义数据 */
  data?: any;
}

// ========== File Sync Types ==========

export interface FileChange {
  /** 项目 ID */
  projectId: string;
  /** 文件路径 (相对路径) */
  filePath: string;
  /** 文件内容 */
  content: string;
  /** 时间戳 */
  timestamp: number;
  /** 来源 */
  source?: 'editor' | 'external';
}

export interface SyncResult {
  /** 是否成功 */
  success: boolean;
  /** 文件路径 */
  filePath: string;
  /** 错误信息 */
  error?: string;
  /** 耗时 (ms) */
  duration?: number;
}

export interface BatchSyncResult {
  /** 总数 */
  total: number;
  /** 成功数 */
  succeeded: number;
  /** 失败数 */
  failed: number;
  /** 各文件结果 */
  results: SyncResult[];
}

// ========== Optimistic Update Types ==========

export interface OptimisticUpdate {
  /** 更新 ID */
  id: string;
  /** JSX ID */
  jsxId: string;
  /** 更新类型 */
  type: 'text' | 'className' | 'style' | 'attribute';
  /** 旧值 */
  oldValue: any;
  /** 新值 */
  newValue: any;
  /** 时间戳 */
  timestamp: number;
  /** 状态 */
  status: 'pending' | 'confirmed' | 'rolled-back';
}

export interface UpdateResult {
  /** 是否成功 */
  success: boolean;
  /** 更新 ID */
  updateId: string;
  /** 错误信息 */
  error?: string;
}

// ========== State Preserver Types ==========

export interface ComponentState {
  /** 组件 ID */
  componentId: string;
  /** JSX ID */
  jsxId: string;
  /** 状态数据 */
  state: Record<string, any>;
  /** 时间戳 */
  timestamp: number;
}

// ========== Change Queue Types ==========

export interface QueuedChange {
  /** 变更 ID */
  id: string;
  /** 项目 ID */
  projectId: string;
  /** 文件路径 */
  filePath: string;
  /** 变更类型 */
  changeType: 'create' | 'update' | 'delete';
  /** 内容 (delete 时为 null) */
  content: string | null;
  /** 优先级 */
  priority: number;
  /** 创建时间 */
  createdAt: number;
  /** 重试次数 */
  retries: number;
}

export interface QueueStats {
  /** 队列长度 */
  length: number;
  /** 待处理数 */
  pending: number;
  /** 处理中 */
  processing: number;
  /** 已完成 */
  completed: number;
  /** 失败数 */
  failed: number;
}

// ========== Conflict Types ==========

export interface FileConflict {
  /** 文件路径 */
  filePath: string;
  /** 本地内容 */
  localContent: string;
  /** 远程内容 */
  remoteContent: string;
  /** 基准内容 */
  baseContent?: string;
  /** 检测时间 */
  detectedAt: number;
}

export type ConflictResolution = 'keep-local' | 'keep-remote' | 'merge' | 'manual';

// ========== Event Types ==========

export interface HmrSystemEvents {
  'server:started': { projectId: string; port: number };
  'server:stopped': { projectId: string };
  'server:error': { projectId: string; error: Error };
  'hmr:connected': { projectId: string };
  'hmr:disconnected': { projectId: string };
  'hmr:update': { projectId: string; update: HmrUpdate };
  'hmr:error': { projectId: string; error: HmrError };
  'file:synced': { projectId: string; filePath: string };
  'file:conflict': { projectId: string; conflict: FileConflict };
  'update:applied': { updateId: string; jsxId: string };
  'update:confirmed': { updateId: string };
  'update:rolled-back': { updateId: string };
}
