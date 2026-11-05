export type Role = 'ADMIN' | 'CUSTOMER';

export type OrderStatus =
  | 'YANGI'
  | 'TASDIQLANDI'
  | 'TAYYORLANMOQDA'
  | 'YETKAZILMOQDA'
  | 'YETKAZILDI'
  | 'BEKOR_QILINDI';

export type PaymentMethod = 'CLICK_CARD' | 'PAYNET_CARD' | 'CLICK' | 'PAYME';

export type PaymentStatus =
  | 'KUTILMOQDA'
  | 'TOLANDI'
  | 'BEKOR_QILINDI'
  | 'XATOLIK';

export interface LocationCoords {
  lat: number;
  lng: number;
  address?: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: Role;
  region: string;
  city: string;
  address: string;
  location?: LocationCoords;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  itemCount?: number;
  imageUrl?: string;
  sortOrder: number;
  isHidden?: boolean;
}

export type ProductLifecycleStatus = 'DRAFT' | 'EDITING' | 'READY' | 'PUBLISHED' | 'ARCHIVED';

export interface ProductVariant {
  id?: string;
  size: string;
  color: string;
  stock: number;
  imageUrl?: string;
  barcode?: string;
  sku?: string;
  billzVariantId?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  discountPrice?: number;
  description: string;
  images: string[];
  sizes: string[];
  colors: string[];
  stock: number;
  billzReportedStock?: number;
  stockDiscrepancy?: number;
  variants?: ProductVariant[];
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isTrending?: boolean;
  isFeatured?: boolean;
  brand?: string;
  sku?: string;
  barcode?: string;
  billzId?: string;
  billzShopId?: string;
  lastBillzSync?: string;
  branchAvailability?: { branchId: string; branchName: string; stock: number }[];
  details?: {
    material?: string;
    season?: string;
    fit?: string;
    origin?: string;
  };
  createdAt: string;
  costPrice?: number;
  hasCustomImages?: boolean;
  colorImages?: Record<string, string[]>;
  source?: 'MANUAL' | 'BILLZ';
  isPublished?: boolean;
  status?: ProductLifecycleStatus;
  readyForPublishAt?: string;
  publishedAt?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  variantId?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  categoryName?: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  variantId?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId?: string;
  customerName: string;
  customerPhone: string;
  region: string;
  city: string;
  address: string;
  location?: LocationCoords;
  note?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  paymentDetails?: {
    transactionId?: string;
    provider?: string;
    paidAt?: string;
    paymentUrl?: string;
  };
  status: OrderStatus;
  statusHistory: {
    status: OrderStatus;
    changedAt: string;
    comment?: string;
  }[];
  billzSaleId?: string;
  billzSyncedAt?: string;
  billzSyncStatus?: 'PENDING' | 'SYNCED' | 'FAILED' | 'LOCAL_ONLY';
  billzSyncError?: string;
  assignedBranchId?: string;
  statisticalPeriodId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentTransaction {
  id: string;
  orderId: string;
  orderNumber: string;
  provider: 'CLICK' | 'PAYME' | 'CLICK_CARD' | 'PAYNET_CARD';
  amount: number;
  transactionId: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'CANCELLED';
  rawResponse?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productName?: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  isApproved: boolean;
  createdAt: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  imageUrl: string;
  mobileImageUrl?: string;
  badge?: string;
  isActive: boolean;
  sortOrder: number;
}

export interface CardPaymentSettings {
  cardType: string; // e.g. "HUMO"
  cardNumber: string; // e.g. "9860 3501 2458 7789"
  cardHolder: string; // e.g. "SHU BREND MCHJ"
  bankName: string; // e.g. "Kapitalbank"
  telegramUsername: string; // e.g. "@shubrend_admin"
  instructions?: string;
}

export interface PaymentProviderSettings {
  click: {
    enabled: boolean;
    testMode: boolean;
    serviceId: string;
    merchantId: string;
    merchantUserId?: string;
    secretKey?: string;
    secretKeyMasked?: string;
    hasSecretKey?: boolean;
  };
  payme: {
    enabled: boolean;
    testMode: boolean;
    merchantId: string;
    secretKey?: string;
    secretKeyMasked?: string;
    hasSecretKey?: boolean;
  };
  cash: {
    enabled: boolean;
  };
}

export interface TelegramSettings {
  enabled: boolean;
  botToken?: string;
  botTokenMasked?: string;
  hasBotToken?: boolean;
  chatId: string;
  botUsername?: string;
  botFirstName?: string;
  lastTestedAt?: string;
  status?: 'CONNECTED' | 'DISCONNECTED' | 'CHECKING' | 'ERROR';
}

export interface AdminSecuritySettings {
  username: string;
  lastPasswordChange?: string;
}

export interface SiteSettings {
  storeName: string;
  storeTagline: string;
  logoUrl?: string;
  faviconUrl?: string;
  phone: string;
  telegramUrl: string;
  instagramUrl: string;
  address: string;
  workingHours: string;
  location: LocationCoords;
  headerNotice: string;
  currency: string;
  deliveryFreeAbove: number;
  standardDeliveryFee: number;
  heroTitle?: string;
  heroSubtitle?: string;
  heroBadge1: string;
  heroBadge2: string;
  heroBadge3: string;
  heroBadge4: string;
  featuresTitle?: string;
  featuresSubtitle?: string;
  catalogTitle?: string;
  catalogSubtitle?: string;
  aboutTitle?: string;
  aboutText: string;
  themePrimaryColor: string;
  themeAccentColor?: string;
  paymentSettings?: PaymentProviderSettings;
  telegramSettings?: TelegramSettings;
  cardSettings?: CardPaymentSettings;
}

export type InventoryActionType =
  | 'OFFLINE_SALE'
  | 'OFFLINE_SALE_CANCEL'
  | 'RESTOCK'
  | 'MANUAL_ADJUST'
  | 'ONLINE_ORDER_RESERVED'
  | 'ONLINE_ORDER_CANCELLED';

export interface InventoryLog {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  productImage?: string;
  color: string;
  size: string;
  delta: number;
  previousStock: number;
  newStock: number;
  type: InventoryActionType;
  orderId?: string;
  orderNumber?: string;
  price?: number;
  note?: string;
  operator?: string;
  cancelled?: boolean;
}

export interface LowStockVariantInfo {
  productId: string;
  productName: string;
  productImage: string;
  color: string;
  size: string;
  stock: number;
  price: number;
}

export interface WarehouseStats {
  totalStockUnits: number;
  totalProductsCount: number;
  outOfStockVariantsCount: number;
  lowStockVariantsCount: number;
  todayOfflineSalesCount: number;
  todayOfflineSalesRevenue: number;
  todayOnlineSalesCount: number;
  todayOnlineSalesRevenue: number;
  totalTodayRevenue: number;
  monthlyRevenue: number;
  topSellingProducts: { productId: string; name: string; quantity: number; revenue: number }[];
  topSellingSizes: { size: string; quantity: number }[];
  topSellingColors: { color: string; quantity: number }[];
  lowStockVariants: LowStockVariantInfo[];
  outOfStockVariants: LowStockVariantInfo[];
}

export interface Branch {
  id: string;
  name: string;
  billzShopId?: string;
  address: string;
  phone?: string;
  isActive: boolean;
  isCentral: boolean;
  createdAt: string;
}

export type BillzSyncStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'UNCONFIGURED';

export interface BillzSettings {
  apiUrl: string;
  hasApiKey: boolean;
  apiKeyMasked?: string;
  hasPlatformId: boolean;
  platformIdMasked?: string;
  autoSyncEnabled: boolean;
  syncIntervalMinutes: number;
  lastSyncAt?: string;
  lastSyncStatus?: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'IDLE';
  lastError?: string;
  status: BillzSyncStatus;
  centralShopId?: string;
  syncImages: boolean;
  syncPrices: boolean;
  syncStock: boolean;
  totalSyncedProducts?: number;
  totalCatalogProducts?: number;
  productsWithImages?: number;
  productsWithoutImages?: number;
  nextSyncAt?: string;
  authStatus?: string;
  isSyncing?: boolean;
  mingbuloqShopId?: string;
  mingbuloqShopName?: string;
  mingbuloqTotalStock?: number;
  legacyProductsCount?: number;
  mainShopId?: string;
  mainShopName?: string;
  mainWarehouseTotalStock?: number;
  branchShopId?: string;
  branchShopName?: string;
  branchTotalStock?: number;
  stagedProductsCount?: number;
}

export type BillzProductStatus =
  | 'SELECTED'        // Tanlangan
  | 'UNDER_REVIEW'   // Ko‘rib chiqilmoqda
  | 'EDITING'        // Tahrirlanmoqda
  | 'READY'          // Saytga chiqarishga tayyor
  | 'PUBLISHED'      // Saytga chiqarilgan
  | 'REJECTED';      // Rad etilgan

export interface BillzStagingProduct {
  id: string;
  billzId: string;
  name: string;
  sku?: string;
  barcode?: string;
  brand?: string;
  categoryName?: string;
  categorySlug?: string;
  price: number;
  costPrice?: number;
  discountPrice?: number;
  description?: string;
  images: string[];
  hasCustomImages?: boolean;
  colors: string[];
  sizes: string[];
  variants?: ProductVariant[];
  mainWarehouseStock: number; // Asosiy "SHU BREND" omboridagi qoldiq
  branchStock: number;        // "Shu brand Mingbuloq" filialidagi qoldiq
  totalStock: number;
  status: BillzProductStatus;
  publishedProductId?: string;
  publishedAt?: string;
  rawBillzData?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BillzDiagnosticInfo {
  apiUrl: string;
  status: BillzSyncStatus;
  hasApiKey: boolean;
  hasPlatformId: boolean;
  tokenStatus: string;
  tokenExpiry?: string;
  mainWarehouse: {
    name: string;
    id?: string;
    status: 'FOUND' | 'NOT_FOUND' | 'CHECKING';
    stockSum: number;
  };
  branchWarehouse: {
    name: string;
    id?: string;
    status: 'FOUND' | 'NOT_FOUND' | 'CHECKING';
    stockSum: number;
  };
  lastRequest?: {
    url: string;
    method: string;
    statusCode: number;
    contentType: string;
    durationMs: number;
    timestamp: string;
    errorSnippet?: string;
  };
  totalProductsInBillz: number;
  totalStagedProducts: number;
  totalPublishedProducts: number;
  lastSyncAt?: string;
  nextSyncAt?: string;
  autoSyncEnabled: boolean;
}

export interface BillzSyncLog {
  id: string;
  timestamp: string;
  type: 'TEST_CONNECTION' | 'IMPORT_PRODUCTS' | 'STOCK_SYNC' | 'ORDER_SYNC';
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  itemsCount?: number;
  details: string;
  error?: string;
  durationMs?: number;
}

// --- BILLZ + n8n INTEGRATION TYPES ---

export interface N8nWebhookLog {
  id: string;
  timestamp: string;
  type: 'SINGLE' | 'BULK' | 'HEALTH_CHECK';
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL';
  productsReceived: number;
  productsUpserted: number;
  errorCount: number;
  details?: string;
  sourceIp?: string;
}

export interface N8nConfig {
  apiKey: string;
  apiKeyMasked: string;
  enabled: boolean;
  webhookUrlSingle: string;
  webhookUrlBulk: string;
  healthUrl: string;
  lastWebhookAt?: string;
  lastWebhookStatus?: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'IDLE';
  lastWebhookMessage?: string;
  totalSyncedProducts: number;
  totalErrors: number;
  autoPublish: boolean;
  preserveCustomImages: boolean;
  logs: N8nWebhookLog[];
}

export interface N8nProductPayload {
  billzId: string;
  name: string;
  sku?: string;
  barcode?: string;
  article?: string;
  images?: string[];
  image?: string;
  category?: string;
  categoryName?: string;
  categorySlug?: string;
  price: number;
  costPrice?: number;
  discountPrice?: number;
  colors?: string[];
  sizes?: string[];
  stock?: number;
  quantity?: number;
  description?: string;
  isPublished?: boolean;
  branchAvailability?: {
    branchId: string;
    branchName: string;
    stock: number;
  }[];
  variants?: {
    id?: string;
    size: string;
    color: string;
    stock: number;
    barcode?: string;
    sku?: string;
    price?: number;
  }[];
}

export interface N8nUpsertResult {
  success: boolean;
  action: 'CREATED' | 'UPDATED' | 'SKIPPED';
  productId: string;
  name: string;
  billzId: string;
  price: number;
  stock: number;
  message: string;
}

export interface N8nBulkUpsertResult {
  success: boolean;
  totalReceived: number;
  upsertedCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  errors: { billzId?: string; name?: string; error: string }[];
  message: string;
  timestamp: string;
}

// --- SALES, REVENUE & FINANCIAL ANALYTICS ---

export interface SoldItemRecord {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  categoryName?: string;
  sku?: string;
  barcode?: string;
  billzId?: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  soldAt: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  paymentMethod?: string;
  paymentStatus: string;
  orderStatus: string;
}

export interface StatisticalPeriod {
  id: string;
  name: string;
  startedAt: string;
  archivedAt?: string;
  archivedBy?: string;
  reason?: string;
  summary?: {
    totalRevenue: number;
    netProfit: number;
    totalOrders: number;
    soldItemsCount: number;
  };
  snapshot?: {
    turnover: number;
    revenue: number;
    cogs: number;
    grossProfit: number;
    netRealProfit: number;
    ordersCount: number;
    soldItemsCount: number;
  };
}

export interface SalesFinanceStats {
  period: StatisticalPeriod;
  // 1. Savdo statistikasi
  totalSoldItems: number;
  totalOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount: number;
  returnedOrdersCount: number;
  pendingOrdersCount: number;
  todaySalesCount: number;
  todaySalesRevenue: number;
  weeklySalesCount: number;
  weeklySalesRevenue: number;
  monthlySalesCount: number;
  monthlySalesRevenue: number;
  totalTurnover: number;

