# SPEC-0007: 可视化编辑器集成升级

> **阶段**: M7 (第 13-14 周)
> **状态**: ✅ 完成
> **优先级**: P0 - 核心功能
> **依赖**: SPEC-0002 (AST), SPEC-0003 (Visual Editor), SPEC-0004 (HMR), SPEC-0006 (Fly-Server)

## 实施状态

### 准备工作完成情况

| 任务 ID | 任务描述 | 状态 |
|---------|---------|------|
| T0.1 | 更新 backend flyio.ts API 路径 | ✅ 完成 |
| T0.2 | 更新 kimi.ts 生成 React + Tailwind | ✅ 完成 |
| T0.3 | 更新项目生成流程支持脚手架 | ✅ 完成 |
| T0.4 | 添加 fly-server 直接预览 URL | ✅ 完成 |

### Week 13 任务

| 任务 ID | 任务描述 | 状态 |
|---------|---------|------|
| T13.1 | 集成 ast-processor 到 backend | ✅ 完成 |
| T13.2 | 实现代码编辑 API | ✅ 完成 |
| T13.3 | 升级 PreviewFrame 支持 HMR | ✅ 完成 |
| T13.4 | 实现组件树视图 | ✅ 完成 |

### Week 14 任务

| 任务 ID | 任务描述 | 状态 |
|---------|---------|------|
| T14.1 | 实现属性面板与 AST 联动 | ✅ 完成 |
| T14.2 | 实现拖拽编辑功能 | ✅ 完成 |
| T14.3 | 端到端测试 | ✅ 完成 |
| T14.4 | 性能优化 | ✅ 完成 |

---

## 1. 目标概述

### 1.1 核心目标

将现有的 DOM 操作可视化编辑器升级为 **AST 驱动的 React 代码编辑器**，实现真正的 Lovable 式开发体验：点击组件 → 修改属性 → 代码自动更新 → HMR 热刷新。

### 1.2 当前状态 vs 目标状态

| 功能 | 当前状态 | 目标状态 |
|------|---------|---------|
| 编辑方式 | DOM 直接操作 | AST 代码生成 |
| 持久化 | 仅运行时 | 代码持久化 |
| 组件识别 | CSS 选择器 | React 组件树 |
| 预览更新 | 手动刷新 | HMR 自动热更新 |
| 代码同步 | 无 | 双向同步 |

### 1.3 关键用户流程

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Lovable 式可视化编辑流程                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. 用户在预览中点击组件                                              │
│         │                                                            │
│         ▼                                                            │
│  2. 前端发送选择事件到 Backend                                        │
│         │                                                            │
│         ▼                                                            │
│  3. AST Processor 定位对应的 JSX 节点                                │
│         │                                                            │
│         ▼                                                            │
│  4. 属性面板显示组件属性 (className, style, props)                    │
│         │                                                            │
│         ▼                                                            │
│  5. 用户修改属性值                                                    │
│         │                                                            │
│         ▼                                                            │
│  6. AST Processor 生成新代码                                         │
│         │                                                            │
│         ▼                                                            │
│  7. 代码写入 fly-server                                              │
│         │                                                            │
│         ▼                                                            │
│  8. Vite HMR 自动热更新预览                                          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.4 交付物清单

