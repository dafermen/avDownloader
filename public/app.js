import { FaceDetector, FilesetResolver } from '/vendor/mediapipe/vision_bundle.mjs';
import {
  apiError,
  getLanguage,
  initializeI18n,
  localizeBackendLabel,
  t
} from '/i18n.js?v=16';

initializeI18n();

// Referencias estables a la interfaz. Se consultan una sola vez porque estos
// nodos existen durante toda la vida de la página.
const form = document.querySelector('#analyze-form');
const input = document.querySelector('#video-url');
const batchMode = document.querySelector('#batch-mode');
const batchUrls = document.querySelector('#video-urls');
const button = document.querySelector('#submit-button');
const message = document.querySelector('#form-message');
const result = document.querySelector('#result');
const guidedGoalButtons = [...document.querySelectorAll('[data-guided-goal]')];
const guidedUseLink = document.querySelector('#guided-use-link');
const guidedUseLocal = document.querySelector('#guided-use-local');
const guidedHint = document.querySelector('#guided-hint');
const guidedStepItems = [...document.querySelectorAll('.guided-steps li')];
const historyElement = document.querySelector('#history');
const historyList = document.querySelector('#history-list');
const clearHistoryButton = document.querySelector('#clear-history');
const downloadsPanel = document.querySelector('#downloads-panel');
const readyCounter = document.querySelector('#ready-counter');
const notificationEnabledControl = document.querySelector('#notification-enabled');
const notificationSoundControl = document.querySelector('#notification-sound');
const downloadDiagnosticsButton = document.querySelector('#download-diagnostics');
const panelConfig = document.querySelector('#panel-config');
const dependencyHealth = document.querySelector('#dependency-health');
const adminTokenInput = document.querySelector('#admin-token');
const accessTokenInput = document.querySelector('#access-token');
const validateAccessTokenButton = document.querySelector('#validate-access-token');
const accessValidationResult = document.querySelector('#access-validation-result');
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
const localToolButtons = [...document.querySelectorAll('[data-local-tool]')];
const localVideoToolCard = document.querySelector('#local-video-tool-card');
const localAudioToolCard = document.querySelector('#local-audio-tool-card');
const subtitleToolCard = document.querySelector('#subtitle-tool-card');
const localToolEyebrow = document.querySelector('#local-tool-eyebrow');
const localUploadTitle = document.querySelector('#local-upload-title');
const localToolDescription = document.querySelector('#local-tool-description');
const localVideoSelectLabel = document.querySelector('#local-video-select-label');
const localVideoFile = document.querySelector('#local-video-file');
const localUploadMessage = document.querySelector('#local-upload-message');
const localEditor = document.querySelector('#local-editor');
const localVideoPreview = document.querySelector('#local-video-preview');
const identityPreview = document.querySelector('#identity-preview');
const localFileName = document.querySelector('#local-file-name');
const localFileMeta = document.querySelector('#local-file-meta');
const localClipMount = document.querySelector('#local-clip-mount');
const localExportMode = document.querySelector('#local-export-mode');
const videoOutputSettings = document.querySelector('#video-output-settings');
const videoOutputFormat = document.querySelector('#video-output-format');
const videoOutputCodec = document.querySelector('#video-output-codec');
const videoAudioCodec = document.querySelector('#video-audio-codec');
const videoOutputHint = document.querySelector('#video-output-hint');
const videoAudioExtractionSettings = document.querySelector('#video-audio-extraction-settings');
const videoAudioOutputFormat = document.querySelector('#video-audio-output-format');
const videoAudioOutputCodec = document.querySelector('#video-audio-output-codec');
const videoAudioOutputBitrate = document.querySelector('#video-audio-output-bitrate');
const videoAudioExtractionHint = document.querySelector('#video-audio-extraction-hint');
const localExportSummary = document.querySelector('#local-export-summary');
const localExportSummaryText = document.querySelector('#local-export-summary-text');
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
const audioExportSummary = document.querySelector('#audio-export-summary');
const audioExportSummaryText = document.querySelector('#audio-export-summary-text');
const audioExportButton = document.querySelector('#audio-export-button');
const audioJobsArea = document.querySelector('#audio-jobs-area');
const subtitleSourceYoutube = document.querySelector('#subtitle-source-youtube');
const subtitleSourceLocal = document.querySelector('#subtitle-source-local');
const subtitleYoutubePanel = document.querySelector('#subtitle-youtube-panel');
const subtitleLocalPanel = document.querySelector('#subtitle-local-panel');
const subtitleUrlForm = document.querySelector('#subtitle-url-form');
const subtitleUrl = document.querySelector('#subtitle-url');
const subtitleAnalyzeButton = document.querySelector('#subtitle-analyze-button');
const subtitleRemoteEditor = document.querySelector('#subtitle-remote-editor');
const subtitleRemoteTitle = document.querySelector('#subtitle-remote-title');
const subtitleTrack = document.querySelector('#subtitle-track');
const subtitleRemoteFormat = document.querySelector('#subtitle-remote-format');
const subtitleRemoteSummary = document.querySelector('#subtitle-remote-summary');
const subtitleRemoteSummaryText = document.querySelector('#subtitle-remote-summary-text');
const subtitleRemoteExport = document.querySelector('#subtitle-remote-export');
const subtitleVideoFile = document.querySelector('#subtitle-video-file');
const subtitleLocalPickerLabel = document.querySelector('#subtitle-local-picker-label');
const subtitleLocalEditor = document.querySelector('#subtitle-local-editor');
const subtitleVideoPreview = document.querySelector('#subtitle-video-preview');
const subtitleAudioPreview = document.querySelector('#subtitle-audio-preview');
const subtitleLocalName = document.querySelector('#subtitle-local-name');
const subtitleLocalMeta = document.querySelector('#subtitle-local-meta');
const subtitleClipMount = document.querySelector('#subtitle-clip-mount');
const subtitleModeExisting = document.querySelector('#subtitle-mode-existing');
const subtitleModeGenerate = document.querySelector('#subtitle-mode-generate');
const subtitleModeCompose = document.querySelector('#subtitle-mode-compose');
const subtitleLocalTrackField = document.querySelector('#subtitle-local-track-field');
const subtitleLocalTrack = document.querySelector('#subtitle-local-track');
const subtitleLocalFormat = document.querySelector('#subtitle-local-format');
const subtitleTranscriptionSettings = document.querySelector('#subtitle-transcription-settings');
const subtitleTranscriptionLanguage = document.querySelector('#subtitle-transcription-language');
const subtitleTranscriptionModel = document.querySelector('#subtitle-transcription-model');
const subtitleLocalHint = document.querySelector('#subtitle-local-hint');
const subtitleLocalSummary = document.querySelector('#subtitle-local-summary');
const subtitleLocalSummaryText = document.querySelector('#subtitle-local-summary-text');
const subtitleLocalExport = document.querySelector('#subtitle-local-export');
const subtitleWorkshop = document.querySelector('#subtitle-workshop');
const subtitleCaptionFile = document.querySelector('#subtitle-caption-file');
const subtitleAddCue = document.querySelector('#subtitle-add-cue');
const subtitleTranslate = document.querySelector('#subtitle-translate');
const subtitlePreviewToggle = document.querySelector('#subtitle-preview-toggle');
const subtitleCueList = document.querySelector('#subtitle-cue-list');
const subtitleDownloadSrt = document.querySelector('#subtitle-download-srt');
const subtitleComposeSelectable = document.querySelector('#subtitle-compose-selectable');
const subtitleComposeBurned = document.querySelector('#subtitle-compose-burned');
const subtitleMessage = document.querySelector('#subtitle-message');
const subtitleJobsArea = document.querySelector('#subtitle-jobs-area');
const identityCard = document.querySelector('#identity-card');
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
const SUBTITLE_NOTICE_DISMISS_MS = 8_000;
const SUBTITLE_RESULT_DISMISS_MS = 3_000;
const UI_DISMISS_ANIMATION_MS = 200;
const DEFAULT_RATE_LIMIT_RETRY_MS = 60_000;
const PROVIDER_NAMES = {
  youtube: 'YouTube',
  xvideos: 'XVideos',
  pornhub: 'Pornhub',
  xnxx: 'XNXX',
  upload: t('provider.upload'),
  audio: t('provider.audio'),
  subtitle: t('provider.subtitle'),
  transcription: t('provider.transcription'),
  'subtitle-compose': t('provider.subtitleCompose')
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
const SUBTITLE_VIDEO_EXTENSIONS = new Set(['.mp4', '.m4v', '.mov', '.webm']);
const SUBTITLE_AUDIO_EXTENSIONS = new Set(['.mp3', '.m4a', '.aac', '.wav', '.flac', '.ogg', '.opus']);
const SUBTITLE_VIDEO_ACCEPT = '.mp4,.m4v,.mov,.webm,video/mp4,video/quicktime,video/webm';
const SUBTITLE_MEDIA_ACCEPT = `${SUBTITLE_VIDEO_ACCEPT},.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus,audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/flac,audio/ogg,audio/opus`;
let localObjectUrl = null;
let selectedLocalFile = null;
let localClipControls = null;
let selectedLocalTool = 'video';
let audioObjectUrl = null;
let selectedAudioFile = null;
let selectedAudioSources = [];
let activeAudioSourceIndex = 0;
let audioClipControls = null;
let subtitleSourceMode = 'youtube';
let subtitleLocalMode = 'existing';
let subtitleRemoteTracks = [];
let subtitleRemoteVideoTitle = '';
let selectedSubtitleFile = null;
let subtitleObjectUrl = null;
let subtitleClipControls = null;
let editableSubtitleCues = [];
let subtitlePreviewTrackUrl = null;
let subtitlePreviewEnabled = true;
let identityDetector = null;
let identityAnalysis = null;
let identityPreviewFrame = null;
let identityDetectionTimestamp = 0;
let identityEditMode = false;
let identitySelectedRegion = null;
let identityPointerOperation = null;
let identityReviewRunning = false;
const identityPixelBuffer = document.createElement('canvas');
let maxUploadBytes = null;
let maxTranscriptionMinutes = 180;
let uploadSettingsPromise = null;
let latestPanelJobs = [];
let latestPanelStats = null;
let panelJobsInitialized = false;
const notifiedReadyJobs = new Set();
let currentAccessRole = 'admin';
const selectedPanelJobs = new Set();
let rejectedAccessToken = '';
let accessTokenPending = false;
let apiRetryAt = 0;
let downloadsPanelRefreshPromise = null;
let subtitleMessageTimer = null;
let guidedGoal = 'video';
const NOTIFICATION_ENABLED_KEY = 'vdownloader-notifications-v1';
const NOTIFICATION_SOUND_KEY = 'vdownloader-notification-sound-v1';

try {
  notificationEnabledControl.checked = localStorage.getItem(NOTIFICATION_ENABLED_KEY) === 'true';
  notificationSoundControl.checked = localStorage.getItem(NOTIFICATION_SOUND_KEY) === 'true';
} catch {}

// El token se conserva solo durante la pestaña actual. No se escribe en el
// historial persistente del navegador ni se incorpora a URLs.
try { adminTokenInput.value = sessionStorage.getItem(ADMIN_TOKEN_KEY) || ''; } catch {}
try { accessTokenInput.value = sessionStorage.getItem(ACCESS_TOKEN_KEY) || ''; } catch {}
adminTokenInput.addEventListener('input', () => {
  try { sessionStorage.setItem(ADMIN_TOKEN_KEY, adminTokenInput.value); } catch {}
});
accessTokenInput.addEventListener('input', () => {
  accessTokenPending = true;
  adminHint.textContent = t('security.pending');
  showAccessValidation('pending', t('security.pending'));
});
function showAccessValidation(state, message) {
  accessValidationResult.hidden = false;
  accessValidationResult.dataset.state = state;
  accessValidationResult.textContent = message;
}

validateAccessTokenButton.addEventListener('click', async () => {
  if (validateAccessTokenButton.disabled) return;
  const submittedToken = accessTokenInput.value.trim();
  if (!submittedToken) {
    showAccessValidation('error', t('security.emptyToken'));
    return;
  }
  if (Date.now() < apiRetryAt) {
    showAccessValidation('error', accessRetryMessage());
    return;
  }
  accessTokenPending = false;
  rejectedAccessToken = '';
  accessTokenInput.value = submittedToken;
  validateAccessTokenButton.disabled = true;
  validateAccessTokenButton.textContent = t('security.validating');
  showAccessValidation('pending', t('security.validating'));
  try {
    const result = await refreshServiceHealth();
    if (accessTokenPending || accessTokenInput.value.trim() !== submittedToken) return;
    if (result.authenticated) {
      try { sessionStorage.setItem(ACCESS_TOKEN_KEY, submittedToken); } catch {}
      showAccessValidation('success', t(result.ok ? 'security.validated' : 'security.validatedDegraded'));
      refreshDownloadsPanel();
    } else {
      try { sessionStorage.removeItem(ACCESS_TOKEN_KEY); } catch {}
      showAccessValidation('error', result.message);
    }
  } finally {
    validateAccessTokenButton.disabled = false;
    validateAccessTokenButton.textContent = t('security.validate');
  }
});

function accessRetryMessage() {
  return t('security.rateLimited', { minutes: Math.max(1, Math.ceil((apiRetryAt - Date.now()) / 60_000)) });
}

function recordApiRetry(response) {
  if (response.status !== 429) return;
  const seconds = Number(response.headers.get('retry-after'));
  apiRetryAt = Math.max(apiRetryAt, Date.now() + (Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 900) : 60) * 1000);
}

