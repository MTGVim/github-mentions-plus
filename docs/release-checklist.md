# Release Checklist

## Package

1. Bump `manifest.json` version.
2. Run `npm run build`.
3. Run `bash scripts/build-release-zip.sh`.
4. Confirm the zip exists under `release/`.
5. Inspect the zip contents and verify only extension runtime files are included.

## GitHub Release Automation

1. Run `yarn release:tag`.
2. The script will:
   - fetch the latest tags from `origin`
   - show the latest semantic version tag
   - prompt for the next version in `v1.1.0` or `1.1.0` form
   - reject versions that are not newer than the latest git tag
   - update `manifest.json`
   - commit the version bump when needed
   - push `main`
   - create and push `v1.1.0`
3. The standard tag-driven `Release Extension` workflow will:
   - validate that `manifest.json` version matches the tag
   - build `release/github-mentions-plus-v<version>.zip`
   - create a GitHub Release
   - generate release notes automatically
   - upload the zip as a release asset
4. To preview the planned steps without changing anything, run `yarn release:tag --dry-run`.
5. For non-release verification, use the `Build Release Artifact` workflow or PR workflow artifact.

## Manual Release Extension

1. Open the `Release Extension` workflow in GitHub Actions.
2. Run it manually with `workflow_dispatch`.
3. Enable the `submit_to_chrome_web_store` checkbox when you want the workflow to submit the build to the Chrome Web Store through the latest V2 API.
4. Keep the checkbox disabled when you only want the GitHub Release path.
5. The manual run still validates the manifest version, builds the release zip, and publishes the GitHub Release before any optional Chrome Web Store submission.

## Smoke Test

1. Open `chrome://extensions/` or `edge://extensions/`.
2. Load the repo as unpacked.
3. Verify `@@` mentions still open the custom suggestion overlay.
4. Verify `!` commands still expand correctly.
5. Verify mouse click and keyboard selection both work inside GitHub modals and regular comment areas.
6. Verify settings persist after reloading the extension.

## Chrome Web Store Submission

1. Make sure the listing, privacy details, screenshots, and store metadata are already configured in the Chrome Web Store dashboard before you submit a build.
2. Required GitHub Actions secrets:
   - `CWS_EXTENSION_ID`
   - `CWS_PUBLISHER_ID`
   - `CWS_CLIENT_ID`
   - `CWS_CLIENT_SECRET`
   - `CWS_REFRESH_TOKEN`
3. Open the Chrome Web Store Developer Dashboard.
4. Upload `release/github-mentions-plus-v<version>.zip`.
5. Update listing text, screenshots, and category if needed.
6. Review requested permissions:
   - `storage`
   - `*://*.github.com/*`
7. Submit for review.

## Edge Add-ons Submission

1. Open the Microsoft Edge Add-ons Developer Center.
2. Upload the same release zip.
3. Review listing metadata and screenshots.
4. Submit for certification.

## Notes

- Source control files, `.codex/`, and `.spec-workflow/` are intentionally excluded from the release zip.
- Settings export/import should round-trip correctly through the popup JSON backup flow.
