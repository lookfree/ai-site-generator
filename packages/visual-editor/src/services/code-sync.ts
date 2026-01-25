/**
 * 代码同步服务
 * 处理 AST 和源码的同步更新
 */

import type { EditAction } from '../types';

interface CodeSyncOptions {
  /** AST 处理器 */
  astProcessor?: ASTProcessor;
  /** 文件保存回调 */
  onSave?: (path: string, content: string) => Promise<void>;
}

interface ASTProcessor {
  parseFile: (code: string, filename: string) => Promise<{ ast: unknown }>;
  generateCode: (ast: unknown) => Promise<{ code: string }>;
  updateAttribute: (ast: unknown, jsxId: string, name: string, value: unknown) => { success: boolean; ast: unknown };
  updateStyle: (ast: unknown, jsxId: string, payload: unknown) => { success: boolean; ast: unknown };
  updateText: (ast: unknown, jsxId: string, text: string) => { success: boolean; ast: unknown };
}

/**
 * 代码同步服务
 */
export class CodeSyncService {
  private astProcessor: ASTProcessor | null = null;
  private onSave: ((path: string, content: string) => Promise<void>) | null = null;
  private fileCache: Map<string, { code: string; ast: unknown }> = new Map();
  private pendingChanges: Map<string, EditAction[]> = new Map();
  private syncInProgress: boolean = false;

  constructor(options: CodeSyncOptions = {}) {
    this.astProcessor = options.astProcessor || null;
    this.onSave = options.onSave || null;
  }

  /**
   * 设置 AST 处理器
   */
  setASTProcessor(processor: ASTProcessor): void {
    this.astProcessor = processor;
  }

  /**
   * 设置保存回调
   */
  setOnSave(callback: (path: string, content: string) => Promise<void>): void {
    this.onSave = callback;
  }

  /**
   * 加载文件
   */
  async loadFile(path: string, code: string): Promise<void> {
    if (!this.astProcessor) {
      throw new Error('AST processor not set');
    }

    const filename = path.split('/').pop() || 'file.tsx';
    const { ast } = await this.astProcessor.parseFile(code, filename);
    this.fileCache.set(path, { code, ast });
  }

  /**
   * 应用编辑动作
   */
  async applyAction(action: EditAction): Promise<{ code: string } | null> {
    if (!this.astProcessor || !action.filePath) {
      return null;
    }

    const cached = this.fileCache.get(action.filePath);
    if (!cached) {
      console.warn(`[CodeSync] File not loaded: ${action.filePath}`);
      return null;
    }

    let result: { success: boolean; ast: unknown };

    switch (action.type) {
      case 'className':
        result = this.astProcessor.updateStyle(
          cached.ast,
          action.jsxId,
          { className: action.newValue }
        );
        break;

      case 'text':
        result = this.astProcessor.updateText(
          cached.ast,
          action.jsxId,
          action.newValue as string
        );
        break;

      case 'attribute':
        const attr = action.newValue as { name: string; value: unknown };
        result = this.astProcessor.updateAttribute(
          cached.ast,
          action.jsxId,
          attr.name,
          attr.value
        );
        break;

      case 'style':
        result = this.astProcessor.updateStyle(
          cached.ast,
          action.jsxId,
          { style: action.newValue }
        );
        break;

      default:
        return null;
    }

    if (!result.success) {
      console.error(`[CodeSync] Failed to apply action:`, action);
      return null;
    }

    // 生成新代码
    const { code } = await this.astProcessor.generateCode(result.ast);

    // 更新缓存
    this.fileCache.set(action.filePath, { code, ast: result.ast });

    return { code };
  }

  /**
   * 添加待定更改
   */
  addPendingChange(action: EditAction): void {
    if (!action.filePath) return;

    if (!this.pendingChanges.has(action.filePath)) {
      this.pendingChanges.set(action.filePath, []);
    }

    this.pendingChanges.get(action.filePath)!.push(action);
  }

  /**
   * 同步所有待定更改
   */
  async syncPendingChanges(): Promise<void> {
    if (this.syncInProgress || this.pendingChanges.size === 0) {
      return;
    }

    this.syncInProgress = true;

    try {
      for (const [path, actions] of this.pendingChanges) {
        for (const action of actions) {
          await this.applyAction(action);
        }

        // 保存文件
        const cached = this.fileCache.get(path);
        if (cached && this.onSave) {
          await this.onSave(path, cached.code);
        }
      }

      this.pendingChanges.clear();
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * 获取文件当前代码
   */
  getFileCode(path: string): string | null {
    return this.fileCache.get(path)?.code || null;
  }

  /**
   * 获取文件 AST
   */
  getFileAST(path: string): unknown | null {
    return this.fileCache.get(path)?.ast || null;
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.fileCache.clear();
    this.pendingChanges.clear();
  }

  /**
   * 导出所有文件
   */
  exportFiles(): Map<string, string> {
    const result = new Map<string, string>();
    for (const [path, cached] of this.fileCache) {
      result.set(path, cached.code);
    }
    return result;
  }
}

// 导出单例实例
export const codeSyncService = new CodeSyncService();
