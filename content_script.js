/**
 * GitHub Mentions+ Extension - Main Content Script
 * Enhances GitHub's @mention autocomplete with custom user suggestions
 */

// State variables
let activeInput = null;
let mentionStartPos = null;
let isInitialized = false;
let settings = null;
let cachedUsers = [];

/**
 * Initialize the extension
 */
async function initialize() {
  if (isInitialized) return;
  
  try {
    // Check if utilities are available
    if (!window.GitHubMentionsStorage || !window.GitHubMentionsDOM) {
      return;
    }

    // Load settings
    settings = await window.GitHubMentionsStorage.getSettings();
    
    // Create overlay
    window.GitHubMentionsDOM.createOverlay();
    
    // Load cached users if available
    cachedUsers = await window.GitHubMentionsStorage.getCachedUsers();
    
    // If we have an endpoint and no cached users, try to load from endpoint
    if (settings?.endpointUrl && cachedUsers.length === 0) {
      await loadUsersFromEndpoint();
    }

    // Start scanning for inputs
    scanInputs();
    setInterval(scanInputs, 1000);

    isInitialized = true;
  } catch (error) {
    // Silently handle initialization errors
  }
}

/**
 * Load users from endpoint and cache them
 * @returns {Promise<boolean>} Success status
 */
async function loadUsersFromEndpoint() {
  if (!settings?.endpointUrl) {
    return false;
  }

  try {
    // Check if API utilities are available
    if (!window.GitHubMentionsAPI) {
      return false;
    }
    
    // Fetch users from endpoint
    const users = await window.GitHubMentionsAPI.fetchUsersFromEndpoint(settings.endpointUrl);
    
    // Enhance with GitHub avatars for users without avatars
    const enhancedUsers = await window.GitHubMentionsAPI.enhanceUsersWithAvatars(users);
    
    // Cache the enhanced users
    await window.GitHubMentionsStorage.setCachedUsers(enhancedUsers);
    cachedUsers = enhancedUsers;
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get users for suggestions (from cache, endpoint, or direct JSON)
 * @returns {Promise<Array>} Array of user data
 */
async function getUsersForSuggestions() {
  // Check if storage utilities are available
  if (!window.GitHubMentionsStorage) {
    return [];
  }
  
  // If we have cached users, use them
  if (cachedUsers.length > 0) {
    return cachedUsers;
  }
  
  // Get current settings to determine data source
  const currentSettings = await window.GitHubMentionsStorage.getSettings();
  if (!currentSettings) {
    return [];
  }
  
  // Handle direct JSON data source
  if (currentSettings.dataSource === 'direct' && currentSettings.directJsonData) {
    try {
      const directUsers = JSON.parse(currentSettings.directJsonData);
      if (Array.isArray(directUsers) && directUsers.length > 0) {
        // Validate and cache the direct users
        const validUsers = directUsers.filter(user => 
          user && typeof user === 'object' &&
          typeof user.username === 'string' &&
          typeof user.name === 'string' &&
          (user.avatar === undefined || typeof user.avatar === 'string')
        );
        
        if (validUsers.length > 0) {
          // Cache the valid users
          await window.GitHubMentionsStorage.setCachedUsers(validUsers);
          cachedUsers = validUsers;
          return validUsers;
        }
      }
    } catch (error) {
      console.error('Failed to parse direct JSON data:', error);
    }
  }
  
  // Handle HTTP endpoint data source
  if (currentSettings.dataSource === 'endpoint' && currentSettings.endpointUrl) {
    // If cache is expired and we have an endpoint, try to load fresh data
    if (await window.GitHubMentionsStorage.isCacheExpired()) {
      await loadUsersFromEndpoint();
      return cachedUsers;
    }
  }
  
  return [];
}

/**
 * Insert a mention into the active input
 * @param {string} username - Username to insert
 */
function insertMention(username) {
  if (!activeInput) return;

  try {
    const val = activeInput.value;
    const cursor = activeInput.selectionStart;
    const before = val.substring(0, mentionStartPos);
    const after = val.substring(cursor);
    const mentionText = `@${username} `;

    activeInput.value = before + mentionText + after;
    const newCursorPos = before.length + mentionText.length;
    
    // Set cursor position
    activeInput.focus();
    activeInput.setSelectionRange(newCursorPos, newCursorPos);

    // Dispatch input event to notify React of the change
    activeInput.dispatchEvent(new Event('input', { bubbles: true }));
  } catch (error) {
    // Silently handle insertion errors
  }
}

/**
 * Scan text for @ mention trigger
 * @param {string} text - Text to scan
 * @param {number} pos - Cursor position
 * @returns {string|null} Username query or null
 */
function scanForTrigger(text, pos) {
  try {
    const slice = text.substring(0, pos);
    const match = slice.match(/@([a-zA-Z0-9-_]*)$/);
    return match ? match[1] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Filter users based on query and exclude GitHub's current suggestions
 * @param {Array} users - User data array
 * @param {string} query - Search query
 * @returns {Array} Filtered users
 */
function filterUsers(users, query) {
  if (!Array.isArray(users) || users.length === 0) {
    return [];
  }

  // Get GitHub's current suggestions to avoid duplicates
  let githubUsernames = [];
  if (window.GitHubMentionsDOM && typeof window.GitHubMentionsDOM.getGitHubSuggestions === 'function') {
    githubUsernames = window.GitHubMentionsDOM.getGitHubSuggestions();
  }

  // Filter out users that GitHub is already suggesting
  const filteredUsers = users.filter(user => 
    !githubUsernames.some(githubUser => 
      githubUser.toLowerCase() === user.username.toLowerCase()
    )
  );

  if (filteredUsers.length === 0) {
    return [];
  }

  // Only show suggestions when user has typed something after @
  if (!query) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  const matchingUsers = filteredUsers.filter(user => 
    user.username.toLowerCase().includes(lowerQuery) ||
    user.name.toLowerCase().includes(lowerQuery)
  );

  // Calculate how many items we can show based on the 7-item total cap
  const githubCount = githubUsernames.length;
  const maxOurItems = Math.min(4, 7 - githubCount); // Respect both 4-item local cap and 7-item total cap
  
  return matchingUsers.slice(0, maxOurItems);
}

/**
 * Handle keyup events on input elements
 * @param {KeyboardEvent} e - Keyup event
 */
async function onKeyUp(e) {
  if (!activeInput || !settings?.enabled) {
    console.log('[GitHub Mentions+] Keyup ignored:', {
      hasActiveInput: !!activeInput,
      settingsEnabled: settings?.enabled,
      key: e.key
    });
    return;
  }

  // Only respond to alphanumeric characters, @ symbol, and backspace/delete
  const key = e.key;
  const isAlphanumeric = /^[a-zA-Z0-9-_]$/.test(key);
  const isAtSymbol = key === '@';
  const isBackspace = key === 'Backspace';
  const isDelete = key === 'Delete';
  const isEscape = key === 'Escape';
  
  // Ignore navigation keys, arrows, etc.
  if (!isAlphanumeric && !isAtSymbol && !isBackspace && !isDelete && !isEscape) {
    return;
  }

  console.log('[GitHub Mentions+] Keyup event:', {
    key: key,
    isAlphanumeric: isAlphanumeric,
    isAtSymbol: isAtSymbol
  });

  // If Escape was pressed, just hide overlay and don't process further
  if (isEscape) {
    if (window.GitHubMentionsDOM && typeof window.GitHubMentionsDOM.hideOverlay === 'function') {
      window.GitHubMentionsDOM.hideOverlay();
    }
    return;
  }

  try {
    const cursor = activeInput.selectionStart;
    const text = activeInput.value;
    const query = scanForTrigger(text, cursor);
    
    console.log('[GitHub Mentions+] Scan result:', {
      activeInput,
      cursor: cursor,
      text: text.substring(Math.max(0, cursor - 10), cursor),
      query: query
    });
  
    if (query !== null) {
      mentionStartPos = cursor - query.length - 1; // position of the @
    
      const users = await getUsersForSuggestions();
      const matches = filterUsers(users, query);
      
      console.log('[GitHub Mentions+] User suggestions:', {
        totalUsers: users.length,
        matches: matches.length,
        matches: matches.map(u => u.username)
      });
  
      if (matches.length > 0) {
        // Check if DOM utilities are available
        if (window.GitHubMentionsDOM && typeof window.GitHubMentionsDOM.showOverlay === 'function') {
          console.log('[GitHub Mentions+] Showing overlay with', matches.length, 'users');
          window.GitHubMentionsDOM.showOverlay(matches, (user) => insertMention(user.username), activeInput);
        }
        return;
      }
    }

    // Hide overlay if DOM utilities are available
    if (window.GitHubMentionsDOM && typeof window.GitHubMentionsDOM.hideOverlay === 'function') {
      window.GitHubMentionsDOM.hideOverlay();
    }
  } catch (error) {
    console.error('[GitHub Mentions+] Keyup processing error:', error);
    // Try to hide overlay even on error
    if (window.GitHubMentionsDOM && typeof window.GitHubMentionsDOM.hideOverlay === 'function') {
      window.GitHubMentionsDOM.hideOverlay();
    }
  }
}

/**
 * Handle input events on input elements
 * @param {Event} e - Input event
 */
function onInput(e) {
  if (!activeInput || !settings?.enabled) return;

  // Check if we're still in a valid @mention context
  const cursor = activeInput.selectionStart;
  const text = activeInput.value;
  const query = scanForTrigger(text, cursor);

  // If we're not in a valid @mention context anymore, hide the overlay
  if (query === null) {
    if (window.GitHubMentionsDOM && typeof window.GitHubMentionsDOM.hideOverlay === 'function') {
      window.GitHubMentionsDOM.hideOverlay();
    }
  }
}

/**
 * Activate an input element for mentions
 * @param {HTMLElement} input - Input element to activate
 */
function activateInput(input) {
  if (!input || input.dataset.mentionEnhanced) return;

  try {
    activeInput = input;
    input.dataset.mentionEnhanced = 'true';
    
    // Add event listeners
    input.addEventListener('keyup', onKeyUp);
    input.addEventListener('input', onInput);
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (window.GitHubMentionsDOM && typeof window.GitHubMentionsDOM.hideOverlay === 'function') {
          window.GitHubMentionsDOM.hideOverlay();
        }
      }, 100);
    });
  } catch (error) {
    // Silently handle activation errors
  }
}

