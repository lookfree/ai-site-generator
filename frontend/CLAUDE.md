# AI Site Generator - Frontend

AI 网站生成器的前端应用，提供项目管理和可视化编辑界面。

## 项目结构

```
frontend/
├── src/
│   ├── App.tsx               # 主应用组件，路由和布局
│   ├── main.tsx              # React 入口文件
│   ├── components/
│   │   ├── Header.tsx        # 顶部导航栏
│   │   ├── LeftPanel.tsx     # 左侧面板容器
│   │   ├── ProjectList.tsx   # 项目列表组件
│   │   ├── PreviewFrame.tsx  # 预览 iframe 容器
│   │   ├── VisualEditPanel.tsx    # 可视化编辑面板
│   │   ├── VisualEditorPanel.tsx  # visual-editor 集成
│   │   ├── PropertyPanel.tsx      # 属性编辑面板
│   │   ├── EditPanel.tsx          # 编辑面板
│   │   ├── ComponentTree.tsx      # 组件树视图
│   │   └── ThemePanel.tsx         # 主题配置面板
│   ├── hooks/
│   │   └── ...               # 自定义 React hooks
│   ├── services/
│   │   └── api.ts            # API 调用服务
│   └── styles/
│       └── index.css         # 全局样式
├── package.json              # 依赖配置
├── vite.config.ts            # Vite 配置
├── tailwind.config.js        # Tailwind CSS 配置
└── tsconfig.json             # TypeScript 配置
```

## 技术栈

- **框架**: React 18 + TypeScript
- **状态管理**: Zustand
- **样式**: Tailwind CSS
- **构建工具**: Vite
- **可视化编辑**: visual-editor (workspace 包)
- **测试**: Vitest + Testing Library

## 核心功能

### 1. 项目管理
- 项目列表展示
- 创建/删除项目
- 项目预览

### 2. 可视化编辑 (VisualEditPanel.tsx)
- 使用 `visual-editor` 包的组件
- 支持元素选中和属性编辑
- 实时预览更新

### 3. 预览 (PreviewFrame.tsx)
- 嵌入 iframe 显示项目预览
- 与 visual-editor 状态同步
- 支持 HMR 热更新

### 4. iframe 通信 (useIframeCommunication)
- 来自 `visual-editor` 包
- 处理预览 iframe 与编辑器的消息传递
- 支持元素选中、样式修改等操作

## 开发命令

```bash
# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 构建生产版本
bun run build

# 运行测试
bun run test

# 监听模式测试
bun run test:watch
```

## 环境配置

默认开发服务器运行在 `http://localhost:3000`

API 请求代理到 backend (`http://localhost:3001`)

## 组件说明

### PreviewFrame
- 负责渲染项目预览 iframe
- 管理 HMR WebSocket 连接
- 使用 `useEditorStore` 与 visual-editor 同步

### VisualEditPanel
- 集成 visual-editor 的属性面板
- 使用 `ColorPicker`、`SelectControl`、`SliderControl`
- 响应元素选中事件，更新属性面板

### App.tsx
- 使用 `useIframeCommunication` hook
- 管理设计模式的启用/禁用
- 协调各组件之间的状态

## 与其他服务的交互

### Backend API
- `GET /api/projects` - 获取项目列表
- `POST /api/projects` - 创建项目
- `POST /api/code-editor/:projectId/update-*` - 更新代码

### Fly Server
- 通过 backend proxy 访问: `/api/proxy/:projectId`
- 预览页面从 fly-server 加载
- HMR 更新通过 WebSocket 接收

## 开发注意事项

- 使用 `visual-editor` 包的组件时，确保 workspace 依赖已构建
- 预览 iframe 需要正确的 CSP 配置
- HMR 连接失败时会自动重试
- 状态管理使用 Zustand，避免不必要的重渲染
