import axiosInstance from 'src/lib/axios';

export async function uploadImage(file: File): Promise<{ url: string }> {
  const form = new FormData();
  form.append('file', file);
  const res = await axiosInstance.post<{ url: string }>('/api/v1/uploads/image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
