/**
 * Visual Edit Panel - 重构版
 * 使用 visual-editor 包的控件组件，保持原有的 props 接口
 */

import { useState, useEffect, useCallback } from 'react';
import {
  ColorPicker,
  SelectControl,
  SliderControl,
  useEditorStore,
  type SelectedElementInfo as PackageElementInfo,
} from 'visual-editor';

// 扩展 SelectedElementInfo 类型，添加 AST 匹配所需的位置信息
interface SelectedElementInfo extends Omit<PackageElementInfo, 'jsxId'> {
  jsxId: string;
  // Source code location info (for AST matching)
  jsxFile?: string;
  jsxLine?: number;
  jsxCol?: number;
  // Element index among siblings with the same jsxId (for .map() generated elements)
  elementIndex?: number;
  // Total count of elements with the same jsxId
  elementCount?: number;
}

interface VisualEditPanelProps {
  selectedElement: SelectedElementInfo | null;
  onUpdateElement?: (jsxId: string, updates: ElementUpdate) => void;
  onSave?: (jsxId: string, changes: SavedChanges) => void;
  isSaving?: boolean;
}

interface SavedChanges {
  textContent?: string;
  originalTextContent?: string;  // Original text for matching in source code
  styles?: Record<string, string>;
  tagName?: string;  // Element tag for additional matching context
  className?: string;  // Class for additional matching context
  // Position info for precise AST matching (highest priority)
  jsxFile?: string;
  jsxLine?: number;
  jsxCol?: number;
  // Flag indicating this is a .map() element (style changes affect all elements)
  isMapElement?: boolean;
}

interface ElementUpdate {
  type: 'text' | 'className' | 'style' | 'attribute';
  value: string | Record<string, string>;
}

// 样式选项配置
const FONT_SIZE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: '12px', label: '12px' },
  { value: '14px', label: '14px' },
  { value: '16px', label: '16px' },
  { value: '18px', label: '18px' },
  { value: '20px', label: '20px' },
  { value: '24px', label: '24px' },
  { value: '32px', label: '32px' },
  { value: '48px', label: '48px' },
];

const FONT_WEIGHT_OPTIONS = [
  { value: '', label: 'Select' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Normal' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semibold' },
  { value: '700', label: 'Bold' },
];

const BORDER_WIDTH_OPTIONS = [
  { value: '', label: 'Select' },
  { value: '0px', label: 'None' },
  { value: '1px', label: '1px' },
  { value: '2px', label: '2px' },
  { value: '3px', label: '3px' },
  { value: '4px', label: '4px' },
];

const BORDER_STYLE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
  { value: 'none', label: 'None' },
];

const BORDER_RADIUS_OPTIONS = [
  { value: '', label: 'Select' },
  { value: '0px', label: 'None' },
  { value: '4px', label: 'Small' },
  { value: '8px', label: 'Medium' },
  { value: '12px', label: 'Large' },
  { value: '16px', label: 'XL' },
  { value: '9999px', label: 'Full' },
];

const BOX_SHADOW_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'none', label: 'None' },
  { value: '0 1px 2px 0 rgba(0,0,0,0.05)', label: 'Small' },
  { value: '0 4px 6px -1px rgba(0,0,0,0.1)', label: 'Medium' },
  { value: '0 10px 15px -3px rgba(0,0,0,0.1)', label: 'Large' },
  { value: '0 25px 50px -12px rgba(0,0,0,0.25)', label: 'XL' },
];

