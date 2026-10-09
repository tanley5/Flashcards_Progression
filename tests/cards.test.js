const { createTestDb } = require('./helpers/testDb');
const { createSet, listDecks, getDeckIdByNumber } = require('../src/logic/sets');
const {
  createCard,
  bulkCreateCards,
  updateCard,
  deleteCard,
  listCards,
  parseBulkLines,
} = require('../src/logic/cards');
const { today } = require('../src/logic/dates');

describe('cards', () => {
  let db;
  let setId;
  let decks;

  beforeEach(() => {
    db = createTestDb();
    setId = createSet(db, 'Cards');
    decks = listDecks(db, setId);
  });

  afterEach(() => {
    if (db) {
      db.close();
      db = null;
    }
  });

  test('createCard only allowed in Deck 1', () => {
    const id = createCard(db, { setId, front: 'Front', back: 'Back' });
    const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);

    expect(card.current_deck_id).toBe(decks[0].id);
    expect(card.status).toBe('active');
    expect(card.next_due_date).toBe(today());
    expect(card.last_reviewed_date).toBeNull();

    expect(() =>
      createCard(db, {
        setId,
        front: 'x',
        back: 'y',
        deckId: getDeckIdByNumber(db, setId, 2),
      })
    ).toThrow(/Deck 1/);
  });

  test('bulkCreateCards parses front | back lines', () => {
    const ids = bulkCreateCards(
      db,
      setId,
      'Q1 | A1\nQ2 | A2\n\nQ3 | A3 with | pipes'
    );
    expect(ids).toHaveLength(3);
    const cards = listCards(db, decks[0].id);
    expect(cards.map((c) => c.front)).toEqual(['Q1', 'Q2', 'Q3']);
    expect(cards[2].back).toBe('A3 with | pipes');
  });

  test('parseBulkLines rejects bad format', () => {
    expect(() => parseBulkLines('no delimiter')).toThrow(/Invalid bulk line/);
  });

  test('update and delete card', () => {
    const id = createCard(db, { setId, front: 'a', back: 'b' });
    updateCard(db, id, { front: 'aa', back: 'bb' });
    expect(db.prepare('SELECT front, back FROM cards WHERE id = ?').get(id)).toEqual({
      front: 'aa',
      back: 'bb',
    });
    deleteCard(db, id);
    expect(listCards(db, decks[0].id)).toHaveLength(0);
  });
});
