const { INTERVAL_BY_DECK_NUMBER, MAX_DECKS_PER_SET } = require('./constants');
const { today, addDays } = require('./dates');
const { getDeckIdByNumber } = require('./sets');

function getDeckNumber(db, deckId) {
  const deck = db.prepare('SELECT deck_number FROM decks WHERE id = ?').get(deckId);
  if (!deck) {
    throw new Error(`Deck ${deckId} not found`);
  }
  return deck.deck_number;
}

function moveCardToDeck(db, cardId, setId, deckNumber) {
  const deckId = getDeckIdByNumber(db, setId, deckNumber);
  db.prepare('UPDATE cards SET current_deck_id = ? WHERE id = ?').run(deckId, cardId);
}

function setCardStatus(db, cardId, status) {
  db.prepare('UPDATE cards SET status = ? WHERE id = ?').run(status, cardId);
}

function updateCardDueDate(db, cardId, deckNumber) {
  const interval = INTERVAL_BY_DECK_NUMBER[deckNumber];
  const due = addDays(today(), interval);
  db.prepare(
    `
    UPDATE cards
    SET next_due_date = ?, last_reviewed_date = ?
    WHERE id = ?
  `
  ).run(due, today(), cardId);
}

function logReview(db, cardId, wasCorrect, deckBefore, deckAfter) {
  db.prepare(
    `
    INSERT INTO review_log (card_id, date, was_correct, deck_before, deck_after)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(cardId, today(), wasCorrect ? 1 : 0, deckBefore, deckAfter);
}

function reviewCard(db, cardId, wasCorrect) {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  if (!card) {
    throw new Error(`Card ${cardId} not found`);
  }
  if (card.status !== 'active') {
    throw new Error('Only active cards can be reviewed');
  }

  const deckBefore = getDeckNumber(db, card.current_deck_id);
  let deckAfter = deckBefore;
  let promoted = false;
  let demoted = false;
  let mastered = false;

  const run = db.transaction(() => {
    if (wasCorrect) {
      if (deckBefore === MAX_DECKS_PER_SET) {
        setCardStatus(db, card.id, 'mastered');
        mastered = true;
      } else {
        deckAfter = deckBefore + 1;
        moveCardToDeck(db, card.id, card.set_id, deckAfter);
        promoted = true;
      }
    } else if (deckBefore > 1) {
      deckAfter = deckBefore - 1;
      moveCardToDeck(db, card.id, card.set_id, deckAfter);
      demoted = true;
    }

    updateCardDueDate(db, card.id, deckAfter);
    logReview(db, card.id, wasCorrect, deckBefore, deckAfter);
  });

  run();

  const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
  return {
    card: updated,
    deckBefore,
    deckAfter,
    wasCorrect: Boolean(wasCorrect),
    promoted,
    demoted,
    mastered,
  };
}

function shuffleCards(cards, random = Math.random) {
  const shuffled = cards.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getDueCards(db, { scope, setId, deckId, shuffle = true, random } = {}) {
  let cards;

  if (scope === 'deck') {
    if (!deckId) throw new Error('deckId is required for deck scope');
    cards = db
      .prepare(
        `
        SELECT * FROM cards
        WHERE current_deck_id = ?
          AND status = 'active'
          AND next_due_date <= date('now')
        ORDER BY next_due_date ASC, id ASC
      `
      )
      .all(deckId);
  } else if (scope === 'set') {
    if (!setId) throw new Error('setId is required for set scope');
    cards = db
      .prepare(
        `
        SELECT * FROM cards
        WHERE set_id = ?
          AND status = 'active'
          AND next_due_date <= date('now')
        ORDER BY (SELECT deck_number FROM decks WHERE id = current_deck_id) ASC,
                 next_due_date ASC,
                 id ASC
      `
      )
      .all(setId);
  } else if (scope === 'global' || !scope) {
    cards = db
      .prepare(
        `
        SELECT * FROM cards
        WHERE status = 'active'
          AND next_due_date <= date('now')
        ORDER BY set_id ASC,
                 (SELECT deck_number FROM decks WHERE id = current_deck_id) ASC,
                 next_due_date ASC,
                 id ASC
      `
      )
      .all();
  } else {
    throw new Error(`Unknown review scope: ${scope}`);
  }

  return shuffle ? shuffleCards(cards, random) : cards;
}

module.exports = {
  getDeckNumber,
  moveCardToDeck,
  reviewCard,
  updateCardDueDate,
  getDueCards,
  shuffleCards,
};
