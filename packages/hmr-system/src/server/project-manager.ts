/**
 * 项目实例管理器
 * 管理多个项目的生命周期
 */

import { EventEmitter } from 'events';
import { ViteServerManager } from './vite-server';
import { FileWatcherManager } from './file-watcher';
import type { ProjectInfo, ProjectServer } from '../types';

interface ProjectConfig {
  /** 项目 ID */
  projectId: string;
  /** 项目路径 */
  projectPath: string;
  /** 项目名称 */
  name?: string;
  /** 是否自动启动 */
  autoStart?: boolean;
}

interface ManagedProject {
  config: ProjectConfig;
  status: ProjectServer['status'];
  previewUrl: string | null;
  createdAt: number;
  lastAccessedAt: number;
}

interface ProjectManagerOptions {
  /** Vite Server 管理器 */
  viteServerManager?: ViteServerManager;
  /** 文件监听管理器 */
  fileWatcherManager?: FileWatcherManager;
  /** 空闲超时 (ms) */
  idleTimeout?: number;
  /** 最大项目数 */
  maxProjects?: number;
}

/**
 * 项目管理器
 */
export class ProjectManager extends EventEmitter {
  private projects = new Map<string, ManagedProject>();
  private viteManager: ViteServerManager;
  private watcherManager: FileWatcherManager;
  private idleTimeout: number;
  private maxProjects: number;
  private idleCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: ProjectManagerOptions = {}) {
    super();
    this.viteManager = options.viteServerManager ?? new ViteServerManager();
    this.watcherManager = options.fileWatcherManager ?? new FileWatcherManager();
    this.idleTimeout = options.idleTimeout ?? 30 * 60 * 1000; // 30 分钟
    this.maxProjects = options.maxProjects ?? 10;

    // 转发 Vite Server 事件
    this.viteManager.on('server:started', (data) => this.emit('server:started', data));
    this.viteManager.on('server:stopped', (data) => this.emit('server:stopped', data));
    this.viteManager.on('server:error', (data) => this.emit('server:error', data));
    this.viteManager.on('hmr:connected', (data) => this.emit('hmr:connected', data));
    this.viteManager.on('hmr:disconnected', (data) => this.emit('hmr:disconnected', data));

    // 转发文件监听事件
    this.watcherManager.on('change', (data) => this.emit('file:changed', data));
  }

  /**
   * 注册项目
   */
  async registerProject(config: ProjectConfig): Promise<ProjectInfo> {
    const { projectId, projectPath } = config;

    // 检查是否已存在
    if (this.projects.has(projectId)) {
      throw new Error(`Project ${projectId} already registered`);
    }

    // 检查项目数量限制
    if (this.projects.size >= this.maxProjects) {
      // 尝试清理空闲项目
      await this.cleanupIdleProjects();

      if (this.projects.size >= this.maxProjects) {
        throw new Error(`Maximum project limit (${this.maxProjects}) reached`);
      }
    }

    const now = Date.now();
    const project: ManagedProject = {
      config,
      status: 'stopped',
      previewUrl: null,
      createdAt: now,
      lastAccessedAt: now,
    };

    this.projects.set(projectId, project);

    // 如果设置了自动启动
    if (config.autoStart) {
      await this.startProject(projectId);
    }

    this.emit('project:registered', { projectId });

    return this.getProjectInfo(projectId)!;
  }

  /**
   * 启动项目
   */
  async startProject(projectId: string): Promise<ProjectInfo> {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // 更新访问时间
    project.lastAccessedAt = Date.now();

    // 如果已经在运行
    if (project.status === 'running') {
      return this.getProjectInfo(projectId)!;
    }

    try {
      // 启动 Vite Server
      const server = await this.viteManager.startServer(
        projectId,
        project.config.projectPath
      );

      // 启动文件监听
      this.watcherManager.watch(projectId, project.config.projectPath);

      project.status = server.status;
      project.previewUrl = this.viteManager.getPreviewUrl(projectId);

      this.emit('project:started', { projectId });

      return this.getProjectInfo(projectId)!;

    } catch (error: any) {
      project.status = 'error';
      this.emit('project:error', { projectId, error });
      throw error;
    }
  }

  /**
   * 停止项目
   */
  async stopProject(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (!project) return;

    // 停止 Vite Server
    await this.viteManager.stopServer(projectId);

    // 停止文件监听
    await this.watcherManager.unwatch(projectId);

    project.status = 'stopped';
    project.previewUrl = null;

    this.emit('project:stopped', { projectId });
  }

  /**
   * 注销项目
   */
  async unregisterProject(projectId: string): Promise<void> {
    await this.stopProject(projectId);
    this.projects.delete(projectId);
    this.emit('project:unregistered', { projectId });
  }

  /**
   * 获取项目信息
   */
  getProjectInfo(projectId: string): ProjectInfo | null {
    const project = this.projects.get(projectId);
    if (!project) return null;

    // 更新访问时间
    project.lastAccessedAt = Date.now();

    return {
      projectId,
      projectPath: project.config.projectPath,
      name: project.config.name ?? projectId,
      previewUrl: project.previewUrl,
      status: project.status,
    };
  }

  /**
   * 获取所有项目
   */
  getAllProjects(): ProjectInfo[] {
    return Array.from(this.projects.keys())
      .map(id => this.getProjectInfo(id)!)
      .filter(Boolean);
  }

  /**
   * 获取运行中的项目
   */
  getRunningProjects(): ProjectInfo[] {
    return this.getAllProjects().filter(p => p.status === 'running');
  }

  /**
   * 检查项目是否存在
   */
  hasProject(projectId: string): boolean {
    return this.projects.has(projectId);
  }

  /**
   * 获取项目的 Vite Server
   */
  getViteServer(projectId: string): ProjectServer | undefined {
    return this.viteManager.getServer(projectId);
  }

  /**
   * 访问项目 (更新访问时间)
   */
  touchProject(projectId: string): void {
    const project = this.projects.get(projectId);
    if (project) {
      project.lastAccessedAt = Date.now();
    }
  }

  /**
   * 启动空闲清理
   */
  startIdleCleanup(checkInterval: number = 60000): void {
    if (this.idleCheckInterval) return;

    this.idleCheckInterval = setInterval(() => {
      this.cleanupIdleProjects();
    }, checkInterval);
  }

  /**
   * 停止空闲清理
   */
  stopIdleCleanup(): void {
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
  }

  /**
   * 清理空闲项目
   */
  async cleanupIdleProjects(): Promise<string[]> {
    const now = Date.now();
    const cleanedProjects: string[] = [];

    for (const [projectId, project] of this.projects) {
      const idleTime = now - project.lastAccessedAt;

      if (idleTime > this.idleTimeout && project.status === 'running') {
        console.log(`[ProjectManager] Stopping idle project ${projectId}`);
        await this.stopProject(projectId);
        cleanedProjects.push(projectId);
      }
    }

    if (cleanedProjects.length > 0) {
      this.emit('projects:cleaned', { projectIds: cleanedProjects });
    }

    return cleanedProjects;
  }

  /**
   * 关闭所有项目
   */
  async shutdown(): Promise<void> {
    this.stopIdleCleanup();

    const projectIds = Array.from(this.projects.keys());
    await Promise.all(projectIds.map(id => this.stopProject(id)));

    this.projects.clear();
    console.log('[ProjectManager] All projects shut down');
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    total: number;
    running: number;
    stopped: number;
    error: number;
  } {
    let running = 0;
    let stopped = 0;
    let error = 0;

    for (const project of this.projects.values()) {
      switch (project.status) {
        case 'running':
          running++;
          break;
        case 'stopped':
          stopped++;
          break;
        case 'error':
          error++;
          break;
      }
    }

    return {
      total: this.projects.size,
      running,
      stopped,
      error,
    };
  }
}

// 导出单例
export const projectManager = new ProjectManager();
