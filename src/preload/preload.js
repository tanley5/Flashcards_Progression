const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  listSets: () => ipcRenderer.invoke('sets:list'),
  getSet: (setId) => ipcRenderer.invoke('sets:get', setId),
  createSet: (name) => ipcRenderer.invoke('sets:create', name),
  renameSet: (setId, name) => ipcRenderer.invoke('sets:rename', setId, name),
  deleteSet: (setId) => ipcRenderer.invoke('sets:delete', setId),
  getSetStatus: (setId) => ipcRenderer.invoke('sets:status', setId),
  restartSet: (setId, startDeck) =>
    ipcRenderer.invoke('sets:restart', setId, startDeck),

  listDecks: (setId) => ipcRenderer.invoke('decks:list', setId),
  getDeck: (deckId) => ipcRenderer.invoke('decks:get', deckId),

  listCards: (deckId) => ipcRenderer.invoke('cards:list', deckId),
  getCard: (cardId) => ipcRenderer.invoke('cards:get', cardId),
  createCard: (payload) => ipcRenderer.invoke('cards:create', payload),
  bulkCreateCards: (setId, text) =>
    ipcRenderer.invoke('cards:bulkCreate', setId, text),
  updateCard: (cardId, fields) =>
    ipcRenderer.invoke('cards:update', cardId, fields),
  deleteCard: (cardId) => ipcRenderer.invoke('cards:delete', cardId),

  getDueCards: (options) => ipcRenderer.invoke('review:due', options),
  reviewCard: (cardId, wasCorrect) =>
    ipcRenderer.invoke('review:answer', cardId, wasCorrect),

  getThemeSource: () => ipcRenderer.invoke('theme:get'),
  onThemeUpdated: (callback) => {
    const handler = (_event, payload) => callback(payload);
    ipcRenderer.on('theme:updated', handler);
    return () => ipcRenderer.removeListener('theme:updated', handler);
  },
});
