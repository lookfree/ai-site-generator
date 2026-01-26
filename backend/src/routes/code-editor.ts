/**
 * 代码编辑器 API 路由
 * 提供 Lovable 风格的可视化编辑能力
 *
 * API 设计:
 * - GET  /api/code-editor/:projectId/components - 获取组件树
 * - GET  /api/code-editor/:projectId/component/:componentId - 获取单个组件详情
 * - POST /api/code-editor/:projectId/update-class - 更新 className
 * - POST /api/code-editor/:projectId/update-text - 更新文本内容
 * - POST /api/code-editor/:projectId/update-props - 更新组件属性
 * - POST /api/code-editor/:projectId/update-style - 更新内联样式
 */

import { Router, Request, Response } from 'express';
import { query, queryOne } from '../db/postgres';
import { editCode, editCodeByText, editCodeByPosition, findNodes, findNodeById } from '../services/ast';
import { updateProjectFile } from '../services/flyio';

const router = Router();

// 默认编辑文件
const DEFAULT_FILE = 'src/App.tsx';

/**
 * 组件树节点类型
 */
interface ComponentNode {
  id: string;
  name: string;
  className: string;
  textContent?: string;
  location?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  attributes: Record<string, unknown>;
  children: ComponentNode[];
}

/**
 * 将扁平的 JSX 节点列表转换为组件树
 * 注意: 当前实现返回扁平列表，完整的树结构需要更复杂的 AST 分析
 */
function buildComponentTree(nodes: ReturnType<typeof findNodes>): ComponentNode[] {
  return nodes.map(node => ({
    id: node.jsxId,
    name: node.element,
    className: (node.attributes.className as string) || '',
    textContent: node.textContent,
    location: node.location,
    attributes: node.attributes,
    children: [], // TODO: 实现嵌套结构解析
  }));
}

/**
 * GET /api/code-editor/:projectId/components
 * 获取项目的组件树
 */
router.get('/:projectId/components', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const filePath = (req.query.file as string) || DEFAULT_FILE;

    // 从数据库获取文件内容
    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 解析组件树
    const nodes = findNodes(file.content, filePath);
    const components = buildComponentTree(nodes);

    res.json({
      projectId,
      filePath,
      components,
      count: components.length,
    });
  } catch (error) {
    console.error('[API] Error getting components:', error);
    res.status(500).json({ error: 'Failed to parse components' });
  }
});

/**
 * GET /api/code-editor/:projectId/component/:componentId
 * 获取单个组件详情
 */
router.get('/:projectId/component/:componentId', async (req: Request, res: Response) => {
  try {
    const { projectId, componentId } = req.params;
    const filePath = (req.query.file as string) || DEFAULT_FILE;

    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const node = findNodeById(file.content, filePath, componentId);

    if (!node) {
      return res.status(404).json({ error: 'Component not found' });
    }

    res.json({
      projectId,
      filePath,
      component: {
        id: node.jsxId,
        name: node.element,
        className: (node.attributes.className as string) || '',
        textContent: node.textContent,
        location: node.location,
        attributes: node.attributes,
        childCount: node.childCount,
      },
    });
  } catch (error) {
    console.error('[API] Error getting component:', error);
    res.status(500).json({ error: 'Failed to get component' });
  }
});

/**
 * POST /api/code-editor/:projectId/update-class
 * 更新组件的 className
 * Body: { componentId: string, className: string }
 */
