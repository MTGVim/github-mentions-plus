# GitHub Mentions+ Extension
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-0-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

A browser extension that enhances GitHub's native @mention autocomplete by adding custom user suggestions from configurable endpoints or direct JSON input.

## Problem Statement

GitHub's native @mention autocomplete only suggests users that the current user has access to through their organization membership. This creates limitations for:

- Contractors working in client repositories who can't @mention team members they work with
- External collaborators who need to reference internal team members
- Cross-team projects where team members aren't in the same GitHub organization

## Solution

GitHub Mentions+ augments GitHub's native @mention autocomplete by:

1. **Listening** for @ mentions in GitHub textareas and contenteditable elements
2. **Fetching** custom user suggestions from a user-configurable endpoint OR direct JSON input
3. **Displaying** suggestions in a native-looking overlay that complements GitHub's existing UI
4. **Caching** results to minimize API calls and improve performance

## Installation

### For Development

1. Clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory
5. Click the extension icon to configure your data source
6. Start using @mentions on GitHub!
7. The extension will be installed and active on GitHub pages

### For Users

1. Download the extension from the browser store (coming soon)
2. Install the extension
3. Click the extension icon to configure your data source
4. Start using @mentions on GitHub!

## Configuration

### Data Source Options

The extension supports two ways to provide user data:

#### Option 1: HTTP Endpoint
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

#### Option 2: Direct JSON Input
Enter your user data directly in the extension settings:

1. Select "Direct JSON Input" as your data source
2. Paste your JSON data in the text area
3. Click "Validate JSON" to check format
4. Click "Load Users" to cache the data

### Settings Configuration

1. Click the extension icon in your browser toolbar
2. Choose your preferred data source (HTTP Endpoint or Direct JSON Input)
3. Configure your chosen data source:
   - **HTTP Endpoint**: Enter URL and test connectivity
   - **Direct JSON**: Paste JSON data and validate
4. Click "Save Settings" to apply the configuration
5. Use "Refresh User List" or "Load Users" to update the cache

## Features

- **Dual Data Sources**: Support for both HTTP endpoints and direct JSON input
- Seamless integration with GitHub's native UI
- Positioned below GitHub's overlay when visible
- Fetches missing avatars from GitHub's public API
- Respects GitHub's rate limits (60 requests/hour)
- Real-time JSON validation for direct input
- Automatic data source switching

**Note**: This extension is not affiliated with GitHub Inc. It's a third-party tool designed to enhance the GitHub experience. 

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/narashin"><img src="https://avatars.githubusercontent.com/u/16604401?v=4?s=100" width="100px;" alt="nara"/><br /><sub><b>nara</b></sub></a><br /><a href="https://github.com/MTGVim/github-mentions-plus/commits?author=narashin" title="Code">💻</a></td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td align="center" size="13px" colspan="7">
        <img src="https://raw.githubusercontent.com/all-contributors/all-contributors-cli/1b8533af435da9854653492b1327a23a4dbd0a10/assets/logo-small.svg">
          <a href="https://all-contributors.js.org/docs/en/bot/usage">Add your contributions</a>
        </img>
      </td>
    </tr>
  </tfoot>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->