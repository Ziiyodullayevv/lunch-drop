import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { HeaderBackButton } from '@/components/common/header-back-button';
import { formatMoney } from '@/constants/config';
import { listMonthlyOrders } from '@/lib/api/orders';
import { formatUzShortDate } from '@/lib/uz-date';
import type { Order } from '@/types/domain';

const ACCENT = '#00A76F';
const TEXT = '#1C1C1E';
const MUTED = '#8E8E93';
const BORDER = '#E5E7EB';
const EMPTY_EXPENSES_IMAGE = require('@/assets/images/illustrations/empty-expenses.svg');
const MONTHS = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentabr',
  'Oktabr',
  'Noyabr',
  'Dekabr',
];

const STATUS: Record<Order['status'], { label: string; color: string; background: string }> = {
  created: { label: 'Qabul qilindi', color: '#007867', background: '#E6F7F4' },
  preparing: { label: 'Tayyorlanmoqda', color: '#B76E00', background: '#FFF4DE' },
  on_the_way: { label: "Yo‘lda", color: '#0072A3', background: '#DDF4FC' },
  delivered: { label: 'Yetkazildi', color: '#118D57', background: '#DFF5E8' },
  cancelled: { label: 'Bekor qilindi', color: '#B71D18', background: '#FFE9E7' },
};

const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.045,
  shadowRadius: 8,
  boxShadow: '0px 0px 12px rgba(0,0,0,0.09)',
  elevation: 0,
};

function monthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
}

function expenseOrders(orders: Order[]) {
  return orders.filter((order) => order.status !== 'cancelled');
}

function ordersTotal(orders: Order[]) {
  return expenseOrders(orders).reduce((total, order) => total + order.total, 0);
}

function formatOrderDate(value: string) {
  return formatUzShortDate(`${value}T00:00:00`, true);
}

