'use client';

import type { MarkerProps } from 'react-map-gl/maplibre';
import type { Theme, SxProps } from '@mui/material/styles';

import { Marker } from 'react-map-gl/maplibre';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

export type MapMarkerProps = MarkerProps & {
  sx?: SxProps<Theme>;
  label?: string;
  markerColor?: string;
  active?: boolean;
};

export function MapMarker({
  sx,
  label = 'L',
  markerColor = '#FF5630',
  active = false,
  anchor = 'bottom',
  ...other
}: MapMarkerProps) {
  return (
    <Marker anchor={anchor} {...other}>
      <Box
        sx={[
          {
            position: 'relative',
            width: 38,
            height: 46,
            cursor: other.draggable ? 'grab' : 'pointer',
            transform: active ? 'scale(1.12)' : 'scale(1)',
            transformOrigin: '50% 100%',
            transition: 'transform 160ms ease-out',
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {active && (
          <Box
            sx={{
              position: 'absolute',
              top: -4,
              left: '50%',
              width: 42,
              height: 42,
              borderRadius: '50%',
              bgcolor: `${markerColor}24`,
              border: `2px solid ${markerColor}42`,
              transform: 'translateX(-50%)',
            }}
          />
        )}
        <Box
          sx={{
            position: 'absolute',
            top: 1,
            left: '50%',
            width: 34,
            height: 34,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50% 50% 50% 7px',
            bgcolor: markerColor,
            border: '3px solid #FFFFFF',
            boxShadow: '0 5px 12px rgba(31, 41, 55, 0.28)',
            transform: 'translateX(-50%) rotate(-45deg)',
          }}
        >
          <Box
            component="span"
            sx={{
              color: '#FFFFFF',
              fontSize: 15,
              lineHeight: 1,
              fontWeight: 900,
              textTransform: 'uppercase',
              transform: 'rotate(45deg)',
              textShadow: '0 1px 2px rgba(0,0,0,0.16)',
            }}
          >
            {label.slice(0, 1)}
          </Box>
        </Box>
      </Box>
    </Marker>
  );
}
