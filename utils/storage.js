/**
 * Storage utilities for GitHub Mentions+ extension
 * Handles cache management and settings persistence
 */

// Make utilities available globally
window.GitHubMentionsStorage = {};

/**
 * @typedef {Object} UserData
 * @property {string} username - GitHub username
 * @property {string} name - Display name
 * @property {string} [avatar] - Avatar URL (optional)
 */

/**
 * @typedef {Object} CacheEntry
 * @property {UserData[]} data - User data array
 * @property {number} timestamp - Cache timestamp
 */

/**
 * @typedef {Object} Settings
 * @property {string} endpointUrl - Custom endpoint URL
 * @property {boolean} enabled - Whether extension is enabled
 */

const STORAGE_KEYS = {
  USER_CACHE: 'githubMentions_userCache',
  SETTINGS: 'githubMentions_settings',
  CACHE_TIMESTAMP: 'githubMentions_cacheTimestamp'
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_CACHE_SIZE = 1024 * 1024; // 1MB limit

/**
 * Get browser storage API (chrome.storage or browser.storage)
 * @returns {Object} Storage API object
 */
function getStorageAPI() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    return chrome.storage.local;
  }
  if (typeof browser !== 'undefined' && browser.storage) {
    return browser.storage.local;
  }
  throw new Error('Storage API not available');
}

/**
 * Validate user data structure
 * @param {any} data - Data to validate
 * @returns {boolean} True if valid
 */
function validateUserData(data) {
  if (!Array.isArray(data)) return false;
  
  return data.every(user => 
    typeof user === 'object' &&
    user !== null &&
    typeof user.username === 'string' &&
    typeof user.name === 'string' &&
    (user.avatar === undefined || typeof user.avatar === 'string')
  );
}

/**
 * Get cached user data
 * @returns {Promise<UserData[]>} Cached user data or empty array
 */
window.GitHubMentionsStorage.getCachedUsers = async function() {
  try {
    const result = await chrome.storage.local.get('githubMentions_userCache');
    const cachedData = result.githubMentions_userCache;
    
    if (!cachedData || !Array.isArray(cachedData)) {
      return [];
    }

    // Validate user data structure
    const validUsers = cachedData.filter(user => 
      user && typeof user === 'object' && 
      typeof user.username === 'string' && 
      typeof user.name === 'string'
    );

    if (validUsers.length !== cachedData.length) {
      return [];
    }

    return validUsers;
  } catch (error) {
    return [];
  }
};

/**
 * Set cached user data
 * @param {UserData[]} users - User data to cache
 * @returns {Promise<boolean>} Success status
 */
window.GitHubMentionsStorage.setCachedUsers = async function(users) {
  try {
    if (!Array.isArray(users)) {
      return false;
    }

    // Validate user data structure
    const validUsers = users.filter(user => 
      user && typeof user === 'object' && 
      typeof user.username === 'string' && 
      typeof user.name === 'string'
    );

    if (validUsers.length !== users.length) {
      return false;
    }

    // Check storage size limit (1MB)
    const dataSize = JSON.stringify(validUsers).length;
    if (dataSize > 1024 * 1024) {
      return false;
    }

    await chrome.storage.local.set({
      'githubMentions_userCache': validUsers,
      'githubMentions_cacheTimestamp': Date.now()
    });

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Clear user cache
 * @returns {Promise<void>}
 */
window.GitHubMentionsStorage.clearCache = async function() {
  try {
    await chrome.storage.local.remove([
      'githubMentions_userCache',
      'githubMentions_cacheTimestamp'
    ]);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get extension settings
 * @returns {Promise<Settings>} Settings object
 */
window.GitHubMentionsStorage.getSettings = async function() {
  try {
    const result = await chrome.storage.local.get('githubMentions_settings');
    return result.githubMentions_settings || {
      endpointUrl: '',
      enabled: true
    };
  } catch (error) {
    return {
      endpointUrl: '',
      enabled: true
    };
  }
};

/**
 * Set extension settings
 * @param {Settings} settings - Settings to save
 * @returns {Promise<boolean>} Success status
 */
window.GitHubMentionsStorage.setSettings = async function(settings) {
  try {
    await chrome.storage.local.set({
      'githubMentions_settings': {
        endpointUrl: settings.endpointUrl || '',
        enabled: settings.enabled !== false
      }
    });
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Check if cache is expired
 * @returns {Promise<boolean>} True if cache is expired or doesn't exist
 */
window.GitHubMentionsStorage.isCacheExpired = async function() {
  try {
    const result = await chrome.storage.local.get('githubMentions_cacheTimestamp');
    const timestamp = result.githubMentions_cacheTimestamp;
    
    if (!timestamp) {
      return true;
    }

    const cacheAge = Date.now() - timestamp;
    return cacheAge > CACHE_DURATION;
  } catch (error) {
    return true;
  }
}; 