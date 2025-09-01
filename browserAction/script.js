/**
 * GitHub Mentions+ Settings Popup Script
 * Handles settings management, endpoint testing, and direct JSON input
 */

// DOM elements
const dataSourceRadios = document.querySelectorAll('input[name="dataSource"]');
const endpointSection = document.getElementById('endpointSection');
const directJsonSection = document.getElementById('directJsonSection');
const endpointUrlInput = document.getElementById('endpointUrl');
const directJsonData = document.getElementById('directJsonData');
const testEndpointBtn = document.getElementById('testEndpoint');
const refreshUsersBtn = document.getElementById('refreshUsers');
const validateJsonBtn = document.getElementById('validateJson');
const loadDirectUsersBtn = document.getElementById('loadDirectUsers');
const saveSettingsBtn = document.getElementById('saveSettings');
const endpointStatus = document.getElementById('endpointStatus');
const extensionStatus = document.getElementById('extensionStatus');
const dataSourceStatus = document.getElementById('dataSourceStatus');
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
    
    // Show appropriate section based on current data source
    updateDataSourceSection();
    
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
    // Set data source radio button
    const dataSource = currentSettings.dataSource || 'endpoint';
    document.querySelector(`input[name="dataSource"][value="${dataSource}"]`).checked = true;
    
    // Set endpoint URL if exists
    if (currentSettings.endpointUrl) {
      endpointUrlInput.value = currentSettings.endpointUrl;
    }
    
    // Set direct JSON data if exists
    if (currentSettings.directJsonData) {
      directJsonData.value = currentSettings.directJsonData;
    }
    
    // Update section visibility
    updateDataSourceSection();
  }
}

/**
 * Update data source section visibility
 */
function updateDataSourceSection() {
  const selectedDataSource = document.querySelector('input[name="dataSource"]:checked').value;
  
  if (selectedDataSource === 'endpoint') {
    endpointSection.classList.remove('hidden');
    directJsonSection.classList.add('hidden');
  } else {
    endpointSection.classList.add('hidden');
    directJsonSection.classList.remove('hidden');
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const selectedDataSource = document.querySelector('input[name="dataSource"]:checked').value;
    
    const newSettings = {
      dataSource: selectedDataSource,
      endpointUrl: selectedDataSource === 'endpoint' ? endpointUrlInput.value.trim() : '',
      directJsonData: selectedDataSource === 'direct' ? directJsonData.value.trim() : '',
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
 * Validate JSON input
 */
function validateJson() {
  const jsonText = directJsonData.value.trim();
  if (!jsonText) {
    showError('Please enter JSON data');
    return;
  }

  try {
    const data = JSON.parse(jsonText);
    
    if (!Array.isArray(data)) {
      showError('JSON must be an array');
      return;
    }
    
    if (data.length === 0) {
      showError('JSON array cannot be empty');
      return;
    }
    
    // Validate each user object
    const validUsers = data.filter(user => 
      user && typeof user === 'object' &&
      typeof user.username === 'string' &&
      typeof user.name === 'string' &&
      (user.avatar === undefined || typeof user.avatar === 'string')
    );
    
    if (validUsers.length !== data.length) {
      showError(`Found ${data.length - validUsers.length} invalid user objects`);
      return;
    }
    
    if (validUsers.length === 0) {
      showError('No valid user data found');
      return;
    }
    
    showSuccess(`JSON validation successful! Found ${validUsers.length} valid users.`);
    
  } catch (error) {
    showError(`Invalid JSON format: ${error.message}`);
  }
}

/**
 * Load users from direct JSON input
 */
async function loadDirectUsers() {
  const jsonText = directJsonData.value.trim();
  if (!jsonText) {
    showError('Please enter JSON data');
    return;
  }

  loadDirectUsersBtn.disabled = true;
  loadDirectUsersBtn.textContent = 'Loading...';

  try {
    const data = JSON.parse(jsonText);
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid JSON data');
    }
    
    // Validate user data structure
    const validUsers = data.filter(user => 
      user && typeof user === 'object' &&
      typeof user.username === 'string' &&
      typeof user.name === 'string' &&
      (user.avatar === undefined || typeof user.avatar === 'string')
    );
    
    if (validUsers.length === 0) {
      throw new Error('No valid user data found');
    }
    
    // Cache the users
    const success = await window.GitHubMentionsStorage.setCachedUsers(validUsers);
    if (success) {
      showSuccess(`Successfully loaded ${validUsers.length} users from JSON input`);
      updateStatus();
    } else {
      showError('Failed to cache user data - storage error');
    }
    
  } catch (error) {
    console.error('Load direct users error:', error);
    showError(`Failed to load users: ${error.message}`);
  } finally {
    loadDirectUsersBtn.disabled = false;
    loadDirectUsersBtn.textContent = 'Load Users';
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
      
      // Update data source status
      const dataSource = settings.dataSource || 'endpoint';
      dataSourceStatus.textContent = dataSource === 'endpoint' ? 'HTTP Endpoint' : 'Direct JSON';
      dataSourceStatus.className = 'status-value success';
      
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
  // Data source radio buttons
  dataSourceRadios.forEach(radio => {
    radio.addEventListener('change', updateDataSourceSection);
  });
  
  // Save settings button
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // Test endpoint button
  testEndpointBtn.addEventListener('click', testEndpoint);
  
  // Refresh users button
  refreshUsersBtn.addEventListener('click', refreshUsers);
  
  // Validate JSON button
  validateJsonBtn.addEventListener('click', validateJson);
  
  // Load direct users button
  loadDirectUsersBtn.addEventListener('click', loadDirectUsers);
  
  // Enter key on inputs
  endpointUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveSettings();
    }
  });
  
  directJsonData.addEventListener('keypress', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      loadDirectUsers();
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
