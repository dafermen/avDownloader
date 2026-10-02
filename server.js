import http from 'node:http';
import https from 'node:https';
import { createReadStream } from 'node:fs';
import { mkdir, open, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isIP } from 'node:net';
import { normalizeSourceUrl, providerById, providerForMediaUrl } from './providers/index.js';
import { pornhubProvider } from './providers/pornhub.js';
import { parseHlsManifest as parseProviderHlsManifest } from './providers/utils.js';
import { xnxxProvider } from './providers/xnxx.js';
import { xvideosProvider } from './providers/xvideos.js';
import { getYtDlpStatus } from './providers/youtube.js';

/**
 * Configuración inmutable del proceso. Las variables de entorno permiten
 * adaptar el servicio sin modificar código. Todos los límites se normalizan
 * aquí para que el resto del programa trabaje con valores seguros.
 */
const PORT = Number(process.env.PORT) || 5177;
let ffmpegFallbackPath = null;
if (process.platform !== 'linux' && !process.env.FFMPEG_PATH) {
  try { ffmpegFallbackPath = (await import('ffmpeg-static')).default; } catch {}
}
const FFMPEG_COMMAND = process.env.FFMPEG_PATH?.trim()
  || (process.platform === 'linux' ? 'ffmpeg' : ffmpegFallbackPath || 'ffmpeg');
const PUBLIC_DIR = resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const HLS_JS_FILE = resolve(fileURLToPath(new URL('./node_modules/hls.js/dist/hls.min.js', import.meta.url)));
const MEDIAPIPE_DIR = resolve(fileURLToPath(new URL('./node_modules/@mediapipe/tasks-vision/', import.meta.url)));
const MAX_BODY_BYTES = 16_384;
const MAX_IDENTITY_BODY_BYTES = 512 * 1024;
const PAGE_TIMEOUT_MS = 15_000;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36';
const JOB_DIR = resolve(process.env.JOB_DIR || fileURLToPath(new URL('./data/jobs/', import.meta.url)));
const JOB_INDEX_FILE = join(JOB_DIR, 'jobs.json');
const configuredTtlMinutes = Number(process.env.JOB_TTL_MINUTES);
const JOB_TTL_MINUTES = Number.isFinite(configuredTtlMinutes) && configuredTtlMinutes >= 5
  ? Math.min(10_080, Math.floor(configuredTtlMinutes))
  : 60;
const JOB_TTL_MS = JOB_TTL_MINUTES * 60 * 1000;
const MAX_CONCURRENT_JOBS = Math.min(8, Math.max(1, Number(process.env.MAX_CONCURRENT_JOBS) || 2));
const configuredRetries = Number(process.env.MAX_JOB_RETRIES);
const MAX_JOB_RETRIES = Number.isFinite(configuredRetries) && configuredRetries >= 0
  ? Math.min(5, Math.floor(configuredRetries))
  : 2;
const configuredStorageGb = Number(process.env.MAX_STORAGE_GB);
const MAX_STORAGE_BYTES = Math.round((Number.isFinite(configuredStorageGb) && configuredStorageGb > 0 ? configuredStorageGb : 10) * 1024 ** 3);
const configuredUploadGb = Number(process.env.MAX_UPLOAD_GB);
const MAX_UPLOAD_BYTES = Math.min(
  MAX_STORAGE_BYTES,
  Math.round((Number.isFinite(configuredUploadGb) && configuredUploadGb > 0 ? configuredUploadGb : 2) * 1024 ** 3)
);
// Si ADMIN_TOKEN está vacío, las acciones administrativas solo se permiten
// desde el propio equipo (localhost). En un servidor remoto debe configurarse.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN?.trim() || '';
const REMOTE_ACCESS_ENABLED = /^true$/i.test(process.env.REMOTE_ACCESS_ENABLED || '');
const SERVER_HOST = REMOTE_ACCESS_ENABLED ? (process.env.HOST?.trim() || '0.0.0.0') : '127.0.0.1';
const HTTPS_KEY_PATH = process.env.HTTPS_KEY_PATH?.trim() || '';
const HTTPS_CERT_PATH = process.env.HTTPS_CERT_PATH?.trim() || '';
const TRUSTED_HTTPS_PROXY = /^true$/i.test(process.env.TRUSTED_HTTPS_PROXY || '');
const configuredRateLimit = Number(process.env.RATE_LIMIT_MAX);
const RATE_LIMIT_MAX = Number.isInteger(configuredRateLimit) && configuredRateLimit >= 10
  ? Math.min(10_000, configuredRateLimit)
  : 120;
const configuredUserJobs = Number(process.env.MAX_ACTIVE_JOBS_PER_USER);
const DEFAULT_USER_JOB_LIMIT = Number.isInteger(configuredUserJobs) && configuredUserJobs >= 1
  ? Math.min(100, configuredUserJobs)
  : 4;
const ACCESS_PROFILES = parseAccessProfiles(process.env.ACCESS_TOKENS_JSON || '[]');
const jobs = new Map();
const jobQueue = [];
const mediaSelections = new Map();
const mediaReferences = new Map();
const identityTracks = new Map();
const requestRates = new Map();
const authenticationFailures = new Map();
const administrativeAudit = [];
const SELECTION_TTL_MS = 15 * 60 * 1000;
const MEDIA_REFERENCE_TTL_MS = 30 * 60 * 1000;
const IDENTITY_TRACK_TTL_MS = 30 * 60 * 1000;
let activeJobs = 0;
let persistTimer = null;
const SERVICE_STARTED_AT = Date.now();
let dependencyStatus = null;
const RATE_LIMIT_WINDOW_MS = 60_000;
const AUTH_FAILURE_WINDOW_MS = 15 * 60_000;

// `jobs` contiene el estado canónico en memoria. `jobQueue` solo guarda IDs
// pendientes y `activeJobs` cuenta procesos FFmpeg actualmente ejecutándose.

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

/** Escribe una línea JSON fácil de consultar con journald o cualquier agregador. */
function logEvent(level, event, details = {}) {
  const record = JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...details });
  const writer = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  writer(record);
}

/** Ejecuta una herramienta local y obtiene la primera línea de su versión. */
function inspectCommand(command, args) {
  if (!command) return Promise.resolve({ available: false, version: null });
  return new Promise((resolveStatus) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let output = '';
    const timer = setTimeout(() => child.kill(), 5_000);
    child.stdout.on('data', (chunk) => { output = (output + chunk).slice(0, 500); });
    child.once('error', () => {
      clearTimeout(timer);
      resolveStatus({ available: false, version: null });
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      const firstLine = output.trim().split(/\r?\n/)[0] || null;
      resolveStatus({ available: code === 0, version: code === 0 ? firstLine?.replace(/^ffmpeg version\s+/i, '').split(/\s/)[0] || null : null });
    });
  });
}

/** Actualiza el diagnóstico cacheado de las herramientas multimedia. */
async function refreshDependencyStatus() {
  const [ffmpeg, ytDlp] = await Promise.all([
    inspectCommand(FFMPEG_COMMAND, ['-version']),
    getYtDlpStatus()
  ]);
  dependencyStatus = { ffmpeg, ytDlp, checkedAt: Date.now() };
  return dependencyStatus;
}

/** @deprecated Alias público conservado para pruebas y compatibilidad. */
export function normalizeVideoUrl(value) {
  return normalizeSourceUrl(value).url;
}

/** @param {string} html HTML de XVideos. @returns {object} Modelo normalizado. */
export function parseVideoPage(html) {
  return xvideosProvider.parse(html);
}

/** @param {string} html HTML de Pornhub. @returns {object} Modelo normalizado. */
export function parsePornhubPage(html) {
  return pornhubProvider.parse(html);
}

/** @param {string} html HTML de XNXX. @returns {object} Modelo normalizado. */
export function parseXnxxPage(html) {
  return xnxxProvider.parse(html);
}

/**
 * Convierte los límites de recorte a segundos numéricos y valida su orden.
 * @param {number|string|null} startValue Segundo inicial; null desactiva recorte.
 * @param {number|string|null} endValue Segundo final exclusivo.
 * @returns {{start:number,end:number,duration:number}|null} Intervalo normalizado.
 * @throws {Error} Cuando el intervalo es negativo, invertido o excesivo.
 */
export function normalizeClipRange(startValue, endValue) {
  if (startValue == null && endValue == null) return null;
  const start = Number(startValue);
  const end = Number(endValue);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
    throw new Error('El intervalo de recorte no es válido.');
  }
  if (end > 43_200 || end - start < 1) {
    throw new Error('El recorte debe durar al menos un segundo y no superar 12 horas.');
  }
  return { start, end, duration: end - start };
}

/** Delega el análisis HLS compartido y mantiene una API pública para pruebas. */
export function parseHlsManifest(manifest, manifestUrl) {
  return parseProviderHlsManifest(manifest, manifestUrl);
}

/** @returns {string} Nombre ASCII seguro, sin rutas ni caracteres de control. */
function safeFilename(value) {
  const clean = value.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 _.-]/gi, '')
    .trim()
    .replace(/\s+/g, '-');
  return (clean || 'video').slice(0, 100);
}

const UPLOAD_TYPES = new Map([
  ['.mp4', new Set(['video/mp4'])],
  ['.m4v', new Set(['video/mp4', 'video/x-m4v'])],
  ['.mov', new Set(['video/quicktime'])],
  ['.webm', new Set(['video/webm'])]
]);

// Audio sources accepted by the additional local audio editor. File names and
// MIME types are checked before writing anything to the persistent job area.
const AUDIO_UPLOAD_TYPES = new Map([
  ['.mp3', new Set(['audio/mpeg', 'audio/mp3'])],
  ['.m4a', new Set(['audio/mp4', 'audio/x-m4a'])],
  ['.aac', new Set(['audio/aac', 'audio/x-aac'])],
  ['.wav', new Set(['audio/wav', 'audio/x-wav', 'audio/wave'])],
  ['.flac', new Set(['audio/flac', 'audio/x-flac'])],
  ['.ogg', new Set(['audio/ogg', 'application/ogg'])],
  ['.opus', new Set(['audio/ogg', 'audio/opus'])]
]);

// Output profiles are intentionally finite. The browser sends stable profile
// identifiers, never FFmpeg arguments. This keeps transcoding useful without
// turning an upload header into command execution.
const AUDIO_OUTPUTS = new Map([
  ['mp3', {
    extension: '.mp3', contentType: 'audio/mpeg', defaultCodec: 'mp3',
    codecs: new Set(['mp3'])
  }],
  ['m4a', {
    extension: '.m4a', contentType: 'audio/mp4', defaultCodec: 'aac',
    codecs: new Set(['aac'])
  }],
  ['ogg', {
    extension: '.ogg', contentType: 'audio/ogg', defaultCodec: 'vorbis',
    codecs: new Set(['vorbis', 'opus'])
  }],
  ['opus', {
    extension: '.opus', contentType: 'audio/ogg', defaultCodec: 'opus',
    codecs: new Set(['opus'])
  }],
  ['flac', {
    extension: '.flac', contentType: 'audio/flac', defaultCodec: 'flac',
    codecs: new Set(['flac'])
  }],
  ['wav', {
    extension: '.wav', contentType: 'audio/wav', defaultCodec: 'pcm-s16le',
    codecs: new Set(['pcm-s16le'])
  }]
]);
const AUDIO_BITRATES = new Set([96, 128, 192, 256, 320]);
const MAX_AUDIO_JOIN_SOURCES = 20;
const MAX_AUDIO_JOIN_METADATA_BYTES = 64 * 1024;

const VIDEO_OUTPUTS = new Map([
  ['mp4', {
    extension: '.mp4', contentType: 'video/mp4', defaultVideoCodec: 'h264',
    combinations: new Map([['h264', new Set(['aac'])], ['hevc', new Set(['aac'])]])
  }],
  ['mov', {
    extension: '.mov', contentType: 'video/quicktime', defaultVideoCodec: 'h264',
    combinations: new Map([['h264', new Set(['aac'])], ['hevc', new Set(['aac'])]])
  }],
  ['webm', {
    extension: '.webm', contentType: 'video/webm', defaultVideoCodec: 'vp9',
    combinations: new Map([['vp9', new Set(['opus'])]])
  }],
  ['mkv', {
    extension: '.mkv', contentType: 'video/x-matroska', defaultVideoCodec: 'h264',
    combinations: new Map([
      ['h264', new Set(['aac', 'opus'])],
      ['hevc', new Set(['aac', 'opus'])],
      ['vp9', new Set(['opus'])]
    ])
  }]
]);

/** Resolves an allowlisted video container/codec combination. */
function normalizeVideoOutputProfile(outputFormatValue, videoCodecValue, audioCodecValue) {
  const outputFormat = String(outputFormatValue || 'mp4').trim().toLowerCase();
  const output = VIDEO_OUTPUTS.get(outputFormat);
  if (!output) throw httpError('Selecciona un formato de video MP4, MOV, WebM o MKV.');
  const videoCodec = String(videoCodecValue || output.defaultVideoCodec).trim().toLowerCase();
  const audioCodecs = output.combinations.get(videoCodec);
  if (!audioCodecs) throw httpError('El códec de video no es compatible con el formato seleccionado.');
  const defaultAudioCodec = audioCodecs.values().next().value;
  const audioCodec = String(audioCodecValue || defaultAudioCodec).trim().toLowerCase();
  if (!audioCodecs.has(audioCodec)) {
    throw httpError('El códec de audio no es compatible con el formato de video seleccionado.');
  }
  return { outputFormat, output, videoCodec, audioCodec };
}

/** Crea un error HTTP conservando un mensaje seguro para el navegador. */
function httpError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

/**
 * Valida los metadatos declarados por el editor de archivos locales.
 * El archivo todavía no se ha escrito cuando se ejecuta esta función.
 *
 * @param {object} input Nombre, MIME, bytes, duración e intervalo.
 * @returns {{fileName:string,title:string,extension:string,contentType:string,contentLength:number,duration:number,clip:object,estimatedSize:number}}
 */
