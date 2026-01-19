// 代理路由 - 用于注入 Visual Edit 脚本
import { Router, Request, Response } from 'express';
import { getFlyBaseUrl } from '../services/flyio';

const router = Router();

// Visual Edit 注入脚本
const VISUAL_EDIT_SCRIPT = `
<script>
(function() {
  let selectedElement = null;
  let highlightOverlay = null;
  let hoverOverlay = null;
  let editModeEnabled = false;

  // 创建高亮覆盖层
  function createHighlight() {
    highlightOverlay = document.createElement('div');
    highlightOverlay.id = 'visual-edit-highlight';
    highlightOverlay.style.cssText = \`
      position: absolute;
      pointer-events: none;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      z-index: 99999;
      transition: all 0.1s ease;
      display: none;
    \`;
    document.body.appendChild(highlightOverlay);

    hoverOverlay = document.createElement('div');
    hoverOverlay.id = 'visual-edit-hover';
    hoverOverlay.style.cssText = \`
      position: absolute;
      pointer-events: none;
      border: 1px dashed #9ca3af;
      background: rgba(156, 163, 175, 0.05);
      z-index: 99998;
      transition: all 0.05s ease;
      display: none;
    \`;
    document.body.appendChild(hoverOverlay);
  }

  // 更新高亮位置
  function updateHighlight(element) {
    if (!highlightOverlay) return;
    const rect = element.getBoundingClientRect();
    highlightOverlay.style.top = (rect.top + window.scrollY) + 'px';
    highlightOverlay.style.left = (rect.left + window.scrollX) + 'px';
    highlightOverlay.style.width = rect.width + 'px';
    highlightOverlay.style.height = rect.height + 'px';
    highlightOverlay.style.display = 'block';
  }

  // 生成唯一选择器
  function getUniqueSelector(el) {
    if (el.id) return '#' + el.id;

    const path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const classes = el.className.trim().split(/\\s+/).filter(c => c);
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }

      // 添加索引以区分同级元素
      const siblings = el.parentNode ? Array.from(el.parentNode.children) : [];
      const sameTagSiblings = siblings.filter(s => s.nodeName === el.nodeName);
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(el) + 1;
        selector += ':nth-of-type(' + index + ')';
      }

      path.unshift(selector);

      if (el.id) break;
      el = el.parentNode;
    }
    return path.join(' > ');
  }

  // 点击处理函数
  function handleClick(e) {
    if (!editModeEnabled) return;

    e.preventDefault();
    e.stopPropagation();

    selectedElement = e.target;
    updateHighlight(selectedElement);

    // 发送元素信息到父窗口
    const styles = getComputedStyle(selectedElement);
    window.parent.postMessage({
      type: 'ELEMENT_SELECTED',
      data: {
        selector: getUniqueSelector(selectedElement),
        tagName: selectedElement.tagName,
        textContent: selectedElement.textContent.trim().slice(0, 200),
        innerHTML: selectedElement.innerHTML.slice(0, 500),
        styles: {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          fontSize: styles.fontSize,
          fontWeight: styles.fontWeight,
          padding: styles.padding,
          margin: styles.margin,
          borderRadius: styles.borderRadius,
        }
      }
    }, '*');
  }

  // 鼠标悬停处理函数
  function handleMouseover(e) {
    if (!editModeEnabled) return;
    if (e.target === selectedElement) return;
    if (!hoverOverlay) return;

    const rect = e.target.getBoundingClientRect();
    hoverOverlay.style.top = (rect.top + window.scrollY) + 'px';
    hoverOverlay.style.left = (rect.left + window.scrollX) + 'px';
    hoverOverlay.style.width = rect.width + 'px';
    hoverOverlay.style.height = rect.height + 'px';
    hoverOverlay.style.display = 'block';
  }

  function handleMouseout() {
    if (hoverOverlay) {
      hoverOverlay.style.display = 'none';
    }
  }

  // 初始化
  function init() {
    createHighlight();

    // 点击选中元素
    document.addEventListener('click', handleClick, true);

    // 鼠标悬停预览
    document.addEventListener('mouseover', handleMouseover);
    document.addEventListener('mouseout', handleMouseout);

    // 接收来自父窗口的指令
    window.addEventListener('message', (e) => {
      if (e.data.type === 'UPDATE_ELEMENT') {
        const { selector, property, value } = e.data;
        const el = document.querySelector(selector) || selectedElement;

        if (el) {
          if (property === 'textContent') {
            el.textContent = value;
          } else if (property === 'innerHTML') {
            el.innerHTML = value;
          } else {
            el.style[property] = value;
          }

          // 更新高亮
          if (el === selectedElement) {
            updateHighlight(el);
          }

          // 通知更新成功
          window.parent.postMessage({
            type: 'UPDATE_SUCCESS',
            selector
          }, '*');
        }
      } else if (e.data.type === 'CLEAR_SELECTION') {
        selectedElement = null;
        if (highlightOverlay) {
          highlightOverlay.style.display = 'none';
        }
      } else if (e.data.type === 'ENABLE_EDIT_MODE') {
        editModeEnabled = true;
        document.body.style.cursor = 'crosshair';
        console.log('[Visual Edit] Edit mode enabled');
      } else if (e.data.type === 'DISABLE_EDIT_MODE') {
        editModeEnabled = false;
        selectedElement = null;
        document.body.style.cursor = 'default';
        if (highlightOverlay) highlightOverlay.style.display = 'none';
        if (hoverOverlay) hoverOverlay.style.display = 'none';
        console.log('[Visual Edit] Edit mode disabled');
      } else if (e.data.type === 'GET_FULL_HTML') {
        // 移除 Visual Edit 相关元素后返回 HTML
        const clone = document.documentElement.cloneNode(true);
        const highlight = clone.querySelector('#visual-edit-highlight');
        const hover = clone.querySelector('#visual-edit-hover');
        const scripts = clone.querySelectorAll('script');
        const base = clone.querySelector('base');

        if (highlight) highlight.remove();
        if (hover) hover.remove();
        if (base) base.remove();

        // 移除注入的 Visual Edit 脚本
        scripts.forEach(script => {
          if (script.textContent && script.textContent.includes('Visual Edit')) {
            script.remove();
          }
        });

        window.parent.postMessage({
          type: 'FULL_HTML_RESPONSE',
          html: '<!DOCTYPE html>\\n' + clone.outerHTML
        }, '*');
      }
    });

    console.log('[Visual Edit] Initialized (edit mode disabled by default)');
  }

  // DOM 加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>
`;

