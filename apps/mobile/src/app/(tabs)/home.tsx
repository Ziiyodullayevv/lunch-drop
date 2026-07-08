import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Platform, RefreshControl, ScrollView, TouchableOpacity, useColorScheme, useWindowDimensions, View } from "react-native";
import Animated, {
	Easing,
	Extrapolation,
	FadeInDown,
	interpolate,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";

import { useQuery } from "@tanstack/react-query";

import { FloatingCartButton } from "@/components/cart/floating-cart-button";
import { FoodCard } from "@/components/kitchen/food-card";
import { FoodCardSkeleton } from "@/components/kitchen/food-card-skeleton";
import { ErrorState } from "@/components/ui";
import { useAllFoodItems } from "@/hooks/use-all-food-items";
import { useActiveOrder } from "@/hooks/use-orders";
import { getMe } from "@/lib/api/auth";
import { getUnreadCount } from "@/lib/api/notifications";
import { useAuthStore } from "@/stores/auth-store";
import { useCartStore } from "@/stores/cart-store";
import type { MenuItem } from "@/types/domain";

const AnimatedFlatList = Animated.FlatList<MenuItem>;
const COLLAPSE_DISTANCE = 70;
const ACCENT = '#00A76F';
const LAUNCH_DROP_LOGO = require('@/assets/images/launch-drop-logo-gradient-80.svg');
const TAB_BAR_HEIGHT = 49;
const ACTIVE_ORDER_BAR_SCROLL_SPACE = 76;
const FLOATING_CART_SCROLL_SPACE = 88;

function isOfflineError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	const msg = error.message.toLowerCase();
	return msg.includes('network error') || msg.includes('network request failed') || msg.includes('timeout');
}

const DAYS = [
	{ key: 1, label: 'Du' },
	{ key: 2, label: 'Se' },
	{ key: 3, label: 'Chor' },
	{ key: 4, label: 'Pay' },
	{ key: 5, label: 'Ju' },
	{ key: 6, label: 'Sha' },
	{ key: 7, label: 'Yak' },
];

