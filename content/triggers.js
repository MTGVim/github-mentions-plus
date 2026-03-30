const contentTriggersRoot = typeof window !== 'undefined' ? window : globalThis;
contentTriggersRoot.GitHubMentionsContent = contentTriggersRoot.GitHubMentionsContent || {};

function scanForMentionTrigger(text, pos) {
  try {
    const slice = text.substring(0, pos);
    const match = slice.match(/@@([a-zA-Z0-9-_]*)$/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

function scanForCommandTrigger(text, pos) {
  try {
    const slice = text.substring(0, pos);
    const match = slice.match(/@!([a-zA-Z0-9-_]*)$/);
    return match ? { command: match[1], query: match[1] } : null;
  } catch (error) {
    return null;
  }
}

function filterUsers(users, query) {
  if (!Array.isArray(users) || users.length === 0) {
    return [];
  }

  if (!query) {
    return users;
  }

  const lowerQuery = query.toLowerCase();
  return users.filter((user) =>
    user.username.toLowerCase().includes(lowerQuery) ||
    user.name.toLowerCase().includes(lowerQuery)
  );
}

function filterCommands(commands, query) {
  if (!Array.isArray(commands) || commands.length === 0) {
    return [];
  }

  if (!query) {
    return commands.slice(0, 10);
  }

  const lowerQuery = query.toLowerCase();
  return commands.filter((command) =>
    command.command.toLowerCase().includes(lowerQuery)
  ).slice(0, 10);
}

contentTriggersRoot.GitHubMentionsContent.scanForMentionTrigger = scanForMentionTrigger;
contentTriggersRoot.GitHubMentionsContent.scanForCommandTrigger = scanForCommandTrigger;
contentTriggersRoot.GitHubMentionsContent.filterUsers = filterUsers;
contentTriggersRoot.GitHubMentionsContent.filterCommands = filterCommands;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    scanForMentionTrigger,
    scanForCommandTrigger,
    filterUsers,
    filterCommands
  };
}
