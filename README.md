# GitHub Mentions+ Extension

A browser extension that enhances GitHub's native @mention autocomplete by adding custom user suggestions from configurable endpoints.

## Problem Statement

GitHub's native @mention autocomplete only suggests users that the current user has access to through their organization membership. This creates limitations for:

- Contractors working in client repositories who can't @mention team members they work with
- External collaborators who need to reference internal team members
- Cross-team projects where team members aren't in the same GitHub organization

## Solution

GitHub Mentions+ augments GitHub's native @mention autocomplete by:

1. **Listening** for @ mentions in GitHub textareas and contenteditable elements
2. **Fetching** custom user suggestions from a user-configurable endpoint
3. **Displaying** suggestions in a native-looking overlay that complements GitHub's existing UI
4. **Caching** results to minimize API calls and improve performance

## Installation

### For Development

1. Clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. Click the extension icon to configure your endpoint
6. Start using @mentions on GitHub!
7. The extension will be installed and active on GitHub pages

### For Users

1. Download the extension from the browser store (coming soon)
2. Install the extension
3. Click the extension icon to configure your endpoint
4. Start using @mentions on GitHub!

## Configuration

### Endpoint Setup

Your endpoint must return a JSON array of user objects in this format:

```json
[
  {
    "username": "john-doe",
    "name": "John Doe",
    "avatar": "https://example.com/avatar.jpg"
  },
  {
    "username": "jane-smith", 
    "name": "Jane Smith"
  }
]
```

**Required fields:**
- `username` - GitHub username (string)
- `name` - Display name (string)

**Optional fields:**
- `avatar` - Avatar URL (string). If not provided, will be fetched from GitHub

### Settings Configuration

1. Click the extension icon in your browser toolbar
2. Enter your endpoint URL in the "Endpoint URL" field
3. Click "Test Endpoint" to verify connectivity
4. Click "Save Settings" to apply the configuration
5. Use "Refresh User List" to manually update the cache

## Features

- Seamless integration with GitHub's native UI
- Positioned below GitHub's overlay when visible
- Fetches missing avatars from GitHub's public API
- Respects GitHub's rate limits (60 requests/hour)

**Note**: This extension is not affiliated with GitHub Inc. It's a third-party tool designed to enhance the GitHub experience. 