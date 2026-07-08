import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ScrollView, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

import { PrimaryGradient } from '@/components/ui/primary-gradient';
import { Colors, PRIMARY_ON } from '@/constants/theme';
import { formatMoney } from '@/constants/config';
import { useCart } from '@/stores/cart-store';

export default function SavatScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const cart = useCart();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      {/* Header */}
      <YStack paddingHorizontal={16} paddingTop={6} paddingBottom={10}>
        <Text fontFamily="$heading" color="$color" fontSize={28} fontWeight="900" lineHeight={34}>
          Savat
        </Text>
        {cart.items.length > 0 ? (
          <Text color="$gray10" fontSize={13} fontWeight="500" marginTop={2}>
            {cart.itemCount} ta mahsulot
          </Text>
        ) : null}
      </YStack>

      {cart.items.length === 0 ? (
        <YStack flex={1} alignItems="center" justifyContent="center" padding={24} gap={12}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: colors.backgroundElement,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons name="basket-outline" size={48} color={colors.textSecondary} />
          </View>
          <Text fontFamily="$heading" color="$color" fontSize={20} fontWeight="800">
            Savat bo&apos;sh
          </Text>
          <Text color="$gray10" fontSize={14} fontWeight="500" textAlign="center">
            Bosh sahifadan taom tanlab savatga qo&apos;shing
          </Text>
        </YStack>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 180, gap: 12 }}
            showsVerticalScrollIndicator={false}
          >
            {cart.items.map((line) => (
              <XStack
                key={line.menuItem.id}
                alignItems="center"
                gap={12}
                backgroundColor={colors.backgroundElement}
                borderRadius={16}
                padding={12}
              >
                {/* Image */}
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 12,
                    backgroundColor: colors.background,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {line.menuItem.imageUrl ? (
                    <Text fontSize={32}>🍽️</Text>
                  ) : (
                    <Text fontSize={32}>🍽️</Text>
                  )}
                </View>

                {/* Info */}
                <YStack flex={1} gap={2}>
                  <Text fontFamily="$heading" color="$color" fontSize={15} fontWeight="700" numberOfLines={1}>
                    {line.menuItem.name}
                  </Text>
                  <Text color="$gray10" fontSize={12} fontWeight="500" numberOfLines={1}>
                    {line.kitchenName}
                  </Text>
                  <Text fontFamily="$heading" color="$color" fontSize={15} fontWeight="800" marginTop={2}>
                    {formatMoney(line.menuItem.price * line.quantity)}
                  </Text>
                </YStack>

                {/* Quantity stepper */}
                <XStack
                  alignItems="center"
                  backgroundColor={colors.background}
                  borderRadius={20}
                  paddingHorizontal={4}
                  height={36}
                  gap={2}
                >
                  <TouchableOpacity
                    onPress={() => cart.updateQuantity(line.menuItem.id, line.quantity - 1)}
                    activeOpacity={0.7}
                    style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <MaterialCommunityIcons name="minus" size={16} color={colors.text} />
                  </TouchableOpacity>
                  <Text fontFamily="$heading"
                    color="$color"
                    fontSize={14}
                    fontWeight="800"
                    minWidth={20}
                    textAlign="center"
                  >
                    {line.quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() => cart.updateQuantity(line.menuItem.id, line.quantity + 1)}
                    activeOpacity={0.7}
                    style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <MaterialCommunityIcons name="plus" size={16} color={colors.text} />
                  </TouchableOpacity>
                </XStack>
              </XStack>
            ))}

            {/* Clear button */}
            <TouchableOpacity
              onPress={cart.clear}
              activeOpacity={0.7}
              style={{ alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 18, marginTop: 6 }}
            >
              <Text color="$gray10" fontSize={14} fontWeight="600">
                Savatni tozalash
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Sticky bottom: total + checkout */}
          <SafeAreaView
            edges={['bottom']}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: colors.background,
              borderTopWidth: 0.5,
              borderTopColor: colors.border,
            }}
          >
            <XStack
              alignItems="center"
              justifyContent="space-between"
              paddingHorizontal={20}
              paddingTop={10}
              paddingBottom={4}
            >
              <Text color="$gray10" fontSize={14} fontWeight="500">
                Jami
              </Text>
              <Text fontFamily="$heading" color="$color" fontSize={18} fontWeight="800">
                {formatMoney(cart.subtotal)}
              </Text>
            </XStack>
            <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 6 }}>
              <TouchableOpacity
                onPress={() => router.push('/checkout')}
                activeOpacity={0.85}
                style={{
                  height: 52,
                  borderRadius: 28,
                  overflow: 'hidden',
                }}
              >
                <PrimaryGradient
                  style={{
                    height: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 18,
                    gap: 10,
                  }}
                >
                  <Text fontFamily="$heading" color={PRIMARY_ON} fontSize={16} fontWeight="800">
                    Buyurtma berish
                  </Text>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: '#1C1C1E',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#FFFFFF" />
                  </View>
                </PrimaryGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </>
      )}
    </SafeAreaView>
  );
}
