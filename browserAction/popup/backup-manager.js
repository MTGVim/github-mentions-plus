const popupBackupRoot = typeof window !== 'undefined' ? window : globalThis;
popupBackupRoot.GitHubMentionsPopup = popupBackupRoot.GitHubMentionsPopup || {};

function buildSettingsExportPayload(settings) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'github-mentions-plus',
    settings: popupBackupRoot.GitHubMentionsSettings.normalizeSettings(settings)
  };
}

popupBackupRoot.GitHubMentionsPopup.buildSettingsExportPayload = buildSettingsExportPayload;

popupBackupRoot.GitHubMentionsPopup.createBackupManager = function(context, services) {
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
        services.usersTable.syncTableToJson();
      }

      const settingsSnapshot = {
        ...(context.getSettings() || {}),
        dataSource: document.querySelector('input[name="dataSource"]:checked')?.value || context.getSettings()?.dataSource || 'gui',
        directJsonData: context.dom.directJsonData.value.trim() || '[]'
      };
      context.setSettings(window.GitHubMentionsSettings.normalizeSettings(settingsSnapshot));

      const payload = buildSettingsExportPayload(context.getSettings());
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadTextFile(`github-mentions-plus-settings-${timestamp}.json`, JSON.stringify(payload, null, 2));
      services.statusUi.showSuccess('Settings exported.');
    } catch (error) {
      services.statusUi.showError(error.message || 'Failed to export settings.');
    }
  }

  async function importUserSettingsFromFile(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid import file.');
      }

      const nextSettings = window.GitHubMentionsSettings.normalizeSettings(payload.settings);
      const saved = await window.GitHubMentionsStorage.setSettings(nextSettings);
      if (!saved) {
        throw new Error('Failed to save extension settings.');
      }

      context.setSettings(nextSettings);
      services.settingsForm.updateSettingUI();
      context.dom.userTableBody.innerHTML = '';
      if (nextSettings.dataSource === 'gui') {
        services.usersTable.loadUserTableData();
      }
      services.commandsManager.updateCommandsGrid();
      await services.statusUi.updateStatus();
      await services.saveSettingsAndRefresh();
      services.statusUi.showSuccess('Settings imported.');
    } catch (error) {
      services.statusUi.showError(error.message || 'Failed to import settings.');
    } finally {
      context.dom.importSettingsFileInput.value = '';
    }
  }

  function bindEvents() {
    context.dom.exportSettingsBtn.addEventListener('click', (event) => {
      event.preventDefault();
      exportUserSettings();
    });
    context.dom.importSettingsBtn.addEventListener('click', (event) => {
      event.preventDefault();
      context.dom.importSettingsFileInput.click();
    });
    context.dom.importSettingsFileInput.addEventListener('change', (event) => {
      importUserSettingsFromFile(event.target.files?.[0]);
    });
  }

  return {
    bindEvents,
    exportUserSettings,
    importUserSettingsFromFile
  };
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildSettingsExportPayload
  };
}