export function normalizeUploadMetadata(input) {
  let fileName;
  try { fileName = decodeURIComponent(String(input.fileName || '')).trim(); } catch {
    throw httpError('El nombre del archivo no tiene una codificación válida.');
  }
  if (!fileName || fileName.length > 300 || /[\u0000-\u001f]/.test(fileName)) {
    throw httpError('El nombre del archivo local no es válido.');
  }
  const extension = extname(fileName).toLowerCase();
  const acceptedTypes = UPLOAD_TYPES.get(extension);
  if (!acceptedTypes) throw httpError('Solo se admiten archivos MP4, M4V, MOV o WebM.');
  const contentType = String(input.contentType || '').split(';', 1)[0].trim().toLowerCase();
  if (contentType && contentType !== 'application/octet-stream' && !acceptedTypes.has(contentType)) {
    throw httpError('El tipo del archivo no coincide con su extensión.');
  }
  const contentLength = Number(input.contentLength);
  if (!Number.isInteger(contentLength) || contentLength < 1) {
    throw httpError('No fue posible determinar el tamaño del archivo.');
  }
  if (contentLength > MAX_UPLOAD_BYTES) {
    throw httpError(`El archivo supera el límite temporal de ${Math.round(MAX_UPLOAD_BYTES / 1024 ** 2)} MB.`, 413);
  }
  const duration = Number(input.duration);
  if (!Number.isFinite(duration) || duration < 1 || duration > 43_200) {
    throw httpError('La duración del archivo debe estar entre 1 segundo y 12 horas.');
  }
  const clip = normalizeClipRange(input.start, input.end);
  if (!clip || clip.end > duration + 0.25) {
    throw httpError('El intervalo seleccionado supera la duración del archivo.');
  }
  const titleWithoutExtension = fileName.slice(0, Math.max(0, fileName.length - extension.length));
  const outputProfile = normalizeVideoOutputProfile(
    input.outputFormat,
    input.videoCodec,
    input.audioCodec
  );
  const estimatedSize = Math.max(1, Math.ceil(contentLength * (clip.duration / duration) * 1.15));
  return {
    fileName,
    title: safeFilename(titleWithoutExtension),
    extension,
    contentType: contentType || acceptedTypes.values().next().value,
    contentLength,
    duration,
    clip,
    estimatedSize,
    outputFormat: outputProfile.outputFormat,
    outputExtension: outputProfile.output.extension,
    outputContentType: outputProfile.output.contentType,
    videoCodec: outputProfile.videoCodec,
    audioCodec: outputProfile.audioCodec
  };
}

/**
 * Validates a local audio source and its requested output encoding.
 *
 * @param {object} input Name, MIME, bytes, duration, range, format and bitrate.
 * @returns {{fileName:string,title:string,extension:string,contentType:string,contentLength:number,duration:number,clip:object,estimatedSize:number,outputFormat:string,outputExtension:string,outputContentType:string,audioCodec:string,bitrate:number|null}}
 */
export function normalizeAudioUploadMetadata(input) {
  let fileName;
  try { fileName = decodeURIComponent(String(input.fileName || '')).trim(); } catch {
    throw httpError('El nombre del archivo de audio no tiene una codificación válida.');
  }
  if (!fileName || fileName.length > 300 || /[\u0000-\u001f]/.test(fileName)) {
    throw httpError('El nombre del archivo de audio no es válido.');
  }
  const extension = extname(fileName).toLowerCase();
  const acceptedTypes = AUDIO_UPLOAD_TYPES.get(extension);
  if (!acceptedTypes) throw httpError('Solo se admiten archivos MP3, M4A, AAC, WAV, FLAC, OGG u Opus.');
  const contentType = String(input.contentType || '').split(';', 1)[0].trim().toLowerCase();
  if (contentType && contentType !== 'application/octet-stream' && !acceptedTypes.has(contentType)) {
    throw httpError('El tipo del audio no coincide con su extensión.');
  }
  const contentLength = Number(input.contentLength);
  if (!Number.isInteger(contentLength) || contentLength < 1) {
    throw httpError('No fue posible determinar el tamaño del audio.');
  }
  if (contentLength > MAX_UPLOAD_BYTES) {
    throw httpError(`El audio supera el límite temporal de ${Math.round(MAX_UPLOAD_BYTES / 1024 ** 2)} MB.`, 413);
  }
  const duration = Number(input.duration);
  if (!Number.isFinite(duration) || duration < 1 || duration > 43_200) {
    throw httpError('La duración del audio debe estar entre 1 segundo y 12 horas.');
  }
  const clip = normalizeClipRange(input.start, input.end);
  if (!clip || clip.end > duration + 0.25) {
    throw httpError('El intervalo seleccionado supera la duración del audio.');
  }
  const outputFormat = String(input.outputFormat || '').trim().toLowerCase();
  const output = AUDIO_OUTPUTS.get(outputFormat);
  if (!output) throw httpError('Selecciona un formato de salida MP3, M4A, OGG, Opus, FLAC o WAV.');
  const audioCodec = String(input.audioCodec || output.defaultCodec).trim().toLowerCase();
  if (!output.codecs.has(audioCodec)) {
    throw httpError('El códec de audio no es compatible con el formato seleccionado.');
  }
  const requestedBitrate = Number(input.bitrate);
  const lossless = new Set(['wav', 'flac']).has(outputFormat);
  const bitrate = lossless
    ? null
    : (AUDIO_BITRATES.has(requestedBitrate) ? requestedBitrate : 192);
  const estimatedBytesPerSecond = outputFormat === 'wav'
    ? 192_000
    : outputFormat === 'flac'
      ? 120_000
      : Math.ceil(bitrate * 1000 / 8 * 1.05);
  const titleWithoutExtension = fileName.slice(0, Math.max(0, fileName.length - extension.length));
  return {
    fileName,
    title: safeFilename(titleWithoutExtension),
    extension,
    contentType: contentType || acceptedTypes.values().next().value,
    contentLength,
    duration,
    clip,
    estimatedSize: Math.max(1, Math.ceil(clip.duration * estimatedBytesPerSecond)),
    outputFormat,
    outputExtension: output.extension,
    outputContentType: output.contentType,
    audioCodec,
    bitrate
  };
}

/** Valida el nombre relativo persistido de una fuente local. */
function uploadSourcePath(id, sourceFilename) {
  if (!/^[a-f0-9-]{36}$/i.test(id || '')) return null;
  const match = String(sourceFilename || '').match(/^([a-f0-9-]{36})\.source(?:-(\d{1,2}))?(\.[a-z0-9]+)$/i);
  const extension = match?.[3]?.toLowerCase();
  if (!match || match[1].toLowerCase() !== id.toLowerCase()
    || (!UPLOAD_TYPES.has(extension) && !AUDIO_UPLOAD_TYPES.has(extension))) return null;
  return join(JOB_DIR, sourceFilename);
}

/** Resolves a safe persisted output extension; legacy and remote jobs are MP4. */
function outputExtensionForJob(job) {
  if (job?.mediaKind === 'audio' && AUDIO_OUTPUTS.has(job.outputFormat)) {
    return AUDIO_OUTPUTS.get(job.outputFormat).extension;
  }
  if (job?.sourceType === 'upload' && VIDEO_OUTPUTS.has(job.outputFormat)) {
    return VIDEO_OUTPUTS.get(job.outputFormat).extension;
  }
  return '.mp4';
}

/** Comprueba HTTPS y que el host pertenezca al CDN de un proveedor registrado. */
function isAllowedMediaUrl(value) {
  return Boolean(providerForMediaUrl(value));
}

/** Registra una URL CDN en memoria y devuelve una referencia que no revela su firma. */
function registerMediaReference(url, providerId) {
  if (providerForMediaUrl(url)?.id !== providerId) throw new Error('El medio no corresponde al proveedor indicado.');
  const id = randomUUID();
  mediaReferences.set(id, { url, providerId, expiresAt: Date.now() + MEDIA_REFERENCE_TTL_MS });
  return id;
}

/** Obtiene una referencia vigente y prolonga su vida mientras la vista previa está activa. */
function resolveMediaReference(id) {
  const reference = mediaReferences.get(id);
  if (!reference || reference.expiresAt <= Date.now()) {
    if (reference) mediaReferences.delete(id);
    return null;
  }
  reference.expiresAt = Date.now() + MEDIA_REFERENCE_TTL_MS;
  return reference;
}

/**
 * Guarda las URL firmadas exclusivamente en el servidor y crea el modelo que
 * puede entregarse al navegador sin filtrar tokens del CDN.
 */
export function createOpaqueAnalysis(video, ownerId = 'local') {
  const expiresAt = Date.now() + SELECTION_TTL_MS;
  const publicQualities = video.qualities.map((quality) => {
    const providerId = video.provider;
    if (providerForMediaUrl(quality.url)?.id !== providerId) throw new Error('El proveedor devolvió un medio no autorizado.');
    if (quality.audioUrl && providerForMediaUrl(quality.audioUrl)?.id !== providerId) throw new Error('El proveedor devolvió un audio no autorizado.');
    const selectionId = randomUUID();
    const previewReference = registerMediaReference(quality.url, providerId);
    mediaSelections.set(selectionId, {
      url: quality.url,
      audioUrl: quality.audioUrl || null,
      type: quality.type,
      label: quality.label,
      estimatedSize: Number(quality.estimatedSize) || null,
      providerId,
      sourceUrl: video.sourceUrl,
      title: video.title,
      duration: video.duration,
      ownerId,
      expiresAt
    });
    return {
      label: quality.label,
      type: quality.type,
      selectionId,
      previewUrl: `/api/media/${previewReference}`,
      adaptive: Boolean(quality.audioUrl),
      ...(Number(quality.estimatedSize) > 0 ? { estimatedSize: Number(quality.estimatedSize) } : {})
    };
  });
  return { ...video, qualities: publicQualities };
}

/** Recupera una calidad analizada sin aceptar URL, título o proveedor del cliente. */
function resolveMediaSelection(id, ownerId = 'local') {
  const selection = mediaSelections.get(id);
  if (!selection || selection.expiresAt <= Date.now()) {
    if (selection) mediaSelections.delete(id);
    throw new Error('La selección caducó. Analiza nuevamente el video.');
  }
  if (selection.ownerId && selection.ownerId !== ownerId) {
    throw httpError('La selección no pertenece a este usuario.', 403);
  }
  return selection;
}

/**
 * Lee un cuerpo HTTP pequeño como JSON.
 * @param {import('node:http').IncomingMessage} req Solicitud entrante.
 * @returns {Promise<object>} Objeto deserializado.
 */
async function readJson(req, maxBytes = MAX_BODY_BYTES) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > maxBytes) throw new Error('La solicitud es demasiado grande.');
  }
  try {
    return JSON.parse(body || '{}');
  } catch {
    throw new Error('La solicitud no contiene JSON válido.');
  }
}

/**
 * Valida el seguimiento facial generado localmente por el navegador.
 *
 * Las coordenadas son proporciones del ancho/alto del video (0..1), no
 * posiciones absolutas. Cada muestra permanece vigente hasta la siguiente;
 * así FFmpeg puede construir una máscara temporal sin recibir el archivo dos
 * veces ni exponer rutas internas.
 *
 * @param {object} input Método, tamaño de bloque y muestras detectadas.
 * @param {number} expectedDuration Duración del recorte que se protegerá.
 * @returns {{method:string,blockSize:number,frames:Array}} Seguimiento seguro.
 */
export function normalizeIdentityProtection(input, expectedDuration) {
  const duration = Number(expectedDuration);
  if (!Number.isFinite(duration) || duration < 1 || duration > 43_200) {
    throw httpError('La duración de la protección de identidad no es válida.');
  }
  if (!input || input.method !== 'pixelate' || !Array.isArray(input.frames)) {
    throw httpError('El seguimiento facial no es válido.');
  }
  if (input.frames.length < 1 || input.frames.length > 900) {
    throw httpError('La protección debe contener entre 1 y 900 muestras.');
  }
  const blockSize = Math.min(64, Math.max(8, Math.round(Number(input.blockSize) || 16)));
  let previousTime = -1;
  let totalBoxes = 0;
  const samples = input.frames.map((frame) => {
    const time = Number(frame.time);
    if (!Number.isFinite(time) || time < 0 || time > duration || time <= previousTime) {
      throw httpError('Los tiempos del seguimiento facial no son válidos.');
    }
    previousTime = time;
    if (!Array.isArray(frame.boxes) || frame.boxes.length > 8) {
      throw httpError('Una muestra facial contiene demasiadas regiones.');
    }
    totalBoxes += frame.boxes.length;
    if (totalBoxes > 4_500) throw httpError('El seguimiento facial contiene demasiadas regiones.');
    const boxes = frame.boxes.map((box) => {
      const x = Number(box.x);
      const y = Number(box.y);
      const width = Number(box.width);
      const height = Number(box.height);
      if (![x, y, width, height].every(Number.isFinite)
        || x < 0 || y < 0 || width < 0.01 || height < 0.01
        || x + width > 1.0001 || y + height > 1.0001) {
        throw httpError('Una región facial está fuera de los límites del video.');
      }
      return {
        x: Number(x.toFixed(6)),
        y: Number(y.toFixed(6)),
        width: Number(width.toFixed(6)),
        height: Number(height.toFixed(6))
      };
    });
    return { time: Number(time.toFixed(3)), boxes };
  });
  const frames = samples.map((sample, index) => ({
    start: sample.time,
    end: Number((samples[index + 1]?.time ?? duration).toFixed(3)),
    boxes: sample.boxes
  })).filter((frame) => frame.end > frame.start);
  if (!frames.some((frame) => frame.boxes.length)) {
    throw httpError('No se detectaron rostros para proteger.');
  }
  return { method: 'pixelate', blockSize, frames };
}

/** Registra temporalmente un seguimiento y devuelve únicamente un UUID opaco. */
async function createIdentityTrack(req, res) {
  try {
    if (req.headers['x-vdownloader-identity'] !== '1') {
      throw httpError('La protección de identidad no está autorizada desde este origen.', 403);
    }
    const body = await readJson(req, MAX_IDENTITY_BODY_BYTES);
    const duration = Number(body.duration);
    const protection = normalizeIdentityProtection(body, duration);
    const id = randomUUID();
    identityTracks.set(id, {
      protection,
      duration,
      ownerId: req.auth?.id || 'local',
      expiresAt: Date.now() + IDENTITY_TRACK_TTL_MS
    });
    json(res, 201, { identityTrackId: id });
  } catch (error) {
    json(res, Number(error.statusCode) || 400, {
      error: error.message || 'No fue posible registrar la protección de identidad.'
    });
  }
}

