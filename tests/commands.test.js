const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAvailableCommands,
  applyCommandTemplate,
  executeCommand
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

test('executeCommand replaces the full @! trigger including the at sign', async () => {
  const input = {
    value: 'Please check @!review',
    selectionStart: 'Please check @!review'.length,
    selectionEnd: 'Please check @!review'.length,
    dispatchEvent() {}
  };

  const success = await executeCommand('review', input, {
    customCommands: {
      review: {
        content: 'approved'
      }
    }
  });

  assert.equal(success, true);
  assert.equal(input.value, 'Please check approved');
});

function createNavigationEnvironment(items) {
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

test('navigation selects commands on plain enter', () => {
  createNavigationEnvironment([{ username: 'review', name: 'Review', isCommand: true }]);
  const action = handleKeyNavigation(createEnterEvent());
  assert.deepEqual(action, {
    type: 'select',
    item: { username: 'review', name: 'Review', isCommand: true }
  });
});
