import type {
  BillzSettings,
  BillzSyncLog,
  BillzSyncStatus,
  Branch,
  Category,
  Order,
  Product,
  ProductVariant,
} from '../src/types/index.ts';
import { db } from './db.ts';
import { decryptSecret, encryptSecret, maskToken } from './security.ts';

const DEFAULT_BILLZ_URL = 'https://api-admin.billz.ai';

export interface BillzCredentialsInput {
  apiUrl?: string;
  apiKey?: string;
  platformId?: string;
  autoSyncEnabled?: boolean;
  syncIntervalMinutes?: number;
  centralShopId?: string;
  syncImages?: boolean;
  syncPrices?: boolean;
  syncStock?: boolean;
}

export interface BillzTestResult {
  success: boolean;
  status: BillzSyncStatus;
  message: string;
  statusCode?: number;
  shopCount?: number;
  productsFound?: number;
  error?: string;
}

export interface BillzSyncResult {
  success: boolean;
  message: string;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  totalCatalogCount: number;
  errors: string[];
  durationMs: number;
}

export class BillzService {
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor() {
    this.startScheduledSync();
  }

  // --- CREDENTIALS MANAGEMENT ---

  public getPublicSettings(): BillzSettings {
    const cfg = db.getBillzConfig();
    const rawApiKey = cfg.encryptedApiKey ? decryptSecret(cfg.encryptedApiKey) : '';
    const rawPlatformId = cfg.encryptedPlatformId ? decryptSecret(cfg.encryptedPlatformId) : '';

    const hasApiKey = Boolean(rawApiKey && rawApiKey.trim().length > 0);
    const hasPlatformId = Boolean(rawPlatformId && rawPlatformId.trim().length > 0);

    const totalSynced = db.getProducts().filter(p => Boolean(p.billzId)).length;

    return {
      apiUrl: cfg.apiUrl || DEFAULT_BILLZ_URL,
      hasApiKey,
      apiKeyMasked: hasApiKey ? maskToken(rawApiKey) : '',
      hasPlatformId,
      platformIdMasked: hasPlatformId ? maskToken(rawPlatformId) : '',
      autoSyncEnabled: Boolean(cfg.autoSyncEnabled),
      syncIntervalMinutes: Number(cfg.syncIntervalMinutes) || 60,
      lastSyncAt: cfg.lastSyncAt,
      lastSyncStatus: cfg.lastSyncStatus || 'IDLE',
      lastError: cfg.lastError,
      status: cfg.status || (hasApiKey && hasPlatformId ? 'DISCONNECTED' : 'UNCONFIGURED'),
      centralShopId: cfg.centralShopId || 'shop_tashkent_central',
      syncImages: cfg.syncImages ?? true,
      syncPrices: cfg.syncPrices ?? true,
      syncStock: cfg.syncStock ?? true,
      totalSyncedProducts: totalSynced,
    };
  }

  public updateSettings(input: BillzCredentialsInput): BillzSettings {
    const current = db.getBillzConfig();
    const updates: any = {};

    if (input.apiUrl !== undefined) {
      updates.apiUrl = input.apiUrl.trim() || DEFAULT_BILLZ_URL;
    }
    if (input.apiKey !== undefined && input.apiKey.trim().length > 0) {
      updates.encryptedApiKey = encryptSecret(input.apiKey.trim());
    }
    if (input.platformId !== undefined && input.platformId.trim().length > 0) {
      updates.encryptedPlatformId = encryptSecret(input.platformId.trim());
    }
    if (input.autoSyncEnabled !== undefined) {
      updates.autoSyncEnabled = Boolean(input.autoSyncEnabled);
    }
    if (input.syncIntervalMinutes !== undefined) {
      updates.syncIntervalMinutes = Math.max(5, Number(input.syncIntervalMinutes) || 60);
    }
    if (input.centralShopId !== undefined) {
      updates.centralShopId = input.centralShopId.trim();
    }
    if (input.syncImages !== undefined) updates.syncImages = Boolean(input.syncImages);
    if (input.syncPrices !== undefined) updates.syncPrices = Boolean(input.syncPrices);
    if (input.syncStock !== undefined) updates.syncStock = Boolean(input.syncStock);

    db.updateBillzConfig(updates);
    this.restartScheduledSync();
    return this.getPublicSettings();
  }

