window.GitHubMentionsPopup = window.GitHubMentionsPopup || {};

window.GitHubMentionsPopup.createSettingsForm = function(context, services) {
  async function loadSettings() {
    const settings = await window.GitHubMentionsStorage.getSettings();
    context.setSettings(settings);
    updateSettingUI();
  }

  function updateSettingUI() {
    const currentSettings = context.getSettings();
    if (!currentSettings) return;

    const dataSource = currentSettings.dataSource || 'gui';
    const radio = document.querySelector(`input[name="dataSource"][value="${dataSource}"]`);
    if (radio) {
      radio.checked = true;
    }
    context.dom.directJsonData.value = currentSettings.directJsonData || '[]';
    updateDataSourceSection();
  }

  function updateDataSourceSection() {
    const selectedDataSource = document.querySelector('input[name="dataSource"]:checked').value;
    if (selectedDataSource === 'direct') {
      context.dom.directJsonSection.classList.remove('hidden');
      context.dom.guiJsonSection.classList.add('hidden');
      return;
    }

    context.dom.directJsonSection.classList.add('hidden');
    context.dom.guiJsonSection.classList.remove('hidden');
    services.usersTable.loadUserTableData();
  }

  function validateJson() {
    const jsonText = context.dom.directJsonData.value.trim();
    if (!jsonText) {
      services.statusUi.showError('Please enter JSON data');
      return;
    }

    try {
      const data = JSON.parse(jsonText);
      if (!Array.isArray(data)) {
        services.statusUi.showError('JSON must be an array');
        return;
      }
      if (data.length === 0) {
        services.statusUi.showError('JSON array cannot be empty');
        return;
      }
      if (!window.GitHubMentionsSettings.validateDirectJsonUsers(data)) {
        services.statusUi.showError('Found invalid user objects');
        return;
      }
      services.statusUi.showSuccess(`JSON validation successful! Found ${data.length} valid users.`);
    } catch (error) {
      services.statusUi.showError(`Invalid JSON format: ${error.message}`);
    }
  }

  async function saveSettings() {
    try {
      const selectedDataSource = document.querySelector('input[name="dataSource"]:checked').value;
      if (!services.usersTable.validateAllRows()) {
        services.statusUi.showError('Please fill in all required fields (username is required for all users).');
        return false;
      }

      if (selectedDataSource === 'gui') {
        services.usersTable.syncTableToJson();
      }

      const jsonData = context.dom.directJsonData.value.trim();
      const newSettings = {
        dataSource: selectedDataSource,
        directJsonData: jsonData,
        enabled: true,
        customCommands: context.getSettings()?.customCommands || {}
      };

      if (jsonData && jsonData !== '[]') {
        try {
          const data = JSON.parse(jsonData);
          const validUsers = window.GitHubMentionsSettings.normalizeUsersForCache(data);
          if (validUsers.length === 0) {
            services.statusUi.showError('No valid users found. Please add at least one user with a username.');
            return false;
          }

          const cacheSuccess = await window.GitHubMentionsStorage.setCachedUsers(validUsers);
          if (!cacheSuccess) {
            services.statusUi.showError('Failed to cache user data. Please try again.');
            return false;
          }
        } catch (error) {
          services.statusUi.showError(`Invalid JSON format: ${error.message}. Please fix and try again.`);
          return false;
        }
      }

      const success = await window.GitHubMentionsStorage.setSettings(newSettings);
      if (!success) {
        services.statusUi.showError('Failed to save settings');
        return false;
      }

      context.setSettings(window.GitHubMentionsSettings.normalizeSettings(newSettings));
      services.statusUi.showSuccess('Settings saved successfully');
      setTimeout(() => services.statusUi.updateStatus(), 500);
      return true;
    } catch (error) {
      services.statusUi.showError('Failed to save settings');
      return false;
    }
  }

  async function saveSettingsAndRefresh() {
    const saved = await saveSettings();
    if (!saved) return false;
    services.commandsManager.updateCommandsGrid();
    try {
      const tabs = await chrome.tabs.query({ url: '*://*.github.com/*' });
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'GMP_SETTINGS_UPDATED',
          settings: context.getSettings()
        });
      }
    } catch (error) {
      // ignore
    }
    return true;
  }

  function bindEvents() {
    context.dom.dataSourceRadios.forEach((radio) => radio.addEventListener('change', updateDataSourceSection));
    context.dom.saveSettingsBtn.addEventListener('click', saveSettingsAndRefresh);
    context.dom.validateJsonBtn.addEventListener('click', validateJson);
    context.dom.addUserRowBtn.addEventListener('click', () => services.usersTable.addUserRow());
    context.dom.directJsonData.addEventListener('keypress', (event) => {
      if (event.ctrlKey && event.key === 'Enter') {
        saveSettings();
      }
    });
  }

  return {
    bindEvents,
    loadSettings,
    saveSettings,
    saveSettingsAndRefresh,
    updateSettingUI,
    updateDataSourceSection,
    validateJson
  };
};
