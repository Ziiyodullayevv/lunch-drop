'use client';

import { useRef, useState, useCallback } from 'react';

import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export type GeolocateCoords = { latitude: number; longitude: number };

type Options = {
  /** Maksimal kutish vaqti (ms). Default: 12000 */
  timeout?: number;
  /** Keshlangan joylashuvni qabul qilish oralig'i (ms). Default: 60000 */
  maximumAge?: number;
};

// Bir xil id — takroriy xato toastlari ustma-ust chiqmaydi (faqat bittasi yangilanadi)
const TOAST_ID = 'geolocate';

/**
 * IP manzil orqali taxminiy joylashuvni qaytaradi (shahar darajasida aniq).
 * Bir nechta bepul provayder ketma-ket sinaladi (key talab qilmaydi, CORS OK).
 */
async function fetchIpLocation(): Promise<GeolocateCoords | null> {
  const providers: Array<() => Promise<GeolocateCoords | null>> = [
    async () => {
      const res = await fetch('https://ipwho.is/');
      const data = await res.json();
      return data?.success !== false && data?.latitude != null
        ? { latitude: Number(data.latitude), longitude: Number(data.longitude) }
        : null;
    },
    async () => {
      const res = await fetch('https://get.geojs.io/v1/ip/geo.json');
      const data = await res.json();
      return data?.latitude != null
        ? { latitude: Number(data.latitude), longitude: Number(data.longitude) }
        : null;
    },
  ];

  for (const provider of providers) {
    try {
      const coords = await provider();
      if (coords && Number.isFinite(coords.latitude) && Number.isFinite(coords.longitude)) {
        return coords;
      }
    } catch {
      // keyingi provayderga o'tamiz
    }
  }
  return null;
}

/**
 * Browser geolokatsiyasini xavfsiz so'raydigan reusable hook.
 *
 * - `watchPosition` ishlatadi (birinchi natijada to'xtatadi): macOS/Chrome'da
 *   `getCurrentPosition` ko'pincha POSITION_UNAVAILABLE qaytaradi.
 * - **IP fallback**: brauzer geolokatsiyasi ishlamasa (macOS CoreLocation
 *   "Position update is unavailable" muammosi), IP orqali taxminiy joylashuv
 *   olinadi — shunda funksiya har doim natija beradi.
 * - Concurrent lock + dedupe toast + barqaror (stable) `locate`.
 */
export function useGeolocate(onSuccess: (coords: GeolocateCoords) => void, options?: Options) {
  const activeRef = useRef(false);
  const successRef = useRef(onSuccess);
  successRef.current = onSuccess;

  const [loading, setLoading] = useState(false);

  const { timeout = 12000, maximumAge = 60000 } = options ?? {};

  const locate = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      // navigator.geolocation yo'q bo'lsa to'g'ridan-to'g'ri IP fallback
      runIpOnly();
      return;
    }

    if (activeRef.current) return;
    activeRef.current = true;
    setLoading(true);

    let settled = false; // yakuniy holat (success yoki final error)
    let fallbackStarted = false; // IP fallback bir marta
    let watchId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearWatchers = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (timer !== null) clearTimeout(timer);
      watchId = null;
      timer = null;
    };

    const stopLoading = () => {
      activeRef.current = false;
      setLoading(false);
    };

    const succeed = (coords: GeolocateCoords, approximate: boolean) => {
      if (settled) return;
      settled = true;
      clearWatchers();
      stopLoading();
      if (approximate) {
        toast.info(
          "Aniq joylashuv olinmadi — taxminiy (IP) joylashuv ko'rsatildi. Markerni to'g'rilang.",
          { id: TOAST_ID, duration: 6000 }
        );
      } else {
        toast.dismiss(TOAST_ID);
      }
      successRef.current(coords);
    };

    const failFinal = () => {
      if (settled) return;
      settled = true;
      clearWatchers();
      stopLoading();
      toast.error("Joylashuv aniqlanmadi. Markerni qo'lda sudrab o'rnating.", { id: TOAST_ID });
    };

    const startIpFallback = () => {
      if (fallbackStarted || settled) return;
      fallbackStarted = true;
      clearWatchers();
      fetchIpLocation().then((coords) => {
        if (coords) succeed(coords, true);
        else failFinal();
      });
    };

    const handleError = (err: GeolocationPositionError) => {
      console.error('[geolocate] browser error', { code: err.code, message: err.message });
      // Ruxsat rad etilgan bo'lsa ham IP fallback foydali (taxminiy joylashuv)
      startIpFallback();
    };

    // Brauzer juda uzoq kutsa — IP fallback'ga o'tamiz
    timer = setTimeout(startIpFallback, timeout);

    watchId = navigator.geolocation.watchPosition(
      (pos) => succeed({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }, false),
      handleError,
      { enableHighAccuracy: false, timeout, maximumAge }
    );

    function runIpOnly() {
      if (activeRef.current) return;
      activeRef.current = true;
      setLoading(true);
      fetchIpLocation().then((coords) => {
        activeRef.current = false;
        setLoading(false);
        if (coords) {
          toast.info(
            "Aniq joylashuv olinmadi — taxminiy (IP) joylashuv ko'rsatildi. Markerni to'g'rilang.",
            { id: TOAST_ID, duration: 6000 }
          );
          successRef.current(coords);
        } else {
          toast.error("Joylashuv aniqlanmadi. Markerni qo'lda sudrab o'rnating.", { id: TOAST_ID });
        }
      });
    }
  }, [timeout, maximumAge]);

  return { locate, loading };
}
