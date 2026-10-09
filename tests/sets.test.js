const { createTestDb } = require('./helpers/testDb');
const {
  createSet,
  renameSet,
  deleteSet,
  listSets,
  getSetStatus,
  listDecks,
  restartSet,
} = require('../src/logic/sets');
const { createCard } = require('../src/logic/cards');
const { reviewCard } = require('../src/logic/reviewEngine');
const { INTERVAL_BY_DECK_NUMBER } = require('../src/logic/constants');

describe('sets', () => {
  let db;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    if (db) {
      db.close();
      db = null;
    }
  });

  test('createSet inserts set and three decks with intervals 1/2/3', () => {
    const setId = createSet(db, 'Anatomy');
    const decks = listDecks(db, setId);

    expect(decks).toHaveLength(3);
    expect(decks.map((d) => d.deck_number)).toEqual([1, 2, 3]);
    expect(decks.map((d) => d.interval_days)).toEqual([
      INTERVAL_BY_DECK_NUMBER[1],
      INTERVAL_BY_DECK_NUMBER[2],
      INTERVAL_BY_DECK_NUMBER[3],
    ]);
    expect(INTERVAL_BY_DECK_NUMBER[2]).toBe(2);
    expect(INTERVAL_BY_DECK_NUMBER[3]).toBe(3);
  });

  test('rename and delete set', () => {
    const setId = createSet(db, 'Old');
    renameSet(db, setId, 'New');
    expect(listSets(db)[0].name).toBe('New');

    const cardId = createCard(db, { setId, front: 'q', back: 'a' });
    expect(cardId).toBeTruthy();

    deleteSet(db, setId);
    expect(listSets(db)).toHaveLength(0);
    expect(db.prepare('SELECT COUNT(*) AS c FROM cards').get().c).toBe(0);
    expect(db.prepare('SELECT COUNT(*) AS c FROM decks').get().c).toBe(0);
  });

  test('set status empty / in_progress / completed', () => {
    const setId = createSet(db, 'Status');
    expect(getSetStatus(db, setId)).toBe('empty');

    const cardId = createCard(db, { setId, front: 'q', back: 'a' });
    expect(getSetStatus(db, setId)).toBe('in_progress');

    // Promote through decks to mastery
    reviewCard(db, cardId, true); // 1 -> 2
    db.prepare(`UPDATE cards SET next_due_date = date('now') WHERE id = ?`).run(cardId);
    reviewCard(db, cardId, true); // 2 -> 3
    db.prepare(`UPDATE cards SET next_due_date = date('now') WHERE id = ?`).run(cardId);
    reviewCard(db, cardId, true); // mastered

    expect(getSetStatus(db, setId)).toBe('completed');
  });

  test('restartSet resets cards to chosen deck due today', () => {
    const setId = createSet(db, 'Restart');
    const cardId = createCard(db, { setId, front: 'q', back: 'a' });

    reviewCard(db, cardId, true);
    db.prepare(`UPDATE cards SET next_due_date = date('now') WHERE id = ?`).run(cardId);
    reviewCard(db, cardId, true);
    db.prepare(`UPDATE cards SET next_due_date = date('now') WHERE id = ?`).run(cardId);
    reviewCard(db, cardId, true);

    restartSet(db, setId, 2);
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
    const deck = db.prepare('SELECT * FROM decks WHERE id = ?').get(card.current_deck_id);

    expect(card.status).toBe('active');
    expect(deck.deck_number).toBe(2);
    expect(card.last_reviewed_date).toBeNull();
    expect(card.next_due_date).toBe(
      db.prepare(`SELECT date('now') AS d`).get().d
    );
  });
});
