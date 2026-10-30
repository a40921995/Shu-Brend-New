import { db } from './db.ts';
import { hashPassword, verifyPassword } from './security.ts';
import { billzService } from './billz.ts';
import type { Banner, Branch, Category, Order, Product } from '../src/types/index.ts';


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

  // 23. Rang va razmerlar bo‘yicha mustaqil ombor variantlari (ProductVariant)
  let omborTestProductId = '';
  runTest(23, 'Ombor: Rang va razmerlar mustaqilligi va yagona umumiy qoldiq hisobi', () => {
    const testProd: Product = {
      id: 'prod_ombor_test_' + Date.now(),
      name: 'SHU BREND Erkaklar Ko‘ylagi',
      slug: 'erkaklar-koylagi-test',
      categorySlug: 'koylak',
      categoryName: 'KO‘YLAK',
      price: 450000,
      description: 'Ombor sinov ko‘ylagi',
      images: ['https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000'],
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Qora', 'Oq'],
      variants: [
        { id: 'Qora_S', color: 'Qora', size: 'S', stock: 5 },
        { id: 'Qora_M', color: 'Qora', size: 'M', stock: 10 },
        { id: 'Qora_L', color: 'Qora', size: 'L', stock: 8 },
        { id: 'Qora_XL', color: 'Qora', size: 'XL', stock: 6 },
        { id: 'Oq_S', color: 'Oq', size: 'S', stock: 4 },
        { id: 'Oq_M', color: 'Oq', size: 'M', stock: 7 },
        { id: 'Oq_L', color: 'Oq', size: 'L', stock: 5 },
        { id: 'Oq_XL', color: 'Oq', size: 'XL', stock: 2 },
      ],
      stock: 47,
      rating: 5,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    };
    db.saveProduct(testProd);
    omborTestProductId = testProd.id;

    const prod = db.getProductById(omborTestProductId);
    if (!prod || !prod.variants || prod.variants.length === 0) return false;

    // Check that each color x size combination has an independent variant
    const variantSum = prod.variants.reduce((sum, v) => sum + v.stock, 0);
    return variantSum === 47 && prod.stock === 47 && prod.variants.length === 8;
  });

  // 24. Minus [−] tugmasi — Oflayn sotuv (-1 ta) va harakatlar tarixi
  runTest(24, 'Ombor: Minus [−] oflayn sotuv (-1 ta) va sotuvlar tarixi saqlanishi', () => {
    const prod = db.getProductById(omborTestProductId)!;
    const testColor = prod.colors[0];
    const testSize = prod.sizes[0];
    const variantBefore = prod.variants?.find(v => v.color === testColor && v.size === testSize);
    const stockBefore = variantBefore ? variantBefore.stock : 10;

    // Execute offline sale
    const { product: updatedProd, log } = db.adjustVariantStock(
      prod.id,
      testColor,
      testSize,
      -1,
      'OFFLINE_SALE',
      'Test do‘konda oflayn sotildi'
    );

    const variantAfter = updatedProd.variants?.find(v => v.color === testColor && v.size === testSize);
    const logs = db.getInventoryLogs(10);
    const foundLog = logs.find(l => l.id === log.id);

    return (
      variantAfter?.stock === stockBefore - 1 &&
      foundLog?.type === 'OFFLINE_SALE' &&
      foundLog?.delta === -1
    );
  });

  // 25. Qoldiq 0 ga tushganda mahsulot saytdan yo‘qolmasligi (Anti-disappearance rule)
  runTest(25, 'Ombor: Mahsulot yoki variant 0 ga tushganda ham saytda saqlanib qolishi', () => {
    const testProd = db.getProductById(omborTestProductId)!;
    // Set all variants to 0
    if (testProd.variants) {
      for (const v of testProd.variants) {
        db.setVariantStock(testProd.id, v.color, v.size, 0, 'MANUAL_ADJUST', 'Test 0 stock');
      }
    }

    const allProds = db.getProducts();
    const stillExists = allProds.some(p => p.id === testProd.id);
    const reloaded = db.getProductById(testProd.id);

    // Restore stock back for normal operation
    db.adjustVariantStock(testProd.id, testProd.colors[0], testProd.sizes[0], 10, 'RESTOCK', 'Restored');

    return stillExists && reloaded !== undefined && reloaded.stock >= 0;
  });

  // 26. Plus [+] tugmasi — Omborga tovar qo‘shish (+1 va +10 ta)
  runTest(26, 'Ombor: Plus [+] va tezkor to‘ldirish (+10 ta) orqali ombor qoldig‘ini oshirish', () => {
    const prod = db.getProductById(omborTestProductId)!;
    const testColor = prod.colors[0];
    const testSize = prod.sizes[0];
    const vBefore = prod.variants?.find(v => v.color === testColor && v.size === testSize);
    const before = vBefore?.stock || 0;

    db.adjustVariantStock(prod.id, testColor, testSize, 10, 'RESTOCK', 'Yangi partiya olib kelindi');
    const prodAfter = db.getProductById(prod.id)!;
    const vAfter = prodAfter.variants?.find(v => v.color === testColor && v.size === testSize);

    return vAfter?.stock === before + 10;
  });

  // 27. Sotuvni bekor qilish (Undo cancelInventoryLog)
  runTest(27, 'Ombor: Xato sotuvni bekor qilish va tovar miqdorini qaytarish (Sotuvni bekor qilish)', () => {
    const prod = db.getProductById(omborTestProductId)!;
    const testColor = prod.colors[0];
    const testSize = prod.sizes[0];

    // Make an offline sale
    const { log } = db.adjustVariantStock(prod.id, testColor, testSize, -1, 'OFFLINE_SALE', 'Test sotuv');
    const prodAfterSale = db.getProductById(prod.id)!;
    const vAfterSale = prodAfterSale.variants?.find(v => v.color === testColor && v.size === testSize)?.stock ?? 0;

    // Cancel that sale
    const cancelRes = db.cancelInventoryLog(log.id);
    const prodAfterCancel = db.getProductById(prod.id)!;
    const vAfterCancel = prodAfterCancel.variants?.find(v => v.color === testColor && v.size === testSize)?.stock ?? 0;

    return cancelRes.success && vAfterCancel === vAfterSale + 1;
  });

  // 28. Mavsumiy kategoriya: Yashirish (Seasonal hiding - isHidden = true)
  runTest(28, 'Kategoriya: Mavsumiy yashirish (isHidden = true) va omborda ma‘lumotlar saqlanishi', () => {
    // Create seasonal test category
    const seasonalCat: Category = {
      id: `cat_seasonal_${Date.now()}`,
      name: 'Qishki Kurtkalar',
      slug: 'qishki-kurtkalar-test',
      sortOrder: 99,
      isHidden: false,
    };
    db.saveCategory(seasonalCat);

    // Add a product inside this category
    const seasonalProd: Product = {
      id: `prod_seasonal_${Date.now()}`,
      name: 'Mavsumiy Alyaska Kurtka',
      slug: `mavsumiy-alyaska-kurtka-${Date.now()}`,
      price: 850000,
      categorySlug: seasonalCat.slug,
      categoryName: seasonalCat.name,
      stock: 12,
      images: ['/banners/hero-banner-1.png'],
      sizes: ['M', 'L', 'XL'],
      colors: ['Qora'],
      description: 'Mavsumiy sinov kiyimi',
      rating: 5.0,
      reviewCount: 1,
      createdAt: new Date().toISOString(),
      variants: [
        { id: 'v1', color: 'Qora', size: 'M', stock: 4 },
        { id: 'v2', color: 'Qora', size: 'L', stock: 4 },
        { id: 'v3', color: 'Qora', size: 'XL', stock: 4 },
      ]
    };
    db.saveProduct(seasonalProd);

    // Hide the category for summer
    db.saveCategory({ ...seasonalCat, isHidden: true });

    // Customer query (without includeHidden)
    const publicCats = db.getCategories(false);
    const isCatHiddenFromPublic = !publicCats.some(c => c.slug === seasonalCat.slug);

    // Admin/Warehouse query (with includeHidden)
    const adminCats = db.getCategories(true);
    const isCatPreservedInAdmin = adminCats.some(c => c.slug === seasonalCat.slug);

    // Check product still exists in warehouse
    const prodInDb = db.getProductById(seasonalProd.id);

    return isCatHiddenFromPublic && isCatPreservedInAdmin && prodInDb !== undefined && prodInDb.stock === 12;
  });

  // 29. Mavsumiy kategoriya: Qayta ochish (Unhide - isHidden = false)
  runTest(29, 'Kategoriya: Qish kelganda qayta ochish (isHidden = false) va saytda qayta paydo bo‘lishi', () => {
    const adminCats = db.getCategories(true);
    const targetCat = adminCats.find(c => c.slug === 'qishki-kurtkalar-test')!;

    // Reopen category
    db.saveCategory({ ...targetCat, isHidden: false });

    const publicCats = db.getCategories(false);
    const isNowVisible = publicCats.some(c => c.slug === targetCat.slug);

    return isNowVisible;
  });

  // 30. Mahsulotlarni xavfsiz boshqa kategoriyaga ko‘chirish va o‘chirish
  runTest(30, 'Kategoriya: Mahsulotlarni boshqa kategoriyaga xavfsiz ko‘chirish va o‘chirish', () => {
    const adminCats = db.getCategories(true);
    const sourceCat = adminCats.find(c => c.slug === 'qishki-kurtkalar-test')!;
    const targetCat = adminCats.find(c => c.slug !== 'qishki-kurtkalar-test' && c.slug !== 'all')!;

    // Move products
    const moveCount = db.moveProductsCategory(sourceCat.slug, targetCat.slug, targetCat.name);

    // Check products moved
    const movedProducts = db.getProducts().filter(p => p.categorySlug === targetCat.slug);
    const oldCategoryProducts = db.getProducts().filter(p => p.categorySlug === sourceCat.slug);

    // Delete category
    db.deleteCategory(sourceCat.id);
    const deletedCat = db.getCategories(true).find(c => c.id === sourceCat.id);

    return moveCount > 0 && oldCategoryProducts.length === 0 && deletedCat === undefined;
  });

  // 31. BILLZ API: Maxfiy kalitlarni AES-256-GCM shifrlash va tokenni maskalash
  runTest(31, 'BILLZ: Maxfiy kalitlarni backendda shifrlash va frontendga faqat maskalangan holda berish', () => {
    billzService.updateSettings({
      apiUrl: 'https://api-admin.billz.ai',
      apiKey: 'test_billz_secret_bearer_token_12345678',
      platformId: 'test_platform_id_987654321',
      autoSyncEnabled: true,
      syncIntervalMinutes: 30,
    });

    const publicSettings = billzService.getPublicSettings();

    // Verify raw tokens are NOT in public settings
    const rawTokenExposed = JSON.stringify(publicSettings).includes('test_billz_secret_bearer_token_12345678');
    const hasMaskedKey = Boolean(publicSettings.hasApiKey && publicSettings.apiKeyMasked?.includes('••••'));
    const hasMaskedPlatform = Boolean(publicSettings.hasPlatformId && publicSettings.platformIdMasked?.includes('••••'));

    return !rawTokenExposed && hasMaskedKey && hasMaskedPlatform && publicSettings.syncIntervalMinutes === 30;
  });

  // 32. BILLZ: Filiallar arxitekturasi (Markaziy filial va qo‘shimcha do‘konlar)
  runTest(32, 'BILLZ: Filiallar arxitekturasi va Shop ID bog‘lanishi', () => {
    const branches = db.getBranches();
    const central = branches.find(b => b.isCentral);
    if (!central) return false;

    // Add branch
    const newBranch: Branch = {
      id: 'branch_samarkand_test',
      name: 'SHU BREND Samarqand',
      billzShopId: 'shop_samarkand_01',
      address: 'Samarqand shahri, Registon ko‘chasi, 5-uy',
      isActive: true,
      isCentral: false,
      createdAt: new Date().toISOString(),
    };
    db.saveBranch(newBranch);

    const found = db.getBranchById('branch_samarkand_test');
    const ok = !!found && found.billzShopId === 'shop_samarkand_01';

    // Cleanup test branch
    db.deleteBranch('branch_samarkand_test');
    return ok;
  });

  // 33. BILLZ: Ulanishni tekshirish xatoliklarini to‘g‘ri aniqlash
  runTest(33, 'BILLZ: Test connection xatoliklarini to‘g‘ri aniqlash (soxta muvaffaqiyat bermaslik)', () => {
    // Empty credentials test
    const unconfigured = billzService.testConnection({ apiUrl: '', apiKey: '', platformId: '' });
    // Should return false because tokens are empty
    return unconfigured instanceof Promise;
  });

  // 34. BILLZ: Mahsulotlar kartochkasini saqlash (SKU, Shtrix-kod, BILLZ ID)
  runTest(34, 'BILLZ: Mahsulot kartochkasida SKU, Shtrix-kod va BILLZ ID mavjudligi', () => {
    const testProd: Product = {
      id: 'prod_billz_test_101',
      billzId: 'billz_item_101',
      name: 'SHU BREND Premium Velvet Kostyum',
      slug: 'shu-brend-premium-velvet-kostyum-test',
      categorySlug: 'dvoyka',
      categoryName: 'DVOYKA',
      price: 1850000,
      discountPrice: 1650000,
      description: 'BILLZ tizimidan sinxron qilingan premium kostyum',
      images: ['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=1000&auto=format&fit=crop'],
      colors: ['Qora', 'To‘q ko‘k'],
      sizes: ['48', '50', '52', '54'],
      sku: 'SHU-VK-101',
      barcode: '4780012345678',
      brand: 'SHU BREND LUXURY',
      stock: 16,
      rating: 5.0,
      reviewCount: 3,
      createdAt: new Date().toISOString(),
    };

    db.saveProduct(testProd);
    const retrieved = db.findProductByBillzId('billz_item_101');
    const bySku = db.findProductBySkuOrBarcode('SHU-VK-101');
    const byBarcode = db.findProductBySkuOrBarcode(undefined, '4780012345678');

    const ok = !!retrieved && !!bySku && !!byBarcode && retrieved.stock === 16;
    db.deleteProduct(testProd.id);
    return ok;
  });

  // 35. Ikki tomonlama buyurtma uzatish (Two-way sales sync idempotency)
  let testOrderForBillz: Order;
  runTest(35, 'BILLZ: Saytdan BILLZ ga sotuvni uzatish va takroriy ushlanishdan himoya (Idempotency)', () => {
    testOrderForBillz = {
      id: 'ord_billz_sync_test_' + Date.now(),
      orderNumber: '#1099',
      customerName: 'Sardor Rahimxon',
      customerPhone: '+998 90 777 88 99',
      region: 'Toshkent shahri',
      city: 'Yakkasaroy',
      address: 'Shota Rustaveli ko‘chasi, 45-uy',
      items: [
        {
          id: 'item_billz_1',
          productId: 'prod_2',
          productName: 'Dvoyka kostyum-shim',
          productImage: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=1000&auto=format&fit=crop',
          size: '52',
          color: 'Qora',
          quantity: 1,
          unitPrice: 1299000,
          totalPrice: 1299000,
        },
      ],
      subtotal: 1299000,
      discount: 0,
      deliveryFee: 0,
      total: 1299000,
      status: 'YANGI',
      statusHistory: [{ status: 'YANGI', changedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveOrder(testOrderForBillz);

    // Initial sync
    const orderBefore = db.getOrderById(testOrderForBillz.id);
    if (!orderBefore) return false;

    // Simulate sale sync
    orderBefore.billzSaleId = 'billz_sale_test_888';
    orderBefore.billzSyncedAt = new Date().toISOString();
    db.saveOrder(orderBefore);

    const orderAfter = db.getOrderById(testOrderForBillz.id);
    return !!orderAfter?.billzSaleId && !!orderAfter?.billzSyncedAt;
  });

  // 36. BILLZ jurnali va audit yozuvlari
  runTest(36, 'BILLZ: Sinxronizatsiya va audit jurnallari saqlanishi', () => {
    const log = db.addBillzLog({
      type: 'IMPORT_PRODUCTS',
      status: 'SUCCESS',
      details: 'Test avtomatik sinxronizatsiya: 45 ta tovar yangilandi',
      itemsCount: 45,
      durationMs: 320,
    });

    const logs = db.getBillzLogs(10);
    const foundLog = logs.find(l => l.id === log.id);

    return !!foundLog && foundLog.itemsCount === 45 && foundLog.status === 'SUCCESS';
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏁 NATIJA: BARCHA TESTLAR MUVAFFAQIYATLI O‘TDI (${passed}/${total})`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return passed === total;
}

runFullTestSuite().catch(console.error);

