import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { decodeEntities, parseHlsManifest } from '../../providers/utils.js';

test('core parsing stays within a conservative local CPU and memory budget', () => {
  const manifest = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000,RESOLUTION=1280x720\nvideo.m3u8';
  const memoryBefore = process.memoryUsage().heapUsed;
  const started = performance.now();

  for (let index = 0; index < 10000; index += 1) {
    assert.equal(decodeEntities('A &amp; B'), 'A & B');
    assert.equal(
      parseHlsManifest(manifest, 'https://cdn.example/master.m3u8')[0].label,
      '720p'
    );
  }

  const durationMs = performance.now() - started;
  const memoryGrowth = process.memoryUsage().heapUsed - memoryBefore;
  assert.ok(durationMs < 5000, `Parsing took ${durationMs.toFixed(0)} ms`);
  assert.ok(memoryGrowth < 64 * 1024 * 1024, `Heap grew by ${memoryGrowth} bytes`);
});
