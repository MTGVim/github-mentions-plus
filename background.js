/**
 * Background script for GitHub Mentions+ extension
 * Handles CORS-restricted API calls like LGTM random image fetching
 */

const REQUEST_TIMEOUT = 10000;
const LGTM_RELOADED_URL = 'https://us-central1-lgtm-reloaded.cloudfunctions.net/lgtm';
const FALLBACK_LGTM_GIF = 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif';
const CURATED_LGTM_GIFS = [
  'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif',
  'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
  'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
  'https://media.giphy.com/media/3orieKZ9ax8nsJnSs8/giphy.gif',
  'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif',
  'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',
  'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
  'https://media.giphy.com/media/QMHoU66sBXqqLqYvGO/giphy.gif'
];

let lastDeliveredLgtmUrl = null;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function normalizeLgtmResult(result) {
  if (result?.success && typeof result.imageUrl === 'string' && result.imageUrl.trim()) {
    return {
      success: true,
      imageUrl: result.imageUrl.trim(),
      source: result.source || 'unknown'
    };
  }

  return {
    success: false,
    source: result?.source || 'unknown',
    message: result?.message || 'Unable to resolve LGTM image'
  };
}

async function fetchRandomLGTMFromReloaded(fetchImpl = fetchWithTimeout, options = {}) {
  try {
    const response = await fetchImpl(LGTM_RELOADED_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`LGTM API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data || typeof data.imageUrl !== 'string' || !data.imageUrl.trim()) {
      throw new Error('Invalid response format from LGTM API');
    }

    return normalizeLgtmResult({
      success: true,
      imageUrl: data.imageUrl,
      source: 'lgtm-reloaded'
    });
  } catch (error) {
    if (!options.silent) {
      console.error('[GitHub Mentions+] Background: Error fetching LGTM image:', error);
    }
    return normalizeLgtmResult({
      success: false,
      source: 'lgtm-reloaded',
      message: `Failed to fetch LGTM image: ${error.message}`
    });
  }
}

function getCuratedLgtmPool() {
  return CURATED_LGTM_GIFS.slice();
}

function pickRandomCuratedLgtm(excludedUrl = null, randomFn = Math.random) {
  const pool = getCuratedLgtmPool().filter((url) => url !== excludedUrl);
  const targetPool = pool.length > 0 ? pool : getCuratedLgtmPool();

  if (targetPool.length === 0) {
    return normalizeLgtmResult({
      success: false,
      source: 'curated',
      message: 'No curated LGTM GIFs available'
    });
  }

  const index = Math.floor(randomFn() * targetPool.length);
  return normalizeLgtmResult({
    success: true,
    imageUrl: targetPool[index],
    source: 'curated'
  });
}

function shouldBypassReloadedResult(result) {
  if (!result?.success || !result.imageUrl) {
    return true;
  }

  return result.imageUrl === lastDeliveredLgtmUrl;
}

async function fetchRandomLGTM(options = {}) {
  const fetchImpl = options.fetchImpl || fetchWithTimeout;
  const randomFn = options.randomFn || Math.random;

  const primaryResult = await fetchRandomLGTMFromReloaded(fetchImpl, options);
  if (!shouldBypassReloadedResult(primaryResult)) {
    lastDeliveredLgtmUrl = primaryResult.imageUrl;
    return primaryResult;
  }

  const curatedResult = pickRandomCuratedLgtm(lastDeliveredLgtmUrl, randomFn);
  if (curatedResult.success) {
    lastDeliveredLgtmUrl = curatedResult.imageUrl;
    return curatedResult;
  }

  lastDeliveredLgtmUrl = FALLBACK_LGTM_GIF;
  return normalizeLgtmResult({
    success: true,
    imageUrl: FALLBACK_LGTM_GIF,
    source: 'fallback'
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchRandomLGTM') {
    fetchRandomLGTM().then((result) => {
      sendResponse(result);
    }).catch((error) => {
      sendResponse(normalizeLgtmResult({
        success: false,
        source: 'lgtm-reloaded',
        message: error.message
      }));
    });

    return true;
  }

  return false;
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CURATED_LGTM_GIFS,
    FALLBACK_LGTM_GIF,
    LGTM_RELOADED_URL,
    normalizeLgtmResult,
    fetchRandomLGTMFromReloaded,
    getCuratedLgtmPool,
    pickRandomCuratedLgtm,
    shouldBypassReloadedResult,
    fetchRandomLGTM,
    setLastDeliveredLgtmUrl(value) {
      lastDeliveredLgtmUrl = value;
    },
    getLastDeliveredLgtmUrl() {
      return lastDeliveredLgtmUrl;
    }
  };
}
