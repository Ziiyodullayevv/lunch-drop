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

function resolveCalendarValue(dayNum: number | null): dayjs.Dayjs | null {
  if (!dayNum) return null;

  const uzb = nowUzb();
  const currentMonth = uzb.startOf('month');
  const nextMonth = currentMonth.add(1, 'month');

  if (dayNum <= currentMonth.daysInMonth()) {
    return currentMonth.date(dayNum).startOf('day');
  }

  if (dayNum <= nextMonth.daysInMonth()) {
    return nextMonth.date(dayNum).startOf('day');
  }

  return null;
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

  const minDate = nowUzb().startOf('month');
  const maxDate = minDate.add(1, 'month').endOf('month');

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const dayNum = field.value != null ? Number(field.value) : null;
        const calendarValue = resolveCalendarValue(dayNum);

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
            maxDate={maxDate}
            sx={sx}
            slotProps={{
              textField: {
                fullWidth: true,
                error: !!error,
                helperText: error?.message,
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