/** Consume una referencia de seguimiento para que no pueda reutilizarse. */
function consumeIdentityTrack(id, expectedDuration, ownerId = 'local') {
  if (!id) return null;
  if (!/^[a-f0-9-]{36}$/i.test(String(id))) {
    throw httpError('La referencia de protección de identidad no es válida.');
  }
  const record = identityTracks.get(String(id));
  identityTracks.delete(String(id));
  if (!record || record.expiresAt <= Date.now()) {
    throw httpError('La protección de identidad caducó. Analiza los rostros nuevamente.');
  }
  if (record.ownerId && record.ownerId !== ownerId) {
    throw httpError('La protección de identidad no pertenece a este usuario.', 403);
  }
  if (Math.abs(record.duration - expectedDuration) > 0.25) {
    throw httpError('La protección no corresponde al recorte seleccionado.');
  }
  return record.protection;
}

/** Envía una respuesta JSON sin caché y con protección MIME. */
function json(res, status, data) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(data));
}

/**
 * Reconoce las representaciones IPv4 e IPv6 de localhost.
 * @param {string} address Dirección informada por el socket HTTP.
 * @returns {boolean} true únicamente para el equipo que ejecuta el servidor.
 */
export function isLoopbackAddress(address) {
  const normalized = String(address || '').toLowerCase();
  return normalized === '127.0.0.1'
    || normalized === '::1'
    || normalized.startsWith('::ffff:127.');
}

/**
 * Resolves the real client address when a deliberately trusted local reverse
 * proxy is in use. Forwarded headers are ignored for every non-loopback peer,
 * preventing a direct client from claiming localhost privileges.
 */
