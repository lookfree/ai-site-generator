import { useState, useCallback } from 'react';
import type { ComponentNode } from '../services/api';
import ThemePanel from './ThemePanel';
import VisualEditorPanel from './VisualEditorPanel';

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

interface LeftPanelProps {
  viewMode: 'chat' | 'design';
  isGenerating: boolean;
  generationStatus: string;
  generationPercent: number;
  onGenerate: (description: string) => void;
  projectId?: string;
  onSelectComponent?: (component: ComponentNode) => void;
  onApplyTheme?: (theme: Theme) => void;
}

type DesignSection = 'menu' | 'themes' | 'visual-edits';

function LeftPanel({
  viewMode,
  isGenerating,
  generationStatus,
  generationPercent,
  onGenerate,
  projectId,
  onApplyTheme,
}: LeftPanelProps) {
  const [description, setDescription] = useState('');
  const [designSection, setDesignSection] = useState<DesignSection>('menu');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (description.trim() && !isGenerating) {
      onGenerate(description.trim());
    }
  };

  // 返回菜单
  const handleBackToMenu = useCallback(() => {
    setDesignSection('menu');
  }, []);

  return (
    <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
      {/* Panel header */}
      <div className="px-4 py-3 border-b border-gray-200">
        {viewMode === 'design' && designSection !== 'menu' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackToMenu}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h2 className="font-semibold text-gray-800">
                {designSection === 'themes' ? 'Themes' : 'Visual Edits'}
              </h2>
              <p className="text-sm text-gray-500">
                {designSection === 'themes'
                  ? 'Browse and apply themes'
                  : 'Select elements to edit'}
              </p>
            </div>
          </div>
        ) : (
          <>
            <h2 className="font-semibold text-gray-800">
              {viewMode === 'chat' ? 'Create Project' : 'Design'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {viewMode === 'chat'
                ? 'Describe your website'
                : 'Customize your project'}
            </p>
          </>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {viewMode === 'chat' ? (
          /* Chat mode - input description */
          <div className="h-full flex flex-col p-4">
            {isGenerating ? (
              /* Generating state */
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                {/* Progress ring */}
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

                {/* Status info */}
                <p className="text-gray-700 font-medium text-lg mb-2">{generationStatus}</p>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${generationPercent}%` }}
                  />
                </div>

                {/* Stage hints */}
                <div className="w-full space-y-2 text-left">
                  <div className={`flex items-center text-sm ${generationPercent >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-2">{generationPercent >= 10 ? '✓' : '○'}</span>
                    Analyzing requirements
                  </div>
                  <div className={`flex items-center text-sm ${generationPercent >= 20 ? 'text-green-600' : generationPercent >= 10 ? 'text-blue-600 animate-pulse' : 'text-gray-400'}`}>
                    <span className="mr-2">{generationPercent >= 60 ? '✓' : generationPercent >= 20 ? '◐' : '○'}</span>
                    Generating code
                  </div>
                  <div className={`flex items-center text-sm ${generationPercent >= 60 ? 'text-green-600' : 'text-gray-400'}`}>
                    <span className="mr-2">{generationPercent >= 60 ? '✓' : '○'}</span>
                    Saving files
                  </div>
                  <div className={`flex items-center text-sm ${generationPercent >= 100 ? 'text-green-600' : generationPercent >= 80 ? 'text-blue-600 animate-pulse' : 'text-gray-400'}`}>
                    <span className="mr-2">{generationPercent >= 100 ? '✓' : generationPercent >= 80 ? '◐' : '○'}</span>
                    Deploying to Fly.io
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-4">
                  First generation may take 1-3 minutes
                </p>
              </div>
            ) : (
              /* Input form */
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="E.g., A modern task management system with task list, add/delete tasks, gradient background and card design..."
                    className="w-full h-40 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!description.trim()}
                  className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Generate Website
                </button>

                {/* Example prompts */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 font-medium mb-2">Example prompts:</p>
                  <ul className="text-xs text-gray-500 space-y-1">
                    <li>• "A product showcase page with navbar, carousel, features"</li>
                    <li>• "Blog homepage with article list, sidebar, search"</li>
                    <li>• "Login/signup page with clean modern design"</li>
                  </ul>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Design mode - Lovable style menu */
          <div className="h-full">
            {designSection === 'menu' ? (
              /* Main menu - Themes and Visual edits */
              <div className="p-4 space-y-3">
                {/* Themes Card */}
                <button
                  onClick={() => setDesignSection('themes')}
                  className="w-full p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">Themes</h3>
                      <p className="text-sm text-gray-500 mt-0.5">Browse and apply themes to your project</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                {/* Visual Edits Card */}
                <button
                  onClick={() => setDesignSection('visual-edits')}
                  className="w-full p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800">Visual edits</h3>
                      <p className="text-sm text-gray-500 mt-0.5">Select elements to edit and style visually</p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            ) : designSection === 'themes' ? (
              /* Themes Panel */
              <ThemePanel projectId={projectId} onApplyTheme={onApplyTheme} />
            ) : (
              <VisualEditorPanel projectId={projectId} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LeftPanel;
