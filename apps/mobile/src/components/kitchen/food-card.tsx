import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity, useColorScheme, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text, XStack, YStack } from 'tamagui';

import { Colors } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { useTodayOrderGuard } from '@/hooks/use-today-order-guard';
import { useCart } from '@/stores/cart-store';
import type { MenuItem } from '@/types/domain';

const DELIVERY_META_COLOR = '#8E8E93';

function DeliveryIcon({ size = 13, color = '#8E8E93' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M0 0h24v24H0z" fill="none" />
      <Path
        fill={color}
        d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35zM7 17c-.55 0-1-.45-1-1h2c0 .55-.45 1-1 1"
      />
      <Path
        fill={color}
        d="M5 6h5v2H5zm14 7c-1.66 0-3 1.34-3 3s1.34 3 3 3s3-1.34 3-3s-1.34-3-3-3m0 4c-.55 0-1-.45-1-1s.45-1 1-1s1 .45 1 1s-.45 1-1 1"
      />
    </Svg>
  );
}

type Props = { item: MenuItem };

function AddButton({ item }: { item: MenuItem }) {
  const cart = useCart();
  const canOrderForDate = useTodayOrderGuard();
  const quantity = cart.items.find((i) => i.menuItem.id === item.id)?.quantity ?? 0;
  const expanded = quantity > 0;

  const widthAnim = useRef(new Animated.Value(38)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: expanded ? 108 : 38,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [expanded, widthAnim]);

  const handleAdd = () => {
    if (!canOrderForDate(item.targetDate, item.kitchenOrderCutoffTime)) return;
    if (item.isAvailable) cart.addItem(item, item.kitchenName);
  };

  const handleRemove = () => {
    if (quantity === 1) cart.removeItem(item.id);
    else cart.updateQuantity(item.id, quantity - 1);
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: widthAnim,
        height: 38,
        borderRadius: 19,
        overflow: 'hidden',
      }}
    >
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={55}
          tint="dark"
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          {expanded && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              style={{ width: 36, height: 38, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text color="#FFFFFF" fontSize={20} fontWeight="500" style={{ lineHeight: 22, marginTop: -1 }}>−</Text>
            </TouchableOpacity>
          )}
          {expanded && (
            <Text fontFamily="$heading" color="#FFFFFF" fontSize={14} fontWeight="700" style={{ minWidth: 16, textAlign: 'center' }}>
              {quantity}
            </Text>
          )}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleAdd}
            hitSlop={{ top: 8, bottom: 8, left: expanded ? 4 : 8, right: 8 }}
            style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text color="#FFFFFF" fontSize={22} fontWeight="500" style={{ lineHeight: 24, marginTop: -2 }}>+</Text>
          </TouchableOpacity>
        </BlurView>
      ) : (
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]} />
          {expanded && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
              style={{ width: 36, height: 38, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text color="#FFFFFF" fontSize={20} fontWeight="500" style={{ lineHeight: 22, marginTop: -1 }}>−</Text>
            </TouchableOpacity>
          )}
          {expanded && (
            <Text fontFamily="$heading" color="#FFFFFF" fontSize={14} fontWeight="700" style={{ minWidth: 16, textAlign: 'center' }}>
              {quantity}
            </Text>
          )}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleAdd}
            hitSlop={{ top: 8, bottom: 8, left: expanded ? 4 : 8, right: 8 }}
            style={{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text color="#FFFFFF" fontSize={22} fontWeight="500" style={{ lineHeight: 24, marginTop: -2 }}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

export function FoodCard({ item }: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const hasDiscount = false;
  const handleOpen = () => {
    router.push(`/food/${item.id}?targetDate=${item.targetDate ?? ''}`);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={handleOpen}
      style={{ backgroundColor: 'transparent' }}
    >
      <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: colors.backgroundElement }}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={{ width: '100%', aspectRatio: 16 / 8 }}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={{ width: '100%', aspectRatio: 16 / 8, alignItems: 'center', justifyContent: 'center' }}>
            <Text fontSize={48}>🍽️</Text>
          </View>
        )}

        {hasDiscount && (
          <View style={{ position: 'absolute', top: 12, left: 12, backgroundColor: '#5BE49B', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 5 }}>
            <Text fontFamily="$heading" color="white" fontSize={13} fontWeight="800">−4000 сум</Text>
          </View>
        )}

        <AddButton item={item} />
      </View>

      <XStack paddingTop={10} paddingHorizontal={4} alignItems="flex-start" justifyContent="space-between" gap={8}>
        <YStack flex={1} gap={4}>
          <Text fontFamily="$heading" color="$color" fontSize={16} fontWeight="700" numberOfLines={1} letterSpacing={-0.3}>
            {item.name}
          </Text>
          <XStack alignItems="center" gap={5}>
            <DeliveryIcon size={18} color={DELIVERY_META_COLOR} />
            <Text fontFamily="$body" fontSize={12} fontWeight="500" color={DELIVERY_META_COLOR} numberOfLines={1}>
              {item.kitchenDeliveryWindow ?? 'Vaqt belgilanmagan'}
            </Text>
          </XStack>
        </YStack>

        <YStack alignItems="flex-end" gap={4}>
          <XStack alignItems="center" gap={3}>
            <MaterialCommunityIcons name="star" size={13} color="#1C1C1E" />
            <Text fontFamily="$heading" fontSize={13} fontWeight="700" color="#1C1C1E">
              {item.isPopular ? '4.8' : '4.6'}
            </Text>
          </XStack>
          <Text fontFamily="$heading" fontSize={13} fontWeight="700" color="$color" numberOfLines={1}>
            {formatMoney(item.price)}
          </Text>
        </YStack>
      </XStack>
    </TouchableOpacity>
  );
}
