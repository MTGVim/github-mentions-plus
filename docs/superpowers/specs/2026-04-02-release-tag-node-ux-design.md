# Release Tag Node UX Design

## Goal

Replace the current bash-based `release:tag` script with a Node.js script that matches the interactive UX from `tiger-video-compressor`, while preserving this repository's release-specific behavior.

## Current Context

- `github-mentions-plus` currently uses `scripts/release-tag.sh`.
- The current script requires a positional version argument like `1.1.0`.
- It immediately updates `manifest.json`, commits, creates a tag, pushes `main`, and pushes the tag.
- `tiger-video-compressor` uses `scripts/release-tag.mjs` with:
  - interactive prompts
  - latest tag display
  - `--dry-run`
  - `main` branch validation
  - `origin/main` sync validation
  - tests

## Recommended Approach

Replace the bash script with `scripts/release-tag.mjs` and switch the package script to run the Node entry directly.

Reuse the flow and structure from `tiger-video-compressor` as closely as possible, but extend the execution phase for this repository so it also updates `manifest.json`, commits the bump, and pushes `main` before pushing the tag.

## User Experience

`yarn release:tag` should:

1. Fetch remote tags
2. Verify the current branch is `main`
3. Verify local `main` matches `origin/main`
4. Verify the working tree is clean
5. Show the latest semantic version tag
6. Prompt for the next tag in `v1.2.3` format
7. Reject invalid or duplicate tags
8. Ask for confirmation before making changes

`yarn release:tag --dry-run` should:

1. Perform the same validations and prompts
2. Print the planned commands and manifest version update
3. Skip the actual manifest write, commit, tag creation, and pushes

## Repository-Specific Execution

After confirmation, the new script should:

1. Parse the entered tag like `v1.2.3`
2. Write `1.2.3` into `manifest.json`
3. Stage `manifest.json`
4. Commit with `Bump version to 1.2.3`
5. Push `main` to `origin`
6. Create tag `v1.2.3`
7. Push tag `v1.2.3` to `origin`

This differs from `tiger-video-compressor`, which only creates and pushes the tag.

## Validation Rules

- Tag input must match `v<major>.<minor>.<patch>`
- Existing local tags must block the run
- Existing remote tags must block the run
- Non-`main` branches must block the run
- Local `main` diverging from `origin/main` must block the run
- Dirty working trees must block the run before prompting

## Files To Change

- Replace `scripts/release-tag.sh` with `scripts/release-tag.mjs`
- Update `package.json` to run `node scripts/release-tag.mjs`
- Add tests for the new release-tag flow
- Update `README.md`
- Update `docs/release-checklist.md`

## Testing

Add tests that cover:

- latest-tag discovery
- valid prompted release flow
- invalid tag input
- duplicate tag rejection
- dry-run output
- cancel at confirmation
- non-`main` branch rejection
- `origin/main` mismatch rejection
- dirty working tree rejection

## Out of Scope

- Changing the GitHub Actions release workflow
- Changing the release zip build process
- Supporting positional version arguments

## Acceptance Criteria

1. `yarn release:tag` works without positional arguments
2. The script prompts for a `v1.2.3` tag
3. The script supports `--dry-run`
4. The script updates `manifest.json`, commits, pushes `main`, then tags and pushes the tag
5. Documentation reflects the new interactive flow
6. Automated tests cover the main success and failure paths
