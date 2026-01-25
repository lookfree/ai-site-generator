// Fly.io 热更新服务（支持多项目）
// Bun 内置支持 .env，无需 dotenv

const FLY_API_URL = process.env.FLY_API_URL || 'https://ai-site-preview.fly.dev';

interface UpdateFileParams {
  path: string;
  content: string;
}

interface UpdateFilesParams {
  updates: UpdateFileParams[];
}

interface ProjectConfig {
  projectId: string;
  projectName: string;
  description?: string;
}

interface CreateProjectResult {
  projectId: string;
  files: Array<{ path: string }>;
  previewUrl: string;
}

interface ProjectStatus {
  exists: boolean;
  hasNodeModules: boolean;
  isRunning: boolean;
  port?: number;
  previewUrl?: string;
}

// 创建项目
export async function createProject(
  config: ProjectConfig
): Promise<CreateProjectResult> {
  const response = await fetch(`${FLY_API_URL}/projects`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error(`Failed to create project: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

// 获取项目状态
export async function getProjectStatus(
  projectId: string
): Promise<ProjectStatus> {
  const response = await fetch(`${FLY_API_URL}/projects/${projectId}`);

  if (!response.ok) {
    throw new Error(`Failed to get project status: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

// 启动项目预览
export async function startPreview(
  projectId: string
): Promise<{ port: number; url: string }> {
  const response = await fetch(`${FLY_API_URL}/projects/${projectId}/preview/start`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to start preview: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

// 停止项目预览
export async function stopPreview(projectId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${FLY_API_URL}/projects/${projectId}/preview/stop`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error(`Failed to stop preview: ${response.statusText}`);
  }

  return response.json();
}

// 添加依赖
export async function addDependency(
  projectId: string,
  packageName: string,
  isDev: boolean = false
): Promise<{ success: boolean }> {
  const response = await fetch(`${FLY_API_URL}/projects/${projectId}/dependencies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ package: packageName, dev: isDev }),
  });

  if (!response.ok) {
    throw new Error(`Failed to add dependency: ${response.statusText}`);
  }

  return response.json();
}

// 移除依赖
export async function removeDependency(
  projectId: string,
  packageName: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${FLY_API_URL}/projects/${projectId}/dependencies/${encodeURIComponent(packageName)}`,
    { method: 'DELETE' }
  );

  if (!response.ok) {
    throw new Error(`Failed to remove dependency: ${response.statusText}`);
  }

  return response.json();
}

// 更新项目的单个文件
export async function updateProjectFile(
  projectId: string,
  params: UpdateFileParams
): Promise<{ success: boolean; path: string }> {
  const response = await fetch(`${FLY_API_URL}/projects/${projectId}/files`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ updates: [params] }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update file: ${response.statusText}`);
  }

  const result = await response.json();
  return { success: result.success, path: params.path };
}

// 批量更新项目文件
export async function updateProjectFiles(
  projectId: string,
  params: UpdateFilesParams
): Promise<{ success: boolean; count: number }> {
  const response = await fetch(`${FLY_API_URL}/projects/${projectId}/files`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to update files: ${response.statusText}`);
  }

  const result = await response.json();
  return { success: result.success, count: params.updates.length };
}

// 获取项目的文件内容
export async function getProjectFile(
  projectId: string,
  filePath: string
): Promise<{ content: string; path: string } | null> {
  const response = await fetch(
    `${FLY_API_URL}/projects/${projectId}/files/${encodeURIComponent(filePath)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to get file: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || null;
}

// 获取项目的所有文件列表
export async function listProjectFiles(
  projectId: string
): Promise<{ files: Array<{ path: string; size: number }> }> {
  const response = await fetch(`${FLY_API_URL}/projects/${projectId}/files`);

  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || { files: [] };
}

// 删除项目
export async function deleteProject(projectId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${FLY_API_URL}/projects/${projectId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete project: ${response.statusText}`);
  }

  return response.json();
}

// 健康检查
export async function healthCheck(): Promise<{ status: string; timestamp: string; projectCount?: number }> {
  const response = await fetch(`${FLY_API_URL}/health`);

  if (!response.ok) {
    throw new Error(`Fly.io server health check failed: ${response.statusText}`);
  }

  return response.json();
}

// 获取 Fly.io 基础 URL
export function getFlyBaseUrl(): string {
  return FLY_API_URL;
}

// 获取项目预览 URL
export function getProjectPreviewUrl(projectId: string): string {
  return `${FLY_API_URL}/p/${projectId}`;
}

// 获取 Fly.io 预览基础 URL（用于健康检查显示）
export function getPreviewUrl(): string {
  return FLY_API_URL;
}
