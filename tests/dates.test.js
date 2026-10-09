const { today, addDays } = require('../src/logic/dates');

describe('dates', () => {
  test('today returns YYYY-MM-DD', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('addDays rolls across month boundaries', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addDays('2026-10-08', 3)).toBe('2026-10-11');
  });
});
