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
const commandsGrid = document.getElementById('commandsGrid');
const addCommandBtn = document.getElementById('addCommand');
const commandCountDisplay = document.getElementById('commandCount');
const userTableBody = document.getElementById('userTableBody');
const addUserRowBtn = document.getElementById('addUserRow');
const loadGuiUsersBtn = document.getElementById('loadGuiUsers');

// Modal elements
const commandModal = document.getElementById('commandModal');
const modalTitle = document.getElementById('modalTitle');
const modalClose = document.getElementById('modalClose');
const modalCancel = document.getElementById('modalCancel');
const modalSave = document.getElementById('modalSave');
const commandNameInput = document.getElementById('commandName');
const commandContentTextarea = document.getElementById('commandContent');
const commandEmojiInput = document.getElementById('commandEmoji');
const emojiPickerBtn = document.getElementById('emojiPickerBtn');
const emojiPicker = document.getElementById('emojiPicker');
const emojiGrid = document.getElementById('emojiGrid');
const clearEmojiBtn = document.getElementById('clearEmoji');

// Modal state
let editingCommand = null;

// Emoji data
const emojiData = {
  recent: ['⏰', '📝', '⚡', '🚀', '✅', '❌', '🔥', '💡'],
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏'],
  objects: ['📝', '📋', '📊', '📈', '📉', '🗂', '📅', '📆', '🗓', '📇', '🗃', '🗄', '📑', '📒', '📓', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📛', '🔖', '🏷', '📄', '📃', '📋', '📊'],
  symbols: ['⚡', '🔥', '💡', '⭐', '🌟', '✨', '💫', '⚠️', '🚨', '🔔', '🔕', '📢', '📣', '💬', '💭', '🗯', '♨️', '💥', '💢', '💦', '💨', '🕳', '💣', '💤', '👁', '🗨', '🗯', '💭', '🔮', '💈', '⚗️', '🔬']
};

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
    
    // Load and display commands
    updateCommandsGrid();
    
    // Load user table data if GUI tab is selected
    const selectedDataSource = document.querySelector('input[name="dataSource"]:checked')?.value;
    if (selectedDataSource === 'gui') {
      loadUserTableData();
    }
    
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
    updateSettingUI();
  } catch (error) {
    // Silently handle loading errors
  }
}

/**
 * Update UI with current settings
 */