| 序号 | 交付物 | 描述 | 验收标准 |
|------|--------|------|---------|
| D1 | AST 编辑服务 | 后端 AST 代码编辑 | 支持属性/样式/文本修改 |
| D2 | 组件选择器 | 前端组件选择交互 | 点击高亮 + 属性读取 |
| D3 | 属性面板 | Tailwind/Style 编辑 | 实时预览 |
| D4 | HMR 集成 | 代码变更热更新 | 延迟 < 500ms |
| D5 | 组件树视图 | React 组件结构 | 可展开/折叠 |
| D6 | 撤销/重做 | 编辑历史管理 | 支持 50 步 |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        可视化编辑器集成架构                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         Frontend (React)                            │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐   │ │
│  │  │ 组件树视图   │  │ 属性面板    │  │ 预览 iframe              │   │ │
│  │  │ ComponentTree│  │ PropertyPanel│ │ (fly-server Vite)       │   │ │
│  │  └──────┬──────┘  └──────┬──────┘  └───────────┬──────────────┘   │ │
│  │         │                │                      │                   │ │
│  │         └────────────────┼──────────────────────┘                   │ │
│  │                          ▼                                          │ │
│  │              ┌─────────────────────┐                               │ │
│  │              │ Visual Editor State │                               │ │
│  │              │ - selectedComponent │                               │ │
│  │              │ - componentTree     │                               │ │
│  │              │ - editHistory       │                               │ │
│  │              └──────────┬──────────┘                               │ │
│  └─────────────────────────┼──────────────────────────────────────────┘ │
│                            │                                             │
│                   REST API │ WebSocket (HMR)                            │
│                            ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                         Backend (Bun)                               │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │ │
│  │  │ AST Processor   │  │ Code Editor API │  │ Project Service │    │ │
│  │  │ - parse         │  │ - getComponent  │  │ - CRUD          │    │ │
│  │  │ - transform     │  │ - updateProps   │  │ - sync          │    │ │
│  │  │ - generate      │  │ - updateStyle   │  │                 │    │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘    │ │
│  └─────────────────────────┬──────────────────────────────────────────┘ │
│                            │                                             │
│                            ▼                                             │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                      Fly-Server (Bun)                               │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │ │
│  │  │ Vite Dev Server │  │ HMR Proxy       │  │ File Storage    │    │ │
│  │  │ - React refresh │  │ - WebSocket     │  │ - /data/sites   │    │ │
│  │  │ - Hot reload    │  │ - 消息转发       │  │ - node_modules │    │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 数据流

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  用户点击 │ -> │ 获取组件  │ -> │ 显示属性  │ -> │ 编辑属性  │
│  预览组件 │    │ AST 信息  │    │ 面板     │    │ 值       │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
                                                      ▼
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  HMR     │ <- │ 写入文件  │ <- │ 生成代码  │ <- │ 更新 AST │
│  热更新   │    │ fly-server│    │          │    │          │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

---

## 3. 核心模块实现

### 3.1 AST 编辑服务 (Backend)

```typescript
// backend/src/services/ast-editor.ts

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';

export interface ComponentInfo {
  id: string;                    // 组件唯一标识
  name: string;                  // 组件名称 (div, Button, etc.)
  location: {                    // 代码位置
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  props: Record<string, any>;    // 组件属性
  className?: string;            // Tailwind 类名
  style?: Record<string, string>;// 内联样式
  children?: ComponentInfo[];    // 子组件
}

export class AstEditor {
  private code: string;
  private ast: t.File;

  constructor(code: string) {
    this.code = code;
    this.ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  }

  /**
   * 获取组件树
   */
  getComponentTree(): ComponentInfo[] {
    const components: ComponentInfo[] = [];
    let idCounter = 0;

    traverse(this.ast, {
      JSXElement: (path) => {
        const opening = path.node.openingElement;
        const name = t.isJSXIdentifier(opening.name)
          ? opening.name.name
          : 'unknown';

        const info: ComponentInfo = {
          id: `component-${idCounter++}`,
          name,
          location: path.node.loc!,
          props: this.extractProps(opening.attributes),
          className: this.extractClassName(opening.attributes),
          style: this.extractStyle(opening.attributes),
        };

        components.push(info);
      },
    });

    return components;
  }

  /**
   * 更新组件 className
   */
  updateClassName(componentId: string, newClassName: string): string {
    // 根据 componentId 找到对应的 JSX 节点
    // 更新 className 属性
    // 返回生成的新代码
    traverse(this.ast, {
      JSXElement: (path) => {
        if (this.matchComponent(path, componentId)) {
          this.setClassNameAttribute(path.node.openingElement, newClassName);
        }
      },
    });

    return generate(this.ast, { retainLines: true }).code;
  }

  /**
   * 更新组件文本内容
   */
  updateTextContent(componentId: string, newText: string): string {
    traverse(this.ast, {
      JSXElement: (path) => {
        if (this.matchComponent(path, componentId)) {
          // 更新 JSX children 中的文本节点
          path.node.children = [t.jsxText(newText)];
        }
      },
    });

    return generate(this.ast, { retainLines: true }).code;
  }

  /**
   * 更新组件 props
   */
  updateProps(componentId: string, propName: string, propValue: any): string {
    traverse(this.ast, {
      JSXElement: (path) => {
        if (this.matchComponent(path, componentId)) {
          this.setPropAttribute(path.node.openingElement, propName, propValue);
        }
      },
    });

    return generate(this.ast, { retainLines: true }).code;
  }

  // 辅助方法...
  private extractProps(attrs: t.JSXAttribute[]): Record<string, any> { /* ... */ }
  private extractClassName(attrs: t.JSXAttribute[]): string | undefined { /* ... */ }
  private extractStyle(attrs: t.JSXAttribute[]): Record<string, string> | undefined { /* ... */ }
  private matchComponent(path: any, componentId: string): boolean { /* ... */ }
  private setClassNameAttribute(element: t.JSXOpeningElement, className: string): void { /* ... */ }
  private setPropAttribute(element: t.JSXOpeningElement, name: string, value: any): void { /* ... */ }
}
```

