# Chrome Web Store Manual Submission Design

## Goal

Extend the existing GitHub Actions release flow so a maintainer can optionally submit the built extension to the Chrome Web Store for review from a manual workflow run.

This automation must only submit when both conditions are true:

1. The workflow is started with `workflow_dispatch`
2. The maintainer explicitly checks a submission option in the workflow inputs

Tag-push releases must continue to create the GitHub release and release zip exactly as they do today, without automatically submitting to the Chrome Web Store.

## Current Context

- `.github/workflows/release.yml` already supports both tag-push releases and manual runs against an existing tag.
- The workflow validates the tag, verifies that `manifest.json` matches the tag version, builds the release zip, and creates a GitHub Release with the zip attached.
- `docs/release-checklist.md` still describes Chrome Web Store submission as a manual dashboard task.

## Recommended Approach

Keep all release behavior inside the existing `Release Extension` workflow and add an optional Chrome Web Store submission branch that only runs during manual dispatch.

This keeps the release path centralized, avoids fetching artifacts across workflows, and matches the current repository structure.

## Workflow Changes

### New Manual Input

Add a `workflow_dispatch` boolean input:

- `submit_to_chrome_web_store`
- Description should clearly say that enabling it uploads the built zip and submits the item for review
- Default should be `false`

### Execution Rules

- `push` on `v*` tags:
  - build release zip
  - create GitHub release
  - do not submit to Chrome Web Store
- `workflow_dispatch` with `submit_to_chrome_web_store = false`:
  - build release zip
  - create GitHub release for the selected tag
  - do not submit to Chrome Web Store
- `workflow_dispatch` with `submit_to_chrome_web_store = true`:
  - build release zip
  - create GitHub release for the selected tag
  - upload the zip to Chrome Web Store
  - publish the uploaded version so it enters review

## Chrome Web Store Integration

### Required Secrets

Store these in GitHub Actions secrets:

- `CWS_EXTENSION_ID`
- `CWS_CLIENT_ID`
- `CWS_CLIENT_SECRET`
- `CWS_REFRESH_TOKEN`

### Authentication

The workflow should exchange the refresh token for an access token during the run, then call the Chrome Web Store API using that bearer token.

### Submission Steps

1. Locate the generated zip in `release/`
2. Upload the package to the Chrome Web Store item using the upload endpoint
3. Publish the uploaded package using the publish endpoint so it is submitted for review
4. Surface API responses in workflow logs without printing secrets

### API Scope

The Google OAuth client must support the `https://www.googleapis.com/auth/chromewebstore` scope.

## Failure Behavior

- Validation failures must stop the job before any upload attempt
- If GitHub release creation fails, Chrome Web Store submission must not run
- If Chrome Web Store upload fails, the workflow should fail
- If upload succeeds but publish fails, the workflow should fail and leave enough logs to diagnose whether a retry is needed

Because submission is optional and manual-only, a Chrome Web Store failure is acceptable as a failed maintenance action rather than something that should affect normal tag release automation.

## Documentation Changes

Update `docs/release-checklist.md` to describe two release paths:

1. Standard tag-driven GitHub release
2. Manual `Release Extension` execution with the Chrome Web Store submission checkbox enabled

Document the required GitHub secrets and note that the Chrome Web Store dashboard fields must already be configured for the item.

## Security Notes

- Never store client secrets or refresh tokens in the repository
- Avoid echoing raw token responses into logs
- Keep submission gated behind manual dispatch to prevent accidental store submissions from routine tag pushes

## Out of Scope

- Microsoft Edge Add-ons automation
- Automatic dashboard metadata updates such as screenshots, listing copy, or category
- Automatic submission on tag push
- Retry orchestration across separate workflows

## Acceptance Criteria

1. Maintainer can manually run `Release Extension` for an existing tag and leave Chrome Web Store submission disabled
2. Maintainer can manually run `Release Extension`, enable Chrome Web Store submission, and have the built zip uploaded and published for review
3. Tag pushes still create GitHub releases without triggering Chrome Web Store submission
4. Release documentation reflects the new optional submission flow and required secrets
