// Fly.io 热更新服务器 - 使用 Volume 持久化存储（支持多项目）
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// 使用 Fly.io Volume 挂载的目录存储文件
const DATA_DIR = process.env.DATA_DIR || '/data/sites';

// 安全检查：验证项目 ID 格式（UUID）
function isValidProjectId(projectId: string): boolean {
  return /^[a-f0-9-]{36}$/i.test(projectId);
}

// 获取项目目录路径
function getProjectDir(projectId: string): string {
  if (!isValidProjectId(projectId)) {
    throw new Error('Invalid project ID');
  }
  return path.join(DATA_DIR, projectId);
}

// 确保项目目录存在
function ensureProjectDir(projectId: string): string {
  const projectDir = getProjectDir(projectId);
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
    console.log(`[STORAGE] Created project directory: ${projectId}`);
  }
  return projectDir;
}

// 获取文件的完整路径
function getFilePath(projectId: string, filename: string): string {
  const projectDir = getProjectDir(projectId);
  // 安全检查：防止路径遍历攻击
  const safeName = path.normalize(filename).replace(/^(\.\.(\/|\\|$))+/, '');
  return path.join(projectDir, safeName);
}

// 读取项目文件
function readProjectFile(projectId: string, filename: string): string | null {
  try {
    const filePath = getFilePath(projectId, filename);
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (e) {
    console.error(`[STORAGE] Error reading ${projectId}/${filename}:`, (e as Error).message);
  }
  return null;
}

// 写入项目文件
function writeProjectFile(projectId: string, filename: string, content: string): void {
  ensureProjectDir(projectId);
  const filePath = getFilePath(projectId, filename);

  // 确保子目录存在
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`[STORAGE] Written: ${projectId}/${filename} (${content.length} bytes)`);
}

interface FileInfo {
  path: string;
  size: number;
}

// 列出项目的所有文件
function listProjectFiles(projectId: string): FileInfo[] {
  try {
    const projectDir = getProjectDir(projectId);
    if (!fs.existsSync(projectDir)) {
      return [];
    }
    return fs.readdirSync(projectDir).map(filename => {
      const filePath = path.join(projectDir, filename);
      const stats = fs.statSync(filePath);
      return { path: filename, size: stats.size };
    });
  } catch (e) {
    return [];
  }
}

// 删除项目文件
function deleteProjectFile(projectId: string, filename: string): boolean {
  try {
    const filePath = getFilePath(projectId, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (e) {
    console.error(`[STORAGE] Error deleting ${projectId}/${filename}:`, (e as Error).message);
  }
  return false;
}

// 列出所有项目
function listProjects(): string[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    return [];
  }
  return fs.readdirSync(DATA_DIR).filter(name => {
    const fullPath = path.join(DATA_DIR, name);
    return fs.statSync(fullPath).isDirectory() && isValidProjectId(name);
  });
}

// 删除整个项目
function deleteProject(projectId: string): boolean {
  try {
    const projectDir = getProjectDir(projectId);
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true });
      console.log(`[STORAGE] Deleted project: ${projectId}`);
      return true;
    }
  } catch (e) {
    console.error(`[STORAGE] Error deleting project ${projectId}:`, (e as Error).message);
  }
  return false;
}

console.log(`[STORAGE] Data directory: ${DATA_DIR}`);
console.log(`[STORAGE] Projects: ${listProjects().length}`);

// ==================== API 路由 ====================

// API: 健康检查
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    storage: 'volume',
    dataDir: DATA_DIR,
    projectCount: listProjects().length
  });
});

// API: 列出所有项目
app.get('/api/projects', (req: Request, res: Response) => {
  const projects = listProjects();
  res.json({ projects });
});