function updateSettingUI() {
  if (currentSettings) {
    // Set data source radio button
    const dataSource = currentSettings.dataSource || 'endpoint';
    document.querySelector(`input[name="dataSource"][value="${dataSource}"]`).checked = true;
    
    // Set endpoint URL if exists
    if (currentSettings.endpointUrl) {
      endpointUrlInput.value = currentSettings.endpointUrl;
    }
    
    // Set direct JSON data if exists
    // 기본값을 빈 배열 []로 설정
    if (currentSettings.directJsonData) {
      directJsonData.value = currentSettings.directJsonData;
    } else {
      directJsonData.value = '[]';
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
  const show = (el) => el.classList.remove('hidden');
  const hide = (el) => el.classList.add('hidden');

  if (selectedDataSource === 'endpoint') {
    show(endpointSection);
    hide(directJsonSection);
    hide(guiJsonSection);
  } else if (selectedDataSource === 'direct') {
    hide(endpointSection);
    show(directJsonSection);
    hide(guiJsonSection);
  } else if (selectedDataSource === 'gui') {
    hide(endpointSection);
    hide(directJsonSection);
    show(guiJsonSection);
    // Load table data when switching to GUI tab
    loadUserTableData();
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const selectedDataSource = document.querySelector('input[name="dataSource"]:checked').value;
    
    // If GUI mode, sync table to JSON first
    if (selectedDataSource === 'gui') {
      syncTableToJson();
    }
    
    const newSettings = {
      dataSource: selectedDataSource,
      endpointUrl: selectedDataSource === 'endpoint' ? endpointUrlInput.value.trim() : '',
      directJsonData: (selectedDataSource === 'direct' || selectedDataSource === 'gui') ? directJsonData.value.trim() : '',
      enabled: true,
      customCommands: currentSettings?.customCommands || {}
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
  if (!jsonText || jsonText === '[]') {
    showError('Please enter JSON data');
    return;
  }

  loadDirectUsersBtn.disabled = true;
  loadDirectUsersBtn.textContent = 'Loading...';

  try {
    const data = JSON.parse(jsonText);
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid JSON data - array is empty');
    }
    
    // Validate user data structure
    const validUsers = data.filter(user => 
      user && typeof user === 'object' &&
      typeof user.username === 'string' &&
      (user.name === undefined || typeof user.name === 'string') &&
      (user.avatar === undefined || typeof user.avatar === 'string')
    );
    
    if (validUsers.length === 0) {
      throw new Error('No valid user data found');
    }
    
    // Cache the users
    const usersToCache = validUsers.map(user => ({
      username: user.username,
      name: user.name || user.username,
      avatar: user.avatar || ''
    }));
    
    const success = await window.GitHubMentionsStorage.setCachedUsers(usersToCache);
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
 * Load users from GUI table
 */
async function loadGuiUsers() {
  // Validate all rows first
  if (!validateAllRows()) {
    showError('Please fill in all required fields (username)');
    return;
  }
  
  // Sync table data to JSON
  syncTableToJson();
  
  const jsonText = directJsonData.value.trim();
  if (!jsonText) {
    showError('Please add at least one user');
    return;
  }

  loadGuiUsersBtn.disabled = true;
  loadGuiUsersBtn.textContent = 'Loading...';

  try {
    const data = JSON.parse(jsonText);
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid JSON data - please add at least one user with username');
    }
    
    // Validate user data structure (username is required)
    const validUsers = data.filter(user => 
      user && typeof user === 'object' &&
      typeof user.username === 'string' &&
      user.username.trim() !== ''
    );
    
    if (validUsers.length === 0) {
      throw new Error('No valid user data found - username is required');
    }
    
    // Cache the users (convert profile to avatar for compatibility)
    const usersToCache = validUsers.map(user => ({
      username: user.username,
      name: user.name || user.username,
      avatar: user.profile || user.avatar || ''
    }));
    
    const success = await window.GitHubMentionsStorage.setCachedUsers(usersToCache);
    if (success) {
      showSuccess(`Successfully loaded ${validUsers.length} users from table`);
      updateStatus();
    } else {
      showError('Failed to cache user data - storage error');
    }
    
  } catch (error) {
    console.error('Load GUI users error:', error);
    showError(`Failed to load users: ${error.message}`);
  } finally {
    loadGuiUsersBtn.disabled = false;
    loadGuiUsersBtn.textContent = 'Load Users';
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
  if (validateJsonBtn) {
    validateJsonBtn.addEventListener('click', validateJson);
  }
  
  // Load direct users button
  if (loadDirectUsersBtn) {
    loadDirectUsersBtn.addEventListener('click', loadDirectUsers);
  }
  
  // Load GUI users button
  if (loadGuiUsersBtn) {
    loadGuiUsersBtn.addEventListener('click', loadGuiUsers);
  }
  
  // Add user row button
  if (addUserRowBtn) {
    addUserRowBtn.addEventListener('click', () => addUserRow());
  }
  
  // Add command button
  if (addCommandBtn) {
    addCommandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      createNewCommand();
    });
  }
  
  // Modal event listeners
  if (modalClose) modalClose.addEventListener('click', closeCommandModal);
  if (modalCancel) modalCancel.addEventListener('click', closeCommandModal);
  if (modalSave) modalSave.addEventListener('click', saveCommand);
  
  // Command name validation on input
  if (commandNameInput) {
    commandNameInput.addEventListener('input', validateCommandNameInput);
    commandNameInput.addEventListener('blur', validateCommandNameInput);
  }
  
  // Emoji picker event listeners
  if (emojiPickerBtn) {
    emojiPickerBtn.addEventListener('click', toggleEmojiPicker);
  }
  
  if (commandEmojiInput) {
    commandEmojiInput.addEventListener('click', toggleEmojiPicker);
  }
  
  if (clearEmojiBtn) {
    clearEmojiBtn.addEventListener('click', clearEmoji);
  }
  
  // Emoji category buttons
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('emoji-category')) {
      switchEmojiCategory(e.target.dataset.category);
    } else if (e.target.classList.contains('emoji-item')) {
      selectEmoji(e.target.textContent);
    } else if (!emojiPicker.contains(e.target) && !emojiPickerBtn.contains(e.target) && !commandEmojiInput.contains(e.target)) {
      // Click outside emoji picker - close it
      hideEmojiPicker();
    }
  });
  
  // Close modal when clicking outside
  if (commandModal) {
    commandModal.addEventListener('click', (e) => {
      if (e.target === commandModal) {
        closeCommandModal();
      }
    });
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !commandModal.classList.contains('hidden')) {
      closeCommandModal();
    }
  });
  
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

