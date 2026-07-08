import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from 'tamagui';

import { formatMoney } from '@/constants/config';
import { useActiveOrder } from '@/hooks/use-orders';
import { useAuthStore } from '@/stores/auth-store';
import { useCartStore } from '@/stores/cart-store';

export function FloatingCartButton() {
  const subtotal = useCartStore(
    (s) => s.items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0)
  );
  const accountStatus = useAuthStore((s) => s.user?.accountStatus);
  const { activeOrder } = useActiveOrder();
  const insets = useSafeAreaInsets();

  if (subtotal === 0 || accountStatus !== 'approved') return null;

  // Tab bar height (~83) + active order bar height (~68) when order exists
  const tabBarHeight = insets.bottom + 49;
  const bottom = activeOrder ? tabBarHeight + 68 + 8 : tabBarHeight + 8;

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => router.push('/my-orders')}
      style={{
        position: 'absolute',
        right: 16,
        bottom,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderRadius: 100,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: Platform.select({ android: 4, default: 8 }),
        zIndex: 999,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 22,
          paddingVertical: 17,
          backgroundColor: '#00A76F',
        }}
      >
        <Text fontFamily="$heading" fontSize={16} fontWeight="800" color="#FFFFFF" letterSpacing={-0.3}>
          {formatMoney(subtotal)}
        </Text>
        <MaterialCommunityIcons name="shopping" size={22} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}
