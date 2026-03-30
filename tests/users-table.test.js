const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isUserRowBlank,
  isUserRowValid
} = require('../browserAction/popup/users-table.js');

test('isUserRowValid allows a fully blank trailing row', () => {
  assert.equal(isUserRowBlank({ username: '', name: '', profile: '' }), true);
  assert.equal(isUserRowValid({ username: '', name: '', profile: '' }), true);
});

test('isUserRowValid rejects rows missing username when other fields are filled', () => {
  assert.equal(isUserRowValid({ username: '', name: 'Tiger Yoo', profile: '' }), false);
  assert.equal(isUserRowValid({ username: '', name: '', profile: 'https://example.com' }), false);
});

test('isUserRowValid accepts rows with username', () => {
  assert.equal(isUserRowValid({ username: 'tigeryoo', name: '', profile: '' }), true);
});
