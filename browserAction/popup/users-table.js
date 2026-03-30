window.GitHubMentionsPopup = window.GitHubMentionsPopup || {};

window.GitHubMentionsPopup.createUsersTable = function(context) {
  function syncTableToJson() {
    const { userTableBody, directJsonData } = context.dom;
    if (!userTableBody) return;

    const rows = userTableBody.querySelectorAll('tr');
    const users = [];

    rows.forEach((row) => {
      const username = row.querySelector('.user-username').value.trim();
      const name = row.querySelector('.user-name').value.trim();
      const profile = row.querySelector('.user-profile').value.trim();

      if (username) {
        users.push({ username, name: name || '', profile: profile || '' });
      }
    });

    directJsonData.value = users.length > 0 ? JSON.stringify(users, null, 2) : '[]';
  }

  function validateUserRow(row) {
    const usernameInput = row.querySelector('.user-username');
    const username = usernameInput.value.trim();
    if (!username) {
      usernameInput.classList.add('invalid');
      row.classList.add('error');
      return false;
    }

    usernameInput.classList.remove('invalid');
    row.classList.remove('error');
    return true;
  }

  function validateAllRows() {
    const rows = context.dom.userTableBody.querySelectorAll('tr');
    let allValid = true;
    rows.forEach((row) => {
      if (!validateUserRow(row)) {
        allValid = false;
      }
    });
    return allValid;
  }

  function deleteUserRow(row) {
    row.remove();
    if (context.dom.userTableBody.children.length === 0) {
      addUserRow();
    }
    syncTableToJson();
  }

  function addUserRow(username = '', name = '', profile = '') {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" class="user-username" value="${context.escapeHtml(username)}" placeholder="john-doe" required /></td>
      <td><input type="text" class="user-name" value="${context.escapeHtml(name)}" placeholder="John Doe" /></td>
      <td><input type="text" class="user-profile" value="${context.escapeHtml(profile)}" placeholder="https://example.com" /></td>
      <td><button class="btn btn-danger btn-mini delete-user-row">Delete</button></td>
    `;

    row.querySelector('.delete-user-row').addEventListener('click', () => deleteUserRow(row));
    const usernameInput = row.querySelector('.user-username');
    usernameInput.addEventListener('input', () => validateUserRow(row));
    usernameInput.addEventListener('blur', () => validateUserRow(row));
    row.querySelectorAll('input').forEach((input) => input.addEventListener('input', syncTableToJson));

    context.dom.userTableBody.appendChild(row);
    syncTableToJson();
  }

  function loadUserTableData() {
    const { userTableBody, directJsonData } = context.dom;
    if (!userTableBody) return;
    if (userTableBody.children.length > 0) return;

    try {
      const jsonText = directJsonData.value.trim();
      if (!jsonText || jsonText === '[]') {
        addUserRow();
        return;
      }

      const users = JSON.parse(jsonText);
      if (Array.isArray(users) && users.length > 0) {
        userTableBody.innerHTML = '';
        users.forEach((user) => addUserRow(user.username || '', user.name || '', user.profile || ''));
        return;
      }
    } catch (error) {
      // ignore
    }

    addUserRow();
  }

  return {
    addUserRow,
    loadUserTableData,
    syncTableToJson,
    validateAllRows
  };
};
