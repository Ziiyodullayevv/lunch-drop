import { Linking } from "react-native";

export const SUPPORT_BOT_URL = "https://t.me/lunchdropuzbot";
export const PRIVACY_POLICY_URL = "https://lunchdrop.uz/privacy-policy";

export function openSupportBot() {
  return Linking.openURL(SUPPORT_BOT_URL);
}

export function openPrivacyPolicy() {
  return Linking.openURL(PRIVACY_POLICY_URL);
}
