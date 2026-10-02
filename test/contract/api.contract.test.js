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
