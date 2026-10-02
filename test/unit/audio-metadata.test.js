import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAudioUploadMetadata } from '../../server.js';

test('validates local audio metadata and bounded output profiles', () => {
  const mp3 = normalizeAudioUploadMetadata({
    fileName: encodeURIComponent('Interview source.flac'),
    contentType: 'audio/flac',
    contentLength: '1048576',
    duration: '120',
    start: '10.5',
    end: '40.5',
    outputFormat: 'mp3',
    bitrate: '256'
  });
  assert.equal(mp3.extension, '.flac');
  assert.equal(mp3.outputFormat, 'mp3');
  assert.equal(mp3.outputExtension, '.mp3');
  assert.equal(mp3.outputContentType, 'audio/mpeg');
  assert.equal(mp3.audioCodec, 'mp3');
  assert.equal(mp3.bitrate, 256);
  assert.deepEqual(mp3.clip, { start: 10.5, end: 40.5, duration: 30 });

  const wav = normalizeAudioUploadMetadata({
    fileName: 'voice.ogg',
    contentType: 'audio/ogg',
    contentLength: '4096',
    duration: '10',
    start: '0',
    end: '10',
    outputFormat: 'wav',
    bitrate: '320'
  });
  assert.equal(wav.outputExtension, '.wav');
  assert.equal(wav.outputContentType, 'audio/wav');
  assert.equal(wav.bitrate, null);
  assert.equal(wav.audioCodec, 'pcm-s16le');
  assert.equal(wav.estimatedSize, 1_920_000);

  const oggOpus = normalizeAudioUploadMetadata({
    fileName: 'voice.wav', contentType: 'audio/wav', contentLength: '4096',
    duration: '10', start: '1', end: '9', outputFormat: 'ogg', audioCodec: 'opus', bitrate: '128'
  });
  assert.equal(oggOpus.outputExtension, '.ogg');
  assert.equal(oggOpus.outputContentType, 'audio/ogg');
  assert.equal(oggOpus.audioCodec, 'opus');

  const flac = normalizeAudioUploadMetadata({
    fileName: 'voice.wav', contentType: 'audio/wav', contentLength: '4096',
    duration: '10', start: '0', end: '10', outputFormat: 'flac', audioCodec: 'flac', bitrate: '320'
  });
  assert.equal(flac.outputExtension, '.flac');
  assert.equal(flac.bitrate, null);

  assert.throws(() => normalizeAudioUploadMetadata({
    fileName: 'not-audio.mp4', contentType: 'video/mp4', contentLength: 1,
    duration: 2, start: 0, end: 1, outputFormat: 'mp3', bitrate: 192
  }), /MP3, M4A, AAC/i);
  assert.throws(() => normalizeAudioUploadMetadata({
    fileName: 'voice.wav', contentType: 'audio/wav', contentLength: 100,
    duration: 2, start: 0, end: 1, outputFormat: 'exe', bitrate: 192
  }), /MP3, M4A.+WAV/i);
  assert.throws(() => normalizeAudioUploadMetadata({
    fileName: 'voice.wav', contentType: 'audio/wav', contentLength: 100,
    duration: 2, start: 0, end: 1, outputFormat: 'mp3', audioCodec: 'opus', bitrate: 192
  }), /códec.+no es compatible/i);
});
