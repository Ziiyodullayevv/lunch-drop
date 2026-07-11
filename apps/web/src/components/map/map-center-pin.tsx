import Box from '@mui/material/Box';

type MapCenterPinProps = {
  moving?: boolean;
};

export function MapCenterPin({ moving = false }: MapCenterPinProps) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 30,
        height: 43,
        zIndex: 2,
        pointerEvents: 'none',
        transform: `translate(-50%, ${moving ? '-108%' : '-100%'})`,
        transition: 'transform 160ms ease-out',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          left: '50%',
          bottom: 1,
          width: 12,
          height: 4,
          borderRadius: '50%',
          bgcolor: 'rgba(31, 41, 55, 0.20)',
          filter: 'blur(2px)',
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
          border: '1px solid rgba(255,255,255,0.65)',
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
          borderRadius: '50% 50% 48% 48%',
          bgcolor: '#7600FF',
          border: '2px solid #FFFFFF',
          boxShadow: '0 4px 11px rgba(118, 0, 255, 0.26)',
          transform: 'translateX(-50%)',
        }}
      >
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#FFFFFF' }} />
      </Box>
    </Box>
  );
}
