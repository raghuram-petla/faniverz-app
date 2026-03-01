'use client';
import { DEVICES, type DeviceConfig } from '@shared/constants';

interface DeviceSelectorProps {
  selected: DeviceConfig;
  onChange: (device: DeviceConfig) => void;
}

export function DeviceSelector({ selected, onChange }: DeviceSelectorProps) {
  return (
    <select
      value={selected.name}
      onChange={(e) => {
        const device = DEVICES.find((d) => d.name === e.target.value);
        if (device) onChange(device);
      }}
      className="bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
    >
      {DEVICES.map((d) => (
        <option key={d.name} value={d.name}>
          {d.name} ({d.width}×{d.height}) — {d.platform}
        </option>
      ))}
    </select>
  );
}
