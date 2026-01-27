/**
 * Visual Editor 类型定义
 */

/**
 * 选中元素信息
 */
export interface SelectedElementInfo {
  /** JSX ID */
  jsxId: string;
  /** 源文件路径 (data-jsx-file) */
  jsxFile?: string;
  /** 源码行号 (data-jsx-line) */
  jsxLine?: number;
  /** 源码列号 (data-jsx-col) */
  jsxCol?: number;
  /** 标签名 */
  tagName: string;
  /** className */
  className: string;
  /** 直接文本内容 */
  textContent: string;
  /** 计算样式 */
  computedStyles: Record<string, string>;
  /** 边界矩形 */
  boundingRect: DOMRect;
  /** 属性 */
  attributes: Record<string, string>;
  /** DOM 路径 (JSX ID 数组) */
  path: string[];
  /** 相同 jsxId 元素中的索引（处理 .map() 生成元素） */
  elementIndex?: number;
  /** 相同 jsxId 元素数量 */
  elementCount?: number;
}

/**
 * 更新负载
 */
export interface UpdatePayload {
  /** JSX ID */
  jsxId: string;
  /** 更新类型 */
  type: 'text' | 'className' | 'style' | 'attribute';
  /** 更新值 */
  value: unknown;
  /** 相同 jsxId 元素中的索引（处理 .map() 生成元素） */
  elementIndex?: number;
}

/**
 * 编辑动作 (用于撤销/重做)
 */
export interface EditAction {
  /** 动作 ID */
  id: string;
  /** 时间戳 */
  timestamp: number;
  /** JSX ID */
  jsxId: string;
  /** 动作类型 */
  type: 'text' | 'className' | 'style' | 'attribute';
  /** 旧值 */
  oldValue: unknown;
  /** 新值 */
  newValue: unknown;
  /** 文件路径 */
  filePath?: string;
  /** 源码行号 (用于精确 AST 定位) */
  jsxLine?: number;
  /** 源码列号 (用于精确 AST 定位) */
  jsxCol?: number;
}

/**
 * 消息类型 (父子窗口通信)
 */
export type MessageType =
  | 'ENABLE_EDIT_MODE'
  | 'DISABLE_EDIT_MODE'
  | 'UPDATE_ELEMENT'
  | 'SELECT_BY_JSX_ID'
  | 'GET_FULL_HTML'
  | 'HIGHLIGHT_ELEMENT'
  | 'ELEMENT_SELECTED'
  | 'ELEMENT_DESELECTED'
  | 'TEXT_CHANGED'
  | 'EDIT_MODE_ENABLED'
  | 'EDIT_MODE_DISABLED'
  | 'FULL_HTML';

/**
 * 通信消息
 */
export interface EditorMessage {
  type: MessageType;
  payload?: unknown;
}

/**
 * 样式更新参数
 */
export interface StyleUpdatePayload {
  /** 完全替换 className */
  className?: string;
  /** 要添加的类名 */
  addClasses?: string[];
  /** 要移除的类名 */
  removeClasses?: string[];
  /** 行内样式对象 */
  style?: Record<string, string>;
}

/**
 * 设备视图类型
 */
export type DeviceView = 'desktop' | 'tablet' | 'mobile';

/**
 * 设备视图配置
 */
export interface DeviceViewConfig {
  name: string;
  width: number;
  height?: number;
  icon: string;
}

/**
 * Device view presets
 */
export const DEVICE_VIEWS: Record<DeviceView, DeviceViewConfig> = {
  desktop: { name: 'Desktop', width: 1280, icon: '🖥️' },
  tablet: { name: 'Tablet', width: 768, icon: '📱' },
  mobile: { name: 'Mobile', width: 375, icon: '📲' },
};

/**
 * Property panel tab ID
 */
export type PropertyTabId = 'style' | 'layout' | 'spacing' | 'effects' | 'attributes';

/**
 * Tab configuration
 */
export interface TabConfig {
  id: PropertyTabId;
  label: string;
  icon: string;
}

/**
 * Property panel tabs configuration
 */
export const PROPERTY_TABS: TabConfig[] = [
  { id: 'style', label: 'Style', icon: '🎨' },
  { id: 'layout', label: 'Layout', icon: '📐' },
  { id: 'spacing', label: 'Spacing', icon: '↔️' },
  { id: 'effects', label: 'Effects', icon: '✨' },
  { id: 'attributes', label: 'Attributes', icon: '⚙️' },
];
