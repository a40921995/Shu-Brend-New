# SHU BREND — Render Hostingga Joylashtirish Bo‘yicha Mukammal Qo‘llanma

Ushbu hujjat **SHU BREND erkaklar kiyim do‘koni** internet-do‘koni platformasini **Render.com** bulutli hosting xizmatiga muvaffaqiyatli, xavfsiz va to‘liq avtomatlashtirilgan tarzda joylashtirish (deploy) jarayonini tushuntiradi.

---

## 1. Asosiy Xizmat Parametrlari (Render Dashboard)

Render boshqaruv panelida (**dashboard.render.com**) yangi xizmat yarating:

- **Service Type:** `Web Service`
- **Environment / Runtime:** `Node`
- **Region:** Frankfurt (EU) yoki Singapore (O‘zbekiston hududiga eng past kechikish / ping)
- **Branch:** `main` (yoki `master`)
- **Health Check Path:** `/health` (yoki `/api/health`)

### ⚙️ Build va Start Buyruqlari
| Parametr | Qiymati |
| :--- | :--- |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm run start` |

> **Eslatma:** `npm run start` buyrug‘i `package.json` orqali `tsx server.ts` ni ishga tushiradi. Server ishlab chiqarish (production) rejimida avtomatik ravishda `dist/` papkasidagi kompillatsiya qilingan React frontendini taqdim etadi va `0.0.0.0` hostida Render belgilagan `PORT` (odatda 10000) orqali tinglaydi.

---

## 2. Muhit O‘zgaruvchilari (Environment Variables)

Render boshqaruv panelidagi **Environment** bo‘limiga quyidagi kalitlarni kiriting:

| Kalit (Key) | Standart / Tavsiya etilgan qiymat | Tavsifi |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Ishlab chiqarish rejimini faollashtiradi (Vite dev server o‘rniga to‘g‘ridan-to‘g‘ri static frontend uzatiladi) |
| `PORT` | `10000` | Render server porti |
| `ADMIN_USERNAME` | `admin.1212` | Super Admin panel logini |
| `ADMIN_PASSWORD` | `shubrend.2026` | Super Admin panel paroli |
| `SERVER_SECRET` | `shu_brend_ultra_secure_server_secret_2026_xyz` | AES-256-GCM shifrlash kaliti (kamida 32 ta tasodifiy belgi) |
| `DATA_DIR` | `/var/data` | Ma'lumotlar bazasi saqlanadigan doimiy katalog (Persistent Disk) |
| `UPLOADS_DIR` | `/var/data/uploads` | Yuklangan tovar rasmlari saqlanadigan doimiy katalog (Persistent Disk) |
| `TELEGRAM_BOT_TOKEN` | *(Ixtiyoriy)* | Telegram bot tokeni (@BotFather dan olingan) |
| `TELEGRAM_CHAT_ID` | *(Ixtiyoriy)* | Yangi buyurtmalar keladigan admin Telegram chat ID |
| `BILLZ_API_URL` | `https://api-admin.billz.ai` | BILLZ rasmiy API manzili |
| `BILLZ_API_KEY` | *(Ixtiyoriy)* | BILLZ platformasidan olingan API kaliti |
| `BILLZ_PLATFORM_ID` | *(Ixtiyoriy)* | BILLZ platforma identifikatori |

---

## 3. Doimiy Ma'lumotlar Bazasi va Rasmlar (Render Persistent Disk)

Render-da konteyner qayta ishga tushganda yoki yangi versiya yuklanganda tovarlar, buyurtmalar va rasmlar yo‘qolmasligi uchun:

1. Render Web Service sozlamalaridagi **Disks** bo‘limiga kiring.
2. **Add Disk** tugmasini bosing:
   - **Name:** `shu-brend-disk`
   - **Mount Path:** `/var/data`
   - **Size:** `5 GB` yoki `10 GB`
3. Environment variables bo‘limida:
   - `DATA_DIR=/var/data`
   - `UPLOADS_DIR=/var/data/uploads`
   sozlamalarini ko‘rsating.

---

## 4. Telegram Mini App Sozlash

1. Telegramda **@BotFather** botiga kiring.
2. `/newapp` buyrug‘ini yuboring va botingizni tanlang.
3. Web App URL manziliga quyidagini kiriting:
   `https://SIZNING-LOYIHA-NOMI.onrender.com/telegram-admin`
4. Endi administratorlar Telegram ichida to‘g‘ridan-to‘g‘ri buyurtmalarni ko‘rib, ularni tasdiqlashlari mumkin.

---

## 5. Render Blueprint orqali 1-Bosqichli Ishga Tushirish

Loyihaning ildiz papkasida `render.yaml` fayli tayyorlangan. Agar siz loyihani GitHub ombori orqali Renderga "Blueprint" sifatida ulasangiz, barcha sozlamalar, buyruqlar va disk avtomatik konfiguratsiya qilinadi.
