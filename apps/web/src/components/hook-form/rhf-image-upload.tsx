'use client';

import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import FormLabel from '@mui/material/FormLabel';

import { uploadImage } from 'src/lib/api/uploads';
import { getImagePreviewUrl } from 'src/lib/image-url';

import { Upload } from 'src/components/upload';

// ----------------------------------------------------------------------

type Props = {
  name: string;
  label?: string;
  helperText?: string;
  prefix?: string;
};

export function RHFImageUpload({ name, label, helperText, prefix }: Props) {
  const { setValue } = useFormContext();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  return (
    <Controller
      name={name}
      render={({ field, fieldState: { error } }) => {
        const currentUrl = (field.value as string) || null;
        const previewUrl = currentUrl ? getImagePreviewUrl(currentUrl) : null;

        const handleDrop = async (acceptedFiles: File[]) => {
          const file = acceptedFiles[0];
          if (!file) return;
          setUploadError('');
          setUploading(true);
          try {
            const { url } = await uploadImage(file, prefix);
            setValue(name, url, { shouldDirty: true, shouldValidate: true });
          } catch (uploadErrorValue) {
            setUploadError(
              uploadErrorValue instanceof Error
                ? uploadErrorValue.message
                : 'Rasmni yuklab bo‘lmadi'
            );
          } finally {
            setUploading(false);
          }
        };

        const handleDelete = () => {
          setUploadError('');
          setValue(name, '', { shouldDirty: true, shouldValidate: true });
        };

        return (
          <>
            {label && (
              <FormLabel sx={{ mb: 1, display: 'block', fontSize: 13, color: 'text.secondary' }}>
                {label}
              </FormLabel>
            )}
            <Upload
              accept={{ 'image/*': [] }}
              value={previewUrl}
              onDrop={handleDrop}
              onDelete={handleDelete}
              loading={uploading}
              error={!!error || !!uploadError}
              helperText={error?.message ?? (uploadError || helperText)}
            />
          </>
        );
      }}
    />
  );
}
