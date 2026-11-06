import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/http-server.js';

test('GET /api/jobs preserves the public response contract', async () => {
  const application = await startTestServer();
  try {
    const response = await fetch(`${application.baseUrl}/api/jobs`);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(Array.isArray(body.jobs), true);
    assert.deepEqual(
      Object.keys(body.stats).sort(),
      [
        'active',
        'maxConcurrent',
        'maxRetries',
        'queued',
        'ready',
        'readyBytes',
        'storageLimitBytes',
        'storedBytes',
        'ttlMinutes'
      ].sort()
    );
    for (const key of Object.keys(body.stats)) {
      assert.equal(Number.isFinite(body.stats[key]), true, `${key} must be numeric`);
      assert.ok(body.stats[key] >= 0, `${key} must be non-negative`);
    }
  } finally {
    await application.close();
  }
});

test('API errors remain JSON and do not expose internal paths', async () => {
  const application = await startTestServer();
  try {
    const response = await fetch(`${application.baseUrl}/api/jobs/not-a-uuid`);
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type'), /application\/json/);
    assert.equal(typeof body.error, 'string');
    assert.equal(JSON.stringify(body).includes(process.cwd()), false);
  } finally {
    await application.close();
  }
});

test('downloadable diagnostics require an explicit header and omit secrets and paths', async () => {
  const application = await startTestServer();
  try {
    const rejected = await fetch(`${application.baseUrl}/api/diagnostics`);
    assert.equal(rejected.status, 403);

    const response = await fetch(`${application.baseUrl}/api/diagnostics`, {
      headers: { 'x-vdownloader-diagnostics': '1' }
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-disposition'), /attachment/i);
    assert.equal(body.application.name, 'vDownloader');
    assert.equal(typeof body.dependencies.ffmpeg.available, 'boolean');
    const serialized = JSON.stringify(body);
    assert.equal(serialized.includes(process.cwd()), false);
    assert.doesNotMatch(serialized, /ADMIN_TOKEN|ACCESS_TOKENS_JSON|authorization|googlevideo/i);
  } finally {
    await application.close();
  }
});

test('partial cleanup and subtitle translation require non-simple control headers', async () => {
  const application = await startTestServer();
  try {
    const id = '11111111-1111-4111-8111-111111111111';
    const partial = await fetch(`${application.baseUrl}/api/jobs/${id}/partial`, { method: 'DELETE' });
    assert.equal(partial.status, 403);
    const missingPartial = await fetch(`${application.baseUrl}/api/jobs/${id}/partial`, {
      method: 'DELETE',
      headers: { 'x-vdownloader-partial': '1' }
    });
    assert.equal(missingPartial.status, 404);

    const translation = await fetch(`${application.baseUrl}/api/subtitle-translate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sourceLanguage: 'en', targetLanguage: 'es', texts: ['Hello'] })
    });
    assert.equal(translation.status, 403);
  } finally {
    await application.close();
  }
});
