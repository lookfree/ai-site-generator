# AI Site Generator - Backend

后端服务，提供项目管理、代码生成和可视化编辑 API。

## 技术栈

- **Runtime**: Bun
- **Framework**: Express.js
- **Database**: PostgreSQL
- **部署**: Fly.io (preview server)
- **AI**: Claude Code CLI, Kimi K2 API

## 启动命令

```bash
# ⚠️ 重要：必须清除代理，否则 proxy 路由会 ECONNRESET
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY && bun run dev

# 后台运行
unset http_proxy https_proxy HTTP_PROXY HTTPS_PROXY all_proxy ALL_PROXY && bun run dev > /tmp/backend.log 2>&1 &
```

## 环境变量

| 变量 | 说明 |
|-----|------|
| `POSTGRES_*` | 数据库连接配置 |
| `FLY_APP_NAME` | Fly.io 应用名 |
| `FLY_API_URL` | Fly.io 预览服务器 URL |
| `KIMI_API_KEY` | Kimi K2 API 密钥 |

## API 端点

- `GET /api/projects` - 项目列表
- `POST /api/projects` - 创建项目
- `GET /api/proxy/:projectId/*` - 预览代理（注入可视化编辑脚本）
- `POST /api/code-editor/:projectId/update-*` - 代码编辑

## 架构要点

### Proxy 路由
- iframe 通过 backend proxy 加载预览，解决跨域问题
- CSS 文件作为 JS 模块返回（Vite 开发模式特性）
- 路径重写：`/p/{projectId}/` → `/api/proxy/{projectId}/`

### HMR 架构
```
iframe 内容: localhost:3001/api/proxy/{projectId}/ → fly-server (走 proxy)
HMR WebSocket: wss://ai-site-preview.fly.dev/hmr/{projectId} (直连 fly-server)
```

HMR 直连原因：
- iframe 内容走 proxy 解决 same-origin 跨域
- WebSocket 本身支持跨域，直连减少延迟

### 关键配置
- `fly-server/src/services/scaffolder.ts` - 生成项目 vite.config.ts
- `fly-server/src/services/vite-manager.ts` - 运行时更新 vite 配置
- `fly-server/src/services/hmr-proxy.ts` - HMR WebSocket 代理

## 已解决的问题

### 保存后白屏 (2026-01-27)
- **原因**: 保存后手动刷新 iframe (`iframe.src = iframe.src`)
- **修复**: 移除手动刷新，让 HMR 自动更新

### "Unsaved changes" 不显示 (2026-01-27)
- **原因**: `addAction` 去重导致 `historyIndex` 不变，`pendingActions` 为空
- **修复**: 保存后调用 `clearHistory()` 重置状态

### 已知限制
- 部分保存会触发 full reload（Vite/React Fast Refresh 边界行为，非 bug）
