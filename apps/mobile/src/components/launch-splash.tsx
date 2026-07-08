import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const LOGO = require("@/assets/images/launch-drop-logo-gradient-80.svg");
const MIN_VISIBLE_MS = 1300;

type LaunchSplashProps = {
  onFinish: () => void;
  onReady?: () => void;
  readyToFinish: boolean;
};

export function LaunchSplash({ onFinish, onReady, readyToFinish }: LaunchSplashProps) {
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const overlayOpacity = useSharedValue(1);
  const logoOpacity = useSharedValue(1);
  const logoScale = useSharedValue(1);
  const logoY = useSharedValue(0);
  const textOpacity = useSharedValue(1);
  const textY = useSharedValue(0);

  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    logoScale.value = withSequence(
      withTiming(0.96, {
        duration: 120,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(1.08, {
        duration: 460,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(1, {
        duration: 260,
        easing: Easing.out(Easing.quad),
      }),
    );
    logoY.value = withSequence(
      withTiming(-8, {
        duration: 460,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(0, {
        duration: 260,
        easing: Easing.out(Easing.quad),
      }),
    );
    textOpacity.value = withSequence(
      withTiming(0.72, {
        duration: 120,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(1, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
      }),
    );
    textY.value = withSequence(
      withTiming(6, {
        duration: 120,
        easing: Easing.out(Easing.quad),
      }),
      withTiming(0, {
        duration: 420,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [logoScale, logoY, textOpacity, textY]);

  useEffect(() => {
    if (!readyToFinish || !minimumElapsed) return;

    overlayOpacity.value = withDelay(
      120,
      withTiming(
        0,
        { duration: 340, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(onFinish)();
        },
      ),
    );
  }, [minimumElapsed, onFinish, overlayOpacity, readyToFinish]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }, { scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.overlay, overlayStyle]}
      onLayout={onReady}
    >
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
        </Animated.View>
        <Animated.Text style={[styles.title, textStyle]}>LUNCH DROP</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 36,
  },
  logo: {
    width: 132,
    height: 136,
  },
  title: {
    marginTop: 18,
    color: "#007867",
    fontFamily: "Fredoka_700Bold",
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 0,
  },
});
