# SPEC-0003: Visual Editor 升级版

> **阶段**: M3 (第 5-6 周)
> **状态**: 待开始
> **优先级**: P0 - 用户体验
> **依赖**: SPEC-0001, SPEC-0002

---

## 1. 目标概述

### 1.1 核心目标

升级 Visual Editor 界面和交互体验，实现与 Lovable 同等水平的可视化编辑能力。

### 1.2 交付物清单

| 序号 | 交付物 | 描述 | 验收标准 |
|------|--------|------|---------|
| D1 | 元素选择系统 | 点击选中 + 高亮 | 精确选中，视觉反馈清晰 |
| D2 | 属性编辑面板 | 分类样式编辑器 | 支持所有常用 CSS 属性 |
| D3 | 双向绑定 | UI ↔ 源码映射 | 点击定位，修改同步 |
| D4 | 乐观更新 | 即时 DOM 反馈 | < 50ms 响应 |
| D5 | 代码预览 | 实时代码展示 | 修改即时反映 |

---

## 2. 系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Visual Editor 系统                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                        编辑器主框架                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │ │
│  │  │   工具栏     │  │   预览区域   │  │      属性面板        │ │ │
│  │  │  - 撤销/重做 │  │   (iframe)   │  │  - 样式编辑         │ │ │
│  │  │  - 设备切换  │  │   - 元素选择 │  │  - 属性编辑         │ │ │
│  │  │  - 保存     │  │   - 高亮显示 │  │  - 布局编辑         │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                               │                                      │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      通信层 (postMessage)                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │ │
│  │  │ 元素选择事件 │  │ 属性更新事件 │  │    HTML 同步事件    │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                               │                                      │
│                               ▼                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      数据处理层                                  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │ │
│  │  │  AST 处理器  │  │ Tailwind 映射│  │    编辑历史管理     │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘ │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 文件结构

```
packages/visual-editor/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # 主入口
│   ├── components/
│   │   ├── Editor.tsx              # 编辑器主组件
│   │   ├── Toolbar/
│   │   │   ├── index.tsx
│   │   │   ├── DeviceSelector.tsx
│   │   │   ├── HistoryButtons.tsx
│   │   │   └── SaveButton.tsx
│   │   ├── Preview/
│   │   │   ├── index.tsx
│   │   │   ├── IframeWrapper.tsx
│   │   │   └── ElementHighlight.tsx
│   │   ├── PropertyPanel/
│   │   │   ├── index.tsx
│   │   │   ├── tabs/
│   │   │   │   ├── StyleTab.tsx
│   │   │   │   ├── LayoutTab.tsx
│   │   │   │   ├── SpacingTab.tsx
│   │   │   │   ├── EffectsTab.tsx
│   │   │   │   └── AttributesTab.tsx
│   │   │   ├── controls/
│   │   │   │   ├── ColorPicker.tsx
│   │   │   │   ├── SizeInput.tsx
│   │   │   │   ├── SpacingBox.tsx
│   │   │   │   ├── SelectControl.tsx
│   │   │   │   ├── SliderControl.tsx
│   │   │   │   └── TextInput.tsx
│   │   │   └── ElementInfo.tsx
│   │   └── CodePreview/
│   │       ├── index.tsx
│   │       └── SyntaxHighlight.tsx
│   ├── hooks/
│   │   ├── useEditHistory.ts
│   │   ├── useElementSelection.ts
│   │   ├── useIframeCommunication.ts
│   │   ├── usePropertySync.ts
│   │   └── useOptimisticUpdate.ts
│   ├── services/
│   │   ├── element-bridge.ts       # 父子窗口通信
│   │   ├── style-extractor.ts      # 样式提取
│   │   └── code-sync.ts            # 代码同步
│   ├── stores/
│   │   ├── editor-store.ts         # 编辑器状态
│   │   └── selection-store.ts      # 选择状态
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       ├── css-parser.ts
│       └── class-utils.ts
├── injection/
│   ├── visual-edit-script.ts       # 注入脚本
│   └── highlight-styles.css        # 高亮样式
└── tests/
    └── ...
```

---

## 3. 核心组件规格

