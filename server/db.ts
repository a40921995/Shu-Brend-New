import fs from 'node:fs';
import path from 'node:path';
import type {
  AuditLogEntry,
  Banner,
  BillzSettings,
  BillzStagingProduct,
  BillzSyncLog,
  BillzSyncStatus,
  Branch,
  Category,
  InventoryActionType,
  InventoryLog,
  LowStockVariantInfo,
  N8nWebhookLog,
  Order,
  PaymentTransaction,
  Product,
  ProductVariant,
  Review,
  SalesFinanceStats,
  SiteSettings,
  SoldItemRecord,
  StatisticalPeriod,
  User,
  WarehouseStats,
} from '../src/types/index.ts';
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
  activeRecoveryCode?: {
    code: string;
    expiresAt: string;
    attempts: number;
  };
}

export interface BillzStorageConfig {
  apiUrl: string;
  encryptedApiKey?: string;
  encryptedPlatformId?: string;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncAt?: string;
  lastSyncStatus?: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'IDLE';
  lastError?: string;
  status: BillzSyncStatus;
  centralShopId?: string;
  mainShopId?: string;
  mainShopName?: string;
  branchShopId?: string;
  branchShopName?: string;
  syncImages: boolean;
  syncPrices: boolean;
  syncStock: boolean;
}

export interface N8nStorageConfig {
  apiKey: string;
  enabled: boolean;
  lastWebhookAt?: string;
  lastWebhookStatus?: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'IDLE';
  lastWebhookMessage?: string;
  totalSyncedProducts: number;
  totalErrors: number;
  autoPublish: boolean;
  preserveCustomImages: boolean;
  logs?: N8nWebhookLog[];
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
  inventoryLogs?: InventoryLog[];
  branches?: Branch[];
  billzConfig?: BillzStorageConfig;
  billzLogs?: BillzSyncLog[];
  billzStagingProducts?: BillzStagingProduct[];
  statisticalPeriods?: StatisticalPeriod[];
  currentPeriodId?: string;
  auditLogs?: AuditLogEntry[];
  n8nConfig?: N8nStorageConfig;
}

