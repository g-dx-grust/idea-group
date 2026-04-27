import { describe, expect, it } from 'vitest';
import { toWareki, toWarekiShort } from '@/lib/wareki';

describe('wareki', () => {
  it('formats reiwa dates', () => {
    const date = new Date(2026, 3, 25);
    expect(toWareki(date)).toBe('令和8年4月25日');
  });

  it('formats short era codes', () => {
    expect(toWarekiShort(new Date(2019, 4, 1))).toBe('R1');
  });
});
