window.GitHubMentionsPopup = window.GitHubMentionsPopup || {};

window.GitHubMentionsPopup.createCommandsManager = function(context, services) {
  const emojiData = {
    recent: ['⏰', '📝', '⚡', '🚀', '✅', '❌', '🔥', '💡'],
    smileys: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏'],
    objects: ['📝', '📋', '📊', '📈', '📉', '🗂', '📅', '📆', '🗓', '📇', '🗃', '🗄', '📑', '📒', '📓', '📔', '📕', '📖', '📗', '📘', '📙', '📚', '📛', '🔖', '🏷', '📄', '📃', '📋', '📊'],
    symbols: ['⚡', '🔥', '💡', '⭐', '🌟', '✨', '💫', '⚠️', '🚨', '🔔', '🔕', '📢', '📣', '💬', '💭', '🗯', '♨️', '💥', '💢', '💦', '💨', '🕳', '💣', '💤', '👁', '🗨', '🗯', '💭', '🔮', '💈', '⚗️', '🔬']
  };

  function getCustomCommands() {
    return context.getSettings()?.customCommands || {};
  }

  function updateCommandCounter() {
    const count = Object.keys(getCustomCommands()).length;
    context.dom.commandCountDisplay.textContent = `${count}/10`;
    context.dom.addCommandBtn.disabled = count >= 10;
    context.dom.addCommandBtn.textContent = count >= 10 ? 'Maximum Reached' : '+ Add New Command';
  }

  function createBuiltInCommandCard(name, description, container) {
    const card = document.createElement('div');
    card.className = 'command-card built-in-card';
    card.dataset.commandName = name;
    card.innerHTML = `
      <div class="built-in-badge">Built-in</div>
      <div class="command-name">!${name}</div>
      <div class="command-preview">${description}</div>
      <div class="command-actions"><span class="built-in-info">Cannot be edited or deleted</span></div>
    `;
    container.appendChild(card);
  }

  function editCommand(name) {
    const commandData = getCustomCommands()[name];
    let content = '';
    let emoji = '';
    if (typeof commandData === 'object') {
      content = commandData.content || '';
      emoji = commandData.emoji || '';
    } else {
      content = commandData || '';
    }
    openCommandModal(name, content, emoji);
  }

  async function deleteCommand(name) {
    if (!confirm(`Delete command !${name}?`)) return;
    const settings = context.getSettings();
    if (settings?.customCommands) {
      delete settings.customCommands[name];
      await services.saveSettingsAndRefresh();
    }
  }

  function createCommandCard(name, content, number, container) {
    const card = document.createElement('div');
    card.className = 'command-card';
    const commandData = getCustomCommands()[name];
    const emoji = typeof commandData === 'object' && commandData.emoji ? commandData.emoji : '';
    card.innerHTML = `
      <div class="command-number">${number}</div>
      <div class="command-header">${emoji ? `<span class="command-emoji">${emoji}</span>` : ''}<div class="command-name">!${name}</div></div>
      <div class="command-preview">${typeof commandData === 'object' ? commandData.content : content}</div>
      <div class="command-actions">
        <button class="btn btn-secondary btn-mini edit-command">Edit</button>
        <button class="btn btn-danger btn-mini delete-command">Delete</button>
      </div>
    `;
    card.querySelector('.edit-command').addEventListener('click', () => editCommand(name));
    card.querySelector('.delete-command').addEventListener('click', () => deleteCommand(name));
    container.appendChild(card);
  }

  function updateCommandsGrid() {
    const customCommands = getCustomCommands();
    context.dom.commandsGrid.innerHTML = '';

    const builtInSection = document.createElement('div');
    builtInSection.className = 'built-in-commands-section';
    builtInSection.innerHTML = '<h4 class="commands-section-title">Built-in Commands</h4><div class="built-in-commands-grid"></div>';
    context.dom.commandsGrid.appendChild(builtInSection);
    createBuiltInCommandCard('lgtmrand', 'Insert a random LGTM GIF from GIPHY', builtInSection.querySelector('.built-in-commands-grid'));

    const customSection = document.createElement('div');
    customSection.className = 'custom-commands-section';
    if (Object.keys(customCommands).length > 0) {
      customSection.innerHTML = '<h4 class="commands-section-title">Custom Commands</h4><div class="custom-commands-grid"></div>';
      const customGrid = customSection.querySelector('.custom-commands-grid');
      Object.entries(customCommands).forEach(([name, content], index) => createCommandCard(name, content, index + 1, customGrid));
    } else {
      customSection.innerHTML = '<h4 class="commands-section-title">Custom Commands</h4><div class="empty-state"><p>No custom commands yet. Click "Add New Command" to create your first one!</p></div>';
    }
    context.dom.commandsGrid.appendChild(customSection);
    updateCommandCounter();
  }

  function hideEmojiPicker() {
    context.dom.emojiPicker.classList.add('hidden');
  }

  function switchEmojiCategory(category) {
    document.querySelectorAll('.emoji-category').forEach((btn) => btn.classList.remove('active'));
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
    context.dom.emojiGrid.innerHTML = '';
    (emojiData[category] || []).forEach((emoji) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'emoji-item';
      button.textContent = emoji;
      context.dom.emojiGrid.appendChild(button);
    });
  }

  function showEmojiPicker() {
    context.dom.emojiPicker.classList.remove('hidden');
    switchEmojiCategory('recent');
  }

  function toggleEmojiPicker() {
    if (context.dom.emojiPicker.classList.contains('hidden')) {
      showEmojiPicker();
    } else {
      hideEmojiPicker();
    }
  }

  function selectEmoji(emoji) {
    context.dom.commandEmojiInput.value = emoji;
    hideEmojiPicker();
  }

  function clearEmoji() {
    context.dom.commandEmojiInput.value = '';
    hideEmojiPicker();
  }

  function createValidationMessage() {
    const validationMessage = document.createElement('div');
    validationMessage.id = 'commandNameValidation';
    validationMessage.className = 'validation-message';
    context.dom.commandNameInput.parentNode.appendChild(validationMessage);
    return validationMessage;
  }

  function validateCommandNameInput() {
    const name = context.dom.commandNameInput.value.trim();
    const validationMessage = document.getElementById('commandNameValidation') || createValidationMessage();
    context.dom.commandNameInput.classList.remove('invalid');
    validationMessage.textContent = '';
    validationMessage.className = 'validation-message';

    if (!name) return true;
    if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
      context.dom.commandNameInput.classList.add('invalid');
      validationMessage.textContent = 'Only letters, numbers, hyphens, and underscores are allowed';
      validationMessage.classList.add('error');
      return false;
    }

    if (!context.getEditingCommand() && getCustomCommands()[name]) {
      context.dom.commandNameInput.classList.add('invalid');
      validationMessage.textContent = 'Command name already exists';
      validationMessage.classList.add('error');
      return false;
    }

    return true;
  }

  function openCommandModal(commandName, content, emoji) {
    context.setEditingCommand(commandName);
    context.dom.modalTitle.textContent = commandName ? `Edit Command: !${commandName}` : 'Add New Command';
    context.dom.commandNameInput.value = commandName || '';
    context.dom.commandNameInput.disabled = Boolean(commandName);
    context.dom.commandContentTextarea.value = content || '';
    context.dom.commandEmojiInput.value = emoji || '';
    context.dom.commandModal.classList.remove('hidden');
    hideEmojiPicker();
    (commandName ? context.dom.commandContentTextarea : context.dom.commandNameInput).focus();
  }

  function closeCommandModal() {
    context.dom.commandModal.classList.add('hidden');
    context.setEditingCommand(null);
    context.dom.commandNameInput.value = '';
    context.dom.commandContentTextarea.value = '';
    context.dom.commandEmojiInput.value = '';
    hideEmojiPicker();
    context.dom.commandNameInput.classList.remove('invalid');
    const validationMessage = document.getElementById('commandNameValidation');
    if (validationMessage) {
      validationMessage.textContent = '';
      validationMessage.className = 'validation-message';
    }
  }

  function createNewCommand() {
    if (!context.getSettings()) {
      context.setSettings(window.GitHubMentionsSettings.getDefaultSettings());
    }
    if (Object.keys(getCustomCommands()).length >= 10) {
      services.statusUi.showError('Maximum 10 commands allowed');
      return;
    }
    openCommandModal(null, '🚀 Ready for review!\n\nUpdated: ${timestamp}', '');
  }

  async function saveCommand() {
    const name = context.dom.commandNameInput.value.trim();
    const content = context.dom.commandContentTextarea.value.trim();
    const emoji = context.dom.commandEmojiInput.value.trim();

    if (!name) {
      services.statusUi.showError('Command name is required');
      context.dom.commandNameInput.focus();
      return;
    }
    if (!content) {
      services.statusUi.showError('Command content is required');
      context.dom.commandContentTextarea.focus();
      return;
    }
    if (!validateCommandNameInput()) {
      context.dom.commandNameInput.focus();
      return;
    }

    const settings = context.getSettings();
    settings.customCommands = settings.customCommands || {};
    settings.customCommands[name] = { content, emoji: emoji || null };
    closeCommandModal();
    await services.saveSettingsAndRefresh();
  }

  function bindEvents() {
    context.dom.addCommandBtn.addEventListener('click', (event) => {
      event.preventDefault();
      createNewCommand();
    });
    context.dom.modalClose.addEventListener('click', closeCommandModal);
    context.dom.modalCancel.addEventListener('click', closeCommandModal);
    context.dom.modalSave.addEventListener('click', saveCommand);
    context.dom.commandNameInput.addEventListener('input', validateCommandNameInput);
    context.dom.commandNameInput.addEventListener('blur', validateCommandNameInput);
    context.dom.emojiPickerBtn.addEventListener('click', toggleEmojiPicker);
    context.dom.commandEmojiInput.addEventListener('click', toggleEmojiPicker);
    context.dom.clearEmojiBtn.addEventListener('click', clearEmoji);

    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('emoji-category')) {
        switchEmojiCategory(event.target.dataset.category);
      } else if (event.target.classList.contains('emoji-item')) {
        selectEmoji(event.target.textContent);
      } else if (
        !context.dom.emojiPicker.contains(event.target) &&
        !context.dom.emojiPickerBtn.contains(event.target) &&
        !context.dom.commandEmojiInput.contains(event.target)
      ) {
        hideEmojiPicker();
      }
    });

    context.dom.commandModal.addEventListener('click', (event) => {
      if (event.target === context.dom.commandModal) {
        closeCommandModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !context.dom.commandModal.classList.contains('hidden')) {
        closeCommandModal();
      }
    });
  }

  return {
    bindEvents,
    updateCommandsGrid,
    createNewCommand,
    closeCommandModal
  };
};
