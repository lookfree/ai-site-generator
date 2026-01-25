/**
 * HMR System 主入口
 * Vite HMR + React Fast Refresh 集成
 */

// Server exports
export {
  ViteServerManager,
  viteServerManager,
  FileWatcherManager,
  fileWatcherManager,
  ProjectManager,
  projectManager,
} from './server';

// Client exports
export {
  HmrClient,
  createHmrClient,
  type HmrClientOptions,
  OptimisticUpdater,
  optimisticUpdater,
  type OptimisticUpdaterOptions,
  StatePreserver,
  statePreserver,
  type StatePreserverOptions,
} from './client';

// Sync exports
export {
  FileSyncService,
  fileSyncService,
  type FileSyncServiceOptions,
  ChangeQueue,
  changeQueue,
  type ChangeQueueOptions,
  ConflictResolver,
  conflictResolver,
  type ConflictResolverOptions,
  type ResolvedConflict,
} from './sync';

// Type exports
export type {
  // Server types
  ProjectServerConfig,
  ProjectServer,
  ProjectInfo,
  // HMR types
  HmrUpdate,
  HmrError,
  HmrMessage,
  // File sync types
  FileChange,
  SyncResult,
  BatchSyncResult,
  // Optimistic update types
  OptimisticUpdate,
  UpdateResult,
  // State preserver types
  ComponentState,
  // Queue types
  QueuedChange,
  QueueStats,
  // Conflict types
  FileConflict,
  ConflictResolution,
  // Event types
  HmrSystemEvents,
} from './types';

/**
 * 创建完整的 HMR 系统实例
 */
export function createHmrSystem(options: {
  basePort?: number;
  maxProjects?: number;
  idleTimeout?: number;
} = {}) {
  const viteManager = new (require('./server').ViteServerManager)({
    basePort: options.basePort,
    maxServers: options.maxProjects,
  });

  const watcherManager = new (require('./server').FileWatcherManager)();

  const projectMgr = new (require('./server').ProjectManager)({
    viteServerManager: viteManager,
    fileWatcherManager: watcherManager,
    idleTimeout: options.idleTimeout,
    maxProjects: options.maxProjects,
  });

  const fileSync = new (require('./sync').FileSyncService)();
  const queue = new (require('./sync').ChangeQueue)();
  const resolver = new (require('./sync').ConflictResolver)();

  return {
    projectManager: projectMgr,
    viteServerManager: viteManager,
    fileWatcherManager: watcherManager,
    fileSyncService: fileSync,
    changeQueue: queue,
    conflictResolver: resolver,

    /**
     * 启动系统
     */
    start() {
      fileSync.start();
      queue.start();
      projectMgr.startIdleCleanup();
    },

    /**
     * 停止系统
     */
    async shutdown() {
      fileSync.stop();
      queue.stop();
      projectMgr.stopIdleCleanup();
      await projectMgr.shutdown();
    },
  };
}
