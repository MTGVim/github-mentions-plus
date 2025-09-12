/**
 * DOM utilities for GitHub Mentions+ extension
 * Handles overlay positioning and manipulation
 */

// Make utilities available globally
window.GitHubMentionsDOM = {};

/**
 * @typedef {Object} UserData
 * @property {string} username - GitHub username
 * @property {string} name - Display name
 * @property {string} [avatar] - Avatar URL (optional)
 */

/**
 * @typedef {Object} Position
 * @property {number} left - Left position in pixels
 * @property {number} top - Top position in pixels
 */

let overlay = null;
let lastGoodPosition = null;
let selectedIndex = 0;
let overlayItems = [];

/**
 * Create the mentions overlay element
 * @returns {HTMLElement} The created overlay element
 */
window.GitHubMentionsDOM.createOverlay = function() {
  if (overlay) {
    return overlay;
  }

  // Detect dark mode
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Set colors based on theme
  const colors = isDarkMode ? {
    background: '#04080d',
    username: '#e3eaf1',
    name: '#848b94',
    border: '#353c44'
  } : {
    background: '#ffffff',
    username: '#212529',
    name: '#4f5863',
    border: '#dde1e5'
  };

  overlay = document.createElement('div');
  overlay.id = 'github-mentions-overlay';
  overlay.style.cssText = `
    position: absolute;
    z-index: 9999;
    color: ${colors.username};
    background: ${colors.background};
    border: 1px solid ${colors.border};
    border-radius: 0.75rem;
    box-shadow: 0 8px 24px rgba(140, 149, 159, 0.2);
    padding: 0.5rem 0;
    font-size: 13px;
    min-width: 192px;
    display: none;
    font-family: -apple-system, "system-ui", "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
    line-height: 1.4;
    overflow: hidden;
    box-sizing: content-box;
  `;

  document.body.appendChild(overlay);
  return overlay;
};

/**
 * Update overlay position
 * @param {HTMLElement} activeInput - The active input element
 */
window.GitHubMentionsDOM.updateOverlayPosition = function(activeInput) {
  if (!overlay) {
    return;
  }

  const githubOverlay = document.querySelector('[class*="AutocompleteSuggestions-module__Overlay"]');
  if (githubOverlay) {
    // Reset both overlays to auto width to measure natural content width
    overlay.style.width = 'auto';
    githubOverlay.style.width = 'auto';
    
    // Force a reflow to ensure the auto width is applied before measuring
    overlay.offsetHeight;
    githubOverlay.offsetHeight;
    
    const rect = githubOverlay.getBoundingClientRect();
    const ourRect = overlay.getBoundingClientRect();
    
    // Calculate the optimal width - use the larger of the two overlays
    const optimalWidth = Math.max(rect.width, ourRect.width);
    
    overlay.style.left = `${rect.left - 1}px`;
    overlay.style.top = `${rect.bottom + window.scrollY}px`; // show below GitHub's while it's visible, account for scroll
    overlay.style.width = `${optimalWidth}px`; // use the larger width
    overlay.style.maxWidth = 'none'; // clear any max-width constraint
    
    // Adjust border radius to make overlays look connected
    overlay.style.borderRadius = '0 0 0.75rem 0.75rem'; // no top corners when below GitHub
    githubOverlay.style.borderRadius = '0.75rem 0.75rem 0 0'; // no bottom corners when above ours
    
    // Also set GitHub's overlay to the same width for consistency
    githubOverlay.style.width = `${optimalWidth}px`;
    
    lastGoodPosition = {
      left: rect.left,
      top: rect.top + window.scrollY, // cache the top for future use, account for scroll
      width: optimalWidth, // cache the optimal width for future use
    };
  } else if (lastGoodPosition) {
    overlay.style.left = `${lastGoodPosition.left}px`;
    overlay.style.top = `${lastGoodPosition.top}px`; // use top instead of bottom when GitHub is gone
    overlay.style.width = 'auto'; // use auto width when GitHub is not visible
    overlay.style.borderRadius = '0.75rem'; // restore full rounded corners when alone
  } else if (activeInput) {
    // fallback (only used if no GitHub overlay has ever been shown)
    const rect = activeInput.getBoundingClientRect();
    overlay.style.left = `${rect.left + 10}px`;
    overlay.style.top = `${rect.bottom + window.scrollY + 6}px`; // account for scroll
    overlay.style.width = 'auto'; // auto width for fallback
    overlay.style.borderRadius = '0.75rem'; // full rounded corners for fallback
  }
};

/**
 * Show the overlay with user suggestions
 * @param {UserData[]} users - Array of user data to display
 * @param {Function} onSelect - Callback when a user is selected
 * @param {HTMLElement} activeInput - The active input element for positioning
 */