// API: 获取项目文件列表
app.get('/api/projects/:projectId/files', (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const files = listProjectFiles(projectId);
    res.json({ projectId, files });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// API: 更新项目的单个文件（热更新！）
app.post('/api/projects/:projectId/update-file', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { path: filePath, content } = req.body;

  if (!filePath || content === undefined) {
    return res.status(400).json({ error: 'Missing path or content' });
  }

  try {
    writeProjectFile(projectId, filePath, content);
    console.log(`[HOT UPDATE] ${projectId}/${filePath} (${content.length} bytes)`);
    res.json({ success: true, projectId, path: filePath, size: content.length });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

interface FileUpdate {
  path: string;
  content: string;
}

// API: 批量更新项目文件
app.post('/api/projects/:projectId/update-files', (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { updates } = req.body as { updates: FileUpdate[] };

  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({ error: 'Invalid updates array' });
  }

  try {
    updates.forEach(({ path: filePath, content }) => {
      writeProjectFile(projectId, filePath, content);
    });
    console.log(`[HOT UPDATE] ${projectId}: ${updates.length} files updated`);
    res.json({ success: true, projectId, count: updates.length });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// API: 获取项目的文件内容
app.get('/api/projects/:projectId/file/:filePath(*)', (req: Request, res: Response) => {
  const { projectId, filePath } = req.params;

  try {
    const content = readProjectFile(projectId, filePath);
    if (content !== null) {
      res.json({ projectId, path: filePath, content });
    } else {
      res.status(404).json({ error: 'File not found', projectId, path: filePath });
    }
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// API: 删除项目的文件
app.delete('/api/projects/:projectId/file/:filePath(*)', (req: Request, res: Response) => {
  const { projectId, filePath } = req.params;

  try {
    if (deleteProjectFile(projectId, filePath)) {
      console.log(`[DELETE] ${projectId}/${filePath}`);
      res.json({ success: true, projectId, path: filePath });
    } else {
      res.status(404).json({ error: 'File not found', projectId, path: filePath });
    }
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// API: 删除整个项目
app.delete('/api/projects/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;

  try {
    if (deleteProject(projectId)) {
      res.json({ success: true, projectId });
    } else {
      res.status(404).json({ error: 'Project not found', projectId });
    }
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});

// ==================== 静态文件服务（按项目） ====================

// 设置禁用缓存的响应头
function setNoCacheHeaders(res: Response): void {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

// 根据文件名设置 Content-Type
function setContentType(res: Response, filename: string): void {
  if (filename.endsWith('.css')) {
    res.type('css');
  } else if (filename.endsWith('.js')) {
    res.type('javascript');
  } else if (filename.endsWith('.html')) {
    res.type('html');
  } else if (filename.endsWith('.json')) {
    res.type('json');
  } else if (filename.endsWith('.svg')) {
    res.type('image/svg+xml');
  } else if (filename.endsWith('.png')) {
    res.type('image/png');
  } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
    res.type('image/jpeg');
  }
}

// 根路由 - 显示欢迎页面
app.get('/', (req: Request, res: Response) => {
  setNoCacheHeaders(res);
  res.type('html').send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Site Generator - Preview Server</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { color: #2d3748; margin-bottom: 16px; }
        p { color: #718096; }
        code { background: #f1f5f9; padding: 2px 8px; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 AI Site Generator</h1>
        <p>Preview Server with Volume Storage (Bun)</p>
        <p>Access projects at: <code>/p/{projectId}/</code></p>
        <p>Projects: ${listProjects().length}</p>
    </div>
</body>
</html>`);
});

// 项目预览路由: /p/:projectId - 重定向到带斜杠的URL
app.get('/p/:projectId', (req: Request, res: Response, next: NextFunction) => {
  const { projectId } = req.params;

  // 如果路径不以斜杠结尾，重定向到带斜杠的URL
  // 这样浏览器才能正确解析相对路径（style.css, script.js等）
  if (!req.path.endsWith('/')) {
    return res.redirect(301, `/p/${projectId}/`);
  }
  next();
});

// 项目预览路由: /p/:projectId/ - 返回 index.html
app.get('/p/:projectId/', (req: Request, res: Response) => {
  const { projectId } = req.params;

  try {
    const content = readProjectFile(projectId, 'index.html');
    if (content) {
      setNoCacheHeaders(res);
      res.type('html').send(content);
    } else {
      res.status(404).send(`Project not found or no index.html: ${projectId}`);
    }
  } catch (e) {
    res.status(400).send((e as Error).message);
  }
});

// 项目静态文件路由: /p/:projectId/:filename
app.get('/p/:projectId/:filename(*)', (req: Request, res: Response) => {
  const { projectId, filename } = req.params;

  try {
    const content = readProjectFile(projectId, filename);
    if (content !== null) {
      setNoCacheHeaders(res);
      setContentType(res, filename);
      res.send(content);
    } else {
      res.status(404).send('Not found');
    }
  } catch (e) {
    res.status(400).send((e as Error).message);
  }
});

// ==================== 启动服务器 ====================

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║      AI Site Generator - Fly Server (Bun)              ║
╠════════════════════════════════════════════════════════╣
║  Server:    http://0.0.0.0:${PORT}                         ║
║  Storage:   ${DATA_DIR.padEnd(40)}║
║  Projects:  ${String(listProjects().length).padEnd(40)}║
╚════════════════════════════════════════════════════════╝
  `);
});
