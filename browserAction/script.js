/**
 * GitHub Mentions+ Settings Popup Script
 * Handles settings management and direct JSON input
 */

// DOM elements
const dataSourceRadios = document.querySelectorAll('input[name="dataSource"]');
const directJsonSection = document.getElementById('directJsonSection');
const guiJsonSection = document.getElementById('guiJsonSection');
const directJsonData = document.getElementById('directJsonData');
const validateJsonBtn = document.getElementById('validateJson');
const saveSettingsBtn = document.getElementById('saveSettings');
const extensionStatus = document.getElementById('extensionStatus');
const dataSourceStatus = document.getElementById('dataSourceStatus');
const cachedUsersCount = document.getElementById('cachedUsersCount');
const cacheStatus = document.getElementById('cacheStatus');
const commandsGrid = document.getElementById('commandsGrid');
const addCommandBtn = document.getElementById('addCommand');
const commandCountDisplay = document.getElementById('commandCount');
const userTableBody = document.getElementById('userTableBody');
const addUserRowBtn = document.getElementById('addUserRow');
const interactionRulesStatus = document.getElementById('interactionRulesStatus');
const interactionDefaultsCard = document.getElementById('interactionDefaultsCard');
const interactionRulesList = document.getElementById('interactionRulesList');
const addInteractionRuleBtn = document.getElementById('addInteractionRule');
const exportSettingsBtn = document.getElementById('exportSettings');
const importSettingsBtn = document.getElementById('importSettings');
const importSettingsFileInput = document.getElementById('importSettingsFile');

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
const interactionRuleModal = document.getElementById('interactionRuleModal');
const interactionRuleModalTitle = document.getElementById('interactionRuleModalTitle');
const interactionRuleModalClose = document.getElementById('interactionRuleModalClose');
const interactionRuleModalCancel = document.getElementById('interactionRuleModalCancel');
const interactionRuleModalSave = document.getElementById('interactionRuleModalSave');
const interactionRulePathPrefixInput = document.getElementById('interactionRulePathPrefix');
const interactionRuleEnterEnabledInput = document.getElementById('interactionRuleEnterEnabled');
const interactionRuleClickEnabledInput = document.getElementById('interactionRuleClickEnabled');

// Modal state
let editingCommand = null;
let editingInteractionRuleId = null;

// Emoji data
const emojiData = {
  recent: ['⏰', '📝', '⚡', '🚀', '✅', '❌', '🔥', '💡'],
  smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏'],
  objects: ['📝', '📋', '📊', '📈', '📉', '🗂', '📅', '📆', '🗓', '📇', '🗃', '🗄', '📑', '📒', '📓', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📛', '🔖', '🏷', '📄', '📃', '📋', '📊'],
  symbols: ['⚡', '🔥', '💡', '⭐', '🌟', '✨', '💫', '⚠️', '🚨', '🔔', '🔕', '📢', '📣', '💬', '💭', '🗯', '♨️', '💥', '💢', '💦', '💨', '🕳', '💣', '💤', '👁', '🗨', '🗯', '💭', '🔮', '💈', '⚗️', '🔬']
};

// State
let currentSettings = null;
let interactionConfig = null;
let interactionContextAvailable = false;
let interactionCurrentPath = '/';
const DEFAULT_INTERACTION_CONFIG = {
  version: 1,
  defaultModes: {
    enterEnabled: true,
    clickEnabled: true
  },
  rules: []
};

/**
 * Initialize the popup
 */
async function initialize() {
  try {
    // Load current settings
    await loadSettings();
    
    // Update status display
    await updateStatus();

    // Load interaction rules from active GitHub tab localStorage
    await loadInteractionConfig();
    
    // Add event listeners
    setupEventListeners();
    
    // Show appropriate section based on current data source
    updateDataSourceSection();
    
    // Load and display commands
    updateCommandsGrid();
    renderInteractionRules();
    
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

function createDefaultInteractionConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_INTERACTION_CONFIG));
}

function normalizePathPrefix(pathPrefix) {
  if (typeof pathPrefix !== 'string') {
    return '/';
  }

  const trimmed = pathPrefix.trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }

  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeadingSlash.replace(/\/+$/, '') || '/';
}

