import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { jsxTaggerPlugin } from 'vite-plugin-jsx-tagger';

export default defineConfig({
  plugins: [
    // JSX Tagger 必须在 React 插件之前，以便在编译时注入 data-jsx-* 属性
    jsxTaggerPlugin({
      idPrefix: '1449033f',
      removeInProduction: false,
    }),
    react(),
  ],
  server: {
    port: 5173,
    host: true,
    // 允许所有 hosts 以支持代理访问
    allowedHosts: 'all',
    hmr: {
      overlay: true,
    },
  },
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
