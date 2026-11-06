import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Reads the RIFF/WAVE envelope produced by FFmpeg and locates its PCM payload.
 * Only mono, 16 kHz, signed 16-bit PCM is accepted so the speech model always
 * receives the sample layout it expects.
 *
 * @param {Buffer} buffer Complete WAVE file.
 * @returns {{samples:Float32Array,duration:number}}
 */
export function decodePcmWave(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 44
    || buffer.toString('ascii', 0, 4) !== 'RIFF'
    || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('The temporary audio is not a valid WAVE file.');
  }
  let offset = 12;
  let format = null;
  let data = null;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + size;
    if (end > buffer.length) throw new Error('The temporary WAVE file is incomplete.');
    if (id === 'fmt ' && size >= 16) {
      format = {
        audioFormat: buffer.readUInt16LE(start),
        channels: buffer.readUInt16LE(start + 2),
        sampleRate: buffer.readUInt32LE(start + 4),
        bitsPerSample: buffer.readUInt16LE(start + 14)
      };
    } else if (id === 'data') {
      data = buffer.subarray(start, end);
    }
    offset = end + (size % 2);
  }
  if (!format || !data || format.audioFormat !== 1 || format.channels !== 1
    || format.sampleRate !== 16_000 || format.bitsPerSample !== 16) {
    throw new Error('The temporary audio must be mono 16 kHz PCM16.');
  }
  const samples = new Float32Array(Math.floor(data.length / 2));
  for (let index = 0; index < samples.length; index += 1) {
    samples[index] = data.readInt16LE(index * 2) / 32_768;
  }
  return { samples, duration: samples.length / format.sampleRate };
}

/** Rejects digital silence before Whisper can hallucinate text from it. */
export function hasAudibleSignal(samples, minimumRms = 0.001) {
  if (!(samples instanceof Float32Array) || samples.length === 0) return false;
  let sum = 0;
  for (const sample of samples) sum += sample * sample;
  return Math.sqrt(sum / samples.length) >= minimumRms;
}

/**
 * Computes the exact number of overlapping chunks created by the Whisper ASR
 * pipeline. Long inputs use a 30-second window, five seconds of stride on each
 * side, and therefore advance 20 seconds after the first window.
 */
export function whisperChunkCount(duration, chunkLengthSeconds = 30, strideSeconds = 5) {
  const safeDuration = Math.max(0, Number(duration) || 0);
  const window = Number(chunkLengthSeconds);
  const stride = Number(strideSeconds);
  const jump = window - 2 * stride;
  if (!(window > 0) || !(stride >= 0) || !(jump > 0)) {
    throw new Error('Invalid Whisper chunk configuration.');
  }
  return safeDuration <= window ? 1 : 1 + Math.ceil((safeDuration - window) / jump);
}

/**
 * Wraps model generation so each completed internal Whisper chunk produces a
 * bounded progress event. This keeps the library's transcription and overlap
 * behavior unchanged while preventing long jobs from appearing frozen at 45%.
 */
export function instrumentWhisperProgress(model, duration, onProgress) {
  if (!model || typeof model.generate !== 'function') throw new Error('Whisper model generation is unavailable.');
  const totalChunks = whisperChunkCount(duration);
  const originalGenerate = model.generate.bind(model);
  let completedChunks = 0;
  model.generate = async (...args) => {
    const result = await originalGenerate(...args);
    completedChunks = Math.min(totalChunks, completedChunks + 1);
    const progress = Math.min(95, 45 + Math.round(completedChunks / totalChunks * 50));
    onProgress?.({ type: 'progress', progress, completedChunks, totalChunks });
    return result;
  };
  return { totalChunks };
}

