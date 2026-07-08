import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, KeyboardAvoidingView, Modal, PanResponder, Platform, RefreshControl, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import ReAnimated, { Easing, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { HeaderBackButton } from '@/components/common/header-back-button';
import { OrderCardSkeleton } from '@/components/order/order-card-skeleton';
import { useCustomAlert } from '@/components/ui/custom-alert';
import { formatMoney } from '@/constants/config';
import { useKitchens } from '@/hooks/use-kitchens';
import { useMonthlyOrders, useOrders } from '@/hooks/use-orders';
import { useTodayOrderGuard } from '@/hooks/use-today-order-guard';
import { createOrder } from '@/lib/api/orders';
import { getTodayDate } from '@/lib/api/kitchens';
import { useAuthStore } from '@/stores/auth-store';
import { useCart, useCartStore } from '@/stores/cart-store';
import type { BranchInfo, Order } from '@/types/domain';

const ACCENT = '#00A76F';
const NOTE_MAX_LENGTH = 180;
const NOTE_PRESETS = [
  "Achchiq bo'lmasin",
  "Ko'kat qo'shmang",
  "Non kerak emas",
  "Iliq yetib kelsin",
];
const ORDER_CARD_BORDER = Platform.select({ android: 'transparent', default: 'rgba(0,0,0,0.07)' });
const ORDER_CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0.045,
  shadowRadius: 8,
  boxShadow: '0px 0px 12px rgba(0,0,0,0.09)',
  elevation: 0,
};

function isCutoffPassed(cutoffTime: string): boolean {
  if (!cutoffTime) return false;
  const [h, m] = cutoffTime.split(':').map(Number);
  const now = new Date();
  return now.getHours() > h || (now.getHours() === h && now.getMinutes() >= m);
}

const STATUS_LABEL: Record<Order['status'], string> = {
  created:    'Qabul qilindi',
  preparing:  'Tayyorlanmoqda',
  on_the_way: "Yo'lda",
  delivered:  'Yetkazildi',
  cancelled:  'Bekor qilindi',
};

const STATUS_COLOR: Record<Order['status'], string> = {
  created:    '#007867',
  preparing:  '#F59E0B',
  on_the_way: '#8B5CF6',
  delivered:  '#22C55E',
  cancelled:  '#FF3B30',
};

const STATUS_BG: Record<Order['status'], string> = {
  created:    'rgba(59, 130, 246, 0.08)',
  preparing:  'rgba(245, 158, 11, 0.08)',
  on_the_way: 'rgba(139, 92, 246, 0.08)',
  delivered:  'rgba(34, 197, 94, 0.08)',
  cancelled:  'rgba(255, 59, 48, 0.08)',
};

const STATUS_ICON: Record<Order['status'], string> = {
  created:    'check-circle-outline',
  preparing:  'room-service',
  on_the_way: 'bike',
  delivered:  'package-variant-closed',
  cancelled:  'close-circle-outline',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('uz-UZ', { weekday: 'short', day: '2-digit', month: 'short' }) +
    ' / ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
}

function shortId(id: string) {
  return id.replace(/-/g, '').slice(0, 5).toUpperCase();
}

