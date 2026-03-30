const overlayAnchorRoot = typeof window !== 'undefined' ? window : globalThis;
overlayAnchorRoot.GitHubMentionsOverlay = overlayAnchorRoot.GitHubMentionsOverlay || {};

function createRect(left, top, width, height) {
  return {
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height
  };
}

function getFallbackLineHeight(activeInput) {
  const computedStyle = overlayAnchorRoot.getComputedStyle?.(activeInput);
  const lineHeight = Number.parseFloat(computedStyle?.lineHeight);
  if (Number.isFinite(lineHeight) && lineHeight > 0) {
    return lineHeight;
  }

  const fontSize = Number.parseFloat(computedStyle?.fontSize);
  if (Number.isFinite(fontSize) && fontSize > 0) {
    return Math.round(fontSize * 1.2);
  }

  return 16;
}

function getTextareaAnchorRect(activeInput) {
  const getCaretCoordinates = overlayAnchorRoot.GitHubMentionsVendor?.getCaretCoordinates;
  if (typeof getCaretCoordinates !== 'function' || typeof activeInput?.selectionStart !== 'number') {
    return null;
  }

  const inputRect = activeInput.getBoundingClientRect();
  const coordinates = getCaretCoordinates(activeInput, activeInput.selectionStart);
  const lineHeight = coordinates.height || getFallbackLineHeight(activeInput);
  const left = inputRect.left + coordinates.left - activeInput.scrollLeft;
  const top = inputRect.top + coordinates.top - activeInput.scrollTop;
  return createRect(left, top, 1, lineHeight);
}

function getContenteditableAnchorRect(activeInput) {
  const selection = activeInput?.ownerDocument?.getSelection?.();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0).cloneRange();
  if (!activeInput.contains(range.startContainer)) {
    return null;
  }

  range.collapse(false);
  const rect = Array.from(range.getClientRects()).pop() || range.getBoundingClientRect();
  if (rect && (rect.width || rect.height)) {
    return createRect(rect.left, rect.top, Math.max(rect.width, 1), Math.max(rect.height, getFallbackLineHeight(activeInput)));
  }

  return null;
}

function getSelectionAnchorRect(activeInput) {
  if (!activeInput?.getBoundingClientRect) {
    return null;
  }

  if (activeInput.matches?.('textarea, input[type="text"], input:not([type])')) {
    return getTextareaAnchorRect(activeInput) || activeInput.getBoundingClientRect();
  }

  if (activeInput.matches?.('[contenteditable="true"]')) {
    return getContenteditableAnchorRect(activeInput) || activeInput.getBoundingClientRect();
  }

  return activeInput.getBoundingClientRect();
}

overlayAnchorRoot.GitHubMentionsOverlay.getSelectionAnchorRect = getSelectionAnchorRect;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createRect,
    getFallbackLineHeight,
    getSelectionAnchorRect
  };
}
