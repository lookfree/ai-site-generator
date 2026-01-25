/**
 * 属性面板主组件
 */

import { useState } from 'react';
import { useEditorStore } from '../../stores/editor-store';
import { StyleTab, LayoutTab, SpacingTab, EffectsTab, AttributesTab } from './tabs';
import ElementInfo from './ElementInfo';
import type { PropertyTabId } from '../../types';

const TABS: { id: PropertyTabId; label: string; icon: string }[] = [
  { id: 'style', label: '样式', icon: '🎨' },
  { id: 'layout', label: '布局', icon: '📐' },
  { id: 'spacing', label: '间距', icon: '↔️' },
  { id: 'effects', label: '效果', icon: '✨' },
  { id: 'attributes', label: '属性', icon: '⚙️' },
];

export default function PropertyPanel() {
  const [activeTab, setActiveTab] = useState<PropertyTabId>('style');
  const selectedElement = useEditorStore(state => state.selectedElement);

  if (!selectedElement) {
    return (
      <div className="property-panel empty">
        <div className="empty-state">
          <div className="empty-icon">👆</div>
          <p className="empty-text">点击页面中的元素开始编辑</p>
        </div>

        <style>{`
          .property-panel.empty {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: #fff;
            border-left: 1px solid #e5e7eb;
          }

          .empty-state {
            text-align: center;
            padding: 24px;
          }

          .empty-icon {
            font-size: 48px;
            margin-bottom: 12px;
          }

          .empty-text {
            color: #6b7280;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'style':
        return <StyleTab element={selectedElement} />;
      case 'layout':
        return <LayoutTab element={selectedElement} />;
      case 'spacing':
        return <SpacingTab element={selectedElement} />;
      case 'effects':
        return <EffectsTab element={selectedElement} />;
      case 'attributes':
        return <AttributesTab element={selectedElement} />;
    }
  };

  return (
    <div className="property-panel">
      {/* 元素信息 */}
      <ElementInfo element={selectedElement} />

      {/* 标签页导航 */}
      <div className="tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.label}
          >
            <span className="icon">{tab.icon}</span>
            <span className="label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 标签内容 */}
      <div className="tab-content">
        {renderTabContent()}
      </div>

      <style>{`
        .property-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #fff;
          border-left: 1px solid #e5e7eb;
        }

        .tabs {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 8px 4px;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: background-color 0.1s, color 0.1s;
        }

        .tab:hover {
          background: #f3f4f6;
        }

        .tab.active {
          background: #fff;
          border-bottom: 2px solid #3b82f6;
        }

        .tab .icon {
          font-size: 16px;
          margin-bottom: 2px;
        }

        .tab .label {
          font-size: 10px;
          color: #6b7280;
        }

        .tab.active .label {
          color: #3b82f6;
          font-weight: 500;
        }

        .tab-content {
          flex: 1;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
}
