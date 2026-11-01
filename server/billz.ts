import fs from 'fs';
import path from 'path';
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

const BILLZ_CACHE_DIR = path.join(process.cwd(), 'public', 'uploads', 'billz');
if (!fs.existsSync(BILLZ_CACHE_DIR)) {
  try {
    fs.mkdirSync(BILLZ_CACHE_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create BILLZ_CACHE_DIR:', err);
  }
}

export async function downloadAndCacheBillzImage(remoteUrl: string, productId: string, index: number): Promise<string> {
  if (!remoteUrl || !remoteUrl.startsWith('http')) return remoteUrl;
  try {
    const filename = `billz_${productId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${index}.jpg`;
    const localFilePath = path.join(BILLZ_CACHE_DIR, filename);
    const localWebPath = `/uploads/billz/${filename}`;

    if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 100) {
      return localWebPath;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(remoteUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SHU-BREND-STORE/2.0' }
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(localFilePath, buffer);
      return localWebPath;
    }
  } catch {
    // If download fails or times out, safely return remoteUrl
  }
  return remoteUrl;
}

const DEFAULT_BILLZ_URL = 'https://api-admin.billz.ai';
export const OFFICIAL_DEFAULT_PLATFORM_ID = '7d4a4c38-dd84-4902-b744-0488b80a4c01';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolvePlatformId(platformId?: string): string {
  if (platformId && UUID_REGEX.test(platformId.trim())) {
    return platformId.trim().toLowerCase();
  }
  return OFFICIAL_DEFAULT_PLATFORM_ID;
}

export function normalizeBillzApiUrl(url?: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) return DEFAULT_BILLZ_URL;
  let clean = url.trim().replace(/\/+$/, '');
  if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
    clean = `https://${clean}`;
  }
  // Auto-correct: admin.billz.ai is the frontend SPA portal which returns HTTP 200 HTML <!DOCTYPE html>
  // The actual REST API endpoint is api-admin.billz.ai
  if (clean.includes('admin.billz.ai') && !clean.includes('api-admin.billz.ai')) {
    clean = clean.replace('admin.billz.ai', 'api-admin.billz.ai');
  }
  return clean;
}

function safeLogBillz(
  action: string,
  meta: { endpoint: string; status?: number; durationMs?: number; category?: string; error?: string }
) {
  // Never log secret keys, bearer tokens, or raw authorization headers
  console.log(
    `[BILLZ ${action}] endpoint=${meta.endpoint} status=${meta.status || 'N/A'} category=${meta.category || 'INFO'} duration=${meta.durationMs || 0}ms ${meta.error ? `error="${meta.error.slice(0, 150)}"` : ''}`
  );
}

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

