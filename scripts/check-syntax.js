import { spawnSync } from 'node:child_process';

const files = [
  'server.js',
  'public/app.js',
  'public/i18n.js',
  'providers/index.js',
  'providers/youtube.js',
  'providers/xvideos.js',
  'providers/pornhub.js',
  'providers/xnxx.js',
  'providers/utils.js'
];

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
  process.stdout.write(`Syntax OK: ${file}\n`);
}
