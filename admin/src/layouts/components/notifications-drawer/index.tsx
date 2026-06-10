'use client';

import type { IconButtonProps } from '@mui/material/IconButton';

import { m } from 'framer-motion';
import { useState, useCallback } from 'react';
import { useBoolean } from 'minimal-shared/hooks';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { varTap, varHover, transitionTap } from 'src/components/animate';

import { NotificationItem } from './notification-item';
import { useNotifications } from './use-notifications';

// ----------------------------------------------------------------------

export type NotificationsDrawerProps = IconButtonProps;

export function NotificationsDrawer({ sx, ...other }: NotificationsDrawerProps) {
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();
  const [currentTab, setCurrentTab] = useState('all');

  const { notifications, unreadCount, loading, markAsRead, markAllRead, approve, decline } = useNotifications();

  const handleChangeTab = useCallback((_: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
  }, []);

  const filtered = notifications.filter((n) => {
    if (currentTab === 'unread') return !n.is_read;
    if (currentTab === 'archived') return n.is_read;
    return true;
  });

  const tabs = [
    { value: 'all', label: 'Hammasi', count: notifications.length },
    { value: 'unread', label: "O'qilmagan", count: unreadCount },
    { value: 'archived', label: "O'qilgan", count: notifications.length - unreadCount },
  ];

  const renderHead = () => (
    <Box sx={{ py: 2, pr: 1, pl: 2.5, minHeight: 68, display: 'flex', alignItems: 'center' }}>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        Bildirishnomalar
      </Typography>

      {!!unreadCount && (
        <Tooltip title="Barchasini o'qilgan deb belgilash">
          <IconButton color="primary" onClick={markAllRead}>
            <Iconify icon="eva:done-all-fill" />
          </IconButton>
        </Tooltip>
      )}

      <IconButton onClick={onClose} sx={{ display: { xs: 'inline-flex', sm: 'none' } }}>
        <Iconify icon="mingcute:close-line" />
      </IconButton>
    </Box>
  );

  const renderTabs = () => (
    <Tabs variant="fullWidth" value={currentTab} onChange={handleChangeTab} indicatorColor="custom">
      {tabs.map((tab) => (
        <Tab
          key={tab.value}
          iconPosition="end"
          value={tab.value}
          label={tab.label}
          icon={
            <Label
              variant={((tab.value === 'all' || tab.value === currentTab) && 'filled') || 'soft'}
              color={
                (tab.value === 'unread' && 'info') ||
                (tab.value === 'archived' && 'success') ||
                'default'
              }
            >
              {tab.count}
            </Label>
          }
        />
      ))}
    </Tabs>
  );

  const renderList = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress size={28} />
        </Box>
      );
    }

    if (!filtered.length) {
      return (
        <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary', typography: 'body2' }}>
          Bildirishnoma yo'q
        </Box>
      );
    }

    return (
      <Scrollbar>
        <Box component="ul">
          {filtered.map((n) => (
            <Box component="li" key={n.id} sx={{ display: 'flex' }}>
              <NotificationItem
                notification={{
                  ...n,
                  isUnRead: !n.is_read,
                  avatarUrl: null,
                }}
                onRead={markAsRead}
                onApprove={approve}
                onDecline={decline}
              />
            </Box>
          ))}
        </Box>
      </Scrollbar>
    );
  };

  return (
    <>
      <IconButton
        component={m.button}
        whileTap={varTap(0.96)}
        whileHover={varHover(1.04)}
        transition={transitionTap()}
        aria-label="Notifications button"
        onClick={onOpen}
        sx={sx}
        {...other}
      >
        <Badge badgeContent={unreadCount || undefined} color="error">
          <Iconify width={24} icon="solar:bell-bing-bold-duotone" />
        </Badge>
      </IconButton>

      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        slotProps={{
          backdrop: { invisible: true },
          paper: { sx: { width: 1, maxWidth: 420 } },
        }}
      >
        {renderHead()}
        {renderTabs()}
        {renderList()}

        <Box sx={{ p: 1 }}>
          <Button fullWidth size="large" onClick={onClose}>
            Yopish
          </Button>
        </Box>
      </Drawer>
    </>
  );
}
