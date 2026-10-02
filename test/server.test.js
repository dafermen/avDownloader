import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildIdentityFilterGraph,
  createOpaqueAnalysis,
  isLoopbackAddress,
  normalizeClipRange,
  normalizeIdentityProtection,
  normalizeUploadMetadata,
  normalizeVideoUrl,
  parseHlsManifest,
  parsePornhubPage,
  parseVideoPage,
  parseXnxxPage,
  prepareJobForRestart,
  server
} from '../server.js';
import { getYtDlpStatus, parseYoutubeInfo } from '../providers/youtube.js';
import { hasTranslation, resolveLanguage, translate } from '../public/i18n.js';

test('keeps every visible interface key available in Spanish and English', async () => {
  assert.equal(resolveLanguage('en'), 'en');
  assert.equal(resolveLanguage('es'), 'es');
  assert.equal(resolveLanguage('unknown'), 'es');
  assert.equal(translate('quality.prepare', { quality: '1080p' }, 'en'), 'Prepare 1080p');
  assert.equal(translate('quality.prepare', { quality: '1080p' }, 'es'), 'Preparar 1080p');

  const [html, app] = await Promise.all([
    readFile(new URL('../public/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../public/app.js', import.meta.url), 'utf8')
  ]);
  const staticKeys = [...html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)]
    .map((match) => match[1]);
  const dynamicKeys = [...app.matchAll(/\bt\('([^']+)'/g)]
    .map((match) => match[1]);
  const keys = new Set([...staticKeys, ...dynamicKeys]);
  assert.ok(keys.size > 100);
  for (const key of keys) {
    assert.equal(hasTranslation(key, 'es'), true, `Missing Spanish translation: ${key}`);
    assert.equal(hasTranslation(key, 'en'), true, `Missing English translation: ${key}`);
  }
});

test('acepta una URL válida de video', () => {
  assert.equal(normalizeVideoUrl('https://www.xvideos.com/video.abc123/demo').hostname, 'www.xvideos.com');
  assert.equal(normalizeVideoUrl('https://es.pornhub.com/view_video.php?viewkey=abc123').hostname, 'es.pornhub.com');
  assert.equal(normalizeVideoUrl('https://www.xnxx.com/video-abc123/demo').hostname, 'www.xnxx.com');
  assert.equal(normalizeVideoUrl('https://www.youtube.com/watch?v=BaW_jenozKc').hostname, 'www.youtube.com');
  assert.equal(normalizeVideoUrl('https://youtu.be/BaW_jenozKc').hostname, 'youtu.be');
});

test('rechaza dominios externos y rutas que no son videos', () => {
  assert.throws(() => normalizeVideoUrl('https://example.com/video.abc/demo'));
  assert.throws(() => normalizeVideoUrl('https://www.xvideos.com/'));
  assert.throws(() => normalizeVideoUrl('https://es.pornhub.com/view_video.php'));
  assert.throws(() => normalizeVideoUrl('https://www.xnxx.com/search/demo'));
  assert.throws(() => normalizeVideoUrl('https://www.youtube.com/playlist?list=abc123'));
});

test('combina formatos adaptativos de YouTube con audio M4A', () => {
  const info = {
    title: 'Video de prueba',
    thumbnail: 'https://i.ytimg.com/example.jpg',
    duration: 60,
    formats: [
      { height: 360, ext: 'mp4', vcodec: 'avc1.42001E', acodec: 'mp4a.40.2', tbr: 500, filesize: 3_000_000, url: 'https://r1.googlevideo.com/combined.mp4' },
      { height: 1080, ext: 'mp4', vcodec: 'avc1.640028', acodec: 'none', tbr: 2000, filesizeApprox: 15_000_000, url: 'https://r1.googlevideo.com/video.mp4' },
      { ext: 'm4a', vcodec: 'none', acodec: 'mp4a.40.2', abr: 128, filesizeApprox: 1_000_000, url: 'https://r1.googlevideo.com/audio.m4a' },
      { height: 2160, ext: 'webm', vcodec: 'vp9', acodec: 'none', url: 'https://r1.googlevideo.com/incompatible.webm' },
      { height: 720, ext: 'mp4', vcodec: 'avc1.64001F', acodec: 'none', url: 'https://example.com/untrusted.mp4' }
    ]
  };
  assert.deepEqual(parseYoutubeInfo(info), {
    provider: 'youtube',
    title: 'Video de prueba',
    thumbnail: 'https://i.ytimg.com/example.jpg',
    duration: 60,
    qualities: [
      { label: '1080p', url: 'https://r1.googlevideo.com/video.mp4', type: 'mp4', audioUrl: 'https://r1.googlevideo.com/audio.m4a', estimatedSize: 16_000_000 },
      { label: '360p', url: 'https://r1.googlevideo.com/combined.mp4', type: 'mp4', estimatedSize: 3_000_000 }
    ],
    hlsUrl: null
  });
});

