const overlayRenderRoot = typeof window !== 'undefined' ? window : globalThis;
overlayRenderRoot.GitHubMentionsOverlay = overlayRenderRoot.GitHubMentionsOverlay || {};

function getThemeColors() {
  const isDarkMode = overlayRenderRoot.matchMedia && overlayRenderRoot.matchMedia('(prefers-color-scheme: dark)').matches;
  return {
    isDarkMode,
    background: isDarkMode ? '#04080d' : '#ffffff',
    username: isDarkMode ? '#e3eaf1' : '#212529',
    name: isDarkMode ? '#848b94' : '#4f5863',
    border: isDarkMode ? '#353c44' : '#dde1e5'
  };
}

function getSelectedBgColor(isDarkMode) {
  return isDarkMode ? '#1f6feb' : '#9ec9f9ff';
}

function updateSelection() {
  const state = overlayRenderRoot.GitHubMentionsOverlay.state;
  const { isDarkMode } = getThemeColors();
  const selectedBgColor = getSelectedBgColor(isDarkMode);
  const defaultBgColor = 'transparent';

  if (state.selectedIndex < 0 || state.selectedIndex >= state.overlayItems.length) {
    state.selectedIndex = 0;
    state.currentSelectedIndex = 0;
  }

  state.currentSelectedIndex = state.selectedIndex;

  if (state.overlayItems[state.selectedIndex]) {
    try {
      state.overlayItems[state.selectedIndex].scrollIntoView({ behavior: 'auto', block: 'nearest' });
    } catch (error) {
      console.error('Error during scrollIntoView:', error);
    }
  }

  state.overlayItems.forEach((item, index) => {
    try {
      if (index === state.selectedIndex) {
        item.style.backgroundColor = selectedBgColor;
        item.style.color = '#ffffff';
        item.style.fontWeight = '600';
        item.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.1)';
      } else {
        item.style.backgroundColor = defaultBgColor;
        item.style.color = '';
        item.style.fontWeight = '';
        item.style.boxShadow = 'none';
      }
    } catch (error) {
      console.error('Error styling overlay item:', error);
    }
  });
}

