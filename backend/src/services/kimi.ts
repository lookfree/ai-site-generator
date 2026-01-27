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

// 系统提示词 - 指导 Kimi 生成 React + Tailwind 代码
const SYSTEM_PROMPT = `你是一个专业的前端开发工程师，专门生成高质量的 React + TypeScript + Tailwind CSS 应用。

你的任务是根据用户的描述生成一个 React 组件，输出为 src/App.tsx 文件。

技术栈要求：
- React 18 + TypeScript
- Tailwind CSS（直接在 className 中使用 Tailwind 类名）
- 函数式组件 + Hooks

严格遵循以下规则：
1. 只输出代码，不要解释
2. 使用 markdown 代码块格式，标注文件路径
3. 使用 Tailwind CSS 类名进行样式设计，不要写单独的 CSS 文件
4. 使用 TypeScript，为 props 和 state 添加类型定义
5. 响应式设计：使用 Tailwind 的响应式前缀（sm:, md:, lg:, xl:）
6. 代码简洁、可维护，使用语义化的 HTML 元素
7. 使用 React Hooks（useState, useEffect 等）处理状态和副作用
8. 添加适当的动画效果（使用 Tailwind 的 transition, animate 类）
9. **禁止使用循环生成 UI 元素**：不要使用 .map()、.forEach() 等方法来生成 JSX 元素。每个 UI 元素必须在源码中独立存在，以便支持可视化编辑定位。例如，如果需要显示4个卡片，应该写4个独立的 JSX 元素，而不是用数组 .map() 循环生成。

**主题支持要求（非常重要）：**
使用 CSS 变量来定义颜色，这样可以支持主题切换：
- 主要颜色使用 bg-primary, text-primary（映射到 var(--color-primary)）
- 次要颜色使用 bg-secondary, text-secondary
- 强调色使用 bg-accent, text-accent
- 文字颜色使用 text-primary-text, text-secondary-text, text-accent-text
- 圆角使用 rounded-theme（映射到 var(--border-radius)）
- 字体使用 font-sans, font-serif, font-mono

CSS 变量对应的 Tailwind 类：
- bg-primary / text-primary → var(--color-primary)
- bg-secondary / text-secondary → var(--color-secondary)
- bg-accent / text-accent → var(--color-accent)
- text-primary-text → var(--color-primary-text)
- text-secondary-text → var(--color-secondary-text)
- text-accent-text → var(--color-accent-text)
- rounded-theme → var(--border-radius)

常用 Tailwind 类：
- 布局：flex, grid, items-center, justify-between, gap-4, container, mx-auto
- 间距：p-4, px-6, py-2, m-2, mt-4, space-y-4
- 主题颜色：bg-primary, bg-secondary, bg-accent, text-primary-text, text-secondary-text
- 备用颜色（可与主题色混用）：bg-white, bg-gray-50, bg-gray-100, text-gray-700
- 尺寸：w-full, h-screen, max-w-md, min-h-screen
- 圆角：rounded-theme, rounded-lg, rounded-full
- 阴影：shadow, shadow-lg, shadow-xl
- 动画：transition, duration-300, hover:scale-105, animate-pulse

输出格式示例：

\`\`\`tsx
// src/App.tsx
import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center font-sans">
      <div className="bg-white rounded-theme shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-primary mb-4">Hello World</h1>
        <p className="text-secondary-text mb-6">欢迎使用 React + Tailwind</p>
        <button
          onClick={() => setCount(c => c + 1)}
          className="w-full py-3 px-6 bg-accent hover:opacity-90 text-accent-text font-medium rounded-theme transition duration-200"
        >
          点击次数: {count}
        </button>
      </div>
    </div>
  );
}
\`\`\`

如果需要多个组件，可以在同一文件中定义，或者生成多个文件：

\`\`\`tsx
// src/components/Header.tsx
export function Header() {
  return <header>...</header>;
}
\`\`\`

\`\`\`tsx
// src/components/Footer.tsx
export function Footer() {
  return <footer>...</footer>;
}
\`\`\``;

