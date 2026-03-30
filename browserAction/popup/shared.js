window.GitHubMentionsPopup = window.GitHubMentionsPopup || {};

window.GitHubMentionsPopup.createContext = function() {
  const context = {
    dom: {
      dataSourceRadios: document.querySelectorAll('input[name="dataSource"]'),
      directJsonSection: document.getElementById('directJsonSection'),
      guiJsonSection: document.getElementById('guiJsonSection'),
      directJsonData: document.getElementById('directJsonData'),
      validateJsonBtn: document.getElementById('validateJson'),
      saveSettingsBtn: document.getElementById('saveSettings'),
      extensionStatus: document.getElementById('extensionStatus'),
      dataSourceStatus: document.getElementById('dataSourceStatus'),
      cachedUsersCount: document.getElementById('cachedUsersCount'),
      commandsGrid: document.getElementById('commandsGrid'),
      addCommandBtn: document.getElementById('addCommand'),
      commandCountDisplay: document.getElementById('commandCount'),
      userTableBody: document.getElementById('userTableBody'),
      addUserRowBtn: document.getElementById('addUserRow'),
      exportSettingsBtn: document.getElementById('exportSettings'),
      importSettingsBtn: document.getElementById('importSettings'),
      importSettingsFileInput: document.getElementById('importSettingsFile'),
      commandModal: document.getElementById('commandModal'),
      modalTitle: document.getElementById('modalTitle'),
      modalClose: document.getElementById('modalClose'),
      modalCancel: document.getElementById('modalCancel'),
      modalSave: document.getElementById('modalSave'),
      commandNameInput: document.getElementById('commandName'),
      commandContentTextarea: document.getElementById('commandContent'),
      commandEmojiInput: document.getElementById('commandEmoji'),
      emojiPickerBtn: document.getElementById('emojiPickerBtn'),
      emojiPicker: document.getElementById('emojiPicker'),
      emojiGrid: document.getElementById('emojiGrid'),
      clearEmojiBtn: document.getElementById('clearEmoji'),
      statusIndicatorContainer: document.getElementById('statusIndicatorContainer')
    },
    state: {
      currentSettings: null,
      editingCommand: null
    }
  };

  context.getSettings = function() {
    return context.state.currentSettings;
  };

  context.setSettings = function(settings) {
    context.state.currentSettings = settings;
  };

  context.getEditingCommand = function() {
    return context.state.editingCommand;
  };

  context.setEditingCommand = function(value) {
    context.state.editingCommand = value;
  };

  context.escapeHtml = function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  return context;
};