test('encuentra el ejecutable local y multiplataforma de yt-dlp', async () => {
  const status = await getYtDlpStatus();
  assert.equal(status.available, true);
  assert.match(status.version, /^\d{4}\.\d{2}\.\d{2}/);
});

test('oculta las URLs firmadas detrás de referencias opacas', () => {
  const publicVideo = createOpaqueAnalysis({
    provider: 'youtube',
    title: 'Prueba opaca',
    thumbnail: null,
    duration: 30,
    sourceUrl: 'https://www.youtube.com/watch?v=BaW_jenozKc',
    qualities: [{
      label: '1080p',
      type: 'mp4',
      url: 'https://r1.googlevideo.com/signed-video?token=secret',
      audioUrl: 'https://r1.googlevideo.com/signed-audio?token=secret',
      estimatedSize: 1234
    }]
  });
  assert.match(publicVideo.qualities[0].selectionId, /^[a-f0-9-]{36}$/i);
  assert.match(publicVideo.qualities[0].previewUrl, /^\/api\/media\/[a-f0-9-]{36}$/i);
  assert.equal(publicVideo.qualities[0].adaptive, true);
  assert.equal(JSON.stringify(publicVideo).includes('googlevideo.com'), false);
  assert.equal('url' in publicVideo.qualities[0], false);
  assert.equal('audioUrl' in publicVideo.qualities[0], false);
});

test('extrae MP4 y HLS públicos de XNXX', () => {
  const html = `
    <meta property="og:duration" content="120">
    html5player.setVideoTitle('Video &amp; XNXX')
    html5player.setThumbUrl169('https://thumb-cdn77.xnxx-cdn.com/thumb.jpg')
    html5player.setVideoUrlLow('https://mp4-cdn77.xnxx-cdn.com/240.mp4')
    html5player.setVideoUrlHigh('https://mp4-cdn77.xnxx-cdn.com/360.mp4')
    html5player.setVideoHLS('https://hls-cdn77.xnxx-cdn.com/master.m3u8')`;
  assert.deepEqual(parseXnxxPage(html), {
    provider: 'xnxx',
    title: 'Video & XNXX',
    thumbnail: 'https://thumb-cdn77.xnxx-cdn.com/thumb.jpg',
    duration: 120,
    qualities: [
      { label: '240p', url: 'https://mp4-cdn77.xnxx-cdn.com/240.mp4', type: 'mp4' },
      { label: '360p', url: 'https://mp4-cdn77.xnxx-cdn.com/360.mp4', type: 'mp4' }
    ],
    hlsUrl: 'https://hls-cdn77.xnxx-cdn.com/master.m3u8'
  });
});

test('extrae título, miniatura y calidades sin duplicados', () => {
  const html = `
    html5player.setVideoTitle('Video &amp; prueba')
    html5player.setThumbUrl169('https://thumb.example/thumb.jpg')
    html5player.setVideoUrlLow('https://cdn.example/240.mp4')
    html5player.setVideoUrlHigh('https://cdn.example/360.mp4')
    html5player.setVideoUrlHD('https://cdn.example/720.mp4')`;
  assert.deepEqual(parseVideoPage(html), {
    provider: 'xvideos',
    title: 'Video & prueba',
    thumbnail: 'https://thumb.example/thumb.jpg',
    duration: null,
    qualities: [
      { label: '240p', url: 'https://cdn.example/240.mp4', type: 'mp4' },
      { label: '360p', url: 'https://cdn.example/360.mp4', type: 'mp4' },
      { label: '720p', url: 'https://cdn.example/720.mp4', type: 'mp4' }
    ],
    hlsUrl: null
  });
});

test('extrae las calidades HLS públicas de Pornhub', () => {
  const flashvars = {
    video_title: 'Video &amp; prueba',
    video_duration: 918,
    image_url: 'https://ei.phncdn.com/thumb.jpg',
    mediaDefinitions: [
      { height: 720, width: 1280, format: 'hls', videoUrl: 'https://iv-h.phncdn.com/token/720/master.m3u8' },
      { height: 480, width: 854, format: 'hls', videoUrl: 'https://iv-h.phncdn.com/token/480/master.m3u8' },
      { height: 720, width: 1280, format: 'hls', videoUrl: 'https://iv-h.phncdn.com/token/duplicate.m3u8' },
      { height: 1080, format: 'mp4', videoUrl: 'https://es.pornhub.com/video/get_media' }
    ]
  };
  const html = `var flashvars_123 = ${JSON.stringify(flashvars)};\nvar next = true;`;
  assert.deepEqual(parsePornhubPage(html), {
    provider: 'pornhub',
    title: 'Video & prueba',
    thumbnail: 'https://ei.phncdn.com/thumb.jpg',
    duration: 918,
    qualities: [
      { label: '720p', url: 'https://iv-h.phncdn.com/token/720/master.m3u8', type: 'hls' },
      { label: '480p', url: 'https://iv-h.phncdn.com/token/480/master.m3u8', type: 'hls' }
    ],
    hlsUrl: null
  });
});