export function requestAddress(req, trustedProxy = TRUSTED_HTTPS_PROXY) {
  const peerAddress = String(req?.socket?.remoteAddress || 'unknown');
  if (!trustedProxy || !isLoopbackAddress(peerAddress)) return peerAddress;
  const forwardedAddresses = String(req?.headers?.['x-forwarded-for'] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  // The last address is the one appended by the immediate local proxy. A
  // client-controlled earlier value must never be able to claim 127.0.0.1.
  const forwarded = forwardedAddresses.at(-1) || '';
  return isIP(forwarded) ? forwarded : 'unknown-proxy-client';
}

/** Returns true only for native TLS or HTTPS asserted by a local trusted proxy. */
export function isSecureRequest(req, trustedProxy = TRUSTED_HTTPS_PROXY) {
  if (req?.socket?.encrypted) return true;
  if (!trustedProxy || !isLoopbackAddress(req?.socket?.remoteAddress)) return false;
  const forwardedProtocol = String(req?.headers?.['x-forwarded-proto'] || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .at(-1);
  return forwardedProtocol === 'https';
}

/** Fails closed when a non-loopback remote-mode request is not verified HTTPS. */
export function requiresSecureTransport(
  req,
  remoteAccessEnabled = REMOTE_ACCESS_ENABLED,
  trustedProxy = TRUSTED_HTTPS_PROXY
) {
  return remoteAccessEnabled
    && !isLoopbackAddress(requestAddress(req, trustedProxy))
    && !isSecureRequest(req, trustedProxy);
}

/**
 * Parses remote access profiles from a JSON environment value.
 * Tokens remain process-only secrets and are never returned or persisted.
 *
 * @param {string} value JSON array with id, token, role and optional job limit.
 * @returns {Array<{id:string,token:string,role:'user'|'admin',maxActiveJobs:number}>}
 */
export function parseAccessProfiles(value) {
  let records;
  try { records = JSON.parse(String(value || '[]')); } catch {
    throw new Error('ACCESS_TOKENS_JSON must contain valid JSON.');
  }
  if (!Array.isArray(records) || records.length > 100) {
    throw new Error('ACCESS_TOKENS_JSON must be an array with at most 100 profiles.');
  }
  const ids = new Set();
  const tokens = new Set();
  return records.map((record) => {
    const id = String(record?.id || '').trim();
    const token = String(record?.token || '');
    const role = record?.role === 'admin' ? 'admin' : 'user';
    if (!/^[a-z0-9][a-z0-9._-]{1,63}$/i.test(id) || ids.has(id)) {
      throw new Error('Every access profile needs a unique safe id.');
    }
    if (token.length < 24 || tokens.has(token)) {
      throw new Error('Every access profile needs a unique token of at least 24 characters.');
    }
    ids.add(id);
    tokens.add(token);
    const requestedLimit = Number(record.maxActiveJobs);
    return {
      id,
      token,
      role,
      maxActiveJobs: Number.isInteger(requestedLimit) && requestedLimit >= 1
        ? Math.min(100, requestedLimit)
        : DEFAULT_USER_JOB_LIMIT
    };
  });
}

/**
 * Compara secretos sin terminar antes cuando aparece un carácter diferente.
 * Esto reduce filtraciones temporales del token administrativo.
 */
function tokensMatch(candidate, expected) {
  const candidateBuffer = Buffer.from(String(candidate || ''), 'utf8');
  const expectedBuffer = Buffer.from(String(expected || ''), 'utf8');
  return candidateBuffer.length === expectedBuffer.length
    && timingSafeEqual(candidateBuffer, expectedBuffer);
}

/** Reads a bearer token and returns the matching profile using constant-time comparisons. */
function accessProfileForRequest(req) {
  if (isLoopbackAddress(requestAddress(req))) {
    return { id: 'local', role: 'admin', maxActiveJobs: Number.POSITIVE_INFINITY };
  }
  if (!REMOTE_ACCESS_ENABLED) return null;
  const authorization = String(req.headers.authorization || '');
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const profile = ACCESS_PROFILES.find((candidate) => tokensMatch(match[1], candidate.token));
  return profile ? { id: profile.id, role: profile.role, maxActiveJobs: profile.maxActiveJobs } : null;
}

/** Applies per-address request budgets and a stricter failed-authentication budget. */
function allowRequest(req, administrative = false) {
  const now = Date.now();
  const address = requestAddress(req);
  const failure = authenticationFailures.get(address);
  if (failure && failure.blockedUntil > now) return false;
  const key = `${address}:${administrative ? 'admin' : 'api'}`;
  const record = requestRates.get(key);
  const limit = administrative ? Math.min(30, RATE_LIMIT_MAX) : RATE_LIMIT_MAX;
  if (!record || now - record.startedAt >= RATE_LIMIT_WINDOW_MS) {
    requestRates.set(key, { startedAt: now, count: 1 });
    return true;
  }
  record.count += 1;
  return record.count <= limit;
}

/** Records authentication failures and temporarily blocks repeated guesses. */
function recordAuthenticationFailure(req) {
  const address = requestAddress(req);
  if (isLoopbackAddress(address)) return;
  const now = Date.now();
  const current = authenticationFailures.get(address);
  const record = !current || now - current.startedAt >= AUTH_FAILURE_WINDOW_MS
    ? { startedAt: now, count: 0, blockedUntil: 0 }
    : current;
  record.count += 1;
  if (record.count >= 5) record.blockedUntil = now + AUTH_FAILURE_WINDOW_MS;
  authenticationFailures.set(address, record);
}

/** Adds a bounded administrative event without tokens, URLs, or file paths. */
function auditAdministration(req, action, details = {}) {
  const event = {
    at: Date.now(),
    actor: req.auth?.id || (isLoopbackAddress(requestAddress(req)) ? 'local' : 'unknown'),
    action,
    ...details
  };
  administrativeAudit.push(event);
  logEvent('info', 'administrative_audit', event);
  if (administrativeAudit.length > 200) administrativeAudit.splice(0, administrativeAudit.length - 200);
}

/** Limits active jobs per authenticated owner before accepting more work. */
function assertOwnerJobCapacity(req) {
  const ownerId = req.auth?.id || 'local';
  const maximum = req.auth?.maxActiveJobs ?? DEFAULT_USER_JOB_LIMIT;
  const active = [...jobs.values()].filter((job) => job.ownerId === ownerId
    && ['queued', 'processing', 'retrying', 'restarting'].includes(job.status)).length;
  if (active >= maximum) throw httpError('El usuario alcanzó su límite de tareas activas.', 429);
}

/** Enforces owner isolation while allowing administrators to inspect all jobs. */
function canAccessJob(req, job) {
  return Boolean(job && (req.auth?.role === 'admin' || job.ownerId === (req.auth?.id || 'local')));
}

/** Stores a bounded, public-safe lifecycle history with each job. */
function appendJobEvent(job, type, details = {}) {
  job.events ||= [];
  job.events.push({ at: Date.now(), type, ...details });
  if (job.events.length > 50) job.events.splice(0, job.events.length - 50);
}

/**
 * Autoriza operaciones administrativas.
 * - Con ADMIN_TOKEN: exige la cabecera `x-admin-token`.
 * - Sin ADMIN_TOKEN: admite exclusivamente conexiones desde localhost.
 */
function isAdminRequest(req) {
  // Esta cabecera no estándar obliga a los navegadores de otros orígenes a
  // realizar un preflight CORS, que el servidor no autoriza. Evita que una
  // página externa dispare reinicios locales mediante una solicitud simple.
  if (req.headers['x-vdownloader-admin'] !== '1') return false;
  if (req.auth?.id === 'local') {
    return ADMIN_TOKEN
      ? tokensMatch(req.headers['x-admin-token'], ADMIN_TOKEN)
      : isLoopbackAddress(requestAddress(req));
  }
  return req.auth?.role === 'admin';
}

/** Controlador HTTP de POST /api/analyze. */
async function analyze(req, res) {
  try {
    const body = await readJson(req);
    const video = await analyzeSource(body.url, true);
    json(res, 200, createOpaqueAnalysis(video, req.auth?.id || 'local'));
  } catch (error) {
    const message = error.name === 'TimeoutError' ? 'El proveedor tardó demasiado en responder.' : error.message;
    logEvent('warn', 'analysis_failed', { message: message || 'Error desconocido' });
    json(res, 400, { error: message || 'No fue posible analizar el enlace.' });
  }
}

/** Responde el estado del proceso, la cola y las herramientas multimedia. */
async function health(req, res) {
  try {
    if (!dependencyStatus || Date.now() - dependencyStatus.checkedAt > 10 * 60 * 1000) {
      await refreshDependencyStatus();
    }
    const operational = dependencyStatus.ffmpeg.available && dependencyStatus.ytDlp.available;
    json(res, operational ? 200 : 503, {
      status: operational ? 'ok' : 'degraded',
      service: 'vDownloader',
      version: '1.0.0',
      uptimeSeconds: Math.floor((Date.now() - SERVICE_STARTED_AT) / 1000),
      dependencies: dependencyStatus,
      queue: { active: activeJobs, queued: jobQueue.length, maxConcurrent: MAX_CONCURRENT_JOBS },
      retention: { ttlMinutes: JOB_TTL_MINUTES, storageLimitBytes: MAX_STORAGE_BYTES },
      uploads: { enabled: true, maxBytes: MAX_UPLOAD_BYTES, formats: [...UPLOAD_TYPES.keys()] },
      audioTools: {
        enabled: true,
        maxBytes: MAX_UPLOAD_BYTES,
        inputFormats: [...AUDIO_UPLOAD_TYPES.keys()],
        outputFormats: [...AUDIO_OUTPUTS.entries()].map(([format, profile]) => ({
          format,
          codecs: [...profile.codecs]
        })),
        maxJoinSources: MAX_AUDIO_JOIN_SOURCES
      },
      videoTools: {
        outputFormats: [...VIDEO_OUTPUTS.entries()].map(([format, profile]) => ({
          format,
          videoCodecs: [...profile.combinations.entries()].map(([codec, audioCodecs]) => ({
            codec,
            audioCodecs: [...audioCodecs]
          }))
        }))
      },
      identityProtection: { enabled: true, method: 'pixelate', maxSamples: 900 },
      administration: {
        restartEnabled: true,
        tokenRequired: Boolean(ADMIN_TOKEN),
        role: req.auth?.role || 'none',
        actor: req.auth?.id || null
      },
      security: {
        remoteAccessEnabled: REMOTE_ACCESS_ENABLED,
        authenticationEnabled: ACCESS_PROFILES.length > 0,
        tlsEnabled: Boolean(HTTPS_KEY_PATH),
        trustedHttpsProxy: TRUSTED_HTTPS_PROXY,
        rateLimitPerMinute: RATE_LIMIT_MAX,
        defaultUserActiveJobLimit: DEFAULT_USER_JOB_LIMIT
      }
    });
  } catch (error) {
    logEvent('error', 'health_check_failed', { message: error.message });
    json(res, 503, { status: 'degraded', service: 'vDownloader', dependencies: {} });
  }
}

/**
 * Obtiene y normaliza un video mediante el proveedor correspondiente.
 * @param {string|URL} value URL pública de la página del video.
 * @param {boolean} includeEstimates Si true consulta bitrate/tamaño aproximado.
 * @returns {Promise<object>} Video con calidades HLS/MP4 resueltas.
 */
async function analyzeSource(value, includeEstimates = false) {
  const { url: videoUrl, provider } = normalizeSourceUrl(value);
  let video;
  if (typeof provider.analyze === 'function') {
    video = await provider.analyze(videoUrl);
  } else {
    const response = await fetch(videoUrl, {
      headers: { 'user-agent': USER_AGENT, 'accept-language': 'es-ES,es;q=0.9,en;q=0.7' },
      redirect: 'follow',
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS)
    });
    if (!response.ok) throw new Error(`${provider.id} respondió con el estado ${response.status}.`);
    video = provider.parse(await response.text());
  }
  if (video.hlsUrl && isAllowedMediaUrl(video.hlsUrl)) {
    try {
      const hlsResponse = await fetch(video.hlsUrl, {
        headers: { 'user-agent': USER_AGENT, referer: videoUrl.href },
        signal: AbortSignal.timeout(PAGE_TIMEOUT_MS)
      });
      if (hlsResponse.ok) {
        const variants = parseHlsManifest(await hlsResponse.text(), video.hlsUrl);
        const directHeights = new Set(video.qualities.map(({ label }) => Number.parseInt(label, 10)));
        video.qualities.push(...variants.filter(({ label }) => !directHeights.has(Number.parseInt(label, 10))));
        video.qualities.sort((a, b) => Number.parseInt(b.label, 10) - Number.parseInt(a.label, 10));
      }
    } catch {}
  }
  await Promise.all(video.qualities.map(async (quality) => {
    if (quality.type !== 'hls' || quality.bandwidth) return;
    try {
      const manifestResponse = await fetch(quality.url, {
        headers: { 'user-agent': USER_AGENT, referer: videoUrl.href },
        signal: AbortSignal.timeout(PAGE_TIMEOUT_MS)
      });
      if (!manifestResponse.ok) return;
      const variants = parseHlsManifest(await manifestResponse.text(), quality.url);
      const variant = variants.find((item) => item.label === quality.label) || variants[0];
      if (variant) Object.assign(quality, { url: variant.url, bandwidth: variant.bandwidth });
    } catch {}
  }));
  if (includeEstimates) {
    await Promise.all(video.qualities.map(async (quality) => {
      if (Number(quality.estimatedSize) > 0) return;
      if (quality.type === 'hls' && quality.bandwidth && video.duration) {
        quality.estimatedSize = Math.round(quality.bandwidth * video.duration / 8);
      } else if (quality.type === 'mp4') {
        try {
          const head = await fetch(quality.url, { method: 'HEAD', headers: { 'user-agent': USER_AGENT, referer: videoUrl.href }, signal: AbortSignal.timeout(8_000) });
          const length = Number(head.headers.get('content-length'));
          if (head.ok && Number.isFinite(length) && length > 0) quality.estimatedSize = length;
        } catch {}
      }
    }));
  }
  for (const quality of video.qualities) delete quality.bandwidth;
  delete video.hlsUrl;
  video.sourceUrl = videoUrl.href;
  return video;
}

/**
 * Valida una solicitud de preparación, reserva espacio y añade la tarea a cola.
 * Entrada: selección opaca y recorte opcional. Las URL nunca vienen del cliente.
 * Salida HTTP: representación pública de la tarea con estado queued/processing.
 */
async function createJob(req, res) {
  try {
    assertOwnerJobCapacity(req);
    const body = await readJson(req);
    if (!/^[a-f0-9-]{36}$/i.test(body.selectionId || '')) throw new Error('La selección de calidad no es válida.');
    const ownerId = req.auth?.id || 'local';
    const selection = resolveMediaSelection(body.selectionId, ownerId);
    const mediaUrl = selection.url;
    const audioUrl = selection.audioUrl;
    const { url: sourceUrl, provider } = normalizeSourceUrl(selection.sourceUrl);
    if (provider.id !== selection.providerId) throw new Error('La selección no corresponde al proveedor indicado.');
    const type = selection.type;
    if (!['hls', 'mp4'].includes(type)) throw new Error('El formato solicitado no está permitido.');
    const clip = normalizeClipRange(body.start, body.end);
    const totalDuration = Number(selection.duration);
    const expectedDuration = clip?.duration || totalDuration;
    if (!Number.isFinite(expectedDuration) || expectedDuration < 1 || expectedDuration > 43_200) {
      throw new Error('No se pudo determinar una duración válida para preparar el archivo.');
    }
    const estimatedSize = Number(selection.estimatedSize) > 0 ? Number(selection.estimatedSize) : null;
    if (estimatedSize && estimatedSize > MAX_STORAGE_BYTES) {
      throw new Error('El archivo estimado supera el límite total de almacenamiento configurado.');
    }
    await ensureStorageCapacity(estimatedSize || 0);

    await mkdir(JOB_DIR, { recursive: true });
    const id = randomUUID();
    const title = safeFilename(selection.title || 'video');
    const quality = safeFilename(selection.label || 'mp4');
    const clipSuffix = clip ? `-${formatSecondsForFilename(clip.start)}-${formatSecondsForFilename(clip.end)}` : '';
    const filename = `${title}-${quality}${clipSuffix}.mp4`;
    const job = {
      id, mediaUrl, audioUrl, sourceUrl: sourceUrl.href, providerId: provider.id, type, clip, expectedDuration, estimatedSize, title, quality, filename,
      ownerId,
      outputPath: join(JOB_DIR, `${id}.mp4`),
      status: 'queued', progress: 0, size: null, error: null,
      attempts: 0, maxRetries: MAX_JOB_RETRIES, etaSeconds: null,
      createdAt: Date.now(), startedAt: null, completedAt: null,
      restartCount: 0, lastRestartedAt: null,
      process: null, cancelRequested: false, restartRequested: false,
      events: []
    };
    appendJobEvent(job, 'created');
    jobs.set(id, job);
    jobQueue.push(id);
    schedulePersist();
    processJobQueue();
    json(res, 202, publicJob(job));
  } catch (error) {
    logEvent('warn', 'job_creation_failed', { message: error.message || 'Error desconocido' });
    json(res, Number(error.statusCode) || 400, { error: error.message || 'No fue posible crear la tarea.' });
  }
}

/** Escribe el cuerpo binario comprobando que coincida con Content-Length. */
async function writeUploadFile(req, filePath, expectedBytes) {
  const file = await open(filePath, 'wx');
  let received = 0;
  try {
    for await (const chunk of req) {
      received += chunk.length;
      if (received > expectedBytes || received > MAX_UPLOAD_BYTES) {
        throw httpError('El cuerpo recibido supera el tamaño declarado.', 413);
      }
      let offset = 0;
      while (offset < chunk.length) {
        const { bytesWritten } = await file.write(chunk, offset, chunk.length - offset);
        if (bytesWritten < 1) throw httpError('No fue posible escribir la carga temporal.');
        offset += bytesWritten;
      }
    }
    if (received !== expectedBytes) {
      throw httpError('La carga quedó incompleta. Inténtalo nuevamente.');
    }
    return received;
  } finally {
    await file.close();
  }
}

/**
 * Recibe un archivo local como cuerpo binario y crea una tarea de recorte.
 * Los metadatos viajan en cabeceras; la ruta interna nunca se devuelve.
 */
async function createUploadJob(req, res) {
  let sourcePath = null;
  try {
    assertOwnerJobCapacity(req);
    if (req.headers['x-vdownloader-upload'] !== '1') {
      throw httpError('La carga local no está autorizada desde este origen.', 403);
    }
    const metadata = normalizeUploadMetadata({
      fileName: req.headers['x-upload-name'],
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      duration: req.headers['x-upload-duration'],
      start: req.headers['x-upload-start'],
      end: req.headers['x-upload-end'],
      outputFormat: req.headers['x-video-format'],
      videoCodec: req.headers['x-video-codec'],
      audioCodec: req.headers['x-video-audio-codec']
    });
    await ensureStorageCapacity(metadata.contentLength + metadata.estimatedSize);
    await mkdir(JOB_DIR, { recursive: true });

    const id = randomUUID();
    const sourceFilename = `${id}.source${metadata.extension}`;
    sourcePath = join(JOB_DIR, sourceFilename);
    const sourceSize = await writeUploadFile(req, sourcePath, metadata.contentLength);
    const identityProtection = consumeIdentityTrack(
      req.headers['x-identity-track-id'],
      metadata.clip.duration,
      req.auth?.id || 'local'
    );
    const clipSuffix = `-${formatSecondsForFilename(metadata.clip.start)}-${formatSecondsForFilename(metadata.clip.end)}`;
    const identitySuffix = identityProtection ? '-protegido' : '';
    const job = {
      id,
      ownerId: req.auth?.id || 'local',
      sourceType: 'upload',
      mediaKind: 'video',
      sourceUrl: null,
      sourceFilename,
      sourceSize,
      mediaUrl: sourcePath,
      audioUrl: null,
      providerId: 'upload',
      type: 'file',
      clip: metadata.clip,
      identityProtection,
      expectedDuration: metadata.clip.duration,
      estimatedSize: metadata.estimatedSize,
      title: metadata.title,
      quality: `${identityProtection ? 'recorte protegido' : 'recorte'} · ${metadata.outputFormat.toUpperCase()} / ${metadata.videoCodec.toUpperCase()}`,
      outputFormat: metadata.outputFormat,
      outputContentType: metadata.outputContentType,
      videoCodec: metadata.videoCodec,
      audioCodec: metadata.audioCodec,
      filename: `${metadata.title}-recorte${identitySuffix}${clipSuffix}${metadata.outputExtension}`,
      outputPath: join(JOB_DIR, `${id}${metadata.outputExtension}`),
      status: 'queued',
      progress: 0,
      size: null,
      error: null,
      attempts: 0,
      maxRetries: 0,
      etaSeconds: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      restartCount: 0,
      lastRestartedAt: null,
      process: null,
      cancelRequested: false,
      restartRequested: false
    };
    job.events = [];
    appendJobEvent(job, 'created');
    jobs.set(id, job);
    jobQueue.push(id);
    schedulePersist();
    processJobQueue();
    logEvent('info', 'upload_job_created', { jobId: id, sourceSize, duration: metadata.clip.duration });
    json(res, 202, publicJob(job));
  } catch (error) {
    if (sourcePath) try { await unlink(sourcePath); } catch {}
    if (!req.complete && !req.destroyed) req.resume();
    logEvent('warn', 'upload_job_creation_failed', { message: error.message || 'Error desconocido' });
    json(res, Number(error.statusCode) || 400, { error: error.message || 'No fue posible cargar el archivo.' });
  }
}

/**
 * Receives a local audio file and queues a bounded trim/transcode operation.
 * The source is stored with an opaque UUID and removed with the job.
 */
async function createAudioUploadJob(req, res) {
  let sourcePath = null;
  try {
    assertOwnerJobCapacity(req);
    if (req.headers['x-vdownloader-audio'] !== '1') {
      throw httpError('La herramienta de audio no está autorizada desde este origen.', 403);
    }
    const metadata = normalizeAudioUploadMetadata({
      fileName: req.headers['x-upload-name'],
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      duration: req.headers['x-upload-duration'],
      start: req.headers['x-upload-start'],
      end: req.headers['x-upload-end'],
      outputFormat: req.headers['x-audio-format'],
      audioCodec: req.headers['x-audio-codec'],
      bitrate: req.headers['x-audio-bitrate']
    });
    await ensureStorageCapacity(metadata.contentLength + metadata.estimatedSize);
    await mkdir(JOB_DIR, { recursive: true });

    const id = randomUUID();
    const sourceFilename = `${id}.source${metadata.extension}`;
    sourcePath = join(JOB_DIR, sourceFilename);
    const sourceSize = await writeUploadFile(req, sourcePath, metadata.contentLength);
    const clipSuffix = `-${formatSecondsForFilename(metadata.clip.start)}-${formatSecondsForFilename(metadata.clip.end)}`;
    const bitrateLabel = metadata.bitrate ? ` · ${metadata.bitrate} kbps` : '';
    const job = {
      id,
      ownerId: req.auth?.id || 'local',
      sourceType: 'upload',
      mediaKind: 'audio',
      sourceUrl: null,
      sourceFilename,
      sourceSize,
      mediaUrl: sourcePath,
      audioUrl: null,
      providerId: 'audio',
      type: 'file',
      clip: metadata.clip,
      identityProtection: null,
      expectedDuration: metadata.clip.duration,
      estimatedSize: metadata.estimatedSize,
      title: metadata.title,
      quality: `${metadata.outputFormat.toUpperCase()} / ${metadata.audioCodec.toUpperCase()}${bitrateLabel}`,
      outputFormat: metadata.outputFormat,
      outputContentType: metadata.outputContentType,
      audioCodec: metadata.audioCodec,
      audioBitrate: metadata.bitrate,
      filename: `${metadata.title}-audio${clipSuffix}${metadata.outputExtension}`,
      outputPath: join(JOB_DIR, `${id}${metadata.outputExtension}`),
      status: 'queued',
      progress: 0,
      size: null,
      error: null,
      attempts: 0,
      maxRetries: 0,
      etaSeconds: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      restartCount: 0,
      lastRestartedAt: null,
      process: null,
      cancelRequested: false,
      restartRequested: false,
      events: []
    };
    appendJobEvent(job, 'created');
    jobs.set(id, job);
    jobQueue.push(id);
    schedulePersist();
    processJobQueue();
    logEvent('info', 'audio_job_created', {
      jobId: id,
      sourceSize,
      duration: metadata.clip.duration,
      outputFormat: metadata.outputFormat,
      audioCodec: metadata.audioCodec
    });
    json(res, 202, publicJob(job));
  } catch (error) {
    if (sourcePath) try { await unlink(sourcePath); } catch {}
    if (!req.complete && !req.destroyed) req.resume();
    logEvent('warn', 'audio_job_creation_failed', { message: error.message || 'Error desconocido' });
    json(res, Number(error.statusCode) || 400, { error: error.message || 'No fue posible cargar el audio.' });
  }
}

/**
 * Creates a bounded reader for the audio-join envelope. The first four bytes
 * contain the big-endian JSON metadata length; source bytes follow in the
 * exact order and sizes declared by that validated metadata.
 */
function createBoundedUploadReader(req, expectedBytes) {
  const iterator = req[Symbol.asyncIterator]();
  let carry = Buffer.alloc(0);
  let received = 0;
  let ended = false;
  const pull = async () => {
    if (carry.length || ended) return;
    const next = await iterator.next();
    if (next.done) {
      ended = true;
      return;
    }
    const chunk = Buffer.from(next.value);
    received += chunk.length;
    if (received > expectedBytes) throw httpError('El cuerpo recibido supera el tamaño declarado.', 413);
    carry = chunk;
  };
  const readBytes = async (count) => {
    const parts = [];
    let remaining = count;
    while (remaining > 0) {
      await pull();
      if (!carry.length) throw httpError('La carga conjunta quedó incompleta. Inténtalo nuevamente.');
      const length = Math.min(remaining, carry.length);
      parts.push(carry.subarray(0, length));
      carry = carry.subarray(length);
      remaining -= length;
    }
    return Buffer.concat(parts, count);
  };
  const writeBytes = async (path, count) => {
    const file = await open(path, 'wx');
    let remaining = count;
    try {
      while (remaining > 0) {
        await pull();
        if (!carry.length) throw httpError('La carga conjunta quedó incompleta. Inténtalo nuevamente.');
        const length = Math.min(remaining, carry.length);
        let offset = 0;
        while (offset < length) {
          const result = await file.write(carry, offset, length - offset);
          if (result.bytesWritten < 1) throw httpError('No fue posible escribir la carga temporal.');
          offset += result.bytesWritten;
        }
        carry = carry.subarray(length);
        remaining -= length;
      }
    } finally {
      await file.close();
    }
  };
  const finish = async () => {
    if (carry.length) throw httpError('La carga conjunta contiene bytes no declarados.');
    await pull();
    if (carry.length || received !== expectedBytes || !ended) {
      throw httpError('La carga conjunta no coincide con el tamaño declarado.');
    }
  };
  return { readBytes, writeBytes, finish };
}

/**
 * Receives several trimmed audio sources in one streaming request and queues
 * a persistent FFmpeg concat/transcode job. No full media file is buffered in
 * memory and every source remains owned by the resulting job UUID.
 */
async function createAudioJoinJob(req, res) {
  const writtenPaths = [];
  try {
    assertOwnerJobCapacity(req);
    if (req.headers['x-vdownloader-audio-join'] !== '1') {
      throw httpError('La unión de audio no está autorizada desde este origen.', 403);
    }
    const contentType = String(req.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
    if (contentType !== 'application/vnd.vdownloader.audio-join') {
      throw httpError('El tipo de la carga conjunta no es válido.');
    }
    const contentLength = Number(req.headers['content-length']);
    if (!Number.isInteger(contentLength) || contentLength < 6) {
      throw httpError('No fue posible determinar el tamaño de la carga conjunta.');
    }
    if (contentLength > MAX_UPLOAD_BYTES + MAX_AUDIO_JOIN_METADATA_BYTES + 4) {
      throw httpError(`Los audios superan el límite temporal de ${Math.round(MAX_UPLOAD_BYTES / 1024 ** 2)} MB.`, 413);
    }
    const reader = createBoundedUploadReader(req, contentLength);
    const metadataLength = (await reader.readBytes(4)).readUInt32BE(0);
    if (metadataLength < 2 || metadataLength > MAX_AUDIO_JOIN_METADATA_BYTES) {
      throw httpError('Los metadatos de la unión no son válidos.');
    }
    let envelope;
    try {
      envelope = JSON.parse((await reader.readBytes(metadataLength)).toString('utf8'));
    } catch {
      throw httpError('Los metadatos de la unión no contienen JSON válido.');
    }
    if (envelope?.version !== 1 || !Array.isArray(envelope.sources)
      || envelope.sources.length < 2 || envelope.sources.length > MAX_AUDIO_JOIN_SOURCES) {
      throw httpError(`Selecciona entre 2 y ${MAX_AUDIO_JOIN_SOURCES} audios para unir.`);
    }
    const normalizedSources = envelope.sources.map((source) => normalizeAudioUploadMetadata({
      fileName: source.name,
      contentType: source.type,
      contentLength: source.size,
      duration: source.duration,
      start: source.start,
      end: source.end,
      outputFormat: envelope.outputFormat,
      audioCodec: envelope.audioCodec,
      bitrate: envelope.bitrate
    }));
    const sourceBytes = normalizedSources.reduce((sum, source) => sum + source.contentLength, 0);
    if (sourceBytes > MAX_UPLOAD_BYTES || sourceBytes + metadataLength + 4 !== contentLength) {
      throw httpError('Los tamaños declarados para los audios no coinciden con la carga.');
    }
    const expectedDuration = normalizedSources.reduce((sum, source) => sum + source.clip.duration, 0);
    if (expectedDuration > 43_200) throw httpError('La unión de audio no puede superar 12 horas.');
    const estimatedSize = normalizedSources.reduce((sum, source) => sum + source.estimatedSize, 0);
    await ensureStorageCapacity(sourceBytes + estimatedSize);
    await mkdir(JOB_DIR, { recursive: true });

    const id = randomUUID();
    const audioSources = [];
    for (const [index, source] of normalizedSources.entries()) {
      const sourceFilename = `${id}.source-${index}${source.extension}`;
      const sourcePath = join(JOB_DIR, sourceFilename);
      await reader.writeBytes(sourcePath, source.contentLength);
      writtenPaths.push(sourcePath);
      audioSources.push({
        sourceFilename,
        sourceSize: source.contentLength,
        duration: source.duration,
        clip: source.clip,
        title: source.title,
        path: sourcePath
      });
    }
    await reader.finish();

    const output = AUDIO_OUTPUTS.get(normalizedSources[0].outputFormat);
    const bitrate = normalizedSources[0].bitrate;
    const bitrateLabel = bitrate ? ` · ${bitrate} kbps` : '';
    const job = {
      id,
      ownerId: req.auth?.id || 'local',
      sourceType: 'upload',
      mediaKind: 'audio',
      sourceUrl: null,
      sourceFilename: audioSources[0].sourceFilename,
      sourceSize: sourceBytes,
      audioSources,
      mediaUrl: join(JOB_DIR, audioSources[0].sourceFilename),
      audioUrl: null,
      providerId: 'audio',
      type: 'file',
      clip: null,
      identityProtection: null,
      expectedDuration,
      estimatedSize,
      title: normalizedSources[0].title,
      quality: `${normalizedSources[0].outputFormat.toUpperCase()} / ${normalizedSources[0].audioCodec.toUpperCase()} · ${audioSources.length} audios${bitrateLabel}`,
      outputFormat: normalizedSources[0].outputFormat,
      outputContentType: output.contentType,
      audioCodec: normalizedSources[0].audioCodec,
      audioBitrate: bitrate,
      filename: `${normalizedSources[0].title}-union-${audioSources.length}${output.extension}`,
      outputPath: join(JOB_DIR, `${id}${output.extension}`),
      status: 'queued',
      progress: 0,
      size: null,
      error: null,
      attempts: 0,
      maxRetries: 0,
      etaSeconds: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
      restartCount: 0,
      lastRestartedAt: null,
      process: null,
      cancelRequested: false,
      restartRequested: false,
      events: []
    };
    appendJobEvent(job, 'created');
    jobs.set(id, job);
    jobQueue.push(id);
    schedulePersist();
    processJobQueue();
    logEvent('info', 'audio_join_job_created', {
      jobId: id,
      sources: audioSources.length,
      sourceSize: sourceBytes,
      duration: expectedDuration,
      outputFormat: job.outputFormat,
      audioCodec: job.audioCodec
    });
    json(res, 202, publicJob(job));
  } catch (error) {
    await Promise.all(writtenPaths.map((path) => unlink(path).catch(() => {})));
    if (!req.complete && !req.destroyed) req.resume();
    logEvent('warn', 'audio_join_job_creation_failed', { message: error.message || 'Error desconocido' });
    json(res, Number(error.statusCode) || 400, { error: error.message || 'No fue posible unir los audios.' });
  }
}

/** Elimina datos internos (URL firmada, ruta y proceso) antes de responder. */
function publicJob(job, includeOwner = false) {
  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    filename: job.filename,
    provider: job.providerId,
    quality: job.quality,
    size: job.size,
    error: job.error,
    attempts: job.attempts || 0,
    maxRetries: job.maxRetries ?? MAX_JOB_RETRIES,
    etaSeconds: job.etaSeconds,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    restartCount: job.restartCount || 0,
    lastRestartedAt: job.lastRestartedAt || null,
    identityProtected: Boolean(job.identityProtection),
    mediaKind: job.mediaKind || 'video',
    outputFormat: job.outputFormat || (job.mediaKind === 'audio' ? null : 'mp4'),
    videoCodec: job.videoCodec || null,
    audioCodec: job.audioCodec || null,
    downloadUrl: job.status === 'ready' ? `/api/jobs/${job.id}/download` : null,
    events: (job.events || []).map(({ at, type, attempt }) => ({ at, type, ...(attempt ? { attempt } : {}) })),
    ...(includeOwner ? { ownerId: job.ownerId || 'local' } : {})
  };
}

/** Devuelve tareas ordenadas y métricas agregadas para el panel. */
function listJobs(req, res) {
  const visible = [...jobs.values()].filter((job) => canAccessJob(req, job));
  const list = visible
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((job) => publicJob(job, req.auth?.role === 'admin'));
  const readyBytes = visible.reduce((total, job) => total + (job.status === 'ready' ? job.size || 0 : 0), 0);
  json(res, 200, {
    jobs: list,
    stats: {
      active: activeJobs,
      queued: jobQueue.filter((id) => jobs.get(id)?.status === 'queued').length,
      ready: list.filter((job) => job.status === 'ready').length,
      readyBytes,
      storedBytes: visible.reduce((total, job) => total + storedJobBytes(job), 0),
      storageLimitBytes: MAX_STORAGE_BYTES,
      maxConcurrent: MAX_CONCURRENT_JOBS,
      maxRetries: MAX_JOB_RETRIES,
      ttlMinutes: JOB_TTL_MINUTES
    }
  });
}

/** Consulta una tarea por UUID. */
function getJob(req, res, id) {
  const job = jobs.get(id);
  if (!canAccessJob(req, job)) return json(res, 404, { error: 'La tarea no existe o ya caducó.' });
  json(res, 200, publicJob(job, req.auth?.role === 'admin'));
}

/** Cancela una tarea activa o elimina definitivamente una tarea terminal. */
async function cancelJob(req, res, id) {
  const job = jobs.get(id);
  if (!canAccessJob(req, job)) return json(res, 404, { error: 'La tarea no existe o ya caducó.' });
  if (['ready', 'error', 'cancelled'].includes(job.status)) {
    jobs.delete(id);
    await removeJobFiles(job);
    schedulePersist();
    return json(res, 200, { id, deleted: true });
  }
  // Si el administrador había solicitado un reinicio, Cancelar debe detenerlo
  // definitivamente y no permitir que el finalizador vuelva a encolarlo.
  job.restartRequested = false;
  job.cancelRequested = true;
  job.status = 'cancelled';
  appendJobEvent(job, 'cancelled');
  job.completedAt = Date.now();
  job.process?.kill();
  schedulePersist();
  json(res, 200, publicJob(job));
}

/**
 * Restablece únicamente el estado operativo de una tarea.
 * Conserva identidad, proveedor, URL de origen, calidad, nombre y recorte.
 * El siguiente intento deberá renovar las URLs firmadas antes de usar FFmpeg.
 *
 * @param {object} job Tarea mutable que se desea volver a ejecutar.
 * @param {number} restartedAt Marca de tiempo usada en pruebas y auditoría.
 * @returns {object} La misma tarea, preparada con estado `queued`.
 */
export function prepareJobForRestart(job, restartedAt = Date.now()) {
  job.mediaUrl = null;
  job.audioUrl = null;
  job.status = 'queued';
  job.progress = 0;
  job.size = null;
  job.error = null;
  job.attempts = 0;
  job.etaSeconds = null;
  job.startedAt = null;
  job.completedAt = null;
  job.process = null;
  job.cancelRequested = false;
  job.restartRequested = false;
  job.needsRefresh = true;
  job.restartCount = (Number(job.restartCount) || 0) + 1;
  job.lastRestartedAt = restartedAt;
  return job;
}

/**
 * Elimina cualquier archivo incompleto, evita IDs duplicados en la cola y
 * vuelve a encolar una tarea después de un reinicio administrativo.
 */
async function requeueRestartedJob(job) {
  for (let index = jobQueue.length - 1; index >= 0; index -= 1) {
    if (jobQueue[index] === job.id) jobQueue.splice(index, 1);
  }
  try { await unlink(job.outputPath); } catch {}
  // Cancelar puede llegar mientras se espera al sistema de archivos. En ese
  // caso se respeta la última intención del usuario y no se vuelve a encolar.
  if (!job.restartRequested) return false;
  prepareJobForRestart(job);
  jobQueue.push(job.id);
  appendJobEvent(job, 'restarted', { attempt: job.restartCount });
  logEvent('info', 'job_restarted_by_admin', {
    jobId: job.id,
    provider: job.providerId,
    quality: job.quality,
    restartCount: job.restartCount
  });
  schedulePersist();
  return true;
}

/**
 * Reinicia una tarea en nombre del administrador.
 * Las tareas activas se detienen primero; su finalizador las reencola cuando
 * FFmpeg ha liberado el archivo. Las tareas terminales se reencolan de inmediato.
 */
async function restartJob(req, res, id) {
  if (!isAdminRequest(req)) {
    return json(res, 403, {
      error: 'Esta acción requiere acceso administrativo. Configura o proporciona ADMIN_TOKEN.'
    });
  }
  const job = jobs.get(id);
  if (!job) return json(res, 404, { error: 'La tarea no existe o ya caducó.' });
  await requestJobRestart(job);
  auditAdministration(req, 'job_restart', { count: 1, jobId: job.id });
  return json(res, 202, publicJob(job, true));
}

/** Applies the restart state transition for individual and bulk administration. */
async function requestJobRestart(job) {
  if (job.restartRequested || job.status === 'restarting') {
    return job;
  }

  if (['processing', 'retrying'].includes(job.status)) {
    job.restartRequested = true;
    job.cancelRequested = true;
    job.status = 'restarting';
    job.progress = 0;
    job.etaSeconds = null;
    job.error = null;
    job.completedAt = null;
    appendJobEvent(job, 'restart_requested');
    job.process?.kill();
    schedulePersist();
    return job;
  }

  // Cambiar el estado antes del primer await impide que el planificador tome
  // una tarea queued mientras se elimina su salida anterior.
  job.restartRequested = true;
  job.status = 'restarting';
  appendJobEvent(job, 'restart_requested');
  schedulePersist();
  if (await requeueRestartedJob(job)) processJobQueue();
  return job;
}

/** Restarts up to 100 existing jobs in one authorized and audited operation. */
async function restartJobsBulk(req, res) {
  if (!isAdminRequest(req)) {
    return json(res, 403, { error: 'Esta acción requiere acceso administrativo.' });
  }
  try {
    const body = await readJson(req);
    if (!Array.isArray(body.ids) || body.ids.length < 1 || body.ids.length > 100) {
      throw httpError('Selecciona entre 1 y 100 tareas.');
    }
    const ids = [...new Set(body.ids.map(String))];
    let restarted = 0;
    const missing = [];
    for (const id of ids) {
      const job = jobs.get(id);
      if (!job) {
        missing.push(id);
        continue;
      }
      await requestJobRestart(job);
      restarted += 1;
    }
    auditAdministration(req, 'jobs_bulk_restart', { count: restarted });
    json(res, 202, { restarted, missing });
  } catch (error) {
    json(res, Number(error.statusCode) || 400, { error: error.message || 'No fue posible reiniciar las tareas.' });
  }
}

/** Manually removes terminal jobs whose configured retention has elapsed. */
async function cleanupJobsAdmin(req, res) {
  if (!isAdminRequest(req)) {
    return json(res, 403, { error: 'Esta acción requiere acceso administrativo.' });
  }
  try {
    const body = await readJson(req);
    if (body.scope !== 'expired') throw httpError('Solo se permite limpiar tareas vencidas.');
    const result = await removeExpiredJobs(Date.now());
    auditAdministration(req, 'expired_jobs_cleanup', { count: result.removed, freedBytes: result.freedBytes });
    json(res, 200, result);
  } catch (error) {
    json(res, Number(error.statusCode) || 400, { error: error.message || 'No fue posible limpiar las tareas.' });
  }
}

/** Returns the bounded audit trail to administrators only. */
function listAdministrativeAudit(req, res) {
  if (!isAdminRequest(req)) {
    return json(res, 403, { error: 'Esta acción requiere acceso administrativo.' });
  }
  auditAdministration(req, 'audit_read');
  json(res, 200, { events: administrativeAudit.slice(-100).reverse() });
}

/**
 * Planificador central. Extrae tareas FIFO mientras exista capacidad.
 * Nunca inicia más procesos que MAX_CONCURRENT_JOBS.
 */
function processJobQueue() {
  while (activeJobs < MAX_CONCURRENT_JOBS && jobQueue.length) {
    const id = jobQueue.shift();
    const job = jobs.get(id);
    if (!job || job.status !== 'queued') continue;
    activeJobs += 1;
    runJob(job).finally(async () => {
      activeJobs -= 1;
      if (job.restartRequested) {
        try {
          await requeueRestartedJob(job);
        } catch (error) {
          job.restartRequested = false;
          job.cancelRequested = false;
          job.status = 'error';
          job.error = 'No fue posible reiniciar administrativamente la tarea.';
          job.completedAt = Date.now();
          logEvent('error', 'job_admin_restart_failed', { jobId: job.id, message: error.message });
          schedulePersist();
        }
      }
      processJobQueue();
    });
  }
}

/**
 * Ciclo completo de una tarea: intentos, renovación, FFmpeg y estado terminal.
 * @param {object} job Objeto mutable almacenado en `jobs`.
 * @returns {Promise<void>} Resuelve cuando queda ready, error o cancelled.
 */
async function runJob(job) {
  job.status = 'processing';
  job.startedAt = Date.now();
  job.error = null;
  appendJobEvent(job, 'processing');
  schedulePersist();
  let lastError = '';
  for (let attempt = 0; attempt <= job.maxRetries; attempt += 1) {
    if (job.cancelRequested) break;
    job.attempts = attempt + 1;
    appendJobEvent(job, attempt > 0 ? 'retry_started' : 'attempt_started', { attempt: attempt + 1 });
    job.progress = 0;
    job.etaSeconds = null;
    if (attempt > 0 || job.needsRefresh) {
      job.status = 'retrying';
      schedulePersist();
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(8_000, 1_000 * (2 ** (attempt - 1)))));
      try {
        await refreshJobMedia(job);
        job.needsRefresh = false;
      } catch (error) {
        lastError = error.message;
        continue;
      }
      job.status = 'processing';
    }
    if (job.cancelRequested) break;
    const result = await runJobAttempt(job);
    lastError = result.stderr || result.error || '';
    if (job.cancelRequested) break;
    if (result.code === 0) {
      try {
        const info = await stat(job.outputPath);
        if (info.size > MAX_STORAGE_BYTES) {
          await unlink(job.outputPath);
          job.status = 'error';
          job.error = 'El archivo final supera el límite total de almacenamiento configurado.';
          job.completedAt = Date.now();
          schedulePersist();
          return;
        }
        job.size = info.size;
        job.progress = 100;
        job.etaSeconds = 0;
        job.status = 'ready';
        job.completedAt = Date.now();
        appendJobEvent(job, 'ready', { attempt: job.attempts });
        logEvent('info', 'job_ready', { jobId: job.id, provider: job.providerId, quality: job.quality, size: job.size });
        await ensureStorageCapacity(0, job.id);
        schedulePersist();
        return;
      } catch {
        lastError = 'El archivo de salida no se encontró.';
      }
    }
    try { await unlink(job.outputPath); } catch {}
  }

  job.completedAt = Date.now();
  job.etaSeconds = null;
  if (job.cancelRequested) {
    job.status = 'cancelled';
    appendJobEvent(job, 'cancelled');
    try { await unlink(job.outputPath); } catch {}
  } else {
    job.status = 'error';
    job.error = friendlyFfmpegError(lastError, job.attempts, job.sourceType, job.mediaKind);
    appendJobEvent(job, 'failed', { attempt: job.attempts });
    logEvent('error', 'job_failed', { jobId: job.id, provider: job.providerId, attempts: job.attempts, message: job.error });
  }
  schedulePersist();
}

