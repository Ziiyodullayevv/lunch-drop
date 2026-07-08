import { apiClient } from './client';

export type NativeUploadFile = {
  uri: string;
  name: string;
  type: string;
};

export type UploadImageFile = Blob | File | NativeUploadFile;

function isNativeUploadFile(file: UploadImageFile): file is NativeUploadFile {
  return 'uri' in file && 'name' in file && 'type' in file;
}

export async function uploadImage(
  file: UploadImageFile,
  prefix = 'misc',
  fileName = 'image.jpg'
): Promise<{ url: string }> {
  const form = new FormData();

  if (isNativeUploadFile(file)) {
    form.append('file', file as unknown as Blob);
  } else {
    form.append('file', file as unknown as File, fileName);
  }

  const res = await apiClient.post<{ url: string }>(
    `/uploads/image?prefix=${encodeURIComponent(prefix)}`,
    form,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return res.data;
}
