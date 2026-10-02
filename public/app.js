import { FaceDetector, FilesetResolver } from '/vendor/mediapipe/vision_bundle.mjs';
import {
  apiError,
  getLanguage,
  initializeI18n,
  localizeBackendLabel,
  t
} from '/i18n.js?v=3';

initializeI18n();

// Referencias estables a la interfaz. Se consultan una sola vez porque estos
// nodos existen durante toda la vida de la página.
const form = document.querySelector('#analyze-form');
const input = document.querySelector('#video-url');
const button = document.querySelector('#submit-button');
const message = document.querySelector('#form-message');
const result = document.querySelector('#result');
const historyElement = document.querySelector('#history');
const historyList = document.querySelector('#history-list');
const clearHistoryButton = document.querySelector('#clear-history');
const downloadsPanel = document.querySelector('#downloads-panel');
const panelConfig = document.querySelector('#panel-config');
const dependencyHealth = document.querySelector('#dependency-health');
const adminTokenInput = document.querySelector('#admin-token');
const accessTokenInput = document.querySelector('#access-token');
const adminHint = document.querySelector('#admin-hint');
const panelStatusFilter = document.querySelector('#panel-status-filter');
const panelProviderFilter = document.querySelector('#panel-provider-filter');
const panelDateFilter = document.querySelector('#panel-date-filter');
const adminRestartSelected = document.querySelector('#admin-restart-selected');
const adminCleanExpired = document.querySelector('#admin-clean-expired');
const adminRefreshAudit = document.querySelector('#admin-refresh-audit');
const adminAudit = document.querySelector('#admin-audit');
const panelMessage = document.querySelector('#panel-message');
const panelStats = document.querySelector('#panel-stats');
const panelJobs = document.querySelector('#panel-jobs');
const localVideoFile = document.querySelector('#local-video-file');
const localUploadMessage = document.querySelector('#local-upload-message');
const localEditor = document.querySelector('#local-editor');
const localVideoPreview = document.querySelector('#local-video-preview');
const identityPreview = document.querySelector('#identity-preview');
const localFileName = document.querySelector('#local-file-name');
const localFileMeta = document.querySelector('#local-file-meta');
const localClipMount = document.querySelector('#local-clip-mount');
const videoOutputFormat = document.querySelector('#video-output-format');
const videoOutputCodec = document.querySelector('#video-output-codec');
const videoAudioCodec = document.querySelector('#video-audio-codec');
const videoOutputHint = document.querySelector('#video-output-hint');
const localExportButton = document.querySelector('#local-export-button');
const localJobsArea = document.querySelector('#local-jobs-area');
const localAudioFile = document.querySelector('#local-audio-file');
const audioUploadMessage = document.querySelector('#audio-upload-message');
const audioEditor = document.querySelector('#audio-editor');
const localAudioPreview = document.querySelector('#local-audio-preview');
const audioFileName = document.querySelector('#audio-file-name');
const audioFileMeta = document.querySelector('#audio-file-meta');
const audioSourceList = document.querySelector('#audio-source-list');
const audioClipMount = document.querySelector('#audio-clip-mount');
const audioOutputFormat = document.querySelector('#audio-output-format');
const audioOutputCodec = document.querySelector('#audio-output-codec');
const audioOutputBitrate = document.querySelector('#audio-output-bitrate');
const audioOutputHint = document.querySelector('#audio-output-hint');
const audioExportButton = document.querySelector('#audio-export-button');
const audioJobsArea = document.querySelector('#audio-jobs-area');
const identityEnabled = document.querySelector('#identity-enabled');
const identityControls = document.querySelector('#identity-controls');
const identityPadding = document.querySelector('#identity-padding');
const identityPaddingValue = document.querySelector('#identity-padding-value');
const identityBlockSize = document.querySelector('#identity-block-size');
const identityBlockValue = document.querySelector('#identity-block-value');
const identityAnalyzeButton = document.querySelector('#identity-analyze');
const identityClearButton = document.querySelector('#identity-clear');
const identityEditorTools = document.querySelector('#identity-editor-tools');
const identityTrackList = document.querySelector('#identity-track-list');
const identityEditButton = document.querySelector('#identity-edit');
const identityAddButton = document.querySelector('#identity-add');
const identityDeleteButton = document.querySelector('#identity-delete');
const identityReviewButton = document.querySelector('#identity-review');
const identityReviewed = document.querySelector('#identity-reviewed');
const identityProgress = document.querySelector('#identity-progress');
const identityMessage = document.querySelector('#identity-message');
const HISTORY_KEY = 'vdownloader-history-v1';
const ADMIN_TOKEN_KEY = 'vdownloader-admin-token-v1';
const ACCESS_TOKEN_KEY = 'vdownloader-access-token-v1';
// Keep routine polling well below the default server budget of 120 API
// requests per minute. A job monitor uses 40 requests/minute and the global
// panel uses at most 12 requests/minute in one visible tab.
const JOB_POLL_INTERVAL_MS = 1_500;
const PANEL_POLL_INTERVAL_MS = 5_000;
const DEFAULT_RATE_LIMIT_RETRY_MS = 60_000;
const PROVIDER_NAMES = {
  youtube: 'YouTube',
  xvideos: 'XVideos',
  pornhub: 'Pornhub',
  xnxx: 'XNXX',
  upload: t('provider.upload'),
  audio: t('provider.audio')
};
const AUDIO_OUTPUT_PROFILES = {
  mp3: { codecs: ['mp3'], lossless: false },
  m4a: { codecs: ['aac'], lossless: false },
  ogg: { codecs: ['vorbis', 'opus'], lossless: false },
  opus: { codecs: ['opus'], lossless: false },
  flac: { codecs: ['flac'], lossless: true },
  wav: { codecs: ['pcm-s16le'], lossless: true }
};
const AUDIO_CODEC_LABELS = {
  mp3: 'MP3 (LAME)', aac: 'AAC-LC', vorbis: 'Vorbis', opus: 'Opus',
  flac: 'FLAC', 'pcm-s16le': 'PCM 16-bit'
};
const VIDEO_OUTPUT_PROFILES = {
  mp4: { h264: ['aac'], hevc: ['aac'] },
  mov: { h264: ['aac'], hevc: ['aac'] },
  webm: { vp9: ['opus'] },
  mkv: { h264: ['aac', 'opus'], hevc: ['aac', 'opus'], vp9: ['opus'] }
};
const VIDEO_CODEC_LABELS = { h264: 'H.264 / AVC', hevc: 'H.265 / HEVC', vp9: 'VP9' };
const VIDEO_AUDIO_CODEC_LABELS = { aac: 'AAC-LC', opus: 'Opus' };
let localObjectUrl = null;
let selectedLocalFile = null;
let localClipControls = null;
let audioObjectUrl = null;
let selectedAudioFile = null;
let selectedAudioSources = [];
let activeAudioSourceIndex = 0;
let audioClipControls = null;
let identityDetector = null;
let identityAnalysis = null;
let identityPreviewFrame = null;
let identityDetectionTimestamp = 0;
let identityEditMode = false;
let identitySelectedRegion = null;
let identityPointerOperation = null;
let identityReviewRunning = false;
const identityPixelBuffer = document.createElement('canvas');
let maxUploadBytes = 2 * 1024 ** 3;
let latestPanelJobs = [];
let currentAccessRole = 'admin';
const selectedPanelJobs = new Set();
let rejectedAccessToken = '';
let downloadsPanelRefreshPromise = null;

// El token se conserva solo durante la pestaña actual. No se escribe en el
// historial persistente del navegador ni se incorpora a URLs.
try { adminTokenInput.value = sessionStorage.getItem(ADMIN_TOKEN_KEY) || ''; } catch {}
try { accessTokenInput.value = sessionStorage.getItem(ACCESS_TOKEN_KEY) || ''; } catch {}
adminTokenInput.addEventListener('input', () => {
  try { sessionStorage.setItem(ADMIN_TOKEN_KEY, adminTokenInput.value); } catch {}
});
accessTokenInput.addEventListener('input', () => {
  rejectedAccessToken = '';
  try { sessionStorage.setItem(ACCESS_TOKEN_KEY, accessTokenInput.value); } catch {}
  refreshDownloadsPanel();
  refreshServiceHealth();
});

/** Adds the remote bearer credential without placing it in URLs or persistent storage. */
async function apiFetch(resource, options = {}) {
  const token = accessTokenInput?.value.trim();
  if (token && token === rejectedAccessToken) {
    return new Response(JSON.stringify({ error: t('security.tokenRejected') }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }
  const headers = new Headers(options.headers || {});
  if (token) headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(resource, { ...options, headers });
  if (response.status === 401 && token) rejectedAccessToken = token;
  return response;
}

/** Returns the bounded wait requested by an HTTP Retry-After header. */
function retryAfterMilliseconds(response, fallback = DEFAULT_RATE_LIMIT_RETRY_MS) {
  const rawValue = response.headers.get('retry-after');
  const seconds = rawValue === null || rawValue.trim() === '' ? Number.NaN : Number(rawValue);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(120_000, Math.max(1_000, Math.ceil(seconds * 1_000)));
  }
  const retryDate = Date.parse(rawValue || '');
  if (Number.isFinite(retryDate)) {
    return Math.min(120_000, Math.max(1_000, retryDate - Date.now()));
  }
  return fallback;
}

/** Small reusable delay for rate-aware polling loops. */
function waitFor(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

clearHistoryButton.addEventListener('click', () => {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
});
renderHistory();
refreshDownloadsPanel();
refreshServiceHealth();
setInterval(() => {
  if (document.visibilityState !== 'hidden') refreshDownloadsPanel();
}, PANEL_POLL_INTERVAL_MS);
setInterval(refreshServiceHealth, 30_000);
localVideoFile.addEventListener('change', loadSelectedLocalVideo);
localExportButton.addEventListener('click', exportLocalClip);
videoOutputFormat.addEventListener('change', updateVideoFormatUi);
videoOutputCodec.addEventListener('change', updateVideoAudioCodecUi);
localAudioFile.addEventListener('change', loadSelectedLocalAudio);
audioExportButton.addEventListener('click', exportLocalAudio);
audioOutputFormat.addEventListener('change', updateAudioFormatUi);
audioOutputCodec.addEventListener('change', updateAudioFormatUi);
identityEnabled.addEventListener('change', toggleIdentityProtection);
identityAnalyzeButton.addEventListener('click', analyzeIdentityFaces);
identityClearButton.addEventListener('click', () => clearIdentityAnalysis());
identityEditButton.addEventListener('click', toggleIdentityEditMode);
identityAddButton.addEventListener('click', addIdentityRegionAtCurrentTime);
identityDeleteButton.addEventListener('click', deleteSelectedIdentityRegion);
identityReviewButton.addEventListener('click', reviewIdentityPath);
identityPreview.addEventListener('pointerdown', beginIdentityPointerEdit);
identityPreview.addEventListener('pointermove', updateIdentityPointerEdit);
identityPreview.addEventListener('pointerup', finishIdentityPointerEdit);
identityPreview.addEventListener('pointercancel', finishIdentityPointerEdit);
for (const filter of [panelStatusFilter, panelProviderFilter, panelDateFilter]) {
  filter.addEventListener('change', () => renderPanelJobs(latestPanelJobs));
}
adminRestartSelected.addEventListener('click', restartSelectedJobs);
adminCleanExpired.addEventListener('click', cleanExpiredJobs);
adminRefreshAudit.addEventListener('click', refreshAuditLog);
identityPadding.addEventListener('input', () => {
  identityPaddingValue.value = `${identityPadding.value}%`;
  refreshMotionSafeIdentityFrames();
  drawIdentityPreview();
});
identityBlockSize.addEventListener('input', () => {
  identityBlockValue.value = identityBlockSize.value;
  drawIdentityPreview();
});
for (const eventName of ['seeked', 'timeupdate', 'loadeddata', 'resize']) {
  localVideoPreview.addEventListener(eventName, drawIdentityPreview);
}
localVideoPreview.addEventListener('play', startIdentityPreviewLoop);
localVideoPreview.addEventListener('pause', drawIdentityPreview);
window.addEventListener('beforeunload', () => {
  if (localObjectUrl) URL.revokeObjectURL(localObjectUrl);
  for (const source of selectedAudioSources) URL.revokeObjectURL(source.objectUrl);
});
updateVideoFormatUi();
updateAudioFormatUi();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoading(true);
  result.hidden = true;
  result.replaceChildren();
  try {
    const response = await apiFetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: input.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(apiError(data, 'analyze.failed'));
    renderResult(data);
    message.textContent = data.qualities.length === 1
      ? t('analyze.foundOne')
      : t('analyze.foundMany', { count: data.qualities.length });
    message.className = 'message loading';
  } catch (error) {
    message.textContent = error.message;
    message.className = 'message';
  } finally {
    setLoading(false);
  }
});

