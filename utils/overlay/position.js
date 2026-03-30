const overlayPositionRoot = typeof window !== 'undefined' ? window : globalThis;
overlayPositionRoot.GitHubMentionsOverlay = overlayPositionRoot.GitHubMentionsOverlay || {};

overlayPositionRoot.GitHubMentionsOverlay.updateOverlayPosition = function(activeInput) {
  const state = overlayPositionRoot.GitHubMentionsOverlay.state;
  if (!state?.overlay || !activeInput) {
    return;
  }

  const rect = activeInput.getBoundingClientRect();
  state.overlay.style.left = `${rect.left}px`;
  state.overlay.style.top = `${rect.bottom + 6 + activeInput.scrollTop}px`;
  state.overlay.style.width = `${rect.width}px`;
  state.overlay.style.borderRadius = '0.75rem';
  state.overlay.style.position = 'fixed';
  state.overlay.style.margin = '0';

  if (!state.overlay.hasAttribute('popover')) {
    state.overlay.setAttribute('popover', 'manual');
    if (activeInput.id) {
      state.overlay.setAttribute('popover-target', activeInput.id);
    }
  }

  if (!state.overlay.matches(':popover-open')) {
    try {
      state.overlay.showPopover();
    } catch (error) {
      // ignore already-open popovers
    }
  }
};

overlayPositionRoot.GitHubMentionsOverlay.isActiveInputInDialog = function(activeInput) {
  return Boolean(activeInput?.closest('[role="dialog"]'));
};
