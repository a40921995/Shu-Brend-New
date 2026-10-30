import type {
  Banner,
  BillzSettings,
  BillzSyncLog,
  Branch,
  Category,
  InventoryActionType,
  InventoryLog,
  Order,
  OrderStatus,
  PaymentStatus,
  PaymentTransaction,
  Product,
  Review,
  SiteSettings,
  User,
  WarehouseStats,
} from '../types/index.ts';

export const api = {
  // Settings
  async getSettings(): Promise<SiteSettings> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Sozlamalarni yuklab bo‘lmadi');
    return res.json();
  },
  async updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Sozlamalarni saqlab bo‘lmadi');
    return res.json();
  },

  // Banners
  async getBanners(): Promise<Banner[]> {
    const res = await fetch('/api/banners');
    if (!res.ok) throw new Error('Bannerlarni yuklab bo‘lmadi');
    return res.json();
  },
  async createBanner(banner: Partial<Banner>): Promise<Banner> {
    const res = await fetch('/api/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(banner),
    });
    if (!res.ok) throw new Error('Bannerni saqlab bo‘lmadi');
    return res.json();
  },
  async updateBanner(id: string, banner: Partial<Banner>): Promise<Banner> {
    const res = await fetch(`/api/banners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(banner),
    });
    if (!res.ok) throw new Error('Bannerni yangilab bo‘lmadi');
    return res.json();
  },
  async deleteBanner(id: string): Promise<void> {
    const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Bannerni o‘chirib bo‘lmadi');
  },

  // Categories
  async getCategories(includeHidden = false): Promise<Category[]> {
    const res = await fetch(`/api/categories${includeHidden ? '?includeHidden=true' : ''}`);
    if (!res.ok) throw new Error('Kategoriyalarni yuklab bo‘lmadi');
    return res.json();
  },
  async createCategory(cat: Partial<Category>): Promise<Category> {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Kategoriyani saqlab bo‘lmadi');
    }
    return res.json();
  },
  async updateCategory(id: string, cat: Partial<Category>): Promise<Category> {
    const res = await fetch(`/api/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Kategoriyani yangilab bo‘lmadi');
    }
    return res.json();
  },
  async deleteCategory(id: string, force = false): Promise<void> {
    const res = await fetch(`/api/categories/${id}${force ? '?force=true' : ''}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const error: any = new Error(err.error || 'Kategoriyani o‘chirib bo‘lmadi');
      error.hasProducts = err.hasProducts;
      error.productCount = err.productCount;
      throw error;
    }
  },
  async moveCategoryProducts(id: string, targetCategorySlug: string): Promise<{ success: boolean; movedCount: number }> {
    const res = await fetch(`/api/categories/${id}/move-products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCategorySlug }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Mahsulotlarni ko‘chirib bo‘lmadi');
    }
    return res.json();
  },

  // Products
  async getProducts(params?: {
    category?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    size?: string;
    color?: string;
    sort?: string;
    includeHidden?: boolean;
  }): Promise<Product[]> {
    const url = new URL('/api/products', window.location.origin);
    if (params) {
      if (params.category) url.searchParams.set('category', params.category);
      if (params.search) url.searchParams.set('search', params.search);
      if (params.minPrice) url.searchParams.set('minPrice', String(params.minPrice));
      if (params.maxPrice) url.searchParams.set('maxPrice', String(params.maxPrice));
      if (params.size) url.searchParams.set('size', params.size);
      if (params.color) url.searchParams.set('color', params.color);
      if (params.sort) url.searchParams.set('sort', params.sort);
      if (params.includeHidden) url.searchParams.set('includeHidden', 'true');
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Mahsulotlarni yuklab bo‘lmadi');
    return res.json();
  },
  async getProduct(id: string): Promise<Product> {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) throw new Error('Mahsulot topilmadi');
    return res.json();
  },
  async createProduct(product: Partial<Product>): Promise<Product> {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error('Mahsulotni saqlab bo‘lmadi');
    return res.json();
  },
  async updateProduct(id: string, product: Partial<Product>): Promise<Product> {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(product),
    });
    if (!res.ok) throw new Error('Mahsulotni yangilab bo‘lmadi');
    return res.json();
  },
  async deleteProduct(id: string): Promise<void> {
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Mahsulotni o‘chirib bo‘lmadi');
  },

  // Upload
  async uploadBase64(base64Data: string, filename?: string): Promise<string> {
    const res = await fetch('/api/upload-base64', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: base64Data, filename }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Rasm yuklashda xatolik yuz berdi');
    }
    const data = await res.json();
    return data.url;
  },

  async uploadFile(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch {
      // Fallback to base64 below
    }

    // High reliability fallback: read file as base64 and send to upload-base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Str = reader.result as string;
          const url = await api.uploadBase64(base64Str, file.name);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Faylni o‘qishda xatolik yuz berdi'));
      reader.readAsDataURL(file);
    });
  },

  async uploadMultipleFiles(files: FileList | File[]): Promise<string[]> {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return [];

    // Attempt multipart batch first
    try {
      const formData = new FormData();
      for (const f of fileArray) {
        formData.append('files', f);
      }
      const res = await fetch('/api/upload-multiple', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.urls) && data.urls.length > 0) {
          return data.urls;
        }
      }
    } catch {
      // Fallback to uploading individually
    }

    // Fallback: upload individually with resilient uploadFile
    const uploadedUrls: string[] = [];
    for (const f of fileArray) {
      try {
        const url = await api.uploadFile(f);
        uploadedUrls.push(url);
      } catch (e) {
        console.warn('Single file upload fallback:', e);
      }
    }

    if (uploadedUrls.length === 0) {
      throw new Error('Rasmlarni yuklashda xatolik yuz berdi');
    }
    return uploadedUrls;
  },

  // Orders
  async getOrders(params?: { userId?: string; phone?: string; status?: string; search?: string }): Promise<Order[]> {
    const url = new URL('/api/orders', window.location.origin);
    if (params) {
      if (params.userId) url.searchParams.set('userId', params.userId);
      if (params.phone) url.searchParams.set('phone', params.phone);
      if (params.status) url.searchParams.set('status', params.status);
      if (params.search) url.searchParams.set('search', params.search);
    }
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Buyurtmalarni yuklab bo‘lmadi');
    return res.json();
  },
  async createOrder(orderData: any): Promise<Order> {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Buyurtma berishda xatolik yuz berdi');
    }
    return res.json();
  },
  async updateOrderStatus(
    orderId: string,
    status?: OrderStatus,
    comment?: string,
    paymentStatus?: PaymentStatus
  ): Promise<Order> {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, comment, paymentStatus }),
    });
    if (!res.ok) throw new Error('Buyurtma holatini o‘zgartirib bo‘lmadi');
    return res.json();
  },

  // Payment APIs
  async createClickInvoice(orderId: string): Promise<{ paymentUrl: string; orderId: string; orderNumber: string; amount: number; testMode: boolean }> {
    const res = await fetch('/api/payments/click/create-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Click to‘lov havolasini olishda xatolik yuz berdi');
    }
    return res.json();
  },

  async createPaymeInvoice(orderId: string): Promise<{ paymentUrl: string; orderId: string; orderNumber: string; amount: number; testMode: boolean }> {
    const res = await fetch('/api/payments/payme/create-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Payme to‘lov havolasini olishda xatolik yuz berdi');
    }
    return res.json();
  },

  async simulatePayment(
    orderId: string,
    provider: 'CLICK' | 'PAYME',
    action: 'PAY' | 'CANCEL' = 'PAY'
  ): Promise<{ success: boolean; order: Order; message: string }> {
    const res = await fetch('/api/payments/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, provider, action }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'To‘lov jarayonida xatolik yuz berdi');
    }
    return res.json();
  },

  async getPaymentTransactions(): Promise<any[]> {
    const res = await fetch('/api/payments/transactions');
    if (!res.ok) throw new Error('Tranzaksiyalar tarixini yuklab bo‘lmadi');
    return res.json();
  },

  // Telegram Bot Integration
  async getTelegramStatus(): Promise<{
    connected: boolean;
    status: 'CONNECTED' | 'DISCONNECTED' | 'CHECKING' | 'ERROR';
    hasToken: boolean;
    tokenMasked: string;
    chatId: string;
    enabled: boolean;
    bot?: { id: number; username: string; first_name: string };
    message?: string;
    error?: string;
  }> {
    const res = await fetch('/api/telegram/status');
    return res.json();
  },

  async connectTelegram(botToken: string, chatId: string): Promise<any> {
    const res = await fetch('/api/telegram/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken, chatId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Telegram botga ulanib bo‘lmadi');
    return data;
  },

  async disconnectTelegram(): Promise<any> {
    const res = await fetch('/api/telegram/disconnect', { method: 'POST' });
    return res.json();
  },

  async saveTelegramSettings(botToken?: string, chatId?: string, enabled?: boolean): Promise<any> {
    const res = await fetch('/api/telegram/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken, chatId, enabled }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Telegram sozlamalarini saqlab bo‘lmadi');
    return data;
  },

  async testTelegramSettings(botToken?: string, chatId?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/telegram/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken, chatId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Telegram test xabarini yuborib bo‘lmadi');
    }
    return data;
  },

  // Admin Security Management
  async getAdminSecurityInfo(): Promise<{ username: string; lastPasswordChange?: string }> {
    const res = await fetch('/api/admin/security');
    if (!res.ok) throw new Error('Xavfsizlik ma‘lumotlarini yuklab bo‘lmadi');
    return res.json();
  },

  async changeAdminLogin(currentPassword: string, newUsername: string): Promise<{ success: boolean; message: string; username: string }> {
    const res = await fetch('/api/admin/change-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newUsername }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Loginni o‘zgartirib bo‘lmadi');
    return data;
  },

  async changeAdminPassword(oldPassword: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message: string; requireReLogin: boolean }> {
    const res = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Parolni o‘zgartirib bo‘lmadi');
    return data;
  },



  // Admin Stats
  async getAdminStats(): Promise<any> {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) throw new Error('Statistikani yuklab bo‘lmadi');
    return res.json();
  },

  // Reviews
  async getReviews(productId?: string): Promise<Review[]> {
    const url = new URL('/api/reviews', window.location.origin);
    if (productId) url.searchParams.set('productId', productId);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Izohlarni yuklab bo‘lmadi');
    return res.json();
  },
  async addReview(review: Partial<Review>): Promise<Review> {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
    if (!res.ok) throw new Error('Izohni qoldirib bo‘lmadi');
    return res.json();
  },

  // Admin Auth
  async adminLogin(usernameOrPhone: string, password: string): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrPhone, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Admin login yoki parol noto‘g‘ri!');
    }
    return res.json();
  },

  // Auth
  async login(phone: string, password: string):Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login qilishda xatolik yuz berdi');
    }
    return res.json();
  },
  async register(data: any): Promise<{ user: User; token: string }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Ro‘yxatdan o‘tishda xatolik yuz berdi');
    }
    return res.json();
  },
  async updateProfile(user: Partial<User>): Promise<User> {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    if (!res.ok) throw new Error('Profilni saqlab bo‘lmadi');
    return res.json();
  },

  // --- OMBOR (WAREHOUSE) ---
  async getInventoryStats(): Promise<WarehouseStats> {
    const res = await fetch('/api/inventory/stats');
    if (!res.ok) throw new Error('Ombor statistikasini yuklab bo‘lmadi');
    return res.json();
  },
  async getInventoryLogs(limit = 100): Promise<InventoryLog[]> {
    const res = await fetch(`/api/inventory/logs?limit=${limit}`);
    if (!res.ok) throw new Error('Ombor harakatlari tarixini yuklab bo‘lmadi');
    return res.json();
  },
  async adjustInventoryStock(data: {
    productId: string;
    color: string;
    size: string;
    delta: number;
    type?: InventoryActionType;
    note?: string;
    price?: number;
    operator?: string;
  }): Promise<{ success: boolean; product: Product; log: InventoryLog }> {
    const res = await fetch('/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Ombor qoldig‘ini o‘zgartirib bo‘lmadi');
    }
    return res.json();
  },
  async setInventoryStock(data: {
    productId: string;
    color: string;
    size: string;
    stock: number;
    type?: InventoryActionType;
    note?: string;
    operator?: string;
  }): Promise<{ success: boolean; product: Product; log: InventoryLog }> {
    const res = await fetch('/api/inventory/set-stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Qoldiqni saqlab bo‘lmadi');
    }
    return res.json();
  },
  async addInventoryVariant(data: {
    productId: string;
    color: string;
    size: string;
    stock: number;
  }): Promise<{ success: boolean; product: Product }> {
    const res = await fetch('/api/inventory/add-variant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Variant qo‘shishda xatolik');
    }
    return res.json();
  },
  async cancelInventoryLog(logId: string): Promise<{ success: boolean; message: string; restoredProduct?: Product }> {
    const res = await fetch(`/api/inventory/cancel-log/${logId}`, {
      method: 'POST',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Harakatni bekor qilib bo‘lmadi');
    }
    return res.json();
  },

  // --- BILLZ INTEGRATION ---
  async getBillzSettings(): Promise<BillzSettings> {
    const res = await fetch('/api/billz/settings');
    if (!res.ok) throw new Error('BILLZ sozlamalarini yuklab bo‘lmadi');
    return res.json();
  },
  async updateBillzSettings(data: {
    apiUrl?: string;
    apiKey?: string;
    platformId?: string;
    autoSyncEnabled?: boolean;
    syncIntervalMinutes?: number;
    centralShopId?: string;
    syncImages?: boolean;
    syncPrices?: boolean;
    syncStock?: boolean;
  }): Promise<{ success: boolean; message: string; settings: BillzSettings }> {
    const res = await fetch('/api/billz/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'BILLZ sozlamalarini saqlab bo‘lmadi');
    }
    return res.json();
  },
  async testBillzConnection(data?: { apiUrl?: string; apiKey?: string; platformId?: string }): Promise<{
    success: boolean;
    status: string;
    message: string;
    statusCode?: number;
    productsFound?: number;
    error?: string;
  }> {
    const res = await fetch('/api/billz/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data || {}),
    });
    return res.json();
  },
  async syncBillzProducts(): Promise<{
    success: boolean;
    message: string;
    importedCount: number;
    updatedCount: number;
    skippedCount: number;
    totalCatalogCount: number;
    errors: string[];
    durationMs: number;
  }> {
    const res = await fetch('/api/billz/sync-products', { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Sinxronizatsiyada xatolik yuz berdi');
    }
    return res.json();
  },
  async getBillzLogs(limit = 100): Promise<BillzSyncLog[]> {
    const res = await fetch(`/api/billz/logs?limit=${limit}`);
    if (!res.ok) throw new Error('BILLZ jurnallarini yuklab bo‘lmadi');
    return res.json();
  },
  async syncOrderToBillz(orderId: string): Promise<{ success: boolean; billzSaleId?: string; message: string }> {
    const res = await fetch(`/api/billz/sync-order/${orderId}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Buyurtmani BILLZ ga uzatib bo‘lmadi');
    }
    return res.json();
  },

  // --- BRANCHES ---
  async getBranches(): Promise<Branch[]> {
    const res = await fetch('/api/branches');
    if (!res.ok) throw new Error('Filiallarni yuklab bo‘lmadi');
    return res.json();
  },
  async createBranch(branch: Partial<Branch>): Promise<Branch> {
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Filialni saqlab bo‘lmadi');
    }
    return res.json();
  },
  async updateBranch(id: string, branch: Partial<Branch>): Promise<Branch> {
    const res = await fetch(`/api/branches/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Filialni yangilab bo‘lmadi');
    }
    return res.json();
  },
  async deleteBranch(id: string): Promise<void> {
    const res = await fetch(`/api/branches/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Filialni o‘chirib bo‘lmadi');
    }
  },
};

// Currency formatter helper
export function formatUzbekPrice(amount: number | string | null | undefined): string {
  if (amount === undefined || amount === null || amount === '') return '0 so‘m';
  const num = typeof amount === 'number' ? amount : Number(String(amount).replace(/[^\d.-]/g, ''));
  if (isNaN(num)) return '0 so‘m';
  return new Intl.NumberFormat('uz-UZ').format(num) + ' so‘m';
}