router.post('/:projectId/update-class', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const { componentId, className, addClasses, removeClasses } = req.body;
    const filePath = req.body.file || DEFAULT_FILE;

    if (!componentId) {
      return res.status(400).json({ error: 'componentId is required' });
    }

    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 构建样式操作
    const payload: { className?: string; addClasses?: string[]; removeClasses?: string[] } = {};
    if (className !== undefined) {
      payload.className = className;
    }
    if (addClasses) {
      payload.addClasses = addClasses;
    }
    if (removeClasses) {
      payload.removeClasses = removeClasses;
    }

    const result = await editCode(file.content, filePath, {
      jsxId: componentId,
      operation: { type: 'style', payload },
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Update failed' });
    }

    // 保存到数据库
    await query(
      'UPDATE project_files SET content = $1, updated_at = NOW() WHERE project_id = $2 AND file_path = $3',
      [result.code, projectId, filePath]
    );

    // 同步到 Fly.io (触发 HMR)
    let syncWarning: string | undefined;
    try {
      await updateProjectFile(projectId, { path: filePath, content: result.code! });
      console.log(`[CodeEditor] Class updated and synced: ${projectId}/${componentId}`);
    } catch (flyError) {
      console.warn('[CodeEditor] Fly.io sync failed:', flyError);
      syncWarning = 'Changes saved to database but live preview sync failed. Try refreshing.';
    }

    res.json({
      success: true,
      componentId,
      changes: result.changes,
      warning: syncWarning,
    });
  } catch (error) {
    console.error('[API] Error updating class:', error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

/**
 * POST /api/code-editor/:projectId/update-text
 * 更新组件的文本内容
 * Body: {
 *   componentId: string,
 *   text: string,
 *   originalText?: string,   // For text-based matching
 *   tagName?: string,
 *   jsxFile?: string,        // Source file path from data-jsx-file
 *   jsxLine?: number,        // Source line from data-jsx-line
 *   jsxCol?: number,         // Source column from data-jsx-col
 * }
 *
 * Matching priority:
 * 1. Position-based (jsxLine + jsxCol) - Most accurate
 * 2. Text-based (originalText) - Fallback when position unavailable
 * 3. ID-based (componentId) - Legacy support
 */
router.post('/:projectId/update-text', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const { componentId, text, originalText, tagName, jsxFile, jsxLine, jsxCol } = req.body;
    // Use jsxFile if provided, otherwise use request file or default
    const filePath = jsxFile || req.body.file || DEFAULT_FILE;

    if (text === undefined) {
      return res.status(400).json({ error: 'text is required' });
    }

    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    let result;

    // Priority 1: Position-based matching (most accurate)
    // Use typeof checks because column 0 is valid but falsy
    if (typeof jsxLine === 'number' && typeof jsxCol === 'number') {
      console.log(`[CodeEditor] Using position-based matching: ${filePath}:${jsxLine}:${jsxCol}`);
      result = await editCodeByPosition(file.content, filePath, jsxLine, jsxCol, {
        type: 'text',
        payload: { text },
      });
    }
    // Priority 2: Text-based matching
    else if (originalText) {
      console.log(`[CodeEditor] Using text-based matching: "${originalText.slice(0, 30)}..." -> "${text.slice(0, 30)}..."`);
      result = await editCodeByText(file.content, filePath, originalText, text, tagName);
    }
    // Priority 3: ID-based matching (legacy)
    else {
      console.log(`[CodeEditor] Using ID-based matching: ${componentId}`);
      result = await editCode(file.content, filePath, {
        jsxId: componentId,
        operation: { type: 'text', payload: { text } },
      });
    }

    if (!result.success) {
      console.error(`[CodeEditor] Update failed: ${result.error}`);
      return res.status(400).json({ error: result.error || 'Update failed' });
    }

    // 保存到数据库
    await query(
      'UPDATE project_files SET content = $1, updated_at = NOW() WHERE project_id = $2 AND file_path = $3',
      [result.code, projectId, filePath]
    );

    // 同步到 Fly.io (触发 HMR)
    let syncWarning: string | undefined;
    try {
      await updateProjectFile(projectId, { path: filePath, content: result.code! });
      console.log(`[CodeEditor] Text updated and synced: ${projectId}/${componentId}`);
    } catch (flyError) {
      console.warn('[CodeEditor] Fly.io sync failed:', flyError);
      syncWarning = 'Changes saved to database but live preview sync failed. Try refreshing.';
    }

    res.json({
      success: true,
      componentId,
      changes: result.changes,
      warning: syncWarning,
    });
  } catch (error) {
    console.error('[API] Error updating text:', error);
    res.status(500).json({ error: 'Failed to update text' });
  }
});

/**
 * POST /api/code-editor/:projectId/update-props
 * 更新组件的属性
 * Body: { componentId: string, props: Record<string, unknown> }
 */
router.post('/:projectId/update-props', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const { componentId, props } = req.body;
    const filePath = req.body.file || DEFAULT_FILE;

    if (!componentId || !props) {
      return res.status(400).json({ error: 'componentId and props are required' });
    }

    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 逐个更新属性
    let currentCode = file.content;
    const allChanges: unknown[] = [];

    for (const [name, value] of Object.entries(props)) {
      const result = await editCode(currentCode, filePath, {
        jsxId: componentId,
        operation: {
          type: 'attribute',
          payload: { name, value: value as string | boolean | null },
        },
      });

      if (!result.success) {
        return res.status(400).json({
          error: result.error || `Failed to update prop: ${name}`,
        });
      }

      currentCode = result.code!;
      if (result.changes) {
        allChanges.push(...result.changes);
      }
    }

    // 保存到数据库
    await query(
      'UPDATE project_files SET content = $1, updated_at = NOW() WHERE project_id = $2 AND file_path = $3',
      [currentCode, projectId, filePath]
    );

    // 同步到 Fly.io
    let syncWarning: string | undefined;
    try {
      await updateProjectFile(projectId, { path: filePath, content: currentCode });
      console.log(`[CodeEditor] Props updated and synced: ${projectId}/${componentId}`);
    } catch (flyError) {
      console.warn('[CodeEditor] Fly.io sync failed:', flyError);
      syncWarning = 'Changes saved to database but live preview sync failed. Try refreshing.';
    }

    res.json({
      success: true,
      componentId,
      updatedProps: Object.keys(props),
      changes: allChanges,
      warning: syncWarning,
    });
  } catch (error) {
    console.error('[API] Error updating props:', error);
    res.status(500).json({ error: 'Failed to update props' });
  }
});

