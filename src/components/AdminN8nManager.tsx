import React, { useEffect, useState } from 'react';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Key,
  ShieldCheck,
  Eye,
  EyeOff,
  Sliders,
  Sparkles,
  ExternalLink,
  Save,
  ArrowRight,
  FileCode,
  Terminal,
  Clock,
  Layers,
  Database,
  Search,
  AlertTriangle,
  Play,
  RotateCcw,
} from 'lucide-react';
import { api, formatUzbekPrice } from '../lib/api.ts';
import type { N8nConfig, Product } from '../types/index.ts';

interface AdminN8nManagerProps {
  onRefreshCatalog?: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminN8nManager: React.FC<AdminN8nManagerProps> = ({
  onRefreshCatalog,
  showToast,
}) => {
  const [config, setConfig] = useState<N8nConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [showFullApiKey, setShowFullApiKey] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Synced Products list
  const [syncedProducts, setSyncedProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow_guide' | 'products' | 'logs'>('overview');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    showToast('Nusxa olindi!', 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getN8nConfig();
      setConfig(res);

      setProductsLoading(true);
      const prodsRes = await api.getN8nProducts({ limit: 100 });
      setSyncedProducts(prodsRes.products || []);
    } catch (err: any) {
      showToast(err.message || 'n8n sozlamalarini yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
      setProductsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerateKey = async () => {
    if (!confirm('Yangi API kaliti yaratilsinmi? Avvalgi kalit bekor qilinadi va n8n da yangilash talab qilinadi.')) {
      return;
    }
    try {
      setGeneratingKey(true);
      const res = await api.generateN8nApiKey();
      setConfig(res.config);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message || 'Kalit yaratishda xatolik', 'error');
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleTestSync = async () => {
    try {
      setTesting(true);
      const res = await api.testN8nSync();
      showToast(res.message, 'success');
      loadData();
      if (onRefreshCatalog) onRefreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Sinov so‘rovida xatolik', 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleUpdateSettings = async (patch: Partial<N8nConfig>) => {
    try {
      setSaving(true);
      const res = await api.updateN8nConfig(patch);
      setConfig(res.config);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err.message || 'Sozlamalarni saqlashda xatolik', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Sample n8n JSON Workflow template
  const n8nWorkflowJson = JSON.stringify(
    {
      name: 'BILLZ to SHU BREND Sync',
      nodes: [
        {
          parameters: {
            rule: {
              interval: [{ field: 'minutes', minutesInterval: 30 }],
            },
          },
          name: 'Schedule Trigger (Har 30 daqiqa)',
          type: 'n8n-nodes-base.scheduleTrigger',
          typeVersion: 1,
          position: [240, 300],
        },
        {
          parameters: {
            method: 'POST',
            url: 'https://api-admin.billz.ai/v1/auth/login',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                { name: 'platform-id', value: '7d4a4c38-dd84-4902-b744-0488b80a4c01' },
                { name: 'Content-Type', value: 'application/json' },
              ],
            },
            sendBody: true,
            specifyBody: 'json',
            jsonBody: '{\n  "secret_token": "SIZNING_BILLZ_SECRET_TOKENINGIZ"\n}',
            options: {},
          },
          name: '1. BILLZ Login',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.1,
          position: [460, 300],
        },
        {
          parameters: {
            method: 'GET',
            url: 'https://api-admin.billz.ai/v2/products?page=1&limit=100&include_empty_stocks=true',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                { name: 'Authorization', value: 'Bearer {{$json.data.access_token}}' },
                { name: 'platform-id', value: '7d4a4c38-dd84-4902-b744-0488b80a4c01' },
              ],
            },
            options: {},
          },
          name: '2. BILLZ Mahsulotlarini Olish',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.1,
          position: [680, 300],
        },
        {
          parameters: {
            jsCode: `// BILLZ dan kelgan mahsulotlarni SHU BREND formatiga moslashtirish
const products = $input.first().json.data?.products || [];
const mapped = products.map(p => ({
  billzId: p.id,
  name: p.name,
  sku: p.sku || p.article || '',
  barcode: p.bar_code || p.barcode || '',
  categoryName: p.category_name || 'Erkaklar kiyimi',
  price: Number(p.retail_price || p.price || 0),
  costPrice: Number(p.cost_price || p.buy_price || 0),
  stock: Number(p.total_stock || p.quantity || 0),
  images: (p.photos || []).map(ph => typeof ph === 'string' ? ph : ph.url).filter(Boolean),
  colors: (p.colors || []).map(c => c.name || c),
  sizes: (p.sizes || []).map(s => s.name || s),
}));
return [{ json: { products: mapped } }];`,
          },
          name: '3. Ma\'lumotlarni Formatlash',
          type: 'n8n-nodes-base.code',
          typeVersion: 2,
          position: [900, 300],
        },
        {
          parameters: {
            method: 'POST',
            url: config?.webhookUrlBulk || 'https://shubrend.uz/api/integrations/n8n/products/bulk',
            sendHeaders: true,
            headerParameters: {
              parameters: [
                { name: 'X-API-KEY', value: config?.apiKey || 'SIZNING_API_KALITINGIZ' },
                { name: 'Content-Type', value: 'application/json' },
              ],
            },
            sendBody: true,
            specifyBody: 'json',
            jsonBody: '={{ JSON.stringify($json.products) }}',
            options: {},
          },
          name: '4. SHU BREND Saytiga Yuborish',
          type: 'n8n-nodes-base.httpRequest',
          typeVersion: 4.1,
          position: [1120, 300],
        },
      ],
      connections: {},
    },
    null,
    2
  );

  const sampleCurl = `curl -X POST "${config?.webhookUrlSingle || 'https://sizning-saytingiz.uz/api/integrations/n8n/products'}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-KEY: ${config?.apiKey || 'n8n_live_shubrend_...'}" \\
  -d '{
    "billzId": "billz_sample_101",
    "name": "Klassik Qora Pidjak",
    "sku": "PIDJ-001",
    "barcode": "4780001234567",
    "categoryName": "DVOYKA",
    "price": 1250000,
    "costPrice": 750000,
    "stock": 8,
    "colors": ["Qora", "To‘q ko‘k"],
    "sizes": ["M", "L", "XL"],
    "images": ["https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=1000"]
  }'`;

  const filteredProducts = syncedProducts.filter(p => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.billzId && p.billzId.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Architectural Flow Card */}
      <div className="bg-gradient-to-r from-neutral-900 via-[#121927] to-neutral-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-bold tracking-wider uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                n8n Webhook Receiver Faol
              </span>
              <span className="text-xs text-slate-400">REST API v2.0</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              BILLZ ➔ n8n ➔ SHU BREND Integratsiyasi
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              BILLZ bilan sayt o‘rtasidagi mahsulotlar, narxlar va ombor qoldig‘i to‘g‘ridan-to‘g‘ri n8n avtomatlashtirish platformasi orqali sinxronlanadi. Sayt backendida mahsulotlarni qabul qiluvchi xavfsiz Webhook API ishlamoqda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleTestSync}
              disabled={testing}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold text-xs tracking-wider transition-all shadow-lg shadow-amber-900/30 flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Saytga sinov mahsulotini yuborib tekshirish"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Tekshirilmoqda...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-black fill-black" />
                  <span>Test so‘rovini yuborish</span>
                </>
              )}
            </button>

            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
              title="Yangilash"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 3-Step Flow Diagram */}
        <div className="relative z-10 mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-500/30">
              1
            </div>
            <div>
              <div className="text-xs font-bold text-white">BILLZ ERP</div>
              <div className="text-[11px] text-slate-400">10 300+ tovarlar ombori</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 ml-auto hidden md:block" />
          </div>

          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-500/40">
              2
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300">n8n Workflow</div>
              <div className="text-[11px] text-slate-400">Har 30 daqiqada avtomatik</div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-600 ml-auto hidden md:block" />
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/40 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-500/40">
              3
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400">SHU BREND Sayti</div>
              <div className="text-[11px] text-slate-400">Katalogda darhol ko‘rinadi</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#131b2a] rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Webhook Holati</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="text-lg font-bold text-emerald-400">QABULGA TAYYOR</div>
          <div className="text-[11px] text-slate-400 mt-1">HTTP 200 OK kutilmoqda</div>
        </div>

        <div className="bg-[#131b2a] rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Sinxronlangan Mahsulotlar</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-white">{config?.totalSyncedProducts || 0} ta</div>
          <div className="text-[11px] text-slate-400 mt-1">BILLZ dan kelgan tovarlar</div>
        </div>

        <div className="bg-[#131b2a] rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Oxirgi Sinxronizatsiya</span>
            <Clock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-semibold text-slate-200 truncate">
            {config?.lastWebhookAt ? new Date(config.lastWebhookAt).toLocaleTimeString('uz-UZ') : 'Kutilmoqda'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {config?.lastWebhookAt ? new Date(config.lastWebhookAt).toLocaleDateString('uz-UZ') : 'Hali amalga oshmadi'}
          </div>
        </div>

        <div className="bg-[#131b2a] rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Xatoliklar Sonisi</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-lg font-bold text-slate-200">{config?.totalErrors || 0} ta</div>
          <div className="text-[11px] text-slate-400 mt-1">Avtomatik tiklanuvchi</div>
        </div>
      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-4 overflow-x-auto">
        {[
          { id: 'overview', label: 'API Ulanish Sozlamalari' },
          { id: 'workflow_guide', label: 'n8n Workflow Qo‘llanmasi & Shabloni' },
          { id: 'products', label: `Kelgan Mahsulotlar (${syncedProducts.length})` },
          { id: 'logs', label: `Sinxronizatsiya Tarixi (${config?.logs?.length || 0})` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-3 text-xs sm:text-sm font-bold tracking-wide transition-colors relative whitespace-nowrap cursor-pointer ${
              activeTab === tab.id
                ? 'text-amber-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & CREDENTIALS */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Webhook URLs Card */}
          <div className="bg-[#131b2a] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                Saytning Webhook API Manzillari
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                Method: POST
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Ushbu manzillarni n8n dagi <strong>HTTP Request</strong> tuguniga joylashtiring:
            </p>

            {/* Bulk URL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                <span>1. Ommaviy mahsulotlar yuborish (Tavsiya etiladi - Bulk)</span>
                <span className="text-amber-400 text-[10px]">Tavsiya etiladi</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={config?.webhookUrlBulk || ''}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono"
                />
                <button
                  onClick={() => copyToClipboard(config?.webhookUrlBulk || '', 'bulk_url')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                  title="Nusxa olish"
                >
                  {copiedField === 'bulk_url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Single URL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300">
                2. Yagona mahsulot yuborish (Single)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={config?.webhookUrlSingle || ''}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 font-mono"
                />
                <button
                  onClick={() => copyToClipboard(config?.webhookUrlSingle || '', 'single_url')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                  title="Nusxa olish"
                >
                  {copiedField === 'single_url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Health URL */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300">
                3. Ulanish tekshiruvi (Health Check - GET)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={config?.healthUrl || ''}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-400 font-mono"
                />
                <button
                  onClick={() => copyToClipboard(config?.healthUrl || '', 'health_url')}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                  title="Nusxa olish"
                >
                  {copiedField === 'health_url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* API Key & Security Card */}
          <div className="bg-[#131b2a] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                API Maxfiy Kaliti (X-API-KEY)
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                Xavfsiz Himoyalangan
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              n8n so‘rov yuborayotganda ushbu kalitni <code>X-API-KEY</code> yoki <code>Authorization: Bearer</code> sarlavhasida yuborishi shart. Maxfiy kalit saytdan tashqariga oshkor etilmaydi.
            </p>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type={showFullApiKey ? 'text' : 'password'}
                  readOnly
                  value={config?.apiKey || ''}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-emerald-400 font-mono tracking-wider"
                />
                <button
                  onClick={() => setShowFullApiKey(!showFullApiKey)}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                  title={showFullApiKey ? 'Yashirish' : 'Ko‘rish'}
                >
                  {showFullApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => copyToClipboard(config?.apiKey || '', 'api_key')}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                  title="Kalitdan nusxa olish"
                >
                  {copiedField === 'api_key' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500 font-mono">
                  Format: X-API-KEY: {config?.apiKeyMasked}
                </span>

                <button
                  onClick={handleGenerateKey}
                  disabled={generatingKey}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{generatingKey ? 'Yaratilmoqda...' : 'Yangi kalit yaratish'}</span>
                </button>
              </div>
            </div>

            {/* Toggles */}
            <div className="pt-3 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">Avtomatik nashr qilish (Auto-Publish)</span>
                  <span className="text-[11px] text-slate-400">Yangi tovar kelganda darhol sayt katalogida ko‘rinsin</span>
                </div>
                <input
                  type="checkbox"
                  checked={config?.autoPublish ?? true}
                  onChange={(e) => handleUpdateSettings({ autoPublish: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-white block">Sayt rasmlarini himoyalash</span>
                  <span className="text-[11px] text-slate-400">Admin tomonidan yuklangan sifatli rasmlar o‘chirib yuborilmasin</span>
                </div>
                <input
                  type="checkbox"
                  checked={config?.preserveCustomImages ?? true}
                  onChange={(e) => handleUpdateSettings({ preserveCustomImages: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: N8N WORKFLOW GUIDE & READY-TO-USE TEMPLATE */}
      {activeTab === 'workflow_guide' && (
        <div className="space-y-6">
          {/* Step by Step Guide */}
          <div className="bg-[#131b2a] border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-amber-400" />
              n8n orqali BILLZ mahsulotlarini SHU BREND saytiga ulash bosqichlari
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <span className="font-bold text-amber-400 block text-sm">1. Schedule Trigger</span>
                <p>
                  Har 30 daqiqada yoki 1 soatda avtomatik ishga tushadigan qilib belgilang.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <span className="font-bold text-amber-400 block text-sm">2. BILLZ Login</span>
                <p>
                  <code>POST https://api-admin.billz.ai/v1/auth/login</code><br />
                  Header: <code>platform-id: 7d4a4c38-dd84-4902-b744-0488b80a4c01</code><br />
                  Body: <code>{`{"secret_token": "SIZNING_BILLZ_TOKENINGIZ"}`}</code>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <span className="font-bold text-amber-400 block text-sm">3. BILLZ Mahsulotlarini Olish</span>
                <p>
                  <code>GET https://api-admin.billz.ai/v2/products?page=1&limit=100</code><br />
                  Header: <code>Authorization: Bearer {'{{$json.data.access_token}}'}</code>
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-400 block text-sm">4. SHU BREND Saytiga Yuborish</span>
                <p>
                  <code>POST {config?.webhookUrlBulk || '/api/integrations/n8n/products/bulk'}</code><br />
                  Header: <code>X-API-KEY: {config?.apiKeyMasked}</code><br />
                  Body: JSON formatdagi mahsulotlar ro‘yxati.
                </p>
              </div>
            </div>
          </div>

          {/* JSON Template Copy Box */}
          <div className="bg-[#131b2a] border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  Tayyor n8n Workflow JSON Shabloni
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ushbu JSON kodini n8n platformangizga import qilib, bir zumda to‘liq avtomatlashtirishni boshlashingiz mumkin.
                </p>
              </div>

              <button
                onClick={() => copyToClipboard(n8nWorkflowJson, 'wf_json')}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-900/20"
              >
                {copiedField === 'wf_json' ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4 text-black" />}
                <span>{copiedField === 'wf_json' ? 'Nusxa olindi!' : 'n8n JSON nusxalash'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-amber-300 font-mono overflow-x-auto max-h-72">
              {n8nWorkflowJson}
            </pre>
          </div>

          {/* cURL Test Sample */}
          <div className="bg-[#131b2a] border border-slate-800 rounded-2xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                Terminal / cURL Test Namunasi
              </h4>
              <button
                onClick={() => copyToClipboard(sampleCurl, 'curl')}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition cursor-pointer flex items-center gap-1"
              >
                {copiedField === 'curl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Nusxa olish</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-cyan-300 font-mono overflow-x-auto">
              {sampleCurl}
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: SYNCED PRODUCTS TABLE */}
      {activeTab === 'products' && (
        <div className="bg-[#131b2a] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Nomi, SKU yoki BILLZ ID bo‘yicha qidirish..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <span className="text-xs text-slate-400">
              Jami: <strong>{filteredProducts.length}</strong> ta mahsulot
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                  <th className="py-3 px-3 font-medium">Mahsulot</th>
                  <th className="py-3 px-3 font-medium">BILLZ ID / SKU</th>
                  <th className="py-3 px-3 font-medium">Kategoriya</th>
                  <th className="py-3 px-3 font-medium text-right">Narxi</th>
                  <th className="py-3 px-3 font-medium text-center">Ombor Qoldig‘i</th>
                  <th className="py-3 px-3 font-medium text-center">Holat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {productsLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Yuklanmoqda...
                    </td>
                  </tr>
                ) : filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      Hozircha n8n orqali kelgan mahsulotlar mavjud emas. Yuqoridagi «Test so‘rovini yuborish» tugmasi orqali sinab ko‘ring!
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 flex items-center gap-3">
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=400'}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded-lg border border-slate-700 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-white max-w-xs truncate">{p.name}</div>
                          <div className="text-[10px] text-slate-400">
                            {p.colors.join(', ')} • {p.sizes.join(', ')}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-amber-400 font-semibold">{p.billzId || '—'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">SKU: {p.sku || '—'}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-300 font-medium">
                        {p.categoryName}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-white">
                        {formatUzbekPrice(p.price)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          p.stock > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {p.stock} dona
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          SAYTDA FAOL
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SYNCHRONIZATION LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-[#131b2a] border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              n8n Webhook Qabul Qilish Jurnali (Audit Logs)
            </h3>
            <span className="text-xs text-slate-400">
              Oxirgi {config?.logs?.length || 0} ta so‘rov
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/50">
                  <th className="py-2.5 px-3 font-medium">Vaqt</th>
                  <th className="py-2.5 px-3 font-medium text-center">Turi</th>
                  <th className="py-2.5 px-3 font-medium text-center">Holat</th>
                  <th className="py-2.5 px-3 font-medium text-center">Tovar Soni</th>
                  <th className="py-2.5 px-3 font-medium">Tafsilot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {!config?.logs || config.logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Hozircha webhook jurnallari mavjud emas
                    </td>
                  </tr>
                ) : (
                  config.logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('uz-UZ')}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px]">
                          {log.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : log.status === 'PARTIAL'
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">
                        {log.productsUpserted} / {log.productsReceived}
                      </td>
                      <td className="py-2.5 px-3 text-slate-300 max-w-md truncate">
                        {log.details || 'Muvaffaqiyatli qabul qilindi'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
