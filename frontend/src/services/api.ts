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

// 获取代理预览 URL
export function getProxyPreviewUrl(projectId: string): string {
  return `${API_BASE}/proxy/${projectId}`;
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