function OrderCard({ order }: { order: Order }) {
  return (
    <YStack
      borderRadius={20}
      backgroundColor="#FFFFFF"
      borderWidth={Platform.select({ android: 0, default: 0.5 })}
      borderColor={ORDER_CARD_BORDER}
      style={ORDER_CARD_SHADOW}
    >
      <YStack borderRadius={20} overflow="hidden">
      <YStack padding={16} gap={12}>
        {/* Top row */}
        <XStack alignItems="flex-start" justifyContent="space-between">
          <YStack gap={3}>
            <XStack alignItems="center" gap={7}>
              <View style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: STATUS_COLOR[order.status],
              }} />
              <Text fontFamily="$heading" fontSize={16} fontWeight="800" color="#1C1C1E">
                Order #{shortId(order.id)}
              </Text>
            </XStack>
            <Text fontSize={12} color="#8E8E93" fontWeight="500" marginLeft={15}>
              {formatDate(order.createdAt)}
            </Text>
          </YStack>

          <XStack gap={8}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: '#F2F2F7',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="chat-processing-outline" size={18} color="#1C1C1E" />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push(`/order/${order.id}`)}
              style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: '#F2F2F7',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons name="chevron-right" size={20} color="#1C1C1E" />
            </TouchableOpacity>
          </XStack>
        </XStack>

        {/* Items */}
        <YStack gap={10}>
          {order.items.slice(0, 3).map((item) => (
            <XStack key={item.id} alignItems="center" gap={10}>
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
              <Text fontSize={13} color="#8E8E93" fontWeight="500" marginRight={8}>
                x{item.quantity}
              </Text>
              <Text fontFamily="$heading" fontSize={14} fontWeight="700" color="#1C1C1E">
                {formatMoney(item.price * item.quantity)}
              </Text>
            </XStack>
          ))}
          {order.items.length > 3 && (
            <Text fontSize={13} color="#8E8E93">+{order.items.length - 3} ta mahsulot</Text>
          )}
        </YStack>

        {/* Total */}
        <XStack
          borderTopWidth={0.5}
          borderTopColor="#E5E5EA"
          paddingTop={10}
          justifyContent="space-between"
          alignItems="center"
        >
          <Text fontSize={13} color="#8E8E93" fontWeight="500">Jami:</Text>
          <Text fontFamily="$heading" fontSize={16} fontWeight="800" color="#1C1C1E">
            {formatMoney(order.total)}
          </Text>
        </XStack>
      </YStack>

      {/* Status button */}
      <XStack paddingHorizontal={16} paddingBottom={16}>
        <XStack
          flex={1}
          backgroundColor={STATUS_BG[order.status]}
          borderRadius={14}
          paddingVertical={13}
          alignItems="center"
          justifyContent="center"
          gap={8}
        >
          <MaterialCommunityIcons
            name={STATUS_ICON[order.status] as any}
            size={20}
            color={STATUS_COLOR[order.status]}
          />
          <Text fontSize={14} fontWeight="600" color={STATUS_COLOR[order.status]}>
            {STATUS_LABEL[order.status]}
          </Text>
        </XStack>
      </XStack>
    </YStack>
    </YStack>
  );
}

