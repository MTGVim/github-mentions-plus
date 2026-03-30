(function initGitHubMentionsLgtm(root) {
  const curatedLgtmGifs = [
    'https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif',
    'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif',
    'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    'https://media.giphy.com/media/3orieKZ9ax8nsJnSs8/giphy.gif',
    'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif',
    'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',
    'https://media.giphy.com/media/QMHoU66sBXqqLqYvGO/giphy.gif'
  ];

  function getCuratedLgtmPool() {
    return curatedLgtmGifs.slice();
  }

  function pickRandomLgtmGif(excludedUrl = null, randomFn = Math.random) {
    const pool = getCuratedLgtmPool().filter((url) => url !== excludedUrl);
    const targetPool = pool.length > 0 ? pool : getCuratedLgtmPool();

    if (targetPool.length === 0) {
      return null;
    }

    const index = Math.floor(randomFn() * targetPool.length);
    return targetPool[index];
  }

  root.GitHubMentionsLGTM = {
    CURATED_LGTM_GIFS: curatedLgtmGifs.slice(),
    getCuratedLgtmPool,
    pickRandomLgtmGif
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = root.GitHubMentionsLGTM;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
