function qs(params) {
  return new URLSearchParams(params).toString();
}

function goHome() {
  window.location.href = 'home.html';
}

function goSet(setId) {
  window.location.href = `set-view.html?${qs({ setId })}`;
}

function goDeck(setId, deckId) {
  window.location.href = `deck-view.html?${qs({ setId, deckId })}`;
}

function goReview({ scope, setId, deckId, returnTo }) {
  const params = { scope };
  if (setId) params.setId = setId;
  if (deckId) params.deckId = deckId;
  if (returnTo) params.returnTo = returnTo;
  window.location.href = `review.html?${qs(params)}`;
}

function getParams() {
  return Object.fromEntries(new URLSearchParams(window.location.search));
}

function statusLabel(status) {
  if (status === 'completed') return 'Completed';
  if (status === 'empty') return 'Empty';
  return 'In Progress';
}

function statusBadgeClass(status) {
  if (status === 'completed') return 'badge badge-completed';
  if (status === 'empty') return 'badge badge-empty';
  return 'badge badge-progress';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
