import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createOpaqueAnalysis } from '../../server.js';
import { parseYoutubeInfo } from '../../providers/youtube.js';

test('signed media URLs never regress into the browser-facing analysis', () => {
  const analysis = createOpaqueAnalysis({
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=BaW_jenozKc',
    title: 'Regression fixture',
    duration: 10,
    thumbnail: null,
    qualities: [{
      label: '1080p',
      type: 'mp4',
      url: 'https://r1.googlevideo.com/video?token=secret',
      audioUrl: 'https://r1.googlevideo.com/audio?token=secret'
    }]
  });
  const serialized = JSON.stringify(analysis);
  assert.equal(serialized.includes('googlevideo.com'), false);
  assert.equal(serialized.includes('secret'), false);
  assert.match(analysis.qualities[0].selectionId, /^[a-f0-9-]{36}$/i);
});

test('adaptive MP4 video keeps a compatible audio track', () => {
  const analysis = parseYoutubeInfo({
    title: 'Adaptive fixture',
    duration: 10,
    formats: [
      {
        height: 1080,
        ext: 'mp4',
        vcodec: 'avc1.640028',
        acodec: 'none',
        url: 'https://r1.googlevideo.com/video.mp4'
      },
      {
        ext: 'm4a',
        vcodec: 'none',
        acodec: 'mp4a.40.2',
        abr: 128,
        url: 'https://r1.googlevideo.com/audio.m4a'
      }
    ]
  });
  assert.equal(analysis.qualities[0].audioUrl, 'https://r1.googlevideo.com/audio.m4a');
});

test('browser polling stays below the API budget and treats HTTP 429 as temporary', async () => {
  const source = await readFile(new URL('../../public/app.js', import.meta.url), 'utf8');
  assert.match(source, /const JOB_POLL_INTERVAL_MS = 1_500;/);
  assert.match(source, /const PANEL_POLL_INTERVAL_MS = 5_000;/);
  assert.match(source, /if \(response\.status === 429\)/);
  assert.match(source, /retryAfterMilliseconds\(response\)/);
  assert.match(source, /downloadsPanelRefreshPromise/);
  assert.doesNotMatch(source, /setInterval\(refreshDownloadsPanel, 1500\)/);
});
