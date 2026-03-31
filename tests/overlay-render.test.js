const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getScopedOverlayHost,
  isChangesOverlayPath,
  shouldUseScopedOverlay
} = require('../utils/overlay/render.js');

function createNode(tagName, parentNode = null, attributes = {}) {
  return {
    tagName,
    parentNode,
    attributes,
    closest(selector) {
      const selectors = selector.split(',').map((item) => item.trim());
      let current = this;

      while (current) {
        if (selectors.some((item) => matchesSelector(current, item))) {
          return current;
        }
        current = current.parentNode;
      }

      return null;
    }
  };
}

function matchesSelector(node, selector) {
  if (!node) {
    return false;
  }

  if (selector === '[role="dialog"]') {
    return node.attributes.role === 'dialog';
  }

  if (selector === '[popover]') {
    return Object.hasOwn(node.attributes, 'popover');
  }

  if (selector === 'details[open]') {
    return node.tagName === 'DETAILS' && Object.hasOwn(node.attributes, 'open');
  }

  if (selector === '[data-testid="popover"]') {
    return node.attributes['data-testid'] === 'popover';
  }

  if (selector === '[data-testid="anchor-panel"]') {
    return node.attributes['data-testid'] === 'anchor-panel';
  }

  if (selector === '[data-testid="anchored-position"]') {
    return node.attributes['data-testid'] === 'anchored-position';
  }

  return false;
}

test('getScopedOverlayHost returns the nearest dialog ancestor', () => {
  const dialog = createNode('DIV', null, { role: 'dialog' });
  const wrapper = createNode('DIV', dialog);
  const textarea = createNode('TEXTAREA', wrapper);

  assert.equal(getScopedOverlayHost(textarea), dialog);
});

test('isChangesOverlayPath matches pull changes urls', () => {
  assert.equal(isChangesOverlayPath('/pull/123/changes'), true);
  assert.equal(isChangesOverlayPath('/pull/feature-branch/changes?diff=split'), true);
  assert.equal(isChangesOverlayPath('/pull/123/files'), false);
});

test('shouldUseScopedOverlay falls back to the pathname heuristic', () => {
  const textarea = createNode('TEXTAREA');
  const originalLocation = globalThis.location;

  globalThis.location = { pathname: '/pull/123/changes?diff=split' };

  try {
    assert.equal(shouldUseScopedOverlay(textarea), true);
  } finally {
    globalThis.location = originalLocation;
  }
});