### 3.2 代码编辑 API (Backend)

```typescript
// backend/src/routes/code-editor.ts

import { Router } from 'express';
import { AstEditor } from '../services/ast-editor';
import { getProjectFile, updateProjectFile } from '../services/flyio';

const router = Router();

/**
 * GET /api/code-editor/:projectId/components
 * 获取项目的组件树
 */
router.get('/:projectId/components', async (req, res) => {
  const { projectId } = req.params;

  try {
    // 读取 App.tsx 代码
    const file = await getProjectFile(projectId, 'src/App.tsx');
    if (!file) {
      return res.status(404).json({ error: 'App.tsx not found' });
    }

    // 解析组件树
    const editor = new AstEditor(file.content);
    const components = editor.getComponentTree();

    res.json({ components });
  } catch (error) {
    res.status(500).json({ error: 'Failed to parse components' });
  }
});

/**
 * POST /api/code-editor/:projectId/update-class
 * 更新组件的 className
 */
router.post('/:projectId/update-class', async (req, res) => {
  const { projectId } = req.params;
  const { componentId, className } = req.body;

  try {
    const file = await getProjectFile(projectId, 'src/App.tsx');
    if (!file) {
      return res.status(404).json({ error: 'App.tsx not found' });
    }

    const editor = new AstEditor(file.content);
    const newCode = editor.updateClassName(componentId, className);

    // 写入 fly-server (触发 HMR)
    await updateProjectFile(projectId, { path: 'src/App.tsx', content: newCode });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update class' });
  }
});

/**
 * POST /api/code-editor/:projectId/update-text
 * 更新组件的文本内容
 */
router.post('/:projectId/update-text', async (req, res) => {
  const { projectId } = req.params;
  const { componentId, text } = req.body;

  try {
    const file = await getProjectFile(projectId, 'src/App.tsx');
    if (!file) {
      return res.status(404).json({ error: 'App.tsx not found' });
    }

    const editor = new AstEditor(file.content);
    const newCode = editor.updateTextContent(componentId, text);

    await updateProjectFile(projectId, { path: 'src/App.tsx', content: newCode });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update text' });
  }
});

export default router;
```

### 3.3 前端组件选择器

```typescript
// frontend/src/hooks/useComponentSelector.ts

import { useState, useEffect, useCallback } from 'react';

interface SelectedComponent {
  id: string;
  name: string;
  className: string;
  textContent: string;
  bounds: DOMRect;
}

export function useComponentSelector(iframeRef: React.RefObject<HTMLIFrameElement>) {
  const [selectedComponent, setSelectedComponent] = useState<SelectedComponent | null>(null);
  const [hoveredComponent, setHoveredComponent] = useState<SelectedComponent | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'COMPONENT_SELECTED') {
        setSelectedComponent(event.data.component);
      } else if (event.data.type === 'COMPONENT_HOVERED') {
        setHoveredComponent(event.data.component);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [iframeRef]);

  const clearSelection = useCallback(() => {
    setSelectedComponent(null);
    iframeRef.current?.contentWindow?.postMessage({ type: 'CLEAR_SELECTION' }, '*');
  }, [iframeRef]);

  return {
    selectedComponent,
    hoveredComponent,
    clearSelection,
  };
}
```

### 3.4 属性面板组件

