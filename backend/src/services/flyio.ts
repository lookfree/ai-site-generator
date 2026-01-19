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

// 更新项目的单个文件
export async function updateProjectFile(
  projectId: string,
  params: UpdateFileParams
): Promise<{ success: boolean; path: string }> {
  const response = await fetch(`${FLY_API_URL}/api/projects/${projectId}/update-file`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to update file: ${response.statusText}`);
  }

  return response.json();
}

// 批量更新项目文件
export async function updateProjectFiles(
  projectId: string,
  params: UpdateFilesParams
): Promise<{ success: boolean; count: number }> {
  const response = await fetch(`${FLY_API_URL}/api/projects/${projectId}/update-files`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`Failed to update files: ${response.statusText}`);
  }

  return response.json();
}

// 获取项目的文件内容
export async function getProjectFile(
  projectId: string,
  filePath: string
): Promise<{ content: string; path: string } | null> {
  const response = await fetch(
    `${FLY_API_URL}/api/projects/${projectId}/file/${encodeURIComponent(filePath)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to get file: ${response.statusText}`);
  }

  return response.json();
}

// 获取项目的所有文件列表
export async function listProjectFiles(
  projectId: string
): Promise<{ files: Array<{ path: string; size: number }> }> {
  const response = await fetch(`${FLY_API_URL}/api/projects/${projectId}/files`);

  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.statusText}`);
  }

  return response.json();
}

// 删除项目
export async function deleteProject(projectId: string): Promise<{ success: boolean }> {
  const response = await fetch(`${FLY_API_URL}/api/projects/${projectId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete project: ${response.statusText}`);
  }

  return response.json();
}

// 健康检查
export async function healthCheck(): Promise<{ status: string; timestamp: string; projectCount?: number }> {
  const response = await fetch(`${FLY_API_URL}/api/health`);

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