/** Activa/desactiva el estado visual del formulario de análisis. */
function setLoading(loading) {
  button.disabled = loading;
  button.querySelector('span').textContent = loading ? t('analyze.loading') : t('search.action');
  if (loading) {
    message.textContent = t('analyze.querying');
    message.className = 'message loading';
  }
}

/**
 * Renderiza el modelo devuelto por /api/analyze.
 * @param {object} video Título, proveedor, duración, miniatura y calidades.
 */
function renderResult(video) {
  const wrapper = document.createElement('div');
  wrapper.className = 'video-info';
  const sortedQualities = [...video.qualities]
    .sort((a, b) => Number.parseInt(b.label, 10) - Number.parseInt(a.label, 10));
  const previewQuality = sortedQualities
    .filter((quality) => quality.type === 'mp4' && !quality.adaptive)
    [0] || sortedQualities.find((quality) => quality.type === 'hls');
  const media = previewQuality ? document.createElement('video') : document.createElement('img');
  media.className = 'video-preview';
  media.referrerPolicy = 'no-referrer';
  if (previewQuality) {
    media.poster = video.thumbnail || '';
    media.controls = true;
    media.preload = 'metadata';
    media.playsInline = true;
    if (previewQuality.type === 'hls') attachHlsPreview(media, previewQuality.previewUrl);
    else media.src = previewQuality.previewUrl;
  } else {
    media.src = video.thumbnail || '';
    media.alt = '';
  }
  const details = document.createElement('div');
  const title = document.createElement('h2');
  title.textContent = video.title;
  const provider = document.createElement('span');
  provider.className = `provider-badge provider-${video.provider || 'video'}`;
  provider.textContent = PROVIDER_NAMES[video.provider] || t('generic.video');
  const list = document.createElement('div');
  list.className = 'quality-list';
  if (video.provider === 'youtube' && video.qualities.some((quality) => quality.adaptive)) {
    const note = document.createElement('p');
    note.className = 'source-note';
    note.textContent = t('youtube.adaptiveNote');
    details.append(provider, title, note);
  } else {
    details.append(provider, title);
  }
  const links = [];
  for (const quality of video.qualities) {
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'download';
    link.textContent = t('quality.prepare', { quality: quality.label });
    link.dataset.selectionId = quality.selectionId;
    link.dataset.quality = quality.label;
    link.dataset.type = quality.type || 'mp4';
    link.dataset.adaptive = quality.adaptive ? 'true' : '';
    link.dataset.estimatedSize = quality.estimatedSize || '';
    const label = document.createElement('span');
    label.textContent = t('quality.prepare', { quality: quality.label });
    link.replaceChildren(label);
    if (quality.adaptive || quality.estimatedSize) {
      const estimate = document.createElement('small');
      const notes = [];
      if (quality.adaptive) notes.push(t('quality.adaptive'));
      if (quality.estimatedSize) notes.push(`~${formatBytes(quality.estimatedSize)}`);
      estimate.textContent = notes.join(' · ');
      link.append(estimate);
    }
    links.push(link);
    list.append(link);
  }
  const jobsArea = document.createElement('div');
  jobsArea.className = 'jobs-area';
  const clip = createClipControls(video.duration, links, video.title, previewQuality ? media : null);
  for (const link of links) {
    link.addEventListener('click', () => {
      if (!link.classList.contains('disabled')) prepareDownload(video, link, jobsArea);
    });
  }
  details.append(clip.element, list, jobsArea);
  wrapper.append(media, details);
  result.append(wrapper);
  result.hidden = false;
  clip.updateLinks();
}

/** Conecta un elemento video a HLS nativo o a HLS.js mediante proxy local. */
function attachHlsPreview(video, url) {
  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = url;
    return;
  }
  if (window.Hls?.isSupported()) {
    const hls = new window.Hls({ enableWorker: true, maxBufferLength: 30 });
    hls.loadSource(url);
    hls.attachMedia(video);
    hls.on(window.Hls.Events.ERROR, (_event, data) => {
      if (data.fatal) video.dataset.previewError = 'true';
    });
  }
}

/**
 * Construye y sincroniza todos los controles de recorte.
 * @returns {{element:HTMLElement,updateLinks:Function}} Componente y refresco.
 */
function createClipControls(duration, links, videoTitle, preview, mediaKind = 'video', options = {}) {
  const element = document.createElement('div');
  element.className = 'clip-controls';
  const header = document.createElement('div');
  header.className = 'clip-header';
  const toggleLabel = document.createElement('label');
  toggleLabel.className = 'clip-toggle';
  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  const switchUi = document.createElement('i');
  switchUi.setAttribute('aria-hidden', 'true');
  const toggleText = document.createElement('span');
  toggleText.textContent = t(mediaKind === 'audio' ? 'audio.trim' : 'clip.toggle');
  const selection = document.createElement('strong');
  selection.className = 'clip-selection';
  selection.textContent = t(mediaKind === 'audio' ? 'audio.full' : 'clip.full');
  toggleLabel.append(toggle, switchUi, toggleText);
  header.append(toggleLabel, selection);

  const editor = document.createElement('div');
  editor.className = 'clip-editor';
  editor.hidden = true;
  const timeline = document.createElement('div');
  timeline.className = 'clip-timeline';
  const track = document.createElement('div');
  track.className = 'range-track';
  const startRange = createRange(duration || 1, 0, t('clip.startRange'));
  const endRange = createRange(duration || 1, duration || 1, t('clip.endRange'));
  endRange.classList.add('range-end');
  track.append(startRange, endRange);
  const limits = document.createElement('div');
  limits.className = 'timeline-limits';
  limits.innerHTML = `<span>00:00</span><span>${duration ? formatTime(duration) : '--:--'}</span>`;
  timeline.append(track, limits);

  const times = document.createElement('div');
  times.className = 'clip-times';
  const start = createTimeField(t('clip.start'), '00:00');
  const end = createTimeField(t('clip.end'), duration ? formatTime(duration) : '');
  times.append(start.wrapper, end.wrapper);
  const markers = document.createElement('div');
  markers.className = 'marker-actions';
  const markStart = createMarkerButton(t('clip.markStart'), '↤');
  const markEnd = createMarkerButton(t('clip.markEnd'), '↦');
  markers.append(markStart, markEnd);
  if (!preview) markers.hidden = true;
  editor.append(timeline, times, markers);
  const error = document.createElement('p');
  error.className = 'clip-error';
  element.append(header, editor, error);

  const updateLinks = () => {
    let range = null;
    error.textContent = '';
    if (toggle.checked) {
      const startSeconds = parseTime(start.input.value);
      const endSeconds = parseTime(end.input.value);
      if (startSeconds == null || endSeconds == null) error.textContent = t('clip.formatError');
      else if (endSeconds <= startSeconds) error.textContent = t('clip.orderError');
      else if (duration && endSeconds > duration) {
        error.textContent = t(mediaKind === 'audio' ? 'audio.ends' : 'clip.videoEnds', { time: formatTime(duration) });
      }
      else range = { start: startSeconds, end: endSeconds };
    }
    selection.textContent = range
      ? t('clip.selected', { time: formatTime(range.end - range.start) })
      : (toggle.checked ? t('clip.invalid') : t(mediaKind === 'audio' ? 'audio.full' : 'clip.full'));
    updateTrack(range);
    for (const link of links) {
      if (range) {
        link.dataset.start = range.start;
        link.dataset.end = range.end;
      } else {
        delete link.dataset.start;
        delete link.dataset.end;
      }
      link.classList.toggle('disabled', toggle.checked && !range);
      link.setAttribute('aria-disabled', toggle.checked && !range ? 'true' : 'false');
      const estimate = link.querySelector('small');
      const fullSize = Number(link.dataset.estimatedSize);
      if (estimate && fullSize) {
        const ratio = range && duration ? (range.end - range.start) / duration : 1;
        const selectedSize = Math.max(1, Math.round(fullSize * ratio));
        estimate.textContent = `${link.dataset.adaptive ? `${t('quality.adaptive')} · ` : ''}~${formatBytes(selectedSize)}`;
        link.dataset.selectedEstimatedSize = selectedSize;
      }
    }
    options.onChange?.(range, toggle.checked);
  };
  const updateTrack = (range) => {
    if (!duration || !range) return;
    const startPercent = range.start / duration * 100;
    const endPercent = range.end / duration * 100;
    track.style.setProperty('--range-start', `${startPercent}%`);
    track.style.setProperty('--range-end', `${endPercent}%`);
    startRange.value = range.start;
    endRange.value = range.end;
  };
  const updateFromSliders = (changed) => {
    let startValue = Number(startRange.value);
    let endValue = Number(endRange.value);
    if (endValue <= startValue) {
      if (changed === 'start') startValue = Math.max(0, endValue - 1);
      else endValue = Math.min(duration, startValue + 1);
    }
    startRange.value = startValue;
    endRange.value = endValue;
    start.input.value = formatTime(startValue);
    end.input.value = formatTime(endValue);
    if (preview) preview.currentTime = changed === 'start' ? startValue : endValue;
    updateLinks();
  };
  const stepTime = (field, amount, isStart) => {
    const current = parseTime(field.input.value);
    if (current == null) return;
    const other = parseTime(isStart ? end.input.value : start.input.value);
    const maximum = isStart ? Math.max(0, (other ?? duration ?? current + amount) - 1) : (duration || 43_200);
    const minimum = isStart ? 0 : Math.min(maximum, (other ?? 0) + 1);
    field.input.value = formatTime(Math.min(maximum, Math.max(minimum, current + amount)));
    if (preview) preview.currentTime = parseTime(field.input.value) || 0;
    updateLinks();
  };

  const markCurrentTime = (isStart) => {
    if (!preview || !Number.isFinite(preview.currentTime)) return;
    const current = Math.min(duration || preview.duration || 43_200, Math.max(0, Math.floor(preview.currentTime)));
    const other = parseTime(isStart ? end.input.value : start.input.value);
    if (isStart && other != null && current >= other) end.input.value = formatTime(Math.min(duration || current + 1, current + 1));
    if (!isStart && other != null && current <= other) start.input.value = formatTime(Math.max(0, current - 1));
    (isStart ? start.input : end.input).value = formatTime(current);
    updateLinks();
  };

  toggle.addEventListener('change', () => { editor.hidden = !toggle.checked; updateLinks(); });
  start.input.addEventListener('input', updateLinks);
  end.input.addEventListener('input', updateLinks);
  start.input.addEventListener('blur', () => { const value = parseTime(start.input.value); if (value != null) start.input.value = formatTime(value); updateLinks(); });
  end.input.addEventListener('blur', () => { const value = parseTime(end.input.value); if (value != null) end.input.value = formatTime(value); updateLinks(); });
  start.minus.addEventListener('click', () => stepTime(start, -5, true));
  start.plus.addEventListener('click', () => stepTime(start, 5, true));
  end.minus.addEventListener('click', () => stepTime(end, -5, false));
  end.plus.addEventListener('click', () => stepTime(end, 5, false));
  startRange.addEventListener('input', () => updateFromSliders('start'));
  endRange.addEventListener('input', () => updateFromSliders('end'));
  markStart.addEventListener('click', () => markCurrentTime(true));
  markEnd.addEventListener('click', () => markCurrentTime(false));
  for (const link of links) link.addEventListener('click', (event) => { if (link.classList.contains('disabled')) event.preventDefault(); });
  const enable = () => {
    if (options.initialRange) {
      start.input.value = formatTime(options.initialRange.start);
      end.input.value = formatTime(options.initialRange.end);
    }
    toggle.checked = true;
    editor.hidden = false;
    updateLinks();
  };
  return { element, updateLinks, enable };
}

