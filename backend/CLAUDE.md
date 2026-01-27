# AI Site Generator - Backend

Backend service for the AI Site Generator, providing API endpoints for project management, code generation, and visual editing capabilities.

## Project Structure

```
backend/
├── src/
│   ├── index.ts           # Express app entry point, server startup
│   ├── db/
│   │   └── postgres.ts    # PostgreSQL connection and queries
│   ├── routes/
│   │   ├── projects.ts    # Project CRUD operations
│   │   ├── proxy.ts       # Visual edit proxy (same-origin iframe)
│   │   ├── code.ts        # Code generation endpoints
│   │   └── code-editor.ts # Code editing operations
│   └── services/
│       ├── claude.ts      # Claude Code CLI integration
│       ├── kimi.ts        # Kimi K2 API integration
│       ├── flyio.ts       # Fly.io deployment service
│       └── ast/           # AST processing for code modifications
├── .env                   # Environment configuration
├── .env.example           # Environment template
├── package.json           # Bun dependencies
└── tsconfig.json          # TypeScript configuration
```

## Tech Stack

- **Runtime**: Bun (fast JavaScript/TypeScript runtime)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Deployment**: Fly.io (preview server)
- **AI Services**: Claude Code CLI, Kimi K2 API

## Setup

```bash
# Install dependencies
bun install

# Copy environment configuration
cp .env.example .env
# Edit .env with your credentials

# Initialize database
bun run db:init

# Start development server
bun run dev
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `POSTGRES_HOST` | PostgreSQL host address | Yes |
| `POSTGRES_PORT` | PostgreSQL port (default: 5432) | Yes |
| `POSTGRES_USER` | Database username | Yes |
| `POSTGRES_PASSWORD` | Database password | Yes |
| `POSTGRES_DATABASE` | Database name | Yes |
| `FLY_APP_NAME` | Fly.io application name | Yes |
| `FLY_API_URL` | Fly.io preview server URL | Yes |
| `PORT` | Server port (default: 3001) | No |
| `KIMI_API_KEY` | Kimi K2 API key | For AI features |
| `KIMI_API_BASE_URL` | Kimi API base URL | For AI features |

## API Endpoints

### Health Check
- `GET /api/health` - Service health status

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project by ID
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Proxy (Visual Editing)
- `GET /api/proxy/:projectId` - Proxy preview page (injects visual edit script)
- `GET /api/proxy/:projectId/*` - Proxy static assets with path rewriting

### Code
- `POST /api/code/generate` - Generate code using AI
- `POST /api/code/update` - Update component code

## Architecture Notes

### Proxy Route (`/api/proxy`)
The proxy route enables same-origin iframe communication for visual editing:

1. Fetches content from Fly.io preview server (`https://ai-site-preview.fly.dev`)
2. Rewrites paths from `/p/{projectId}/` to `/api/proxy/{projectId}/`
3. Injects visual edit script for element selection and inline editing
4. Handles Vite's CSS-to-JS module transformation (serves CSS as `application/javascript`)

**Key considerations**:
- CSS files are served as JS modules (Vite dev mode transforms CSS to JS)
- All asset paths must be rewritten for same-origin access
- Visual edit script enables postMessage communication with parent window

### Database Schema
Projects table stores:
- Project metadata (name, description)
- Generated code content
- Fly.io deployment info
- Preview URLs

### AI Integration
- **Claude Code CLI**: Used for code generation and modifications
- **Kimi K2 API**: Alternative AI service for generation tasks

## Development Guidelines

### ⚠️ 重要：启动服务前必须清除系统代理

**问题**：如果系统设置了 HTTP 代理（如 VPN、科学上网工具），后端的 proxy 路由会出现 `ECONNRESET` 错误，导致预览页面空白。

**解决方案**：启动后端服务时，必须清除所有代理环境变量：

```bash
# 正确的启动方式（清除代理后启动）
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY && bun run dev

# 后台运行时
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY && bun run dev > /tmp/backend.log 2>&1 &
```

**症状**：
- 预览 iframe 显示空白
- 后端日志显示 `ECONNRESET` 错误
- `curl http://localhost:3001/api/proxy/...` 返回 "Proxy error"

### Debugging Tips
- Check `/tmp/backend.log` for server output when running in background
- Use `curl --noproxy '*'` to bypass system proxy when testing endpoints
- Monitor Vite HMR websocket connection errors (expected when proxying)

### Code Style
- Use async/await for all asynchronous operations
- Handle errors with try/catch and proper error responses
- Log important operations with prefixes: `[DB]`, `[PROXY]`, `[CLAUDE]`, etc.

## HMR (Hot Module Replacement) 架构

### 完整链路

```
用户浏览器 (localhost:3000 Frontend)
    │
    ├── iframe 加载自: localhost:3001/api/proxy/{projectId}/
    │       │
    │       └── Backend 代理到: ai-site-preview.fly.dev/p/{projectId}/
    │
    └── Vite HMR WebSocket 连接 (直连 fly-server):
            │
            wss://ai-site-preview.fly.dev/{base}/hmr/{projectId}
                    │
                    └── fly-server hmr-proxy 提取 projectId
                            │
                            └── TCP socket 代理到 Vite ws://localhost:{port}/
```

### HMR 直连 vs 代理

**重要：HMR WebSocket 直连 fly-server，不走 backend proxy**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Preview 内容 (走 backend proxy)               │
│  localhost:3001/api/proxy/{projectId}/                          │
│         ↓                                                       │
│  ai-site-preview.fly.dev/p/{projectId}/                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    HMR WebSocket (直连 fly-server)               │
│  wss://ai-site-preview.fly.dev/hmr/{projectId}                  │
│         ↓                                                       │
│  fly-server hmr-proxy → Vite ws://localhost:{port}/             │
└─────────────────────────────────────────────────────────────────┘
```

**为什么这样设计？**
- iframe 内容走 proxy：解决 same-origin 跨域问题，允许 postMessage 通信
- HMR WebSocket 直连：减少延迟，WebSocket 本身支持跨域，无需 proxy

**vite.config.ts 中的 HMR 配置**：
```typescript
hmr: {
  protocol: 'wss',
  host: 'ai-site-preview.fly.dev',  // 直连 fly-server，不是 localhost:3001
  clientPort: 443,
  path: '/hmr/${projectId}',
}
```

### HMR 直连的安全性分析

**相对安全的方面**：
1. 使用 `wss://` 加密传输，防止中间人攻击
2. projectId 是 UUID，难以猜测 (36位: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
3. HMR 消息只通知"哪个文件更新了"，不传输实际代码内容
4. 这是开发/预览环境，不是生产环境

**潜在风险**：
1. 知道 projectId 的人可以连接 HMR WebSocket 监听更新事件
2. fly-server 是公开访问的，当前没有认证机制
3. 理论上可以遍历 UUID（但概率极低，约 2^122 种可能）

**风险评估**：
- 最坏情况：攻击者知道你正在编辑哪个文件（文件路径）
- HMR 不传输代码内容，代码通过单独的 HTTP 请求获取
- 对于内部开发预览环境，当前设计可以接受

**如需加强安全（可选）**：
```typescript
// fly-server hmr-proxy.ts - 添加 token 认证
const token = url.searchParams.get('token');
if (!isValidToken(projectId, token)) {
  socket.close(4001, 'Unauthorized');
  return;
}
```

**使用场景建议**：
- 内部开发团队使用 → 当前设计足够
- 对外提供 SaaS 服务 / 处理敏感数据 → 建议添加 token 认证

### 关键配置文件

**1. fly-server/src/services/scaffolder.ts** - 生成项目的 vite.config.ts:
```typescript
hmr: {
  protocol: 'wss',                      // 必须是 wss (HTTPS 页面不能用 ws)
  host: 'ai-site-preview.fly.dev',      // 直连 fly-server，绕过 backend proxy
  clientPort: 443,                      // HTTPS 端口
  path: '/hmr/${config.projectId}',     // HMR 专用路径
  overlay: true,
}
```

**2. fly-server/src/services/vite-manager.ts** - 运行时更新 vite.config.ts:
- `ensureViteConfig()` 方法在 Vite 启动前更新配置
- 确保 `base`, `allowedHosts`, `hmr` 配置正确

**3. fly-server/src/services/hmr-proxy.ts** - HMR WebSocket 代理:
- 使用 Node.js 原生 TCP socket (`net.createConnection`) 代理 WebSocket
- **关键**: Vite HMR WebSocket 监听在根路径 `/`，代理时必须发送 `GET / HTTP/1.1`
- 支持多种客户端路径格式：
  - `/hmr?projectId=xxx` - 外部 HMR 客户端 (PreviewFrame)
  - `/hmr/{projectId}` - 直接访问
  - `/p/{projectId}/hmr/{projectId}` - 直连 fly-server 时 (base + hmr.path)
  - `/api/proxy/{projectId}/hmr/{projectId}` - 通过 backend proxy 时

### 路径拼接问题 (重要)

Vite 客户端计算 WebSocket URL 时会将 `base` 和 `hmr.path` 拼接：
- 当通过 backend proxy 访问时，浏览器认为 base = `/api/proxy/{projectId}/`
- 即使配置了 `hmr.path = '/hmr/{projectId}'`
- 最终 WebSocket 路径 = `/api/proxy/{projectId}/hmr/{projectId}`

**解决方案**: fly-server hmr-proxy 使用通用正则表达式匹配任何包含 `/hmr/{uuid}` 的路径：
```typescript
const hmrPathMatch = pathname.match(/\/hmr\/([0-9a-f-]{36})/);
```

### TCP Socket 代理实现

为什么不使用 `ws` 库的 WebSocket 对象？
- `ws` 库的 WebSocket 在某些情况下连接会挂起（无 open/error 事件）
- 原始 TCP socket 更可靠，直接透传字节流

关键代码逻辑：
```typescript
const viteSocket = createConnection({ host, port }, () => {
  // 构建 WebSocket 升级请求，注意路径是 /
  const upgradeRequest = [
    'GET / HTTP/1.1',  // Vite 监听根路径
    `Host: ${host}:${port}`,
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Key: ${request.headers['sec-websocket-key']}`,
    `Sec-WebSocket-Version: 13`,
    '',
    ''
  ].join('\r\n');
  viteSocket.write(upgradeRequest);
});

// 双向管道
viteSocket.pipe(clientSocket);
clientSocket.pipe(viteSocket);
```

### 调试步骤

1. **检查浏览器控制台**
   - `[vite] connecting...` - 正在连接
   - `[vite] connected.` - 连接成功
   - 如果一直显示 `connecting...`，查看 Network 面板的 WebSocket 请求

2. **检查 fly-server 日志**
   ```bash
   fly logs -a ai-site-preview | grep -i hmr
   ```
   应该看到：
   - `[HMR Proxy] Proxying Vite HMR: {projectId} (client: /xxx/hmr/xxx)`
   - `[HMR Proxy] TCP connected to Vite`
   - `[HMR Proxy] WebSocket proxy established`

3. **测试 WebSocket 路径**
   ```bash
   curl --noproxy '*' --http1.1 -v \
     -H "Upgrade: websocket" \
     -H "Connection: Upgrade" \
     -H "Sec-WebSocket-Key: test==" \
     -H "Sec-WebSocket-Version: 13" \
     "https://ai-site-preview.fly.dev/api/proxy/{projectId}/hmr/{projectId}"
   ```
   - 503: Vite 未运行
   - 502/504: TCP 连接失败或超时
   - 101: WebSocket 升级成功

### 常见问题

1. **HMR 连接失败 (SecurityError)**
   - 症状：浏览器控制台显示 "insecure WebSocket connection"
   - 原因：HTTPS 页面尝试连接 ws:// (非安全)
   - 解决：确保 vite.config.ts 中 `hmr.protocol: 'wss'`

2. **HMR 连接成功但仍然 full reload**
   - 可能原因：
     - Vite 判断需要 full-reload (模块边界被破坏)
     - React Fast Refresh 边界被破坏 (导出了非组件)
   - 调试：查看浏览器控制台是否有 `[vite] page reload` 消息

3. **编辑后页面白屏 1-2 秒**
   - 可能是 HMR 连接断开后重连
   - 检查 WebSocket 连接是否稳定
   - 查看 fly-server 日志中的连接/断开事件

4. **502 Bad Gateway (5秒超时)**
   - Vite 进程未启动或端口不正确
   - 检查 `viteManager.getInstance(projectId)` 返回的端口

## 已解决的问题

### 2026-01-27: 保存后白屏问题修复

**问题现象**：
- Visual edit 模式下编辑元素后点击 Save
- 预览 iframe 会出现白屏，然后重新加载整个页面
- HMR 实际上是工作的，但被手动 iframe 刷新覆盖了

**根本原因**：
代码中存在显式的 iframe 重载逻辑，在保存后强制刷新 iframe：

```typescript
// 问题代码 - 在 VisualEditorPanel.tsx 和 App.tsx 中
iframe.src = iframe.src;  // 这会导致完整的页面重载
```

**修复内容**：

1. **frontend/src/components/VisualEditorPanel.tsx**:
   - 移除了 `handleSave` 函数末尾的 iframe 刷新代码
   - 移除了未使用的 `iframeRef` 变量
   - HMR 会自动处理文件更新后的页面刷新

2. **frontend/src/App.tsx**:
   - 移除了 `handleSyncToFly` 函数中的 `iframe.src = iframe.src` 代码
   - 同步到 fly-server 后让 HMR 自动更新预览

3. **fly-server/src/services/vite-manager.ts**:
   - 新增 `ensureJsxTaggerDependency()` 方法：自动为旧项目添加 `vite-plugin-jsx-tagger` 依赖
   - 更新 `ensureViteConfig()` 方法：自动在 vite.config.ts 中添加 jsxTaggerPlugin 导入和配置
   - 解决了旧项目（在 jsx-tagger 添加之前创建的）无法进行可视化编辑的问题

**关键认知**：
- HMR (Hot Module Replacement) 会自动检测文件变化并更新页面
- 不需要手动刷新 iframe，手动刷新反而会破坏 HMR 的无缝更新体验
- 保存操作只需要将代码写入文件，Vite 会通过 WebSocket 推送更新到浏览器

### 2026-01-27: "Unsaved changes" 不显示问题修复

**问题现象**：
- 第一次编辑并保存后，再次编辑同一元素
- "Unsaved changes" 标签不显示
- Save 按钮点击无反应

**根本原因**：
`editor-store.ts` 中的 `addAction` 函数会对同一元素的同类型编辑进行去重（更新现有 action 而非创建新的）：

```typescript
// 问题逻辑
if (existingIndex >= 0) {
  // 更新现有 action 的 newValue，保留原始 oldValue
  newHistory[existingIndex] = { ...newHistory[existingIndex], newValue: action.newValue };
  // historyIndex 不变！
}
```

保存后流程：
1. 保存成功后：`lastSavedIndex = historyIndex = 0`
2. 再次编辑同一元素：更新 action[0]，`historyIndex` 仍然 = 0
3. `pendingActions = history.slice(lastSavedIndex + 1, historyIndex + 1)` = `history.slice(1, 1)` = `[]`
4. `hasChanges = false` → 不显示 "Unsaved changes"

**修复内容**：

1. **packages/visual-editor/src/stores/editor-store.ts**:
   - 新增 `clearHistory()` 方法：清空历史记录并重置 `historyIndex` 为 -1

2. **frontend/src/components/VisualEditorPanel.tsx**:
   - 保存成功后调用 `clearHistory()` 和 `setLastSavedIndex(-1)`
   - 这样新的编辑会创建全新的 action，正确触发 "Unsaved changes"

**关键认知**：
- 保存后需要清空历史，让后续编辑从干净状态开始
- 去重逻辑适用于连续编辑（未保存时），但保存后应重置状态

### 已知限制：偶发的 HMR Full Reload

**现象**：某些保存操作会触发页面完整刷新（白屏 1-2 秒）而非平滑的 HMR 更新

**原因**：这是 Vite/React Fast Refresh 的正常行为，以下情况会触发 full reload：
- 修改的文件导出了非 React 组件（常量、工具函数等）
- 改动跨越了模块边界
- React Fast Refresh 无法安全地热替换

**不是 bug**，如需优化可：
- 确保被编辑的文件只导出 React 组件
- 将常量、工具函数拆分到单独文件
