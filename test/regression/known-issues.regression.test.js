import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createOpaqueAnalysis } from '../../server.js';
import { parseYoutubeInfo } from '../../providers/youtube.js';

test('signed media URLs never regress into the browser-facing analysis', () => {
  const analysis = createOpaqueAnalysis({
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=BaW_jenozKc',
    title: 'Regression fixture',
    duration: 10,
    thumbnail: null,
    qualities: [{
      label: '1080p',
      type: 'mp4',
      url: 'https://r1.googlevideo.com/video?token=secret',
      audioUrl: 'https://r1.googlevideo.com/audio?token=secret'
    }]
  });
  const serialized = JSON.stringify(analysis);
  assert.equal(serialized.includes('googlevideo.com'), false);
  assert.equal(serialized.includes('secret'), false);
  assert.match(analysis.qualities[0].selectionId, /^[a-f0-9-]{36}$/i);
});

test('adaptive MP4 video keeps a compatible audio track', () => {
  const analysis = parseYoutubeInfo({
    title: 'Adaptive fixture',
    duration: 10,
    formats: [
      {
        format_id: '137',
        height: 1080,
        ext: 'mp4',
        vcodec: 'avc1.640028',
        acodec: 'none',
        url: 'https://r1.googlevideo.com/video.mp4'
      },
      {
        format_id: '140',
        ext: 'm4a',
        vcodec: 'none',
        acodec: 'mp4a.40.2',
        abr: 128,
        url: 'https://r1.googlevideo.com/audio.m4a'
      }
    ]
  });
  assert.equal(analysis.qualities[0].audioUrl, 'https://r1.googlevideo.com/audio.m4a');
});

test('browser polling stays below the API budget and treats HTTP 429 as temporary', async () => {
  const source = await readFile(new URL('../../public/app.js', import.meta.url), 'utf8');
  assert.match(source, /const JOB_POLL_INTERVAL_MS = 1_500;/);
  assert.match(source, /const PANEL_POLL_INTERVAL_MS = 5_000;/);
  assert.match(source, /if \(response\.status === 429\)/);
  assert.match(source, /retryAfterMilliseconds\(response\)/);
  assert.match(source, /downloadsPanelRefreshPromise/);
  assert.doesNotMatch(source, /setInterval\(refreshDownloadsPanel, 1500\)/);
});

test('remote download buttons authorize streaming without buffering the complete file', async () => {
  const source = await readFile(new URL('../../public/app.js', import.meta.url), 'utf8');
  assert.match(source, /\/api\/jobs\/\$\{job\.id\}\/download-access/);
  assert.match(source, /'x-vdownloader-download': '1'/);
  assert.match(source, /configureDownloadLink\(download, job, detail\)/);
  assert.match(source, /configureDownloadLink\(link, entry\)/);
  assert.match(source, /configureDownloadLink\(download, job\)/);
  assert.doesNotMatch(source, /URL\.createObjectURL\(await response\.blob\(\)\)/);
});