function uploadAccessToken() {
  if (accessTokenInput.value.trim() === rejectedAccessToken && rejectedAccessToken) throw new Error(t('security.invalidToken'));
  if (accessTokenPending) throw new Error(t('security.pending'));
  if (Date.now() < apiRetryAt) throw new Error(accessRetryMessage());
  return accessTokenInput.value.trim();
}

/** Adds the remote bearer credential without placing it in URLs or persistent storage. */
async function apiFetch(resource, options = {}) {
  if (accessTokenPending || Date.now() < apiRetryAt) {
    return new Response(JSON.stringify({ error: accessTokenPending ? t('security.pending') : accessRetryMessage() }), {
      status: accessTokenPending ? 401 : 429,
      headers: { 'content-type': 'application/json', 'retry-after': String(Math.max(1, Math.ceil((apiRetryAt - Date.now()) / 1000))) }
    });
  }
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
  recordApiRetry(response);
  if (response.status === 401 && token && token === accessTokenInput.value.trim() && !accessTokenPending) rejectedAccessToken = token;
  return response;
}

/**
 * Obtains a short-lived HttpOnly capability and lets the browser stream the
 * file directly to disk. This avoids placing the native access token in the
 * URL and avoids buffering multi-gigabyte outputs in a JavaScript Blob.
 */
async function startJobDownload(job, link, errorTarget = panelMessage) {
  if (!job?.id || !job.downloadUrl || link.dataset.downloadBusy === 'true') return false;
  const originalText = link.textContent;
  link.dataset.downloadBusy = 'true';
  link.classList.add('disabled');
  link.setAttribute('aria-disabled', 'true');
  link.textContent = t('download.authorizing');
  try {
    const response = await apiFetch(`/api/jobs/${job.id}/download-access`, {
      method: 'POST',
      headers: { 'x-vdownloader-download': '1' }
    });
    let body = null;
    try { body = await response.json(); } catch {}
    if (!response.ok || body?.downloadUrl !== job.downloadUrl) {
      throw new Error(apiError(body, 'download.authorizationFailed'));
    }
    const temporary = document.createElement('a');
    temporary.href = body.downloadUrl;
    temporary.download = job.filename;
    temporary.hidden = true;
    document.body.append(temporary);
    temporary.click();
    temporary.remove();
    return true;
  } catch (error) {
    if (errorTarget) {
      errorTarget.textContent = error.message || t('download.authorizationFailed');
      if (errorTarget === panelMessage) errorTarget.className = 'panel-message error';
    }
    return false;
  } finally {
    delete link.dataset.downloadBusy;
    link.classList.remove('disabled');
    link.removeAttribute('aria-disabled');
    link.textContent = originalText;
  }
}

/** Adds the authenticated streaming-download behavior to a visible link. */
function configureDownloadLink(link, job, errorTarget = panelMessage) {
  link.href = job.downloadUrl;
  link.addEventListener('click', async (event) => {
    event.preventDefault();
    const started = await startJobDownload(job, link, errorTarget);
    if (started) link.dispatchEvent(new Event('vdownloader:download-started'));
  });
}

/** Updates the tab and compact badge without revealing filenames. */
function updateReadyCounter(jobs) {
  const count = jobs.filter((job) => job.status === 'ready').length;
  readyCounter.hidden = count === 0;
  readyCounter.textContent = String(count);
  readyCounter.title = t('notifications.readyCount', { count });
  document.title = count ? `(${count}) vDownloader` : 'vDownloader';
}

/** Plays a short local tone; browser autoplay rejection is intentionally ignored. */
function playCompletionSound() {
  if (!notificationSoundControl.checked) return;
  try {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const context = new Context();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.3);
    oscillator.addEventListener('ended', () => context.close(), { once: true });
  } catch {}
}

/** Emits at most one completion alert per job and browser page lifetime. */
function notifyJobReady(job) {
  if (!job?.id || notifiedReadyJobs.has(job.id)) return;
  notifiedReadyJobs.add(job.id);
  if (notificationEnabledControl.checked && window.Notification?.permission === 'granted') {
    try { new Notification(t('notifications.readyTitle'), { body: t('notifications.readyBody'), tag: `vdownloader-${job.id}` }); } catch {}
  }
  playCompletionSound();
}

notificationEnabledControl.addEventListener('change', async () => {
  if (notificationEnabledControl.checked) {
    if (!('Notification' in window)) {
      notificationEnabledControl.checked = false;
      panelMessage.textContent = t('notifications.unsupported');
      panelMessage.className = 'panel-message error';
    } else if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      notificationEnabledControl.checked = permission === 'granted';
      if (permission !== 'granted') {
        panelMessage.textContent = t('notifications.denied');
        panelMessage.className = 'panel-message error';
      }
    }
  }
  try { localStorage.setItem(NOTIFICATION_ENABLED_KEY, String(notificationEnabledControl.checked)); } catch {}
});

notificationSoundControl.addEventListener('change', () => {
  try { localStorage.setItem(NOTIFICATION_SOUND_KEY, String(notificationSoundControl.checked)); } catch {}
  if (notificationSoundControl.checked) playCompletionSound();
});

