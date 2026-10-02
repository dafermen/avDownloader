import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('runtime metadata requires a supported Node.js version', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8')
  );
  assert.equal(packageJson.engines.node, '>=20');
  assert.ok(Number(process.versions.node.split('.')[0]) >= 20);
});

test('npm test commands are portable across Windows and POSIX shells', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8')
  );
  for (const scriptName of ['test', 'test:unit', 'test:e2e']) {
    assert.doesNotMatch(
      packageJson.scripts[scriptName],
      /[*?]/,
      `${scriptName} must not depend on shell-specific glob expansion`
    );
  }
});

test('Linux deployment uses system multimedia tools and the deployment gate', async () => {
  const [workflow, environmentExample, systemdUnit, nginxSite] = await Promise.all([
    readFile(new URL('../../.github/workflows/linux-ci.yml', import.meta.url), 'utf8'),
    readFile(new URL('../../.env.example', import.meta.url), 'utf8'),
    readFile(new URL('../../deploy/systemd/vdownloader.service', import.meta.url), 'utf8'),
    readFile(new URL('../../deploy/nginx/vdownloader.conf', import.meta.url), 'utf8')
  ]);
  assert.match(workflow, /apt-get install --yes ffmpeg/);
  assert.match(workflow, /yt-dlp/);
  assert.match(workflow, /npm run verify:deploy/);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40} # v\d/);
  assert.match(workflow, /actions\/setup-node@[0-9a-f]{40} # v\d/);
  assert.doesNotMatch(workflow, /\.exe\b/i);
  assert.match(environmentExample, /^PORT=5177$/m);
  assert.match(environmentExample, /^FFMPEG_PATH=ffmpeg$/m);
  assert.match(environmentExample, /^YT_DLP_PATH=yt-dlp$/m);
  assert.match(systemdUnit, /^User=vdownloader$/m);
  assert.match(systemdUnit, /^NoNewPrivileges=true$/m);
  assert.match(systemdUnit, /^ProtectSystem=strict$/m);
  assert.match(systemdUnit, /^ReadWritePaths=\/var\/lib\/vdownloader\/jobs$/m);
  assert.doesNotMatch(systemdUnit, /User=root/i);
  assert.match(nginxSite, /proxy_pass http:\/\/127\.0\.0\.1:5177/);
  assert.match(nginxSite, /X-Forwarded-For \$remote_addr/);
  assert.match(nginxSite, /X-Forwarded-Proto \$scheme/);
  assert.doesNotMatch(`${systemdUnit}\n${nginxSite}`, /\.exe\b/i);
});

test('continuity and governance documents remain at the repository root', async () => {
  const documents = [
    '../../AGENTS.md',
    '../../CURRENT_STATUS.md',
    '../../README.md',
    '../../CHANGELOG.md',
    '../../CONTRIBUTING.md',
    '../../LICENSE',
    '../../THIRD_PARTY_LICENSES.md'
  ];
  for (const document of documents) {
    const content = await readFile(new URL(document, import.meta.url), 'utf8');
    assert.ok(content.trim().length > 20, `${document} must exist at the repository root`);
  }
});
