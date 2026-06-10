import { it, expect, describe } from 'vitest';

import { CompanySchema } from './company-create-view';

// ----------------------------------------------------------------------

describe('CompanySchema', () => {
  it("faqat name bilan o'tadi", () => {
    const result = CompanySchema.safeParse({ name: 'Test Kompaniya' });
    expect(result.success).toBe(true);
  });

  it("barcha maydonlar bilan o'tadi", () => {
    const result = CompanySchema.safeParse({
      name: 'Karimov Holding',
      description: 'Yirik kompaniya',
      logo_url: 'https://example.com/logo.png',
      billing_day: 25,
    });
    expect(result.success).toBe(true);
  });

  it("bo'sh name ni rad etadi", () => {
    const result = CompanySchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('name');
    expect(result.error?.issues[0].message).toBe('Kompaniya nomi majburiy');
  });

  it("name yo'q bo'lsa rad etadi", () => {
    const result = CompanySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("billing_day 1 dan 31 gacha qabul qiladi", () => {
    expect(CompanySchema.safeParse({ name: 'Test', billing_day: 1 }).success).toBe(true);
    expect(CompanySchema.safeParse({ name: 'Test', billing_day: 28 }).success).toBe(true);
    expect(CompanySchema.safeParse({ name: 'Test', billing_day: 31 }).success).toBe(true);
  });

  it("billing_day 0 ni rad etadi", () => {
    const result = CompanySchema.safeParse({ name: 'Test', billing_day: 0 });
    expect(result.success).toBe(false);
  });

  it("billing_day 32 ni rad etadi", () => {
    const result = CompanySchema.safeParse({ name: 'Test', billing_day: 32 });
    expect(result.success).toBe(false);
  });

  it("billing_day null qabul qiladi", () => {
    const result = CompanySchema.safeParse({ name: 'Test', billing_day: null });
    expect(result.success).toBe(true);
  });

  it("description va logo_url ixtiyoriy", () => {
    const result = CompanySchema.safeParse({ name: 'Test' });
    expect(result.success).toBe(true);
  });
});