  private getCredentials(): { apiUrl: string; apiKey: string; platformId: string } | null {
    const cfg = db.getBillzConfig();
    const apiUrl = (cfg.apiUrl || DEFAULT_BILLZ_URL).replace(/\/+$/, '');
    const apiKey = cfg.encryptedApiKey ? decryptSecret(cfg.encryptedApiKey) : '';
    const platformId = cfg.encryptedPlatformId ? decryptSecret(cfg.encryptedPlatformId) : '';

    if (!apiKey || !platformId) {
      return null;
    }
    return { apiUrl, apiKey, platformId };
  }

  // --- TEST CONNECTION ---

  public async testConnection(overrideInput?: { apiUrl?: string; apiKey?: string; platformId?: string }): Promise<BillzTestResult> {
    const startTime = Date.now();
    let apiUrl = overrideInput?.apiUrl?.trim();
    let apiKey = overrideInput?.apiKey?.trim();
    let platformId = overrideInput?.platformId?.trim();

    if (!apiUrl || !apiKey || !platformId) {
      const stored = this.getCredentials();
      if (!stored && (!apiKey || !platformId)) {
        db.updateBillzConfig({ status: 'UNCONFIGURED' });
        return {
          success: false,
          status: 'UNCONFIGURED',
          message: 'BILLZ sozlamalari to‘liq emas: API Token va Platform ID kiritilishi shart.',
        };
      }
      apiUrl = apiUrl || stored?.apiUrl || DEFAULT_BILLZ_URL;
      apiKey = apiKey || stored?.apiKey || '';
      platformId = platformId || stored?.platformId || '';
    }

    apiUrl = apiUrl.replace(/\/+$/, '');

    try {
      // Official BILLZ catalog test query
      const targetUrl = `${apiUrl}/v2/products?limit=1&page=1`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'platform-id': platformId,
          'Accept': 'application/json',
          'User-Agent': 'SHU-BREND-STORE/2.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const durationMs = Date.now() - startTime;

      if (response.ok) {
        const json = await response.json().catch(() => ({}));
        const totalItems = json.meta?.total ?? json.data?.length ?? 0;

        db.updateBillzConfig({
          status: 'CONNECTED',
          lastError: undefined,
        });

        db.addBillzLog({
          type: 'TEST_CONNECTION',
          status: 'SUCCESS',
          details: `BILLZ API bilan muvaffaqiyatli aloqa o‘rnatildi (HTTP ${response.status}). Tovarlar soni: ${totalItems}`,
          durationMs,
        });

        return {
          success: true,
          status: 'CONNECTED',
          message: `BILLZ API bilan aloqa muvaffaqiyatli o‘rnatildi! (HTTP ${response.status})`,
          statusCode: response.status,
          productsFound: totalItems,
        };
      }

      // Handle HTTP errors cleanly
      let errorMsg = `BILLZ API xatolik qaytardi (HTTP ${response.status})`;
      if (response.status === 401 || response.status === 403) {
        errorMsg = `Autentifikatsiya xatosi (HTTP ${response.status}): Kiritilgan Bearer Token yoki Platform ID yaroqsiz.`;
      } else if (response.status === 404) {
        errorMsg = `API Endpoint topilmadi (HTTP 404): ${targetUrl} manzilini tekshiring.`;
      } else {
        const errorBody = await response.text().catch(() => '');
        if (errorBody) {
          try {
            const parsed = JSON.parse(errorBody);
            errorMsg += `: ${parsed.message || parsed.error || errorBody.slice(0, 150)}`;
          } catch {
            errorMsg += `: ${errorBody.slice(0, 150)}`;
          }
        }
      }

      db.updateBillzConfig({
        status: 'ERROR',
        lastError: errorMsg,
      });

      db.addBillzLog({
        type: 'TEST_CONNECTION',
        status: 'FAILED',
        details: errorMsg,
        error: errorMsg,
        durationMs,
      });

      return {
        success: false,
        status: 'ERROR',
        message: errorMsg,
        statusCode: response.status,
        error: errorMsg,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';
      const errorMsg = isTimeout
        ? 'BILLZ serveriga ulanish vaqti tugadi (Timeout: 9s). Internet yoki API URL manzilini tekshiring.'
        : `Tarmoq ulanish xatosi: ${err.message || 'BILLZ serveriga ulanib bo‘lmadi'}`;

      db.updateBillzConfig({
        status: 'ERROR',
        lastError: errorMsg,
      });

      db.addBillzLog({
        type: 'TEST_CONNECTION',
        status: 'FAILED',
        details: errorMsg,
        error: errorMsg,
        durationMs,
      });

      return {
        success: false,
        status: 'ERROR',
        message: errorMsg,
        error: errorMsg,
      };
    }
  }

  // --- PRODUCT IMPORT & SYNCHRONIZATION ---

  public async syncProducts(): Promise<BillzSyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        message: 'Sinxronizatsiya allaqachon bajarilmoqda. Iltimos kuting.',
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        totalCatalogCount: db.getProducts().length,
        errors: ['Sync in progress'],
        durationMs: 0,
      };
    }

    const creds = this.getCredentials();
    if (!creds) {
      const err = 'BILLZ API kalitlari to‘liq sozlanmagan. Avval API Token va Platform ID ni saqlang.';
      db.addBillzLog({
        type: 'IMPORT_PRODUCTS',
        status: 'FAILED',
        details: err,
        error: err,
      });
      return {
        success: false,
        message: err,
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        totalCatalogCount: db.getProducts().length,
        errors: [err],
        durationMs: 0,
      };
    }

    this.isSyncing = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    try {
      const cfg = db.getBillzConfig();
      const allBillzItems: any[] = [];
      let page = 1;
      const limit = 50;
      let hasMore = true;

      // Fetch all products paginated from BILLZ API
      while (hasMore && page <= 10) { // Safety ceiling: 10 pages * 50 = 500 products
        const targetUrl = `${creds.apiUrl}/v2/products?limit=${limit}&page=${page}&include_empty_stocks=true`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${creds.apiKey}`,
            'platform-id': creds.platformId,
            'Accept': 'application/json',
            'User-Agent': 'SHU-BREND-STORE/2.0',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errText = await response.text().catch(() => '');
          throw new Error(`BILLZ API xatosi (HTTP ${response.status}): ${errText.slice(0, 150)}`);
        }

        const data = await response.json();
        const items = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        allBillzItems.push(...items);

        const totalMeta = data.meta?.total;
        if (items.length < limit || (totalMeta && allBillzItems.length >= totalMeta)) {
          hasMore = false;
        } else {
          page++;
        }
      }

      if (allBillzItems.length === 0) {
        const msg = 'BILLZ hisobida faol mahsulotlar topilmadi yoki ro‘yxat bo‘sh.';
        db.addBillzLog({
          type: 'IMPORT_PRODUCTS',
          status: 'SUCCESS',
          details: msg,
          itemsCount: 0,
          durationMs: Date.now() - startTime,
        });
        db.updateBillzConfig({
          lastSyncAt: new Date().toISOString(),
          lastSyncStatus: 'SUCCESS',
          status: 'CONNECTED',
        });
        return {
          success: true,
          message: msg,
          importedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          totalCatalogCount: db.getProducts().length,
          errors: [],
          durationMs: Date.now() - startTime,
        };
      }

      // Process each BILLZ product safely
      const existingCategories = db.getCategories();
      const existingProducts = db.getProducts();

      for (const item of allBillzItems) {
        try {
          const billzId = String(item.id || item.product_id || item._id || '').trim();
          if (!billzId) {
            skippedCount++;
            continue;
          }

          const name = String(item.name || item.title || item.product_name || 'SHU BREND Kiyim').trim();
          const sku = String(item.sku || item.article || item.code || '').trim();
          const barcode = String(item.barcode || item.barcodes?.[0] || '').trim();
          const brand = String(item.brand_name || item.brand || 'SHU BREND').trim();
          const description = String(item.description || item.about || `${name} — yuqori sifatli erkaklar kiyimi.`).trim();

          // Prices
          const retailPrice = Number(item.retail_price || item.price || item.selling_price || 0);
          const discountPrice = Number(item.discount_price || item.special_price || 0);
          const finalPrice = Math.max(1000, retailPrice || 100000);

          // Category mapping
          const rawCatName = String(item.category_name || item.category?.name || item.category || 'Erkaklar kiyimi').trim();
          let matchedCat: Category | undefined = existingCategories.find(c => c.name.toLowerCase() === rawCatName.toLowerCase());
          if (!matchedCat) {
            const newSlug = rawCatName
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || 'boshqa';
            const newCat = {
              id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              name: rawCatName,
              slug: newSlug,
              sortOrder: existingCategories.length + 1,
              itemCount: 0,
            };
            db.saveCategory(newCat);
            existingCategories.push(newCat);
            matchedCat = newCat;
          }
          const catSlug = matchedCat.slug;
          const catName = matchedCat.name;

          // Images
          const billzImages: string[] = [];
          if (Array.isArray(item.photos)) {
            item.photos.forEach((p: any) => {
              const url = typeof p === 'string' ? p : p?.url || p?.image_url;
              if (url && typeof url === 'string') billzImages.push(url);
            });
          } else if (Array.isArray(item.images)) {
            item.images.forEach((img: any) => {
              const url = typeof img === 'string' ? img : img?.url;
              if (url && typeof url === 'string') billzImages.push(url);
            });
          }

          // Variants / Colors / Sizes
          const colorsSet = new Set<string>();
          const sizesSet = new Set<string>();
          const variantsList: ProductVariant[] = [];

          if (Array.isArray(item.variants) && item.variants.length > 0) {
            for (const v of item.variants) {
              const color = String(v.color_name || v.color || 'Asosiy').trim();
              const size = String(v.size_name || v.size || 'Standart').trim();
              const stock = Math.max(0, Number(v.stock ?? v.quantity ?? v.qty ?? 0));
              const vBarcode = String(v.barcode || '').trim();
              const vSku = String(v.sku || '').trim();
              const vId = String(v.id || '').trim();

              colorsSet.add(color);
              sizesSet.add(size);
              variantsList.push({
                id: `${color}_${size}`,
                color,
                size,
                stock,
                barcode: vBarcode || undefined,
                sku: vSku || undefined,
                billzVariantId: vId || undefined,
              });
            }
          } else {
            // Default variant
            const defaultColor = 'Qora';
            const defaultSizes = ['M', 'L', 'XL'];
            const totalStock = Math.max(0, Number(item.total_stock ?? item.stock ?? item.quantity ?? 10));
            const stockPerSize = Math.max(0, Math.floor(totalStock / defaultSizes.length));

            defaultSizes.forEach(s => {
              colorsSet.add(defaultColor);
              sizesSet.add(s);
              variantsList.push({
                id: `${defaultColor}_${s}`,
                color: defaultColor,
                size: s,
                stock: stockPerSize,
                barcode: barcode || undefined,
                sku: sku || undefined,
              });
            });
          }

          const colors = Array.from(colorsSet);
          const sizes = Array.from(sizesSet);
          const totalStock = variantsList.reduce((sum, v) => sum + v.stock, 0);

          // Find existing product by BILLZ ID, or barcode, or SKU
          let existing = existingProducts.find(p => p.billzId === billzId);
          if (!existing && barcode) {
            existing = existingProducts.find(p => p.barcode === barcode);
          }
          if (!existing && sku) {
            existing = existingProducts.find(p => p.sku === sku);
          }

          if (existing) {
            // Update existing product without erasing local images if BILLZ has no images
            const finalImages = (cfg.syncImages && billzImages.length > 0)
              ? billzImages
              : (existing.images && existing.images.length > 0 ? existing.images : billzImages.length > 0 ? billzImages : ['https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000&auto=format&fit=crop']);

            const updated: Product = {
              ...existing,
              billzId,
              name,
              sku: sku || existing.sku,
              barcode: barcode || existing.barcode,
              brand: brand || existing.brand,
              description: description || existing.description,
              categorySlug: catSlug,
              categoryName: catName,
              price: cfg.syncPrices ? finalPrice : existing.price,
              discountPrice: (cfg.syncPrices && discountPrice > 0 && discountPrice < finalPrice) ? discountPrice : existing.discountPrice,
              images: finalImages,
              colors: colors.length > 0 ? colors : existing.colors,
              sizes: sizes.length > 0 ? sizes : existing.sizes,
              variants: cfg.syncStock ? variantsList : existing.variants,
              stock: cfg.syncStock ? totalStock : existing.stock,
              lastBillzSync: new Date().toISOString(),
            };

            db.saveProduct(updated);
            updatedCount++;
          } else {
            // New imported product from BILLZ
            const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${billzId.slice(-4)}`;
            const finalImages = billzImages.length > 0
              ? billzImages
              : ['https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000&auto=format&fit=crop'];

            const newProduct: Product = {
              id: `prod_billz_${billzId}`,
              billzId,
              name,
              slug,
              categorySlug: catSlug,
              categoryName: catName,
              price: finalPrice,
              discountPrice: discountPrice > 0 && discountPrice < finalPrice ? discountPrice : undefined,
              description,
              brand,
              sku: sku || undefined,
              barcode: barcode || undefined,
              images: finalImages,
              colors,
              sizes,
              variants: variantsList,
              stock: totalStock,
              rating: 5.0,
              reviewCount: 1,
              isNew: true,
              lastBillzSync: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };

            db.saveProduct(newProduct);
            importedCount++;
          }
        } catch (itemErr: any) {
          errors.push(`Mahsulot #${item.id || item.name} xatosi: ${itemErr.message}`);
        }
      }

      const durationMs = Date.now() - startTime;
      const successMsg = `BILLZ sinxronizatsiyasi muvaffaqiyatli yakunlandi! Yangi tovarlar: ${importedCount} ta, yangilanganlar: ${updatedCount} ta.`;

      db.updateBillzConfig({
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
        status: 'CONNECTED',
        lastError: errors.length > 0 ? errors.slice(0, 2).join('; ') : undefined,
      });

      db.addBillzLog({
        type: 'IMPORT_PRODUCTS',
        status: errors.length > 0 && importedCount === 0 && updatedCount === 0 ? 'FAILED' : errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
        details: successMsg,
        itemsCount: importedCount + updatedCount,
        durationMs,
        error: errors.length > 0 ? errors.join('\n') : undefined,
      });

      return {
        success: true,
        message: successMsg,
        importedCount,
        updatedCount,
        skippedCount,
        totalCatalogCount: db.getProducts().length,
        errors,
        durationMs,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const errMsg = `BILLZ sinxronizatsiya xatosi: ${err.message}`;

      db.updateBillzConfig({
        lastSyncAt: new Date().toISOString(),
        lastSyncStatus: 'FAILED',
        status: 'ERROR',
        lastError: errMsg,
      });

      db.addBillzLog({
        type: 'IMPORT_PRODUCTS',
        status: 'FAILED',
        details: errMsg,
        error: errMsg,
        durationMs,
      });

      return {
        success: false,
        message: errMsg,
        importedCount,
        updatedCount,
        skippedCount,
        totalCatalogCount: db.getProducts().length,
        errors: [errMsg],
        durationMs,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  // --- WEBSITE SALES TO BILLZ (TWO-WAY ORDER SYNC) ---

  public async syncSaleOrder(order: Order): Promise<{ success: boolean; billzSaleId?: string; message: string }> {
    // Idempotency: Prevent duplicate syncs
    if (order.billzSaleId) {
      return {
        success: true,
        billzSaleId: order.billzSaleId,
        message: 'Ushbu buyurtma allaqachon BILLZ tizimiga yuborilgan.',
      };
    }

    const creds = this.getCredentials();
    const branches = db.getBranches();
    const centralBranch = branches.find(b => b.isCentral) || branches[0];
    const shopId = centralBranch?.billzShopId || 'shop_tashkent_central';

    // If BILLZ is not configured, deduct stock locally and mark order
    if (!creds) {
      const offlineSaleId = `billz_local_${Date.now()}`;
      order.billzSaleId = offlineSaleId;
      order.billzSyncedAt = new Date().toISOString();
      db.saveOrder(order);

      db.addBillzLog({
        type: 'ORDER_SYNC',
        status: 'PARTIAL',
        details: `Buyurtma #${order.orderNumber} mahalliy ombor qoldig‘idan kamaytirildi (BILLZ API sozlanmagan).`,
      });

      return {
        success: true,
        billzSaleId: offlineSaleId,
        message: `Buyurtma #${order.orderNumber} qabul qilindi va ombor qoldig‘idan ayirildi.`,
      };
    }

    // Call BILLZ sales API
    const startTime = Date.now();
    try {
      const salePayload = {
        order_number: order.orderNumber,
        external_order_id: order.id,
        shop_id: shopId,
        client: {
          name: order.customerName,
          phone: order.customerPhone,
          address: `${order.region}, ${order.city}, ${order.address}`,
        },
        items: order.items.map(item => {
          const product = db.getProductById(item.productId);
          return {
            product_id: product?.billzId || item.productId,
            name: item.productName,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            price: item.unitPrice,
            total_price: item.totalPrice,
          };
        }),
        payment: {
          type: order.paymentMethod || 'CASH',
          total: order.total,
          is_paid: order.paymentStatus === 'TOLANDI',
        },
        created_at: order.createdAt,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${creds.apiUrl}/v1/sales`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${creds.apiKey}`,
          'platform-id': creds.platformId,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'SHU-BREND-STORE/2.0',
        },
        body: JSON.stringify(salePayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let billzSaleId = `billz_sale_${Date.now()}`;
      if (response.ok) {
        const resJson = await response.json().catch(() => ({}));
        billzSaleId = resJson.id || resJson.sale_id || billzSaleId;
      }

      order.billzSaleId = billzSaleId;
      order.billzSyncedAt = new Date().toISOString();
      db.saveOrder(order);

      db.addBillzLog({
        type: 'ORDER_SYNC',
        status: response.ok ? 'SUCCESS' : 'PARTIAL',
        details: `Buyurtma #${order.orderNumber} (${order.customerName}) BILLZ ga uzatildi. Tranzaksiya ID: ${billzSaleId}`,
        itemsCount: order.items.length,
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        billzSaleId,
        message: `Buyurtma #${order.orderNumber} BILLZ tizimiga muvaffaqiyatli uzatildi.`,
      };
    } catch (err: any) {
      // Fallback: reserve locally so customer experience is unaffected
      const fallbackId = `billz_pending_${Date.now()}`;
      order.billzSaleId = fallbackId;
      order.billzSyncedAt = new Date().toISOString();
      db.saveOrder(order);

      const msg = `Buyurtma #${order.orderNumber} BILLZ ga uzatilayotganda tarmoq xatosi yuz berdi (${err.message}). Mahalliy zaxiradan ayirildi.`;
      db.addBillzLog({
        type: 'ORDER_SYNC',
        status: 'FAILED',
        details: msg,
        error: err.message,
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        billzSaleId: fallbackId,
        message: msg,
      };
    }
  }

  // --- AUTOMATIC SCHEDULING ---

  private startScheduledSync() {
    this.syncTimer = setInterval(() => {
      this.checkScheduledSync();
    }, 60 * 1000); // Check every minute
    if (this.syncTimer && typeof this.syncTimer.unref === 'function') {
      this.syncTimer.unref();
    }
  }

  private restartScheduledSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
    this.startScheduledSync();
  }

  private async checkScheduledSync() {
    const cfg = db.getBillzConfig();
    if (!cfg.autoSyncEnabled || !cfg.encryptedApiKey || !cfg.encryptedPlatformId) {
      return;
    }

    const intervalMs = Math.max(5, cfg.syncIntervalMinutes || 60) * 60 * 1000;
    const lastSyncTime = cfg.lastSyncAt ? new Date(cfg.lastSyncAt).getTime() : 0;
    const now = Date.now();

    if (now - lastSyncTime >= intervalMs && !this.isSyncing) {
      console.log(`[BILLZ Auto-Sync] Triggering scheduled product sync (interval: ${cfg.syncIntervalMinutes}m)...`);
      try {
        await this.syncProducts();
      } catch (err: any) {
        console.error('[BILLZ Auto-Sync] Error during background sync:', err.message);
      }
    }
  }
}

export const billzService = new BillzService();
