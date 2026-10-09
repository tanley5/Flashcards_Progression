(() => {
  const { setId, deckId } = getParams();
  const errorEl = document.getElementById('error');
  const addBtn = document.getElementById('add-card-btn');
  const bulkBtn = document.getElementById('bulk-add-btn');
  let deck = null;
  let editingCardId = null;
  let canEdit = false;

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

  if (!setId || !deckId) {
    showError('Missing set or deck id.');
    return;
  }

  document.getElementById('set-link').href = `set-view.html?setId=${encodeURIComponent(setId)}`;

  async function load() {
    showError('');
    const set = await window.api.getSet(Number(setId));
    deck = await window.api.getDeck(Number(deckId));
    if (!set || !deck) {
      showError('Deck not found.');
      return;
    }

    canEdit = deck.deck_number === 1;
    document.getElementById('deck-title').textContent = `Deck ${deck.deck_number}`;
    document.getElementById('set-link').textContent = set.name;

    const hint = document.getElementById('deck-hint');
    if (canEdit) {
      hint.textContent = 'Add and edit cards here. New cards start due today.';
      addBtn.disabled = false;
      bulkBtn.disabled = false;
      addBtn.title = '';
      bulkBtn.title = '';
    } else {
      hint.textContent =
        'Read-only for adding cards. Cards arrive here through review promotion.';
      addBtn.disabled = true;
      bulkBtn.disabled = true;
      addBtn.title = 'Cards arrive here through review promotion';
      bulkBtn.title = 'Cards arrive here through review promotion';
    }

    const cards = await window.api.listCards(Number(deckId));
    const list = document.getElementById('card-list');
    const empty = document.getElementById('empty');
    list.innerHTML = '';
    empty.hidden = cards.length > 0;

    for (const card of cards) {
      const row = document.createElement('div');
      row.className = 'card-row';
      row.style.cursor = 'default';
      row.innerHTML = `
        <div class="card-meta">
          <strong>${escapeHtml(card.front)}</strong>
          <span class="muted">${escapeHtml(card.back)}</span>
          <span class="muted">${card.status}${card.next_due_date ? ` · due ${card.next_due_date}` : ''}</span>
        </div>
        <div class="row-actions">
          ${
            canEdit
              ? '<button class="btn btn-ghost" type="button" data-action="edit">Edit</button>'
              : ''
          }
          <button class="btn btn-ghost btn-danger" type="button" data-action="delete">Delete</button>
        </div>
      `;

      row.addEventListener('click', async (event) => {
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'edit') {
          editingCardId = card.id;
          document.getElementById('card-modal-title').textContent = 'Edit Card';
          document.getElementById('card-front').value = card.front;
          document.getElementById('card-back').value = card.back;
          openModal('card-modal');
        }
        if (action === 'delete') {
          if (confirm('Delete this card?')) {
            await window.api.deleteCard(card.id);
            await load();
          }
        }
      });

      list.appendChild(row);
    }
  }

  addBtn.addEventListener('click', () => {
    if (!canEdit) return;
    editingCardId = null;
    document.getElementById('card-modal-title').textContent = 'Add Card';
    document.getElementById('card-front').value = '';
    document.getElementById('card-back').value = '';
    openModal('card-modal');
  });

  bulkBtn.addEventListener('click', () => {
    if (!canEdit) return;
    document.getElementById('bulk-text').value = '';
    openModal('bulk-modal');
  });

  document.getElementById('card-save').addEventListener('click', async () => {
    const front = document.getElementById('card-front').value;
    const back = document.getElementById('card-back').value;
    try {
      if (editingCardId) {
        await window.api.updateCard(editingCardId, { front, back });
      } else {
        await window.api.createCard({
          setId: Number(setId),
          deckId: Number(deckId),
          front,
          back,
        });
      }
      closeModal('card-modal');
      await load();
    } catch (err) {
      showError(err.message);
    }
  });

  document.getElementById('bulk-save').addEventListener('click', async () => {
    try {
      await window.api.bulkCreateCards(
        Number(setId),
        document.getElementById('bulk-text').value
      );
      closeModal('bulk-modal');
      await load();
    } catch (err) {
      showError(err.message);
    }
  });

  document.getElementById('review-due-btn').addEventListener('click', () => {
    goReview({
      scope: 'deck',
      setId,
      deckId,
      returnTo: `deck-view.html?setId=${encodeURIComponent(setId)}&deckId=${encodeURIComponent(deckId)}`,
    });
  });

  load().catch((err) => showError(err.message));
})();