function sanitizeInteractionRule(rule) {
  if (!rule || typeof rule !== 'object') {
    return null;
  }

  const pathPrefix = normalizePathPrefix(rule.pathPrefix);
  return {
    id: typeof rule.id === 'string' && rule.id.trim() ? rule.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    pathPrefix,
    enterEnabled: rule.enterEnabled !== false,
    clickEnabled: rule.clickEnabled !== false,
    updatedAt: typeof rule.updatedAt === 'number' ? rule.updatedAt : Date.now()
  };
}

function sanitizeInteractionConfig(config) {
  const source = config && typeof config === 'object' ? config : {};
  return {
    version: 1,
    defaultModes: {
      enterEnabled: source.defaultModes?.enterEnabled !== false,
      clickEnabled: source.defaultModes?.clickEnabled !== false
    },
    rules: Array.isArray(source.rules)
      ? source.rules.map(sanitizeInteractionRule).filter(Boolean)
      : []
  };
}

function sanitizeSettingsPayload(settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  return {
    dataSource: source.dataSource === 'direct' ? 'direct' : 'gui',
    directJsonData: typeof source.directJsonData === 'string' ? source.directJsonData : '[]',
    enabled: source.enabled !== false,
    customCommands: source.customCommands && typeof source.customCommands === 'object' ? source.customCommands : {}
  };
}

async function getActiveGitHubTab() {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true,
    url: '*://*.github.com/*'
  });

  return tabs[0] || null;
}

async function sendMessageToActiveGitHubTab(message) {
  const tab = await getActiveGitHubTab();
  if (!tab?.id) {
    throw new Error('Open a GitHub tab to manage path rules.');
  }

  return chrome.tabs.sendMessage(tab.id, message);
}

async function loadInteractionConfig() {
  try {
    const response = await sendMessageToActiveGitHubTab({ type: 'GMP_GET_INTERACTION_CONFIG' });
    if (!response?.success) {
      throw new Error(response?.message || 'Failed to load interaction rules');
    }

    interactionConfig = sanitizeInteractionConfig(response.config);
    interactionContextAvailable = true;
    interactionCurrentPath = response.currentPath || '/';
    setInteractionStatus(`Using localStorage from active GitHub tab. Current path: ${interactionCurrentPath}`, 'success');
  } catch (error) {
    interactionConfig = createDefaultInteractionConfig();
    interactionContextAvailable = false;
    interactionCurrentPath = '/';
    setInteractionStatus(error.message, 'error');
  }
}

async function saveInteractionConfig() {
  const configToSave = sanitizeInteractionConfig(interactionConfig);
  const response = await sendMessageToActiveGitHubTab({
    type: 'GMP_SET_INTERACTION_CONFIG',
    config: configToSave
  });

  if (!response?.success) {
    throw new Error(response?.message || 'Failed to save interaction rules');
  }

  interactionConfig = sanitizeInteractionConfig(response.config);
  interactionContextAvailable = true;
  setInteractionStatus('Interaction rules saved to localStorage.', 'success');

  try {
    const tabs = await chrome.tabs.query({ url: '*://*.github.com/*' });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'GMP_SETTINGS_UPDATED', settings: currentSettings });
      }
    }
  } catch (error) {
    // Ignore refresh broadcast failures
  }
}

function createExportPayload() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'github-mentions-plus',
    settings: sanitizeSettingsPayload(currentSettings),
    interactionConfig: sanitizeInteractionConfig(interactionConfig)
  };
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

async function exportUserSettings() {
  try {
    if (document.querySelector('input[name="dataSource"]:checked')?.value === 'gui') {
      syncTableToJson();
    }

    const settingsSnapshot = {
      ...(currentSettings || {}),
      dataSource: document.querySelector('input[name="dataSource"]:checked')?.value || currentSettings?.dataSource || 'gui',
      directJsonData: directJsonData.value.trim() || '[]'
    };
    currentSettings = sanitizeSettingsPayload(settingsSnapshot);

    if (interactionContextAvailable) {
      await loadInteractionConfig();
    }

    const payload = createExportPayload();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadTextFile(`github-mentions-plus-settings-${timestamp}.json`, JSON.stringify(payload, null, 2));
    showSuccess('Settings exported.');
  } catch (error) {
    showError(error.message || 'Failed to export settings.');
  }
}

