import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated as RNAnimated, Modal, Platform, TouchableOpacity, View } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

const ACCENT = '#00A76F';

type CustomAlertButton = {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
};

type CustomAlertState = {
  title: string;
  message?: string;
  buttons: CustomAlertButton[];
};

type CustomAlertContextValue = {
  showAlert: (title: string, message?: string, buttons?: CustomAlertButton[]) => void;
};

const CustomAlertContext = createContext<CustomAlertContextValue | null>(null);

export function CustomAlertProvider({ children }: PropsWithChildren) {
  const [alertState, setAlertState] = useState<CustomAlertState | null>(null);
  const backdropOpacity = useRef(new RNAnimated.Value(0)).current;
  const cardOpacity = useRef(new RNAnimated.Value(0)).current;
  const cardScale = useRef(new RNAnimated.Value(0.96)).current;

  const animateIn = useCallback(() => {
    backdropOpacity.setValue(0);
    cardOpacity.setValue(0);
    cardScale.setValue(0.96);

    requestAnimationFrame(() => {
      RNAnimated.parallel([
        RNAnimated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        RNAnimated.timing(cardOpacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        RNAnimated.spring(cardScale, {
          toValue: 1,
          damping: 18,
          stiffness: 260,
          mass: 0.8,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [backdropOpacity, cardOpacity, cardScale]);

  const closeAlert = useCallback((afterClose?: () => void) => {
    RNAnimated.parallel([
      RNAnimated.timing(backdropOpacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
      RNAnimated.timing(cardOpacity, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
      RNAnimated.timing(cardScale, {
        toValue: 0.96,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAlertState(null);
      afterClose?.();
    });
  }, [backdropOpacity, cardOpacity, cardScale]);

  const showAlert = useCallback((title: string, message?: string, buttons?: CustomAlertButton[]) => {
    setAlertState({
      title,
      message,
      buttons: buttons?.length ? buttons : [{ text: 'OK' }],
    });
    animateIn();
  }, [animateIn]);

  const value = useMemo(() => ({ showAlert }), [showAlert]);
  const iconName = alertState?.title.toLowerCase().includes('xatolik') ? 'alert-circle' : 'information';

  return (
    <CustomAlertContext.Provider value={value}>
      {children}
      <Modal
        visible={Boolean(alertState)}
        transparent
        animationType="none"
        onRequestClose={() => closeAlert()}
      >
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 28 }}>
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

          <RNAnimated.View style={{ opacity: cardOpacity, transform: [{ scale: cardScale }] }}>
            <YStack
              backgroundColor="#FFFFFF"
              borderRadius={26}
              padding={18}
              gap={16}
              borderWidth={Platform.select({ android: 1, default: 0.5 })}
              borderColor={Platform.select({ android: 'rgba(0,0,0,0.08)', default: 'rgba(0,0,0,0.06)' })}
            >
              <YStack alignItems="center" gap={10}>
                <YStack
                  width={58}
                  height={58}
                  borderRadius={20}
                  backgroundColor="rgba(0,167,111,0.1)"
                  alignItems="center"
                  justifyContent="center"
                >
                  <MaterialCommunityIcons name={iconName as any} size={28} color={ACCENT} />
                </YStack>
                <YStack width="100%" gap={5} alignItems="center">
                  <Text fontFamily="$heading"
                    fontSize={20}
                    fontWeight="800"
                    color="#1C1C1E"
                    textAlign="center"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {alertState?.title}
                  </Text>
                  {alertState?.message ? (
                    <Text fontSize={14} color="#6B7280" lineHeight={20} textAlign="center">
                      {alertState.message}
                    </Text>
                  ) : null}
                </YStack>
              </YStack>

              <XStack gap={10}>
                {alertState?.buttons.map((button) => {
                  const isDestructive = button.style === 'destructive';
                  const isCancel = button.style === 'cancel';
                  return (
                    <TouchableOpacity
                      key={button.text}
                      activeOpacity={0.82}
                      onPress={() => closeAlert(button.onPress)}
                      style={{
                        flex: 1,
                        minHeight: 50,
                        borderRadius: 17,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: isCancel ? '#F2F2F7' : isDestructive ? '#FF3B30' : ACCENT,
                      }}
                    >
                      <Text fontFamily="$heading" fontSize={15} fontWeight="800" color={isCancel ? '#1C1C1E' : '#FFFFFF'} numberOfLines={1}>
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </XStack>
            </YStack>
          </RNAnimated.View>
        </View>
      </Modal>
    </CustomAlertContext.Provider>
  );
}

export function useCustomAlert() {
  const context = useContext(CustomAlertContext);
  if (!context) {
    throw new Error('useCustomAlert must be used inside CustomAlertProvider');
  }
  return context;
}
