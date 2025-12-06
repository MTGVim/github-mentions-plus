/**
 * API utilities for GitHub Mentions+ extension
 */

// Make utilities available globally
window.GitHubMentionsAPI = {};

const REQUEST_TIMEOUT = 10000; // 10 seconds

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
 * Fetch random LGTM image from LGTM Reloaded API
 * @returns {Promise<{success: boolean, imageUrl?: string, message?: string}>} LGTM result
 */
window.GitHubMentionsAPI.fetchRandomLGTM = async function() {
  try {
    const response = await fetchWithTimeout('https://us-central1-lgtm-reloaded.cloudfunctions.net/lgtm', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`LGTM API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data && data.imageUrl) {
      return {
        success: true,
        imageUrl: data.imageUrl
      };
    } else {
      throw new Error('Invalid response format from LGTM API');
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to fetch LGTM image: ${error.message}`
    };
  }
};
