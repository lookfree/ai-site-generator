import type { SelectedElement } from '../services/api';

interface EditPanelProps {
  element: SelectedElement;
  onUpdate: (property: string, value: string) => void;
  onClose: () => void;
}

function EditPanel({ element, onUpdate, onClose }: EditPanelProps) {
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-lg">
      {/* 头部 */}
      <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between">
        <span className="font-medium">编辑元素</span>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center hover:bg-blue-700 rounded transition-colors"
        >
          ✕
        </button>
      </div>

      {/* 内容 */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* 元素信息 */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-mono rounded">
              {element.tagName}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">{element.selector}</p>
        </div>

        {/* 文本内容 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            文本内容
          </label>
          <textarea
            defaultValue={element.textContent}
            onChange={(e) => onUpdate('textContent', e.target.value)}
            className="w-full h-24 p-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="输入文本内容..."
          />
        </div>

        {/* 样式属性 */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">样式属性</h3>

          <div className="space-y-3">
            {/* 文字颜色 */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">文字颜色</label>
              <input
                type="color"
                defaultValue={rgbToHex(element.styles.color)}
                onChange={(e) => onUpdate('color', e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              />
            </div>

            {/* 背景颜色 */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">背景颜色</label>
              <input
                type="color"
                defaultValue={rgbToHex(element.styles.backgroundColor)}
                onChange={(e) => onUpdate('backgroundColor', e.target.value)}
                className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
              />
            </div>

            {/* 字体大小 */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">字体大小</label>
              <input
                type="text"
                defaultValue={element.styles.fontSize}
                onChange={(e) => onUpdate('fontSize', e.target.value)}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 字体粗细 */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">字体粗细</label>
              <select
                defaultValue={element.styles.fontWeight}
                onChange={(e) => onUpdate('fontWeight', e.target.value)}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="400">正常</option>
                <option value="500">中等</option>
                <option value="600">半粗</option>
                <option value="700">粗体</option>
              </select>
            </div>

            {/* 内边距 */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">内边距</label>
              <input
                type="text"
                defaultValue={element.styles.padding}
                onChange={(e) => onUpdate('padding', e.target.value)}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 外边距 */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">外边距</label>
              <input
                type="text"
                defaultValue={element.styles.margin}
                onChange={(e) => onUpdate('margin', e.target.value)}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 圆角 */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-600">圆角</label>
              <input
                type="text"
                defaultValue={element.styles.borderRadius}
                onChange={(e) => onUpdate('borderRadius', e.target.value)}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 底部操作 */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          完成编辑
        </button>
      </div>
    </div>
  );
}

// RGB 转 Hex 辅助函数
function rgbToHex(rgb: string): string {
  if (rgb.startsWith('#')) return rgb;
  if (rgb === 'transparent' || rgb === 'rgba(0, 0, 0, 0)') return '#ffffff';

  const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return '#ffffff';

  const r = parseInt(match[1]).toString(16).padStart(2, '0');
  const g = parseInt(match[2]).toString(16).padStart(2, '0');
  const b = parseInt(match[3]).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

export default EditPanel;
