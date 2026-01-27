import { useCallback, useMemo, useEffect, useState } from 'react';
import {
  PropertyPanel,
  SaveButton,
  useIframeCommunication,
  useEditorStore,
  type EditAction,
} from 'visual-editor';
import {
  updateComponentClass,
  updateComponentProps,
  updateComponentStyle,
  updateComponentText,
  type EditResult,
  type PositionInfo,
} from '../services/api';

interface VisualEditorPanelProps {
  projectId?: string;
}

function dedupeActions(actions: EditAction[]): EditAction[] {
  const map = new Map<string, EditAction>();
  for (const action of actions) {
    map.set(`${action.jsxId}:${action.type}`, action);
  }
  return Array.from(map.values());
}

export default function VisualEditorPanel({ projectId }: VisualEditorPanelProps) {
  useIframeCommunication();

  const selectedElement = useEditorStore(state => state.selectedElement);
  const history = useEditorStore(state => state.history);
  const historyIndex = useEditorStore(state => state.historyIndex);
  const clearHistory = useEditorStore(state => state.clearHistory);

  const [lastSavedIndex, setLastSavedIndex] = useState(-1);

  useEffect(() => {
    setLastSavedIndex(-1);
  }, [projectId]);

  const pendingActions = useMemo(() => {
    if (historyIndex <= lastSavedIndex) return [];
    return history.slice(lastSavedIndex + 1, historyIndex + 1);
  }, [history, historyIndex, lastSavedIndex]);

  const hasChanges = pendingActions.length > 0;

  const handleSave = useCallback(async () => {
    console.log('[VisualEditorPanel] handleSave called', {
      projectId,
      hasChanges,
      historyIndex,
      lastSavedIndex,
      pendingActionsCount: pendingActions.length,
      historyLength: history.length,
    });

    if (!projectId || !hasChanges) {
      console.log('[VisualEditorPanel] Save skipped - no projectId or no changes');
      return;
    }

    const filePathFallback = selectedElement?.jsxFile || 'src/App.tsx';
    const actionsToSave = dedupeActions(pendingActions);

    console.log('[VisualEditorPanel] Saving actions:', actionsToSave.map(a => ({
      type: a.type,
      jsxId: a.jsxId,
      oldValue: a.oldValue,
      newValue: a.newValue,
      filePath: a.filePath,
      jsxLine: a.jsxLine,
      jsxCol: a.jsxCol,
    })));

    // 串行执行保存，避免并行请求导致的位置偏移问题
    const warnings: string[] = [];
    const errors: string[] = [];
    let successCount = 0;

    for (const action of actionsToSave) {
      const filePath = action.filePath || filePathFallback;
      // 直接从 action 中获取位置信息 (每个 action 创建时已携带)
      const actionPosition: PositionInfo | undefined =
        action.jsxLine !== undefined && action.jsxCol !== undefined
          ? { jsxFile: action.filePath, jsxLine: action.jsxLine, jsxCol: action.jsxCol }
          : undefined;

      try {
        let result: EditResult | undefined;

        switch (action.type) {
          case 'text': {
            const text = String(action.newValue ?? '');
            const originalText = String(action.oldValue ?? '');
            result = await updateComponentText(
              projectId,
              action.jsxId,
              text,
              filePath,
              originalText,  // 传递原始文本用于文本匹配回退
              selectedElement?.tagName,
              selectedElement?.className,
              actionPosition
            );
            break;
          }
          case 'className': {
            const className = String(action.newValue ?? '');
            const oldClassName = String(action.oldValue ?? '');
            result = await updateComponentClass(projectId, action.jsxId, {
              className,
              oldClassName,  // For className-based fallback matching when position fails
              tagName: selectedElement?.tagName,
            }, filePath, actionPosition);
            break;
          }
          case 'style': {
            const style = action.newValue as Record<string, string> | null;
            if (style) {
              result = await updateComponentStyle(projectId, action.jsxId, style, filePath, actionPosition);
            }
            break;
          }
          case 'attribute': {
            const attr = action.newValue as { name: string; value: unknown } | null;
            if (attr?.name) {
              result = await updateComponentProps(projectId, action.jsxId, { [attr.name]: attr.value }, filePath);
            }
            break;
          }
        }

        if (result?.warning) {
          warnings.push(result.warning);
        }
        successCount++;
      } catch (error) {
        console.error('[VisualEditorPanel] Save error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${action.type} failed: ${errorMessage}`);
      }
    }

    // Show toast based on results
    if (errors.length > 0) {
      // Some errors occurred
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in max-w-md';
      toast.innerHTML = `
        <div class="font-medium">✗ Save Failed</div>
        <div class="text-sm mt-1 opacity-90">${errors.join('<br>')}</div>
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
      // Don't update lastSavedIndex so user can retry
      return;
    } else if (warnings.length > 0) {
      alert('Saved with warnings:\n' + warnings.join('\n'));
    } else if (successCount > 0) {
      // All succeeded
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
      toast.textContent = '✓ Saved';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }

    // Clear history after successful save so new edits create fresh actions
    // This fixes the issue where editing the same element after save wouldn't show "Unsaved changes"
    clearHistory();
    setLastSavedIndex(-1);

    // HMR will automatically update the preview when fly-server receives the file update
    // No need to manually reload iframe - this would cause white screen
  }, [projectId, hasChanges, pendingActions, historyIndex, selectedElement, clearHistory]);

  return (
    <div className="h-full flex flex-col">
      {/* Only show header with save button when there are changes or element selected */}
      {(hasChanges || selectedElement) && (
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                Unsaved changes
              </span>
            )}
          </div>
          <SaveButton onSave={handleSave} />
        </div>
      )}
      <div className="flex-1 overflow-hidden bg-white">
        <PropertyPanel />
      </div>
    </div>
  );
}
