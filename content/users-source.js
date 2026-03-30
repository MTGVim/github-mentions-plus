const contentUsersRoot = typeof window !== 'undefined' ? window : globalThis;
contentUsersRoot.GitHubMentionsContent = contentUsersRoot.GitHubMentionsContent || {};

async function parseUsersFromSettings(settings) {
  if (!settings || !settings.directJsonData) {
    return [];
  }

  try {
    const directUsers = JSON.parse(settings.directJsonData);
    if (!Array.isArray(directUsers) || directUsers.length === 0) {
      return [];
    }

    if (!contentUsersRoot.GitHubMentionsSettings) {
      return [];
    }

    return contentUsersRoot.GitHubMentionsSettings.normalizeUsersForCache(directUsers);
  } catch (error) {
    console.error('Failed to parse direct JSON data:', error);
    return [];
  }
}

async function getUsersForSuggestions(storage, currentCache, fallbackSettings) {
  if (!storage) {
    return [];
  }

  if (Array.isArray(currentCache) && currentCache.length > 0) {
    return currentCache;
  }

  const currentSettings = fallbackSettings || await storage.getSettings();
  if (!currentSettings) {
    return [];
  }

  const validUsers = await parseUsersFromSettings(currentSettings);
  if (validUsers.length > 0) {
    await storage.setCachedUsers(validUsers);
  }

  return validUsers;
}

async function syncCachedUsersFromSettings(storage, settings) {
  if (!settings?.directJsonData) {
    return [];
  }

  const validUsers = await parseUsersFromSettings(settings);
  if (validUsers.length > 0 && storage?.setCachedUsers) {
    try {
      await storage.setCachedUsers(validUsers);
    } catch (error) {
      console.warn('Failed to update cache in content script, using in-memory cache only:', error);
    }
  }

  return validUsers;
}

contentUsersRoot.GitHubMentionsContent.parseUsersFromSettings = parseUsersFromSettings;
contentUsersRoot.GitHubMentionsContent.getUsersForSuggestions = getUsersForSuggestions;
contentUsersRoot.GitHubMentionsContent.syncCachedUsersFromSettings = syncCachedUsersFromSettings;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseUsersFromSettings
  };
}