/**
 * Scan page for input elements that need mention functionality
 */
function scanInputs() {
  try {
    const inputs = document.querySelectorAll('textarea, [contenteditable="true"]');
    inputs.forEach(activateInput);
  } catch (error) {
    // Silently handle scanning errors
  }
}

/**
 * Handle page visibility changes
 */
function handleVisibilityChange() {
  if (document.hidden) {
    if (window.GitHubMentionsDOM && typeof window.GitHubMentionsDOM.hideOverlay === 'function') {
      window.GitHubMentionsDOM.hideOverlay();
    }
  }
}

/**
 * Handle window resize
 */
function handleResize() {
  if (activeInput && window.GitHubMentionsDOM && typeof window.GitHubMentionsDOM.isOverlayVisible === 'function') {
    if (window.GitHubMentionsDOM.isOverlayVisible()) {
      if (typeof window.GitHubMentionsDOM.updateOverlayPosition === 'function') {
        window.GitHubMentionsDOM.updateOverlayPosition(activeInput);
      }
    }
  }
}

/**
 * Cleanup function
 */
function cleanup() {
  try {
    // Extra defensive check - ensure window exists
    if (typeof window !== 'undefined' && window.GitHubMentionsDOM) {
      // Check if the object and function exist
      if (typeof window.GitHubMentionsDOM.removeOverlay === 'function') {
        try {
          window.GitHubMentionsDOM.removeOverlay();
        } catch (overlayError) {
          // Silently handle overlay removal errors
        }
      }
    }
    
    // Fallback: manually remove any overlay elements we might have created
    try {
      const overlay = document.getElementById('github-mentions-overlay');
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    } catch (fallbackError) {
      // Silently handle fallback removal errors
    }
    
    // Reset state variables
    activeInput = null;
    mentionStartPos = null;
    isInitialized = false;
  } catch (error) {
    // Silently handle cleanup errors
  }
}