```typescript
// frontend/src/components/PropertyPanel.tsx

import { useState, useEffect } from 'react';
import { updateComponentClass, updateComponentText } from '../services/api';

interface PropertyPanelProps {
  projectId: string;
  component: {
    id: string;
    name: string;
    className: string;
    textContent: string;
  } | null;
  onUpdate: () => void;
}

// Tailwind 类名分类
const tailwindCategories = {
  spacing: ['p-', 'm-', 'gap-', 'space-'],
  sizing: ['w-', 'h-', 'max-', 'min-'],
  colors: ['bg-', 'text-', 'border-'],
  typography: ['font-', 'text-', 'leading-'],
  layout: ['flex', 'grid', 'block', 'hidden'],
  effects: ['shadow', 'rounded', 'opacity'],
};

export function PropertyPanel({ projectId, component, onUpdate }: PropertyPanelProps) {
  const [className, setClassName] = useState('');
  const [textContent, setTextContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (component) {
      setClassName(component.className);
      setTextContent(component.textContent);
    }
  }, [component]);

  const handleClassChange = async (newClass: string) => {
    setClassName(newClass);
    setIsUpdating(true);
    try {
      await updateComponentClass(projectId, component!.id, newClass);
      onUpdate();
    } finally {
      setIsUpdating(false);
    }
  };

  const handleTextChange = async (newText: string) => {
    setTextContent(newText);
    setIsUpdating(true);
    try {
      await updateComponentText(projectId, component!.id, newText);
      onUpdate();
    } finally {
      setIsUpdating(false);
    }
  };

  if (!component) {
    return (
      <div className="p-4 text-gray-500 text-center">
        点击预览中的元素进行编辑
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-gray-800">
        &lt;{component.name}&gt;
      </h3>

      {/* 文本编辑 */}
      {component.textContent && (
        <div>
          <label className="block text-sm text-gray-600 mb-1">文本内容</label>
          <input
            type="text"
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            onBlur={() => handleTextChange(textContent)}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      )}

      {/* Tailwind 类名编辑 */}
      <div>
        <label className="block text-sm text-gray-600 mb-1">Tailwind Classes</label>
        <textarea
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          onBlur={() => handleClassChange(className)}
          className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
          rows={3}
        />
      </div>

      {/* 快捷样式按钮 */}
      <div>
        <label className="block text-sm text-gray-600 mb-2">快捷样式</label>
        <div className="flex flex-wrap gap-1">
          {['p-4', 'p-6', 'p-8', 'rounded-lg', 'shadow-lg', 'bg-blue-500', 'text-white'].map((cls) => (
            <button
              key={cls}
              onClick={() => handleClassChange(`${className} ${cls}`.trim())}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            >
              +{cls}
            </button>
          ))}
        </div>
      </div>

      {isUpdating && (
        <div className="text-sm text-blue-500">正在更新...</div>
      )}
    </div>
  );
}
```

### 3.5 预览注入脚本

```typescript
// packages/visual-editor/src/preview-injector.ts
// 注入到预览 iframe 中的脚本

(function() {
  let selectedElement: HTMLElement | null = null;
  let hoverOverlay: HTMLElement | null = null;
  let selectOverlay: HTMLElement | null = null;

  // 创建高亮覆盖层
  function createOverlay(color: string): HTMLElement {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      border: 2px solid ${color};
      background: ${color}20;
      z-index: 99999;
      transition: all 0.1s ease;
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  // 更新覆盖层位置
  function updateOverlay(overlay: HTMLElement, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }

  // 获取组件信息
  function getComponentInfo(element: HTMLElement) {
    return {
      id: element.dataset.componentId || element.getAttribute('data-component-id') || generateId(element),
      name: element.tagName.toLowerCase(),
      className: element.className,
      textContent: element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE
        ? element.textContent || ''
        : '',
      bounds: element.getBoundingClientRect(),
    };
  }

  // 生成元素 ID
  function generateId(element: HTMLElement): string {
    const path: string[] = [];
    let el: HTMLElement | null = element;
    while (el && el !== document.body) {
      const index = Array.from(el.parentElement?.children || []).indexOf(el);
      path.unshift(`${el.tagName.toLowerCase()}[${index}]`);
      el = el.parentElement;
    }
    return path.join('/');
  }

  // 点击处理
  document.addEventListener('click', (e) => {
    if (!window.__EDIT_MODE_ENABLED__) return;

    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    selectedElement = target;

    if (!selectOverlay) {
      selectOverlay = createOverlay('#3b82f6');
    }
    updateOverlay(selectOverlay, target);

    window.parent.postMessage({
      type: 'COMPONENT_SELECTED',
      component: getComponentInfo(target),
    }, '*');
  }, true);

  // 悬停处理
  document.addEventListener('mouseover', (e) => {
    if (!window.__EDIT_MODE_ENABLED__) return;

    const target = e.target as HTMLElement;
    if (target === selectedElement) return;

    if (!hoverOverlay) {
      hoverOverlay = createOverlay('#10b981');
    }
    updateOverlay(hoverOverlay, target);

    window.parent.postMessage({
      type: 'COMPONENT_HOVERED',
      component: getComponentInfo(target),
    }, '*');
  });

  // 监听父窗口消息
  window.addEventListener('message', (e) => {
    if (e.data.type === 'ENABLE_EDIT_MODE') {
      window.__EDIT_MODE_ENABLED__ = true;
      document.body.style.cursor = 'crosshair';
    } else if (e.data.type === 'DISABLE_EDIT_MODE') {
      window.__EDIT_MODE_ENABLED__ = false;
      document.body.style.cursor = '';
      hoverOverlay?.remove();
      selectOverlay?.remove();
      hoverOverlay = null;
      selectOverlay = null;
    } else if (e.data.type === 'CLEAR_SELECTION') {
      selectedElement = null;
      selectOverlay?.remove();
      selectOverlay = null;
    }
  });
})();
```

