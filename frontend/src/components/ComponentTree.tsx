/**
 * 组件树视图
 * 显示 React 组件的层级结构，支持选择和展开/折叠
 */

import { useState, useEffect, useCallback, memo } from 'react';
import { getComponents, type ComponentNode } from '../services/api';

interface ComponentTreeProps {
  projectId: string;
  selectedComponentId?: string | null;
  onSelectComponent: (component: ComponentNode) => void;
  onRefresh?: () => void;
}

interface TreeNodeProps {
  node: ComponentNode;
  level: number;
  selectedId?: string | null;
  onSelect: (node: ComponentNode) => void;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}

// 获取元素类型图标
function getElementIcon(name: string): string {
  const lowerName = name.toLowerCase();

  // 布局类
  if (['div', 'section', 'article', 'main', 'header', 'footer', 'nav', 'aside'].includes(lowerName)) {
    return 'layout';
  }
  // 文本类
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label'].includes(lowerName)) {
    return 'text';
  }
  // 交互类
  if (['button', 'a', 'input', 'select', 'textarea'].includes(lowerName)) {
    return 'interactive';
  }
  // 媒体类
  if (['img', 'video', 'audio', 'svg', 'canvas'].includes(lowerName)) {
    return 'media';
  }
  // 列表类
  if (['ul', 'ol', 'li'].includes(lowerName)) {
    return 'list';
  }
  // 表单类
  if (['form', 'fieldset'].includes(lowerName)) {
    return 'form';
  }
  // React 组件 (首字母大写)
  if (name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()) {
    return 'component';
  }

  return 'element';
}

// 渲染图标 SVG - memoized for performance
const ElementIcon = memo(function ElementIcon({ type, className }: { type: string; className?: string }) {
  const iconClass = className || 'w-4 h-4';

  switch (type) {
    case 'layout':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      );
    case 'text':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      );
    case 'interactive':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
      );
    case 'media':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    case 'list':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      );
    case 'form':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'component':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      );
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
  }
});

// 树节点组件 - memoized for performance
const TreeNode = memo(function TreeNode({ node, level, selectedId, onSelect, expandedIds, onToggle }: TreeNodeProps) {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const iconType = getElementIcon(node.name);

  return (
    <div>
      <div
        className={`flex items-center gap-1 py-1 px-2 rounded cursor-pointer transition-colors ${
          isSelected
            ? 'bg-blue-100 text-blue-800'
            : 'hover:bg-gray-100 text-gray-700'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelect(node)}
      >
        {/* 展开/折叠按钮 */}
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-gray-200 rounded"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
          >
            <svg
              className={`w-3 h-3 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* 元素图标 */}
        <ElementIcon type={iconType} className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />

        {/* 元素名称 */}
        <span className="text-sm font-mono truncate flex-1">{node.name}</span>

        {/* className 预览 */}
        {node.className && (
          <span className="text-xs text-gray-400 truncate max-w-[100px]" title={node.className}>
            .{node.className.split(' ')[0]}
          </span>
        )}
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
});

function ComponentTree({ projectId, selectedComponentId, onSelectComponent, onRefresh }: ComponentTreeProps) {
  const [components, setComponents] = useState<ComponentNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // 加载组件树
  const loadComponents = useCallback(async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await getComponents(projectId);
      setComponents(result.components);

      // 默认展开前两级
      const idsToExpand = new Set<string>();
      const collectIds = (nodes: ComponentNode[], depth: number) => {
        if (depth >= 2) return;
        for (const node of nodes) {
          idsToExpand.add(node.id);
          if (node.children) {
            collectIds(node.children, depth + 1);
          }
        }
      };
      collectIds(result.components, 0);
      setExpandedIds(idsToExpand);
    } catch (err) {
      console.error('[ComponentTree] Failed to load:', err);
      setError(err instanceof Error ? err.message : 'Failed to load components');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // 初始加载
  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  // 切换展开/折叠
  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // 全部展开
  const expandAll = useCallback(() => {
    const allIds = new Set<string>();
    const collectAllIds = (nodes: ComponentNode[]) => {
      for (const node of nodes) {
        allIds.add(node.id);
        if (node.children) {
          collectAllIds(node.children);
        }
      }
    };
    collectAllIds(components);
    setExpandedIds(allIds);
  }, [components]);

  // 全部折叠
  const collapseAll = useCallback(() => {
    setExpandedIds(new Set());
  }, []);

  // 刷新
  const handleRefresh = useCallback(() => {
    loadComponents();
    onRefresh?.();
  }, [loadComponents, onRefresh]);

  // 过滤组件
  const filterComponents = useCallback((nodes: ComponentNode[], query: string): ComponentNode[] => {
    if (!query.trim()) return nodes;

    const lowerQuery = query.toLowerCase();
    return nodes.filter((node) => {
      const matchesName = node.name.toLowerCase().includes(lowerQuery);
      const matchesClass = node.className?.toLowerCase().includes(lowerQuery);
      const matchesText = node.textContent?.toLowerCase().includes(lowerQuery);
      const hasMatchingChildren = node.children && filterComponents(node.children, query).length > 0;

      return matchesName || matchesClass || matchesText || hasMatchingChildren;
    }).map((node) => ({
      ...node,
      children: node.children ? filterComponents(node.children, query) : [],
    }));
  }, []);

  const filteredComponents = filterComponents(components, searchQuery);

  return (
    <div className="flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-200">
        {/* 搜索框 */}
        <div className="flex-1 relative">
          <svg
            className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索组件..."
            className="w-full pl-8 pr-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* 操作按钮 */}
        <button
          onClick={expandAll}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          title="全部展开"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          onClick={collapseAll}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          title="全部折叠"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleRefresh}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          title="刷新"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* 组件树内容 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <svg className="w-5 h-5 animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            加载中...
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <button
              onClick={handleRefresh}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              重试
            </button>
          </div>
        ) : filteredComponents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400">
            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p className="text-sm">
              {searchQuery ? '没有匹配的组件' : '暂无组件'}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filteredComponents.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                level={0}
                selectedId={selectedComponentId}
                onSelect={onSelectComponent}
                expandedIds={expandedIds}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部信息 */}
      <div className="px-3 py-2 border-t border-gray-200 text-xs text-gray-500">
        {components.length} 个组件
      </div>
    </div>
  );
}

export default ComponentTree;
