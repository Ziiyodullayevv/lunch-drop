import { useFonts } from "expo-font";
import { Fredoka_700Bold } from "@expo-google-fonts/fredoka";
import {
  NunitoSans_400Regular,
  NunitoSans_500Medium,
  NunitoSans_600SemiBold,
  NunitoSans_700Bold,
  NunitoSans_800ExtraBold,
} from "@expo-google-fonts/nunito-sans";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef } from "react";
import { Appearance, View } from "react-native";

import { AppProviders } from "@/components/app-providers";
Appearance.setColorScheme("light");
void SplashScreen.preventAutoHideAsync();

// Expo Go SDK 53+ does not support remote push notifications — must use development build
const isExpoGo = Constants.executionEnvironment === "storeClient";
const Notifications = isExpoGo
  ? null
  : (require("expo-notifications") as typeof import("expo-notifications"));

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_700Bold,
    NunitoSans_400Regular,
    NunitoSans_500Medium,
    NunitoSans_600SemiBold,
    NunitoSans_700Bold,
    NunitoSans_800ExtraBold,
  });
  const notificationListener = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    if (!Notifications) return;
    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {});
    return () => {
      notificationListener.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
        <AppProviders>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="kitchen/[id]" />
            <Stack.Screen name="order/[id]" />
            <Stack.Screen name="my-orders" />
            <Stack.Screen name="account" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="checkout" />
            <Stack.Screen
              name="food/[id]"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
              }}
            />
          </Stack>
          <StatusBar style="dark" backgroundColor="#FFFFFF" translucent={false} />
        </AppProviders>
    </View>
  );
}
