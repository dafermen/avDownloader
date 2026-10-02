import { decodeEntities } from './utils.js';

/** Contrato completo del proveedor XVideos. */
export const xvideosProvider = {
  id: 'xvideos',
  matches(url) {
    return ['xvideos.com', 'www.xvideos.com'].includes(url.hostname.toLowerCase());
  },
  validate(url) {
    return /^\/video\.[a-z0-9]+(?:\/|$)/i.test(url.pathname);
  },
  isMediaHost(hostname) {
    return /(^|\.)xvideos-cdn\.com$/i.test(hostname);
  },
  referer: 'https://www.xvideos.com/',
  /** @param {string} html Página pública. @returns {object} Video normalizado. */
  parse(html) {
    const extract = (method) => {
      const match = html.match(new RegExp(`html5player\\.${method}\\(\\s*(['\"])(.*?)\\1\\s*\\)`));
      return match?.[2]?.replaceAll('\\/', '/') ?? null;
    };
    const title = decodeEntities(extract('setVideoTitle') || 'video');
    const thumbnail = extract('setThumbUrl169') || extract('setThumbUrl');
    const hlsUrl = extract('setVideoHLS');
    const duration = Number(html.match(/<meta\s+property=["']og:duration["']\s+content=["'](\d+)["']/i)?.[1]) || null;
    const candidates = [
      ['240p', extract('setVideoUrlLow')],
      ['360p', extract('setVideoUrlHigh')],
      ['720p', extract('setVideoUrlHD')]
    ];
    const seen = new Set();
    const qualities = candidates
      .filter(([, url]) => url && !seen.has(url) && seen.add(url))
      .map(([label, url]) => ({ label, url, type: 'mp4' }));
    if (!qualities.length) throw new Error('No se encontraron versiones MP4 públicas en XVideos.');
    return { provider: this.id, title, thumbnail, duration, qualities, hlsUrl };
  }
};
