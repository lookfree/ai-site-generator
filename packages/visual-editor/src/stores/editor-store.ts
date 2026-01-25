/**
 * 编辑器状态管理
 */

import { create } from 'zustand';
import type { SelectedElementInfo, EditAction, DeviceView } from '../types';

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
  deviceView: DeviceView;
  setDeviceView: (view: DeviceView) => void;

  // iframe 引用
  iframeRef: HTMLIFrameElement | null;
  setIframeRef: (ref: HTMLIFrameElement | null) => void;
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

  // iframe 引用
  iframeRef: null,
  setIframeRef: (ref) => set({ iframeRef: ref }),
}));
