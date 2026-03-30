/**
 * GitHub Mentions+ content bootstrap
 */

const contentScriptRoot = typeof window !== 'undefined' ? window : globalThis;
const app = contentScriptRoot.GitHubMentionsContent?.createApp
  ? contentScriptRoot.GitHubMentionsContent.createApp()
  : null;

if (app) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
  } else {
    app.initialize();
  }

  document.addEventListener('visibilitychange', () => app.handleVisibilityChange());
  document.addEventListener('focusin', (event) => app.handleFocusIn(event), true);
  window.addEventListener('resize', () => app.handleResize());
  window.addEventListener('beforeunload', () => app.cleanup());

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    app.handleMessage(message, sender, sendResponse);
    return true;
  });
}
