import { useEffect, useState } from 'react';
import { Accelerometer } from 'expo-sensors';

// @contract Detects physical device landscape tilt via accelerometer WITHOUT
// unlocking screen rotation. The screen stays portrait-locked; returns the
// rotation angle (0, 90, or -90) so callers can apply CSS rotation.
// 90 = phone tilted left (home button on right), -90 = phone tilted right.
// Uses a hysteresis threshold to avoid flickering at the tilt boundary.
const TILT_THRESHOLD = 0.6;
const UNTILT_THRESHOLD = 0.4;
const UPDATE_INTERVAL = 200;

/** @returns 0 (portrait), 90 (landscape-right), or -90 (landscape-left) */
export function useDeviceLandscape(enabled: boolean): number {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setRotation(0);
      return;
    }

    Accelerometer.setUpdateInterval(UPDATE_INTERVAL);
    const sub = Accelerometer.addListener(({ x }) => {
      // @edge x > 0 = phone tilted right (top points right) → rotate image -90°
      // x < 0 = phone tilted left (top points left) → rotate image 90°
      const absX = Math.abs(x);
      setRotation((prev) => {
        const wasLandscape = prev !== 0;
        if (!wasLandscape && absX > TILT_THRESHOLD) return x > 0 ? -90 : 90;
        if (wasLandscape && absX < UNTILT_THRESHOLD) return 0;
        // @edge If already landscape but tilt direction flipped, update immediately
        if (wasLandscape && absX > TILT_THRESHOLD) {
          const newDir = x > 0 ? -90 : 90;
          if (newDir !== prev) return newDir;
        }
        return prev;
      });
    });

    return () => sub.remove();
  }, [enabled]);

  return rotation;
}
