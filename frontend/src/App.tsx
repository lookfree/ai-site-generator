import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import PreviewFrame from './components/PreviewFrame';
import ProjectList from './components/ProjectList';
import { useEditHistory } from './hooks/useEditHistory';
import { generateProject, getProjectStatus, getProxyPreviewUrl, getProject, getProjects, updateProjectFile, syncToFly, type Project, type SelectedElement, type ProjectStatus, type ProjectStatusResponse } from './services/api';

type ViewMode = 'chat' | 'design';

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [generationPercent, setGenerationPercent] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const [editFormKey, setEditFormKey] = useState(0); // 用于强制刷新编辑表单

  // 编辑历史 Hook
  const { canUndo, canRedo, addAction, undo, redo, clear: clearHistory } = useEditHistory();

  // 加载最近的已部署项目（如果有）
  useEffect(() => {
    const loadRecentProject = async () => {
      try {
        const projects = await getProjects();
        const deployedProject = projects.find(p => p.status === 'deployed');
        if (deployedProject) {
          setCurrentProject(deployedProject);
          setViewMode('design');
        }
      } catch (error) {
        console.error('Failed to load recent project:', error);
      }
    };
    loadRecentProject();
  }, []);

  // 监听来自 iframe 的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'ELEMENT_SELECTED') {
        setSelectedElement(event.data.data);
      } else if (event.data.type === 'UPDATE_SUCCESS') {
        console.log('Element updated:', event.data.selector);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 当 viewMode 切换时，通知 iframe 启用/禁用编辑模式
  useEffect(() => {
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      if (viewMode === 'design') {
        iframe.contentWindow.postMessage({ type: 'ENABLE_EDIT_MODE' }, '*');
      } else {
        iframe.contentWindow.postMessage({ type: 'DISABLE_EDIT_MODE' }, '*');
        setSelectedElement(null);
      }
    }
  }, [viewMode]);

  // 键盘快捷键: Ctrl+Z 撤销, Ctrl+Y 重做
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo]);

  // 生成项目
  const handleGenerate = useCallback(async (description: string) => {
    setIsGenerating(true);
    setGenerationStatus('正在初始化项目...');
    setGenerationPercent(5);
    clearHistory(); // 清空编辑历史

    try {
      const result = await generateProject(description);

      // 轮询状态
      const pollStatus = async () => {
        try {
          const status = await getProjectStatus(result.projectId);

          // 更新进度信息
          setGenerationStatus(status.progress_message || '处理中...');
          setGenerationPercent(status.progress_percent || 0);

          if (status.status === 'deployed') {
            setCurrentProject({
              id: result.projectId,
              name: `Project ${result.projectId.slice(0, 8)}`,
              description,
              status: 'deployed',
              fly_app_name: '',
              preview_url: status.preview_url,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
            setIsGenerating(false);
            setGenerationPercent(100);
            setViewMode('design');
          } else if (status.status === 'failed') {
            setGenerationStatus(status.progress_message || '生成失败，请重试');
            setGenerationPercent(0);
            setIsGenerating(false);
          } else {
            // 继续轮询
            setTimeout(pollStatus, 1000);
          }
        } catch (error) {
          console.error('Error polling status:', error);
          setTimeout(pollStatus, 2000);
        }
      };

      pollStatus();
    } catch (error) {
      console.error('Generation error:', error);
      setGenerationStatus('生成失败，请重试');
      setGenerationPercent(0);
      setIsGenerating(false);
    }
  }, [clearHistory]);

  // 发送更新到 iframe 并记录历史
  const handleElementUpdate = useCallback((property: string, value: string, oldValue: string) => {
    if (!selectedElement) return;

    // 记录到历史
    addAction({
      selector: selectedElement.selector,
      property,
      oldValue,
      newValue: value,
    });

    // 发送到 iframe
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'UPDATE_ELEMENT',
        selector: selectedElement.selector,
        property,
        value,
      }, '*');
    }
  }, [selectedElement, addAction]);

  // 更新 selectedElement 中的属性值
  const updateSelectedElementProperty = useCallback((property: string, value: string) => {
    if (!selectedElement) return;

    setSelectedElement((prev) => {
      if (!prev) return prev;

      // 如果是文本内容
      if (property === 'textContent') {
        return { ...prev, textContent: value };
      }

      // 如果是样式属性
      if (property in prev.styles) {
        return {
          ...prev,
          styles: {
            ...prev.styles,
            [property]: value,
          },
        };
      }

      return prev;
    });
  }, [selectedElement]);

  // 撤销操作
  const handleUndo = useCallback(() => {
    const action = undo();
    if (action) {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'UPDATE_ELEMENT',
          selector: action.selector,
          property: action.property,
          value: action.oldValue,
        }, '*');

        // 同步更新编辑框中的值
        if (selectedElement && selectedElement.selector === action.selector) {
          updateSelectedElementProperty(action.property, action.oldValue);
          // 强制刷新编辑表单
          setEditFormKey((k) => k + 1);
        }
      }
    }
  }, [undo, selectedElement, updateSelectedElementProperty]);

  // 重做操作
  const handleRedo = useCallback(() => {
    const action = redo();
    if (action) {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'UPDATE_ELEMENT',
          selector: action.selector,
          property: action.property,
          value: action.newValue,
        }, '*');

        // 同步更新编辑框中的值
        if (selectedElement && selectedElement.selector === action.selector) {
          updateSelectedElementProperty(action.property, action.newValue);
          // 强制刷新编辑表单
          setEditFormKey((k) => k + 1);
        }
      }
    }
  }, [redo, selectedElement, updateSelectedElementProperty]);

  // 清除选择
  const handleClearSelection = useCallback(() => {
    setSelectedElement(null);

    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'CLEAR_SELECTION' }, '*');
    }
  }, []);

  // 保存修改到 Fly.io
  const handleSaveChanges = useCallback(async () => {
    if (!currentProject) return;

    setIsSaving(true);
    try {
      const iframe = document.querySelector('iframe') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        // 请求 iframe 返回完整的 HTML
        iframe.contentWindow.postMessage({ type: 'GET_FULL_HTML' }, '*');
      }
    } catch (error) {
      console.error('Save failed:', error);
      console.error('保存失败，请重试');
      setIsSaving(false);
    }
  }, [currentProject]);

  // 从数据库同步到 Fly.io
  const handleSyncToFly = useCallback(async () => {
    if (!currentProject) return;

    setIsSyncing(true);
    try {
      const result = await syncToFly(currentProject.id);
      console.log(`同步成功！${result.message}`);
      // 刷新 iframe
      const iframe = document.querySelector('iframe') as HTMLIFrameElement;
      if (iframe) {
        iframe.src = iframe.src;
      }
    } catch (error) {
      console.error('Sync failed:', error);
      console.error('同步失败，请重试');
    } finally {
      setIsSyncing(false);
    }
  }, [currentProject]);

  // 切换项目
  const handleSelectProject = useCallback((project: Project) => {
    setCurrentProject(project);
    setViewMode('design');
    setSelectedElement(null);
    clearHistory();
  }, [clearHistory]);

  // 监听 iframe 返回的完整 HTML
  useEffect(() => {
    const handleSaveResponse = async (event: MessageEvent) => {
      if (event.data.type === 'FULL_HTML_RESPONSE' && currentProject) {
        try {
          // 保存 HTML 到 Fly.io
          await updateProjectFile(currentProject.id, 'index.html', event.data.html);

          // 如果有 CSS 修改，也保存
          if (event.data.css) {
            await updateProjectFile(currentProject.id, 'style.css', event.data.css);
          }

          console.log('保存成功！修改已同步到服务器');
        } catch (error) {
          console.error('Save failed:', error);
          console.error('保存失败，请重试');
        } finally {
          setIsSaving(false);
        }
      }
    };

    window.addEventListener('message', handleSaveResponse);
    return () => window.removeEventListener('message', handleSaveResponse);
  }, [currentProject]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部导航 */}
      <Header
        projectName={currentProject?.name || '新项目'}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        hasProject={!!currentProject}
        onShowProjectList={() => setShowProjectList(true)}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧面板 */}
        <LeftPanel
          viewMode={viewMode}
          isGenerating={isGenerating}
          generationStatus={generationStatus}
          generationPercent={generationPercent}
          onGenerate={handleGenerate}
          selectedElement={selectedElement}
          onElementUpdate={handleElementUpdate}
          onClearSelection={handleClearSelection}
          onSaveChanges={handleSaveChanges}
          isSaving={isSaving}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          editFormKey={editFormKey}
        />

        {/* 右侧预览区 */}
        <div className="flex-1 bg-gray-100 relative flex flex-col">
          {/* iframe 预览 */}
          <div className="flex-1 relative">
            {currentProject ? (
              <PreviewFrame
                projectId={currentProject.id}
                previewUrl={getProxyPreviewUrl(currentProject.id)}
                editModeEnabled={viewMode === 'design'}
              />
            ) : !isGenerating ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">🎨</div>
                  <p className="text-lg">输入项目描述开始生成</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 底部工具栏 */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between">
        {/* 左侧模式切换 */}
        <div className="flex items-center gap-2">
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'design'
                ? 'bg-blue-500 text-white'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => setViewMode(viewMode === 'design' ? 'chat' : 'design')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Visual edits
          </button>
          <button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              viewMode === 'chat'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
            onClick={() => setViewMode('chat')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat
          </button>
        </div>

        {/* 右侧操作按钮 */}
        <div className="flex items-center gap-2">
          {currentProject && (
            <>
              <span className="text-sm text-gray-400">
                预览: {currentProject.preview_url}
              </span>
              <button
                onClick={handleSyncToFly}
                disabled={isSyncing}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
                title="从数据库恢复内容到 Fly.io"
              >
                {isSyncing ? '同步中...' : '同步'}
              </button>
              <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-colors shadow-sm">
                发布
              </button>
            </>
          )}
        </div>
      </div>

      {/* 项目列表弹窗 */}
      <ProjectList
        isOpen={showProjectList}
        onClose={() => setShowProjectList(false)}
        onSelectProject={handleSelectProject}
        currentProjectId={currentProject?.id}
      />
    </div>
  );
}

export default App;
