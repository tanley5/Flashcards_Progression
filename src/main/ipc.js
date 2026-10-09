const { ipcMain } = require('electron');
const {
  createSet,
  renameSet,
  deleteSet,
  listSets,
  getSet,
  getSetStatus,
  listDecks,
  getDeck,
  restartSet,
} = require('../logic/sets');
const {
  createCard,
  bulkCreateCards,
  updateCard,
  deleteCard,
  listCards,
  getCard,
} = require('../logic/cards');
const { reviewCard, getDueCards } = require('../logic/reviewEngine');

function registerIpc(db) {
  ipcMain.handle('sets:list', () => listSets(db));
  ipcMain.handle('sets:get', (_e, setId) => getSet(db, setId));
  ipcMain.handle('sets:create', (_e, name) => {
    const id = createSet(db, name);
    return getSet(db, id);
  });
  ipcMain.handle('sets:rename', (_e, setId, name) => {
    renameSet(db, setId, name);
    return getSet(db, setId);
  });
  ipcMain.handle('sets:delete', (_e, setId) => {
    deleteSet(db, setId);
    return { ok: true };
  });
  ipcMain.handle('sets:status', (_e, setId) => getSetStatus(db, setId));
  ipcMain.handle('sets:restart', (_e, setId, startDeckNumber) => {
    restartSet(db, setId, startDeckNumber);
    return { ok: true };
  });

  ipcMain.handle('decks:list', (_e, setId) => listDecks(db, setId));
  ipcMain.handle('decks:get', (_e, deckId) => getDeck(db, deckId));

  ipcMain.handle('cards:list', (_e, deckId) => listCards(db, deckId));
  ipcMain.handle('cards:get', (_e, cardId) => getCard(db, cardId));
  ipcMain.handle('cards:create', (_e, payload) => {
    const id = createCard(db, payload);
    return getCard(db, id);
  });
  ipcMain.handle('cards:bulkCreate', (_e, setId, text) => {
    const ids = bulkCreateCards(db, setId, text);
    return ids.map((id) => getCard(db, id));
  });
  ipcMain.handle('cards:update', (_e, cardId, fields) => {
    updateCard(db, cardId, fields);
    return getCard(db, cardId);
  });
  ipcMain.handle('cards:delete', (_e, cardId) => {
    deleteCard(db, cardId);
    return { ok: true };
  });

  ipcMain.handle('review:due', (_e, options) => getDueCards(db, options));
  ipcMain.handle('review:answer', (_e, cardId, wasCorrect) =>
    reviewCard(db, cardId, wasCorrect)
  );
}

module.exports = { registerIpc };
