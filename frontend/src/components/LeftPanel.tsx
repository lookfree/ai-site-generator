import { useState } from 'react';
import type { SelectedElement } from '../services/api';

interface LeftPanelProps {
  viewMode: 'chat' | 'design';
  isGenerating: boolean;
  generationStatus: string;
  generationPercent: number;
  onGenerate: (description: string) => void;
  selectedElement: SelectedElement | null;
  onElementUpdate: (property: string, value: string, oldValue: string) => void;
  onClearSelection: () => void;
  onSaveChanges: () => void;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  editFormKey?: number;
}

function LeftPanel({
  viewMode,
  isGenerating,
  generationStatus,
  generationPercent,
  onGenerate,
  selectedElement,
  onElementUpdate,
  onClearSelection,
  onSaveChanges,
  isSaving,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  editFormKey = 0,
}: LeftPanelProps) {
  const [description, setDescription] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'spacing' | 'effects'>('basic');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim() && !isGenerating) {
      onGenerate(description.trim());
    }
  };

  // 处理样式更新，包含旧值用于历史记录
  const handleStyleUpdate = (property: string, newValue: string, oldValue: string) => {
    onElementUpdate(property, newValue, oldValue);
  };

  return (
    <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
      {/* 面板标题 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="font-semibold text-gray-800">
          {viewMode === 'chat' ? '创建项目' : 'Visual Edit'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {viewMode === 'chat'
            ? '描述你想要的网站'
            : '点击页面元素进行编辑'}
        </p>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'chat' ? (
          /* Chat 模式 - 输入描述 */
          <div className="h-full flex flex-col">
            {isGenerating ? (
              /* 生成中状态 */
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                {/* 进度环 */}
                <div className="relative w-24 h-24 mb-6">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - generationPercent / 100)}`}
                      className="transition-all duration-500 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-600">{generationPercent}%</span>
                  </div>
                </div>

                {/* 状态信息 */}
                <p className="text-gray-700 font-medium text-lg mb-2">{generationStatus}</p>

                {/* 进度条 */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${generationPercent}%` }}
                  />
                </div>

                {/* 阶段提示 */}
                <div className="w-full space-y-2 text-left">
                  <div className={`flex items-center text-sm ${generationPercent >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-2">{generationPercent >= 10 ? '✓' : '○'}</span>
                    分析需求
                  </div>
                  <div className={`flex items-center text-sm ${generationPercent >= 20 ? 'text-green-600' : generationPercent >= 10 ? 'text-blue-600 animate-pulse' : 'text-gray-400'}`}>
                    <span className="mr-2">{generationPercent >= 60 ? '✓' : generationPercent >= 20 ? '◐' : '○'}</span>
                    生成代码
                  </div>
                  <div className={`flex items-center text-sm ${generationPercent >= 60 ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-2">{generationPercent >= 60 ? '✓' : '○'}</span>
                    保存文件
                  </div>
                  <div className={`flex items-center text-sm ${generationPercent >= 100 ? 'text-green-600' : generationPercent >= 80 ? 'text-blue-600 animate-pulse' : 'text-gray-400'}`}>
                    <span className="mr-2">{generationPercent >= 100 ? '✓' : generationPercent >= 80 ? '◐' : '○'}</span>
                    部署到 Fly.io
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-4">
                  首次生成可能需要 1-3 分钟
                </p>
              </div>
            ) : (
              /* 输入表单 */
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    项目描述
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="例如：一个现代化的任务管理系统，包含任务列表、添加任务、删除任务功能，使用渐变背景和卡片式设计..."
                    className="w-full h-40 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!description.trim()}
                  className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  生成网站
                </button>

                {/* 示例提示 */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 font-medium mb-2">示例提示:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• "一个产品展示页面，包含导航栏、轮播图、特性介绍"</li>
                    <li>• "博客首页，显示文章列表、侧边栏、搜索功能"</li>
                    <li>• "登录注册页面，简洁现代设计"</li>
                  </ul>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Design 模式 - Visual Edit */
          <div className="space-y-4">
            {/* 撤销/重做按钮 */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                title="撤销 (Ctrl+Z)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                撤销
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                title="重做 (Ctrl+Y)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
                重做
              </button>
            </div>

            {/* Visual edits 区域 */}
            <div className="text-center py-4">
              {selectedElement ? (
                <div key={`${selectedElement.selector}-${editFormKey}`} className="text-left space-y-4">
                  {/* 选中元素信息 */}
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                    <p className="text-sm font-medium text-purple-800">
                      已选中: {selectedElement.tagName}
                    </p>
                    <p className="text-xs text-purple-600 mt-1 truncate">
                      {selectedElement.selector}
                    </p>
                  </div>

                  {/* 样式标签页 */}
                  <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setActiveTab('basic')}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                        activeTab === 'basic'
                          ? 'bg-white shadow text-gray-800'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      基础
                    </button>
                    <button
                      onClick={() => setActiveTab('spacing')}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                        activeTab === 'spacing'
                          ? 'bg-white shadow text-gray-800'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      间距
                    </button>
                    <button
                      onClick={() => setActiveTab('effects')}
                      className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                        activeTab === 'effects'
                          ? 'bg-white shadow text-gray-800'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      效果
                    </button>
                  </div>

                  {/* 基础样式 */}
                  {activeTab === 'basic' && (
                    <div className="space-y-4">
                      {/* 文本编辑 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          文本内容
                        </label>
                        <textarea
                          defaultValue={selectedElement.textContent}
                          onChange={(e) => handleStyleUpdate('textContent', e.target.value, selectedElement.textContent)}
                          className="w-full h-20 p-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>

                      {/* 颜色编辑 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            文字颜色
                          </label>
                          <input
                            type="color"
                            defaultValue={rgbToHex(selectedElement.styles.color)}
                            onChange={(e) => handleStyleUpdate('color', e.target.value, selectedElement.styles.color)}
                            className="w-full h-10 rounded border border-gray-300 cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            背景颜色
                          </label>
                          <input
                            type="color"
                            defaultValue={rgbToHex(selectedElement.styles.backgroundColor)}
                            onChange={(e) => handleStyleUpdate('backgroundColor', e.target.value, selectedElement.styles.backgroundColor)}
                            className="w-full h-10 rounded border border-gray-300 cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* 字体设置 */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            字体大小
                          </label>
                          <input
                            type="text"
                            defaultValue={selectedElement.styles.fontSize}
                            onChange={(e) => handleStyleUpdate('fontSize', e.target.value, selectedElement.styles.fontSize)}
                            placeholder="16px"
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            字体粗细
                          </label>
                          <select
                            defaultValue={selectedElement.styles.fontWeight}
                            onChange={(e) => handleStyleUpdate('fontWeight', e.target.value, selectedElement.styles.fontWeight)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="100">100 - Thin</option>
                            <option value="200">200 - ExtraLight</option>
                            <option value="300">300 - Light</option>
                            <option value="400">400 - Normal</option>
                            <option value="500">500 - Medium</option>
                            <option value="600">600 - SemiBold</option>
                            <option value="700">700 - Bold</option>
                            <option value="800">800 - ExtraBold</option>
                            <option value="900">900 - Black</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 间距样式 */}
                  {activeTab === 'spacing' && (
                    <div className="space-y-4">
                      {/* Padding */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          内边距 (Padding)
                        </label>
                        <input
                          type="text"
                          defaultValue={selectedElement.styles.padding}
                          onChange={(e) => handleStyleUpdate('padding', e.target.value, selectedElement.styles.padding)}
                          placeholder="10px 或 10px 20px"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">支持: 10px, 10px 20px, 10px 20px 30px 40px</p>
                      </div>

                      {/* Margin */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          外边距 (Margin)
                        </label>
                        <input
                          type="text"
                          defaultValue={selectedElement.styles.margin}
                          onChange={(e) => handleStyleUpdate('margin', e.target.value, selectedElement.styles.margin)}
                          placeholder="10px 或 auto"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">支持: 10px, auto, 10px auto</p>
                      </div>
                    </div>
                  )}

                  {/* 效果样式 */}
                  {activeTab === 'effects' && (
                    <div className="space-y-4">
                      {/* Border Radius */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          圆角 (Border Radius)
                        </label>
                        <input
                          type="text"
                          defaultValue={selectedElement.styles.borderRadius}
                          onChange={(e) => handleStyleUpdate('borderRadius', e.target.value, selectedElement.styles.borderRadius)}
                          placeholder="8px 或 50%"
                          className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                        />
                      </div>

                      {/* 预设圆角 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          快速圆角
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                          {['0px', '4px', '8px', '16px', '24px', '9999px'].map((radius) => (
                            <button
                              key={radius}
                              onClick={() => handleStyleUpdate('borderRadius', radius, selectedElement.styles.borderRadius)}
                              className="px-2 py-1.5 text-xs border border-gray-300 rounded hover:bg-purple-50 hover:border-purple-300 transition-colors"
                            >
                              {radius === '9999px' ? '圆形' : radius}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 操作按钮 */}
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    <button
                      onClick={onClearSelection}
                      className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                    >
                      清除选择
                    </button>
                    <button
                      onClick={onSaveChanges}
                      disabled={isSaving}
                      className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:bg-purple-300 transition-colors"
                    >
                      {isSaving ? '保存中...' : '保存修改'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 未选中状态 */}
                  <div className="flex justify-center mb-4">
                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Visual edits</h3>
                  <p className="text-gray-600">Select an element to edit it</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Hold <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono">Cmd</kbd> to select multiple elements
                  </p>
                </>
              )}
            </div>

            {/* 分隔线 */}
            <div className="border-t border-gray-200" />

            {/* Themes 区域 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3 px-1">Themes</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Default', primary: '#3b82f6', secondary: '#e5e7eb' },
                  { name: 'Ocean', primary: '#0891b2', secondary: '#cffafe' },
                  { name: 'Forest', primary: '#16a34a', secondary: '#dcfce7' },
                  { name: 'Sunset', primary: '#ea580c', secondary: '#ffedd5' },
                  { name: 'Purple', primary: '#9333ea', secondary: '#f3e8ff' },
                  { name: 'Rose', primary: '#e11d48', secondary: '#ffe4e6' },
                ].map((theme) => (
                  <button
                    key={theme.name}
                    className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    onClick={() => {
                      console.log('Apply theme:', theme.name);
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full border border-gray-200"
                      style={{ background: `linear-gradient(135deg, ${theme.primary} 50%, ${theme.secondary} 50%)` }}
                    />
                    <span className="text-sm text-gray-700">{theme.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
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

export default LeftPanel;
