import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/http-server.js';

test('the read-only API remains responsive under concurrent requests', async () => {
  const application = await startTestServer();
  try {
    const responses = await Promise.all(
      Array.from({ length: 50 }, () => fetch(`${application.baseUrl}/api/jobs`))
    );
    assert.equal(responses.every((response) => response.status === 200), true);
    const bodies = await Promise.all(responses.map((response) => response.json()));
    assert.equal(bodies.every((body) => Array.isArray(body.jobs)), true);
  } finally {
    await application.close();
  }
});

test('malformed requests do not prevent a subsequent valid request', async () => {
  const application = await startTestServer();
  try {
    const malformed = await fetch(`${application.baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"url":'
    });
    assert.ok(malformed.status >= 400);
    const recovery = await fetch(`${application.baseUrl}/api/jobs`);
    assert.equal(recovery.status, 200);
  } finally {
    await application.close();
  }
});
