/**
 * DOM utilities facade for GitHub Mentions+ overlay behavior
 */

const domRoot = typeof window !== 'undefined' ? window : globalThis;
domRoot.GitHubMentionsDOM = domRoot.GitHubMentionsDOM || {};

[
  'createOverlay',
  'getOverlay',
  'getSelectedBgColor',
  'getSelectedItem',
  'handleKeyNavigation',
  'hideOverlay',
  'isActiveInputInDialog',
  'isOverlayVisible',
  'removeOverlay',
  'showOverlay',
  'updateOverlayPosition'
].forEach((methodName) => {
  domRoot.GitHubMentionsDOM[methodName] = function(...args) {
    return domRoot.GitHubMentionsOverlay?.[methodName]?.(...args);
  };
});
