'use client';

import type { MapRef } from 'react-map-gl/maplibre';
import type { Theme, SxProps } from '@mui/material/styles';
import type { GeolocateCoords } from './use-geolocate';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { Iconify } from 'src/components/iconify';

import { useGeolocate } from './use-geolocate';

// ----------------------------------------------------------------------

type Props = {
  /** Xarita ref'i — joylashuv topilganda `flyTo` uchun ishlatiladi */
  mapRef: React.RefObject<MapRef | null>;
  /** Joylashuv topilganda chaqiriladi (marker + form qiymatlarini yangilash uchun) */
  onLocate: (coords: GeolocateCoords) => void;
  /** flyTo zoom darajasi. Default: 15 */
  zoom?: number;
  /** Overlay tugma joylashuvini override qilish */
  sx?: SxProps<Theme>;
};

export function MapLocateButton({ mapRef, onLocate, zoom = 15, sx }: Props) {
  const { locate, loading } = useGeolocate((coords) => {
    onLocate(coords);
    mapRef.current?.flyTo({
      center: [coords.longitude, coords.latitude],
      zoom,
      duration: 1200,
    });
  });

  return (
    <Tooltip title="Mening joylashuvim" placement="right">
      <Box
        component="span"
        sx={[
          { position: 'absolute', top: 49, left: 10, zIndex: 1 },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        <IconButton
          onClick={locate}
          disabled={loading}
          size="small"
          sx={{
            width: 29,
            height: 29,
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 1,
            '&:hover': { bgcolor: 'grey.100' },
            '&.Mui-disabled': { bgcolor: 'background.paper' },
          }}
        >
          {loading ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <Iconify icon="mingcute:location-fill" width={18} />
          )}
        </IconButton>
      </Box>
    </Tooltip>
  );
}
