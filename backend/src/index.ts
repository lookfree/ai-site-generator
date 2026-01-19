// AI Site Generator - Backend (Bun)
import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/postgres';
import { checkClaudeAvailable } from './services/claude';
import { healthCheck as flyHealthCheck, getPreviewUrl } from './services/flyio';
import projectsRouter from './routes/projects';
import proxyRouter from './routes/proxy';

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// 健康检查
app.get('/api/health', async (req, res) => {
  const claudeAvailable = await checkClaudeAvailable();

  let flyStatus = 'unknown';
  try {
    const flyHealth = await flyHealthCheck();
    flyStatus = flyHealth.status;
  } catch {
    flyStatus = 'unavailable';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      claude: claudeAvailable ? 'available' : 'unavailable',
      flyio: flyStatus,
      database: 'connected',
    },
    previewUrl: getPreviewUrl(),
  });
});

// 路由
app.use('/api/projects', projectsRouter);
app.use('/api/proxy', proxyRouter);

// 错误处理
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 启动服务
async function start() {
  try {
    // 初始化数据库
    console.log('[DB] Initializing database...');
    await initDatabase();

    // 检查 Claude Code
    const claudeAvailable = await checkClaudeAvailable();
    console.log(`[CLAUDE] Claude Code CLI: ${claudeAvailable ? 'Available' : 'Not found'}`);

    // 检查 Fly.io
    try {
      const flyHealth = await flyHealthCheck();
      console.log(`[FLY.IO] Server status: ${flyHealth.status}`);
    } catch (err) {
      console.warn('[FLY.IO] Server not reachable. Please deploy the fly-server first.');
    }

    // 启动 HTTP 服务
    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║         AI Site Generator - Backend (Bun)              ║
╠════════════════════════════════════════════════════════╣
║  Server:    http://localhost:${PORT}                      ║
║  API:       http://localhost:${PORT}/api                  ║
║  Health:    http://localhost:${PORT}/api/health           ║
║  Preview:   ${getPreviewUrl().padEnd(35)}║
╚════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('[STARTUP] Failed to start server:', error);
    process.exit(1);
  }
}

start();
