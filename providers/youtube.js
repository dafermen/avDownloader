import youtubeDlPackage from 'youtube-dl-exec';
import { spawn } from 'node:child_process';

/**
 * Linux usa por defecto la herramienta administrada por el sistema. En otros
 * entornos de desarrollo se conserva el binario instalado por el paquete.
 */
export const YT_DLP_COMMAND = process.env.YT_DLP_PATH?.trim()
  || (process.platform === 'linux' ? 'yt-dlp' : youtubeDlPackage.constants?.YOUTUBE_DL_PATH);
const youtubeDl = youtubeDlPackage.create(YT_DLP_COMMAND);

/**
 * Proveedor de YouTube respaldado por el extractor mantenido `yt-dlp`.
 * A diferencia de los proveedores HTML, YouTube necesita ejecutar y resolver
 * JavaScript con frecuencia; delegar esa tarea evita acoplar el servidor a la
 * estructura interna y cambiante de la página.
 */
export const youtubeProvider = {
  id: 'youtube',

  /** @param {URL} url URL normalizada. @returns {boolean} Dominio oficial. */
  matches(url) {
    const host = url.hostname.toLowerCase();
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host);
  },

  /**
   * Acepta videos individuales y Shorts; rechaza canales, búsquedas y listas
   * sin un video concreto para evitar descargas masivas accidentales.
   */
  validate(url) {
    const idPattern = /^[a-z0-9_-]{6,20}$/i;
    if (url.hostname.toLowerCase() === 'youtu.be') return idPattern.test(url.pathname.slice(1).split('/')[0]);
    if (url.pathname === '/watch') return idPattern.test(url.searchParams.get('v') || '');
    return /^\/(?:shorts|live)\/([a-z0-9_-]{6,20})(?:\/|$)/i.test(url.pathname);
  },

  /** Solo permite los hosts usados por Google para entregar audio y video. */
  isMediaHost(hostname) {
    return /(^|\.)googlevideo\.com$/i.test(hostname);
  },

  referer: 'https://www.youtube.com/',

  /**
   * Ejecuta yt-dlp sin descargar y convierte su JSON al modelo de vDownloader.
   * @param {URL} url Página pública de un video individual.
   * @returns {Promise<object>} Video, miniatura, duración y calidades MP4.
   */
  async analyze(url) {
    let info;
    try {
      info = await youtubeDl(url.href, {
        dumpSingleJson: true,
        noPlaylist: true,
        skipDownload: true,
        noWarnings: true
      });
    } catch (error) {
      const detail = String(error?.stderr || error?.message || '');
      if (/private video/i.test(detail)) throw new Error('El video de YouTube es privado.');
      if (/sign in|age.restricted|confirm your age/i.test(detail)) throw new Error('YouTube requiere iniciar sesión para acceder a este video.');
      if (/not available in your country|geo.?restrict/i.test(detail)) throw new Error('El video de YouTube no está disponible en la región del servidor.');
      if (/drm/i.test(detail)) throw new Error('El video de YouTube está protegido con DRM y no puede procesarse.');
      if (/not available|unavailable|removed/i.test(detail)) throw new Error('El video de YouTube no está disponible.');
      throw new Error('No fue posible obtener las calidades de YouTube. Actualiza yt-dlp e inténtalo nuevamente.');
    }
    return parseYoutubeInfo(info);
  }
};

/**
 * Comprueba el ejecutable local sin realizar solicitudes a YouTube.
 * @returns {Promise<{available:boolean,version:string|null}>} Estado para /api/health.
 */
export function getYtDlpStatus() {
  if (!YT_DLP_COMMAND) return Promise.resolve({ available: false, version: null });
  return new Promise((resolve) => {
    const child = spawn(YT_DLP_COMMAND, ['--version'], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let output = '';
    const timer = setTimeout(() => child.kill(), 5_000);
    child.stdout.on('data', (chunk) => { output = (output + chunk).slice(-200); });
    child.once('error', () => {
      clearTimeout(timer);
      resolve({ available: false, version: null });
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      resolve({ available: code === 0, version: code === 0 ? output.trim() || null : null });
    });
  });
}

/**
 * Selecciona una versión H.264 por resolución. Para calidades adaptativas
 * adjunta el mejor audio M4A como segunda entrada para que FFmpeg las combine.
 *
 * @param {object} info JSON producido por `yt-dlp --dump-single-json`.
 * @returns {object} Modelo común utilizado por el servidor y el navegador.
 */
export function parseYoutubeInfo(info) {
  if (!info || !Array.isArray(info.formats)) throw new Error('YouTube devolvió información de formatos no válida.');

  const isAllowedUrl = (value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'https:' && youtubeProvider.isMediaHost(parsed.hostname);
    } catch {
      return false;
    }
  };
  const formats = info.formats.filter((format) => isAllowedUrl(format?.url));
  const audio = formats
    .filter((format) => format.vcodec === 'none' && format.acodec && format.acodec !== 'none')
    .sort((a, b) => audioScore(b) - audioScore(a))[0] || null;
  const videos = formats
    .filter((format) => Number(format.height) > 0 && format.vcodec && format.vcodec !== 'none')
    // H.264 ofrece la mejor compatibilidad al remultiplexar el resultado a MP4.
    .filter((format) => /^avc1/i.test(format.vcodec))
    .sort((a, b) => videoScore(b) - videoScore(a));

  const byHeight = new Map();
  for (const format of videos) {
    const height = Number(format.height);
    if (!byHeight.has(height)) byHeight.set(height, format);
  }

  const qualities = [...byHeight.entries()]
    .sort(([heightA], [heightB]) => heightB - heightA)
    .map(([height, format]) => {
      const hasAudio = format.acodec && format.acodec !== 'none';
      const separateAudio = hasAudio ? null : audio;
      if (!hasAudio && !separateAudio) return null;
      const estimatedSize = positiveNumber(format.filesizeApprox || format.filesize)
        + positiveNumber(separateAudio?.filesizeApprox || separateAudio?.filesize);
      return {
        label: `${height}p`,
        url: format.url,
        type: 'mp4',
        ...(separateAudio ? { audioUrl: separateAudio.url } : {}),
        ...(estimatedSize > 0 ? { estimatedSize } : {})
      };
    })
    .filter(Boolean);

  if (!qualities.length) throw new Error('No se encontraron formatos MP4 compatibles en YouTube.');
  return {
    provider: youtubeProvider.id,
    title: String(info.title || 'video'),
    thumbnail: typeof info.thumbnail === 'string' ? info.thumbnail : null,
    duration: positiveNumber(info.duration) || null,
    qualities,
    hlsUrl: null
  };
}

/** Prioriza M4A y mayor bitrate para la pista de audio separada. */
function audioScore(format) {
  return (format.ext === 'm4a' ? 1_000_000 : 0) + positiveNumber(format.abr || format.tbr);
}

/** Prioriza H.264, MP4, audio integrado y mayor bitrate dentro de una altura. */
function videoScore(format) {
  return (/^avc1/i.test(format.vcodec) ? 10_000_000 : 0)
    + (format.ext === 'mp4' ? 1_000_000 : 0)
    + (format.acodec && format.acodec !== 'none' ? 100_000 : 0)
    + positiveNumber(format.tbr);
}

/** Convierte valores desconocidos en números positivos seguros. */
function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
