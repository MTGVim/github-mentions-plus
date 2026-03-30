const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAvailableCommands,
  applyCommandTemplate
} = require('../content/commands.js');

test('buildAvailableCommands includes built-ins and custom command metadata', () => {
  const commands = buildAvailableCommands({
    review: {
      content: 'Ready at ${timestamp}',
      emoji: '✅'
    }
  });

  assert.equal(commands[0].command, 'lgtmrand');
  assert.deepEqual(commands[1], {
    command: 'review',
    description: 'Ready at ${timestamp}...',
    emoji: '✅'
  });
});

test('applyCommandTemplate replaces supported variables', () => {
  const date = new Date('2026-03-30T12:34:56.000Z');
  const rendered = applyCommandTemplate('${timestamp} ${date} ${time}', date);

  assert.ok(rendered.includes('2026-03-30T12:34:56.000Z'));
  assert.ok(rendered.length > '${timestamp} ${date} ${time}'.length);
});