// 代理获取预览页面（从 Fly.io 获取，注入 Visual Edit 脚本）
router.get('/:projectId', async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId;
    const flyBaseUrl = getFlyBaseUrl();

    // 从 Fly.io 获取项目的 index.html
    const response = await fetch(`${flyBaseUrl}/p/${projectId}`);
    if (!response.ok) {
      return res.status(response.status).send('Failed to fetch preview from Fly.io');
    }

    let html = await response.text();

    // 添加 <base> 标签以修正相对路径
    const baseTag = `<base href="/api/proxy/${projectId}/">`;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n${baseTag}`);
    } else if (html.includes('<html>')) {
      html = html.replace('<html>', `<html>\n<head>${baseTag}</head>`);
    }

    // 注入 Visual Edit 脚本（在 </body> 之前）
    if (html.includes('</body>')) {
      html = html.replace('</body>', VISUAL_EDIT_SCRIPT + '</body>');
    } else {
      html += VISUAL_EDIT_SCRIPT;
    }

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

    const content = await response.text();

    // 设置 Content-Type
    if (filename.endsWith('.css')) {
      res.type('css');
    } else if (filename.endsWith('.js')) {
      res.type('javascript');
    } else if (filename.endsWith('.json')) {
      res.type('json');
    } else if (filename.endsWith('.html')) {
      res.type('html');
    }

    res.send(content);
  } catch (error) {
    console.error('[PROXY] Error fetching resource:', error);
    res.status(500).send('Proxy error');
  }
});

export default router;
