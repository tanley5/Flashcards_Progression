(() => {
  const params = getParams();
  const { scope = 'global', setId, deckId, returnTo = 'home.html' } = params;
  const errorEl = document.getElementById('error');
  const sessionEl = document.getElementById('session');
  const summaryEl = document.getElementById('summary');
  const emptyEl = document.getElementById('empty-review');

  let queue = [];
  let index = 0;
  let showingBack = false;
  let stats = {
    reviewed: 0,
    correct: 0,
    promotions: 0,
    demotions: 0,
    mastered: 0,
  };

  document.getElementById('back-link').href = returnTo;
  document.getElementById('done-btn').addEventListener('click', () => {
    window.location.href = returnTo;
  });
  document.getElementById('empty-back-btn').addEventListener('click', () => {
    window.location.href = returnTo;
  });

  function showError(message) {
    errorEl.hidden = !message;
    errorEl.textContent = message || '';
  }

  function currentCard() {
    return queue[index];
  }

  function renderCard() {
    const card = currentCard();
    if (!card) {
      showSummary();
      return;
    }
    sessionEl.hidden = false;
    summaryEl.hidden = true;
    emptyEl.hidden = true;
    document.getElementById('progress').textContent = `Card ${index + 1} of ${queue.length}`;
    document.getElementById('side-label').textContent = showingBack ? 'Back' : 'Front';
    document.getElementById('card-text').textContent = showingBack ? card.back : card.front;
    document.getElementById('incorrect-btn').hidden = !showingBack;
    document.getElementById('correct-btn').hidden = !showingBack;
  }

  function flip() {
    if (!currentCard()) return;
    showingBack = !showingBack;
    renderCard();
  }

  async function answer(wasCorrect) {
    const card = currentCard();
    if (!card || !showingBack) return;

    try {
      const result = await window.api.reviewCard(card.id, wasCorrect);
      stats.reviewed += 1;
      if (result.wasCorrect) stats.correct += 1;
      if (result.promoted) stats.promotions += 1;
      if (result.demoted) stats.demotions += 1;
      if (result.mastered) stats.mastered += 1;
      index += 1;
      showingBack = false;
      renderCard();
    } catch (err) {
      showError(err.message);
    }
  }

  function showSummary() {
    sessionEl.hidden = true;
    emptyEl.hidden = true;
    summaryEl.hidden = false;
    document.getElementById('summary-grid').innerHTML = `
      <div><span class="muted">Reviewed</span><strong>${stats.reviewed}</strong></div>
      <div><span class="muted">Correct</span><strong>${stats.correct}</strong></div>
      <div><span class="muted">Promotions</span><strong>${stats.promotions}</strong></div>
      <div><span class="muted">Demotions</span><strong>${stats.demotions}</strong></div>
      <div><span class="muted">Newly mastered</span><strong>${stats.mastered}</strong></div>
    `;
  }

  document.getElementById('flip-btn').addEventListener('click', flip);
  document.getElementById('flashcard').addEventListener('click', flip);
  document.getElementById('correct-btn').addEventListener('click', () => answer(true));
  document.getElementById('incorrect-btn').addEventListener('click', () => answer(false));

  window.addEventListener('keydown', (event) => {
    if (summaryEl.hidden === false || emptyEl.hidden === false) return;
    if (event.code === 'Space') {
      event.preventDefault();
      flip();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      answer(true);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      answer(false);
    }
  });

  async function start() {
    const options = { scope };
    if (setId) options.setId = Number(setId);
    if (deckId) options.deckId = Number(deckId);
    queue = await window.api.getDueCards(options);
    if (!queue.length) {
      sessionEl.hidden = true;
      summaryEl.hidden = true;
      emptyEl.hidden = false;
      return;
    }
    renderCard();
  }

  start().catch((err) => showError(err.message));
})();
