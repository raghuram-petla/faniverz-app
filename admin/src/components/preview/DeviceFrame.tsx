'use client';
import type { DeviceConfig } from '@shared/constants';

interface DeviceFrameProps {
  device: DeviceConfig;
  maxWidth?: number;
  children: React.ReactNode;
}

export function DeviceFrame({ device, maxWidth = 320, children }: DeviceFrameProps) {
  const scale = maxWidth / device.width;
  const scaledHeight = device.height * scale;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative overflow-hidden rounded-[2rem] border-2 border-white/20 bg-black"
        style={{ width: maxWidth, height: scaledHeight }}
      >
        {/* Status bar */}
        <div
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6"
          style={{ height: device.safeAreaTop * scale }}
        >
          <span className="text-[10px] text-white font-semibold">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-3 h-2 border border-white/60 rounded-sm">
              <div className="w-2 h-1 bg-white/60 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Scaled content */}
        <div
          style={{
            width: device.width,
            height: device.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>

      {/* Device label */}
      <p className="text-xs text-white/40">
        {device.name} — {device.width}×{device.height}
      </p>
    </div>
  );
}