/**
 * Handle messages from popup
 * @param {Object} message - Message object
 * @param {Object} sender - Sender information
 * @param {Function} sendResponse - Response function
 */
async function handleMessage(message, sender, sendResponse) {
  try {
    // Check if utilities are available
    if (!window.GitHubMentionsAPI || !window.GitHubMentionsStorage) {
      sendResponse({ success: false, message: 'Extension utilities not available' });
      return;
    }
    
    switch (message.action) {
      case 'testEndpoint':
        const testResult = await window.GitHubMentionsAPI.testEndpoint(message.endpointUrl);
        sendResponse(testResult);
        break;
        
      case 'refreshUsers':
        // Get current settings to determine data source
        const currentSettings = await window.GitHubMentionsStorage.getSettings();
        
        if (currentSettings?.dataSource === 'direct' && currentSettings?.directJsonData) {
          // Handle direct JSON refresh
          try {
            const directUsers = JSON.parse(currentSettings.directJsonData);
            if (Array.isArray(directUsers) && directUsers.length > 0) {
              const validUsers = directUsers.filter(user => 
                user && typeof user === 'object' &&
                typeof user.username === 'string' &&
                typeof user.name === 'string' &&
                (user.avatar === undefined || typeof user.avatar === 'string')
              );
              
              if (validUsers.length > 0) {
                await window.GitHubMentionsStorage.setCachedUsers(validUsers);
                cachedUsers = validUsers;
                sendResponse({
                  success: true,
                  message: `Successfully loaded ${validUsers.length} users from direct JSON`,
                  userCount: validUsers.length
                });
              } else {
                sendResponse({
                  success: false,
                  message: 'No valid user data found in direct JSON'
                });
              }
            } else {
              sendResponse({
                success: false,
                message: 'Direct JSON data is invalid or empty'
              });
            }
          } catch (error) {
            sendResponse({
              success: false,
              message: `Failed to parse direct JSON: ${error.message}`
            });
          }
        } else if (currentSettings?.dataSource === 'endpoint' && currentSettings?.endpointUrl) {
          // Handle endpoint refresh (existing logic)
          settings = { ...settings, endpointUrl: currentSettings.endpointUrl };
          await window.GitHubMentionsStorage.setSettings(settings);
          
          const success = await loadUsersFromEndpoint();
          if (success) {
            sendResponse({
              success: true,
              message: `Successfully loaded ${cachedUsers.length} users`,
              userCount: cachedUsers.length
            });
          } else {
            sendResponse({
              success: false,
              message: 'Failed to load users from endpoint'
            });
          }
        } else {
          sendResponse({
            success: false,
            message: 'No valid data source configured'
          });
        }
        break;
        
      default:
        sendResponse({ success: false, message: 'Unknown action' });
    }
  } catch (error) {
    sendResponse({ success: false, message: error.message });
  }
}