/**
 * Update commands grid display
 */
function updateCommandsGrid() {
  const customCommands = currentSettings?.customCommands || {};
  
  commandsGrid.innerHTML = '';
  
  // Add built-in commands section
  const builtInSection = document.createElement('div');
  builtInSection.className = 'built-in-commands-section';
  builtInSection.innerHTML = `
    <h4 class="commands-section-title">Built-in Commands</h4>
    <div class="built-in-commands-grid"></div>
  `;
  commandsGrid.appendChild(builtInSection);
  
  const builtInGrid = builtInSection.querySelector('.built-in-commands-grid');
  
  // Add lgtmrand built-in command card
  createBuiltInCommandCard('lgtmrand', 'Insert a random LGTM GIF from GIPHY', builtInGrid);
  
  // Add custom commands section if there are any
  if (Object.keys(customCommands).length > 0) {
    const customSection = document.createElement('div');
    customSection.className = 'custom-commands-section';
    customSection.innerHTML = `
      <h4 class="commands-section-title">Custom Commands</h4>
      <div class="custom-commands-grid"></div>
    `;
    commandsGrid.appendChild(customSection);
    
    const customGrid = customSection.querySelector('.custom-commands-grid');
    
    // Add existing custom commands as cards
    Object.entries(customCommands).forEach(([name, content], index) => {
      createCommandCard(name, content, index + 1, customGrid);
    });
  } else {
    // Show empty state for custom commands
    const customSection = document.createElement('div');
    customSection.className = 'custom-commands-section';
    customSection.innerHTML = `
      <h4 class="commands-section-title">Custom Commands</h4>
      <div class="empty-state">
        <p>No custom commands yet. Click "Add New Command" to create your first one!</p>
      </div>
    `;
    commandsGrid.appendChild(customSection);
  }
  
  // Update counter
  updateCommandCounter();
}

/**
 * Create a built-in command card
 */
function createBuiltInCommandCard(name, description, container) {
  const card = document.createElement('div');
  card.className = 'command-card built-in-card';
  card.dataset.commandName = name;
  
  card.innerHTML = `
    <div class="built-in-badge">Built-in</div>
    <div class="command-name">!${name}</div>
    <div class="command-preview">${description}</div>
    <div class="command-actions">
      <span class="built-in-info">Cannot be edited or deleted</span>
    </div>
  `;
  
  container.appendChild(card);
}

/**
 * Create a command card
 */
