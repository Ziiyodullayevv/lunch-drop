import { Image } from "expo-image";
import React, { useEffect } from "react";
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

type LaunchSplashProps = {
  onFinish: () => void;
  readyToFinish: boolean;
};

export function LaunchSplash({ onFinish, readyToFinish }: LaunchSplashProps) {
  const overlayOpacity = useSharedValue(1);
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.82);
  const logoY = useSharedValue(16);
  const textOpacity = useSharedValue(0);
  const textY = useSharedValue(14);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withSequence(
      withTiming(1.04, {
        duration: 520,
        easing: Easing.out(Easing.cubic),
      }),
      withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.quad),
      }),
    );
    logoY.value = withTiming(0, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
    });
    textOpacity.value = withDelay(
      260,
      withTiming(1, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
      }),
    );
    textY.value = withDelay(
      260,
      withTiming(0, {
        duration: 360,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [logoOpacity, logoScale, logoY, textOpacity, textY]);

  useEffect(() => {
    if (!readyToFinish) return;

    overlayOpacity.value = withDelay(
      180,
      withTiming(
        0,
        { duration: 320, easing: Easing.out(Easing.quad) },
        (finished) => {
          if (finished) runOnJS(onFinish)();
        },
      ),
    );
  }, [onFinish, overlayOpacity, readyToFinish]);

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
    <Animated.View pointerEvents="none" style={[styles.overlay, overlayStyle]}>
      <View style={styles.center}>
        <Animated.View style={logoStyle}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
        </Animated.View>
        <Animated.Text style={[styles.title, textStyle]}>
          LUNCH DROP
        </Animated.Text>
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
