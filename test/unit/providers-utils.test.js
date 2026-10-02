import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { decodeEntities, parseHlsManifest } from '../../providers/utils.js';

test('decodes the supported HTML entities', () => {
  assert.equal(
    decodeEntities('&lt;video title=&quot;A &amp; B&quot;&gt;&#039;ok&#039;&lt;/video&gt;'),
    '<video title="A & B">\'ok\'</video>'
  );
});

test('parses named and resolution-derived HLS variants from a fixture', async () => {
  const manifest = await readFile(new URL('../fixtures/master.m3u8', import.meta.url), 'utf8');
  assert.deepEqual(parseHlsManifest(manifest, 'https://cdn.example/live/master.m3u8'), [
    {
      label: '360p',
      url: 'https://cdn.example/live/360/index.m3u8',
      type: 'hls',
      bandwidth: 800000
    },
    {
      label: '1080p',
      url: 'https://cdn.example/1080/index.m3u8',
      type: 'hls',
      bandwidth: 2800000
    }
  ]);
});