function createItem(user, index, onSelect, colors) {
  const state = overlayRenderRoot.GitHubMentionsOverlay.state;
  const item = document.createElement('div');
  const isSelected = index === state.selectedIndex;
  item.className = 'github-mentions-item';
  item.style.cssText = `
    display: flex;
    align-items: center;
    padding: 0.5rem;
    cursor: pointer;
    transition: all 0.15s ease;
    background-color: ${isSelected ? getSelectedBgColor(colors.isDarkMode) : 'transparent'};
    color: ${isSelected ? '#ffffff' : ''};
    font-weight: ${isSelected ? '600' : 'normal'};
    border-radius: 0.375rem;
    margin: 0 0.5rem;
    list-style: none;
    box-shadow: ${isSelected ? '0 0 0 1px rgba(255,255,255,0.1)' : 'none'};
  `;

  item.userData = user;
  item.itemIndex = index;

  item.addEventListener('mouseenter', () => {
    if (state.selectedIndex !== index) {
      state.selectedIndex = index;
      updateSelection();
    }
  });

  item.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof onSelect === 'function') {
      setTimeout(() => onSelect(user), 50);
    }
    overlayRenderRoot.GitHubMentionsOverlay.hideOverlay();
  });

  const textContent = document.createElement('div');
  textContent.style.cssText = `
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    flex: 1;
  `;

  if (!user.isCommand) {
    const avatar = document.createElement('img');
    avatar.src = user.avatar || `https://github.com/${user.username}.png`;
    avatar.alt = `${user.name}'s avatar`;
    avatar.style.cssText = `
      width: 16px;
      height: 16px;
      border-radius: 50%;
      box-shadow: 0 0 0 1px #d0d7de;
      display: inline-block;
      line-height: 1;
      overflow: hidden;
      vertical-align: middle;
      margin-right: 0.5rem;
      flex-shrink: 0;
    `;
    avatar.addEventListener('error', () => {
      avatar.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMTAiIGZpbGw9IiNkNmQ3ZGUiLz4KPHBhdGggZD0iTTEwIDEwQzEyLjc2MTQgMTAgMTUgNy43NjE0MiAxNSA1QzE1IDIuMjM4NTggMTIuNzYxNCAwIDEwIDBDNy4yMzg1OCAwIDUgMi4yMzg1OCA1IDVDNSA3Ljc2MTQyIDcuMjM4NTggMTAgMTAgMTBaIiBmaWxsPSIjNjc2MDZhIi8+CjxwYXRoIGQ9Ik0xMCAxMkM2LjY4NiAxMiA0IDE0LjY4NiA0IDE4VjIwSDE2VjE4QzE2IDE0LjY4NiAxMy4zMTQgMTIgMTAgMTJaIiBmaWxsPSIjNjc2MDZhIi8+Cjwvc3ZnPgo=';
    });
    item.appendChild(avatar);
  } else {
    const commandIcon = document.createElement('span');
    if (user.emoji) {
      commandIcon.textContent = user.emoji;
      commandIcon.style.cssText = `
        width: 16px;
        height: 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        margin-right: 0.5rem;
        flex-shrink: 0;
      `;
    } else {
      commandIcon.textContent = '!';
      commandIcon.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: ${colors.username};
        color: ${colors.isDarkMode ? '#04080d' : '#ffffff'};
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
        margin-right: 0.5rem;
        flex-shrink: 0;
      `;
    }
    item.appendChild(commandIcon);
  }

  const username = document.createElement('span');
  username.textContent = user.isCommand ? `!${user.username}` : user.username;
  username.style.cssText = `
    color: ${colors.username};
    font-family: -apple-system, "system-ui", "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
    font-size: 14px;
    font-weight: 600;
    line-height: 1.2;
  `;

  const name = document.createElement('span');
  name.textContent = user.name;
  name.style.cssText = `
    color: ${colors.name};
    font-family: -apple-system, "system-ui", "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
    font-size: 12px;
    font-weight: 400;
    line-height: 1.2;
  `;

  textContent.appendChild(username);
  textContent.appendChild(name);
  item.appendChild(textContent);
  return item;
}

function createOverlay() {
  const state = overlayRenderRoot.GitHubMentionsOverlay.state;
  if (state.overlay) {
    return state.overlay;
  }

  const colors = getThemeColors();
  state.overlay = document.createElement('div');
  state.overlay.id = 'github-mentions-overlay';
  state.overlay.style.cssText = `
    position: absolute;
    z-index: 9999;
    color: ${colors.username};
    background: ${colors.background};
    border: 1px solid ${colors.border};
    border-radius: 0.75rem;
    box-shadow: 0 8px 24px rgba(140, 149, 159, 0.2);
    padding: 0.5rem 0;
    font-size: 13px;
    min-width: 192px;
    display: none;
    font-family: -apple-system, "system-ui", "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
    line-height: 1.4;
    overflow: hidden;
    box-sizing: content-box;
  `;
  document.body.appendChild(state.overlay);
  return state.overlay;
}

function showOverlay(users, onSelect, activeInput) {
  const state = overlayRenderRoot.GitHubMentionsOverlay.state;
  if (!state.overlay || !Array.isArray(users) || users.length === 0) {
    return;
  }

  const colors = getThemeColors();
  state.overlay.innerHTML = '';
  state.selectedIndex = 0;
  state.currentSelectedIndex = 0;
  state.overlayItems = [];
  state.lastKeyNavTime = 0;

  users.slice(0, 4).forEach((user, index) => {
    const item = createItem(user, index, onSelect, colors);
    state.overlayItems.push(item);
    state.overlay.appendChild(item);
  });

  state.overlay.style.display = 'block';
  overlayRenderRoot.GitHubMentionsOverlay.updateOverlayPosition?.(activeInput);
}

function hideOverlay() {
  const state = overlayRenderRoot.GitHubMentionsOverlay.state;
  if (!state.overlay) {
    return;
  }

  if (state.overlay.matches(':popover-open')) {
    try {
      state.overlay.hidePopover();
    } catch (error) {
      // ignore already-closed popovers
    }
  }

  state.overlay.style.display = 'none';
  state.selectedIndex = 0;
  state.overlayItems = [];
}

function isOverlayVisible() {
  const state = overlayRenderRoot.GitHubMentionsOverlay.state;
  return Boolean(state.overlay && (state.overlay.style.display !== 'none' || state.overlay.matches(':popover-open')));
}

function removeOverlay() {
  const state = overlayRenderRoot.GitHubMentionsOverlay.state;
  if (state.overlay?.parentNode) {
    state.overlay.parentNode.removeChild(state.overlay);
    state.overlay = null;
    state.lastGoodPosition = null;
  }
}

function getOverlay() {
  return overlayRenderRoot.GitHubMentionsOverlay.state.overlay;
}

function getSelectedItem() {
  const state = overlayRenderRoot.GitHubMentionsOverlay.state;
  if (state.overlayItems.length > 0 && state.selectedIndex >= 0 && state.selectedIndex < state.overlayItems.length) {
    return state.overlayItems[state.selectedIndex].userData;
  }
  return null;
}

overlayRenderRoot.GitHubMentionsOverlay.getThemeColors = getThemeColors;
overlayRenderRoot.GitHubMentionsOverlay.getSelectedBgColor = getSelectedBgColor;
overlayRenderRoot.GitHubMentionsOverlay.updateSelection = updateSelection;
overlayRenderRoot.GitHubMentionsOverlay.createOverlay = createOverlay;
overlayRenderRoot.GitHubMentionsOverlay.showOverlay = showOverlay;
overlayRenderRoot.GitHubMentionsOverlay.hideOverlay = hideOverlay;
overlayRenderRoot.GitHubMentionsOverlay.isOverlayVisible = isOverlayVisible;
overlayRenderRoot.GitHubMentionsOverlay.removeOverlay = removeOverlay;
overlayRenderRoot.GitHubMentionsOverlay.getOverlay = getOverlay;
overlayRenderRoot.GitHubMentionsOverlay.getSelectedItem = getSelectedItem;