### 3.1 注入脚本 (visual-edit-script.ts)

```typescript
// injection/visual-edit-script.ts

/**
 * Visual Edit 注入脚本
 * 在 iframe 中运行，处理元素选择和高亮
 */

interface SelectedElementInfo {
  jsxId: string;
  tagName: string;
  className: string;
  textContent: string;
  computedStyles: Record<string, string>;
  boundingRect: DOMRect;
  attributes: Record<string, string>;
  path: string[];  // DOM 路径
}

interface UpdatePayload {
  jsxId: string;
  type: 'text' | 'className' | 'style' | 'attribute';
  value: any;
}

class VisualEditController {
  private selectedElement: HTMLElement | null = null;
  private hoveredElement: HTMLElement | null = null;
  private highlightOverlay: HTMLElement | null = null;
  private hoverOverlay: HTMLElement | null = null;
  private isEditMode = false;

  constructor() {
    this.init();
  }

  private init(): void {
    this.createOverlays();
    this.setupEventListeners();
    this.setupMessageHandler();
  }

  // ========== 覆盖层管理 ==========

  private createOverlays(): void {
    // 选中高亮层
    this.highlightOverlay = document.createElement('div');
    this.highlightOverlay.id = '__visual_edit_highlight__';
    this.highlightOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      z-index: 999999;
      display: none;
      transition: all 0.1s ease-out;
    `;

    // 悬停预览层
    this.hoverOverlay = document.createElement('div');
    this.hoverOverlay.id = '__visual_edit_hover__';
    this.hoverOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      border: 1px dashed #9ca3af;
      background: rgba(156, 163, 175, 0.05);
      z-index: 999998;
      display: none;
      transition: all 0.05s ease-out;
    `;

    document.body.appendChild(this.highlightOverlay);
    document.body.appendChild(this.hoverOverlay);
  }

  private updateHighlight(element: HTMLElement | null, overlay: HTMLElement): void {
    if (!element) {
      overlay.style.display = 'none';
      return;
    }

    const rect = element.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }

  // ========== 事件监听 ==========

  private setupEventListeners(): void {
    // 鼠标移动 - 悬停预览
    document.addEventListener('mousemove', (e) => {
      if (!this.isEditMode) return;

      const target = this.findEditableElement(e.target as HTMLElement);
      if (target && target !== this.selectedElement) {
        this.hoveredElement = target;
        this.updateHighlight(target, this.hoverOverlay!);
      } else {
        this.hoveredElement = null;
        this.updateHighlight(null, this.hoverOverlay!);
      }
    });

    // 点击 - 选中元素
    document.addEventListener('click', (e) => {
      if (!this.isEditMode) return;

      e.preventDefault();
      e.stopPropagation();

      const target = this.findEditableElement(e.target as HTMLElement);
      if (target) {
        this.selectElement(target);
      }
    }, true);

    // 双击 - 进入文本编辑
    document.addEventListener('dblclick', (e) => {
      if (!this.isEditMode || !this.selectedElement) return;

      e.preventDefault();
      this.enterTextEditMode();
    }, true);

    // 键盘事件
    document.addEventListener('keydown', (e) => {
      if (!this.isEditMode) return;

      if (e.key === 'Escape') {
        this.exitTextEditMode();
        this.deselectElement();
      }
    });

    // 滚动时更新高亮位置
    window.addEventListener('scroll', () => {
      if (this.selectedElement) {
        this.updateHighlight(this.selectedElement, this.highlightOverlay!);
      }
    }, true);

    // 窗口大小变化
    window.addEventListener('resize', () => {
      if (this.selectedElement) {
        this.updateHighlight(this.selectedElement, this.highlightOverlay!);
      }
    });
  }

  // ========== 消息处理 ==========

  private setupMessageHandler(): void {
    window.addEventListener('message', (e) => {
      const { type, payload } = e.data || {};

      switch (type) {
        case 'ENABLE_EDIT_MODE':
          this.enableEditMode();
          break;

        case 'DISABLE_EDIT_MODE':
          this.disableEditMode();
          break;

        case 'UPDATE_ELEMENT':
          this.handleElementUpdate(payload);
          break;

        case 'SELECT_BY_JSX_ID':
          this.selectByJsxId(payload.jsxId);
          break;

        case 'GET_FULL_HTML':
          this.sendFullHtml();
          break;

        case 'HIGHLIGHT_ELEMENT':
          this.highlightByJsxId(payload.jsxId);
          break;
      }
    });
  }

  // ========== 元素选择 ==========

  private findEditableElement(element: HTMLElement): HTMLElement | null {
    // 向上查找带有 data-jsx-id 的元素
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      if (current.hasAttribute('data-jsx-id')) {
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  private selectElement(element: HTMLElement): void {
    this.selectedElement = element;
    this.updateHighlight(element, this.highlightOverlay!);

    // 发送选中信息到父窗口
    const info = this.extractElementInfo(element);
    this.postMessage('ELEMENT_SELECTED', info);
  }

  private selectByJsxId(jsxId: string): void {
    const element = document.querySelector(`[data-jsx-id="${jsxId}"]`) as HTMLElement;
    if (element) {
      this.selectElement(element);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private deselectElement(): void {
    this.selectedElement = null;
    this.updateHighlight(null, this.highlightOverlay!);
    this.postMessage('ELEMENT_DESELECTED', null);
  }

  private highlightByJsxId(jsxId: string): void {
    const element = document.querySelector(`[data-jsx-id="${jsxId}"]`) as HTMLElement;
    if (element) {
      this.updateHighlight(element, this.hoverOverlay!);
      setTimeout(() => {
        if (this.hoveredElement !== element) {
          this.updateHighlight(null, this.hoverOverlay!);
        }
      }, 1000);
    }
  }

  // ========== 信息提取 ==========

  private extractElementInfo(element: HTMLElement): SelectedElementInfo {
    const computedStyles = window.getComputedStyle(element);
    const relevantStyles: Record<string, string> = {};

    // 提取相关样式属性
    const styleProps = [
      'color', 'backgroundColor', 'fontSize', 'fontWeight', 'fontFamily',
      'lineHeight', 'textAlign', 'padding', 'paddingTop', 'paddingRight',
      'paddingBottom', 'paddingLeft', 'margin', 'marginTop', 'marginRight',
      'marginBottom', 'marginLeft', 'width', 'height', 'maxWidth', 'minWidth',
      'display', 'flexDirection', 'justifyContent', 'alignItems', 'gap',
      'borderRadius', 'borderWidth', 'borderColor', 'borderStyle',
      'boxShadow', 'opacity', 'position', 'top', 'right', 'bottom', 'left',
    ];

    for (const prop of styleProps) {
      relevantStyles[prop] = computedStyles.getPropertyValue(
        prop.replace(/([A-Z])/g, '-$1').toLowerCase()
      );
    }

    // 提取属性
    const attributes: Record<string, string> = {};
    for (const attr of element.attributes) {
      if (!attr.name.startsWith('data-jsx-')) {
        attributes[attr.name] = attr.value;
      }
    }

    // 计算 DOM 路径
    const path = this.getElementPath(element);

    return {
      jsxId: element.getAttribute('data-jsx-id') || '',
      tagName: element.tagName.toLowerCase(),
      className: element.className,
      textContent: this.getDirectTextContent(element),
      computedStyles: relevantStyles,
      boundingRect: element.getBoundingClientRect(),
      attributes,
      path,
    };
  }

  private getDirectTextContent(element: HTMLElement): string {
    // 只获取直接子文本节点
    let text = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  private getElementPath(element: HTMLElement): string[] {
    const path: string[] = [];
    let current: HTMLElement | null = element;

    while (current && current !== document.body) {
      const jsxId = current.getAttribute('data-jsx-id');
      if (jsxId) {
        path.unshift(jsxId);
      }
      current = current.parentElement;
    }

    return path;
  }

  // ========== 元素更新 ==========

  private handleElementUpdate(payload: UpdatePayload): void {
    const element = document.querySelector(
      `[data-jsx-id="${payload.jsxId}"]`
    ) as HTMLElement;

    if (!element) return;

    switch (payload.type) {
      case 'text':
        this.updateElementText(element, payload.value);
        break;
      case 'className':
        this.updateElementClassName(element, payload.value);
        break;
      case 'style':
        this.updateElementStyle(element, payload.value);
        break;
      case 'attribute':
        this.updateElementAttribute(element, payload.value);
        break;
    }

    // 更新高亮位置
    if (element === this.selectedElement) {
      this.updateHighlight(element, this.highlightOverlay!);
    }
  }

  private updateElementText(element: HTMLElement, text: string): void {
    // 保留子元素，只更新文本节点
    const textNodes = Array.from(element.childNodes).filter(
      node => node.nodeType === Node.TEXT_NODE
    );

    if (textNodes.length > 0) {
      textNodes[0].textContent = text;
    } else {
      element.prepend(document.createTextNode(text));
    }
  }

  private updateElementClassName(element: HTMLElement, className: string): void {
    // 保留 JSX 相关的类名
    const jsxClasses = Array.from(element.classList).filter(
      cls => cls.startsWith('__jsx_')
    );
    element.className = [...jsxClasses, ...className.split(' ')].join(' ');
  }

  private updateElementStyle(element: HTMLElement, styles: Record<string, string>): void {
    for (const [prop, value] of Object.entries(styles)) {
      element.style.setProperty(
        prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
        value
      );
    }
  }

  private updateElementAttribute(element: HTMLElement, attr: { name: string; value: string | null }): void {
    if (attr.value === null) {
      element.removeAttribute(attr.name);
    } else {
      element.setAttribute(attr.name, attr.value);
    }
  }

  // ========== 文本编辑模式 ==========

  private enterTextEditMode(): void {
    if (!this.selectedElement) return;

    this.selectedElement.contentEditable = 'true';
    this.selectedElement.focus();

    // 选中所有文本
    const range = document.createRange();
    range.selectNodeContents(this.selectedElement);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    // 更新高亮样式
    this.highlightOverlay!.style.borderColor = '#8b5cf6';

    // 监听输入
    this.selectedElement.addEventListener('input', this.handleTextInput);
    this.selectedElement.addEventListener('blur', this.handleTextBlur);
  }

  private exitTextEditMode(): void {
    if (!this.selectedElement) return;

    this.selectedElement.contentEditable = 'false';
    this.highlightOverlay!.style.borderColor = '#3b82f6';

    this.selectedElement.removeEventListener('input', this.handleTextInput);
    this.selectedElement.removeEventListener('blur', this.handleTextBlur);
  }

  private handleTextInput = (): void => {
    if (!this.selectedElement) return;

    const text = this.getDirectTextContent(this.selectedElement);
    this.postMessage('TEXT_CHANGED', {
      jsxId: this.selectedElement.getAttribute('data-jsx-id'),
      text,
    });
  };

  private handleTextBlur = (): void => {
    this.exitTextEditMode();
  };

  // ========== 模式控制 ==========

  private enableEditMode(): void {
    this.isEditMode = true;
    document.body.style.cursor = 'crosshair';
    this.postMessage('EDIT_MODE_ENABLED', null);
  }

  private disableEditMode(): void {
    this.isEditMode = false;
    document.body.style.cursor = '';
    this.deselectElement();
    this.postMessage('EDIT_MODE_DISABLED', null);
  }

  // ========== HTML 导出 ==========

  private sendFullHtml(): void {
    // 克隆 body
    const clone = document.body.cloneNode(true) as HTMLElement;

    // 移除编辑器相关元素
    const editorElements = clone.querySelectorAll(
      '[id^="__visual_edit_"]'
    );
    editorElements.forEach(el => el.remove());

    // 清理 contentEditable
    clone.querySelectorAll('[contenteditable]').forEach(el => {
      el.removeAttribute('contenteditable');
    });

    // 获取完整 HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
${document.head.innerHTML}
</head>
<body>
${clone.innerHTML}
</body>
</html>`;

    this.postMessage('FULL_HTML', { html });
  }

  // ========== 通信 ==========

  private postMessage(type: string, payload: any): void {
    window.parent.postMessage({ type, payload }, '*');
  }
}