downloadDiagnosticsButton.addEventListener('click', async () => {
  downloadDiagnosticsButton.disabled = true;
  const original = downloadDiagnosticsButton.textContent;
  downloadDiagnosticsButton.textContent = t('diagnostics.preparing');
  try {
    const response = await apiFetch('/api/diagnostics', {
      headers: { 'x-vdownloader-diagnostics': '1' }, cache: 'no-store'
    });
    if (!response.ok) {
      let body = null;
      try { body = await response.json(); } catch {}
      throw new Error(apiError(body, 'diagnostics.failed'));
    }
    const blob = await response.blob();
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `vdownloader-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1_000);
    panelMessage.textContent = t('diagnostics.ready');
    panelMessage.className = 'panel-message success';
  } catch (error) {
    panelMessage.textContent = error.message;
    panelMessage.className = 'panel-message error';
  } finally {
    downloadDiagnosticsButton.disabled = false;
    downloadDiagnosticsButton.textContent = original;
  }
});

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

/** Selects the user's intended result before asking for its source. */
function selectGuidedGoal(goal) {
  if (!['video', 'audio', 'subtitle', 'identity'].includes(goal)) return;
  guidedGoal = goal;
  for (const control of guidedGoalButtons) {
    const selected = control.dataset.guidedGoal === goal;
    control.classList.toggle('is-active', selected);
    control.setAttribute('aria-pressed', String(selected));
  }
  setTranslatedText(guidedHint, `guided.hint.${goal}`);
  guidedUseLink.disabled = goal === 'identity';
  setGuidedStep(1);
}

/** Reflects the current quick-start step without controlling the underlying tools. */
function setGuidedStep(step) {
  guidedStepItems.forEach((item, index) => {
    item.classList.toggle('is-current', index === step - 1);
    item.classList.toggle('is-complete', index < step - 1);
  });
}

/** Moves to the correct existing local editor without duplicating its logic. */
function openGuidedLocalSource() {
  const targetTool = guidedGoal === 'audio'
    ? 'extract'
    : guidedGoal === 'subtitle'
      ? 'subtitle'
      : 'video';
  selectLocalTool(targetTool);
  if (guidedGoal === 'identity') {
    localUploadMessage.textContent = t('guided.identityNext');
    localUploadMessage.className = 'local-upload-message loading';
  }
}

for (const control of guidedGoalButtons) {
  control.addEventListener('click', () => selectGuidedGoal(control.dataset.guidedGoal));
}
guidedUseLink.addEventListener('click', () => {
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  input.focus({ preventScroll: true });
});
guidedUseLocal.addEventListener('click', openGuidedLocalSource);
batchMode.addEventListener('change', () => {
  batchUrls.hidden = !batchMode.checked;
  input.required = !batchMode.checked;
  batchUrls.required = batchMode.checked;
  if (batchMode.checked) batchUrls.focus();
});

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
localVideoFile.addEventListener('click', () => { localVideoFile.value = ''; });
localVideoFile.addEventListener('change', () => loadSelectedLocalVideo());
localExportButton.addEventListener('click', exportLocalClip);
localExportMode.addEventListener('change', updateLocalExportModeUi);
for (const toolButton of localToolButtons) {
  toolButton.addEventListener('click', () => selectLocalTool(toolButton.dataset.localTool));
}
videoOutputFormat.addEventListener('change', () => { updateVideoFormatUi(); updateLocalExportSummary(); });
videoOutputCodec.addEventListener('change', () => { updateVideoAudioCodecUi(); updateLocalExportSummary(); });
videoAudioCodec.addEventListener('change', updateLocalExportSummary);
videoAudioOutputFormat.addEventListener('change', () => { updateVideoAudioExtractionUi(); updateLocalExportSummary(); });
videoAudioOutputCodec.addEventListener('change', () => { updateVideoAudioExtractionUi(); updateLocalExportSummary(); });
videoAudioOutputBitrate.addEventListener('change', updateLocalExportSummary);
localAudioFile.addEventListener('change', loadSelectedLocalAudio);
audioExportButton.addEventListener('click', exportLocalAudio);
audioOutputFormat.addEventListener('change', () => { updateAudioFormatUi(); updateAudioExportSummary(); });
audioOutputCodec.addEventListener('change', () => { updateAudioFormatUi(); updateAudioExportSummary(); });
audioOutputBitrate.addEventListener('change', updateAudioExportSummary);
subtitleSourceYoutube.addEventListener('click', () => selectSubtitleSource('youtube'));
subtitleSourceLocal.addEventListener('click', () => selectSubtitleSource('local'));
subtitleUrlForm.addEventListener('submit', analyzeSubtitleUrl);
subtitleTrack.addEventListener('change', updateRemoteSubtitleSummary);
subtitleRemoteFormat.addEventListener('change', updateRemoteSubtitleSummary);
subtitleRemoteExport.addEventListener('click', exportRemoteSubtitles);
subtitleVideoFile.addEventListener('click', () => { subtitleVideoFile.value = ''; });
subtitleVideoFile.addEventListener('change', loadSelectedSubtitleMedia);
subtitleModeExisting.addEventListener('click', () => selectLocalSubtitleMode('existing'));
subtitleModeGenerate.addEventListener('click', () => selectLocalSubtitleMode('generate'));
subtitleModeCompose.addEventListener('click', () => selectLocalSubtitleMode('compose'));
subtitleLocalTrack.addEventListener('change', updateLocalSubtitleSummary);
subtitleLocalFormat.addEventListener('change', updateLocalSubtitleSummary);
subtitleTranscriptionLanguage.addEventListener('change', updateLocalSubtitleSummary);
subtitleTranscriptionModel.addEventListener('change', updateLocalSubtitleSummary);
subtitleLocalExport.addEventListener('click', exportLocalSubtitles);
subtitleCaptionFile.addEventListener('change', importEditableSubtitleFile);
subtitleAddCue.addEventListener('click', addEditableSubtitleCue);
subtitleTranslate.addEventListener('click', translateEditableSubtitles);
subtitlePreviewToggle.addEventListener('click', toggleEditableSubtitlePreview);
subtitleDownloadSrt.addEventListener('click', downloadEditableSrt);
subtitleComposeSelectable.addEventListener('click', () => exportSubtitleComposition('selectable'));
subtitleComposeBurned.addEventListener('click', () => exportSubtitleComposition('burned'));
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
  if (subtitleObjectUrl) URL.revokeObjectURL(subtitleObjectUrl);
  if (subtitlePreviewTrackUrl) URL.revokeObjectURL(subtitlePreviewTrackUrl);
});
updateVideoFormatUi();
updateAudioFormatUi();
updateVideoAudioExtractionUi();
selectLocalTool('video', { scroll: false });
selectSubtitleSource('youtube');
selectLocalSubtitleMode('existing');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  setLoading(true);
  result.hidden = true;
  result.replaceChildren();
  const urls = batchMode.checked
    ? [...new Set(batchUrls.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean))]
    : [input.value.trim()];
  try {
    if (!urls.length) throw new Error(t('batch.empty'));
    if (urls.length > 10) throw new Error(t('batch.tooMany'));
    let completed = 0;
    const failures = [];
    for (let index = 0; index < urls.length; index += 1) {
      message.textContent = urls.length > 1
        ? t('batch.analyzing', { current: index + 1, total: urls.length })
        : t('analyze.querying');
      try {
        const response = await apiFetch('/api/analyze', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: urls[index] })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(apiError(data, 'analyze.failed'));
        renderResult(data, { initialMode: guidedGoal === 'identity' ? 'video' : guidedGoal });
        setGuidedStep(4);
        completed += 1;
      } catch (error) {
        failures.push(error.message);
      }
    }
    if (!completed) throw new Error(failures[0] || t('analyze.failed'));
    message.textContent = urls.length > 1
      ? t('batch.complete', { completed, failed: failures.length })
      : t('analyze.foundMany', { count: result.querySelectorAll('.quality-choice').length });
    message.className = failures.length ? 'message' : 'message loading';
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

/** Builds a preflight estimate from public metadata and current storage stats. */
function createCreationEstimate() {
  const element = document.createElement('div');
  element.className = 'creation-estimate';
  const makeMetric = (labelKey) => {
    const wrapper = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = t(labelKey);
    const value = document.createElement('strong');
    wrapper.append(label, value);
    element.append(wrapper);
    return value;
  };
  const size = makeMetric('estimate.size');
  const time = makeMetric('estimate.time');
  const space = makeMetric('estimate.space');
  const warning = document.createElement('p');
  warning.className = 'creation-warning';
  warning.hidden = true;
  element.append(warning);
  const update = ({ estimatedBytes = null, duration = null, processingFactor = 0.03 } = {}) => {
    const bytes = Number(estimatedBytes);
    const seconds = Number(duration);
    size.textContent = bytes > 0 ? `~${formatBytes(bytes)}` : t('estimate.unknown');
    const networkSeconds = bytes > 0 ? bytes / (2.5 * 1024 * 1024) : 20;
    const processingSeconds = seconds > 0 ? Math.max(10, seconds * processingFactor) : 20;
    const totalSeconds = Math.max(10, Math.ceil(networkSeconds + processingSeconds));
    time.textContent = totalSeconds < 60
      ? t('estimate.seconds', { count: totalSeconds })
      : t('estimate.minutes', { count: Math.ceil(totalSeconds / 60) });
    const available = latestPanelStats
      ? Math.max(0, Number(latestPanelStats.storageLimitBytes) - Number(latestPanelStats.storedBytes || 0))
      : null;
    space.textContent = available == null ? t('estimate.checking') : formatBytes(available);
    const warnings = [];
    if (seconds >= 3_600) warnings.push(t('estimate.longWarning'));
    if (available != null && bytes > available) warnings.push(t('estimate.spaceWarning'));
    warning.hidden = warnings.length === 0;
    warning.textContent = warnings.join(' ');
  };
  return { element, update };
}

/**
 * Renderiza el modelo devuelto por /api/analyze.
 * @param {object} video Título, proveedor, duración, miniatura y calidades.
 */
function renderResult(video, { initialMode = 'video' } = {}) {
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
  for (const quality of sortedQualities) {
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'download quality-choice';
    link.setAttribute('aria-pressed', 'false');
    link.dataset.selectionId = quality.selectionId;
    link.dataset.quality = quality.label;
    link.dataset.type = quality.type || 'mp4';
    link.dataset.adaptive = quality.adaptive ? 'true' : '';
    link.dataset.estimatedSize = quality.estimatedSize || '';
    const label = document.createElement('span');
    label.textContent = t('quality.option', { quality: quality.label });
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

  const outputHeading = document.createElement('p');
  outputHeading.className = 'remote-output-heading';
  outputHeading.textContent = t('remote.chooseResult');
  const tabs = document.createElement('div');
  tabs.className = 'remote-output-tabs';
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', t('remote.chooseResult'));
  const panels = new Map();
  const tabButtons = new Map();
  const addMode = (mode, labelKey, panel) => {
    panel.classList.add('remote-output-panel');
    panel.dataset.outputMode = mode;
    panel.hidden = true;
    panels.set(mode, panel);
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.textContent = t(labelKey);
    tabs.append(tab);
    tabButtons.set(mode, tab);
  };

  const videoPanel = document.createElement('section');
  const presetRow = document.createElement('div');
  presetRow.className = 'quality-presets';
  const selectedReview = document.createElement('div');
  selectedReview.className = 'remote-video-review';
  const reviewLabel = document.createElement('span');
  reviewLabel.textContent = t('summary.label');
  const reviewValue = document.createElement('strong');
  selectedReview.append(reviewLabel, reviewValue);
  const videoEstimate = createCreationEstimate();
  const startButton = document.createElement('button');
  startButton.type = 'button';
  startButton.className = 'download remote-video-start';
  startButton.textContent = t('remote.createVideo');
  let selectedQuality = null;
  const selectQuality = (choice, preset = null) => {
    selectedQuality = choice;
    for (const item of links) {
      const selected = item === choice;
      item.classList.toggle('is-selected', selected);
      item.setAttribute('aria-pressed', String(selected));
    }
    for (const button of presetRow.querySelectorAll('button')) {
      button.classList.toggle('is-active', button.dataset.preset === preset);
    }
    const notes = [choice.dataset.quality];
    if (choice.dataset.adaptive) notes.push(t('quality.adaptive'));
    if (choice.dataset.estimatedSize) notes.push(`~${formatBytes(Number(choice.dataset.estimatedSize))}`);
    reviewValue.textContent = notes.join(' · ');
    videoEstimate.update({
      estimatedBytes: Number(choice.dataset.estimatedSize) || null,
      duration: video.duration,
      processingFactor: choice.dataset.adaptive ? 0.05 : 0.02
    });
  };
  const numericHeight = (choice) => Number.parseInt(choice.dataset.quality, 10) || 0;
  const maximumChoice = links[0] || null;
  const recommendedChoice = links.find((choice) => numericHeight(choice) <= 720) || maximumChoice;
  const smallChoice = links.at(-1) || maximumChoice;
  for (const [preset, labelKey, choice] of [
    ['recommended', 'preset.recommended', recommendedChoice],
    ['maximum', 'preset.maximum', maximumChoice],
    ['small', 'preset.small', smallChoice]
  ]) {
    if (!choice) continue;
    const presetButton = document.createElement('button');
    presetButton.type = 'button';
    presetButton.dataset.preset = preset;
    presetButton.textContent = t(labelKey);
    presetButton.addEventListener('click', () => selectQuality(choice, preset));
    presetRow.append(presetButton);
  }
  for (const link of links) link.addEventListener('click', () => selectQuality(link));
  startButton.addEventListener('click', () => {
    if (selectedQuality && !selectedQuality.classList.contains('disabled')) {
      prepareDownload(video, selectedQuality, jobsArea, startButton);
    }
  });
  videoPanel.append(presetRow, list, selectedReview, videoEstimate.element, startButton);
  addMode('video', 'remote.video', videoPanel);

  const remoteAudio = video.provider === 'youtube' && video.audio
    ? createRemoteAudioControls(video, jobsArea)
    : null;
  if (remoteAudio) addMode('audio', 'remote.audio', remoteAudio.element);
  const remoteSubtitles = Array.isArray(video.subtitleTracks) && video.subtitleTracks.length
    ? createRemoteSubtitleControls(video, jobsArea)
    : null;
  if (remoteSubtitles) addMode('subtitle', 'remote.subtitles', remoteSubtitles.element);

  const clipLinks = remoteAudio ? [...links, remoteAudio.button] : links;
  const clip = createClipControls(video.duration, clipLinks, video.title, previewQuality ? media : null);
  const selectMode = (requestedMode) => {
    const mode = panels.has(requestedMode) ? requestedMode : 'video';
    for (const [key, panel] of panels) panel.hidden = key !== mode;
    for (const [key, tab] of tabButtons) {
      const active = key === mode;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    }
    clip.element.hidden = mode === 'subtitle';
  };
  for (const [mode, tab] of tabButtons) tab.addEventListener('click', () => selectMode(mode));
  details.append(outputHeading, tabs, clip.element, ...panels.values(), jobsArea);
  wrapper.append(media, details);
  result.append(wrapper);
  result.hidden = false;
  clip.updateLinks();
  if (recommendedChoice) selectQuality(recommendedChoice, 'recommended');
  selectMode(initialMode);
}

/** Builds the YouTube-only audio export card from the shared audio profiles. */
function createRemoteAudioControls(video, jobsArea) {
  const element = document.createElement('section');
  element.className = 'remote-audio-export';
  const heading = document.createElement('div');
  const title = document.createElement('strong');
  title.textContent = t('youtube.audio.title');
  const description = document.createElement('p');
  description.textContent = t('youtube.audio.description');
  heading.append(title, description);

  const presets = document.createElement('div');
  presets.className = 'audio-presets';
  const settings = document.createElement('div');
  settings.className = 'audio-output-settings remote-audio-settings';
  const createSelect = (labelKey) => {
    const label = document.createElement('label');
    const text = document.createElement('span');
    text.textContent = t(labelKey);
    const select = document.createElement('select');
    label.append(text, select);
    settings.append(label);
    return select;
  };
  const format = createSelect('audio.format');
  for (const value of Object.keys(AUDIO_OUTPUT_PROFILES)) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value.toUpperCase();
    format.append(option);
  }
  format.value = 'mp3';
  const codec = createSelect('audio.codec');
  const bitrate = createSelect('audio.bitrate');
  for (const value of [96, 128, 192, 256, 320]) {
    const option = document.createElement('option');
    option.value = String(value);
    option.textContent = `${value} kbps`;
    bitrate.append(option);
  }
  bitrate.value = '192';

  const hint = document.createElement('p');
  hint.className = 'audio-output-hint';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'download remote-audio-button';
  button.dataset.selectionId = video.audio.selectionId;
  button.textContent = t('youtube.audio.export');
  const audioEstimate = createCreationEstimate();
  const update = () => {
    updateAudioProfileControls(format, codec, bitrate, hint);
    const duration = Number(video.duration) || 0;
    const lossless = AUDIO_OUTPUT_PROFILES[format.value]?.lossless;
    const estimatedBytes = duration > 0
      ? Math.round(duration * (lossless ? 1_400_000 : Number(bitrate.value || 192) * 1_000) / 8)
      : Number(video.audio.estimatedSize) || null;
    audioEstimate.update({ estimatedBytes, duration, processingFactor: lossless ? 0.16 : 0.08 });
  };
  const selectPreset = (preset, outputFormat, outputCodec, outputBitrate) => {
    format.value = outputFormat;
    update();
    codec.value = outputCodec;
    bitrate.value = String(outputBitrate);
    update();
    for (const item of presets.querySelectorAll('button')) {
      item.classList.toggle('is-active', item.dataset.preset === preset);
    }
  };
  for (const [preset, labelKey, outputFormat, outputCodec, outputBitrate] of [
    ['recommended', 'preset.recommendedAudio', 'mp3', 'mp3', 192],
    ['maximum', 'preset.maximumAudio', 'flac', 'flac', 320],
    ['small', 'preset.smallAudio', 'mp3', 'mp3', 96]
  ]) {
    const presetButton = document.createElement('button');
    presetButton.type = 'button';
    presetButton.dataset.preset = preset;
    presetButton.textContent = t(labelKey);
    presetButton.addEventListener('click', () => selectPreset(preset, outputFormat, outputCodec, outputBitrate));
    presets.append(presetButton);
  }
  format.addEventListener('change', update);
  codec.addEventListener('change', update);
  bitrate.addEventListener('change', update);
  button.addEventListener('click', () => {
    if (!button.classList.contains('disabled')) {
      prepareRemoteAudio(video, { button, format, codec, bitrate }, jobsArea);
    }
  });
  update();
  const advanced = document.createElement('details');
  const advancedSummary = document.createElement('summary');
  advancedSummary.textContent = t('preset.advanced');
  advanced.append(advancedSummary, settings, hint);
  element.append(heading, presets, advanced, audioEstimate.element, button);
  selectPreset('recommended', 'mp3', 'mp3', 192);
  return { element, button };
}

/** Builds a simple YouTube caption export without exposing provider URLs. */
function createRemoteSubtitleControls(video, jobsArea) {
  const element = document.createElement('section');
  element.className = 'remote-subtitle-export';
  const title = document.createElement('strong');
  title.textContent = t('remote.subtitleTitle');
  const description = document.createElement('p');
  description.textContent = t('remote.subtitleDescription');
  const settings = document.createElement('div');
  settings.className = 'audio-output-settings';
  const trackLabel = document.createElement('label');
  const trackText = document.createElement('span');
  trackText.textContent = t('subtitle.track');
  const track = document.createElement('select');
  for (const item of video.subtitleTracks) {
    const option = document.createElement('option');
    option.value = item.selectionId;
    option.textContent = `${item.name} (${item.language})${item.automatic ? ` · ${t('subtitle.automatic')}` : ''}`;
    track.append(option);
  }
  trackLabel.append(trackText, track);
  const formatLabel = document.createElement('label');
  const formatText = document.createElement('span');
  formatText.textContent = t('subtitle.outputFormat');
  const format = document.createElement('select');
  for (const value of ['srt', 'vtt']) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value.toUpperCase();
    format.append(option);
  }
  formatLabel.append(formatText, format);
  settings.append(trackLabel, formatLabel);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'download';
  button.textContent = t('subtitle.export');
  button.addEventListener('click', async () => {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = t('subtitle.creating');
    setGuidedStep(5);
    try {
      const response = await apiFetch('/api/subtitle-jobs', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-vdownloader-subtitle': '1' },
        body: JSON.stringify({ selectionId: track.value, outputFormat: format.value })
      });
      const job = await response.json();
      if (!response.ok) throw new Error(apiError(job, 'job.prepareFailed'));
      refreshDownloadsPanel();
      await monitorJob(job, jobsArea);
    } catch (error) {
      renderJobError(jobsArea, error.message);
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  });
  element.append(title, description, settings, button);
  return { element, button };
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
async function prepareDownload(video, qualityButton, jobsArea, triggerButton = qualityButton) {
  const originalContent = triggerButton.innerHTML;
  triggerButton.disabled = true;
  triggerButton.textContent = t('job.creating');
  setGuidedStep(5);
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
    triggerButton.disabled = false;
    triggerButton.innerHTML = originalContent;
  }
}

/** Creates and monitors an audio-only YouTube export with an allowlisted profile. */
async function prepareRemoteAudio(video, controls, jobsArea) {
  const { button, format, codec, bitrate } = controls;
  const originalContent = button.innerHTML;
  button.disabled = true;
  button.textContent = t('job.creating');
  setGuidedStep(5);
  try {
    const payload = {
      selectionId: button.dataset.selectionId,
      outputFormat: format.value,
      audioCodec: codec.value,
      bitrate: Number(bitrate.value)
    };
    if (button.dataset.start && button.dataset.end) {
      payload.start = Number(button.dataset.start);
      payload.end = Number(button.dataset.end);
    }
    const response = await apiFetch('/api/remote-audio-jobs', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-vdownloader-audio-extract': '1'
      },
      body: JSON.stringify(payload)
    });
    const job = await response.json();
    if (!response.ok) throw new Error(apiError(job, 'job.createFailed'));
    refreshDownloadsPanel();
    await monitorJob(job, jobsArea);
  } catch (error) {
    renderJobError(jobsArea, error.message);
  } finally {
    button.disabled = false;
    button.innerHTML = originalContent;
  }
}

/** Load only non-sensitive size settings, independently of the native token. */
async function refreshUploadSettings() {
  if (uploadSettingsPromise) return uploadSettingsPromise;
  uploadSettingsPromise = (async () => {
    if (Date.now() < apiRetryAt) throw new Error(accessRetryMessage());
    const response = await fetch('/api/upload-config', {
      cache: 'no-store', signal: AbortSignal.timeout(10_000)
    });
    recordApiRetry(response);
    if (response.status === 429) throw new Error(accessRetryMessage());
    if (response.status === 401) throw new Error(t('security.demoExpired'));
    if (!response.ok) throw new Error(t('local.settingsUnavailable'));
    const settings = await response.json();
    if (!Number.isSafeInteger(settings.effectiveMaxBytes) || settings.effectiveMaxBytes <= 0) {
      throw new Error('Invalid upload settings');
    }
    maxUploadBytes = settings.effectiveMaxBytes;
  })().finally(() => { uploadSettingsPromise = null; });
  return uploadSettingsPromise;
}

/** Carga una vista previa local sin enviar todavía el archivo al servidor. */
async function loadSelectedLocalVideo(fileOverride = null) {
  const providedFile = fileOverride instanceof File ? fileOverride : null;
  const file = providedFile || localVideoFile.files?.[0] || null;
  selectedLocalFile = null;
  localClipControls = null;
  clearIdentityAnalysis(false);
  identityEnabled.checked = false;
  identityControls.hidden = true;
  localEditor.hidden = true;
  localExportSummary.hidden = true;
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
  try {
    await refreshUploadSettings();
  } catch (error) {
    localUploadMessage.textContent = error.message.startsWith('Upload') || error.name === 'TimeoutError' || error.name === 'TypeError' ? t('local.settingsUnavailable') : error.message;
    return;
  }
  if (!providedFile && localVideoFile.files?.[0] !== file) return;
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
    localClipControls = createClipControls(
      duration,
      [localExportButton],
      file.name,
      localVideoPreview,
      'video',
      { onChange: updateLocalExportSummary }
    );
    localClipMount.replaceChildren(localClipControls.element);
    localClipControls.enable();
    localEditor.hidden = false;
    updateLocalExportSummary();
    localUploadMessage.textContent = t('local.chooseRange');
    localUploadMessage.className = 'local-upload-message success';
    if (localExportMode.value === 'audio') {
      localEditor.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
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

/** Updates one audio profile control group from the shared allowlist. */
function updateAudioProfileControls(formatControl, codecControl, bitrateControl, hintControl) {
  const profile = AUDIO_OUTPUT_PROFILES[formatControl.value] || AUDIO_OUTPUT_PROFILES.mp3;
  const previous = codecControl.value;
  codecControl.replaceChildren(...profile.codecs.map((codec) => {
    const option = document.createElement('option');
    option.value = codec;
    option.textContent = AUDIO_CODEC_LABELS[codec];
    return option;
  }));
  if (profile.codecs.includes(previous)) codecControl.value = previous;
  bitrateControl.disabled = profile.lossless;
  hintControl.textContent = t(profile.lossless ? 'audio.losslessHint' : 'audio.compressedHint');
}

/** Updates one dynamic label while keeping it compatible with language reloads. */
function setTranslatedText(element, key) {
  element.dataset.i18n = key;
  element.textContent = t(key);
}

/**
 * Shows one unambiguous local workflow without discarding the state of the
 * other editors. The existing export mode remains the internal source of
 * truth, so this presentation change does not alter either upload endpoint.
 */
function selectLocalTool(tool, { scroll = true } = {}) {
  if (!['video', 'extract', 'audio', 'subtitle'].includes(tool)) return;
  selectedLocalTool = tool;
  const audioFilesOnly = tool === 'audio';
  const subtitlesOnly = tool === 'subtitle';
  localVideoToolCard.hidden = audioFilesOnly || subtitlesOnly;
  localAudioToolCard.hidden = !audioFilesOnly;
  subtitleToolCard.hidden = !subtitlesOnly;
  for (const button of localToolButtons) {
    const selected = button.dataset.localTool === tool;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  }

  if (!audioFilesOnly && !subtitlesOnly) {
    const extracting = tool === 'extract';
    localExportMode.value = extracting ? 'audio' : 'video';
    setTranslatedText(localToolEyebrow, extracting ? 'local.extractEyebrow' : 'local.videoEyebrow');
    setTranslatedText(localUploadTitle, extracting ? 'local.extractTitle' : 'local.videoTitle');
    setTranslatedText(localToolDescription, extracting ? 'local.extractDescription' : 'local.videoDescription');
    setTranslatedText(localVideoSelectLabel, extracting ? 'local.extractSelect' : 'local.videoSelect');
    updateLocalExportModeUi();
  }

  if (scroll) {
    const target = audioFilesOnly
      ? localAudioToolCard
      : subtitlesOnly
        ? subtitleToolCard
        : localVideoToolCard;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/** Returns the currently selected interval represented by an export button. */
function exportRange(button) {
  const start = Number(button.dataset.start);
  const end = Number(button.dataset.end);
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) return { start, end };
  const duration = Number(button.dataset.duration);
  return Number.isFinite(duration) && duration > 0 ? { start: 0, end: duration } : null;
}

/** Shows the exact video/audio result before the user starts a long job. */
function updateLocalExportSummary() {
  const range = exportRange(localExportButton);
  if (!selectedLocalFile || !range || localExportButton.classList.contains('disabled')) {
    localExportSummary.hidden = true;
    return;
  }
  const audioOnly = localExportMode.value === 'audio';
  const format = audioOnly ? videoAudioOutputFormat.value : videoOutputFormat.value;
  const audioProfile = AUDIO_OUTPUT_PROFILES[videoAudioOutputFormat.value] || AUDIO_OUTPUT_PROFILES.mp3;
  const profile = audioOnly
    ? `${AUDIO_CODEC_LABELS[videoAudioOutputCodec.value]}${audioProfile.lossless ? '' : ` · ${videoAudioOutputBitrate.value} kbps`}`
    : `${VIDEO_CODEC_LABELS[videoOutputCodec.value]} · ${VIDEO_AUDIO_CODEC_LABELS[videoAudioCodec.value]}`;
  localExportSummaryText.textContent = t('summary.template', {
    name: selectedLocalFile.name,
    format: format.toUpperCase(),
    profile,
    range: `${formatTime(range.start)}–${formatTime(range.end)}`
  });
  localExportSummary.hidden = false;
}

/** Shows the joined/trimmed audio output before the user starts processing. */
function updateAudioExportSummary() {
  if (!selectedAudioSources.length) {
    audioExportSummary.hidden = true;
    return;
  }
  const profileDefinition = AUDIO_OUTPUT_PROFILES[audioOutputFormat.value] || AUDIO_OUTPUT_PROFILES.mp3;
  const profile = `${AUDIO_CODEC_LABELS[audioOutputCodec.value]}${profileDefinition.lossless ? '' : ` · ${audioOutputBitrate.value} kbps`}`;
  const totalDuration = selectedAudioSources.reduce((sum, source) => sum + Math.max(0, source.end - source.start), 0);
  audioExportSummaryText.textContent = t('summary.template', {
    name: selectedAudioSources.length === 1
      ? selectedAudioSources[0].file.name
      : t('summary.files', { count: selectedAudioSources.length }),
    format: audioOutputFormat.value.toUpperCase(),
    profile,
    range: formatTime(totalDuration)
  });
  audioExportSummary.hidden = false;
}

/**
 * Updates the shared subtitle notice and optionally removes successful,
 * non-actionable feedback after a short, accessible reading interval.
 * Errors and active progress messages remain visible until the next action.
 */
function setSubtitleMessage(text, state = '', dismissAfter = 0) {
  if (subtitleMessageTimer) clearTimeout(subtitleMessageTimer);
  subtitleMessageTimer = null;
  subtitleMessage.textContent = text;
  subtitleMessage.className = `local-upload-message${state ? ` ${state}` : ''}`;
  if (!text || dismissAfter <= 0) return;
  subtitleMessageTimer = setTimeout(() => {
    subtitleMessage.textContent = '';
    subtitleMessage.className = 'local-upload-message';
    subtitleMessageTimer = null;
  }, dismissAfter);
}

/**
 * Removes only the finished result shown inside the subtitle tool after the
 * browser starts its download. The persistent Download Center entry and the
 * server-side job are intentionally left untouched for later downloads.
 */
function dismissInlineSubtitleResult(card) {
  setTimeout(() => {
    if (!card.isConnected) return;
    card.classList.add('is-dismissing');
    setTimeout(() => card.remove(), UI_DISMISS_ANIMATION_MS);
  }, SUBTITLE_RESULT_DISMISS_MS);
}

/** Switches between published YouTube captions and embedded local tracks. */
function selectSubtitleSource(source) {
  if (!['youtube', 'local'].includes(source)) return;
  subtitleSourceMode = source;
  const local = source === 'local';
  subtitleYoutubePanel.hidden = local;
  subtitleLocalPanel.hidden = !local;
  subtitleSourceYoutube.classList.toggle('is-active', !local);
  subtitleSourceLocal.classList.toggle('is-active', local);
  subtitleSourceYoutube.setAttribute('aria-pressed', String(!local));
  subtitleSourceLocal.setAttribute('aria-pressed', String(local));
  setSubtitleMessage('');
}

/** Switches between extraction, Whisper generation, and the editable SRT workshop. */
function selectLocalSubtitleMode(mode) {
  if (!['existing', 'generate', 'compose'].includes(mode)) return;
  subtitleLocalMode = mode;
  const generated = mode === 'generate';
  const compose = mode === 'compose';
  subtitleModeExisting.classList.toggle('is-active', mode === 'existing');
  subtitleModeGenerate.classList.toggle('is-active', generated);
  subtitleModeCompose.classList.toggle('is-active', compose);
  subtitleModeExisting.setAttribute('aria-pressed', String(mode === 'existing'));
  subtitleModeGenerate.setAttribute('aria-pressed', String(generated));
  subtitleModeCompose.setAttribute('aria-pressed', String(compose));
  subtitleLocalTrackField.hidden = generated || compose;
  subtitleLocalFormat.closest('.subtitle-output-settings').hidden = compose;
  subtitleTranscriptionSettings.hidden = !generated;
  subtitleWorkshop.hidden = !compose || !selectedSubtitleFile;
  subtitleClipMount.hidden = compose;
  subtitleLocalHint.hidden = compose;
  subtitleLocalSummary.hidden = compose;
  subtitleLocalExport.hidden = compose;
  subtitleVideoFile.accept = generated ? SUBTITLE_MEDIA_ACCEPT : SUBTITLE_VIDEO_ACCEPT;
  setTranslatedText(subtitleLocalPickerLabel, generated ? 'subtitle.selectMedia' : 'subtitle.selectVideo');
  subtitleLocalHint.textContent = t(generated ? 'subtitle.transcriptionHint' : 'subtitle.localHint');
  subtitleLocalExport.textContent = t(generated ? 'subtitle.generate' : 'subtitle.export');
  if (!generated && selectedSubtitleFile && subtitleFileKind(selectedSubtitleFile) === 'audio') {
    resetLocalSubtitleSelection();
    setSubtitleMessage(t('subtitle.videoRequired'));
  }
  if (selectedSubtitleFile) {
    setSubtitleMessage(
      t(compose ? 'subtitle.composeReady' : generated ? 'subtitle.transcriptionReady' : 'subtitle.localReady'),
      'success',
      SUBTITLE_NOTICE_DISMISS_MS
    );
  }
  if (compose) renderEditableSubtitleCues();
  updateLocalSubtitleSummary();
}

/** Finds metadata-only YouTube caption tracks through the existing analyzer. */
async function analyzeSubtitleUrl(event) {
  event.preventDefault();
  subtitleAnalyzeButton.disabled = true;
  subtitleAnalyzeButton.textContent = t('subtitle.searching');
  subtitleRemoteEditor.hidden = true;
  subtitleRemoteSummary.hidden = true;
  subtitleRemoteTracks = [];
  setSubtitleMessage(t('subtitle.searching'), 'loading');
  try {
    const response = await apiFetch('/api/analyze', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url: subtitleUrl.value })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(apiError(data, 'analyze.failed'));
    subtitleRemoteTracks = Array.isArray(data.subtitleTracks) ? data.subtitleTracks : [];
    if (!subtitleRemoteTracks.length) throw new Error(t('subtitle.notFound'));
    subtitleRemoteVideoTitle = data.title || 'YouTube';
    subtitleRemoteTitle.textContent = subtitleRemoteVideoTitle;
    subtitleTrack.replaceChildren(...subtitleRemoteTracks.map((track) => {
      const option = document.createElement('option');
      option.value = track.selectionId;
      option.textContent = `${track.name} (${track.language}) · ${t(track.automatic ? 'subtitle.automatic' : 'subtitle.published')}`;
      return option;
    }));
    subtitleRemoteEditor.hidden = false;
    setSubtitleMessage(t('subtitle.found', { count: subtitleRemoteTracks.length }), 'success', SUBTITLE_NOTICE_DISMISS_MS);
    updateRemoteSubtitleSummary();
  } catch (error) {
    setSubtitleMessage(error.message);
  } finally {
    subtitleAnalyzeButton.disabled = false;
    subtitleAnalyzeButton.textContent = t('subtitle.analyze');
  }
}

/** Summarizes the selected remote caption without exposing its provider URL. */
function updateRemoteSubtitleSummary() {
  const track = subtitleRemoteTracks.find((item) => item.selectionId === subtitleTrack.value);
  if (!track) {
    subtitleRemoteSummary.hidden = true;
    return;
  }
  subtitleRemoteSummaryText.textContent = t('subtitle.remoteSummary', {
    title: subtitleRemoteVideoTitle,
    language: `${track.name} (${track.language})`,
    kind: t(track.automatic ? 'subtitle.automatic' : 'subtitle.published'),
    format: subtitleRemoteFormat.value.toUpperCase()
  });
  subtitleRemoteSummary.hidden = false;
}

/** Creates the persisted YouTube subtitle job from an opaque track selection. */
async function exportRemoteSubtitles() {
  const track = subtitleRemoteTracks.find((item) => item.selectionId === subtitleTrack.value);
  if (!track) {
    setSubtitleMessage(t('subtitle.selectRemoteBeforeExport'));
    return;
  }
  subtitleRemoteExport.disabled = true;
  subtitleRemoteExport.textContent = t('subtitle.creating');
  try {
    const response = await apiFetch('/api/subtitle-jobs', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-vdownloader-subtitle': '1' },
      body: JSON.stringify({ selectionId: track.selectionId, outputFormat: subtitleRemoteFormat.value })
    });
    const job = await response.json();
    if (!response.ok) throw new Error(apiError(job, 'job.prepareFailed'));
    setSubtitleMessage(t('upload.complete'), 'success', SUBTITLE_NOTICE_DISMISS_MS);
    refreshDownloadsPanel();
    await monitorJob(job, subtitleJobsArea);
  } catch (error) {
    renderJobError(subtitleJobsArea, error.message);
    setSubtitleMessage(error.message);
  } finally {
    subtitleRemoteExport.disabled = false;
    subtitleRemoteExport.textContent = t('subtitle.export');
  }
}

/** Returns the allowlisted local subtitle source kind without trusting MIME. */
function subtitleFileKind(file) {
  const extension = file?.name?.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';
  if (SUBTITLE_VIDEO_EXTENSIONS.has(extension)) return 'video';
  if (SUBTITLE_AUDIO_EXTENSIONS.has(extension)) return 'audio';
  return null;
}

/** Clears a local subtitle source and every browser-only preview reference. */
function resetLocalSubtitleSelection({ clearInput = true } = {}) {
  selectedSubtitleFile = null;
  subtitleClipControls = null;
  editableSubtitleCues = [];
  subtitleLocalEditor.hidden = true;
  subtitleWorkshop.hidden = true;
  subtitleLocalSummary.hidden = true;
  subtitleClipMount.replaceChildren();
  subtitleCueList.replaceChildren();
  subtitleCaptionFile.value = '';
  if (clearInput) subtitleVideoFile.value = '';
  if (subtitleObjectUrl) {
    URL.revokeObjectURL(subtitleObjectUrl);
    subtitleObjectUrl = null;
  }
  subtitleVideoPreview.querySelectorAll('track[data-editable-subtitle]').forEach((track) => track.remove());
  if (subtitlePreviewTrackUrl) {
    URL.revokeObjectURL(subtitlePreviewTrackUrl);
    subtitlePreviewTrackUrl = null;
  }
  for (const preview of [subtitleVideoPreview, subtitleAudioPreview]) {
    preview.pause();
    preview.removeAttribute('src');
    preview.load();
  }
  subtitleVideoPreview.hidden = false;
  subtitleAudioPreview.hidden = true;
}

/** Loads a browser-local video or audio preview before any upload occurs. */
async function loadSelectedSubtitleMedia() {
  const file = subtitleVideoFile.files?.[0] || null;
  resetLocalSubtitleSelection({ clearInput: false });
  subtitleJobsArea.replaceChildren();
  setSubtitleMessage('');
  if (!file) {
    return;
  }
  try {
    await refreshUploadSettings();
    if (file.size > maxUploadBytes) throw new Error(t('local.tooLarge', { size: formatBytes(maxUploadBytes) }));
    const sourceKind = subtitleFileKind(file);
    if (!sourceKind) throw new Error(t('subtitle.unsupportedMedia'));
    if (sourceKind === 'audio' && subtitleLocalMode !== 'generate') throw new Error(t('subtitle.videoRequired'));
    setSubtitleMessage(t('local.reading'), 'loading');
    subtitleObjectUrl = URL.createObjectURL(file);
    const preview = sourceKind === 'audio' ? subtitleAudioPreview : subtitleVideoPreview;
    subtitleVideoPreview.hidden = sourceKind === 'audio';
    subtitleAudioPreview.hidden = sourceKind !== 'audio';
    await new Promise((resolve, reject) => {
      const loaded = () => { cleanup(); resolve(); };
      const failed = () => { cleanup(); reject(new Error(t(sourceKind === 'audio' ? 'audio.previewFailed' : 'local.previewFailed'))); };
      const cleanup = () => {
        preview.removeEventListener('loadedmetadata', loaded);
        preview.removeEventListener('error', failed);
      };
      preview.addEventListener('loadedmetadata', loaded);
      preview.addEventListener('error', failed);
      preview.src = subtitleObjectUrl;
      preview.load();
    });
    const duration = preview.duration;
    if (!Number.isFinite(duration) || duration < 1 || duration > 43_200) {
      throw new Error(t(sourceKind === 'audio' ? 'audio.durationInvalid' : 'local.durationInvalid'));
    }
    selectedSubtitleFile = file;
    subtitleLocalName.textContent = file.name;
    subtitleLocalMeta.textContent = t('local.meta', { duration: formatTime(duration), size: formatBytes(file.size) });
    subtitleLocalExport.dataset.duration = duration;
    subtitleLocalExport.dataset.estimatedSize = file.size;
    subtitleClipControls = createClipControls(
      duration,
      [subtitleLocalExport],
      file.name,
      preview,
      sourceKind,
      { onChange: updateLocalSubtitleSummary }
    );
    subtitleClipMount.replaceChildren(subtitleClipControls.element);
    subtitleClipControls.enable();
    subtitleLocalEditor.hidden = false;
    subtitleClipMount.hidden = subtitleLocalMode === 'compose';
    subtitleWorkshop.hidden = subtitleLocalMode !== 'compose';
    subtitleLocalHint.hidden = subtitleLocalMode === 'compose';
    subtitleLocalExport.hidden = subtitleLocalMode === 'compose';
    if (subtitleLocalMode === 'compose') renderEditableSubtitleCues();
    setSubtitleMessage(
      t(subtitleLocalMode === 'compose'
        ? 'subtitle.composeReady'
        : subtitleLocalMode === 'generate' ? 'subtitle.transcriptionReady' : 'subtitle.localReady'),
      'success',
      SUBTITLE_NOTICE_DISMISS_MS
    );
    updateLocalSubtitleSummary();
  } catch (error) {
    setSubtitleMessage(error.message);
  }
}

/** Parses one strict SRT time into seconds without evaluating arbitrary text. */
function parseEditableSubtitleTime(value) {
  const match = String(value || '').trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) return null;
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (minutes > 59 || seconds > 59) return null;
  return Number(match[1]) * 3600 + minutes * 60 + seconds + Number(match[4]) / 1000;
}

/** Formats a finite cue time using the canonical SRT timestamp shape. */
function formatEditableSubtitleTime(value) {
  const milliseconds = Math.max(0, Math.round(Number(value || 0) * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds % 3_600_000 / 60_000);
  const seconds = Math.floor(milliseconds % 60_000 / 1000);
  const remainder = milliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(remainder).padStart(3, '0')}`;
}

/** Converts imported SRT into editable cues while preserving line breaks. */
function parseEditableSubtitleText(value) {
  const text = String(value || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!text || new TextEncoder().encode(text).byteLength > 5 * 1024 * 1024) {
    throw new Error(t('subtitle.invalidSrt'));
  }
  const blocks = text.split(/\n{2,}/);
  if (blocks.length > 2_000) throw new Error(t('subtitle.tooManyCues'));
  return blocks.map((block) => {
    const lines = block.split('\n');
    const index = lines.shift()?.trim();
    const timing = lines.shift()?.trim() || '';
    const match = timing.match(/^(\d{2}:\d{2}:\d{2}[,.]\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}[,.]\d{3})$/);
    const cueText = lines.join('\n').trim();
    if (!/^\d+$/.test(index || '') || !match || !cueText) throw new Error(t('subtitle.invalidSrt'));
    return { startText: match[1].replace('.', ','), endText: match[2].replace('.', ','), text: cueText };
  });
}

/** Returns a normalized SRT or throws a user-facing synchronization error. */
function serializeEditableSubtitleCues() {
  if (!editableSubtitleCues.length) throw new Error(t('subtitle.noCues'));
  let previousStart = -1;
  const blocks = editableSubtitleCues.map((cue, index) => {
    const start = parseEditableSubtitleTime(cue.startText);
    const end = parseEditableSubtitleTime(cue.endText);
    const text = String(cue.text || '').trim();
    if (start == null || end == null || end <= start || start < previousStart || !text || text.length > 4_000) {
      throw new Error(t('subtitle.invalidCue', { number: index + 1 }));
    }
    previousStart = start;
    return `${index + 1}\n${formatEditableSubtitleTime(start)} --> ${formatEditableSubtitleTime(end)}\n${text}`;
  });
  return `${blocks.join('\n\n')}\n`;
}

/** Regenerates the browser-only WebVTT track used for visual review. */
function refreshEditableSubtitlePreview() {
  subtitleVideoPreview.querySelectorAll('track[data-editable-subtitle]').forEach((track) => track.remove());
  if (subtitlePreviewTrackUrl) {
    URL.revokeObjectURL(subtitlePreviewTrackUrl);
    subtitlePreviewTrackUrl = null;
  }
  if (!subtitlePreviewEnabled || subtitleLocalMode !== 'compose' || subtitleVideoPreview.hidden) return;
  let srt;
  try { srt = serializeEditableSubtitleCues(); } catch { return; }
  const vtt = `WEBVTT\n\n${srt.replace(/,(\d{3})/g, '.$1')}`;
  subtitlePreviewTrackUrl = URL.createObjectURL(new Blob([vtt], { type: 'text/vtt' }));
  const track = document.createElement('track');
  track.dataset.editableSubtitle = 'true';
  track.kind = 'subtitles';
  track.label = t('subtitle.previewTrack');
  track.srclang = 'es';
  track.src = subtitlePreviewTrackUrl;
  track.default = true;
  track.addEventListener('load', () => {
    if (track.track) track.track.mode = 'showing';
  });
  subtitleVideoPreview.append(track);
}

/** Renders structured fields so text and timing can be corrected without raw-file editing. */
function renderEditableSubtitleCues() {
  subtitleCueList.replaceChildren();
  if (!editableSubtitleCues.length) {
    const empty = document.createElement('p');
    empty.className = 'subtitle-cue-empty';
    empty.textContent = t('subtitle.importPrompt');
    subtitleCueList.append(empty);
    refreshEditableSubtitlePreview();
    return;
  }
  editableSubtitleCues.forEach((cue, index) => {
    const row = document.createElement('article');
    row.className = 'subtitle-cue-row';
    const heading = document.createElement('div');
    const number = document.createElement('strong');
    number.textContent = t('subtitle.cueNumber', { number: index + 1 });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'secondary-action';
    remove.textContent = t('subtitle.removeCue');
    remove.addEventListener('click', () => {
      editableSubtitleCues.splice(index, 1);
      renderEditableSubtitleCues();
    });
    heading.append(number, remove);
    const timing = document.createElement('div');
    timing.className = 'subtitle-cue-times';
    const makeTimeInput = (labelKey, property) => {
      const label = document.createElement('label');
      const text = document.createElement('span');
      text.textContent = t(labelKey);
      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'numeric';
      input.value = cue[property];
      input.placeholder = '00:00:00,000';
      input.addEventListener('change', () => {
        cue[property] = input.value.trim().replace('.', ',');
        input.value = cue[property];
        refreshEditableSubtitlePreview();
      });
      label.append(text, input);
      timing.append(label);
    };
    makeTimeInput('subtitle.cueStart', 'startText');
    makeTimeInput('subtitle.cueEnd', 'endText');
    const textLabel = document.createElement('label');
    const textLabelValue = document.createElement('span');
    textLabelValue.textContent = t('subtitle.cueText');
    const textarea = document.createElement('textarea');
    textarea.rows = 2;
    textarea.maxLength = 4_000;
    textarea.value = cue.text;
    textarea.addEventListener('input', () => {
      cue.text = textarea.value;
      refreshEditableSubtitlePreview();
    });
    textLabel.append(textLabelValue, textarea);
    row.append(heading, timing, textLabel);
    subtitleCueList.append(row);
  });
  refreshEditableSubtitlePreview();
}

/** Imports a bounded SRT chosen explicitly by the user. */
async function importEditableSubtitleFile() {
  const file = subtitleCaptionFile.files?.[0];
  if (!file) return;
  try {
    editableSubtitleCues = parseEditableSubtitleText(await file.text());
    renderEditableSubtitleCues();
    setSubtitleMessage(t('subtitle.imported', { count: editableSubtitleCues.length }), 'success', SUBTITLE_NOTICE_DISMISS_MS);
  } catch (error) {
    editableSubtitleCues = [];
    renderEditableSubtitleCues();
    setSubtitleMessage(error.message);
  }
}

/** Adds a two-second cue at the current playback position. */
function addEditableSubtitleCue() {
  if (!selectedSubtitleFile || subtitleLocalMode !== 'compose') {
    setSubtitleMessage(t('subtitle.selectBeforeCompose'));
    return;
  }
  const duration = Number(subtitleLocalExport.dataset.duration) || 0;
  const start = Math.max(0, Math.min(duration - 0.1, Number(subtitleVideoPreview.currentTime) || 0));
  const end = Math.min(duration, start + 2);
  editableSubtitleCues.push({
    startText: formatEditableSubtitleTime(start),
    endText: formatEditableSubtitleTime(Math.max(start + 0.1, end)),
    text: t('subtitle.newCueText')
  });
  editableSubtitleCues.sort((left, right) => (
    parseEditableSubtitleTime(left.startText) - parseEditableSubtitleTime(right.startText)
  ));
  renderEditableSubtitleCues();
}

/** Sends only cue text to the fixed local English-to-Spanish worker. */
async function translateEditableSubtitles() {
  try {
    serializeEditableSubtitleCues();
    subtitleTranslate.disabled = true;
    subtitleTranslate.textContent = t('subtitle.translating');
    const response = await apiFetch('/api/subtitle-translate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-vdownloader-subtitle': '1',
        'x-vdownloader-translation': '1'
      },
      body: JSON.stringify({
        sourceLanguage: 'en',
        targetLanguage: 'es',
        texts: editableSubtitleCues.map((cue) => cue.text)
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(apiError(data, 'subtitle.translationFailed'));
    if (!Array.isArray(data.texts) || data.texts.length !== editableSubtitleCues.length) {
      throw new Error(t('subtitle.translationFailed'));
    }
    data.texts.forEach((text, index) => { editableSubtitleCues[index].text = text; });
    renderEditableSubtitleCues();
    setSubtitleMessage(t('subtitle.translated'), 'success', SUBTITLE_NOTICE_DISMISS_MS);
  } catch (error) {
    setSubtitleMessage(error.message);
  } finally {
    subtitleTranslate.disabled = false;
    subtitleTranslate.textContent = t('subtitle.translateEnEs');
  }
}

/** Shows or hides the browser-local caption track without changing the SRT. */
function toggleEditableSubtitlePreview() {
  subtitlePreviewEnabled = !subtitlePreviewEnabled;
  subtitlePreviewToggle.textContent = t(subtitlePreviewEnabled ? 'subtitle.previewHide' : 'subtitle.previewShow');
  refreshEditableSubtitlePreview();
}

/** Downloads the current normalized SRT without contacting the server. */
function downloadEditableSrt() {
  try {
    const srt = serializeEditableSubtitleCues();
    const sourceName = selectedSubtitleFile?.name || 'subtitles';
    const baseName = sourceName.replace(/\.[^.]+$/, '');
    const url = URL.createObjectURL(new Blob([srt], { type: 'application/x-subrip;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.srt`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
    setSubtitleMessage(t('subtitle.srtDownloaded'), 'success', SUBTITLE_NOTICE_DISMISS_MS);
  } catch (error) {
    setSubtitleMessage(error.message);
  }
}

/** Streams normalized SRT bytes followed by the selected video into one job. */
function uploadSubtitleComposition(file, srt, mode, duration, onProgress) {
  return new Promise((resolve, reject) => {
    const subtitleBytes = new TextEncoder().encode(srt);
    const body = new Blob([subtitleBytes, file], { type: file.type || 'application/octet-stream' });
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/subtitle-compose-jobs');
    const accessToken = uploadAccessToken();
    if (accessToken) xhr.setRequestHeader('authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-vdownloader-upload', '1');
    xhr.setRequestHeader('x-vdownloader-subtitle', '1');
    xhr.setRequestHeader('x-vdownloader-subtitle-compose', '1');
    xhr.setRequestHeader('x-upload-name', encodeURIComponent(file.name));
    xhr.setRequestHeader('x-upload-size', String(file.size));
    xhr.setRequestHeader('x-upload-duration', String(duration));
    xhr.setRequestHeader('x-upload-start', '0');
    xhr.setRequestHeader('x-upload-end', String(duration));
    xhr.setRequestHeader('x-subtitle-size', String(subtitleBytes.byteLength));
    xhr.setRequestHeader('x-subtitle-mode', mode);
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    });
    xhr.addEventListener('load', () => {
      const response = (() => { try { return JSON.parse(xhr.responseText || '{}'); } catch { return {}; } })();
      if (xhr.status >= 200 && xhr.status < 300) resolve(response);
      else reject(new Error(apiError(response, 'subtitle.composeFailed')));
    });
    xhr.addEventListener('error', () => reject(new Error(t('upload.network'))));
    xhr.addEventListener('abort', () => reject(new Error(t('upload.cancelled'))));
    xhr.send(body);
  });
}

/** Queues a selectable or burned MP4 after validating the complete editor. */
async function exportSubtitleComposition(mode) {
  if (!selectedSubtitleFile || subtitleFileKind(selectedSubtitleFile) !== 'video') {
    setSubtitleMessage(t('subtitle.selectBeforeCompose'));
    return;
  }
  const buttons = [subtitleComposeSelectable, subtitleComposeBurned];
  try {
    const srt = serializeEditableSubtitleCues();
    buttons.forEach((button) => { button.disabled = true; });
    const active = mode === 'burned' ? subtitleComposeBurned : subtitleComposeSelectable;
    const original = active.textContent;
    active.dataset.originalText = original;
    const job = await uploadSubtitleComposition(
      selectedSubtitleFile,
      srt,
      mode,
      Number(subtitleLocalExport.dataset.duration),
      (progress) => { active.textContent = t('upload.progress', { progress }); }
    );
    active.textContent = t('subtitle.composing');
    setSubtitleMessage(t('upload.complete'), 'success', SUBTITLE_NOTICE_DISMISS_MS);
    refreshDownloadsPanel();
    await monitorJob(job, subtitleJobsArea);
  } catch (error) {
    renderJobError(subtitleJobsArea, error.message);
    setSubtitleMessage(error.message);
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
    subtitleComposeSelectable.textContent = t('subtitle.composeSelectable');
    subtitleComposeBurned.textContent = t('subtitle.composeBurned');
  }
}

/** Summarizes local track extraction or speech-to-text generation. */
function updateLocalSubtitleSummary() {
  if (subtitleLocalMode === 'compose') {
    subtitleLocalSummary.hidden = true;
    return;
  }
  const range = exportRange(subtitleLocalExport);
  if (!selectedSubtitleFile || !range || subtitleLocalExport.classList.contains('disabled')) {
    subtitleLocalSummary.hidden = true;
    return;
  }
  const values = {
    name: selectedSubtitleFile.name,
    track: Number(subtitleLocalTrack.value) + 1,
    language: subtitleTranscriptionLanguage.options[subtitleTranscriptionLanguage.selectedIndex]?.textContent || '',
    model: subtitleTranscriptionModel.options[subtitleTranscriptionModel.selectedIndex]?.textContent || '',
    format: subtitleLocalFormat.value.toUpperCase(),
    range: `${formatTime(range.start)}–${formatTime(range.end)}`
  };
  subtitleLocalSummaryText.textContent = t(
    subtitleLocalMode === 'generate' ? 'subtitle.transcriptionSummary' : 'subtitle.localSummary',
    values
  );
  subtitleLocalSummary.hidden = false;
}

/** Uploads local media once and queues extraction or local transcription. */
function uploadLocalSubtitle(file, start, end, duration, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const generated = subtitleLocalMode === 'generate';
    xhr.open('POST', generated ? '/api/transcription-jobs' : '/api/subtitle-upload-jobs');
    const accessToken = uploadAccessToken();
    if (accessToken) xhr.setRequestHeader('authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-vdownloader-upload', '1');
    xhr.setRequestHeader('x-vdownloader-subtitle', '1');
    xhr.setRequestHeader('x-upload-name', encodeURIComponent(file.name));
    xhr.setRequestHeader('x-upload-duration', String(duration));
    xhr.setRequestHeader('x-upload-start', String(start));
    xhr.setRequestHeader('x-upload-end', String(end));
    xhr.setRequestHeader('x-subtitle-format', subtitleLocalFormat.value);
    if (generated) {
      xhr.setRequestHeader('x-vdownloader-transcription', '1');
      xhr.setRequestHeader('x-transcription-language', subtitleTranscriptionLanguage.value);
      xhr.setRequestHeader('x-transcription-model', subtitleTranscriptionModel.value);
    } else {
      xhr.setRequestHeader('x-subtitle-track', subtitleLocalTrack.value);
    }
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    });
    xhr.addEventListener('load', () => {
      const response = (() => { try { return JSON.parse(xhr.responseText || '{}'); } catch { return {}; } })();
      if (xhr.status >= 200 && xhr.status < 300) resolve(response);
      else reject(new Error(apiError(response, generated ? 'subtitle.transcriptionFailed' : 'subtitle.uploadFailed')));
    });
    xhr.addEventListener('error', () => reject(new Error(t('upload.network'))));
    xhr.addEventListener('abort', () => reject(new Error(t('upload.cancelled'))));
    xhr.send(file);
  });
}

