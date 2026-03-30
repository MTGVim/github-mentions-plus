const test = require('node:test');
const assert = require('node:assert/strict');

const {
  scanForMentionTrigger,
  scanForCommandTrigger,
  filterUsers,
  filterCommands
} = require('../content/triggers.js');

test('scanForMentionTrigger returns query after double-at', () => {
  assert.equal(scanForMentionTrigger('hello @@tig', 11), 'tig');
  assert.equal(scanForMentionTrigger('hello @tig', 10), null);
});

test('scanForCommandTrigger returns command info after bang', () => {
  assert.deepEqual(scanForCommandTrigger('run !lgt', 8), { command: 'lgt', query: 'lgt' });
  assert.equal(scanForCommandTrigger('run /lgt', 8), null);
});

test('filter helpers match usernames and commands case-insensitively', () => {
  assert.deepEqual(filterUsers([
    { username: 'tigeryoo', name: 'Tiger Yoo' },
    { username: 'octocat', name: 'Octo Cat' }
  ], 'tig'), [
    { username: 'tigeryoo', name: 'Tiger Yoo' }
  ]);

  assert.deepEqual(filterCommands([
    { command: 'lgtmrand' },
    { command: 'approve' }
  ], 'LGTM'), [
    { command: 'lgtmrand' }
  ]);
});