function shortOrderId(id: string) {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function ExpenseOrderCard({ order }: { order: Order }) {
  const status = STATUS[order.status];
  const itemSummary = order.items
    .map((item) => `${item.name} ×${item.quantity}`)
    .join(', ');

  return (
    <TouchableOpacity activeOpacity={0.75} onPress={() => router.push(`/order/${order.id}`)}>
      <YStack
        padding={16}
        gap={12}
        borderRadius={20}
        backgroundColor="#FFFFFF"
        borderWidth={Platform.select({ android: 0, default: 0.5 })}
        borderColor={Platform.select({ android: 'transparent', default: 'rgba(0,0,0,0.07)' })}
        style={CARD_SHADOW}
      >
        <XStack alignItems="flex-start" justifyContent="space-between" gap={12}>
          <YStack flex={1} gap={3}>
            <XStack alignItems="baseline" gap={5}>
              <Text fontFamily="$heading" fontSize={15} fontWeight="700" color={TEXT}>
                Buyurtma
              </Text>
              <Text fontFamily="$heading" fontSize={12} fontWeight="700" color={MUTED}>
                #{shortOrderId(order.id)}
              </Text>
            </XStack>
            <Text fontFamily="$body" fontSize={12} color={MUTED}>
              {formatOrderDate(order.targetDate)} · {order.kitchenName || 'Oshxona'}
            </Text>
          </YStack>
          <XStack
            paddingHorizontal={10}
            paddingVertical={6}
            borderRadius={10}
            backgroundColor={status.background}
          >
            <Text fontFamily="$body" fontSize={11} fontWeight="700" color={status.color}>
              {status.label}
            </Text>
          </XStack>
        </XStack>

        <XStack alignItems="center" gap={10}>
          <YStack
            width={42}
            height={42}
            borderRadius={13}
            alignItems="center"
            justifyContent="center"
            backgroundColor="#F1F2F4"
          >
            <MaterialCommunityIcons name="food-outline" size={21} color={TEXT} />
          </YStack>
          <YStack flex={1} gap={2}>
            <Text fontFamily="$body" fontSize={13} fontWeight="600" color={TEXT} numberOfLines={2}>
              {itemSummary || 'Taom ma’lumoti yo‘q'}
            </Text>
            <Text fontFamily="$body" fontSize={12} color={MUTED} numberOfLines={1}>
              {order.branchName || 'Filial ko‘rsatilmagan'}
            </Text>
          </YStack>
          <Text fontFamily="$heading" fontSize={15} fontWeight="700" color={TEXT}>
            {formatMoney(order.total)}
          </Text>
          <Ionicons name="chevron-forward" size={17} color={MUTED} />
        </XStack>
      </YStack>
    </TouchableOpacity>
  );
}

export default function ExpensesScreen() {
  const insets = useSafeAreaInsets();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const monthScrollRef = useRef<ScrollView>(null);

  // The selected month was already the current one, but the horizontal list
  // itself always opened at January. Keep the current month in view on entry.
  useEffect(() => {
    const cardWidthWithGap = 158;
    monthScrollRef.current?.scrollTo({
      x: Math.max(0, selectedMonth * cardWidthWithGap - 16),
      animated: false,
    });
  }, [selectedMonth, year]);

  const monthQueries = useQueries({
    queries: MONTHS.map((_, monthIndex) => ({
      queryKey: ['orders', 'monthly', monthKey(year, monthIndex)],
      queryFn: () => listMonthlyOrders(monthKey(year, monthIndex), { enrichSchedules: false }),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const monthlyOrders = monthQueries.map((query) => query.data ?? []);
  const selectedOrders = useMemo(
    () =>
      expenseOrders(monthlyOrders[selectedMonth] ?? []).sort(
        (left, right) => right.targetDate.localeCompare(left.targetDate)
      ),
    [monthlyOrders, selectedMonth]
  );
  const selectedTotal = ordersTotal(selectedOrders);
  const annualTotal = monthlyOrders.reduce((total, orders) => total + ordersTotal(orders), 0);
  const isRefreshing = monthQueries.some((query) => query.isRefetching);
  const isInitialLoading = monthQueries.every((query) => query.isLoading);
  const hasError = monthQueries.some((query) => query.isError);

  const changeYear = (nextYear: number) => {
    if (nextYear > currentYear) return;
    setYear(nextYear);
    setSelectedMonth(nextYear === currentYear ? currentDate.getMonth() : 0);
  };

  const refresh = () => {
    monthQueries.forEach((query) => void query.refetch());
  };

  return (
    <YStack flex={1} backgroundColor="#FFFFFF">
      <XStack
        paddingTop={insets.top + 8}
        paddingHorizontal={16}
        paddingBottom={10}
        alignItems="center"
        justifyContent="space-between"
        backgroundColor="#FFFFFF"
      >
        <HeaderBackButton />
        <Text fontFamily="$heading" fontSize={18} fontWeight="700" color={TEXT}>
          Xarajatlar
        </Text>
        <View style={{ width: 44 }} />
      </XStack>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={ACCENT} />}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
          gap: 18,
        }}
      >
        <YStack
          padding={18}
          gap={16}
          borderRadius={22}
          backgroundColor="#1C252E"
          style={CARD_SHADOW}
        >
          <XStack alignItems="center" justifyContent="space-between">
            <TouchableOpacity activeOpacity={0.7} onPress={() => changeYear(year - 1)}>
              <YStack width={38} height={38} borderRadius={12} alignItems="center" justifyContent="center" backgroundColor="rgba(255,255,255,0.1)">
                <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
              </YStack>
            </TouchableOpacity>
            <YStack alignItems="center" gap={2}>
              <Text fontFamily="$body" fontSize={12} color="rgba(255,255,255,0.65)">
                Yil bo‘yicha
              </Text>
              <Text fontFamily="$heading" fontSize={20} fontWeight="700" color="#FFFFFF">
                {year}
              </Text>
            </YStack>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={year >= currentYear}
              onPress={() => changeYear(year + 1)}
              style={{ opacity: year >= currentYear ? 0.35 : 1 }}
            >
              <YStack width={38} height={38} borderRadius={12} alignItems="center" justifyContent="center" backgroundColor="rgba(255,255,255,0.1)">
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </YStack>
            </TouchableOpacity>
          </XStack>
          <YStack gap={3}>
            <Text fontFamily="$body" fontSize={12} color="rgba(255,255,255,0.65)">
              Bir yillik jami xarajat
            </Text>
            <Text fontFamily="$heading" fontSize={28} fontWeight="700" color="#FFFFFF">
              {formatMoney(annualTotal)}
            </Text>
          </YStack>
        </YStack>

        <YStack gap={10} marginHorizontal={-16}>
          <XStack paddingHorizontal={16} alignItems="center" justifyContent="space-between">
            <Text fontFamily="$heading" fontSize={16} fontWeight="700" color={TEXT}>
              Oylar
            </Text>
            {isInitialLoading ? <Spinner size="small" color={ACCENT} /> : null}
          </XStack>
          <ScrollView
            ref={monthScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          >
            {MONTHS.map((month, index) => {
              const active = selectedMonth === index;
              const orders = expenseOrders(monthlyOrders[index] ?? []);
              return (
                <TouchableOpacity key={month} activeOpacity={0.78} onPress={() => setSelectedMonth(index)}>
                  <YStack
                    width={148}
                    minHeight={102}
                    padding={14}
                    gap={6}
                    borderRadius={18}
                    backgroundColor={active ? 'rgba(28,37,46,0.035)' : '#FFFFFF'}
                    borderWidth={0.5}
                    borderColor={BORDER}
                  >
                    <Text fontFamily="$heading" fontSize={14} fontWeight="700" color={TEXT}>
                      {month}
                    </Text>
                    <Text fontFamily="$heading" fontSize={15} fontWeight="700" color={TEXT} numberOfLines={1}>
                      {formatMoney(ordersTotal(orders))}
                    </Text>
                    <Text fontFamily="$body" fontSize={11} color={MUTED}>
                      {orders.length} ta buyurtma
                    </Text>
                    {active ? (
                      <View
                        pointerEvents="none"
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          bottom: 0,
                          left: 0,
                          borderWidth: 1.5,
                          borderColor: '#1C252E',
                          borderRadius: 18,
                        }}
                      />
                    ) : null}
                  </YStack>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </YStack>

        <YStack gap={12}>
          <XStack alignItems="center" justifyContent="space-between">
            <Text fontFamily="$heading" fontSize={16} fontWeight="700" color={TEXT}>
              {MONTHS[selectedMonth]} buyurtmalari
            </Text>
            <Text fontFamily="$body" fontSize={12} color={MUTED}>
              {selectedOrders.length} ta
            </Text>
          </XStack>

          {hasError && !selectedOrders.length ? (
            <YStack padding={22} gap={10} borderRadius={18} alignItems="center" backgroundColor="#FFFFFF">
              <Ionicons name="cloud-offline-outline" size={28} color="#FF5630" />
              <Text fontFamily="$body" fontSize={13} color={MUTED} textAlign="center">
                Xarajatlarni yuklab bo‘lmadi
              </Text>
              <TouchableOpacity activeOpacity={0.7} onPress={refresh}>
                <Text fontFamily="$heading" fontSize={13} fontWeight="700" color={ACCENT}>
                  Qayta urinish
                </Text>
              </TouchableOpacity>
            </YStack>
          ) : selectedOrders.length ? (
            selectedOrders.map((order) => <ExpenseOrderCard key={order.id} order={order} />)
          ) : (
            <YStack minHeight={250} padding={28} gap={8} borderRadius={18} alignItems="center" justifyContent="center" backgroundColor="#FFFFFF">
              {monthQueries[selectedMonth]?.isLoading ? (
                <Spinner color={ACCENT} />
              ) : (
                <Animated.View
                  key={`${year}-${selectedMonth}`}
                  entering={FadeInDown.duration(420).springify()}
                  style={{ alignItems: 'center', gap: 4 }}
                >
                  <Image source={EMPTY_EXPENSES_IMAGE} style={{ width: 150, height: 150 }} contentFit="contain" />
                  <Text fontFamily="$body" fontSize={13} color={MUTED}>
                    Bu oyda xarajat yo‘q
                  </Text>
                </Animated.View>
              )}
            </YStack>
          )}
        </YStack>
      </ScrollView>

      <YStack
        paddingTop={12}
        paddingHorizontal={16}
        paddingBottom={Math.max(insets.bottom + 12, 22)}
        backgroundColor="#FFFFFF"
        borderTopWidth={0.5}
        borderTopColor="rgba(0,0,0,0.1)"
      >
        <XStack alignItems="center" justifyContent="space-between">
          <YStack gap={2}>
            <Text fontFamily="$body" fontSize={12} color={MUTED}>
              {MONTHS[selectedMonth]} jami
            </Text>
            <Text fontFamily="$body" fontSize={11} color={MUTED}>
              {selectedOrders.length} ta buyurtma
            </Text>
          </YStack>
          <Text fontFamily="$heading" fontSize={22} fontWeight="700" color={TEXT}>
            {formatMoney(selectedTotal)}
          </Text>
        </XStack>
      </YStack>
    </YStack>
  );
}
