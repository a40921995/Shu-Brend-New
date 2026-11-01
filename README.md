# SHU BREND — Erkaklar Kiyim Do‘koni E-Commerce Platformasi

SHU BREND — zamonaviy, xavfsiz va to‘liq avtomatlashtirilgan erkaklar kiyimi internet-do‘koni.

## 🚀 Texnologik Stek
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion
- **Backend:** Node.js, Express, Multer (fayl yuklash), TSX
- **Xavfsizlik:** Scrypt password hashing, AES-256-GCM token shifrlash, Timing-safe taqqoslash, Rate-limiting, XSS & Path Traversal himoyasi
- **Integratsiyalar:** BILLZ POS/ERP API, Telegram Bot & Telegram Mini App, Click, Payme, HUMO karta to‘lovlari

## 🔑 Super Admin Kirish Ma'lumotlari
- **Admin Panel Logini:** `admin.1212`
- **Admin Panel Paroli:** `shubrend.2026`
- **Tiklash mexanizmi:** Telegram 6-xonali OTP va Favqulodda Master Tiklash Kaliti (`SHU-RCV-...`)

## 🛠 Ishga Tushirish Buyruqlari
```bash
# Bog‘liqliklarni o‘rnatish
npm install

# Ishlab chiqarish uchun build qilish
npm run build

# TypeScript tekshiruvi
npm run typecheck

# Avtomatlashtirilgan testlarni ishga tushirish
npm test

# Serverni ishga tushirish
npm run start
```

## 🌐 Render Hostingga Joylashtirish
Batafsil ma'lumotlar uchun `RENDER_DEPLOYMENT.md` fayliga qarang.
Build Command: `npm install && npm run build`
Start Command: `npm run start`
Health Check: `/health`