// 初始化
if (typeof window !== 'undefined') {
  new VisualEditController();
}
```

---

### 3.2 属性编辑面板

#### 3.2.1 面板主组件

```typescript
// src/components/PropertyPanel/index.tsx

import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editor-store';
import StyleTab from './tabs/StyleTab';
import LayoutTab from './tabs/LayoutTab';
import SpacingTab from './tabs/SpacingTab';
import EffectsTab from './tabs/EffectsTab';
import AttributesTab from './tabs/AttributesTab';
import ElementInfo from './ElementInfo';

type TabId = 'style' | 'layout' | 'spacing' | 'effects' | 'attributes';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'style', label: '样式', icon: '🎨' },
  { id: 'layout', label: '布局', icon: '📐' },
  { id: 'spacing', label: '间距', icon: '↔️' },
  { id: 'effects', label: '效果', icon: '✨' },
  { id: 'attributes', label: '属性', icon: '⚙️' },
];

export default function PropertyPanel() {
  const [activeTab, setActiveTab] = useState<TabId>('style');
  const selectedElement = useEditorStore(state => state.selectedElement);

  if (!selectedElement) {
    return (
      <div className="property-panel empty">
        <div className="empty-state">
          <p>点击页面中的元素开始编辑</p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'style':
        return <StyleTab element={selectedElement} />;
      case 'layout':
        return <LayoutTab element={selectedElement} />;
      case 'spacing':
        return <SpacingTab element={selectedElement} />;
      case 'effects':
        return <EffectsTab element={selectedElement} />;
      case 'attributes':
        return <AttributesTab element={selectedElement} />;
    }
  };

  return (
    <div className="property-panel">
      {/* 元素信息 */}
      <ElementInfo element={selectedElement} />

      {/* 标签页导航 */}
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <span className="icon">{tab.icon}</span>
            <span className="label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 标签内容 */}
      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
}
```

#### 3.2.2 样式标签页

```typescript
// src/components/PropertyPanel/tabs/StyleTab.tsx

import React from 'react';
import { usePropertySync } from '../../../hooks/usePropertySync';
import ColorPicker from '../controls/ColorPicker';
import SelectControl from '../controls/SelectControl';
import SizeInput from '../controls/SizeInput';
import type { SelectedElementInfo } from '../../../types';

interface StyleTabProps {
  element: SelectedElementInfo;
}

const FONT_SIZES = [
  { value: 'text-xs', label: '12px (xs)' },
  { value: 'text-sm', label: '14px (sm)' },
  { value: 'text-base', label: '16px (base)' },
  { value: 'text-lg', label: '18px (lg)' },
  { value: 'text-xl', label: '20px (xl)' },
  { value: 'text-2xl', label: '24px (2xl)' },
  { value: 'text-3xl', label: '30px (3xl)' },
  { value: 'text-4xl', label: '36px (4xl)' },
  { value: 'text-5xl', label: '48px (5xl)' },
];

const FONT_WEIGHTS = [
  { value: 'font-light', label: 'Light (300)' },
  { value: 'font-normal', label: 'Normal (400)' },
  { value: 'font-medium', label: 'Medium (500)' },
  { value: 'font-semibold', label: 'Semibold (600)' },
  { value: 'font-bold', label: 'Bold (700)' },
];

const TEXT_ALIGNS = [
  { value: 'text-left', label: '左对齐' },
  { value: 'text-center', label: '居中' },
  { value: 'text-right', label: '右对齐' },
  { value: 'text-justify', label: '两端对齐' },
];

export default function StyleTab({ element }: StyleTabProps) {
  const { updateStyle, getCurrentClasses } = usePropertySync(element.jsxId);
  const currentClasses = getCurrentClasses();

  const handleFontSizeChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: FONT_SIZES.map(s => s.value).filter(v => v !== value),
    });
  };

  const handleFontWeightChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: FONT_WEIGHTS.map(w => w.value).filter(v => v !== value),
    });
  };

  const handleTextAlignChange = (value: string) => {
    updateStyle({
      addClasses: [value],
      removeClasses: TEXT_ALIGNS.map(a => a.value).filter(v => v !== value),
    });
  };

  const handleColorChange = (color: string) => {
    // 移除现有文字颜色类，添加新的
    const newClass = `text-[${color}]`;
    updateStyle({
      addClasses: [newClass],
      removeClasses: currentClasses.filter(c => c.startsWith('text-[#') || c.startsWith('text-[')),
    });
  };

  const handleBgColorChange = (color: string) => {
    const newClass = `bg-[${color}]`;
    updateStyle({
      addClasses: [newClass],
      removeClasses: currentClasses.filter(c => c.startsWith('bg-[#') || c.startsWith('bg-[')),
    });
  };

  return (
    <div className="style-tab">
      {/* 文字颜色 */}
      <div className="property-group">
        <label>文字颜色</label>
        <ColorPicker
          value={element.computedStyles.color}
          onChange={handleColorChange}
        />
      </div>

      {/* 背景颜色 */}
      <div className="property-group">
        <label>背景颜色</label>
        <ColorPicker
          value={element.computedStyles.backgroundColor}
          onChange={handleBgColorChange}
        />
      </div>

      {/* 字号 */}
      <div className="property-group">
        <label>字号</label>
        <SelectControl
          options={FONT_SIZES}
          value={findCurrentClass(currentClasses, FONT_SIZES)}
          onChange={handleFontSizeChange}
        />
      </div>

      {/* 字重 */}
      <div className="property-group">
        <label>字重</label>
        <SelectControl
          options={FONT_WEIGHTS}
          value={findCurrentClass(currentClasses, FONT_WEIGHTS)}
          onChange={handleFontWeightChange}
        />
      </div>

      {/* 对齐 */}
      <div className="property-group">
        <label>对齐方式</label>
        <SelectControl
          options={TEXT_ALIGNS}
          value={findCurrentClass(currentClasses, TEXT_ALIGNS)}
          onChange={handleTextAlignChange}
        />
      </div>
    </div>
  );
}

