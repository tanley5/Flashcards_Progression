const { INTERVAL_BY_DECK_NUMBER, MAX_DECKS_PER_SET } = require('./constants');
const { today } = require('./dates');

function createSet(db, name) {
  if (!name || !String(name).trim()) {
    throw new Error('Set name is required');
  }

  const create = db.transaction((setName) => {
    const created = today();
    const result = db
      .prepare('INSERT INTO sets (name, created_date) VALUES (?, ?)')
      .run(setName.trim(), created);
    const setId = result.lastInsertRowid;

    const insertDeck = db.prepare(`
      INSERT INTO decks (set_id, deck_number, interval_days, created_date)
      VALUES (?, ?, ?, ?)
    `);

    for (let n = 1; n <= MAX_DECKS_PER_SET; n += 1) {
      insertDeck.run(setId, n, INTERVAL_BY_DECK_NUMBER[n], created);
    }

    return setId;
  });

  return create(name);
}

function renameSet(db, setId, name) {
  if (!name || !String(name).trim()) {
    throw new Error('Set name is required');
  }
  const result = db
    .prepare('UPDATE sets SET name = ? WHERE id = ?')
    .run(name.trim(), setId);
  if (result.changes === 0) {
    throw new Error(`Set ${setId} not found`);
  }
}

function deleteSet(db, setId) {
  const result = db.prepare('DELETE FROM sets WHERE id = ?').run(setId);
  if (result.changes === 0) {
    throw new Error(`Set ${setId} not found`);
  }
}

function getSet(db, setId) {
  return db.prepare('SELECT * FROM sets WHERE id = ?').get(setId) || null;
}

function listSets(db) {
  const sets = db
    .prepare('SELECT * FROM sets ORDER BY created_date DESC, id DESC')
    .all();

  return sets.map((set) => {
    const counts = db
      .prepare(
        `
        SELECT
          COUNT(*) AS total_cards,
          SUM(CASE WHEN status = 'active' AND next_due_date <= date('now') THEN 1 ELSE 0 END) AS due_today
        FROM cards
        WHERE set_id = ?
      `
      )
      .get(set.id);

    return {
      ...set,
      status: getSetStatus(db, set.id),
      total_cards: counts.total_cards || 0,
      due_today: counts.due_today || 0,
    };
  });
}

function getSetStatus(db, setId) {
  const row = db
    .prepare(
      `
      SELECT
        CASE
          WHEN COUNT(*) = 0 THEN 'empty'
          WHEN SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) = 0 THEN 'completed'
          ELSE 'in_progress'
        END AS set_status
      FROM cards
      WHERE set_id = ?
    `
    )
    .get(setId);

  return row.set_status;
}

function getDeckIdByNumber(db, setId, deckNumber) {
  const deck = db
    .prepare('SELECT id FROM decks WHERE set_id = ? AND deck_number = ?')
    .get(setId, deckNumber);
  if (!deck) {
    throw new Error(`Deck ${deckNumber} not found for set ${setId}`);
  }
  return deck.id;
}

function listDecks(db, setId) {
  return db
    .prepare(
      `
      SELECT d.*,
        (SELECT COUNT(*) FROM cards c WHERE c.current_deck_id = d.id AND c.status = 'active') AS card_count
      FROM decks d
      WHERE d.set_id = ?
      ORDER BY d.deck_number ASC
    `
    )
    .all(setId);
}

function getDeck(db, deckId) {
  return db.prepare('SELECT * FROM decks WHERE id = ?').get(deckId) || null;
}

function restartSet(db, setId, startDeckNumber = 1) {
  if (startDeckNumber < 1 || startDeckNumber > MAX_DECKS_PER_SET) {
    throw new Error('startDeckNumber must be 1, 2, or 3');
  }

  const deckId = getDeckIdByNumber(db, setId, startDeckNumber);

  const run = db.transaction(() => {
    db.prepare(
      `
      UPDATE cards
      SET status = 'active',
          current_deck_id = ?,
          next_due_date = date('now'),
          last_reviewed_date = NULL
      WHERE set_id = ?
    `
    ).run(deckId, setId);
  });

  run();
}

module.exports = {
  createSet,
  renameSet,
  deleteSet,
  getSet,
  listSets,
  getSetStatus,
  getDeckIdByNumber,
  listDecks,
  getDeck,
  restartSet,
};
