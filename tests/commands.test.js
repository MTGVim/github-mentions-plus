const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAvailableCommands,
  applyCommandTemplate,
  isMacPlatform,
  isCommandConfirmShortcut,
  getCommandConfirmHint
} = require('../content/commands.js');

const { handleKeyNavigation } = require('../utils/overlay/navigation.js');

test('buildAvailableCommands includes built-ins and custom command metadata', () => {
  const commands = buildAvailableCommands({
    review: {
      content: 'Ready at ${timestamp}',
      emoji: '✅'
    }
  });

  assert.equal(commands[0].command, 'lgtmrand');
  assert.deepEqual(commands[1], {
    command: 'review',
    description: 'Ready at ${timestamp}...',
    emoji: '✅'
  });
});

test('applyCommandTemplate replaces supported variables', () => {
  const date = new Date('2026-03-30T12:34:56.000Z');
  const rendered = applyCommandTemplate('${timestamp} ${date} ${time}', date);

  assert.ok(rendered.includes('2026-03-30T12:34:56.000Z'));
  assert.ok(rendered.length > '${timestamp} ${date} ${time}'.length);
});

test('platform helpers detect mac and expose expected confirm hint', () => {
  assert.equal(isMacPlatform({ platform: 'MacIntel' }), true);
  assert.equal(isMacPlatform({ userAgentData: { platform: 'macOS' } }), true);
  assert.equal(getCommandConfirmHint({ platform: 'MacIntel' }), 'Cmd+Enter');
  assert.equal(getCommandConfirmHint({ platform: 'Win32' }), 'Ctrl+Enter');
});

test('command confirm shortcut requires meta on mac and ctrl elsewhere', () => {
  assert.equal(isCommandConfirmShortcut({ key: 'Enter', metaKey: true, ctrlKey: false }, { platform: 'MacIntel' }), true);
  assert.equal(isCommandConfirmShortcut({ key: 'Enter', metaKey: false, ctrlKey: true }, { platform: 'MacIntel' }), false);
  assert.equal(isCommandConfirmShortcut({ key: 'Enter', metaKey: false, ctrlKey: true }, { platform: 'Win32' }), true);
  assert.equal(isCommandConfirmShortcut({ key: 'Enter', metaKey: false, ctrlKey: false }, { platform: 'Win32' }), false);
});

function createNavigationEnvironment(items) {
  globalThis.navigator = { platform: 'Win32' };
  globalThis.GitHubMentionsContent = {
    isCommandConfirmShortcut
  };
  globalThis.GitHubMentionsOverlay = {
    state: {
      overlay: {},
      selectedIndex: 0,
      currentSelectedIndex: 0,
      overlayItems: items.map((item) => ({ userData: item })),
      lastKeyNavTime: 0,
      KEY_NAV_DELAY: 200
    },
    isOverlayVisible() {
      return true;
    },
    updateSelection() {},
    hideOverlay() {}
  };
}

function createEnterEvent(overrides = {}) {
  return {
    key: 'Enter',
    ctrlKey: false,
    metaKey: false,
    preventDefault() {},
    stopPropagation() {},
    ...overrides
  };
}

test('navigation returns select for mentions on plain enter', () => {
  createNavigationEnvironment([{ username: 'octocat', name: 'Octo' }]);
  const action = handleKeyNavigation(createEnterEvent());
  assert.deepEqual(action, {
    type: 'select',
    item: { username: 'octocat', name: 'Octo' }
  });
});

test('navigation blocks command selection on plain enter', () => {
  createNavigationEnvironment([{ username: 'review', name: 'Review', isCommand: true }]);
  const action = handleKeyNavigation(createEnterEvent());
  assert.deepEqual(action, {
    type: 'blocked-command-select',
    item: { username: 'review', name: 'Review', isCommand: true }
  });
});

test('navigation selects command on ctrl-enter for non-mac platform', () => {
  createNavigationEnvironment([{ username: 'review', name: 'Review', isCommand: true }]);
  const action = handleKeyNavigation(createEnterEvent({ ctrlKey: true }));
  assert.deepEqual(action, {
    type: 'select',
    item: { username: 'review', name: 'Review', isCommand: true }
  });
});
