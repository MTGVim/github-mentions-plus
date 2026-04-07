# Repository Guidelines

## Project Structure & Module Organization
Core source files live in `src/`, which defines the esbuild entry points for the content script and popup. Runtime modules are grouped by feature in `content/`, `browserAction/popup/`, and `utils/`. Built artifacts such as `content.bundle.js` and `browserAction/popup.bundle.js` are generated files; update their source modules instead. Extension metadata is in `manifest.json`, icons live in `icons/`, and release notes/checklists belong in `docs/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies.
- `npm run build`: bundle `src/content-entry.js` and `src/popup-entry.js` with esbuild.
- `npm test`: run the Node test suite from `tests/*.test.js`.
- `npm run release:zip`: build and package the extension into `release/github-mentions-plus-v<version>.zip`.
- `npm run release:tag`: validate a clean `main`, bump `manifest.json` if needed, and create/push a version tag.

For local development, load the repository root as an unpacked extension in Chrome or Edge after running `npm run build`.

## Coding Style & Naming Conventions
This repository uses plain JavaScript modules with small, focused files. Match the surrounding style: most `.js` files use 2-space indentation and trailing commas where they already exist; `manifest.json` is tab-indented. Prefer descriptive file names by feature, such as `users-source.js`, `settings-form.js`, or `overlay-render.test.js`. Keep generated bundles out of manual edits unless the build step specifically requires regeneration.

## Testing Guidelines
Tests use Node's built-in `node:test` runner plus `node:assert/strict`. Add new coverage in `tests/` with the `*.test.js` suffix and mirror the behavior or module being verified. Favor focused tests with lightweight stubs over browser-dependent integration logic. Run `npm test` before opening a pull request, and rerun `npm run build` when changing entry points, popup code, or extension packaging.

## Commit & Pull Request Guidelines
Recent history follows short, imperative subjects, often with prefixes such as `feat:`, `fix:`, `perf:`, `docs:`, or `chore:`. Keep commits scoped to one change, for example `fix: preserve textarea selection during command insert`. Pull requests should include a concise summary, linked issue or context, test/build results, and screenshots or short recordings for popup or overlay UI changes.

## Release & Configuration Notes
Versioning is driven by `manifest.json`. Store release steps in [docs/release-checklist.md](/home/tigeryoo/workspace/github-mentions-plus/docs/release-checklist.md), and do not commit secrets or private endpoint data into popup settings fixtures or docs.
