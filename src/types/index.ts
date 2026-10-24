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
}

export interface ProductVariant {
  size: string;
  color: string;
  stock: number;
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
  rating: number;
  reviewCount: number;
  isNew?: boolean;
  isTrending?: boolean;
  isFeatured?: boolean;
  details?: {
    material?: string;
    season?: string;
    fit?: string;
    origin?: string;
  };
  createdAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
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
  themeAccentColor: string;
  paymentSettings?: PaymentProviderSettings;
  telegramSettings?: TelegramSettings;
  cardSettings?: CardPaymentSettings;
}



