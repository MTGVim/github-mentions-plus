const test = require('node:test');
const assert = require('node:assert/strict');

globalThis.GitHubMentionsSettings = {
  normalizeSettings(settings) {
    return {
      dataSource: settings?.dataSource || 'gui',
      directJsonData: settings?.directJsonData || '',
      enabled: settings?.enabled !== false,
      customCommands: settings?.customCommands || {}
    };
  }
};

const { buildSettingsExportPayload } = require('../browserAction/popup/backup-manager.js');

test('buildSettingsExportPayload produces normalized JSON export shape', () => {
  const payload = buildSettingsExportPayload({
    dataSource: 'direct',
    directJsonData: '[{"username":"octocat","name":"Octo"}]'
  });

  assert.equal(payload.version, 1);
  assert.equal(payload.app, 'github-mentions-plus');
  assert.equal(payload.settings.dataSource, 'direct');
  assert.ok(payload.exportedAt);
});
