/** Upload size is optional; aggregate storage quota always remains enforced. */
export function resolveUploadSettings(env = process.env) {
  const gib = 1024 ** 3;
  const positive = (name, fallback) => {
    const raw = env[name];
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0 || !Number.isSafeInteger(Math.round(value * gib))) {
      throw new Error(`${name} must be a positive finite size.`);
    }
    return value;
  };
  const mode = env.UPLOAD_LIMIT_ENABLED ?? 'true';
  if (!['true', 'false'].includes(mode)) throw new Error('UPLOAD_LIMIT_ENABLED must be true or false.');
  const limitEnabled = mode === 'true';
  const storageBytes = Math.round(positive('MAX_STORAGE_GB', 10) * gib);
  const maxBytes = limitEnabled ? Math.min(storageBytes, Math.round(positive('MAX_UPLOAD_GB', 2) * gib)) : null;
  const minutes = Number(env.UPLOAD_TIMEOUT_MINUTES ?? 180);
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
    throw new Error('UPLOAD_TIMEOUT_MINUTES must be an integer from 1 to 1440.');
  }
  return { limitEnabled, maxBytes, effectiveMaxBytes: maxBytes ?? storageBytes, storageBytes, requestTimeoutMs: minutes * 60_000 };
}