/** Reanaliza la página original y reemplaza la URL CDN por una firma nueva. */
async function refreshJobMedia(job) {
  if (job.sourceType === 'upload') {
    if (job.mediaKind === 'audio' && Array.isArray(job.audioSources) && job.audioSources.length > 1) {
      let totalSize = 0;
      for (const source of job.audioSources) {
        const sourcePath = uploadSourcePath(job.id, source.sourceFilename);
        if (!sourcePath) throw new Error('Una referencia de audio temporal no es válida.');
        try { totalSize += (await stat(sourcePath)).size; } catch {
          throw new Error('Uno de los audios temporales ya no está disponible.');
        }
        source.path = sourcePath;
      }
      job.sourceSize = totalSize;
      job.mediaUrl = job.audioSources[0].path;
      job.audioUrl = null;
      job.type = 'file';
      job.providerId = 'audio';
      schedulePersist();
      return;
    }
    const sourcePath = uploadSourcePath(job.id, job.sourceFilename);
    if (!sourcePath) throw new Error('La referencia del archivo temporal no es válida.');
    try { await stat(sourcePath); } catch { throw new Error('El archivo temporal ya no está disponible.'); }
    job.mediaUrl = sourcePath;
    job.audioUrl = null;
    job.type = 'file';
    job.providerId = job.mediaKind === 'audio' ? 'audio' : 'upload';
    schedulePersist();
    return;
  }
  const video = await analyzeSource(job.sourceUrl, false);
  const quality = video.qualities.find((item) => item.label === job.quality)
    || video.qualities.find((item) => Number.parseInt(item.label, 10) === Number.parseInt(job.quality, 10));
  if (!quality || !isAllowedMediaUrl(quality.url)) throw new Error(`La calidad ${job.quality} ya no está disponible.`);
  job.mediaUrl = quality.url;
  job.audioUrl = quality.audioUrl || null;
  job.type = quality.type;
  job.providerId = video.provider;
  schedulePersist();
}

