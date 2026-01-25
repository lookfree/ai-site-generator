import { useState, useEffect, useCallback } from 'react';

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

interface VisualEditPanelProps {
  selectedElement: SelectedElementInfo | null;
  onUpdateElement?: (jsxId: string, updates: ElementUpdate) => void;
  onSave?: (jsxId: string, changes: SavedChanges) => void;
  isSaving?: boolean;
}

interface SavedChanges {
  textContent?: string;
  styles?: Record<string, string>;
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

// 间距可视化组件
function SpacingControl({
  margin,
  padding,
  onMarginChange,
  onPaddingChange,
}: {
  margin: { top: string; right: string; bottom: string; left: string };
  padding: { top: string; right: string; bottom: string; left: string };
  onMarginChange: (side: string, value: string) => void;
  onPaddingChange: (side: string, value: string) => void;
}) {
  return (
    <div className="relative w-full aspect-[4/3] bg-orange-50 rounded-lg p-2">
      {/* Margin labels */}
      <div className="absolute inset-0 flex items-center justify-center text-[10px] text-orange-400">
        <span className="absolute top-1 left-1/2 -translate-x-1/2">margin</span>
      </div>

      {/* Margin inputs */}
      <input
        type="text"
        value={margin.top}
        onChange={(e) => onMarginChange('top', e.target.value)}
        className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-5 text-[10px] text-center bg-transparent border-none focus:outline-none focus:bg-white focus:border-orange-300"
        placeholder="-"
      />
      <input
        type="text"
        value={margin.right}
        onChange={(e) => onMarginChange('right', e.target.value)}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-5 text-[10px] text-center bg-transparent border-none focus:outline-none focus:bg-white focus:border-orange-300"
        placeholder="-"
      />
      <input
        type="text"
        value={margin.bottom}
        onChange={(e) => onMarginChange('bottom', e.target.value)}
        className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-5 text-[10px] text-center bg-transparent border-none focus:outline-none focus:bg-white focus:border-orange-300"
        placeholder="-"
      />
      <input
        type="text"
        value={margin.left}
        onChange={(e) => onMarginChange('left', e.target.value)}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-5 text-[10px] text-center bg-transparent border-none focus:outline-none focus:bg-white focus:border-orange-300"
        placeholder="-"
      />

      {/* Padding box */}
      <div className="absolute inset-6 bg-green-50 rounded flex items-center justify-center">
        <span className="text-[10px] text-green-400">padding</span>

        {/* Padding inputs */}
        <input
          type="text"
          value={padding.top}
          onChange={(e) => onPaddingChange('top', e.target.value)}
          className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-4 text-[10px] text-center bg-transparent border-none focus:outline-none focus:bg-white"
          placeholder="-"
        />
        <input
          type="text"
          value={padding.right}
          onChange={(e) => onPaddingChange('right', e.target.value)}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-4 text-[10px] text-center bg-transparent border-none focus:outline-none focus:bg-white"
          placeholder="-"
        />
        <input
          type="text"
          value={padding.bottom}
          onChange={(e) => onPaddingChange('bottom', e.target.value)}
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-6 h-4 text-[10px] text-center bg-transparent border-none focus:outline-none focus:bg-white"
          placeholder="-"
        />
        <input
          type="text"
          value={padding.left}
          onChange={(e) => onPaddingChange('left', e.target.value)}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-4 text-[10px] text-center bg-transparent border-none focus:outline-none focus:bg-white"
          placeholder="-"
        />

        {/* Content box */}
        <div className="w-12 h-8 bg-blue-100 rounded flex items-center justify-center">
          <span className="text-[8px] text-blue-400">content</span>
        </div>
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
  const [originalText, setOriginalText] = useState('');

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
  } | null>(null);

  // 解析计算样式
  useEffect(() => {
    if (selectedElement) {
      const text = selectedElement.textContent || '';
      setTextContent(text);
      setOriginalText(text);

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
      JSON.stringify(padding) !== JSON.stringify(originalValues.padding)
    );
  }, [originalValues, textContent, textColor, bgColor, fontSize, fontWeight, textAlign, margin, padding]);

  // 更新 hasChanges 状态
  useEffect(() => {
    setHasChanges(checkHasChanges());
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

    // 文本变更
    if (originalValues && textContent !== originalValues.textContent) {
      changes.textContent = textContent;
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
    }

    if (Object.keys(styleChanges).length > 0) {
      changes.styles = styleChanges;
    }

    onSave(selectedElement.jsxId, changes);
  }, [selectedElement, onSave, hasChanges, originalValues, textContent, textColor, bgColor, fontSize, fontWeight, textAlign, margin, padding]);

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
        <SpacingControl
          margin={margin}
          padding={padding}
          onMarginChange={(side, value) => {
            setMargin(prev => ({ ...prev, [side]: value }));
            handleStyleChange(`margin${side.charAt(0).toUpperCase() + side.slice(1)}`, value);
          }}
          onPaddingChange={(side, value) => {
            setPadding(prev => ({ ...prev, [side]: value }));
            handleStyleChange(`padding${side.charAt(0).toUpperCase() + side.slice(1)}`, value);
          }}
        />
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
