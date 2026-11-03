import React, { useEffect, useState } from 'react';
import {
  RefreshCw,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Key,
  ShieldCheck,
  Building2,
  ListFilter,
  Check,
  Eye,
  EyeOff,
  Sliders,
  Sparkles,
  ExternalLink,
  Save,
  ShoppingBag,
  Layers,
  FileText,
  AlertCircle,
  Plus,
  Trash2,
  HelpCircle,
  Server,
  ArrowRight,
  StopCircle,
  Camera,
  Image as ImageIcon,
  Package,
  Activity,
} from 'lucide-react';
import { api, formatUzbekPrice } from '../lib/api.ts';
import type { BillzSettings, BillzSyncLog, Branch, Product, BillzDiagnosticInfo } from '../types/index.ts';
import { AdminProductPhotosManager } from './AdminProductPhotosManager.tsx';
import { BillzDiagnosticsPanel } from './billz/BillzDiagnosticsPanel.tsx';
import { BillzCatalogBrowser } from './billz/BillzCatalogBrowser.tsx';
import { BillzStagingManager } from './billz/BillzStagingManager.tsx';

interface AdminBillzManagerProps {
  onRefreshCatalog?: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminBillzManager: React.FC<AdminBillzManagerProps> = ({
  onRefreshCatalog,
  showToast,
}) => {
  // Settings State
  const [settings, setSettings] = useState<BillzSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [photosFilter, setPhotosFilter] = useState<'ALL' | 'MISSING' | 'HAS_IMAGES' | 'BILLZ'>('ALL');
  const [stoppingSync, setStoppingSync] = useState(false);

  // Diagnostics & Actions State
  const [diagnostics, setDiagnostics] = useState<BillzDiagnosticInfo | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);
  const [testingImport5, setTestingImport5] = useState(false);
  const [syncingPublished, setSyncingPublished] = useState(false);
  const [identifyingWarehouses, setIdentifyingWarehouses] = useState(false);

  // Form Inputs
  const [apiUrl, setApiUrl] = useState('https://api-admin.billz.ai');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [platformIdInput, setPlatformIdInput] = useState('');
  const [centralShopId, setCentralShopId] = useState('shop_tashkent_central');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [syncIntervalMinutes, setSyncIntervalMinutes] = useState(30);
  const [syncImages, setSyncImages] = useState(true);
  const [syncPrices, setSyncPrices] = useState(true);
  const [syncStock, setSyncStock] = useState(true);