function createCommandCard(name, content, number, container = null) {
  const card = document.createElement('div');
  card.className = 'command-card';
  card.dataset.commandName = name;
  
  const preview = content.length > 100 ? content.substring(0, 100) + '...' : content;
  
  // Get emoji from command data
  const customCommands = currentSettings?.customCommands || {};
  const commandData = customCommands[name];
  const emoji = (typeof commandData === 'object' && commandData.emoji) ? commandData.emoji : '';
  
  card.innerHTML = `
    <div class="command-number">${number}</div>
    <div class="command-header">
      ${emoji ? `<span class="command-emoji">${emoji}</span>` : ''}
      <div class="command-name">!${name}</div>
    </div>
    <div class="command-preview">${typeof commandData === 'object' ? commandData.content : content}</div>
    <div class="command-actions">
      <button class="btn btn-secondary btn-mini edit-command">Edit</button>
      <button class="btn btn-danger btn-mini delete-command">Delete</button>
    </div>
  `;
  
  // Add event listeners
  card.querySelector('.edit-command').addEventListener('click', () => editCommand(name));
  card.querySelector('.delete-command').addEventListener('click', () => deleteCommand(name));
  
  if (container) {
    container.appendChild(card);
  } else {
    commandsGrid.appendChild(card);
  }
}

/**
 * Create new command dialog
 */
function createNewCommand() {
  console.log('[GitHub Mentions+] createNewCommand called');
  
  // Ensure currentSettings exists
  if (!currentSettings) {
    currentSettings = {
      dataSource: 'endpoint',
      endpointUrl: '',
      directJsonData: '',
      enabled: true,
      customCommands: {}
    };
  }
  
  const commandCount = Object.keys(currentSettings?.customCommands || {}).length;
  if (commandCount >= 10) {
    showError('Maximum 10 commands allowed');
    return;
  }
  
  openCommandModal(null, '🚀 Ready for review!\n\nUpdated: ${timestamp}');
}

/**
 * Edit command dialog  
 */
function editCommand(name) {
  const customCommands = currentSettings?.customCommands || {};
  const commandData = customCommands[name];
  
  let content = '';
  let emoji = '';
  
  if (typeof commandData === 'object') {
    content = commandData.content || '';
    emoji = commandData.emoji || '';
  } else {
    // Legacy format - just a string
    content = commandData || '';
  }
  
  openCommandModal(name, content, emoji);
}

/**
 * Open command modal
 */
function openCommandModal(commandName = null, content = '', emoji = '') {
  editingCommand = commandName;
  
  if (commandName) {
    modalTitle.textContent = `Edit Command: !${commandName}`;
    commandNameInput.value = commandName;
    commandNameInput.disabled = true; // Don't allow renaming
  } else {
    modalTitle.textContent = 'Add New Command';
    commandNameInput.value = '';
    commandNameInput.disabled = false;
  }
  
  commandContentTextarea.value = content;
  commandEmojiInput.value = emoji;
  commandModal.classList.remove('hidden');
  
  // Hide emoji picker if it's open
  hideEmojiPicker();
  
  // Focus first input
  if (commandName) {
    commandContentTextarea.focus();
  } else {
    commandNameInput.focus();
  }
}

/**
 * Close command modal
 */
function closeCommandModal() {
  commandModal.classList.add('hidden');
  editingCommand = null;
  commandNameInput.value = '';
  commandContentTextarea.value = '';
  commandEmojiInput.value = '';
  
  // Hide emoji picker
  hideEmojiPicker();
  
  // Clear validation state
  commandNameInput.classList.remove('invalid');
  const validationMessage = document.getElementById('commandNameValidation');
  if (validationMessage) {
    validationMessage.textContent = '';
    validationMessage.className = 'validation-message';
  }
}

/**
 * Validate command name input in real-time
 */
function validateCommandNameInput() {
  const name = commandNameInput.value.trim();
  const validationMessage = document.getElementById('commandNameValidation') || createValidationMessage();
  
  // Clear previous validation state
  commandNameInput.classList.remove('invalid');
  validationMessage.textContent = '';
  validationMessage.className = 'validation-message';
  
  if (!name) {
    // Empty is neutral, not invalid
    return true;
  }
  
  // Check if name contains only allowed characters (letters, numbers, hyphens, underscores)
  const validPattern = /^[a-zA-Z0-9-_]+$/;
  
  if (!validPattern.test(name)) {
    commandNameInput.classList.add('invalid');
    validationMessage.textContent = 'Only letters, numbers, hyphens, and underscores are allowed';
    validationMessage.classList.add('error');
    return false;
  }
  
  // Check for duplicate (only if creating new)
  const customCommands = currentSettings?.customCommands || {};
  if (!editingCommand && customCommands[name]) {
    commandNameInput.classList.add('invalid');
    validationMessage.textContent = 'Command name already exists';
    validationMessage.classList.add('error');
    return false;
  }
  
  return true;
}

