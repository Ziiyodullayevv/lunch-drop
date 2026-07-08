# Mobile App Ekranlari

**Stack:** Expo (React Native) + Tamagui + React Query

---

## Auth oqimi

### LoginScreen — `app/(auth)/login.tsx`
Telefon raqam kiritish. "Davom etish" → OTP yuboriladi.

### VerifyOtpScreen — `app/(auth)/verify-otp.tsx`
6 raqamli OTP. Auto-submit. "Qayta yuborish" (60s countdown).

### InviteCodeScreen — `app/(auth)/invite-code.tsx`
Birinchi kiruvchi xodim uchun. Invite code → branch biriktiriladi.

---

## Onboarding

### CompaniesScreen — `app/(onboarding)/companies.tsx`
Kompaniya tanlash.

### BranchesScreen — `app/(onboarding)/branches.tsx`
Filial tanlash. Tanlangandan keyin asosiy tab'larga o'tish.

---

## Asosiy tab'lar

### HomeScreen — `app/(tabs)/home.tsx`

Barcha oshxonalarning taomlar listi. **Asosiy ekran.**

**Kun filtri:**
- Header'da 7 ta tab (Du … Yak), sliding red indicator (Reanimated)
- Boshlang'ich kun — Toshkent vaqti UTC+5 (Hermes'da `Date.now() + 5h` + `getUTC*`)
- ISO weekday: 1=Dushanba, 7=Yakshanba
- `useAllFoodItems(selectedDay)` → `?weekday=N` backend'ga yuboriladi
- Server filter qiladi, qaytgan taomlar ko'rsatiladi

**Komponentlar:**
- `FoodCard` — rasm, nom, narx, yetkazish vaqti, +/- button (animated)
- Brand header (scroll bilan yig'iladi)
- Pull-to-refresh

### OrdersScreen — `app/(tabs)/orders.tsx`
Buyurtmalar tarixi.

### FavoritesScreen — `app/(tabs)/favorites.tsx`
Sevimli oshxonalar.

### ProfileScreen — `app/(tabs)/profile.tsx`
Ism, telefon, branch. Chiqish.

---

## Kitchen oqimi

### KitchenDetailScreen — `app/kitchen/[id].tsx`

Oshxona menyusi.

**Kun filtri:**
- Chip-style tabs (Tamagui) — bugun yashil, tanlangan ko'k
- Boshlang'ich kun — Toshkent UTC+5 (ISO weekday)
- `useKitchen(id, selectedDay)` → `?weekday=N` backend'ga yuboriladi
- Backend filter qiladi — client-side filter yo'q

**Komponentlar:**
- `KitchenHeader` — cover, nom, reyting, cutoff vaqt
- `MenuItemCard` — taom nomi, narxi, +/- button
- `FloatingCartButton`

### FoodDetailScreen — `app/food/[id].tsx`
Taom detail — rasm, tavsif, kaloriya, teglar.

---

## Savat va buyurtma

### CartScreen (modal)
Savatdagi taomlar. Jami summa. "Buyurtma berish".

### OrderDetailScreen — `app/order/[id].tsx`
Status timeline. Taomlar. Summa. "Bekor qilish" (faqat pending).

### MyOrdersScreen — `app/my-orders.tsx`
Barcha buyurtmalar tarixi.

---

## Hooks

| Hook | Maqsad |
|------|--------|
| `useAllFoodItems(weekday)` | HomeScreen uchun barcha oshxona taomlar |
| `useKitchens()` | Oshxonalar ro'yxati |
| `useKitchen(id, weekday)` | Bitta oshxona menyusi |
| `useOrders()` | Buyurtmalar |
| `useActiveOrder()` | Faol buyurtma (active-order-bar) |
| `useCurrentUser()` | Joriy foydalanuvchi |

## Stores (Zustand)

| Store | Maqsad |
|-------|--------|
| `auth-store` | JWT token, user ma'lumoti |
| `cart-store` | Savat holati |
| `draft-order-store` | Checkout vaqtidagi holat |
| `preferences-store` | Foydalanuvchi sozlamalari |
