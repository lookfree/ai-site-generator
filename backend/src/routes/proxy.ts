// 代理路由 - 转发预览页面（保留 fly-server 已注入的脚本）
import { Router, Request, Response } from 'express';
import { getFlyBaseUrl } from '../services/flyio';

const router = Router();

// 代理获取预览页面（从 Fly.io 获取，注入 Visual Edit 脚本）
router.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const flyBaseUrl = getFlyBaseUrl();

    // 从 Fly.io 获取项目的 index.html (添加尾部斜杠避免 302 重定向)
    const response = await fetch(`${flyBaseUrl}/p/${projectId}/`);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch preview from Fly.io');
    }

    let html = await response.text();

    // 移除现有的 <base> 标签
    html = html.replace(/<base\s+[^>]*>/gi, '');

    // 将 /p/{projectId}/ 路径替换为 /api/proxy/{projectId}/
    html = html.replace(new RegExp(`/p/${projectId}/`, 'g'), `/api/proxy/${projectId}/`);
    html = html.replace(new RegExp(`"/p/${projectId}"`, 'g'), `"/api/proxy/${projectId}"`);

    // 添加新的 <base> 标签以修正相对路径
    const baseTag = `<base href="/api/proxy/${projectId}/">`;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${baseTag}`);
    } else if (html.includes('<html>')) {
      html = html.replace('<html>', `<html>\n<head>${baseTag}</head>`);
    }

    // 禁用缓存以确保路径重写生效
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.type('html').send(html);
  } catch (error) {
    console.error('[PROXY] Error fetching preview:', error);
    res.status(500).send('Proxy error');
  }
});

// 代理静态资源（CSS/JS）- 从 Fly.io 获取
router.get('/:projectId/:filename(*)', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const filename = req.params.filename;
    const flyBaseUrl = getFlyBaseUrl();

    // 从 Fly.io 获取文件
    const response = await fetch(`${flyBaseUrl}/p/${projectId}/${filename}`);
    if (!response.ok) {
      return res.status(response.status).send('Not found');
    }

    let content = await response.text();

    // 重写 JavaScript/TypeScript/CSS 文件中的路径
    // 包括 .js, .tsx, .ts, .mjs, .css 文件以及 @vite/*, @react-refresh 等特殊路由
    // 注意：Vite 会将 CSS 文件转换为 JS 模块，所以 CSS 也需要路径重写
    const needsPathRewrite =
      filename.endsWith('.js') ||
      filename.endsWith('.mjs') ||
      filename.endsWith('.tsx') ||
      filename.endsWith('.ts') ||
      filename.endsWith('.css') ||
      filename.startsWith('@vite/') ||
      filename.startsWith('@react-refresh');

    if (needsPathRewrite) {
      // 将 /p/{projectId}/ 路径替换为 /api/proxy/{projectId}/
      content = content.replace(new RegExp(`/p/${projectId}/`, 'g'), `/api/proxy/${projectId}/`);
      content = content.replace(new RegExp(`"/p/${projectId}"`, 'g'), `"/api/proxy/${projectId}"`);
    }

    // 禁用缓存以确保路径重写生效
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    // 设置 Content-Type (必须在 send 之前，使用 set 确保不被覆盖)
    // 注意：Vite 在开发模式下会将 CSS 转换为 JS 模块，所以需要检测内容
    if (filename.endsWith('.css')) {
      // Vite 会将 CSS 转换为 JS 模块（以 import 开头）
      if (content.startsWith('import ')) {
        res.set('Content-Type', 'application/javascript; charset=utf-8');
      } else {
        res.set('Content-Type', 'text/css; charset=utf-8');
      }
    } else if (filename.endsWith('.js') || filename.endsWith('.mjs')) {
      res.set('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filename.endsWith('.tsx') || filename.endsWith('.ts')) {
      // TypeScript/TSX 文件需要作为 JavaScript 模块提供
      res.set('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filename.startsWith('@vite/') || filename.startsWith('@react-refresh')) {
      // Vite 特殊路由也是 JavaScript 模块
      res.set('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filename.endsWith('.json')) {
      res.set('Content-Type', 'application/json; charset=utf-8');
    } else if (filename.endsWith('.html')) {
      res.set('Content-Type', 'text/html; charset=utf-8');
    } else if (filename.endsWith('.svg')) {
      res.set('Content-Type', 'image/svg+xml');
    } else if (filename.endsWith('.png')) {
      res.set('Content-Type', 'image/png');
    } else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      res.set('Content-Type', 'image/jpeg');
    } else if (filename.endsWith('.woff') || filename.endsWith('.woff2')) {
      res.set('Content-Type', 'font/woff2');
    }

    res.send(content);
  } catch (error) {
    console.error('[PROXY] Error fetching resource:', error);
    res.status(500).send('Proxy error');
  }
});

export default router;