### 3.6 元素匹配策略

由于生成的代码中没有 `data-jsx-id` 或 `data-component-id` 属性，需要使用 **文本匹配** 策略将 DOM 元素映射到源代码中的 JSX 节点。

#### 匹配流程

```
┌────────────────────────────────────────────────────────────────────────┐
│                        元素匹配策略                                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. 用户点击元素，获取:                                                  │
│     - textContent (原始文本)                                            │
│     - tagName (标签名)                                                  │
│     - className (类名)                                                  │
│                                                                         │
│  2. 用户编辑属性，保存时发送:                                            │
│     - originalText: 原始文本内容                                        │
│     - newText: 修改后的文本                                             │
│     - tagName: 元素标签 (可选, 用于精确匹配)                             │
│                                                                         │
│  3. AST 编辑器遍历 JSX 树:                                              │
│     - 查找 textContent === originalText 的节点                          │
│     - 可选: 验证 tagName 匹配                                           │
│     - 替换节点的 children 为新文本                                       │
│                                                                         │
│  4. 生成新代码，写入 fly-server                                         │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

#### 实现代码

```typescript
// backend/src/services/ast/index.ts

/**
 * 根据文本内容执行编辑操作
 * 当源代码中没有 data-jsx-id 时使用此方法
 */
async editByText(
  code: string,
  filePath: string,
  originalText: string,
  newText: string,
  tagName?: string
): Promise<AstEditResult> {
  const ast = this.parse(code, filePath);
  const normalizedOriginal = originalText.trim();
  let modified = false;

  const newAst = this.transformAST(ast, (node, parent) => {
    if (modified) return node;

    if (node.type === 'JSXOpeningElement') {
      const parentObj = parent as { type: string; children: unknown[] };
      if (parentObj?.type !== 'JSXElement') return node;

      // 检查标签名
      const elementName = this.getElementName(node.name);
      if (tagName && elementName.toLowerCase() !== tagName.toLowerCase()) return node;

      // 检查文本内容
      const nodeText = this.extractTextContent(parentObj.children);
      if (nodeText?.trim() === normalizedOriginal) {
        modified = true;
        parentObj.children = [this.createJSXText(newText)];
      }
    }
    return node;
  });

  if (!modified) {
    return { success: false, error: `Text not found: "${originalText}"` };
  }

  return { success: true, code: this.generate(newAst) };
}
```

#### API 更新

```typescript
// POST /api/code-editor/:projectId/update-text
// Request body:
{
  "componentId": "2-252-24",      // 运行时 ID (备用)
  "text": "New text content",     // 新文本
  "originalText": "Old text",     // 原始文本 (用于匹配)
  "tagName": "span",              // 标签名 (可选, 用于精确匹配)
  "file": "src/App.tsx"           // 文件路径
}
```

#### 限制与注意事项

| 场景 | 处理方式 |
|------|---------|
| 重复文本 | 只修改第一个匹配项 |
| 空文本 | 不支持，需要其他匹配策略 |
| 动态文本 | 不支持 (如 `{variable}`) |
| 嵌套文本 | 只匹配直接文本子节点 |

---

## 4. API 设计

### 4.1 代码编辑 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/code-editor/:projectId/components` | 获取组件树 |
| GET | `/api/code-editor/:projectId/component/:componentId` | 获取单个组件详情 |
| POST | `/api/code-editor/:projectId/update-class` | 更新 className |
| POST | `/api/code-editor/:projectId/update-text` | 更新文本内容 |
| POST | `/api/code-editor/:projectId/update-props` | 更新组件属性 |
| POST | `/api/code-editor/:projectId/update-style` | 更新内联样式 |

### 4.2 请求/响应示例

