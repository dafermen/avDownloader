import { decodeEntities } from './utils.js';

/**
 * Integración con las páginas públicas de video de XNXX.
 *
 * XNXX publica los datos de su reproductor mediante llamadas
 * `html5player.set...`, el mismo formato general que usa XVideos. El
 * proveedor se mantiene separado para que sus dominios, rutas y futuros
 * cambios puedan evolucionar sin afectar a las otras integraciones.
 */
export const xnxxProvider = {
  /** Identificador que viaja en las respuestas de la API y en las tareas. */
  id: 'xnxx',

  /**
   * Indica si la URL pertenece al sitio principal admitido.
   * @param {URL} url URL ya convertida al tipo URL por el registro.
   * @returns {boolean} true cuando el dominio es una variante oficial admitida.
   */
  matches(url) {
    return ['xnxx.com', 'www.xnxx.com', 'video.xnxx.com'].includes(url.hostname.toLowerCase());
  },

  /**
   * Rechaza portadas, búsquedas, perfiles y categorías: solo acepta videos.
   * XNXX utiliza actualmente `/video-id/slug`; la segunda expresión conserva
   * compatibilidad con su formato histórico `/video123/slug`.
   * @param {URL} url URL cuyo dominio ya fue reconocido.
   * @returns {boolean} true si la ruta tiene forma de página de video.
   */
  validate(url) {
    return /^\/video-[a-z0-9]+(?:\/|$)/i.test(url.pathname)
      || /^\/video\d+(?:\/|$)/i.test(url.pathname);
  },

  /**
   * Autoriza exclusivamente los CDN de medios de XNXX para prevenir SSRF.
   * @param {string} hostname Dominio del MP4, manifiesto o segmento HLS.
   * @returns {boolean} true si termina exactamente en xnxx-cdn.com.
   */
  isMediaHost(hostname) {
    return /(^|\.)xnxx-cdn\.com$/i.test(hostname);
  },

  /** Referente HTTP enviado al CDN durante vista previa y preparación. */
  referer: 'https://www.xnxx.com/',

  /**
   * Convierte el HTML público en el modelo común de la aplicación.
   * @param {string} html Documento HTML descargado desde XNXX.
   * @returns {{provider:string,title:string,thumbnail:string|null,duration:number|null,qualities:Array,hlsUrl:string|null}}
   * Video normalizado con MP4 directos y, si existe, el manifiesto HLS.
   */
  parse(html) {
    /** Extrae el argumento de texto de una llamada del reproductor. */
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

    // Algunas páginas publican alta resolución solo en HLS; el servidor
    // resolverá sus variantes después de recibir este modelo.
    if (!qualities.length && !hlsUrl) {
      throw new Error('No se encontraron versiones públicas en XNXX.');
    }
    return { provider: this.id, title, thumbnail, duration, qualities, hlsUrl };
  }
};
