const overlayPositionRoot = typeof window !== 'undefined' ? window : globalThis;
overlayPositionRoot.GitHubMentionsOverlay = overlayPositionRoot.GitHubMentionsOverlay || {};

function applyFallbackPosition(activeInput, overlay) {
  const rect = activeInput.getBoundingClientRect();
  overlay.style.left = `${Math.round(rect.left)}px`;
  overlay.style.top = `${Math.round(rect.bottom)}px`;
}

overlayPositionRoot.GitHubMentionsOverlay.updateOverlayPosition = async function(activeInput) {
  const state = overlayPositionRoot.GitHubMentionsOverlay.state;
  if (!state?.overlay || !activeInput) {
    return;
  }

  const overlay = state.overlay;
  const requestId = state.positionRequestId + 1;
  state.positionRequestId = requestId;
  const anchorRect = overlayPositionRoot.GitHubMentionsOverlay.getSelectionAnchorRect?.(activeInput)
    || activeInput.getBoundingClientRect();
  const floatingUi = overlayPositionRoot.GitHubMentionsVendor || {};

  overlay.style.left = '0px';
  overlay.style.top = '0px';
  overlay.style.width = 'max-content';
  overlay.style.maxWidth = 'min(360px, calc(100vw - 24px))';
  overlay.style.borderRadius = '0.75rem';
  overlay.style.position = 'fixed';
  overlay.style.margin = '0';

  if (typeof floatingUi.computePosition !== 'function') {
    applyFallbackPosition(activeInput, overlay);
    return;
  }

  try {
    const { x, y } = await floatingUi.computePosition(
      {
        contextElement: activeInput,
        getBoundingClientRect() {
          return anchorRect;
        }
      },
      overlay,
      {
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [
          floatingUi.offset(0),
          floatingUi.flip({
            padding: 12,
            fallbackPlacements: ['top-start', 'bottom-start']
          }),
          floatingUi.shift({
            padding: 12,
            limiter: floatingUi.limitShift()
          })
        ]
      }
    );

    if (state.positionRequestId !== requestId) {
      return;
    }

    overlay.style.left = `${Math.round(x)}px`;
    overlay.style.top = `${Math.round(y)}px`;
    state.lastGoodPosition = { x, y };
  } catch (error) {
    applyFallbackPosition(activeInput, overlay);
  }
};

overlayPositionRoot.GitHubMentionsOverlay.isActiveInputInDialog = function(activeInput) {
  return Boolean(activeInput?.closest('[role="dialog"]'));
};