```typescript
// GET /api/code-editor/:projectId/components
// Response:
{
  "components": [
    {
      "id": "component-0",
      "name": "div",
      "className": "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100",
      "location": { "start": { "line": 5, "column": 4 }, "end": { "line": 20, "column": 5 } },
      "children": [
        {
          "id": "component-1",
          "name": "h1",
          "className": "text-3xl font-bold text-gray-800",
          "textContent": "Hello World"
        }
      ]
    }
  ]
}

// POST /api/code-editor/:projectId/update-class
// Request:
{
  "componentId": "component-1",
  "className": "text-4xl font-extrabold text-blue-600"
}
// Response:
{
  "success": true
}
```

---

## 5. 集成 packages/ 模块

### 5.1 模块对应关系

| packages/ 模块 | 集成位置 | 说明 |
|---------------|---------|------|
| `ast-processor` | backend/services | AST 解析和代码生成 |
| `visual-editor` | frontend/components | 属性面板和组件树 |
| `hmr-system` | fly-server/services | HMR 消息处理 |

### 5.2 集成步骤

```bash
# 1. 将 ast-processor 集成到 backend
cp -r packages/ast-processor/src/* backend/src/services/ast/

# 2. 将 visual-editor 组件集成到 frontend
cp -r packages/visual-editor/src/components/* frontend/src/components/editor/

# 3. 更新依赖
cd backend && bun add @babel/parser @babel/traverse @babel/generator @babel/types
cd frontend && bun add @radix-ui/react-tabs @radix-ui/react-tooltip
```

---

## 6. 测试计划

### 6.1 单元测试

```typescript
// backend/tests/ast-editor.test.ts

import { describe, test, expect } from 'bun:test';
import { AstEditor } from '../src/services/ast-editor';

describe('AstEditor', () => {
  const sampleCode = `
    export default function App() {
      return (
        <div className="container">
          <h1 className="title">Hello World</h1>
        </div>
      );
    }
  `;

  test('should parse component tree', () => {
    const editor = new AstEditor(sampleCode);
    const tree = editor.getComponentTree();

    expect(tree.length).toBeGreaterThan(0);
    expect(tree[0].name).toBe('div');
  });

  test('should update className', () => {
    const editor = new AstEditor(sampleCode);
    const newCode = editor.updateClassName('component-0', 'new-class');

    expect(newCode).toContain('className="new-class"');
  });

  test('should update text content', () => {
    const editor = new AstEditor(sampleCode);
    const newCode = editor.updateTextContent('component-1', 'New Title');

    expect(newCode).toContain('New Title');
  });
});
```

### 6.2 端到端测试

```typescript
// e2e/visual-editor.test.ts

describe('Visual Editor E2E', () => {
  test('should select component and update class', async () => {
    // 1. 创建项目
    const project = await createProject({ description: 'Test app' });

    // 2. 等待预览加载
    await waitForPreview(project.id);

    // 3. 点击组件
    await clickElement('[data-testid="heading"]');

    // 4. 修改 className
    await updateClassName('text-4xl font-bold text-blue-500');

    // 5. 验证 HMR 更新
    await waitForHmrUpdate();

    // 6. 验证代码已更新
    const code = await getProjectFile(project.id, 'src/App.tsx');
    expect(code).toContain('text-4xl font-bold text-blue-500');
  });
});
```

---

## 7. 性能要求

| 指标 | 目标值 | 测量方法 |
|------|--------|---------|
| AST 解析时间 | < 100ms | 1000 行代码 |
| 代码生成时间 | < 50ms | 单次更新 |
| HMR 更新延迟 | < 500ms | 从修改到预览更新 |
| 组件树渲染 | < 100ms | 100 个组件 |

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| AST 解析复杂代码失败 | 编辑功能不可用 | 回退到文本编辑模式 |
| HMR 连接不稳定 | 预览不同步 | 添加重连机制 + 手动刷新 |
| 跨域问题 | iframe 通信失败 | 使用代理或 CORS 配置 |
| 大文件性能 | 编辑卡顿 | 增量解析 + 虚拟滚动 |

---

## 9. 里程碑

| 日期 | 里程碑 | 交付物 |
|------|--------|--------|
| Week 13 Day 3 | M7.1 | AST 编辑服务 + API |
| Week 13 Day 5 | M7.2 | 组件选择器 + 属性面板 |
| Week 14 Day 3 | M7.3 | HMR 集成 + 组件树 |
| Week 14 Day 5 | M7.4 | E2E 测试 + 性能优化 |
