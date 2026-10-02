import { pornhubProvider } from './pornhub.js';
import { xnxxProvider } from './xnxx.js';
import { xvideosProvider } from './xvideos.js';
import { youtubeProvider } from './youtube.js';

export const providers = [youtubeProvider, xvideosProvider, pornhubProvider, xnxxProvider];

/**
 * Valida una página y selecciona el proveedor propietario.
 * @param {string|URL} value URL proporcionada por el usuario.
 * @returns {{url:URL,provider:object}} URL limpia y contrato del proveedor.
 */
export function normalizeSourceUrl(value) {
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new Error('La URL no es válida.'); }
  if (url.protocol !== 'https:') throw new Error('La URL debe usar HTTPS.');
  const provider = providers.find((candidate) => candidate.matches(url));
  if (!provider || !provider.validate(url)) throw new Error('Solo se admiten videos individuales de YouTube, XVideos, Pornhub o XNXX.');
  url.hash = '';
  return { url, provider };
}

/** @returns {object|null} Proveedor dueño de una URL CDN HTTPS. */
export function providerForMediaUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    return providers.find((provider) => provider.isMediaHost(url.hostname)) || null;
  } catch {
    return null;
  }
}

/** @returns {object|null} Proveedor registrado con el ID solicitado. */
export function providerById(id) {
  return providers.find((provider) => provider.id === id) || null;
}
