/**
 * Visual Edit 注入脚本
 * 在 iframe 中运行，处理元素选择、高亮和拖拽编辑
 */

interface SelectedElementInfo {
  jsxId: string;
  tagName: string;
  className: string;
  textContent: string;
  computedStyles: Record<string, string>;
  boundingRect: DOMRect;
  attributes: Record<string, string>;
  path: string[];
}

interface UpdatePayload {
  jsxId: string;
  type: 'text' | 'className' | 'style' | 'attribute';
  value: unknown;
}

interface AttributeUpdate {
  name: string;
  value: string | null;
}

interface ResizeInfo {
  jsxId: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/**
 * Visual Edit 控制器
 */
class VisualEditController {
  private selectedElement: HTMLElement | null = null;
  private hoveredElement: HTMLElement | null = null;
  private highlightOverlay: HTMLElement | null = null;
  private hoverOverlay: HTMLElement | null = null;
  private resizeHandles: Map<ResizeHandle, HTMLElement> = new Map();
  private isEditMode = false;
  private isResizing = false;
  private resizeHandle: ResizeHandle | null = null;
  private dragStartPos = { x: 0, y: 0 };
  private originalRect: DOMRect | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    this.createOverlays();
    this.createResizeHandles();
    this.setupEventListeners();
    this.setupMessageHandler();
    this.setupResizeListeners();
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

  private createResizeHandles(): void {
    const handles: ResizeHandle[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
    const handleContainer = document.createElement('div');
    handleContainer.id = '__visual_edit_handles__';
    handleContainer.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      display: none;
    `;

    handles.forEach((handle) => {
      const el = document.createElement('div');
      el.dataset.handle = handle;
      el.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: #3b82f6;
        border: 1px solid white;
        border-radius: 2px;
        pointer-events: auto;
        cursor: ${this.getCursorForHandle(handle)};
      `;
      this.positionHandle(el, handle);
      handleContainer.appendChild(el);
      this.resizeHandles.set(handle, el);
    });

    document.body.appendChild(handleContainer);
  }

  private getCursorForHandle(handle: ResizeHandle): string {
    const cursors: Record<ResizeHandle, string> = {
      n: 'ns-resize',
      s: 'ns-resize',
      e: 'ew-resize',
      w: 'ew-resize',
      ne: 'nesw-resize',
      sw: 'nesw-resize',
      nw: 'nwse-resize',
      se: 'nwse-resize',
    };
    return cursors[handle];
  }

  private positionHandle(el: HTMLElement, handle: ResizeHandle): void {
    switch (handle) {
      case 'n':
        el.style.top = '-4px';
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        break;
      case 's':
        el.style.bottom = '-4px';
        el.style.left = '50%';
        el.style.transform = 'translateX(-50%)';
        break;
      case 'e':
        el.style.right = '-4px';
        el.style.top = '50%';
        el.style.transform = 'translateY(-50%)';
        break;
      case 'w':
        el.style.left = '-4px';
        el.style.top = '50%';
        el.style.transform = 'translateY(-50%)';
        break;
      case 'ne':
        el.style.top = '-4px';
        el.style.right = '-4px';
        break;
      case 'nw':
        el.style.top = '-4px';
        el.style.left = '-4px';
        break;
      case 'se':
        el.style.bottom = '-4px';
        el.style.right = '-4px';
        break;
      case 'sw':
        el.style.bottom = '-4px';
        el.style.left = '-4px';
        break;
    }
  }

  private updateResizeHandles(): void {
    const container = document.getElementById('__visual_edit_handles__');
    if (!container) return;

    if (!this.selectedElement || !this.isEditMode) {
      container.style.display = 'none';
      return;
    }

    const rect = this.selectedElement.getBoundingClientRect();
    container.style.display = 'block';
    container.style.top = `${rect.top}px`;
    container.style.left = `${rect.left}px`;
    container.style.width = `${rect.width}px`;
    container.style.height = `${rect.height}px`;
  }

  private setupResizeListeners(): void {
    // Handle mousedown on resize handles
    document.addEventListener('mousedown', (e) => {
      const target = e.target as HTMLElement;
      if (target.dataset.handle && this.selectedElement) {
        e.preventDefault();
        e.stopPropagation();
        this.startResize(target.dataset.handle as ResizeHandle, e);
      }
    });

    // Handle mousemove for resizing
    document.addEventListener('mousemove', (e) => {
      if (this.isResizing && this.selectedElement && this.resizeHandle) {
        this.handleResize(e);
      }
    });

    // Handle mouseup to end resize
    document.addEventListener('mouseup', () => {
      if (this.isResizing) {
        this.endResize();
      }
    });
  }