window.GitHubMentionsDOM.showOverlay = function(users, onSelect, activeInput) {
  if (!overlay || !Array.isArray(users) || users.length === 0) {
    return;
  }

  // Detect dark mode for text colors
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const colors = isDarkMode ? {
    username: '#e3eaf1',
    name: '#848b94'
  } : {
    username: '#212529',
    name: '#4f5863'
  };

  // Clear existing content and reset selection
  overlay.innerHTML = '';
  selectedIndex = 0;
  overlayItems = [];

  // Create suggestion items
  users.slice(0, 4).forEach((user, index) => {
    const item = document.createElement('div');
    item.className = 'github-mentions-item';
    const isSelected = index === selectedIndex;
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const selectedBgColor = isDarkMode ? '#1f6feb' : '#0969da';
    const defaultBgColor = 'transparent';
    
    item.style.cssText = `
      display: flex;
      align-items: center;
      padding: 0.5rem;
      cursor: pointer;
      transition: background-color 0.1s ease;
      background-color: ${isSelected ? selectedBgColor : defaultBgColor};
      border-radius: 0.375rem;
      margin: 0 0.5rem;
      list-style: none;
    `;
    
    // Store user data and index for keyboard navigation
    item.userData = user;
    item.itemIndex = index;
    overlayItems.push(item);

    // Add hover effects
    item.addEventListener('mouseenter', () => {
      selectedIndex = index;
      updateSelection();
    });
    
    item.addEventListener('mouseleave', () => {
      // Keep selection when mouse leaves
    });

    // Add mousedown handler
    item.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (typeof onSelect === 'function') {
        // Small delay to let GitHub's React event processing finish
        setTimeout(() => onSelect(user), 50);
      }
      
      window.GitHubMentionsDOM.hideOverlay();
    });

    // Create text content
    const textContent = document.createElement('div');
    textContent.style.cssText = `
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      flex: 1;
    `;

    // Check if this is a command (has isCommand property)
    const isCommand = user.isCommand;

    if (!isCommand) {
      // Create avatar element only for user mentions, not commands
      const avatar = document.createElement('img');
      avatar.src = user.avatar || `https://github.com/${user.username}.png`;
      avatar.alt = `${user.name}'s avatar`;
      avatar.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 50%;
        box-shadow: 0 0 0 1px #d0d7de;
        display: inline-block;
        line-height: 1;
        overflow: hidden;
        vertical-align: middle;
        margin-right: 0.5rem;
        flex-shrink: 0;
      `;

      // Handle avatar load errors
      avatar.addEventListener('error', () => {
        avatar.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMTAiIGZpbGw9IiNkNmQ3ZGUiLz4KPHBhdGggZD0iTTEwIDEwQzEyLjc2MTQgMTAgMTUgNy43NjE0MiAxNSA1QzE1IDIuMjM4NTggMTIuNzYxNCAwIDEwIDBDNy4yMzg1OCAwIDUgMi4yMzg1OCA1IDVDNSA3Ljc2MTQyIDcuMjM4NTggMTAgMTAgMTBaIiBmaWxsPSIjNjc2MDZhIi8+CjxwYXRoIGQ9Ik0xMCAxMkM2LjY4NiAxMiA0IDE0LjY4NiA0IDE4VjIwSDE2VjE4QzE2IDE0LjY4NiAxMy4zMTQgMTIgMTAgMTJaIiBmaWxsPSIjNjc2MDZhIi8+Cjwvc3ZnPgo=';
      });

      item.appendChild(avatar);
    } else {
      // For commands, show emoji if available, otherwise show command icon
      const commandIcon = document.createElement('span');
      
      if (user.emoji) {
        // Show emoji
        commandIcon.textContent = user.emoji;
        commandIcon.style.cssText = `
          width: 16px;
          height: 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          margin-right: 0.5rem;
          flex-shrink: 0;
        `;
      } else {
        // Show default command icon
        commandIcon.textContent = '!';
        commandIcon.style.cssText = `
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background-color: ${colors.username};
          color: ${isDarkMode ? '#04080d' : '#ffffff'};
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: bold;
          margin-right: 0.5rem;
          flex-shrink: 0;
        `;
      }

      item.appendChild(commandIcon);
    }

    const username = document.createElement('span');
    username.textContent = isCommand ? `!${user.username}` : user.username;
    username.style.cssText = `
      color: ${colors.username};
      font-family: -apple-system, "system-ui", "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      font-size: 14px;
      font-weight: 600;
      line-height: 1.2;
    `;

    const name = document.createElement('span');
    name.textContent = user.name;
    name.style.cssText = `
      color: ${colors.name};
      font-family: -apple-system, "system-ui", "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      font-size: 12px;
      font-weight: 400;
      line-height: 1.2;
    `;

    textContent.appendChild(username);
    textContent.appendChild(name);

    item.appendChild(textContent);
    overlay.appendChild(item);
  });

  // Make overlay visible first so we can measure its width
  overlay.style.display = 'block';
  
  // Update position after showing
  if (typeof window.GitHubMentionsDOM.updateOverlayPosition === 'function') {
    window.GitHubMentionsDOM.updateOverlayPosition(activeInput);
  }
};

/**
 * Update the selection highlighting in the overlay
 */
function updateSelection() {
  const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const selectedBgColor = isDarkMode ? '#1f6feb' : '#0969da';
  const defaultBgColor = 'transparent';
  
  overlayItems.forEach((item, index) => {
    if (index === selectedIndex) {
      item.style.backgroundColor = selectedBgColor;
    } else {
      item.style.backgroundColor = defaultBgColor;
    }
  });
}

/**
 * Hide the overlay
 */
window.GitHubMentionsDOM.hideOverlay = function() {
  if (overlay) {
    overlay.style.display = 'none';
    selectedIndex = 0;
    overlayItems = [];
    
    // Restore GitHub's overlay border radius to fully rounded when our overlay is hidden
    const githubOverlay = document.querySelector('[class*="AutocompleteSuggestions-module__Overlay"]');
    if (githubOverlay) {
      githubOverlay.style.borderRadius = '0.75rem';
    }
  }
};

/**
 * Check if overlay is visible
 * @returns {boolean} True if overlay is visible
 */
window.GitHubMentionsDOM.isOverlayVisible = function() {
  return overlay && overlay.style.display !== 'none';
};

/**
 * Remove the overlay from DOM
 */
window.GitHubMentionsDOM.removeOverlay = function() {
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
    overlay = null;
    lastGoodPosition = null;
  }
};

/**
 * Get the current overlay element
 * @returns {HTMLElement|null} The overlay element or null
 */
window.GitHubMentionsDOM.getOverlay = function() {
  return overlay;
};

/**
 * Handle keyboard navigation in the overlay
 * @param {KeyboardEvent} e - Keyboard event
 * @returns {boolean} True if event was handled
 */
window.GitHubMentionsDOM.handleKeyNavigation = function(e) {
  if (!overlay || overlay.style.display === 'none' || overlayItems.length === 0) {
    return false;
  }
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % overlayItems.length;
      updateSelection();
      return true;
      
    case 'ArrowUp':
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + overlayItems.length) % overlayItems.length;
      updateSelection();
      return true;
      
    case 'Enter':
      e.preventDefault();
      if (overlayItems[selectedIndex] && overlayItems[selectedIndex].userData) {
        return overlayItems[selectedIndex].userData;
      }
      return false;
      
    case 'Escape':
      window.GitHubMentionsDOM.hideOverlay();
      return true;
      
    default:
      return false;
  }
};

/**
 * Get the currently selected item
 * @returns {Object|null} Selected user data or null
 */
window.GitHubMentionsDOM.getSelectedItem = function() {
  if (overlayItems.length > 0 && selectedIndex >= 0 && selectedIndex < overlayItems.length) {
    return overlayItems[selectedIndex].userData;
  }
  return null;
};

/**
 * Get usernames from GitHub's current suggestions to avoid duplicates
 * @returns {Array<string>} Array of usernames currently shown by GitHub
 */
window.GitHubMentionsDOM.getGitHubSuggestions = function() {
  try {
    const githubOverlay = document.querySelector('[class*="AutocompleteSuggestions-module__Overlay"]');
    if (!githubOverlay || githubOverlay.style.display === 'none') {
      return [];
    }

    // Look for suggestion items in GitHub's overlay
    const suggestionItems = githubOverlay.querySelectorAll('[role="option"]');
    
    const usernames = [];
    suggestionItems.forEach(item => {
      // Try to extract username from various possible text patterns
      const text = item.textContent || '';
      
      // Look for @username pattern
      const atMatch = text.match(/@([a-zA-Z0-9-_]+)/);
      if (atMatch) {
        usernames.push(atMatch[1]);
        return;
      }
      
      // Look for username without @ (might be in a different element)
      const usernameMatch = text.match(/([a-zA-Z0-9-_]+)/);
      if (usernameMatch) {
        usernames.push(usernameMatch[1]);
        return;
      }
      
      // Try to find username in child elements
      const usernameElement = item.querySelector('[class*="username"], [class*="login"], strong, b');
      if (usernameElement) {
        const usernameText = usernameElement.textContent || '';
        const cleanUsername = usernameText.replace(/@/, '').trim();
        if (cleanUsername) {
          usernames.push(cleanUsername);
        }
      }
    });
    
    return usernames;
  } catch (error) {
    return [];
  }
}; 