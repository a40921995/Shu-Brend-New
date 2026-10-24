# SHU BREND — Render Hostingga Joylashtirish Bo‘yicha Qo‘llanma

Ushbu loyiha **Render.com** platformasida **Web Service** sifatida 100% muammosiz ishlashga to‘liq tayyorlandi.

---

## 1. Asosiy Sozlamalar (Render Dashboard)

Render boshqaruv panelida yangi xizmat oching:
- **Service Type:** `Web Service`
- **Environment / Runtime:** `Node`
- **Region:** Frankfurt (Frankfurt, EU) yoki Singapore (O‘zbekistonga eng yaqin)
- **Branch:** `main`

### ⚙️ Buyruqlar (Commands)
| Parametr | Qiymati |
| :--- | :--- |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

> Izoh: `npm start` buyrug‘i `package.json` dagi `"start": "tsx server.ts"` orqali Express backendni va `dist/` frontendini birgalikda ishga tushiradi.

---

## 2. Muhit O‘zgaruvchilari (Environment Variables)

Render-da **Environment** bo‘limiga quyidagi o‘zgaruvchilarni kiriting:

| Kalit (Key) | Tavsiya etilgan qiymat | Tavsifi |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Saytni ishlab chiqarish rejimida ishlatish |
| `PORT` | `10000` | Render o‘zi avtomatik belgilaydi (yoki 10000) |
| `TELEGRAM_BOT_TOKEN` | `1234567890:ABCdef...` | @BotFather dan olingan bot tokeni |
| `TELEGRAM_CHAT_ID` | `123456789` yoki `-100...` | Xabarlar boradigan admin yoki guruh ID si |
| `ADMIN_USERNAME` | `admin` | Admin panel uchun login |
| `ADMIN_PASSWORD` | `KattaHarf_12_BelgiliParol!` | Admin xavfsiz paroli (kamida 12 belgi) |
| `SERVER_SECRET` | `shu_brend_32_harfli_maxfiy_kalit_2025` | Shifrlash kalitlari uchun maxfiy so‘z |
| `DATA_DIR` | `/var/data` (Disk ulangan bo‘lsa) | Doimiy baza katalogi |
| `UPLOADS_DIR` | `/var/data/uploads` (Disk bo‘lsa) | Doimiy yuklangan rasmlar katalogi |

---

## 3. Doimiy Ma'lumotlar Bazasi va Rasmlar (Render Persistent Disk)

Render-da server qayta yuklanganda (redeploy yoki restart) fayllar o‘chib ketmasligi uchun:
1. Render xizmatida **Disks** bo‘limiga kiring.
2. **Add Disk** tugmasini bosing:
   - **Name:** `shu-brend-data`
   - **Mount Path:** `/var/data`
   - **Size:** `1 GB` (yoki ko‘proq)
3. Environment variables-ga quyidagilarni kiriting:
   - `DATA_DIR=/var/data`
   - `UPLOADS_DIR=/var/data/uploads`

> Agar Persistent Disk ulanmasa, dastur loyiha ichidagi `./data` va `./public/uploads` kataloglaridan xatosiz foydalanadi.

---

## 4. Telegram Mini App Sozlash

Telegram botingiz orqali Admin boshqaruvini ishga tushirish:
1. Telegramda **@BotFather** ga kiring.
2. `/newapp` buyrug‘ini bering yoki botingizni tanlang.
3. Web App URL manziliga quyidagini kiriting:
   `https://SIZNING-RENDER-DOMENINGIZ.onrender.com/telegram-admin`
4. Endi administratorlar Telegramdan chiqmasdan barcha yangi buyurtmalarni ko‘rishlari, to‘lovni tasdiqlashlari va mijozga bir bosishda qo‘ng‘iroq qilishlari mumkin.

---

## 5. Natija va Xavfsizlik

- **404 xatosi yo‘q:** Barcha sahifalar (shu jumladan `/telegram-admin`, `/clothing`, `/cart`) sahifa yangilanganda ham Express SPA router orqali bekamu-ko‘st ochiladi.
- **Xavfsiz admin autentifikatsiyasi:** Server tomonida `scrypt` va tuzli (salt) shifrlash bilan himoyalangan.
- **HUMO karta to‘lovlari:** Click va Paynet orqali karta raqamiga to‘g‘ridan-to‘g‘ri pul o‘tkazish tizimi to‘liq saqlangan.
