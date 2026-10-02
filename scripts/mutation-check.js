import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const moduleUrl = new URL('../providers/utils.js', import.meta.url);
const originalSource = await readFile(moduleUrl, 'utf8');

/**
 * Imports an in-memory copy of the provider utilities. A unique fragment keeps
 * Node.js from reusing the previous module while mutations are evaluated.
 */
async function importSource(source, name) {
  const encoded = Buffer.from(`${source}\n//# sourceURL=${name}.js`).toString('base64');
  return import(`data:text/javascript;base64,${encoded}#${name}`);
}

/**
 * This contract represents observable behavior that the unit suite must
 * protect. A mutant is considered killed when at least one assertion fails.
 */
function utilityContract(module) {
  assert.equal(module.decodeEntities('A &amp; B'), 'A & B');
  assert.deepEqual(
    module.parseHlsManifest(
      '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2500,RESOLUTION=1920x1080\nvideo.m3u8',
      'https://cdn.example/master.m3u8'
    ),
    [{
      label: '1080p',
      url: 'https://cdn.example/video.m3u8',
      type: 'hls',
      bandwidth: 2500
    }]
  );
}

const mutations = [
  {
    name: 'entity-decoding-no-op',
    find: ".replaceAll('&amp;', '&')",
    replace: ".replaceAll('&amp;', '&amp;')"
  },
  {
    name: 'hls-variant-disabled',
    find: "metadata.startsWith('#EXT-X-STREAM-INF:')",
    replace: "metadata.startsWith('#MUTATED-STREAM-INF:')"
  },
  {
    name: 'bandwidth-removed',
    find: "Number(metadata.match(/BANDWIDTH=(\\d+)/i)?.[1]) || null",
    replace: 'null'
  }
];

utilityContract(await importSource(originalSource, 'original'));

let killed = 0;
for (const mutation of mutations) {
  assert.ok(
    originalSource.includes(mutation.find),
    `Mutation target changed and must be reviewed: ${mutation.name}`
  );
  const mutant = originalSource.replace(mutation.find, mutation.replace);
  try {
    utilityContract(await importSource(mutant, mutation.name));
  } catch {
    killed += 1;
    process.stdout.write(`Killed mutant: ${mutation.name}\n`);
    continue;
  }
  throw new Error(`Surviving mutant: ${mutation.name}`);
}

process.stdout.write(`Mutation score: ${killed}/${mutations.length} (100%)\n`);
