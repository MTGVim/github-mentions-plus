const contentCommandsRoot = typeof window !== 'undefined' ? window : globalThis;
contentCommandsRoot.GitHubMentionsContent = contentCommandsRoot.GitHubMentionsContent || {};

const sharedLgtm = contentCommandsRoot.GitHubMentionsLGTM
  || (typeof module !== 'undefined' && module.exports ? require('../utils/lgtm.js') : null);

function pickRandomLgtmGif(randomFn = Math.random) {
  return sharedLgtm?.pickRandomLgtmGif(null, randomFn) || null;
}

function requestLgtmFromBackground() {
  if (!chrome?.runtime?.sendMessage) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { action: 'fetchRandomLGTM' },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }

          resolve(response || null);
        }
      );
    } catch (error) {
      resolve(null);
    }
  });
}

async function resolveLgtmCommandResult() {
  const backgroundResult = await requestLgtmFromBackground();
  if (backgroundResult?.success && backgroundResult.imageUrl) {
    return backgroundResult;
  }

  const curatedGif = pickRandomLgtmGif();
  if (!curatedGif) {
    return null;
  }

  console.warn('[GitHub Mentions+] LGTM command fell back to curated content because background fetch was unavailable.');

  return {
    success: true,
    imageUrl: curatedGif,
    source: 'curated-content-fallback'
  };
}

function getBuiltInCommands() {
  return [
    {
      command: 'lgtmrand',
      description: 'Insert a random LGTM GIF from GIPHY'
    }
  ];
}

function sortCommandsAlphabetically(commands) {
  return [...commands].sort((left, right) => left.command.localeCompare(right.command));
}

function buildAvailableCommands(customCommands) {
  const safeCommands = customCommands && typeof customCommands === 'object'
    ? customCommands
    : {};

  const userCommands = Object.keys(safeCommands).map((commandName) => {
    const commandData = safeCommands[commandName];
    const content = typeof commandData === 'object'
      ? commandData.content || ''
      : commandData || '';

    return {
      command: commandName,
      description: content.substring(0, 50) + '...',
      emoji: typeof commandData === 'object' ? commandData.emoji || null : null
    };
  });

  return [
    ...sortCommandsAlphabetically(userCommands),
    ...sortCommandsAlphabetically(getBuiltInCommands())
  ].slice(0, 10);
}

function applyCommandTemplate(template, date = new Date()) {
  return String(template || '')
    .replace(/\$\{timestamp\}/g, date.toISOString())
    .replace(/\$\{date\}/g, date.toLocaleDateString())
    .replace(/\$\{time\}/g, date.toLocaleTimeString());
}

function createLgtmPlaceholder() {
  const token = `ghmp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `<!-- GHMP_LGTM:${token} -->`;
}

function dispatchInputEvent(input) {
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function replaceTextRange(input, start, end, replacement) {
  const originalValue = input.value;
  const before = originalValue.slice(0, start);
  const after = originalValue.slice(end);
  const delta = replacement.length - (end - start);
  const selectionStart = input.selectionStart;
  const selectionEnd = input.selectionEnd;

  input.value = before + replacement + after;

  if (typeof selectionStart === 'number' && typeof selectionEnd === 'number') {
    let nextSelectionStart = selectionStart;
    let nextSelectionEnd = selectionEnd;

    if (selectionStart > end) {
      nextSelectionStart += delta;
    } else if (selectionStart >= start) {
      nextSelectionStart = start + replacement.length;
    }

    if (selectionEnd > end) {
      nextSelectionEnd += delta;
    } else if (selectionEnd >= start) {
      nextSelectionEnd = start + replacement.length;
    }

    input.selectionStart = nextSelectionStart;
    input.selectionEnd = nextSelectionEnd;
  }

  dispatchInputEvent(input);
}

function insertTextareaPlaceholder(input, commandStart, commandEnd, placeholder) {
  replaceTextRange(input, commandStart, commandEnd, placeholder);
}

function replaceTextareaPlaceholder(input, placeholder, replacement) {
  if (!input?.matches?.('textarea')) {
    return false;
  }

  const index = input.value.indexOf(placeholder);
  if (index === -1) {
    return false;
  }

  replaceTextRange(input, index, index + placeholder.length, replacement);
  return true;
}

function resolveLgtmPlaceholderAsync(input, placeholder) {
  resolveLgtmCommandResult()
    .then((lgtmResult) => {
      if (!lgtmResult?.success || !lgtmResult.imageUrl) {
        return;
      }

      replaceTextareaPlaceholder(input, placeholder, `![LGTM](${lgtmResult.imageUrl})`);
    })
    .catch((error) => {
      console.error('[GitHub Mentions+] LGTM placeholder replacement error:', error);
    });
}

async function executeCommand(command, input, settings) {
  try {
    let result = '';

    const cursor = input.selectionStart;
    const text = input.value;
    const beforeCursor = text.substring(0, cursor);
    const afterCursor = text.substring(cursor);
    const commandMatch = beforeCursor.match(/@!([a-zA-Z0-9-_]*)$/);

    if (!commandMatch) {
      return false;
    }

    const commandStart = cursor - commandMatch[0].length;

    if (command === 'lgtmrand' && input.matches?.('textarea')) {
      const placeholder = createLgtmPlaceholder();
      insertTextareaPlaceholder(input, commandStart, cursor, placeholder);
      resolveLgtmPlaceholderAsync(input, placeholder);
      return true;
    }

    if (command === 'lgtmrand') {
      const lgtmResult = await resolveLgtmCommandResult();
      if (lgtmResult?.success && lgtmResult.imageUrl) {
        result = `![LGTM](${lgtmResult.imageUrl})`;
      } else {
        return false;
      }
    } else {
      const customCommands = settings?.customCommands || {};
      const commandData = customCommands[command];
      if (commandData) {
        const template = typeof commandData === 'object'
          ? commandData.content || ''
          : commandData;
        result = applyCommandTemplate(template);
      }
    }

    if (!result) {
      return false;
    }

    input.value = text.substring(0, commandStart) + result + afterCursor;
    input.selectionStart = input.selectionEnd = commandStart + result.length;
    dispatchInputEvent(input);
    return true;
  } catch (error) {
    console.error('[GitHub Mentions+] Command execution error:', error);
    return false;
  }
}

contentCommandsRoot.GitHubMentionsContent.getBuiltInCommands = getBuiltInCommands;
contentCommandsRoot.GitHubMentionsContent.buildAvailableCommands = buildAvailableCommands;
contentCommandsRoot.GitHubMentionsContent.applyCommandTemplate = applyCommandTemplate;
contentCommandsRoot.GitHubMentionsContent.executeCommand = executeCommand;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CURATED_LGTM_GIFS: sharedLgtm?.CURATED_LGTM_GIFS || [],
    getBuiltInCommands,
    buildAvailableCommands,
    applyCommandTemplate,
    pickRandomLgtmGif,
    requestLgtmFromBackground,
    resolveLgtmCommandResult,
    executeCommand,
    createLgtmPlaceholder,
    replaceTextareaPlaceholder
  };
}
