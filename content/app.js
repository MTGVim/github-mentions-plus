const contentAppRoot = typeof window !== 'undefined' ? window : globalThis;
contentAppRoot.GitHubMentionsContent = contentAppRoot.GitHubMentionsContent || {};

contentAppRoot.GitHubMentionsContent.createApp = function() {
  const state = {
    activeInput: null,
    mentionStartPos: null,
    isInitialized: false,
    settings: null,
    cachedUsers: []
  };

  function getApi() {
    return {
      storage: contentAppRoot.GitHubMentionsStorage,
      dom: contentAppRoot.GitHubMentionsDOM,
      triggers: contentAppRoot.GitHubMentionsContent,
      commands: contentAppRoot.GitHubMentionsContent,
      usersSource: contentAppRoot.GitHubMentionsContent
    };
  }

  function insertMention(username) {
    if (!state.activeInput) {
      return;
    }

    try {
      const value = state.activeInput.value;
      const cursor = state.activeInput.selectionStart;
      const before = value.substring(0, state.mentionStartPos);
      const after = value.substring(cursor);
      const mentionText = `@${username} `;

      state.activeInput.value = before + mentionText + after;
      const newCursorPos = before.length + mentionText.length;
      state.activeInput.focus();
      state.activeInput.setSelectionRange(newCursorPos, newCursorPos);
      state.activeInput.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (error) {
      // ignore mention insertion failures
    }
  }

  async function refreshOverlayForActiveInput() {
    const { dom, triggers, commands, usersSource, storage } = getApi();
    if (!state.activeInput || !state.settings?.enabled) {
      return;
    }

    const cursor = state.activeInput.selectionStart;
    const text = state.activeInput.value;
    const mentionQuery = triggers.scanForMentionTrigger(text, cursor);
    const commandInfo = triggers.scanForCommandTrigger(text, cursor);

    if (mentionQuery !== null) {
      state.mentionStartPos = cursor - mentionQuery.length - 2;
      const users = await usersSource.getUsersForSuggestions(storage, state.cachedUsers, state.settings);
      state.cachedUsers = users;
      const matches = triggers.filterUsers(users, mentionQuery);

      if (matches.length > 0) {
        dom.showOverlay(matches, (user) => insertMention(user.username), state.activeInput);
        return;
      }
    }

    if (commandInfo) {
      const availableCommands = commands.buildAvailableCommands(state.settings?.customCommands);
      const matches = triggers.filterCommands(availableCommands, commandInfo.query);

      if (matches.length > 0) {
        dom.showOverlay(
          matches.map((command) => ({
            username: command.command,
            name: command.description || command.command,
            isCommand: true,
            emoji: command.emoji || null
          })),
          async (command) => {
            await commands.executeCommand(command.username, state.activeInput, state.settings);
          },
          state.activeInput
        );
        return;
      }
    }

    dom.hideOverlay();
  }

  async function onKeyUp(event) {
    const { dom } = getApi();
    if (!state.activeInput || !state.settings?.enabled) {
      return;
    }

    const navigationKeys = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'];
    if (navigationKeys.includes(event.key)) {
      return;
    }

    const key = event.key;
    const isRelevantKey = /^[a-zA-Z0-9-_]$/.test(key) ||
      key === '@' ||
      key === '!' ||
      key === 'Backspace' ||
      key === 'Delete' ||
      key === 'Escape' ||
      key === 'Enter';

    if (!isRelevantKey) {
      return;
    }

    if (key === 'Escape') {
      dom.hideOverlay();
      return;
    }

    try {
      await refreshOverlayForActiveInput();
    } catch (error) {
      console.error('[GitHub Mentions+] Keyup processing error:', error);
      dom.hideOverlay();
    }
  }

  function onInput() {
    const { dom, triggers } = getApi();
    if (!state.activeInput || !state.settings?.enabled) {
      return;
    }

    const cursor = state.activeInput.selectionStart;
    const text = state.activeInput.value;
    const mentionQuery = triggers.scanForMentionTrigger(text, cursor);
    const commandInfo = triggers.scanForCommandTrigger(text, cursor);

    if (mentionQuery === null && !commandInfo) {
      dom.hideOverlay();
      return;
    }

    refreshOverlayForActiveInput();
  }

  function handleKeyDown(event) {
    const { dom } = getApi();
    if (!state.settings?.enabled || !state.activeInput) {
      return;
    }

    const action = dom.handleKeyNavigation(event);
    if (!action || typeof action !== 'object' || !action.type) {
      return;
    }

    if (action.type === 'select' && action.item) {
      if (action.item.isCommand) {
        contentAppRoot.GitHubMentionsContent.executeCommand(action.item.username, state.activeInput, state.settings);
      } else {
        insertMention(action.item.username);
      }
      dom.hideOverlay();
      return;
    }
  }

  function activateInput(input) {
    try {
      state.activeInput = input;
      input.dataset.mentionEnhanced = 'true';

      if (input.dataset.mentionListenersBound === 'true') {
        return;
      }

      input.dataset.mentionListenersBound = 'true';
      input.addEventListener('keydown', handleKeyDown);
      input.addEventListener('keyup', onKeyUp);
      input.addEventListener('input', onInput);
      input.addEventListener('blur', () => {
        setTimeout(() => getApi().dom.hideOverlay(), 100);
      });
    } catch (error) {
      // ignore activation failures
    }
  }

  function scanInputs() {
    try {
      const inputs = document.querySelectorAll('textarea, [contenteditable="true"]');
      const focusedInput = document.activeElement;

      inputs.forEach((input) => {
        if (focusedInput && input === focusedInput) {
          activateInput(input);
        } else {
          input.dataset.mentionEnhanced = 'false';
        }
      });
    } catch (error) {
      // ignore scanning failures
    }
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      getApi().dom.hideOverlay();
      return;
    }

    scanInputs();
  }

  function handleResize() {
    const { dom } = getApi();
    if (state.activeInput && dom.isOverlayVisible()) {
      dom.updateOverlayPosition(state.activeInput);
    }
  }

  function cleanup() {
    try {
      getApi().dom.removeOverlay();
      const overlay = document.getElementById('github-mentions-overlay');
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      state.activeInput = null;
      state.mentionStartPos = null;
      state.isInitialized = false;
    } catch (error) {
      // ignore cleanup failures
    }
  }

  async function handleMessage(message, sender, sendResponse) {
    const { storage, usersSource } = getApi();

    try {
      if (!contentAppRoot.GitHubMentionsAPI || !storage) {
        sendResponse({ success: false, message: 'Extension utilities not available' });
        return;
      }

      switch (message.action || message.type) {
        case 'GMP_SETTINGS_UPDATED':
          state.settings = contentAppRoot.GitHubMentionsSettings
            ? contentAppRoot.GitHubMentionsSettings.normalizeSettings(message.settings)
            : message.settings;
          state.cachedUsers = state.settings?.directJsonData
            ? await usersSource.syncCachedUsersFromSettings(storage, state.settings)
            : [];
          if (state.activeInput) {
            await refreshOverlayForActiveInput();
          }
          return;

        case 'refreshUsers': {
          const currentSettings = await storage.getSettings();
          const validUsers = await usersSource.syncCachedUsersFromSettings(storage, currentSettings);
          state.cachedUsers = validUsers;

          if (validUsers.length > 0) {
            sendResponse({
              success: true,
              message: `Successfully loaded ${validUsers.length} users from ${currentSettings.dataSource === 'gui' ? 'GUI table' : 'direct JSON'}`,
              userCount: validUsers.length
            });
          } else {
            sendResponse({
              success: false,
              message: 'No valid users found in configured settings',
              userCount: 0
            });
          }
          return;
        }

        default:
          sendResponse({ success: false, message: 'Unknown action' });
      }
    } catch (error) {
      console.error('[GitHub Mentions+] Message handling error:', error);
      sendResponse({ success: false, message: error.message || 'Unexpected error' });
    }
  }

  async function initialize() {
    const { storage, dom } = getApi();
    if (state.isInitialized) {
      return;
    }

    try {
      if (!storage || !dom) {
        return;
      }

      state.settings = await storage.getSettings();
      dom.createOverlay();
      state.cachedUsers = await storage.getCachedUsers();
      scanInputs();
      setInterval(scanInputs, 1e3 / 30);
      state.isInitialized = true;
    } catch (error) {
      // ignore initialization failures
    }
  }

  return {
    cleanup,
    handleMessage,
    handleResize,
    handleVisibilityChange,
    initialize,
    scanInputs
  };
};
