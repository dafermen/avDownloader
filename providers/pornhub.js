import youtubeDlPackage from 'youtube-dl-exec';
import { decodeEntities } from './utils.js';

const YT_DLP_COMMAND = process.env.YT_DLP_PATH?.trim()
  || (process.platform === 'linux' ? 'yt-dlp' : youtubeDlPackage.constants?.YOUTUBE_DL_PATH);
const YT_DLP_AVAILABLE = Boolean(YT_DLP_COMMAND);
const ytDlp = YT_DLP_AVAILABLE ? youtubeDlPackage.create(YT_DLP_COMMAND) : null;
const OUTBOUND_PROXY = process.env.YT_DLP_PROXY || process.env.HTTPS_PROXY || process.env.https_proxy
  || process.env.HTTP_PROXY || process.env.http_proxy || '';

function hasNetworkIssue(error) {
  return /(failed to connect|could not connect|connection refused|econnreset|econnrefused|etimedout|ehostunreach|enotfound|getaddrinfo|eai_again|name resolution|curl: \((?:7|6)\)|network is unreachable|connection timed out|timed out|couldn't resolve)/i
    .test(String(error || '').toLowerCase());
}


function networkErrorMessage() {
  const proxyHint = OUTBOUND_PROXY
    ? ` Verifica que el proxy de salida (${OUTBOUND_PROXY}) sea accesible desde el servidor.`
    : '';
  return `No fue posible alcanzar Pornhub desde el servidor (problema de red o bloqueo de salida). Revisa conectividad/DNS y reglas de salida.${proxyHint}`;
}

/** Contrato completo del proveedor Pornhub. */
export const pornhubProvider = {
  id: 'pornhub',
  matches(url) {
    return /^(?:[a-z]{2}\.)?pornhub\.com$/i.test(url.hostname);
  },
  validate(url) {
    return url.pathname === '/view_video.php' && /^[a-z0-9]+$/i.test(url.searchParams.get('viewkey') || '');
  },
  isMediaHost(hostname) {
    return /(^|\.)phncdn\.com$/i.test(hostname) || /(^|\.)pornhub\.com$/i.test(hostname);
  },
  async analyze(url) {
    const headers = {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      'accept-language': 'es-ES,es;q=0.9,en;q=0.8',
      referer: 'https://www.pornhub.com/'
    };
    try {
      const requestUrl = new URL(url);
      if (/^[a-z]{2}\.pornhub\.com$/i.test(requestUrl.hostname)) requestUrl.hostname = 'www.pornhub.com';
      const response = await fetch(requestUrl, { headers, redirect: 'follow', signal: AbortSignal.timeout(18000) });
      if (!response.ok) throw new Error(`Pornhub respondió con estado ${response.status}.`);
      const dataFromHtml = extractPornhubData(await response.text());
      if (!dataFromHtml) throw new Error('No se encontrÃ³ la informaciÃ³n pÃºblica del reproductor de Pornhub.');
      return parsePornhubPayload(dataFromHtml);
    } catch (error) {
      if (hasNetworkIssue(error)) {
        throw new Error(networkErrorMessage());
      }
      if (!YT_DLP_AVAILABLE || !ytDlp) throw error;
    }
    return analyzeWithYtDlp(url);
  },
  referer: 'https://www.pornhub.com/',
  /** @param {string} html Página pública. @returns {object} Video normalizado. */
  parse(html) {
    const data = extractPornhubData(html);
    if (!data) throw new Error('No se encontró la información pública del reproductor de Pornhub.');
    return parsePornhubPayload(data);
  }
};

/** Extrae un host sin propagar errores de URLs mal formadas. */
function safeHost(value) {
  try { return new URL(value).hostname; } catch { return ''; }
}

function parsePornhubPayload(data) {
  const seen = new Set();
  const qualities = (Array.isArray(data.mediaDefinitions) ? data.mediaDefinitions : [])
    .filter((item) => item?.videoUrl && Number(item.height) > 0 && isMediaUrl(item.videoUrl))
    .sort((a, b) => Number(b.height) - Number(a.height))
    .filter((item) => !seen.has(Number(item.height)) && seen.add(Number(item.height)))
    .map((item) => ({ label: `${Number(item.height)}p`, url: item.videoUrl, type: item.format === 'hls' ? 'hls' : 'mp4' }));
  if (!qualities.length) throw new Error('No se encontraron versiones de video en Pornhub.');
  return {
    provider: pornhubProvider.id,
    title: decodeEntities(data.video_title || 'video'),
    thumbnail: data.image_url || data.image_url_16x9 || null,
    duration: Number(data.video_duration) || null,
    qualities,
    hlsUrl: null
  };
}

function isMediaUrl(value) {
  // `pornhub.com/video/get_media` es un endpoint de metadatos, no un archivo
  // reproducible. Las URLs de video publicadas por el reproductor viven en el
  // CDN de Pornhub y son las únicas que debemos ofrecer como calidades.
  return /(^|\.)phncdn\.com$/i.test(safeHost(value));
}

function safeJsonParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}

