import dayjs from 'dayjs';
import { it, expect, describe } from 'vitest';

import { formatNotificationTime } from './notification-item';

describe('formatNotificationTime', () => {
  const now = dayjs('2026-06-15T12:00:00Z');

  it('aniq daqiqa farqini hisoblaydi', () => {
    expect(formatNotificationTime('2026-06-15T11:40:00Z', now)).toBe('20 daqiqa');
  });

  it('aniq soat farqini hisoblaydi', () => {
    expect(formatNotificationTime('2026-06-15T07:00:00Z', now)).toBe('5 soat');
  });

  it('kelajakdagi vaqtni hozirgina deb chiqaradi', () => {
    expect(formatNotificationTime('2026-06-15T12:01:00Z', now)).toBe('Hozirgina');
  });
});
