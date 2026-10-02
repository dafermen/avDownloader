import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer } from '../helpers/http-server.js';

test('a local client can load the application, documentation, and panel data', async () => {
  const application = await startTestServer();
  try {
    const home = await fetch(`${application.baseUrl}/`);
    const html = await home.text();
    assert.equal(home.status, 200);
    assert.match(html, /vDownloader/);
    assert.match(html, /id="video-url"/);

    const docs = await fetch(`${application.baseUrl}/docs.html`);
    assert.equal(docs.status, 200);
    assert.match(await docs.text(), /Complete documentation/i);

    const panel = await fetch(`${application.baseUrl}/api/jobs`);
    assert.equal(panel.status, 200);
    assert.ok(Array.isArray((await panel.json()).jobs));
  } finally {
    await application.close();
  }
});