/** Crea un botón semántico para marcar inicio/final desde el reproductor. */
function createMarkerButton(text, icon) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'marker-button';
  button.innerHTML = `<b aria-hidden="true">${icon}</b><span>${text}</span>`;
  return button;
}

/** Envía una tarea con la calidad y recorte seleccionados y comienza monitoreo. */
async function prepareDownload(video, qualityButton, jobsArea) {
  const originalContent = qualityButton.innerHTML;
  qualityButton.disabled = true;
  qualityButton.textContent = t('job.creating');
  try {
    const payload = {
      selectionId: qualityButton.dataset.selectionId
    };
    if (qualityButton.dataset.start && qualityButton.dataset.end) {
      payload.start = Number(qualityButton.dataset.start);
      payload.end = Number(qualityButton.dataset.end);
    }
    const response = await apiFetch('/api/jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const job = await response.json();
    if (!response.ok) throw new Error(apiError(job, 'job.createFailed'));
    refreshDownloadsPanel();
    await monitorJob(job, jobsArea);
  } catch (error) {
    renderJobError(jobsArea, error.message);
  } finally {
    qualityButton.disabled = false;
    qualityButton.innerHTML = originalContent;
  }
}

/** Carga una vista previa local sin enviar todavía el archivo al servidor. */
async function loadSelectedLocalVideo() {
  const file = localVideoFile.files?.[0] || null;
  selectedLocalFile = null;
  localClipControls = null;
  clearIdentityAnalysis(false);
  identityEnabled.checked = false;
  identityControls.hidden = true;
  localEditor.hidden = true;
  localClipMount.replaceChildren();
  localJobsArea.replaceChildren();
  localUploadMessage.className = 'local-upload-message';
  if (localObjectUrl) {
    URL.revokeObjectURL(localObjectUrl);
    localObjectUrl = null;
  }
  if (!file) {
    localUploadMessage.textContent = '';
    return;
  }
  if (file.size > maxUploadBytes) {
    localUploadMessage.textContent = t('local.tooLarge', { size: formatBytes(maxUploadBytes) });
    return;
  }
  const extension = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';
  if (!['.mp4', '.m4v', '.mov', '.webm'].includes(extension)) {
    localUploadMessage.textContent = t('local.unsupported');
    return;
  }

  localUploadMessage.textContent = t('local.reading');
  localUploadMessage.className = 'local-upload-message loading';
  localObjectUrl = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error(t('local.previewFailed'))); };
      const cleanup = () => {
        localVideoPreview.removeEventListener('loadedmetadata', loaded);
        localVideoPreview.removeEventListener('error', failed);
      };
      localVideoPreview.addEventListener('loadedmetadata', loaded);
      localVideoPreview.addEventListener('error', failed);
      localVideoPreview.src = localObjectUrl;
      localVideoPreview.load();
    });
    const duration = localVideoPreview.duration;
    if (!Number.isFinite(duration) || duration < 1 || duration > 43_200) {
      throw new Error(t('local.durationInvalid'));
    }
    selectedLocalFile = file;
    localFileName.textContent = file.name;
    localFileMeta.textContent = t('local.meta', {
      duration: formatTime(duration),
      size: formatBytes(file.size)
    });
    localExportButton.dataset.estimatedSize = file.size;
    localExportButton.dataset.duration = duration;
    localClipControls = createClipControls(duration, [localExportButton], file.name, localVideoPreview);
    localClipMount.replaceChildren(localClipControls.element);
    localClipControls.enable();
    localEditor.hidden = false;
    localUploadMessage.textContent = t('local.chooseRange');
    localUploadMessage.className = 'local-upload-message success';
  } catch (error) {
    localUploadMessage.textContent = error.message;
    localUploadMessage.className = 'local-upload-message';
  }
}

/** Rebuilds the allowlisted video codec controls for the selected container. */
function updateVideoFormatUi() {
  const profile = VIDEO_OUTPUT_PROFILES[videoOutputFormat.value] || VIDEO_OUTPUT_PROFILES.mp4;
  const previous = videoOutputCodec.value;
  videoOutputCodec.replaceChildren(...Object.keys(profile).map((codec) => {
    const option = document.createElement('option');
    option.value = codec;
    option.textContent = VIDEO_CODEC_LABELS[codec];
    return option;
  }));
  if (Object.hasOwn(profile, previous)) videoOutputCodec.value = previous;
  updateVideoAudioCodecUi();
  videoOutputHint.textContent = t(videoOutputCodec.value === 'h264' ? 'video.outputHint' : 'video.slowerHint');
}

/** Keeps the audio codec compatible with the selected video codec/container. */
function updateVideoAudioCodecUi() {
  const codecs = VIDEO_OUTPUT_PROFILES[videoOutputFormat.value]?.[videoOutputCodec.value] || ['aac'];
  const previous = videoAudioCodec.value;
  videoAudioCodec.replaceChildren(...codecs.map((codec) => {
    const option = document.createElement('option');
    option.value = codec;
    option.textContent = VIDEO_AUDIO_CODEC_LABELS[codec];
    return option;
  }));
  if (codecs.includes(previous)) videoAudioCodec.value = previous;
  videoOutputHint.textContent = t(videoOutputCodec.value === 'h264' ? 'video.outputHint' : 'video.slowerHint');
}

/** Updates codec and bitrate controls for the selected audio container. */
function updateAudioFormatUi() {
  const profile = AUDIO_OUTPUT_PROFILES[audioOutputFormat.value] || AUDIO_OUTPUT_PROFILES.mp3;
  const previous = audioOutputCodec.value;
  audioOutputCodec.replaceChildren(...profile.codecs.map((codec) => {
    const option = document.createElement('option');
    option.value = codec;
    option.textContent = AUDIO_CODEC_LABELS[codec];
    return option;
  }));
  if (profile.codecs.includes(previous)) audioOutputCodec.value = previous;
  audioOutputBitrate.disabled = profile.lossless;
  audioOutputHint.textContent = t(profile.lossless ? 'audio.losslessHint' : 'audio.compressedHint');
}

/** Reads duration using a disposable browser-local audio element. */
async function readAudioSource(file) {
  const objectUrl = URL.createObjectURL(file);
  const preview = document.createElement('audio');
  preview.preload = 'metadata';
  preview.src = objectUrl;
  try {
    await new Promise((resolve, reject) => {
      preview.addEventListener('loadedmetadata', resolve, { once: true });
      preview.addEventListener('error', () => reject(new Error(t('audio.previewFailed'))), { once: true });
      preview.load();
    });
    const duration = preview.duration;
    if (!Number.isFinite(duration) || duration < 1 || duration > 43_200) throw new Error(t('audio.durationInvalid'));
    return { file, objectUrl, duration, start: 0, end: duration };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

/** Renders the ordered list used by the audio join operation. */
function renderAudioSourceList() {
  audioSourceList.replaceChildren(...selectedAudioSources.map((source, index) => {
    const row = document.createElement('div');
    row.className = `audio-source-item${index === activeAudioSourceIndex ? ' active' : ''}`;
    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'audio-source-select';
    select.textContent = `${index + 1}. ${source.file.name} · ${formatTime(source.end - source.start)}`;
    select.addEventListener('click', () => showAudioSource(index));
    const actions = document.createElement('div');
    for (const [symbol, offset, key] of [['↑', -1, 'audio.moveUp'], ['↓', 1, 'audio.moveDown']]) {
      const move = document.createElement('button');
      move.type = 'button';
      move.textContent = symbol;
      move.title = t(key);
      move.disabled = index + offset < 0 || index + offset >= selectedAudioSources.length;
      move.addEventListener('click', () => moveAudioSource(index, offset));
      actions.append(move);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.title = t('audio.remove');
    remove.addEventListener('click', () => removeAudioSource(index));
    actions.append(remove);
    row.append(select, actions);
    return row;
  }));
}

/** Selects one source so its own trim range can be previewed and adjusted. */
function showAudioSource(index) {
  const source = selectedAudioSources[index];
  if (!source) return;
  activeAudioSourceIndex = index;
  selectedAudioFile = source.file;
  audioObjectUrl = source.objectUrl;
  localAudioPreview.src = source.objectUrl;
  localAudioPreview.load();
  audioFileName.textContent = source.file.name;
  audioFileMeta.textContent = t('audio.meta', {
    duration: formatTime(source.duration),
    size: formatBytes(source.file.size)
  });
  audioExportButton.dataset.estimatedSize = source.file.size;
  audioExportButton.dataset.duration = source.duration;
  audioClipControls = createClipControls(
    source.duration,
    [audioExportButton],
    source.file.name,
    localAudioPreview,
    'audio',
    {
      initialRange: { start: source.start, end: source.end },
      onChange: (range) => {
        if (!range) return;
        source.start = range.start;
        source.end = range.end;
        renderAudioSourceList();
      }
    }
  );
  audioClipMount.replaceChildren(audioClipControls.element);
  audioClipControls.enable();
  renderAudioSourceList();
}

function moveAudioSource(index, offset) {
  const target = index + offset;
  if (!selectedAudioSources[index] || target < 0 || target >= selectedAudioSources.length) return;
  [selectedAudioSources[index], selectedAudioSources[target]] = [selectedAudioSources[target], selectedAudioSources[index]];
  activeAudioSourceIndex = target;
  showAudioSource(target);
}

function removeAudioSource(index) {
  const [removed] = selectedAudioSources.splice(index, 1);
  if (removed) URL.revokeObjectURL(removed.objectUrl);
  if (!selectedAudioSources.length) {
    selectedAudioFile = null;
    audioEditor.hidden = true;
    audioSourceList.replaceChildren();
    audioUploadMessage.textContent = '';
    return;
  }
  showAudioSource(Math.min(index, selectedAudioSources.length - 1));
}

/** Loads one or several browser-local audio previews without uploading them. */
async function loadSelectedLocalAudio() {
  const files = [...(localAudioFile.files || [])];
  selectedAudioFile = null;
  audioClipControls = null;
  audioEditor.hidden = true;
  audioClipMount.replaceChildren();
  audioSourceList.replaceChildren();
  audioJobsArea.replaceChildren();
  audioUploadMessage.className = 'local-upload-message';
  for (const source of selectedAudioSources) URL.revokeObjectURL(source.objectUrl);
  selectedAudioSources = [];
  audioObjectUrl = null;
  if (!files.length) {
    audioUploadMessage.textContent = '';
    return;
  }
  if (files.length > 20 || files.reduce((sum, file) => sum + file.size, 0) > maxUploadBytes) {
    audioUploadMessage.textContent = files.length > 20
      ? t('audio.tooMany')
      : t('local.tooLarge', { size: formatBytes(maxUploadBytes) });
    return;
  }
  for (const file of files) {
    const extension = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';
    if (!['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg', '.opus'].includes(extension)) {
      audioUploadMessage.textContent = t('audio.unsupported');
      return;
    }
  }

  audioUploadMessage.textContent = t('audio.reading');
  audioUploadMessage.className = 'local-upload-message loading';
  try {
    for (const file of files) selectedAudioSources.push(await readAudioSource(file));
    const selectedDuration = selectedAudioSources.reduce((sum, source) => sum + source.duration, 0);
    if (selectedDuration > 43_200) throw new Error(t('audio.totalDurationInvalid'));
    updateAudioFormatUi();
    audioEditor.hidden = false;
    showAudioSource(0);
    audioUploadMessage.textContent = selectedAudioSources.length > 1
      ? t('audio.joinReady', { count: selectedAudioSources.length })
      : t('audio.chooseRange');
    audioUploadMessage.className = 'local-upload-message success';
  } catch (error) {
    for (const source of selectedAudioSources) URL.revokeObjectURL(source.objectUrl);
    selectedAudioSources = [];
    audioUploadMessage.textContent = error.message;
    audioUploadMessage.className = 'local-upload-message';
  }
}

/** Uploads one audio source with validated trim/transcode metadata. */
function uploadLocalAudio(file, start, end, duration, outputFormat, audioCodec, bitrate, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/audio-jobs');
    const accessToken = accessTokenInput.value.trim();
    if (accessToken) xhr.setRequestHeader('authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-vdownloader-audio', '1');
    xhr.setRequestHeader('x-upload-name', encodeURIComponent(file.name));
    xhr.setRequestHeader('x-upload-duration', String(duration));
    xhr.setRequestHeader('x-upload-start', String(start));
    xhr.setRequestHeader('x-upload-end', String(end));
    xhr.setRequestHeader('x-audio-format', outputFormat);
    xhr.setRequestHeader('x-audio-codec', audioCodec);
    if (!AUDIO_OUTPUT_PROFILES[outputFormat].lossless) xhr.setRequestHeader('x-audio-bitrate', String(bitrate));
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    });
    xhr.addEventListener('load', () => {
      const response = (() => { try { return JSON.parse(xhr.responseText || '{}'); } catch { return {}; } })();
      if (xhr.status >= 200 && xhr.status < 300) resolve(response);
      else reject(new Error(apiError(response, 'audio.uploadFailed')));
    });
    xhr.addEventListener('error', () => reject(new Error(t('upload.network'))));
    xhr.addEventListener('abort', () => reject(new Error(t('upload.cancelled'))));
    xhr.send(file);
  });
}

