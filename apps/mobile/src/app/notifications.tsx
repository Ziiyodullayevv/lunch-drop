import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Modal, Platform, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import ReAnimated, { Easing, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';
import { useQueryClient } from '@tanstack/react-query';

import { HeaderBackButton } from '@/components/common/header-back-button';
import { ILLUSTRATIONS } from '@/constants/illustrations';
import { listNotifications, markAllRead, markNotificationRead } from '@/lib/api/notifications';
import { formatUzFullDateTime, formatUzShortDate } from '@/lib/uz-date';
import type { NotificationItem } from '@/lib/api/notifications';

const ACCENT = '#00A76F';

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.045,
  shadowRadius: 8,
  boxShadow: '0px 0px 12px rgba(0,0,0,0.09)',
  elevation: 0,
};

const TYPE_ICON: Record<string, { icon: string; color: string; bg: string }> = {
  order_status:  { icon: 'bell-ring',           color: ACCENT, bg: 'rgba(0,167,111,0.08)' },
  cooking:       { icon: 'room-service',         color: '#F59E0B', bg: 'rgba(245,158,11,0.08)' },
  ready:         { icon: 'bike',                 color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)' },
  delivered:     { icon: 'package-variant-closed', color: '#22C55E', bg: 'rgba(34,197,94,0.08)' },
  cancelled:     { icon: 'close-circle',         color: '#FF3B30', bg: 'rgba(255,59,48,0.08)'  },
  default:       { icon: 'bell',                 color: '#007867', bg: 'rgba(0,120,103,0.08)' },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Hozir';
  if (diffMin < 60) return `${diffMin} daq oldin`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} soat oldin`;
  return formatUzShortDate(d);
}

function formatFullTime(iso: string) {
  return formatUzFullDateTime(iso);
}

function NotificationCard({ item, onPress }: { item: NotificationItem; onPress: (item: NotificationItem) => void }) {
  const meta = TYPE_ICON[item.type] ?? TYPE_ICON.default;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(item)}
    >
      <YStack
        borderRadius={20}
        backgroundColor="#FFFFFF"
        borderWidth={Platform.select({ android: 1, default: 0.5 })}
        borderColor={Platform.select({
          android: item.is_read ? 'rgba(0,0,0,0.08)' : 'rgba(91,228,155,0.25)',
          default: item.is_read ? 'rgba(0,0,0,0.07)' : 'rgba(91,228,155,0.18)',
        })}
        style={CARD_SHADOW}
      >
        <XStack padding={14} gap={12} alignItems="center">
          <YStack
            width={48}
            height={48}
            borderRadius={15}
            backgroundColor={meta.bg}
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <MaterialCommunityIcons name={meta.icon as any} size={23} color={meta.color} />
          </YStack>

          <YStack flex={1} gap={3}>
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontFamily="$heading" fontSize={15} fontWeight="700" color="#1C1C1E" flex={1} numberOfLines={1}>
                {item.title}
              </Text>
              {!item.is_read && (
                <YStack width={7} height={7} borderRadius={4} backgroundColor={ACCENT} marginLeft={8} flexShrink={0} />
              )}
            </XStack>

            {item.body ? (
              <Text fontSize={13} color="#6B7280" lineHeight={18} numberOfLines={1}>
                {item.body}
              </Text>
            ) : null}

            <Text fontSize={12} color="#C7C7CC" fontWeight="600">
              {formatTime(item.created_at)}
            </Text>
          </YStack>
        </XStack>
      </YStack>
    </TouchableOpacity>
  );
}

function NotificationDetailsSheet({
  item,
  onClose,
}: {
  item: NotificationItem | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [displayItem, setDisplayItem] = useState<NotificationItem | null>(null);
  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;
  const sheetTranslateY = useRef(new RNAnimated.Value(360)).current;
  const activeItem = displayItem ?? item;
  const meta = activeItem ? TYPE_ICON[activeItem.type] ?? TYPE_ICON.default : TYPE_ICON.default;

  useEffect(() => {
    if (!item) return;

    setDisplayItem(item);
    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(360);

    requestAnimationFrame(() => {
      RNAnimated.parallel([
        RNAnimated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        RNAnimated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 24,
          stiffness: 260,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [backdropOpacity, item, sheetTranslateY]);

  const closeSheet = () => {
    RNAnimated.parallel([
      RNAnimated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      RNAnimated.timing(sheetTranslateY, {
        toValue: 360,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDisplayItem(null);
      onClose();
    });
  };

  return (
    <Modal
      visible={Boolean(displayItem)}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
    >
      <View style={{ flex: 1 }}>
        <RNAnimated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            opacity: backdropOpacity,
            backgroundColor: 'rgba(0,0,0,0.42)',
          }}
        />
        <TouchableOpacity
          activeOpacity={1}
          onPress={closeSheet}
          style={{ flex: 1, justifyContent: 'flex-end' }}
        >
          <RNAnimated.View style={{ opacity: backdropOpacity }}>
            <View style={{ width: 42, height: 4, backgroundColor: 'rgba(255,255,255,0.58)', borderRadius: 2, alignSelf: 'center', marginBottom: 10 }} />
          </RNAnimated.View>
          <RNAnimated.View style={{ transform: [{ translateY: sheetTranslateY }] }}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <YStack
                backgroundColor="#FFFFFF"
                borderTopLeftRadius={34}
                borderTopRightRadius={34}
                paddingHorizontal={20}
                paddingTop={16}
                paddingBottom={Math.max(insets.bottom + 16, 24)}
                gap={16}
              >
                <XStack alignItems="center" justifyContent="space-between" gap={12}>
                  <XStack alignItems="center" gap={12} flex={1} minWidth={0}>
                    <YStack
                      width={42}
                      height={42}
                      borderRadius={14}
                      backgroundColor={meta.bg}
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <MaterialCommunityIcons name={meta.icon as any} size={21} color={meta.color} />
                    </YStack>
                    <YStack flex={1} gap={2} minWidth={0}>
                      <Text fontFamily="$heading" fontSize={19} fontWeight="800" color="#1C1C1E" numberOfLines={1}>
                        {activeItem?.title}
                      </Text>
                      {activeItem ? (
                        <Text fontSize={13} fontWeight="500" color="#8E8E93" numberOfLines={1}>
                          {formatFullTime(activeItem.created_at)}
                        </Text>
                      ) : null}
                    </YStack>
                  </XStack>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={closeSheet}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: '#F2F2F7',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <MaterialCommunityIcons name="close" size={20} color="#1C1C1E" />
                  </TouchableOpacity>
                </XStack>

                {activeItem?.body ? (
                  <ScrollView
                    style={{ maxHeight: 260, backgroundColor: '#F7F7FA', borderRadius: 22 }}
                    contentContainerStyle={{ padding: 16 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <Text fontSize={15} color="#6B7280" lineHeight={22}>
                      {activeItem.body}
                    </Text>
                  </ScrollView>
                ) : null}
              </YStack>
            </TouchableOpacity>
          </RNAnimated.View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NotificationItem | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const page = await listNotifications();
      setItems(page.items);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleOpenNotification = async (item: NotificationItem) => {
    setSelectedItem({ ...item, is_read: true });
    if (item.is_read) return;
    const id = item.id;
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
    queryClient.setQueryData<number>(['notifications', 'unread-count'], (count = 0) => Math.max(0, count - 1));
    try {
      await markNotificationRead(id);
    } catch {
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: false } : n));
      await queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    }
  };

  const handleMarkAllRead = async () => {
    const previousUnread = queryClient.getQueryData<number>(['notifications', 'unread-count']);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    queryClient.setQueryData(['notifications', 'unread-count'], 0);
    try {
      await markAllRead();
    } catch {
      await fetchData();
      queryClient.setQueryData(['notifications', 'unread-count'], previousUnread ?? 0);
      await queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/home');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
        {/* Header */}
        <XStack alignItems="center" paddingHorizontal={8} paddingTop={6} paddingBottom={6} height={56} position="relative">
          <HeaderBackButton onPress={handleBack} />
          <Text fontFamily="$heading"
            color="$color"
            fontSize={17}
            fontWeight="700"
            position="absolute"
            left={0}
            right={0}
            textAlign="center"
            pointerEvents="none"
          >
            Bildirishnomalar
          </Text>
          {items.some((n) => !n.is_read) && (
            <TouchableOpacity
              onPress={handleMarkAllRead}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Barchasini o'qilgan deb belgilash"
              style={{
                marginLeft: 'auto',
                width: 38,
                height: 38,
                borderRadius: 19,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="check-all" size={24} color={ACCENT} />
            </TouchableOpacity>
          )}
        </XStack>

        {/* Content */}
        {!loading && items.length === 0 ? (
          <YStack flex={1} alignItems="center" justifyContent="flex-start" paddingTop={60} gap={12}>
            <ReAnimated.View entering={FadeInDown.delay(150).duration(600).easing(Easing.out(Easing.cubic))}>
              <Image
                source={ILLUSTRATIONS.pageNotFoundClean}
                style={{ width: 320, height: 240 }}
                contentFit="contain"
              />
            </ReAnimated.View>
            <ReAnimated.View entering={FadeInDown.delay(150).duration(600).easing(Easing.out(Easing.cubic))}>
              <Text fontFamily="$heading" fontSize={18} fontWeight="700" color="#1C1C1E">{"Bildirishnomalar yo'q"}</Text>
            </ReAnimated.View>
            <ReAnimated.View entering={FadeInDown.delay(200).duration(600).easing(Easing.out(Easing.cubic))}>
              <Text fontSize={14} color="#8E8E93" textAlign="center" paddingHorizontal={40} lineHeight={20}>
                {"Yangi bildirishnomalar bu yerda ko'rinadi"}
              </Text>
            </ReAnimated.View>
          </YStack>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 14 }}
            refreshControl={
              <RefreshControl refreshing={refreshing || loading} onRefresh={handleRefresh} tintColor={ACCENT} />
            }
          >
            {items.map((item) => (
              <NotificationCard key={item.id} item={item} onPress={handleOpenNotification} />
            ))}
          </ScrollView>
        )}
        <NotificationDetailsSheet item={selectedItem} onClose={() => setSelectedItem(null)} />
      </SafeAreaView>
    </>
  );
}
