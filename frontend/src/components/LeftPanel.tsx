import { useState, useCallback } from 'react';
import type { ComponentNode } from '../services/api';
import ComponentTree from './ComponentTree';
import PropertyPanel from './PropertyPanel';

interface LeftPanelProps {
  viewMode: 'chat' | 'design';
  isGenerating: boolean;
  generationStatus: string;
  generationPercent: number;
  onGenerate: (description: string) => void;
  projectId?: string;
  onSelectComponent?: (component: ComponentNode) => void;
}

function LeftPanel({
  viewMode,
  isGenerating,
  generationStatus,
  generationPercent,
  onGenerate,
  projectId,
  onSelectComponent,
}: LeftPanelProps) {
  const [description, setDescription] = useState('');
  const [designView, setDesignView] = useState<'tree' | 'properties'>('tree');
  const [selectedComponentFromTree, setSelectedComponentFromTree] = useState<ComponentNode | null>(null);
  const [treeRefreshKey, setTreeRefreshKey] = useState(0);

  // 处理组件选择（来自组件树）
  const handleSelectComponent = useCallback((component: ComponentNode) => {
    setSelectedComponentFromTree(component);
    setDesignView('properties');
    onSelectComponent?.(component);
  }, [onSelectComponent]);

  // 刷新组件树
  const handleRefreshTree = useCallback(() => {
    setTreeRefreshKey((k) => k + 1);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim() && !isGenerating) {
      onGenerate(description.trim());
    }
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
          <div className="flex flex-col h-full -m-4">
            {/* 视图切换标签 */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setDesignView('tree')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  designView === 'tree'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  组件树
                </span>
              </button>
              <button
                onClick={() => setDesignView('properties')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                  designView === 'properties'
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  属性
                </span>
              </button>
            </div>

            {/* 组件树视图 */}
            {designView === 'tree' && projectId && (
              <div className="flex-1 overflow-hidden">
                <ComponentTree
                  key={treeRefreshKey}
                  projectId={projectId}
                  selectedComponentId={selectedComponentFromTree?.id}
                  onSelectComponent={handleSelectComponent}
                  onRefresh={handleRefreshTree}
                />
              </div>
            )}

            {/* 属性面板视图 - AST 驱动 */}
            {designView === 'properties' && projectId && (
              <div className="flex-1 overflow-hidden">
                <PropertyPanel
                  projectId={projectId}
                  selectedComponent={selectedComponentFromTree}
                  onRefresh={handleRefreshTree}
                />
              </div>
            )}

            {/* 属性面板视图 - 无项目 */}
            {designView === 'properties' && !projectId && (
              <div className="flex-1 flex items-center justify-center text-gray-400 p-4">
                <p className="text-sm">请先创建或选择一个项目</p>
              </div>
            )}
      </div>
        )}
      </div>
    </div>
  );
}

export default LeftPanel;