/** Uploads an ordered audio envelope while keeping media bytes out of JSON. */
function uploadJoinedAudio(sources, outputFormat, audioCodec, bitrate, onProgress) {
  const envelope = {
    version: 1,
    outputFormat,
    audioCodec,
    bitrate,
    sources: sources.map((source) => ({
      name: encodeURIComponent(source.file.name),
      type: source.file.type || 'application/octet-stream',
      size: source.file.size,
      duration: source.duration,
      start: source.start,
      end: source.end
    }))
  };
  const metadata = new TextEncoder().encode(JSON.stringify(envelope));
  const prefix = new Uint8Array(4);
  new DataView(prefix.buffer).setUint32(0, metadata.byteLength, false);
  const body = new Blob([prefix, metadata, ...sources.map((source) => source.file)], {
    type: 'application/vnd.vdownloader.audio-join'
  });
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/audio-join-jobs');
    const accessToken = accessTokenInput.value.trim();
    if (accessToken) xhr.setRequestHeader('authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('x-vdownloader-audio-join', '1');
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    });
    xhr.addEventListener('load', () => {
      const response = (() => { try { return JSON.parse(xhr.responseText || '{}'); } catch { return {}; } })();
      if (xhr.status >= 200 && xhr.status < 300) resolve(response);
      else reject(new Error(apiError(response, 'audio.uploadFailed')));
    });
    xhr.addEventListener('error', () => reject(new Error(t('upload.network'))));
    xhr.addEventListener('abort', () => reject(new Error(t('upload.cancelled'))));
    xhr.send(body);
  });
}

/** Creates and monitors a local audio trim/transcode job. */
async function exportLocalAudio() {
  if (!selectedAudioSources.length || audioExportButton.classList.contains('disabled')) return;
  const rangesValid = selectedAudioSources.every((source) => Number.isFinite(source.start)
    && Number.isFinite(source.end) && source.end > source.start);
  if (!rangesValid) {
    audioUploadMessage.textContent = t('local.invalidExportRange');
    return;
  }
  const originalContent = audioExportButton.innerHTML;
  audioExportButton.disabled = true;
  try {
    const progress = (value) => { audioExportButton.textContent = t('upload.progress', { progress: value }); };
    const source = selectedAudioSources[0];
    const job = selectedAudioSources.length === 1
      ? await uploadLocalAudio(
        source.file,
        source.start,
        source.end,
        source.duration,
        audioOutputFormat.value,
        audioOutputCodec.value,
        Number(audioOutputBitrate.value),
        progress
      )
      : await uploadJoinedAudio(
        selectedAudioSources,
        audioOutputFormat.value,
        audioOutputCodec.value,
        Number(audioOutputBitrate.value),
        progress
      );
    audioExportButton.textContent = t('audio.processing');
    audioUploadMessage.textContent = t('audio.uploadComplete');
    audioUploadMessage.className = 'local-upload-message success';
    refreshDownloadsPanel();
    await monitorJob(job, audioJobsArea);
  } catch (error) {
    renderJobError(audioJobsArea, error.message);
    audioUploadMessage.textContent = error.message;
    audioUploadMessage.className = 'local-upload-message';
  } finally {
    audioExportButton.disabled = false;
    audioExportButton.innerHTML = originalContent;
  }
}

/**
 * Activa o desactiva el editor de identidad sin perder un análisis válido.
 * La vista previa se dibuja en un canvas transparente sobre el reproductor.
 */
function toggleIdentityProtection() {
  identityControls.hidden = !identityEnabled.checked;
  localExportButton.textContent = identityEnabled.checked
    ? t('identity.exportProtected')
    : t('local.exportClip');
  if (identityEnabled.checked) drawIdentityPreview();
  else clearIdentityPreview();
}

/** Devuelve el intervalo actual expuesto por los controles de recorte. */
function getLocalClipRange() {
  const start = Number(localExportButton.dataset.start);
  const end = Number(localExportButton.dataset.end);
  return Number.isFinite(start) && Number.isFinite(end) && end > start ? { start, end } : null;
}

/** Inicializa una única instancia local del detector facial. */
async function getIdentityDetector() {
  if (identityDetector) return identityDetector;
  const vision = await FilesetResolver.forVisionTasks('/vendor/mediapipe/wasm');
  identityDetector = await FaceDetector.createFromOptions(vision, {
    baseOptions: { modelAssetPath: '/models/blaze_face_short_range.tflite' },
    runningMode: 'VIDEO',
    minDetectionConfidence: 0.45,
    minSuppressionThreshold: 0.3
  });
  return identityDetector;
}

/** Espera a que el reproductor haya mostrado el fotograma solicitado. */
function seekPreview(video, time) {
  const target = Math.min(Math.max(0, time), Math.max(0, video.duration - 0.001));
  if (Math.abs(video.currentTime - target) < 0.015 && video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(t('frame.timeout')));
    }, 10_000);
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener('seeked', loaded);
      video.removeEventListener('error', failed);
    };
    const loaded = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error(t('frame.failed'))); };
    video.addEventListener('seeked', loaded, { once: true });
    video.addEventListener('error', failed, { once: true });
    video.currentTime = target;
  });
}

/** Convierte el rectángulo de MediaPipe a coordenadas relativas seguras. */
function normalizeDetectedBox(box) {
  const videoWidth = localVideoPreview.videoWidth;
  const videoHeight = localVideoPreview.videoHeight;
  if (!videoWidth || !videoHeight || !box) return null;
  const x = Math.max(0, Number(box.originX) / videoWidth);
  const y = Math.max(0, Number(box.originY) / videoHeight);
  const width = Math.min(1 - x, Number(box.width) / videoWidth);
  const height = Math.min(1 - y, Number(box.height) / videoHeight);
  return width >= 0.01 && height >= 0.01 ? { x, y, width, height } : null;
}

/**
 * Assigns anonymous track IDs to detections using spatial continuity only.
 * It does not perform face recognition, create embeddings, or identify people.
 */
function assignIdentityTrackIds(frames) {
  let nextTrackNumber = 1;
  const recentTracks = new Map();
  return frames.map((frame) => {
    const usedTracks = new Set();
    const boxes = frame.boxes.map((box) => {
      let selectedTrack = null;
      let selectedDistance = 0.08;
      for (const [trackId, previous] of recentTracks) {
        if (usedTracks.has(trackId) || frame.time - previous.time > 1.5) continue;
        const distance = identityCenterDistance(box, previous.box);
        if (distance < selectedDistance) {
          selectedTrack = trackId;
          selectedDistance = distance;
        }
      }
      const trackId = selectedTrack || `face-${nextTrackNumber++}`;
      usedTracks.add(trackId);
      recentTracks.set(trackId, { time: frame.time, box });
      return { ...box, trackId };
    });
    return { time: frame.time, boxes };
  });
}

/** Returns every anonymous track present in the current analysis. */
function identityTrackIds() {
  return [...new Set(identityAnalysis?.frames.flatMap((frame) => frame.boxes.map((box) => box.trackId)) || [])];
}

/** Invalidates manual review whenever coverage changes. */
function invalidateIdentityReview() {
  identityReviewed.checked = false;
  identityReviewed.disabled = true;
}

/** Renders anonymous person toggles; unselected tracks are excluded from export. */
function renderIdentityTracks() {
  if (!identityAnalysis) return identityTrackList.replaceChildren();
  const trackIds = identityTrackIds();
  identityTrackList.replaceChildren(...trackIds.map((trackId, index) => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = identityAnalysis.selectedTrackIds.has(trackId);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) identityAnalysis.selectedTrackIds.add(trackId);
      else identityAnalysis.selectedTrackIds.delete(trackId);
      invalidateIdentityReview();
      refreshMotionSafeIdentityFrames();
      drawIdentityPreview();
    });
    const text = document.createElement('span');
    text.textContent = t('identity.person', { number: index + 1 });
    label.append(checkbox, text);
    return label;
  }));
}

/**
 * Recorre el intervalo elegido, detecta todos los rostros publicados en cada
 * muestra y conserva únicamente coordenadas normalizadas en memoria.
 */
