import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, TouchableOpacity, useColorScheme, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from 'tamagui';

import { useActiveOrder } from '@/hooks/use-orders';
import { useKitchens } from '@/hooks/use-kitchens';
import { getEffectiveOrderStatus } from '@/lib/order-status';
import type { OrderStatus } from '@/types/domain';

// ─── Progress ring ─────────────────────────────────────────────────────────────

const RING_SIZE = 52;
const CX = RING_SIZE / 2;
const CY = RING_SIZE / 2;
const RADIUS = 22;
const STROKE = 3.5;
const INNER = (RADIUS - STROKE / 2 - 3) * 2;
const RING_ACTIVE = '#00A76F';
const RING_CENTER = '#00A76F';
const RING_ICON = '#FFFFFF';

// 4 segments with 14° gaps → 76° each
const SEGMENTS = [
  { start: -83, end: -7 },
  { start:   7, end: 83 },
  { start:  97, end: 173 },
  { start: 187, end: 263 },
];

function polarToXY(deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: CX + RADIUS * Math.cos(rad), y: CY + RADIUS * Math.sin(rad) };
}

function arcPath(start: number, end: number) {
  const s = polarToXY(start);
  const e = polarToXY(end);
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 0 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

const STATUS_PROGRESS: Record<OrderStatus, number> = {
  created:    1,
  preparing:  2,
  on_the_way: 3,
  delivered:  4,
  cancelled:  0,
};

const STATUS_ICON: Record<OrderStatus, string> = {
  created:    'check-circle-outline',
  preparing:  'fire',
  on_the_way: 'run-fast',
  delivered:  'package-variant-closed',
  cancelled:  'close-circle-outline',
};

function ProgressRing({ status, isDark }: { status: OrderStatus; isDark: boolean }) {
  const filled = STATUS_PROGRESS[status];
  const inactiveColor = isDark ? '#3A3A3C' : '#E5E5EA';
  return (
    <View style={{ width: RING_SIZE, height: RING_SIZE }}>
      <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute' }}>
        {SEGMENTS.map((seg, i) => (
          <Path
            key={i}
            d={arcPath(seg.start, seg.end)}
            stroke={i < filled ? RING_ACTIVE : inactiveColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
          />
        ))}
      </Svg>
      <View style={{
        position: 'absolute',
        top: (RING_SIZE - INNER) / 2,
        left: (RING_SIZE - INNER) / 2,
        width: INNER,
        height: INNER,
        borderRadius: INNER / 2,
        backgroundColor: RING_CENTER,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <MaterialCommunityIcons name={STATUS_ICON[status] as any} size={17} color={RING_ICON} />
      </View>
    </View>
  );
}

// ─── Status labels ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Partial<Record<OrderStatus, string>> = {
  created:    'Qabul qilindi',
  preparing:  'Taomingiz tayyorlanmoqda',
  on_the_way: "Kuryer yo'lga chiqdi",
  delivered:  'Yetkazildi',
};

// ─── Bar ───────────────────────────────────────────────────────────────────────

export function ActiveOrderBar() {
  const { activeOrder } = useActiveOrder();
  const { kitchens } = useKitchens();
  const isDark = useColorScheme() === 'dark';

  if (!activeOrder) return null;

  const kitchen = kitchens.find((k) => k.id === activeOrder.kitchenId);
  const status = getEffectiveOrderStatus(activeOrder);
  const kitchenName = activeOrder.kitchenName || kitchen?.name || 'Oshxona';
  const deliveryWindow = activeOrder.deliveryWindow || kitchen?.deliveryWindow;
  const label = STATUS_LABEL[status] ?? 'Jarayonda';
  const subtitle = status === 'on_the_way' && deliveryWindow
    ? `Yetkazish: ${deliveryWindow}`
    : label;

  return (
    <View
      style={{
        marginHorizontal: 8,
        marginTop: 8,
        marginBottom: Platform.OS === 'android' ? 0 : 4,
        borderRadius: 28,
        position: 'relative',
      }}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => router.push('/my-orders')}
        style={{
          backgroundColor: isDark ? '#1C1C1E' : '#F2F2F7',
          borderRadius: 100,
          paddingLeft: 10,
          paddingRight: 2,
          paddingVertical: 2,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text fontFamily="$heading"
            color={isDark ? '#FFFFFF' : '#0A0A0A'}
            fontSize={15}
            fontWeight="800"
            numberOfLines={1}
          >
            {kitchenName}
          </Text>
          <Text
            color={isDark ? '#8E8E93' : '#6B7280'}
            fontSize={13}
            fontWeight="500"
            marginTop={2}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>

        <ProgressRing status={status} isDark={isDark} />
      </TouchableOpacity>
    </View>
  );
}
