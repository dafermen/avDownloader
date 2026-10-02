import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npmCli = process.env.npm_execpath;

function runNpm(argumentsList) {
  if (npmCli) {
    return spawnSync(process.execPath, [npmCli, ...argumentsList], {
      encoding: 'utf8',
      stdio: 'inherit',
      shell: false
    });
  }
  return spawnSync(npmCommand, argumentsList, {
    encoding: 'utf8',
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });
}
const checks = [
  ['Acceptance tests', 'test:acceptance'],
  ['Unit tests', 'test:unit'],
  ['Property and invariant tests', 'test:property'],
  ['Mutation testing', 'test:mutation'],
  ['Fuzzing', 'test:fuzz'],
  ['Integration tests', 'test:integration'],
  ['Contract tests', 'test:contract'],
  ['End-to-end tests', 'test:e2e'],
  ['Regression tests', 'test:regression'],
  ['Security tests', 'test:security'],
  ['Concurrency and resilience tests', 'test:resilience'],
  ['Performance and resource tests', 'test:performance'],
  ['Compatibility and deployment tests', 'test:compatibility'],
  ['JavaScript syntax checks', 'check:syntax']
];

const report = {
  schemaVersion: 1,
  startedAt: new Date().toISOString(),
  platform: process.platform,
  architecture: process.arch,
  node: process.version,
  checks: []
};

let failed = false;
for (const [name, script] of checks) {
  const started = Date.now();
  process.stdout.write(`\n=== ${name} ===\n`);
  const result = runNpm(['run', script]);
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  const passed = result.status === 0;
  report.checks.push({
    name,
    command: `npm run ${script}`,
    passed,
    durationMs: Date.now() - started
  });
  if (!passed) {
    failed = true;
    break;
  }
}

if (!failed) {
  const started = Date.now();
  process.stdout.write('\n=== Production dependency audit ===\n');
  const result = runNpm(['audit', '--omit=dev']);
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  const passed = result.status === 0;
  report.checks.push({
    name: 'Production dependency audit',
    command: 'npm audit --omit=dev',
    passed,
    durationMs: Date.now() - started
  });
  failed = !passed;
}

report.completedAt = new Date().toISOString();
report.passed = !failed;
const reportDirectory = resolve('reports');
await mkdir(reportDirectory, { recursive: true });
await writeFile(
  resolve(reportDirectory, 'predeploy-report.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8'
);

if (failed) {
  process.stderr.write('\nDeployment quality gate failed. Deployment is blocked.\n');
  process.exit(1);
}

process.stdout.write('\nDeployment quality gate passed. Complete the manual release checklist before deployment.\n');
