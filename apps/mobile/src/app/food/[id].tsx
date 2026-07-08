import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
	Dimensions,
	Platform,
	RefreshControl,
	ScrollView,
	TouchableOpacity,
	useColorScheme,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, XStack, YStack } from "tamagui";

import { EmptyState, LoadingState } from "@/components/ui";
import { Colors } from "@/constants/theme";
import { formatMoney } from "@/constants/config";
import { useAllFoodItems } from "@/hooks/use-all-food-items";
import { useTodayOrderGuard } from "@/hooks/use-today-order-guard";
import { useCart } from "@/stores/cart-store";
import type { MenuItem } from "@/types/domain";

const SCREEN_WIDTH = Dimensions.get("window").width;
const IMAGE_HEIGHT = Math.round(SCREEN_WIDTH * 0.7);
const SIMILAR_CARD_WIDTH = (SCREEN_WIDTH - 16 * 2 - 12) / 2;
const ACCENT = "#00A76F";
const ACCENT_DARK = "#007867";
const ACCENT_SOFT = "rgba(0, 167, 111, 0.10)";

export default function FoodDetailScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const colorScheme = useColorScheme();
	const colors = Colors[colorScheme === "dark" ? "dark" : "light"];
	const { items, isLoading, refetch } = useAllFoodItems();
	const [refreshing, setRefreshing] = useState(false);
	const canOrderForDate = useTodayOrderGuard();

	const handleRefresh = async () => {
		setRefreshing(true);
		await refetch();
		setRefreshing(false);
	};
	const cart = useCart();

	function deliveryRange(window: string): string {
		if (!window) return '';
		// "12:30-13:00" format — show as time range
		if (window.includes('-')) {
			const [start, end] = window.split('-');
			return `${start} – ${end}`;
		}
		// "12:30" format — compute minutes remaining
		const [h, m] = window.split(':').map(Number);
		const now = new Date();
		const target = new Date();
		target.setHours(h, m, 0, 0);
		const diff = Math.round((target.getTime() - now.getTime()) / 60000);
		if (diff <= 0) return window;
		const lo = Math.max(5, diff - 10);
		const hi = diff + 10;
		return `${lo}–${hi} minut`;
	}

	function formatTime(value?: string): string {
		return value ? value.slice(0, 5) : '';
	}

	const item: MenuItem | undefined = items.find((i) => i.id === id);
	const cartQuantity = item ? (cart.items.find((i) => i.menuItem.id === item.id)?.quantity ?? 0) : 0;

	if (isLoading) {
		return (
			<SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
				<LoadingState />
			</SafeAreaView>
		);
	}

	if (!item) {
		return (
			<SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
				<EmptyState
					title="Topilmadi"
					description="Bu taom mavjud emas yoki o'chirilgan."
				/>
			</SafeAreaView>
		);
	}

	// Similar items: same kitchen, exclude current
	const similar = items
		.filter((i) => i.kitchenId === item.kitchenId && i.id !== item.id)
		.slice(0, 6);

	// Pair similar items for 2-column grid
	const similarRows: MenuItem[][] = [];
	for (let i = 0; i < similar.length; i += 2) {
		similarRows.push(similar.slice(i, i + 2));
	}

	const handleMinus = () => {
		if (cartQuantity > 0) cart.updateQuantity(item.id, cartQuantity - 1);
	};

	const handlePlus = () => {
		if (!canOrderForDate(item.targetDate)) return;
		cart.addItem(item, item.kitchenName, 1);
	};

	const handleSimilarAdd = (similarItem: MenuItem) => {
		if (!canOrderForDate(similarItem.targetDate)) return;
		cart.addItem(similarItem, similarItem.kitchenName, 1);
	};

	const handleAddAndBack = () => {
		if (!canOrderForDate(item.targetDate)) return;
		cart.addItem(item, item.kitchenName, 1);
		router.back();
	};

	return (
		<>
			<Stack.Screen options={{ headerShown: false }} />
			<View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
				{/* ─── Scrollable content ─── */}
				<ScrollView
					contentContainerStyle={{ paddingBottom: 130 }}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#5BE49B" />
					}
				>
					{/* Image with close button */}
					<View style={{ position: "relative" }}>
						{item.imageUrl ? (
							<Image
								source={{ uri: item.imageUrl }}
								style={{ width: "100%", height: IMAGE_HEIGHT }}
								contentFit="cover"
							/>
						) : (
							<View
								style={{
									width: "100%",
									height: IMAGE_HEIGHT,
									backgroundColor: colors.backgroundElement,
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<Text fontSize={80}>🍽️</Text>
							</View>
						)}

						{/* Close button */}
						<SafeAreaView
							edges={["top"]}
							style={{ position: "absolute", top: 0, right: 0 }}
						>
							<TouchableOpacity
								activeOpacity={0.7}
								onPress={() => router.back()}
								style={{
									margin: 12,
									width: 46,
									height: 46,
									borderRadius: 23,
									backgroundColor: "rgba(255,255,255,0.95)",
									alignItems: "center",
									justifyContent: "center",
									shadowColor: "#000",
									shadowOpacity: 0.12,
									shadowRadius: 4,
									shadowOffset: { width: 0, height: 0 },
									elevation: Platform.select({ android: 2, default: 3 }),
								}}
							>
								<MaterialCommunityIcons name="close" size={25} color="#1C1C1E" />
							</TouchableOpacity>
						</SafeAreaView>
					</View>

					{/* Info card */}
					<YStack
						backgroundColor="#FFFFFF"
						paddingHorizontal={20}
						paddingTop={18}
						paddingBottom={16}
						gap={14}
					>
						{/* Name + price */}
						<XStack
							alignItems="flex-start"
							justifyContent="space-between"
							gap={12}
						>
							<Text fontFamily="$heading"
								color="$color"
								fontSize={24}
								fontWeight="800"
								flex={1}
								lineHeight={28}
							>
								{item.name}
							</Text>
							<Text fontFamily="$heading" color="$color" fontSize={20} fontWeight="800">
								{formatMoney(item.price)}
							</Text>
						</XStack>

						{/* Free bread + salad info banner */}
						<XStack
							alignItems="center"
							gap={10}
							backgroundColor={ACCENT_SOFT}
							borderRadius={12}
							paddingHorizontal={14}
							paddingVertical={10}
						>
							<MaterialCommunityIcons
								name="gift-outline"
								size={20}
								color={ACCENT_DARK}
							/>
							<Text color="#0A0A0A" fontSize={14} fontWeight="600" flex={1}>
								Non va salat bepul
							</Text>
						</XStack>


						{/* Description (Ingredientlar) */}
						{item.description ? (
							<YStack gap={4}>
								<Text color="$gray10" fontSize={14} fontWeight="500">
									Ingredientlar
								</Text>
								<Text
									color="$color"
									fontSize={16}
									fontWeight="500"
									lineHeight={22}
								>
									{item.description}
								</Text>
							</YStack>
						) : null}

						{/* Kitchen */}
						<YStack gap={4}>
							<Text color="$gray10" fontSize={14} fontWeight="500">
								Oshxona
							</Text>
							<XStack alignItems="center" gap={6}>
								<MaterialCommunityIcons
									name="store-outline"
									size={16}
									color={colors.text}
								/>
								<Text color="$color" fontSize={15} fontWeight="600">
									{item.kitchenName}
								</Text>
							</XStack>
						</YStack>

						{/* Delivery time */}
						<YStack gap={4}>
							<Text color="$gray10" fontSize={14} fontWeight="500">
								Yetkazib berish
							</Text>
							<XStack alignItems="center" gap={6}>
								<MaterialCommunityIcons
									name="clock-outline"
									size={16}
									color={colors.text}
								/>
								<Text color="$color" fontSize={15} fontWeight="600">
									{item.kitchenDeliveryWindow
										? deliveryRange(item.kitchenDeliveryWindow)
										: 'Belgilanmagan'}
								</Text>
							</XStack>
						</YStack>

						{/* Order cutoff time */}
						<YStack gap={4}>
							<Text color="$gray10" fontSize={14} fontWeight="500">
								Buyurtma berish vaqti
							</Text>
							<XStack alignItems="center" gap={6}>
								<MaterialCommunityIcons
									name="timer-outline"
									size={16}
									color={colors.text}
								/>
								<Text color="$color" fontSize={15} fontWeight="600">
									{item.kitchenOrderCutoffTime ? `${formatTime(item.kitchenOrderCutoffTime)} gacha` : 'Belgilanmagan'}
								</Text>
							</XStack>
						</YStack>
					</YStack>

					{/* Similar items — 2-column grid */}
					{similar.length > 0 ? (
						<YStack paddingTop={6} paddingBottom={20} paddingHorizontal={16}>
							<Text fontFamily="$heading"
								color="$color"
								fontSize={22}
								fontWeight="800"
								marginBottom={14}
							>
								Sizga yoqishi mumkin
							</Text>
							<YStack gap={18}>
								{similarRows.map((row, rowIndex) => (
									<XStack key={rowIndex} gap={12}>
										{row.map((s) => (
											<TouchableOpacity
												key={s.id}
												activeOpacity={0.85}
												onPress={() => router.replace(`/food/${s.id}`)}
												style={{ width: SIMILAR_CARD_WIDTH }}
											>
												{/* Image with + button overlay */}
												<View
													style={{
														position: "relative",
														borderRadius: 24,
														overflow: "hidden",
														backgroundColor: colors.backgroundElement,
													}}
												>
													{s.imageUrl ? (
														<Image
															source={{ uri: s.imageUrl }}
															style={{
																width: SIMILAR_CARD_WIDTH,
																height: SIMILAR_CARD_WIDTH,
															}}
															contentFit="cover"
														/>
													) : (
														<View
															style={{
																width: SIMILAR_CARD_WIDTH,
																height: SIMILAR_CARD_WIDTH,
																alignItems: "center",
																justifyContent: "center",
															}}
														>
															<Text fontSize={44}>🍽️</Text>
														</View>
													)}

													{/* + button bottom-right */}
													<TouchableOpacity
														activeOpacity={0.85}
														onPress={() => handleSimilarAdd(s)}
														style={{
															position: "absolute",
															bottom: 10,
															right: 10,
															width: 38,
															height: 38,
															borderRadius: 19,
															backgroundColor: "#ffffff",
															alignItems: "center",
															justifyContent: "center",
															shadowColor: "#000",
															shadowOpacity: 0.14,
															shadowRadius: 4,
															shadowOffset: { width: 0, height: 0 },
															elevation: Platform.select({ android: 2, default: 3 }),
														}}
														hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
													>
														<MaterialCommunityIcons
															name="plus"
															size={22}
															color="#0A0A0A"
														/>
													</TouchableOpacity>
												</View>

												{/* Info — no background, just text */}
												<YStack paddingTop={10} paddingHorizontal={2} gap={2}>
													<Text fontFamily="$heading" color="$color" fontSize={16} fontWeight="800">
														{formatMoney(s.price)}
													</Text>
													<Text
														color="$color"
														fontSize={14}
														fontWeight="500"
														numberOfLines={1}
													>
														{s.name}
													</Text>
													<Text color="$gray10" fontSize={13} fontWeight="500">
														1 porsiya
													</Text>
												</YStack>
											</TouchableOpacity>
										))}
									</XStack>
								))}
							</YStack>
						</YStack>
					) : null}
				</ScrollView>

				{/* ─── Sticky bottom bar ─── */}
				<SafeAreaView
					edges={["bottom"]}
					style={{
						position: "absolute",
						left: 0,
						right: 0,
						bottom: 0,
						backgroundColor: "#FFFFFF",
						borderTopWidth: 0.5,
						borderTopColor: colors.border,
					}}
				>
					{/* Item info row */}
					<XStack
						alignItems="center"
						justifyContent="space-between"
						gap={12}
						paddingHorizontal={20}
						paddingTop={10}
						paddingBottom={6}
					>
						<XStack alignItems="baseline" gap={6} flex={1}>
							<Text
								color="$color"
								fontSize={15}
								fontWeight="500"
								numberOfLines={1}
								flexShrink={1}
							>
								{item.name}
							</Text>
						</XStack>
						<Text color="$color" fontSize={15} fontWeight="500">
							{formatMoney(item.price * Math.max(cartQuantity, 1))}
						</Text>
					</XStack>

					{/* Action row: stepper + button */}
					<XStack
						alignItems="center"
						gap={12}
						paddingHorizontal={16}
						paddingTop={4}
						paddingBottom={6}
					>
						<XStack
							alignItems="center"
							backgroundColor="$gray3"
							borderRadius={18}
							paddingHorizontal={6}
							height={60}
							gap={2}
						>
							<TouchableOpacity
								onPress={handleMinus}
								activeOpacity={0.7}
								style={{
									width: 36,
									height: 36,
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<MaterialCommunityIcons
									name={cartQuantity <= 1 ? "trash-can-outline" : "minus"}
									size={20}
									color={cartQuantity <= 1 ? ACCENT : colors.text}
								/>
							</TouchableOpacity>
							<Text fontFamily="$heading"
								color="$color"
								fontSize={16}
								fontWeight="800"
								minWidth={24}
								textAlign="center"
							>
								{Math.max(cartQuantity, 1)}
							</Text>
							<TouchableOpacity
								onPress={handlePlus}
								activeOpacity={0.7}
								style={{
									width: 36,
									height: 36,
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<MaterialCommunityIcons
									name="plus"
									size={20}
									color={colors.text}
								/>
							</TouchableOpacity>
						</XStack>

						<TouchableOpacity
							onPress={handleAddAndBack}
							activeOpacity={0.85}
							style={{
								flex: 1,
								height: 60,
								borderRadius: 18,
								overflow: "hidden",
								backgroundColor: ACCENT,
								alignItems: "center",
								justifyContent: "center",
								paddingHorizontal: 18,
							}}
						>
							<Text fontFamily="$heading" color="#FFFFFF" fontSize={16} fontWeight="700">
								Savatga qo&apos;shish
							</Text>
						</TouchableOpacity>
					</XStack>
				</SafeAreaView>
			</View>
		</>
	);
}
