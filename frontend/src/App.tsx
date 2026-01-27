import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import LeftPanel from './components/LeftPanel';
import PreviewFrame from './components/PreviewFrame';
import ProjectList from './components/ProjectList';
import { generateProject, getProjectStatus, getProxyPreviewUrl, getProjects, syncToFly, type Project, type ComponentNode } from './services/api';
import { useIframeCommunication } from 'visual-editor';

// Use proxy URL for same-origin iframe communication
// Backend now supports WebSocket proxy for Vite HMR
const getPreviewUrl = getProxyPreviewUrl;

type ViewMode = 'chat' | 'design';

interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    primaryText: string;
    secondary: string;
    secondaryText: string;
    accent: string;
    accentText: string;
  };
  typography: {
    sansSerif: string;
    serif: string;
    mono: string;
  };
  effects: {
    borderRadius: string;
    shadowColor: string;
    shadowOpacity: number;
  };
}

function App() {
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [generationPercent, setGenerationPercent] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showProjectList, setShowProjectList] = useState(false);
  const { enableEdit, disableEdit } = useIframeCommunication();

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

  // 当 viewMode 切换时，通知 iframe 启用/禁用编辑模式
  useEffect(() => {
    if (viewMode === 'design') {
      enableEdit();
    } else {
      disableEdit();
    }
  }, [viewMode, enableEdit, disableEdit]);

  // 生成项目
  const handleGenerate = useCallback(async (description: string) => {
    setIsGenerating(true);
    setGenerationStatus('正在初始化项目...');
    setGenerationPercent(5);

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
  }, []);


  // 从数据库同步到 Fly.io
  const handleSyncToFly = useCallback(async () => {
    if (!currentProject) return;

    setIsSyncing(true);
    try {
      const result = await syncToFly(currentProject.id);
      console.log(`同步成功！${result.message}`);
      // HMR will automatically update the preview when fly-server receives the file sync
      // No need to manually reload iframe - this would cause white screen
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
  }, []);

  // 处理组件树选择
  const handleSelectComponent = useCallback((component: ComponentNode) => {
    console.log('Component selected:', component);
    // TODO: 高亮 iframe 中对应的元素
    // TODO: 同步到属性面板
  }, []);

  // 处理应用主题
  const handleApplyTheme = useCallback((theme: Theme) => {
    console.log('Apply theme:', theme);

    // 发送主题到 iframe
    const iframe = document.querySelector('iframe') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'APPLY_THEME',
        theme: {
          colors: theme.colors,
          typography: theme.typography,
          effects: theme.effects
        }
      }, '*');
    }
  }, []);


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
          projectId={currentProject?.id}
          onSelectComponent={handleSelectComponent}
          onApplyTheme={handleApplyTheme}
        />

        {/* 右侧预览区 */}
        <div className="flex-1 bg-gray-100 relative flex flex-col">
          {/* iframe 预览 */}
          <div className="flex-1 relative">
            {currentProject ? (
              <PreviewFrame
                projectId={currentProject.id}
                previewUrl={getPreviewUrl(currentProject.id)}
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

      {/* Bottom toolbar */}
      <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between">
        {/* Left - Mode switcher */}
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

        {/* Right - Action buttons */}
        <div className="flex items-center gap-2">
          {currentProject && (
            <>
              <span className="text-sm text-gray-400">
                Preview: {getPreviewUrl(currentProject.id)}
              </span>
              <button
                onClick={handleSyncToFly}
                disabled={isSyncing}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 transition-colors"
                title="Sync content from database to Fly.io"
              >
                {isSyncing ? 'Syncing...' : 'Sync'}
              </button>
              <button className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-colors shadow-sm">
                Publish
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
