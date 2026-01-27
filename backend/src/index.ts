// AI Site Generator - Backend (Bun)
import express from 'express';
import cors from 'cors';
import { createConnection, type Socket } from 'net';
import * as tls from 'tls';
import { initDatabase } from './db/postgres';
import { checkClaudeAvailable } from './services/claude';
import { healthCheck as flyHealthCheck, getPreviewUrl, getFlyBaseUrl } from './services/flyio';
import projectsRouter from './routes/projects';
import proxyRouter from './routes/proxy';
import codeRouter from './routes/code';
import codeEditorRouter from './routes/code-editor';

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

// 代理 fly-server 的静态资源（用于 visual-edit-script.js）
app.get('/static/*', async (req, res) => {
  try {
    const flyBaseUrl = getPreviewUrl();
    const response = await fetch(`${flyBaseUrl}${req.path}`);

    if (!response.ok) {
      return res.status(response.status).send('Not found');
    }

    const content = await response.text();
    const contentType = response.headers.get('content-type') || 'application/javascript';
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'no-store');
    res.send(content);
  } catch (error) {
    console.error('[STATIC PROXY] Error:', error);
    res.status(500).send('Proxy error');
  }
});

// 路由
app.use('/api/projects', projectsRouter);
app.use('/api/proxy', proxyRouter);
app.use('/api/code', codeRouter);
app.use('/api/code-editor', codeEditorRouter);

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
    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════╗
║         AI Site Generator - Backend (Bun)              ║
╠════════════════════════════════════════════════════════╣
║  Server:    http://localhost:${PORT}                      ║
║  API:       http://localhost:${PORT}/api                  ║
║  Health:    http://localhost:${PORT}/api/health           ║
║  Preview:   ${getPreviewUrl().padEnd(35)}║
║  HMR WS:    ws://localhost:${PORT}/api/proxy/:id/*        ║
╚════════════════════════════════════════════════════════╝
      `);
    });

    // WebSocket 代理 - 使用原始 TCP/TLS 透传
    // 当 iframe 通过 /api/proxy/{projectId}/ 加载时，Vite 会尝试连接 WebSocket
    server.on('upgrade', (request, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const pathname = url.pathname;

      // 匹配 /api/proxy/{projectId}/ 路径的 WebSocket 请求
      // 例如: /api/proxy/{projectId}/hmr/{projectId}
      const proxyMatch = pathname.match(/^\/api\/proxy\/([^/]+)\//);
      if (!proxyMatch) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }

      const projectId = proxyMatch[1];
      const flyBaseUrl = getFlyBaseUrl();
      const isHttps = flyBaseUrl.startsWith('https');
      const flyHost = flyBaseUrl.replace(/^https?:\/\//, '');

      // 转换路径: /api/proxy/{projectId}/xxx -> /p/{projectId}/xxx
      // 这样 fly-server 的 HMR proxy 可以正确识别
      const flyPath = pathname.replace(`/api/proxy/${projectId}/`, `/p/${projectId}/`);

      console.log(`[HMR WS] Proxying WebSocket: ${pathname} -> ${flyHost}${flyPath}`);

      // 使用原始 TCP/TLS 连接到 fly-server
      const port = isHttps ? 443 : 80;
      const connectFn = isHttps
        ? () => tls.connect({ host: flyHost, port, servername: flyHost })
        : () => createConnection({ host: flyHost, port });

      const flySocket: Socket | tls.TLSSocket = connectFn();

      flySocket.on('connect', () => {
        console.log(`[HMR WS] TCP/TLS connected to fly-server: ${projectId}`);

        // 构建 WebSocket 升级请求，转发给 fly-server
        const headers = [
          `GET ${flyPath} HTTP/1.1`,
          `Host: ${flyHost}`,
          `Upgrade: websocket`,
          `Connection: Upgrade`,
          `Sec-WebSocket-Key: ${request.headers['sec-websocket-key']}`,
          `Sec-WebSocket-Version: ${request.headers['sec-websocket-version'] || '13'}`,
          `Origin: ${isHttps ? 'https' : 'http'}://${flyHost}`,
        ];

        // 转发其他相关 headers
        if (request.headers['sec-websocket-extensions']) {
          headers.push(`Sec-WebSocket-Extensions: ${request.headers['sec-websocket-extensions']}`);
        }
        if (request.headers['sec-websocket-protocol']) {
          headers.push(`Sec-WebSocket-Protocol: ${request.headers['sec-websocket-protocol']}`);
        }

        const upgradeRequest = headers.join('\r\n') + '\r\n\r\n';
        flySocket.write(upgradeRequest);

        if (head.length > 0) {
          flySocket.write(head);
        }

        // 双向管道 - 直接透传原始字节
        flySocket.pipe(socket);
        socket.pipe(flySocket);

        console.log(`[HMR WS] WebSocket proxy established: ${projectId}`);
      });

      flySocket.on('error', (error: Error) => {
        console.error(`[HMR WS] Fly-server socket error: ${projectId}`, error.message);
        socket.write('HTTP/1.1 502 Bad Gateway\r\n\r\n');
        socket.destroy();
      });

      flySocket.on('close', () => {
        console.log(`[HMR WS] Fly-server disconnected: ${projectId}`);
        socket.destroy();
      });

      socket.on('error', (error: Error) => {
        console.error(`[HMR WS] Client socket error: ${projectId}`, error.message);
        flySocket.destroy();
      });

      socket.on('close', () => {
        console.log(`[HMR WS] Client disconnected: ${projectId}`);
        flySocket.destroy();
      });

      // 10 秒连接超时
      flySocket.setTimeout(10000, () => {
        console.error(`[HMR WS] Connection timeout: ${projectId}`);
        flySocket.destroy();
        socket.write('HTTP/1.1 504 Gateway Timeout\r\n\r\n');
        socket.destroy();
      });
    });
  } catch (error) {
    console.error('[STARTUP] Failed to start server:', error);
    process.exit(1);
  }
}

start();