// Tashkent = UTC+5, DST yo'q. Hermes'da ishonchli.
function getTashkentWeekday(): number {
	const d = new Date(Date.now() + 5 * 60 * 60 * 1000);
	const jsDay = d.getUTCDay(); // 0=Sun, 1=Mon ... 6=Sat
	return jsDay === 0 ? 7 : jsDay;
}

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const accountStatus = useAuthStore((s) => s.user?.accountStatus);
	const updateUser = useAuthStore((s) => s.updateUser);
	const cartSubtotal = useCartStore(
		(s) => s.items.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0)
	);
	const isPending = accountStatus !== 'approved';

	useEffect(() => {
		if (!isPending) return;

		const checkApproval = async () => {
			try {
				const user = await getMe();
				if (user.account_status === 'approved') {
					updateUser({ accountStatus: 'approved', status: user.is_active ? 'active' : 'blocked' });
				}
			} catch {}
		};

		void checkApproval();
		const interval = setInterval(() => { void checkApproval(); }, 15_000);
		return () => clearInterval(interval);
	}, [isPending, updateUser]);
	const [selectedDay, setSelectedDay] = useState<number>(getTashkentWeekday);
	const { items, isLoading, error, refetch } = useAllFoodItems(selectedDay);
	const { activeOrder } = useActiveOrder();
	const { data: unreadCount = 0 } = useQuery({
		queryKey: ['notifications', 'unread-count'],
		queryFn: getUnreadCount,
		staleTime: 30_000,
		refetchInterval: 60_000,
	});
	const colorScheme = useColorScheme();
	const isDark = colorScheme === 'dark';
	const { height: windowHeight } = useWindowDimensions();

	const kitchenNamesText = [...new Set(
		items.map((item) => item.kitchenName).filter(Boolean)
	)].join(', ') || 'Oshxonangiz';

	const isAndroid = Platform.OS === 'android';
	const scrollY = useSharedValue(0);
	const hasFloatingCart = cartSubtotal > 0 && accountStatus === 'approved';
	const bottomScrollPadding =
		insets.bottom +
		TAB_BAR_HEIGHT +
		(activeOrder ? ACTIVE_ORDER_BAR_SCROLL_SPACE : 0) +
		(hasFloatingCart ? FLOATING_CART_SCROLL_SPACE : 16);

	const onScroll = useAnimatedScrollHandler({
		onScroll: (e) => {
			scrollY.value = e.contentOffset.y;
		},
	});

	const BRAND_ROW_HEIGHT = 58;

	const brandRowContainerStyle = useAnimatedStyle(() => {
		const height = interpolate(
			scrollY.value,
			[0, COLLAPSE_DISTANCE],
			[BRAND_ROW_HEIGHT, 0],
			Extrapolation.CLAMP,
		);
		const marginBottom = interpolate(
			scrollY.value,
			[0, COLLAPSE_DISTANCE],
			[4, 0],
			Extrapolation.CLAMP,
		);
		return { height, marginBottom, overflow: "hidden" };
	});

	const brandRowStyle = useAnimatedStyle(() => {
		const translateY = interpolate(
			scrollY.value,
			[0, COLLAPSE_DISTANCE],
			[0, -BRAND_ROW_HEIGHT],
			Extrapolation.CLAMP,
		);
		return { transform: [{ translateY }] };
	});

	const headerShadowStyle = useAnimatedStyle(() => {
		const progress = interpolate(
			scrollY.value,
			[COLLAPSE_DISTANCE * 0.8, COLLAPSE_DISTANCE],
			[0, 1],
			Extrapolation.CLAMP,
		);
		const borderRadius = interpolate(
			scrollY.value,
			[0, COLLAPSE_DISTANCE],
			[24, 0],
			Extrapolation.CLAMP,
		);
		return {
			shadowOpacity: progress * 0.09,
			elevation: isAndroid ? progress * 3 : progress * 5,
			borderBottomLeftRadius: borderRadius,
			borderBottomRightRadius: borderRadius,
		};
	});


	const [refreshing, setRefreshing] = useState(false);

	const tabLayouts = useRef<{ x: number; width: number }[]>([]);
	const indicatorX = useSharedValue(0);
	const indicatorWidth = useSharedValue(0);
	const indicatorReady = useRef(false);

	const indicatorStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: indicatorX.value }],
		width: indicatorWidth.value,
	}));

	const handleDaySelect = (key: number, index: number) => {
		setSelectedDay(key);
		const layout = tabLayouts.current[index];
		if (layout) {
			indicatorX.value = withTiming(layout.x, { duration: 200, easing: Easing.out(Easing.cubic) });
			indicatorWidth.value = withTiming(layout.width, { duration: 200, easing: Easing.out(Easing.cubic) });
		}
	};

	const handleTabLayout = (index: number, x: number, width: number) => {
		tabLayouts.current[index] = { x, width };
		if (!indicatorReady.current && DAYS[index].key === selectedDay) {
			indicatorX.value = x;
			indicatorWidth.value = width;
			indicatorReady.current = true;
		}
	};

	const handleRefresh = async () => {
		setRefreshing(true);
		await refetch();
		setRefreshing(false);
	};

	const renderBody = () => {
		if (isPending) {
			return (
				<YStack flex={1} alignItems="center" justifyContent="flex-start" paddingTop={60} gap={12} paddingHorizontal={32}>
					<Animated.View entering={FadeInDown.delay(150).duration(600).easing(Easing.out(Easing.cubic))}>
						<Image
							source={require('@/assets/images/home/administrator.png')}
							style={{ width: 280, height: 280 }}
							contentFit="contain"
						/>
					</Animated.View>
					<Animated.View entering={FadeInDown.delay(150).duration(600).easing(Easing.out(Easing.cubic))}>
						<Text fontFamily="$heading" fontSize={18} fontWeight="700" color="#1C1C1E" textAlign="center">
							Tasdiqlash kutilmoqda
						</Text>
					</Animated.View>
					<Animated.View entering={FadeInDown.delay(200).duration(600).easing(Easing.out(Easing.cubic))}>
						<Text fontSize={14} color="#8E8E93" textAlign="center" lineHeight={20}>
							Kompaniya admini hisobingizni hali tasdiqlamagan.{'\n'}Tasdiqlanganidan so{"'"}ng taomlar ko{"'"}rinadi.
						</Text>
					</Animated.View>
				</YStack>
			);
		}
		if (isLoading) {
			return (
				<ScrollView
					contentContainerStyle={{
						paddingHorizontal: 16,
						paddingTop: 14,
						paddingBottom: bottomScrollPadding,
						gap: 22,
					}}
					showsVerticalScrollIndicator={false}
				>
					{Array.from({ length: 5 }).map((_, i) => (
						<FoodCardSkeleton key={i} />
					))}
				</ScrollView>
			);
		}
		if (error && isOfflineError(error)) {
			return (
				<ScrollView
					style={{ flex: 1 }}
					contentContainerStyle={{ flexGrow: 1 }}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#5BE49B" />
					}
				>
					<ErrorState
						title="Internet yo'q"
						description="Internet aloqasini tekshiring va qayta urining."
					/>
				</ScrollView>
			);
		}
		return (
			<AnimatedFlatList
				data={items}
				keyExtractor={(item) => item.id}
				style={{ flex: 1 }}
				onScroll={onScroll}
				scrollEventThrottle={16}
				contentContainerStyle={{
					paddingHorizontal: 16,
					paddingTop: 14,
					paddingBottom: bottomScrollPadding,
					gap: 22,
					minHeight: windowHeight + COLLAPSE_DISTANCE,
					flexGrow: items.length === 0 ? 1 : undefined,
				}}
				alwaysBounceVertical
				bounces
				overScrollMode="always"
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#5BE49B" />
				}
				renderItem={({ item }) => <FoodCard item={item} />}
				ListEmptyComponent={
					<YStack key={selectedDay} flex={1} alignItems="center" justifyContent="flex-start" paddingTop={60} gap={12}>
						<Animated.View entering={FadeInDown.delay(150).duration(600).easing(Easing.out(Easing.cubic))}>
							<Image
								source={require('@/assets/images/home/dishes.png')}
								style={{ width: 280, height: 280 }}
								contentFit="contain"
							/>
						</Animated.View>
						<Animated.View entering={FadeInDown.delay(150).duration(600).easing(Easing.out(Easing.cubic))}>
							<Text fontFamily="$heading" fontSize={18} fontWeight="700" color="#1C1C1E">Taomlar yo{"'"}q</Text>
						</Animated.View>
						<Animated.View entering={FadeInDown.delay(200).duration(600).easing(Easing.out(Easing.cubic))}>
							<Text fontSize={14} color="#8E8E93" textAlign="center">
								Bu kun uchun taomlar belgilanmagan
							</Text>
						</Animated.View>
					</YStack>
				}
			/>
		);
	};

	return (
		<View style={{ flex: 1, backgroundColor: isDark ? '#121212' : '#FFFFFF' }}>
			{/* ─── Header ─── */}
			<Animated.View
				style={[{
					backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
					paddingHorizontal: 16,
					paddingTop: insets.top + 6,
					paddingBottom: 0,
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 4 },
					shadowRadius: 8,
					zIndex: 10,
				}, headerShadowStyle]}
			>
				{/* Brand row + Bell */}
				<Animated.View style={brandRowContainerStyle}>
					<Animated.View style={[brandRowStyle, { flexDirection: 'row', alignItems: 'center' }]}>
						<XStack alignItems="center" gap={12} paddingVertical={4} flex={1}>
							<Image
								source={LAUNCH_DROP_LOGO}
								style={{ width: 46, height: 46 }}
								contentFit="contain"
							/>

								<YStack flex={1}>
									<Text fontFamily="$heading" color="$color" fontSize={22} fontWeight="800" lineHeight={26}>
										Taomlar
									</Text>
									<Text fontFamily="$body" color="$gray10" fontSize={13} fontWeight="500" numberOfLines={1} marginTop={1}>
										{kitchenNamesText}
									</Text>
								</YStack>
						</XStack>

						{/* Bell */}
						<TouchableOpacity
							activeOpacity={0.7}
							onPress={() => router.push('/notifications')}
							style={{
								width: 42,
								height: 42,
								borderRadius: 12,
								backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7',
								alignItems: 'center',
								justifyContent: 'center',
							}}
							>
								<Image
									source={require('@/assets/images/home/notification.png')}
									style={{ width: 26, height: 26 }}
									contentFit="contain"
								/>
							{unreadCount > 0 && (
								<View
									style={{
										position: 'absolute',
										top: 5,
										right: 5,
										minWidth: 16,
										height: 16,
										borderRadius: 8,
										backgroundColor: ACCENT,
										alignItems: 'center',
										justifyContent: 'center',
										paddingHorizontal: 3,
										borderWidth: 1.5,
										borderColor: isDark ? '#2C2C2E' : '#F2F2F7',
									}}
								>
										<Text fontFamily="$heading" style={{ color: '#FFFFFF' }} fontSize={9} fontWeight="700" lineHeight={12}>
										{unreadCount > 99 ? '99+' : String(unreadCount)}
									</Text>
								</View>
							)}
						</TouchableOpacity>
					</Animated.View>
				</Animated.View>

				{/* Day selector */}
				<View style={{ position: 'relative' }}>
					<View style={{ flexDirection: 'row' }}>
						{DAYS.map((day, index) => {
							const active = selectedDay === day.key;
							return (
								<TouchableOpacity
									key={day.key}
									activeOpacity={0.7}
									onPress={() => handleDaySelect(day.key, index)}
									onLayout={(e) => {
										const { x, width } = e.nativeEvent.layout;
										handleTabLayout(index, x, width);
									}}
									style={{ flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 11 }}
								>
									<Text
										fontFamily="$body"
										fontSize={14}
										fontWeight={active ? '700' : '500'}
										color={active ? (isDark ? '#FFFFFF' : '#0A0A0A') : '#8E8E93'}
									>
										{day.label}
									</Text>
								</TouchableOpacity>
							);
						})}
					</View>

						{/* Sliding indicator */}
						<Animated.View
							style={[{
								position: 'absolute',
								bottom: 0,
								left: 0,
								height: 3.5,
								borderTopLeftRadius: 3,
								borderTopRightRadius: 3,
								backgroundColor: ACCENT,
							}, indicatorStyle]}
						/>
					</View>
			</Animated.View>

			{/* ─── Body ─── */}
			{renderBody()}

			<FloatingCartButton />
		</View>
	);
}
