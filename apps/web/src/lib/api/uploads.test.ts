import { it, vi, expect, describe, beforeEach } from 'vitest';

import axiosInstance from 'src/lib/axios';

import { uploadImage } from './uploads';

vi.mock('src/lib/axios', () => ({
  default: {
    post: vi.fn(),
  },
}));

const mockAxios = vi.mocked(axiosInstance);

describe('uploadImage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads company logos with the logos prefix', async () => {
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    const response = { url: 'http://backend.test/media/logos/logo.png' };
    mockAxios.post.mockResolvedValueOnce({ data: response });

    await expect(uploadImage(file)).resolves.toEqual(response);
    expect(mockAxios.post).toHaveBeenCalledWith(
      '/api/v1/uploads/image?prefix=logos',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  });
});
