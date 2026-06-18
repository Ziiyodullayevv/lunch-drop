import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

export type WorkspacesPopoverProps = {
  data?: {
    id: string;
    name: string;
    logo: string;
    plan: string;
  }[];
  sx?: SxProps<Theme>;
};

function WorkspaceIcon({ role }: { role: string }) {
  if (role === 'super_admin') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none" />
        <path
          fill="currentColor"
          d="M12 2c6.158 0 10.007 6.667 6.928 12A8 8 0 0 1 17 16.245v4.61a1.1 1.1 0 0 1-1.486 1.03L12 20.569l-3.514 1.318A1.1 1.1 0 0 1 7 20.856v-4.61C2.192 12.398 3.352 4.788 9.089 2.548A8 8 0 0 1 12 2"
          opacity=".3"
        />
        <path
          fill="currentColor"
          d="M12 6c3.079 0 5.004 3.333 3.464 6A4 4 0 0 1 12 14c-3.079 0-5.004-3.333-3.464-6A4 4 0 0 1 12 6"
        />
      </svg>
    );
  }

  if (role === 'company_admin') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24">
        <path d="M0 0h24v24H0z" fill="none" />
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M13 3a2 2 0 0 1 1.995 1.85L15 5v14h1V9.5a.5.5 0 0 1 .41-.492L16.5 9H18a2 2 0 0 1 1.995 1.85L20 11v8h1a1 1 0 0 1 .117 1.993L21 21H3a1 1 0 0 1-.117-1.993L3 19h1V5a2 2 0 0 1 1.85-1.995L6 3z"
          opacity=".3"
        />
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M11 7H8v2h3zm0 4H8v2h3zm0 4H8v2h3z"
        />
      </svg>
    );
  }

  // kitchen_admin (default)
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none" />
      <path
        fill="currentColor"
        d="M9 14h2V9H9zm-4 2v-3.5q-1.15-.575-1.825-1.662T2.5 8.475Q2.5 6.6 3.788 5.3T6.95 4q.3 0 .613.05t.612.125Q8.8 3.15 9.8 2.575T12 2t2.2.575t1.625 1.6q.3-.075.6-.125T17.05 4q1.875 0 3.163 1.3T21.5 8.475q0 1.275-.675 2.363T19 12.5V16zm8-2h2V9h-2zm-8 8v-4h14v4z"
      />
    </svg>
  );
}

export function WorkspacesPopover({ data = [], sx }: WorkspacesPopoverProps) {
  const workspace = data[0];

  return (
    <Box
      sx={[
        { display: 'flex', alignItems: 'center', gap: 1 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {workspace?.logo ? (
        <Box
          component="img"
          alt={workspace.name}
          src={workspace.logo}
          sx={{ width: 40, height: 40, borderRadius: '8px', flexShrink: 0, objectFit: 'cover' }}
        />
      ) : (
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '8px',
            bgcolor: 'grey.200',
            color: 'grey.600',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <WorkspaceIcon role={workspace?.id ?? ''} />
        </Box>
      )}

      <Box
        component="span"
        sx={{ typography: 'subtitle2', display: { xs: 'none', sm: 'inline-flex' } }}
      >
        {workspace?.name}
      </Box>
    </Box>
  );
}