/**
 * Handle clicks outside the overlay
 * @param {MouseEvent} e - Click event
 */
function handleClickOutside(e) {
  if (!window.GitHubMentionsDOM || typeof window.GitHubMentionsDOM.isOverlayVisible !== 'function') {
    return;
  }

  // Only handle if overlay is visible
  if (!window.GitHubMentionsDOM.isOverlayVisible()) {
    return;
  }

  // Check if click is outside our overlay
  const overlay = window.GitHubMentionsDOM.getOverlay();
  if (overlay && !overlay.contains(e.target)) {
    window.GitHubMentionsDOM.hideOverlay();
  }
}

/**
 * Handle escape key press
 * @param {KeyboardEvent} e - Keydown event
 */
function handleEscapeKey(e) {
  if (e.key === 'Escape') {
    if (window.GitHubMentionsDOM && typeof window.GitHubMentionsDOM.hideOverlay === 'function') {
      window.GitHubMentionsDOM.hideOverlay();
    }
  }
}

// Event listeners
document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('resize', handleResize);
document.addEventListener('click', handleClickOutside);
document.addEventListener('keydown', handleEscapeKey);

// Message listener for popup communication
chrome.runtime.onMessage.addListener(handleMessage);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// Cleanup on page unload - with extra safety
window.addEventListener('beforeunload', () => {
  // Only cleanup if we've actually initialized
  if (isInitialized) {
    cleanup();
  }
});

// Also cleanup on page hide for extra safety
window.addEventListener('pagehide', () => {
  if (isInitialized) {
    cleanup();
  }
});

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initialize,
    loadUsersFromEndpoint,
    insertMention,
    scanForTrigger,
    filterUsers
  };
}
  