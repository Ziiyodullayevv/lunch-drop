import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { HeaderBackButton } from '@/components/common/header-back-button';
import { OrderTimeline } from '@/components/order/order-timeline';
import { ErrorState, LoadingState } from '@/components/ui';
import { formatMoney } from '@/constants/config';
import { useCancelOrder, useOrder } from '@/hooks/use-orders';
import {
  endOrderLiveActivity,
  startOrderLiveActivity,
  updateOrderLiveActivity,
} from '@/lib/live-activity';
import { canCancelOrder, getEffectiveOrderStatus } from '@/lib/order-status';
import type { Order } from '@/types/domain';

const STATUS_LABEL: Record<Order['status'], string> = {
  created:    'Qabul qilindi',
  preparing:  'Tayyorlanmoqda',
  on_the_way: "Yo'lda",
  delivered:  'Yetkazildi',
  cancelled:  'Bekor qilindi',
};

const ORDER_DETAIL_PRIMARY = '#00A76F';
const ORDER_DETAIL_CARD_BORDER = Platform.select({ android: 'transparent', default: 'rgba(0,0,0,0.07)' });
const ORDER_DETAIL_CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.045,
  shadowRadius: 8,
  boxShadow: '0px 0px 12px rgba(0,0,0,0.09)',
  elevation: 0,
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' }) +
    ', ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function shortId(id: string) {
  return id.replace(/-/g, '').slice(0, 5).toUpperCase();
}

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const { order, isLoading, error } = useOrder(params.id);
  const cancelOrder = useCancelOrder();
  const insets = useSafeAreaInsets();
  const activityStarted = useRef(false);

  useEffect(() => {
    if (!order) return;

    const kitchenName = order.kitchenName ?? '';
    const itemCount = order.items?.length ?? 1;

    const status = getEffectiveOrderStatus(order);

    if (status === 'preparing') {
      if (!activityStarted.current) {
        activityStarted.current = true;
        startOrderLiveActivity({
          orderId: order.id,
          itemCount,
          kitchenName,
          status: 'cooking',
        });
      } else {
        updateOrderLiveActivity({ orderId: order.id, status: 'cooking', kitchenName });
      }
    } else if (status === 'on_the_way') {
      updateOrderLiveActivity({ orderId: order.id, status: 'ready', kitchenName });
    } else if (status === 'delivered' || status === 'cancelled') {
      endOrderLiveActivity(order.id);
      activityStarted.current = false;
    }
  }, [order]);

  if (isLoading) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="#F2F2F7">
        <LoadingState />
      </YStack>
    );
  }

  if (error || !order) {
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="#F2F2F7">
        <ErrorState />
      </YStack>
    );
  }

  const displayStatus = getEffectiveOrderStatus(order);
  const canCancel = canCancelOrder(order);

  return (
    <YStack flex={1} backgroundColor="#FFFFFF" paddingTop={insets.top}>
      {/* Header */}
      <XStack alignItems="center" paddingHorizontal={12} paddingVertical={12} justifyContent="center">
        <HeaderBackButton style={{ position: 'absolute', left: 12 }} />
        <Text fontFamily="$heading" fontSize={17} fontWeight="700" color="#1C1C1E">
          Buyurtma #{shortId(order.id)}
        </Text>
      </XStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom + 24, 40),
          gap: 12,
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Status + Time card */}
        <YStack backgroundColor="#FFFFFF" borderRadius={20} padding={16} gap={16} borderWidth={Platform.select({ android: 0, default: 0.5 })} borderColor={ORDER_DETAIL_CARD_BORDER} style={ORDER_DETAIL_CARD_SHADOW}>
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack gap={3}>
              <Text fontSize={13} color="#8E8E93" fontWeight="500">Buyurtma vaqti</Text>
              <Text fontFamily="$heading" fontSize={18} fontWeight="800" color="#1C1C1E">{formatDate(order.createdAt)}</Text>
            </YStack>
            <View style={{
              backgroundColor: ORDER_DETAIL_PRIMARY,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
            }}>
              <Text fontFamily="$heading" fontSize={13} fontWeight="700" color="#FFFFFF">
                {STATUS_LABEL[displayStatus]}
              </Text>
            </View>
          </XStack>

          {/* Timeline */}
          {displayStatus !== 'cancelled' && (
            <OrderTimeline status={displayStatus} />
          )}
        </YStack>

        {/* Items card */}
        <YStack backgroundColor="#FFFFFF" borderRadius={20} padding={16} gap={12} borderWidth={Platform.select({ android: 0, default: 0.5 })} borderColor={ORDER_DETAIL_CARD_BORDER} style={ORDER_DETAIL_CARD_SHADOW}>
          <Text fontFamily="$heading" fontSize={15} fontWeight="700" color="#1C1C1E">Mahsulotlar</Text>
          {order.items.map((item, index) => (
            <YStack key={item.id}>
              {index > 0 && <YStack height={0.5} backgroundColor="#E5E5EA" marginBottom={12} />}
              <XStack alignItems="center" gap={12}>
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: 52, height: 52, borderRadius: 10 }}
                    contentFit="cover"
                  />
                ) : (
                  <View style={{
                    width: 52, height: 52, borderRadius: 10,
                    backgroundColor: '#F2F2F7',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <MaterialCommunityIcons name="food" size={22} color="#C7C7CC" />
                  </View>
                )}
                <Text flex={1} fontSize={14} fontWeight="600" color="#1C1C1E" numberOfLines={1}>
                  {item.name}
                </Text>
                <Text fontSize={13} color="#8E8E93" marginRight={8}>x{item.quantity}</Text>
                <Text fontFamily="$heading" fontSize={14} fontWeight="700" color="#1C1C1E">
                  {formatMoney(item.price * item.quantity)}
                </Text>
              </XStack>
            </YStack>
          ))}

          {/* Total */}
          <XStack borderTopWidth={0.5} borderTopColor="#E5E5EA" paddingTop={12} justifyContent="space-between">
            <Text fontSize={14} color="#8E8E93" fontWeight="500">Jami</Text>
            <Text fontFamily="$heading" fontSize={16} fontWeight="800" color="#1C1C1E">{formatMoney(order.total)}</Text>
          </XStack>

          {/* Cancel button */}
          {canCancel && (
            <>
              <YStack height={0.5} backgroundColor="#E5E5EA" />
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={cancelOrder.isPending}
                onPress={() => cancelOrder.mutate(
                  order.id,
                  { onSuccess: () => router.back() }
                )}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#FF3030',
                  borderRadius: 14,
                  paddingVertical: 13,
                  gap: 8,
                }}
              >
                {cancelOrder.isPending ? (
                  <Spinner color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="close-circle-outline" size={20} color="#FFFFFF" />
                    <Text fontSize={14} fontWeight="600" color="#FFFFFF">
                      Bekor qilish
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
