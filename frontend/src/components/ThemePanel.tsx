import { useState, useCallback } from 'react';

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

interface ThemePanelProps {
  projectId?: string;
  onApplyTheme?: (theme: Theme) => void;
  onSaveTheme?: (theme: Theme) => void;
}

// 预设主题
const defaultThemes: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    colors: {
      primary: '#353337',
      primaryText: '#fbfbfb',
      secondary: '#f7f7f7',
      secondaryText: '#353337',
      accent: '#3b82f6',
      accentText: '#ffffff',
    },
    typography: {
      sansSerif: 'Inter',
      serif: 'Lora',
      mono: 'Space Mono',
    },
    effects: {
      borderRadius: '0.375rem',
      shadowColor: '#000000',
      shadowOpacity: 0.1,
    },
  },
  {
    id: 'glacier',
    name: 'Glacier',
    colors: {
      primary: '#0f172a',
      primaryText: '#f8fafc',
      secondary: '#e2e8f0',
      secondaryText: '#1e293b',
      accent: '#0ea5e9',
      accentText: '#ffffff',
    },
    typography: {
      sansSerif: 'Inter',
      serif: 'Merriweather',
      mono: 'JetBrains Mono',
    },
    effects: {
      borderRadius: '0.5rem',
      shadowColor: '#0f172a',
      shadowOpacity: 0.08,
    },
  },
  {
    id: 'harvest',
    name: 'Harvest',
    colors: {
      primary: '#78350f',
      primaryText: '#fef3c7',
      secondary: '#fef3c7',
      secondaryText: '#78350f',
      accent: '#f59e0b',
      accentText: '#ffffff',
    },
    typography: {
      sansSerif: 'Poppins',
      serif: 'Playfair Display',
      mono: 'Fira Code',
    },
    effects: {
      borderRadius: '0.75rem',
      shadowColor: '#78350f',
      shadowOpacity: 0.12,
    },
  },
  {
    id: 'lavender',
    name: 'Lavender',
    colors: {
      primary: '#4c1d95',
      primaryText: '#f5f3ff',
      secondary: '#ede9fe',
      secondaryText: '#5b21b6',
      accent: '#8b5cf6',
      accentText: '#ffffff',
    },
    typography: {
      sansSerif: 'DM Sans',
      serif: 'Crimson Pro',
      mono: 'IBM Plex Mono',
    },
    effects: {
      borderRadius: '1rem',
      shadowColor: '#4c1d95',
      shadowOpacity: 0.1,
    },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    colors: {
      primary: '#18181b',
      primaryText: '#fafafa',
      secondary: '#27272a',
      secondaryText: '#e4e4e7',
      accent: '#a855f7',
      accentText: '#ffffff',
    },
    typography: {
      sansSerif: 'Inter',
      serif: 'Source Serif Pro',
      mono: 'Source Code Pro',
    },
    effects: {
      borderRadius: '0.5rem',
      shadowColor: '#000000',
      shadowOpacity: 0.25,
    },
  },
  {
    id: 'orchid',
    name: 'Orchid',
    colors: {
      primary: '#831843',
      primaryText: '#fdf2f8',
      secondary: '#fce7f3',
      secondaryText: '#9d174d',
      accent: '#ec4899',
      accentText: '#ffffff',
    },
    typography: {
      sansSerif: 'Nunito',
      serif: 'EB Garamond',
      mono: 'Roboto Mono',
    },
    effects: {
      borderRadius: '1.5rem',
      shadowColor: '#831843',
      shadowOpacity: 0.08,
    },
  },
];

// 颜色选择器组件
function ThemeColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded border border-gray-300"
          style={{ backgroundColor: value }}
        />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-2 py-1 text-xs font-mono text-gray-600 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 cursor-pointer border-0 p-0"
        />
      </div>
    </div>
  );
}

