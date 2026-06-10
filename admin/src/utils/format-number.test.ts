import { it, expect, describe } from 'vitest';

import { fData, fNumber, fPercent, fCurrency, fShortenNumber } from './format-number';

// ----------------------------------------------------------------------

describe('fCurrency', () => {
  it("musbat qiymatni formatlaydi (raqam bo'sh emas)", () => {
    const result = fCurrency(50000);
    expect(result).toBeTruthy();
    expect(result).toContain('50');
  });

  it("nol qiymat formatlaydi", () => {
    const result = fCurrency(0);
    expect(result).toContain('0');
  });

  it('null bo\'sh string qaytaradi', () => {
    expect(fCurrency(null)).toBe('');
  });

  it('undefined bo\'sh string qaytaradi', () => {
    expect(fCurrency(undefined)).toBe('');
  });
});

// ----------------------------------------------------------------------

describe('fNumber', () => {
  it('raqamni lokalizatsiya bilan formatlaydi', () => {
    const result = fNumber(1000);
    expect(result).toBeTruthy();
    expect(result).toContain('1');
  });

  it('null bo\'sh string qaytaradi', () => {
    expect(fNumber(null)).toBe('');
  });

  it('NaN bo\'sh string qaytaradi', () => {
    expect(fNumber(NaN)).toBe('');
  });
});

// ----------------------------------------------------------------------

describe('fPercent', () => {
  it("100 ni '100%' ga o'xshash formatlaydi", () => {
    const result = fPercent(100);
    expect(result).toContain('100');
  });

  it("50 ni '50%' ga o'xshash formatlaydi", () => {
    const result = fPercent(50);
    expect(result).toContain('50');
  });

  it('null bo\'sh string qaytaradi', () => {
    expect(fPercent(null)).toBe('');
  });
});

// ----------------------------------------------------------------------

describe('fShortenNumber', () => {
  it('1 000 000 ni qisqartiradi', () => {
    const result = fShortenNumber(1_000_000);
    expect(result.toLowerCase()).toMatch(/m|mln/);
  });

  it('kichik raqamni o\'zgartirmaydi', () => {
    const result = fShortenNumber(500);
    expect(result).toContain('500');
  });

  it('null bo\'sh string qaytaradi', () => {
    expect(fShortenNumber(null)).toBe('');
  });
});

// ----------------------------------------------------------------------

describe('fData', () => {
  it("0 ni '0 bytes' qaytaradi", () => {
    expect(fData(0)).toBe('0 bytes');
  });

  it('1024 ni Kb ga aylantiradi', () => {
    expect(fData(1024)).toContain('Kb');
  });

  it('1024 * 1024 ni Mb ga aylantiradi', () => {
    expect(fData(1024 * 1024)).toContain('Mb');
  });

  it('null 0 bytes qaytaradi', () => {
    expect(fData(null)).toBe('0 bytes');
  });
});
