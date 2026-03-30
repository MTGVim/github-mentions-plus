/**
 * Shared settings and user normalization helpers for GitHub Mentions+
 */

const settingsRoot = typeof window !== 'undefined' ? window : globalThis;
settingsRoot.GitHubMentionsSettings = settingsRoot.GitHubMentionsSettings || {};
const GitHubMentionsSettings = settingsRoot.GitHubMentionsSettings;

const DEFAULT_SETTINGS = {
  dataSource: 'gui',
  directJsonData: '',
  enabled: true,
  customCommands: {}
};

GitHubMentionsSettings.getDefaultSettings = function() {
  return {
    ...DEFAULT_SETTINGS,
    customCommands: {}
  };
};

GitHubMentionsSettings.normalizeSettings = function(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return {
    dataSource: source.dataSource === 'direct' ? 'direct' : 'gui',
    directJsonData: typeof source.directJsonData === 'string' ? source.directJsonData : '',
    enabled: source.enabled !== false,
    customCommands: source.customCommands && typeof source.customCommands === 'object' ? source.customCommands : {}
  };
};

GitHubMentionsSettings.normalizeUserForCache = function(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  if (typeof user.username !== 'string' || user.username.trim() === '') {
    return null;
  }

  const username = user.username.trim();
  const name = typeof user.name === 'string' && user.name.trim() ? user.name.trim() : username;
  const avatar = typeof user.avatar === 'string' && user.avatar.trim()
    ? user.avatar.trim()
    : (typeof user.profile === 'string' && user.profile.trim() ? user.profile.trim() : '');

  return {
    username,
    name,
    avatar
  };
};

GitHubMentionsSettings.normalizeUsersForCache = function(users) {
  if (!Array.isArray(users)) {
    return [];
  }

  return users
    .map((user) => GitHubMentionsSettings.normalizeUserForCache(user))
    .filter(Boolean);
};

GitHubMentionsSettings.validateDirectJsonUsers = function(users) {
  if (!Array.isArray(users) || users.length === 0) {
    return false;
  }

  return users.every((user) =>
    user &&
    typeof user === 'object' &&
    typeof user.username === 'string' &&
    user.username.trim() !== '' &&
    typeof user.name === 'string' &&
    user.name.trim() !== '' &&
    (user.avatar === undefined || typeof user.avatar === 'string')
  );
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_SETTINGS,
    getDefaultSettings: GitHubMentionsSettings.getDefaultSettings,
    normalizeSettings: GitHubMentionsSettings.normalizeSettings,
    normalizeUserForCache: GitHubMentionsSettings.normalizeUserForCache,
    normalizeUsersForCache: GitHubMentionsSettings.normalizeUsersForCache,
    validateDirectJsonUsers: GitHubMentionsSettings.validateDirectJsonUsers
  };
}
