import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSourceUrl, providerForMediaUrl } from '../../providers/index.js';
import {
  isSecureRequest,
  parseAccessProfiles,
  requestAddress,
  requiresSecureTransport
} from '../../server.js';
import { startTestServer } from '../helpers/http-server.js';

test('remote access profiles require unique strong tokens and bounded limits', () => {
  assert.deepEqual(parseAccessProfiles(JSON.stringify([{
    id: 'student-1',
    token: 'a-strong-development-token-12345',
    role: 'user',
    maxActiveJobs: 3
  }])), [{
    id: 'student-1',
    token: 'a-strong-development-token-12345',
    role: 'user',
    maxActiveJobs: 3
  }]);
  assert.throws(() => parseAccessProfiles('[{"id":"ab","token":"short"}]'), /24 characters/i);
  assert.throws(() => parseAccessProfiles(JSON.stringify([
    { id: 'same', token: 'first-strong-development-token' },
    { id: 'same', token: 'second-strong-development-token' }
  ])), /unique safe id/i);
});

test('source and media allowlists reject common SSRF forms', () => {
  for (const value of [
    'http://www.youtube.com/watch?v=BaW_jenozKc',
    'https://127.0.0.1/video.mp4',
    'https://localhost/video.mp4',
    'https://www.youtube.com.example.invalid/watch?v=BaW_jenozKc',
    'file:///etc/passwd'
  ]) {
    assert.throws(() => normalizeSourceUrl(value));
  }
  assert.equal(providerForMediaUrl('https://127.0.0.1/private'), null);
  assert.equal(providerForMediaUrl('https://169.254.169.254/latest/meta-data'), null);
});

test('trusted proxy headers cannot grant localhost privileges to remote clients', () => {
  const proxiedRequest = {
    socket: { remoteAddress: '127.0.0.1', encrypted: false },
    headers: {
      'x-forwarded-for': '203.0.113.27',
      'x-forwarded-proto': 'https'
    }
  };
  assert.equal(requestAddress(proxiedRequest, true), '203.0.113.27');
  assert.equal(isSecureRequest(proxiedRequest, true), true);
  assert.equal(requiresSecureTransport(proxiedRequest, true, true), false);

  proxiedRequest.headers['x-forwarded-for'] = '127.0.0.1, 203.0.113.27';
  assert.equal(requestAddress(proxiedRequest, true), '203.0.113.27');

  const directSpoof = {
    socket: { remoteAddress: '203.0.113.50', encrypted: false },
    headers: {
      'x-forwarded-for': '127.0.0.1',
      'x-forwarded-proto': 'https'
    }
  };
  assert.equal(requestAddress(directSpoof, true), '203.0.113.50');
  assert.equal(isSecureRequest(directSpoof, true), false);
  assert.equal(requiresSecureTransport(directSpoof, true, true), true);

  const malformedForward = {
    socket: { remoteAddress: '127.0.0.1', encrypted: false },
    headers: { 'x-forwarded-for': 'localhost', 'x-forwarded-proto': 'http' }
  };
  assert.equal(requestAddress(malformedForward, true), 'unknown-proxy-client');
  assert.equal(isSecureRequest(malformedForward, true), false);
  assert.equal(requiresSecureTransport(malformedForward, true, true), true);
});

test('administrative and upload endpoints require non-simple control headers', async () => {
  const application = await startTestServer();
  try {
    const restart = await fetch(
      `${application.baseUrl}/api/jobs/00000000-0000-4000-8000-000000000000/restart`,
      { method: 'POST' }
    );
    assert.equal(restart.status, 403);

    const upload = await fetch(`${application.baseUrl}/api/upload-jobs`, {
      method: 'POST',
      headers: { 'content-type': 'video/mp4' },
      body: new Uint8Array([0])
    });
    assert.equal(upload.status, 403);

    const audioUpload = await fetch(`${application.baseUrl}/api/audio-jobs`, {
      method: 'POST',
      headers: { 'content-type': 'audio/wav' },
      body: new Uint8Array([0])
    });
    assert.equal(audioUpload.status, 403);

    const audioJoin = await fetch(`${application.baseUrl}/api/audio-join-jobs`, {
      method: 'POST',
      headers: { 'content-type': 'application/vnd.vdownloader.audio-join' },
      body: new Uint8Array([0, 0, 0, 2, 123, 125])
    });
    assert.equal(audioJoin.status, 403);
  } finally {
    await application.close();
  }
});

test('bulk restart, expired cleanup, and audit require and record administration', async () => {
  const application = await startTestServer();
  try {
    const denied = await fetch(`${application.baseUrl}/api/admin/jobs/restart`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: ['00000000-0000-4000-8000-000000000000'] })
    });
    assert.equal(denied.status, 403);

    const headers = {
      'content-type': 'application/json',
      'x-vdownloader-admin': '1'
    };
    const restart = await fetch(`${application.baseUrl}/api/admin/jobs/restart`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ids: ['00000000-0000-4000-8000-000000000000'] })
    });
    assert.equal(restart.status, 202);
    assert.deepEqual(await restart.json(), {
      restarted: 0,
      missing: ['00000000-0000-4000-8000-000000000000']
    });

    const cleanup = await fetch(`${application.baseUrl}/api/admin/jobs/cleanup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ scope: 'expired' })
    });
    assert.equal(cleanup.status, 200);
    assert.deepEqual(await cleanup.json(), { removed: 0, freedBytes: 0 });

    const audit = await fetch(`${application.baseUrl}/api/admin/audit`, {
      headers: { 'x-vdownloader-admin': '1' }
    });
    const body = await audit.json();
    assert.equal(audit.status, 200);
    assert.ok(body.events.some((event) => event.action === 'jobs_bulk_restart'));
    assert.ok(body.events.some((event) => event.action === 'expired_jobs_cleanup'));
  } finally {
    await application.close();
  }
});
