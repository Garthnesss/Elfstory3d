import type { CameraYawIndex } from './cameraYaw';
import { normalizeYawIndex, rotateStepByYaw } from './cameraYaw';

export type { CameraYawIndex };
export { normalizeYawIndex, rotateStepByYaw };

export type CameraViewMode = 'chase' | 'tactical';

export interface CameraPose {
  fov: number;
  eye: [number, number, number];
  target: [number, number, number];
}

/**
 * Cardinal camera azimuth in radians for 0..3 quarter turns:
 *   0 -> 0 rad      (facing North: -Z, camera behind at +Z)
 *   1 -> PI/2 rad   (facing East:  +X, camera behind at -X)
 *   2 -> PI rad     (facing South: +Z, camera behind at -Z)
 *   3 -> 3PI/2 rad  (facing West:  -X, camera behind at +X)
 */
export function getCardinalYawRadians(yawIndex: number): number {
  return normalizeYawIndex(yawIndex) * (Math.PI / 2);
}

/**
 * Horizontal unit forward vector (x, z) on the XZ plane for a given yaw angle.
 */
export function getCameraForwardVector(yawRad: number): { x: number; z: number } {
  return {
    x: Math.sin(yawRad) || 0,
    z: -Math.cos(yawRad) || 0,
  };
}

/**
 * Horizontal unit screen-right vector (x, z) on the XZ plane for a given yaw angle.
 */
export function getCameraRightVector(yawRad: number): { x: number; z: number } {
  return {
    x: Math.cos(yawRad) || 0,
    z: Math.sin(yawRad) || 0,
  };
}

/**
 * Compute perspective camera FOV, eye position, and look target in world coordinates
 * for either of the two 3D camera views.
 */
export function getPerspectivePose(
  mode: CameraViewMode,
  focusX: number,
  focusZ: number,
  yawRad: number,
  tileSize: number
): CameraPose {
  const fwd = getCameraForwardVector(yawRad);
  const zoomScale = 36 / Math.max(24, Math.min(52, tileSize));

  if (mode === 'tactical') {
    const backDist = 6.0 * zoomScale;
    const eyeHeight = 8.4 * zoomScale;
    const lookAhead = 0.25;
    return {
      fov: 44,
      eye: [focusX - fwd.x * backDist, eyeHeight, focusZ - fwd.z * backDist],
      target: [focusX + fwd.x * lookAhead, 0.3, focusZ + fwd.z * lookAhead],
    };
  }

  // Default: Third-person behind-the-hero Chase 3D perspective
  const backDist = 3.15 * zoomScale;
  const eyeHeight = 2.28 * zoomScale;
  const lookAhead = 2.15;
  return {
    fov: 56,
    eye: [focusX - fwd.x * backDist, eyeHeight, focusZ - fwd.z * backDist],
    target: [focusX + fwd.x * lookAhead, 0.72, focusZ + fwd.z * lookAhead],
  };
}

/**
 * Returns true when an opaque tall tile (wall / tree / gate) at (tileX, tileY)
 * lies between the focus entity and the chase/tactical camera so the renderer
 * can smoothly cut it down out of the sightline.
 */
export function isCardinalOccluder(
  tileX: number,
  tileY: number,
  focusX: number,
  focusY: number,
  yawRad: number,
  mode: CameraViewMode
): boolean {
  const fwd = getCameraForwardVector(yawRad);
  const vx = tileX - focusX;
  const vz = tileY - focusY;

  // Positive 'behind' means the tile lies toward the camera behind the hero
  const behind = vx * -fwd.x + vz * -fwd.z;
  const lateral = Math.abs(vx * fwd.z - vz * fwd.x);

  if (mode === 'tactical') {
    return behind > 0.25 && behind < 2.25 && lateral < 0.85;
  }
  return behind > 0.25 && behind < 3.55 && lateral < 1.15;
}

/**
 * Convert camera yaw (radians clockwise from North) into a compass rotation in degrees
 * where 0 deg points North straight up.
 */
export function yawRadToCompassDeg(yawRad: number): number {
  return -(yawRad * 180) / Math.PI || 0;
}
