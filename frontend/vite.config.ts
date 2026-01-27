import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { Agent } from 'http'

// 创建不使用代理的 Agent
const directAgent = new Agent({ keepAlive: true })

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true, // 启用 WebSocket 代理（用于 HMR）
        agent: directAgent, // 绕过系统代理
      },
      // 代理 visual-edit-script.js（从 backend 获取，backend 再代理到 fly-server）
      '/static': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        agent: directAgent,
      },
    },
  },
})
