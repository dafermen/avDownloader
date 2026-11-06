import { spawn } from 'node:child_process';
import {
  access,
  appendFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, dirname, extname, join, parse, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, '..');
const transcriptionWorker = join(projectDirectory, 'transcription-worker.js');
const modelCache = join(projectDirectory, 'data', 'models');
const reportDirectory = join(projectDirectory, 'reports');
const supportedVideoExtensions = new Set(['.mp4', '.m4v', '.mov', '.webm', '.mkv', '.avi']);
const modelIds = new Map([
  ['tiny', 'Xenova/whisper-tiny'],
  ['base', 'Xenova/whisper-base']
]);
const translationModelId = 'Xenova/opus-mt-en-es';

/** Returns the value following a named CLI option without evaluating shell text. */
function optionValue(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

/** Returns true only for an existing, non-empty SRT containing a timed cue. */
async function isValidSrt(path) {
  try {
    const information = await stat(path);
    if (!information.isFile() || information.size < 20) return false;
    const text = await readFile(path, 'utf8');
    return /\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}/.test(text);
  } catch {
    return false;
  }
}

/** Executes one allowlisted process without a shell and returns captured output. */
function runProcess(executable, args, { onStdout = null } = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, args, {
      cwd: projectDirectory,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      onStdout?.(chunk);
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', rejectPromise);
    child.once('close', (code) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else rejectPromise(new Error(stderr.trim() || `${basename(executable)} exited with code ${code}.`));
    });
  });
}

