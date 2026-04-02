const test = require('node:test');
const assert = require('node:assert/strict');

async function loadReleaseTagModule() {
  return import('../scripts/release-tag.mjs');
}

test('findLatestVersionTag returns the highest semantic tag from mixed tags', async () => {
  const { findLatestVersionTag } = await loadReleaseTagModule();

  assert.equal(findLatestVersionTag([
    'release-1',
    'v1.1.9',
    'v2.0.0',
    'v2.0.1',
    'v2.0.0-beta'
  ]), 'v2.0.1');
});

test('runReleaseTagFlow accepts a positional version without v prefix and normalizes it', async () => {
  const { runReleaseTagFlow } = await loadReleaseTagModule();
  const commands = [];
  const writes = [];

  const execFileImpl = async (command, args) => {
    commands.push([command, ...args]);
    const joined = args.join(' ');

    if (command === 'git' && joined === 'fetch --tags origin') {
      return { stdout: '' };
    }

    if (command === 'git' && joined === 'fetch origin main') {
      return { stdout: '' };
    }

    if (command === 'git' && joined === 'rev-parse --abbrev-ref HEAD') {
      return { stdout: 'main\n' };
    }

    if (command === 'git' && joined === 'rev-parse HEAD') {
      return { stdout: 'abc123\n' };
    }

    if (command === 'git' && joined === 'rev-parse origin/main') {
      return { stdout: 'abc123\n' };
    }

    if (command === 'git' && joined === 'status --porcelain') {
      return { stdout: '' };
    }

    if (command === 'git' && joined === 'tag --list') {
      return { stdout: 'v1.1.9\nv2.2.1\n' };
    }

    if (command === 'git' && joined === 'tag --list v2.2.2') {
      return { stdout: '' };
    }

    return { stdout: '' };
  };

  await runReleaseTagFlow({
    execFileImpl,
    versionInput: '2.2.2',
    prompt: async () => 'y',
    readManifest: async () => ({ version: '1.1.9', name: 'GitHub Mentions+' }),
    writeManifest: async (manifest) => {
      writes.push(manifest);
    }
  });

  assert.deepEqual(writes, [{
    version: '2.2.2',
    name: 'GitHub Mentions+'
  }]);

  assert.deepEqual(commands, [
    ['git', 'fetch', '--tags', 'origin'],
    ['git', 'fetch', 'origin', 'main'],
    ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
    ['git', 'rev-parse', 'HEAD'],
    ['git', 'rev-parse', 'origin/main'],
    ['git', 'status', '--porcelain'],
    ['git', 'tag', '--list'],
    ['git', 'tag', '--list', 'v2.2.2'],
    ['git', 'add', 'manifest.json'],
    ['git', 'commit', '-m', 'Bump version to 2.2.2'],
    ['git', 'push', 'origin', 'main'],
    ['git', 'tag', 'v2.2.2'],
    ['git', 'push', 'origin', 'v2.2.2']
  ]);
});

test('runReleaseTagFlow shows planned changes without mutating anything in dry-run mode', async () => {
  const { runReleaseTagFlow } = await loadReleaseTagModule();
  const commands = [];
  const logs = [];

  const execFileImpl = async (command, args) => {
    commands.push([command, ...args]);
    const joined = args.join(' ');

    if (command === 'git' && joined === 'fetch --tags origin') {
      return { stdout: '' };
    }

    if (command === 'git' && joined === 'fetch origin main') {
      return { stdout: '' };
    }

    if (command === 'git' && joined === 'rev-parse --abbrev-ref HEAD') {
      return { stdout: 'main\n' };
    }

    if (command === 'git' && joined === 'rev-parse HEAD') {
      return { stdout: 'abc123\n' };
    }

    if (command === 'git' && joined === 'rev-parse origin/main') {
      return { stdout: 'abc123\n' };
    }

    if (command === 'git' && joined === 'status --porcelain') {
      return { stdout: '' };
    }

    if (command === 'git' && joined === 'tag --list') {
      return { stdout: 'v1.1.9\n' };
    }

    if (command === 'git' && joined === 'tag --list v2.2.0') {
      return { stdout: '' };
    }

    return { stdout: '' };
  };

  await runReleaseTagFlow({
    execFileImpl,
    versionInput: 'v2.2.0',
    prompt: async () => 'yes',
    log: (line) => logs.push(line),
    dryRun: true,
    readManifest: async () => ({ version: '1.1.9' }),
    writeManifest: async () => {
      throw new Error('writeManifest should not be called in dry-run');
    }
  });

  assert.deepEqual(commands, [
    ['git', 'fetch', '--tags', 'origin'],
    ['git', 'fetch', 'origin', 'main'],
    ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
    ['git', 'rev-parse', 'HEAD'],
    ['git', 'rev-parse', 'origin/main'],
    ['git', 'status', '--porcelain'],
    ['git', 'tag', '--list'],
    ['git', 'tag', '--list', 'v2.2.0']
  ]);

  assert.ok(logs.includes('[dry-run] manifest.json version -> 2.2.0'));
  assert.ok(logs.includes('[dry-run] git add manifest.json'));
  assert.ok(logs.includes('[dry-run] git commit -m "Bump version to 2.2.0"'));
  assert.ok(logs.includes('[dry-run] git push origin main'));
  assert.ok(logs.includes('[dry-run] git tag v2.2.0'));
  assert.ok(logs.includes('[dry-run] git push origin v2.2.0'));
});

