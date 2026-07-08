'use client';

import type { Ref } from 'react';
import type {
  ScaleControlProps,
  GeolocateControlProps,
  FullscreenControlProps,
  NavigationControlProps,
} from 'react-map-gl/maplibre';

import {
  ScaleControl,
  GeolocateControl,
  NavigationControl,
  FullscreenControl,
} from 'react-map-gl/maplibre';

// ----------------------------------------------------------------------

export type MapControlsProps = {
  hideScale?: boolean;
  hideGeolocate?: boolean;
  hideFullscreen?: boolean;
  hideNavigation?: boolean;
  geolocateRef?: Ref<any>;
  slotProps?: {
    scale?: ScaleControlProps;
    geolocate?: GeolocateControlProps;
    fullscreen?: FullscreenControlProps;
    navigation?: NavigationControlProps;
  };
};

export function MapControls({
  hideScale,
  hideGeolocate,
  hideFullscreen,
  hideNavigation,
  geolocateRef,
  slotProps,
}: MapControlsProps) {
  return (
    <>
      {!hideGeolocate && (
        <GeolocateControl
          ref={geolocateRef}
          position="top-left"
          {...slotProps?.geolocate}
          positionOptions={{ enableHighAccuracy: false, timeout: 10000, ...slotProps?.geolocate?.positionOptions }}
        />
      )}
      {!hideFullscreen && <FullscreenControl position="top-left" {...slotProps?.fullscreen} />}
      {!hideScale && <ScaleControl position="bottom-left" {...slotProps?.scale} />}
      {!hideNavigation && <NavigationControl position="bottom-left" {...slotProps?.navigation} />}
    </>
  );
}