/**
 * POST /api/code-editor/:projectId/update-style
 * 更新组件的内联样式
 * Body: { componentId: string, style: Record<string, string> }
 */
router.post('/:projectId/update-style', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const { componentId, style } = req.body;
    const filePath = req.body.file || DEFAULT_FILE;

    if (!componentId || !style) {
      return res.status(400).json({ error: 'componentId and style are required' });
    }

    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const result = await editCode(file.content, filePath, {
      jsxId: componentId,
      operation: { type: 'style', payload: { style } },
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Update failed' });
    }

    // 保存到数据库
    await query(
      'UPDATE project_files SET content = $1, updated_at = NOW() WHERE project_id = $2 AND file_path = $3',
      [result.code, projectId, filePath]
    );

    // 同步到 Fly.io
    let syncWarning: string | undefined;
    try {
      await updateProjectFile(projectId, { path: filePath, content: result.code! });
      console.log(`[CodeEditor] Style updated and synced: ${projectId}/${componentId}`);
    } catch (flyError) {
      console.warn('[CodeEditor] Fly.io sync failed:', flyError);
      syncWarning = 'Changes saved to database but live preview sync failed. Try refreshing.';
    }

    res.json({
      success: true,
      componentId,
      changes: result.changes,
      warning: syncWarning,
    });
  } catch (error) {
    console.error('[API] Error updating style:', error);
    res.status(500).json({ error: 'Failed to update style' });
  }
});

/**
 * POST /api/code-editor/:projectId/batch
 * 批量更新多个组件
 * Body: { operations: Array<{ componentId: string, type: string, payload: unknown }> }
 */
router.post('/:projectId/batch', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const { operations } = req.body;
    const filePath = req.body.file || DEFAULT_FILE;

    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({ error: 'operations array is required' });
    }

    const file = await queryOne(
      'SELECT content FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    let currentCode = file.content;
    const results: Array<{ componentId: string; success: boolean; error?: string }> = [];

    for (const op of operations) {
      const { componentId, type, payload } = op;

      let operation;
      switch (type) {
        case 'class':
        case 'style':
          operation = { type: 'style' as const, payload };
          break;
        case 'text':
          operation = { type: 'text' as const, payload: { text: payload.text } };
          break;
        case 'attribute':
          operation = { type: 'attribute' as const, payload };
          break;
        default:
          results.push({ componentId, success: false, error: `Unknown operation type: ${type}` });
          continue;
      }

      const result = await editCode(currentCode, filePath, {
        jsxId: componentId,
        operation,
      });

      if (result.success) {
        currentCode = result.code!;
        results.push({ componentId, success: true });
      } else {
        results.push({ componentId, success: false, error: result.error });
      }
    }

    // 保存到数据库
    await query(
      'UPDATE project_files SET content = $1, updated_at = NOW() WHERE project_id = $2 AND file_path = $3',
      [currentCode, projectId, filePath]
    );

    // 同步到 Fly.io
    let syncWarning: string | undefined;
    try {
      await updateProjectFile(projectId, { path: filePath, content: currentCode });
      console.log(`[CodeEditor] Batch update synced: ${projectId}`);
    } catch (flyError) {
      console.warn('[CodeEditor] Fly.io sync failed:', flyError);
      syncWarning = 'Changes saved to database but live preview sync failed. Try refreshing.';
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: successCount > 0,
      total: operations.length,
      succeeded: successCount,
      failed: operations.length - successCount,
      results,
      warning: syncWarning,
    });
  } catch (error) {
    console.error('[API] Error in batch update:', error);
    res.status(500).json({ error: 'Failed to process batch update' });
  }
});

export default router;
