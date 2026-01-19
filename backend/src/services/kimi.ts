// Kimi K2 API 调用服务
// 使用 Moonshot AI 的 Kimi K2 模型生成代码

// 进度回调类型
export type ProgressCallback = (message: string, percent: number, todos?: TodoItem[]) => void;

// Todo 项目类型
export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

interface GenerateResult {
  success: boolean;
  files: Array<{ path: string; content: string }>;
  error?: string;
}

interface KimiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface KimiResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 环境变量配置
const KIMI_API_KEY = process.env.KIMI_API_KEY || '';
const KIMI_API_BASE_URL = process.env.KIMI_API_BASE_URL || 'https://api.moonshot.cn/v1';
const KIMI_MODEL = process.env.KIMI_MODEL || 'kimi-k2-turbo-preview';

// 系统提示词 - 指导 Kimi 生成前端代码
const SYSTEM_PROMPT = `你是一个专业的前端开发工程师，专门生成高质量的静态网页代码。

你的任务是根据用户的描述生成一个完整的静态网站，包含以下三个文件：
1. index.html - HTML 结构文件
2. style.css - CSS 样式文件
3. script.js - JavaScript 交互文件

严格遵循以下规则：
1. 只输出代码，不要解释
2. 使用 markdown 代码块格式，明确标注文件名和语言
3. HTML 文件中使用相对路径引用 CSS 和 JS 文件
4. 使用现代 CSS (Flexbox, Grid, CSS Variables)
5. 响应式设计，适配移动端
6. 代码简洁、语义化、可维护
7. 添加适当的动画效果和交互

输出格式示例：

\`\`\`html
<!-- index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
...
</html>
\`\`\`

\`\`\`css
/* style.css */
...
\`\`\`

\`\`\`javascript
// script.js
...
\`\`\``;

// 从 Kimi 响应中解析代码块
function parseCodeBlocks(content: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  // 匹配 markdown 代码块: ```language ... ```
  const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1]?.toLowerCase() || '';
    const code = match[2].trim();

    // 根据语言类型确定文件名
    let filename = '';
    if (language === 'html' || code.includes('<!DOCTYPE') || code.includes('<html')) {
      filename = 'index.html';
    } else if (language === 'css' || code.includes('{') && code.includes(':') && !code.includes('function')) {
      filename = 'style.css';
    } else if (language === 'javascript' || language === 'js') {
      filename = 'script.js';
    }

    if (filename && code) {
      // 检查是否已存在该文件，避免重复
      const existing = files.find(f => f.path === filename);
      if (!existing) {
        files.push({ path: filename, content: code });
      }
    }
  }

  return files;
}

// 调用 Kimi K2 API 生成代码
export async function generateWithKimi(
  description: string,
  projectPath: string,
  onProgress?: ProgressCallback
): Promise<GenerateResult> {
  // 验证 API Key
  if (!KIMI_API_KEY) {
    return {
      success: false,
      files: [],
      error: 'KIMI_API_KEY 环境变量未设置',
    };
  }

  console.log(`[KIMI] Starting generation for: ${description.slice(0, 50)}...`);
  console.log(`[KIMI] API Base URL: ${KIMI_API_BASE_URL}`);
  console.log(`[KIMI] Model: ${KIMI_MODEL}`);

  // 报告开始进度
  if (onProgress) {
    onProgress('正在连接 Kimi K2 API...', 10);
  }

  const messages: KimiMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: `请创建一个网站：${description}` },
  ];

  try {
    // 报告 API 调用进度
    if (onProgress) {
      onProgress('正在生成代码...', 30);
    }

    const response = await fetch(`${KIMI_API_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
      body: JSON.stringify({
        model: KIMI_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[KIMI] API Error: ${response.status} ${errorText}`);
      return {
        success: false,
        files: [],
        error: `Kimi API 错误: ${response.status} - ${errorText}`,
      };
    }

    const data = await response.json() as KimiResponse;

    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        files: [],
        error: 'Kimi API 返回空响应',
      };
    }

    const content = data.choices[0].message.content;
    console.log(`[KIMI] Response received, length: ${content.length}`);
    console.log(`[KIMI] Tokens used: ${data.usage?.total_tokens || 'unknown'}`);

    // 报告解析进度
    if (onProgress) {
      onProgress('正在解析生成的代码...', 60);
    }

    // 解析代码块
    const files = parseCodeBlocks(content);

    console.log(`[KIMI] Parsed ${files.length} files:`);
    files.forEach(f => console.log(`  - ${f.path} (${f.content.length} bytes)`));

    if (files.length === 0) {
      // 如果没有解析到代码块，记录原始响应用于调试
      console.log('[KIMI] No code blocks found. Raw response:', content.slice(0, 500));
      return {
        success: false,
        files: [],
        error: '未能从响应中解析出代码文件',
      };
    }

    // 报告完成进度
    if (onProgress) {
      onProgress('代码生成完成！', 80);
    }

    return {
      success: true,
      files,
    };

  } catch (error) {
    console.error('[KIMI] Error:', error);
    return {
      success: false,
      files: [],
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

// 检查 Kimi API 是否可用
export async function checkKimiAvailable(): Promise<boolean> {
  if (!KIMI_API_KEY) {
    console.log('[KIMI] API Key not configured');
    return false;
  }

  try {
    // 发送一个简单的请求测试 API 可用性
    const response = await fetch(`${KIMI_API_BASE_URL}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
    });

    const available = response.ok;
    console.log(`[KIMI] API availability check: ${available ? 'OK' : 'Failed'}`);
    return available;
  } catch (error) {
    console.error('[KIMI] API availability check failed:', error);
    return false;
  }
}
