import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolveUploadSettings } from '../../upload-settings.js';
const GiB = 1024 ** 3;

test('upload settings preserve defaults, exact large boundaries and the storage ceiling', () => {
  const defaults = resolveUploadSettings({});
  assert.equal(defaults.maxBytes, 2 * GiB);
  assert.equal(defaults.storageBytes, 10 * GiB);
  const large = resolveUploadSettings({ MAX_UPLOAD_GB: '6', MAX_STORAGE_GB: '12', UPLOAD_TIMEOUT_MINUTES: '180' });
  assert.equal(large.maxBytes, 6 * GiB);
  assert.equal(large.requestTimeoutMs, 10_800_000);
  assert.equal(resolveUploadSettings({ MAX_UPLOAD_GB: '6', MAX_STORAGE_GB: '3' }).maxBytes, 3 * GiB);
  const unlimited = resolveUploadSettings({ UPLOAD_LIMIT_ENABLED: 'false', MAX_UPLOAD_GB: 'ignored', MAX_STORAGE_GB: '12' });
  assert.equal(unlimited.maxBytes, null);
  assert.equal(unlimited.effectiveMaxBytes, 12 * GiB);
  assert.equal(unlimited.limitEnabled, false);
});

test('invalid limit switches and unsafe sizes never silently disable protection', () => {
  for (const mode of ['', 'FALSE', 'yes', '0']) assert.throws(() => resolveUploadSettings({ UPLOAD_LIMIT_ENABLED: mode }));
  for (const size of ['0', '-1', 'Infinity', 'NaN', '1e99']) {
    assert.throws(() => resolveUploadSettings({ MAX_UPLOAD_GB: size }));
    assert.throws(() => resolveUploadSettings({ MAX_STORAGE_GB: size }));
  }
  for (const minutes of ['0', '1441', 'NaN', '0.5']) assert.throws(() => resolveUploadSettings({ UPLOAD_TIMEOUT_MINUTES: minutes }));
});

test('video and audio metadata accept 5 GiB, reject cap overflow and retain exact-byte validation', () => {
  for (const mode of ['true', 'false']) {
    const code = `
      import assert from 'node:assert/strict';
      import {normalizeUploadMetadata,normalizeAudioUploadMetadata,server} from './server.js';
      const base={contentLength:5*1024**3,duration:60,start:0,end:60};
      assert.equal(normalizeUploadMetadata({...base,fileName:'large.mp4',contentType:'video/mp4'}).contentLength,base.contentLength);
      assert.equal(normalizeAudioUploadMetadata({...base,fileName:'large.wav',contentType:'audio/wav',outputFormat:'mp3',bitrate:192}).contentLength,base.contentLength);
      const cap=(${JSON.stringify(mode)}==='true'?6:12)*1024**3;
      assert.throws(()=>normalizeUploadMetadata({...base,fileName:'large.mp4',contentLength:cap+1}),e=>e.statusCode===413);
      assert.throws(()=>normalizeUploadMetadata({...base,fileName:'large.mp4',contentLength:Number.MAX_SAFE_INTEGER+1}));
      assert.equal(server.requestTimeout,180*60000);
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', code], {
      cwd: new URL('../../', import.meta.url), encoding: 'utf8',
      env: { ...process.env, UPLOAD_LIMIT_ENABLED: mode, MAX_UPLOAD_GB: '6', MAX_STORAGE_GB: '12', UPLOAD_TIMEOUT_MINUTES: '180' }
    });
    assert.equal(result.status, 0, result.stderr);
  }
});