/** Validates and starts local subtitle extraction or speech-to-text. */
async function exportLocalSubtitles() {
  if (!selectedSubtitleFile) {
    setSubtitleMessage(t('subtitle.selectBeforeExport'));
    return;
  }
  const range = exportRange(subtitleLocalExport);
  if (!range || subtitleLocalExport.classList.contains('disabled')) {
    setSubtitleMessage(t('subtitle.invalidRange'));
    return;
  }
  if (subtitleLocalMode === 'generate' && range.end - range.start > maxTranscriptionMinutes * 60) {
    setSubtitleMessage(t('subtitle.transcriptionTooLong', { minutes: maxTranscriptionMinutes }));
    return;
  }
  subtitleLocalExport.disabled = true;
  try {
    const job = await uploadLocalSubtitle(
      selectedSubtitleFile,
      range.start,
      range.end,
      Number(subtitleLocalExport.dataset.duration),
      (progress) => { subtitleLocalExport.textContent = t('upload.progress', { progress }); }
    );
    subtitleLocalExport.textContent = t(subtitleLocalMode === 'generate' ? 'subtitle.transcribing' : 'subtitle.processing');
    setSubtitleMessage(t('upload.complete'), 'success', SUBTITLE_NOTICE_DISMISS_MS);
    refreshDownloadsPanel();
    await monitorJob(job, subtitleJobsArea);
  } catch (error) {
    renderJobError(subtitleJobsArea, error.message);
    setSubtitleMessage(error.message);
  } finally {
    subtitleLocalExport.disabled = false;
    subtitleLocalExport.textContent = t(subtitleLocalMode === 'generate' ? 'subtitle.generate' : 'subtitle.export');
  }
}