async function analyzeIdentityFaces() {
  const range = getLocalClipRange();
  if (!selectedLocalFile || !range) {
    identityMessage.textContent = t('identity.invalidRange');
    identityMessage.className = 'identity-message error';
    return;
  }
  const clipDuration = range.end - range.start;
  // Cuatro muestras por segundo capturan movimientos de cabeza mucho mejor
  // que el intervalo anterior de medio segundo. En tramos largos se adapta
  // hasta un máximo acotado para no bloquear el navegador ni FFmpeg.
  const interval = Math.max(0.25, clipDuration / 900);
  const sampleTimes = [];
  for (let time = range.start; time < range.end && sampleTimes.length < 900; time += interval) {
    sampleTimes.push(time);
  }
  if (!sampleTimes.length) return;

  identityAnalyzeButton.disabled = true;
  identityClearButton.hidden = true;
  identityProgress.hidden = false;
  identityProgress.querySelector('i').style.width = '0%';
  identityMessage.textContent = t('identity.loading');
  identityMessage.className = 'identity-message';
  localVideoPreview.pause();

  try {
    const detector = await getIdentityDetector();
    const frames = [];
    let totalDetections = 0;
    for (let index = 0; index < sampleTimes.length; index += 1) {
      const time = sampleTimes[index];
      await seekPreview(localVideoPreview, time);
      // MediaPipe exige marcas crecientes en modo VIDEO. Se usa un reloj
      // monotónico independiente del tiempo al que el usuario haya regresado.
      identityDetectionTimestamp = Math.max(identityDetectionTimestamp + 1, performance.now());
      const result = detector.detectForVideo(localVideoPreview, identityDetectionTimestamp);
      const boxes = (result.detections || [])
        .map((detection) => normalizeDetectedBox(detection.boundingBox))
        .filter(Boolean)
        .slice(0, 8);
      totalDetections += boxes.length;
      frames.push({ time, boxes });
      const progress = Math.round((index + 1) / sampleTimes.length * 100);
      identityProgress.querySelector('i').style.width = `${progress}%`;
      identityMessage.textContent = t('identity.analyzing', { progress });
      if (index % 4 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const trackedFrames = assignIdentityTrackIds(frames);
    identityAnalysis = {
      clipStart: range.start,
      clipEnd: range.end,
      frames: trackedFrames,
      selectedTrackIds: new Set(trackedFrames.flatMap((frame) => frame.boxes.map((box) => box.trackId))),
      protectedFrames: []
    };
    refreshMotionSafeIdentityFrames();
    renderIdentityTracks();
    identityEditorTools.hidden = false;
    identityEditMode = false;
    identityPreview.classList.remove('editing');
    identityEditButton.textContent = t('identity.edit');
    invalidateIdentityReview();
    identityClearButton.hidden = false;
    const frequency = 1 / interval;
    identityMessage.textContent = totalDetections
      ? t('identity.summary', {
          detections: totalDetections,
          samples: frames.length,
          frequency: frequency.toFixed(1)
        })
      : t('identity.noneManual');
    identityMessage.className = totalDetections ? 'identity-message success' : 'identity-message';
    localVideoPreview.currentTime = range.start;
    drawIdentityPreview();
  } catch (error) {
    identityAnalysis = null;
    identityMessage.textContent = error.message || t('identity.failed');
    identityMessage.className = 'identity-message error';
    clearIdentityPreview();
  } finally {
    identityAnalyzeButton.disabled = false;
    identityProgress.hidden = true;
  }
}

/** Amplía una detección con el margen elegido y la mantiene dentro del video. */
function expandIdentityBox(box) {
  const padding = Number(identityPadding.value) / 100;
  const x = Math.max(0, box.x - box.width * padding);
  const y = Math.max(0, box.y - box.height * padding);
  const width = Math.min(1 - x, box.width * (1 + padding * 2));
  const height = Math.min(1 - y, box.height * (1 + padding * 2));
  return { x, y, width, height, trackId: box.trackId };
}

/** Une dos regiones para cubrir todo el recorrido entre ambas posiciones. */
function unionIdentityBoxes(first, second) {
  const x = Math.min(first.x, second.x);
  const y = Math.min(first.y, second.y);
  const right = Math.max(first.x + first.width, second.x + second.width);
  const bottom = Math.max(first.y + first.height, second.y + second.height);
  return {
    x,
    y,
    width: Math.min(1 - x, right - x),
    height: Math.min(1 - y, bottom - y),
    trackId: first.trackId
  };
}

/** Distancia cuadrada entre los centros de dos detecciones normalizadas. */
function identityCenterDistance(first, second) {
  const firstX = first.x + first.width / 2;
  const firstY = first.y + first.height / 2;
  const secondX = second.x + second.width / 2;
  const secondY = second.y + second.height / 2;
  return (firstX - secondX) ** 2 + (firstY - secondY) ** 2;
}

/**
 * Crea una máscara conservadora por muestra.
 *
 * - Une cada rostro con su posición siguiente para cubrir el desplazamiento.
 * - Si MediaPipe pierde un rostro por un giro u oclusión breve, combina la
 *   última y la próxima detección durante un máximo de 1,5 segundos.
 * - Incluye rostros nuevos aunque no haya una coincidencia anterior.
 */
function createMotionSafeIdentityFrames(frames) {
  const maximumGap = 1.5;
  const expanded = frames.map((frame) => ({
    time: frame.time,
    boxes: frame.boxes
      .filter((box) => identityAnalysis.selectedTrackIds.has(box.trackId))
      .map(expandIdentityBox)
  }));
  const nearestNonEmpty = (startIndex, direction) => {
    const originTime = expanded[startIndex].time;
    for (let index = startIndex + direction; index >= 0 && index < expanded.length; index += direction) {
      if (Math.abs(expanded[index].time - originTime) > maximumGap) return null;
      if (expanded[index].boxes.length) return expanded[index];
    }
    return null;
  };
  return expanded.map((frame, frameIndex) => {
    const previous = frame.boxes.length ? frame : nearestNonEmpty(frameIndex, -1);
    const next = nearestNonEmpty(frameIndex, 1);
    const baseBoxes = previous?.boxes || next?.boxes || [];
    if (!next || next === previous) return { time: frame.time, boxes: baseBoxes };
    const usedNext = new Set();
    const boxes = baseBoxes.map((box) => {
      let closestIndex = -1;
      let closestDistance = Number.POSITIVE_INFINITY;
      next.boxes.forEach((candidate, candidateIndex) => {
        if (usedNext.has(candidateIndex)) return;
        if (box.trackId && candidate.trackId && box.trackId !== candidate.trackId) return;
        const distance = identityCenterDistance(box, candidate);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = candidateIndex;
        }
      });
      if (closestIndex < 0) return box;
      usedNext.add(closestIndex);
      return unionIdentityBoxes(box, next.boxes[closestIndex]);
    });
    next.boxes.forEach((box, boxIndex) => {
      if (!usedNext.has(boxIndex)) boxes.push(box);
    });
    return { time: frame.time, boxes: boxes.slice(0, 8) };
  });
}

/** Recalcula la cobertura cuando cambia el margen elegido por el usuario. */
function refreshMotionSafeIdentityFrames() {
  if (!identityAnalysis) return;
  identityAnalysis.protectedFrames = createMotionSafeIdentityFrames(identityAnalysis.frames);
}

/** Finds the sampled point closest to the current player position. */
function nearestIdentityFrameIndex(time = localVideoPreview.currentTime) {
  if (!identityAnalysis?.frames.length) return -1;
  let selectedIndex = 0;
  let selectedDistance = Number.POSITIVE_INFINITY;
  identityAnalysis.frames.forEach((frame, index) => {
    const distance = Math.abs(frame.time - time);
    if (distance < selectedDistance) {
      selectedIndex = index;
      selectedDistance = distance;
    }
  });
  return selectedIndex;
}

/** Enables pointer-based region movement and resizing on the preview canvas. */
function toggleIdentityEditMode() {
  if (!identityAnalysis) return;
  identityEditMode = !identityEditMode;
  identityPreview.classList.toggle('editing', identityEditMode);
  identityEditButton.textContent = identityEditMode ? t('identity.finishEdit') : t('identity.edit');
  identityMessage.textContent = identityEditMode ? t('identity.editEnabled') : '';
  identityMessage.className = 'identity-message';
  drawIdentityPreview();
}

/** Adds a conservative manual region at the current sampled point. */
function addIdentityRegionAtCurrentTime() {
  const frameIndex = nearestIdentityFrameIndex();
  if (frameIndex < 0) return;
  if (identityAnalysis.frames[frameIndex].boxes.length >= 8) {
    identityMessage.textContent = t('identity.tooManyRegions');
    identityMessage.className = 'identity-message error';
    return;
  }
  const trackId = `manual-${Date.now()}-${identityAnalysis.frames[frameIndex].boxes.length}`;
  identityAnalysis.frames[frameIndex].boxes.push({
    x: 0.35,
    y: 0.25,
    width: 0.3,
    height: 0.35,
    trackId
  });
  identityAnalysis.selectedTrackIds.add(trackId);
  identitySelectedRegion = { frameIndex, trackId };
  identityDeleteButton.disabled = false;
  invalidateIdentityReview();
  renderIdentityTracks();
  refreshMotionSafeIdentityFrames();
  drawIdentityPreview();
  identityMessage.textContent = t('identity.regionAdded');
  identityMessage.className = 'identity-message success';
}

/** Deletes only the selected box at its sampled point, preserving the track elsewhere. */
function deleteSelectedIdentityRegion() {
  if (!identityAnalysis || !identitySelectedRegion) return;
  const frame = identityAnalysis.frames[identitySelectedRegion.frameIndex];
  if (!frame) return;
  frame.boxes = frame.boxes.filter((box) => box.trackId !== identitySelectedRegion.trackId);
  identitySelectedRegion = null;
  identityDeleteButton.disabled = true;
  invalidateIdentityReview();
  renderIdentityTracks();
  refreshMotionSafeIdentityFrames();
  drawIdentityPreview();
  identityMessage.textContent = t('identity.regionDeleted');
  identityMessage.className = 'identity-message';
}

/** Converts a pointer coordinate into the normalized video content area. */
function identityPointerPoint(event) {
  if (!localVideoPreview.videoWidth || !localVideoPreview.videoHeight) return null;
  const rect = identityPreview.getBoundingClientRect();
  const scale = Math.min(rect.width / localVideoPreview.videoWidth, rect.height / localVideoPreview.videoHeight);
  const renderedWidth = localVideoPreview.videoWidth * scale;
  const renderedHeight = localVideoPreview.videoHeight * scale;
  const offsetX = (rect.width - renderedWidth) / 2;
  const offsetY = (rect.height - renderedHeight) / 2;
  const x = (event.clientX - rect.left - offsetX) / renderedWidth;
  const y = (event.clientY - rect.top - offsetY) / renderedHeight;
  if (x < 0 || y < 0 || x > 1 || y > 1) return null;
  return { x, y };
}

/** Selects a raw sampled region and chooses move or resize behavior. */
function beginIdentityPointerEdit(event) {
  if (!identityEditMode || !identityAnalysis) return;
  const point = identityPointerPoint(event);
  const frameIndex = nearestIdentityFrameIndex();
  if (!point || frameIndex < 0) return;
  const boxes = identityAnalysis.frames[frameIndex].boxes;
  const box = [...boxes].reverse().find((candidate) => point.x >= candidate.x
    && point.x <= candidate.x + candidate.width
    && point.y >= candidate.y
    && point.y <= candidate.y + candidate.height);
  if (!box) {
    identitySelectedRegion = null;
    identityDeleteButton.disabled = true;
    drawIdentityPreview();
    return;
  }
  identitySelectedRegion = { frameIndex, trackId: box.trackId };
  identityDeleteButton.disabled = false;
  const resize = Math.abs(point.x - (box.x + box.width)) < 0.05
    && Math.abs(point.y - (box.y + box.height)) < 0.05;
  identityPointerOperation = {
    pointerId: event.pointerId,
    mode: resize ? 'resize' : 'move',
    start: point,
    original: { x: box.x, y: box.y, width: box.width, height: box.height }
  };
  identityPreview.setPointerCapture?.(event.pointerId);
  event.preventDefault();
  drawIdentityPreview();
}

/** Applies a pointer edit while keeping the region inside normalized bounds. */
function updateIdentityPointerEdit(event) {
  if (!identityPointerOperation || event.pointerId !== identityPointerOperation.pointerId) return;
  const point = identityPointerPoint(event);
  const frame = identityAnalysis?.frames[identitySelectedRegion?.frameIndex];
  const box = frame?.boxes.find((candidate) => candidate.trackId === identitySelectedRegion.trackId);
  if (!point || !box) return;
  const deltaX = point.x - identityPointerOperation.start.x;
  const deltaY = point.y - identityPointerOperation.start.y;
  const original = identityPointerOperation.original;
  if (identityPointerOperation.mode === 'resize') {
    box.width = Math.min(1 - original.x, Math.max(0.02, original.width + deltaX));
    box.height = Math.min(1 - original.y, Math.max(0.02, original.height + deltaY));
  } else {
    box.x = Math.min(1 - original.width, Math.max(0, original.x + deltaX));
    box.y = Math.min(1 - original.height, Math.max(0, original.y + deltaY));
  }
  invalidateIdentityReview();
  refreshMotionSafeIdentityFrames();
  drawIdentityPreview();
  event.preventDefault();
}

/** Finishes the active pointer edit and releases capture. */
function finishIdentityPointerEdit(event) {
  if (!identityPointerOperation || event.pointerId !== identityPointerOperation.pointerId) return;
  identityPreview.releasePointerCapture?.(event.pointerId);
  identityPointerOperation = null;
}

/** Plays the full protected range and enables the explicit human confirmation at the end. */
async function reviewIdentityPath() {
  if (!identityAnalysis || identityReviewRunning) return;
  identityReviewRunning = true;
  identityEditMode = false;
  identityPreview.classList.remove('editing');
  identityEditButton.textContent = t('identity.edit');
  invalidateIdentityReview();
  identityMessage.textContent = t('identity.reviewing');
  identityMessage.className = 'identity-message';
  let complete = null;
  let interrupted = null;
  try {
    await seekPreview(localVideoPreview, identityAnalysis.clipStart);
    complete = () => {
      if (localVideoPreview.currentTime < identityAnalysis.clipEnd - 0.05 && !localVideoPreview.ended) return;
      localVideoPreview.removeEventListener('timeupdate', complete);
      localVideoPreview.removeEventListener('pause', interrupted);
      localVideoPreview.pause();
      identityReviewRunning = false;
      identityReviewed.disabled = false;
      identityMessage.textContent = t('identity.reviewComplete');
      identityMessage.className = 'identity-message success';
    };
    interrupted = () => {
      if (!identityReviewRunning || localVideoPreview.currentTime >= identityAnalysis.clipEnd - 0.05) return;
      localVideoPreview.removeEventListener('timeupdate', complete);
      localVideoPreview.removeEventListener('pause', interrupted);
      identityReviewRunning = false;
      identityMessage.textContent = t('identity.reviewInterrupted');
      identityMessage.className = 'identity-message';
    };
    localVideoPreview.addEventListener('timeupdate', complete);
    localVideoPreview.addEventListener('pause', interrupted);
    await localVideoPreview.play();
  } catch (error) {
    if (complete) localVideoPreview.removeEventListener('timeupdate', complete);
    if (interrupted) localVideoPreview.removeEventListener('pause', interrupted);
    identityReviewRunning = false;
    identityMessage.textContent = error.message || t('frame.failed');
    identityMessage.className = 'identity-message error';
  }
}

/** Busca la muestra vigente para el tiempo que se está previsualizando. */
function identityBoxesAt(time) {
  if (!identityAnalysis || time < identityAnalysis.clipStart || time > identityAnalysis.clipEnd) return [];
  let selected = identityAnalysis.protectedFrames[0];
  for (const frame of identityAnalysis.protectedFrames) {
    if (frame.time > time) break;
    selected = frame;
  }
  return selected?.boxes || [];
}

/** Dibuja únicamente las regiones pixeladas, respetando el letterbox del video. */
function drawIdentityPreview() {
  if (!identityEnabled.checked || !identityAnalysis || !localVideoPreview.videoWidth) {
    clearIdentityPreview();
    return;
  }
  const canvas = identityPreview;
  const cssWidth = localVideoPreview.clientWidth;
  const cssHeight = localVideoPreview.clientHeight;
  if (!cssWidth || !cssHeight) return;
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const targetWidth = Math.round(cssWidth * ratio);
  const targetHeight = Math.round(cssHeight * ratio);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(cssWidth / localVideoPreview.videoWidth, cssHeight / localVideoPreview.videoHeight);
  const renderedWidth = localVideoPreview.videoWidth * scale;
  const renderedHeight = localVideoPreview.videoHeight * scale;
  const offsetX = (cssWidth - renderedWidth) / 2;
  const offsetY = (cssHeight - renderedHeight) / 2;
  const blockSize = Number(identityBlockSize.value);
  for (const box of identityBoxesAt(localVideoPreview.currentTime)) {
    const sourceX = box.x * localVideoPreview.videoWidth;
    const sourceY = box.y * localVideoPreview.videoHeight;
    const sourceWidth = box.width * localVideoPreview.videoWidth;
    const sourceHeight = box.height * localVideoPreview.videoHeight;
    const lowWidth = Math.max(1, Math.ceil(sourceWidth / blockSize));
    const lowHeight = Math.max(1, Math.ceil(sourceHeight / blockSize));
    identityPixelBuffer.width = lowWidth;
    identityPixelBuffer.height = lowHeight;
    identityPixelBuffer.getContext('2d').drawImage(
      localVideoPreview,
      sourceX, sourceY, sourceWidth, sourceHeight,
      0, 0, lowWidth, lowHeight
    );
    context.imageSmoothingEnabled = false;
    context.drawImage(
      identityPixelBuffer,
      0, 0, lowWidth, lowHeight,
      (offsetX + box.x * renderedWidth) * ratio,
      (offsetY + box.y * renderedHeight) * ratio,
      box.width * renderedWidth * ratio,
      box.height * renderedHeight * ratio
    );
    context.strokeStyle = 'rgba(67, 215, 200, .8)';
    context.lineWidth = Math.max(1, ratio);
    context.strokeRect(
      (offsetX + box.x * renderedWidth) * ratio,
      (offsetY + box.y * renderedHeight) * ratio,
      box.width * renderedWidth * ratio,
      box.height * renderedHeight * ratio
    );
  }
  if (identityEditMode && identitySelectedRegion) {
    const frame = identityAnalysis.frames[identitySelectedRegion.frameIndex];
    const box = frame?.boxes.find((candidate) => candidate.trackId === identitySelectedRegion.trackId);
    if (box) {
      const x = (offsetX + box.x * renderedWidth) * ratio;
      const y = (offsetY + box.y * renderedHeight) * ratio;
      const width = box.width * renderedWidth * ratio;
      const height = box.height * renderedHeight * ratio;
      context.strokeStyle = '#ffd166';
      context.lineWidth = Math.max(2, ratio * 2);
      context.strokeRect(x, y, width, height);
      context.fillStyle = '#ffd166';
      context.fillRect(x + width - 7 * ratio, y + height - 7 * ratio, 7 * ratio, 7 * ratio);
    }
  }
}

/** Mantiene la máscara sincronizada mientras el video está reproduciéndose. */
function startIdentityPreviewLoop() {
  if (identityPreviewFrame) cancelAnimationFrame(identityPreviewFrame);
  const render = () => {
    drawIdentityPreview();
    if (!localVideoPreview.paused && !localVideoPreview.ended) {
      identityPreviewFrame = requestAnimationFrame(render);
    } else {
      identityPreviewFrame = null;
    }
  };
  render();
}

/** Borra el canvas sin modificar el seguimiento detectado. */
function clearIdentityPreview() {
  const context = identityPreview.getContext('2d');
  context.clearRect(0, 0, identityPreview.width, identityPreview.height);
}

/** Descarta muestras anteriores, por ejemplo al seleccionar otro archivo. */
function clearIdentityAnalysis(showMessage = true) {
  identityAnalysis = null;
  identityEditMode = false;
  identitySelectedRegion = null;
  identityPointerOperation = null;
  identityReviewRunning = false;
  identityClearButton.hidden = true;
  identityEditorTools.hidden = true;
  identityTrackList.replaceChildren();
  identityPreview.classList.remove('editing');
  identityEditButton.textContent = t('identity.edit');
  identityDeleteButton.disabled = true;
  invalidateIdentityReview();
  identityProgress.hidden = true;
  clearIdentityPreview();
  if (showMessage) {
    identityMessage.textContent = t('identity.removed');
    identityMessage.className = 'identity-message';
  } else {
    identityMessage.textContent = '';
  }
}

/** Registra las muestras en el servidor y recibe una referencia opaca de un solo uso. */
async function registerIdentityTrack(range) {
  if (!identityAnalysis
    || Math.abs(identityAnalysis.clipStart - range.start) > 0.02
    || Math.abs(identityAnalysis.clipEnd - range.end) > 0.02) {
    throw new Error(t('identity.rangeChanged'));
  }
  if (!identityReviewed.checked) throw new Error(t('identity.reviewRequired'));
  const response = await apiFetch('/api/identity-tracks', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-vdownloader-identity': '1'
    },
    body: JSON.stringify({
      method: 'pixelate',
      blockSize: Number(identityBlockSize.value),
      duration: range.end - range.start,
      frames: identityAnalysis.protectedFrames.map((frame) => ({
        time: frame.time - range.start,
        boxes: frame.boxes
      }))
    })
  });
  const body = await response.json();
  if (!response.ok) throw new Error(apiError(body, 'identity.prepareFailed'));
  return body.identityTrackId;
}

