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
  if (!overlay || !activeInput) {
    return;
  }

  const rect = activeInput.getBoundingClientRect();
  overlay.style.left = `${rect.left}px`;
  overlay.style.top = `${rect.bottom + 6 + activeInput.scrollTop}px`;
  overlay.style.width = `${rect.width}px`;
  overlay.style.borderRadius = '0.75rem';
  overlay.style.position = 'fixed';
  overlay.style.margin = "0";
  
  if (!overlay.hasAttribute("popover")) {
    overlay.setAttribute("popover", "manual");
    if (activeInput.id) {
      overlay.setAttribute("popover-target", activeInput.id);
    }
  }
  
  if (!overlay.matches(':popover-open')) {
    try {
      overlay.showPopover();
    } catch (e) {
      // Ignore if already shown
    }
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
  currentSelectedIndex = 0; 
  overlayItems = [];
  lastKeyNavTime = 0;

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
      transition: all 0.15s ease;
      background-color: ${isSelected ? selectedBgColor : defaultBgColor};
      color: ${isSelected ? '#ffffff' : ''};
      font-weight: ${isSelected ? '600' : 'normal'};
      border-radius: 0.375rem;
      margin: 0 0.5rem;
      list-style: none;
      box-shadow: ${isSelected ? '0 0 0 1px rgba(255,255,255,0.1)' : 'none'};
    `;
    
    // Store user data and index for keyboard navigation
    item.userData = user;
    item.itemIndex = index;
    overlayItems.push(item);

    // Add hover effects for mouse navigation
    item.addEventListener('mouseenter', () => {
      if (selectedIndex !== index) {
        selectedIndex = index;
        updateSelection();
      }
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
  
  if (selectedIndex < 0 || selectedIndex >= overlayItems.length) {
    selectedIndex = 0;
    currentSelectedIndex = 0;
  }
  
  // Current selected index 
  currentSelectedIndex = selectedIndex;
  
  // Scroll selected item into view
  if (overlayItems[selectedIndex]) {
    try {
      const selectedItem = overlayItems[selectedIndex];

      selectedItem.scrollIntoView({ behavior: 'auto', block: 'nearest' });
    } catch (e) {
      console.error('Error during scrollIntoView:', e);
    }
  }
  
  overlayItems.forEach((item, index) => {
    try {
      if (index === selectedIndex) {
        item.style.backgroundColor = selectedBgColor;
        item.style.color = '#ffffff';
        item.style.fontWeight = '600';
        item.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.1)';
      } else {
        item.style.backgroundColor = defaultBgColor;
        item.style.color = '';
        item.style.fontWeight = '';
        item.style.boxShadow = 'none';
      }
    } catch (e) {
      console.error('Error styling overlay item:', e);
    }
  });
}

/**
 * Hide the overlay
 */
window.GitHubMentionsDOM.hideOverlay = function() {
  if (overlay) {
    if (overlay.matches(':popover-open')) {
      try {
        overlay.hidePopover();
      } catch (e) {
        // Ignore if already closed
      }
    }
    overlay.style.display = 'none';
    selectedIndex = 0;
    overlayItems = [];
  }
};

/**
 * Check if overlay is visible
 * @returns {boolean} True if overlay is visible
 */
window.GitHubMentionsDOM.isOverlayVisible = function() {
  return overlay && (overlay.style.display !== 'none' || overlay.matches(':popover-open'));
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

let lastKeyNavTime = 0;
const KEY_NAV_DELAY = 200;
let currentSelectedIndex = 0;

window.GitHubMentionsDOM.handleKeyNavigation = function(e) {
  if (!overlay || !window.GitHubMentionsDOM.isOverlayVisible() || overlayItems.length === 0) {
    return false;
  }
  
  // Validate selectedIndex
  if (selectedIndex !== currentSelectedIndex && overlayItems.length > 0) {
    // if valid range, sync selectedIndex
    if (currentSelectedIndex >= 0 && currentSelectedIndex < overlayItems.length) {
      selectedIndex = currentSelectedIndex;
      updateSelection();
    }
  }
  
  const now = Date.now();
  if (now - lastKeyNavTime < KEY_NAV_DELAY && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault();
    return true; // Ignore rapid key presses
  }
  
  let handled = false;
  
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      e.stopPropagation();
      if (overlayItems.length > 1) { 
        const newIndex = (selectedIndex + 1) % overlayItems.length;
        if (newIndex !== selectedIndex) {
          selectedIndex = newIndex;
          currentSelectedIndex = selectedIndex;
          updateSelection();
          lastKeyNavTime = now;
        }
      }
      return true;
      
    case 'ArrowUp':
      e.preventDefault();
      e.stopPropagation();
      if (overlayItems.length > 1) {
        const newIndex = (selectedIndex - 1 + overlayItems.length) % overlayItems.length;
        if (newIndex !== selectedIndex) {
          selectedIndex = newIndex;
          currentSelectedIndex = selectedIndex;
          updateSelection();
          lastKeyNavTime = now;
        }
      }
      return true;
      
    case 'Enter':
      e.preventDefault();
      e.stopPropagation();
      if (overlayItems[selectedIndex] && overlayItems[selectedIndex].userData) {
        return overlayItems[selectedIndex].userData;
      }
      handled = false;
      break;
      
    case 'Escape':
      e.preventDefault();
      e.stopPropagation();
      window.GitHubMentionsDOM.hideOverlay();
      handled = true;
      break;
      
    default:
      handled = false;
  }
  
  return handled;
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