/** Updates codec and bitrate controls for the selected local-audio container. */
function updateAudioFormatUi() {
  updateAudioProfileControls(audioOutputFormat, audioOutputCodec, audioOutputBitrate, audioOutputHint);
}

/** Updates codec and quality controls used to extract audio from local video. */
function updateVideoAudioExtractionUi() {
  updateAudioProfileControls(
    videoAudioOutputFormat,
    videoAudioOutputCodec,
    videoAudioOutputBitrate,
    videoAudioExtractionHint
  );
}

/** Switches the local video editor between video output and audio-only output. */
function updateLocalExportModeUi() {
  const audioOnly = localExportMode.value === 'audio';
  videoOutputSettings.hidden = audioOnly;
  videoOutputHint.hidden = audioOnly;
  videoAudioExtractionSettings.hidden = !audioOnly;
  videoAudioExtractionHint.hidden = !audioOnly;
  identityCard.hidden = audioOnly;
  toggleIdentityProtection();
  updateLocalExportSummary();
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
      onChange: (range, enabled) => {
        const effectiveRange = range || (!enabled ? { start: 0, end: source.duration } : null);
        if (!effectiveRange) {
          if (enabled) audioExportSummary.hidden = true;
          return;
        }
        source.start = effectiveRange.start;
        source.end = effectiveRange.end;
        renderAudioSourceList();
        updateAudioExportSummary();
      }
    }
  );
  audioClipMount.replaceChildren(audioClipControls.element);
  audioClipControls.enable();
  renderAudioSourceList();
  updateAudioExportSummary();
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
    audioExportSummary.hidden = true;
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
  audioExportSummary.hidden = true;
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
  const videoFiles = files.filter((file) => ['.mp4', '.m4v', '.mov', '.webm'].includes(
    file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || ''
  ));
  if (videoFiles.length) {
    if (files.length !== 1) {
      audioUploadMessage.textContent = t('audio.mixedVideoSelection');
      return;
    }
    selectLocalTool('extract', { scroll: false });
    localAudioFile.value = '';
    await loadSelectedLocalVideo(videoFiles[0]);
    audioUploadMessage.textContent = t('audio.videoRedirect');
    audioUploadMessage.className = 'local-upload-message success';
    return;
  }
  try {
    await refreshUploadSettings();
  } catch (error) {
    audioUploadMessage.textContent = error.message.startsWith('Upload') || error.name === 'TimeoutError' || error.name === 'TypeError' ? t('local.settingsUnavailable') : error.message;
    return;
  }
  if (files.some((file, index) => localAudioFile.files?.[index] !== file)) return;
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
    const accessToken = uploadAccessToken();
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
    const accessToken = uploadAccessToken();
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
  if (!selectedAudioSources.length) {
    audioUploadMessage.textContent = t('audio.selectBeforeExport');
    audioUploadMessage.className = 'local-upload-message';
    return;
  }
  if (audioExportButton.classList.contains('disabled')) {
    audioUploadMessage.textContent = t('local.invalidExportRange');
    audioUploadMessage.className = 'local-upload-message';
    return;
  }
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
  const audioOnly = localExportMode.value === 'audio';
  identityControls.hidden = audioOnly || !identityEnabled.checked;
  localExportButton.textContent = audioOnly
    ? t('video.extractButton')
    : identityEnabled.checked
      ? t('identity.exportProtected')
      : t('local.createVideo');
  if (!audioOnly && identityEnabled.checked) drawIdentityPreview();
  else clearIdentityPreview();
}

