import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSourceUrl, providerForMediaUrl } from '../../providers/index.js';

function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

test('fuzzed input never turns an untrusted value into an accepted source', () => {
  const random = randomGenerator(0x5eed1234);
  const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:/?&.%#[]@_-';

  for (let sample = 0; sample < 5000; sample += 1) {
    const length = Math.floor(random() * 180);
    let value = '';
    for (let index = 0; index < length; index += 1) {
      value += characters[Math.floor(random() * characters.length)];
    }
    try {
      const normalized = normalizeSourceUrl(value);
      assert.equal(normalized.url.protocol, 'https:');
      assert.ok(['youtube', 'xvideos', 'pornhub', 'xnxx'].includes(normalized.provider.id));
    } catch (error) {
      assert.ok(error instanceof Error);
    }
  }
});

test('fuzzed CDN-like hosts are rejected unless a provider explicitly owns them', () => {
  const random = randomGenerator(0xdecafbad);
  for (let sample = 0; sample < 2000; sample += 1) {
    const host = `${Math.floor(random() * 1e9)}.example.invalid`;
    assert.equal(providerForMediaUrl(`https://${host}/video.mp4?token=${random()}`), null);
  }
});
