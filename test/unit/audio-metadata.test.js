import test from 'node:test';
import assert from 'node:assert/strict';
import {
  attachmentContentDisposition,
  normalizeAudioUploadMetadata,
  normalizeEditableSrt,
  normalizeSubtitleCompositionMetadata,
  normalizeSubtitleUploadMetadata,
  normalizeTranscriptionUploadMetadata,
  normalizeVideoAudioExtractionMetadata,
  subtitleDownloadFilename
} from '../../server.js';

test('validates editable SRT and fixed MP4 subtitle composition profiles', () => {
  const normalized = normalizeEditableSrt(
    '7\r\n00:00:01,000 --> 00:00:03,500\r\nHello world\r\n\r\n9\r\n00:00:04,000 --> 00:00:05,000\r\nSecond cue\r\n'
  );
  assert.equal(normalized.cues.length, 2);
  assert.match(normalized.text, /^1\n00:00:01,000 --> 00:00:03,500/m);
  assert.match(normalized.text, /\n2\n00:00:04,000/);
  assert.throws(() => normalizeEditableSrt(
    '1\n00:00:03,000 --> 00:00:02,000\nInvalid'
  ), /fragmento 1/i);

  const profile = normalizeSubtitleCompositionMetadata({
    fileName: 'training.mp4',
    contentType: 'video/mp4',
    mediaLength: 10_000,
    totalBytes: 10_100,
    subtitleBytes: 100,
    duration: 30,
    start: 0,
    end: 30,
    mode: 'selectable'
  });
  assert.equal(profile.outputFormat, 'mp4');
  assert.equal(profile.mode, 'selectable');
  assert.throws(() => normalizeSubtitleCompositionMetadata({
    fileName: 'training.mp4', contentType: 'video/mp4', mediaLength: 10_000,
    totalBytes: 10_100, subtitleBytes: 100, duration: 30, start: 1, end: 30, mode: 'burned'
  }), /video completo/i);
});

test('preserves the source base name for subtitle downloads', () => {
  const filename = subtitleDownloadFilename('Lección técnica final 1.2.mp4', '.srt', true);
  assert.equal(filename, 'Lección técnica final 1.2.srt');
  assert.equal(subtitleDownloadFilename('Published lesson', '.vtt'), 'Published lesson.vtt');
  assert.equal(subtitleDownloadFilename('../unsafe:name.mp4', '.srt', true), '..-unsafe-name.srt');
  const disposition = attachmentContentDisposition(filename);
  assert.match(disposition, /filename\*=UTF-8''Lecci%C3%B3n%20t%C3%A9cnica%20final%201\.2\.srt/);
  assert.doesNotMatch(disposition, /[\r\n]/);
});

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

test('validates video-to-audio extraction with bounded codecs and qualities', () => {
  const mp3 = normalizeVideoAudioExtractionMetadata({
    fileName: encodeURIComponent('Interview video.mp4'),
    contentType: 'video/mp4',
    contentLength: '10485760',
    duration: '120',
    start: '10',
    end: '40',
    outputFormat: 'mp3',
    audioCodec: 'mp3',
    bitrate: '320'
  });
  assert.equal(mp3.extension, '.mp4');
  assert.equal(mp3.outputFormat, 'mp3');
  assert.equal(mp3.outputExtension, '.mp3');
  assert.equal(mp3.outputContentType, 'audio/mpeg');
  assert.equal(mp3.videoCodec, null);
  assert.equal(mp3.audioCodec, 'mp3');
  assert.equal(mp3.bitrate, 320);
  assert.deepEqual(mp3.clip, { start: 10, end: 40, duration: 30 });
  assert.equal(mp3.estimatedSize, 1_260_000);

  const flac = normalizeVideoAudioExtractionMetadata({
    fileName: 'concert.webm', contentType: 'video/webm', contentLength: 4096,
    duration: 10, start: 0, end: 10, outputFormat: 'flac', audioCodec: 'flac', bitrate: 96
  });
  assert.equal(flac.outputContentType, 'audio/flac');
  assert.equal(flac.bitrate, null);

  assert.throws(() => normalizeVideoAudioExtractionMetadata({
    fileName: 'voice.wav', contentType: 'audio/wav', contentLength: 4096,
    duration: 10, start: 0, end: 10, outputFormat: 'mp3', bitrate: 192
  }), /MP4.+WebM/i);
  assert.throws(() => normalizeVideoAudioExtractionMetadata({
    fileName: 'clip.mp4', contentType: 'video/mp4', contentLength: 4096,
    duration: 10, start: 0, end: 10, outputFormat: 'mp3', audioCodec: 'opus', bitrate: 192
  }), /códec.+no es compatible/i);
});