/** Devuelve el intervalo actual expuesto por los controles de recorte. */
function getLocalClipRange() {
  return exportRange(localExportButton);
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
    const accessToken = uploadAccessToken();
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

/** Uploads a local video whose selected range will be exported as audio only. */
function uploadExtractedVideoAudio(file, start, end, duration, outputProfile, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/video-audio-jobs');
    const accessToken = uploadAccessToken();
    if (accessToken) xhr.setRequestHeader('authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('content-type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('x-vdownloader-upload', '1');
    xhr.setRequestHeader('x-vdownloader-audio-extract', '1');
    xhr.setRequestHeader('x-upload-name', encodeURIComponent(file.name));
    xhr.setRequestHeader('x-upload-duration', String(duration));
    xhr.setRequestHeader('x-upload-start', String(start));
    xhr.setRequestHeader('x-upload-end', String(end));
    xhr.setRequestHeader('x-audio-format', outputProfile.format);
    xhr.setRequestHeader('x-audio-codec', outputProfile.audioCodec);
    if (!AUDIO_OUTPUT_PROFILES[outputProfile.format].lossless) {
      xhr.setRequestHeader('x-audio-bitrate', String(outputProfile.bitrate));
    }
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100));
    });
    xhr.addEventListener('load', () => {
      const response = (() => { try { return JSON.parse(xhr.responseText || '{}'); } catch { return {}; } })();
      if (xhr.status >= 200 && xhr.status < 300) resolve(response);
      else reject(new Error(apiError(response, 'video.extractUploadFailed')));
    });
    xhr.addEventListener('error', () => reject(new Error(t('upload.network'))));
    xhr.addEventListener('abort', () => reject(new Error(t('upload.cancelled'))));
    xhr.send(file);
  });
}

