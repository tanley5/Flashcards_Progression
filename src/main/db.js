const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

function openDatabase(dbPath = ':memory:') {
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');
  const schemaPath = path.join(__dirname, '..', '..', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schema);
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
