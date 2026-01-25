/**
 * 属性面板组件
 * 显示和编辑选中组件的属性，通过 AST API 实现代码级别的修改
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  updateComponentClass,
  updateComponentText,
  updateComponentStyle,
  type ComponentNode,
} from '../services/api';
import {
  useResizeHandler,
  widthToTailwind,
  heightToTailwind,
} from '../hooks/useResizeHandler';
import { useDebounceCallback } from '../hooks/useDebounce';

// Debounce delay for API calls (ms)
const API_DEBOUNCE_DELAY = 300;

interface PropertyPanelProps {
  projectId: string;
  selectedComponent: ComponentNode | null;
  onRefresh?: () => void;
}

type ActiveTab = 'tailwind' | 'style' | 'text' | 'size';

interface ResizeInfo {
  jsxId: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
}

// 常用 Tailwind 类快捷选项
const QUICK_CLASSES = {
  padding: ['p-0', 'p-1', 'p-2', 'p-4', 'p-6', 'p-8'],
  margin: ['m-0', 'm-1', 'm-2', 'm-4', 'm-auto'],
  width: ['w-full', 'w-auto', 'w-1/2', 'w-1/3', 'w-1/4'],
  height: ['h-auto', 'h-full', 'h-screen', 'h-64', 'h-96'],
  textSize: ['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl'],
  fontWeight: ['font-normal', 'font-medium', 'font-semibold', 'font-bold'],
  rounded: ['rounded-none', 'rounded', 'rounded-md', 'rounded-lg', 'rounded-xl', 'rounded-full'],
  flex: ['flex', 'flex-row', 'flex-col', 'flex-wrap', 'flex-1'],
  justify: ['justify-start', 'justify-center', 'justify-end', 'justify-between'],
  items: ['items-start', 'items-center', 'items-end', 'items-stretch'],
};

function PropertyPanel({ projectId, selectedComponent, onRefresh }: PropertyPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('tailwind');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 编辑状态
  const [classNameInput, setClassNameInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [styleInputs, setStyleInputs] = useState<Record<string, string>>({});

  // 拖拽调整大小状态
  const [resizePreview, setResizePreview] = useState<ResizeInfo | null>(null);

  // Resize handler hook
  const { applyResizeToClassName } = useResizeHandler({
    projectId,
    onResize: (info) => {
      setResizePreview(info);
    },
    onResizeEnd: async (info) => {
      setResizePreview(null);
      // Apply the resize to className
      if (selectedComponent && info.jsxId === selectedComponent.id) {
        const newClassName = applyResizeToClassName(
          classNameInput,
          info.width,
          info.height
        );
        setClassNameInput(newClassName);

        // Save to AST
        setSaving(true);
        try {
          await updateComponentClass(projectId, selectedComponent.id, {
            className: newClassName,
          });
          onRefresh?.();
        } catch (err) {
          console.error('[PropertyPanel] Failed to apply resize:', err);
          setError(err instanceof Error ? err.message : 'Failed to apply resize');
        } finally {
          setSaving(false);
        }
      }
    },
  });

  // 当选中组件变化时，更新输入值
  useEffect(() => {
    if (selectedComponent) {
      setClassNameInput(selectedComponent.className || '');
      setTextInput(selectedComponent.textContent || '');
      // 解析 style 属性（如果有）
      setStyleInputs({});
      setError(null);
      setResizePreview(null);
    }
  }, [selectedComponent]);

  // 解析 className 为数组
  const classNameArray = useMemo(() => {
    return classNameInput.split(/\s+/).filter(Boolean);
  }, [classNameInput]);

  // Store refs for debounced callbacks
  const classNameInputRef = useRef(classNameInput);
  classNameInputRef.current = classNameInput;

  // Core update function for className
  const doUpdateClass = useCallback(async () => {
    if (!selectedComponent) return;

    setSaving(true);
    setError(null);

    try {
      await updateComponentClass(projectId, selectedComponent.id, {
        className: classNameInputRef.current,
      });
      onRefresh?.();
    } catch (err) {
      console.error('[PropertyPanel] Failed to update class:', err);
      setError(err instanceof Error ? err.message : 'Failed to update class');
    } finally {
      setSaving(false);
    }
  }, [projectId, selectedComponent, onRefresh]);

  // Immediate update for blur/enter events
  const handleUpdateClass = useCallback(() => {
    doUpdateClass();
  }, [doUpdateClass]);

  // 添加/移除单个 class
  const toggleClass = useCallback(
    async (cls: string) => {
      if (!selectedComponent) return;

      const classes = new Set(classNameArray);
      if (classes.has(cls)) {
        classes.delete(cls);
      } else {
        classes.add(cls);
      }

      const newClassName = Array.from(classes).join(' ');
      setClassNameInput(newClassName);

      setSaving(true);
      try {
        await updateComponentClass(projectId, selectedComponent.id, {
          className: newClassName,
        });
        onRefresh?.();
      } catch (err) {
        console.error('[PropertyPanel] Failed to toggle class:', err);
        setError(err instanceof Error ? err.message : 'Failed to update class');
      } finally {
        setSaving(false);
      }
    },
    [projectId, selectedComponent, classNameArray, onRefresh]
  );

  // Store ref for text input
  const textInputRef = useRef(textInput);
  textInputRef.current = textInput;

  // Core update function for text
  const doUpdateText = useCallback(async () => {
    if (!selectedComponent) return;

    setSaving(true);
    setError(null);

    try {
      await updateComponentText(projectId, selectedComponent.id, textInputRef.current);
      onRefresh?.();
    } catch (err) {
      console.error('[PropertyPanel] Failed to update text:', err);
      setError(err instanceof Error ? err.message : 'Failed to update text');
    } finally {
      setSaving(false);
    }
  }, [projectId, selectedComponent, onRefresh]);

  // Immediate update for blur events
  const handleUpdateText = useCallback(() => {
    doUpdateText();
  }, [doUpdateText]);

  // Store ref for style inputs
  const styleInputsRef = useRef(styleInputs);
  styleInputsRef.current = styleInputs;

  // Core update function for style
  const doUpdateStyle = useCallback(
    async (property: string, value: string) => {
      if (!selectedComponent) return;

      const newStyles = { ...styleInputsRef.current, [property]: value };
      styleInputsRef.current = newStyles;
      setStyleInputs(newStyles);

      setSaving(true);
      try {
        await updateComponentStyle(projectId, selectedComponent.id, newStyles);
        onRefresh?.();
      } catch (err) {
        console.error('[PropertyPanel] Failed to update style:', err);
        setError(err instanceof Error ? err.message : 'Failed to update style');
      } finally {
        setSaving(false);
      }
    },
    [projectId, selectedComponent, onRefresh]
  );

  // Debounced version for style updates (color pickers fire many events)
  const handleUpdateStyle = useDebounceCallback(doUpdateStyle, API_DEBOUNCE_DELAY);

  if (!selectedComponent) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 p-4">
        <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        <p className="text-sm text-center">从组件树选择一个组件来编辑属性</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 组件信息 */}
      <div className="p-3 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-800">{selectedComponent.name}</p>
            <p className="text-xs text-blue-600 mt-0.5 font-mono truncate" title={selectedComponent.id}>
              {selectedComponent.id}
            </p>
          </div>
          {saving && (
            <span className="text-xs text-blue-600 flex items-center gap-1">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              保存中
            </span>
          )}
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="px-3 py-2 bg-red-50 border-b border-red-100 text-red-600 text-xs">{error}</div>
      )}

      {/* 标签页切换 */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('tailwind')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'tailwind'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Tailwind
        </button>
        <button
          onClick={() => setActiveTab('style')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'style'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Style
        </button>
        <button
          onClick={() => setActiveTab('text')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'text'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Text
        </button>
        <button
          onClick={() => setActiveTab('size')}
          className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
            activeTab === 'size'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Size
        </button>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-3">
        {/* Tailwind 编辑 */}
        {activeTab === 'tailwind' && (
          <div className="space-y-4">
            {/* className 输入框 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">className</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  onBlur={handleUpdateClass}
                  onKeyDown={(e) => e.key === 'Enter' && handleUpdateClass()}
                  placeholder="Tailwind classes..."
                  className="flex-1 px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>

            {/* 当前 class 标签 */}
            {classNameArray.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">当前类</label>
                <div className="flex flex-wrap gap-1">
                  {classNameArray.map((cls) => (
                    <span
                      key={cls}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono"
                    >
                      {cls}
                      <button
                        onClick={() => toggleClass(cls)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 快捷类选择 */}
            <div className="space-y-3">
              {Object.entries(QUICK_CLASSES).map(([category, classes]) => (
                <div key={category}>
                  <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{category}</label>
                  <div className="flex flex-wrap gap-1">
                    {classes.map((cls) => (
                      <button
                        key={cls}
                        onClick={() => toggleClass(cls)}
                        className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                          classNameArray.includes(cls)
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {cls}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Style 编辑 */}
        {activeTab === 'style' && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 mb-2">内联样式编辑（CSS-in-JS）</p>

            {/* 颜色 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">颜色</label>
                <input
                  type="color"
                  value={styleInputs.color || '#000000'}
                  onChange={(e) => handleUpdateStyle('color', e.target.value)}
                  className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">背景色</label>
                <input
                  type="color"
                  value={styleInputs.backgroundColor || '#ffffff'}
                  onChange={(e) => handleUpdateStyle('backgroundColor', e.target.value)}
                  className="w-full h-8 rounded border border-gray-300 cursor-pointer"
                />
              </div>
            </div>

            {/* 字体 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">字体大小</label>
                <input
                  type="text"
                  value={styleInputs.fontSize || ''}
                  onChange={(e) => handleUpdateStyle('fontSize', e.target.value)}
                  placeholder="16px"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">字重</label>
                <select
                  value={styleInputs.fontWeight || ''}
                  onChange={(e) => handleUpdateStyle('fontWeight', e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">默认</option>
                  <option value="400">Normal (400)</option>
                  <option value="500">Medium (500)</option>
                  <option value="600">SemiBold (600)</option>
                  <option value="700">Bold (700)</option>
                </select>
              </div>
            </div>

            {/* 间距 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Padding</label>
                <input
                  type="text"
                  value={styleInputs.padding || ''}
                  onChange={(e) => handleUpdateStyle('padding', e.target.value)}
                  placeholder="8px 16px"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Margin</label>
                <input
                  type="text"
                  value={styleInputs.margin || ''}
                  onChange={(e) => handleUpdateStyle('margin', e.target.value)}
                  placeholder="0 auto"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 边框 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Border</label>
                <input
                  type="text"
                  value={styleInputs.border || ''}
                  onChange={(e) => handleUpdateStyle('border', e.target.value)}
                  placeholder="1px solid #ccc"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Border Radius</label>
                <input
                  type="text"
                  value={styleInputs.borderRadius || ''}
                  onChange={(e) => handleUpdateStyle('borderRadius', e.target.value)}
                  placeholder="8px"
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Text 编辑 */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">文本内容</label>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onBlur={handleUpdateText}
                placeholder="组件文本内容..."
                rows={6}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">按 Enter 或失去焦点时保存</p>
            </div>

            <button
              onClick={handleUpdateText}
              disabled={saving}
              className="w-full py-2 bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
            >
              {saving ? '保存中...' : '保存文本'}
            </button>
          </div>
        )}

        {/* Size 编辑 */}
        {activeTab === 'size' && (
          <div className="space-y-4">
            <p className="text-xs text-gray-500 mb-2">
              拖拽预览中的元素边角可调整大小，或在下方手动设置
            </p>

            {/* 实时预览 */}
            {resizePreview && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs font-medium text-blue-700 mb-2">拖拽预览</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">宽度: </span>
                    <span className="font-mono text-blue-600">{resizePreview.width}px</span>
                    <span className="text-gray-400 ml-1">→ {widthToTailwind(resizePreview.width)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">高度: </span>
                    <span className="font-mono text-blue-600">{resizePreview.height}px</span>
                    <span className="text-gray-400 ml-1">→ {heightToTailwind(resizePreview.height)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 当前尺寸类 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">当前尺寸类</label>
              <div className="flex flex-wrap gap-1">
                {classNameArray
                  .filter((cls) => /^(w-|h-|min-w-|min-h-|max-w-|max-h-)/.test(cls))
                  .map((cls) => (
                    <span
                      key={cls}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-mono"
                    >
                      {cls}
                      <button
                        onClick={() => toggleClass(cls)}
                        className="text-green-500 hover:text-green-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                {!classNameArray.some((cls) => /^(w-|h-)/.test(cls)) && (
                  <span className="text-xs text-gray-400">未设置尺寸类</span>
                )}
              </div>
            </div>

            {/* 快速宽度 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">宽度</label>
              <div className="flex flex-wrap gap-1">
                {['w-auto', 'w-full', 'w-1/2', 'w-1/3', 'w-1/4', 'w-64', 'w-96', 'w-[200px]', 'w-[300px]'].map((cls) => (
                  <button
                    key={cls}
                    onClick={() => {
                      // Remove existing width classes first
                      const cleanedClasses = classNameArray.filter((c) => !/^w-/.test(c));
                      const newClassName = [...cleanedClasses, cls].join(' ');
                      setClassNameInput(newClassName);
                      handleUpdateClass();
                    }}
                    className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                      classNameArray.includes(cls)
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-green-300 hover:bg-green-50'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* 快速高度 */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">高度</label>
              <div className="flex flex-wrap gap-1">
                {['h-auto', 'h-full', 'h-screen', 'h-64', 'h-96', 'h-[200px]', 'h-[300px]', 'h-[400px]'].map((cls) => (
                  <button
                    key={cls}
                    onClick={() => {
                      // Remove existing height classes first
                      const cleanedClasses = classNameArray.filter((c) => !/^h-/.test(c));
                      const newClassName = [...cleanedClasses, cls].join(' ');
                      setClassNameInput(newClassName);
                      handleUpdateClass();
                    }}
                    className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${
                      classNameArray.includes(cls)
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-green-300 hover:bg-green-50'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* 提示 */}
            <div className="p-2 bg-gray-50 rounded text-xs text-gray-500">
              <p>拖拽调整大小后，会自动转换为最接近的 Tailwind 类</p>
              <p className="mt-1">如果没有匹配的类，将使用任意值如 <code className="bg-gray-200 px-1 rounded">w-[123px]</code></p>
            </div>
          </div>
        )}
      </div>

      {/* 位置信息 */}
      {selectedComponent.location && (
        <div className="p-2 border-t border-gray-200 text-xs text-gray-500">
          <span className="font-mono">
            L{selectedComponent.location.start.line}:{selectedComponent.location.start.column} -{' '}
            L{selectedComponent.location.end.line}:{selectedComponent.location.end.column}
          </span>
        </div>
      )}
    </div>
  );
}

export default PropertyPanel;
