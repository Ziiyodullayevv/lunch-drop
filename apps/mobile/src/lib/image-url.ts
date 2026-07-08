export function getImagePreviewUrl(url?: string | null): string | undefined {
  if (!url) return undefined;

  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file:') ||
    url.startsWith('content:') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  return undefined;
}