/** Converts a finite second value into an SRT or WebVTT timestamp. */
export function subtitleTimestamp(value, decimalSeparator = ',') {
  const milliseconds = Math.max(0, Math.round((Number(value) || 0) * 1000));
  const hours = Math.floor(milliseconds / 3_600_000);
  const minutes = Math.floor(milliseconds % 3_600_000 / 60_000);
  const seconds = Math.floor(milliseconds % 60_000 / 1000);
  const fraction = milliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${decimalSeparator}${String(fraction).padStart(3, '0')}`;
}

/**
 * Normalizes Whisper timestamp chunks into safe, ordered subtitle cues.
 * Empty or invalid chunks are omitted; missing final timestamps use the audio
 * duration without ever extending beyond the selected source interval.
 */
export function normalizeTranscriptSegments(output, duration) {
  const maximum = Math.max(0, Number(duration) || 0);
  const chunks = Array.isArray(output?.chunks) ? output.chunks : [];
  const segments = chunks.flatMap((chunk) => {
    const text = String(chunk?.text || '').replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
    const timestamp = Array.isArray(chunk?.timestamp) ? chunk.timestamp : [];
    const start = Math.max(0, Math.min(maximum, Number(timestamp[0]) || 0));
    const rawEnd = Number(timestamp[1]);
    const end = Math.max(start + 0.01, Math.min(maximum, Number.isFinite(rawEnd) ? rawEnd : maximum));
    return text && end > start ? [{ start, end, text }] : [];
  });
  if (segments.length) return segments;
  const text = String(output?.text || '').replace(/[\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text && maximum > 0 ? [{ start: 0, end: maximum, text }] : [];
}

/** Renders normalized cues as UTF-8 SRT or WebVTT. */
export function renderTranscript(segments, format) {
  if (format === 'vtt') {
    const cues = segments.map((segment) => (
      `${subtitleTimestamp(segment.start, '.')} --> ${subtitleTimestamp(segment.end, '.')}\n${segment.text}`
    ));
    return `WEBVTT\n\n${cues.join('\n\n')}${cues.length ? '\n' : ''}`;
  }
  return segments.map((segment, index) => (
    `${index + 1}\n${subtitleTimestamp(segment.start)} --> ${subtitleTimestamp(segment.end)}\n${segment.text}`
  )).join('\n\n') + (segments.length ? '\n' : '');
}

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

/** Runs one local Whisper transcription in a disposable child process. */
async function main() {
  const [inputPath, outputPath, modelId, language, format, cacheDirectory, allowRemoteValue] = process.argv.slice(2);
  if (!inputPath || !outputPath || !modelId || !['srt', 'vtt'].includes(format)) {
    throw new Error('Invalid transcription worker arguments.');
  }
  const allowedModels = new Set(['Xenova/whisper-tiny', 'Xenova/whisper-base']);
  if (!allowedModels.has(modelId)) throw new Error('The requested transcription model is not allowed.');
  const allowedLanguages = new Set(['auto', 'es', 'en', 'pt', 'fr', 'de', 'it']);
  if (!allowedLanguages.has(language)) throw new Error('The requested transcription language is not allowed.');

  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = resolve(cacheDirectory);
  env.allowRemoteModels = allowRemoteValue === 'true';
  env.allowLocalModels = true;
  env.remoteHost = 'https://huggingface.co';

  const { samples, duration } = decodePcmWave(await readFile(inputPath));
  if (!hasAudibleSignal(samples)) throw new Error('No speech was detected in the selected interval.');
  emit({ type: 'progress', progress: 30 });
  const transcriber = await pipeline('automatic-speech-recognition', modelId, {
    device: 'cpu',
    dtype: 'q8',
    progress_callback: (event) => {
      const raw = Number(event?.progress);
      if (Number.isFinite(raw)) emit({ type: 'model', progress: Math.max(0, Math.min(100, raw)) });
    }
  });
  emit({ type: 'progress', progress: 45 });
  instrumentWhisperProgress(transcriber.model, duration, emit);
  const output = await transcriber(samples, {
    return_timestamps: true,
    chunk_length_s: 30,
    stride_length_s: 5,
    task: 'transcribe',
    ...(language === 'auto' ? {} : { language })
  });
  const segments = normalizeTranscriptSegments(output, duration);
  if (!segments.length) throw new Error('No speech was detected in the selected interval.');
  await writeFile(outputPath, renderTranscript(segments, format), 'utf8');
  emit({ type: 'complete', progress: 100, segments: segments.length });
}

const isEntryPoint = process.argv[1]
  && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isEntryPoint) {
  main().catch((error) => {
    process.stderr.write(`${error?.message || 'Local transcription failed.'}\n`);
    process.exitCode = 1;
  });
}
