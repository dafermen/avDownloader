/** Decodifica las entidades HTML utilizadas en títulos de los reproductores. */
export function decodeEntities(value) {
  return String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

/**
 * Lee un manifiesto HLS maestro.
 * @param {string} manifest Contenido M3U8.
 * @param {string} manifestUrl URL base para resolver rutas relativas.
 * @returns {Array<{label:string,url:string,type:'hls',bandwidth:number|null}>}
 */
export function parseHlsManifest(manifest, manifestUrl) {
  const lines = manifest.split(/\r?\n/);
  const variants = [];
  for (let index = 0; index < lines.length; index += 1) {
    const metadata = lines[index].trim();
    if (!metadata.startsWith('#EXT-X-STREAM-INF:')) continue;
    const path = lines.slice(index + 1).find((line) => line.trim() && !line.trim().startsWith('#'))?.trim();
    if (!path) continue;
    const name = metadata.match(/NAME="([^"]+)"/i)?.[1];
    const height = metadata.match(/RESOLUTION=\d+x(\d+)/i)?.[1];
    const bandwidth = Number(metadata.match(/BANDWIDTH=(\d+)/i)?.[1]) || null;
    const label = name || (height ? `${height}p` : null);
    if (!label) continue;
    variants.push({ label, url: new URL(path, manifestUrl).href, type: 'hls', bandwidth });
  }
  return variants;
}
