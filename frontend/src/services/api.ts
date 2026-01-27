// API 服务
const API_BASE = '/api';

// 项目状态
export type ProjectStatus = 'pending' | 'generating' | 'deploying' | 'deployed' | 'failed';

// 项目类型
export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  fly_app_name: string;
  preview_url: string;
  created_at: string;
  updated_at: string;
}

// 项目文件
export interface ProjectFile {
  file_path: string;
  content: string;
  updated_at: string;
}

// 选中元素信息
export interface SelectedElement {
  selector: string;
  tagName: string;
  textContent: string;
  innerHTML: string;
  styles: {
    color: string;
    backgroundColor: string;
    fontSize: string;
    fontWeight: string;
    padding: string;
    margin: string;
    borderRadius: string;
  };
}

// 获取所有项目
export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${API_BASE}/projects`);
  if (!response.ok) throw new Error('Failed to fetch projects');
  const data = await response.json();
  return data.projects;
}

// 获取单个项目
export async function getProject(id: string): Promise<Project> {
  const response = await fetch(`${API_BASE}/projects/${id}`);
  if (!response.ok) throw new Error('Failed to fetch project');
  const data = await response.json();
  return data.project;
}

// 项目状态响应
export interface ProjectStatusResponse {
  id: string;
  status: ProjectStatus;
  preview_url: string;
  progress_message: string;
  progress_percent: number;
}

// 获取项目状态
export async function getProjectStatus(id: string): Promise<ProjectStatusResponse> {
  const response = await fetch(`${API_BASE}/projects/${id}/status`);
  if (!response.ok) throw new Error('Failed to fetch project status');
  return response.json();
}

// 生成项目
export async function generateProject(description: string, name?: string): Promise<{ projectId: string; status: string }> {
  const response = await fetch(`${API_BASE}/projects/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, name }),
  });
  if (!response.ok) throw new Error('Failed to generate project');
  return response.json();
}

// 更新项目文件
export async function updateProjectFile(projectId: string, path: string, content: string): Promise<{ success: boolean }> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/update-file`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
  if (!response.ok) throw new Error('Failed to update file');
  return response.json();
}

// 获取项目文件
export async function getProjectFiles(projectId: string): Promise<ProjectFile[]> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/files`);
  if (!response.ok) throw new Error('Failed to fetch project files');
  const data = await response.json();
  return data.files;
}

// 同步项目文件到 Fly.io（从数据库恢复）
export async function syncToFly(projectId: string): Promise<{ success: boolean; message: string; files: string[] }> {
  const response = await fetch(`${API_BASE}/projects/${projectId}/sync-to-fly`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to sync to Fly.io');
  return response.json();
}

// 获取代理预览 URL (通过后端代理)
export function getProxyPreviewUrl(projectId: string): string {
  return `${API_BASE}/proxy/${projectId}`;
}

// 获取 fly-server 直接预览 URL (用于 HMR)
export function getDirectPreviewUrl(projectId: string): string {
  const flyServerUrl = import.meta.env.VITE_FLY_SERVER_URL || 'https://ai-site-preview.fly.dev';
  return `${flyServerUrl}/p/${projectId}`;
}

// 获取 HMR WebSocket URL
export function getHmrWebSocketUrl(projectId: string): string {
  const flyServerUrl = import.meta.env.VITE_FLY_SERVER_URL || 'https://ai-site-preview.fly.dev';
  const wsUrl = flyServerUrl.replace('https://', 'wss://').replace('http://', 'ws://');
  return `${wsUrl}/hmr?projectId=${projectId}`;
}

// 删除项目
export async function deleteProject(projectId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/projects/${projectId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete project');
  return response.json();
}

// 健康检查
export async function healthCheck(): Promise<{
  status: string;
  services: { claude: string; flyio: string; database: string };
  previewUrl: string;
}> {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error('Health check failed');
  return response.json();
}

// ==================== 代码编辑器 API ====================

// 组件节点类型
export interface ComponentNode {
  id: string;
  name: string;
  className: string;
  textContent?: string;
  location?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  attributes: Record<string, unknown>;
  children: ComponentNode[];
}

// 编辑结果
export interface EditResult {
  success: boolean;
  componentId?: string;
  changes?: Array<{
    type: 'add' | 'modify' | 'remove';
    path: string[];
    oldValue?: unknown;
    newValue?: unknown;
  }>;
  error?: string;
  /** Warning message when operation succeeded but with issues (e.g., Fly.io sync failed) */
  warning?: string;
}

// 获取组件树
export async function getComponents(
  projectId: string,
  filePath = 'src/App.tsx'
): Promise<{ components: ComponentNode[]; count: number }> {
  const response = await fetch(`${API_BASE}/code-editor/${projectId}/components?file=${encodeURIComponent(filePath)}`);
  if (!response.ok) throw new Error('Failed to fetch components');
  return response.json();
}

// 获取单个组件详情
export async function getComponent(
  projectId: string,
  componentId: string,
  filePath = 'src/App.tsx'
): Promise<{ component: ComponentNode }> {
  const response = await fetch(
    `${API_BASE}/code-editor/${projectId}/component/${componentId}?file=${encodeURIComponent(filePath)}`
  );
  if (!response.ok) throw new Error('Failed to fetch component');
  return response.json();
}

// 更新组件 className
export async function updateComponentClass(
  projectId: string,
  componentId: string,
  options: {
    className?: string;
    addClasses?: string[];
    removeClasses?: string[];
    oldClassName?: string;  // For className-based fallback matching
    tagName?: string;       // Additional context for matching
  },
  filePath = 'src/App.tsx',
  position?: PositionInfo
): Promise<EditResult> {
  const response = await fetch(`${API_BASE}/code-editor/${projectId}/update-class`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      componentId,
      ...options,
      file: filePath,
      // Position info for accurate AST matching
      jsxFile: position?.jsxFile,
      jsxLine: position?.jsxLine,
      jsxCol: position?.jsxCol,
    }),
  });
  if (!response.ok) throw new Error('Failed to update class');
  return response.json();
}

