import { writeFile } from 'node:fs/promises';

const [, outputPath, , language, format] = process.argv.slice(2);
// `node --test` discovers JavaScript helpers under `test/`; a no-argument run
// is therefore a harmless fixture validation rather than a worker invocation.
if (!outputPath) process.exit(0);
if (!['srt', 'vtt'].includes(format)) process.exit(2);
process.stdout.write(`${JSON.stringify({ type: 'progress', progress: 50 })}\n`);
const label = language === 'auto' ? 'detected' : language;
const contents = format === 'vtt'
  ? `WEBVTT\n\n00:00:00.000 --> 00:00:01.500\nGenerated locally (${label})\n`
  : `1\n00:00:00,000 --> 00:00:01,500\nGenerated locally (${label})\n`;
await writeFile(outputPath, contents, 'utf8');
process.stdout.write(`${JSON.stringify({ type: 'complete', progress: 100, segments: 1 })}\n`);
