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
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useColorScheme } from "react-native";

import { AppProviders } from "@/components/app-providers";
import { LaunchSplash } from "@/components/launch-splash";

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

SplashScreen.setOptions({
  duration: 0,
  fade: false,
});
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [launchSplashFinished, setLaunchSplashFinished] = useState(false);
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
    SplashScreen.hideAsync();
  }, []);

  const finishLaunchSplash = useCallback(() => {
    setLaunchSplashFinished(true);
  }, []);

  const showLaunchSplash = !fontsLoaded || !launchSplashFinished;

  return (
    <>
      {fontsLoaded ? (
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
          <StatusBar
            style={
              showLaunchSplash || colorScheme !== "dark" ? "dark" : "light"
            }
          />
        </AppProviders>
      ) : (
        <StatusBar style="dark" />
      )}
      {showLaunchSplash ? (
        <LaunchSplash
          onFinish={finishLaunchSplash}
          readyToFinish={fontsLoaded}
        />
      ) : null}
    </>
  );
}
