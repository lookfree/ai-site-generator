// 项目路由
import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne } from '../db/postgres';
import { generateWithKimi } from '../services/kimi';
import { updateProjectFiles, updateProjectFile, getProjectPreviewUrl } from '../services/flyio';
import * as path from 'path';

const router = Router();

// 获取所有项目
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT * FROM projects ORDER BY created_at DESC'
    );
    res.json({ projects: result.rows });
  } catch (error) {
    console.error('[API] Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// 获取单个项目
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const project = await queryOne(
      'SELECT * FROM projects WHERE id = $1',
      [req.params.id]
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ project });
  } catch (error) {
    console.error('[API] Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// 获取项目状态
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const project = await queryOne(
      'SELECT id, status, preview_url, progress_message, progress_percent FROM projects WHERE id = $1',
      [req.params.id]
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    console.error('[API] Error fetching project status:', error);
    res.status(500).json({ error: 'Failed to fetch project status' });
  }
});

// 更新项目进度的辅助函数
async function updateProgress(projectId: string, status: string, message: string, percent: number) {
  await query(
    `UPDATE projects SET status = $1, progress_message = $2, progress_percent = $3 WHERE id = $4`,
    [status, message, percent, projectId]
  );
  console.log(`[Progress] ${projectId}: ${message} (${percent}%)`);
}

// 生成项目
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { description, name } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    // 创建项目记录
    const projectId = uuidv4();
    const projectName = name || `Project ${Date.now()}`;
    const flyAppName = process.env.FLY_APP_NAME || 'ai-site-preview';
    const previewUrl = getProjectPreviewUrl(projectId);

    await query(
      `INSERT INTO projects (id, name, description, status, progress_message, progress_percent, fly_app_name, preview_url)
       VALUES ($1, $2, $3, 'generating', '正在初始化项目...', 5, $4, $5)`,
      [projectId, projectName, description, flyAppName, previewUrl]
    );

    // 立即返回项目 ID
    res.json({
      projectId,
      status: 'generating',
      message: 'Project generation started',
    });

    // 异步生成代码
    (async () => {
      try {
        const projectPath = path.join(
          process.cwd(),
          '../generated',
          projectId
        );

        // 阶段 1: 分析需求
        await updateProgress(projectId, 'generating', '🔍 正在分析需求...', 10);

        // 阶段 2: 调用 Kimi K2 API 生成 (带进度回调)
        await updateProgress(projectId, 'generating', '🤖 Kimi K2 正在生成代码...', 20);

        const result = await generateWithKimi(description, projectPath, async (message, percent, todos) => {
          // 实时更新进度到数据库
          await updateProgress(projectId, 'generating', message, percent);
          if (todos && todos.length > 0) {
            console.log(`[Progress] Todos:`, todos);
          }
        });

        if (result.success && result.files.length > 0) {
          // 阶段 3: 保存文件
          await updateProgress(projectId, 'generating', `📁 正在保存 ${result.files.length} 个文件...`, 60);

          for (const file of result.files) {
            await query(
              `INSERT INTO project_files (project_id, file_path, content)
               VALUES ($1, $2, $3)`,
              [projectId, file.path, file.content]
            );
          }

          // 阶段 4: 部署到 Fly.io
          await updateProgress(projectId, 'deploying', '🚀 正在部署到 Fly.io...', 80);

          await updateProjectFiles(projectId, {
            updates: result.files.map((f) => ({
              path: f.path,
              content: f.content,
            })),
          });

          // 阶段 5: 完成
          await updateProgress(projectId, 'deployed', '✅ 部署完成！', 100);
          console.log(`[API] Project ${projectId} deployed successfully`);
        } else {
          // 更新状态为失败
          await updateProgress(projectId, 'failed', `❌ 生成失败: ${result.error || '未知错误'}`, 0);
          console.error(`[API] Project ${projectId} generation failed:`, result.error);
        }
      } catch (error) {
        console.error(`[API] Project ${projectId} generation error:`, error);
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        await updateProgress(projectId, 'failed', `❌ 发生错误: ${errorMessage}`, 0);
      }
    })();
  } catch (error) {
    console.error('[API] Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// 更新项目文件（同时保存到数据库和 Fly.io）
router.post('/:id/update-file', async (req: Request, res: Response) => {
  try {
    const { path: filePath, content } = req.body;
    const projectId = req.params.id;

    if (!filePath || content === undefined) {
      return res.status(400).json({ error: 'Path and content are required' });
    }

    // 检查项目是否存在
    const project = await queryOne(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 1. 更新数据库中的文件（持久化）
    const existingFile = await queryOne(
      'SELECT * FROM project_files WHERE project_id = $1 AND file_path = $2',
      [projectId, filePath]
    );

    if (existingFile) {
      await query(
        `UPDATE project_files SET content = $1, updated_at = NOW() WHERE project_id = $2 AND file_path = $3`,
        [content, projectId, filePath]
      );
    } else {
      await query(
        `INSERT INTO project_files (project_id, file_path, content) VALUES ($1, $2, $3)`,
        [projectId, filePath, content]
      );
    }

    // 2. 同步到 Fly.io（热更新）
    try {
      await updateProjectFile(projectId, { path: filePath, content });
      console.log(`[API] File synced to Fly.io: ${projectId}/${filePath}`);
    } catch (flyError) {
      console.error('[API] Failed to sync to Fly.io:', flyError);
      // Fly.io 同步失败不影响保存成功
    }

    console.log(`[API] File updated: ${filePath} for project ${projectId}`);
    res.json({ success: true, path: filePath });
  } catch (error) {
    console.error('[API] Error updating file:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// 获取项目文件
router.get('/:id/files', async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT file_path, content, updated_at FROM project_files WHERE project_id = $1',
      [req.params.id]
    );
    res.json({ files: result.rows });
  } catch (error) {
    console.error('[API] Error fetching project files:', error);
    res.status(500).json({ error: 'Failed to fetch project files' });
  }
});

// 同步项目文件到 Fly.io（从数据库恢复）
router.post('/:id/sync-to-fly', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;

    // 检查项目是否存在
    const project = await queryOne(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 获取所有项目文件
    const filesResult = await query(
      'SELECT file_path, content FROM project_files WHERE project_id = $1',
      [projectId]
    );

    if (filesResult.rows.length === 0) {
      return res.status(404).json({ error: 'No files found for this project' });
    }

    // 同步所有文件到 Fly.io
    await updateProjectFiles(projectId, {
      updates: filesResult.rows.map((f: { file_path: string; content: string }) => ({
        path: f.file_path,
        content: f.content,
      })),
    });

    console.log(`[API] Synced ${filesResult.rows.length} files to Fly.io for project ${projectId}`);
    res.json({
      success: true,
      message: `Synced ${filesResult.rows.length} files to Fly.io`,
      files: filesResult.rows.map((f: { file_path: string }) => f.file_path)
    });
  } catch (error) {
    console.error('[API] Error syncing to Fly.io:', error);
    res.status(500).json({ error: 'Failed to sync to Fly.io' });
  }
});

// 删除项目
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;

    // 检查项目是否存在
    const project = await queryOne(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // 删除项目文件
    await query('DELETE FROM project_files WHERE project_id = $1', [projectId]);

    // 删除项目
    await query('DELETE FROM projects WHERE id = $1', [projectId]);

    console.log(`[API] Project ${projectId} deleted`);
    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (error) {
    console.error('[API] Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

export default router;
