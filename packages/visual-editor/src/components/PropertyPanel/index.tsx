/**
 * Property Panel Main Component
 * Lovable-style design - clean sections without tabs
 */

import { useEditorStore } from '../../stores/editor-store';
import { StyleTab, LayoutTab, SpacingTab, EffectsTab, AttributesTab } from './tabs';
import ElementInfo from './ElementInfo';

export default function PropertyPanel() {
  const selectedElement = useEditorStore(state => state.selectedElement);
  const isSaving = useEditorStore(state => state.isSaving);

  if (!selectedElement) {
    return (
      <div className="property-panel empty">
        <div className="empty-state">
          {/* Cursor icon like Lovable */}
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="empty-title">Visual edits</h3>
          <p className="empty-text">Select an element to edit</p>
          <p className="empty-hint">
            Hold <kbd>Cmd</kbd> to select multiple elements
          </p>
        </div>

        <style>{`
          .property-panel.empty {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: #fff;
          }

          .empty-state {
            text-align: center;
            padding: 32px 24px;
          }

          .empty-icon {
            margin-bottom: 16px;
            display: flex;
            justify-content: center;
          }

          .empty-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
          }

          .empty-text {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 16px;
          }

          .empty-hint {
            color: #9ca3af;
            font-size: 13px;
          }

          .empty-hint kbd {
            display: inline-block;
            padding: 2px 6px;
            font-family: ui-monospace, SFMono-Regular, monospace;
            font-size: 11px;
            background: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            box-shadow: 0 1px 1px rgba(0,0,0,0.05);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="property-panel">
      {/* Loading indicator when saving text */}
      {isSaving && (
        <div className="saving-indicator">
          <div className="saving-spinner" />
          <span>Updating...</span>
        </div>
      )}

      {/* Element info */}
      <ElementInfo element={selectedElement} />

      {/* Scrollable content area with all sections - Lovable style */}
      <div className="panel-content">
        {/* Content/Attributes Section - First */}
        <AttributesTab element={selectedElement} />

        {/* Divider */}
        <div className="section-divider" />

        {/* Layout Section */}
        <LayoutTab element={selectedElement} />

        {/* Divider */}
        <div className="section-divider" />

        {/* Typography Section (from StyleTab) */}
        <StyleTab element={selectedElement} />

        {/* Divider */}
        <div className="section-divider" />

        {/* Spacing Section */}
        <SpacingTab element={selectedElement} />

        {/* Divider */}
        <div className="section-divider" />

        {/* Effects Section */}
        <EffectsTab element={selectedElement} />
      </div>

      <style>{`
        .property-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: #fff;
        }

        .panel-content {
          flex: 1;
          overflow-y: auto;
          padding-bottom: 24px;
        }

        .section-divider {
          height: 1px;
          background: #f3f4f6;
          margin: 8px 16px;
        }

        .saving-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: linear-gradient(90deg, #f0f9ff 0%, #e0f2fe 100%);
          border-bottom: 1px solid #bae6fd;
          color: #0369a1;
          font-size: 13px;
          font-weight: 500;
        }

        .saving-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid #bae6fd;
          border-top-color: #0284c7;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
