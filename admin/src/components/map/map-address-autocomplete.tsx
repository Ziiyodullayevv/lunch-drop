'use client';

import { useState, useEffect } from 'react';

import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';

export type MapAddressSuggestion = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: MapAddressSuggestion) => void;
  latitude?: number;
  longitude?: number;
  label?: string;
  error?: boolean;
  helperText?: React.ReactNode;
};

export function MapAddressAutocomplete({
  value,
  onChange,
  onSelect,
  latitude,
  longitude,
  label = 'Manzil',
  error,
  helperText,
}: Props) {
  const [options, setOptions] = useState<MapAddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3) {
      setOptions([]);
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (latitude != null && longitude != null) {
          params.set('lat', String(latitude));
          params.set('lng', String(longitude));
        }
        const response = await fetch(`/api/geocode?${params}`, { signal: controller.signal });
        const data = response.ok
          ? ((await response.json()) as { items?: MapAddressSuggestion[] })
          : { items: [] };
        setOptions(data.items ?? []);
      } catch (requestError) {
        if ((requestError as Error).name !== 'AbortError') setOptions([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [latitude, longitude, value]);

  return (
    <Autocomplete
      freeSolo
      filterOptions={(items) => items}
      options={options}
      loading={loading}
      inputValue={value}
      getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
      isOptionEqualToValue={(option, selected) =>
        typeof selected !== 'string' && option.id === selected.id
      }
      onInputChange={(_, nextValue, reason) => {
        if (reason === 'input' || reason === 'clear') onChange(nextValue);
      }}
      onChange={(_, selected) => {
        if (typeof selected === 'string') {
          onChange(selected);
        } else if (selected) {
          onChange(selected.label);
          onSelect(selected);
        }
      }}
      noOptionsText={value.trim().length < 3 ? 'Kamida 3 ta belgi kiriting' : 'Manzil topilmadi'}
      loadingText="Manzillar qidirilmoqda..."
      renderInput={(params) => {
        const { slotProps, ...textFieldProps } = params;
        return (
          <TextField
            {...textFieldProps}
            label={label}
            error={error}
            helperText={helperText}
            slotProps={{
              ...slotProps,
              inputLabel: { ...slotProps.inputLabel, shrink: true },
              htmlInput: { ...slotProps.htmlInput, autoComplete: 'off' },
            }}
          />
        );
      }}
    />
  );
}
