'use client';

import type { Theme, SxProps } from '@mui/material/styles';

import dayjs from 'dayjs';
import { Controller, useFormContext } from 'react-hook-form';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// ----------------------------------------------------------------------

const UZB_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5

/** Returns the current date in Uzbekistan Standard Time (UTC+5). */
function nowUzb(): dayjs.Dayjs {
  return dayjs(Date.now() + UZB_OFFSET_MS);
}

/**
 * Given a stored billing day number (1–31), resolves the next upcoming
 * calendar date using Uzbekistan time:
 *   - If today's UZB day has already passed the stored day → next month
 *   - Otherwise → current month
 * The day is clamped to the target month's actual length (handles 29–31).
 */
function resolveCalendarValue(dayNum: number | null): dayjs.Dayjs | null {
  if (!dayNum) return null;

  const uzb = nowUzb();
  const base = uzb.date() > dayNum ? uzb.add(1, 'month') : uzb;
  const clamped = Math.min(dayNum, base.daysInMonth());

  return base.date(clamped).startOf('day');
}

// ----------------------------------------------------------------------

type Props = {
  name: string;
  label?: string;
  sx?: SxProps<Theme>;
};

// ----------------------------------------------------------------------

export function RHFBillingDayPicker({ name, label, sx }: Props) {
  const { control } = useFormContext();

  // Minimum selectable date = today in UZB time
  const minDate = nowUzb().startOf('day');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const dayNum = field.value != null ? Number(field.value) : null;
        const calendarValue = resolveCalendarValue(dayNum);

        const helperText =
          error?.message ??
          (dayNum && dayNum >= 29 ? "* Ba'zi oylarda oy oxirgi kunida to'lanadi" : undefined);

        return (
          <DatePicker
            label={label}
            value={calendarValue}
            onChange={(date) => {
              if (!date) {
                field.onChange(null);
                return;
              }
              // Store only the day-of-month number, not the full date
              field.onChange(date.date());
            }}
            minDate={minDate}
            sx={sx}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!error,
                helperText,
                inputRef: field.ref,
                onBlur: field.onBlur,
              },
            }}
          />
        );
      }}
    />
  );
}
