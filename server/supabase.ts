import type { SupabaseConfig } from '../src/types/index.ts';

/**
 * SHU BRAND NEW — Supabase PostgreSQL Adapter & Manager
 * Provides dual-engine support: Supabase Cloud PostgreSQL with seamless
 * local persistent fallback for Windows 11 laptop development and independent operations.
 */

let lastCheckedStatus: SupabaseConfig = {
  connected: false,
  mode: 'LOCAL_PERSISTENT',
  hasServiceKey: false,
  tablesVerified: false,
  error: undefined,
};

export class SupabaseAdapter {
  private url: string;
  private key: string;

  constructor() {
    this.url = process.env.SUPABASE_URL?.trim() || '';
    this.key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_ANON_KEY?.trim() || '';
  }

  isConfigured(): boolean {
    return Boolean(this.url && this.key && this.url.startsWith('http'));
  }

  async getStatus(): Promise<SupabaseConfig> {
    const hasUrl = Boolean(this.url && this.url.startsWith('http'));
    const hasKey = Boolean(this.key);

    if (!hasUrl || !hasKey) {
      lastCheckedStatus = {
        connected: false,
        url: this.url || undefined,
        hasServiceKey: hasKey,
        tablesVerified: false,
        mode: 'LOCAL_PERSISTENT',
        error: 'SUPABASE_URL yoki SUPABASE_SERVICE_ROLE_KEY o‘rnatilmagan. Mahalliy barqaror baza (JSON/Disk) faol ishlamoqda.',
      };
      return lastCheckedStatus;
    }

    try {
      // Test Supabase REST health endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${this.url}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: this.key,
          Authorization: `Bearer ${this.key}`,
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok || res.status === 200 || res.status === 404) {
        lastCheckedStatus = {
          connected: true,
          url: this.url,
          hasServiceKey: true,
          tablesVerified: true,
          mode: 'SUPABASE_POSTGRES',
          lastSyncAt: new Date().toISOString(),
        };
      } else {
        lastCheckedStatus = {
          connected: false,
          url: this.url,
          hasServiceKey: true,
          tablesVerified: false,
          mode: 'LOCAL_PERSISTENT',
          error: `Supabase javob kodi: HTTP ${res.status}`,
        };
      }
    } catch (err: any) {
      lastCheckedStatus = {
        connected: false,
        url: this.url,
        hasServiceKey: hasKey,
        tablesVerified: false,
        mode: 'LOCAL_PERSISTENT',
        error: err.message || 'Supabase serveriga ulanib bo‘lmadi',
      };
    }

    return lastCheckedStatus;
  }
}

export const supabaseAdapter = new SupabaseAdapter();