  // 2. Daromad va foyda
  totalRevenue: number; // Jami tushum
  cogsTotal: number; // Mahsulotlarning tannarxi (Cost of goods sold)
  grossProfit: number; // Sof yalpi daromad (Tushum - Tannarx)
  deliveryExpensesTotal: number; // Yetkazib berish xarajatlari
  discountsTotal: number; // Chegirmalar summasi
  refundsTotal: number; // Qaytarilgan pullar
  pendingRevenue: number; // Kutilayotgan to‘lovlar
  netRealProfit: number; // Haqiqiy sof foyda (Sof yalpi - Yetkazib berish - Chegirmalar - Qaytarilgan)
  profitMarginPercent: number; // Foyda marjasi %

  // Dynamics charts
  dailySales: { date: string; label: string; revenue: number; profit: number; ordersCount: number }[];
  weeklySalesChart: { label: string; revenue: number; profit: number }[];
  monthlySalesChart: { label: string; revenue: number; profit: number }[];
  categorySalesDistribution: { categoryName: string; revenue: number; count: number; percentage: number }[];
  orderStatusBreakdown: { status: string; count: number; percentage: number }[];

  // Top products
  topSellingProducts: {
    productId: string;
    name: string;
    image: string;
    sku?: string;
    unitsSold: number;
    totalRevenue: number;
    totalProfit: number;
  }[];
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  adminUsername: string;
  adminRole: string;
  action: string;
  details: string;
  ipAddress?: string;
  previousValue?: any;
  newValue?: any;
}

export interface SupabaseConfig {
  connected: boolean;
  url?: string;
  hasServiceKey: boolean;
  tablesVerified: boolean;
  lastSyncAt?: string;
  mode: 'SUPABASE_POSTGRES' | 'LOCAL_PERSISTENT';
  error?: string;
}

