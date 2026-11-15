import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCameraYawRadians,
  isOccludingTile,
  normalizeYawIndex,
  rotateStepByYaw,
  tileSizeToOrthoHalfHeight,
  worldDirFromScreenDrag,
} from '../src/game/isoCamera.ts';

test('isoCamera: normalizeYawIndex wraps negative and >3 values into 0..3', () => {
  assert.equal(normalizeYawIndex(0), 0);
  assert.equal(normalizeYawIndex(4), 0);
  assert.equal(normalizeYawIndex(-1), 3);
  assert.equal(normalizeYawIndex(5), 1);
  assert.equal(normalizeYawIndex(-2), 2);
});

test('isoCamera: rotateStepByYaw keeps directional keys aligned across all 4 quarter turns', () => {
  // Base yaw 0: unchanged
  assert.deepEqual(rotateStepByYaw(0, -1, 0), [0, -1]);
  assert.deepEqual(rotateStepByYaw(1, 0, 0), [1, 0]);

  // Rotating 90° clockwise four times returns to identity
  let step: [number, number] = [0, -1];
  for (let y = 1 as 0 | 1 | 2 | 3; y <= 3; y = (y + 1) as 0 | 1 | 2 | 3) {
    step = rotateStepByYaw(0, -1, y);
    assert.equal(Math.hypot(step[0], step[1]), 1);
  }
  assert.deepEqual(rotateStepByYaw(0, -1, 1), [1, 0]);
  assert.deepEqual(rotateStepByYaw(0, -1, 2), [0, 1]);
  assert.deepEqual(rotateStepByYaw(0, -1, 3), [-1, 0]);
});

test('isoCamera: worldDirFromScreenDrag maps screen swipes to isometric grid steps', () => {
  const yaw0 = getCameraYawRadians(0);
  // At yaw0 (looking from +X,+Z toward origin), swiping straight up (dy < 0) moves (-1, -1)
  assert.deepEqual(worldDirFromScreenDrag(0, -50, yaw0), [-1, -1]);
  // Swiping straight right (dx > 0) moves (+1, -1)
  assert.deepEqual(worldDirFromScreenDrag(50, 0, yaw0), [1, -1]);
  // Swiping up-right moves North (0, -1)
  assert.deepEqual(worldDirFromScreenDrag(40, -40, yaw0), [0, -1]);
});

test('isoCamera: isOccludingTile detects foreground walls in front of focus tile', () => {
  const yaw0 = getCameraYawRadians(0);
  // Tile directly in front of player toward camera (+1, +1) occludes
  assert.equal(isOccludingTile(11, 11, 10, 10, yaw0), true);
  // Tile behind player (-1, -1) does NOT occlude
  assert.equal(isOccludingTile(9, 9, 10, 10, yaw0), false);
  // Distant tile far in front (> 3 tiles away) does NOT occlude
  assert.equal(isOccludingTile(14, 14, 10, 10, yaw0), false);
});

test('isoCamera: tileSizeToOrthoHalfHeight shrinks frustum when zooming in', () => {
  const zoomedOut = tileSizeToOrthoHalfHeight(28, 720);
  const defaultZoom = tileSizeToOrthoHalfHeight(36, 720);
  const zoomedIn = tileSizeToOrthoHalfHeight(44, 720);
  assert.ok(zoomedOut > defaultZoom);
  assert.ok(defaultZoom > zoomedIn);
});
