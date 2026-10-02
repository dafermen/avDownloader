import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeClipRange, normalizeIdentityProtection } from '../../server.js';

test('every valid clip preserves start, end, and duration invariants', () => {
  for (let start = 0; start <= 300; start += 7.5) {
    for (const duration of [1, 12.5, 60]) {
      const end = start + duration;
      const clip = normalizeClipRange(String(start), String(end));
      assert.ok(clip.start >= 0);
      assert.ok(clip.end > clip.start);
      assert.ok(clip.duration > 0);
      assert.ok(Math.abs(clip.duration - (clip.end - clip.start)) < Number.EPSILON * 8);
    }
  }
});

test('normalized identity regions always remain inside the video frame', () => {
  for (let index = 1; index <= 50; index += 1) {
    const x = (index % 10) / 20;
    const y = (index % 8) / 20;
    const width = Math.min(0.25, 1 - x);
    const height = Math.min(0.25, 1 - y);
    const result = normalizeIdentityProtection({
      method: 'pixelate',
      blockSize: 8 + index,
      frames: [{ time: 0, boxes: [{ x, y, width, height }] }]
    }, 1);
    const box = result.frames[0].boxes[0];
    assert.ok(box.x >= 0 && box.y >= 0);
    assert.ok(box.width > 0 && box.height > 0);
    assert.ok(box.x + box.width <= 1);
    assert.ok(box.y + box.height <= 1);
  }
});