/** Crea la tarea local después de validar el intervalo elegido. */
async function exportLocalClip() {
  if (!selectedLocalFile) {
    localUploadMessage.textContent = t('local.selectBeforeExport');
    localUploadMessage.className = 'local-upload-message';
    return;
  }
  if (localExportButton.classList.contains('disabled')) {
    localUploadMessage.textContent = t('local.invalidExportRange');
    localUploadMessage.className = 'local-upload-message';
    return;
  }
  const range = exportRange(localExportButton);
  const duration = Number(localExportButton.dataset.duration);
  if (!range) {
    localUploadMessage.textContent = t('local.invalidExportRange');
    return;
  }
  const { start, end } = range;
  const audioOnly = localExportMode.value === 'audio';
  localExportButton.disabled = true;
  try {
    let identityTrackId = null;
    if (!audioOnly && identityEnabled.checked) {
      localExportButton.textContent = t('identity.preparing');
      identityTrackId = await registerIdentityTrack(range);
    }
    const progress = (value) => {
      localExportButton.textContent = t('upload.progress', { progress: value });
    };
    const job = audioOnly
      ? await uploadExtractedVideoAudio(selectedLocalFile, start, end, duration, {
        format: videoAudioOutputFormat.value,
        audioCodec: videoAudioOutputCodec.value,
        bitrate: Number(videoAudioOutputBitrate.value)
      }, progress)
      : await uploadLocalFile(selectedLocalFile, start, end, duration, identityTrackId, {
        format: videoOutputFormat.value,
        videoCodec: videoOutputCodec.value,
        audioCodec: videoAudioCodec.value
      }, progress);
    localExportButton.textContent = t(audioOnly ? 'video.extracting' : 'job.processing');
    localUploadMessage.textContent = t(audioOnly ? 'video.extractUploadComplete' : 'upload.complete');
    localUploadMessage.className = 'local-upload-message success';
    refreshDownloadsPanel();
    await monitorJob(job, localJobsArea);
  } catch (error) {
    renderJobError(localJobsArea, error.message);
    localUploadMessage.textContent = error.message;
    localUploadMessage.className = 'local-upload-message';
  } finally {
    localExportButton.disabled = false;
    updateLocalExportModeUi();
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
  const stageRail = document.createElement('div');
  stageRail.className = 'job-stage-rail';
  const stageOrder = ['queued', 'downloading', 'processing', 'finalizing'];
  const stageNodes = stageOrder.map((stage) => {
    const node = document.createElement('span');
    node.textContent = t(`job.stage.${stage}`);
    stageRail.append(node);
    return node;
  });
  const detail = document.createElement('p');
  const resumeInline = document.createElement('div');
  resumeInline.className = 'resume-notice';
  resumeInline.hidden = true;
  top.append(status, actions);
  card.append(top, stageRail, progress, detail, resumeInline);
  jobsArea.replaceChildren(card);

  let job = initialJob;
  cancel.addEventListener('click', async () => {
    cancel.disabled = true;
    cancel.textContent = t('actions.cancelling');
    try { await apiFetch(`/api/jobs/${job.id}`, { method: 'DELETE' }); } catch {}
  });
  while (true) {
    const value = Math.max(0, Math.min(100, job.progress || 0));
    const currentStage = job.status === 'queued'
      ? 'queued'
      : (stageOrder.includes(job.stage) ? job.stage : 'processing');
    const currentStageIndex = job.status === 'ready' ? stageOrder.length : stageOrder.indexOf(currentStage);
    stageNodes.forEach((node, index) => {
      node.classList.toggle('is-done', index < currentStageIndex);
      node.classList.toggle('is-current', index === currentStageIndex);
    });
    status.textContent = job.status === 'queued'
      ? t('job.queuedProgress')
      : (job.status === 'retrying'
          ? (['upload', 'audio', 'subtitle'].includes(job.provider) ? t('job.checkingSource') : t('job.refreshingLink'))
          : t(job.mediaKind === 'subtitle'
            ? 'subtitle.processing'
            : job.mediaKind === 'audio'
              ? 'audio.processing'
              : 'job.preparingMp4'));
    percent.textContent = `${value}%`;
    bar.style.width = `${value}%`;
    detail.textContent = job.status === 'queued'
      ? t('job.waitingSlot')
      : (job.status === 'retrying'
          ? (['upload', 'audio', 'subtitle'].includes(job.provider)
              ? t('job.preparingSource')
              : t('job.retry', { attempt: job.attempts, total: job.maxRetries + 1 }))
          : (['downloading', 'processing', 'finalizing'].includes(currentStage)
              ? t(`job.stage.${currentStage}Detail`)
              : formatJobEta(job)));
    const showResume = job.resumeAvailable || job.resumedFromBytes > 0;
    resumeInline.hidden = !showResume;
    if (showResume) resumeInline.textContent = resumeSummary(job);

    if (job.status === 'ready') {
      status.textContent = t('job.ready');
      percent.textContent = formatBytes(job.size);
      detail.textContent = t(job.mediaKind === 'subtitle'
        ? 'subtitle.readyDescription'
        : job.mediaKind === 'audio'
          ? 'audio.readyDescription'
          : 'job.readyDescription');
      cancel.remove();
      stageNodes.forEach((node) => {
        node.classList.add('is-done');
        node.classList.remove('is-current');
      });
      const readyActions = document.createElement('div');
      readyActions.className = 'ready-actions';
      const download = document.createElement('a');
      download.className = 'download-ready';
      download.textContent = t('actions.downloadFile');
      configureDownloadLink(download, job, detail);
      if (jobsArea === subtitleJobsArea) {
        download.addEventListener('vdownloader:download-started', () => dismissInlineSubtitleResult(card), { once: true });
      }
      const another = document.createElement('button');
      another.type = 'button';
      another.className = 'secondary-action';
      another.textContent = t('actions.createAnother');
      another.addEventListener('click', () => {
        const creationArea = jobsArea.closest('.video-info, .local-tool-card');
        creationArea?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        creationArea?.querySelector('button:not([disabled]), select:not([disabled])')?.focus({ preventScroll: true });
      });
      const viewDownloads = document.createElement('button');
      viewDownloads.type = 'button';
      viewDownloads.className = 'secondary-action';
      viewDownloads.textContent = t('actions.viewDownloads');
      viewDownloads.addEventListener('click', () => {
        downloadsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        downloadsPanel.focus?.({ preventScroll: true });
      });
      readyActions.append(download, another, viewDownloads);
      card.append(readyActions);
      saveHistory(job);
      notifyJobReady(job);
      requestAnimationFrame(() => {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        download.focus({ preventScroll: true });
      });
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
      refreshDownloadsPanel();
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
    link.textContent = t('actions.download');
    configureDownloadLink(link, entry);
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
    if (panelJobsInitialized) {
      for (const job of data.jobs) if (job.status === 'ready') notifyJobReady(job);
    } else {
      for (const job of data.jobs) if (job.status === 'ready') notifiedReadyJobs.add(job.id);
      panelJobsInitialized = true;
    }
    latestPanelJobs = data.jobs;
    latestPanelStats = data.stats;
    const knownIds = new Set(data.jobs.map((job) => job.id));
    for (const id of selectedPanelJobs) if (!knownIds.has(id)) selectedPanelJobs.delete(id);
    adminRestartSelected.disabled = currentAccessRole !== 'admin' || selectedPanelJobs.size === 0;
    renderPanelStats(data.stats);
    renderPanelJobs(latestPanelJobs);
    updateReadyCounter(latestPanelJobs);
    downloadsPanel.hidden = false;
  } catch {}
}

/** Consulta el diagnóstico operativo sin bloquear el panel de tareas. */
async function refreshServiceHealth() {
  try {
    const response = await apiFetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
    const health = await response.json();
    if (![200, 503].includes(response.status) || !health.dependencies) {
      currentAccessRole = 'none';
      for (const control of [adminRestartSelected, adminCleanExpired, adminRefreshAudit, adminTokenInput]) control.disabled = true;
      dependencyHealth.textContent = t('health.unverified');
      adminHint.textContent = accessTokenPending ? t('security.pending')
        : response.status === 429 ? accessRetryMessage()
        : response.status === 401 || response.status === 403 ? t('security.nativeAccessRequired')
        : t('local.settingsUnavailable');
      const message = response.status === 429 ? accessRetryMessage()
        : health.error === 'demo_access_required' ? t('security.demoExpired')
        : response.status === 401 || response.status === 403 ? t('security.invalidToken')
        : t('security.validationFailed');
      return { authenticated: false, message };
    }
    renderServiceHealth(health);
    return { authenticated: true, ok: response.ok };
  } catch {
    dependencyHealth.textContent = t('health.unverified');
    adminHint.textContent = t('local.settingsUnavailable');
    return { authenticated: false, message: t('security.validationFailed') };
  }
}

/** Muestra versiones y disponibilidad de herramientas y editores locales. */
function renderServiceHealth(health) {
  const dependencies = health.dependencies || {};
  const effectiveUploadBytes = Number(health.uploads?.effectiveMaxBytes ?? health.uploads?.maxBytes);
  if (effectiveUploadBytes > 0) maxUploadBytes = effectiveUploadBytes;
  const reportedTranscriptionMinutes = Number(health.subtitleTools?.automaticTranscription?.maxMinutes);
  if (Number.isFinite(reportedTranscriptionMinutes) && reportedTranscriptionMinutes > 0) {
    maxTranscriptionMinutes = reportedTranscriptionMinutes;
  }
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
      ? t(health.uploads?.limitEnabled === false ? 'health.noUploadLimit' : 'health.maximum', { size: formatBytes(maxUploadBytes) })
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

/** Returns a transparent summary of the bytes that yt-dlp can continue. */
function resumeSummary(job) {
  const size = formatBytes(job.resumedFromBytes || job.partialBytes || 0);
  const percent = Number(job.partialPercent);
  if (job.resumedFromBytes > 0 && ['queued', 'retrying', 'processing'].includes(job.status)) {
    return Number.isFinite(percent) && percent > 0
      ? t('resume.resumingPercent', { percent, size })
      : t('resume.resuming', { size });
  }
  return t('resume.preserved', { size });
}

/** Discards only the selected job's server-owned YouTube staging prefix. */
async function discardJobPartial(job, control) {
  if (!window.confirm(t('resume.discardConfirm'))) return;
  control.disabled = true;
  try {
    const response = await apiFetch(`/api/jobs/${job.id}/partial`, {
      method: 'DELETE', headers: { 'x-vdownloader-partial': '1' }
    });
    const body = await response.json();
    if (!response.ok) throw new Error(apiError(body, 'resume.discardFailed'));
    panelMessage.textContent = t('resume.discarded');
    panelMessage.className = 'panel-message success';
    await refreshDownloadsPanel();
  } catch (error) {
    panelMessage.textContent = error.message;
    panelMessage.className = 'panel-message error';
    control.disabled = false;
  }
}

/** Creates the partial-download notice and optional terminal cleanup action. */
function createResumeNotice(job) {
  if (!job.resumeAvailable && !job.resumedFromBytes) return null;
  const notice = document.createElement('div');
  notice.className = 'resume-notice';
  const text = document.createElement('span');
  text.textContent = resumeSummary(job);
  notice.append(text);
  if (job.resumeAvailable && ['error', 'cancelled'].includes(job.status)) {
    const discard = document.createElement('button');
    discard.type = 'button';
    discard.textContent = t('resume.discard');
    discard.addEventListener('click', () => discardJobPartial(job, discard));
    notice.append(discard);
  }
  return notice;
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
      retrying: job.resumedFromBytes > 0
        ? resumeSummary(job)
        : ['upload', 'audio'].includes(job.provider)
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
    const resumeNotice = createResumeNotice(job);
    if (resumeNotice) info.append(resumeNotice);
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
      download.textContent = t('actions.download');
      configureDownloadLink(download, job);
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