// 位置信息 (用于精确的 AST 定位)
export interface PositionInfo {
  jsxFile?: string;   // Source file path from data-jsx-file
  jsxLine?: number;   // Source line from data-jsx-line
  jsxCol?: number;    // Source column from data-jsx-col
}

// 更新组件文本内容
export async function updateComponentText(
  projectId: string,
  componentId: string,
  text: string,
  filePath = 'src/App.tsx',
  originalText?: string,
  tagName?: string,
  className?: string,
  position?: PositionInfo
): Promise<EditResult> {
  const response = await fetch(`${API_BASE}/code-editor/${projectId}/update-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      componentId,
      text,
      file: filePath,
      originalText,  // Used for text-based matching in source code
      tagName,       // Additional context for matching
      className,     // Additional context for matching
      // Position-based matching (highest priority)
      jsxFile: position?.jsxFile,
      jsxLine: position?.jsxLine,
      jsxCol: position?.jsxCol,
    }),
  });
  if (!response.ok) throw new Error('Failed to update text');
  return response.json();
}

// 更新组件属性
export async function updateComponentProps(
  projectId: string,
  componentId: string,
  props: Record<string, unknown>,
  filePath = 'src/App.tsx'
): Promise<EditResult> {
  const response = await fetch(`${API_BASE}/code-editor/${projectId}/update-props`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ componentId, props, file: filePath }),
  });
  if (!response.ok) throw new Error('Failed to update props');
  return response.json();
}

// 更新组件内联样式
export async function updateComponentStyle(
  projectId: string,
  componentId: string,
  style: Record<string, string>,
  filePath = 'src/App.tsx',
  position?: PositionInfo
): Promise<EditResult> {
  const response = await fetch(`${API_BASE}/code-editor/${projectId}/update-style`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      componentId,
      style,
      file: filePath,
      jsxFile: position?.jsxFile,
      jsxLine: position?.jsxLine,
      jsxCol: position?.jsxCol,
    }),
  });
  if (!response.ok) throw new Error('Failed to update style');
  return response.json();
}

// 批量更新组件
export interface BatchOperation {
  componentId: string;
  type: 'class' | 'text' | 'style' | 'attribute';
  payload: unknown;
}

export async function batchUpdateComponents(
  projectId: string,
  operations: BatchOperation[],
  filePath = 'src/App.tsx'
): Promise<{
  success: boolean;
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{ componentId: string; success: boolean; error?: string }>;
}> {
  const response = await fetch(`${API_BASE}/code-editor/${projectId}/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operations, file: filePath }),
  });
  if (!response.ok) throw new Error('Failed to batch update');
  return response.json();
}
