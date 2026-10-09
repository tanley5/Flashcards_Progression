const { openDatabase } = require('../../src/main/db');

function createTestDb() {
  return openDatabase(':memory:');
}

module.exports = { createTestDb };