test('valida intervalos de recorte', () => {
  assert.deepEqual(normalizeClipRange('90', '150.5'), { start: 90, end: 150.5, duration: 60.5 });
  assert.equal(normalizeClipRange(null, null), null);
  assert.throws(() => normalizeClipRange('50', '40'));
  assert.throws(() => normalizeClipRange('-1', '40'));
});

test('valida metadatos de una carga local y calcula el recorte', () => {
  const metadata = normalizeUploadMetadata({
    fileName: encodeURIComponent('Mi vídeo.mp4'),
    contentType: 'video/mp4',
    contentLength: 10_000_000,
    duration: 100,
    start: 10,
    end: 30
  });
  assert.equal(metadata.fileName, 'Mi vídeo.mp4');
  assert.equal(metadata.title, 'Mi-video');
  assert.equal(metadata.extension, '.mp4');
  assert.equal(metadata.outputFormat, 'mp4');
  assert.equal(metadata.videoCodec, 'h264');
  assert.equal(metadata.audioCodec, 'aac');
  assert.deepEqual(metadata.clip, { start: 10, end: 30, duration: 20 });
  assert.equal(metadata.estimatedSize, 2_300_000);
  assert.throws(() => normalizeUploadMetadata({
    fileName: 'video.mp4',
    contentType: 'video/webm',
    contentLength: 100,
    duration: 10,
    start: 0,
    end: 5
  }), /tipo.+no coincide/i);
  assert.throws(() => normalizeUploadMetadata({
    fileName: 'video.exe',
    contentType: 'application/octet-stream',
    contentLength: 100,
    duration: 10,
    start: 0,
    end: 5
  }), /MP4.+WebM/i);
  const webm = normalizeUploadMetadata({
    fileName: 'source.mov', contentType: 'video/quicktime', contentLength: 1000,
    duration: 10, start: 1, end: 5, outputFormat: 'webm', videoCodec: 'vp9', audioCodec: 'opus'
  });
  assert.equal(webm.outputExtension, '.webm');
  assert.equal(webm.outputContentType, 'video/webm');
  assert.equal(webm.videoCodec, 'vp9');
  assert.throws(() => normalizeUploadMetadata({
    fileName: 'source.mov', contentType: 'video/quicktime', contentLength: 1000,
    duration: 10, start: 1, end: 5, outputFormat: 'webm', videoCodec: 'h264', audioCodec: 'aac'
  }), /códec de video.+no es compatible/i);
});

test('valida y limita el seguimiento de protección de identidad', () => {
  const protection = normalizeIdentityProtection({
    method: 'pixelate',
    blockSize: 20,
    frames: [
      { time: 0, boxes: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }] },
      { time: 1, boxes: [{ x: 0.2, y: 0.2, width: 0.3, height: 0.4 }] }
    ]
  }, 2);
  assert.equal(protection.method, 'pixelate');
  assert.equal(protection.blockSize, 20);
  assert.deepEqual(protection.frames[0], {
    start: 0,
    end: 1,
    boxes: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }]
  });
  assert.equal(protection.frames[1].end, 2);
  assert.throws(() => normalizeIdentityProtection({
    method: 'pixelate',
    frames: [{ time: 0, boxes: [{ x: 0.9, y: 0, width: 0.2, height: 0.2 }] }]
  }, 2), /fuera de los límites/i);
  assert.throws(() => normalizeIdentityProtection({
    method: 'pixelate',
    frames: [{ time: 0, boxes: [] }]
  }, 2), /No se detectaron rostros/i);
  const denseFrames = Array.from({ length: 301 }, (_, time) => ({
    time,
    boxes: time === 0 ? [{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }] : []
  }));
  assert.equal(normalizeIdentityProtection({
    method: 'pixelate',
    frames: denseFrames
  }, 301).frames.length, 301);
  assert.throws(() => normalizeIdentityProtection({
    method: 'pixelate',
    frames: Array.from({ length: 901 }, (_, time) => ({
      time,
      boxes: time === 0 ? [{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }] : []
    }))
  }, 901), /900 muestras/i);
});