test('validates embedded subtitle extraction with bounded tracks and text formats', () => {
  const subtitles = normalizeSubtitleUploadMetadata({
    fileName: encodeURIComponent('Captioned interview.mp4'),
    contentType: 'video/mp4',
    contentLength: '10485760',
    duration: '120',
    start: '10',
    end: '40',
    subtitleFormat: 'vtt',
    trackIndex: '2'
  });
  assert.equal(subtitles.extension, '.mp4');
  assert.equal(subtitles.outputFormat, 'vtt');
  assert.equal(subtitles.outputExtension, '.vtt');
  assert.equal(subtitles.outputContentType, 'text/vtt; charset=utf-8');
  assert.equal(subtitles.trackIndex, 2);
  assert.equal(subtitles.videoCodec, null);
  assert.equal(subtitles.audioCodec, null);
  assert.deepEqual(subtitles.clip, { start: 10, end: 40, duration: 30 });

  assert.throws(() => normalizeSubtitleUploadMetadata({
    fileName: 'voice.wav', contentType: 'audio/wav', contentLength: 4096,
    duration: 10, start: 0, end: 10, subtitleFormat: 'srt', trackIndex: 0
  }), /MP4.+WebM/i);
  assert.throws(() => normalizeSubtitleUploadMetadata({
    fileName: 'clip.mp4', contentType: 'video/mp4', contentLength: 4096,
    duration: 10, start: 0, end: 10, subtitleFormat: 'ass', trackIndex: 0
  }), /SRT.+WebVTT/i);
  assert.throws(() => normalizeSubtitleUploadMetadata({
    fileName: 'clip.mp4', contentType: 'video/mp4', contentLength: 4096,
    duration: 10, start: 0, end: 10, subtitleFormat: 'srt', trackIndex: 32
  }), /pista de subtítulos válida/i);
});

test('validates bounded local speech-to-text metadata', () => {
  const transcription = normalizeTranscriptionUploadMetadata({
    fileName: encodeURIComponent('Spoken interview.mp4'),
    contentType: 'video/mp4',
    contentLength: '10485760',
    duration: '120',
    start: '10',
    end: '40',
    subtitleFormat: 'srt',
    language: 'es',
    modelProfile: 'fast'
  });
  assert.equal(transcription.outputExtension, '.srt');
  assert.equal(transcription.outputContentType, 'application/x-subrip; charset=utf-8');
  assert.equal(transcription.language, 'es');
  assert.equal(transcription.modelProfile, 'fast');
  assert.equal(transcription.modelId, 'Xenova/whisper-tiny');
  assert.equal(transcription.workingSize, 960_000);

  const audioTranscription = normalizeTranscriptionUploadMetadata({
    fileName: encodeURIComponent('Team briefing.wav'),
    contentType: 'audio/wav',
    contentLength: '64044',
    duration: '2',
    start: '0',
    end: '2',
    subtitleFormat: 'vtt',
    language: 'en',
    modelProfile: 'balanced'
  });
  assert.equal(audioTranscription.extension, '.wav');
  assert.equal(audioTranscription.title, 'Team-briefing');
  assert.equal(audioTranscription.outputExtension, '.vtt');
  assert.equal(audioTranscription.outputContentType, 'text/vtt; charset=utf-8');
  assert.equal(audioTranscription.modelId, 'Xenova/whisper-base');
  assert.equal(audioTranscription.videoCodec, null);
  assert.equal(audioTranscription.audioCodec, null);

  const threeHourTranscription = normalizeTranscriptionUploadMetadata({
    fileName: 'Long workshop.mp3', contentType: 'audio/mpeg', contentLength: 1024,
    duration: 10_800, start: 0, end: 10_800, subtitleFormat: 'srt',
    language: 'en', modelProfile: 'balanced'
  });
  assert.equal(threeHourTranscription.clip.duration, 10_800);
  assert.equal(threeHourTranscription.workingSize, 345_600_000);

  assert.throws(() => normalizeTranscriptionUploadMetadata({
    fileName: 'Too long.mp3', contentType: 'audio/mpeg', contentLength: 1024,
    duration: 10_801, start: 0, end: 10_801, subtitleFormat: 'srt',
    language: 'en', modelProfile: 'balanced'
  }), /180 minutos/i);

  assert.throws(() => normalizeTranscriptionUploadMetadata({
    fileName: 'video.mp4', contentType: 'video/mp4', contentLength: 100,
    duration: 10, start: 0, end: 10, subtitleFormat: 'srt', language: 'xx', modelProfile: 'fast'
  }), /idioma/i);
  assert.throws(() => normalizeTranscriptionUploadMetadata({
    fileName: 'video.mp4', contentType: 'video/mp4', contentLength: 100,
    duration: 10, start: 0, end: 10, subtitleFormat: 'srt', language: 'auto', modelProfile: '../model'
  }), /precisión/i);
  assert.throws(() => normalizeTranscriptionUploadMetadata({
    fileName: 'notes.txt', contentType: 'text/plain', contentLength: 100,
    duration: 10, start: 0, end: 10, subtitleFormat: 'srt', language: 'auto', modelProfile: 'fast'
  }), /videos MP4.+audios MP3/i);
});
