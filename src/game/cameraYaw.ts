export type CameraYawIndex = 0 | 1 | 2 | 3;

/**
 * Normalize any integer into a valid 0..3 quarter-turn yaw index.
 */
export function normalizeYawIndex(yaw: number): CameraYawIndex {
  return (((Math.round(yaw) % 4) + 4) % 4) as CameraYawIndex;
}

/**
 * Rotate a screen-relative cardinal step (W/A/S/D or Arrow keys) by the active
 * camera quarter-turn yaw so Up/Down/Left/Right stay aligned with the view.
 */
export function rotateStepByYaw(
  dx: number,
  dy: number,
  yawIndex: CameraYawIndex
): [number, number] {
  switch (yawIndex) {
    case 0:
      return [dx || 0, dy || 0];
    case 1:
      return [-dy || 0, dx || 0];
    case 2:
      return [-dx || 0, -dy || 0];
    case 3:
      return [dy || 0, -dx || 0];
  }
}