function findCurrentClass(
  classes: string[],
  options: { value: string }[]
): string {
  const values = options.map(o => o.value);
  return classes.find(c => values.includes(c)) || '';
}
```

#### 3.2.3 间距编辑器

```typescript
// src/components/PropertyPanel/tabs/SpacingTab.tsx

import React from 'react';
import { usePropertySync } from '../../../hooks/usePropertySync';
import SpacingBox from '../controls/SpacingBox';
import type { SelectedElementInfo } from '../../../types';

interface SpacingTabProps {
  element: SelectedElementInfo;
}

export default function SpacingTab({ element }: SpacingTabProps) {
  const { updateStyle, getCurrentClasses } = usePropertySync(element.jsxId);
  const currentClasses = getCurrentClasses();

  const handlePaddingChange = (side: string, value: string) => {
    const prefix = side === 'all' ? 'p' : `p${side[0]}`;
    const newClass = `${prefix}-${value}`;

    // 移除同类型的旧类
    const oldClasses = currentClasses.filter(c => {
      if (side === 'all') return c.match(/^p-/);
      return c.match(new RegExp(`^p${side[0]}-`));
    });

    updateStyle({
      addClasses: [newClass],
      removeClasses: oldClasses,
    });
  };

  const handleMarginChange = (side: string, value: string) => {
    const prefix = side === 'all' ? 'm' : `m${side[0]}`;
    const newClass = `${prefix}-${value}`;

    const oldClasses = currentClasses.filter(c => {
      if (side === 'all') return c.match(/^m-/);
      return c.match(new RegExp(`^m${side[0]}-`));
    });

    updateStyle({
      addClasses: [newClass],
      removeClasses: oldClasses,
    });
  };

  return (
    <div className="spacing-tab">
      {/* Padding */}
      <div className="spacing-section">
        <h4>内边距 (Padding)</h4>
        <SpacingBox
          type="padding"
          values={extractSpacingValues(currentClasses, 'p')}
          onChange={handlePaddingChange}
        />
      </div>

      {/* Margin */}
      <div className="spacing-section">
        <h4>外边距 (Margin)</h4>
        <SpacingBox
          type="margin"
          values={extractSpacingValues(currentClasses, 'm')}
          onChange={handleMarginChange}
        />
      </div>
    </div>
  );
}

