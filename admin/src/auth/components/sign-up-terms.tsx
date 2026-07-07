import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

export function SignUpTerms({ sx, ...other }: BoxProps) {
  return (
    <Box
      component="span"
      sx={[
        () => ({
          mt: 3,
          display: 'block',
          textAlign: 'center',
          typography: 'caption',
          color: 'text.secondary',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {'By signing up, I agree to '}
      <Link underline="always" sx={{ color: 'text.primary' }}>
        Terms of service
      </Link>
      {' and '}
      <Link href={paths.privacyPolicy} underline="always" sx={{ color: 'text.primary' }}>
        Privacy policy
      </Link>
      .
    </Box>
  );
}