test('construye una máscara FFmpeg temporal sin pixelar el cuadro completo', () => {
  const graph = buildIdentityFilterGraph({
    blockSize: 24,
    frames: [{
      start: 0,
      end: 1.5,
      boxes: [{ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }]
    }]
  });
  assert.match(graph, /pixelize=width=24:height=24/);
  assert.match(graph, /drawbox=.*between\(t,0,1\.5\)/);
  assert.match(graph, /\[identity_base\]\[identity_pixel\]\[identity_mask_1\]maskedmerge\[identity_output\]/);
  assert.equal(buildIdentityFilterGraph(null), null);
});

test('reinicia una tarea conservando origen, calidad y recorte', () => {
  const job = {
    id: 'job-test',
    sourceUrl: 'https://www.youtube.com/watch?v=BaW_jenozKc',
    providerId: 'youtube',
    quality: '1080p',
    clip: { start: 10, end: 25, duration: 15 },
    identityProtection: {
      method: 'pixelate',
      blockSize: 20,
      frames: [{ start: 0, end: 15, boxes: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }] }]
    },
    filename: 'video-1080p-10-25.mp4',
    mediaUrl: 'https://r1.googlevideo.com/old-video',
    audioUrl: 'https://r1.googlevideo.com/old-audio',
    status: 'error',
    progress: 83,
    size: 1234,
    error: 'fallo anterior',
    attempts: 3,
    etaSeconds: 12,
    completedAt: 100,
    restartCount: 1,
    cancelRequested: true,
    restartRequested: true
  };
  prepareJobForRestart(job, 200);
  assert.equal(job.status, 'queued');
  assert.equal(job.needsRefresh, true);
  assert.equal(job.mediaUrl, null);
  assert.equal(job.audioUrl, null);
  assert.equal(job.progress, 0);
  assert.equal(job.error, null);
  assert.equal(job.restartCount, 2);
  assert.equal(job.lastRestartedAt, 200);
  assert.equal(job.sourceUrl, 'https://www.youtube.com/watch?v=BaW_jenozKc');
  assert.equal(job.quality, '1080p');
  assert.deepEqual(job.clip, { start: 10, end: 25, duration: 15 });
  assert.equal(job.identityProtection.method, 'pixelate');
});

test('limita la administración sin token a direcciones loopback', () => {
  assert.equal(isLoopbackAddress('127.0.0.1'), true);
  assert.equal(isLoopbackAddress('::1'), true);
  assert.equal(isLoopbackAddress('::ffff:127.0.0.1'), true);
  assert.equal(isLoopbackAddress('192.168.1.25'), false);
  assert.equal(isLoopbackAddress('203.0.113.8'), false);
});

test('expone el reinicio administrativo local sin revelar tareas inexistentes', async () => {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address();
    const url = `http://127.0.0.1:${address.port}/api/jobs/00000000-0000-4000-8000-000000000000/restart`;
    const untrustedResponse = await fetch(url, { method: 'POST' });
    assert.equal(untrustedResponse.status, 403);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'x-vdownloader-admin': '1' }
    });
    const body = await response.json();
    assert.equal(response.status, 404);
    assert.match(body.error, /no existe|caduc/i);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('protege la carga local contra solicitudes simples de otro origen', async () => {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/upload-jobs`, {
      method: 'POST',
      headers: { 'content-type': 'video/mp4' },
      body: new Uint8Array([0])
    });
    assert.equal(response.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('protege el registro facial contra solicitudes simples de otro origen', async () => {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  try {
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/identity-tracks`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        method: 'pixelate',
        duration: 2,
        frames: [{ time: 0, boxes: [{ x: 0.1, y: 0.1, width: 0.2, height: 0.2 }] }]
      })
    });
    assert.equal(response.status, 403);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('extrae variantes y resuelve rutas relativas de un manifiesto HLS', () => {
  const manifest = `#EXTM3U
#EXT-X-STREAM-INF:BANDWIDTH=1000,RESOLUTION=1280x720,NAME="720p"
hls-720p.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2000,RESOLUTION=1920x1080
/video/hls-1080p.m3u8`;
  assert.deepEqual(parseHlsManifest(manifest, 'https://hls.example/token/master.m3u8'), [
    { label: '720p', url: 'https://hls.example/token/hls-720p.m3u8', type: 'hls', bandwidth: 1000 },
    { label: '1080p', url: 'https://hls.example/video/hls-1080p.m3u8', type: 'hls', bandwidth: 2000 }
  ]);
});