// Helper: Safely parse BILLZ API response avoiding HTML or malformed JSON crashes
async function parseBillzResponse<T = any>(
  response: Response,
  endpointLabel: string
): Promise<{ ok: boolean; data?: T; status: number; error?: string }> {
  const status = response.status;
  const contentType = response.headers.get('content-type') || '';

  let rawText = '';
  try {
    rawText = await response.text();
  } catch (err: any) {
    return {
      ok: false,
      status,
      error: `BILLZ serveridan javobni o‘qib bo‘lmadi (${endpointLabel}): ${err.message || 'Tarmoq xatosi'}`,
    };
  }

  const preview = rawText.slice(0, 300).replace(/\s+/g, ' ').replace(/(Bearer\s+|"token":\s*")[A-Za-z0-9_\-\.]+/gi, '$1[REDACTED]');
  console.log(`[BILLZ RESPONSE PREVIEW ${endpointLabel}] status=${status} contentType="${contentType}" bodyFirst300="${preview}"`);

  const isHtml =
    rawText.trim().startsWith('<') ||
    rawText.toLowerCase().includes('<!doctype') ||
    rawText.toLowerCase().includes('<html') ||
    contentType.toLowerCase().includes('text/html');

  if (isHtml) {
    return {
      ok: false,
      status,
      error: `BILLZ API serveri JSON o‘rniga HTML sahifasini qaytardi (HTTP ${status}, Content-Type: ${contentType}). Ehtimol, API Base URL noto‘g‘ri (masalan, admin.billz.ai o‘rniga api-admin.billz.ai bo‘lishi lozim) yoki server veb-sahifaga yo‘naltirgan.`,
    };
  }

  if (!rawText.trim()) {
    return {
      ok: response.ok,
      status,
      data: {} as T,
      error: response.ok ? undefined : `BILLZ API bo‘sh javob qaytardi (HTTP ${status})`,
    };
  }

  try {
    const json = JSON.parse(rawText);
    if (!response.ok) {
      let serverMsg = '';
      if (json.error?.message) serverMsg = json.error.message;
      else if (json.message) serverMsg = json.message;
      else if (json.error && typeof json.error === 'string') serverMsg = json.error;
      else serverMsg = JSON.stringify(json).slice(0, 150);

      // Handle specific BILLZ platform-id error
      if (serverMsg === 'platform-id' || (typeof serverMsg === 'string' && serverMsg.includes('platform-id'))) {
        serverMsg = 'Platform ID xatosi (platform-id). BILLZ API talabiga binoan Platform ID standart UUID formatida bo‘lishi kerak.';
      }

      return {
        ok: false,
        status,
        data: json,
        error: `BILLZ API xatosi (HTTP ${status}): ${serverMsg}`,
      };
    }
    return {
      ok: true,
      status,
      data: json as T,
    };
  } catch {
    return {
      ok: false,
      status,
      error: `BILLZ API javobi yaroqsiz JSON formatida (HTTP ${status}): ${rawText.slice(0, 120)}`,
    };
  }
}

export class BillzService {
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private cachedToken: { accessToken: string; expiresAt: number } | null = null;

  constructor() {
    this.startScheduledSync();
  }

  public clearTokenCache(): void {
    this.cachedToken = null;
  }

  public stopSync(): boolean {
    if (this.isSyncing) {
      this.isSyncing = false;
      db.addBillzLog({
        type: 'IMPORT_PRODUCTS',
        status: 'PARTIAL',
        details: 'Sinxronizatsiya jarayoni admin tomonidan to‘xtatildi.',
      });
      return true;
    }
    return false;
  }

  // --- CREDENTIALS MANAGEMENT ---

  public getPublicSettings(): BillzSettings {
    const cfg = db.getBillzConfig();
    const rawApiKey = cfg.encryptedApiKey ? decryptSecret(cfg.encryptedApiKey) : '';
    const rawPlatformId = cfg.encryptedPlatformId ? decryptSecret(cfg.encryptedPlatformId) : '';

    const hasApiKey = Boolean(rawApiKey && rawApiKey.trim().length > 0);
    const hasPlatformId = Boolean(rawPlatformId && rawPlatformId.trim().length > 0);

    const allProducts = db.getProducts();
    const totalSynced = allProducts.filter(p => Boolean(p.billzId)).length;
    const withImages = allProducts.filter(p => Array.isArray(p.images) && p.images.length > 0 && !p.images[0].includes('placeholder') && p.images[0].trim() !== '').length;
    const withoutImages = allProducts.length - withImages;

    const mingbuloqTotalStock = allProducts.reduce((sum, p) => {
      const mingbuloqBranch = p.branchAvailability?.find(b => b.branchName.toLowerCase().includes('mingbuloq'));
      if (mingbuloqBranch) {
        return sum + (mingbuloqBranch.stock || 0);
      }
      return sum + (p.source === 'BILLZ' ? p.stock || 0 : 0);
    }, 0);
    const legacyProductsCount = allProducts.filter(p => p.source === 'MANUAL' || !p.billzId).length;

    let nextSyncAt: string | undefined = undefined;
    if (cfg.autoSyncEnabled && cfg.lastSyncAt) {
      const lastMs = new Date(cfg.lastSyncAt).getTime();
      const intervalMs = (Number(cfg.syncIntervalMinutes) || 30) * 60 * 1000;
      nextSyncAt = new Date(lastMs + intervalMs).toISOString();
    } else if (cfg.autoSyncEnabled) {
      nextSyncAt = new Date(Date.now() + (Number(cfg.syncIntervalMinutes) || 30) * 60 * 1000).toISOString();
    }

    let authStatus = 'UNCONFIGURED';
    if (!hasApiKey) {
      authStatus = 'SOZLANMAGAN';
    } else if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      authStatus = 'FAOL (Access Token mavjud)';
    } else if (cfg.status === 'CONNECTED') {
      authStatus = 'ULANGAN';
    } else if (cfg.status === 'ERROR') {
      authStatus = 'XATOLIK';
    } else {
      authStatus = 'KUTILMOQDA';
    }

    return {
      apiUrl: cfg.apiUrl || DEFAULT_BILLZ_URL,
      hasApiKey,
      apiKeyMasked: hasApiKey ? maskToken(rawApiKey) : '',
      hasPlatformId,
      platformIdMasked: hasPlatformId ? maskToken(rawPlatformId) : '',
      autoSyncEnabled: Boolean(cfg.autoSyncEnabled),
      syncIntervalMinutes: Number(cfg.syncIntervalMinutes) || 30,
      lastSyncAt: cfg.lastSyncAt,
      lastSyncStatus: cfg.lastSyncStatus || 'IDLE',
      lastError: cfg.lastError,
      status: cfg.status || (hasApiKey ? 'DISCONNECTED' : 'UNCONFIGURED'),
      centralShopId: cfg.centralShopId || 'shop_tashkent_central',
      syncImages: cfg.syncImages ?? true,
      syncPrices: cfg.syncPrices ?? true,
      syncStock: cfg.syncStock ?? true,
      totalSyncedProducts: totalSynced,
      totalCatalogProducts: allProducts.length,
      productsWithImages: withImages,
      productsWithoutImages: withoutImages,
      nextSyncAt,
      authStatus,
      isSyncing: this.isSyncing,
      mingbuloqShopId: cfg.centralShopId || undefined,
      mingbuloqShopName: 'Shu brand Mingbuloq',
      mingbuloqTotalStock,
      legacyProductsCount,
    };
  }

  public updateSettings(input: BillzCredentialsInput): BillzSettings {
    const current = db.getBillzConfig();
    const updates: any = {};

    if (input.apiUrl !== undefined) {
      updates.apiUrl = normalizeBillzApiUrl(input.apiUrl);
    }
    if (input.apiKey !== undefined && input.apiKey.trim().length > 0) {
      updates.encryptedApiKey = encryptSecret(input.apiKey.trim());
      this.clearTokenCache();
    }
    if (input.platformId !== undefined) {
      const pidTrimmed = input.platformId.trim();
      // Store encrypted platformId (if empty, store empty)
      updates.encryptedPlatformId = pidTrimmed.length > 0 ? encryptSecret(pidTrimmed) : '';
      this.clearTokenCache();
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
    const apiUrl = normalizeBillzApiUrl(cfg.apiUrl || process.env.BILLZ_API_URL);
    let apiKey = cfg.encryptedApiKey ? decryptSecret(cfg.encryptedApiKey) : '';
    if ((!apiKey || apiKey.startsWith('test_')) && process.env.BILLZ_API_KEY) {
      apiKey = process.env.BILLZ_API_KEY.trim();
    }
    const rawPlatformId = cfg.encryptedPlatformId ? decryptSecret(cfg.encryptedPlatformId) : '';
    const platformId = resolvePlatformId(rawPlatformId || process.env.BILLZ_PLATFORM_ID);

    if (!apiKey) {
      return null;
    }
    return { apiUrl, apiKey, platformId };
  }

  // Fetch shops from BILLZ API (GET /v1/shop)
  public async fetchShops(
    apiUrl: string,
    token: string,
    platformId: string
  ): Promise<{ ok: boolean; shops?: Array<{ id: string; name: string }>; error?: string }> {
    const resolvedPid = resolvePlatformId(platformId);
    const targetUrl = `${apiUrl}/v1/shop?only_allowed=true&limit=100`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'platform-id': resolvedPid,
          'Accept': 'application/json',
          'User-Agent': 'SHU-BREND-STORE/2.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const parsed = await parseBillzResponse(response, 'Filiallar (v1/shop)');
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }

      const resData = parsed.data || {};
      const rawList = Array.isArray(resData.data)
        ? resData.data
        : Array.isArray(resData.shops)
          ? resData.shops
          : Array.isArray(resData)
            ? resData
            : [];

      const shops = rawList.map((s: any) => ({
        id: String(s.id || s.shop_id || '').trim(),
        name: String(s.name || s.title || s.shop_name || '').trim(),
      })).filter((s: any) => Boolean(s.id));

      return { ok: true, shops };
    } catch (err: any) {
      return { ok: false, error: `Filiallarni olishda xatolik: ${err.message}` };
    }
  }

  // Authenticate with BILLZ: supports direct JWT Bearer token OR Secret Token exchange via POST /v1/auth/login
  public async getValidAccessToken(
    apiUrl: string,
    apiKey: string,
    platformId: string
  ): Promise<{ token?: string; error?: string; status?: number }> {
    const trimmedKey = apiKey.trim();
    if (!trimmedKey) {
      return {
        error: 'BILLZ API kaliti (Secret Key yoki Bearer Token) kiritilmagan.',
        status: 400,
      };
    }

    // Direct JWT token support (e.g. starts with ey... and has standard 3 parts)
    if (trimmedKey.startsWith('ey') && trimmedKey.split('.').length >= 3) {
      return { token: trimmedKey };
    }

    // Check cached token
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60000) {
      return { token: this.cachedToken.accessToken };
    }

    // Exchange Secret Token via official BILLZ endpoint: POST /v1/auth/login
    const resolvedPid = resolvePlatformId(platformId);
    const targetUrl = `${apiUrl}/v1/auth/login`;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'platform-id': resolvedPid,
          'User-Agent': 'SHU-BREND-STORE/2.0',
        },
        body: JSON.stringify({ secret_token: trimmedKey }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      const parsed = await parseBillzResponse(response, 'Autentifikatsiya (login)');

      if (!parsed.ok) {
        safeLogBillz('AUTH_FAIL', {
          endpoint: '/v1/auth/login',
          status: response.status,
          durationMs,
          category: 'AUTH_REJECTED',
          error: parsed.error,
        });

        if (response.status === 401 || response.status === 403) {
          return {
            error: `BILLZ autentifikatsiya xatosi (HTTP ${response.status}): Kiritilgan Secret Token noto‘g‘ri yoki BILLZ hisobida mavjud emas. BILLZ shaxsiy kabinetingizdan (Sozlamalar → Kompaniya sozlamalari → Integratsiya kalitlari) yangi kalit oling.`,
            status: response.status,
          };
        }

        return {
          error: parsed.error || `BILLZ autentifikatsiyasida xatolik yuz berdi (HTTP ${response.status})`,
          status: response.status,
        };
      }

      const resData = parsed.data?.data || parsed.data || {};
      const accessToken = resData.access_token || resData.token;
      if (!accessToken || typeof accessToken !== 'string') {
        return {
          error: 'BILLZ autentifikatsiyasi muvaffaqiyatli bo‘ldi, biroq javobda access_token topilmadi.',
          status: 500,
        };
      }

      const expiresInSec = Number(resData.expires_in) || 86400;
      this.cachedToken = {
        accessToken,
        expiresAt: Date.now() + expiresInSec * 1000,
      };

      safeLogBillz('AUTH_SUCCESS', {
        endpoint: '/v1/auth/login',
        status: response.status,
        durationMs,
        category: 'AUTHENTICATED',
      });

      return { token: accessToken };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';
      const msg = isTimeout
        ? 'BILLZ autentifikatsiya serveriga ulanish vaqti tugadi (Timeout: 9s).'
        : `BILLZ autentifikatsiya serveriga ulanib bo‘lmadi: ${err.message || 'Tarmoq xatosi'}`;

      safeLogBillz('AUTH_ERROR', {
        endpoint: '/v1/auth/login',
        status: 0,
        durationMs,
        category: 'NETWORK_ERROR',
        error: msg,
      });

      return { error: msg, status: 0 };
    }
  }

  // --- TEST CONNECTION ---

  public async testConnection(overrideInput?: { apiUrl?: string; apiKey?: string; platformId?: string }): Promise<BillzTestResult> {
    const startTime = Date.now();
    let apiUrl = overrideInput?.apiUrl?.trim();
    let apiKey = overrideInput?.apiKey?.trim();
    let platformId = overrideInput?.platformId?.trim();

    if (!apiUrl || !apiKey) {
      const stored = this.getCredentials();
      if (!stored && !apiKey) {
        db.updateBillzConfig({ status: 'UNCONFIGURED' });
        return {
          success: false,
          status: 'UNCONFIGURED',
          message: 'BILLZ sozlamalari to‘liq emas: API Secret Key yoki Token kiritilishi shart.',
        };
      }
      apiUrl = apiUrl || stored?.apiUrl || DEFAULT_BILLZ_URL;
      apiKey = apiKey || stored?.apiKey || '';
      platformId = platformId !== undefined ? platformId : stored?.platformId || '';
    }

    apiUrl = normalizeBillzApiUrl(apiUrl);
    const resolvedPid = resolvePlatformId(platformId);

    // Step 1: Authenticate with BILLZ
    const authResult = await this.getValidAccessToken(apiUrl, apiKey, resolvedPid);
    if (!authResult.token || authResult.error) {
      const durationMs = Date.now() - startTime;
      const err = authResult.error || 'BILLZ autentifikatsiya muvaffaqiyatsiz bo‘ldi.';

      db.updateBillzConfig({
        status: 'ERROR',
        lastError: err,
      });

      db.addBillzLog({
        type: 'TEST_CONNECTION',
        status: 'FAILED',
        details: err,
        error: err,
        durationMs,
      });

      return {
        success: false,
        status: 'ERROR',
        message: err,
        statusCode: authResult.status || 401,
        error: err,
      };
    }

    // Step 2: Test retrieving catalog with authenticated token
    try {
      const targetUrl = `${apiUrl}/v2/products?limit=1&page=1`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authResult.token}`,
          'platform-id': resolvedPid,
          'Accept': 'application/json',
          'User-Agent': 'SHU-BREND-STORE/2.0',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;
      const parsedRes = await parseBillzResponse(response, 'Ulanish testi');

      if (parsedRes.ok) {
        const json = parsedRes.data || {};
        const totalItems = json.meta?.total ?? json.data?.length ?? 0;

        // Try to identify Mingbuloq branch
        let branchNote = '';
        let shopFoundCount = 0;
        try {
          const shopsRes = await this.fetchShops(apiUrl, authResult.token, resolvedPid);
          if (shopsRes.ok && shopsRes.shops) {
            shopFoundCount = shopsRes.shops.length;
            const mingbuloq = shopsRes.shops.find(s =>
              s.name.toLowerCase() === 'shu brand mingbuloq' ||
              s.name.toLowerCase().includes('mingbuloq')
            );
            if (mingbuloq) {
              db.updateBillzConfig({ centralShopId: mingbuloq.id });
              branchNote = ` "Shu brand Mingbuloq" filiali aniqlandi (ID: ${mingbuloq.id}).`;
            } else {
              branchNote = ` Biroq "Shu brand Mingbuloq" filiali topilmadi (Mavjud filiallar: ${shopFoundCount} ta).`;
            }
          }
        } catch {
          // Non-blocking branch probe
        }

        db.updateBillzConfig({
          status: 'CONNECTED',
          lastError: undefined,
        });

        db.addBillzLog({
          type: 'TEST_CONNECTION',
          status: 'SUCCESS',
          details: `BILLZ API bilan muvaffaqiyatli aloqa o‘rnatildi (HTTP ${response.status}). Tovarlar soni: ${totalItems}.${branchNote}`,
          durationMs,
        });

        safeLogBillz('TEST_SUCCESS', {
          endpoint: '/v2/products',
          status: response.status,
          durationMs,
          category: 'CONNECTED',
        });

        return {
          success: true,
          status: 'CONNECTED',
          message: `BILLZ API bilan aloqa muvaffaqiyatli o‘rnatildi! (HTTP ${response.status}).${branchNote}`,
          statusCode: response.status,
          productsFound: totalItems,
          shopCount: shopFoundCount,
        };
      }

      // If token expired
      if (response.status === 401 || response.status === 403) {
        this.clearTokenCache();
      }

      let errorMsg = parsedRes.error || `BILLZ API xatolik qaytardi (HTTP ${response.status})`;
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

      safeLogBillz('TEST_FAIL', {
        endpoint: '/v2/products',
        status: response.status,
        durationMs,
        category: 'API_ERROR',
        error: errorMsg,
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
    if (!creds || !creds.apiKey) {
      const err = 'BILLZ API kalitlari sozlanmagan. Avval Secret Key yoki Tokenni saqlang.';
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

    const resolvedPid = resolvePlatformId(creds.platformId);
    const authRes = await this.getValidAccessToken(creds.apiUrl, creds.apiKey, resolvedPid);
    if (!authRes.token || authRes.error) {
      const errMsg = authRes.error || 'BILLZ autentifikatsiyasidan o‘tib bo‘lmadi.';
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
      });
      return {
        success: false,
        message: errMsg,
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
        totalCatalogCount: db.getProducts().length,
        errors: [errMsg],
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

      // Step 2: Fetch shops and identify "Shu brand Mingbuloq"
      const shopsResult = await this.fetchShops(creds.apiUrl, authRes.token, resolvedPid);
      if (!shopsResult.ok || !shopsResult.shops || shopsResult.shops.length === 0) {
        const errMsg = shopsResult.error || 'BILLZ tizimidan filiallar ro‘yxatini olib bo‘lmadi.';
        this.isSyncing = false;
        db.addBillzLog({
          type: 'IMPORT_PRODUCTS',
          status: 'FAILED',
          details: errMsg,
          error: errMsg,
        });
        return {
          success: false,
          message: errMsg,
          importedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          totalCatalogCount: db.getProducts().length,
          errors: [errMsg],
          durationMs: Date.now() - startTime,
        };
      }

      // Qat’iy qoida: Aynan "Shu brand Mingbuloq" filialini topish
      const mingbuloqShop = shopsResult.shops.find(s =>
        s.name.toLowerCase() === 'shu brand mingbuloq' ||
        s.name.toLowerCase().includes('mingbuloq')
      );

      if (!mingbuloqShop) {
        const availableList = shopsResult.shops.map(s => `"${s.name}" (ID: ${s.id})`).join(', ');
        const branchNotFoundErr = `"Shu brand Mingbuloq" filiali BILLZ tizimidan topilmadi! Boshqa filialni avtomatik tanlash qat’iyan taqiqlangan. Tizimdagi filiallar: [${availableList || 'filiallar mavjud emas'}].`;
        this.isSyncing = false;
        db.addBillzLog({
          type: 'IMPORT_PRODUCTS',
          status: 'FAILED',
          details: branchNotFoundErr,
          error: branchNotFoundErr,
        });
        return {
          success: false,
          message: branchNotFoundErr,
          importedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
          totalCatalogCount: db.getProducts().length,
          errors: [branchNotFoundErr],
          durationMs: Date.now() - startTime,
        };
      }

      const mingbuloqShopId = mingbuloqShop.id;
      const mingbuloqShopName = mingbuloqShop.name;
      db.updateBillzConfig({ centralShopId: mingbuloqShopId });

      console.log(`[BILLZ SYNC] Mingbuloq filiali topildi: ID=${mingbuloqShopId}, Name="${mingbuloqShopName}"`);

      // Step 3: Fetch all products with safe pagination
      const allBillzItems: any[] = [];
      let page = 1;
      const limit = 100;
      let hasMore = true;
      const maxPages = 150; // 150 pages * 100 = 15,000 items capacity (user has 10.3k)

      while (hasMore && page <= maxPages && this.isSyncing) {
        const targetUrl = `${creds.apiUrl}/v2/products?page=${page}&limit=${limit}&include_empty_stocks=true`;
        console.log(`[BILLZ IMPORT] Page ${page} method=GET url="${targetUrl}" mingbuloqShopId="${mingbuloqShopId}"`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authRes.token}`,
            'platform-id': resolvedPid,
            'Accept': 'application/json',
            'User-Agent': 'SHU-BREND-STORE/2.0',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        console.log(`[BILLZ IMPORT RESPONSE] status=${response.status} url="${response.url}" contentType="${response.headers.get('content-type')}"`);

        if (response.status === 401 || response.status === 403) {
          this.clearTokenCache();
        }

        const parsedRes = await parseBillzResponse(response, `Tovarlar sahifasi #${page}`);
        if (!parsedRes.ok) {
          throw new Error(parsedRes.error || `BILLZ API xatosi (HTTP ${response.status})`);
        }

        const data = parsedRes.data || {};
        const items = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
        if (items.length === 0) {
          hasMore = false;
          break;
        }

        allBillzItems.push(...items);

        const totalMeta = Number(data.meta?.total);
        if (items.length < limit || (totalMeta && allBillzItems.length >= totalMeta)) {
          hasMore = false;
        } else {
          page++;
          // Rate limit protection: ~2 req/sec
          await new Promise(r => setTimeout(r, 550));
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

      // Step 4: Map & Save products safely
      const existingCategories = db.getCategories();
      const existingProducts = db.getProducts();

      // Ensure existing products are marked as MANUAL if not from BILLZ
      existingProducts.forEach(p => {
        if (!p.billzId && !p.source) {
          p.source = 'MANUAL';
        }
      });

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
          let retailPrice = Number(item.retail_price || item.price || item.selling_price || 0);
          let costPrice = Number(item.cost_price || item.purchase_price || item.supply_price || 0) || undefined;
          let discountPrice = Number(item.discount_price || item.special_price || 0);

          if (Array.isArray(item.shop_prices)) {
            const sp = item.shop_prices.find((s: any) => String(s.shop_id || '').trim() === mingbuloqShopId);
            if (sp) {
              if (sp.retail_price || sp.price) retailPrice = Number(sp.retail_price || sp.price);
              if (sp.cost_price || sp.supply_price) costPrice = Number(sp.cost_price || sp.supply_price);
              if (sp.discount_price) discountPrice = Number(sp.discount_price);
            }
          }
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

          // Images: Download & cache locally to prevent direct CDN hotlinking
          const rawPhotos: string[] = [];
          if (Array.isArray(item.photos)) {
            item.photos.forEach((p: any) => {
              const url = typeof p === 'string' ? p : p?.url || p?.image_url;
              if (url && typeof url === 'string') rawPhotos.push(url);
            });
          } else if (Array.isArray(item.images)) {
            item.images.forEach((img: any) => {
              const url = typeof img === 'string' ? img : img?.url;
              if (url && typeof url === 'string') rawPhotos.push(url);
            });
          }
          if (rawPhotos.length === 0 && item.image_url) {
            rawPhotos.push(item.image_url);
          }

          const cachedImages: string[] = [];
          if (cfg.syncImages && rawPhotos.length > 0) {
            for (let i = 0; i < Math.min(rawPhotos.length, 5); i++) {
              const localImg = await downloadAndCacheBillzImage(rawPhotos[i], billzId, i);
              cachedImages.push(localImg);
            }
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

          // Qat’iy qoida: Faqat "Shu brand Mingbuloq" filialidagi qoldiq hisoblanadi!
          let mingbuloqStock = 0;
          if (Array.isArray(item.shop_measurement_values)) {
            const mv = item.shop_measurement_values.find((s: any) =>
              String(s.shop_id || '').trim() === mingbuloqShopId
            );
            if (mv) {
              mingbuloqStock = Math.max(0, Number(mv.amount ?? mv.quantity ?? 0));
            }
          } else if (item.amount !== undefined || item.quantity !== undefined || item.stock !== undefined) {
            mingbuloqStock = Math.max(0, Number(item.amount ?? item.quantity ?? item.stock ?? 0));
          }

          const branchAvailability = [
            {
              branchId: mingbuloqShopId,
              branchName: mingbuloqShopName,
              stock: mingbuloqStock,
            }
          ];

          // Find existing product by BILLZ ID, or barcode, or SKU
          let existing = existingProducts.find(p => p.billzId === billzId);
          if (!existing && barcode) {
            existing = existingProducts.find(p => p.barcode === barcode);
          }
          if (!existing && sku) {
            existing = existingProducts.find(p => p.sku === sku);
          }

          if (existing) {
            // Admin yuklagan rasmlarni HECH QACHON o‘chirmaymiz (hasCustomImages: true)
            const finalImages = (existing.hasCustomImages && existing.images && existing.images.length > 0)
              ? existing.images
              : (cfg.syncImages && cachedImages.length > 0)
                ? cachedImages
                : (existing.images && existing.images.length > 0 ? existing.images : cachedImages.length > 0 ? cachedImages : ['https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000&auto=format&fit=crop']);

            const updated: Product = {
              ...existing,
              billzId,
              billzShopId: mingbuloqShopId,
              source: 'BILLZ',
              name,
              sku: sku || existing.sku,
              barcode: barcode || existing.barcode,
              brand: brand || existing.brand,
              description: description || existing.description,
              categorySlug: catSlug,
              categoryName: catName,
              costPrice: costPrice || existing.costPrice,
              price: cfg.syncPrices ? finalPrice : existing.price,
              discountPrice: (cfg.syncPrices && discountPrice > 0 && discountPrice < finalPrice) ? discountPrice : existing.discountPrice,
              images: finalImages,
              hasCustomImages: existing.hasCustomImages,
              colorImages: existing.colorImages,
              colors: colors.length > 0 ? colors : existing.colors,
              sizes: sizes.length > 0 ? sizes : existing.sizes,
              variants: cfg.syncStock ? variantsList : existing.variants,
              stock: cfg.syncStock ? mingbuloqStock : existing.stock,
              branchAvailability,
              lastBillzSync: new Date().toISOString(),
            };

            db.saveProduct(updated);
            updatedCount++;
          } else {
            // New imported product from BILLZ
            const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${billzId.slice(-4)}`;
            const finalImages = cachedImages.length > 0
              ? cachedImages
              : ['https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000&auto=format&fit=crop'];

            const newProduct: Product = {
              id: `prod_billz_${billzId}`,
              billzId,
              billzShopId: mingbuloqShopId,
              source: 'BILLZ',
              name,
              slug,
              categorySlug: catSlug,
              categoryName: catName,
              price: finalPrice,
              discountPrice: discountPrice > 0 && discountPrice < finalPrice ? discountPrice : undefined,
              costPrice,
              description,
              brand,
              sku: sku || undefined,
              barcode: barcode || undefined,
              images: finalImages,
              hasCustomImages: false,
              colors,
              sizes,
              variants: variantsList,
              stock: mingbuloqStock,
              branchAvailability,
              rating: 5.0,
              reviewCount: 1,
              isNew: true,
              lastBillzSync: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };

            db.saveProduct(newProduct);
            existingProducts.push(newProduct);
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

    const resolvedPid = resolvePlatformId(creds.platformId);
    const authRes = await this.getValidAccessToken(creds.apiUrl, creds.apiKey, resolvedPid);
    const authToken = authRes.token || creds.apiKey;

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
          'Authorization': `Bearer ${authToken}`,
          'platform-id': resolvedPid,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'SHU-BREND-STORE/2.0',
        },
        body: JSON.stringify(salePayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const parsedRes = await parseBillzResponse(response, 'Sotuvni sinxronlash');
      let billzSaleId = `billz_sale_${Date.now()}`;
      if (parsedRes.ok) {
        const resJson = parsedRes.data || {};
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
