import { useState, useEffect, useCallback } from 'react';

interface SelectedElementInfo {
  jsxId: string;
  // Source code location info (for AST matching)
  jsxFile?: string;
  jsxLine?: number;
  jsxCol?: number;
  tagName: string;
  className: string;
  textContent: string;
  computedStyles: Record<string, string>;
  boundingRect: DOMRect;
  attributes: Record<string, string>;
  path: string[];
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
}

interface ElementUpdate {
  type: 'text' | 'className' | 'style' | 'attribute';
  value: string | Record<string, string>;
}

// 颜色选择器组件
function ColorPicker({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const presetColors = [
    '#000000', '#ffffff', '#ef4444', '#f97316', '#eab308',
    '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'
  ];

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded hover:bg-gray-50"
        >
          <div
            className="w-5 h-5 rounded border border-gray-300"
            style={{ backgroundColor: value || 'transparent' }}
          />
          <span className="text-xs text-gray-500 font-mono">
            {value || 'inherit'}
          </span>
        </button>
        {isOpen && (
          <div className="absolute right-0 top-full mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <div className="grid grid-cols-5 gap-1 mb-2">
              {presetColors.map(color => (
                <button
                  key={color}
                  onClick={() => { onChange(color); setIsOpen(false); }}
                  className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              type="color"
              value={value || '#000000'}
              onChange={(e) => { onChange(e.target.value); setIsOpen(false); }}
              className="w-full h-8 cursor-pointer"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function VisualEditPanel({ selectedElement, onUpdateElement, onSave, isSaving }: VisualEditPanelProps) {
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
  const [opacity, setOpacity] = useState('100');

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
    opacity: string;
  } | null>(null);

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
      const opc = styles.opacity ? String(Math.round(parseFloat(styles.opacity) * 100)) : '100';
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
    console.log('[VisualEditPanel] checkHasChanges:', changed, { bgColor, originalBgColor: originalValues?.bgColor });
    setHasChanges(changed);
  }, [checkHasChanges, bgColor, originalValues?.bgColor]);

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
      if (opacity !== originalValues.opacity) styleChanges.opacity = String(parseInt(opacity) / 100);
    }

    if (Object.keys(styleChanges).length > 0) {
      changes.styles = styleChanges;
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
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
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

      {/* Colors */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Colors</h3>
        <div className="space-y-3">
          <ColorPicker
            label="Text color"
            value={textColor}
            onChange={(color) => {
              setTextColor(color);
              handleStyleChange('color', color);
            }}
          />
          <ColorPicker
            label="Background"
            value={bgColor}
            onChange={(color) => {
              setBgColor(color);
              handleStyleChange('backgroundColor', color);
            }}
          />
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
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 mb-1">T</span>
                <input
                  type="text"
                  value={margin.top}
                  onChange={(e) => {
                    setMargin(prev => ({ ...prev, top: e.target.value }));
                    handleStyleChange('marginTop', e.target.value);
                  }}
                  className="w-full h-8 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 mb-1">R</span>
                <input
                  type="text"
                  value={margin.right}
                  onChange={(e) => {
                    setMargin(prev => ({ ...prev, right: e.target.value }));
                    handleStyleChange('marginRight', e.target.value);
                  }}
                  className="w-full h-8 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 mb-1">B</span>
                <input
                  type="text"
                  value={margin.bottom}
                  onChange={(e) => {
                    setMargin(prev => ({ ...prev, bottom: e.target.value }));
                    handleStyleChange('marginBottom', e.target.value);
                  }}
                  className="w-full h-8 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 mb-1">L</span>
                <input
                  type="text"
                  value={margin.left}
                  onChange={(e) => {
                    setMargin(prev => ({ ...prev, left: e.target.value }));
                    handleStyleChange('marginLeft', e.target.value);
                  }}
                  className="w-full h-8 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Padding */}
          <div>
            <label className="text-xs text-gray-500 block mb-2">Padding</label>
            <div className="grid grid-cols-4 gap-2">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 mb-1">T</span>
                <input
                  type="text"
                  value={padding.top}
                  onChange={(e) => {
                    setPadding(prev => ({ ...prev, top: e.target.value }));
                    handleStyleChange('paddingTop', e.target.value);
                  }}
                  className="w-full h-8 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 mb-1">R</span>
                <input
                  type="text"
                  value={padding.right}
                  onChange={(e) => {
                    setPadding(prev => ({ ...prev, right: e.target.value }));
                    handleStyleChange('paddingRight', e.target.value);
                  }}
                  className="w-full h-8 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 mb-1">B</span>
                <input
                  type="text"
                  value={padding.bottom}
                  onChange={(e) => {
                    setPadding(prev => ({ ...prev, bottom: e.target.value }));
                    handleStyleChange('paddingBottom', e.target.value);
                  }}
                  className="w-full h-8 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-400 mb-1">L</span>
                <input
                  type="text"
                  value={padding.left}
                  onChange={(e) => {
                    setPadding(prev => ({ ...prev, left: e.target.value }));
                    handleStyleChange('paddingLeft', e.target.value);
                  }}
                  className="w-full h-8 text-xs text-center border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
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

      {/* Typography */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Typography</h3>
        <div className="space-y-3">
          {/* Font Size */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Font size</span>
            <select
              value={fontSize}
              onChange={(e) => {
                setFontSize(e.target.value);
                handleStyleChange('fontSize', e.target.value);
              }}
              className="px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              <option value="12px">12px</option>
              <option value="14px">14px</option>
              <option value="16px">16px</option>
              <option value="18px">18px</option>
              <option value="20px">20px</option>
              <option value="24px">24px</option>
              <option value="32px">32px</option>
              <option value="48px">48px</option>
            </select>
          </div>

          {/* Font Weight */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Font weight</span>
            <select
              value={fontWeight}
              onChange={(e) => {
                setFontWeight(e.target.value);
                handleStyleChange('fontWeight', e.target.value);
              }}
              className="px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              <option value="300">Light</option>
              <option value="400">Normal</option>
              <option value="500">Medium</option>
              <option value="600">Semibold</option>
              <option value="700">Bold</option>
            </select>
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

      {/* Border */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Border</h3>
        <div className="space-y-3">
          {/* Border Width */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Width</span>
            <select
              value={borderWidth}
              onChange={(e) => {
                setBorderWidth(e.target.value);
                handleStyleChange('borderWidth', e.target.value);
              }}
              className="px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              <option value="0px">None</option>
              <option value="1px">1px</option>
              <option value="2px">2px</option>
              <option value="3px">3px</option>
              <option value="4px">4px</option>
            </select>
          </div>

          {/* Border Color */}
          <ColorPicker
            label="Color"
            value={borderColor}
            onChange={(color) => {
              setBorderColor(color);
              handleStyleChange('borderColor', color);
            }}
          />

          {/* Border Style */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Style</span>
            <select
              value={borderStyle}
              onChange={(e) => {
                setBorderStyle(e.target.value);
                handleStyleChange('borderStyle', e.target.value);
              }}
              className="px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              <option value="solid">Solid</option>
              <option value="dashed">Dashed</option>
              <option value="dotted">Dotted</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
      </div>

      {/* Effects */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-700 mb-3">Effects</h3>
        <div className="space-y-3">
          {/* Border Radius */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Border radius</span>
            <select
              value={borderRadius}
              onChange={(e) => {
                setBorderRadius(e.target.value);
                handleStyleChange('borderRadius', e.target.value);
              }}
              className="px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              <option value="0px">None</option>
              <option value="4px">Small</option>
              <option value="8px">Medium</option>
              <option value="12px">Large</option>
              <option value="16px">XL</option>
              <option value="9999px">Full</option>
            </select>
          </div>

          {/* Shadow */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Shadow</span>
            <select
              value={boxShadow}
              onChange={(e) => {
                setBoxShadow(e.target.value);
                handleStyleChange('boxShadow', e.target.value);
              }}
              className="px-2 py-1 text-sm border border-gray-200 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select</option>
              <option value="none">None</option>
              <option value="0 1px 2px 0 rgba(0,0,0,0.05)">Small</option>
              <option value="0 4px 6px -1px rgba(0,0,0,0.1)">Medium</option>
              <option value="0 10px 15px -3px rgba(0,0,0,0.1)">Large</option>
              <option value="0 25px 50px -12px rgba(0,0,0,0.25)">XL</option>
            </select>
          </div>

          {/* Opacity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Opacity</span>
              <span className="text-xs text-gray-500">{opacity}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={opacity}
              onChange={(e) => {
                setOpacity(e.target.value);
                handleStyleChange('opacity', String(parseInt(e.target.value) / 100));
              }}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
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