test('subtitle feedback clears without deleting the persistent download job', async () => {
  const source = await readFile(new URL('../../public/app.js', import.meta.url), 'utf8');
  assert.match(source, /const SUBTITLE_NOTICE_DISMISS_MS = 8_000;/);
  assert.match(source, /const SUBTITLE_RESULT_DISMISS_MS = 3_000;/);
  assert.match(source, /vdownloader:download-started/);
  assert.match(source, /dismissInlineSubtitleResult\(card\)/);
  assert.doesNotMatch(source, /dismissInlineSubtitleResult[\s\S]{0,600}apiFetch\([^\n]+DELETE/);
});

test('local media tools keep one clear entry point per workflow', async () => {
  const [html, source] = await Promise.all([
    readFile(new URL('../../public/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../public/app.js', import.meta.url), 'utf8')
  ]);
  assert.equal((html.match(/data-local-tool="video"/g) || []).length, 1);
  assert.equal((html.match(/data-local-tool="extract"/g) || []).length, 1);
  assert.equal((html.match(/data-local-tool="audio"/g) || []).length, 1);
  assert.doesNotMatch(html, /id="extract-audio-from-video"/);
  assert.match(source, /xhr\.open\('POST', '\/api\/video-audio-jobs'\)/);
  assert.match(source, /xhr\.open\('POST', '\/api\/audio-jobs'\)/);
  assert.match(source, /xhr\.open\('POST', '\/api\/audio-join-jobs'\)/);
});


test('remote preview gets real upload limits without granting native API access', async () => {
  const { spawnSync } = await import('node:child_process');
  for (const mode of ['true', 'false']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import {server} from './server.js';
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const base = 'http://127.0.0.1:' + server.address().port;
      const headers = {'x-forwarded-proto':'https','x-forwarded-for':'198.51.100.44'};
      try {
        const response = await fetch(base+'/api/upload-config', {headers});
        assert.equal(response.status,200);
        assert.equal(response.headers.get('cache-control'),'no-store');
        assert.deepEqual(await response.json(), {
          limitEnabled: ${mode}, maxBytes: ${mode} ? 6*1024**3 : null,
          effectiveMaxBytes: (${mode} ? 6 : 12)*1024**3
        });
        for (const path of ['/api/health','/api/jobs','/api/admin/audit']) {
          assert.equal((await fetch(base+path,{headers})).status,401);
        }
        for (const path of ['/api/upload-jobs','/api/audio-jobs','/api/audio-join-jobs','/api/upload-config']) {
          assert.equal((await fetch(base+path,{headers,method:'POST',body:'x'})).status,401);
        }
        assert.equal((await fetch(base+'/api/upload-config')).status,426);
      } finally { await new Promise(resolve=>server.close(resolve)); }
    `], {cwd:new URL('../../',import.meta.url), encoding:'utf8', timeout:20000,
      env:{...process.env,MAX_UPLOAD_GB:'6',MAX_STORAGE_GB:'12',UPLOAD_LIMIT_ENABLED:mode,
        REMOTE_ACCESS_ENABLED:'true',TRUSTED_HTTPS_PROXY:'true',
        ACCESS_TOKENS_JSON:JSON.stringify([{id:'regression',role:'user',token:'synthetic-test-only-credential-123456789'}])}});
    assert.equal(result.status,0,result.stderr);
  }
});

test('preview settings wait for the server and recover after a failed request', async () => {
  const {runInNewContext} = await import('node:vm');
  const source = await readFile(new URL('../../public/app.js', import.meta.url),'utf8');
  const fn = source.slice(source.indexOf('async function refreshUploadSettings()'),source.indexOf('/** Carga una vista previa local'));
  let calls=0;
  const context={AbortSignal, apiRetryAt:0, recordApiRetry:()=>{}, t:key=>key, fetch:async () => {
    calls++;
    if(calls===1) throw new Error('offline');
    return {ok:true,json:async()=>({effectiveMaxBytes:6*1024**3})};
  }};
  runInNewContext('let maxUploadBytes=null; let uploadSettingsPromise=null;'+fn+';this.refresh=refreshUploadSettings;this.limit=()=>maxUploadBytes;',context);
  await assert.rejects(context.refresh(),/offline/);
  assert.equal(context.limit(),null);
  await Promise.all([context.refresh(),context.refresh()]);
  assert.equal(calls,2);
  assert.equal(context.limit(),6*1024**3);
});



test('authentication cooldown reports its full remaining duration and still blocks valid tokens', async () => {
  const {spawnSync} = await import('node:child_process');
  const result=spawnSync(process.execPath,['--input-type=module','-e',`
    import assert from 'node:assert/strict';
    import {server} from './server.js';
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const base='http://127.0.0.1:'+server.address().port;
    const headers={'x-forwarded-proto':'https','x-forwarded-for':'198.51.100.70',authorization:'Bearer wrong-fixture'};
    try {
      for(let i=0;i<5;i++) assert.equal((await fetch(base+'/api/health',{headers})).status,401);
      headers.authorization='Bearer synthetic-cooldown-token-123456789';
      const blocked=await fetch(base+'/api/health',{headers});
      assert.equal(blocked.status,429);
      const wait=Number(blocked.headers.get('retry-after'));
      assert.ok(wait>800&&wait<=900);
      assert.equal((await fetch(base+'/api/upload-config',{headers})).status,429);
    } finally { await new Promise(r=>server.close(r)); }
  `],{cwd:new URL('../../',import.meta.url),encoding:'utf8',timeout:20000,
    env:{...process.env,REMOTE_ACCESS_ENABLED:'true',TRUSTED_HTTPS_PROXY:'true',ACCESS_TOKENS_JSON:JSON.stringify([{id:'cooldown',role:'user',token:'synthetic-cooldown-token-123456789'}])}});
  assert.equal(result.status,0,result.stderr);
});
