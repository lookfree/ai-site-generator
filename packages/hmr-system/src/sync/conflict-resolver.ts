/**
 * 冲突解决器
 * 处理文件变更冲突
 */

import { EventEmitter } from 'events';
import type { FileConflict, ConflictResolution } from '../types';

export interface ConflictResolverOptions {
  /** 默认解决策略 */
  defaultResolution?: ConflictResolution;
  /** 冲突过期时间 (ms) */
  conflictExpiry?: number;
}

export interface ResolvedConflict {
  /** 冲突信息 */
  conflict: FileConflict;
  /** 解决策略 */
  resolution: ConflictResolution;
  /** 解决后的内容 */
  resolvedContent: string;
  /** 解决时间 */
  resolvedAt: number;
}

/**
 * 冲突解决器
 */
export class ConflictResolver extends EventEmitter {
  private conflicts = new Map<string, FileConflict>();
  private resolvedConflicts: ResolvedConflict[] = [];
  private options: Required<ConflictResolverOptions>;
  private userResolver: ((conflict: FileConflict) => Promise<ConflictResolution>) | null = null;

  constructor(options: ConflictResolverOptions = {}) {
    super();
    this.options = {
      defaultResolution: options.defaultResolution ?? 'keep-local',
      conflictExpiry: options.conflictExpiry ?? 300000, // 5 分钟
    };
  }

  /**
   * 设置用户冲突解决器
   */
  setUserResolver(
    resolver: (conflict: FileConflict) => Promise<ConflictResolution>
  ): void {
    this.userResolver = resolver;
  }

  /**
   * 检测冲突
   */
  detectConflict(
    filePath: string,
    localContent: string,
    remoteContent: string,
    baseContent?: string
  ): boolean {
    // 如果内容相同，没有冲突
    if (localContent === remoteContent) {
      return false;
    }

    // 如果有基准内容，检查是否双方都有修改
    if (baseContent) {
      const localChanged = localContent !== baseContent;
      const remoteChanged = remoteContent !== baseContent;

      // 只有双方都有修改才是真正的冲突
      if (!localChanged || !remoteChanged) {
        return false;
      }
    }

    // 记录冲突
    const conflict: FileConflict = {
      filePath,
      localContent,
      remoteContent,
      baseContent,
      detectedAt: Date.now(),
    };

    this.conflicts.set(filePath, conflict);
    this.emit('conflict-detected', conflict);

    return true;
  }

  /**
   * 解决冲突
   */
  async resolveConflict(
    filePath: string,
    resolution?: ConflictResolution
  ): Promise<string | null> {
    const conflict = this.conflicts.get(filePath);
    if (!conflict) return null;

    // 确定解决策略
    let finalResolution = resolution;

    if (!finalResolution) {
      if (this.userResolver) {
        // 询问用户
        finalResolution = await this.userResolver(conflict);
      } else {
        // 使用默认策略
        finalResolution = this.options.defaultResolution;
      }
    }

    // 应用解决策略
    const resolvedContent = this.applyResolution(conflict, finalResolution);

    // 记录解决结果
    const resolved: ResolvedConflict = {
      conflict,
      resolution: finalResolution,
      resolvedContent,
      resolvedAt: Date.now(),
    };

    this.resolvedConflicts.push(resolved);
    this.conflicts.delete(filePath);

    this.emit('conflict-resolved', resolved);

    return resolvedContent;
  }

  /**
   * 应用解决策略
   */
  private applyResolution(
    conflict: FileConflict,
    resolution: ConflictResolution
  ): string {
    switch (resolution) {
      case 'keep-local':
        return conflict.localContent;

      case 'keep-remote':
        return conflict.remoteContent;

      case 'merge':
        return this.autoMerge(conflict);

      case 'manual':
        // 返回带有冲突标记的内容
        return this.createConflictMarkers(conflict);

      default:
        return conflict.localContent;
    }
  }

  /**
   * 自动合并
   * 简单的行级合并策略
   */
  private autoMerge(conflict: FileConflict): string {
    const localLines = conflict.localContent.split('\n');
    const remoteLines = conflict.remoteContent.split('\n');
    const baseLines = conflict.baseContent?.split('\n') || [];

    // 如果没有基准，使用简单的合并策略
    if (baseLines.length === 0) {
      // 取较长的版本作为基础，然后尝试合并差异
      return localLines.length >= remoteLines.length
        ? conflict.localContent
        : conflict.remoteContent;
    }

    // 三方合并
    const result: string[] = [];
    const maxLen = Math.max(localLines.length, remoteLines.length, baseLines.length);

    for (let i = 0; i < maxLen; i++) {
      const baseLine = baseLines[i] || '';
      const localLine = localLines[i] || '';
      const remoteLine = remoteLines[i] || '';

      if (localLine === remoteLine) {
        // 两边相同
        result.push(localLine);
      } else if (localLine === baseLine) {
        // 本地没变，远程有变
        result.push(remoteLine);
      } else if (remoteLine === baseLine) {
        // 远程没变，本地有变
        result.push(localLine);
      } else {
        // 两边都有变化，保留本地（或添加冲突标记）
        result.push(localLine);
      }
    }

    return result.join('\n');
  }

  /**
   * 创建冲突标记
   */
  private createConflictMarkers(conflict: FileConflict): string {
    return [
      '<<<<<<< LOCAL',
      conflict.localContent,
      '=======',
      conflict.remoteContent,
      '>>>>>>> REMOTE',
    ].join('\n');
  }

  /**
   * 获取当前冲突
   */
  getConflict(filePath: string): FileConflict | undefined {
    return this.conflicts.get(filePath);
  }

  /**
   * 获取所有冲突
   */
  getAllConflicts(): FileConflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * 检查是否有冲突
   */
  hasConflict(filePath: string): boolean {
    return this.conflicts.has(filePath);
  }

  /**
   * 获取冲突数量
   */
  getConflictCount(): number {
    return this.conflicts.size;
  }

  /**
   * 清除特定冲突
   */
  clearConflict(filePath: string): void {
    this.conflicts.delete(filePath);
  }

  /**
   * 清除所有冲突
   */
  clearAllConflicts(): void {
    this.conflicts.clear();
  }

  /**
   * 获取解决历史
   */
  getResolvedHistory(): ResolvedConflict[] {
    return [...this.resolvedConflicts];
  }

  /**
   * 清理过期冲突
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [filePath, conflict] of this.conflicts) {
      if (now - conflict.detectedAt > this.options.conflictExpiry) {
        this.conflicts.delete(filePath);
        cleaned++;
        this.emit('conflict-expired', { filePath });
      }
    }

    return cleaned;
  }

  /**
   * 清理解决历史
   */
  clearResolvedHistory(): void {
    this.resolvedConflicts = [];
  }
}

// 导出单例
export const conflictResolver = new ConflictResolver();
