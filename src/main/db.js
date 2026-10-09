const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { INTERVAL_BY_DECK_NUMBER } = require('../logic/constants');

function syncDeckIntervals(db) {
  const update = db.prepare(
    'UPDATE decks SET interval_days = ? WHERE deck_number = ? AND interval_days != ?'
  );
  for (const [deckNumber, intervalDays] of Object.entries(INTERVAL_BY_DECK_NUMBER)) {
    const n = Number(deckNumber);
    update.run(intervalDays, n, intervalDays);
  }
}

function openDatabase(dbPath = ':memory:') {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  const schemaPath = path.join(__dirname, '..', '..', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
  syncDeckIntervals(db);
  return db;
}

let defaultDb = null;

function getDb(dbPath) {
  if (dbPath) {
    return openDatabase(dbPath);
  }
  if (!defaultDb) {
    defaultDb = openDatabase(':memory:');
  }
  return defaultDb;
}

function setDefaultDb(db) {
  defaultDb = db;
}

function closeDefaultDb() {
  if (defaultDb) {
    defaultDb.close();
    defaultDb = null;
  }
}

module.exports = {
  openDatabase,
  getDb,
  setDefaultDb,
  closeDefaultDb,
};