// 从 Kimi 响应中解析代码块
function parseCodeBlocks(content: string): Array<{ path: string; content: string }> {
  const files: Array<{ path: string; content: string }> = [];

  // 匹配 markdown 代码块: ```language ... ```
  // 更灵活的正则：允许语言标识符后有任意空白字符（包括无换行的情况）
  const codeBlockRegex = /```(\w+)?[\s]*\n?([\s\S]*?)```/g;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const language = match[1]?.toLowerCase() || '';
    let code = match[2].trim();

    // 检查代码中是否有文件路径注释（如 // src/App.tsx）
    let filename = '';
    const pathCommentMatch = code.match(/^\/\/\s*(src\/[\w\/\.-]+\.tsx?)\s*\n/);
    if (pathCommentMatch) {
      filename = pathCommentMatch[1];
      // 移除路径注释行
      code = code.replace(pathCommentMatch[0], '').trim();
    }

    // 如果没有从注释中获取路径，根据语言类型和内容判断
    if (!filename) {
      if (language === 'tsx' || language === 'typescript' || language === 'ts') {
        // React 组件检测
        if (code.includes('export default function App') || code.includes('function App()')) {
          filename = 'src/App.tsx';
        } else if (code.includes('export function') || code.includes('export default function')) {
          // 尝试从 export 语句提取组件名
          const exportMatch = code.match(/export (?:default )?function (\w+)/);
          if (exportMatch) {
            filename = `src/components/${exportMatch[1]}.tsx`;
          }
        }
      } else if (language === 'jsx' || language === 'javascript' || language === 'js') {
        if (code.includes('export default function App') || code.includes('function App()')) {
          filename = 'src/App.tsx';
        }
      } else if (language === 'css') {
        filename = 'src/styles/custom.css';
      } else if (language === 'html') {
        // 保留对旧格式的兼容
        filename = 'index.html';
      }
    }

    // 默认为 App.tsx 如果是 React 组件但没有匹配到具体文件
    if (!filename && (language === 'tsx' || language === 'jsx') && code.includes('return')) {
      filename = 'src/App.tsx';
    }

    if (filename && code) {
      // 检查是否已存在该文件
      const existingIndex = files.findIndex(f => f.path === filename);
      if (existingIndex === -1) {
        files.push({ path: filename, content: code });
      } else {
        // 如果文件已存在，用新内容替换（后面的代码块优先）
        files[existingIndex].content = code;
      }
    }
  }

  // 确保至少有一个 App.tsx
  if (files.length > 0 && !files.some(f => f.path === 'src/App.tsx')) {
    // 找到第一个 TSX/JSX 文件，将其重命名为 App.tsx
    const firstComponent = files.find(f => f.path.endsWith('.tsx') || f.path.endsWith('.jsx'));
    if (firstComponent) {
      firstComponent.path = 'src/App.tsx';
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
      // 如果没有解析到代码块，尝试备用解析方法
      console.log('[KIMI] No code blocks found with primary regex. Trying fallback...');
      console.log('[KIMI] Raw response preview:', content.slice(0, 1000));

      // 备用方法：尝试匹配任何看起来像 React 组件的代码
      const fallbackMatch = content.match(/(?:import[\s\S]*?from[\s\S]*?;[\s\S]*?)?((?:export\s+)?(?:default\s+)?function\s+\w+[\s\S]*?return\s*\([\s\S]*?\);?\s*\})/);
      if (fallbackMatch) {
        console.log('[KIMI] Fallback found React component code');
        const code = fallbackMatch[0].trim();
        files.push({ path: 'src/App.tsx', content: code });
      }

      // 如果仍然没有找到，尝试直接提取 ``` 之间的内容（更宽松的匹配）
      if (files.length === 0) {
        const looseMatch = content.match(/```(?:tsx?|jsx?|typescript|javascript)?[^\n]*\n([\s\S]+?)```/);
        if (looseMatch && looseMatch[1]) {
          console.log('[KIMI] Loose regex found code block');
          files.push({ path: 'src/App.tsx', content: looseMatch[1].trim() });
        }
      }

      if (files.length === 0) {
        return {
          success: false,
          files: [],
          error: '未能从响应中解析出代码文件',
        };
      }
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
