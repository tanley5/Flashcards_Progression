const { today } = require('./dates');
const { getDeck, getDeckIdByNumber } = require('./sets');

function createCard(db, { setId, front, back, deckId }) {
  const trimmedFront = String(front ?? '').trim();
  const trimmedBack = String(back ?? '').trim();
  if (!trimmedFront || !trimmedBack) {
    throw new Error('Card front and back are required');
  }

  let targetDeckId = deckId;
  if (!targetDeckId) {
    targetDeckId = getDeckIdByNumber(db, setId, 1);
  }

  const deck = getDeck(db, targetDeckId);
  if (!deck || deck.set_id !== setId) {
    throw new Error('Deck does not belong to this set');
  }
  if (deck.deck_number !== 1) {
    throw new Error('Cards can only be created in Deck 1');
  }

  const created = today();
  const result = db
    .prepare(
      `
      INSERT INTO cards (
        set_id, current_deck_id, front, back, status,
        last_reviewed_date, next_due_date, created_date
      ) VALUES (?, ?, ?, ?, 'active', NULL, ?, ?)
    `
    )
    .run(setId, targetDeckId, trimmedFront, trimmedBack, created, created);

  return result.lastInsertRowid;
}

function parseBulkLines(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const cards = [];
  for (const line of lines) {
    const parts = line.split('|').map((p) => p.trim());
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      throw new Error(`Invalid bulk line: "${line}". Use format: front | back`);
    }
    cards.push({ front: parts[0], back: parts.slice(1).join(' | ') });
  }
  return cards;
}

function bulkCreateCards(db, setId, text) {
  const parsed = parseBulkLines(text);
  const insertMany = db.transaction((items) => {
    const ids = [];
    for (const item of items) {
      ids.push(createCard(db, { setId, front: item.front, back: item.back }));
    }
    return ids;
  });
  return insertMany(parsed);
}

function updateCard(db, cardId, { front, back }) {
  const trimmedFront = String(front ?? '').trim();
  const trimmedBack = String(back ?? '').trim();
  if (!trimmedFront || !trimmedBack) {
    throw new Error('Card front and back are required');
  }
  const result = db
    .prepare('UPDATE cards SET front = ?, back = ? WHERE id = ?')
    .run(trimmedFront, trimmedBack, cardId);
  if (result.changes === 0) {
    throw new Error(`Card ${cardId} not found`);
  }
}

function deleteCard(db, cardId) {
  const result = db.prepare('DELETE FROM cards WHERE id = ?').run(cardId);
  if (result.changes === 0) {
    throw new Error(`Card ${cardId} not found`);
  }
}

function getCard(db, cardId) {
  return db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId) || null;
}

function listCards(db, deckId) {
  return db
    .prepare(
      `
      SELECT * FROM cards
      WHERE current_deck_id = ?
      ORDER BY created_date ASC, id ASC
    `
    )
    .all(deckId);
}

module.exports = {
  createCard,
  parseBulkLines,
  bulkCreateCards,
  updateCard,
  deleteCard,
  getCard,
  listCards,
};
