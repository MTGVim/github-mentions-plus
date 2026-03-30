window.GitHubMentionsPopup = window.GitHubMentionsPopup || {};

window.GitHubMentionsPopup.createStatusUi = function(context) {
  function showStatus(message, type, timeout) {
    const container = context.dom.statusIndicatorContainer;
    if (!container) return;

    const existing = container.querySelector('.status-indicator');
    if (existing) {
      existing.remove();
    }

    const indicator = document.createElement('div');
    indicator.className = `status-indicator ${type}`;
    indicator.innerHTML = '<div class="status-icon"></div><span class="status-text"></span>';
    indicator.querySelector('.status-text').textContent = message;
    container.appendChild(indicator);

    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, timeout);
  }

  async function updateStatus() {
    try {
      const settings = await window.GitHubMentionsStorage.getSettings();
      if (!settings) {
        context.dom.extensionStatus.textContent = 'Inactive';
        context.dom.extensionStatus.className = 'status-value error';
        return;
      }

      context.dom.extensionStatus.textContent = 'Active';
      context.dom.extensionStatus.className = 'status-value success';
      context.dom.dataSourceStatus.textContent = settings.dataSource === 'direct' ? 'Direct JSON' : 'Local (GUI)';
      context.dom.dataSourceStatus.className = 'status-value success';

      const cachedUsers = await window.GitHubMentionsStorage.getCachedUsers();
      context.dom.cachedUsersCount.textContent = String(cachedUsers.length);
    } catch (error) {
      // ignore
    }
  }

  return {
    showSuccess(message) {
      showStatus(message, 'success', 3000);
    },
    showError(message) {
      showStatus(message, 'error', 5000);
    },
    updateStatus
  };
};
