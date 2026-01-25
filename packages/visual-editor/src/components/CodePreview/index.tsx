/**
 * 代码预览组件
 */

import { useState, useEffect } from 'react';
import { useEditorStore } from '../../stores/editor-store';
import SyntaxHighlight from './SyntaxHighlight';

interface CodePreviewProps {
  /** 文件路径 */
  filePath?: string;
  /** 代码内容 (如果不提供 filePath) */
  code?: string;
}

export default function CodePreview({ filePath, code: initialCode }: CodePreviewProps) {
  const [code, setCode] = useState(initialCode || '');
  const [isExpanded, setIsExpanded] = useState(false);
  const getFile = useEditorStore(state => state.getFile);
  const selectedElement = useEditorStore(state => state.selectedElement);

  // 从 store 获取文件内容
  useEffect(() => {
    if (filePath) {
      const fileContent = getFile(filePath);
      if (fileContent) {
        setCode(fileContent);
      }
    }
  }, [filePath, getFile]);

  // 更新外部传入的代码
  useEffect(() => {
    if (initialCode) {
      setCode(initialCode);
    }
  }, [initialCode]);

  // 提取相关代码片段
  const relevantCode = selectedElement
    ? extractRelevantCode(code, selectedElement.jsxId)
    : code;

  return (
    <div className={`code-preview ${isExpanded ? 'expanded' : ''}`}>
      <div className="code-header">
        <span className="file-name">
          {filePath ? filePath.split('/').pop() : 'code.tsx'}
        </span>
        <div className="header-actions">
          <button
            className="copy-btn"
            onClick={() => navigator.clipboard.writeText(relevantCode)}
            title="复制代码"
          >
            📋
          </button>
          <button
            className="expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? '收起' : '展开'}
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        </div>
      </div>

      <div className="code-content">
        <SyntaxHighlight code={relevantCode} language="tsx" />
      </div>

      <style>{`
        .code-preview {
          display: flex;
          flex-direction: column;
          background: #1f2937;
          border-radius: 8px;
          overflow: hidden;
          max-height: 200px;
          transition: max-height 0.3s ease;
        }

        .code-preview.expanded {
          max-height: 500px;
        }

        .code-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background: #374151;
          border-bottom: 1px solid #4b5563;
        }

        .file-name {
          font-size: 12px;
          color: #9ca3af;
          font-family: monospace;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .copy-btn,
        .expand-btn {
          padding: 4px 8px;
          border: none;
          background: transparent;
          color: #9ca3af;
          font-size: 12px;
          cursor: pointer;
          border-radius: 4px;
          transition: background-color 0.1s;
        }

        .copy-btn:hover,
        .expand-btn:hover {
          background: #4b5563;
          color: #e5e7eb;
        }

        .code-content {
          flex: 1;
          overflow: auto;
        }
      `}</style>
    </div>
  );
}

/**
 * 提取与选中元素相关的代码片段
 */
function extractRelevantCode(code: string, jsxId: string): string {
  // 简单实现: 查找包含 jsxId 的行及其周围上下文
  const lines = code.split('\n');
  const targetLineIndex = lines.findIndex(line => line.includes(`data-jsx-id="${jsxId}"`));

  if (targetLineIndex === -1) {
    return code;
  }

  // 提取前后 10 行
  const start = Math.max(0, targetLineIndex - 10);
  const end = Math.min(lines.length, targetLineIndex + 10);

  return lines.slice(start, end).join('\n');
}

export { SyntaxHighlight };
