const test = require('node:test');
const assert = require('node:assert/strict');

const {
  CURATED_LGTM_GIFS,
  buildAvailableCommands,
  applyCommandTemplate,
  resolveLgtmCommandResult,
  executeCommand
} = require('../content/commands.js');

const { handleKeyNavigation } = require('../utils/overlay/navigation.js');

test('buildAvailableCommands lists custom commands first in alphabetical order, then built-ins', () => {
  const commands = buildAvailableCommands({
    zebra: {
      content: 'Last one',
      emoji: '🦓'
    },
    review: {
      content: 'Ready at ${timestamp}',
      emoji: '✅'
    },
    alpha: {
      content: 'Alpha note',
      emoji: '🅰️'
    }
  });

  assert.deepEqual(commands[0], {
    command: 'alpha',
    description: 'Alpha note...',
    emoji: '🅰️'
  });
  assert.deepEqual(commands[1], {
    command: 'review',
    description: 'Ready at ${timestamp}...',
    emoji: '✅'
  });
  assert.deepEqual(commands[2], {
    command: 'zebra',
    description: 'Last one...',
    emoji: '🦓'
  });
  assert.equal(commands[3].command, 'lgtmrand');
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

test('resolveLgtmCommandResult falls back to curated content when background messaging fails', async () => {
  globalThis.chrome = {
    runtime: {
      lastError: { message: 'No receiving end' },
      sendMessage(_message, callback) {
        callback(undefined);
      }
    }
  };

  const originalRandom = Math.random;
  Math.random = () => 0;

  try {
    const result = await resolveLgtmCommandResult();
    assert.deepEqual(result, {
      success: true,
      imageUrl: CURATED_LGTM_GIFS[0],
      source: 'curated-content-fallback'
    });
  } finally {
    Math.random = originalRandom;
  }
});

test('executeCommand inserts curated LGTM fallback when runtime request fails', async () => {
  globalThis.chrome = {
    runtime: {
      lastError: { message: 'No receiving end' },
      sendMessage(_message, callback) {
        callback(undefined);
      }
    }
  };

  const originalRandom = Math.random;
  Math.random = () => 0;

  const input = {
    value: 'Please check @!lgtmrand',
    selectionStart: 'Please check @!lgtmrand'.length,
    selectionEnd: 'Please check @!lgtmrand'.length,
    dispatchEvent() {}
  };

  try {
    const success = await executeCommand('lgtmrand', input, {});
    assert.equal(success, true);
    assert.equal(input.value, `Please check ![LGTM](${CURATED_LGTM_GIFS[0]})`);
  } finally {
    Math.random = originalRandom;
  }
});

test('executeCommand inserts an LGTM placeholder immediately for textarea inputs', async () => {
  let resolver;
  globalThis.chrome = {
    runtime: {
      lastError: null,
      sendMessage(_message, callback) {
        resolver = callback;
      }
    }
  };

  const events = [];
  const input = {
    value: 'Please check @!lgtmrand',
    selectionStart: 'Please check @!lgtmrand'.length,
    selectionEnd: 'Please check @!lgtmrand'.length,
    dispatchEvent(event) {
      events.push(event.type);
    },
    matches(selector) {
      return selector === 'textarea';
    }
  };

  const success = await executeCommand('lgtmrand', input, {});

  assert.equal(success, true);
  assert.match(input.value, /^Please check <!-- GHMP_LGTM:[a-z0-9-]+ -->$/);
  assert.equal(input.selectionStart, input.value.length);
  assert.equal(input.selectionEnd, input.value.length);
  assert.deepEqual(events, ['input']);

  resolver({ success: true, imageUrl: 'https://example.com/lgtm.gif' });
});

test('executeCommand replaces only the matching LGTM placeholder after async resolution', async () => {
  let resolver;
  globalThis.chrome = {
    runtime: {
      lastError: null,
      sendMessage(_message, callback) {
        resolver = callback;
      }
    }
  };

  const input = {
    value: 'Please check @!lgtmrand',
    selectionStart: 'Please check @!lgtmrand'.length,
    selectionEnd: 'Please check @!lgtmrand'.length,
    dispatchEvent() {},
    matches(selector) {
      return selector === 'textarea';
    }
  };

  await executeCommand('lgtmrand', input, {});
  const placeholderValue = input.value;
  input.value = `${placeholderValue} and keep typing`;
  input.selectionStart = input.selectionEnd = input.value.length;

  resolver({ success: true, imageUrl: 'https://example.com/lgtm.gif' });
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(
    input.value,
    'Please check ![LGTM](https://example.com/lgtm.gif) and keep typing'
  );
  assert.equal(input.selectionStart, input.value.length);
  assert.equal(input.selectionEnd, input.value.length);
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
