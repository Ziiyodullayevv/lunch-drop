import { useState } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text, XStack, YStack } from 'tamagui';

import { FloatingCartButton } from '@/components/cart/floating-cart-button';
import { KitchenHeader } from '@/components/kitchen/kitchen-header';
import { MenuItemCard } from '@/components/kitchen/menu-item-card';
import { EmptyState, ErrorState, LoadingState, Screen, StatusBadge } from '@/components/ui';
import { useKitchen } from '@/hooks/use-kitchens';

// ----------------------------------------------------------------------

const WEEK_DAYS = [
  { value: 1, label: 'Du' },
  { value: 2, label: 'Se' },
  { value: 3, label: 'Chor' },
  { value: 4, label: 'Pay' },
  { value: 5, label: 'Ju' },
  { value: 6, label: 'Sha' },
  { value: 7, label: 'Yak' },
];

// Tashkent = UTC+5, DST yo'q. getUTC* ishlatiladi — Hermes'da ishonchli.
function getTashkentWeekday(): number {
  const d = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const jsDay = d.getUTCDay(); // 0=Yak, 1=Du ... 6=Sha
  return jsDay === 0 ? 7 : jsDay;
}

// ----------------------------------------------------------------------

export default function KitchenDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const todayWeekday = getTashkentWeekday();
  const [selectedDay, setSelectedDay] = useState<number>(todayWeekday);

  // weekday backend'ga yuboriladi — filter server tomonida bajariladi
  const { kitchen, categories, menuItems, isLoading, isFetching, error } = useKitchen(
    params.id,
    selectedDay
  );

  if (isLoading) {
    return (
      <Screen title="Oshxona">
        <LoadingState />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="Oshxona">
        <ErrorState />
      </Screen>
    );
  }

  if (!kitchen) {
    return (
      <Screen title="Oshxona topilmadi">
        <EmptyState
          title="Topilmadi"
          description="Bu oshxona mavjud emas yoki branch uchun yopiq."
        />
      </Screen>
    );
  }

  return (
    <>
      <Screen>
        <KitchenHeader kitchen={kitchen} />

        {/* Kun filtri */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <XStack gap="$2" paddingHorizontal="$1">
            {WEEK_DAYS.map((day) => {
              const isActive = selectedDay === day.value;
              const isToday = todayWeekday === day.value;
              return (
                <TouchableOpacity key={day.value} onPress={() => setSelectedDay(day.value)}>
                  <YStack
                    alignItems="center"
                    paddingHorizontal="$3"
                    paddingVertical="$2"
                    borderRadius="$4"
                    borderWidth={1}
                    borderColor={isActive ? '$blue8' : '$gray5'}
                    backgroundColor={isActive ? '$blue3' : isToday ? '$green2' : '$gray2'}
                    gap="$0.5"
                    opacity={isFetching && isActive ? 0.7 : 1}
                  >
                    <Text fontFamily="$heading" fontSize="$3" fontWeight="800" color={isActive ? '$blue11' : '$gray11'}>
                      {day.label}
                    </Text>
                    {isToday && (
                      <Text fontFamily="$heading"
                        fontSize="$1"
                        color={isActive ? '$blue9' : '$green9'}
                        fontWeight="700"
                      >
                        bugun
                      </Text>
                    )}
                  </YStack>
                </TouchableOpacity>
              );
            })}
          </XStack>
        </ScrollView>

        <YStack gap="$3">
          {categories.map((category) => {
            const items = menuItems.filter((item) => item.categoryId === category.id);
            if (items.length === 0) return null;
            return (
              <YStack key={category.id} gap="$3">
                <StatusBadge label={category.title} tone="info" />
                {items.map((item) => (
                  <MenuItemCard key={item.id} item={item} />
                ))}
              </YStack>
            );
          })}

          {!isFetching && menuItems.length === 0 && (
            <EmptyState
              title="Taomlar yo'q"
              description="Bu kun uchun belgilangan taomlar mavjud emas."
            />
          )}
        </YStack>
      </Screen>
      <FloatingCartButton />
    </>
  );
}
