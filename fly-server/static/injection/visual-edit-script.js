// injection/visual-edit-script.ts
var VisualEditController = class {
  constructor() {
    this.selectedElement = null;
    this.hoveredElement = null;
    this.highlightOverlay = null;
    this.hoverOverlay = null;
    this.resizeHandles = /* @__PURE__ */ new Map();
    this.isEditMode = false;
    this.isResizing = false;
    this.resizeHandle = null;
    this.dragStartPos = { x: 0, y: 0 };
    this.originalRect = null;
    // ========== 文本编辑模式 ==========
    // 存储进入编辑模式时的原始文本
    this.originalTextBeforeEdit = "";
    this.handleTextInput = () => {
      if (!this.selectedElement) return;
      const text = this.getDirectTextContent(this.selectedElement);
      this.postMessage("TEXT_CHANGED", {
        jsxId: this.selectedElement.getAttribute("data-jsx-id"),
        text,
        // 发送原始文本（进入编辑模式时的值），用于准确的代码替换
        originalText: this.originalTextBeforeEdit,
        // 发送元素元数据，避免 frontend 状态过时导致的问题
        tagName: this.selectedElement.tagName.toLowerCase(),
        className: this.selectedElement.className,
        jsxFile: this.selectedElement.getAttribute("data-jsx-file") || void 0,
        jsxLine: this.selectedElement.getAttribute("data-jsx-line") ? Number(this.selectedElement.getAttribute("data-jsx-line")) : void 0,
        jsxCol: this.selectedElement.getAttribute("data-jsx-col") ? Number(this.selectedElement.getAttribute("data-jsx-col")) : void 0
      });
    };
    this.handleTextBlur = () => {
      this.exitTextEditMode();
    };
    this.init();
  }
  init() {
    this.createOverlays();
    this.createResizeHandles();
    this.setupEventListeners();
    this.setupMessageHandler();
    this.setupResizeListeners();
  }
  // ========== 覆盖层管理 ==========
  createOverlays() {
    this.highlightOverlay = document.createElement("div");
    this.highlightOverlay.id = "__visual_edit_highlight__";
    this.highlightOverlay.style.cssText = `
      position: fixed;
      pointer-events: none;
      border: 2px solid #3b82f6;
      background: rgba(59, 130, 246, 0.1);
      z-index: 999999;
      display: none;
      transition: all 0.1s ease-out;
    `;
    this.hoverOverlay = document.createElement("div");
    this.hoverOverlay.id = "__visual_edit_hover__";
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
  createResizeHandles() {
    const handles = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
    const handleContainer = document.createElement("div");
    handleContainer.id = "__visual_edit_handles__";
    handleContainer.style.cssText = `
      position: fixed;
      pointer-events: none;
      z-index: 999999;
      display: none;
    `;
    handles.forEach((handle) => {
      const el = document.createElement("div");
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
  getCursorForHandle(handle) {
    const cursors = {
      n: "ns-resize",
      s: "ns-resize",
      e: "ew-resize",
      w: "ew-resize",
      ne: "nesw-resize",
      sw: "nesw-resize",
      nw: "nwse-resize",
      se: "nwse-resize"
    };
    return cursors[handle];
  }
  positionHandle(el, handle) {
    switch (handle) {
      case "n":
        el.style.top = "-4px";
        el.style.left = "50%";
        el.style.transform = "translateX(-50%)";
        break;
      case "s":
        el.style.bottom = "-4px";
        el.style.left = "50%";
        el.style.transform = "translateX(-50%)";
        break;
      case "e":
        el.style.right = "-4px";
        el.style.top = "50%";
        el.style.transform = "translateY(-50%)";
        break;
      case "w":
        el.style.left = "-4px";
        el.style.top = "50%";
        el.style.transform = "translateY(-50%)";
        break;
      case "ne":
        el.style.top = "-4px";
        el.style.right = "-4px";
        break;
      case "nw":
        el.style.top = "-4px";
        el.style.left = "-4px";
        break;
      case "se":
        el.style.bottom = "-4px";
        el.style.right = "-4px";
        break;
      case "sw":
        el.style.bottom = "-4px";
        el.style.left = "-4px";
        break;
    }
  }
  updateResizeHandles() {
    const container = document.getElementById("__visual_edit_handles__");
    if (!container) return;
    if (!this.selectedElement || !this.isEditMode) {
      container.style.display = "none";
      return;
    }
    const rect = this.selectedElement.getBoundingClientRect();
    container.style.display = "block";
    container.style.top = `${rect.top}px`;
    container.style.left = `${rect.left}px`;
    container.style.width = `${rect.width}px`;
    container.style.height = `${rect.height}px`;
  }
  setupResizeListeners() {
    document.addEventListener("mousedown", (e) => {
      const target = e.target;
      if (target.dataset.handle && this.selectedElement) {
        e.preventDefault();
        e.stopPropagation();
        this.startResize(target.dataset.handle, e);
      }
    });
    document.addEventListener("mousemove", (e) => {
      if (this.isResizing && this.selectedElement && this.resizeHandle) {
        this.handleResize(e);
      }
    });
    document.addEventListener("mouseup", () => {
      if (this.isResizing) {
        this.endResize();
      }
    });
  }
  startResize(handle, e) {
    this.isResizing = true;
    this.resizeHandle = handle;
    this.dragStartPos = { x: e.clientX, y: e.clientY };
    this.originalRect = this.selectedElement.getBoundingClientRect();
    document.body.style.cursor = this.getCursorForHandle(handle);
    document.body.style.userSelect = "none";
  }
  handleResize(e) {
    if (!this.selectedElement || !this.originalRect || !this.resizeHandle) return;
    const deltaX = e.clientX - this.dragStartPos.x;
    const deltaY = e.clientY - this.dragStartPos.y;
    let newWidth = this.originalRect.width;
    let newHeight = this.originalRect.height;
    switch (this.resizeHandle) {
      case "e":
      case "ne":
      case "se":
        newWidth = this.originalRect.width + deltaX;
        break;
      case "w":
      case "nw":
      case "sw":
        newWidth = this.originalRect.width - deltaX;
        break;
    }
    switch (this.resizeHandle) {
      case "s":
      case "se":
      case "sw":
        newHeight = this.originalRect.height + deltaY;
        break;
      case "n":
      case "ne":
      case "nw":
        newHeight = this.originalRect.height - deltaY;
        break;
    }
    newWidth = Math.max(20, newWidth);
    newHeight = Math.max(20, newHeight);
    this.selectedElement.style.width = `${newWidth}px`;
    this.selectedElement.style.height = `${newHeight}px`;
    this.updateHighlight(this.selectedElement, this.highlightOverlay);
    this.updateResizeHandles();
    this.postMessage("ELEMENT_RESIZING", {
      jsxId: this.selectedElement.getAttribute("data-jsx-id"),
      width: Math.round(newWidth),
      height: Math.round(newHeight),
      originalWidth: Math.round(this.originalRect.width),
      originalHeight: Math.round(this.originalRect.height)
    });
  }
  endResize() {
    if (!this.selectedElement || !this.originalRect) {
      this.isResizing = false;
      this.resizeHandle = null;
      return;
    }
    const currentRect = this.selectedElement.getBoundingClientRect();
    this.postMessage("ELEMENT_RESIZED", {
      jsxId: this.selectedElement.getAttribute("data-jsx-id"),
      width: Math.round(currentRect.width),
      height: Math.round(currentRect.height),
      originalWidth: Math.round(this.originalRect.width),
      originalHeight: Math.round(this.originalRect.height)
    });
    this.isResizing = false;
    this.resizeHandle = null;
    this.originalRect = null;
    document.body.style.cursor = "crosshair";
    document.body.style.userSelect = "";
  }
  updateHighlight(element, overlay) {
    if (!element) {
      overlay.style.display = "none";
      return;
    }
    const rect = element.getBoundingClientRect();
    overlay.style.display = "block";
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }
  // ========== 事件监听 ==========
  setupEventListeners() {
    document.addEventListener("mousemove", (e) => {
      if (!this.isEditMode) return;
      const target = this.findEditableElement(e.target);
      if (target && target !== this.selectedElement) {
        this.hoveredElement = target;
        this.updateHighlight(target, this.hoverOverlay);
      } else {
        this.hoveredElement = null;
        this.updateHighlight(null, this.hoverOverlay);
      }
    });
    document.addEventListener("click", (e) => {
      if (!this.isEditMode) return;
      e.preventDefault();
      e.stopPropagation();
      const target = this.findEditableElement(e.target);
      if (target) {
        this.selectElement(target);
      }
    }, true);
    document.addEventListener("dblclick", (e) => {
      if (!this.isEditMode || !this.selectedElement) return;
      e.preventDefault();
      this.enterTextEditMode();
    }, true);
    document.addEventListener("keydown", (e) => {
      if (!this.isEditMode) return;
      if (e.key === "Escape") {
        this.exitTextEditMode();
        this.deselectElement();
      }
    });
    window.addEventListener("scroll", () => {
      if (this.selectedElement) {
        this.updateHighlight(this.selectedElement, this.highlightOverlay);
        this.updateResizeHandles();
      }
    }, true);
    window.addEventListener("resize", () => {
      if (this.selectedElement) {
        this.updateHighlight(this.selectedElement, this.highlightOverlay);
        this.updateResizeHandles();
      }
    });
  }
  // ========== 消息处理 ==========
  setupMessageHandler() {
    window.addEventListener("message", (e) => {
      const { type, payload } = e.data || {};
      switch (type) {
        case "ENABLE_EDIT_MODE":
          this.enableEditMode();
          break;
        case "DISABLE_EDIT_MODE":
          this.disableEditMode();
          break;
        case "UPDATE_ELEMENT":
          this.handleElementUpdate(payload);
          break;
        case "SELECT_BY_JSX_ID":
          this.selectByJsxId(
            payload.jsxId,
            payload.elementIndex
          );
          break;
        case "GET_FULL_HTML":
          this.sendFullHtml();
          break;
        case "HIGHLIGHT_ELEMENT":
          this.highlightByJsxId(payload.jsxId);
          break;
        case "REFRESH_ELEMENT_INFO":
          this.refreshSelectedElementInfo();
          break;
      }
    });
  }
  // ========== 元素选择 ==========
  findEditableElement(element) {
    let current = element;
    while (current && current !== document.body) {
      if (current.hasAttribute("data-jsx-id")) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
  selectElement(element) {
    this.selectedElement = element;
    this.updateHighlight(element, this.highlightOverlay);
    this.updateResizeHandles();
    const info = this.extractElementInfo(element);
    this.postMessage("ELEMENT_SELECTED", info);
  }
  selectByJsxId(jsxId, elementIndex) {
    let element = null;
    if (typeof elementIndex === "number") {
      const allElements = document.querySelectorAll(`[data-jsx-id="${jsxId}"]`);
      element = allElements[elementIndex] || null;
    } else {
      element = document.querySelector(`[data-jsx-id="${jsxId}"]`);
    }
    if (element) {
      this.selectElement(element);
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
  deselectElement() {
    this.selectedElement = null;
    this.updateHighlight(null, this.highlightOverlay);
    this.updateResizeHandles();
    this.postMessage("ELEMENT_DESELECTED", null);
  }
  highlightByJsxId(jsxId) {
    const element = document.querySelector(`[data-jsx-id="${jsxId}"]`);
    if (element) {
      this.updateHighlight(element, this.hoverOverlay);
      setTimeout(() => {
        if (this.hoveredElement !== element) {
          this.updateHighlight(null, this.hoverOverlay);
        }
      }, 1e3);
    }
  }
  /**
   * Re-extract and send element info from current DOM
   * Called after HMR to get fresh position info (data-jsx-line/col may have changed)
   */
  refreshSelectedElementInfo() {
    if (!this.selectedElement) {
      this.postMessage("ELEMENT_INFO_REFRESHED", null);
      return;
    }
    const info = this.extractElementInfo(this.selectedElement);
    this.postMessage("ELEMENT_INFO_REFRESHED", info);
  }
  // ========== 信息提取 ==========
  extractElementInfo(element) {
    const computedStyles = window.getComputedStyle(element);
    const relevantStyles = {};
    const jsxFile = element.getAttribute("data-jsx-file") || void 0;
    const jsxLine = element.getAttribute("data-jsx-line");
    const jsxCol = element.getAttribute("data-jsx-col");
    const styleProps = [
      "color",
      "backgroundColor",
      "fontSize",
      "fontWeight",
      "fontFamily",
      "lineHeight",
      "textAlign",
      "padding",
      "paddingTop",
      "paddingRight",
      "paddingBottom",
      "paddingLeft",
      "margin",
      "marginTop",
      "marginRight",
      "marginBottom",
      "marginLeft",
      "width",
      "height",
      "maxWidth",
      "minWidth",
      "display",
      "flexDirection",
      "justifyContent",
      "alignItems",
      "gap",
      "borderRadius",
      "borderWidth",
      "borderColor",
      "borderStyle",
      "boxShadow",
      "opacity",
      "position",
      "top",
      "right",
      "bottom",
      "left"
    ];
    for (const prop of styleProps) {
      relevantStyles[prop] = computedStyles.getPropertyValue(
        prop.replace(/([A-Z])/g, "-$1").toLowerCase()
      );
    }
    const attributes = {};
    for (const attr of Array.from(element.attributes)) {
      if (!attr.name.startsWith("data-jsx-")) {
        attributes[attr.name] = attr.value;
      }
    }
    const path = this.getElementPath(element);
    const jsxId = element.getAttribute("data-jsx-id") || "";
    const { elementIndex, elementCount } = this.getElementIndexAmongSiblings(element, jsxId);
    return {
      jsxId,
      jsxFile,
      jsxLine: jsxLine ? Number(jsxLine) : void 0,
      jsxCol: jsxCol ? Number(jsxCol) : void 0,
      tagName: element.tagName.toLowerCase(),
      className: element.className,
      textContent: this.getDirectTextContent(element),
      computedStyles: relevantStyles,
      boundingRect: element.getBoundingClientRect(),
      attributes,
      path,
      elementIndex,
      elementCount
    };
  }
  /**
   * 获取元素在相同 jsxId 元素中的索引
   * 用于处理 .map() 生成的多个相同 jsxId 的元素
   */
  getElementIndexAmongSiblings(element, jsxId) {
    if (!jsxId) return { elementIndex: 0, elementCount: 1 };
    const allElements = document.querySelectorAll(`[data-jsx-id="${jsxId}"]`);
    const elementCount = allElements.length;
    if (elementCount <= 1) {
      return { elementIndex: 0, elementCount: 1 };
    }
    let elementIndex = 0;
    for (let i = 0; i < allElements.length; i++) {
      if (allElements[i] === element) {
        elementIndex = i;
        break;
      }
    }
    return { elementIndex, elementCount };
  }
  getDirectTextContent(element) {
    let text = "";
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }
  getElementPath(element) {
    const path = [];
    let current = element;
    while (current && current !== document.body) {
      const jsxId = current.getAttribute("data-jsx-id");
      if (jsxId) {
        path.unshift(jsxId);
      }
      current = current.parentElement;
    }
    return path;
  }
  // ========== 元素更新 ==========
  handleElementUpdate(payload) {
    let element = null;
    if (this.selectedElement && this.selectedElement.getAttribute("data-jsx-id") === payload.jsxId) {
      element = this.selectedElement;
    } else if (typeof payload.elementIndex === "number") {
      const allElements = document.querySelectorAll(`[data-jsx-id="${payload.jsxId}"]`);
      element = allElements[payload.elementIndex] || null;
    } else {
      element = document.querySelector(`[data-jsx-id="${payload.jsxId}"]`);
    }
    if (!element) return;
    switch (payload.type) {
      case "text":
        this.updateElementText(element, payload.value);
        break;
      case "className":
        this.updateElementClassName(element, payload.value);
        break;
      case "style":
        this.updateElementStyle(element, payload.value);
        break;
      case "attribute":
        this.updateElementAttribute(element, payload.value);
        break;
    }
    if (element === this.selectedElement) {
      this.updateHighlight(element, this.highlightOverlay);
    }
  }
  updateElementText(element, text) {
    const textNodes = Array.from(element.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE
    );
    if (textNodes.length > 0) {
      textNodes[0].textContent = text;
    } else {
      element.prepend(document.createTextNode(text));
    }
  }
  updateElementClassName(element, className) {
    const jsxClasses = Array.from(element.classList).filter(
      (cls) => cls.startsWith("__jsx_")
    );
    element.className = [...jsxClasses, ...className.split(" ")].join(" ");
    if (element === this.selectedElement) {
      const info = this.extractElementInfo(element);
      this.postMessage("ELEMENT_UPDATED", info);
    }
  }
  updateElementStyle(element, styles) {
    for (const [prop, value] of Object.entries(styles)) {
      element.style.setProperty(
        prop.replace(/([A-Z])/g, "-$1").toLowerCase(),
        value
      );
    }
    if (element === this.selectedElement) {
      const info = this.extractElementInfo(element);
      this.postMessage("ELEMENT_UPDATED", info);
    }
  }
  updateElementAttribute(element, attr) {
    if (attr.value === null) {
      element.removeAttribute(attr.name);
    } else {
      element.setAttribute(attr.name, attr.value);
    }
  }
  enterTextEditMode() {
    if (!this.selectedElement) return;
    this.originalTextBeforeEdit = this.getDirectTextContent(this.selectedElement);
    this.selectedElement.contentEditable = "true";
    this.selectedElement.focus();
    const range = document.createRange();
    range.selectNodeContents(this.selectedElement);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    this.highlightOverlay.style.borderColor = "#8b5cf6";
    this.selectedElement.addEventListener("input", this.handleTextInput);
    this.selectedElement.addEventListener("blur", this.handleTextBlur);
  }
  exitTextEditMode() {
    if (!this.selectedElement) return;
    this.selectedElement.contentEditable = "false";
    this.highlightOverlay.style.borderColor = "#3b82f6";
    this.selectedElement.removeEventListener("input", this.handleTextInput);
    this.selectedElement.removeEventListener("blur", this.handleTextBlur);
  }
  // ========== 模式控制 ==========
  enableEditMode() {
    this.isEditMode = true;
    document.body.style.cursor = "crosshair";
    this.postMessage("EDIT_MODE_ENABLED", null);
  }
  disableEditMode() {
    this.isEditMode = false;
    document.body.style.cursor = "";
    this.deselectElement();
    this.postMessage("EDIT_MODE_DISABLED", null);
  }
  // ========== HTML 导出 ==========
  sendFullHtml() {
    const clone = document.body.cloneNode(true);
    const editorElements = clone.querySelectorAll(
      '[id^="__visual_edit_"]'
    );
    editorElements.forEach((el) => el.remove());
    clone.querySelectorAll("[contenteditable]").forEach((el) => {
      el.removeAttribute("contenteditable");
    });
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
${document.head.innerHTML}
</head>
<body>
${clone.innerHTML}
</body>
</html>`;
    this.postMessage("FULL_HTML", { html });
  }
  // ========== 通信 ==========
  postMessage(type, payload) {
    window.parent.postMessage({ type, payload }, "*");
  }
};
if (typeof window !== "undefined") {
  const initController = () => {
    new VisualEditController();
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initController);
  } else {
    initController();
  }
}
export {
  VisualEditController
};