/**
 * Create validation message element
 */
function createValidationMessage() {
  const validationMessage = document.createElement('div');
  validationMessage.id = 'commandNameValidation';
  validationMessage.className = 'validation-message';
  
  // Insert after the command name input
  commandNameInput.parentNode.appendChild(validationMessage);
  
  return validationMessage;
}

/**
 * Save command from modal
 */
async function saveCommand() {
  const name = commandNameInput.value.trim();
  const content = commandContentTextarea.value.trim();
  const emoji = commandEmojiInput.value.trim();
  
  if (!name) {
    showError('Command name is required');
    commandNameInput.focus();
    return;
  }
  
  if (!content) {
    showError('Command content is required');
    commandContentTextarea.focus();
    return;
  }
  
  // Use the validation function to check if name is valid
  if (!validateCommandNameInput()) {
    commandNameInput.focus();
    return;
  }
  
  // Update settings
  if (!currentSettings.customCommands) {
    currentSettings.customCommands = {};
  }
  
  // Store command as object with content and emoji
  currentSettings.customCommands[name] = {
    content: content,
    emoji: emoji || null
  };
  
  
  // Close modal and refresh UI
  closeCommandModal();
  await saveSettingsAndRefresh();
}

/**
 * Delete command
 */
async function deleteCommand(name) {
  if (!confirm(`Delete command !${name}?`)) return;
  
  if (currentSettings?.customCommands) {
    delete currentSettings.customCommands[name];
    await saveSettingsAndRefresh();
  }
}

/**
 * Update command counter
 */
function updateCommandCounter() {
  const commandCount = Object.keys(currentSettings?.customCommands || {}).length;
  commandCountDisplay.textContent = `${commandCount}/10`;
  
  // Disable add button if at limit
  if (commandCount >= 10) {
    addCommandBtn.disabled = true;
    addCommandBtn.textContent = 'Maximum Reached';
  } else {
    addCommandBtn.disabled = false;
    addCommandBtn.textContent = '+ Add New Command';
  }
}

/**
 * Toggle emoji picker visibility
 */
function toggleEmojiPicker() {
  if (emojiPicker.classList.contains('hidden')) {
    showEmojiPicker();
  } else {
    hideEmojiPicker();
  }
}

/**
 * Show emoji picker
 */
function showEmojiPicker() {
  emojiPicker.classList.remove('hidden');
  // Initialize with recent emojis
  switchEmojiCategory('recent');
}

/**
 * Hide emoji picker
 */
function hideEmojiPicker() {
  emojiPicker.classList.add('hidden');
}

/**
 * Switch emoji category
 */
