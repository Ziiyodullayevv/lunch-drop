import { it, expect, describe } from 'vitest';

import { BranchSchema } from './branch-create-view';

// ----------------------------------------------------------------------

describe('BranchSchema', () => {
  it("to'g'ri ma'lumotlar bilan o'tadi", () => {
    const result = BranchSchema.safeParse({
      company_id: 'uuid-123',
      name:       'Chilonzor filiali',
      address:    'Chilonzor 4-kvartal',
    });
    expect(result.success).toBe(true);
  });

  it("company_id majburiy", () => {
    const result = BranchSchema.safeParse({
      name:    'Test filial',
      address: 'Manzil',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('company_id');
  });

  it("bo'sh company_id ni rad etadi", () => {
    const result = BranchSchema.safeParse({
      company_id: '',
      name:       'Test',
      address:    'Manzil',
    });
    expect(result.success).toBe(false);
  });

  it("name majburiy", () => {
    const result = BranchSchema.safeParse({
      company_id: 'uuid-123',
      name:       '',
      address:    'Manzil',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Filial nomi majburiy');
  });

  it("address majburiy", () => {
    const result = BranchSchema.safeParse({
      company_id: 'uuid-123',
      name:       'Test',
      address:    '',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe('Manzil majburiy');
  });

  it("latitude va longitude optional", () => {
    const result = BranchSchema.safeParse({
      company_id: 'uuid-123',
      name:       'Test',
      address:    'Manzil',
      latitude:   '41.2995',
      longitude:  '69.2401',
    });
    expect(result.success).toBe(true);
  });
});
