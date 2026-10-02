import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/http-server.js';

test('static files and the job API work through the real HTTP router', async () => {
  const application = await startTestServer();
  try {
    const [home, documentation, jobs] = await Promise.all([
      fetch(`${application.baseUrl}/`),
      fetch(`${application.baseUrl}/docs.html`),
      fetch(`${application.baseUrl}/api/jobs`)
    ]);
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-type'), /text\/html/);
    assert.equal(documentation.status, 200);
    assert.equal(jobs.status, 200);
    assert.equal((await jobs.json()).stats.maxConcurrent >= 1, true);

    const unsupported = await fetch(`${application.baseUrl}/api/unknown`, { method: 'POST' });
    assert.equal(unsupported.status, 405);
  } finally {
    await application.close();
  }
});
