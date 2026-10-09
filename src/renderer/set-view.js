(() => {
  const { setId } = getParams();
  const errorEl = document.getElementById('error');

  function showError(message) {
    errorEl.hidden = !message;
    errorEl.textContent = message || '';
  }

  if (!setId) {
    showError('Missing set id.');
    return;
  }

  async function load() {
    const set = await window.api.getSet(Number(setId));
    if (!set) {
      showError('Set not found.');
      return;
    }
    const status = await window.api.getSetStatus(Number(setId));
    const decks = await window.api.listDecks(Number(setId));

    document.getElementById('set-title').textContent = set.name;
    document.getElementById('set-status').innerHTML = `
      Status: <span class="${statusBadgeClass(status)}">${statusLabel(status)}</span>
    `;

    const grid = document.getElementById('deck-grid');
    grid.innerHTML = '';
    for (const deck of decks) {
      const col = document.createElement('div');
      col.className = 'deck-column';
      col.innerHTML = `
        <h2>Deck ${deck.deck_number}</h2>
        <div class="interval">Every ${deck.interval_days} day${deck.interval_days === 1 ? '' : 's'}</div>
        <div class="count-pill">${deck.card_count}</div>
        <div class="muted">active cards</div>
      `;
      col.addEventListener('click', () => goDeck(setId, deck.id));
      grid.appendChild(col);
    }
  }

  document.getElementById('review-due-btn').addEventListener('click', () => {
    goReview({
      scope: 'set',
      setId,
      returnTo: `set-view.html?setId=${encodeURIComponent(setId)}`,
    });
  });

  load().catch((err) => showError(err.message));
})();
