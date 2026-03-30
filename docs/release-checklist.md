# Release Checklist

## Package

1. Bump `manifest.json` version.
2. Run `bash scripts/build-release-zip.sh`.
3. Confirm the zip exists under `release/`.
4. Inspect the zip contents and verify only extension runtime files are included.

## GitHub Release Automation

1. Run `yarn release:version 1.1.0`.
2. The script will:
   - update `manifest.json`
   - commit the version bump
   - create tag `v1.1.0`
   - push `main`
   - push `v1.1.0`
4. The `Release Extension` workflow will:
   - validate that `manifest.json` version matches the tag
   - build `release/github-mentions-plus-v<version>.zip`
   - create a GitHub Release
   - generate release notes automatically
   - upload the zip as a release asset
5. For non-release verification, use the `Build Release Artifact` workflow or PR workflow artifact.

## Smoke Test

1. Open `chrome://extensions/` or `edge://extensions/`.
2. Load the repo as unpacked.
3. Verify `@@` mentions still open the custom suggestion overlay.
4. Verify `!` commands still expand correctly.
5. Verify mouse click and keyboard selection both work inside GitHub modals and regular comment areas.
6. Verify settings persist after reloading the extension.

## Chrome Web Store Submission

1. Open the Chrome Web Store Developer Dashboard.
2. Upload `release/github-mentions-plus-v<version>.zip`.
3. Update listing text, screenshots, and category.
4. Review requested permissions:
   - `storage`
   - `*://*.github.com/*`
5. Submit for review.

## Edge Add-ons Submission

1. Open the Microsoft Edge Add-ons Developer Center.
2. Upload the same release zip.
3. Review listing metadata and screenshots.
4. Submit for certification.

## Notes

- Source control files, `.codex/`, and `.spec-workflow/` are intentionally excluded from the release zip.
- Settings export/import should round-trip correctly through the popup JSON backup flow.
