/**
 * Background script for GitHub Mentions+ extension
 * Handles CORS-restricted API calls like LGTM random image fetching
 */

const REQUEST_TIMEOUT = 10000; // 10 seconds

/**
 * Make a fetch request with timeout
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
async function fetchRandomLGTM() {
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
    console.error('[GitHub Mentions+] Background: Error fetching LGTM image:', error);
    return {
      success: false,
      message: `Failed to fetch LGTM image: ${error.message}`
    };
  }
}

/**
 * Handle messages from content script
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  if (message.action === 'fetchRandomLGTM') {
    // Handle async response
    fetchRandomLGTM().then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({
        success: false,
        message: error.message
      });
    });
    
    // Return true to indicate we'll send a response asynchronously
    return true;
  }
  
  // Handle other message types if needed
  return false;
});