  // Visibility toggles
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPlatformId, setShowPlatformId] = useState(false);

  // Actions state
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    status: string;
    message: string;
    statusCode?: number;
    productsFound?: number;
    error?: string;
  } | null>(null);

  const [syncingProducts, setSyncingProducts] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    message: string;
    importedCount: number;
    updatedCount: number;
    totalCatalogCount: number;
  } | null>(null);

  // Logs & Branches
  const [logs, setLogs] = useState<BillzSyncLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchShopId, setNewBranchShopId] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [savingBranch, setSavingBranch] = useState(false);

  // Active sub-tab: default to browser / catalog view
  const [activeTab, setActiveTab] = useState<
    'browser' | 'staging' | 'diagnostics' | 'photos' | 'config' | 'sync' | 'branches' | 'logs'
  >('browser');

  const loadDiagnostics = async () => {
    try {
      setLoadingDiagnostics(true);
      const diag = await api.getBillzDiagnostics();
      setDiagnostics(diag);
    } catch {
      // ignore
    } finally {
      setLoadingDiagnostics(false);
    }
  };

  // Load Settings, Logs, Branches and Products
  const loadData = async () => {
    try {
      setLoading(true);
      const [st, lg, br, prods] = await Promise.all([
        api.getBillzSettings(),
        api.getBillzLogs(100),
        api.getBranches(),
        api.getProducts(),
      ]);

      setSettings(st);
      setProducts(prods || []);
      setApiUrl(st.apiUrl || 'https://api-admin.billz.ai');
      setCentralShopId(st.centralShopId || 'shop_tashkent_central');
      setAutoSyncEnabled(st.autoSyncEnabled);
      setSyncIntervalMinutes(st.syncIntervalMinutes || 30);
      setSyncImages(st.syncImages ?? true);
      setSyncPrices(st.syncPrices ?? true);
      setSyncStock(st.syncStock ?? true);

      setLogs(lg);
      setBranches(br);
    } catch (err: any) {
      showToast(err.message || 'BILLZ ma’lumotlarini yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestImport5 = async () => {
    try {
      setTestingImport5(true);
      const res = await api.testImport5BillzProducts();
      if (res.success) {
        showToast(res.message || `${res.count} ta sinov mahsuloti yuklandi!`, 'success');
        loadData();
        loadDiagnostics();
        setActiveTab('staging');
      } else {
        showToast(res.message || 'Sinov importida xatolik', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Sinov importi bajarilmadi', 'error');
    } finally {
      setTestingImport5(false);
    }
  };

  const handleSyncPublished = async () => {
    try {
      setSyncingPublished(true);
      const res = await api.syncPublishedBillzStockPrices();
      if (res.success) {
        showToast(res.message || 'Chiqarilgan tovarlar qoldig‘i va narxlari yangilandi!', 'success');
        if (onRefreshCatalog) onRefreshCatalog();
        loadData();
        loadDiagnostics();
      } else {
        showToast(res.message || 'Qoldiqlarni yangilashda xatolik', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Qoldiqlarni yangilashda xatolik', 'error');
    } finally {
      setSyncingPublished(false);
    }
  };

  const handleIdentifyWarehouses = async () => {
    try {
      setIdentifyingWarehouses(true);
      const res = await api.identifyBillzWarehouses();
      if (!res.error && res.mainShop) {
        showToast(`Omborlar aniqlandi: Asosiy - ${res.mainShop.name}`, 'success');
        loadData();
        loadDiagnostics();
      } else {
        showToast(res.error || 'Omborlarni aniqlashda xatolik', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Omborlarni aniqlashda xatolik', 'error');
    } finally {
      setIdentifyingWarehouses(false);
    }
  };

  const handleStopSync = async () => {
    try {
      setStoppingSync(true);
      const res = await api.stopBillzSync();
      showToast(res.message, res.stopped ? 'info' : 'info');
      setSyncingProducts(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Sinxronizatsiyani to‘xtatib bo‘lmadi', 'error');
    } finally {
      setStoppingSync(false);
    }
  };

  useEffect(() => {
    loadData();
    loadDiagnostics();
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.updateBillzSettings({
        apiUrl: apiUrl.trim(),
        apiKey: apiKeyInput.trim() || undefined,
        platformId: platformIdInput.trim() || undefined,
        centralShopId: centralShopId.trim(),
        autoSyncEnabled,
        syncIntervalMinutes: Number(syncIntervalMinutes),
        syncImages,
        syncPrices,
        syncStock,
      });

      setSettings(res.settings);
      setApiKeyInput('');
      setPlatformIdInput('');
      showToast(res.message || 'BILLZ sozlamalari muvaffaqiyatli saqlandi!', 'success');
      loadLogs();
    } catch (err: any) {
      showToast(err.message || 'Sozlamalarni saqlashda xatolik', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);

      const res = await api.testBillzConnection({
        apiUrl: apiUrl.trim(),
        apiKey: apiKeyInput.trim() || undefined,
        platformId: platformIdInput.trim() || undefined,
      });

      setTestResult(res);

      if (res.success) {
        showToast(res.message || 'BILLZ API ga muvaffaqiyatli ulandi!', 'success');
        if (settings) {
          setSettings({ ...settings, status: 'CONNECTED', lastError: undefined });
        }
      } else {
        showToast(res.message || 'BILLZ ga ulanishda xatolik', 'error');
        if (settings) {
          setSettings({ ...settings, status: 'ERROR', lastError: res.message });
        }
      }
      loadLogs();
    } catch (err: any) {
      const msg = err.message || 'Ulanishni tekshirishda xatolik yuz berdi';
      setTestResult({
        success: false,
        status: 'ERROR',
        message: msg,
        error: msg,
      });
      showToast(msg, 'error');
    } finally {
      setTestingConnection(false);
    }
  };

  // Synchronize Products
  const handleSyncProducts = async () => {
    try {
      setSyncingProducts(true);
      setLastSyncResult(null);

      const res = await api.syncBillzProducts();
      setLastSyncResult(res);

      if (res.success) {
        showToast(res.message || 'Mahsulotlar muvaffaqiyatli sinxronlandi!', 'success');
        if (onRefreshCatalog) onRefreshCatalog();
        loadData();
      } else {
        showToast(res.message || 'Sinxronizatsiyada xatolik yuz berdi', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Sinxronizatsiya jarayonida xatolik', 'error');
    } finally {
      setSyncingProducts(false);
    }
  };

  // Load Logs
  const loadLogs = async () => {
    try {
      setLoadingLogs(true);
      const lg = await api.getBillzLogs(100);
      setLogs(lg);
    } catch {
      // ignore
    } finally {
      setLoadingLogs(false);
    }
  };

  // Add Branch
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim() || !newBranchAddress.trim()) {
      showToast('Filial nomi va manzilini kiriting', 'error');
      return;
    }
    try {
      setSavingBranch(true);
      const br = await api.createBranch({
        name: newBranchName.trim(),
        billzShopId: newBranchShopId.trim() || undefined,
        address: newBranchAddress.trim(),
        phone: newBranchPhone.trim() || undefined,
        isCentral: branches.length === 0,
      });
      setBranches((prev) => [...prev, br]);
      setNewBranchName('');
      setNewBranchShopId('');
      setNewBranchAddress('');
      setNewBranchPhone('');
      setIsBranchModalOpen(false);
      showToast('Yangi filial muvaffaqiyatli qo‘shildi!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingBranch(false);
    }
  };

  // Delete Branch
  const handleDeleteBranch = async (id: string, name: string) => {
    if (!confirm(`"${name}" filialini rostdan ham o‘chirmoqchimisiz?`)) return;
    try {
      await api.deleteBranch(id);
      setBranches((prev) => prev.filter((b) => b.id !== id));
      showToast('Filial o‘chirildi', 'info');
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'SUCCESS') return l.status === 'SUCCESS';
    if (logFilter === 'FAILED') return l.status === 'FAILED' || l.status === 'PARTIAL';
    return true;
  });

  if (loading) {
    return (
      <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-400" />
        <p className="font-bold text-sm text-slate-300">BILLZ tizimi sozlamalari yuklanmoqda...</p>
      </div>
    );
  }

  const isConnected = settings?.status === 'CONNECTED';
  const isError = settings?.status === 'ERROR';

  return (
    <div className="space-y-6">
      {/* --- HERO STATUS HEADER --- */}
      <div className="bg-gradient-to-r from-[#131b2a] via-[#1a2336] to-[#131b2a] border border-slate-800 rounded-3xl p-5 sm:p-7 relative overflow-hidden shadow-2xl">
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#b38f2a] flex items-center justify-center text-black shadow-lg shadow-amber-500/20">
                <Zap className="w-6 h-6 fill-black" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    BILLZ INTEGRATSIYA
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    Birlamchi Ombor Tizimi
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400">
                  SHU BREND va BILLZ o‘rtasida mahsulotlar, narxlar, ranglar, razmerlar va qoldiqlar sinxronizatsiyasi
                </p>
              </div>
            </div>
          </div>

          {/* Status Badge & Fast Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className={`px-3.5 py-2 rounded-2xl border flex items-center gap-2 text-xs font-black transition ${
                isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : isError
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 shadow-md shadow-emerald-400/50 animate-pulse'
                    : isError
                    ? 'bg-rose-400'
                    : 'bg-amber-400'
                }`}
              />
              <span>
                {isConnected
                  ? 'BILLZ ULANGAN'
                  : isError
                  ? 'ULANISHDA XATOLIK'
                  : 'SOZLANMAGAN'}
              </span>
            </div>

            {/* Button 0: Open BILLZ Products (Product Selector) */}
            <button
              onClick={() => setActiveTab('browser')}
              className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer ${
                activeTab === 'browser'
                  ? 'gold-gradient-bg text-black shadow-amber-500/30 ring-2 ring-amber-400'
                  : 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40'
              }`}
            >
              <Package className="w-4 h-4 text-amber-400" />
              <span>📦 BILLZ MAHSULOTLARINI OCHISH</span>
            </button>

            {/* Button 0.1: Staging Items */}
            <button
              onClick={() => setActiveTab('staging')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition cursor-pointer ${
                activeTab === 'staging'
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>
                BILLZ&apos;dan Kelganlar ({settings?.stagedProductsCount ?? 0})
              </span>
            </button>

            {/* Button 0.2: Diagnostics */}
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border transition cursor-pointer ${
                activeTab === 'diagnostics'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>🩺 Diagnostika</span>
            </button>

            {/* Button 1: Test Connection */}
            <button
              onClick={handleTestConnection}
              disabled={testingConnection}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'Tekshirilmoqda...' : 'Ulanishni tekshirish'}</span>
            </button>

            {/* Button 2: Sync Products */}
            <button
              onClick={handleSyncProducts}
              disabled={syncingProducts}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 text-amber-400 ${syncingProducts ? 'animate-spin' : ''}`} />
              <span>{syncingProducts ? 'Sinxronlanmoqda...' : 'Avto-sinxronlash'}</span>
            </button>

            {/* Button 3: Stop Sync (When syncing or active) */}
            {(syncingProducts || settings?.isSyncing) && (
              <button
                onClick={handleStopSync}
                disabled={stoppingSync}
                className="px-3.5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>{stoppingSync ? 'To‘xtatilmoqda...' : 'Sinxronizatsiyani to‘xtatish'}</span>
              </button>
            )}

            {/* Button 4: View Missing Photos */}
            <button
              onClick={() => {
                setActiveTab('photos');
                setPhotosFilter('MISSING');
              }}
              className="px-3.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-rose-400" />
              <span>Rasmsiz mahsulotlar ({settings?.productsWithoutImages ?? 0})</span>
            </button>

            {/* Button 5: View Sync History / Logs */}
            <button
              onClick={() => setActiveTab('logs')}
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Tarix</span>
            </button>
          </div>
        </div>

        {/* 11 KPIs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-6 pt-5 border-t border-slate-800/80 text-xs">
          {/* 1. Auth Status */}
          <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">1. Autentifikatsiya</span>
            <span className="text-xs font-black text-amber-300 truncate block mt-0.5">
              {settings?.authStatus || 'Kutilmoqda'}
            </span>
          </div>

          {/* 2. BILLZ Synced Products */}
          <div
            onClick={() => setActiveTab('browser')}
            className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800 cursor-pointer hover:border-amber-400/40 transition"
          >
            <span className="text-[10px] font-bold text-slate-400 block uppercase">2. BILLZ tovarlari</span>
            <span className="text-sm sm:text-base font-black text-white mt-0.5 block">
              {settings?.totalSyncedProducts ?? 10300} ta
            </span>
          </div>

          {/* 3. Staging Products */}
          <div
            onClick={() => setActiveTab('staging')}
            className="bg-slate-900/60 rounded-2xl p-3 border border-amber-500/30 cursor-pointer hover:border-amber-400 transition"
          >
            <span className="text-[10px] font-bold text-amber-400 block uppercase">3. Staging (Admin)</span>
            <span className="text-sm sm:text-base font-black text-amber-300 mt-0.5 block">
              {settings?.stagedProductsCount ?? 0} ta →
            </span>
          </div>

          {/* 4. Catalog Products */}
          <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">4. Sayt katalogi</span>
            <span className="text-sm sm:text-base font-black text-emerald-400 mt-0.5 block">
              {settings?.totalCatalogProducts ?? products.length} ta
            </span>
          </div>

          {/* 5. Main Warehouse "SHU BREND" Stock */}
          <div
            onClick={() => setActiveTab('diagnostics')}
            className="bg-emerald-950/20 rounded-2xl p-3 border border-emerald-500/30 cursor-pointer hover:border-emerald-400 transition"
          >
            <span className="text-[10px] font-bold text-emerald-400 block uppercase">5. Asosiy ombor (SHU BREND)</span>
            <span className="text-sm sm:text-base font-black text-emerald-300 mt-0.5 block">
              {settings?.mainWarehouseTotalStock ?? 0} dona
            </span>
          </div>

          {/* 6. Branch "Mingbuloq" Stock */}
          <div
            onClick={() => setActiveTab('diagnostics')}
            className="bg-blue-950/20 rounded-2xl p-3 border border-blue-500/30 cursor-pointer hover:border-blue-400 transition"
          >
            <span className="text-[10px] font-bold text-blue-400 block uppercase">6. Mingbuloq filiali</span>
            <span className="text-sm sm:text-base font-black text-blue-300 mt-0.5 block">
              {settings?.branchTotalStock ?? settings?.mingbuloqTotalStock ?? 0} dona
            </span>
          </div>

          {/* 7. Products With Images */}
          <div
            onClick={() => {
              setActiveTab('photos');
              setPhotosFilter('HAS_IMAGES');
            }}
            className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800 cursor-pointer hover:border-emerald-500/40 transition"
          >
            <span className="text-[10px] font-bold text-slate-400 block uppercase">7. Rasmli tovarlar</span>
            <span className="text-sm sm:text-base font-black text-emerald-400 mt-0.5 block">
              {settings?.productsWithImages ?? 0} ta
            </span>
          </div>

          {/* 8. Products Without Images */}
          <div
            onClick={() => {
              setActiveTab('photos');
              setPhotosFilter('MISSING');
            }}
            className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800 cursor-pointer hover:border-rose-500/40 transition"
          >
            <span className="text-[10px] font-bold text-slate-400 block uppercase">8. Rasmsizlar (Yuklash)</span>
            <span className="text-sm sm:text-base font-black text-rose-400 mt-0.5 block">
              {settings?.productsWithoutImages ?? 0} ta →
            </span>
          </div>

          {/* 9. Last Sync */}
          <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">9. Oxirgi yangilanish</span>
            <span className="text-xs font-bold text-slate-200 truncate block mt-0.5">
              {settings?.lastSyncAt
                ? new Date(settings.lastSyncAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })
                : 'Bajarilmagan'}
            </span>
          </div>

          {/* 10. Auto Sync Interval */}
          <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">10. Avtomatik rejim</span>
            <span className="text-xs font-black text-emerald-300 truncate block mt-0.5">
              {settings?.autoSyncEnabled ? `Har ${settings.syncIntervalMinutes || 30}m` : 'O‘chiq'}
            </span>
          </div>

          {/* 11. Last Error / Status */}
          <div className="bg-slate-900/60 rounded-2xl p-3 border border-slate-800 sm:col-span-2">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">11. Tizim holati</span>
            <span
              className={`text-xs font-bold truncate block mt-0.5 ${
                settings?.lastError ? 'text-rose-400' : isConnected ? 'text-emerald-400' : 'text-slate-400'
              }`}
              title={settings?.lastError || 'Tizim barqaror ishlamoqda'}
            >
              {settings?.lastError || (isConnected ? 'Hammasi soz va barqaror' : 'Kalit kiritilishi kutilmoqda')}
            </span>
          </div>
        </div>
      </div>

      {/* --- TEST CONNECTION FEEDBACK BANNER (IF ACTIVE) --- */}
      {testResult && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3 transition ${
            testResult.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-1">
            <p className="font-bold">{testResult.message}</p>
            {testResult.productsFound !== undefined && (
              <p className="text-xs text-emerald-300/80">
                BILLZ katalogida topilgan tovarlar soni: <b>{testResult.productsFound} ta</b>
              </p>
            )}
            {testResult.error && (
              <p className="text-xs text-rose-300/80 font-mono bg-black/30 p-2 rounded-lg">
                Tafsilot: {testResult.error}
              </p>
            )}
          </div>
          <button
            onClick={() => setTestResult(null)}
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* --- SYNC SUCCESS FEEDBACK BANNER --- */}
      {lastSyncResult && (
        <div className="p-4 rounded-2xl border bg-amber-950/30 border-amber-500/40 text-amber-200 text-xs sm:text-sm flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-bold">{lastSyncResult.message}</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-amber-300/90 pt-1">
              <span>Yangi: <b>+{lastSyncResult.importedCount} ta</b></span>
              <span>•</span>
              <span>Yangilangan: <b>{lastSyncResult.updatedCount} ta</b></span>
              <span>•</span>
              <span>Jami katalog: <b>{lastSyncResult.totalCatalogCount} ta</b></span>
            </div>
          </div>
          <button
            onClick={() => setLastSyncResult(null)}
            className="text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* --- SUB-NAVIGATION TABS --- */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
        {[
          { id: 'browser', label: '📦 BILLZ Mahsulotlarini Ochish', desc: '10 300+ tovar tanlash' },
          { id: 'staging', label: `📥 BILLZ'dan Kelganlar (${settings?.stagedProductsCount ?? 0})`, desc: 'Tahrirlash & Saytga chiqarish' },
          { id: 'diagnostics', label: '🩺 Diagnostika & Omborlar', desc: 'SHU BREND & Mingbuloq' },
          { id: 'photos', label: `📸 Mahsulot Rasmlari (${settings?.productsWithoutImages ?? 0} rasmsiz)`, desc: 'Galereya va biriktirish' },
          { id: 'config', label: '⚙️ API Sozlamalari', desc: 'Secret Token va URL' },
          { id: 'sync', label: '🔄 Sinxronizatsiya & Jadval', desc: 'Avtomatik yangilanish' },
          { id: 'branches', label: '🏢 Filiallar & Do‘konlar', desc: 'Shop ID moslashuvi' },
          { id: 'logs', label: '📜 Tarix & Xatoliklar jurnali', desc: 'Harakatlar audit' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold transition flex flex-col items-start gap-0.5 cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-amber-400/15 text-amber-300 border border-amber-400/40 shadow-md shadow-amber-500/5'
                  : 'bg-[#131b2a] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[10px] text-slate-500 font-normal">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* --- TAB: BROWSER (PRODUCT SELECTOR) --- */}
      {activeTab === 'browser' && (
        <BillzCatalogBrowser
          onItemsStaged={() => {
            loadData();
            loadDiagnostics();
          }}
          onGoToStaging={() => setActiveTab('staging')}
          showToast={showToast}
        />
      )}

      {/* --- TAB: STAGING MANAGER --- */}
      {activeTab === 'staging' && (
        <BillzStagingManager
          onRefreshCatalog={onRefreshCatalog}
          onOpenBrowser={() => setActiveTab('browser')}
          showToast={showToast}
        />
      )}

      {/* --- TAB: DIAGNOSTICS & SYSTEM STATUS --- */}
      {activeTab === 'diagnostics' && (
        <BillzDiagnosticsPanel
          diagnostics={diagnostics}
          loading={loadingDiagnostics}
          onRefresh={() => {
            loadData();
            loadDiagnostics();
          }}
          onTestImport5={handleTestImport5}
          onSyncPublished={handleSyncPublished}
          onTestConnection={handleTestConnection}
          onIdentifyWarehouses={handleIdentifyWarehouses}
          testingImport5={testingImport5}
          syncingPublished={syncingPublished}
          testingConnection={testingConnection}
          identifyingWarehouses={identifyingWarehouses}
        />
      )}

      {/* --- TAB: PRODUCT PHOTOS MANAGER --- */}
      {activeTab === 'photos' && (
        <AdminProductPhotosManager
          products={products}
          onRefreshProducts={loadData}
          showToast={showToast}
          initialFilter={photosFilter}
        />
      )}

      {/* --- TAB 1: API CONFIGURATION --- */}
      {activeTab === 'config' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                Rasmiy BILLZ API Ulanish Parametrlari
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                BILLZ shaxsiy kabinetingizdan (Sozlamalar → Kompaniya sozlamalari → Integratsiya kalitlari) olingan Secret Tokenni kiriting.
                Barcha kalitlar backendda AES-256-GCM shifrlash orqali xavfsiz saqlanadi va brauzerga hech qachon to‘liq ko‘rsatilmaydi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* API Base URL */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>BILLZ API Base URL</span>
                  <span className="text-[10px] text-slate-500 font-normal">Standart: https://api-admin.billz.ai</span>
                </label>
                <div className="relative">
                  <Server className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    required
                    placeholder="https://api-admin.billz.ai"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition"
                  />
                </div>
              </div>

              {/* BILLZ Secret Token */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>BILLZ Secret Token</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  {settings?.hasApiKey && (
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Saqlangan ({settings.apiKeyMasked})
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={settings?.hasApiKey ? "O‘zgartirish uchun yangisini kiriting..." : "BILLZ Secret Tokenni kiriting..."}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  BILLZ kabineti: <span className="text-slate-400">Sozlamalar → Kompaniya sozlamalari → Integratsiya kalitlari</span> orqali olingan Secret Token. Tizim uni avtomatik rasmiy <code className="text-amber-300/80">/v1/auth/login</code> orqali Bearer tokenga almashtiradi.
                </p>
              </div>

              {/* Platform ID */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>Platform ID</span>
                    <span className="text-slate-500 font-normal text-[11px]">(ixtiyoriy UUID)</span>
                  </label>
                  {settings?.hasPlatformId && (
                    <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Saqlangan ({settings.platformIdMasked})
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPlatformId ? 'text' : 'password'}
                    value={platformIdInput}
                    onChange={(e) => setPlatformIdInput(e.target.value)}
                    placeholder="Standart: 7d4a4c38-dd84-4902-b744-0488b80a4c01"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPlatformId(!showPlatformId)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPlatformId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Bo‘sh qoldirilsa, avtomatik rasmiy BILLZ Platform ID (<code className="text-amber-300/80">7d4a4c38-dd84-4902-b744-0488b80a4c01</code>) ishlatiladi.
                </p>
              </div>
            </div>

            {/* Sync Options Toggles */}
            <div className="pt-4 border-t border-slate-800">
              <span className="text-xs font-bold text-slate-300 block mb-3">
                Sinxronizatsiya qilinadigan ma’lumotlar:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 cursor-pointer hover:border-slate-700 transition">
                  <input
                    type="checkbox"
                    checked={syncImages}
                    onChange={(e) => setSyncImages(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-800 border-slate-700"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">Rasmlar (Photos)</span>
                    <span className="text-[11px] text-slate-400">BILLZ rasmlarini import qilish</span>
                  </div>
                </label>

                <label className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 cursor-pointer hover:border-slate-700 transition">
                  <input
                    type="checkbox"
                    checked={syncPrices}
                    onChange={(e) => setSyncPrices(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-800 border-slate-700"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">Narxlar & Chegirma</span>
                    <span className="text-[11px] text-slate-400">Chakana narx va aksiya</span>
                  </div>
                </label>

                <label className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center gap-3 cursor-pointer hover:border-slate-700 transition">
                  <input
                    type="checkbox"
                    checked={syncStock}
                    onChange={(e) => setSyncStock(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-800 border-slate-700"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-white block">Rang & Razmer Qoldig‘i</span>
                    <span className="text-[11px] text-slate-400">Har bir variant zaxirasi</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Submit & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Barcha maxfiy kalitlar shifrlangan holatda saqlanadi</span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
                  <span>Ulanishni tekshirish</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl gold-gradient-bg text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saqlanmoqda...' : 'Sozlamalarni saqlash'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* --- TAB 2: AUTOMATIC SYNC & SCHEDULE --- */}
      {activeTab === 'sync' && (
        <div className="space-y-6">
          <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                Avtomatik Sinxronizatsiya Jadvali
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                BILLZ tizimiga yangi mahsulotlar kiritilganda yoki mavjud tovarlar narxlari va qoldiqlari o‘zgarganda, sayt avtomatik yangilanib turishi uchun jadvalni yoqing.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-sm font-bold text-white block">
                    Avtomatik fon sinxronizatsiyasi
                  </span>
                  <p className="text-xs text-slate-400">
                    Node.js backend orqali belgilangan oraliqda tovarlar katalogini avtomatik yangilash
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
                </label>
              </div>

              {autoSyncEnabled && (
                <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Sinxronizatsiya oralig‘i
                    </label>
                    <select
                      value={syncIntervalMinutes}
                      onChange={(e) => setSyncIntervalMinutes(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 transition cursor-pointer"
                    >
                      <option value={15}>Har 15 daqiqada (Tezkor)</option>
                      <option value={30}>Har 30 daqiqada</option>
                      <option value={60}>Har 1 soatda (Tavsiya etiladi)</option>
                      <option value={360}>Har 6 soatda</option>
                      <option value={1440}>Har 24 soatda (Kuniga 1 marta)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Do‘kon/Filial bo‘yicha filtr
                    </label>
                    <input
                      type="text"
                      value={centralShopId}
                      onChange={(e) => setCentralShopId(e.target.value)}
                      placeholder="Masalan: shop_tashkent_central"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 transition"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Manual Sync Trigger Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-transparent to-transparent border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-sm font-black text-white block">
                  Qo‘lda zudlik bilan sinxronlash
                </span>
                <p className="text-xs text-slate-400">
                  BILLZ dagi barcha yangilanishlarni hoziroq do‘kon katalogiga yuklab olish
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncProducts}
                disabled={syncingProducts}
                className="px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingProducts ? 'animate-spin' : ''}`} />
                <span>{syncingProducts ? 'Yuklanmoqda...' : 'Hozir yangilash'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saqlanmoqda...' : 'Jadval sozlamalarini saqlash'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 3: BRANCHES & WAREHOUSES --- */}
      {activeTab === 'branches' && (
        <div className="space-y-6">
          <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  Filiallar va BILLZ Do‘konlari (Shops)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Har bir filialni BILLZ tizimidagi tegishli Shop ID bilan bog‘lang. Saytdagi onlayn va oflayn savdolar markaziy ombordan avtomatik yechiladi.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBranchModalOpen(true)}
                className="px-4 py-2 rounded-xl gold-gradient-bg text-black text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/10 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yangi filial qo‘shish</span>
              </button>
            </div>

            {/* Branches List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition relative ${
                    branch.isCentral
                      ? 'bg-amber-500/5 border-amber-500/30'
                      : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{branch.name}</span>
                        {branch.isCentral && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                            Markaziy
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{branch.address}</p>
                    </div>

                    {!branch.isCentral && (
                      <button
                        onClick={() => handleDeleteBranch(branch.id, branch.name)}
                        className="text-slate-500 hover:text-rose-400 transition p-1 cursor-pointer"
                        title="O‘chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-amber-300">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>BILLZ Shop ID: <b>{branch.billzShopId || 'Kiritilmagan'}</b></span>
                    </div>
                    {branch.phone && (
                      <span className="text-slate-400 text-[11px]">{branch.phone}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 4: AUDIT LOGS & HISTORY --- */}
      {activeTab === 'logs' && (
        <div className="space-y-6">
          <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  Sinxronizatsiya va Xatoliklar Jurnali
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  BILLZ bilan amalga oshirilgan har bir ulanish, tovarlar importi va buyurtma uzatish harakatlari auditi
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-bold">
                  <button
                    onClick={() => setLogFilter('ALL')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      logFilter === 'ALL' ? 'bg-amber-400 text-black font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Barchasi ({logs.length})
                  </button>
                  <button
                    onClick={() => setLogFilter('SUCCESS')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      logFilter === 'SUCCESS' ? 'bg-emerald-500 text-black font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Muvaffaqiyatli
                  </button>
                  <button
                    onClick={() => setLogFilter('FAILED')}
                    className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                      logFilter === 'FAILED' ? 'bg-rose-500 text-white font-black' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Xatoliklar
                  </button>
                </div>

                <button
                  onClick={loadLogs}
                  disabled={loadingLogs}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                  title="Yangilash"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Log Items Table */}
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                Hozircha tanlangan filtr bo‘yicha yozuvlar mavjud emas.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredLogs.map((log) => {
                  const isSuccess = log.status === 'SUCCESS';
                  const isPartial = log.status === 'PARTIAL';
                  return (
                    <div
                      key={log.id}
                      className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition space-y-1.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isSuccess
                                ? 'bg-emerald-400'
                                : isPartial
                                ? 'bg-amber-400'
                                : 'bg-rose-400'
                            }`}
                          />
                          <span className="text-xs font-black uppercase tracking-wider text-white">
                            {log.type === 'TEST_CONNECTION'
                              ? '⚡ Aloqa tekshiruvi'
                              : log.type === 'IMPORT_PRODUCTS'
                              ? '📦 Tovarlar importi'
                              : log.type === 'ORDER_SYNC'
                              ? '🛍 Buyurtma uzatish'
                              : '🔄 Sinxronizatsiya'}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                              isSuccess
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : isPartial
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {log.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                          {log.durationMs !== undefined && (
                            <span>{log.durationMs} ms</span>
                          )}
                          <span>
                            {new Date(log.timestamp).toLocaleString('uz-UZ', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 pl-4">{log.details}</p>

                      {log.error && (
                        <div className="pl-4 pt-1">
                          <p className="text-[11px] font-mono text-rose-300 bg-rose-950/40 p-2 rounded-lg border border-rose-900/40 whitespace-pre-wrap">
                            {log.error}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL: CREATE BRANCH --- */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2a] border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                Yangi Filial Qo‘shish
              </h3>
              <button
                onClick={() => setIsBranchModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Filial nomi *</label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="Masalan: SHU BREND Samarqand"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">BILLZ Shop ID</label>
                <input
                  type="text"
                  value={newBranchShopId}
                  onChange={(e) => setNewBranchShopId(e.target.value)}
                  placeholder="Masalan: shop_samarkand_1"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Manzil *</label>
                <input
                  type="text"
                  required
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="Shahar, ko‘cha, uy raqami"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Telefon raqami</label>
                <input
                  type="text"
                  value={newBranchPhone}
                  onChange={(e) => setNewBranchPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={savingBranch}
                  className="px-5 py-2 rounded-xl gold-gradient-bg text-black font-black text-xs cursor-pointer disabled:opacity-50"
                >
                  {savingBranch ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
