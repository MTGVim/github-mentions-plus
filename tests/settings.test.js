const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getDefaultSettings,
  normalizeSettings,
  normalizeUserForCache,
  normalizeUsersForCache
} = require('../utils/settings.js');

test('normalizeSettings applies defaults and preserves supported fields', () => {
  assert.deepEqual(normalizeSettings({
    dataSource: 'direct',
    directJsonData: '[1]',
    enabled: false,
    customCommands: { ok: 'yes' }
  }), {
    dataSource: 'direct',
    directJsonData: '[1]',
    enabled: false,
    customCommands: { ok: 'yes' }
  });

  assert.deepEqual(normalizeSettings(null), getDefaultSettings());
});

test('normalizeUsersForCache fills missing name and maps profile to avatar', () => {
  assert.deepEqual(normalizeUserForCache({
    username: 'octocat',
    name: '',
    profile: 'https://example.com/avatar.png'
  }), {
    username: 'octocat',
    name: 'octocat',
    avatar: 'https://example.com/avatar.png'
  });

  assert.deepEqual(normalizeUsersForCache([
    { username: 'octocat', name: 'Octo' },
    { username: 'hubot', profile: 'https://example.com/hubot.png' },
    { username: '' }
  ]), [
    { username: 'octocat', name: 'Octo', avatar: '' },
    { username: 'hubot', name: 'hubot', avatar: 'https://example.com/hubot.png' }
  ]);
});
