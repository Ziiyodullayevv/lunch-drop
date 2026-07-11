import { Linking } from "react-native";

export const SUPPORT_BOT_URL = "https://t.me/lunchdropuzbot";
export const PRIVACY_POLICY_URL = "https://lunchdrop.uz/privacy-policy";
export const TERMS_OF_USE_URL = "https://lunchdrop.uz/terms-of-use";

export function openSupportBot() {
  return Linking.openURL(SUPPORT_BOT_URL);
}

export function openPrivacyPolicy() {
  return Linking.openURL(PRIVACY_POLICY_URL);
}

export function openTermsOfUse() {
  return Linking.openURL(TERMS_OF_USE_URL);
}
