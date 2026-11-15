import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCameraForwardVector,
  getCameraRightVector,
  getCardinalYawRadians,
  getPerspectivePose,
  isCardinalOccluder,
  rotateStepByYaw,
  yawRadToCompassDeg,
} from '../src/game/perspectiveCamera.ts';

test('perspectiveCamera: cardinal forward and right vectors align with rotateStepByYaw', () => {
  const dirs = [
    { yaw: 0 as const, fwd: [0, -1], right: [1, 0] },
    { yaw: 1 as const, fwd: [1, 0], right: [0, 1] },
    { yaw: 2 as const, fwd: [0, 1], right: [-1, 0] },
    { yaw: 3 as const, fwd: [-1, 0], right: [0, -1] },
  ];

  for (const d of dirs) {
    const rad = getCardinalYawRadians(d.yaw);
    const fwd = getCameraForwardVector(rad);
    const right = getCameraRightVector(rad);
    assert.ok(Math.abs(fwd.x - d.fwd[0]) < 1e-6);
    assert.ok(Math.abs(fwd.z - d.fwd[1]) < 1e-6);
    assert.ok(Math.abs(right.x - d.right[0]) < 1e-6);
    assert.ok(Math.abs(right.z - d.right[1]) < 1e-6);
    assert.deepEqual(rotateStepByYaw(0, -1, d.yaw), d.fwd);
    assert.deepEqual(rotateStepByYaw(1, 0, d.yaw), d.right);
  }
});

test('perspectiveCamera: getPerspectivePose places eye behind player in chase and high overhead in tactical', () => {
  const chase = getPerspectivePose('chase', 10, 10, 0, 36);
  assert.ok(chase.eye[2] > 10, 'chase camera should sit South (+Z) when facing North');
  assert.ok(chase.target[2] < 10, 'chase target should look North (-Z) ahead of player');

  const tactical = getPerspectivePose('tactical', 10, 10, 0, 36);
  assert.ok(tactical.eye[1] > chase.eye[1], 'tactical camera sits higher than chase');
});

test('perspectiveCamera: isCardinalOccluder detects walls strictly behind player along sightline', () => {
  // Facing North (0): camera is South (+Z) at (12, 13) looking toward (12, 9)
  assert.equal(isCardinalOccluder(12, 11, 12, 9, 0, 'chase'), true);
  assert.equal(isCardinalOccluder(12, 7, 12, 9, 0, 'chase'), false);
});

test('perspectiveCamera: yawRadToCompassDeg points straight North at 0 and rotates CCW when looking East', () => {
  assert.equal(yawRadToCompassDeg(0), 0);
  assert.equal(yawRadToCompassDeg(getCardinalYawRadians(1)), -90);
});