/** Appends one machine-readable event without including media or subtitle text. */
async function recordEvent(logPath, event) {
  const entry = { at: new Date().toISOString(), ...event };
  await appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify(entry)}\n`);
}

/** Extracts private temporary PCM, runs local Whisper, validates, then renames atomically. */
async function transcribeVideo({ videoPath, outputPath, modelId, language, logPath }) {
  const identifier = randomUUID();
  const wavePath = join(tmpdir(), `vdownloader-${identifier}.wav`);
  const partialPath = `${outputPath}.${identifier}.partial`;
  try {
    await recordEvent(logPath, { type: 'extracting', video: basename(videoPath) });
    await runProcess('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
      '-i', videoPath, '-map', '0:a:0', '-vn', '-ac', '1', '-ar', '16000',
      '-c:a', 'pcm_s16le', wavePath
    ]);
    await recordEvent(logPath, { type: 'transcribing', video: basename(videoPath), model: modelId, language });
    await runProcess(process.execPath, [
      transcriptionWorker,
      wavePath,
      partialPath,
      modelId,
      language,
      'srt',
      modelCache,
      'false'
    ]);
    if (!await isValidSrt(partialPath)) throw new Error('Whisper did not produce a valid timed SRT file.');
    try {
      await access(outputPath, fsConstants.F_OK);
      throw new Error('The destination subtitle appeared while the video was processing; it was not overwritten.');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    await rename(partialPath, outputPath);
    await recordEvent(logPath, { type: 'completed', video: basename(videoPath), subtitle: basename(outputPath) });
  } finally {
    await rm(wavePath, { force: true }).catch(() => {});
    await rm(partialPath, { force: true }).catch(() => {});
  }
}

/** Parses the strict cue structure used by the local Whisper SRT renderer. */
function parseSrt(text) {
  const blocks = String(text || '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim().split(/\n{2,}/);
  return blocks.map((block) => {
    const lines = block.split('\n');
    const index = lines.shift()?.trim();
    const timing = lines.shift()?.trim();
    const cueText = lines.join('\n').trim();
    if (!/^\d+$/.test(index || '')
      || !/^\d{2}:\d{2}:\d{2},\d{3}\s+-->\s+\d{2}:\d{2}:\d{2},\d{3}$/.test(timing || '')
      || !cueText) {
      throw new Error('The English subtitle is not a valid timed SRT file.');
    }
    return { index, timing, text: cueText };
  });
}

/** Renders translated text while preserving every original cue number and time. */
function renderSrt(cues) {
  return `${cues.map((cue) => `${cue.index}\n${cue.timing}\n${cue.text}`).join('\n\n')}\n`;
}

/** Loads the dedicated local English-to-Spanish model once per batch. */
async function createLocalTranslator(logPath) {
  await recordEvent(logPath, { type: 'translation_model_loading', model: translationModelId });
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = modelCache;
  env.allowRemoteModels = true;
  env.allowLocalModels = true;
  env.remoteHost = 'https://huggingface.co';
  return pipeline('translation', translationModelId, {
    device: 'cpu',
    dtype: 'q8',
    progress_callback: (event) => {
      const progress = Number(event?.progress);
      if (Number.isFinite(progress) && Math.round(progress) % 20 === 0) {
        process.stdout.write(`${JSON.stringify({ type: 'translation_model_progress', progress: Math.round(progress) })}\n`);
      }
    }
  });
}

/** Translates cue text in bounded batches without changing indexes or timestamps. */
async function translateSrt({ sourcePath, outputPath, translator, logPath }) {
  const partialPath = `${outputPath}.${randomUUID()}.partial`;
  try {
    const sourceCues = parseSrt(await readFile(sourcePath, 'utf8'));
    const translatedCues = [];
    const batchSize = 8;
    await recordEvent(logPath, { type: 'translating', subtitle: basename(sourcePath), cues: sourceCues.length });
    for (let start = 0; start < sourceCues.length; start += batchSize) {
      const batch = sourceCues.slice(start, start + batchSize);
      const result = await translator(batch.map((cue) => cue.text.replace(/\s+/g, ' ').trim()), {
        max_new_tokens: 256,
        num_beams: 4
      });
      const records = Array.isArray(result) ? result : [result];
      if (records.length !== batch.length) throw new Error('The translation model returned an unexpected cue count.');
      for (let offset = 0; offset < batch.length; offset += 1) {
        const record = Array.isArray(records[offset]) ? records[offset][0] : records[offset];
        const translatedText = String(record?.translation_text || record?.generated_text || '')
          .replace(/[\u0000-\u001f]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!translatedText) throw new Error(`The translation model returned an empty cue at ${batch[offset].index}.`);
        translatedCues.push({ ...batch[offset], text: translatedText });
      }
      if (translatedCues.length % 80 === 0 || translatedCues.length === sourceCues.length) {
        await recordEvent(logPath, {
          type: 'translation_progress',
          subtitle: basename(sourcePath),
          completedCues: translatedCues.length,
          totalCues: sourceCues.length
        });
      }
    }
    if (translatedCues.length !== sourceCues.length
      || translatedCues.some((cue, index) => cue.timing !== sourceCues[index].timing)) {
      throw new Error('Translation validation detected changed cue timing.');
    }
    await writeFile(partialPath, renderSrt(translatedCues), 'utf8');
    if (!await isValidSrt(partialPath)) throw new Error('The translated subtitle did not pass SRT validation.');
    try {
      await access(outputPath, fsConstants.F_OK);
      throw new Error('The Spanish destination appeared during translation; it was not overwritten.');
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    await rename(partialPath, outputPath);
    await recordEvent(logPath, {
      type: 'translation_completed',
      source: basename(sourcePath),
      subtitle: basename(outputPath),
      cues: translatedCues.length
    });
  } finally {
    await rm(partialPath, { force: true }).catch(() => {});
  }
}

/** Translates every valid .en.srt paired with a source video, resuming safely. */
async function translateDirectory(sourceDirectory, requestedLimit) {
  await mkdir(reportDirectory, { recursive: true });
  const logPath = join(reportDirectory, 'batch-subtitles-es.jsonl');
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  const videos = entries
    .filter((entry) => entry.isFile() && supportedVideoExtensions.has(extname(entry.name).toLowerCase()))
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));
  const pending = [];
  let skipped = 0;
  let missingEnglish = 0;
  for (const video of videos) {
    const baseName = parse(video.name).name;
    const sourcePath = join(sourceDirectory, `${baseName}.en.srt`);
    const outputPath = join(sourceDirectory, `${baseName}.es.srt`);
    if (await isValidSrt(outputPath)) skipped += 1;
    else if (!await isValidSrt(sourcePath)) missingEnglish += 1;
    else pending.push({ sourcePath, outputPath });
  }
  const selected = requestedLimit > 0 ? pending.slice(0, Math.floor(requestedLimit)) : pending;
  await recordEvent(logPath, {
    type: 'translation_batch_started',
    videos: videos.length,
    skipped,
    missingEnglish,
    pending: pending.length,
    selected: selected.length,
    model: translationModelId
  });
  if (!selected.length) return { completed: 0, failed: 0, failures: [] };
  const translator = await createLocalTranslator(logPath);
  let completed = 0;
  const failures = [];
  for (const item of selected) {
    try {
      await translateSrt({ ...item, translator, logPath });
      completed += 1;
    } catch (error) {
      const failure = { subtitle: basename(item.sourcePath), error: error?.message || String(error) };
      failures.push(failure);
      await recordEvent(logPath, { type: 'translation_failed', ...failure });
    }
  }
  await recordEvent(logPath, { type: 'translation_batch_completed', completed, failed: failures.length });
  return { completed, failed: failures.length, failures };
}

async function main() {
  const sourceDirectory = resolve(optionValue('--source', 'C:\\Projects\\audio'));
  const language = optionValue('--language', 'en').trim().toLowerCase();
  const modelProfile = optionValue('--model', 'base').trim().toLowerCase();
  const requestedLimit = Number(optionValue('--limit', '0'));
  const translationOnly = process.argv.includes('--translate-en-es');
  if (!['en', 'es', 'pt', 'fr', 'de', 'it'].includes(language)) throw new Error('Unsupported language.');
  if (!modelIds.has(modelProfile)) throw new Error('Use --model tiny or --model base.');
  const sourceInformation = await stat(sourceDirectory);
  if (!sourceInformation.isDirectory()) throw new Error('The source path is not a directory.');

  if (translationOnly) {
    const summary = await translateDirectory(sourceDirectory, requestedLimit);
    await writeFile(join(reportDirectory, 'batch-subtitles-es-status.json'), JSON.stringify({
      sourceDirectory,
      ...summary,
      finishedAt: new Date().toISOString()
    }, null, 2), 'utf8');
    if (summary.failed) process.exitCode = 1;
    return;
  }

  await mkdir(reportDirectory, { recursive: true });
  const logPath = join(reportDirectory, `batch-subtitles-${language}.jsonl`);
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  const videos = entries
    .filter((entry) => entry.isFile() && supportedVideoExtensions.has(extname(entry.name).toLowerCase()))
    .sort((left, right) => left.name.localeCompare(right.name, 'en', { sensitivity: 'base' }));
  const pending = [];
  let skipped = 0;
  for (const video of videos) {
    const outputPath = join(sourceDirectory, `${parse(video.name).name}.${language}.srt`);
    if (await isValidSrt(outputPath)) skipped += 1;
    else pending.push({ videoPath: join(sourceDirectory, video.name), outputPath });
  }
  const selected = requestedLimit > 0 ? pending.slice(0, Math.floor(requestedLimit)) : pending;
  await writeFile(join(reportDirectory, `batch-subtitles-${language}-status.json`), JSON.stringify({
    sourceDirectory,
    modelProfile,
    language,
    videos: videos.length,
    skipped,
    pending: pending.length,
    selected: selected.length,
    startedAt: new Date().toISOString()
  }, null, 2), 'utf8');
  await recordEvent(logPath, {
    type: 'batch_started',
    source: sourceDirectory,
    videos: videos.length,
    skipped,
    pending: pending.length,
    selected: selected.length,
    model: modelIds.get(modelProfile),
    language
  });

  let completed = 0;
  const failures = [];
  for (const item of selected) {
    try {
      await transcribeVideo({ ...item, modelId: modelIds.get(modelProfile), language, logPath });
      completed += 1;
    } catch (error) {
      const failure = { video: basename(item.videoPath), error: error?.message || String(error) };
      failures.push(failure);
      await recordEvent(logPath, { type: 'failed', ...failure });
    }
  }
  const summary = {
    sourceDirectory,
    modelProfile,
    language,
    videos: videos.length,
    skipped,
    selected: selected.length,
    completed,
    failed: failures.length,
    failures,
    finishedAt: new Date().toISOString()
  };
  await writeFile(join(reportDirectory, `batch-subtitles-${language}-status.json`), JSON.stringify(summary, null, 2), 'utf8');
  await recordEvent(logPath, { type: 'batch_completed', completed, failed: failures.length });
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error}\n`);
  process.exitCode = 1;
});