function VisualEditPanel({ selectedElement, onUpdateElement, onSave, isSaving }: VisualEditPanelProps) {
  // 使用 visual-editor 的 store 同步状态
  const setSelectedElement = useEditorStore(state => state.setSelectedElement);

  const [textContent, setTextContent] = useState('');
  const [textColor, setTextColor] = useState('');
  const [bgColor, setBgColor] = useState('');
  const [fontSize, setFontSize] = useState('');
  const [fontWeight, setFontWeight] = useState('');
  const [textAlign, setTextAlign] = useState('left');
  const [margin, setMargin] = useState({ top: '', right: '', bottom: '', left: '' });
  const [padding, setPadding] = useState({ top: '', right: '', bottom: '', left: '' });
  const [hasChanges, setHasChanges] = useState(false);

  // Layout states
  const [flexDirection, setFlexDirection] = useState('row');
  const [alignItems, setAlignItems] = useState('stretch');
  const [justifyContent, setJustifyContent] = useState('flex-start');

  // Border states
  const [borderWidth, setBorderWidth] = useState('');
  const [borderColor, setBorderColor] = useState('');
  const [borderStyle, setBorderStyle] = useState('');

  // Effects states
  const [borderRadius, setBorderRadius] = useState('');
  const [boxShadow, setBoxShadow] = useState('');
  const [opacity, setOpacity] = useState(100);

  // 存储原始值用于比较
  const [originalValues, setOriginalValues] = useState<{
    textContent: string;
    textColor: string;
    bgColor: string;
    fontSize: string;
    fontWeight: string;
    textAlign: string;
    margin: { top: string; right: string; bottom: string; left: string };
    padding: { top: string; right: string; bottom: string; left: string };
    flexDirection: string;
    alignItems: string;
    justifyContent: string;
    borderWidth: string;
    borderColor: string;
    borderStyle: string;
    borderRadius: string;
    boxShadow: string;
    opacity: number;
  } | null>(null);

  // 同步选中元素到 store (转换类型)
  useEffect(() => {
    if (selectedElement) {
      // 将扩展类型转换为 package 类型
      const packageElement: PackageElementInfo = {
        jsxId: selectedElement.jsxId,
        tagName: selectedElement.tagName,
        className: selectedElement.className,
        textContent: selectedElement.textContent,
        computedStyles: selectedElement.computedStyles,
        boundingRect: selectedElement.boundingRect,
        attributes: selectedElement.attributes,
        path: selectedElement.path,
      };
      setSelectedElement(packageElement);
    } else {
      setSelectedElement(null);
    }
  }, [selectedElement, setSelectedElement]);

  // 解析计算样式
  useEffect(() => {
    if (selectedElement) {
      const text = selectedElement.textContent || '';
      setTextContent(text);

      const styles = selectedElement.computedStyles || {};
      const color = styles.color || '';
      const bg = styles.backgroundColor || '';
      const fSize = styles.fontSize || '';
      const fWeight = styles.fontWeight || '';
      const tAlign = styles.textAlign || 'left';

      setTextColor(color);
      setBgColor(bg);
      setFontSize(fSize);
      setFontWeight(fWeight);
      setTextAlign(tAlign);

      // 解析 margin
      const marginValues = {
        top: styles.marginTop || '',
        right: styles.marginRight || '',
        bottom: styles.marginBottom || '',
        left: styles.marginLeft || '',
      };
      setMargin(marginValues);

      // 解析 padding
      const paddingValues = {
        top: styles.paddingTop || '',
        right: styles.paddingRight || '',
        bottom: styles.paddingBottom || '',
        left: styles.paddingLeft || '',
      };
      setPadding(paddingValues);

      // 解析 Layout
      const fDir = styles.flexDirection || 'row';
      const aItems = styles.alignItems || 'stretch';
      const jContent = styles.justifyContent || 'flex-start';
      setFlexDirection(fDir);
      setAlignItems(aItems);
      setJustifyContent(jContent);

      // 解析 Border
      const bWidth = styles.borderWidth || '';
      const bColor = styles.borderColor || '';
      const bStyle = styles.borderStyle || '';
      setBorderWidth(bWidth);
      setBorderColor(bColor);
      setBorderStyle(bStyle);

      // 解析 Effects
      const bRadius = styles.borderRadius || '';
      const bShadow = styles.boxShadow || '';
      const opc = styles.opacity ? Math.round(parseFloat(styles.opacity) * 100) : 100;
      setBorderRadius(bRadius);
      setBoxShadow(bShadow);
      setOpacity(opc);

      // 存储原始值
      setOriginalValues({
        textContent: text,
        textColor: color,
        bgColor: bg,
        fontSize: fSize,
        fontWeight: fWeight,
        textAlign: tAlign,
        margin: marginValues,
        padding: paddingValues,
        flexDirection: fDir,
        alignItems: aItems,
        justifyContent: jContent,
        borderWidth: bWidth,
        borderColor: bColor,
        borderStyle: bStyle,
        borderRadius: bRadius,
        boxShadow: bShadow,
        opacity: opc,
      });

      // 重置变更状态
      setHasChanges(false);
    }
  }, [selectedElement]);

  // 检查是否有变更
  const checkHasChanges = useCallback(() => {
    if (!originalValues) return false;
    return (
      textContent !== originalValues.textContent ||
      textColor !== originalValues.textColor ||
      bgColor !== originalValues.bgColor ||
      fontSize !== originalValues.fontSize ||
      fontWeight !== originalValues.fontWeight ||
      textAlign !== originalValues.textAlign ||
      JSON.stringify(margin) !== JSON.stringify(originalValues.margin) ||
      JSON.stringify(padding) !== JSON.stringify(originalValues.padding) ||
      flexDirection !== originalValues.flexDirection ||
      alignItems !== originalValues.alignItems ||
      justifyContent !== originalValues.justifyContent ||
      borderWidth !== originalValues.borderWidth ||
      borderColor !== originalValues.borderColor ||
      borderStyle !== originalValues.borderStyle ||
      borderRadius !== originalValues.borderRadius ||
      boxShadow !== originalValues.boxShadow ||
      opacity !== originalValues.opacity
    );
  }, [originalValues, textContent, textColor, bgColor, fontSize, fontWeight, textAlign, margin, padding, flexDirection, alignItems, justifyContent, borderWidth, borderColor, borderStyle, borderRadius, boxShadow, opacity]);

  // 更新 hasChanges 状态
  useEffect(() => {
    const changed = checkHasChanges();
    setHasChanges(changed);
  }, [checkHasChanges]);

  const handleTextChange = useCallback((value: string) => {
    setTextContent(value);
    if (selectedElement && onUpdateElement) {
      onUpdateElement(selectedElement.jsxId, { type: 'text', value });
    }
  }, [selectedElement, onUpdateElement]);

  const handleStyleChange = useCallback((property: string, value: string) => {
    if (selectedElement && onUpdateElement) {
      onUpdateElement(selectedElement.jsxId, {
        type: 'style',
        value: { [property]: value }
      });
    }
  }, [selectedElement, onUpdateElement]);

  // 保存变更
  const handleSave = useCallback(() => {
    if (!selectedElement || !onSave || !hasChanges) return;

    const changes: SavedChanges = {};

    // 文本变更 - include original text and position info for source code matching
    if (originalValues && textContent !== originalValues.textContent) {
      changes.textContent = textContent;
      changes.originalTextContent = originalValues.textContent;
      changes.tagName = selectedElement.tagName;
      changes.className = selectedElement.className;
      // Include position info for precise AST matching
      changes.jsxFile = selectedElement.jsxFile;
      changes.jsxLine = selectedElement.jsxLine;
      changes.jsxCol = selectedElement.jsxCol;
    }

    // 样式变更
    const styleChanges: Record<string, string> = {};
    if (originalValues) {
      if (textColor !== originalValues.textColor) styleChanges.color = textColor;
      if (bgColor !== originalValues.bgColor) styleChanges.backgroundColor = bgColor;
      if (fontSize !== originalValues.fontSize) styleChanges.fontSize = fontSize;
      if (fontWeight !== originalValues.fontWeight) styleChanges.fontWeight = fontWeight;
      if (textAlign !== originalValues.textAlign) styleChanges.textAlign = textAlign;
      if (margin.top !== originalValues.margin.top) styleChanges.marginTop = margin.top;
      if (margin.right !== originalValues.margin.right) styleChanges.marginRight = margin.right;
      if (margin.bottom !== originalValues.margin.bottom) styleChanges.marginBottom = margin.bottom;
      if (margin.left !== originalValues.margin.left) styleChanges.marginLeft = margin.left;
      if (padding.top !== originalValues.padding.top) styleChanges.paddingTop = padding.top;
      if (padding.right !== originalValues.padding.right) styleChanges.paddingRight = padding.right;
      if (padding.bottom !== originalValues.padding.bottom) styleChanges.paddingBottom = padding.bottom;
      if (padding.left !== originalValues.padding.left) styleChanges.paddingLeft = padding.left;
      // Layout
      if (flexDirection !== originalValues.flexDirection) styleChanges.flexDirection = flexDirection;
      if (alignItems !== originalValues.alignItems) styleChanges.alignItems = alignItems;
      if (justifyContent !== originalValues.justifyContent) styleChanges.justifyContent = justifyContent;
      // Border
      if (borderWidth !== originalValues.borderWidth) styleChanges.borderWidth = borderWidth;
      if (borderColor !== originalValues.borderColor) styleChanges.borderColor = borderColor;
      if (borderStyle !== originalValues.borderStyle) styleChanges.borderStyle = borderStyle;
      // Effects
      if (borderRadius !== originalValues.borderRadius) styleChanges.borderRadius = borderRadius;
      if (boxShadow !== originalValues.boxShadow) styleChanges.boxShadow = boxShadow;
      if (opacity !== originalValues.opacity) styleChanges.opacity = String(opacity / 100);
    }

    if (Object.keys(styleChanges).length > 0) {
      changes.styles = styleChanges;
      // Include position info for precise AST matching (also for styles)
      changes.jsxFile = selectedElement.jsxFile;
      changes.jsxLine = selectedElement.jsxLine;
      changes.jsxCol = selectedElement.jsxCol;
      // Mark as map element if elementCount > 1 (styles will affect all elements)
      if (selectedElement.elementCount && selectedElement.elementCount > 1) {
        changes.isMapElement = true;
      }
    }

    onSave(selectedElement.jsxId, changes);

    // 更新 originalValues 以反映保存后的状态
    setOriginalValues({
      textContent,
      textColor,
      bgColor,
      fontSize,
      fontWeight,
      textAlign,
      margin,
      padding,
      flexDirection,
      alignItems,
      justifyContent,
      borderWidth,
      borderColor,
      borderStyle,
      borderRadius,
      boxShadow,
      opacity,
    });

    // 重置 hasChanges 状态
    setHasChanges(false);
  }, [selectedElement, onSave, hasChanges, originalValues, textContent, textColor, bgColor, fontSize, fontWeight, textAlign, margin, padding, flexDirection, alignItems, justifyContent, borderWidth, borderColor, borderStyle, borderRadius, boxShadow, opacity]);

  if (!selectedElement) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6">
        <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        <p className="text-sm font-medium mb-1">Visual edits</p>
        <p className="text-xs text-center">Select an element to edit it</p>
        <p className="text-xs text-gray-300 mt-2">Hold Cmd to select multiple</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Save 按钮 - 固定在顶部 */}
      {hasChanges && (
        <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center justify-between sticky top-0 z-10">
          <span className="text-xs text-blue-600">
            Unsaved changes
          </span>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {isSaving ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </>
            )}
          </button>
        </div>
      )}

      {/* 元素标签 */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono">
              {selectedElement.tagName.toLowerCase()}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              #{selectedElement.jsxId}
            </span>
          </div>
          <button className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            Select parent
          </button>
        </div>
        {/* 显示当前选中的是 .map() 生成的多个元素之一 */}
        {selectedElement.elementCount && selectedElement.elementCount > 1 && (
          <div className="mt-2 px-2 py-1.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              Editing element {(selectedElement.elementIndex ?? 0) + 1} of {selectedElement.elementCount} (generated by .map())
            </span>
          </div>
        )}
      </div>

      {/* Text 内容 */}
      {selectedElement.textContent && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Text</h3>
          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Content</label>
              <textarea
                value={textContent}
                onChange={(e) => handleTextChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={2}
              />
            </div>
          </div>
        </div>
      )}

      {/* Colors - 使用 visual-editor 包的 ColorPicker */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Colors</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Text color</label>
            <ColorPicker
              value={textColor || '#000000'}
              onChange={(color) => {
                setTextColor(color);
                handleStyleChange('color', color);
              }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Background</label>
            <ColorPicker
              value={bgColor || '#ffffff'}
              onChange={(color) => {
                setBgColor(color);
                handleStyleChange('backgroundColor', color);
              }}
            />
          </div>
        </div>
      </div>

      {/* Spacing */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Spacing</h3>
        <div className="space-y-3">
          {/* Margin */}
          <div>
            <label className="text-xs text-gray-500 block mb-2">Margin</label>
            <div className="grid grid-cols-4 gap-2">
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                <div key={side} className="flex flex-col items-center">
                  <span className="text-[10px] text-gray-400 mb-1">{side[0].toUpperCase()}</span>
                  <input
                    type="text"
                    value={margin[side]}
                    onChange={(e) => {
                      setMargin(prev => ({ ...prev, [side]: e.target.value }));
                      handleStyleChange(`margin${side.charAt(0).toUpperCase() + side.slice(1)}`, e.target.value);
                    }}
                    className="w-full h-8 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Padding */}
          <div>
            <label className="text-xs text-gray-500 block mb-2">Padding</label>
            <div className="grid grid-cols-4 gap-2">
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                <div key={side} className="flex flex-col items-center">
                  <span className="text-[10px] text-gray-400 mb-1">{side[0].toUpperCase()}</span>
                  <input
                    type="text"
                    value={padding[side]}
                    onChange={(e) => {
                      setPadding(prev => ({ ...prev, [side]: e.target.value }));
                      handleStyleChange(`padding${side.charAt(0).toUpperCase() + side.slice(1)}`, e.target.value);
                    }}
                    className="w-full h-8 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Layout */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Layout</h3>
        <div className="space-y-3">
          {/* Direction */}
          <div>
            <label className="text-xs text-gray-500 block mb-2">Direction</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setFlexDirection('row');
                  handleStyleChange('flexDirection', 'row');
                }}
                className={`flex-1 h-9 flex items-center justify-center border rounded transition-colors ${
                  flexDirection === 'row'
                    ? 'bg-blue-50 border-blue-300 text-blue-600'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setFlexDirection('column');
                  handleStyleChange('flexDirection', 'column');
                }}
                className={`flex-1 h-9 flex items-center justify-center border rounded transition-colors ${
                  flexDirection === 'column'
                    ? 'bg-blue-50 border-blue-300 text-blue-600'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Alignment */}
          <div>
            <label className="text-xs text-gray-500 block mb-2">Alignment</label>
            <div className="grid grid-cols-3 gap-1 p-1 border border-gray-200 rounded">
              {[
                ['flex-start', 'flex-start'], ['flex-start', 'center'], ['flex-start', 'flex-end'],
                ['center', 'flex-start'], ['center', 'center'], ['center', 'flex-end'],
                ['flex-end', 'flex-start'], ['flex-end', 'center'], ['flex-end', 'flex-end'],
              ].map(([align, justify], i) => (
                <button
                  key={i}
                  onClick={() => {
                    setAlignItems(align);
                    setJustifyContent(justify);
                    handleStyleChange('alignItems', align);
                    handleStyleChange('justifyContent', justify);
                  }}
                  className={`h-7 flex items-center justify-center rounded transition-colors ${
                    alignItems === align && justifyContent === justify
                      ? 'bg-blue-100 text-blue-600'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="w-3 h-3 bg-current rounded-sm opacity-50" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Typography - 使用 visual-editor 包的 SelectControl */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Typography</h3>
        <div className="space-y-3">
          {/* Font Size */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Font size</span>
            <SelectControl
              value={fontSize}
              options={FONT_SIZE_OPTIONS}
              onChange={(value) => {
                setFontSize(value);
                handleStyleChange('fontSize', value);
              }}
            />
          </div>

          {/* Font Weight */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Font weight</span>
            <SelectControl
              value={fontWeight}
              options={FONT_WEIGHT_OPTIONS}
              onChange={(value) => {
                setFontWeight(value);
                handleStyleChange('fontWeight', value);
              }}
            />
          </div>

          {/* Text Alignment */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Alignment</span>
            <div className="flex border border-gray-200 rounded overflow-hidden">
              {['left', 'center', 'right', 'justify'].map((align) => (
                <button
                  key={align}
                  onClick={() => {
                    setTextAlign(align);
                    handleStyleChange('textAlign', align);
                  }}
                  className={`p-1.5 ${textAlign === align ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-50'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {align === 'left' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />}
                    {align === 'center' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />}
                    {align === 'right' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />}
                    {align === 'justify' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Border - 使用 visual-editor 包的控件 */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Border</h3>
        <div className="space-y-3">
          {/* Border Width */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Width</span>
            <SelectControl
              value={borderWidth}
              options={BORDER_WIDTH_OPTIONS}
              onChange={(value) => {
                setBorderWidth(value);
                handleStyleChange('borderWidth', value);
              }}
            />
          </div>

          {/* Border Color */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">Color</label>
            <ColorPicker
              value={borderColor || '#000000'}
              onChange={(color) => {
                setBorderColor(color);
                handleStyleChange('borderColor', color);
              }}
            />
          </div>

          {/* Border Style */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Style</span>
            <SelectControl
              value={borderStyle}
              options={BORDER_STYLE_OPTIONS}
              onChange={(value) => {
                setBorderStyle(value);
                handleStyleChange('borderStyle', value);
              }}
            />
          </div>
        </div>
      </div>

      {/* Effects - 使用 visual-editor 包的控件 */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Effects</h3>
        <div className="space-y-3">
          {/* Border Radius */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Border radius</span>
            <SelectControl
              value={borderRadius}
              options={BORDER_RADIUS_OPTIONS}
              onChange={(value) => {
                setBorderRadius(value);
                handleStyleChange('borderRadius', value);
              }}
            />
          </div>

          {/* Shadow */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Shadow</span>
            <SelectControl
              value={boxShadow}
              options={BOX_SHADOW_OPTIONS}
              onChange={(value) => {
                setBoxShadow(value);
                handleStyleChange('boxShadow', value);
              }}
            />
          </div>

          {/* Opacity - 使用 visual-editor 包的 SliderControl */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Opacity</span>
              <span className="text-xs text-gray-500">{opacity}%</span>
            </div>
            <SliderControl
              value={opacity}
              min={0}
              max={100}
              onChange={(value) => {
                setOpacity(value);
                handleStyleChange('opacity', String(value / 100));
              }}
            />
          </div>
        </div>
      </div>

      {/* Class Name (Read-only for reference) */}
      {selectedElement.className && (
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-700 mb-2">Classes</h3>
          <div className="flex flex-wrap gap-1">
            {selectedElement.className.split(' ').filter(Boolean).map((cls, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-mono"
              >
                {cls}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default VisualEditPanel;
