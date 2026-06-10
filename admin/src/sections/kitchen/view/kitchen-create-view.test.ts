import { it, expect, describe } from 'vitest';

import { KitchenSchema } from './kitchen-create-view';

// ----------------------------------------------------------------------

describe('KitchenSchema', () => {
  it("minimal to'g'ri ma'lumotlar bilan o'tadi", () => {
    const result = KitchenSchema.safeParse({ name: 'Ali Kitchen', is_active: true });
    expect(result.success).toBe(true);
  });

  it("barcha maydonlar bilan o'tadi", () => {
    const result = KitchenSchema.safeParse({
      name:                "Ali's Kitchen",
      description:         'Halol ovqatlar',
      phone:               '+998901234567',
      order_cutoff_time:   '11:00',
      delivery_start_time: '12:00',
      delivery_end_time:   '13:00',
      is_active:           true,
      latitude:            '41.2995',
      longitude:           '69.2401',
    });
    expect(result.success).toBe(true);
  });

  it("bo'sh name ni rad etadi", () => {
    const result = KitchenSchema.safeParse({ name: '', is_active: true });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('name');
  });

  it("name yo'q bo'lsa rad etadi", () => {
    const result = KitchenSchema.safeParse({ is_active: true });
    expect(result.success).toBe(false);
  });

  it("is_active boolean bo'lishi kerak", () => {
    const valid = KitchenSchema.safeParse({ name: 'Kitchen', is_active: false });
    expect(valid.success).toBe(true);
  });
});
