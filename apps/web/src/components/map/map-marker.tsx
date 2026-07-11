'use client';

import type { MarkerProps } from 'react-map-gl/maplibre';
import type { Theme, SxProps } from '@mui/material/styles';

import { Marker } from 'react-map-gl/maplibre';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

export type MapMarkerProps = MarkerProps & {
  sx?: SxProps<Theme>;
};

export function MapMarker({ sx, ...other }: MapMarkerProps) {
  return (
    <Marker {...other}>
      <Box
        sx={[
          { position: 'relative', width: 30, height: 43, cursor: other.draggable ? 'grab' : 'pointer' },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            width: 12,
            height: 4,
            borderRadius: '50%',
            bgcolor: 'rgba(31, 41, 55, 0.20)',
            filter: 'blur(1.5px)',
            transform: 'translateX(-50%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            left: '50%',
            bottom: 3,
            width: 2,
            height: 16,
            borderRadius: 4,
            bgcolor: '#5B3A78',
            transform: 'translateX(-50%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: '50%',
            width: 30,
            height: 30,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            bgcolor: '#7600FF',
            border: '2px solid #FFFFFF',
            boxShadow: '0 4px 11px rgba(118, 0, 255, 0.26)',
            transform: 'translateX(-50%)',
          }}
        >
          <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#FFFFFF' }} />
        </Box>
      </Box>
    </Marker>
  );
}
