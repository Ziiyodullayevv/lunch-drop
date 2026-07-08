import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import type { OrderStatus } from '@/types/domain';

const STEPS: { label: string; icon: string }[] = [
  { label: 'Qabul\nqilindi',    icon: 'check-circle'            },
  { label: 'Tayyorlan\nmoqda',  icon: 'room-service'            },
  { label: "Yo'lda",            icon: 'bike'                    },
  { label: 'Yetkazildi',        icon: 'package-variant-closed'  },
];

const STATUS_STEP: Record<OrderStatus, number> = {
  created:    0,
  preparing:  1,
  on_the_way: 2,
  delivered:  3,
  cancelled:  -1,
};

type Props = { status: OrderStatus };

export function OrderTimeline({ status }: Props) {
  const activeIndex = STATUS_STEP[status] ?? 0;
  const doneColor = '#00A76F';
  const activeColor = '#007867';
  const textColor = '#004B50';
  const activeBg = 'rgba(0,120,103,0.08)';
  const doneBg = 'rgba(0,167,111,0.12)';

  return (
    <XStack alignItems="flex-start" paddingVertical={8}>
      {STEPS.map((step, index) => {
        const isDone   = index < activeIndex;
        const isActive = index === activeIndex;
        const isLast   = index === STEPS.length - 1;

        return (
          <XStack key={step.label} flex={isLast ? 0 : 1} alignItems="flex-start">
            <YStack alignItems="center" gap={8} width={48} style={{ overflow: 'visible' }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: isActive ? activeBg : (isDone ? doneBg : '#F5F5F5'),
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isActive ? 0.12 : 0,
                shadowRadius: isActive ? 8 : 0,
                elevation: Platform.select({ android: isActive ? 2 : 0, default: isActive ? 4 : 0 }),
              }}>
                <MaterialCommunityIcons
                  name={step.icon as any}
                  size={22}
                  color={isActive ? activeColor : (isDone ? doneColor : '#C7C7CC')}
                />
                {isDone && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 16,
                    height: 16,
                    borderRadius: 8,
                    backgroundColor: doneColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1.5,
                    borderColor: '#FFFFFF',
                  }}>
                    <MaterialCommunityIcons name="check" size={10} color="#FFFFFF" />
                  </View>
                )}
              </View>
              <Text
                fontSize={11}
                fontWeight={isActive ? '700' : '500'}
                color={isActive ? textColor : (isDone ? doneColor : '#C7C7CC')}
                textAlign="center"
                numberOfLines={2}
                style={{ width: 68 }}
              >
                {step.label}
              </Text>
            </YStack>

            {!isLast && (
              <View style={{
                flex: 1,
                height: 2,
                marginTop: 23,
                marginHorizontal: 6,
                borderRadius: 2,
                backgroundColor: index < activeIndex ? doneColor : '#E5E5EA',
              }} />
            )}
          </XStack>
        );
      })}
    </XStack>
  );
}
