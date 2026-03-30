const contentCommandsRoot = typeof window !== 'undefined' ? window : globalThis;
contentCommandsRoot.GitHubMentionsContent = contentCommandsRoot.GitHubMentionsContent || {};

function isMacPlatform(platformInfo) {
  const userAgentPlatform = platformInfo?.userAgentData?.platform;
  const fallbackPlatform = platformInfo?.platform;
  const platform = typeof userAgentPlatform === 'string' && userAgentPlatform
    ? userAgentPlatform
    : fallbackPlatform;

  return typeof platform === 'string' && platform.toLowerCase().includes('mac');
}

function isCommandConfirmShortcut(event, platformInfo) {
  if (!event || event.key !== 'Enter') {
    return false;
  }

  if (isMacPlatform(platformInfo)) {
    return event.metaKey === true;
  }

  return event.ctrlKey === true;
}

function getCommandConfirmHint(platformInfo) {
  return isMacPlatform(platformInfo) ? 'Cmd+Enter' : 'Ctrl+Enter';
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
      try {
        const lgtmResult = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            { action: 'fetchRandomLGTM' },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }

              resolve(response);
            }
          );
        });

        if (lgtmResult && lgtmResult.success && lgtmResult.imageUrl) {
          result = `![LGTM](${lgtmResult.imageUrl})`;
        } else {
          return false;
        }
      } catch (error) {
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
    const commandMatch = beforeCursor.match(/!([a-zA-Z0-9-_]*)$/);

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
contentCommandsRoot.GitHubMentionsContent.isMacPlatform = isMacPlatform;
contentCommandsRoot.GitHubMentionsContent.isCommandConfirmShortcut = isCommandConfirmShortcut;
contentCommandsRoot.GitHubMentionsContent.getCommandConfirmHint = getCommandConfirmHint;
contentCommandsRoot.GitHubMentionsContent.executeCommand = executeCommand;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getBuiltInCommands,
    buildAvailableCommands,
    applyCommandTemplate,
    isMacPlatform,
    isCommandConfirmShortcut,
    getCommandConfirmHint
  };
}
