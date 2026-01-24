import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { jsxTaggerPlugin } from 'vite-plugin-jsx-tagger';

export default defineConfig({
  plugins: [
    // JSX Tagger 必须在 React 插件之前
    jsxTaggerPlugin({
      removeInProduction: false,  // 生产环境保留标记
      idPrefix: '{{projectId}}',
    }),
    react(),
  ],
  server: {
    port: 5173,
    host: true,
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
