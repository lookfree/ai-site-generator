/**
 * Visual Editor 主入口
 */

// Components
export {
  Editor,
  Toolbar,
  Preview,
  IframeWrapper,
  PropertyPanel,
  CodePreview,
  SyntaxHighlight,
  DeviceSelector,
  HistoryButtons,
  SaveButton,
  ColorPicker,
  SelectControl,
  SizeInput,
  SliderControl,
  TextInput,
  SpacingBox,
} from './components';

// Hooks
export {
  useIframeCommunication,
  usePropertySync,
  useEditHistory,
  useElementSelection,
  useOptimisticUpdate,
  getElementDisplayName,
} from './hooks';

// Stores
export { useEditorStore } from './stores';

// Services
export {
  ElementBridge,
  elementBridge,
  extractTailwindClasses,
  colorToTailwindClass,
  parseClassName,
  getClassCategory,
  CodeSyncService,
  codeSyncService,
} from './services';

// Utils
export * from './utils';

// Types
export type {
  SelectedElementInfo,
  UpdatePayload,
  EditAction,
  MessageType,
  EditorMessage,
  StyleUpdatePayload,
  DeviceView,
  DeviceViewConfig,
  PropertyTabId,
  TabConfig,
} from './types';

export { DEVICE_VIEWS, PROPERTY_TABS } from './types';