/** Envía el archivo binario mostrando el avance de carga. */
function uploadLocalFile(file, start, end, duration, identityTrackId, outputProfile, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-jobs');
    const accessToken = accessTokenInput.value.trim();
    if (accessToken) xhr.setRequestHeader('authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-vdownloader-upload', '1');
    xhr.setRequestHeader('x-upload-name', encodeURIComponent(file.name));
    xhr.setRequestHeader('x-upload-duration', String(duration));
    xhr.setRequestHeader('x-upload-start', String(start));
    xhr.setRequestHeader('x-upload-end', String(end));
    xhr.setRequestHeader('x-video-format', outputProfile.format);
    xhr.setRequestHeader('x-video-codec', outputProfile.videoCodec);
    xhr.setRequestHeader('x-video-audio-codec', outputProfile.audioCodec);
    if (identityTrackId) xhr.setRequestHeader('x-identity-track-id', identityTrackId);
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    });
    xhr.addEventListener('load', () => {
      const response = (() => { try { return JSON.parse(xhr.responseText || '{}'); } catch { return {}; } })();
      if (xhr.status >= 200 && xhr.status < 300) resolve(response);
      else reject(new Error(apiError(response, 'upload.failed')));
    });
    xhr.addEventListener('error', () => reject(new Error(t('upload.network'))));
    xhr.addEventListener('abort', () => reject(new Error(t('upload.cancelled'))));
    xhr.send(file);
  });
}