  private startResize(handle: ResizeHandle, e: MouseEvent): void {
    this.isResizing = true;
    this.resizeHandle = handle;
    this.dragStartPos = { x: e.clientX, y: e.clientY };
    this.originalRect = this.selectedElement!.getBoundingClientRect();
    document.body.style.cursor = this.getCursorForHandle(handle);
    document.body.style.userSelect = 'none';
  }

  private handleResize(e: MouseEvent): void {
    if (!this.selectedElement || !this.originalRect || !this.resizeHandle) return;

    const deltaX = e.clientX - this.dragStartPos.x;
    const deltaY = e.clientY - this.dragStartPos.y;

    let newWidth = this.originalRect.width;
    let newHeight = this.originalRect.height;

    // Calculate new dimensions based on handle
    switch (this.resizeHandle) {
      case 'e':
      case 'ne':
      case 'se':
        newWidth = this.originalRect.width + deltaX;
        break;
      case 'w':
      case 'nw':
      case 'sw':
        newWidth = this.originalRect.width - deltaX;
        break;
    }

    switch (this.resizeHandle) {
      case 's':
      case 'se':
      case 'sw':
        newHeight = this.originalRect.height + deltaY;
        break;
      case 'n':
      case 'ne':
      case 'nw':
        newHeight = this.originalRect.height - deltaY;
        break;
    }

    // Apply minimum size
    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);

    // Apply temporary styles for preview
    this.selectedElement.style.width = `${newWidth}px`;
    this.selectedElement.style.height = `${newHeight}px`;

    // Update overlays
    this.updateHighlight(this.selectedElement, this.highlightOverlay!);
    this.updateResizeHandles();

    // Send resize event for live preview
    this.postMessage('ELEMENT_RESIZING', {
      jsxId: this.selectedElement.getAttribute('data-jsx-id'),
      width: Math.round(newWidth),
      height: Math.round(newHeight),
      originalWidth: Math.round(this.originalRect.width),
      originalHeight: Math.round(this.originalRect.height),
    } as ResizeInfo);
  }

  private endResize(): void {
    if (!this.selectedElement || !this.originalRect) {
      this.isResizing = false;
      this.resizeHandle = null;
      return;
    }

    const currentRect = this.selectedElement.getBoundingClientRect();

    // Send final resize event
    this.postMessage('ELEMENT_RESIZED', {
      jsxId: this.selectedElement.getAttribute('data-jsx-id'),
      width: Math.round(currentRect.width),
      height: Math.round(currentRect.height),
      originalWidth: Math.round(this.originalRect.width),
      originalHeight: Math.round(this.originalRect.height),
    } as ResizeInfo);

    // Reset state
    this.isResizing = false;
    this.resizeHandle = null;
    this.originalRect = null;
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = '';
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
        this.updateResizeHandles();
      }
    }, true);

    // 窗口大小变化
    window.addEventListener('resize', () => {
      if (this.selectedElement) {
        this.updateHighlight(this.selectedElement, this.highlightOverlay!);
        this.updateResizeHandles();
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
          this.handleElementUpdate(payload as UpdatePayload);
          break;

        case 'SELECT_BY_JSX_ID':
          this.selectByJsxId((payload as { jsxId: string }).jsxId);
          break;

        case 'GET_FULL_HTML':
          this.sendFullHtml();
          break;

        case 'HIGHLIGHT_ELEMENT':
          this.highlightByJsxId((payload as { jsxId: string }).jsxId);
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
    this.updateResizeHandles();

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
    this.updateResizeHandles();
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
    for (const attr of Array.from(element.attributes)) {
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
    for (const node of Array.from(element.childNodes)) {
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
        this.updateElementText(element, payload.value as string);
        break;
      case 'className':
        this.updateElementClassName(element, payload.value as string);
        break;
      case 'style':
        this.updateElementStyle(element, payload.value as Record<string, string>);
        break;
      case 'attribute':
        this.updateElementAttribute(element, payload.value as AttributeUpdate);
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

  private updateElementAttribute(element: HTMLElement, attr: AttributeUpdate): void {
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

  private postMessage(type: string, payload: unknown): void {
    window.parent.postMessage({ type, payload }, '*');
  }
}

// 初始化
if (typeof window !== 'undefined') {
  new VisualEditController();
}

export { VisualEditController };
export type { SelectedElementInfo, UpdatePayload };
