export const PRODUCTION_API_URL = "https://api.lunchdrop.uz/api/v1";

export const appConfig = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? PRODUCTION_API_URL,
  useMockApi: process.env.EXPO_PUBLIC_USE_MOCK_API === "true",
  supportPhone: "+998 90 000 00 00",
} as const;

export const moneyFormatter = new Intl.NumberFormat("uz-UZ", {
  maximumFractionDigits: 0,
});

export function formatMoney(value: number) {
  return `${moneyFormatter.format(value)} so'm`;
}
