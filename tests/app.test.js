const test = require('node:test');
const assert = require('node:assert/strict');

function createInput() {
  return {
    dataset: {},
    isConnected: true,
    nodeType: 1,
    matches(selector) {
      return selector === 'textarea';
    },
    addEventListener() {},
  };
}

function createDocument(inputs = []) {
  return {
    readyState: 'complete',
    hidden: false,
    activeElement: inputs[0] || null,
    body: {
      nodeType: 1
    },
    getElementById() {
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'textarea, [contenteditable="true"]') {
        return inputs;
      }
      return [];
    }
  };
}

function loadCreateApp() {
  delete require.cache[require.resolve('../content/app.js')];
  globalThis.GitHubMentionsContent = globalThis.GitHubMentionsContent || {};
  require('../content/app.js');
  return globalThis.GitHubMentionsContent.createApp;
}

test('initialize performs an initial scan without registering setInterval polling', async () => {
  const input = createInput();
  const documentStub = createDocument([input]);
  const createApp = loadCreateApp();
  const intervalCalls = [];
  const observers = [];

  globalThis.document = documentStub;
  globalThis.window = globalThis;
  globalThis.setInterval = (...args) => {
    intervalCalls.push(args);
    return 1;
  };
  globalThis.MutationObserver = class {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }

    observe(target, options) {
      this.target = target;
      this.options = options;
    }

    disconnect() {}
  };
  globalThis.GitHubMentionsStorage = {
    async getSettings() {
      return { enabled: true };
    },
    async getCachedUsers() {
      return [];
    }
  };
  globalThis.GitHubMentionsDOM = {
    createOverlay() {},
    removeOverlay() {},
    hideOverlay() {},
    isOverlayVisible() {
      return false;
    },
    updateOverlayPosition() {}
  };

  const app = createApp();
  await app.initialize();

  assert.equal(input.dataset.mentionEnhanced, 'true');
  assert.equal(intervalCalls.length, 0);
  assert.equal(observers.length, 1);
  assert.equal(observers[0].target, documentStub.body);
  assert.deepEqual(observers[0].options, {
    childList: true,
    subtree: true
  });
});

test('mutation observer rescans when a matching input node is added', async () => {
  const firstInput = createInput();
  const secondInput = createInput();
  const inputs = [firstInput];
  const documentStub = createDocument(inputs);
  const createApp = loadCreateApp();
  const observers = [];

  globalThis.document = documentStub;
  globalThis.window = globalThis;
  globalThis.MutationObserver = class {
    constructor(callback) {
      this.callback = callback;
      observers.push(this);
    }

    observe() {}
    disconnect() {}
  };
  globalThis.GitHubMentionsStorage = {
    async getSettings() {
      return { enabled: true };
    },
    async getCachedUsers() {
      return [];
    }
  };
  globalThis.GitHubMentionsDOM = {
    createOverlay() {},
    removeOverlay() {},
    hideOverlay() {},
    isOverlayVisible() {
      return false;
    },
    updateOverlayPosition() {}
  };

  const app = createApp();
  await app.initialize();

  inputs.push(secondInput);
  documentStub.activeElement = secondInput;
  observers[0].callback([
    {
      type: 'childList',
      addedNodes: [secondInput],
      removedNodes: []
    }
  ]);

  assert.equal(secondInput.dataset.mentionEnhanced, 'true');
});
