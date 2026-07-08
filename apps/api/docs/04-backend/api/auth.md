# Auth API

**Prefix:** `/api/v1/auth`

Auth endpointlar token talab qilmaydi.

---

## POST `/auth/otp/send` — SMS OTP yuborish (mobile)

```json
{ "phone": "+998901234567" }
```

**Response:**
```json
{ "message": "OTP sent", "expires_in": 120 }
```

> **Rate limiting (majburiy):** bitta telefon/IP uchun OTP yuborishni cheklash (masalan 1 daqiqada 1 ta, soatiga 5 ta). `verify` da noto'g'ri kod urinishlarini cheklash (masalan 5 urinishdan keyin kod bekor). Aks holda SMS-flood va brute-force xavfi. (`@.claude/rules/security.md`)

---

## POST `/auth/otp/verify` — OTP tasdiqlash (mobile)

```json
{ "phone": "+998901234567", "code": "123456" }
```

**Response:** `TokenResponse`
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

---

## POST `/auth/login` — Admin login (email + parol)

```json
{ "email": "admin@example.com", "password": "secret" }
```

**Response:** `TokenResponse` (yuqoridagi format)

---

## POST `/auth/refresh` — Token yangilash

```json
{ "refresh_token": "eyJ..." }
```

**Response:** yangi `TokenResponse`

---

## POST `/auth/logout` — Chiqish

```json
{ "refresh_token": "eyJ..." }
```

Refresh token DB dan o'chiriladi. **Status:** 204

---

## GET `/auth/me` — Joriy foydalanuvchi

**Header:** `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "phone": "+998901234567",
    "name": "Ali Valiyev",
    "role": "employee",
    "branch_id": "uuid",
    "company_id": "uuid",
    "status": "active"
  }
}
```

---

## Token formati

- **Access token:** JWT RS256, 15 daqiqa amal qiladi
- **Refresh token:** JWT RS256, 30 kun. Backend'da `refresh_tokens` jadvalida saqlanadi (logout/rotation uchun)
- Kalitlar: `backend/keys/private.pem`, `backend/keys/public.pem` — **git'ga tushmaydi** (`.gitignore`'da `*.pem`/`keys/`). Private key faqat server'da/maxfiy saqlanadi
- 401 kelganda avtomatik refresh, keyin retry

> **Token saqlash (tavsiya):** 30-kunlik refresh token JS'ga ochiq joyda (`localStorage`/`sessionStorage`) saqlanmasin — XSS xavfi. Web admin uchun refresh token `httpOnly` + `Secure` cookie'da, mobile uchun `expo-secure-store` (Keychain/Keystore) da saqlansin. Bu kontrakt backend tomondan ham (cookie set/clear) hisobga olinishi kerak.