function extractSpacingValues(
  classes: string[],
  prefix: string
): Record<string, string> {
  const result: Record<string, string> = {
    top: '0', right: '0', bottom: '0', left: '0'
  };

  for (const cls of classes) {
    // 匹配 p-4, pt-4, pr-4, pb-4, pl-4, px-4, py-4
    const match = cls.match(new RegExp(`^${prefix}([trblxy])?-(.+)$`));
    if (match) {
      const [, side, value] = match;
      if (!side) {
        // p-4 或 m-4
        result.top = result.right = result.bottom = result.left = value;
      } else if (side === 'x') {
        result.left = result.right = value;
      } else if (side === 'y') {
        result.top = result.bottom = value;
      } else {
        const sideMap: Record<string, string> = {
          t: 'top', r: 'right', b: 'bottom', l: 'left'
        };
        result[sideMap[side]] = value;
      }
    }
  }

  return result;
}
```

#### 3.2.4 间距可视化控件

```typescript
// src/components/PropertyPanel/controls/SpacingBox.tsx

import React from 'react';

interface SpacingBoxProps {
  type: 'padding' | 'margin';
  values: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  onChange: (side: string, value: string) => void;
}

const SPACING_OPTIONS = [
  { value: '0', label: '0' },
  { value: 'px', label: '1px' },
  { value: '0.5', label: '2px' },
  { value: '1', label: '4px' },
  { value: '2', label: '8px' },
  { value: '3', label: '12px' },
  { value: '4', label: '16px' },
  { value: '5', label: '20px' },
  { value: '6', label: '24px' },
  { value: '8', label: '32px' },
  { value: '10', label: '40px' },
  { value: '12', label: '48px' },
  { value: '16', label: '64px' },
];

