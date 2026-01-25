/**
 * 代码编辑 API 路由
 * 提供基于 AST 的代码编辑能力
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/postgres';
import { astEditor, editCode, batchEditCode, findNodes, findNodeById } from '../services/ast';
import { updateProjectFile } from '../services/flyio';
import type { AstEditRequest } from '../services/ast';

const router = Router();

/**
 * 获取项目文件内容
 * GET /api/code/:projectId/:filePath
 */
router.get('/:projectId/*', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const filePath = req.params[0]; // 捕获 * 部分

    const file = await queryOne(
      'SELECT content, updated_at FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      projectId,
      filePath,
      content: file.content,
      updatedAt: file.updated_at,
    });
  } catch (error) {
    console.error('[API] Error fetching file:', error);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

/**
 * 获取文件中所有 JSX 节点
 * GET /api/code/:projectId/:filePath/nodes
 */
router.get('/:projectId/*/nodes', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    // 需要从路径中移除 /nodes 后缀
    const fullPath = req.params[0];
    const filePath = fullPath.replace(/\/nodes$/, '');

    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const nodes = findNodes(file.content, filePath);

    res.json({
      projectId,
      filePath,
      nodes,
      count: nodes.length,
    });
  } catch (error) {
    console.error('[API] Error finding nodes:', error);
    res.status(500).json({ error: 'Failed to find nodes' });
  }
});

/**
 * 编辑单个元素
 * POST /api/code/:projectId/edit
 * Body: { filePath: string, jsxId: string, operation: EditOperation }
 */
router.post('/:projectId/edit', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const { filePath, jsxId, operation } = req.body;

    if (!filePath || !jsxId || !operation) {
      return res.status(400).json({
        error: 'Missing required fields: filePath, jsxId, operation',
      });
    }

    // 获取当前文件内容
    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 执行 AST 编辑
    const result = await editCode(file.content, filePath, { jsxId, operation });

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Edit operation failed',
      });
    }

    // 保存到数据库
    await query(
      'UPDATE project_files SET content = $1, updated_at = NOW() WHERE project_id = $2 AND file_path = $3',
      [result.code, projectId, filePath]
    );

    // 同步到 Fly.io（触发 HMR）
    try {
      await updateProjectFile(projectId, { path: filePath, content: result.code! });
      console.log(`[API] Code synced to Fly.io: ${projectId}/${filePath}`);
    } catch (flyError) {
      console.warn('[API] Failed to sync to Fly.io:', flyError);
    }

    res.json({
      success: true,
      projectId,
      filePath,
      code: result.code,
      changes: result.changes,
    });
  } catch (error) {
    console.error('[API] Error editing code:', error);
    res.status(500).json({ error: 'Failed to edit code' });
  }
});

/**
 * 批量编辑多个元素
 * POST /api/code/:projectId/batch-edit
 * Body: { filePath: string, edits: AstEditRequest[] }
 */
router.post('/:projectId/batch-edit', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const { filePath, edits } = req.body;

    if (!filePath || !edits || !Array.isArray(edits)) {
      return res.status(400).json({
        error: 'Missing required fields: filePath, edits (array)',
      });
    }

    // 获取当前文件内容
    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 执行批量 AST 编辑
    const result = await batchEditCode(file.content, filePath, edits);

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Batch edit operation failed',
      });
    }

    // 保存到数据库
    await query(
      'UPDATE project_files SET content = $1, updated_at = NOW() WHERE project_id = $2 AND file_path = $3',
      [result.code, projectId, filePath]
    );

    // 同步到 Fly.io（触发 HMR）
    try {
      await updateProjectFile(projectId, { path: filePath, content: result.code! });
      console.log(`[API] Code synced to Fly.io: ${projectId}/${filePath}`);
    } catch (flyError) {
      console.warn('[API] Failed to sync to Fly.io:', flyError);
    }

    res.json({
      success: true,
      projectId,
      filePath,
      code: result.code,
      changes: result.changes,
      editCount: edits.length,
    });
  } catch (error) {
    console.error('[API] Error batch editing code:', error);
    res.status(500).json({ error: 'Failed to batch edit code' });
  }
});

/**
 * 查找节点信息
 * GET /api/code/:projectId/node/:jsxId
 * Query: filePath
 */
router.get('/:projectId/node/:jsxId', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const jsxId = req.params.jsxId;
    const filePath = req.query.filePath as string;

    if (!filePath) {
      return res.status(400).json({ error: 'Missing filePath query parameter' });
    }

    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const node = findNodeById(file.content, filePath, jsxId);

    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }

    res.json({
      projectId,
      filePath,
      node,
    });
  } catch (error) {
    console.error('[API] Error finding node:', error);
    res.status(500).json({ error: 'Failed to find node' });
  }
});

/**
 * 更新元素样式（便捷接口）
 * POST /api/code/:projectId/style
 * Body: { filePath: string, jsxId: string, className?: string, addClasses?: string[], removeClasses?: string[] }
 */
router.post('/:projectId/style', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const { filePath, jsxId, className, addClasses, removeClasses, style } = req.body;

    if (!filePath || !jsxId) {
      return res.status(400).json({
        error: 'Missing required fields: filePath, jsxId',
      });
    }

    const operation = {
      type: 'style' as const,
      payload: { className, addClasses, removeClasses, style },
    };

    // 复用 edit 接口逻辑
    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const result = await editCode(file.content, filePath, { jsxId, operation });

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Style update failed',
      });
    }

    // 保存到数据库
    await query(
      'UPDATE project_files SET content = $1, updated_at = NOW() WHERE project_id = $2 AND file_path = $3',
      [result.code, projectId, filePath]
    );

    // 同步到 Fly.io
    try {
      await updateProjectFile(projectId, { path: filePath, content: result.code! });
    } catch (flyError) {
      console.warn('[API] Failed to sync to Fly.io:', flyError);
    }

    res.json({
      success: true,
      projectId,
      filePath,
      jsxId,
      code: result.code,
    });
  } catch (error) {
    console.error('[API] Error updating style:', error);
    res.status(500).json({ error: 'Failed to update style' });
  }
});

/**
 * 更新元素文本（便捷接口）
 * POST /api/code/:projectId/text
 * Body: { filePath: string, jsxId: string, text: string }
 */
router.post('/:projectId/text', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const { filePath, jsxId, text } = req.body;

    if (!filePath || !jsxId || text === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: filePath, jsxId, text',
      });
    }

    const operation = {
      type: 'text' as const,
      payload: { text },
    };

    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const result = await editCode(file.content, filePath, { jsxId, operation });

    if (!result.success) {
      return res.status(400).json({
        error: result.error || 'Text update failed',
      });
    }

    // 保存到数据库
    await query(
      'UPDATE project_files SET content = $1, updated_at = NOW() WHERE project_id = $2 AND file_path = $3',
      [result.code, projectId, filePath]
    );

    // 同步到 Fly.io
    try {
      await updateProjectFile(projectId, { path: filePath, content: result.code! });
    } catch (flyError) {
      console.warn('[API] Failed to sync to Fly.io:', flyError);
    }

    res.json({
      success: true,
      projectId,
      filePath,
      jsxId,
      code: result.code,
    });
  } catch (error) {
    console.error('[API] Error updating text:', error);
    res.status(500).json({ error: 'Failed to update text' });
  }
});

export default router;
