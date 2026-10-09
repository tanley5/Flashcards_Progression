const { createTestDb } = require('./helpers/testDb');
const { createSet, getDeckIdByNumber, listDecks } = require('../src/logic/sets');
const { createCard } = require('../src/logic/cards');
const { reviewCard, getDueCards } = require('../src/logic/reviewEngine');
const { today, addDays } = require('../src/logic/dates');
const { INTERVAL_BY_DECK_NUMBER } = require('../src/logic/constants');

function makeDue(db, cardId) {
  db.prepare(`UPDATE cards SET next_due_date = date('now') WHERE id = ?`).run(cardId);
}

describe('reviewEngine', () => {
  let db;
  let setId;

  beforeEach(() => {
    db = createTestDb();
    setId = createSet(db, 'Review');
  });

  afterEach(() => {
    if (db) {
      db.close();
      db = null;
    }
  });

  test('correct promotes 1→2→3 then masters; due uses deck-after interval', () => {
    const cardId = createCard(db, { setId, front: 'q', back: 'a' });

    let result = reviewCard(db, cardId, true);
    expect(result.promoted).toBe(true);
    expect(result.deckAfter).toBe(2);
    expect(result.card.next_due_date).toBe(addDays(today(), INTERVAL_BY_DECK_NUMBER[2]));

    makeDue(db, cardId);
    result = reviewCard(db, cardId, true);
    expect(result.deckAfter).toBe(3);
    expect(result.card.next_due_date).toBe(addDays(today(), INTERVAL_BY_DECK_NUMBER[3]));
    expect(INTERVAL_BY_DECK_NUMBER[3]).toBe(3);

    makeDue(db, cardId);
    result = reviewCard(db, cardId, true);
    expect(result.mastered).toBe(true);
    expect(result.card.status).toBe('mastered');
    expect(result.deckAfter).toBe(3);

    const log = db
      .prepare('SELECT * FROM review_log WHERE card_id = ? ORDER BY id ASC')
      .all(cardId);
    expect(log).toHaveLength(3);
    expect(log[2]).toMatchObject({
      was_correct: 1,
      deck_before: 3,
      deck_after: 3,
    });
  });

  test('incorrect demotes one deck; Deck 1 incorrect stays', () => {
    const cardId = createCard(db, { setId, front: 'q', back: 'a' });
    reviewCard(db, cardId, true); // -> 2
    makeDue(db, cardId);

    let result = reviewCard(db, cardId, false);
    expect(result.demoted).toBe(true);
    expect(result.deckAfter).toBe(1);
    expect(result.card.next_due_date).toBe(addDays(today(), INTERVAL_BY_DECK_NUMBER[1]));

    makeDue(db, cardId);
    result = reviewCard(db, cardId, false);
    expect(result.demoted).toBe(false);
    expect(result.deckAfter).toBe(1);
  });

  test('due queries for deck, set, and global scopes', () => {
    const setB = createSet(db, 'Other');
    const a1 = createCard(db, { setId, front: 'a1', back: 'x' });
    const a2 = createCard(db, { setId, front: 'a2', back: 'x' });
    const b1 = createCard(db, { setId: setB, front: 'b1', back: 'x' });

    reviewCard(db, a1, true); // a1 now in deck 2, not due
    // a2 and b1 still due in deck 1

    const deck1 = getDeckIdByNumber(db, setId, 1);
    const deckDue = getDueCards(db, { scope: 'deck', deckId: deck1 });
    expect(deckDue.map((c) => c.id)).toEqual([a2]);

    const setDue = getDueCards(db, { scope: 'set', setId });
    expect(setDue.map((c) => c.id)).toEqual([a2]);

    const globalDue = getDueCards(db, { scope: 'global' });
    expect(globalDue.map((c) => c.id).sort()).toEqual([a2, b1].sort());

    // Future-due and mastered excluded
    db.prepare(`UPDATE cards SET next_due_date = date('now', '+10 days') WHERE id = ?`).run(
      a2
    );
    makeDue(db, a1);
    reviewCard(db, a1, true); // -> 3
    makeDue(db, a1);
    reviewCard(db, a1, true); // mastered

    expect(getDueCards(db, { scope: 'set', setId })).toHaveLength(0);
  });

  test('set-scoped due orders by deck number', () => {
    const c1 = createCard(db, { setId, front: 'd1', back: 'x' });
    const c2 = createCard(db, { setId, front: 'd2', back: 'x' });
    reviewCard(db, c2, true); // c2 -> deck 2
    makeDue(db, c2);

    const due = getDueCards(db, { scope: 'set', setId });
    expect(due.map((c) => c.id)).toEqual([c1, c2]);

    const decks = listDecks(db, setId);
    expect(due[0].current_deck_id).toBe(decks[0].id);
    expect(due[1].current_deck_id).toBe(decks[1].id);
  });
});