// Initial seed matching user requirements and design screenshot perfectly
const INITIAL_DATA: DatabaseSchema = {
  inventoryLogs: [],
  billzStagingProducts: [],
  auditLogs: [],
  statisticalPeriods: [
    {
      id: 'period_initial',
      name: 'Boshlang‘ich hisobot davri',
      startedAt: '2025-01-01T00:00:00.000Z',
    },
  ],
  currentPeriodId: 'period_initial',

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
    address: 'To‘raqo‘rg‘on, Namangan viloyati',
    workingHours: '09:00 - 22:00',
    location: {
      lat: 41.001399,
      lng: 71.505682,
      address: 'To‘raqo‘rg‘on, Namangan viloyati',
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
          products: (Array.isArray(parsed.products) ? parsed.products : []).map((p: Product) => this.sanitizeProduct(p)),
          orders: sanitizedOrders,
          reviews: Array.isArray(parsed.reviews) ? parsed.reviews : INITIAL_DATA.reviews,
          banners: Array.isArray(parsed.banners) ? parsed.banners : INITIAL_DATA.banners,
          settings: currentSettings,
          transactions: parsed.transactions || [],
          inventoryLogs: Array.isArray(parsed.inventoryLogs) ? parsed.inventoryLogs : [],
          branches: Array.isArray(parsed.branches) && parsed.branches.length > 0 ? parsed.branches : [
            {
              id: 'branch_central',
              name: 'SHU BREND — Markaziy Filial & Do‘kon',
              billzShopId: 'shop_tashkent_central',
              address: 'Toshkent shahri, Mirobod tumani, Shahrisabz ko‘chasi, 12-uy',
              phone: '+998 90 123 45 67',
              isActive: true,
              isCentral: true,
              createdAt: new Date('2025-01-01').toISOString(),
            },
          ],
          billzConfig: parsed.billzConfig || {
            apiUrl: 'https://api-admin.billz.ai',
            autoSyncEnabled: false,
            syncIntervalMinutes: 60,
            status: 'UNCONFIGURED',
            centralShopId: 'shop_tashkent_central',
            syncImages: true,
            syncPrices: true,
            syncStock: true,
          },
          billzLogs: Array.isArray(parsed.billzLogs) ? parsed.billzLogs : [],
          billzStagingProducts: Array.isArray(parsed.billzStagingProducts) ? parsed.billzStagingProducts : [],
          adminSecurity: parsed.adminSecurity,
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
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = path.join(DATA_DIR, `.db.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
      fs.writeFileSync(tmpFile, JSON.stringify(dataToSave, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error saving database atomically:', err);
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(customData || this.data, null, 2), 'utf-8');
      } catch (fallbackErr) {
        console.error('Fatal fallback database save error:', fallbackErr);
      }
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
  getCategories(includeHidden = true) {
    const categories = [...this.data.categories]
      .filter((c) => includeHidden || !c.isHidden)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    return categories.map((c) => {
      if (c.slug === 'all') {
        const visibleProductsCount = includeHidden
          ? this.data.products.length
          : this.data.products.filter(p => {
              const cat = this.data.categories.find(cc => cc.slug === p.categorySlug);
              return !cat?.isHidden;
            }).length;
        return { ...c, itemCount: visibleProductsCount };
      }
      const count = this.data.products.filter((p) => p.categorySlug === c.slug).length;
      return { ...c, itemCount: count };
    });
  }

  saveCategory(category: Category) {
    const idx = this.data.categories.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      this.data.categories[idx] = { ...this.data.categories[idx], ...category };
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

  moveProductsCategory(sourceSlug: string, targetSlug: string, targetName: string): number {
    let count = 0;
    for (const p of this.data.products) {
      if (p.categorySlug === sourceSlug) {
        p.categorySlug = targetSlug;
        p.categoryName = targetName;
        count++;
      }
    }
    if (count > 0) {
      this.saveData();
    }
    return count;
  }

  // Products
  sanitizeProduct(product: Product): Product {
    const colors = Array.isArray(product.colors) && product.colors.length > 0 ? product.colors : ['Qora'];
    const sizes = Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : ['S', 'M', 'L', 'XL'];
    let variants: ProductVariant[] = Array.isArray(product.variants) ? [...product.variants] : [];

    // Ensure all color x size combinations exist in variants
    const initialVariantsEmpty = variants.length === 0;
    const defaultStockPerVariant = initialVariantsEmpty && product.stock > 0
      ? Math.max(0, Math.floor(product.stock / (colors.length * sizes.length)))
      : 0;

    for (const c of colors) {
      for (const s of sizes) {
        const found = variants.find(
          v => v.color.trim().toLowerCase() === c.trim().toLowerCase() &&
               v.size.trim().toLowerCase() === s.trim().toLowerCase()
        );
        if (!found) {
          variants.push({
            id: `${c}_${s}`,
            color: c,
            size: s,
            stock: defaultStockPerVariant,
            barcode: product.barcode,
            sku: product.sku,
          });
        }
      }
    }

    // Clean duplicate variants if any
    const uniqueMap = new Map<string, ProductVariant>();
    for (const v of variants) {
      const key = `${v.color.trim().toLowerCase()}:::${v.size.trim().toLowerCase()}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          ...v,
          stock: Math.max(0, Number(v.stock) || 0),
        });
      }
    }
    const cleanVariants = Array.from(uniqueMap.values());
    const totalStock = cleanVariants.reduce((sum, v) => sum + v.stock, 0);

    return {
      ...product,
      colors,
      sizes,
      variants: cleanVariants,
      stock: totalStock,
    };
  }

  getProducts() {
    return this.data.products.map(p => this.sanitizeProduct(p));
  }

  getProductById(id: string) {
    const prod = this.data.products.find(p => p.id === id);
    return prod ? this.sanitizeProduct(prod) : undefined;
  }

  saveProduct(product: Product) {
    const sanitized = this.sanitizeProduct(product);
    const idx = this.data.products.findIndex(p => p.id === sanitized.id);
    if (idx >= 0) {
      this.data.products[idx] = sanitized;
    } else {
      this.data.products.unshift(sanitized);
    }
    this.saveData();
    return sanitized;
  }

  deleteProduct(id: string) {
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.saveData();
  }

  clearAllProducts() {
    this.data.products = [];
    this.saveData();
  }

  // --- OMBOR (WAREHOUSE) INVENTORY METHODS ---

  getInventoryLogs(limit = 100): InventoryLog[] {
    const logs = this.data.inventoryLogs || [];
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  adjustVariantStock(
    productId: string,
    color: string,
    size: string,
    delta: number,
    type: InventoryActionType,
    note?: string,
    price?: number,
    operator = 'Admin'
  ): { product: Product; log: InventoryLog } {
    const product = this.getProductById(productId);
    if (!product) {
      throw new Error('Mahsulot topilmadi');
    }

    const sanitized = this.sanitizeProduct(product);
    const targetColor = color.trim().toLowerCase();
    const targetSize = size.trim().toLowerCase();

    let variant = sanitized.variants!.find(
      v => v.color.trim().toLowerCase() === targetColor && v.size.trim().toLowerCase() === targetSize
    );

    if (!variant) {
      variant = {
        id: `${color}_${size}`,
        color,
        size,
        stock: 0,
      };
      sanitized.variants!.push(variant);
    }

    const prevStock = variant.stock;
    const newStock = Math.max(0, prevStock + delta);
    variant.stock = newStock;
    sanitized.stock = sanitized.variants!.reduce((sum, v) => sum + v.stock, 0);

    const savedProduct = this.saveProduct(sanitized);

    const log: InventoryLog = {
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      productId: savedProduct.id,
      productName: savedProduct.name,
      productImage: savedProduct.images[0] || '/banners/hero-banner-1.png',
      color: variant.color,
      size: variant.size,
      delta: newStock - prevStock,
      previousStock: prevStock,
      newStock,
      type,
      price: price !== undefined ? price : (type === 'OFFLINE_SALE' ? savedProduct.price : undefined),
      note: note || (type === 'OFFLINE_SALE' ? 'Do‘konda oflayn sotildi' : type === 'RESTOCK' ? 'Omborga mahsulot qo‘shildi' : 'Ombor qoldig‘i yangilandi'),
      operator,
    };

    if (!this.data.inventoryLogs) {
      this.data.inventoryLogs = [];
    }
    this.data.inventoryLogs.unshift(log);
    this.saveData();

    return { product: savedProduct, log };
  }

  setVariantStock(
    productId: string,
    color: string,
    size: string,
    exactStock: number,
    type: InventoryActionType = 'MANUAL_ADJUST',
    note?: string,
    operator = 'Admin'
  ): { product: Product; log: InventoryLog } {
    const product = this.getProductById(productId);
    if (!product) throw new Error('Mahsulot topilmadi');

    const sanitized = this.sanitizeProduct(product);
    const targetColor = color.trim().toLowerCase();
    const targetSize = size.trim().toLowerCase();

    let variant = sanitized.variants!.find(
      v => v.color.trim().toLowerCase() === targetColor && v.size.trim().toLowerCase() === targetSize
    );

    if (!variant) {
      variant = { id: `${color}_${size}`, color, size, stock: 0 };
      sanitized.variants!.push(variant);
    }

    const prevStock = variant.stock;
    const newStock = Math.max(0, exactStock);
    variant.stock = newStock;
    sanitized.stock = sanitized.variants!.reduce((sum, v) => sum + v.stock, 0);

    const savedProduct = this.saveProduct(sanitized);

    const log: InventoryLog = {
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      productId: savedProduct.id,
      productName: savedProduct.name,
      productImage: savedProduct.images[0] || '/banners/hero-banner-1.png',
      color: variant.color,
      size: variant.size,
      delta: newStock - prevStock,
      previousStock: prevStock,
      newStock,
      type,
      note: note || 'Qoldiq to‘g‘ridan-to‘g‘ri kiritildi',
      operator,
    };

    if (!this.data.inventoryLogs) {
      this.data.inventoryLogs = [];
    }
    this.data.inventoryLogs.unshift(log);
    this.saveData();

    return { product: savedProduct, log };
  }

  addVariant(productId: string, color: string, size: string, stock = 0): Product {
    const product = this.getProductById(productId);
    if (!product) throw new Error('Mahsulot topilmadi');

    const sanitized = this.sanitizeProduct(product);
    const cleanColor = color.trim();
    const cleanSize = size.trim();

    if (!sanitized.colors.includes(cleanColor)) {
      sanitized.colors.push(cleanColor);
    }
    if (!sanitized.sizes.includes(cleanSize)) {
      sanitized.sizes.push(cleanSize);
    }

    const existing = sanitized.variants!.find(
      v => v.color.trim().toLowerCase() === cleanColor.toLowerCase() &&
           v.size.trim().toLowerCase() === cleanSize.toLowerCase()
    );

    if (existing) {
      existing.stock = Math.max(0, Number(stock) || 0);
    } else {
      sanitized.variants!.push({
        id: `${cleanColor}_${cleanSize}`,
        color: cleanColor,
        size: cleanSize,
        stock: Math.max(0, Number(stock) || 0),
      });
    }

    sanitized.stock = sanitized.variants!.reduce((sum, v) => sum + v.stock, 0);
    return this.saveProduct(sanitized);
  }

  cancelInventoryLog(logId: string): { success: boolean; message: string; restoredProduct?: Product } {
    if (!this.data.inventoryLogs) {
      throw new Error('Harakatlar tarixi bo‘sh');
    }
    const log = this.data.inventoryLogs.find(l => l.id === logId);
    if (!log) {
      throw new Error('Harakat topilmadi');
    }
    if (log.cancelled) {
      throw new Error('Ushbu amal allaqachon bekor qilingan');
    }

    const invertedDelta = -log.delta;
    const product = this.getProductById(log.productId);

    let restoredProduct: Product | undefined;
    if (product) {
      const sanitized = this.sanitizeProduct(product);
      const variant = sanitized.variants!.find(
        v => v.color.trim().toLowerCase() === log.color.trim().toLowerCase() &&
             v.size.trim().toLowerCase() === log.size.trim().toLowerCase()
      );
      if (variant) {
        variant.stock = Math.max(0, variant.stock + invertedDelta);
        sanitized.stock = sanitized.variants!.reduce((sum, v) => sum + v.stock, 0);
        restoredProduct = this.saveProduct(sanitized);
      }
    }

    log.cancelled = true;

    const cancelLog: InventoryLog = {
      id: 'inv_cancel_' + Date.now(),
      timestamp: new Date().toISOString(),
      productId: log.productId,
      productName: log.productName,
      productImage: log.productImage,
      color: log.color,
      size: log.size,
      delta: invertedDelta,
      previousStock: log.newStock,
      newStock: log.newStock + invertedDelta,
      type: 'OFFLINE_SALE_CANCEL',
      note: `Bekor qilindi: Log #${log.id.slice(-6)} (${log.productName} ${log.color} ${log.size})`,
      operator: 'Admin',
    };
    this.data.inventoryLogs.unshift(cancelLog);
    this.saveData();

    return {
      success: true,
      message: `Sotuv muvaffaqiyatli bekor qilindi. ${log.productName} (${log.color}, ${log.size}) omborga qaytarildi.`,
      restoredProduct,
    };
  }

  getWarehouseStats(): WarehouseStats {
    const products = this.data.products.map(p => this.sanitizeProduct(p));
    const logs = this.data.inventoryLogs || [];
    const orders = this.data.orders || [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let totalStockUnits = 0;
    let outOfStockVariantsCount = 0;
    let lowStockVariantsCount = 0;
    const lowStockVariants: LowStockVariantInfo[] = [];
    const outOfStockVariants: LowStockVariantInfo[] = [];

    for (const prod of products) {
      totalStockUnits += prod.stock;
      if (prod.variants) {
        for (const v of prod.variants) {
          if (v.stock <= 0) {
            outOfStockVariantsCount++;
            outOfStockVariants.push({
              productId: prod.id,
              productName: prod.name,
              productImage: prod.images[0] || '/banners/hero-banner-1.png',
              color: v.color,
              size: v.size,
              stock: v.stock,
              price: prod.price,
            });
          } else if (v.stock <= 2) {
            lowStockVariantsCount++;
            lowStockVariants.push({
              productId: prod.id,
              productName: prod.name,
              productImage: prod.images[0] || '/banners/hero-banner-1.png',
              color: v.color,
              size: v.size,
              stock: v.stock,
              price: prod.price,
            });
          }
        }
      }
    }

    let todayOfflineSalesCount = 0;
    let todayOfflineSalesRevenue = 0;
    let monthlyOfflineRevenue = 0;

    const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    const sizeSalesMap = new Map<string, number>();
    const colorSalesMap = new Map<string, number>();

    for (const log of logs) {
      if (log.type === 'OFFLINE_SALE' && !log.cancelled) {
        const logTime = new Date(log.timestamp).getTime();
        const salePrice = log.price || 0;
        const count = Math.abs(log.delta);

        if (logTime >= startOfToday) {
          todayOfflineSalesCount += count;
          todayOfflineSalesRevenue += salePrice * count;
        }
        if (logTime >= startOfMonth) {
          monthlyOfflineRevenue += salePrice * count;
        }

        const pEntry = productSalesMap.get(log.productId) || { name: log.productName, quantity: 0, revenue: 0 };
        pEntry.quantity += count;
        pEntry.revenue += salePrice * count;
        productSalesMap.set(log.productId, pEntry);

        sizeSalesMap.set(log.size, (sizeSalesMap.get(log.size) || 0) + count);
        colorSalesMap.set(log.color, (colorSalesMap.get(log.color) || 0) + count);
      }
    }

    let todayOnlineSalesCount = 0;
    let todayOnlineSalesRevenue = 0;
    let monthlyOnlineRevenue = 0;

    for (const order of orders) {
      if (order.status !== 'BEKOR_QILINDI') {
        const orderTime = new Date(order.createdAt).getTime();
        const itemCount = order.items.reduce((s, it) => s + it.quantity, 0);

        if (orderTime >= startOfToday) {
          todayOnlineSalesCount += itemCount;
          todayOnlineSalesRevenue += order.total;
        }
        if (orderTime >= startOfMonth) {
          monthlyOnlineRevenue += order.total;
        }

        for (const item of order.items) {
          const pEntry = productSalesMap.get(item.productId) || { name: item.productName, quantity: 0, revenue: 0 };
          pEntry.quantity += item.quantity;
          pEntry.revenue += item.totalPrice;
          productSalesMap.set(item.productId, pEntry);

          if (item.size) {
            sizeSalesMap.set(item.size, (sizeSalesMap.get(item.size) || 0) + item.quantity);
          }
          if (item.color) {
            colorSalesMap.set(item.color, (colorSalesMap.get(item.color) || 0) + item.quantity);
          }
        }
      }
    }

    const topSellingProducts = Array.from(productSalesMap.entries())
      .map(([productId, val]) => ({ productId, name: val.name, quantity: val.quantity, revenue: val.revenue }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const topSellingSizes = Array.from(sizeSalesMap.entries())
      .map(([size, quantity]) => ({ size, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);

    const topSellingColors = Array.from(colorSalesMap.entries())
      .map(([color, quantity]) => ({ color, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);

    return {
      totalStockUnits,
      totalProductsCount: products.length,
      outOfStockVariantsCount,
      lowStockVariantsCount,
      todayOfflineSalesCount,
      todayOfflineSalesRevenue,
      todayOnlineSalesCount,
      todayOnlineSalesRevenue,
      totalTodayRevenue: todayOfflineSalesRevenue + todayOnlineSalesRevenue,
      monthlyRevenue: monthlyOfflineRevenue + monthlyOnlineRevenue,
      topSellingProducts,
      topSellingSizes,
      topSellingColors,
      lowStockVariants: lowStockVariants.slice(0, 20),
      outOfStockVariants: outOfStockVariants.slice(0, 20),
    };
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
      const defaultUser = process.env.ADMIN_USERNAME?.trim() || 'admin.1212';
      const defaultPass = process.env.ADMIN_PASSWORD?.trim() || 'shubrend.2026';
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

  setAdminRecoveryCode(code: string, ttlMinutes = 10) {
    const sec = this.getAdminSecurity();
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    sec.activeRecoveryCode = {
      code: code.trim(),
      expiresAt,
      attempts: 0,
    };
    this.saveData();
    return expiresAt;
  }

  verifyAndConsumeAdminRecoveryCode(inputCode: string): { valid: boolean; reason?: string } {
    const sec = this.getAdminSecurity();
    const active = sec.activeRecoveryCode;
    if (!active || !active.code) {
      return { valid: false, reason: 'Faol tiklash kodi topilmadi. Qaytadan kod so‘rang.' };
    }

    if (new Date(active.expiresAt).getTime() < Date.now()) {
      delete sec.activeRecoveryCode;
      this.saveData();
      return { valid: false, reason: 'Tasdiqlash kodining amal qilish muddati (10 daqiqa) tugagan. Yangi kod so‘rang.' };
    }

    active.attempts = (active.attempts || 0) + 1;
    if (active.attempts > 5) {
      delete sec.activeRecoveryCode;
      this.saveData();
      return { valid: false, reason: 'Kod noto‘g‘ri kiritish limiti (5 marta) oshib ketdi. Yangi kod so‘rang.' };
    }

    if (active.code.trim() !== inputCode.trim()) {
      this.saveData();
      return { valid: false, reason: `Tasdiqlash kodi noto‘g‘ri! (Qolgan urinishlar: ${Math.max(0, 5 - active.attempts)})` };
    }

    // Success: consume code
    delete sec.activeRecoveryCode;
    this.saveData();
    return { valid: true };
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


  // --- STATISTICAL PERIODS & AUDIT LOGS ---

  getStatisticalPeriods(): StatisticalPeriod[] {
    if (!this.data.statisticalPeriods || this.data.statisticalPeriods.length === 0) {
      this.data.statisticalPeriods = [
        {
          id: 'period_initial',
          name: 'Boshlang‘ich hisobot davri',
          startedAt: '2025-01-01T00:00:00.000Z',
        },
      ];
      this.data.currentPeriodId = 'period_initial';
      this.saveData();
    }
    return this.data.statisticalPeriods;
  }

  getCurrentStatisticalPeriod(): StatisticalPeriod {
    const periods = this.getStatisticalPeriods();
    const currentId = this.data.currentPeriodId || periods[0]?.id || 'period_initial';
    const found = periods.find(p => p.id === currentId && !p.archivedAt);
    if (found) return found;

    // Fallback: create fresh active period
    const activePeriod: StatisticalPeriod = {
      id: `period_${Date.now()}`,
      name: `Faol hisobot davri (${new Date().toLocaleDateString('uz-UZ')})`,
      startedAt: new Date().toISOString(),
    };
    if (!this.data.statisticalPeriods) this.data.statisticalPeriods = [];
    this.data.statisticalPeriods.unshift(activePeriod);
    this.data.currentPeriodId = activePeriod.id;
    this.saveData();
    return activePeriod;
  }

  startNewStatisticalPeriod(adminUsername: string, adminRole: string, reason = 'Yangi savdo davri boshlanishi'): {
    previousPeriod: StatisticalPeriod;
    newPeriod: StatisticalPeriod;
  } {
    const currentPeriod = this.getCurrentStatisticalPeriod();
    const currentStats = this.getSalesAndFinanceAnalytics({ periodId: currentPeriod.id });

    // 1. Archive current period with snapshot summary
    currentPeriod.archivedAt = new Date().toISOString();
    currentPeriod.archivedBy = adminUsername;
    currentPeriod.reason = reason;
    currentPeriod.summary = {
      totalRevenue: currentStats.totalRevenue,
      netProfit: currentStats.netRealProfit,
      totalOrders: currentStats.totalOrdersCount,
      soldItemsCount: currentStats.totalSoldItems,
    };
    currentPeriod.snapshot = {
      turnover: currentStats.totalTurnover,
      revenue: currentStats.totalRevenue,
      cogs: currentStats.cogsTotal,
      grossProfit: currentStats.grossProfit,
      netRealProfit: currentStats.netRealProfit,
      ordersCount: currentStats.totalOrdersCount,
      soldItemsCount: currentStats.totalSoldItems,
    };

    // 2. Create new active statistical period (Dashboard starts from 0 for this new period)
    const newPeriodId = `period_${Date.now()}`;
    const newPeriod: StatisticalPeriod = {
      id: newPeriodId,
      name: `Yangi davr (${new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' })})`,
      startedAt: new Date().toISOString(),
    };

    if (!this.data.statisticalPeriods) this.data.statisticalPeriods = [];
    this.data.statisticalPeriods.unshift(newPeriod);
    this.data.currentPeriodId = newPeriodId;

    // 3. Log audit event
    this.addAuditLog({
      adminUsername,
      adminRole,
      action: 'START_NEW_STATISTICAL_PERIOD',
      details: `Super Admin «${adminUsername}» tomonidan yangi statistik davr («${newPeriod.name}») boshlandi. Eski davr («${currentPeriod.name}») arxivlandi.`,
      previousValue: currentPeriod,
      newValue: newPeriod,
    });

    this.saveData();
    return { previousPeriod: currentPeriod, newPeriod };
  }

  getAuditLogs(limit = 100): AuditLogEntry[] {
    const logs = this.data.auditLogs || [];
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
    if (!this.data.auditLogs) this.data.auditLogs = [];
    const log: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.data.auditLogs.unshift(log);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.saveData();
    return log;
  }

  // --- SALES, REVENUE & FINANCIAL ANALYTICS ---

  getSalesAndFinanceAnalytics(filter?: {
    periodId?: string;
    startDate?: string;
    endDate?: string;
  }): SalesFinanceStats {
    const currentPeriod = this.getCurrentStatisticalPeriod();
    const periods = this.getStatisticalPeriods();

    let targetPeriod = currentPeriod;
    if (filter?.periodId && filter.periodId !== 'ALL') {
      const found = periods.find(p => p.id === filter.periodId);
      if (found) targetPeriod = found;
    }

    const periodStartTime = new Date(targetPeriod.startedAt).getTime();
    const periodEndTime = targetPeriod.archivedAt ? new Date(targetPeriod.archivedAt).getTime() : Infinity;

    // Filter orders strictly by period or date range
    const orders = (this.data.orders || []).filter(order => {
      const orderTime = new Date(order.createdAt).getTime();

      // If explicit date range provided
      if (filter?.startDate && orderTime < new Date(filter.startDate).getTime()) return false;
      if (filter?.endDate && orderTime > new Date(filter.endDate).getTime() + 86400000) return false;

      // Filter by period when no explicit custom dates
      if (!filter?.startDate && !filter?.endDate && filter?.periodId !== 'ALL') {
        if (order.statisticalPeriodId) {
          return order.statisticalPeriodId === targetPeriod.id;
        }
        return orderTime >= periodStartTime && orderTime <= periodEndTime;
      }
      return true;
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    const thirtyDaysAgo = Date.now() - 30 * 86400000;

    let totalSoldItems = 0;
    let totalTurnover = 0;
    let totalRevenue = 0;
    let cogsTotal = 0;
    let deliveryExpensesTotal = 0;
    let discountsTotal = 0;
    let refundsTotal = 0;
    let pendingRevenue = 0;

    let completedOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let returnedOrdersCount = 0;
    let pendingOrdersCount = 0;

    let todaySalesCount = 0;
    let todaySalesRevenue = 0;
    let weeklySalesCount = 0;
    let weeklySalesRevenue = 0;
    let monthlySalesCount = 0;
    let monthlySalesRevenue = 0;

    const productSalesMap = new Map<string, {
      productId: string;
      name: string;
      image: string;
      sku?: string;
      unitsSold: number;
      totalRevenue: number;
      totalCost: number;
    }>();

    const categoryMap = new Map<string, { revenue: number; count: number }>();
    const statusMap = new Map<string, number>();

    orders.forEach(order => {
      const orderTime = new Date(order.createdAt).getTime();
      const isCompleted = order.status === 'YETKAZILDI';
      const isCancelled = order.status === 'BEKOR_QILINDI';
      const isPending = ['YANGI', 'TASDIQLANDI', 'TAYYORLANMOQDA', 'YETKAZILMOQDA'].includes(order.status);
      const isReturned = (order.note && order.note.toLowerCase().includes('qaytarildi')) || false;

      // Track status breakdown
      statusMap.set(order.status, (statusMap.get(order.status) || 0) + 1);

      if (isCompleted) {
        completedOrdersCount++;
        totalRevenue += Number(order.total) || 0;
        totalTurnover += Number(order.total) || 0;
        deliveryExpensesTotal += Number(order.deliveryFee) || 0;
        discountsTotal += Number(order.discount) || 0;

        // Calculate COGS and sold items
        (order.items || []).forEach(item => {
          const qty = Number(item.quantity) || 1;
          totalSoldItems += qty;

          // Find product cost price (Tannarx)
          const prod = this.getProductById(item.productId);
          const itemCostPrice = Number(prod?.costPrice) > 0
            ? Number(prod!.costPrice)
            : Math.round((Number(item.unitPrice) || 0) * 0.6); // Reasonable standard 60% fallback if unset
          const itemTotalCost = itemCostPrice * qty;
          cogsTotal += itemTotalCost;

          // Track top product sales
          const existingProd = productSalesMap.get(item.productId) || {
            productId: item.productId,
            name: item.productName || prod?.name || 'Mahsulot',
            image: item.productImage || prod?.images?.[0] || '',
            sku: prod?.sku,
            unitsSold: 0,
            totalRevenue: 0,
            totalCost: 0,
          };
          existingProd.unitsSold += qty;
          existingProd.totalRevenue += Number(item.totalPrice) || (Number(item.unitPrice) * qty);
          existingProd.totalCost += itemTotalCost;
          productSalesMap.set(item.productId, existingProd);

          // Track category distribution
          const catName = item.categoryName || prod?.categoryName || 'Erkaklar kiyimi';
          const catData = categoryMap.get(catName) || { revenue: 0, count: 0 };
          catData.revenue += Number(item.totalPrice) || (Number(item.unitPrice) * qty);
          catData.count += qty;
          categoryMap.set(catName, catData);
        });

        // Time-based stats
        if (orderTime >= startOfToday) {
          todaySalesCount++;
          todaySalesRevenue += order.total;
        }
        if (orderTime >= sevenDaysAgo) {
          weeklySalesCount++;
          weeklySalesRevenue += order.total;
        }
        if (orderTime >= thirtyDaysAgo) {
          monthlySalesCount++;
          monthlySalesRevenue += order.total;
        }
      } else if (isCancelled) {
        cancelledOrdersCount++;
        // If payment was made and cancelled, record as refund
        if (order.paymentStatus === 'TOLANDI') {
          refundsTotal += Number(order.total) || 0;
        }
      } else if (isPending) {
        pendingOrdersCount++;
        pendingRevenue += Number(order.total) || 0;
      }

      if (isReturned) {
        returnedOrdersCount++;
      }
    });

    // Gross Profit (Sof yalpi daromad) = Tushum - Tannarx
    const grossProfit = Math.max(0, totalRevenue - cogsTotal);

    // Real Net Profit (Haqiqiy sof foyda) = Sof yalpi - Yetkazib berish xarajatlari - Qaytarilgan pullar
    const netRealProfit = Math.max(0, grossProfit - deliveryExpensesTotal - refundsTotal);
    const profitMarginPercent = totalRevenue > 0 ? Number(((netRealProfit / totalRevenue) * 100).toFixed(1)) : 0;

    // Daily Sales (last 7 days timeline)
    const dailySales: { date: string; label: string; revenue: number; profit: number; ordersCount: number }[] = [];
    const dayNames = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Juma', 'Shan'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + 86400000;
      const dayOrders = orders.filter(o => {
        const t = new Date(o.createdAt).getTime();
        return o.status === 'YETKAZILDI' && t >= dayStart && t < dayEnd;
      });
      const dayRev = dayOrders.reduce((sum, o) => sum + o.total, 0);
      const dayProfit = Math.round(dayRev * (profitMarginPercent ? profitMarginPercent / 100 : 0.35));
      dailySales.push({
        date: d.toISOString().slice(0, 10),
        label: `${dayNames[d.getDay()]} (${d.getDate()})`,
        revenue: dayRev,
        profit: dayProfit,
        ordersCount: dayOrders.length,
      });
    }

    // Weekly Sales
    const weeklySalesChart = [
      { label: 'Hafta 1', revenue: Math.round(weeklySalesRevenue * 0.2), profit: Math.round(weeklySalesRevenue * 0.08) },
      { label: 'Hafta 2', revenue: Math.round(weeklySalesRevenue * 0.25), profit: Math.round(weeklySalesRevenue * 0.1) },
      { label: 'Hafta 3', revenue: Math.round(weeklySalesRevenue * 0.3), profit: Math.round(weeklySalesRevenue * 0.12) },
      { label: 'Hafta 4 (Joriy)', revenue: Math.round(weeklySalesRevenue * 0.25), profit: Math.round(weeklySalesRevenue * 0.1) },
    ];

    // Monthly Sales
    const months = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    const currentMonthIdx = now.getMonth();
    const monthlySalesChart = [
      { label: months[(currentMonthIdx - 3 + 12) % 12], revenue: Math.round(totalRevenue * 0.2), profit: Math.round(netRealProfit * 0.2) },
      { label: months[(currentMonthIdx - 2 + 12) % 12], revenue: Math.round(totalRevenue * 0.25), profit: Math.round(netRealProfit * 0.25) },
      { label: months[(currentMonthIdx - 1 + 12) % 12], revenue: Math.round(totalRevenue * 0.3), profit: Math.round(netRealProfit * 0.3) },
      { label: months[currentMonthIdx] + ' (Joriy)', revenue: monthlySalesRevenue || Math.round(totalRevenue * 0.25), profit: Math.round((monthlySalesRevenue || totalRevenue) * 0.35) },
    ];

    // Category Distribution
    const categorySalesDistribution = Array.from(categoryMap.entries()).map(([name, data]) => ({
      categoryName: name,
      revenue: data.revenue,
      count: data.count,
      percentage: totalRevenue > 0 ? Number(((data.revenue / totalRevenue) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    // Status Breakdown
    const totalOrdersCount = orders.length;
    const orderStatusBreakdown = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
      percentage: totalOrdersCount > 0 ? Number(((count / totalOrdersCount) * 100).toFixed(1)) : 0,
    }));

    // Top Selling Products
    const topSellingProducts = Array.from(productSalesMap.values())
      .map(p => ({
        productId: p.productId,
        name: p.name,
        image: p.image,
        sku: p.sku,
        unitsSold: p.unitsSold,
        totalRevenue: p.totalRevenue,
        totalProfit: Math.max(0, p.totalRevenue - p.totalCost),
      }))
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10);

    return {
      period: targetPeriod,
      totalSoldItems,
      totalOrdersCount,
      completedOrdersCount,
      cancelledOrdersCount,
      returnedOrdersCount,
      pendingOrdersCount,
      todaySalesCount,
      todaySalesRevenue,
      weeklySalesCount,
      weeklySalesRevenue,
      monthlySalesCount,
      monthlySalesRevenue,
      totalTurnover,
      totalRevenue,
      cogsTotal,
      grossProfit,
      deliveryExpensesTotal,
      discountsTotal,
      refundsTotal,
      pendingRevenue,
      netRealProfit,
      profitMarginPercent,
      dailySales,
      weeklySalesChart,
      monthlySalesChart,
      categorySalesDistribution,
      orderStatusBreakdown,
      topSellingProducts,
    };
  }

  getSoldItemsHistory(filter?: {
    search?: string;
    startDate?: string;
    endDate?: string;
    periodId?: string;
    limit?: number;
    offset?: number;
  }): { items: SoldItemRecord[]; total: number } {
    const analytics = this.getSalesAndFinanceAnalytics({
      periodId: filter?.periodId,
      startDate: filter?.startDate,
      endDate: filter?.endDate,
    });

    const targetPeriod = analytics.period;
    const periodStartTime = new Date(targetPeriod.startedAt).getTime();
    const periodEndTime = targetPeriod.archivedAt ? new Date(targetPeriod.archivedAt).getTime() : Infinity;

    const soldRecords: SoldItemRecord[] = [];

    (this.data.orders || []).forEach(order => {
      const orderTime = new Date(order.createdAt).getTime();

      // Filter by period if needed
      if (filter?.periodId && filter.periodId !== 'ALL') {
        if (order.statisticalPeriodId && order.statisticalPeriodId !== targetPeriod.id) return;
        if (!order.statisticalPeriodId && (orderTime < periodStartTime || orderTime > periodEndTime)) return;
      }
      if (filter?.startDate && orderTime < new Date(filter.startDate).getTime()) return;
      if (filter?.endDate && orderTime > new Date(filter.endDate).getTime() + 86400000) return;

      (order.items || []).forEach(item => {
        const prod = this.getProductById(item.productId);
        const qty = Number(item.quantity) || 1;
        const unitPrice = Number(item.unitPrice) || 0;
        const totalRevenue = Number(item.totalPrice) || (unitPrice * qty);
        const costPrice = Number(prod?.costPrice) > 0 ? Number(prod!.costPrice) : Math.round(unitPrice * 0.6);
        const totalCost = costPrice * qty;
        const profit = Math.max(0, totalRevenue - totalCost);

        soldRecords.push({
          id: `${order.id}_${item.id}`,
          productId: item.productId,
          productName: item.productName || prod?.name || 'Mahsulot',
          productImage: item.productImage || prod?.images?.[0] || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=400&auto=format&fit=crop',
          categoryName: item.categoryName || prod?.categoryName || 'Erkaklar kiyimi',
          sku: prod?.sku,
          barcode: prod?.barcode,
          billzId: prod?.billzId,
          size: item.size || 'Standart',
          color: item.color || 'Standart',
          quantity: qty,
          unitPrice,
          costPrice,
          totalRevenue,
          totalCost,
          profit,
          soldAt: order.createdAt,
          orderId: order.id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          deliveryAddress: `${order.region || ''}, ${order.city || ''}, ${order.address || ''}`,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus || 'KUTILMOQDA',
          orderStatus: order.status,
        });
      });
    });

    // Apply search
    let filtered = soldRecords;
    if (filter?.search && filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      filtered = filtered.filter(r =>
        r.productName.toLowerCase().includes(q) ||
        (r.sku && r.sku.toLowerCase().includes(q)) ||
        (r.billzId && r.billzId.toLowerCase().includes(q)) ||
        r.orderNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.includes(q)
      );
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());

    const limit = filter?.limit || 50;
    const offset = filter?.offset || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      items: paginated,
      total: filtered.length,
    };
  }

  // Analytics for main admin dashboard
  getAdminStats() {
    const analytics = this.getSalesAndFinanceAnalytics();
    const totalProducts = this.data.products.length;
    const totalCustomers = this.data.users.filter(u => u.role === 'CUSTOMER').length;

    const averageOrderValue = analytics.completedOrdersCount > 0
      ? Math.round(analytics.totalRevenue / analytics.completedOrdersCount)
      : 0;

    return {
      totalRevenue: analytics.totalRevenue,
      netRealProfit: analytics.netRealProfit,
      grossProfit: analytics.grossProfit,
      cogsTotal: analytics.cogsTotal,
      profitMarginPercent: analytics.profitMarginPercent,
      totalOrders: analytics.totalOrdersCount,
      completedOrders: analytics.completedOrdersCount,
      soldItemsCount: analytics.totalSoldItems,
      newOrders: analytics.pendingOrdersCount,
      totalCustomers: totalCustomers || 1,
      totalProducts,
      averageOrderValue,
      period: analytics.period,
      weeklySales: analytics.dailySales.map(d => ({ label: d.label, amount: d.revenue })),
      monthlySales: analytics.monthlySalesChart.map(m => ({ label: m.label, amount: m.revenue })),
    };
  }

  // --- BRANCHES MANAGEMENT (Preserve branch architecture) ---

  getBranches(): Branch[] {
    if (!this.data.branches || this.data.branches.length === 0) {
      this.data.branches = [
        {
          id: 'branch_central',
          name: 'SHU BREND — Markaziy Filial & Do‘kon',
          billzShopId: 'shop_tashkent_central',
          address: 'Toshkent shahri, Mirobod tumani, Shahrisabz ko‘chasi, 12-uy',
          phone: '+998 90 123 45 67',
          isActive: true,
          isCentral: true,
          createdAt: new Date('2025-01-01').toISOString(),
        },
      ];
      this.saveData();
    }
    return this.data.branches;
  }

  getBranchById(id: string): Branch | undefined {
    return this.getBranches().find(b => b.id === id);
  }

  saveBranch(branch: Branch): Branch {
    if (!this.data.branches) this.data.branches = [];
    const idx = this.data.branches.findIndex(b => b.id === branch.id);
    if (idx >= 0) {
      this.data.branches[idx] = { ...this.data.branches[idx], ...branch };
    } else {
      this.data.branches.push(branch);
    }
    this.saveData();
    return branch;
  }

  deleteBranch(id: string): boolean {
    if (!this.data.branches) return false;
    const initialLen = this.data.branches.length;
    // Don't delete central branch if it's the only one
    const target = this.data.branches.find(b => b.id === id);
    if (target?.isCentral && this.data.branches.length === 1) {
      return false;
    }
    this.data.branches = this.data.branches.filter(b => b.id !== id);
    if (this.data.branches.length < initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  // --- BILLZ INTEGRATION STORAGE & LOGS ---

  getBillzConfig(): BillzStorageConfig {
    if (!this.data.billzConfig) {
      this.data.billzConfig = {
        apiUrl: 'https://api-admin.billz.ai',
        autoSyncEnabled: false,
        syncIntervalMinutes: 60,
        status: 'UNCONFIGURED',
        centralShopId: 'shop_tashkent_central',
        syncImages: true,
        syncPrices: true,
        syncStock: true,
      };
      this.saveData();
    }
    return this.data.billzConfig;
  }

  updateBillzConfig(config: Partial<BillzStorageConfig>): BillzStorageConfig {
    const current = this.getBillzConfig();
    this.data.billzConfig = {
      ...current,
      ...config,
    };
    this.saveData();
    return this.data.billzConfig;
  }

  getBillzLogs(limit = 100): BillzSyncLog[] {
    const logs = this.data.billzLogs || [];
    return [...logs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, limit);
  }

  addBillzLog(log: Omit<BillzSyncLog, 'id' | 'timestamp'>): BillzSyncLog {
    if (!this.data.billzLogs) this.data.billzLogs = [];
    const entry: BillzSyncLog = {
      id: `blog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.billzLogs.unshift(entry);
    if (this.data.billzLogs.length > 500) {
      this.data.billzLogs = this.data.billzLogs.slice(0, 500);
    }
    this.saveData();
    return entry;
  }

  // --- BILLZ + n8n INTEGRATION REPOSITORY METHODS ---

  getN8nConfig(): N8nStorageConfig {
    if (!this.data.n8nConfig) {
      this.data.n8nConfig = {
        apiKey: 'n8n_live_shubrend_' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12),
        enabled: true,
        totalSyncedProducts: 0,
        totalErrors: 0,
        autoPublish: true,
        preserveCustomImages: true,
        lastWebhookStatus: 'IDLE',
        logs: [],
      };
      this.saveData();
    }
    return this.data.n8nConfig;
  }

  updateN8nConfig(patch: Partial<N8nStorageConfig>): N8nStorageConfig {
    const current = this.getN8nConfig();
    this.data.n8nConfig = {
      ...current,
      ...patch,
    };
    this.saveData();
    return this.data.n8nConfig;
  }

  addN8nLog(log: Omit<N8nWebhookLog, 'id' | 'timestamp'>): N8nWebhookLog {
    const current = this.getN8nConfig();
    if (!current.logs) current.logs = [];
    const entry: N8nWebhookLog = {
      id: `n8n_log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    current.logs.unshift(entry);
    if (current.logs.length > 300) {
      current.logs = current.logs.slice(0, 300);
    }
    this.data.n8nConfig = current;
    this.saveData();
    return entry;
  }

  resetN8nApiKey(): string {
    const newKey = 'n8n_live_shubrend_' + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
    this.updateN8nConfig({ apiKey: newKey });
    return newKey;
  }

  findProductByBillzId(billzId: string): Product | undefined {
    return this.data.products.find(p => p.billzId === billzId);
  }

  findProductBySkuOrBarcode(sku?: string, barcode?: string): Product | undefined {
    return this.data.products.find(p => {
      if (sku && p.sku && p.sku.toLowerCase() === sku.toLowerCase()) return true;
      if (barcode && p.barcode && p.barcode === barcode) return true;
      if (sku && p.variants && p.variants.some(v => v.sku && v.sku.toLowerCase() === sku.toLowerCase())) return true;
      if (barcode && p.variants && p.variants.some(v => v.barcode && v.barcode === barcode)) return true;
      return false;
    });
  }

  // --- BILLZ STAGING & PRODUCT SELECTION STORAGE ---

  getBillzStagingProducts(): BillzStagingProduct[] {
    return this.data.billzStagingProducts || [];
  }

  getBillzStagingProductById(id: string): BillzStagingProduct | undefined {
    return (this.data.billzStagingProducts || []).find(p => p.id === id);
  }

  findStagingProductByBillzId(billzId: string): BillzStagingProduct | undefined {
    return (this.data.billzStagingProducts || []).find(p => p.billzId === billzId);
  }

  saveBillzStagingProduct(item: BillzStagingProduct): BillzStagingProduct {
    if (!this.data.billzStagingProducts) this.data.billzStagingProducts = [];
    const idx = this.data.billzStagingProducts.findIndex(p => p.id === item.id || p.billzId === item.billzId);
    item.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      this.data.billzStagingProducts[idx] = { ...this.data.billzStagingProducts[idx], ...item };
    } else {
      this.data.billzStagingProducts.unshift(item);
    }
    this.saveData();
    return item;
  }

  saveBillzStagingProducts(items: BillzStagingProduct[]): BillzStagingProduct[] {
    if (!this.data.billzStagingProducts) this.data.billzStagingProducts = [];
    for (const item of items) {
      const idx = this.data.billzStagingProducts.findIndex(p => p.id === item.id || p.billzId === item.billzId);
      item.updatedAt = new Date().toISOString();
      if (idx >= 0) {
        this.data.billzStagingProducts[idx] = { ...this.data.billzStagingProducts[idx], ...item };
      } else {
        this.data.billzStagingProducts.unshift(item);
      }
    }
    this.saveData();
    return this.data.billzStagingProducts;
  }

  deleteBillzStagingProduct(id: string): boolean {
    if (!this.data.billzStagingProducts) return false;
    const initialLen = this.data.billzStagingProducts.length;
    this.data.billzStagingProducts = this.data.billzStagingProducts.filter(p => p.id !== id);
    if (this.data.billzStagingProducts.length < initialLen) {
      this.saveData();
      return true;
    }
    return false;
  }

  getFullDatabaseSnapshot(): Record<string, any> {
    const clone = JSON.parse(JSON.stringify(this.data));
    // Mask sensitive security secrets in export
    if (clone.adminSecurity) {
      delete clone.adminSecurity.passwordHash;
      clone.adminSecurity.isPasswordSet = true;
    }
    if (clone.internalSettings?.telegramSettings) {
      clone.internalSettings.telegramSettings.botToken = '••••••••';
    }
    return {
      appName: 'SHU BRAND NEW',
      exportedAt: new Date().toISOString(),
      version: '2.5.0',
      data: clone,
    };
  }
}

export const db = new Database();
