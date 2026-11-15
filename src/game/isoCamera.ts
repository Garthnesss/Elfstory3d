export type CameraYawIndex = 0 | 1 | 2 | 3;

export const ISO_ELEVATION_RAD = Math.atan(1 / Math.SQRT2); // Classic isometric ~35.264°

/**
 * Normalize any integer into a valid 0..3 quarter-turn yaw index.
 */
export function normalizeYawIndex(yaw: number): CameraYawIndex {
  return (((Math.round(yaw) % 4) + 4) % 4) as CameraYawIndex;
}

/**
 * Camera azimuth angle in radians for a quarter-turn index.
 * Index 0 looks from (+X, +Y, +Z) toward origin (45°), so:
 *   North (0, -1) points up-right, East (1, 0) points down-right,
 *   South (0, 1) points down-left, West (-1, 0) points up-left.
 */
export function getCameraYawRadians(yawIndex: number): number {
  return Math.PI / 4 + normalizeYawIndex(yawIndex) * (Math.PI / 2);
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

/**
 * Convert a screen-space swipe vector (screenDx right, screenDy down) into the
 * nearest 8-way grid step (dx, dy) given the camera's current yaw angle.
 */
export function worldDirFromScreenDrag(
  screenDx: number,
  screenDy: number,
  yawAngleRad: number
): [number, number] {
  // Forward in XZ from camera toward target is (-cos(yaw), -sin(yaw)).
  // Screen-right in XZ is (sin(yaw), -cos(yaw)).
  const fwdX = -Math.cos(yawAngleRad);
  const fwdZ = -Math.sin(yawAngleRad);
  const rightX = Math.sin(yawAngleRad);
  const rightZ = -Math.cos(yawAngleRad);

  // screenDy < 0 is swiping UP (forward), screenDx > 0 is swiping RIGHT.
  const worldX = rightX * screenDx + fwdX * -screenDy;
  const worldZ = rightZ * screenDx + fwdZ * -screenDy;

  const angle = Math.atan2(worldZ, worldX);
  const octant = Math.round(angle / (Math.PI / 4));
  const dirMap: Record<number, [number, number]> = {
    0: [1, 0],
    1: [1, 1],
    2: [0, 1],
    3: [-1, 1],
    4: [-1, 0],
    [-4]: [-1, 0],
    [-3]: [-1, -1],
    [-2]: [0, -1],
    [-1]: [1, -1],
  };
  return dirMap[octant] ?? [0, 0];
}

/**
 * Determine whether a tall obstacle tile (wall / pillar / tree) at (tileX, tileY)
 * lies directly between the isometric camera and a focus entity at (focusX, focusY)
 * so the renderer can fade/cut away the occluding wall.
 */
export function isOccludingTile(
  tileX: number,
  tileY: number,
  focusX: number,
  focusY: number,
  yawAngleRad: number
): boolean {
  const camDirX = Math.cos(yawAngleRad);
  const camDirZ = Math.sin(yawAngleRad);
  const vx = tileX - focusX;
  const vz = tileY - focusY;

  const alongCamera = vx * camDirX + vz * camDirZ;
  if (alongCamera <= 0.15 || alongCamera > 2.55) return false;

  const perp = Math.abs(-vx * camDirZ + vz * camDirX);
  return perp < 1.15;
}

/**
 * Convert ElfStory's tileSize zoom setting (28 | 36 | 44) into an orthographic
 * camera half-height in world tile units.
 * Larger tileSize = zoomed in = smaller world half-height.
 */
export function tileSizeToOrthoHalfHeight(tileSize: number, viewHeight: number): number {
  const safeH = Math.max(240, viewHeight);
  // In isometric projection, 1 world tile spans ~tileSize * 1.18 vertical screen pixels.
  const pixelsPerTile = Math.max(20, tileSize * 1.18);
  return safeH / (2 * pixelsPerTile);
}
