/**
 * GitHub Mentions+ popup bootstrap
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const context = window.GitHubMentionsPopup.createContext();
    const statusUi = window.GitHubMentionsPopup.createStatusUi(context);
    const usersTable = window.GitHubMentionsPopup.createUsersTable(context);

    const services = {
      statusUi,
      usersTable,
      commandsManager: null,
      settingsForm: null,
      backupManager: null,
      async saveSettingsAndRefresh() {
        return services.settingsForm.saveSettingsAndRefresh();
      }
    };

    const commandsManager = window.GitHubMentionsPopup.createCommandsManager(context, services);
    services.commandsManager = commandsManager;

    const settingsForm = window.GitHubMentionsPopup.createSettingsForm(context, services);
    services.settingsForm = settingsForm;

    const backupManager = window.GitHubMentionsPopup.createBackupManager(context, services);
    services.backupManager = backupManager;

    await settingsForm.loadSettings();
    await statusUi.updateStatus();

    settingsForm.bindEvents();
    commandsManager.bindEvents();
    backupManager.bindEvents();
    settingsForm.updateDataSourceSection();
    commandsManager.updateCommandsGrid();

    if (document.querySelector('input[name="dataSource"]:checked')?.value === 'gui') {
      usersTable.loadUserTableData();
    }
  } catch (error) {
    // ignore popup bootstrap failures
  }
});
