"use client";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef } from "react";
import {
  Animated,
  Platform,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Spinner, Text, XStack, YStack } from "tamagui";

import { HeaderBackButton } from "@/components/common/header-back-button";
import { ProfileAvatar } from "@/components/common/profile-avatar";
import { formatMoney } from "@/constants/config";
import { useAuth } from "@/hooks/use-auth";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useMonthlyOrders } from "@/hooks/use-orders";
import { useWorkplaceInfoBackfill } from "@/hooks/use-workplace-info";
import { openPrivacyPolicy } from "@/lib/support";

// avatar(88) + gap(10) + ism+tel(~42) + paddingVertical(24)
const AVATAR_SECTION_HEIGHT = 164;
const HEADER_HEIGHT = 66;
const HEADER_SCROLL_EXTRA = 96;
const PROFILE_BUTTON_COLOR = "#1C252E";
const PROFILE_ICON_COLOR = "#141A21";
const PROFILE_ICON_BG = "#F1F2F4";

function MenuRow({
  icon,
  label,
  subtitle,
  title,
  onPress,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: React.ReactNode;
  title?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  const content = (
    <XStack
      alignItems="center"
      gap={12}
      paddingVertical={17}
      paddingHorizontal={16}
    >
      <YStack
        width={42}
        height={42}
        borderRadius={14}
        backgroundColor={PROFILE_ICON_BG}
        alignItems="center"
        justifyContent="center"
      >
        <Ionicons name={icon} size={22} color={PROFILE_ICON_COLOR} />
      </YStack>
      <YStack flex={1} gap={2}>
        <Text
          fontFamily="$heading"
          fontSize={15}
          fontWeight="600"
          color={PROFILE_BUTTON_COLOR}
        >
          {label}
        </Text>
        {title ? (
          <Text
            fontFamily="$body"
            fontSize={12}
            color="#8E8E93"
            numberOfLines={1}
          >
            {title}
          </Text>
        ) : null}
        {typeof subtitle === "string" ? (
          <Text fontFamily="$body" fontSize={12} color="#8E8E93">
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </YStack>
      {right ??
        (onPress ? (
          <Ionicons
            name="chevron-forward"
            size={17}
            color={PROFILE_BUTTON_COLOR}
          />
        ) : null)}
    </XStack>
  );

  if (!onPress) return content;

  return (
    <TouchableOpacity activeOpacity={0.65} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

function Divider() {
  return (
    <YStack
      height={1}
      backgroundColor="#E5E7EB"
      marginLeft={70}
      marginRight={16}
    />
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <YStack
      borderRadius={20}
      backgroundColor="#FFFFFF"
      borderWidth={Platform.select({ android: 0, default: 0.5 })}
      borderColor={Platform.select({
        android: "transparent",
        default: "rgba(0,0,0,0.07)",
      })}
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.045,
        shadowRadius: 8,
        boxShadow: "0px 0px 12px rgba(0,0,0,0.09)",
        elevation: 0,
      }}
    >
      <YStack borderRadius={20} overflow="hidden">
        {children}
      </YStack>
    </YStack>
  );
}

export default function AccountScreen() {
  const { user } = useCurrentUser();
  const auth = useAuth();
  const { orders: monthlyOrders } = useMonthlyOrders();
  useWorkplaceInfoBackfill();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const { height: screenHeight } = useWindowDimensions();

  const name = user?.fullName ?? "—";
  const phone = user?.phone ?? "";
  const displayCompanyName = user?.companyName;
  const companySubtitle = displayCompanyName ? (
    displayCompanyName
  ) : user?.companyId ? (
    <Spinner color="#00A76F" size="small" />
  ) : undefined;
  const branches = user?.branches ?? [];
  const monthlyTotal = monthlyOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const headerCardOpacity = scrollY.interpolate({
    inputRange: [AVATAR_SECTION_HEIGHT - 40, AVATAR_SECTION_HEIGHT],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerTitleY = scrollY.interpolate({
    inputRange: [AVATAR_SECTION_HEIGHT - 40, AVATAR_SECTION_HEIGHT],
    outputRange: [8, 0],
    extrapolate: "clamp",
  });

  const avatarOpacity = scrollY.interpolate({
    inputRange: [0, AVATAR_SECTION_HEIGHT * 0.55],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const totalHeaderHeight = insets.top + HEADER_HEIGHT;

  return (
    <YStack flex={1} backgroundColor="#FFFFFF">
      {/* Back button — doim ko'rinadi, absolute */}
      <View
        style={{
          position: "absolute",
          top: insets.top + 12,
          left: 16,
          zIndex: 20,
        }}
      >
        <HeaderBackButton />
      </View>

      {/* Header card — scroll qilinganda paydo bo'ladi */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          opacity: headerCardOpacity,
          backgroundColor: "#FFFFFF",
          borderBottomLeftRadius: 36,
          borderBottomRightRadius: 36,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 14,
          elevation: Platform.select({ android: 4, default: 6 }),
        }}
      >
        <Animated.View
          style={{
            paddingTop: insets.top,
            height: totalHeaderHeight,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ translateY: headerTitleY }],
          }}
        >
          <Text
            fontFamily="$heading"
            fontSize={15}
            fontWeight="700"
            color="#1C1C1E"
          >
            {name}
          </Text>
          <Text fontFamily="$body" fontSize={12} color="#8E8E93">
            {phone}
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Scroll content */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical
        bounces
        overScrollMode="always"
        contentContainerStyle={{
          paddingTop: insets.top + 54,
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom + 24, 40),
          gap: 12,
          minHeight: screenHeight + AVATAR_SECTION_HEIGHT + HEADER_SCROLL_EXTRA,
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {/* Avatar + ism + telefon — scroll bilan yo'qoladi */}
        <Animated.View style={{ opacity: avatarOpacity }}>
          <YStack alignItems="center" gap={10} paddingVertical={12}>
            <ProfileAvatar name={name} avatarUrl={user?.avatarUrl} size={88} />
            <YStack alignItems="center" gap={3}>
              <Text
                fontFamily="$heading"
                fontSize={22}
                fontWeight="700"
                color="#1C1C1E"
              >
                {name}
              </Text>
              <Text fontFamily="$body" fontSize={14} color="#8E8E93">
                {phone}
              </Text>
            </YStack>
          </YStack>
        </Animated.View>

        {/* Kompaniya ma'lumotlari */}
        {user && (
          <Card>
            <MenuRow
              icon="person-outline"
              label="Profilni tahrirlash"
              subtitle="Ism va rasm"
              onPress={() => router.push("/edit-profile")}
            />
            <Divider />
            <MenuRow
              icon="business-outline"
              label="Kompaniya"
              subtitle={companySubtitle ?? "Tanlanmagan"}
            />
            <Divider />
            {branches.length > 0 ? (
              branches.map((branch) => (
                <React.Fragment key={branch.id}>
                  <MenuRow
                    icon="location-outline"
                    label="Filial"
                    title={branch.name}
                  />
                  <Divider />
                </React.Fragment>
              ))
            ) : (
              <>
                <MenuRow
                  icon="location-outline"
                  label="Filial"
                  title={user.branchName || "Tanlanmagan"}
                />
                <Divider />
              </>
            )}
            <MenuRow
              icon="wallet-outline"
              label="Oylik xarajat"
              subtitle={formatMoney(monthlyTotal)}
            />
          </Card>
        )}

        <Card>
          <MenuRow
            icon="shield-checkmark-outline"
            label="Maxfiylik siyosati"
            subtitle="Ma'lumotlaringiz qanday ishlatiladi"
            onPress={() => void openPrivacyPolicy()}
          />
        </Card>

        {/* Chiqish */}
        <TouchableOpacity
          activeOpacity={0.82}
          disabled={auth.logout.isPending}
          onPress={
            auth.logout.isPending
              ? undefined
              : () =>
                  auth.logout.mutate(undefined, {
                    onSettled: () => router.replace("/login"),
                  })
          }
        >
          <YStack
            backgroundColor={PROFILE_BUTTON_COLOR}
            borderRadius={20}
            overflow="hidden"
          >
            <XStack
              alignItems="center"
              justifyContent={auth.logout.isPending ? "center" : "flex-start"}
              gap={12}
              paddingVertical={18}
              paddingHorizontal={16}
            >
              {auth.logout.isPending ? (
                <Spinner color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="exit-outline" size={22} color="#FFFFFF" />
                  <Text
                    fontFamily="$heading"
                    flex={1}
                    fontSize={15}
                    fontWeight="700"
                    color="#FFFFFF"
                  >
                    Chiqish
                  </Text>
                  <Ionicons name="chevron-forward" size={17} color="#FFFFFF" />
                </>
              )}
            </XStack>
          </YStack>
        </TouchableOpacity>
      </Animated.ScrollView>
    </YStack>
  );
}
