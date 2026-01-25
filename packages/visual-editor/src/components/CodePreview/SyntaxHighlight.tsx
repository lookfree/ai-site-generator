/**
 * 语法高亮组件
 */


interface SyntaxHighlightProps {
  /** 代码内容 */
  code: string;
  /** 语言 */
  language?: 'jsx' | 'tsx' | 'css' | 'html';
}

/**
 * 简单的语法高亮 (不依赖外部库)
 */
export default function SyntaxHighlight({ code, language = 'tsx' }: SyntaxHighlightProps) {
  const highlightedCode = highlightCode(code, language);

  return (
    <pre className="syntax-highlight">
      <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />

      <style>{`
        .syntax-highlight {
          margin: 0;
          padding: 16px;
          background: #1f2937;
          border-radius: 8px;
          overflow: auto;
          font-family: 'SF Mono', Monaco, 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.5;
        }

        .syntax-highlight code {
          color: #e5e7eb;
        }

        .syntax-highlight .keyword {
          color: #c084fc;
        }

        .syntax-highlight .string {
          color: #86efac;
        }

        .syntax-highlight .number {
          color: #fcd34d;
        }

        .syntax-highlight .comment {
          color: #6b7280;
          font-style: italic;
        }

        .syntax-highlight .tag {
          color: #f472b6;
        }

        .syntax-highlight .attr-name {
          color: #67e8f9;
        }

        .syntax-highlight .attr-value {
          color: #86efac;
        }

        .syntax-highlight .function {
          color: #60a5fa;
        }

        .syntax-highlight .punctuation {
          color: #9ca3af;
        }
      `}</style>
    </pre>
  );
}

/**
 * 简单的语法高亮实现
 */
function highlightCode(code: string, _language: string): string {
  // 转义 HTML
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 关键字
  const keywords = [
    'import', 'export', 'from', 'const', 'let', 'var', 'function',
    'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case',
    'break', 'continue', 'default', 'throw', 'try', 'catch', 'finally',
    'new', 'this', 'class', 'extends', 'static', 'get', 'set',
    'async', 'await', 'true', 'false', 'null', 'undefined',
    'interface', 'type', 'as', 'typeof', 'instanceof',
  ];

  // 字符串
  html = html.replace(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g,
    '<span class="string">$1</span>'
  );

  // 注释
  html = html.replace(
    /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    '<span class="comment">$1</span>'
  );

  // 数字
  html = html.replace(
    /\b(\d+\.?\d*)\b/g,
    '<span class="number">$1</span>'
  );

  // JSX 标签
  html = html.replace(
    /(&lt;\/?)([\w.-]+)/g,
    '$1<span class="tag">$2</span>'
  );

  // JSX 属性名
  html = html.replace(
    /(\s)([\w-]+)(=)/g,
    '$1<span class="attr-name">$2</span>$3'
  );

  // 关键字
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g');
    html = html.replace(regex, '<span class="keyword">$1</span>');
  }

  // 函数调用
  html = html.replace(
    /\b([a-zA-Z_]\w*)\s*(?=\()/g,
    '<span class="function">$1</span>'
  );

  return html;
}
