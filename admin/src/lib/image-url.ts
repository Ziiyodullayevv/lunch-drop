const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL;

export function getImagePreviewUrl(url: string, serverUrl = SERVER_URL): string {
  if (!url || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  if (url.startsWith('/')) {
    return `/api/image?path=${encodeURIComponent(url)}`;
  }

  if (!serverUrl) {
    return url;
  }

  try {
    const imageUrl = new URL(url);
    const backendUrl = new URL(serverUrl);

    if (imageUrl.origin !== backendUrl.origin) {
      return url;
    }

    return `/api/image?path=${encodeURIComponent(`${imageUrl.pathname}${imageUrl.search}`)}`;
  } catch {
    return url;
  }
}