/**
 * Ejecuta un único proceso FFmpeg y traduce su salida de progreso.
 * @returns {Promise<{code:number,stderr:string,error?:string}>} Resultado crudo.
 */
export function buildIdentityFilterGraph(protection) {
  if (!protection?.frames?.length) return null;
  const filters = [
    '[0:v:0]setpts=PTS-STARTPTS,split=3[identity_base][identity_pixel_source][identity_mask_source]',
    `[identity_pixel_source]pixelize=width=${protection.blockSize}:height=${protection.blockSize}[identity_pixel]`,
    '[identity_mask_source]format=gray,lut=y=0[identity_mask_0]'
  ];
  let maskIndex = 0;
  for (const frame of protection.frames) {
    for (const box of frame.boxes) {
      const nextIndex = maskIndex + 1;
      const start = Number(frame.start.toFixed(3));
      const end = Number(frame.end.toFixed(3));
      filters.push(
        `[identity_mask_${maskIndex}]drawbox=`
        + `x='max(0,min(iw-2,iw*${box.x}))':`
        + `y='max(0,min(ih-2,ih*${box.y}))':`
        + `w='max(2,min(iw,iw*${box.width}))':`
        + `h='max(2,min(ih,ih*${box.height}))':`
        + `color=white:t=fill:enable='between(t,${start},${end})'[identity_mask_${nextIndex}]`
      );
      maskIndex = nextIndex;
    }
  }
  filters.push(`[identity_base][identity_pixel][identity_mask_${maskIndex}]maskedmerge[identity_output]`);
  return filters.join(';\n');
}

function runJobAttempt(job) {
  const outputArgs = job.clip ? ['-t', String(job.clip.duration)] : [];
  const localUpload = job.sourceType === 'upload';
  const audioJob = localUpload && job.mediaKind === 'audio';
  const joinedAudio = audioJob && Array.isArray(job.audioSources) && job.audioSources.length > 1;
  const identityFilter = localUpload ? buildIdentityFilterGraph(job.identityProtection) : null;
  const identityFilterPath = identityFilter ? join(JOB_DIR, `${job.id}.identity-filter.txt`) : null;
  const input = (url, localFile = false, clip = job.clip) => [
    ...(clip ? ['-ss', String(clip.start), '-t', String(clip.duration)] : []),
    ...(localFile ? [] : [
      '-user_agent', USER_AGENT,
      '-headers', `Referer: ${mediaReferer(url)}\r\n`
    ]),
    '-i', url
  ];
  const audioEncodingArgs = () => {
    const bitrate = AUDIO_BITRATES.has(Number(job.audioBitrate)) ? Number(job.audioBitrate) : 192;
    const audioCodec = job.audioCodec || AUDIO_OUTPUTS.get(job.outputFormat)?.defaultCodec || 'mp3';
    if (audioCodec === 'pcm-s16le') return ['-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2'];
    if (audioCodec === 'flac') return ['-c:a', 'flac', '-compression_level', '5', '-ar', '48000', '-ac', '2'];
    if (audioCodec === 'aac') {
      return ['-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', `${bitrate}k`, '-ar', '48000', '-movflags', '+faststart'];
    }
    if (audioCodec === 'vorbis') return ['-c:a', 'libvorbis', '-b:a', `${bitrate}k`, '-ar', '48000'];
    if (audioCodec === 'opus') return ['-c:a', 'libopus', '-b:a', `${bitrate}k`, '-ar', '48000'];
    return ['-c:a', 'libmp3lame', '-b:a', `${bitrate}k`, '-ar', '48000', '-id3v2_version', '3'];
  };
  const videoEncodingArgs = () => {
    if (job.videoCodec === 'hevc') {
      return ['-c:v', 'libx265', '-preset', 'fast', '-crf', '25', '-pix_fmt', 'yuv420p',
        ...(['mp4', 'mov'].includes(job.outputFormat) ? ['-tag:v', 'hvc1'] : [])];
    }
    if (job.videoCodec === 'vp9') {
      return ['-c:v', 'libvpx-vp9', '-deadline', 'good', '-cpu-used', '4', '-crf', '30', '-b:v', '0', '-pix_fmt', 'yuv420p'];
    }
    return ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p'];
  };
  const videoAudioEncodingArgs = () => job.audioCodec === 'opus'
    ? ['-c:a', 'libopus', '-b:a', '128k', '-ar', '48000']
    : ['-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', '128k', '-ar', '48000'];
  const createAudioArgs = () => {
    const common = ['-hide_banner', '-loglevel', 'error', '-nostats', '-nostdin', '-rw_timeout', '15000000'];
    if (joinedAudio) {
      const sources = job.audioSources;
      const sourceInputs = sources.flatMap((source) => input(source.path, true, source.clip));
      const prepared = sources.map((_source, index) => (
        `[${index}:a:0]aresample=48000,aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,asetpts=PTS-STARTPTS[a${index}]`
      ));
      const concatInputs = sources.map((_source, index) => `[a${index}]`).join('');
      const filter = [...prepared, `${concatInputs}concat=n=${sources.length}:v=0:a=1[aout]`].join(';');
      return [
        ...common,
        ...sourceInputs,
        '-filter_complex', filter,
        '-map', '[aout]', '-vn',
        ...audioEncodingArgs(),
        '-progress', 'pipe:1', '-y', job.outputPath
      ];
    }
    return [
      ...common,
      ...input(job.mediaUrl, true),
      '-map', '0:a:0', '-vn',
      ...audioEncodingArgs(),
      '-af', 'aresample=async=1:first_pts=0',
      '-progress', 'pipe:1', '-y', job.outputPath
    ];
  };
  const createArgs = () => audioJob ? createAudioArgs() : [
    '-hide_banner', '-loglevel', 'error', '-nostats', '-nostdin',
    '-rw_timeout', '15000000',
    ...input(job.mediaUrl, localUpload),
    ...(job.audioUrl ? input(job.audioUrl) : []),
    ...(identityFilter
      ? ['-filter_complex_script', identityFilterPath, '-map', '[identity_output]']
      : ['-map', '0:v:0?']),
    '-map', `${job.audioUrl ? 1 : 0}:a:0?`,
    ...(localUpload
      ? videoEncodingArgs()
      : ['-c:v', 'copy']),
    ...(localUpload ? videoAudioEncodingArgs() : ['-c:a', 'aac', '-profile:a', 'aac_low', '-b:a', '128k', '-ar', '48000']),
    '-af', 'aresample=async=1:first_pts=0',
    '-avoid_negative_ts', 'make_zero',
    ...(['mp4', 'mov'].includes(job.outputFormat || 'mp4') ? ['-movflags', '+faststart'] : []),
    '-progress', 'pipe:1', '-y', job.outputPath
  ];

  return new Promise(async (done) => {
    if (identityFilterPath) {
      try {
        await writeFile(identityFilterPath, identityFilter, 'utf8');
      } catch (error) {
        done({ code: -1, error: error.message, stderr: '' });
        return;
      }
    }
    const ffmpeg = spawn(FFMPEG_COMMAND, createArgs(), {
      cwd: JOB_DIR,
      env: Object.fromEntries(Object.entries({
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        WINDIR: process.env.WINDIR,
        LANG: process.env.LANG || 'C',
        TEMP: JOB_DIR,
        TMP: JOB_DIR
      }).filter(([, value]) => value != null)),
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    job.process = ffmpeg;
    let progressBuffer = '';
    let stderr = '';
    ffmpeg.stdout.on('data', (chunk) => {
      progressBuffer += chunk;
      const lines = progressBuffer.split(/\r?\n/);
      progressBuffer = lines.pop() || '';
      for (const line of lines) {
        const match = line.match(/^out_time=(\d+):(\d+):(\d+(?:\.\d+)?)$/);
        if (!match) continue;
        const seconds = Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]);
        job.progress = Math.max(job.progress, Math.min(99, Math.round(seconds / job.expectedDuration * 100)));
        const elapsed = Math.max(0.1, (Date.now() - job.startedAt) / 1000);
        const rate = seconds / elapsed;
        job.etaSeconds = rate > 0 ? Math.max(0, Math.round((job.expectedDuration - seconds) / rate)) : null;
        schedulePersist();
      }
    });
    ffmpeg.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
    ffmpeg.once('error', (error) => {
      if (identityFilterPath) unlink(identityFilterPath).catch(() => {});
      done({ code: -1, error: error.message, stderr });
    });
    ffmpeg.once('close', (code) => {
      job.process = null;
      if (identityFilterPath) unlink(identityFilterPath).catch(() => {});
      done({ code, stderr });
    });
  });
}

