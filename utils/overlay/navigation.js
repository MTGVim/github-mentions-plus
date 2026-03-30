const overlayNavigationRoot = typeof window !== 'undefined' ? window : globalThis;
overlayNavigationRoot.GitHubMentionsOverlay = overlayNavigationRoot.GitHubMentionsOverlay || {};

overlayNavigationRoot.GitHubMentionsOverlay.handleKeyNavigation = function(event) {
  const overlayApi = overlayNavigationRoot.GitHubMentionsOverlay;
  const state = overlayApi.state;
  if (!state?.overlay || !overlayApi.isOverlayVisible() || state.overlayItems.length === 0) {
    return false;
  }

  if (state.selectedIndex !== state.currentSelectedIndex && state.overlayItems.length > 0) {
    if (state.currentSelectedIndex >= 0 && state.currentSelectedIndex < state.overlayItems.length) {
      state.selectedIndex = state.currentSelectedIndex;
      overlayApi.updateSelection();
    }
  }

  const now = Date.now();
  if (now - state.lastKeyNavTime < state.KEY_NAV_DELAY && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
    event.preventDefault();
    return true;
  }

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      event.stopPropagation();
      if (state.overlayItems.length > 1) {
        state.selectedIndex = (state.selectedIndex + 1) % state.overlayItems.length;
        state.currentSelectedIndex = state.selectedIndex;
        overlayApi.updateSelection();
        state.lastKeyNavTime = now;
      }
      return true;

    case 'ArrowUp':
      event.preventDefault();
      event.stopPropagation();
      if (state.overlayItems.length > 1) {
        state.selectedIndex = (state.selectedIndex - 1 + state.overlayItems.length) % state.overlayItems.length;
        state.currentSelectedIndex = state.selectedIndex;
        overlayApi.updateSelection();
        state.lastKeyNavTime = now;
      }
      return true;

    case 'Enter':
      event.preventDefault();
      event.stopPropagation();
      return state.overlayItems[state.selectedIndex]?.userData || false;

    case 'Escape':
      event.preventDefault();
      event.stopPropagation();
      overlayApi.hideOverlay();
      return true;

    default:
      return false;
  }
};
