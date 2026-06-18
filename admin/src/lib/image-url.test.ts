import { it, expect, describe } from 'vitest';

import { getImagePreviewUrl } from './image-url';

describe('getImagePreviewUrl', () => {
  it('proxies relative backend paths', () => {
    expect(getImagePreviewUrl('/media/logos/logo.png', 'http://backend.test')).toBe(
      '/api/image?path=%2Fmedia%2Flogos%2Flogo.png'
    );
  });

  it('proxies URLs served by the configured backend', () => {
    expect(
      getImagePreviewUrl(
        'http://backend.test/media/logos/logo.png?version=1',
        'http://backend.test'
      )
    ).toBe('/api/image?path=%2Fmedia%2Flogos%2Flogo.png%3Fversion%3D1');
  });

  it('keeps external CDN URLs unchanged', () => {
    const url = 'https://cdn.example.com/logos/logo.png';

    expect(getImagePreviewUrl(url, 'http://backend.test')).toBe(url);
  });
});
