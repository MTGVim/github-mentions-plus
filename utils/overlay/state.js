const overlayStateRoot = typeof window !== 'undefined' ? window : globalThis;
overlayStateRoot.GitHubMentionsOverlay = overlayStateRoot.GitHubMentionsOverlay || {};

overlayStateRoot.GitHubMentionsOverlay.state = {
  overlay: null,
  lastGoodPosition: null,
  positionRequestId: 0,
  selectedIndex: 0,
  currentSelectedIndex: 0,
  overlayItems: [],
  lastKeyNavTime: 0,
  KEY_NAV_DELAY: 200
};