/** Crea la tarea local después de validar el intervalo elegido. */
async function exportLocalClip() {
  if (!selectedLocalFile || localExportButton.classList.contains('disabled')) return;
  const start = Number(localExportButton.dataset.start);
  const end = Number(localExportButton.dataset.end);
  const duration = Number(localExportButton.dataset.duration);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    localUploadMessage.textContent = t('local.invalidExportRange');
    return;
  }
  const originalContent = localExportButton.innerHTML;
  localExportButton.disabled = true;
  try {
    const range = { start, end };
    let identityTrackId = null;
    if (identityEnabled.checked) {
      localExportButton.textContent = t('identity.preparing');
      identityTrackId = await registerIdentityTrack(range);
    }
    const job = await uploadLocalFile(selectedLocalFile, start, end, duration, identityTrackId, {
      format: videoOutputFormat.value,
      videoCodec: videoOutputCodec.value,
      audioCodec: videoAudioCodec.value
    }, (progress) => {
      localExportButton.textContent = t('upload.progress', { progress });
    });
    localExportButton.textContent = t('job.processing');
    localUploadMessage.textContent = t('upload.complete');
    localUploadMessage.className = 'local-upload-message success';
    refreshDownloadsPanel();
    await monitorJob(job, localJobsArea);
  } catch (error) {
    renderJobError(localJobsArea, error.message);
    localUploadMessage.textContent = error.message;
    localUploadMessage.className = 'local-upload-message';
  } finally {
    localExportButton.disabled = false;
    localExportButton.innerHTML = originalContent;
  }
}

/** Polls one job at the bounded interval until it becomes terminal. */
async function monitorJob(initialJob, jobsArea) {
  const card = document.createElement('section');
  card.className = 'job-card';
  const top = document.createElement('div');
  top.className = 'job-top';
  const status = document.createElement('strong');
  const percent = document.createElement('span');
  const actions = document.createElement('div');
  actions.className = 'job-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = t('actions.cancel');
  actions.append(percent, cancel);
  const progress = document.createElement('div');
  progress.className = 'job-progress';
  const bar = document.createElement('i');
  progress.append(bar);
  const detail = document.createElement('p');
  top.append(status, actions);
  card.append(top, progress, detail);
  jobsArea.replaceChildren(card);

  let job = initialJob;
  cancel.addEventListener('click', async () => {
    cancel.disabled = true;
    cancel.textContent = t('actions.cancelling');
    try { await apiFetch(`/api/jobs/${job.id}`, { method: 'DELETE' }); } catch {}
  });
  while (true) {
    const value = Math.max(0, Math.min(100, job.progress || 0));
    status.textContent = job.status === 'queued'
      ? t('job.queuedProgress')
      : (job.status === 'retrying'
          ? (['upload', 'audio'].includes(job.provider) ? t('job.checkingSource') : t('job.refreshingLink'))
          : t(job.mediaKind === 'audio' ? 'audio.processing' : 'job.preparingMp4'));
    percent.textContent = `${value}%`;
    bar.style.width = `${value}%`;
    detail.textContent = job.status === 'queued'
      ? t('job.waitingSlot')
      : (job.status === 'retrying'
          ? (['upload', 'audio'].includes(job.provider)
              ? t('job.preparingSource')
              : t('job.retry', { attempt: job.attempts, total: job.maxRetries + 1 }))
          : formatJobEta(job));

    if (job.status === 'ready') {
      status.textContent = t('job.ready');
      percent.textContent = formatBytes(job.size);
      detail.textContent = t(job.mediaKind === 'audio' ? 'audio.readyDescription' : 'job.readyDescription');
      cancel.remove();
      const download = document.createElement('a');
      download.className = 'download-ready';
      download.href = job.downloadUrl;
      download.textContent = t('actions.downloadFile');
      card.append(download);
      saveHistory(job);
      return;
    }
    if (job.status === 'cancelled') {
      card.classList.add('job-cancelled');
      status.textContent = t('job.cancelled');
      percent.textContent = '';
      detail.textContent = t('job.cancelledDescription');
      cancel.remove();
      return;
    }
    if (job.status === 'error') {
      throw new Error(getLanguage() === 'es' && job.error ? job.error : t('job.prepareFailed'));
    }
    await waitFor(JOB_POLL_INTERVAL_MS);
    const response = await apiFetch(`/api/jobs/${job.id}`, { cache: 'no-store' });
    if (response.status === 429) {
      const waitMilliseconds = retryAfterMilliseconds(response);
      detail.textContent = t('job.rateLimited', { seconds: Math.ceil(waitMilliseconds / 1_000) });
      await waitFor(waitMilliseconds);
      continue;
    }
    const nextJob = await response.json();
    if (!response.ok) throw new Error(apiError(nextJob, 'job.queryFailed'));
    job = nextJob;
  }
}

/** Presenta un error de tarea sin insertar HTML procedente del servidor. */
function renderJobError(jobsArea, text) {
  const error = document.createElement('div');
  error.className = 'job-card job-failed';
  const title = document.createElement('strong');
  title.textContent = t('job.errorTitle');
  const message = document.createElement('p');
  message.textContent = text;
  error.append(title, message);
  jobsArea.replaceChildren(error);
}