function isPornhubPayload(value) {
  return Boolean(value && typeof value === 'object' && (value.video_title || value.mediaDefinitions));
}

/** Extrae la asignación JavaScript histórica `flashvars_* = {...};`. */
function extractAssignedPayload(content) {
  const assignmentMatch = content.match(/(?:var\s+flashvars_\w+|var\s+flashvars|window\.flashvars)\s*=\s*(\{[\s\S]*?\});/i);
  if (!assignmentMatch) return null;
  const parsed = safeJsonParse(assignmentMatch[1]);
  return isPornhubPayload(parsed) ? parsed : null;
}

function extractPornhubData(html) {
  const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of scriptMatches) {
    const content = match[1] || '';
    if (!/mediaDefinitions|flashvars|video_title|video_duration|duration/i.test(content)) continue;
    const assignedPayload = extractAssignedPayload(content);
    if (assignedPayload) return assignedPayload;
    const parsedContent = safeJsonParse(content.trim());
    if (isPornhubPayload(parsedContent)) return parsedContent;
  }
  // `parse()` también se utiliza con fragmentos JavaScript aislados (sin la
  // etiqueta <script>), por ejemplo en pruebas y capturas del reproductor.
  const looseAssignedPayload = extractAssignedPayload(html);
  if (looseAssignedPayload) return looseAssignedPayload;
  const nextData = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i);
  if (nextData) {
    return findPornhubPayload(safeJsonParse(nextData[1]));
  }
  return null;
}

function findPornhubPayload(value) {
  if (!value || typeof value !== 'object') return null;
  if (isPornhubPayload(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPornhubPayload(item);
      if (found) return found;
    }
    return null;
  }
  for (const key of Object.keys(value)) {
    const found = findPornhubPayload(value[key]);
    if (found) return found;
  }
  return null;
}

async function analyzeWithYtDlp(url) {
  if (!ytDlp) throw new Error('No se encuentra yt-dlp para respaldar el anÃ¡lisis de Pornhub.');
  const ytDlpOptions = {
    dumpSingleJson: true,
    noPlaylist: true,
    skipDownload: true,
    noWarnings: true
  };
  if (OUTBOUND_PROXY) ytDlpOptions.proxy = OUTBOUND_PROXY;
  let info;
  try {
    info = await ytDlp(url.href, ytDlpOptions);
  } catch (error) {
    const detail = String(error?.stderr || error?.message || '');
    if (hasNetworkIssue(detail)) {
      throw new Error(networkErrorMessage());
    }
    if (/private video|sign.?in|age.?verify|login|premium/i.test(detail)) {
      throw new Error('Pornhub requiere verificaciÃ³n o acceso de usuario para este contenido.');
    }
    if (/not found|404|removed/i.test(detail)) {
      throw new Error('No se encontrÃ³ el video de Pornhub.');
    }
    throw new Error(`No fue posible obtener calidades de Pornhub con yt-dlp: ${safeSnippet(detail)}`);
  }
  if (!info || !Array.isArray(info.formats)) {
    throw new Error('No se pudo leer la informaciÃ³n de video desde yt-dlp.');
  }
  const formats = info.formats.filter((item) => Number(item.height) > 0 && item.url);
  const audioFormat = formats
    .filter((item) => item.vcodec === 'none' && item.acodec && item.acodec !== 'none' && item.url)
    .sort((a, b) => Number(b.abr || 0) - Number(a.abr || 0))[0] || null;
  const seenHeights = new Set();
  const qualities = formats
    .filter((item) => item.vcodec && item.vcodec !== 'none')
    .filter((item) => {
      const height = Number(item.height);
      if (!Number.isFinite(height) || height <= 0 || seenHeights.has(height)) return false;
      seenHeights.add(height);
      return true;
    })
    .sort((a, b) => Number(b.height) - Number(a.height))
    .map((item) => {
      const isHls = String(item.protocol || '').toLowerCase().includes('m3u8') || String(item.ext || '').toLowerCase() === 'm3u8';
      const estimatedSize = toPositive(item.filesizeApprox || item.filesize);
      const hasAudio = item.acodec && item.acodec !== 'none';
      return {
        label: `${Number(item.height)}p`,
        url: item.url,
        type: isHls ? 'hls' : 'mp4',
        ...(estimatedSize ? { estimatedSize } : {}),
        ...(hasAudio ? {} : (audioFormat?.url ? { audioUrl: audioFormat.url } : {}))
      };
    });
  if (!qualities.length) throw new Error('No se encontraron formatos compatibles de Pornhub.');
  return {
    provider: pornhubProvider.id,
    title: decodeEntities(info.title || 'video'),
    thumbnail: typeof info.thumbnail === 'string' ? info.thumbnail : null,
    duration: toPositive(info.duration),
    qualities,
    hlsUrl: null
  };
}

function toPositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function safeSnippet(value) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > 170 ? `${text.slice(0, 170)}...` : text;
}