// 主题颜色预览
function ThemeColorPreview({ theme }: { theme: Theme }) {
  const colors = [
    theme.colors.primary,
    theme.colors.secondary,
    theme.colors.accent,
    theme.colors.primaryText,
    theme.colors.secondaryText,
  ];

  return (
    <div className="flex gap-0.5">
      {colors.map((color, i) => (
        <div
          key={i}
          className="w-5 h-5 rounded-full border border-gray-200"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function ThemePanel({ onApplyTheme }: ThemePanelProps) {
  const [currentTheme, setCurrentTheme] = useState<Theme>(defaultThemes[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'effects'>('colors');

  // 应用主题
  const handleApplyTheme = useCallback((theme: Theme) => {
    setCurrentTheme(theme);
    onApplyTheme?.(theme);
  }, [onApplyTheme]);

  // 编辑主题
  const handleEditTheme = useCallback(() => {
    setEditingTheme({ ...currentTheme });
    setIsEditing(true);
  }, [currentTheme]);

  // 更新编辑中的主题颜色
  const updateEditingColor = useCallback((key: keyof Theme['colors'], value: string) => {
    if (!editingTheme) return;
    setEditingTheme({
      ...editingTheme,
      colors: { ...editingTheme.colors, [key]: value },
    });
  }, [editingTheme]);

  // 更新编辑中的字体
  const updateEditingFont = useCallback((key: keyof Theme['typography'], value: string) => {
    if (!editingTheme) return;
    setEditingTheme({
      ...editingTheme,
      typography: { ...editingTheme.typography, [key]: value },
    });
  }, [editingTheme]);

  // 更新编辑中的效果
  const updateEditingEffect = useCallback((key: keyof Theme['effects'], value: string | number) => {
    if (!editingTheme) return;
    setEditingTheme({
      ...editingTheme,
      effects: { ...editingTheme.effects, [key]: value },
    });
  }, [editingTheme]);

  // 保存主题修改
  const handleSaveEdit = useCallback(() => {
    if (!editingTheme) return;
    setCurrentTheme(editingTheme);
    onApplyTheme?.(editingTheme);
    setIsEditing(false);
    setEditingTheme(null);
  }, [editingTheme, onApplyTheme]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingTheme(null);
  }, []);

  // 主题编辑视图
  if (isEditing && editingTheme) {
    return (
      <div className="h-full flex flex-col">
        {/* 编辑器头部 */}
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelEdit}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-700">Edit Theme</span>
          </div>
          <button
            onClick={handleSaveEdit}
            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-gray-200">
          {(['colors', 'typography', 'effects'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-4 py-2 text-xs font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 编辑内容 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'colors' && (
            <div className="space-y-4">
              {/* Primary */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  Primary
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </h4>
                <ThemeColorPicker
                  label="Primary"
                  value={editingTheme.colors.primary}
                  onChange={(v) => updateEditingColor('primary', v)}
                />
                <ThemeColorPicker
                  label="Primary Text"
                  value={editingTheme.colors.primaryText}
                  onChange={(v) => updateEditingColor('primaryText', v)}
                />
              </div>

              {/* Secondary */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  Secondary
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </h4>
                <ThemeColorPicker
                  label="Secondary"
                  value={editingTheme.colors.secondary}
                  onChange={(v) => updateEditingColor('secondary', v)}
                />
                <ThemeColorPicker
                  label="Secondary Text"
                  value={editingTheme.colors.secondaryText}
                  onChange={(v) => updateEditingColor('secondaryText', v)}
                />
              </div>

              {/* Accent */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  Accent
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </h4>
                <ThemeColorPicker
                  label="Accent"
                  value={editingTheme.colors.accent}
                  onChange={(v) => updateEditingColor('accent', v)}
                />
                <ThemeColorPicker
                  label="Accent Text"
                  value={editingTheme.colors.accentText}
                  onChange={(v) => updateEditingColor('accentText', v)}
                />
              </div>
            </div>
          )}

          {activeTab === 'typography' && (
            <div className="space-y-4">
              {/* Sans-serif */}
              <div>
                <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  Sans-serif
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </label>
                <select
                  value={editingTheme.typography.sansSerif}
                  onChange={(e) => updateEditingFont('sansSerif', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Inter">Inter</option>
                  <option value="Poppins">Poppins</option>
                  <option value="DM Sans">DM Sans</option>
                  <option value="Nunito">Nunito</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Roboto">Roboto</option>
                </select>
              </div>

              {/* Serif */}
              <div>
                <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  Serif
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </label>
                <select
                  value={editingTheme.typography.serif}
                  onChange={(e) => updateEditingFont('serif', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Lora">Lora</option>
                  <option value="Merriweather">Merriweather</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Crimson Pro">Crimson Pro</option>
                  <option value="EB Garamond">EB Garamond</option>
                  <option value="Source Serif Pro">Source Serif Pro</option>
                </select>
              </div>

              {/* Mono */}
              <div>
                <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  Mono
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </label>
                <select
                  value={editingTheme.typography.mono}
                  onChange={(e) => updateEditingFont('mono', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Space Mono">Space Mono</option>
                  <option value="JetBrains Mono">JetBrains Mono</option>
                  <option value="Fira Code">Fira Code</option>
                  <option value="IBM Plex Mono">IBM Plex Mono</option>
                  <option value="Source Code Pro">Source Code Pro</option>
                  <option value="Roboto Mono">Roboto Mono</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'effects' && (
            <div className="space-y-4">
              {/* Border Radius */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  Radius
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </h4>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Radius</span>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.125"
                    value={parseFloat(editingTheme.effects.borderRadius)}
                    onChange={(e) => updateEditingEffect('borderRadius', `${e.target.value}rem`)}
                    className="flex-1"
                  />
                  <input
                    type="text"
                    value={editingTheme.effects.borderRadius}
                    onChange={(e) => updateEditingEffect('borderRadius', e.target.value)}
                    className="w-16 px-2 py-1 text-xs text-right border border-gray-200 rounded"
                  />
                </div>
              </div>

              {/* Shadow */}
              <div>
                <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                  Shadow
                  <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Color</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded border border-gray-300"
                        style={{ backgroundColor: editingTheme.effects.shadowColor }}
                      />
                      <input
                        type="text"
                        value={editingTheme.effects.shadowColor}
                        onChange={(e) => updateEditingEffect('shadowColor', e.target.value)}
                        className="w-20 px-2 py-1 text-xs font-mono border border-gray-200 rounded"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">Opacity</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={editingTheme.effects.shadowOpacity}
                      onChange={(e) => updateEditingEffect('shadowOpacity', parseFloat(e.target.value))}
                      className="flex-1"
                    />
                    <input
                      type="text"
                      value={editingTheme.effects.shadowOpacity.toFixed(2)}
                      onChange={(e) => updateEditingEffect('shadowOpacity', parseFloat(e.target.value) || 0)}
                      className="w-14 px-2 py-1 text-xs text-right border border-gray-200 rounded"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 主题列表视图
  return (
    <div className="h-full flex flex-col">
      {/* 当前主题 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Current Theme</h3>
        <div
          className="p-3 border border-gray-200 rounded-lg flex items-center justify-between cursor-pointer hover:bg-gray-50"
          onClick={handleEditTheme}
        >
          <div className="flex items-center gap-3">
            <ThemeColorPreview theme={currentTheme} />
            <span className="text-sm font-medium text-gray-700">{currentTheme.name}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditTheme();
            }}
            className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
          >
            Edit
          </button>
        </div>
      </div>

      {/* 默认主题列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Default Themes</h3>
        <div className="space-y-2">
          {defaultThemes.map((theme) => (
            <div
              key={theme.id}
              className={`p-3 border rounded-lg flex items-center justify-between transition-colors ${
                currentTheme.id === theme.id
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <ThemeColorPreview theme={theme} />
                <span className="text-sm font-medium text-gray-700">{theme.name}</span>
              </div>
              {currentTheme.id !== theme.id && (
                <button
                  onClick={() => handleApplyTheme(theme)}
                  className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded hover:bg-blue-200"
                >
                  Apply
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ThemePanel;
