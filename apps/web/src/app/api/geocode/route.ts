import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

type PhotonFeature = {
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    osm_id?: number;
    osm_type?: string;
  };
  geometry?: {
    coordinates?: [number, number];
  };
};

function formatAddress(properties: NonNullable<PhotonFeature['properties']>) {
  const street = [properties.street, properties.housenumber].filter(Boolean).join(' ');
  return [
    properties.name,
    street && street !== properties.name ? street : null,
    properties.district,
    properties.city,
    properties.county,
    properties.state,
    properties.postcode,
    properties.country,
  ]
    .filter(Boolean)
    .filter((part, index, parts) => parts.indexOf(part) === index)
    .join(', ');
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (query.length < 3) {
    return NextResponse.json({ items: [] });
  }

  const url = new URL('/api', 'https://photon.komoot.io');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '6');
  url.searchParams.set('countrycode', 'UZ');

  const lat = request.nextUrl.searchParams.get('lat');
  const lng = request.nextUrl.searchParams.get('lng');
  if (lat && lng) {
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lng);
    url.searchParams.set('zoom', '12');
  }

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 60 * 60 },
    });

    if (!response.ok) {
      return NextResponse.json({ items: [] });
    }

    const data = (await response.json()) as { features?: PhotonFeature[] };
    const items = (data.features ?? []).flatMap((feature) => {
      const coordinates = feature.geometry?.coordinates;
      const properties = feature.properties;
      if (!coordinates || !properties) return [];

      const [lngValue, latValue] = coordinates;
      const label = formatAddress(properties);
      if (!label || !Number.isFinite(latValue) || !Number.isFinite(lngValue)) return [];

      return [{
        id: `${properties.osm_type ?? 'place'}-${properties.osm_id ?? `${lngValue}-${latValue}`}`,
        label,
        lat: latValue,
        lng: lngValue,
      }];
    });

    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ items: [] });
  }
}
