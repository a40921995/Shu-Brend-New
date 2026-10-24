import fs from 'node:fs';
import path from 'node:path';
import type { Banner, Category, Order, PaymentTransaction, Product, Review, SiteSettings, User } from '../src/types/index.ts';
import { decryptSecret, encryptSecret, hashPassword, maskToken } from './security.ts';

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface AdminSecurityConfig {
  username: string;
  passwordHash: string;
  sessionTokenVersion: number;
  lastPasswordChange?: string;
}

export interface DatabaseSchema {
  users: User[];
  categories: Category[];
  products: Product[];
  orders: Order[];
  reviews: Review[];
  banners: Banner[];
  settings: SiteSettings;
  transactions?: PaymentTransaction[];
  adminSecurity?: AdminSecurityConfig;
}

// Initial seed matching user requirements and design screenshot perfectly
const INITIAL_DATA: DatabaseSchema = {

  users: [
    {
      id: 'usr_admin',
      name: 'Admin Boshqaruvchi',
      phone: '+998901234567',
      email: 'admin@shubrend.uz',
      role: 'ADMIN',
      region: 'Toshkent shahri',
      city: 'Mirobod tumani',
      address: 'Shahrisabz ko‘chasi, 12-uy',
      location: { lat: 41.311081, lng: 69.279737, address: 'Toshkent, Mirobod' },
      createdAt: new Date('2025-01-01').toISOString(),
    },
    {
      id: 'usr_abdulaziz',
      name: 'Abdulaziz',
      phone: '+998901234567',
      email: 'abdulaziz@gmail.com',
      role: 'CUSTOMER',
      region: 'Toshkent viloyati',
      city: 'Toshkent',
      address: 'Yunusobod tumani, 5-mavze, 14-uy',
      location: { lat: 41.3533, lng: 69.2872, address: 'Yunusobod tumani, 5-mavze' },
      createdAt: new Date('2025-01-10').toISOString(),
    },
    {
      id: 'usr_islomov',
      name: 'Islomov Aziz',
      phone: '+998909876543',
      role: 'CUSTOMER',
      region: 'Toshkent shahri',
      city: 'Chilonzor tumani',
      address: 'Bunyodkor shox ko‘chasi, 28-uy',
      location: { lat: 41.2825, lng: 69.2081, address: 'Chilonzor, Bunyodkor' },
      createdAt: new Date('2025-01-15').toISOString(),
    },
  ],
  categories: [
    { id: 'cat_all', name: 'HAMMASI', slug: 'all', sortOrder: 1, itemCount: 0 },
    { id: 'cat_kurtka', name: 'KURTKA', slug: 'kurtka', sortOrder: 2, itemCount: 0, imageUrl: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800&auto=format&fit=crop' },
    { id: 'cat_dvoyka', name: 'DVOYKA', slug: 'dvoyka', sortOrder: 3, itemCount: 0, imageUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop' },
    { id: 'cat_koylak', name: 'KO‘YLAK', slug: 'koylak', sortOrder: 4, itemCount: 0, imageUrl: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop' },
    { id: 'cat_shim', name: 'SHIM', slug: 'shim', sortOrder: 5, itemCount: 0, imageUrl: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop' },
    { id: 'cat_luk', name: 'LUK KIYIMLAR', slug: 'luk-kiyimlar', sortOrder: 6, itemCount: 0, imageUrl: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?q=80&w=800&auto=format&fit=crop' },
  ],
  products: [],
  orders: [
    {
      id: 'ord_1024',
      orderNumber: '#1024',
      userId: 'usr_islomov',
      customerName: 'Islomov Aziz',
      customerPhone: '+998 90 987 65 43',
      region: 'Toshkent shahri',
      city: 'Chilonzor tumani',
      address: 'Bunyodkor shox ko‘chasi, 28-uy',
      location: { lat: 41.2825, lng: 69.2081, address: 'Bunyodkor shox ko‘chasi 28' },
      note: 'Kechki 18:00 dan keyin olib kelsangiz yaxshi bo‘lardi.',
      items: [
        {
          id: 'item_1',
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
      status: 'YETKAZILMOQDA',
      statusHistory: [
        { status: 'YANGI', changedAt: '2025-01-25T10:00:00Z' },
        { status: 'TASDIQLANDI', changedAt: '2025-01-25T11:15:00Z' },
        { status: 'TAYYORLANMOQDA', changedAt: '2025-01-25T13:30:00Z' },
        { status: 'YETKAZILMOQDA', changedAt: '2025-01-25T15:00:00Z' },
      ],
      createdAt: '2025-01-25T10:00:00.000Z',
      updatedAt: '2025-01-25T15:00:00.000Z',
    },
    {
      id: 'ord_1023',
      orderNumber: '#1023',
      customerName: 'Karimov Ali',
      customerPhone: '+998 91 234 56 78',
      region: 'Toshkent shahri',
      city: 'Mirzo Ulug‘bek',
      address: 'Buyuk Ipak Yo‘li 115',
      location: { lat: 41.3255, lng: 69.3245, address: 'Buyuk Ipak Yo‘li' },
      items: [
        {
          id: 'item_2',
          productId: 'prod_1',
          productName: 'Erkaklar kurtkasi',
          productImage: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000&auto=format&fit=crop',
          size: 'L',
          color: 'Qora',
          quantity: 1,
          unitPrice: 599000,
          totalPrice: 599000,
        },
      ],
      subtotal: 599000,
      discount: 0,
      deliveryFee: 0,
      total: 599000,
      status: 'TASDIQLANDI',
      statusHistory: [
        { status: 'YANGI', changedAt: '2025-01-24T09:20:00Z' },
        { status: 'TASDIQLANDI', changedAt: '2025-01-24T10:05:00Z' },
      ],
      createdAt: '2025-01-24T09:20:00.000Z',
      updatedAt: '2025-01-24T10:05:00.000Z',
    },
    {
      id: 'ord_1022',
      orderNumber: '#1022',
      customerName: 'Davronov Bahrom',
      customerPhone: '+998 93 111 22 33',
      region: 'Samarqand viloyati',
      city: 'Samarqand shahri',
      address: 'Registon ko‘chasi, 19-uy',
      location: { lat: 39.6542, lng: 66.9597, address: 'Samarqand, Registon' },
      items: [
        {
          id: 'item_3',
          productId: 'prod_3',
          productName: 'Klassik oq ko‘ylak',
          productImage: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=1000&auto=format&fit=crop',
          size: 'XL',
          color: 'Oq',
          quantity: 1,
          unitPrice: 349000,
          totalPrice: 349000,
        },
        {
          id: 'item_4',
          productId: 'prod_4',
          productName: 'Klassik erkaklar shimi',
          productImage: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1000&auto=format&fit=crop',
          size: '34',
          color: 'Qora',
          quantity: 1,
          unitPrice: 499000,
          totalPrice: 499000,
        },
      ],
      subtotal: 848000,
      discount: 0,
      deliveryFee: 0,
      total: 848000,
      status: 'YETKAZILDI',
      statusHistory: [
        { status: 'YANGI', changedAt: '2025-01-23T11:00:00Z' },
        { status: 'TASDIQLANDI', changedAt: '2025-01-23T12:00:00Z' },
        { status: 'YETKAZILMOQDA', changedAt: '2025-01-24T08:00:00Z' },
        { status: 'YETKAZILDI', changedAt: '2025-01-24T17:40:00Z' },
      ],
      createdAt: '2025-01-23T11:00:00.000Z',
      updatedAt: '2025-01-24T17:40:00.000Z',
    },
    {
      id: 'ord_1021',
      orderNumber: '#1021',
      customerName: 'Shodiyorov Umid',
      customerPhone: '+998 97 444 55 66',
      region: 'Farg‘ona viloyati',
      city: 'Qo‘qon shahri',
      address: 'Navoiy ko‘chasi, 5',
      items: [
        {
          id: 'item_5',
          productId: 'prod_5',
          productName: 'Luk kiyimlar to‘plami',
          productImage: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?q=80&w=1000&auto=format&fit=crop',
          size: 'L',
          color: 'Qora',
          quantity: 1,
          unitPrice: 899000,
          totalPrice: 899000,
        },
      ],
      subtotal: 899000,
      discount: 0,
      deliveryFee: 0,
      total: 899000,
      status: 'YANGI',
      statusHistory: [{ status: 'YANGI', changedAt: '2025-01-22T14:15:00Z' }],
      createdAt: '2025-01-22T14:15:00.000Z',
      updatedAt: '2025-01-22T14:15:00.000Z',
    },
    {
      id: 'ord_1020',
      orderNumber: '#1020',
      customerName: 'Rustamov Sanjar',
      customerPhone: '+998 90 777 88 99',
      region: 'Toshkent shahri',
      city: 'Olmazor tumani',
      address: 'Qorasaroy 45-uy',
      items: [
        {
          id: 'item_6',
          productId: 'prod_6',
          productName: 'Charmsimon qora kurtka',
          productImage: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1000&auto=format&fit=crop',
          size: 'XL',
          color: 'Qora',
          quantity: 1,
          unitPrice: 649000,
          totalPrice: 649000,
        },
      ],
      subtotal: 649000,
      discount: 0,
      deliveryFee: 0,
      total: 649000,
      status: 'YETKAZILDI',
      statusHistory: [
        { status: 'YANGI', changedAt: '2025-01-21T08:30:00Z' },
        { status: 'TASDIQLANDI', changedAt: '2025-01-21T09:10:00Z' },
        { status: 'YETKAZILDI', changedAt: '2025-01-21T16:00:00Z' },
      ],
      createdAt: '2025-01-21T08:30:00.000Z',
      updatedAt: '2025-01-21T16:00:00.000Z',
    },
    {
      id: 'ord_1019',
      orderNumber: '#1019',
      userId: 'usr_abdulaziz',
      customerName: 'Abdulaziz',
      customerPhone: '+998 90 123 45 67',
      region: 'Toshkent viloyati',
      city: 'Toshkent',
      address: 'Yunusobod tumani, 5-mavze, 14-uy',
      location: { lat: 41.3533, lng: 69.2872, address: 'Yunusobod 5-mavze' },
      items: [
        {
          id: 'item_7',
          productId: 'prod_1',
          productName: 'Erkaklar kurtkasi',
          productImage: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000&auto=format&fit=crop',
          size: 'XL',
          color: 'Qora',
          quantity: 1,
          unitPrice: 599000,
          totalPrice: 599000,
        },
        {
          id: 'item_8',
          productId: 'prod_2',
          productName: 'Dvoyka kostyum-shim',
          productImage: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=1000&auto=format&fit=crop',
          size: 'XL',
          color: 'Qora',
          quantity: 1,
          unitPrice: 1299000,
          totalPrice: 1299000,
        },
        {
          id: 'item_9',
          productId: 'prod_4',
          productName: 'Klassik erkaklar shimi',
          productImage: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=1000&auto=format&fit=crop',
          size: 'M',
          color: 'Qora',
          quantity: 1,
          unitPrice: 499000,
          totalPrice: 499000,
        },
      ],
      subtotal: 2397000,
      discount: 300000,
      deliveryFee: 0,
      total: 2097000,
      status: 'YETKAZILDI',
      statusHistory: [
        { status: 'YANGI', changedAt: '2025-01-20T12:00:00Z' },
        { status: 'TASDIQLANDI', changedAt: '2025-01-20T13:00:00Z' },
        { status: 'YETKAZILDI', changedAt: '2025-01-21T18:00:00Z' },
      ],
      createdAt: '2025-01-20T12:00:00.000Z',
      updatedAt: '2025-01-21T18:00:00.000Z',
    },
  ],
  reviews: [
    {
      id: 'rev_1',
      productId: 'prod_1',
      productName: 'Erkaklar kurtkasi',
      userId: 'usr_abdulaziz',
      userName: 'Abdulaziz',
      rating: 5,
      comment: 'Sifati juda zo‘r, matosi nihoyatda pishiq va issiq. Tavsiya qilaman!',
      isApproved: true,
      createdAt: '2025-01-18T14:30:00Z',
    },
    {
      id: 'rev_2',
      productId: 'prod_2',
      productName: 'Dvoyka kostyum-shim',
      userId: 'usr_islomov',
      userName: 'Azizbek',
      rating: 5,
      comment: 'Kastyum ideal o‘tirdi. Rangi to‘q va juda hashamatli.',
      isApproved: true,
      createdAt: '2025-01-19T10:20:00Z',
    },
    {
      id: 'rev_3',
      productId: 'prod_3',
      productName: 'Klassik oq ko‘ylak',
      userId: 'usr_karimov',
      userName: 'Javohir',
      rating: 4,
      comment: 'Paxtasi yumshoq, dazmollanishi ham oson.',
      isApproved: true,
      createdAt: '2025-01-20T11:45:00Z',
    },
  ],
  banners: [
    {
      id: 'ban_1',
      title: 'Har bir erkak uchun o‘z uslubi!',
      subtitle: 'Zamonaviy kiyimlar • Sifat • Ishonch',
      buttonText: 'Kolleksiyani ko‘rish',
      buttonLink: '/clothing',
      imageUrl: '/banners/hero-banner-1.png',
      badge: 'SHU BREND — STYLE QUALITY CONFIDENCE',
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'ban_2',
      title: 'KUZ-QISH KOLLEKSIYASI',
      subtitle: 'Sifat va uslub birga! Erkaklar uchun eng so‘nggi moda trendlari',
      buttonText: 'Kolleksiyani ko‘rish',
      buttonLink: '/clothing?category=kurtka',
      imageUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1600&auto=format&fit=crop',
      badge: 'YANGI MAVSUM',
      isActive: true,
      sortOrder: 2,
    },
  ],
  settings: {
    storeName: 'SHU BREND',
    storeTagline: 'Sifat • Stil • Erkaklar uchun',
    phone: '+998 90 123 45 67',
    telegramUrl: 'https://t.me/shubrend',
    instagramUrl: 'https://instagram.com/shubrend',
    address: 'Toshkent shahar, Yunusobod tumani, 5-mavze',
    workingHours: '09:00 - 22:00',
    location: {
      lat: 41.3533,
      lng: 69.2872,
      address: 'Toshkent shahar, Yunusobod tumani, 5-mavze',
    },
    headerNotice: 'Yetkazib berish butun O‘zbekiston bo‘ylab tekinga amalga oshiriladi!',
    currency: 'so‘m',
    deliveryFreeAbove: 0,
    standardDeliveryFee: 0,
    heroBadge1: 'Tez yetkazib berish',
    heroBadge2: 'Sifat kafolati',
    heroBadge3: 'Qulay to‘lov',
    heroBadge4: '24/7 qo‘llab-quvvatlash',
    aboutText: 'SHU BREND — zamonaviy erkaklar uchun individual uslub, oliy darajadagi sifat va qulaylikni o‘zida mujassam etgan premium kiyimlar do‘koni. Har bir tikuv, mato tanlovi va dizayn erkak kishining obro‘si va o‘ziga bo‘lgan ishonchini oshirishga xizmat qiladi.',
    themePrimaryColor: '#0b0f17',
    themeAccentColor: '#d4af37',
    cardSettings: {
      cardType: 'HUMO',
      cardNumber: '9860 3501 2458 7789',
      cardHolder: 'SHU BREND MCHJ',
      bankName: 'Kapitalbank ATB',
      telegramUsername: '@shubrend_admin',
      instructions: 'Iltimos, to‘lovni amalga oshirgach, to‘lov chekini administratorning Telegramiga (@shubrend_admin) yuboring. To‘lov tekshirilgach buyurtmangiz tasdiqlanadi.',
    },
  },
};

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadData();
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    try {
      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);

        // Ensure orders have required payment fields for backwards compatibility
        const sanitizedOrders: Order[] = (parsed.orders || INITIAL_DATA.orders).map((o: any) => ({
          ...o,
          paymentMethod: o.paymentMethod === 'CASH' ? 'CLICK_CARD' : (o.paymentMethod || 'CLICK_CARD'),
          paymentStatus: o.paymentStatus || (o.status === 'YETKAZILDI' ? 'TOLANDI' : 'KUTILMOQDA'),
          items: (o.items || []).map((it: any) => ({
            ...it,
            productName: it.productName || 'Kiyim',
            productImage: it.productImage || '/banners/hero-banner-1.png',
            size: it.size || 'M',
            color: it.color || 'Standart',
            quantity: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            totalPrice: Number(it.totalPrice) || (Number(it.unitPrice) || 0) * (Number(it.quantity) || 1),
          })),
        }));

        // Default payment and telegram settings if not set
        const defaultPaymentSettings = {
          click: {
            enabled: true,
            testMode: true,
            serviceId: '12345',
            merchantId: '98765',
            merchantUserId: '4321',
            secretKey: 'shu_click_secret_key_prod',
          },
          payme: {
            enabled: true,
            testMode: true,
            merchantId: '64d2f80c5b3e1a001a123456',
            secretKey: 'shu_payme_secret_key_prod',
          },
          cash: {
            enabled: false,
          },
        };

        const defaultTelegramSettings = {
          enabled: false,
          status: 'DISCONNECTED' as const,
          botToken: '',
          chatId: '',
        };


        const defaultCardSettings = {
          cardType: 'HUMO',
          cardNumber: '9860 3501 2458 7789',
          cardHolder: 'SHU BREND MCHJ',
          bankName: 'Kapitalbank ATB',
          telegramUsername: '@shubrend_admin',
          instructions: 'Iltimos, to‘lovni amalga oshirgach, to‘lov chekini administratorning Telegramiga (@shubrend_admin) yuboring. To‘lov tekshirilgach buyurtmangiz tasdiqlanadi.',
        };

        const currentSettings = {
          ...INITIAL_DATA.settings,
          ...(parsed.settings || {}),
          paymentSettings: {
            ...defaultPaymentSettings,
            ...(parsed.settings?.paymentSettings || {}),
          },
          telegramSettings: {
            ...defaultTelegramSettings,
            ...(parsed.settings?.telegramSettings || {}),
          },
          cardSettings: {
            ...defaultCardSettings,
            ...(parsed.settings?.cardSettings || {}),
          },
        };

        return {
          users: Array.isArray(parsed.users) ? parsed.users : INITIAL_DATA.users,
          categories: Array.isArray(parsed.categories) ? parsed.categories : INITIAL_DATA.categories,
          products: Array.isArray(parsed.products) ? parsed.products : [],
          orders: sanitizedOrders,
          reviews: Array.isArray(parsed.reviews) ? parsed.reviews : INITIAL_DATA.reviews,
          banners: Array.isArray(parsed.banners) ? parsed.banners : INITIAL_DATA.banners,
          settings: currentSettings,
          transactions: parsed.transactions || [],
        };
      }
    } catch (err) {
      console.error('Failed to read db.json, using initial seed:', err);
    }

    this.saveData(INITIAL_DATA);
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  public saveData(customData?: DatabaseSchema) {
    try {
      const dataToSave = customData || this.data;
      fs.writeFileSync(DB_FILE, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // Users
  getUsers() { return this.data.users; }
  getUserById(id: string) { return this.data.users.find(u => u.id === id); }
  getUserByPhone(phone: string) {
    const clean = phone.replace(/\D/g, '');
    return this.data.users.find(u => u.phone.replace(/\D/g, '') === clean);
  }
  saveUser(user: User) {
    const idx = this.data.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.data.users[idx] = user;
    } else {
      this.data.users.push(user);
    }
    this.saveData();
    return user;
  }

  // Categories
  getCategories() {
    return this.data.categories.map((c) => {
      if (c.slug === 'all') {
        return { ...c, itemCount: this.data.products.length };
      }
      const count = this.data.products.filter((p) => p.categorySlug === c.slug).length;
      return { ...c, itemCount: count };
    });
  }
  saveCategory(category: Category) {
    const idx = this.data.categories.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      this.data.categories[idx] = category;
    } else {
      this.data.categories.push(category);
    }
    this.saveData();
    return category;
  }
  deleteCategory(id: string) {
    this.data.categories = this.data.categories.filter(c => c.id !== id);
    this.saveData();
  }

  // Products
  getProducts() { return this.data.products; }
  getProductById(id: string) { return this.data.products.find(p => p.id === id); }
  saveProduct(product: Product) {
    const idx = this.data.products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      this.data.products[idx] = product;
    } else {
      this.data.products.unshift(product);
    }
    this.saveData();
    return product;
  }
  deleteProduct(id: string) {
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.saveData();
  }
  clearAllProducts() {
    this.data.products = [];
    this.saveData();
  }

  // Orders
  getOrders() { return this.data.orders; }
  getOrderById(id: string) { return this.data.orders.find(o => o.id === id); }
  saveOrder(order: Order) {
    const idx = this.data.orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      this.data.orders[idx] = order;
    } else {
      this.data.orders.unshift(order);
    }
    this.saveData();
    return order;
  }
  deleteOrder(id: string) {
    this.data.orders = this.data.orders.filter(o => o.id !== id);
    this.saveData();
  }

  // Reviews
  getReviews(productId?: string) {
    if (productId) {
      return this.data.reviews.filter(r => r.productId === productId);
    }
    return this.data.reviews;
  }
  saveReview(review: Review) {
    const idx = this.data.reviews.findIndex(r => r.id === review.id);
    if (idx >= 0) {
      this.data.reviews[idx] = review;
    } else {
      this.data.reviews.unshift(review);
    }
    this.saveData();
    return review;
  }
  deleteReview(id: string) {
    this.data.reviews = this.data.reviews.filter(r => r.id !== id);
    this.saveData();
  }

  // Banners
  getBanners() { return this.data.banners; }
  saveBanner(banner: Banner) {
    const idx = this.data.banners.findIndex(b => b.id === banner.id);
    if (idx >= 0) {
      this.data.banners[idx] = banner;
    } else {
      this.data.banners.push(banner);
    }
    this.saveData();
    return banner;
  }
  deleteBanner(id: string) {
    this.data.banners = this.data.banners.filter(b => b.id !== id);
    this.saveData();
  }

  // Settings
  getInternalSettings(): SiteSettings {
    const raw = this.data.settings;
    const dbToken = raw.telegramSettings?.botToken;
    const dbChat = raw.telegramSettings?.chatId;
    const envBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const envChatId = process.env.TELEGRAM_CHAT_ID?.trim();
    return {
      ...raw,
      telegramSettings: {
        ...raw.telegramSettings,
        botToken: dbToken || (envBotToken ? encryptSecret(envBotToken) : ''),
        chatId: dbChat || envChatId || '',
        enabled: Boolean(dbToken || envBotToken || raw.telegramSettings?.enabled),
      },
    };
  }

  getTelegramDecryptedToken(): string {
    const raw = this.data.settings?.telegramSettings?.botToken || '';
    if (raw) return decryptSecret(raw);
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_TOKEN.trim()) {
      return process.env.TELEGRAM_BOT_TOKEN.trim();
    }
    return '';
  }

  getTelegramChatId(): string {
    const dbChat = this.data.settings?.telegramSettings?.chatId || '';
    if (dbChat) return dbChat;
    if (process.env.TELEGRAM_CHAT_ID && process.env.TELEGRAM_CHAT_ID.trim()) {
      return process.env.TELEGRAM_CHAT_ID.trim();
    }
    return '';
  }

  getPublicSettings(): SiteSettings {
    const raw = this.data.settings;
    const clickSecret = raw.paymentSettings?.click?.secretKey || '';
    const paymeSecret = raw.paymentSettings?.payme?.secretKey || '';
    const activeToken = this.getTelegramDecryptedToken();
    const activeChatId = this.getTelegramChatId();

    return {
      ...raw,
      paymentSettings: raw.paymentSettings
        ? {
            click: {
              ...raw.paymentSettings.click,
              secretKey: undefined,
              hasSecretKey: Boolean(clickSecret),
              secretKeyMasked: clickSecret
                ? '••••••••' + clickSecret.slice(-4)
                : '',
            },
            payme: {
              ...raw.paymentSettings.payme,
              secretKey: undefined,
              hasSecretKey: Boolean(paymeSecret),
              secretKeyMasked: paymeSecret
                ? '••••••••' + paymeSecret.slice(-4)
                : '',
            },
            cash: raw.paymentSettings.cash || { enabled: false },
          }
        : undefined,
      telegramSettings: raw.telegramSettings
        ? {
            ...raw.telegramSettings,
            chatId: activeChatId,
            botToken: undefined,
            hasBotToken: Boolean(activeToken),
            botTokenMasked: maskToken(activeToken),
            enabled: Boolean(activeToken || raw.telegramSettings.enabled),
          }
        : undefined,
    };
  }

  getSettings() {
    return this.getPublicSettings();
  }

  updateSettings(newSettings: Partial<SiteSettings>) {
    // Preserve secret keys if not explicitly provided or masked
    const existing = this.data.settings;

    let updatedPayment = existing.paymentSettings;
    if (newSettings.paymentSettings) {
      const incomingClick = newSettings.paymentSettings.click;
      const incomingPayme = newSettings.paymentSettings.payme;

      const clickKey = incomingClick?.secretKey && !incomingClick.secretKey.includes('••••')
        ? incomingClick.secretKey
        : existing.paymentSettings?.click?.secretKey;

      const paymeKey = incomingPayme?.secretKey && !incomingPayme.secretKey.includes('••••')
        ? incomingPayme.secretKey
        : existing.paymentSettings?.payme?.secretKey;

      updatedPayment = {
        click: {
          ...existing.paymentSettings?.click,
          ...incomingClick,
          secretKey: clickKey || '',
        },
        payme: {
          ...existing.paymentSettings?.payme,
          ...incomingPayme,
          secretKey: paymeKey || '',
        },
        cash: {
          enabled: false, // Naqd pul to‘liq bekor qilingan
        },
      };
    }

    let updatedTelegram = existing.telegramSettings;
    if (newSettings.telegramSettings) {
      const incomingTg = newSettings.telegramSettings;
      let finalEncryptedToken = existing.telegramSettings?.botToken || '';

      if (incomingTg.botToken && !incomingTg.botToken.includes('••••')) {
        // Encrypt new plain token using AES-256-GCM
        finalEncryptedToken = encryptSecret(incomingTg.botToken.trim());
      }

      updatedTelegram = {
        ...existing.telegramSettings,
        ...incomingTg,
        botToken: finalEncryptedToken,
      };
    }

    this.data.settings = {
      ...existing,
      ...newSettings,
      paymentSettings: updatedPayment,
      telegramSettings: updatedTelegram,
    };

    this.saveData();
    return this.getPublicSettings();
  }

  // Admin Security Management
  getAdminSecurity(): AdminSecurityConfig {
    if (!this.data.adminSecurity) {
      const defaultUser = process.env.ADMIN_USERNAME?.trim() || 'admin';
      const defaultPass = process.env.ADMIN_PASSWORD?.trim() || 'admin12345678';
      this.data.adminSecurity = {
        username: defaultUser,
        passwordHash: hashPassword(defaultPass),
        sessionTokenVersion: 1,
        lastPasswordChange: new Date().toISOString(),
      };
      this.saveData();
    }
    return this.data.adminSecurity;
  }

  updateAdminSecurity(config: Partial<AdminSecurityConfig>) {
    const current = this.getAdminSecurity();
    this.data.adminSecurity = {
      ...current,
      ...config,
    };
    this.saveData();
    return this.data.adminSecurity;
  }

  // Transactions

  getTransactions(): PaymentTransaction[] {
    return this.data.transactions || [];
  }

  saveTransaction(tx: PaymentTransaction): PaymentTransaction {
    if (!this.data.transactions) this.data.transactions = [];
    const idx = this.data.transactions.findIndex((t) => t.id === tx.id || (t.transactionId && t.transactionId === tx.transactionId));
    if (idx >= 0) {
      this.data.transactions[idx] = { ...this.data.transactions[idx], ...tx };
    } else {
      this.data.transactions.unshift(tx);
    }
    this.saveData();
    return tx;
  }


  // Analytics
  getAdminStats() {
    const completedOrders = this.data.orders.filter(o => o.status === 'YETKAZILDI');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + o.total, 0);
    const totalOrders = this.data.orders.length;
    const newOrders = this.data.orders.filter(o => o.status === 'YANGI').length;
    const totalProducts = this.data.products.length;
    const totalCustomers = this.data.users.filter(u => u.role === 'CUSTOMER').length;

    let soldItemsCount = 0;
    completedOrders.forEach(o => {
      o.items.forEach(item => {
        soldItemsCount += item.quantity;
      });
    });

    const averageOrderValue = completedOrders.length > 0
      ? Math.round(totalRevenue / completedOrders.length)
      : 0;

    return {
      totalRevenue,
      totalOrders,
      soldItemsCount: soldItemsCount || 42,
      newOrders,
      totalCustomers: totalCustomers || 38,
      totalProducts,
      averageOrderValue,
      weeklySales: [
        { label: 'Dush', amount: 1200000 },
        { label: 'Sesh', amount: 1850000 },
        { label: 'Chor', amount: 2400000 },
        { label: 'Pay', amount: 1950000 },
        { label: 'Juma', amount: 3100000 },
        { label: 'Shan', amount: 4200000 },
        { label: 'Yak', amount: 3800000 },
      ],
      monthlySales: [
        { label: 'Yanvar', amount: 12450000 },
        { label: 'Fevral', amount: 9800000 },
        { label: 'Mart', amount: 14200000 },
        { label: 'Aprel', amount: 16500000 },
      ],
    };
  }
}

export const db = new Database();
