import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeYawIndex,
  rotateStepByYaw,
} from '../src/game/cameraYaw.ts';

test('cameraYaw: normalizeYawIndex wraps negative and >3 values into 0..3', () => {
  assert.equal(normalizeYawIndex(0), 0);
  assert.equal(normalizeYawIndex(4), 0);
  assert.equal(normalizeYawIndex(-1), 3);
  assert.equal(normalizeYawIndex(5), 1);
  assert.equal(normalizeYawIndex(-2), 2);
});

test('cameraYaw: rotateStepByYaw keeps directional keys aligned across all 4 quarter turns', () => {
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
