import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import net from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Creates a small, standards-compliant mono PCM WAV without test fixtures. */
function createSineWave({ durationSeconds = 2, sampleRate = 16_000, frequency = 440 } = {}) {
  const sampleCount = Math.round(durationSeconds * sampleRate);
  const dataBytes = sampleCount * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataBytes, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.round(Math.sin(2 * Math.PI * frequency * index / sampleRate) * 12_000);
    buffer.writeInt16LE(sample, 44 + index * 2);
  }
  return buffer;
}

/** Reserves a loopback port long enough to start an isolated child process. */
async function availablePort() {
  const socket = net.createServer();
  await new Promise((resolveListen, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolveListen);
  });
  const port = socket.address().port;
  await new Promise((resolveClose, reject) => socket.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

/** Starts the complete application with an isolated persistent job directory. */
async function startIsolatedApplication(options = {}) {
  const port = await availablePort();
  const ownsJobDirectory = !options.jobDirectory;
  const jobDirectory = options.jobDirectory || await mkdtemp(join(tmpdir(), 'vdownloader-audio-e2e-'));
  const child = spawn(process.execPath, [join(projectRoot, 'server.js')], {
    cwd: projectRoot,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      JOB_DIR: jobDirectory,
      RATE_LIMIT_MAX: '1000',
      REMOTE_ACCESS_ENABLED: 'false'
    },
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs = (logs + chunk).slice(-8_000); });
  child.stderr.on('data', (chunk) => { logs = (logs + chunk).slice(-8_000); });
  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Application exited during startup.\n${logs}`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.status === 200 || response.status === 503) break;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  try {
    await fetch(`${baseUrl}/api/health`);
  } catch {
    child.kill('SIGTERM');
    await rm(jobDirectory, { recursive: true, force: true });
    throw new Error(`Application did not start before the timeout.\n${logs}`);
  }
  return {
    baseUrl,
    logs: () => logs,
    close: async () => {
      if (child.exitCode === null) {
        child.kill('SIGTERM');
        await Promise.race([
          once(child, 'exit'),
          new Promise((resolveWait) => setTimeout(resolveWait, 5_000))
        ]);
      }
      if (ownsJobDirectory) await rm(jobDirectory, { recursive: true, force: true });
    }
  };
}

/** Generates a lawful tiny A/V fixture using the same system tool as production. */
async function createSyntheticVideo(directory) {
  const ffmpeg = process.env.FFMPEG_PATH?.trim()
    || (process.platform === 'linux' ? 'ffmpeg' : (await import('ffmpeg-static')).default || 'ffmpeg');
  const path = join(directory, 'source.mp4');
  const child = spawn(ffmpeg, [
    '-hide_banner', '-loglevel', 'error', '-nostdin',
    '-f', 'lavfi', '-i', 'testsrc=size=160x90:rate=15:duration=2',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'ultrafast',
    '-c:a', 'aac', '-shortest', '-y', path
  ], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const [code] = await once(child, 'exit');
  if (code !== 0) throw new Error(`Synthetic video generation failed: ${stderr}`);
  return { path, bytes: await readFile(path) };
}

test('a temporary WAV can be trimmed, transcoded to MP3, and downloaded', { timeout: 45_000 }, async () => {
  const application = await startIsolatedApplication();
  try {
    const source = createSineWave();
    const upload = await fetch(`${application.baseUrl}/api/audio-jobs`, {
      method: 'POST',
      headers: {
        'content-type': 'audio/wav',
        'content-length': String(source.length),
        'x-vdownloader-audio': '1',
        'x-upload-name': encodeURIComponent('tone.wav'),
        'x-upload-duration': '2',
        'x-upload-start': '0.25',
        'x-upload-end': '1.25',
        'x-audio-format': 'mp3',
        'x-audio-bitrate': '128'
      },
      body: source
    });
    const created = await upload.json();
    assert.equal(upload.status, 202, JSON.stringify(created));
    assert.equal(created.mediaKind, 'audio');
    assert.equal(created.outputFormat, 'mp3');
    assert.equal(created.provider, 'audio');

    let job = created;
    const deadline = Date.now() + 20_000;
    while (!['ready', 'error', 'cancelled'].includes(job.status) && Date.now() < deadline) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 150));
      const response = await fetch(`${application.baseUrl}/api/jobs/${created.id}`);
      assert.equal(response.status, 200);
      job = await response.json();
    }
    assert.equal(job.status, 'ready', `${job.error || 'Timed out'}\n${application.logs()}`);

    const download = await fetch(`${application.baseUrl}/api/jobs/${created.id}/download`);
    const output = Buffer.from(await download.arrayBuffer());
    assert.equal(download.status, 200);
    assert.match(download.headers.get('content-type') || '', /^audio\/mpeg/);
    assert.ok(output.length > 1_000);

    const partial = await fetch(`${application.baseUrl}/api/jobs/${created.id}/download`, {
      headers: { range: 'bytes=0-127' }
    });
    assert.equal(partial.status, 206);
    assert.equal((await partial.arrayBuffer()).byteLength, 128);

    const remove = await fetch(`${application.baseUrl}/api/jobs/${created.id}`, { method: 'DELETE' });
    assert.equal(remove.status, 200);
  } finally {
    await application.close();
  }
});

test('two trimmed audio sources can be joined and exported with an allowlisted codec', { timeout: 45_000 }, async () => {
  const persistentDirectory = await mkdtemp(join(tmpdir(), 'vdownloader-audio-join-restart-'));
  let application = await startIsolatedApplication({ jobDirectory: persistentDirectory });
  try {
    const first = createSineWave({ durationSeconds: 2, frequency: 330 });
    const second = createSineWave({ durationSeconds: 2, frequency: 660 });
    const envelope = {
      version: 1,
      outputFormat: 'wav',
      audioCodec: 'pcm-s16le',
      bitrate: 192,
      sources: [
        { name: 'first.wav', type: 'audio/wav', size: first.length, duration: 2, start: 0.1, end: 1.3 },
        { name: 'second.wav', type: 'audio/wav', size: second.length, duration: 2, start: 0.2, end: 1.4 }
      ]
    };
    const metadata = Buffer.from(JSON.stringify(envelope));
    const prefix = Buffer.alloc(4);
    prefix.writeUInt32BE(metadata.length, 0);
    const body = Buffer.concat([prefix, metadata, first, second]);
    const upload = await fetch(`${application.baseUrl}/api/audio-join-jobs`, {
      method: 'POST',
      headers: {
        'content-type': 'application/vnd.vdownloader.audio-join',
        'content-length': String(body.length),
        'x-vdownloader-audio-join': '1'
      },
      body
    });
    const created = await upload.json();
    assert.equal(upload.status, 202, JSON.stringify(created));
    assert.equal(created.mediaKind, 'audio');
    assert.equal(created.outputFormat, 'wav');
    assert.equal(created.audioCodec, 'pcm-s16le');

    let job = created;
    const deadline = Date.now() + 20_000;
    while (!['ready', 'error', 'cancelled'].includes(job.status) && Date.now() < deadline) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 150));
      const response = await fetch(`${application.baseUrl}/api/jobs/${created.id}`);
      assert.equal(response.status, 200);
      job = await response.json();
    }
    assert.equal(job.status, 'ready', `${job.error || 'Timed out'}\n${application.logs()}`);

    const download = await fetch(`${application.baseUrl}/api/jobs/${created.id}/download`);
    const output = Buffer.from(await download.arrayBuffer());
    assert.equal(download.status, 200);
    assert.match(download.headers.get('content-type') || '', /^audio\/wav/);
    assert.ok(output.length > 100_000, 'joined WAV should contain both selected ranges');

    // Persist the joined source order, restart the complete Node process, and
    // prove that an administrative restart can run the same job again.
    await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    await application.close();
    application = await startIsolatedApplication({ jobDirectory: persistentDirectory });
    const restored = await (await fetch(`${application.baseUrl}/api/jobs/${created.id}`)).json();
    assert.equal(restored.status, 'ready');
    const restart = await fetch(`${application.baseUrl}/api/jobs/${created.id}/restart`, {
      method: 'POST',
      headers: { 'x-vdownloader-admin': '1' }
    });
    assert.equal(restart.status, 202);
    let restarted = await restart.json();
    const restartDeadline = Date.now() + 20_000;
    while (!['ready', 'error', 'cancelled'].includes(restarted.status) && Date.now() < restartDeadline) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 150));
      restarted = await (await fetch(`${application.baseUrl}/api/jobs/${created.id}`)).json();
    }
    assert.equal(restarted.status, 'ready', `${restarted.error || 'Timed out after restart'}\n${application.logs()}`);
  } finally {
    await application.close();
    await rm(persistentDirectory, { recursive: true, force: true });
  }
});

test('a local video can change container and codecs to WebM VP9/Opus', { timeout: 60_000 }, async () => {
  const application = await startIsolatedApplication();
  const fixtureDirectory = await mkdtemp(join(tmpdir(), 'vdownloader-video-e2e-'));
  try {
    const source = await createSyntheticVideo(fixtureDirectory);
    const upload = await fetch(`${application.baseUrl}/api/upload-jobs`, {
      method: 'POST',
      headers: {
        'content-type': 'video/mp4',
        'content-length': String(source.bytes.length),
        'x-vdownloader-upload': '1',
        'x-upload-name': encodeURIComponent('source.mp4'),
        'x-upload-duration': '2',
        'x-upload-start': '0.25',
        'x-upload-end': '1.5',
        'x-video-format': 'webm',
        'x-video-codec': 'vp9',
        'x-video-audio-codec': 'opus'
      },
      body: source.bytes
    });
    const created = await upload.json();
    assert.equal(upload.status, 202, JSON.stringify(created));
    assert.equal(created.outputFormat, 'webm');
    assert.equal(created.videoCodec, 'vp9');
    assert.equal(created.audioCodec, 'opus');

    let job = created;
    const deadline = Date.now() + 40_000;
    while (!['ready', 'error', 'cancelled'].includes(job.status) && Date.now() < deadline) {
      await new Promise((resolveWait) => setTimeout(resolveWait, 200));
      job = await (await fetch(`${application.baseUrl}/api/jobs/${created.id}`)).json();
    }
    assert.equal(job.status, 'ready', `${job.error || 'Timed out'}\n${application.logs()}`);
    const download = await fetch(`${application.baseUrl}/api/jobs/${created.id}/download`);
    assert.equal(download.status, 200);
    assert.match(download.headers.get('content-type') || '', /^video\/webm/);
    assert.ok((await download.arrayBuffer()).byteLength > 2_000);
  } finally {
    await application.close();
    await rm(fixtureDirectory, { recursive: true, force: true });
  }
});
