/**
 * GitHub Mentions+ Settings Popup Script
 * Handles settings management and endpoint testing
 */

// DOM elements
const endpointUrlInput = document.getElementById('endpointUrl');
const testEndpointBtn = document.getElementById('testEndpoint');
const refreshUsersBtn = document.getElementById('refreshUsers');
const saveSettingsBtn = document.getElementById('saveSettings');
const endpointStatus = document.getElementById('endpointStatus');
const extensionStatus = document.getElementById('extensionStatus');
const cachedUsersCount = document.getElementById('cachedUsersCount');
const cacheStatus = document.getElementById('cacheStatus');

// State
let currentSettings = null;

/**
 * Initialize the popup
 */
async function initialize() {
  try {
    // Load current settings
    await loadSettings();
    
    // Update status display
    await updateStatus();
    
    // Add event listeners
    setupEventListeners();
    
  } catch (error) {
    // Silently handle initialization errors
  }
}

/**
 * Load current settings from storage
 */
async function loadSettings() {
  try {
    // Use storage utilities directly instead of messaging
    const settings = await window.GitHubMentionsStorage.getSettings();
    currentSettings = settings;
    updateUI();
  } catch (error) {
    // Silently handle loading errors
  }
}

/**
 * Update UI with current settings
 */
function updateUI() {
  if (currentSettings) {
    endpointUrlInput.value = currentSettings.endpointUrl || '';
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const newSettings = {
      endpointUrl: endpointUrlInput.value.trim(),
      enabled: true
    };
    
    // Use storage utilities directly
    const success = await window.GitHubMentionsStorage.setSettings(newSettings);
    
    if (success) {
      currentSettings = newSettings;
      showSuccess('Settings saved successfully');
      
      // Update status after saving
      setTimeout(updateStatus, 500);
    } else {
      showError('Failed to save settings');
    }
    
  } catch (error) {
    showError('Failed to save settings');
  }
}

/**
 * Test the configured endpoint
 */
async function testEndpoint() {
  const url = endpointUrlInput.value.trim();
  if (!url) {
    showError('Please enter an endpoint URL');
    return;
  }

  testEndpointBtn.disabled = true;
  testEndpointBtn.textContent = 'Testing...';

  try {
    console.log('Testing endpoint:', url);
    
    // Test the endpoint directly
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors' // Enable CORS
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      console.error('HTTP Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (Array.isArray(data) && data.length > 0) {
      showSuccess(`Endpoint test successful! Found ${data.length} users.`);
    } else if (Array.isArray(data)) {
      showError('Endpoint returned an empty array - no users found');
    } else {
      showError('Endpoint returned invalid data format - expected JSON array');
    }
  } catch (error) {
    console.error('Endpoint test error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Endpoint test failed: ';
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      errorMessage += 'Network error - check if the URL is accessible and CORS is enabled';
    } else if (error.name === 'SyntaxError') {
      errorMessage += 'Invalid JSON response from endpoint';
    } else if (error.message.includes('CORS')) {
      errorMessage += 'CORS error - the endpoint must allow cross-origin requests';
    } else {
      errorMessage += error.message;
    }
    
    showError(errorMessage);
  } finally {
    testEndpointBtn.disabled = false;
    testEndpointBtn.textContent = 'Test Endpoint';
  }
}

/**
 * Refresh user list from endpoint
 */
async function refreshUsers() {
  const url = endpointUrlInput.value.trim();
  if (!url) {
    showError('Please enter an endpoint URL');
    return;
  }

  refreshUsersBtn.disabled = true;
  refreshUsersBtn.textContent = 'Refreshing...';

  try {
    console.log('Refreshing users from endpoint:', url);
    
    // Fetch and cache users directly
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      mode: 'cors' // Enable CORS
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No error details available');
      console.error('HTTP Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}. Response: ${errorText}`);
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (Array.isArray(data) && data.length > 0) {
      const success = await window.GitHubMentionsStorage.setCachedUsers(data);
      if (success) {
        showSuccess(`Successfully cached ${data.length} users`);
        updateStatus();
      } else {
        showError('Failed to cache user data - storage error');
      }
    } else if (Array.isArray(data)) {
      showError('Endpoint returned an empty array - no users to cache');
    } else {
      showError('Endpoint returned invalid data format - expected JSON array');
    }
  } catch (error) {
    console.error('Refresh users error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to refresh users: ';
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      errorMessage += 'Network error - check if the URL is accessible and CORS is enabled';
    } else if (error.name === 'SyntaxError') {
      errorMessage += 'Invalid JSON response from endpoint';
    } else if (error.message.includes('CORS')) {
      errorMessage += 'CORS error - the endpoint must allow cross-origin requests';
    } else {
      errorMessage += error.message;
    }
    
    showError(errorMessage);
  } finally {
    refreshUsersBtn.disabled = false;
    refreshUsersBtn.textContent = 'Refresh List';
  }
}

/**
 * Update status display
 */
async function updateStatus() {
  try {
    // Check if extension is active by testing storage access
    const settings = await window.GitHubMentionsStorage.getSettings();
    if (settings) {
      extensionStatus.textContent = 'Active';
      extensionStatus.className = 'status-value success';
      
      // Update cache status
      const cachedUsers = await window.GitHubMentionsStorage.getCachedUsers();
      if (cachedUsers && cachedUsers.length > 0) {
        cachedUsersCount.textContent = cachedUsers.length.toString();
        cacheStatus.textContent = 'Cached';
      } else {
        cachedUsersCount.textContent = '0';
        cacheStatus.textContent = 'No cache';
      }
    } else {
      extensionStatus.textContent = 'Inactive';
      extensionStatus.className = 'status-value error';
    }
  } catch (error) {
    // Silently handle status update errors
  }
}

/**
 * Show success message
 */
function showSuccess(message) {
  endpointStatus.className = 'status-indicator success';
  endpointStatus.querySelector('.status-text').textContent = message;
  endpointStatus.classList.remove('hidden');
  
  // Hide after 3 seconds
  setTimeout(() => {
    endpointStatus.classList.add('hidden');
  }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
  endpointStatus.className = 'status-indicator error';
  endpointStatus.querySelector('.status-text').textContent = message;
  endpointStatus.classList.remove('hidden');
  
  // Hide after 5 seconds
  setTimeout(() => {
    endpointStatus.classList.add('hidden');
  }, 5000);
}

/**
 * Show loading message
 */
function showLoading(message) {
  endpointStatus.className = 'status-indicator loading';
  endpointStatus.querySelector('.status-text').textContent = message;
  endpointStatus.classList.remove('hidden');
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Save settings button
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // Test endpoint button
  testEndpointBtn.addEventListener('click', testEndpoint);
  
  // Refresh users button
  refreshUsersBtn.addEventListener('click', refreshUsers);
  
  // Enter key on input
  endpointUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveSettings();
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initialize();
  } catch (error) {
    // Silently handle initialization errors
  }
});