async function importUserSettingsFromFile(file) {
  if (!file) {
    return;
  }

  try {
    const text = await file.text();
    const payload = JSON.parse(text);

    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid import file.');
    }

    const nextSettings = sanitizeSettingsPayload(payload.settings);
    const nextInteractionConfig = sanitizeInteractionConfig(payload.interactionConfig);

    const saved = await window.GitHubMentionsStorage.setSettings(nextSettings);
    if (!saved) {
      throw new Error('Failed to save extension settings.');
    }

    currentSettings = nextSettings;
    updateSettingUI();
    userTableBody.innerHTML = '';
    if (currentSettings.dataSource === 'gui') {
      loadUserTableData();
    }
    updateCommandsGrid();

    let importMessage = 'Settings imported.';
    if (interactionContextAvailable) {
      interactionConfig = nextInteractionConfig;
      await saveInteractionConfig();
      renderInteractionRules();
    } else {
      interactionConfig = nextInteractionConfig;
      renderInteractionRules();
      importMessage = 'Extension settings imported. Open a GitHub tab to apply interaction rules to localStorage.';
    }

    await updateStatus();
    await saveSettingsAndRefresh();
    showSuccess(importMessage);
  } catch (error) {
    showError(error.message || 'Failed to import settings.');
  } finally {
    if (importSettingsFileInput) {
      importSettingsFileInput.value = '';
    }
  }
}

function setInteractionStatus(message, status = '') {
  if (!interactionRulesStatus) return;
  interactionRulesStatus.textContent = message;
  interactionRulesStatus.className = `interaction-rules-status${status ? ` ${status}` : ''}`;
}

/**
 * Update UI with current settings
 */
