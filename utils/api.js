/**
 * API utilities for GitHub Mentions+ extension
 * Handles endpoint fetching and GitHub API integration
 */

// Make utilities available globally
window.GitHubMentionsAPI = {};

/**
 * @typedef {Object} UserData
 * @property {string} username - GitHub username
 * @property {string} name - Display name
 * @property {string} [avatar] - Avatar URL (optional)
 */

/**
 * @typedef {Object} GitHubUser
 * @property {string} login - GitHub username
 * @property {string} avatar_url - Avatar URL
 */

const REQUEST_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 2;
const GITHUB_API_BASE = 'https://api.github.com';

// Rate limiting for GitHub API
let githubApiRequests = 0;
let githubApiResetTime = 0;

/**
 * Make a fetch request with timeout and retry logic
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<any>} Function result
 */
async function retryWithBackoff(fn, maxRetries = MAX_RETRIES) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid
 */
function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch user data from custom endpoint
 * @param {string} endpointUrl - Endpoint URL
 * @returns {Promise<UserData[]>} User data array
 */
window.GitHubMentionsAPI.fetchUsersFromEndpoint = async function(endpointUrl) {
  if (!endpointUrl || !isValidUrl(endpointUrl)) {
    throw new Error('Invalid endpoint URL');
  }

  return retryWithBackoff(async () => {
    const response = await fetchWithTimeout(endpointUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Endpoint request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Validate response structure
    if (!Array.isArray(data)) {
      throw new Error('Endpoint must return a JSON array');
    }

    // Validate each user object
    const validUsers = data.filter(user => 
      typeof user === 'object' &&
      user !== null &&
      typeof user.username === 'string' &&
      typeof user.name === 'string' &&
      (user.avatar === undefined || typeof user.avatar === 'string')
    );

    if (validUsers.length === 0) {
      throw new Error('No valid user data found in endpoint response');
    }

    return validUsers;
  });
};

/**
 * Check GitHub API rate limit status
 * @returns {Promise<boolean>} True if rate limit allows requests
 */
async function checkGitHubRateLimit() {
  const now = Date.now();
  
  // Reset counter if we're past the reset time
  if (now > githubApiResetTime) {
    githubApiRequests = 0;
    githubApiResetTime = now + (60 * 60 * 1000); // 1 hour from now
  }
  
  // GitHub public API allows 60 requests per hour for unauthenticated requests
  return githubApiRequests < 60;
}

/**
 * Increment GitHub API request counter
 */
function incrementGitHubApiCounter() {
  githubApiRequests++;
}

/**
 * Fetch user avatar from GitHub API
 * @param {string} username - GitHub username
 * @returns {Promise<string|null>} Avatar URL or null if failed
 */
window.GitHubMentionsAPI.fetchGitHubAvatar = async function(username) {
  if (!username || typeof username !== 'string') {
    return null;
  }

  try {
    // Check rate limit
    if (!(await checkGitHubRateLimit())) {
      return null; // Rate limit exceeded
    }

    const response = await fetchWithTimeout(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Mentions-Extension'
      }
    });

    incrementGitHubApiCounter();

    if (response.status === 403) {
      return null; // Rate limit exceeded
    }

    if (response.status === 404) {
      return null; // User not found
    }

    if (!response.ok) {
      return null; // Other error
    }

    const data = await response.json();
    return data.avatar_url;
  } catch (error) {
    return null;
  }
};

/**
 * Enhance user data with GitHub avatars for users without avatars
 * @param {UserData[]} users - User data array
 * @returns {Promise<UserData[]>} Enhanced user data
 */
window.GitHubMentionsAPI.enhanceUsersWithAvatars = async function(users) {
  if (!Array.isArray(users)) {
    return users;
  }

  const enhancedUsers = [...users];
  
  // Process users without avatars in parallel (with rate limiting)
  const avatarPromises = enhancedUsers.map(async (user, index) => {
    if (!user.avatar) {
      const avatar = await window.GitHubMentionsAPI.fetchGitHubAvatar(user.username);
      if (avatar) {
        enhancedUsers[index] = { ...user, avatar };
      }
    }
  });

  await Promise.all(avatarPromises);
  return enhancedUsers;
};

/**
 * Test endpoint connectivity
 * @param {string} endpointUrl - Endpoint URL to test
 * @returns {Promise<{success: boolean, message: string, userCount?: number}>} Test result
 */
window.GitHubMentionsAPI.testEndpoint = async function(endpointUrl) {
  try {
    const users = await window.GitHubMentionsAPI.fetchUsersFromEndpoint(endpointUrl);
    return {
      success: true,
      message: `Endpoint working! Found ${users.length} users.`,
      userCount: users.length
    };
  } catch (error) {
    return {
      success: false,
      message: `Endpoint test failed: ${error.message}`
    };
  }
}; 