/** @returns {string} Bytes legibles en KB o MB. */
function formatBytes(value) {
  if (!Number.isFinite(value)) return t('format.ready');
  if (value < 1_048_576) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1_048_576).toFixed(1)} MB`;
}

/** Guarda como máximo seis tareas listas en localStorage. */
function saveHistory(job) {
  const entries = readHistory().filter((entry) => entry.id !== job.id);
  entries.unshift({ id: job.id, filename: job.filename, size: job.size, createdAt: Date.now() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, 6)));
  renderHistory();
}

/** Lee historial defensivamente; JSON inválido se considera historial vacío. */
function readHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

/** Valida IDs contra el servidor antes de mostrar enlaces del historial. */
async function renderHistory() {
  const cutoff = Date.now() - 60 * 60 * 1000;
  const candidates = readHistory().filter((entry) => entry.createdAt > cutoff);
  const checks = await Promise.all(candidates.map(async (entry) => {
    try {
      const response = await apiFetch(`/api/jobs/${entry.id}`, { cache: 'no-store' });
      const job = await response.json();
      return response.ok && job.status === 'ready' ? { ...entry, ...job } : null;
    } catch { return null; }
  }));
  const entries = checks.filter(Boolean);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.map(({ id, filename, size, createdAt }) => ({ id, filename, size, createdAt }))));
  historyList.replaceChildren();
  for (const entry of entries) {
    const item = document.createElement('article');
    const info = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = entry.filename;
    const meta = document.createElement('span');
    meta.textContent = `${formatBytes(entry.size)} · ${formatRelativeTime(entry.createdAt)}`;
    const link = document.createElement('a');
    link.href = entry.downloadUrl;
    link.textContent = t('actions.download');
    info.append(name, meta);
    item.append(info, link);
    historyList.append(item);
  }
  historyElement.hidden = entries.length === 0;
}

/** Convierte una marca temporal a “ahora” o “hace N min”. */
function formatRelativeTime(value) {
  const minutes = Math.max(0, Math.floor((Date.now() - value) / 60_000));
  if (minutes < 1) return t('time.now');
  return t('time.minutesAgo', { minutes });
}

/** Convierte etaSeconds a un mensaje corto para el usuario. */
function formatJobEta(job) {
  if (!Number.isFinite(job.etaSeconds) || job.etaSeconds <= 0) return t('eta.processing');
  if (job.etaSeconds < 60) return t('eta.seconds', { seconds: job.etaSeconds });
  return t('eta.minutes', { minutes: Math.ceil(job.etaSeconds / 60) });
}

/** Obtiene la fotografía global de tareas; los fallos transitorios no rompen UI. */
function refreshDownloadsPanel() {
  if (downloadsPanelRefreshPromise) return downloadsPanelRefreshPromise;
  downloadsPanelRefreshPromise = refreshDownloadsPanelOnce()
    .finally(() => { downloadsPanelRefreshPromise = null; });
  return downloadsPanelRefreshPromise;
}

async function refreshDownloadsPanelOnce() {
  try {
    const response = await apiFetch('/api/jobs', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) return;
    latestPanelJobs = data.jobs;
    const knownIds = new Set(data.jobs.map((job) => job.id));
    for (const id of selectedPanelJobs) if (!knownIds.has(id)) selectedPanelJobs.delete(id);
    adminRestartSelected.disabled = currentAccessRole !== 'admin' || selectedPanelJobs.size === 0;
    renderPanelStats(data.stats);
    renderPanelJobs(latestPanelJobs);
    downloadsPanel.hidden = false;
  } catch {}
}

/** Consulta el diagnóstico operativo sin bloquear el panel de tareas. */
async function refreshServiceHealth() {
  try {
    const response = await apiFetch('/api/health', { cache: 'no-store' });
    const health = await response.json();
    renderServiceHealth(health);
  } catch {
    renderServiceHealth({ status: 'offline', dependencies: {} });
  }
}

/** Muestra versiones y disponibilidad de herramientas y editores locales. */
function renderServiceHealth(health) {
  const dependencies = health.dependencies || {};
  if (Number(health.uploads?.maxBytes) > 0) maxUploadBytes = Number(health.uploads.maxBytes);
  const tokenRequired = Boolean(health.administration?.tokenRequired);
  currentAccessRole = health.administration?.role || 'none';
  const canAdminister = currentAccessRole === 'admin';
  for (const control of [adminRestartSelected, adminCleanExpired, adminRefreshAudit, adminTokenInput]) {
    control.disabled = !canAdminister || (control === adminRestartSelected && selectedPanelJobs.size === 0);
  }
  adminHint.textContent = tokenRequired
    ? t('admin.requiredHint')
    : t('admin.availableHint');
  adminTokenInput.placeholder = tokenRequired ? t('admin.enterToken') : t('admin.placeholder');
  const values = [
    [t('health.server'), health.status === 'ok', health.status === 'ok' ? t('health.operational') : t('health.degraded')],
    ['FFmpeg', dependencies.ffmpeg?.available, dependencies.ffmpeg?.version || t('health.unavailable')],
    ['yt-dlp', dependencies.ytDlp?.available, dependencies.ytDlp?.version || t('health.unavailable')],
    [t('health.localUpload'), health.uploads?.enabled, health.uploads?.enabled
      ? t('health.maximum', { size: formatBytes(maxUploadBytes) })
      : t('health.unavailable')],
    [t('health.protection'), health.identityProtection?.enabled, health.identityProtection?.enabled
      ? t('health.localPixelation')
      : t('health.unavailable')]
  ];
  dependencyHealth.replaceChildren(...values.map(([name, available, detail]) => {
    const chip = document.createElement('span');
    chip.className = `health-chip${available ? '' : ' offline'}`;
    chip.textContent = `${name} · ${detail}`;
    return chip;
  }));
}

/** Renderiza concurrencia, cola, archivos y cuota de almacenamiento. */
function renderPanelStats(stats) {
  panelConfig.textContent = t('panel.configuration', {
    concurrent: stats.maxConcurrent,
    retries: stats.maxRetries,
    minutes: stats.ttlMinutes || 60
  });
  const values = [
    [t('stats.active'), stats.active],
    [t('stats.queued'), stats.queued],
    [t('stats.ready'), stats.ready],
    [t('stats.space'), `${formatBytes(stats.storedBytes ?? stats.readyBytes)} / ${formatBytes(stats.storageLimitBytes)}`]
  ];
  panelStats.replaceChildren(...values.map(([label, value]) => {
    const item = document.createElement('div');
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    item.append(strong, span);
    return item;
  }));
}

/** Construye la cabecera administrativa sin exponer el token en la URL. */
function adminHeaders() {
  const token = adminTokenInput.value.trim();
  return {
    'x-vdownloader-admin': '1',
    ...(token ? { 'x-admin-token': token } : {})
  };
}

/** Returns the jobs visible under the current client-side panel filters. */
function filteredPanelJobs(jobs) {
  const now = Date.now();
  const maximumAge = { today: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000, month: 30 * 24 * 60 * 60 * 1000 }[panelDateFilter.value];
  return jobs.filter((job) => (!panelStatusFilter.value || job.status === panelStatusFilter.value)
    && (!panelProviderFilter.value || job.provider === panelProviderFilter.value)
    && (!maximumAge || now - job.createdAt <= maximumAge));
}

/** Restarts every selected job in one audited server operation. */
async function restartSelectedJobs() {
  const ids = [...selectedPanelJobs];
  if (!ids.length || !window.confirm(t('admin.bulkConfirm', { count: ids.length }))) return;
  adminRestartSelected.disabled = true;
  try {
    const response = await apiFetch('/api/admin/jobs/restart', {
      method: 'POST',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ ids })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(apiError(body, 'admin.bulkFailed'));
    selectedPanelJobs.clear();
    panelMessage.textContent = t('admin.bulkResult', { count: body.restarted });
    panelMessage.className = 'panel-message success';
    await refreshDownloadsPanel();
  } catch (error) {
    panelMessage.textContent = error.message;
    panelMessage.className = 'panel-message error';
  } finally {
    adminRestartSelected.disabled = currentAccessRole !== 'admin' || selectedPanelJobs.size === 0;
  }
}

/** Removes only jobs that have exceeded the configured retention period. */
async function cleanExpiredJobs() {
  if (!window.confirm(t('admin.cleanupConfirm'))) return;
  adminCleanExpired.disabled = true;
  try {
    const response = await apiFetch('/api/admin/jobs/cleanup', {
      method: 'POST',
      headers: { ...adminHeaders(), 'content-type': 'application/json' },
      body: JSON.stringify({ scope: 'expired' })
    });
    const body = await response.json();
    if (!response.ok) throw new Error(apiError(body, 'admin.cleanupFailed'));
    panelMessage.textContent = t('admin.cleanupResult', { count: body.removed, size: formatBytes(body.freedBytes) });
    panelMessage.className = 'panel-message success';
    await refreshDownloadsPanel();
    renderHistory();
  } catch (error) {
    panelMessage.textContent = error.message;
    panelMessage.className = 'panel-message error';
  } finally {
    adminCleanExpired.disabled = false;
  }
}

/** Loads the in-memory administrative audit trail without exposing secrets. */
async function refreshAuditLog() {
  try {
    const response = await apiFetch('/api/admin/audit', { headers: adminHeaders(), cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(apiError(body, 'admin.bulkFailed'));
    adminAudit.hidden = false;
    adminAudit.replaceChildren(...(body.events.length ? body.events : [{ action: t('admin.auditEmpty'), at: Date.now() }]).map((event) => {
      const row = document.createElement('p');
      row.textContent = `${new Date(event.at).toLocaleString()} · ${event.actor || 'local'} · ${event.action}${event.count != null ? ` · ${event.count}` : ''}`;
      return row;
    }));
  } catch (error) {
    panelMessage.textContent = error.message;
    panelMessage.className = 'panel-message error';
  }
}

/**
 * Solicita al servidor reiniciar una tarea y comunica el resultado.
 * El backend conserva calidad/recorte y renueva las URLs temporales.
 */
async function requestJobRestart(job, control) {
  const confirmed = window.confirm(t('admin.confirmRestart', { filename: job.filename }));
  if (!confirmed) return;
  control.disabled = true;
  control.textContent = t('admin.restarting');
  panelMessage.textContent = '';
  try {
    const response = await apiFetch(`/api/jobs/${job.id}/restart`, {
      method: 'POST',
      headers: adminHeaders()
    });
    const data = await response.json();
    if (!response.ok) throw new Error(apiError(data, 'admin.restartFailed'));
    panelMessage.textContent = t('admin.requeued');
    panelMessage.className = 'panel-message success';
    await refreshDownloadsPanel();
    renderHistory();
  } catch (error) {
    panelMessage.textContent = error.message;
    panelMessage.className = 'panel-message error';
    control.disabled = false;
    control.textContent = t('actions.restart');
  }
}

/** Crea filas del panel y conecta acciones cancelar/descargar/eliminar. */
function renderPanelJobs(jobs) {
  const visibleJobs = filteredPanelJobs(jobs);
  if (!visibleJobs.length) {
    const empty = document.createElement('p');
    empty.className = 'panel-empty';
    empty.textContent = t('panel.empty');
    panelJobs.replaceChildren(empty);
    return;
  }
  panelJobs.replaceChildren(...visibleJobs.map((job) => {
    const item = document.createElement('article');
    item.className = `panel-job status-${job.status}`;
    const selection = document.createElement('label');
    selection.className = 'panel-job-select';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedPanelJobs.has(job.id);
    checkbox.setAttribute('aria-label', job.filename);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedPanelJobs.add(job.id);
      else selectedPanelJobs.delete(job.id);
      adminRestartSelected.disabled = currentAccessRole !== 'admin' || selectedPanelJobs.size === 0;
    });
    selection.append(checkbox);
    const info = document.createElement('div');
    info.className = 'panel-job-info';
    const name = document.createElement('strong');
    name.textContent = job.filename;
    const meta = document.createElement('span');
    const statusText = {
      queued: t('status.queued'), processing: `${job.progress}% · ${formatJobEta(job).replace(/\.$/, '')}`,
      retrying: ['upload', 'audio'].includes(job.provider)
        ? t('status.checkingSource')
        : t('status.refreshing', { attempt: job.attempts, total: job.maxRetries + 1 }),
      restarting: t('status.restarting'),
      ready: t('status.ready', { size: formatBytes(job.size) }),
      error: getLanguage() === 'es' && job.error ? job.error : 'Error',
      cancelled: t('status.cancelled')
    }[job.status] || job.status;
    meta.textContent = `${PROVIDER_NAMES[job.provider] || job.provider || t('generic.video')} · ${localizeBackendLabel(job.quality)} · ${statusText}`;
    const progress = document.createElement('div');
    progress.className = 'panel-job-progress';
    const bar = document.createElement('i');
    bar.style.width = `${job.status === 'ready' ? 100 : job.progress || 0}%`;
    progress.append(bar);
    info.append(name, meta, progress);
    if (job.events?.length) {
      const history = document.createElement('details');
      history.className = 'job-events';
      const summary = document.createElement('summary');
      summary.textContent = t('admin.events', { count: job.events.length });
      const list = document.createElement('ul');
      for (const event of job.events.slice(-8).reverse()) {
        const row = document.createElement('li');
        row.textContent = `${new Date(event.at).toLocaleString()} · ${localizeBackendLabel(event.type)}`;
        list.append(row);
      }
      history.append(summary, list);
      info.append(history);
    }
    const actions = document.createElement('div');
    actions.className = 'panel-job-actions';
    if (['queued', 'processing', 'retrying', 'restarting'].includes(job.status)) {
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.textContent = t('actions.cancel');
      cancel.addEventListener('click', async () => {
        cancel.disabled = true;
        await apiFetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
        refreshDownloadsPanel();
      });
      actions.append(cancel);
    }
    if (job.status === 'ready') {
      const download = document.createElement('a');
      download.href = job.downloadUrl;
      download.textContent = t('actions.download');
      download.addEventListener('click', async (event) => {
        if (!accessTokenInput.value.trim()) return;
        event.preventDefault();
        download.classList.add('disabled');
        try {
          const response = await apiFetch(job.downloadUrl);
          if (!response.ok) throw new Error(t('job.queryFailed'));
          const objectUrl = URL.createObjectURL(await response.blob());
          const temporary = document.createElement('a');
          temporary.href = objectUrl;
          temporary.download = job.filename;
          temporary.click();
          setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
        } catch (error) {
          panelMessage.textContent = error.message;
          panelMessage.className = 'panel-message error';
        } finally {
          download.classList.remove('disabled');
        }
      });
      actions.append(download);
    }
    if (job.status !== 'restarting') {
      const restart = document.createElement('button');
      restart.type = 'button';
      restart.textContent = t('actions.restart');
      restart.title = t('restart.title');
      restart.addEventListener('click', () => requestJobRestart(job, restart));
      actions.append(restart);
    }
    if (['ready', 'error', 'cancelled'].includes(job.status)) {
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = t('actions.remove');
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        await apiFetch(`/api/jobs/${job.id}`, { method: 'DELETE' });
        refreshDownloadsPanel();
        renderHistory();
      });
      actions.append(remove);
    }
    item.append(selection, info, actions);
    return item;
  }));
}

/** Crea un campo HH:MM:SS con botones de precisión de cinco segundos. */
function createTimeField(labelText, value) {
  const wrapper = document.createElement('label');
  wrapper.className = 'time-field';
  const label = document.createElement('span');
  label.textContent = labelText;
  const control = document.createElement('div');
  control.className = 'time-input';
  const minus = document.createElement('button');
  minus.type = 'button';
  minus.textContent = '−5';
  minus.title = t('time.subtractFive');
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'numeric';
  input.placeholder = '00:00';
  input.value = value;
  input.setAttribute('aria-label', t('time.inputAria', { label: labelText }));
  const plus = document.createElement('button');
  plus.type = 'button';
  plus.textContent = '+5';
  plus.title = t('time.addFive');
  control.append(minus, input, plus);
  wrapper.append(label, control);
  return { wrapper, input, minus, plus };
}

/** Crea un input range accesible expresado en segundos. */
function createRange(maximum, value, label) {
  const input = document.createElement('input');
  input.type = 'range';
  input.min = '0';
  input.max = String(maximum);
  input.step = '1';
  input.value = String(value);
  input.setAttribute('aria-label', label);
  return input;
}

/** @returns {number|null} HH:MM:SS o MM:SS convertido a segundos. */
function parseTime(value) {
  const parts = value.trim().split(':');
  if (parts.length < 2 || parts.length > 3 || parts.some((part) => !/^\d+$/.test(part))) return null;
  const numbers = parts.map(Number);
  const seconds = numbers.pop();
  const minutes = numbers.pop();
  const hours = numbers.pop() || 0;
  if (seconds > 59 || minutes > 59) return null;
  return hours * 3600 + minutes * 60 + seconds;
}

/** @returns {string} Segundos convertidos a MM:SS o HH:MM:SS. */
function formatTime(value) {
  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts = [minutes, seconds];
  if (hours) parts.unshift(hours);
  return parts.map((part, index) => index === 0 ? String(part) : String(part).padStart(2, '0')).join(':');
}
