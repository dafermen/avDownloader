import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { hasTranslation } from '../../public/i18n.js';

test('the primary user journey is present in both interface languages', async () => {
  const [html, app, documentation] = await Promise.all([
    readFile(new URL('../../public/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../public/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../../public/docs.html', import.meta.url), 'utf8')
  ]);

  const visibleKeys = new Set([
    ...[...html.matchAll(/data-i18n(?:-placeholder|-aria)?="([^"]+)"/g)].map((match) => match[1]),
    ...[...app.matchAll(/\bt\('([^']+)'/g)].map((match) => match[1])
  ]);
  for (const key of visibleKeys) {
    assert.equal(hasTranslation(key, 'es'), true, `Missing Spanish visible key: ${key}`);
    assert.equal(hasTranslation(key, 'en'), true, `Missing English visible key: ${key}`);
  }

  for (const key of [
    'search.action',
    'guided.title',
    'guided.video',
    'guided.audio',
    'guided.subtitle',
    'guided.identity',
    'batch.toggle',
    'batch.complete',
    'remote.chooseResult',
    'remote.createVideo',
    'preset.recommended',
    'preset.recommendedAudio',
    'actions.createAnother',
    'job.stage.downloading',
    'tools.video.title',
    'tools.extract.title',
    'tools.audio.title',
    'tools.subtitle.title',
    'tools.step.process',
    'local.videoSelect',
    'local.createVideo',
    'local.selectBeforeExport',
    'video.exportMode',
    'video.extractAudio',
    'video.extractButton',
    'audio.videoRedirect',
    'youtube.audio.title',
    'youtube.audio.export',
    'audio.mixedVideoSelection',
    'audio.select',
    'audio.create',
    'summary.template',
    'subtitle.export',
    'subtitle.modeGenerate',
    'subtitle.modeCompose',
    'subtitle.composeSelectable',
    'subtitle.composeBurned',
    'subtitle.translateEnEs',
    'subtitle.selectMedia',
    'subtitle.videoRequired',
    'subtitle.unsupportedMedia',
    'subtitle.transcriptionLanguage',
    'subtitle.notFound',
    'audio.selectBeforeExport',
    'audio.codec',
    'video.videoCodec',
    'downloads.title',
    'notifications.desktop',
    'diagnostics.download',
    'resume.preserved',
    'estimate.size',
    'nav.docs'
  ]) {
    assert.equal(hasTranslation(key, 'es'), true, `Missing Spanish acceptance key: ${key}`);
    assert.equal(hasTranslation(key, 'en'), true, `Missing English acceptance key: ${key}`);
  }
  assert.match(html, /href="\/docs\.html"/);
  assert.match(html, /class="guided-flow"/);
  assert.match(html, /id="batch-mode"/);
  assert.match(html, /id="video-urls"/);
  assert.match(app, /\/api\/analyze/);
  assert.match(app, /\/api\/upload-jobs/);
  assert.match(app, /\/api\/video-audio-jobs/);
  assert.match(app, /\/api\/remote-audio-jobs/);
  assert.match(app, /function createRemoteSubtitleControls\(video, jobsArea\)/);
  assert.match(app, /className = 'quality-presets'/);
  assert.match(app, /className = 'job-stage-rail'/);
  assert.match(app, /\/api\/audio-jobs/);
  assert.match(app, /\/api\/audio-join-jobs/);
  assert.match(app, /\/api\/subtitle-jobs/);
  assert.match(app, /\/api\/subtitle-upload-jobs/);
  assert.match(app, /\/api\/transcription-jobs/);
  assert.match(app, /\/api\/subtitle-compose-jobs/);
  assert.match(app, /\/api\/subtitle-translate/);
  assert.match(app, /\/api\/diagnostics/);
  assert.match(html, /id="local-audio-file"/);
  assert.match(html, /id="local-tool-video"[^>]+data-local-tool="video"/);
  assert.match(html, /id="local-tool-extract"[^>]+data-local-tool="extract"/);
  assert.match(html, /id="local-tool-audio"[^>]+data-local-tool="audio"/);
  assert.match(html, /id="local-tool-subtitle"[^>]+data-local-tool="subtitle"/);
  assert.match(html, /id="local-video-tool-card"/);
  assert.match(html, /id="local-audio-tool-card"[^>]+hidden/);
  assert.match(html, /id="subtitle-tool-card"[^>]+hidden/);
  assert.match(html, /id="subtitle-track"/);
  assert.match(html, /id="subtitle-video-file"/);
  assert.match(html, /id="subtitle-video-file"[^>]+accept="[^"]*\.mp4/);
  assert.match(html, /id="subtitle-audio-preview"/);
  assert.match(html, /id="subtitle-mode-generate"/);
  assert.match(html, /id="subtitle-mode-compose"/);
  assert.match(html, /id="subtitle-cue-list"/);
  assert.match(html, /id="subtitle-compose-selectable"/);
  assert.match(html, /id="subtitle-compose-burned"/);
  assert.match(html, /id="notification-enabled"/);
  assert.match(html, /id="download-diagnostics"/);
  assert.ok(
    html.indexOf('id="subtitle-mode-generate"') < html.indexOf('id="subtitle-video-file"'),
    'The generation method must be chosen before the local media picker'
  );
  assert.match(app, /SUBTITLE_AUDIO_EXTENSIONS = new Set\(\['\.mp3'.+'\.opus'\]\)/);
  assert.match(html, /id="subtitle-transcription-language"/);
  assert.match(html, /id="local-export-summary"/);
  assert.match(html, /id="audio-export-summary"/);
  assert.doesNotMatch(html, /id="extract-audio-from-video"/);
  assert.match(html, /id="audio-output-format"/);
  assert.match(html, /id="audio-output-codec"/);
  assert.match(html, /id="audio-source-list"/);
  assert.match(html, /id="video-output-codec"/);
  assert.match(html, /id="local-export-mode"/);
  assert.match(html, /id="video-audio-output-format"/);
  assert.match(html, /id="video-audio-output-codec"/);
  assert.match(html, /id="video-audio-output-bitrate"/);
  assert.match(app, /function selectLocalTool\(tool/);
  assert.match(app, /localExportMode\.value = extracting \? 'audio' : 'video'/);
  assert.match(app, /function updateLocalExportSummary\(\)/);
  assert.match(app, /function updateAudioExportSummary\(\)/);
  assert.doesNotMatch(app, /function chooseVideoForAudioExtraction\(\)/);
  assert.match(app, /await loadSelectedLocalVideo\(videoFiles\[0\]\)/);
  assert.match(app, /addEventListener\('change', \(\) => loadSelectedLocalVideo\(\)\)/);
  assert.doesNotMatch(app, /localVideoFile\.click\(\)/);
  assert.match(app, /localVideoFile\.value = ''/);
  assert.match(html, /id="identity-edit"/);
  assert.match(html, /id="identity-add"/);
  assert.match(html, /id="identity-reviewed"/);
  assert.match(html, /id="admin-restart-selected"/);
  assert.match(html, /id="admin-clean-expired"/);
  assert.match(documentation, /Deployment quality gate/i);
});
