import { execFile as execFileCallback } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";
import readline from "node:readline/promises";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const VERSION_INPUT_PATTERN = /^(?:v)?(\d+)\.(\d+)\.(\d+)$/;

export function parseVersionTag(input) {
  const match = VERSION_INPUT_PATTERN.exec(input.trim());
  if (!match) {
    return null;
  }

  return {
    raw: `v${match[1]}.${match[2]}.${match[3]}`,
    version: `${match[1]}.${match[2]}.${match[3]}`,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function compareVersionTags(left, right) {
  if (left.major !== right.major) {
    return left.major - right.major;
  }
  if (left.minor !== right.minor) {
    return left.minor - right.minor;
  }
  return left.patch - right.patch;
}

export function findLatestVersionTag(tags) {
  const parsedTags = tags
    .map(parseVersionTag)
    .filter(Boolean)
    .sort((left, right) => compareVersionTags(right, left));

  return parsedTags[0]?.raw ?? null;
}

async function runGit(execFileImpl, args) {
  return execFileImpl("git", args);
}

async function ensureReleasePreconditions(execFileImpl) {
  await runGit(execFileImpl, ["fetch", "origin", "main"]);

  const currentBranch = (
    await runGit(execFileImpl, ["rev-parse", "--abbrev-ref", "HEAD"])
  ).stdout.trim();

  if (currentBranch !== "main") {
    throw new Error("release:tag는 main 브랜치에서만 실행할 수 있습니다.");
  }

  const localHead = (await runGit(execFileImpl, ["rev-parse", "HEAD"])).stdout.trim();
  const remoteMainHead = (
    await runGit(execFileImpl, ["rev-parse", "origin/main"])
  ).stdout.trim();

  if (localHead !== remoteMainHead) {
    throw new Error(
      "로컬 main이 최신 origin/main과 일치하지 않습니다. 먼저 동기화한 뒤 다시 시도해 주세요.",
    );
  }

  const statusOutput = (
    await runGit(execFileImpl, ["status", "--porcelain"])
  ).stdout.trim();

  if (statusOutput) {
    throw new Error("작업 트리가 깨끗하지 않습니다. 변경사항을 정리한 뒤 다시 시도해 주세요.");
  }
}

async function readManifestFromDisk() {
  return JSON.parse(await readFile("manifest.json", "utf8"));
}

async function writeManifestToDisk(manifest) {
  await writeFile("manifest.json", `${JSON.stringify(manifest, null, "\t")}\n`);
}

function normalizeVersionInput(input) {
  const parsed = parseVersionTag(input);
  if (!parsed) {
    throw new Error("버전 형식은 v1.2.3 또는 1.2.3 형태여야 합니다.");
  }
  return parsed;
}

export async function runReleaseTagFlow({
  execFileImpl = execFile,
  prompt,
  log = console.log,
  dryRun = false,
  versionInput,
  readManifest = readManifestFromDisk,
  writeManifest = writeManifestToDisk,
} = {}) {
  if (!prompt) {
    throw new Error("prompt implementation is required");
  }

  await runGit(execFileImpl, ["fetch", "--tags", "origin"]);
  await ensureReleasePreconditions(execFileImpl);

  const { stdout: tagsOutput } = await runGit(execFileImpl, ["tag", "--list"]);
  const latestTag = findLatestVersionTag(
    tagsOutput
      .split("\n")
      .map((tag) => tag.trim())
      .filter(Boolean),
  );

  log(`현재 최신 태그: ${latestTag ?? "없음"}`);

  const targetInput = versionInput
    ? versionInput.trim()
    : (await prompt("새 태그 버전 (예: v1.2.3 또는 1.2.3): ")).trim();
  const nextTag = normalizeVersionInput(targetInput);

  const { stdout: existingTagOutput } = await runGit(execFileImpl, [
    "tag",
    "--list",
    nextTag.raw,
  ]);

  if (existingTagOutput.trim()) {
    throw new Error(`이미 존재하는 태그입니다: ${nextTag.raw}`);
  }

  if (latestTag) {
    const latestParsed = parseVersionTag(latestTag);
    if (compareVersionTags(nextTag, latestParsed) <= 0) {
      throw new Error(
        `최신 태그보다 높은 버전만 사용할 수 있습니다. 현재 최신 태그: ${latestTag}`,
      );
    }
  }

  const confirm = (
    await prompt(`태그 ${nextTag.raw}를 생성하고 origin에 푸시할까요? [y/N]: `)
  )
    .trim()
    .toLowerCase();

  if (confirm !== "y" && confirm !== "yes") {
    log("태그 생성을 취소했습니다.");
    return;
  }

  const currentManifest = await readManifest();

  if (dryRun) {
    if (currentManifest.version !== nextTag.version) {
      log(`[dry-run] manifest.json version -> ${nextTag.version}`);
    } else {
      log(`[dry-run] manifest.json version already ${nextTag.version}`);
    }
    log("[dry-run] git add manifest.json");
    log(`[dry-run] git commit -m "Bump version to ${nextTag.version}"`);
    log("[dry-run] git push origin main");
    log(`[dry-run] git tag ${nextTag.raw}`);
    log(`[dry-run] git push origin ${nextTag.raw}`);
    log("dry-run이어서 실제 manifest 수정, 커밋, 태그 생성과 푸시는 하지 않았습니다.");
    return;
  }

  const shouldCommitManifestBump = currentManifest.version !== nextTag.version;

  if (shouldCommitManifestBump) {
    await writeManifest({
      ...currentManifest,
      version: nextTag.version,
    });
    await runGit(execFileImpl, ["add", "manifest.json"]);
    await runGit(execFileImpl, ["commit", "-m", `Bump version to ${nextTag.version}`]);
    await runGit(execFileImpl, ["push", "origin", "main"]);
  } else {
    log(`manifest.json이 이미 ${nextTag.version} 버전이라 버전 bump 커밋은 건너뜁니다.`);
  }

  await runGit(execFileImpl, ["tag", nextTag.raw]);
  await runGit(execFileImpl, ["push", "origin", nextTag.raw]);

  log(`태그 ${nextTag.raw} 푸시가 완료되었습니다.`);
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const versionInput = args.find((arg) => arg !== "--dry-run");

  try {
    await runReleaseTagFlow({
      prompt: (message) => rl.question(message),
      dryRun,
      versionInput,
    });
  } finally {
    rl.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
