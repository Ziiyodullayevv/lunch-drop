import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { getImagePreviewUrl } from 'src/lib/image-url';

import { useAuthContext } from 'src/auth/hooks';
import { useTranslate } from 'src/locales/use-locales';

// ----------------------------------------------------------------------

export function NavUpgrade({ sx, ...other }: BoxProps) {
  const { user } = useAuthContext();
  const { t } = useTranslate('common');

  const displayName = user?.name ?? user?.phone ?? '—';
  const roleLabel = user?.role ? t(`user.roles.${user.role}`) : '';
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <Box
      sx={[
        {
          px: 2.5,
          py: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Avatar
        src={user?.avatar_url ? getImagePreviewUrl(user.avatar_url) : undefined}
        alt={displayName}
        sx={{ width: 48, height: 48, mb: 1.5, fontSize: 18 }}
      >
        {initials}
      </Avatar>

      <Typography
        variant="subtitle2"
        noWrap
        sx={{ maxWidth: 1, color: 'var(--layout-nav-text-primary-color)', fontWeight: 700 }}
      >
        {displayName}
      </Typography>

      <Typography
        variant="caption"
        noWrap
        sx={{
          mt: 0.25,
          mb: 1.75,
          maxWidth: 1,
          color: 'var(--layout-nav-text-disabled-color)',
        }}
      >
        {user?.phone ?? '—'}
      </Typography>

      <Chip
        label={roleLabel || t('user.employee')}
        sx={{
          height: 28,
          borderRadius: 1,
          color: 'common.white',
          bgcolor: 'grey.900',
          fontSize: 12,
          fontWeight: 700,
          '& .MuiChip-label': { px: 1.25 },
          '&:hover': { bgcolor: 'grey.900' },
        }}
      />
    </Box>
  );
}
