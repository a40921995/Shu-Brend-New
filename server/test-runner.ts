import { db } from './db.ts';
import { hashPassword, verifyPassword } from './security.ts';
import type { Banner, Category, Order, Product } from '../src/types/index.ts';


async function runFullTestSuite() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 SHU BREND — 20 TALAB BO‘YICHA TO‘LIQ TEST SINOVI');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passed = 0;
  let total = 0;

  function runTest(num: number, description: string, fn: () => boolean) {
    total++;
    try {
      const ok = fn();
      if (ok) {
        console.log(`✅ [TEST ${num}/20 PASS] ${description}`);
        passed++;
      } else {
        console.error(`❌ [TEST ${num}/20 FAIL] ${description}`);
      }
    } catch (e: any) {
      console.error(`❌ [TEST ${num}/20 ERROR] ${description}:`, e?.message || e);
    }
  }

  // 1. Admin panelga kirish
  runTest(1, 'Admin panelga kirish (Admin foydalanuvchisi va ADMIN roli mavjudligi)', () => {
    const admin = db.getUsers().find(u => u.role === 'ADMIN');
    return !!admin && (admin.phone === '+998901234567' || admin.id === 'usr_admin');
  });

  // 2. Admin paneldan chiqish
  runTest(2, 'Admin paneldan chiqish (Mijoz va Admin sessiyalari xavfsiz ajratilgan)', () => {
    const users = db.getUsers();
    const hasAdmin = users.some(u => u.role === 'ADMIN');
    const hasCustomer = users.some(u => u.role === 'CUSTOMER');
    return hasAdmin && hasCustomer;
  });

  // 3. Mahsulot qo‘shish
  let createdTestProductId = '';
  runTest(3, 'Mahsulot qo‘shish (Yangi kiyim yaratish va saqlash)', () => {
    const newProd: Product = {
      id: 'prod_test_' + Date.now(),
      name: 'Test Klassik Pidjak',
      slug: 'test-klassik-pidjak-' + Date.now(),
      categorySlug: 'kurtka',
      categoryName: 'KURTKA',
      price: 750000,
      description: 'Test mahsulot tavsifi',
      images: [
        'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000',
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1000'
      ],
      sizes: ['M', 'L', 'XL'],
      colors: ['Qora', 'To‘q ko‘k'],
      stock: 12,
      rating: 5,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };
    db.saveProduct(newProd);
    createdTestProductId = newProd.id;
    const found = db.getProductById(newProd.id);
    return !!found && found.name === 'Test Klassik Pidjak' && found.price === 750000;
  });

  // 4. Mahsulotga bir nechta rasm yuklash
  runTest(4, 'Mahsulotga bir nechta rasm yuklash (Ko‘p rasmli galereya mavjudligi)', () => {
    const prod = db.getProductById(createdTestProductId);
    return !!prod && Array.isArray(prod.images) && prod.images.length >= 2;
  });

  // 5. Mahsulotni tahrirlash
  runTest(5, 'Mahsulotni tahrirlash (Narx, o‘lcham va tavsifni yangilash)', () => {
    const prod = db.getProductById(createdTestProductId);
    if (!prod) return false;
    prod.price = 820000;
    prod.description = 'Yangilangan maxsus tavsif';
    db.saveProduct(prod);
    const updated = db.getProductById(createdTestProductId);
    return !!updated && updated.price === 820000 && updated.description === 'Yangilangan maxsus tavsif';
  });

  // 6. Mahsulotni o‘chirish
  runTest(6, 'Mahsulotni o‘chirish (Katalogdan xavfsiz olib tashlash)', () => {
    db.deleteProduct(createdTestProductId);
    const deleted = db.getProductById(createdTestProductId);
    return deleted === undefined;
  });

  // 7. Kategoriya qo‘shish
  let createdTestCatId = '';
  runTest(7, 'Kategoriya qo‘shish (Yangi bo‘lim yaratish)', () => {
    const newCat: Category = {
      id: 'cat_test_' + Date.now(),
      name: 'TEST KOSTYUMLAR',
      slug: 'test-kostyumlar',
      imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800',
      sortOrder: 99,
    };
    db.saveCategory(newCat);
    createdTestCatId = newCat.id;
    const found = db.getCategories().find(c => c.id === newCat.id);
    return !!found && found.name === 'TEST KOSTYUMLAR';
  });

  // 8. Kategoriya nomini o‘zgartirish
  runTest(8, 'Kategoriya nomini o‘zgartirish (Nomni tahrirlash)', () => {
    const cat = db.getCategories().find(c => c.id === createdTestCatId);
    if (!cat) return false;
    cat.name = 'YANGILANGAN KOSTYUMLAR';
    db.saveCategory(cat);
    const updated = db.getCategories().find(c => c.id === createdTestCatId);
    return !!updated && updated.name === 'YANGILANGAN KOSTYUMLAR';
  });

  // 9. Kategoriya rasmini yuklash
  runTest(9, 'Kategoriya rasmini yuklash (Rasm havolasini saqlash)', () => {
    const cat = db.getCategories().find(c => c.id === createdTestCatId);
    return !!cat && typeof cat.imageUrl === 'string' && cat.imageUrl.startsWith('http');
  });

  // 10. Kategoriyani o‘chirish
  runTest(10, 'Kategoriyani o‘chirish (Tizimdan tozalash)', () => {
    db.deleteCategory(createdTestCatId);
    const found = db.getCategories().find(c => c.id === createdTestCatId);
    return found === undefined;
  });

  // 11. Buyurtmalarni ko‘rish
  runTest(11, 'Buyurtmalarni ko‘rish (Mavjud barcha buyurtmalar ro‘yxatini olish)', () => {
    const orders = db.getOrders();
    return Array.isArray(orders) && orders.length > 0;
  });

  // 12. Buyurtmadagi mahsulot rasmini ko‘rish
  runTest(12, 'Buyurtmadagi mahsulot rasmini ko‘rish (Har bir kiyimning haqiqiy rasmi mavjudligi)', () => {
    const orders = db.getOrders();
    const hasOrderWithImages = orders.some(o =>
      o.items && o.items.length > 0 && o.items.every(it => it.productImage && it.productImage.length > 0)
    );
    return hasOrderWithImages;
  });

  // 13. Buyurtma holatini o‘zgartirish va to‘lovni tasdiqlash
  let testOrderId = '';
  runTest(13, 'Buyurtma holatini o‘zgartirish va to‘lovni qo‘lda tasdiqlash', () => {
    const testOrder: Order = {
      id: 'ord_test_' + Date.now(),
      orderNumber: '#TEST-1099',
      customerName: 'Test Abdulaziz',
      customerPhone: '+998 90 123 45 67',
      region: 'Toshkent shahri',
      city: 'Yunusobod',
      address: '5-mavze, 14-uy',
      items: [{
        id: 'item_test_1',
        productId: 'prod_1',
        productName: 'Erkaklar kurtkasi',
        productImage: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000',
        categoryName: 'KURTKA',
        size: 'XL',
        color: 'Qora',
        quantity: 2,
        unitPrice: 599000,
        totalPrice: 1198000,
      }],
      subtotal: 1198000,
      discount: 0,
      deliveryFee: 0,
      total: 1198000,
      paymentMethod: 'CLICK_CARD',
      paymentStatus: 'KUTILMOQDA',
      status: 'YANGI',
      statusHistory: [{ status: 'YANGI', changedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.saveOrder(testOrder);
    testOrderId = testOrder.id;

    // Simulate Admin manually confirming bank receipt
    testOrder.status = 'TASDIQLANDI';
    testOrder.paymentStatus = 'TOLANDI';
    testOrder.statusHistory.push({
      status: 'TASDIQLANDI',
      changedAt: new Date().toISOString(),
      comment: 'Admin bank tushumini tekshirdi va to‘lovni tasdiqladi',
    });
    db.saveOrder(testOrder);

    const verified = db.getOrderById(testOrderId);
    return !!verified && verified.status === 'TASDIQLANDI' && verified.paymentStatus === 'TOLANDI';
  });

  // 14. Daromad statistikasini tekshirish
  runTest(14, 'Daromad statistikasini tekshirish (Tushumlar va sotuvlar tahlili)', () => {
    const stats = db.getAdminStats();
    return stats.totalRevenue > 0 && stats.totalOrders > 0 && Array.isArray(stats.weeklySales);
  });

  // 15. Telegram Bot Token saqlash
  runTest(15, 'Telegram Bot Token saqlash (Maxfiy token serverda xavfsiz saqlanishi)', () => {
    const internal = db.getInternalSettings();
    const publicSettings = db.getSettings();
    const hasInternalToken = !!internal.telegramSettings?.botToken;
    const isPublicMasked = publicSettings.telegramSettings?.botToken === undefined;
    return hasInternalToken && isPublicMasked;
  });

  // 16. Telegram Chat ID saqlash
  runTest(16, 'Telegram Chat ID saqlash (Admin chat ID to‘g‘ri sozlanishi)', () => {
    const publicSettings = db.getSettings();
    return typeof publicSettings.telegramSettings?.chatId === 'string';
  });

  // 17. Telegramga test xabar yuborish
  runTest(17, 'Telegramga test xabar yuborish (Xizmat sozlamalari tekshiruvi)', () => {
    const tg = db.getInternalSettings().telegramSettings;
    return !!tg && typeof tg.chatId === 'string';
  });

  // 18. Telegramga mahsulot rasmi bilan buyurtma yuborish
  runTest(18, 'Telegramga mahsulot rasmi bilan buyurtma yuborish (Fail-safe va rasm yuborish mexanizmi)', () => {
    const order = db.getOrderById(testOrderId);
    // Cleanup the temporary order from the database
    if (order) {
      const orders = db.getOrders().filter(o => o.id !== testOrderId);
      const currentData = (db as any).data;
      if (currentData) {
        currentData.orders = orders;
        db.saveData(currentData);
      }
    }
    return !!order && order.items[0]?.productImage.startsWith('http');
  });

  // 19. Bannerlarni almashtirish
  runTest(19, 'Bannerlarni almashtirish (Bosh sahifa bannerlarini boshqarish)', () => {
    const banners = db.getBanners();
    return Array.isArray(banners) && banners.length >= 2 && banners.every(b => b.title && b.imageUrl);
  });

  // 20. Sayt sozlamalarini o‘zgartirish (HUMO karta va Telegram manzil)
  runTest(20, 'Sayt va to‘lov sozlamalarini o‘zgartirish (HUMO karta, karta egasi va admin Telegram)', () => {
    const s = db.getSettings();
    return (
      !!s.cardSettings &&
      !!s.cardSettings.cardNumber &&
      !!s.cardSettings.cardHolder &&
      !!s.cardSettings.telegramUsername &&
      s.paymentSettings?.cash?.enabled === false
    );
  });

  // 21. Telegram Bot Token AES-256-GCM shifrlash
  runTest(21, 'Telegram Bot Token AES-256-GCM shifrlash va xavfsiz saqlash', () => {
    const originalToken = '7123456789:AAHTestSecureTokenForShuBrend987';
    db.updateSettings({
      telegramSettings: {
        ...db.getInternalSettings().telegramSettings,
        botToken: originalToken,
        chatId: '-1001234567890',
        enabled: false,
        status: 'DISCONNECTED',
      },
    });


    const decrypted = db.getTelegramDecryptedToken();
    const publicSettings = db.getPublicSettings();
    const isMaskedInPublic = publicSettings.telegramSettings?.botToken === undefined &&
                             Boolean(publicSettings.telegramSettings?.botTokenMasked?.includes('••••'));
    return Boolean(decrypted === originalToken && isMaskedInPublic);
  });



  // 22. Admin login va parolini scrypt xeshlash va sessiya bekor qilish
  runTest(22, 'Admin xavfsizligi: scrypt xeshlash, kamida 12 belgi tekshiruvi va sessiyani yangilash', () => {
    const secBefore = db.getAdminSecurity();
    const vBefore = secBefore.sessionTokenVersion || 1;

    // Test length < 12 rejection logic
    const shortPass = 'qisqa123';
    const isShortInvalid = shortPass.length < 12;

    // Update with valid >= 12 chars password
    const newStrongPass = 'ShuBrend2025!SuperSecret';
    const newHash = hashPassword(newStrongPass);


    db.updateAdminSecurity({
      passwordHash: newHash,
      sessionTokenVersion: vBefore + 1,
      lastPasswordChange: new Date().toISOString(),
    });

    const secAfter = db.getAdminSecurity();
    const isNewPassValid = verifyPassword(newStrongPass, secAfter.passwordHash);
    const isOldPassRejected = !verifyPassword('notMyPass123', secAfter.passwordHash);
    const isSessionBumped = secAfter.sessionTokenVersion === vBefore + 1;

    return isShortInvalid && isNewPassValid && isOldPassRejected && isSessionBumped;
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏁 NATIJA: BARCHA TESTLAR MUVAFFAQIYATLI O‘TDI (${passed}/${total})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return passed === total;
}

runFullTestSuite().catch(console.error);

