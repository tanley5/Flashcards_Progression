(() => {
  const listEl = document.getElementById('set-list');
  const emptyEl = document.getElementById('empty');
  const errorEl = document.getElementById('error');
  let renameSetId = null;
  let restartSetId = null;

  function showError(message) {
    errorEl.hidden = !message;
    errorEl.textContent = message || '';
  }

  function openModal(id) {
    document.getElementById(id).hidden = false;
  }

  function closeModal(id) {
    document.getElementById(id).hidden = true;
  }

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  async function loadSets() {
    showError('');
    const sets = await window.api.listSets();
    listEl.innerHTML = '';
    emptyEl.hidden = sets.length > 0;

    for (const set of sets) {
      const row = document.createElement('div');
      row.className = 'set-row';
      row.innerHTML = `
        <div class="set-meta">
          <strong>${escapeHtml(set.name)}</strong>
          <div class="set-stats">
            <span class="${statusBadgeClass(set.status)}">${statusLabel(set.status)}</span>
            <span>${set.total_cards} cards</span>
            <span>${set.due_today} due today</span>
          </div>
        </div>
        <div class="row-actions">
          <button class="btn btn-ghost" type="button" data-action="rename">Rename</button>
          <button class="btn btn-ghost btn-danger" type="button" data-action="delete">Delete</button>
        </div>
      `;

      row.addEventListener('click', async (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'rename') {
          event.stopPropagation();
          renameSetId = set.id;
          document.getElementById('rename-input').value = set.name;
          openModal('rename-modal');
          return;
        }
        if (action === 'delete') {
          event.stopPropagation();
          if (confirm(`Delete set "${set.name}"? This cannot be undone.`)) {
            await window.api.deleteSet(set.id);
            await loadSets();
          }
          return;
        }

        if (set.status === 'completed') {
          restartSetId = set.id;
          openModal('restart-modal');
          return;
        }
        goSet(set.id);
      });

      listEl.appendChild(row);
    }
  }

  document.getElementById('new-set-btn').addEventListener('click', () => {
    document.getElementById('new-set-name').value = '';
    openModal('new-set-modal');
    document.getElementById('new-set-name').focus();
  });

  document.getElementById('create-set-confirm').addEventListener('click', async () => {
    const name = document.getElementById('new-set-name').value.trim();
    if (!name) {
      showError('Set name is required.');
      return;
    }
    try {
      const set = await window.api.createSet(name);
      closeModal('new-set-modal');
      goSet(set.id);
    } catch (err) {
      showError(err.message);
    }
  });

  document.getElementById('rename-confirm').addEventListener('click', async () => {
    const name = document.getElementById('rename-input').value.trim();
    if (!name || !renameSetId) return;
    await window.api.renameSet(renameSetId, name);
    closeModal('rename-modal');
    await loadSets();
  });

  document.querySelectorAll('[data-restart-deck]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!restartSetId) return;
      const deck = Number(btn.dataset.restartDeck);
      await window.api.restartSet(restartSetId, deck);
      closeModal('restart-modal');
      goSet(restartSetId);
    });
  });

  document.getElementById('review-all-btn').addEventListener('click', () => {
    goReview({ scope: 'global', returnTo: 'home.html' });
  });

  loadSets().catch((err) => showError(err.message));
})();
