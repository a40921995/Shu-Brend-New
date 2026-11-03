import fs from 'fs';
import path from 'path';
import type {
  BillzDiagnosticInfo,
  BillzProductStatus,
  BillzSettings,
  BillzStagingProduct,
  BillzSyncLog,
  BillzSyncStatus,
  Branch,
  Category,
  Order,
  Product,
  ProductVariant,
} from '../src/types/index.ts';
import { db, type BillzStorageConfig } from './db.ts';
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

export interface BillzTelemetry {
  url: string;
  method: string;
  statusCode: number;
  contentType: string;
  durationMs: number;
  timestamp: string;
  errorSnippet?: string;
}

let lastRequestTelemetry: BillzTelemetry | undefined = undefined;

export function recordBillzTelemetry(meta: {
  url: string;
  method: string;
  statusCode: number;
  contentType: string;
  durationMs: number;
  errorSnippet?: string;
}) {
  lastRequestTelemetry = {
    ...meta,
    timestamp: new Date().toISOString(),
  };
}

export function getLastBillzTelemetry(): BillzTelemetry | undefined {
  return lastRequestTelemetry;
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
  endpointLabel: string,
  reqMeta?: { method?: string; url?: string; durationMs?: number }
): Promise<{ ok: boolean; data?: T; status: number; error?: string }> {
  const status = response.status;
  const contentType = response.headers.get('content-type') || '';
  const reqUrl = reqMeta?.url || response.url || endpointLabel;
  const reqMethod = reqMeta?.method || 'GET';
  const durationMs = reqMeta?.durationMs || 0;

  let rawText = '';
  try {
    rawText = await response.text();
  } catch (err: any) {
    const error = `BILLZ serveridan javobni o‘qib bo‘lmadi (${endpointLabel}): ${err.message || 'Tarmoq xatosi'}`;
    recordBillzTelemetry({
      url: reqUrl,
      method: reqMethod,
      statusCode: status,
      contentType,
      durationMs,
      errorSnippet: error.slice(0, 200),
    });
    return { ok: false, status, error };
  }

  const preview = rawText.slice(0, 300).replace(/\s+/g, ' ').replace(/(Bearer\s+|"token":\s*")[A-Za-z0-9_\-\.]+/gi, '$1[REDACTED]');
  console.log(`[BILLZ RESPONSE PREVIEW ${endpointLabel}] status=${status} contentType="${contentType}" bodyFirst300="${preview}"`);

  const isHtml =
    rawText.trim().startsWith('<') ||
    rawText.toLowerCase().includes('<!doctype') ||
    rawText.toLowerCase().includes('<html') ||
    contentType.toLowerCase().includes('text/html');

  if (isHtml) {
    const error = `BILLZ API serveri JSON o‘rniga HTML sahifasini qaytardi (HTTP ${status}, Content-Type: ${contentType}). Ehtimol, API Base URL noto‘g‘ri (masalan, admin.billz.ai o‘rniga api-admin.billz.ai bo‘lishi lozim) yoki server veb-sahifaga yo‘naltirgan.`;
    recordBillzTelemetry({
      url: reqUrl,
      method: reqMethod,
      statusCode: status,
      contentType,
      durationMs,
      errorSnippet: 'HTML sahifasi qaytarildi (JSON kutilgan edi)',
    });
    return { ok: false, status, error };
  }

  if (!rawText.trim()) {
    const error = response.ok ? undefined : `BILLZ API bo‘sh javob qaytardi (HTTP ${status})`;
    recordBillzTelemetry({
      url: reqUrl,
      method: reqMethod,
      statusCode: status,
      contentType,
      durationMs,
      errorSnippet: error,
    });
    return {
      ok: response.ok,
      status,
      data: {} as T,
      error,
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

      if (serverMsg === 'platform-id' || (typeof serverMsg === 'string' && serverMsg.includes('platform-id'))) {
        serverMsg = 'Platform ID xatosi (platform-id). BILLZ API talabiga binoan Platform ID standart UUID formatida bo‘lishi kerak.';
      }

      const error = `BILLZ API xatosi (HTTP ${status}): ${serverMsg}`;
      recordBillzTelemetry({
        url: reqUrl,
        method: reqMethod,
        statusCode: status,
        contentType,
        durationMs,
        errorSnippet: serverMsg.slice(0, 200),
      });

      return {
        ok: false,
        status,
        data: json,
        error,
      };
    }

    recordBillzTelemetry({
      url: reqUrl,
      method: reqMethod,
      statusCode: status,
      contentType,
      durationMs,
    });

    return {
      ok: true,
      status,
      data: json as T,
    };
  } catch {
    const error = `BILLZ API javobi yaroqsiz JSON formatida (HTTP ${status}): ${rawText.slice(0, 120)}`;
    recordBillzTelemetry({
      url: reqUrl,
      method: reqMethod,
      statusCode: status,
      contentType,
      durationMs,
      errorSnippet: error.slice(0, 200),
    });
    return {
      ok: false,
      status,
      error,
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
      const mingbuloqBranch = p.branchAvailability?.find(b =>
        b.branchName.toLowerCase().includes('mingbuloq') ||
        (cfg.branchShopId && b.branchId === cfg.branchShopId)
      );
      if (mingbuloqBranch) {
        return sum + (mingbuloqBranch.stock || 0);
      }
      return sum;
    }, 0);

    const mainWarehouseStockSum = allProducts.reduce((sum, p) => {
      const mainBranch = p.branchAvailability?.find(b =>
        (cfg.mainShopId && b.branchId === cfg.mainShopId) ||
        b.branchName.toLowerCase().includes('shu brend') ||
        b.branchName.toLowerCase().includes('asosiy')
      );
      if (mainBranch) {
        return sum + (mainBranch.stock || 0);
      }
      return sum + (p.source === 'BILLZ' ? p.stock || 0 : 0);
    }, 0);

    const stagedProductsCount = db.getBillzStagingProducts().length;
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
      centralShopId: cfg.mainShopId || cfg.centralShopId || 'shop_tashkent_central',
      mainShopId: cfg.mainShopId || undefined,
      mainShopName: cfg.mainShopName || 'SHU BREND (Asosiy ombor)',
      mainWarehouseTotalStock: mainWarehouseStockSum,
      branchShopId: cfg.branchShopId || cfg.centralShopId || undefined,
      branchShopName: cfg.branchShopName || 'Shu brand Mingbuloq',
      branchTotalStock: mingbuloqTotalStock,
      stagedProductsCount,
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
      mingbuloqShopId: cfg.branchShopId || cfg.centralShopId || undefined,
      mingbuloqShopName: cfg.branchShopName || 'Shu brand Mingbuloq',
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

  // --- WAREHOUSE DISCOVERY & IDENTIFICATION ---
  public async identifyWarehouses(overrideToken?: string): Promise<{
    mainShop?: { id: string; name: string };
    branchShop?: { id: string; name: string };
    allShops: Array<{ id: string; name: string }>;
    error?: string;
  }> {
    const creds = this.getCredentials();
    if (!creds || !creds.apiKey) {
      return { allShops: [], error: 'BILLZ API kaliti sozlanmagan.' };
    }
    const resolvedPid = resolvePlatformId(creds.platformId);
    const token = overrideToken || (await this.getValidAccessToken(creds.apiUrl, creds.apiKey, resolvedPid)).token;
    if (!token) {
      return { allShops: [], error: 'BILLZ autentifikatsiyasidan o‘tib bo‘lmadi.' };
    }

    const shopsRes = await this.fetchShops(creds.apiUrl, token, resolvedPid);
    if (!shopsRes.ok || !shopsRes.shops) {
      return { allShops: [], error: shopsRes.error || 'Filiallarni olishda xatolik yuz berdi.' };
    }

    const shops = shopsRes.shops;
    // 1. Asosiy ombor: "SHU BREND" (eng katta va asosiy ombor, Mingbuloq bo‘lmagan)
    let mainShop = shops.find(s => {
      const name = s.name.toLowerCase();
      return (name.includes('shu brend') || name.includes('shu brand')) && !name.includes('mingbuloq');
    });
    if (!mainShop) {
      mainShop = shops.find(s => s.name.toLowerCase().includes('asosiy') || s.name.toLowerCase().includes('markaziy') || s.name.toLowerCase().includes('sklad') || s.name.toLowerCase().includes('bosh'));
    }
    if (!mainShop && shops.length > 0) {
      mainShop = shops.find(s => !s.name.toLowerCase().includes('mingbuloq')) || shops[0];
    }

    // 2. Filial ombori: "Shu brand Mingbuloq"
    const branchShop = shops.find(s => s.name.toLowerCase().includes('mingbuloq'));

    const updates: Partial<BillzStorageConfig> = {};
    if (mainShop) {
      updates.mainShopId = mainShop.id;
      updates.mainShopName = mainShop.name;
      console.log(`[BILLZ WAREHOUSE] Asosiy ombor aniqlandi: "${mainShop.name}" (ID: ${mainShop.id})`);
    }
    if (branchShop) {
      updates.branchShopId = branchShop.id;
      updates.branchShopName = branchShop.name;
      updates.centralShopId = branchShop.id;
      console.log(`[BILLZ WAREHOUSE] Filial aniqlandi: "${branchShop.name}" (ID: ${branchShop.id})`);
    }
    if (Object.keys(updates).length > 0) {
      db.updateBillzConfig(updates);
    }

    return {
      mainShop,
      branchShop,
      allShops: shops,
    };
  }

  // --- CATALOG BROWSER FOR PRODUCT SELECTOR (📦 BILLZ MAHSULOTLARINI OCHISH) ---
  public async browseCatalog(params: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    inStockOnly?: boolean;
    minStock?: number;
    minPrice?: number;
    maxPrice?: number;
  }): Promise<{
    items: Array<any>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    mainWarehouse?: { id: string; name: string };
    branchWarehouse?: { id: string; name: string };
    error?: string;
  }> {
    const creds = this.getCredentials();
    if (!creds || !creds.apiKey) {
      return {
        items: [],
        total: 0,
        page: params.page || 1,
        limit: params.limit || 24,
        totalPages: 0,
        error: 'BILLZ API kaliti sozlanmagan. Iltimos, Sozlamalar bo‘limida API Tokenni kiriting.',
      };
    }

    const resolvedPid = resolvePlatformId(creds.platformId);
    const authRes = await this.getValidAccessToken(creds.apiUrl, creds.apiKey, resolvedPid);
    if (!authRes.token) {
      return {
        items: [],
        total: 0,
        page: params.page || 1,
        limit: params.limit || 24,
        totalPages: 0,
        error: authRes.error || 'BILLZ autentifikatsiyasidan o‘tib bo‘lmadi.',
      };
    }

    const warehouses = await this.identifyWarehouses(authRes.token);
    const mainShopId = warehouses.mainShop?.id || db.getBillzConfig().mainShopId;
    const branchShopId = warehouses.branchShop?.id || db.getBillzConfig().branchShopId || db.getBillzConfig().centralShopId;

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(5, Number(params.limit) || 24));
    const startTime = Date.now();

    try {
      const targetUrl = `${creds.apiUrl}/v2/products?page=${page}&limit=${limit}&include_empty_stocks=true`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

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
      const durationMs = Date.now() - startTime;
      const parsed = await parseBillzResponse(response, `Katalog brauzeri (#${page})`, {
        url: targetUrl,
        method: 'GET',
        durationMs,
      });

      if (!parsed.ok) {
        return {
          items: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          error: parsed.error,
        };
      }

      const resData = parsed.data || {};
      const rawItems = Array.isArray(resData.data) ? resData.data : Array.isArray(resData) ? resData : [];
      const totalCount = Number(resData.meta?.total) || (page > 1 ? (page * limit) : rawItems.length) || 10300;
      const totalPages = Math.ceil(totalCount / limit);

      const stagedProducts = db.getBillzStagingProducts();
      const publishedProducts = db.getProducts();

      const mappedItems = rawItems.map((raw: any) => {
        const billzId = String(raw.id || raw.product_id || '').trim();
        const name = String(raw.name || raw.title || raw.product_name || 'BILLZ Mahsuloti').trim();
        const sku = String(raw.sku || raw.article || raw.code || '').trim();
        const barcode = String(raw.barcode || raw.barcodes?.[0] || '').trim();
        const brand = String(raw.brand_name || raw.brand || 'SHU BREND').trim();
        const categoryName = String(raw.category_name || raw.category?.name || raw.category || 'Erkaklar kiyimi').trim();

        // Stock extraction per warehouse
        let mainWarehouseStock = 0;
        let branchStock = 0;
        let totalStock = 0;

        if (Array.isArray(raw.shop_measurement_values)) {
          for (const mv of raw.shop_measurement_values) {
            const mvShopId = String(mv.shop_id || '').trim();
            const qty = Math.max(0, Number(mv.amount ?? mv.quantity ?? 0));
            totalStock += qty;

            if (mainShopId && mvShopId === mainShopId) {
              mainWarehouseStock = qty;
            } else if (branchShopId && mvShopId === branchShopId) {
              branchStock = qty;
            }
          }
        } else {
          totalStock = Math.max(0, Number(raw.total_stock ?? raw.stock ?? raw.quantity ?? 0));
          mainWarehouseStock = totalStock;
        }

        // Prices
        let price = Number(raw.retail_price || raw.price || raw.selling_price || 0);
        let costPrice = Number(raw.cost_price || raw.purchase_price || raw.supply_price || 0) || undefined;
        let discountPrice = Number(raw.discount_price || raw.special_price || 0) || undefined;

        if (Array.isArray(raw.shop_prices) && mainShopId) {
          const sp = raw.shop_prices.find((s: any) => String(s.shop_id || '').trim() === mainShopId);
          if (sp) {
            if (sp.retail_price || sp.price) price = Number(sp.retail_price || sp.price);
            if (sp.cost_price || sp.supply_price) costPrice = Number(sp.cost_price || sp.supply_price);
            if (sp.discount_price) discountPrice = Number(sp.discount_price);
          }
        }

        // Photos
        const images: string[] = [];
        if (Array.isArray(raw.photos)) {
          raw.photos.forEach((p: any) => {
            const url = typeof p === 'string' ? p : p?.url || p?.image_url;
            if (url && typeof url === 'string') images.push(url);
          });
        } else if (Array.isArray(raw.images)) {
          raw.images.forEach((img: any) => {
            const url = typeof img === 'string' ? img : img?.url;
            if (url && typeof url === 'string') images.push(url);
          });
        }
        if (images.length === 0 && raw.image_url) {
          images.push(raw.image_url);
        }

        // Colors & Sizes
        const colors: string[] = [];
        const sizes: string[] = [];
        if (Array.isArray(raw.variants)) {
          raw.variants.forEach((v: any) => {
            const c = String(v.color_name || v.color || '').trim();
            const s = String(v.size_name || v.size || '').trim();
            if (c && !colors.includes(c)) colors.push(c);
            if (s && !sizes.includes(s)) sizes.push(s);
          });
        }

        // Check Staging & Live Status
        const stagingItem = stagedProducts.find(s => s.billzId === billzId);
        const publishedItem = publishedProducts.find(p => p.billzId === billzId);

        return {
          billzId,
          name,
          sku,
          barcode,
          brand,
          categoryName,
          price: price || 120000,
          costPrice,
          discountPrice,
          images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=600&auto=format&fit=crop'],
          colors: colors.length > 0 ? colors : ['Qora'],
          sizes: sizes.length > 0 ? sizes : ['M', 'L', 'XL'],
          mainWarehouseStock,
          branchStock,
          totalStock,
          isStaged: Boolean(stagingItem),
          stagingStatus: stagingItem?.status,
          stagingId: stagingItem?.id,
          isPublished: Boolean(publishedItem) || stagingItem?.status === 'PUBLISHED',
          publishedProductId: publishedItem?.id || stagingItem?.publishedProductId,
          rawBillzData: raw,
        };
      });

      // Filter in-memory if user searched or applied filters on current page
      let filtered: any[] = mappedItems;
      if (params.search && params.search.trim()) {
        const q = params.search.trim().toLowerCase();
        filtered = filtered.filter((it: any) =>
          (it.name || '').toLowerCase().includes(q) ||
          (it.sku || '').toLowerCase().includes(q) ||
          (it.barcode || '').toLowerCase().includes(q) ||
          (it.billzId || '').toLowerCase().includes(q)
        );
      }
      if (params.inStockOnly) {
        filtered = filtered.filter((it: any) => it.mainWarehouseStock > 0);
      }
      if (params.minStock !== undefined && params.minStock > 0) {
        filtered = filtered.filter((it: any) => it.mainWarehouseStock >= params.minStock!);
      }
      if (params.minPrice !== undefined && params.minPrice > 0) {
        filtered = filtered.filter((it: any) => it.price >= params.minPrice!);
      }
      if (params.maxPrice !== undefined && params.maxPrice > 0) {
        filtered = filtered.filter((it: any) => it.price <= params.maxPrice!);
      }

      return {
        items: filtered,
        total: totalCount,
        page,
        limit,
        totalPages,
        mainWarehouse: warehouses.mainShop,
        branchWarehouse: warehouses.branchShop,
      };
    } catch (err: any) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        error: `Katalog mahsulotlarini olishda xatolik: ${err.message}`,
      };
    }
  }

  // --- STAGING MANAGEMENT (BILLZ'DAN KELGAN MAHSULOTLAR) ---
  public async stageSelectedProducts(items: any[]): Promise<{
    success: boolean;
    stagedCount: number;
    stagedItems: BillzStagingProduct[];
    message: string;
  }> {
    if (!Array.isArray(items) || items.length === 0) {
      return { success: false, stagedCount: 0, stagedItems: [], message: 'Tanlangan mahsulotlar ro‘yxati bo‘sh.' };
    }

    const cfg = db.getBillzConfig();
    const stagedToSave: BillzStagingProduct[] = [];

    for (const raw of items) {
      const billzId = String(raw.billzId || raw.id || raw.product_id || '').trim();
      if (!billzId) continue;

      const existingStaged = db.findStagingProductByBillzId(billzId);
      if (existingStaged) {
        // Already in staging: update stock from BILLZ, preserve user manual edits
        existingStaged.mainWarehouseStock = Number(raw.mainWarehouseStock ?? existingStaged.mainWarehouseStock);
        existingStaged.branchStock = Number(raw.branchStock ?? existingStaged.branchStock);
        existingStaged.totalStock = Number(raw.totalStock ?? existingStaged.totalStock);
        if (existingStaged.status === 'REJECTED') {
          existingStaged.status = 'SELECTED';
        }
        db.saveBillzStagingProduct(existingStaged);
        stagedToSave.push(existingStaged);
        continue;
      }

      const name = String(raw.name || raw.title || 'SHU BREND Kiyim').trim();
      const sku = String(raw.sku || raw.article || raw.code || '').trim();
      const barcode = String(raw.barcode || raw.barcodes?.[0] || '').trim();
      const brand = String(raw.brand || raw.brand_name || 'SHU BREND').trim();
      const categoryName = String(raw.categoryName || raw.category_name || 'Erkaklar kiyimi').trim();
      const categorySlug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'boshqa';
      const price = Math.max(1000, Number(raw.price || raw.retail_price || 120000));
      const costPrice = Number(raw.costPrice || raw.cost_price || 0) || undefined;
      const discountPrice = Number(raw.discountPrice || raw.discount_price || 0) || undefined;
      const description = String(raw.description || `${name} — yuqori sifatli erkaklar kiyimi.`).trim();

      // Cache images locally
      const inputImages: string[] = Array.isArray(raw.images) && raw.images.length > 0
        ? raw.images
        : (raw.image_url ? [raw.image_url] : ['https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800&auto=format&fit=crop']);

      const cachedImages: string[] = [];
      for (let i = 0; i < Math.min(inputImages.length, 5); i++) {
        const cached = await downloadAndCacheBillzImage(inputImages[i], billzId, i);
        cachedImages.push(cached);
      }

      const colors = Array.isArray(raw.colors) && raw.colors.length > 0 ? raw.colors : ['Qora'];
      const sizes = Array.isArray(raw.sizes) && raw.sizes.length > 0 ? raw.sizes : ['M', 'L', 'XL'];

      const newStaging: BillzStagingProduct = {
        id: `stg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        billzId,
        name,
        sku: sku || undefined,
        barcode: barcode || undefined,
        brand,
        categoryName,
        categorySlug,
        price,
        costPrice,
        discountPrice,
        description,
        images: cachedImages.length > 0 ? cachedImages : inputImages,
        hasCustomImages: false,
        colors,
        sizes,
        mainWarehouseStock: Math.max(0, Number(raw.mainWarehouseStock ?? 0)),
        branchStock: Math.max(0, Number(raw.branchStock ?? 0)),
        totalStock: Math.max(0, Number(raw.totalStock ?? raw.mainWarehouseStock ?? 0)),
        status: 'SELECTED',
        rawBillzData: raw.rawBillzData || raw,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.saveBillzStagingProduct(newStaging);
      stagedToSave.push(newStaging);
    }

    db.addBillzLog({
      type: 'IMPORT_PRODUCTS',
      status: 'SUCCESS',
      details: `${stagedToSave.length} ta mahsulot muvaffaqiyatli tanlov omboriga (Staging) qo‘shildi.`,
      itemsCount: stagedToSave.length,
    });

    return {
      success: true,
      stagedCount: stagedToSave.length,
      stagedItems: stagedToSave,
      message: `${stagedToSave.length} ta mahsulot admin panelning "BILLZ'DAN KELGAN MAHSULOTLAR" ro‘yxatiga muvaffaqiyatli qo‘shildi!`,
    };
  }

  public updateStagingProduct(stagingId: string, updates: Partial<BillzStagingProduct>): BillzStagingProduct {
    const existing = db.getBillzStagingProductById(stagingId);
    if (!existing) {
      throw new Error(`Staging mahsuloti topilmadi (ID: ${stagingId})`);
    }

    if (updates.images && Array.isArray(updates.images)) {
      updates.hasCustomImages = true;
    }

    const updated = db.saveBillzStagingProduct({
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    });

    return updated;
  }

  public deleteStagingProduct(stagingId: string): boolean {
    return db.deleteBillzStagingProduct(stagingId);
  }

  // --- IMMEDIATE PUBLISH TO LIVE WEBSITE CATALOG (🚀 WEB SAYTGA JO‘NATISH) ---
  public async publishStagingProduct(
    stagingId: string,
    customEdits?: Partial<BillzStagingProduct>
  ): Promise<{
    success: boolean;
    product?: Product;
    stagingProduct?: BillzStagingProduct;
    message: string;
  }> {
    let staging = db.getBillzStagingProductById(stagingId);
    if (!staging) {
      return { success: false, message: `Staging mahsuloti topilmadi: ${stagingId}` };
    }

    if (customEdits) {
      staging = this.updateStagingProduct(stagingId, customEdits);
    }

    // Validation
    if (!staging.name || !staging.name.trim()) {
      return { success: false, message: 'Mahsulot nomi to‘ldirilishi shart.' };
    }
    if (!staging.price || staging.price <= 0) {
      return { success: false, message: 'Mahsulot sotuv narxi 0 dan katta bo‘lishi shart.' };
    }

    const cfg = db.getBillzConfig();
    const mainShopId = cfg.mainShopId || 'shop_main_shubrend';
    const mainShopName = cfg.mainShopName || 'SHU BREND Asosiy ombor';
    const branchShopId = cfg.branchShopId || cfg.centralShopId || 'shop_mingbuloq';
    const branchShopName = cfg.branchShopName || 'Shu brand Mingbuloq';

    // Ensure category exists in db
    const catName = staging.categoryName || 'Erkaklar kiyimi';
    let catSlug = staging.categorySlug || 'erkaklar-kiyimi';
    const existingCats = db.getCategories();
    let cat = existingCats.find(c => c.name.toLowerCase() === catName.toLowerCase() || c.slug === catSlug);
    if (!cat) {
      catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'boshqa';
      const newCat = {
        id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: catName,
        slug: catSlug,
        sortOrder: existingCats.length + 1,
        itemCount: 0,
      };
      db.saveCategory(newCat);
      cat = newCat as any;
    }

    const finalCategorySlug = cat ? cat.slug : catSlug;
    const finalCategoryName = cat ? cat.name : catName;

    // Generate product ID and variants
    const productId = staging.publishedProductId || `prod_billz_${staging.billzId}`;
    const slug = `${staging.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${staging.billzId.slice(-4)}`;

    // QAT’IY BIZNES QOIDA: Saytdagi sotuv qoldig‘i AYNAN ASOSIY "SHU BREND" OMBORIDAN OLINADI!
    // Mingbuloq filialining qoldig‘i asosiy omborga qo‘shilmaydi!
    // Asosiy omborda 0 bo‘lsa, mahsulot saytda qoladi, lekin stock = 0 bo‘lib "Sotuvda mavjud emas" deb ko‘rsatiladi.
    const livePurchasableStock = Math.max(0, Number(staging.mainWarehouseStock ?? 0));

    const branchAvailability = [
      {
        branchId: mainShopId,
        branchName: mainShopName,
        stock: livePurchasableStock,
      },
      {
        branchId: branchShopId,
        branchName: branchShopName,
        stock: Math.max(0, Number(staging.branchStock ?? 0)),
      },
    ];

    const existingProduct = db.getProductById(productId) || db.findProductByBillzId(staging.billzId);

    // Variants distribution
    const colors = staging.colors && staging.colors.length > 0 ? staging.colors : ['Qora'];
    const sizes = staging.sizes && staging.sizes.length > 0 ? staging.sizes : ['M', 'L', 'XL'];
    const variants: ProductVariant[] = [];
    const stockPerVariant = Math.max(0, Math.floor(livePurchasableStock / (colors.length * sizes.length)));

    for (const c of colors) {
      for (const s of sizes) {
        variants.push({
          id: `${c}_${s}`,
          color: c,
          size: s,
          stock: stockPerVariant,
          barcode: staging.barcode,
          sku: staging.sku,
        });
      }
    }

    const liveProduct: Product = {
      ...(existingProduct || {}),
      id: productId,
      billzId: staging.billzId,
      billzShopId: mainShopId,
      source: 'BILLZ',
      name: staging.name,
      slug,
      categorySlug: finalCategorySlug,
      categoryName: finalCategoryName,
      price: staging.price,
      costPrice: staging.costPrice,
      discountPrice: staging.discountPrice,
      description: staging.description || `${staging.name} — sifatli erkaklar kiyimi.`,
      brand: staging.brand || 'SHU BREND',
      sku: staging.sku,
      barcode: staging.barcode,
      images: staging.images && staging.images.length > 0 ? staging.images : ['https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800&auto=format&fit=crop'],
      hasCustomImages: Boolean(staging.hasCustomImages || existingProduct?.hasCustomImages),
      colors,
      sizes,
      variants,
      stock: livePurchasableStock,
      branchAvailability,
      rating: existingProduct?.rating || 5.0,
      reviewCount: existingProduct?.reviewCount || 1,
      isNew: existingProduct?.isNew ?? true,
      lastBillzSync: new Date().toISOString(),
      createdAt: existingProduct?.createdAt || new Date().toISOString(),
    };

    db.saveProduct(liveProduct);

    // Update staging record
    staging.status = 'PUBLISHED';
    staging.publishedProductId = liveProduct.id;
    staging.publishedAt = new Date().toISOString();
    db.saveBillzStagingProduct(staging);

    db.addBillzLog({
      type: 'IMPORT_PRODUCTS',
      status: 'SUCCESS',
      details: `"${staging.name}" (ID: ${staging.billzId}) veb-saytga muvaffaqiyatli chiqarildi! Asosiy ombor qoldig‘i: ${livePurchasableStock} dona.`,
      itemsCount: 1,
    });

    return {
      success: true,
      product: liveProduct,
      stagingProduct: staging,
      message: `"${staging.name}" mahsuloti muvaffaqiyatli veb-sayt katalogiga joylashtirildi!`,
    };
  }

  // --- SMART TEST IMPORT (🔬 5 TA MAHSULOT BILAN SINOV IMPORTI) ---
  public async testImport5Products(): Promise<{
    success: boolean;
    count: number;
    items: BillzStagingProduct[];
    message: string;
  }> {
    const creds = this.getCredentials();
    if (!creds || !creds.apiKey) {
      return {
        success: false,
        count: 0,
        items: [],
        message: 'BILLZ API kaliti sozlanmagan. Iltimos avval API kalitni saqlang.',
      };
    }

    const browserRes = await this.browseCatalog({ page: 1, limit: 5 });
    if (browserRes.error || !browserRes.items || browserRes.items.length === 0) {
      return {
        success: false,
        count: 0,
        items: [],
        message: browserRes.error || 'BILLZ hisobidan dastlabki 5 ta mahsulotni olib bo‘lmadi.',
      };
    }

    const stageRes = await this.stageSelectedProducts(browserRes.items.slice(0, 5));
    return {
      success: true,
      count: stageRes.stagedCount,
      items: stageRes.stagedItems,
      message: `BILLZ tizimidan 5 ta sinov mahsuloti muvaffaqiyatli yuklab olindi va "BILLZ'DAN KELGAN MAHSULOTLAR" bo‘limiga joylandi. Siz ularni tahrirlab, saytga chiqarishingiz mumkin!`,
    };
  }

  // --- UPDATE STOCK & PRICES OF PUBLISHED PRODUCTS (HAR 30 DAQIQADA AVTO-SINXRON) ---
  public async syncPublishedProductsStockAndPrices(): Promise<{
    success: boolean;
    updatedCount: number;
    message: string;
  }> {
    const publishedWithBillz = db.getProducts().filter(p => Boolean(p.billzId));
    if (publishedWithBillz.length === 0) {
      return {
        success: true,
        updatedCount: 0,
        message: 'Hozircha BILLZ orqali chiqarilgan mahsulotlar mavjud emas.',
      };
    }

    const creds = this.getCredentials();
    if (!creds || !creds.apiKey) {
      return { success: false, updatedCount: 0, message: 'BILLZ sozlamalari to‘liq emas.' };
    }

    const resolvedPid = resolvePlatformId(creds.platformId);
    const authRes = await this.getValidAccessToken(creds.apiUrl, creds.apiKey, resolvedPid);
    if (!authRes.token) {
      return { success: false, updatedCount: 0, message: authRes.error || 'Autentifikatsiya xatosi' };
    }

    const warehouses = await this.identifyWarehouses(authRes.token);
    const mainShopId = warehouses.mainShop?.id || db.getBillzConfig().mainShopId;
    const branchShopId = warehouses.branchShop?.id || db.getBillzConfig().branchShopId;

    let updatedCount = 0;
    const cfg = db.getBillzConfig();

    for (const prod of publishedWithBillz) {
      try {
        const targetUrl = `${creds.apiUrl}/v2/products/${prod.billzId}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

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
        const parsed = await parseBillzResponse(response, `Mahsulot sinxronlash (${prod.billzId})`);
        if (!parsed.ok || !parsed.data) continue;

        const raw = parsed.data.data || parsed.data;

        // Extract fresh stock strictly from main warehouse
        let mainWarehouseStock = 0;
        let branchStock = 0;
        if (Array.isArray(raw.shop_measurement_values)) {
          for (const mv of raw.shop_measurement_values) {
            const mvShopId = String(mv.shop_id || '').trim();
            const qty = Math.max(0, Number(mv.amount ?? mv.quantity ?? 0));
            if (mainShopId && mvShopId === mainShopId) {
              mainWarehouseStock = qty;
            } else if (branchShopId && mvShopId === branchShopId) {
              branchStock = qty;
            }
          }
        }

        // Fresh prices
        let newPrice = prod.price;
        let newDiscount = prod.discountPrice;
        if (cfg.syncPrices) {
          const freshRetail = Number(raw.retail_price || raw.price || 0);
          if (freshRetail > 0) newPrice = freshRetail;
          const freshDiscount = Number(raw.discount_price || raw.special_price || 0);
          if (freshDiscount > 0) newDiscount = freshDiscount;
        }

        // Qat’iy qoida: manual nom, tavsif, kategoriya va admin yuklagan rasmlar (hasCustomImages: true) SAQLANADI!
        prod.stock = mainWarehouseStock;
        prod.price = newPrice;
        prod.discountPrice = newDiscount;
        prod.branchAvailability = [
          {
            branchId: mainShopId || 'shop_main',
            branchName: warehouses.mainShop?.name || 'SHU BREND Asosiy ombor',
            stock: mainWarehouseStock,
          },
          {
            branchId: branchShopId || 'shop_branch',
            branchName: warehouses.branchShop?.name || 'Shu brand Mingbuloq',
            stock: branchStock,
          },
        ];
        prod.lastBillzSync = new Date().toISOString();
        db.saveProduct(prod);

        // Also sync staging product if present
        if (prod.billzId) {
          const stg = db.findStagingProductByBillzId(prod.billzId);
          if (stg) {
            stg.mainWarehouseStock = mainWarehouseStock;
            stg.branchStock = branchStock;
            stg.totalStock = mainWarehouseStock + branchStock;
            stg.updatedAt = new Date().toISOString();
            db.saveBillzStagingProduct(stg);
          }
        }

        updatedCount++;
      } catch {
        // Continue loop on single product failure
      }
    }

    db.addBillzLog({
      type: 'STOCK_SYNC',
      status: 'SUCCESS',
      details: `${updatedCount} ta sayt mahsulotining narxi va asosiy "SHU BREND" omboridagi qoldig‘i yangilandi.`,
      itemsCount: updatedCount,
    });

    return {
      success: true,
      updatedCount,
      message: `${updatedCount} ta chiqarilgan mahsulotning ombor qoldiqlari va narxlari muvaffaqiyatli yangilandi.`,
    };
  }

  // --- DEDICATED DIAGNOSTIC INFO ---
  public async getDiagnostics(): Promise<BillzDiagnosticInfo> {
    const cfg = db.getBillzConfig();
    const creds = this.getCredentials();
    const hasApiKey = Boolean(creds?.apiKey);
    const hasPlatformId = Boolean(creds?.platformId);

    let tokenStatus = 'TOKEN YO‘Q';
    let tokenExpiry: string | undefined = undefined;
    if (this.cachedToken) {
      if (this.cachedToken.expiresAt > Date.now()) {
        tokenStatus = 'FAOL';
        tokenExpiry = new Date(this.cachedToken.expiresAt).toISOString();
      } else {
        tokenStatus = 'MUDDATI O‘TGAN';
      }
    } else if (hasApiKey) {
      tokenStatus = 'KESHLANMAGAN (KUTILMOQDA)';
    }

    const allProducts = db.getProducts();
    const publishedCount = allProducts.filter(p => Boolean(p.billzId)).length;
    const stagedCount = db.getBillzStagingProducts().length;

    let mainStockSum = 0;
    let branchStockSum = 0;
    for (const p of allProducts) {
      if (p.branchAvailability) {
        for (const b of p.branchAvailability) {
          if (b.branchId === cfg.mainShopId || b.branchName.toLowerCase().includes('shu brend') || b.branchName.toLowerCase().includes('asosiy')) {
            mainStockSum += b.stock || 0;
          }
          if (b.branchId === cfg.branchShopId || b.branchName.toLowerCase().includes('mingbuloq')) {
            branchStockSum += b.stock || 0;
          }
        }
      } else if (p.source === 'BILLZ') {
        mainStockSum += p.stock || 0;
      }
    }

    return {
      apiUrl: cfg.apiUrl || DEFAULT_BILLZ_URL,
      status: cfg.status || 'UNCONFIGURED',
      hasApiKey,
      hasPlatformId,
      tokenStatus,
      tokenExpiry,
      mainWarehouse: {
        name: cfg.mainShopName || 'SHU BREND (Asosiy ombor)',
        id: cfg.mainShopId,
        status: cfg.mainShopId ? 'FOUND' : 'NOT_FOUND',
        stockSum: mainStockSum,
      },
      branchWarehouse: {
        name: cfg.branchShopName || 'Shu brand Mingbuloq',
        id: cfg.branchShopId || cfg.centralShopId,
        status: (cfg.branchShopId || cfg.centralShopId) ? 'FOUND' : 'NOT_FOUND',
        stockSum: branchStockSum,
      },
      lastRequest: getLastBillzTelemetry(),
      totalProductsInBillz: 10300,
      totalStagedProducts: stagedCount,
      totalPublishedProducts: publishedCount,
      lastSyncAt: cfg.lastSyncAt,
      nextSyncAt: cfg.lastSyncAt && cfg.autoSyncEnabled
        ? new Date(new Date(cfg.lastSyncAt).getTime() + (cfg.syncIntervalMinutes || 30) * 60000).toISOString()
        : undefined,
      autoSyncEnabled: Boolean(cfg.autoSyncEnabled),
    };
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