function switchEmojiCategory(category) {
  // Update active category button
  document.querySelectorAll('.emoji-category').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-category="${category}"]`).classList.add('active');
  
  // Update emoji grid
  const emojis = emojiData[category] || [];
  emojiGrid.innerHTML = '';
  
  emojis.forEach(emoji => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'emoji-item';
    button.textContent = emoji;
    emojiGrid.appendChild(button);
  });
}

/**
 * Select emoji
 */
function selectEmoji(emoji) {
  commandEmojiInput.value = emoji;
  hideEmojiPicker();
}

/**
 * Clear selected emoji
 */
function clearEmoji() {
  commandEmojiInput.value = '';
  hideEmojiPicker();
}

/**
 * Save settings and refresh UI
 */
async function saveSettingsAndRefresh() {
  await saveSettings();
  updateCommandsGrid();
  
  // Notify all GitHub tabs about the settings change
  try {
    const tabs = await chrome.tabs.query({url: '*://*.github.com/*'});
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SETTINGS_UPDATED',
        settings: currentSettings
      });
    }
  } catch (error) {
    // Silently handle notification errors
  }
}

/**
 * Load user table data from directJsonData
 */
function loadUserTableData() {
  // Only load if userTableBody exists (GUI tab)
  if (!userTableBody) return;
  
  // 이미 테이블에 row가 있으면 다시 로드하지 않음 (중복 방지)
  if (userTableBody.children.length > 0) return;
  
  try {
    const jsonText = directJsonData.value.trim();
    if (!jsonText || jsonText === '[]') {
      // Add one empty row by default
      addUserRow();
      return;
    }
    
    const users = JSON.parse(jsonText);
    if (Array.isArray(users) && users.length > 0) {
      // Clear existing rows
      userTableBody.innerHTML = '';
      
      // Add rows from data (username, name, profile 순서)
      users.forEach(user => {
        addUserRow(user.username || '', user.name || '', user.profile || '');
      });
    } else {
      // Add one empty row by default
      addUserRow();
    }
  } catch (error) {
    // If JSON is invalid, add one empty row
    addUserRow();
  }
}

/**
 * Add a new user row to the table
 */
function addUserRow(username = '', name = '', profile = '') {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>
      <input type="text" class="user-username" value="${escapeHtml(username)}" placeholder="john-doe" required />
    </td>
    <td>
      <input type="text" class="user-name" value="${escapeHtml(name)}" placeholder="John Doe" />
    </td>
    <td>
      <input type="text" class="user-profile" value="${escapeHtml(profile)}" placeholder="https://example.com" />
    </td>
    <td>
      <button class="btn btn-danger btn-mini delete-user-row">Delete</button>
    </td>
  `;
  
  // Add event listeners
  const deleteBtn = row.querySelector('.delete-user-row');
  deleteBtn.addEventListener('click', () => deleteUserRow(row));
  
  // Add input validation for username
  const usernameInput = row.querySelector('.user-username');
  usernameInput.addEventListener('input', () => validateUserRow(row));
  usernameInput.addEventListener('blur', () => validateUserRow(row));
  
  // Add input listeners to sync data to JSON
  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', syncTableToJson);
  });
  
  userTableBody.appendChild(row);
  
  // Sync data to JSON
  syncTableToJson();
}

/**
 * Delete a user row from the table
 */
function deleteUserRow(row) {
  row.remove();
  
  // If no rows left, add one empty row
  if (userTableBody.children.length === 0) {
    addUserRow();
  }
  
  // Sync data to JSON
  syncTableToJson();
}

/**
 * Validate a user row (username is required)
 */
function validateUserRow(row) {
  const usernameInput = row.querySelector('.user-username');
  const username = usernameInput.value.trim();
  
  if (!username) {
    usernameInput.classList.add('invalid');
    row.classList.add('error');
    return false;
  } else {
    usernameInput.classList.remove('invalid');
    row.classList.remove('error');
    return true;
  }
}

/**
 * Sync table data to directJsonData (as JSON)
 */
function syncTableToJson() {
  if (!userTableBody) return;
  
  const rows = userTableBody.querySelectorAll('tr');
  const users = [];
  
  rows.forEach(row => {
    const username = row.querySelector('.user-username').value.trim();
    const name = row.querySelector('.user-name').value.trim();
    const profile = row.querySelector('.user-profile').value.trim();
    
    // Only add rows with username (required field)
    if (username) {
      users.push({
        username: username,
        name: name || '',
        profile: profile || ''
      });
    }
  });
  
  // Update directJsonData value (기본값은 빈 배열)
  directJsonData.value = users.length > 0 ? JSON.stringify(users, null, 2) : '[]';
}

/**
 * Validate all rows in the table
 */
function validateAllRows() {
  const rows = userTableBody.querySelectorAll('tr');
  let allValid = true;
  
  rows.forEach(row => {
    if (!validateUserRow(row)) {
      allValid = false;
    }
  });
  
  return allValid;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initialize();
  } catch (error) {
    // Silently handle initialization errors
  }
});
