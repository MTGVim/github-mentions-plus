const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.chrome = {
  runtime: {
    onMessage: {
      addListener() {}
    }
  }
};

const {
  CURATED_LGTM_GIFS,
  FALLBACK_LGTM_GIF,
  fetchRandomLGTMFromReloaded,
  pickRandomCuratedLgtm,
  shouldBypassReloadedResult,
  fetchRandomLGTM,
  setLastDeliveredLgtmUrl,
  getLastDeliveredLgtmUrl
} = require('../background.js');

test('fetchRandomLGTMFromReloaded normalizes success response', async () => {
  const result = await fetchRandomLGTMFromReloaded(async () => ({
    ok: true,
    json: async () => ({ imageUrl: 'https://example.com/a.gif' })
  }));

  assert.deepEqual(result, {
    success: true,
    imageUrl: 'https://example.com/a.gif',
    source: 'lgtm-reloaded'
  });
});

test('pickRandomCuratedLgtm excludes previous url when possible', () => {
  const result = pickRandomCuratedLgtm(CURATED_LGTM_GIFS[0], () => 0);
  assert.equal(result.success, true);
  assert.notEqual(result.imageUrl, CURATED_LGTM_GIFS[0]);
  assert.equal(result.source, 'curated');
});

test('shouldBypassReloadedResult detects repeated delivered url', () => {
  setLastDeliveredLgtmUrl('https://example.com/repeated.gif');
  assert.equal(shouldBypassReloadedResult({
    success: true,
    imageUrl: 'https://example.com/repeated.gif'
  }), true);
  assert.equal(shouldBypassReloadedResult({
    success: true,
    imageUrl: 'https://example.com/other.gif'
  }), false);
});

test('fetchRandomLGTM falls back to curated pool when reloaded fails', async () => {
  setLastDeliveredLgtmUrl(null);
  const result = await fetchRandomLGTM({
    fetchImpl: async () => {
      throw new Error('network failed');
    },
    randomFn: () => 0,
    silent: true
  });

  assert.equal(result.success, true);
  assert.equal(result.source, 'curated');
  assert.equal(CURATED_LGTM_GIFS.includes(result.imageUrl), true);
});

test('fetchRandomLGTM bypasses repeated reloaded url with curated result', async () => {
  setLastDeliveredLgtmUrl('https://example.com/repeated.gif');
  const result = await fetchRandomLGTM({
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ imageUrl: 'https://example.com/repeated.gif' })
    }),
    randomFn: () => 0
  });

  assert.equal(result.success, true);
  assert.equal(result.source, 'curated');
  assert.notEqual(result.imageUrl, 'https://example.com/repeated.gif');
});

test('curated result updates last delivered url', async () => {
  setLastDeliveredLgtmUrl(null);
  const result = await fetchRandomLGTM({
    fetchImpl: async () => {
      throw new Error('network failed');
    },
    randomFn: () => 0,
    silent: true
  });

  assert.equal(getLastDeliveredLgtmUrl(), result.imageUrl);
});

test('fallback constant remains available as final safety net', () => {
  assert.equal(typeof FALLBACK_LGTM_GIF, 'string');
  assert.ok(FALLBACK_LGTM_GIF.includes('giphy.gif'));
});