test('runReleaseTagFlow rejects versions that are not newer than the latest tag', async () => {
  const { runReleaseTagFlow } = await loadReleaseTagModule();

  await assert.rejects(() => runReleaseTagFlow({
    execFileImpl: async (command, args) => {
      const joined = args.join(' ');

      if (command === 'git' && joined === 'fetch --tags origin') {
        return { stdout: '' };
      }

      if (command === 'git' && joined === 'fetch origin main') {
        return { stdout: '' };
      }

      if (command === 'git' && joined === 'rev-parse --abbrev-ref HEAD') {
        return { stdout: 'main\n' };
      }

      if (command === 'git' && joined === 'rev-parse HEAD') {
        return { stdout: 'abc123\n' };
      }

      if (command === 'git' && joined === 'rev-parse origin/main') {
        return { stdout: 'abc123\n' };
      }

      if (command === 'git' && joined === 'status --porcelain') {
        return { stdout: '' };
      }

      if (command === 'git' && joined === 'tag --list') {
        return { stdout: 'v2.2.2\n' };
      }

      if (command === 'git' && joined === 'tag --list v2.2.1') {
        return { stdout: '' };
      }

      return { stdout: '' };
    },
    versionInput: '2.2.1',
    prompt: async () => 'y',
    readManifest: async () => ({ version: '1.1.9' }),
    writeManifest: async () => undefined
  }), /최신 태그보다 높은 버전만 사용할 수 있습니다/);
});

test('runReleaseTagFlow prompts for the version when no positional version is given', async () => {
  const { runReleaseTagFlow } = await loadReleaseTagModule();
  const prompts = [];
  const commands = [];

  const execFileImpl = async (command, args) => {
    commands.push([command, ...args]);
    const joined = args.join(' ');

    if (command === 'git' && joined === 'fetch --tags origin') {
      return { stdout: '' };
    }

    if (command === 'git' && joined === 'fetch origin main') {
      return { stdout: '' };
    }

    if (command === 'git' && joined === 'rev-parse --abbrev-ref HEAD') {
      return { stdout: 'main\n' };
    }

    if (command === 'git' && joined === 'rev-parse HEAD') {
      return { stdout: 'abc123\n' };
    }

    if (command === 'git' && joined === 'rev-parse origin/main') {
      return { stdout: 'abc123\n' };
    }

    if (command === 'git' && joined === 'status --porcelain') {
      return { stdout: '' };
    }

    if (command === 'git' && joined === 'tag --list') {
      return { stdout: 'v2.2.1\n' };
    }

    if (command === 'git' && joined === 'tag --list v2.2.2') {
      return { stdout: '' };
    }

    return { stdout: '' };
  };

  await runReleaseTagFlow({
    execFileImpl,
    prompt: async (message) => {
      prompts.push(message);
      return prompts.length === 1 ? 'v2.2.2' : 'y';
    },
    readManifest: async () => ({ version: '1.1.9' }),
    writeManifest: async () => undefined
  });

  assert.equal(prompts[0], '새 태그 버전 (예: v1.2.3 또는 1.2.3): ');
  assert.equal(prompts[1], '태그 v2.2.2를 생성하고 origin에 푸시할까요? [y/N]: ');
  assert.deepEqual(commands.slice(0, 8), [
    ['git', 'fetch', '--tags', 'origin'],
    ['git', 'fetch', 'origin', 'main'],
    ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
    ['git', 'rev-parse', 'HEAD'],
    ['git', 'rev-parse', 'origin/main'],
    ['git', 'status', '--porcelain'],
    ['git', 'tag', '--list'],
    ['git', 'tag', '--list', 'v2.2.2']
  ]);
});

test('runReleaseTagFlow skips the manifest commit path when manifest.json already has the target version', async () => {
  const { runReleaseTagFlow } = await loadReleaseTagModule();
  const commands = [];

  const execFileImpl = async (command, args) => {
    commands.push([command, ...args]);
    const joined = args.join(' ');

    if (command === 'git' && joined === 'fetch --tags origin') {
      return { stdout: '' };
    }

    if (command === 'git' && joined === 'fetch origin main') {
      return { stdout: '' };
    }

    if (command === 'git' && joined === 'rev-parse --abbrev-ref HEAD') {
      return { stdout: 'main\n' };
    }

    if (command === 'git' && joined === 'rev-parse HEAD') {
      return { stdout: 'abc123\n' };
    }

    if (command === 'git' && joined === 'rev-parse origin/main') {
      return { stdout: 'abc123\n' };
    }

    if (command === 'git' && joined === 'status --porcelain') {
      return { stdout: '' };
    }

    if (command === 'git' && joined === 'tag --list') {
      return { stdout: 'v2.2.1\n' };
    }

    if (command === 'git' && joined === 'tag --list v2.2.2') {
      return { stdout: '' };
    }

    return { stdout: '' };
  };

  await runReleaseTagFlow({
    execFileImpl,
    versionInput: '2.2.2',
    prompt: async () => 'y',
    readManifest: async () => ({ version: '2.2.2' }),
    writeManifest: async () => {
      throw new Error('writeManifest should not be called when manifest is already current');
    }
  });

  assert.deepEqual(commands, [
    ['git', 'fetch', '--tags', 'origin'],
    ['git', 'fetch', 'origin', 'main'],
    ['git', 'rev-parse', '--abbrev-ref', 'HEAD'],
    ['git', 'rev-parse', 'HEAD'],
    ['git', 'rev-parse', 'origin/main'],
    ['git', 'status', '--porcelain'],
    ['git', 'tag', '--list'],
    ['git', 'tag', '--list', 'v2.2.2'],
    ['git', 'tag', 'v2.2.2'],
    ['git', 'push', 'origin', 'v2.2.2']
  ]);
});