function updateSettingUI() {
  if (currentSettings) {
    // Set data source radio button (default to 'gui')
    const dataSource = currentSettings.dataSource || 'gui';
    const radio = document.querySelector(`input[name="dataSource"][value="${dataSource}"]`);
    if (radio) {
      radio.checked = true;
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

  if (selectedDataSource === 'direct') {
    show(directJsonSection);
    hide(guiJsonSection);
  } else if (selectedDataSource === 'gui') {
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
    
    if (!validateAllRows()) {
      showError('Please fill in all required fields (username is required for all users).');
      return; // Stop saving
    }

    // If GUI mode, validate all rows first
    if (selectedDataSource === 'gui') {
      syncTableToJson();
    }
    
    const jsonData = (selectedDataSource === 'direct' || selectedDataSource === 'gui') ? directJsonData.value.trim() : '';
    
    const newSettings = {
      dataSource: selectedDataSource,
      directJsonData: jsonData,
      enabled: true,
      customCommands: currentSettings?.customCommands || {}
    };
    
    // Validate and cache users before saving settings
    if (jsonData && jsonData !== '[]') {
      try {
        const data = JSON.parse(jsonData);
        if (Array.isArray(data) && data.length > 0) {
          // Validate user data structure
          const validUsers = data.filter(user => 
            user && typeof user === 'object' &&
            typeof user.username === 'string' &&
            user.username.trim() !== ''
          ).map(user => ({
            username: user.username,
            name: user.name || user.username,
            avatar: user.avatar || user.profile || ''
          }));
          
          if (validUsers.length === 0) {
            showError('No valid users found. Please add at least one user with a username.');
            return; // Stop saving
          }
          
          // Cache the users
          const cacheSuccess = await window.GitHubMentionsStorage.setCachedUsers(validUsers);
          if (!cacheSuccess) {
            showError('Failed to cache user data. Please try again.');
            return; // Stop saving
          }
        }
      } catch (error) {
        showError(`Invalid JSON format: ${error.message}. Please fix and try again.`);
        return; // Stop saving
      }
    }
    
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
      const dataSource = settings.dataSource || 'gui';
      dataSourceStatus.textContent = dataSource === 'direct' ? 'Direct JSON' : 'Local (GUI)';
      dataSourceStatus.className = 'status-value success';
      
      // Update cache status
      const cachedUsers = await window.GitHubMentionsStorage.getCachedUsers();
      cachedUsersCount.textContent = cachedUsers.length.toString()
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
  const container = document.getElementById('statusIndicatorContainer');
  if (!container) return;
  
  // Remove existing status indicator if any
  const existing = container.querySelector('.status-indicator');
  if (existing) {
    existing.remove();
  }
  
  // Create new status indicator
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'status-indicator success';
  statusIndicator.innerHTML = '<div class="status-icon"></div><span class="status-text"></span>';
  statusIndicator.querySelector('.status-text').textContent = message;
  container.appendChild(statusIndicator);
  
  // Hide after 3 seconds
  setTimeout(() => {
    if (statusIndicator.parentNode) {
      statusIndicator.remove();
    }
  }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
  const container = document.getElementById('statusIndicatorContainer');
  if (!container) return;
  
  // Remove existing status indicator if any
  const existing = container.querySelector('.status-indicator');
  if (existing) {
    existing.remove();
  }
  
  // Create new status indicator
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'status-indicator error';
  statusIndicator.innerHTML = '<div class="status-icon"></div><span class="status-text"></span>';
  statusIndicator.querySelector('.status-text').textContent = message;
  container.appendChild(statusIndicator);
  
  // Hide after 5 seconds
  setTimeout(() => {
    if (statusIndicator.parentNode) {
      statusIndicator.remove();
    }
  }, 5000);
}

function renderInteractionRules() {
  if (!interactionDefaultsCard || !interactionRulesList) {
    return;
  }

  interactionDefaultsCard.classList.remove('hidden');
  const defaults = interactionConfig?.defaultModes || createDefaultInteractionConfig().defaultModes;
  interactionDefaultsCard.innerHTML = `
    <div class="interaction-rule-header">
      <div>
        <div class="interaction-rule-title">Default Behavior</div>
        <div class="interaction-rule-path">Applied when no path rule matches. Add a rule for <code>/</code> to override globally.</div>
      </div>
    </div>
    <div class="interaction-rule-meta">
      <span class="rule-badge ${defaults.enterEnabled ? '' : 'off'}">Enter ${defaults.enterEnabled ? 'On' : 'Off'}</span>
      <span class="rule-badge ${defaults.clickEnabled ? '' : 'off'}">Click ${defaults.clickEnabled ? 'On' : 'Off'}</span>
    </div>
  `;

  interactionRulesList.innerHTML = '';

  if (!interactionContextAvailable) {
    interactionRulesList.innerHTML = '<div class="interaction-empty-state">Open a GitHub tab to load and edit rules stored in that origin\'s localStorage.</div>';
    return;
  }

  const rules = [...(interactionConfig?.rules || [])].sort((a, b) => b.pathPrefix.length - a.pathPrefix.length);
  if (rules.length === 0) {
    interactionRulesList.innerHTML = '<div class="interaction-empty-state">No path rules yet. Add one to override the default behavior for a GitHub path prefix.</div>';
    return;
  }

  rules.forEach((rule) => {
    const card = document.createElement('div');
    card.className = 'interaction-rule-card';
    card.innerHTML = `
      <div class="interaction-rule-header">
        <div>
          <div class="interaction-rule-title">Path Rule</div>
          <div class="interaction-rule-path">${escapeHtml(rule.pathPrefix)}</div>
        </div>
      </div>
      <div class="interaction-rule-meta">
        <span class="rule-badge ${rule.enterEnabled ? '' : 'off'}">Enter ${rule.enterEnabled ? 'On' : 'Off'}</span>
        <span class="rule-badge ${rule.clickEnabled ? '' : 'off'}">Click ${rule.clickEnabled ? 'On' : 'Off'}</span>
      </div>
      <div class="interaction-rule-actions">
        <button class="btn btn-secondary btn-mini edit-interaction-rule">Edit</button>
        <button class="btn btn-danger btn-mini delete-interaction-rule">Delete</button>
      </div>
    `;

    card.querySelector('.edit-interaction-rule').addEventListener('click', () => openInteractionRuleModal(rule.id));
    card.querySelector('.delete-interaction-rule').addEventListener('click', () => deleteInteractionRule(rule.id));
    interactionRulesList.appendChild(card);
  });
}

function openInteractionRuleModal(ruleId = null) {
  if (!interactionContextAvailable) {
    showError('Open a GitHub tab first. Rules are stored in GitHub localStorage.');
    return;
  }

  editingInteractionRuleId = ruleId;
  const rule = (interactionConfig?.rules || []).find((item) => item.id === ruleId);

  interactionRuleModalTitle.textContent = rule ? 'Edit Interaction Rule' : 'Add Interaction Rule';
  interactionRulePathPrefixInput.value = rule?.pathPrefix || interactionCurrentPath || '/';
  interactionRuleEnterEnabledInput.checked = rule ? rule.enterEnabled : true;
  interactionRuleClickEnabledInput.checked = rule ? rule.clickEnabled : true;
  interactionRuleModal.classList.remove('hidden');
  interactionRulePathPrefixInput.focus();
  interactionRulePathPrefixInput.select();
}

function closeInteractionRuleModal() {
  if (!interactionRuleModal) return;
  interactionRuleModal.classList.add('hidden');
  editingInteractionRuleId = null;
  interactionRulePathPrefixInput.value = '';
  interactionRuleEnterEnabledInput.checked = true;
  interactionRuleClickEnabledInput.checked = true;
}

async function saveInteractionRule() {
  try {
    const pathPrefix = normalizePathPrefix(interactionRulePathPrefixInput.value);
    if (!pathPrefix) {
      showError('Path prefix is required.');
      interactionRulePathPrefixInput.focus();
      return;
    }

    const rules = [...(interactionConfig?.rules || [])];
    const rule = sanitizeInteractionRule({
      id: editingInteractionRuleId,
      pathPrefix,
      enterEnabled: interactionRuleEnterEnabledInput.checked,
      clickEnabled: interactionRuleClickEnabledInput.checked,
      updatedAt: Date.now()
    });

    const existingIndex = rules.findIndex((item) => item.id === editingInteractionRuleId || item.pathPrefix === rule.pathPrefix);
    if (existingIndex >= 0) {
      rules[existingIndex] = rule;
    } else {
      rules.push(rule);
    }

    interactionConfig = sanitizeInteractionConfig({
      ...(interactionConfig || createDefaultInteractionConfig()),
      rules
    });

    await saveInteractionConfig();
    closeInteractionRuleModal();
    renderInteractionRules();
  } catch (error) {
    showError(error.message || 'Failed to save interaction rule.');
  }
}

async function deleteInteractionRule(ruleId) {
  if (!confirm('Delete this interaction rule?')) {
    return;
  }

  try {
    interactionConfig = sanitizeInteractionConfig({
      ...(interactionConfig || createDefaultInteractionConfig()),
      rules: (interactionConfig?.rules || []).filter((rule) => rule.id !== ruleId)
    });

    await saveInteractionConfig();
    renderInteractionRules();
  } catch (error) {
    showError(error.message || 'Failed to delete interaction rule.');
  }
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
  saveSettingsBtn.addEventListener('click', saveSettingsAndRefresh);
  
  // Validate JSON button
  if (validateJsonBtn) {
    validateJsonBtn.addEventListener('click', validateJson);
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

  if (addInteractionRuleBtn) {
    addInteractionRuleBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openInteractionRuleModal();
    });
  }

  if (exportSettingsBtn) {
    exportSettingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      exportUserSettings();
    });
  }

  if (importSettingsBtn) {
    importSettingsBtn.addEventListener('click', (e) => {
      e.preventDefault();
      importSettingsFileInput?.click();
    });
  }

  if (importSettingsFileInput) {
    importSettingsFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      importUserSettingsFromFile(file);
    });
  }
  
  // Modal event listeners
  if (modalClose) modalClose.addEventListener('click', closeCommandModal);
  if (modalCancel) modalCancel.addEventListener('click', closeCommandModal);
  if (modalSave) modalSave.addEventListener('click', saveCommand);
  if (interactionRuleModalClose) interactionRuleModalClose.addEventListener('click', closeInteractionRuleModal);
  if (interactionRuleModalCancel) interactionRuleModalCancel.addEventListener('click', closeInteractionRuleModal);
  if (interactionRuleModalSave) interactionRuleModalSave.addEventListener('click', saveInteractionRule);
  
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

  if (interactionRuleModal) {
    interactionRuleModal.addEventListener('click', (e) => {
      if (e.target === interactionRuleModal) {
        closeInteractionRuleModal();
      }
    });
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !commandModal.classList.contains('hidden')) {
      closeCommandModal();
    }
    if (e.key === 'Escape' && interactionRuleModal && !interactionRuleModal.classList.contains('hidden')) {
      closeInteractionRuleModal();
    }
  });
  
  // Enter key on inputs
  directJsonData.addEventListener('keypress', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      saveSettings();
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
      dataSource: 'gui',
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
        type: 'GMP_SETTINGS_UPDATED',
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
