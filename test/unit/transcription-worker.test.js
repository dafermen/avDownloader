import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decodePcmWave,
  hasAudibleSignal,
  instrumentWhisperProgress,
  normalizeTranscriptSegments,
  renderTranscript,
  subtitleTimestamp,
  whisperChunkCount
} from '../../transcription-worker.js';

function pcmWave(sampleCount = 16_000) {
  const buffer = Buffer.alloc(44 + sampleCount * 2);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16_000, 24);
  buffer.writeUInt32LE(32_000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(sampleCount * 2, 40);
  return buffer;
}

test('decodes only the normalized PCM wave shape expected by Whisper', () => {
  const decoded = decodePcmWave(pcmWave());
  assert.equal(decoded.samples.length, 16_000);
  assert.equal(decoded.duration, 1);
  assert.equal(decoded.samples[0], 0);
  assert.throws(() => decodePcmWave(Buffer.from('invalid')), /valid WAVE/);
});

test('rejects digital silence before inference', () => {
  assert.equal(hasAudibleSignal(new Float32Array(16_000)), false);
  const tone = new Float32Array(16_000);
  tone[0] = 0.5;
  assert.equal(hasAudibleSignal(tone), true);
});

test('reports bounded progress after every internal Whisper chunk', async () => {
  assert.equal(whisperChunkCount(30), 1);
  assert.equal(whisperChunkCount(31), 2);
  assert.equal(whisperChunkCount(2770), 138);
  assert.throws(() => whisperChunkCount(60, 30, 15), /chunk configuration/i);

  const events = [];
  const model = { generate: async (value) => `result-${value}` };
  const instrumentation = instrumentWhisperProgress(model, 31, (event) => events.push(event));
  assert.equal(instrumentation.totalChunks, 2);
  assert.equal(await model.generate('one'), 'result-one');
  assert.equal(await model.generate('two'), 'result-two');
  assert.deepEqual(events, [
    { type: 'progress', progress: 70, completedChunks: 1, totalChunks: 2 },
    { type: 'progress', progress: 95, completedChunks: 2, totalChunks: 2 }
  ]);
});

test('normalizes timestamp chunks and emits standards-compliant SRT and WebVTT', () => {
  const segments = normalizeTranscriptSegments({
    chunks: [
      { timestamp: [0, 1.25], text: ' Hello ' },
      { timestamp: [1.25, 2.5], text: 'world' }
    ]
  }, 3);
  assert.deepEqual(segments, [
    { start: 0, end: 1.25, text: 'Hello' },
    { start: 1.25, end: 2.5, text: 'world' }
  ]);
  assert.equal(subtitleTimestamp(3661.004), '01:01:01,004');
  assert.match(renderTranscript(segments, 'srt'), /1\n00:00:00,000 --> 00:00:01,250\nHello/);
  assert.match(renderTranscript(segments, 'vtt'), /^WEBVTT\n\n00:00:00\.000 --> 00:00:01\.250/m);
});

test('uses the complete transcript when a model omits timestamp chunks', () => {
  assert.deepEqual(normalizeTranscriptSegments({ text: '  A complete sentence. ' }, 4), [
    { start: 0, end: 4, text: 'A complete sentence.' }
  ]);
  assert.deepEqual(normalizeTranscriptSegments({ text: ' ' }, 4), []);
});