/** Convierte diagnósticos técnicos de FFmpeg en mensajes aptos para usuario. */
function friendlyFfmpegError(stderr, attempts = 1, sourceType = 'remote', mediaKind = 'video') {
  if (sourceType === 'upload') {
    if (mediaKind === 'audio') {
      if (/matches no streams|does not contain any stream|stream map/i.test(stderr)) {
        return 'El archivo seleccionado no contiene una pista de audio compatible.';
      }
      if (/unknown encoder.+libmp3lame/i.test(stderr)) {
        return 'FFmpeg no incluye el codificador MP3 necesario. Prueba con M4A o WAV.';
      }
      if (/unknown encoder.+libvorbis/i.test(stderr)) return 'FFmpeg no incluye el codificador Vorbis necesario.';
      if (/unknown encoder.+libopus/i.test(stderr)) return 'FFmpeg no incluye el codificador Opus necesario.';
      if (/unknown encoder.+flac/i.test(stderr)) return 'FFmpeg no incluye el codificador FLAC necesario.';
      return 'No fue posible recortar o transcodificar el archivo de audio.';
    }
    if (/invalid data|moov atom not found|could not find codec parameters/i.test(stderr)) {
      return 'El archivo local no contiene un video válido o está incompleto.';
    }
    if (/unknown encoder.+libx264/i.test(stderr)) {
      return 'FFmpeg no incluye el codificador H.264 necesario para exportar este archivo.';
    }
    if (/unknown encoder.+libx265/i.test(stderr)) return 'FFmpeg no incluye el codificador H.265 necesario.';
    if (/unknown encoder.+libvpx-vp9/i.test(stderr)) return 'FFmpeg no incluye el codificador VP9 necesario.';
    if (/unknown encoder.+libopus/i.test(stderr)) return 'FFmpeg no incluye el codificador Opus necesario.';
    return 'No fue posible exportar el recorte del archivo local.';
  }
  if (/403|Forbidden/i.test(stderr)) return `El proveedor rechazó el medio incluso después de ${attempts} intentos.`;
  if (/404|not found/i.test(stderr)) return 'Uno de los segmentos del video ya no está disponible.';
  return `No fue posible preparar el MP4 después de ${attempts} intentos.`;
}

/** Obtiene el Referer requerido por el proveedor dueño del CDN. */
function mediaReferer(mediaUrl) {
  return providerForMediaUrl(mediaUrl)?.referer || 'https://www.xvideos.com/';
}

/** @returns {number} Bytes ocupados por salidas listas y fuentes temporales. */
function storedJobBytes(job) {
  return (job.sourceSize || 0) + (job.status === 'ready' ? job.size || 0 : 0);
}

/** @returns {number} Uso total conocido dentro de JOB_DIR. */
function jobStorageBytes() {
  return [...jobs.values()].reduce((total, job) => total + storedJobBytes(job), 0);
}

/** Elimina tanto el MP4 final como la fuente local temporal, si existe. */
async function removeJobFiles(job) {
  try { await unlink(job.outputPath); } catch {}
  try { await unlink(join(JOB_DIR, `${job.id}.identity-filter.txt`)); } catch {}
  const sourceFilenames = Array.isArray(job.audioSources) && job.audioSources.length
    ? job.audioSources.map((source) => source.sourceFilename)
    : [job.sourceFilename];
  for (const sourceFilename of new Set(sourceFilenames)) {
    const sourcePath = job.sourceType === 'upload'
      ? uploadSourcePath(job.id, sourceFilename)
      : null;
    if (sourcePath) try { await unlink(sourcePath); } catch {}
  }
}

/**
 * Garantiza espacio para una tarea, eliminando primero tareas terminales antiguas.
 * Las tareas activas y `protectedId` nunca se eliminan.
 */
async function ensureStorageCapacity(requiredBytes = 0, protectedId = null) {
  let used = jobStorageBytes();
  if (used + requiredBytes <= MAX_STORAGE_BYTES) return;
  const removable = [...jobs.values()]
    .filter((job) => ['ready', 'error', 'cancelled'].includes(job.status) && job.id !== protectedId)
    .sort((a, b) => (a.completedAt || a.createdAt) - (b.completedAt || b.createdAt));
  for (const job of removable) {
    jobs.delete(job.id);
    used -= storedJobBytes(job);
    await removeJobFiles(job);
    if (used + requiredBytes <= MAX_STORAGE_BYTES) break;
  }
  schedulePersist();
  if (used + requiredBytes > MAX_STORAGE_BYTES) {
    throw new Error('No hay espacio disponible dentro del límite configurado. Elimina una tarea o aumenta MAX_STORAGE_GB.');
  }
}

/** Agrupa cambios frecuentes y evita escribir jobs.json por cada porcentaje. */
function schedulePersist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    persistJobs().catch((error) => logEvent('error', 'persistence_failed', { message: error.message }));
  }, 250);
  persistTimer.unref?.();
}

/** Serializa tareas sin procesos ni rutas internas usando escritura atómica. */
async function persistJobs() {
  await mkdir(JOB_DIR, { recursive: true });
  const records = [...jobs.values()].map((job) => ({
    id: job.id,
    ownerId: job.ownerId || 'local',
    sourceType: job.sourceType || 'remote',
    sourceUrl: job.sourceUrl,
    sourceFilename: job.sourceFilename || null,
    sourceSize: job.sourceSize || 0,
    audioSources: Array.isArray(job.audioSources) ? job.audioSources.map((source) => ({
      sourceFilename: source.sourceFilename,
      sourceSize: source.sourceSize,
      duration: source.duration,
      clip: source.clip,
      title: source.title
    })) : null,
    mediaKind: job.mediaKind || 'video',
    providerId: job.providerId,
    type: job.type,
    clip: job.clip,
    identityProtection: job.identityProtection || null,
    expectedDuration: job.expectedDuration,
    estimatedSize: job.estimatedSize,
    title: job.title,
    quality: job.quality,
    outputFormat: job.outputFormat || null,
    outputContentType: job.outputContentType || null,
    videoCodec: job.videoCodec || null,
    audioCodec: job.audioCodec || null,
    audioBitrate: job.audioBitrate || null,
    filename: job.filename,
    status: job.status,
    progress: job.progress,
    size: job.size,
    error: job.error,
    attempts: job.attempts,
    maxRetries: job.maxRetries,
    etaSeconds: job.etaSeconds,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    restartCount: job.restartCount || 0,
    lastRestartedAt: job.lastRestartedAt || null,
    events: (job.events || []).slice(-50)
  }));
  const temporary = `${JOB_INDEX_FILE}.tmp`;
  await writeFile(temporary, JSON.stringify({ version: 1, jobs: records }, null, 2), 'utf8');
  await rename(temporary, JOB_INDEX_FILE);
}

/**
 * Restaura el índice al iniciar. Verifica archivos ready y reencola las tareas
 * interrumpidas con `needsRefresh` para no reutilizar firmas CDN antiguas.
 */
async function initializeJobs() {
  await mkdir(JOB_DIR, { recursive: true });
  let records = [];
  try {
    const parsed = JSON.parse(await readFile(JOB_INDEX_FILE, 'utf8'));
    if (Array.isArray(parsed.jobs)) records = parsed.jobs;
  } catch {}
  const now = Date.now();
  for (const record of records) {
    if (!/^[a-f0-9-]{36}$/i.test(record.id || '') || now - (record.completedAt || record.createdAt || 0) >= JOB_TTL_MS) {
      if (/^[a-f0-9-]{36}$/i.test(record.id || '')) {
        try { await unlink(join(JOB_DIR, `${record.id}${outputExtensionForJob(record)}`)); } catch {}
        const expiredFilenames = Array.isArray(record.audioSources) && record.audioSources.length
          ? record.audioSources.map((source) => source.sourceFilename)
          : [record.sourceFilename];
        for (const sourceFilename of new Set(expiredFilenames)) {
          const expiredSource = uploadSourcePath(record.id, sourceFilename);
          if (expiredSource) try { await unlink(expiredSource); } catch {}
        }
      }
      continue;
    }
    const sourceType = record.sourceType === 'upload' ? 'upload' : 'remote';
    const mediaKind = sourceType === 'upload' && record.mediaKind === 'audio' ? 'audio' : 'video';
    // A persisted audio job is restored only when its output profile is still
    // explicitly supported. This prevents an edited/corrupt jobs.json from
    // selecting an arbitrary filename extension or FFmpeg output container.
    if (mediaKind === 'audio' && !AUDIO_OUTPUTS.has(record.outputFormat)) continue;
    const audioOutput = mediaKind === 'audio' ? AUDIO_OUTPUTS.get(record.outputFormat) : null;
    const restoredAudioCodec = mediaKind === 'audio'
      ? String(record.audioCodec || audioOutput.defaultCodec).toLowerCase()
      : null;
    if (audioOutput && !audioOutput.codecs.has(restoredAudioCodec)) continue;
    let restoredVideoProfile = null;
    if (sourceType === 'upload' && mediaKind === 'video') {
      try {
        restoredVideoProfile = normalizeVideoOutputProfile(
          record.outputFormat || 'mp4',
          record.videoCodec || 'h264',
          record.audioCodec || 'aac'
        );
      } catch { continue; }
    }
    let sourcePath = null;
    let sourceSize = 0;
    let sourceExists = false;
    let audioSources = null;
    if (sourceType === 'upload') {
      if (record.providerId !== (mediaKind === 'audio' ? 'audio' : 'upload')) continue;
      if (mediaKind === 'audio' && Array.isArray(record.audioSources) && record.audioSources.length > 1) {
        if (record.audioSources.length > MAX_AUDIO_JOIN_SOURCES) continue;
        audioSources = [];
        sourceExists = true;
        for (const source of record.audioSources) {
          const path = uploadSourcePath(record.id, source.sourceFilename);
          let clip;
          try { clip = normalizeClipRange(source.clip?.start, source.clip?.end); } catch { sourceExists = false; break; }
          if (!path || !clip || clip.end > Number(source.duration) + 0.25) { sourceExists = false; break; }
          try {
            const size = (await stat(path)).size;
            sourceSize += size;
            audioSources.push({
              sourceFilename: source.sourceFilename,
              sourceSize: size,
              duration: Number(source.duration),
              clip,
              title: safeFilename(String(source.title || 'audio')),
              path
            });
          } catch { sourceExists = false; break; }
        }
        sourcePath = audioSources[0]?.path || null;
      } else {
        sourcePath = uploadSourcePath(record.id, record.sourceFilename);
        if (!sourcePath) continue;
        try {
          sourceSize = (await stat(sourcePath)).size;
          sourceExists = true;
        } catch {}
      }
    } else {
      try {
        const { provider } = normalizeSourceUrl(record.sourceUrl);
        if (provider.id !== record.providerId) continue;
      } catch { continue; }
    }
    const job = {
      ...record,
      ownerId: typeof record.ownerId === 'string' ? record.ownerId : 'local',
      sourceType,
      mediaKind,
      sourceSize,
      audioSources,
      mediaUrl: sourceType === 'upload' && sourceExists ? sourcePath : null,
      audioUrl: null,
      outputFormat: mediaKind === 'audio'
        ? record.outputFormat
        : restoredVideoProfile?.outputFormat || 'mp4',
      outputContentType: mediaKind === 'audio'
        ? audioOutput.contentType
        : restoredVideoProfile?.output.contentType || 'video/mp4',
      videoCodec: restoredVideoProfile?.videoCodec || null,
      audioCodec: mediaKind === 'audio' ? restoredAudioCodec : restoredVideoProfile?.audioCodec || null,
      audioBitrate: mediaKind === 'audio' && AUDIO_BITRATES.has(Number(record.audioBitrate))
        ? Number(record.audioBitrate)
        : null,
      outputPath: join(JOB_DIR, `${record.id}${outputExtensionForJob(record)}`),
      process: null,
      cancelRequested: false,
      restartRequested: false,
      restartCount: Number(record.restartCount) || 0,
      lastRestartedAt: Number(record.lastRestartedAt) || null,
      identityProtection: record.identityProtection || null,
      maxRetries: Number.isInteger(record.maxRetries) ? record.maxRetries : MAX_JOB_RETRIES
    };
    job.events = Array.isArray(record.events) ? record.events.slice(-50) : [];
    if (record.status === 'ready') {
      try { job.size = (await stat(job.outputPath)).size; } catch { job.status = 'error'; job.error = 'El archivo preparado se perdió.'; }
    } else if (['queued', 'processing', 'retrying', 'restarting'].includes(record.status)) {
      if (sourceType === 'upload' && !sourceExists) {
        job.status = 'error';
        job.error = 'El archivo local temporal ya no está disponible.';
        job.completedAt = Date.now();
      } else {
        job.status = 'queued';
        job.progress = 0;
        job.etaSeconds = null;
        job.needsRefresh = true;
        jobQueue.push(job.id);
      }
    }
    jobs.set(job.id, job);
  }
  schedulePersist();
  processJobQueue();
}

