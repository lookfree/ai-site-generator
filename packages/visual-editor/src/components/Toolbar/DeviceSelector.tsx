/**
 * 设备选择器
 */

import { useEditorStore } from '../../stores/editor-store';
import type { DeviceView } from '../../types';
import { DEVICE_VIEWS } from '../../types';

export default function DeviceSelector() {
  const deviceView = useEditorStore(state => state.deviceView);
  const setDeviceView = useEditorStore(state => state.setDeviceView);

  const devices: DeviceView[] = ['desktop', 'tablet', 'mobile'];

  return (
    <div className="device-selector">
      {devices.map(device => (
        <button
          key={device}
          className={`device-btn ${deviceView === device ? 'active' : ''}`}
          onClick={() => setDeviceView(device)}
          title={DEVICE_VIEWS[device].name}
        >
          <span className="device-icon">{DEVICE_VIEWS[device].icon}</span>
        </button>
      ))}

      <style>{`
        .device-selector {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: #f3f4f6;
          border-radius: 6px;
        }

        .device-btn {
          padding: 6px 10px;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.1s;
        }

        .device-btn:hover {
          background: #e5e7eb;
        }

        .device-btn.active {
          background: #fff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
        }

        .device-icon {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
