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

  return [...getBuiltInCommands(), ...userCommands].slice(0, 10);
}

function applyCommandTemplate(template, date = new Date()) {
  return String(template || '')
    .replace(/\$\{timestamp\}/g, date.toISOString())
    .replace(/\$\{date\}/g, date.toLocaleDateString())
    .replace(/\$\{time\}/g, date.toLocaleTimeString());
}

async function executeCommand(command, input, settings) {
  try {
    let result = '';

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

    const cursor = input.selectionStart;
    const text = input.value;
    const beforeCursor = text.substring(0, cursor);
    const afterCursor = text.substring(cursor);
    const commandMatch = beforeCursor.match(/@!([a-zA-Z0-9-_]*)$/);

    if (!commandMatch) {
      return false;
    }

    const commandStart = cursor - commandMatch[0].length;
    input.value = text.substring(0, commandStart) + result + afterCursor;
    input.selectionStart = input.selectionEnd = commandStart + result.length;
    input.dispatchEvent(new Event('input', { bubbles: true }));
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
    executeCommand
  };
}
