# AI Site Generator

一个类似 Lovable.dev 的 AI 网站生成系统，支持通过本地 Claude Code 生成网站代码，部署到 Fly.io 并进行可视化编辑。

## 功能特性

- **AI 代码生成**: 通过自然语言描述生成完整网站代码
- **Fly.io 热更新**: 毫秒级代码更新，无需重新部署容器
- **Visual Edit**: 可视化编辑页面元素（文本、颜色、样式）
- **实时预览**: iframe 嵌入预览，支持多设备视图
- **多项目支持**: Volume 持久化存储，支持多用户同时在线
- **数据持久化**: PostgreSQL + Fly.io Volume 双重持久化

## 项目结构

```
ai-site-generator/
├── frontend/          # React 前端 (Vite + TypeScript + Tailwind)
├── backend/           # 后端服务 (Bun + Express + PostgreSQL)
├── fly-server/        # Fly.io 热更新服务器 (Node.js + Express + Volume 持久化)
├── generated/         # 本地生成的项目文件存放目录
└── DESIGN.md          # 架构设计文档
```

### Fly.io 存储结构

```
/data/sites/               # Fly.io Volume 挂载点
├── {projectId-1}/         # 项目目录 (UUID)
│   ├── index.html
│   ├── styles.css
│   └── script.js
└── {projectId-2}/
    └── ...
```

## 快速开始

### 前置要求

- [Bun](https://bun.sh/) (v1.0+)
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (v14+)
- [Claude Code CLI](https://claude.ai/claude-code) (本地安装)
- [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/) (可选，用于部署)

### 1. 安装依赖

```bash
# 安装前端依赖
cd frontend
bun install

# 安装后端依赖
cd ../backend
bun install

# 安装 Fly.io 服务器依赖
cd ../fly-server
npm install
```

### 2. 配置环境变量

```bash
# 后端配置
cd backend
cp .env.example .env

# 编辑 .env 文件，填入 PostgreSQL 配置
```

**.env 文件内容:**
```env
# PostgreSQL Configuration
POSTGRES_HOST=192.168.104.71
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DATABASE=ai_site_generator

# Fly.io Configuration
FLY_APP_NAME=ai-site-preview
FLY_API_URL=https://ai-site-preview.fly.dev

# Server Configuration
PORT=3001
NODE_ENV=development
```

### 3. 初始化数据库

确保 PostgreSQL 已启动，然后运行后端会自动创建表结构。

### 4. 部署 Fly.io 热更新服务器

```bash
cd fly-server

# 登录 Fly.io
fly auth login

# 创建应用（首次）
fly launch --name ai-site-preview --region sin

# 创建持久化 Volume（首次，1GB）
fly volumes create sites_data --region sin --size 1

# 部署（使用单机模式避免 Volume 冲突）
fly deploy --ha=false
```

> **注意**: Volume 只能挂载到单个机器，因此使用 `--ha=false` 禁用高可用模式。

### 5. 启动开发服务器

```bash
# 终端 1: 启动后端
cd backend
bun dev

# 终端 2: 启动前端
cd frontend
bun run dev

# 可选 - 本地测试 Fly.io 服务器
cd fly-server
npm run dev
```

### 6. 访问应用

- 前端: http://localhost:3000
- 后端 API: http://localhost:3001
- Fly.io 预览: https://ai-site-preview.fly.dev

## 使用说明

1. **创建项目**: 在左侧输入项目描述，点击"生成网站"
2. **预览**: 生成完成后自动切换到 Design 模式，右侧显示预览
3. **Visual Edit**: 点击预览中的元素，左侧显示属性编辑面板
4. **实时更新**: 修改属性后自动热更新到 Fly.io

## API 文档

### 项目 API (Backend)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/projects | 获取所有项目 |
| GET | /api/projects/:id | 获取单个项目 |
| GET | /api/projects/:id/status | 获取项目生成状态 |
| GET | /api/projects/:id/files | 获取项目文件列表 |
| POST | /api/projects/generate | 生成新项目 |
| POST | /api/projects/:id/update-file | 更新项目文件 |
| POST | /api/projects/:id/sync-to-fly | 同步项目到 Fly.io |

### 代理 API (Backend)

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/proxy/:projectId | 获取注入 Visual Edit 脚本的预览页面 |
| GET | /api/proxy/:projectId/:filename | 代理获取项目静态资源 |

### Fly.io API（热更新服务器 - 多项目支持）

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/health | 健康检查 |
| GET | /api/projects | 列出所有项目 |
| GET | /api/projects/:projectId/files | 获取项目文件列表 |
| GET | /api/projects/:projectId/file/:path | 获取文件内容 |
| POST | /api/projects/:projectId/update-file | 热更新单个文件 |
| POST | /api/projects/:projectId/update-files | 批量热更新文件 |
| DELETE | /api/projects/:projectId/file/:path | 删除文件 |
| DELETE | /api/projects/:projectId | 删除整个项目 |
| GET | /p/:projectId | 预览项目首页 |
| GET | /p/:projectId/:filename | 预览项目静态文件 |

> 详细架构设计请参阅 [DESIGN.md](./DESIGN.md)

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **后端**: Bun + Express + PostgreSQL
- **预览服务**: Fly.io + Node.js Express
- **AI**: 本地 Claude Code CLI

## 许可证

MIT