export default function SpacingBox({ type, values, onChange }: SpacingBoxProps) {
  const color = type === 'padding' ? '#22c55e' : '#f97316';

  return (
    <div className="spacing-box">
      <svg viewBox="0 0 200 160" className="spacing-svg">
        {/* 外框 */}
        <rect
          x="10" y="10" width="180" height="140"
          fill="transparent"
          stroke={color}
          strokeWidth="2"
          strokeDasharray="4"
        />

        {/* 内框 (元素) */}
        <rect
          x="50" y="40" width="100" height="80"
          fill="#e5e7eb"
          stroke="#9ca3af"
          strokeWidth="1"
        />

        {/* Top */}
        <g className="spacing-input top">
          <foreignObject x="75" y="15" width="50" height="24">
            <select
              value={values.top}
              onChange={(e) => onChange('top', e.target.value)}
              style={{ borderColor: color }}
            >
              {SPACING_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </foreignObject>
        </g>

        {/* Right */}
        <g className="spacing-input right">
          <foreignObject x="152" y="68" width="50" height="24">
            <select
              value={values.right}
              onChange={(e) => onChange('right', e.target.value)}
              style={{ borderColor: color }}
            >
              {SPACING_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </foreignObject>
        </g>

        {/* Bottom */}
        <g className="spacing-input bottom">
          <foreignObject x="75" y="122" width="50" height="24">
            <select
              value={values.bottom}
              onChange={(e) => onChange('bottom', e.target.value)}
              style={{ borderColor: color }}
            >
              {SPACING_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </foreignObject>
        </g>

        {/* Left */}
        <g className="spacing-input left">
          <foreignObject x="-2" y="68" width="50" height="24">
            <select
              value={values.left}
              onChange={(e) => onChange('left', e.target.value)}
              style={{ borderColor: color }}
            >
              {SPACING_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </foreignObject>
        </g>

        {/* 中心文字 */}
        <text x="100" y="85" textAnchor="middle" fontSize="12" fill="#6b7280">
          Element
        </text>
      </svg>
    </div>
  );
}
```

---

### 3.3 状态管理

```typescript
// src/stores/editor-store.ts

import { create } from 'zustand';
import type { SelectedElementInfo, EditAction } from '../types';

interface EditorState {
  // 编辑模式
  isEditMode: boolean;
  enableEditMode: () => void;
  disableEditMode: () => void;

  // 选中元素
  selectedElement: SelectedElementInfo | null;
  setSelectedElement: (element: SelectedElementInfo | null) => void;

  // 编辑历史
  history: EditAction[];
  historyIndex: number;
  addAction: (action: EditAction) => void;
  undo: () => EditAction | null;
  redo: () => EditAction | null;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // 项目文件
  files: Map<string, string>;
  updateFile: (path: string, content: string) => void;
  getFile: (path: string) => string | undefined;

  // UI 状态
  activeTab: string;
  setActiveTab: (tab: string) => void;
  deviceView: 'desktop' | 'tablet' | 'mobile';
  setDeviceView: (view: 'desktop' | 'tablet' | 'mobile') => void;
}

const MAX_HISTORY = 100;

export const useEditorStore = create<EditorState>((set, get) => ({
  // 编辑模式
  isEditMode: false,
  enableEditMode: () => set({ isEditMode: true }),
  disableEditMode: () => set({ isEditMode: false, selectedElement: null }),

  // 选中元素
  selectedElement: null,
  setSelectedElement: (element) => set({ selectedElement: element }),

  // 编辑历史
  history: [],
  historyIndex: -1,

  addAction: (action) => {
    const { history, historyIndex } = get();

    // 截断撤销后的历史
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(action);

    // 限制历史长度
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    }

    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < 0) return null;

    const action = history[historyIndex];
    set({ historyIndex: historyIndex - 1 });
    return action;
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return null;

    const newIndex = historyIndex + 1;
    const action = history[newIndex];
    set({ historyIndex: newIndex });
    return action;
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  // 项目文件
  files: new Map(),
  updateFile: (path, content) => {
    const files = new Map(get().files);
    files.set(path, content);
    set({ files });
  },
  getFile: (path) => get().files.get(path),

  // UI 状态
  activeTab: 'style',
  setActiveTab: (tab) => set({ activeTab: tab }),
  deviceView: 'desktop',
  setDeviceView: (view) => set({ deviceView: view }),
}));
```

---

## 4. 实施任务

### 4.1 Week 5 任务列表

| 任务 ID | 任务描述 | 预估时间 | 依赖 |
|---------|---------|---------|------|
| T5.1 | 创建 visual-editor 包结构 | 1h | SPEC-0002 |
| T5.2 | 实现注入脚本核心逻辑 | 6h | T5.1 |
| T5.3 | 实现元素选择和高亮系统 | 4h | T5.2 |
| T5.4 | 实现父子窗口通信 | 3h | T5.2 |
| T5.5 | 创建编辑器主框架组件 | 4h | T5.4 |
| T5.6 | 实现属性面板框架 | 3h | T5.5 |
| T5.7 | 实现状态管理 | 2h | T5.5 |

### 4.2 Week 6 任务列表

| 任务 ID | 任务描述 | 预估时间 | 依赖 |
|---------|---------|---------|------|
| T6.1 | 实现样式标签页 | 4h | T5.6 |
| T6.2 | 实现布局标签页 | 3h | T5.6 |
| T6.3 | 实现间距标签页 | 4h | T5.6 |
| T6.4 | 实现效果标签页 | 3h | T5.6 |
| T6.5 | 实现属性标签页 | 2h | T5.6 |
| T6.6 | 实现控件组件 | 4h | T6.1 |
| T6.7 | 集成 AST 处理器 | 3h | T6.6 |
| T6.8 | 测试和调优 | 4h | T6.7 |

---

## 5. 验收标准

### 5.1 功能验收

| 验收项 | 验收标准 |
|--------|---------|
| 元素选择 | 点击元素准确选中，显示高亮边框 |
| 悬停预览 | 鼠标悬停显示虚线预览框 |
| 属性面板 | 显示选中元素的所有可编辑属性 |
| 样式修改 | 修改后立即反映到预览 |
| 撤销/重做 | 正确撤销和重做操作 |
| 设备切换 | 桌面/平板/手机视图正常切换 |

### 5.2 性能验收

| 指标 | 目标值 |
|------|--------|
| 元素选择响应 | < 50ms |
| 样式更新响应 | < 100ms |
| 面板渲染 | < 16ms (60fps) |

---

*规格版本: v1.0*
*创建日期: 2024*
*最后更新: 2024*