/** Streams a ready video or audio output and supports resumable byte ranges. */
async function downloadJob(req, res, id) {
  const job = jobs.get(id);
  if (!canAccessJob(req, job)) return json(res, 404, { error: 'La tarea no existe o ya caducó.' });
  if (job.status !== 'ready') return json(res, 409, { error: 'El archivo todavía no está listo.' });
  try {
    const info = await stat(job.outputPath);
    const range = req.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    let start = 0;
    let end = info.size - 1;
    let status = 200;
    if (range) {
      start = range[1] ? Number(range[1]) : 0;
      end = range[2] ? Number(range[2]) : end;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || end >= info.size) {
        res.writeHead(416, { 'content-range': `bytes */${info.size}` });
        return res.end();
      }
      status = 206;
    }
    const headers = {
      'content-type': job.outputContentType || (job.mediaKind === 'audio' ? 'application/octet-stream' : 'video/mp4'),
      'content-disposition': `attachment; filename="${job.filename}"`,
      'content-length': end - start + 1,
      'accept-ranges': 'bytes',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff'
    };
    if (status === 206) headers['content-range'] = `bytes ${start}-${end}/${info.size}`;
    res.writeHead(status, headers);
    if (req.method === 'HEAD') return res.end();
    createReadStream(job.outputPath, { start, end }).pipe(res);
  } catch {
    json(res, 404, { error: 'El archivo preparado ya no está disponible.' });
  }
}

/**
 * Proxy opaco restringido. El navegador solo conoce un UUID; manifiestos,
 * segmentos, claves y MP4 conservan sus URL firmadas dentro del servidor.
 */
async function previewMedia(req, res, referenceId) {
  try {
    const reference = resolveMediaReference(referenceId);
    if (!reference) return json(res, 404, { error: 'La vista previa caducó. Analiza nuevamente el video.' });
    const mediaUrl = reference.url;
    const headers = { 'user-agent': USER_AGENT, referer: mediaReferer(mediaUrl) };
    if (req.headers.range) headers.range = req.headers.range;
    const upstream = await fetch(mediaUrl, { headers, redirect: 'follow', signal: AbortSignal.timeout(30_000) });
    if (!upstream.ok && upstream.status !== 206) throw new Error(`El CDN respondió con el estado ${upstream.status}.`);
    const contentType = upstream.headers.get('content-type') || '';
    const isManifest = /mpegurl/i.test(contentType) || /\.m3u8(?:$|\?)/i.test(mediaUrl);
    if (isManifest) {
      const manifest = await upstream.text();
      const rewritten = manifest.split(/\r?\n/).map((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const absolute = new URL(trimmed, mediaUrl).href;
          return isAllowedMediaUrl(absolute) ? `/api/media/${registerMediaReference(absolute, reference.providerId)}` : line;
        }
        return line.replace(/URI="([^"]+)"/g, (whole, value) => {
          const absolute = new URL(value, mediaUrl).href;
          return isAllowedMediaUrl(absolute) ? `URI="/api/media/${registerMediaReference(absolute, reference.providerId)}"` : whole;
        });
      }).join('\n');
      res.writeHead(200, {
        'content-type': 'application/vnd.apple.mpegurl; charset=utf-8',
        'content-length': Buffer.byteLength(rewritten),
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff'
      });
      return res.end(rewritten);
    }

    const responseHeaders = {
      'content-type': contentType || 'video/mp2t',
      'cache-control': 'private, max-age=300',
      'x-content-type-options': 'nosniff'
    };
    for (const name of ['content-length', 'content-range', 'accept-ranges']) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders[name] = value;
    }
    res.writeHead(upstream.status, responseHeaders);
    if (!upstream.body) return res.end();
    const reader = upstream.body.getReader();
    req.on('close', () => reader.cancel().catch(() => {}));
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(value)) await new Promise((done) => res.once('drain', done));
    }
    res.end();
  } catch (error) {
    if (!res.headersSent) json(res, 502, { error: error.message || 'No fue posible cargar la vista previa.' });
    else res.destroy(error);
  }
}

/** @returns {string} Tiempo HH-MM-SS apropiado para nombres de archivo. */
function formatSecondsForFilename(value) {
  const total = Math.floor(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join('-');
}

/** Sirve archivos dentro de public/ e impide salir del directorio resuelto. */
async function serveStatic(res, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
  const filePath = resolve(join(PUBLIC_DIR, relativePath));
  if (!filePath.startsWith(PUBLIC_DIR)) return json(res, 403, { error: 'Ruta no permitida.' });
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('not a file');
    res.writeHead(200, {
      'content-type': MIME_TYPES[extname(filePath)] || 'application/octet-stream',
      'content-length': info.size,
      'cache-control': ['.html', '.js'].includes(extname(filePath)) ? 'no-cache' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff'
    });
    createReadStream(filePath).pipe(res);
  } catch {
    json(res, 404, { error: 'No encontrado.' });
  }
}

/** Expone la copia local versionada de HLS.js. */
async function serveHlsLibrary(res) {
  try {
    const info = await stat(HLS_JS_FILE);
    res.writeHead(200, {
      'content-type': 'text/javascript; charset=utf-8',
      'content-length': info.size,
      'cache-control': 'public, max-age=86400',
      'x-content-type-options': 'nosniff'
    });
    createReadStream(HLS_JS_FILE).pipe(res);
  } catch {
    json(res, 500, { error: 'La librería de reproducción HLS no está disponible.' });
  }
}

/**
 * Sirve MediaPipe y sus binarios WASM desde node_modules. La lista explícita
 * evita publicar archivos arbitrarios de dependencias y elimina la necesidad
 * de un CDN durante el uso.
 */
async function serveMediapipeLibrary(res, pathname) {
  const relativePath = pathname.replace(/^\/vendor\/mediapipe\/?/, '');
  const allowed = relativePath === 'vision_bundle.mjs'
    || /^wasm\/vision_wasm_(?:nosimd_)?internal\.(?:js|wasm)$/.test(relativePath)
    || /^wasm\/vision_wasm_module_internal\.(?:js|wasm)$/.test(relativePath);
  if (!allowed) return json(res, 404, { error: 'Recurso de visión no encontrado.' });
  const filePath = resolve(join(MEDIAPIPE_DIR, relativePath));
  if (!filePath.startsWith(MEDIAPIPE_DIR)) return json(res, 403, { error: 'Ruta no permitida.' });
  try {
    const info = await stat(filePath);
    res.writeHead(200, {
      'content-type': MIME_TYPES[extname(filePath)] || 'application/octet-stream',
      'content-length': info.size,
      'cache-control': 'public, max-age=86400',
      'x-content-type-options': 'nosniff'
    });
    createReadStream(filePath).pipe(res);
  } catch {
    json(res, 500, { error: 'La biblioteca local de visión no está disponible.' });
  }
}

/** Removes terminal jobs past retention and reports reclaimed known bytes. */
async function removeExpiredJobs(now = Date.now()) {
  let removed = 0;
  let freedBytes = 0;
  for (const [id, job] of jobs) {
    const referenceTime = job.completedAt || job.createdAt;
    if (['queued', 'processing', 'retrying', 'restarting'].includes(job.status) || now - referenceTime < JOB_TTL_MS) continue;
    jobs.delete(id);
    removed += 1;
    freedBytes += storedJobBytes(job);
    await removeJobFiles(job);
  }
  schedulePersist();
  return { removed, freedBytes };
}

/** Limpieza periódica de estados terminales y sus archivos vencidos. */
async function cleanupExpiredJobs() {
  const now = Date.now();
  for (const [id, selection] of mediaSelections) {
    if (selection.expiresAt <= now) mediaSelections.delete(id);
  }
  for (const [id, reference] of mediaReferences) {
    if (reference.expiresAt <= now) mediaReferences.delete(id);
  }
  for (const [id, track] of identityTracks) {
    if (track.expiresAt <= now) identityTracks.delete(id);
  }
  for (const [key, record] of requestRates) {
    if (now - record.startedAt >= RATE_LIMIT_WINDOW_MS) requestRates.delete(key);
  }
  for (const [address, record] of authenticationFailures) {
    if (now - record.startedAt >= AUTH_FAILURE_WINDOW_MS && record.blockedUntil <= now) {
      authenticationFailures.delete(address);
    }
  }
  const result = await removeExpiredJobs(now);
  if (result.removed) logEvent('info', 'expired_jobs_cleaned', { removed: result.removed, ttlMinutes: JOB_TTL_MINUTES });
}

setInterval(cleanupExpiredJobs, 10 * 60 * 1000).unref();

/** Router HTTP explícito. El orden evita que rutas API caigan en archivos estáticos. */
export async function handleRequest(req, res) {
  res.setHeader('x-frame-options', 'DENY');
  res.setHeader('referrer-policy', 'no-referrer');
  res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('content-security-policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  if (isSecureRequest(req)) {
    res.setHeader('strict-transport-security', 'max-age=31536000; includeSubDomains');
  }
  if (requiresSecureTransport(req)) {
    return json(res, 426, { error: 'El acceso remoto requiere una conexión HTTPS verificada.' });
  }
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const jobMatch = requestUrl.pathname.match(/^\/api\/jobs\/([a-f0-9-]+)(\/download|\/restart)?$/i);
  const mediaMatch = requestUrl.pathname.match(/^\/api\/media\/([a-f0-9-]{36})$/i);
  const isApi = requestUrl.pathname.startsWith('/api/');
  const isAdministrative = requestUrl.pathname.startsWith('/api/admin/') || requestUrl.pathname.endsWith('/restart');
  if (isApi && !mediaMatch) {
    if (!allowRequest(req, isAdministrative)) {
      res.setHeader('retry-after', '60');
      return json(res, 429, { error: 'Demasiadas solicitudes. Inténtalo nuevamente más tarde.' });
    }
    req.auth = accessProfileForRequest(req);
    if (!req.auth) {
      if (req.headers.authorization) recordAuthenticationFailure(req);
      return json(res, REMOTE_ACCESS_ENABLED ? 401 : 403, {
        error: REMOTE_ACCESS_ENABLED
          ? 'Se requiere un token de acceso válido.'
          : 'El acceso remoto está desactivado.'
      });
    }
  }
  if (req.method === 'GET' && requestUrl.pathname === '/api/health') return health(req, res);
  if (req.method === 'POST' && requestUrl.pathname === '/api/analyze') return analyze(req, res);
  if (req.method === 'POST' && requestUrl.pathname === '/api/identity-tracks') return createIdentityTrack(req, res);
  if (req.method === 'POST' && requestUrl.pathname === '/api/upload-jobs') return createUploadJob(req, res);
  if (req.method === 'POST' && requestUrl.pathname === '/api/audio-jobs') return createAudioUploadJob(req, res);
  if (req.method === 'POST' && requestUrl.pathname === '/api/audio-join-jobs') return createAudioJoinJob(req, res);
  if (req.method === 'GET' && requestUrl.pathname === '/api/jobs') return listJobs(req, res);
  if (req.method === 'POST' && requestUrl.pathname === '/api/jobs') return createJob(req, res);
  if (req.method === 'POST' && requestUrl.pathname === '/api/admin/jobs/restart') return restartJobsBulk(req, res);
  if (req.method === 'POST' && requestUrl.pathname === '/api/admin/jobs/cleanup') return cleanupJobsAdmin(req, res);
  if (req.method === 'GET' && requestUrl.pathname === '/api/admin/audit') return listAdministrativeAudit(req, res);
  if (req.method === 'GET' && jobMatch && !jobMatch[2]) return getJob(req, res, jobMatch[1]);
  if (req.method === 'DELETE' && jobMatch && !jobMatch[2]) return cancelJob(req, res, jobMatch[1]);
  if (req.method === 'POST' && jobMatch?.[2] === '/restart') return restartJob(req, res, jobMatch[1]);
  if (['GET', 'HEAD'].includes(req.method) && jobMatch?.[2] === '/download') return downloadJob(req, res, jobMatch[1]);
  if (req.method === 'GET' && mediaMatch) return previewMedia(req, res, mediaMatch[1]);
  if (req.method === 'GET' && requestUrl.pathname === '/vendor/hls.min.js') return serveHlsLibrary(res);
  if (req.method === 'GET' && requestUrl.pathname.startsWith('/vendor/mediapipe/')) {
    return serveMediapipeLibrary(res, requestUrl.pathname);
  }
  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(res, requestUrl.pathname);
  json(res, 405, { error: 'Método no permitido.' });
}

/** Plain HTTP server exported for local execution and isolated tests. */
export const server = http.createServer(handleRequest);

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (REMOTE_ACCESS_ENABLED && ACCESS_PROFILES.length < 1) {
    throw new Error('REMOTE_ACCESS_ENABLED requires at least one ACCESS_TOKENS_JSON profile.');
  }
  if (REMOTE_ACCESS_ENABLED && !HTTPS_KEY_PATH && !TRUSTED_HTTPS_PROXY) {
    throw new Error('Remote access requires HTTPS certificates or TRUSTED_HTTPS_PROXY=true.');
  }
  if (Boolean(HTTPS_KEY_PATH) !== Boolean(HTTPS_CERT_PATH)) {
    throw new Error('HTTPS_KEY_PATH and HTTPS_CERT_PATH must be configured together.');
  }
  await initializeJobs();
  await refreshDependencyStatus();
  const runtimeServer = HTTPS_KEY_PATH
    ? https.createServer({
        key: await readFile(resolve(HTTPS_KEY_PATH)),
        cert: await readFile(resolve(HTTPS_CERT_PATH))
      }, handleRequest)
    : server;
  runtimeServer.listen(PORT, SERVER_HOST, () => logEvent('info', 'server_started', {
    port: PORT,
    host: SERVER_HOST,
    protocol: HTTPS_KEY_PATH ? 'https' : 'http',
    remoteAccess: REMOTE_ACCESS_ENABLED,
    maxConcurrent: MAX_CONCURRENT_JOBS,
    maxRetries: MAX_JOB_RETRIES,
    ttlMinutes: JOB_TTL_MINUTES
  }));
  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    logEvent('info', 'server_stopping');
    for (const job of jobs.values()) {
      if (!['processing', 'retrying', 'restarting'].includes(job.status)) continue;
      job.status = 'queued';
      job.progress = 0;
      job.etaSeconds = null;
      job.needsRefresh = true;
      job.process?.kill();
      job.process = null;
    }
    try { await persistJobs(); } finally { process.exit(0); }
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