function DraftOrderCard({
  note,
  branches,
  onNotePress,
  onPlaced,
}: {
  note: string;
  branches: BranchInfo[];
  onNotePress: () => void;
  onPlaced: () => void;
}) {
  const insets = useSafeAreaInsets();
  const cart = useCart();
  const { showAlert } = useCustomAlert();
  const canOrderForDate = useTodayOrderGuard();
  const { kitchens } = useKitchens();
  const [loading, setLoading] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [branchSheetMounted, setBranchSheetMounted] = useState(false);
  const backdropAnim = useRef(new RNAnimated.Value(0)).current;
  const sheetSlide   = useRef(new RNAnimated.Value(500)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder:  (_, g) => g.dy > 8,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          sheetSlide.setValue(g.dy);
          backdropAnim.setValue(Math.max(0, 1 - g.dy / 300));
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          RNAnimated.parallel([
            RNAnimated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            RNAnimated.timing(sheetSlide,   { toValue: 500, duration: 250, useNativeDriver: true }),
          ]).start(() => setBranchSheetMounted(false));
        } else {
          RNAnimated.parallel([
            RNAnimated.spring(sheetSlide,   { toValue: 0, useNativeDriver: true, bounciness: 2 }),
            RNAnimated.timing(backdropAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  if (cart.items.length === 0) return null;

  const openBranchSheet = () => {
    sheetSlide.setValue(500);
    backdropAnim.setValue(0);
    setBranchSheetMounted(true);
    RNAnimated.parallel([
      RNAnimated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      RNAnimated.timing(sheetSlide,   { toValue: 0,   duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const closeBranchSheet = () => {
    RNAnimated.parallel([
      RNAnimated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      RNAnimated.timing(sheetSlide,   { toValue: 500, duration: 250, useNativeDriver: true }),
    ]).start(() => setBranchSheetMounted(false));
  };

  const total = cart.subtotal;

  const kitchenId = cart.items[0]?.menuItem.kitchenId;
  const kitchen = kitchens.find((k) => k.id === kitchenId);
  const cutoffPassed = kitchen ? isCutoffPassed(kitchen.cutoffTime) : false;

  const effectiveBranchId = branches.length === 1 ? branches[0].id : selectedBranchId;

  const handlePlace = async () => {
    if (cutoffPassed) return;
    if (!cart.items.every((item) => canOrderForDate(item.menuItem.targetDate))) return;
    if (!effectiveBranchId) {
      openBranchSheet();
      return;
    }
    setLoading(true);
    try {
      await createOrder(cart.items, effectiveBranchId, note, getTodayDate());
      cart.clear();
      onPlaced();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Buyurtma berishda xatolik yuz berdi';
      showAlert('Xatolik', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack
      borderRadius={20}
      backgroundColor="#FFFFFF"
      borderWidth={Platform.select({ android: 0, default: 0.5 })}
      borderColor={ORDER_CARD_BORDER}
      style={ORDER_CARD_SHADOW}
    >
      <YStack padding={16} gap={12}>
        <XStack alignItems="center" gap={8}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ACCENT }} />
          <Text fontFamily="$heading" fontSize={15} fontWeight="700" color="#1C1C1E">Yangi buyurtma</Text>
          {cart.items[0]?.kitchenName ? (
            <Text fontSize={12} color="#8E8E93" fontWeight="500">· {cart.items[0].kitchenName}</Text>
          ) : null}
        </XStack>

        {cart.items.map((item) => (
          <XStack key={item.menuItem.id} alignItems="center" gap={10}>
            {item.menuItem.imageUrl ? (
              <Image source={{ uri: item.menuItem.imageUrl }} style={{ width: 52, height: 52, borderRadius: 10 }} contentFit="cover" />
            ) : (
              <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons name="food" size={22} color="#C7C7CC" />
              </View>
            )}
            <Text flex={1} fontSize={14} fontWeight="600" color="#1C1C1E" numberOfLines={1}>{item.menuItem.name}</Text>
            <XStack alignItems="center" backgroundColor="#FFFFFF" borderRadius={10} paddingHorizontal={4} height={34} gap={2}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => item.quantity > 1
                  ? cart.updateQuantity(item.menuItem.id, item.quantity - 1)
                  : cart.removeItem(item.menuItem.id)
                }
                style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialCommunityIcons
                  name={item.quantity === 1 ? 'trash-can-outline' : 'minus'}
                  size={15}
                  color={item.quantity === 1 ? ACCENT : '#1C1C1E'}
                />
              </TouchableOpacity>
              <Text fontFamily="$heading" fontSize={13} fontWeight="800" color="#1C1C1E" minWidth={18} textAlign="center">{item.quantity}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (!canOrderForDate(item.menuItem.targetDate)) return;
                  cart.addItem(item.menuItem, item.kitchenName, 1);
                }}
                style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}
              >
                <MaterialCommunityIcons name="plus" size={15} color="#1C1C1E" />
              </TouchableOpacity>
            </XStack>
          </XStack>
        ))}

        <YStack height={0.5} backgroundColor="#E5E5EA" />

        <TouchableOpacity activeOpacity={0.7} onPress={onNotePress}>
          <XStack alignItems="center" gap={10} paddingVertical={2}>
            <Ionicons name="chatbubble" size={18} color="#3C3C43" />
            <Text flex={1} fontSize={14} fontWeight="500" color={note ? '#1C1C1E' : '#8E8E93'}>
              {note || 'Oshxonaga izoh'}
            </Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color="#C7C7CC" />
          </XStack>
        </TouchableOpacity>

        <YStack height={0.5} backgroundColor="#E5E5EA" />

        {branches.length > 1 && (
          <>
            <TouchableOpacity activeOpacity={0.7} onPress={openBranchSheet}>
              <XStack alignItems="center" gap={10} paddingVertical={2}>
                <MaterialCommunityIcons name="office-building-outline" size={18} color="#3C3C43" />
                <Text flex={1} fontSize={14} fontWeight="500" color={selectedBranchId ? '#1C1C1E' : '#8E8E93'}>
                  {selectedBranchId
                    ? (branches.find((b) => b.id === selectedBranchId)?.name ?? 'Filial')
                    : 'Filial tanlang'}
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={18} color="#C7C7CC" />
              </XStack>
            </TouchableOpacity>
            <YStack height={0.5} backgroundColor="#E5E5EA" />
          </>
        )}

        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize={13} color="#8E8E93" fontWeight="500">Jami:</Text>
          <Text fontFamily="$heading" fontSize={16} fontWeight="800" color="#1C1C1E">{formatMoney(total)}</Text>
        </XStack>
      </YStack>

      <XStack paddingHorizontal={16} paddingBottom={16}>
        {cutoffPassed ? (
          <YStack flex={1} backgroundColor="rgba(255,59,48,0.08)" borderRadius={14} paddingVertical={14} alignItems="center" justifyContent="center" gap={4}>
            <Text fontFamily="$heading" fontSize={14} fontWeight="700" color="#FF3B30">Buyurtma vaqti tugagan</Text>
            {kitchen?.cutoffTime ? (
              <Text fontSize={12} fontWeight="500" color="#FF3B30">
                Qabul vaqti: {kitchen.cutoffTime} gacha edi
              </Text>
            ) : null}
          </YStack>
        ) : (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handlePlace}
            disabled={loading}
            style={{ flex: 1, borderRadius: 14, overflow: 'hidden', opacity: loading ? 0.7 : 1 }}
          >
            <View style={{ paddingVertical: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: ACCENT }}>
              {loading ? (
                <Spinner color="#FFFFFF" />
              ) : (
                <Text fontFamily="$heading" fontSize={15} fontWeight="700" color="#FFFFFF">
                  Buyurtma berish
                </Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      </XStack>

      <Modal
        visible={branchSheetMounted}
        transparent
        animationType="none"
        onRequestClose={closeBranchSheet}
        statusBarTranslucent
      >
        {/* Backdrop — fades independently */}
        <RNAnimated.View
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            opacity: backdropAnim,
          }}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={closeBranchSheet} />
        </RNAnimated.View>

        {/* Sheet — slides up, draggable down */}
        <RNAnimated.View
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            transform: [{ translateY: sheetSlide }],
          }}
          {...panResponder.panHandlers}
        >
          <View style={{ width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 2, alignSelf: 'center', marginBottom: 10 }} />
          <YStack
            backgroundColor="#FFFFFF"
            borderTopLeftRadius={36}
            borderTopRightRadius={36}
            padding={20}
            gap={12}
            paddingBottom={Math.max(insets.bottom + 16, 24)}
          >
            <Text fontFamily="$heading" fontSize={17} fontWeight="700" color="#1C1C1E">Filial tanlang</Text>
            {branches.map((branch) => {
              const isSelected = selectedBranchId === branch.id;
              return (
                <TouchableOpacity
                  key={branch.id}
                  activeOpacity={0.7}
                  onPress={() => { setSelectedBranchId(branch.id); closeBranchSheet(); }}
                >
                  <XStack
                    backgroundColor="#F0F0F3"
                    borderRadius={16}
                    paddingHorizontal={16}
                    paddingVertical={16}
                    alignItems="center"
                    gap={12}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: isSelected ? '#5BE49B' : '#C7C7CC',
                        backgroundColor: isSelected ? '#5BE49B' : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && (
                        <Text fontFamily="$heading" color="#1C1C1E" fontSize={14} fontWeight="800" lineHeight={16}>✓</Text>
                      )}
                    </View>
                    <YStack flex={1} gap={2}>
                      <Text fontFamily="$heading" fontSize={15} fontWeight="700" color="#1C1C1E">{branch.name}</Text>
                      {branch.address ? (
                        <Text fontSize={13} color="#8E8E93" fontWeight="400">{branch.address}</Text>
                      ) : null}
                    </YStack>
                  </XStack>
                </TouchableOpacity>
              );
            })}
          </YStack>
        </RNAnimated.View>
      </Modal>
    </YStack>
  );
}

export default function MyOrdersScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily');
  const [note, setNote] = useState('');
  const [noteSheetMounted, setNoteSheetMounted] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const toastOpacity = useState(new RNAnimated.Value(0))[0];
  const noteBackdropOpacity = useRef(new RNAnimated.Value(0)).current;
  const noteSheetTranslateY = useRef(new RNAnimated.Value(360)).current;

  const accountStatus = useAuthStore((s) => s.user?.accountStatus);
  const branches = useAuthStore((s) => s.user?.branches ?? []);
  const isPending = accountStatus !== 'approved';

  useEffect(() => {
    if (isPending) {
      useCartStore.getState().clear();
    }
  }, [isPending]);

  const daily = useOrders();
  const monthly = useMonthlyOrders();

  const orders = activeTab === 'daily' ? daily.orders : monthly.orders;
  const isLoading = activeTab === 'daily' ? daily.isLoading : monthly.isLoading;
  const refetch = activeTab === 'daily' ? daily.refetch : monthly.refetch;
  const cartItems = useCartStore((s) => s.items);

  const showToast = () => {
    RNAnimated.sequence([
      RNAnimated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      RNAnimated.delay(2000),
      RNAnimated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const openNoteSheet = () => {
    setNoteDraft(note);
    noteBackdropOpacity.setValue(0);
    noteSheetTranslateY.setValue(360);
    setNoteSheetMounted(true);
    requestAnimationFrame(() => {
      RNAnimated.parallel([
        RNAnimated.timing(noteBackdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        RNAnimated.spring(noteSheetTranslateY, {
          toValue: 0,
          damping: 24,
          stiffness: 260,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeNoteSheet = () => {
    RNAnimated.parallel([
      RNAnimated.timing(noteBackdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      RNAnimated.timing(noteSheetTranslateY, {
        toValue: 360,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => setNoteSheetMounted(false));
  };

  const saveNote = () => {
    setNote(noteDraft.trim());
    closeNoteSheet();
  };

  const applyNotePreset = (preset: string) => {
    setNoteDraft((current) => {
      const normalized = current.trim();
      if (!normalized) return preset;
      if (normalized.includes(preset)) return normalized;
      const next = `${normalized}. ${preset}`;
      return next.slice(0, NOTE_MAX_LENGTH);
    });
  };

  return (
    <YStack flex={1} backgroundColor="#FFFFFF" paddingTop={insets.top}>
      {/* Header */}
      <XStack
        paddingHorizontal={16}
        paddingVertical={12}
        alignItems="center"
        justifyContent="center"
        backgroundColor="#FFFFFF"
      >
        <HeaderBackButton style={{ position: 'absolute', left: 16 }} />
        <Text fontFamily="$heading" fontSize={17} fontWeight="700" color="#1C1C1E">Buyurtmalar</Text>
      </XStack>

      {/* Tabs */}
      <XStack
        marginHorizontal={16}
        marginBottom={12}
        backgroundColor="#FFFFFF"
        borderRadius={14}
        padding={4}
        gap={4}
        borderWidth={Platform.select({ android: 0, default: 0.5 })}
        borderColor={ORDER_CARD_BORDER}
        style={ORDER_CARD_SHADOW}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('daily')}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 11,
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          {activeTab === 'daily' ? (
            <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: ACCENT }} />
          ) : null}
          <Text fontSize={14} fontWeight="600" color={activeTab === 'daily' ? '#FFFFFF' : '#8E8E93'}>
            Kunlik
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setActiveTab('monthly')}
          style={{
            flex: 1,
            paddingVertical: 14,
            borderRadius: 11,
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          {activeTab === 'monthly' ? (
            <View style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: ACCENT }} />
          ) : null}
          <Text fontSize={14} fontWeight="600" color={activeTab === 'monthly' ? '#FFFFFF' : '#8E8E93'}>
            Oylik
          </Text>
        </TouchableOpacity>
      </XStack>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: '#FFFFFF' }}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom + 24, 32),
          gap: 12,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#5BE49B" />
        }
      >
        {activeTab === 'daily' && !isPending && (
          <DraftOrderCard
            note={note}
            branches={branches}
            onNotePress={openNoteSheet}
            onPlaced={() => { setNote(''); daily.refetch(); showToast(); }}
          />
        )}

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <OrderCardSkeleton key={i} />)
        ) : orders.length === 0 && (activeTab !== 'daily' || cartItems.length === 0) ? (
          <YStack key={activeTab} flex={1} alignItems="center" justifyContent="flex-start" paddingTop={60} gap={12}>
            <ReAnimated.View entering={FadeInDown.duration(600).easing(Easing.out(Easing.cubic))}>
              <Image
                source={require('@/assets/images/home/empty-orders.png')}
                style={{ width: 280, height: 280 }}
                contentFit="contain"
              />
            </ReAnimated.View>
            <ReAnimated.View entering={FadeInDown.delay(150).duration(600).easing(Easing.out(Easing.cubic))}>
              <Text fontFamily="$heading" fontSize={18} fontWeight="700" color="#1C1C1E">{"Buyurtmalar yo'q"}</Text>
            </ReAnimated.View>
            <ReAnimated.View entering={FadeInDown.delay(200).duration(600).easing(Easing.out(Easing.cubic))}>
              <Text fontSize={14} color="#8E8E93" textAlign="center">
                {activeTab === 'daily' ? 'Bugun buyurtma berilmagan' : "So‘nggi 30 kunda buyurtma berilmagan"}
              </Text>
            </ReAnimated.View>
          </YStack>
        ) : (
          orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        )}
      </ScrollView>

      <Modal
        visible={noteSheetMounted}
        transparent
        animationType="none"
        onRequestClose={closeNoteSheet}
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
              opacity: noteBackdropOpacity,
              backgroundColor: 'rgba(0,0,0,0.42)',
            }}
          />
          <TouchableOpacity
            activeOpacity={1}
            style={{ flex: 1, justifyContent: 'flex-end' }}
            onPress={closeNoteSheet}
          >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <RNAnimated.View style={{ transform: [{ translateY: noteSheetTranslateY }] }}>
                <TouchableOpacity activeOpacity={1} onPress={() => {}}>
                  <RNAnimated.View style={{ opacity: noteBackdropOpacity }}>
                    <View
                      style={{
                        width: 42,
                        height: 4,
                        backgroundColor: 'rgba(255,255,255,0.58)',
                        borderRadius: 2,
                        alignSelf: 'center',
                        marginBottom: 10,
                      }}
                    />
                  </RNAnimated.View>
                  <YStack
                    backgroundColor="#FFFFFF"
                    borderTopLeftRadius={34}
                    borderTopRightRadius={34}
                    paddingHorizontal={20}
                    paddingTop={16}
                    paddingBottom={Math.max(insets.bottom + 16, 24)}
                    gap={16}
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: -8 },
                      shadowOpacity: 0.14,
                      shadowRadius: 20,
                      elevation: Platform.select({ android: 12, default: 0 }),
                    }}
                  >
                    <XStack alignItems="center" justifyContent="space-between" gap={12}>
                      <XStack alignItems="center" gap={12} flex={1} minWidth={0}>
                        <YStack
                          width={42}
                          height={42}
                          borderRadius={14}
                          backgroundColor="rgba(0,167,111,0.1)"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                        >
                          <Ionicons name="chatbubble-ellipses" size={21} color={ACCENT} />
                        </YStack>
                        <YStack flex={1} gap={2} minWidth={0}>
                          <Text fontFamily="$heading" fontSize={19} fontWeight="800" color="#1C1C1E" numberOfLines={1}>
                            Oshxonaga izoh
                          </Text>
                          <Text fontSize={13} color="#8E8E93" fontWeight="500" numberOfLines={1}>
                            Qisqa izoh yozing
                          </Text>
                        </YStack>
                      </XStack>

                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={closeNoteSheet}
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
                        <Ionicons name="close" size={19} color="#1C1C1E" />
                      </TouchableOpacity>
                    </XStack>

                    <YStack
                      backgroundColor="#F7F7FA"
                      borderRadius={22}
                      overflow="hidden"
                    >
                      <TextInput
                        value={noteDraft}
                        onChangeText={setNoteDraft}
                        placeholder="Masalan: achchiq bo'lmasin, ko'kat qo'shmang..."
                        placeholderTextColor="#8E8E93"
                        multiline
                        autoFocus
                        maxLength={NOTE_MAX_LENGTH}
                        style={{
                          fontSize: 16,
                          lineHeight: 22,
                          fontFamily: 'NunitoSans_400Regular',
                          color: '#1C1C1E',
                          paddingHorizontal: 16,
                          paddingTop: 16,
                          paddingBottom: 8,
                          minHeight: 112,
                          textAlignVertical: 'top',
                        }}
                      />
                      <XStack alignItems="center" justifyContent="space-between" paddingHorizontal={14} paddingBottom={12}>
                        <Text fontSize={12} color={noteDraft.length > NOTE_MAX_LENGTH - 20 ? '#FF3B30' : '#8E8E93'} fontWeight="600">
                          {noteDraft.length}/{NOTE_MAX_LENGTH}
                        </Text>
                        {noteDraft.length > 0 ? (
                          <TouchableOpacity
                            activeOpacity={0.75}
                            onPress={() => setNoteDraft('')}
                            style={{
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              borderRadius: 12,
                              backgroundColor: '#FFFFFF',
                            }}
                          >
                            <Text fontFamily="$heading" fontSize={12} fontWeight="700" color="#1C1C1E">
                              Tozalash
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </XStack>
                    </YStack>

                    <View style={{ position: 'relative' }}>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8, paddingRight: 58 }}
                        keyboardShouldPersistTaps="handled"
                      >
                        {NOTE_PRESETS.map((preset) => (
                          <TouchableOpacity
                            key={preset}
                            activeOpacity={0.75}
                            onPress={() => applyNotePreset(preset)}
                            style={{
                              paddingHorizontal: 13,
                              paddingVertical: 9,
                              borderRadius: 16,
                              backgroundColor: '#F2F2F7',
                            }}
                          >
                            <Text fontFamily="$heading" fontSize={13} fontWeight="700" color="#1C1C1E" numberOfLines={1}>
                              {preset}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <LinearGradient
                        pointerEvents="none"
                        colors={['rgba(255,255,255,0)', '#FFFFFF']}
                        start={{ x: 0, y: 0.5 }}
                        end={{ x: 1, y: 0.5 }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          bottom: 0,
                          width: 64,
                        }}
                      />
                    </View>

                    <XStack>
                      <TouchableOpacity
                        activeOpacity={0.88}
                        onPress={saveNote}
                        style={{
                          flex: 1,
                          borderRadius: 16,
                          overflow: 'hidden',
                        }}
                      >
                        <View style={{ paddingVertical: 15, alignItems: 'center', backgroundColor: ACCENT }}>
                          <Text fontFamily="$heading" fontSize={15} fontWeight="800" color="#FFFFFF">
                            Tayyor
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </XStack>
                  </YStack>
                </TouchableOpacity>
              </RNAnimated.View>
            </KeyboardAvoidingView>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Toast */}
      <RNAnimated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: insets.top + 16,
          left: 16,
          right: 16,
          opacity: toastOpacity,
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          borderWidth: 0.5,
          borderColor: '#E5E5EA',
          paddingHorizontal: 18,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          zIndex: 999,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: Platform.select({ android: 6, default: 0 }),
        }}
      >
        <MaterialCommunityIcons name="check-circle" size={20} color="#22C55E" />
        <Text fontSize={14} fontWeight="600" color="#1C1C1E">Buyurtma qabul qilindi</Text>
      </RNAnimated.View>
    </YStack>
  );
}
