'use client';

import type { ChangeEvent } from 'react';

import { useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import FormLabel from '@mui/material/FormLabel';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';
import { uploadImage } from 'src/lib/api/uploads';

// ----------------------------------------------------------------------

type Props = {
  name: string;
  label?: string;
};

export function RHFImageUpload({ name, label }: Props) {
  const { setValue } = useFormContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <Controller
      name={name}
      render={({ field, fieldState: { error } }) => {
        const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            const { url } = await uploadImage(file);
            setValue(name, url, { shouldValidate: true });
          } catch {
            // upload error is non-critical — user can retry
          } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
          }
        };

        const currentUrl = field.value as string | undefined;

        return (
          <FormControl fullWidth error={!!error}>
            {label && (
              <FormLabel sx={{ mb: 1, fontSize: 13, color: 'text.secondary' }}>
                {label}
              </FormLabel>
            )}

            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              {currentUrl ? (
                <Avatar
                  src={currentUrl}
                  variant="rounded"
                  sx={{ width: 72, height: 72, flexShrink: 0, bgcolor: 'action.hover' }}
                />
              ) : (
                <Box
                  sx={{
                    width: 72,
                    height: 72,
                    flexShrink: 0,
                    borderRadius: 1.5,
                    border: '1.5px dashed',
                    borderColor: error ? 'error.main' : 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'action.hover',
                  }}
                >
                  <Iconify icon="solar:gallery-add-bold" sx={{ color: 'text.disabled' }} width={28} />
                </Box>
              )}

              <Stack spacing={0.75}>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleChange}
                />
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  disabled={uploading}
                  startIcon={
                    uploading
                      ? <CircularProgress size={14} />
                      : <Iconify icon="eva:cloud-upload-fill" width={16} />
                  }
                  onClick={() => inputRef.current?.click()}
                >
                  {uploading ? 'Yuklanmoqda...' : 'Fayl tanlash'}
                </Button>

                {currentUrl && (
                  <>
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      sx={{ maxWidth: 240, wordBreak: 'break-all', lineHeight: 1.4 }}
                    >
                      {currentUrl}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      variant="text"
                      sx={{ p: 0, minWidth: 0, alignSelf: 'flex-start', fontSize: 12 }}
                      onClick={() => setValue(name, '', { shouldValidate: true })}
                    >
                      O'chirish
                    </Button>
                  </>
                )}
              </Stack>
            </Stack>

            {error && <FormHelperText sx={{ mt: 1 }}>{error.message}</FormHelperText>}
          </FormControl>
        );
      }}
    />
  );
}
