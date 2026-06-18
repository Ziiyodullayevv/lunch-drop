import dayjs from 'dayjs';
import { it, expect, describe } from 'vitest';

import { KitchenSchema, buildKitchenCreatePayload } from './kitchen-create-view';

// ----------------------------------------------------------------------

describe('KitchenSchema', () => {
  it("minimal to'g'ri ma'lumotlar bilan o'tadi", () => {
    const result = KitchenSchema.safeParse({
      name: 'Ali Kitchen',
      is_active: true,
      lat: 41.2995,
      lng: 69.2401,
    });
    expect(result.success).toBe(true);
  });

  it("barcha maydonlar bilan o'tadi", () => {
    const result = KitchenSchema.safeParse({
      name: "Ali's Kitchen",
      description: 'Halol ovqatlar',
      phone: '+998901234567',
      image_url: '/uploads/kitchens/ali.png',
      order_cutoff_time: '11:00',
      delivery_start_time: '12:00',
      delivery_end_time: '13:00',
      is_active: true,
      lat: 41.2995,
      lng: 69.2401,
    });
    expect(result.success).toBe(true);
  });

  it("bo'sh name ni rad etadi", () => {
    const result = KitchenSchema.safeParse({
      name: '',
      is_active: true,
      lat: 41.2995,
      lng: 69.2401,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain('name');
  });

  it("name yo'q bo'lsa rad etadi", () => {
    const result = KitchenSchema.safeParse({
      is_active: true,
      lat: 41.2995,
      lng: 69.2401,
    });
    expect(result.success).toBe(false);
  });

  it("is_active boolean bo'lishi kerak", () => {
    const valid = KitchenSchema.safeParse({
      name: 'Kitchen',
      is_active: false,
      lat: 41.2995,
      lng: 69.2401,
    });
    expect(valid.success).toBe(true);
  });

  it('lat va lng majburiy', () => {
    const result = KitchenSchema.safeParse({ name: 'Kitchen', is_active: true });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path[0])).toEqual(
      expect.arrayContaining(['lat', 'lng'])
    );
  });

  it('API payload vaqtlarini HH:mm:ss formatida yuboradi', () => {
    const payload = buildKitchenCreatePayload({
      name: 'Kitchen',
      description: '',
      phone: '',
      image_url: '/uploads/kitchens/kitchen.png',
      order_cutoff_time: dayjs().hour(10).minute(30).second(0),
      delivery_start_time: dayjs().hour(12).minute(30).second(0),
      delivery_end_time: dayjs().hour(13).minute(0).second(0),
      is_active: true,
      lat: 41.2995,
      lng: 69.2401,
    });

    expect(payload).toEqual({
      name: 'Kitchen',
      description: null,
      phone: null,
      image_url: '/uploads/kitchens/kitchen.png',
      order_cutoff_time: '10:30:00',
      delivery_start_time: '12:30:00',
      delivery_end_time: '13:00:00',
      is_active: true,
      lat: 41.2995,
      lng: 69.2401,
    });
  });
});
