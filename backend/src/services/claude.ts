// Claude Code 调用服务
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface GenerateResult {
  success: boolean;
  files: Array<{ path: string; content: string }>;
  error?: string;
}

// 进度回调类型
export type ProgressCallback = (message: string, percent: number, todos?: TodoItem[]) => void;

// Todo 项目类型
export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

// 解析 Claude Code 输出中的 todo 信息
function parseTodoFromOutput(output: string): { todos: TodoItem[]; currentTask: string | null } {
  const todos: TodoItem[] = [];
  let currentTask: string | null = null;

  // 解析 todo list 格式: [completed] xxx 或 [in_progress] xxx 或 [pending] xxx
  const todoRegex = /\[(\w+)\]\s+(.+)/g;
  let match;
  while ((match = todoRegex.exec(output)) !== null) {
    const status = match[1] as TodoItem['status'];
    const content = match[2];
    if (['pending', 'in_progress', 'completed'].includes(status)) {
      todos.push({ status, content });
      if (status === 'in_progress') {
        currentTask = content;
      }
    }
  }

  // 也检测常见的进度模式
  if (output.includes('Writing') || output.includes('Creating')) {
    const fileMatch = output.match(/(?:Writing|Creating)\s+(?:to\s+)?(\S+)/);
    if (fileMatch) {
      currentTask = `正在创建 ${fileMatch[1]}`;
    }
  }

  return { todos, currentTask };
}

// 调用本地 Claude Code CLI 生成代码
export async function generateWithClaudeCode(
  description: string,
  projectPath: string,
  onProgress?: ProgressCallback
): Promise<GenerateResult> {
  return new Promise((resolve) => {
    // 确保目录存在
    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    const prompt = `在当前目录创建一个简单的静态网站。

需求: ${description}

严格要求：
1. 只创建3个文件: index.html, style.css, script.js
2. 不要使用任何框架(React/Vue/Vite等)
3. 不要创建 package.json 或任何配置文件
4. 使用纯 HTML + CSS + JavaScript
5. index.html 直接引用 style.css 和 script.js
6. 现代响应式设计，使用 Tailwind CSS CDN 或内联样式
7. 直接创建文件，不要解释

现在开始创建这3个文件。`;

    console.log(`[CLAUDE] Starting generation in ${projectPath}`);
    console.log(`[CLAUDE] Prompt: ${prompt.slice(0, 100)}...`);

    // 使用 --print 进行非交互式输出，--dangerously-skip-permissions 跳过权限确认
    // 过滤掉可能干扰 Claude Code CLI 的代理环境变量
    const cleanEnv = { ...process.env };
    delete cleanEnv.http_proxy;
    delete cleanEnv.https_proxy;
    delete cleanEnv.HTTP_PROXY;
    delete cleanEnv.HTTPS_PROXY;
    delete cleanEnv.all_proxy;
    delete cleanEnv.ALL_PROXY;
    cleanEnv.FORCE_COLOR = '0'; // 禁用彩色输出
    cleanEnv.no_proxy = 'localhost,127.0.0.1';

    // 使用 -p 参数从 stdin 读取 prompt，避免命令行参数解析问题
    const claude = spawn('claude', [
      '--print',
      '--dangerously-skip-permissions',
      '--output-format', 'text',
      '-p', '-'  // 从 stdin 读取 prompt
    ], {
      cwd: projectPath,
      shell: false,  // 不使用 shell，避免多行字符串解析问题
      env: cleanEnv,
    });

    // 通过 stdin 发送 prompt
    claude.stdin.write(prompt);
    claude.stdin.end();

    let stdout = '';
    let stderr = '';
    let basePercent = 20; // 起始进度

    claude.stdout.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      console.log(`[CLAUDE STDOUT] ${chunk.slice(0, 200)}`);

      // 解析并报告进度
      if (onProgress) {
        const { todos, currentTask } = parseTodoFromOutput(chunk);

        // 计算进度: 基于输出长度估算，从20%到55%
        const estimatedPercent = Math.min(55, basePercent + Math.floor(stdout.length / 500));

        if (currentTask) {
          onProgress(`🤖 ${currentTask}`, estimatedPercent, todos.length > 0 ? todos : undefined);
        } else if (todos.length > 0) {
          const inProgress = todos.find(t => t.status === 'in_progress');
          if (inProgress) {
            onProgress(`🤖 ${inProgress.content}`, estimatedPercent, todos);
          }
        }
      }
    });

    claude.stderr.on('data', (data) => {
      stderr += data.toString();
      console.log(`[CLAUDE STDERR] ${data.toString()}`);
    });

    claude.on('close', (code) => {
      console.log(`[CLAUDE] Process exited with code ${code}`);

      if (code !== 0) {
        resolve({
          success: false,
          files: [],
          error: stderr || 'Claude Code execution failed',
        });
        return;
      }

      // 读取生成的文件 - 优先读取期望的文件，但也读取其他所有文件
      const files: Array<{ path: string; content: string }> = [];
      const expectedFiles = ['index.html', 'style.css', 'script.js'];
      const allFiles = fs.readdirSync(projectPath);

      // 读取所有文件（排除目录）
      for (const fileName of allFiles) {
        const filePath = path.join(projectPath, fileName);
        const stat = fs.statSync(filePath);
        if (stat.isFile() && !fileName.startsWith('.')) {
          const content = fs.readFileSync(filePath, 'utf-8');
          files.push({ path: fileName, content });
          console.log(`[CLAUDE] Read file: ${fileName} (${content.length} bytes)`);
        }
      }

      // 检查是否生成了期望的文件
      const hasExpectedFiles = expectedFiles.some(f =>
        files.some(file => file.path === f)
      );

      if (!hasExpectedFiles && files.length === 0) {
        console.log('[CLAUDE] No files generated, checking subdirectories...');
        // 如果没有文件，可能是在子目录中
      }

      resolve({
        success: files.length > 0,
        files,
        error: files.length === 0 ? 'No files generated' : undefined,
      });
    });

    claude.on('error', (err) => {
      console.error(`[CLAUDE] Error:`, err);
      resolve({
        success: false,
        files: [],
        error: err.message,
      });
    });
  });
}

// 检查 Claude Code CLI 是否可用
export async function checkClaudeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const claude = spawn('claude', ['--version'], {
      shell: false,
    });

    claude.on('close', (code) => {
      resolve(code === 0);
    });

    claude.on('error', () => {
      resolve(false);
    });
  });
}
