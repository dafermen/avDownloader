import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hasTranslation } from '../../public/i18n.js';

test('the primary user journey is present in both interface languages', async () => {
  const [html, app, documentation] = await Promise.all([
    readFile(new URL('../../public/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../public/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../../public/docs.html', import.meta.url), 'utf8')
  ]);

  for (const key of [
    'search.action',
    'local.select',
    'local.exportClip',
    'audio.select',
    'audio.export',
    'audio.codec',
    'video.videoCodec',
    'downloads.title',
    'nav.docs'
  ]) {
    assert.equal(hasTranslation(key, 'es'), true, `Missing Spanish acceptance key: ${key}`);
    assert.equal(hasTranslation(key, 'en'), true, `Missing English acceptance key: ${key}`);
  }
  assert.match(html, /href="\/docs\.html"/);
  assert.match(app, /\/api\/analyze/);
  assert.match(app, /\/api\/upload-jobs/);
  assert.match(app, /\/api\/audio-jobs/);
  assert.match(app, /\/api\/audio-join-jobs/);
  assert.match(html, /id="local-audio-file"/);
  assert.match(html, /id="audio-output-format"/);
  assert.match(html, /id="audio-output-codec"/);
  assert.match(html, /id="audio-source-list"/);
  assert.match(html, /id="video-output-codec"/);
  assert.match(html, /id="identity-edit"/);
  assert.match(html, /id="identity-add"/);
  assert.match(html, /id="identity-reviewed"/);
  assert.match(html, /id="admin-restart-selected"/);
  assert.match(html, /id="admin-clean-expired"/);
  assert.match(documentation, /Deployment quality gate/i);
});
