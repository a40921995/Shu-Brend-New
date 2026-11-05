import React, { useEffect, useState, useMemo } from 'react';
import {
  Zap,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Key,
  ShieldCheck,
  Sliders,
  Sparkles,
  ExternalLink,
  Save,
  ArrowRight,
  Clock,
  Layers,
  Database,
  Search,
  AlertTriangle,
  Play,
  RotateCcw,
  Edit,
  Trash2,
  Plus,
  Upload,
  Image as ImageIcon,
  Star,
  CheckSquare,
  Square,
  Eye,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Filter,
  ArrowUpRight,
  Info,
  Calendar,
  Phone,
  User as UserIcon,
} from 'lucide-react';
import { api, formatUzbekPrice } from '../lib/api.ts';
import type {
  Category,
  N8nConfig,
  Order,
  Product,
  ProductLifecycleStatus,
  ProductVariant,
} from '../types/index.ts';

interface AdminBillzSmartManagerProps {
  onRefreshCatalog?: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

type TabType =
  | 'drafts'
  | 'editing'
  | 'ready'
  | 'published'
  | 'all_billz'
  | 'variants_inventory'
  | 'orders'
  | 'sales_history'
  | 'sync_errors'
  | 'settings';

export const AdminBillzSmartManager: React.FC<AdminBillzSmartManagerProps> = ({
  onRefreshCatalog,
  showToast,
}) => {
  // Navigation
  const [activeTab, setActiveTab] = useState<TabType>('drafts');

  // Core Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [n8nConfig, setN8nConfig] = useState<N8nConfig | null>(null);
  const [summary, setSummary] = useState<{
    totalProducts: number;
    billzImportedCount: number;
    draftsCount: number;
    editingCount: number;
    readyCount: number;
    publishedCount: number;
    archivedCount: number;
    discrepancyCount: number;
    totalOrdersCount: number;
    syncedOrdersCount: number;
    pendingOrdersCount: number;
    failedOrdersCount: number;
  } | null>(null);

  // Loading States
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Multi-Selection state
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Single Product Editor State
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editorTab, setEditorTab] = useState<'general' | 'images' | 'variants' | 'billz'>('general');

  // Image Upload helper state
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Settings tab state
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showFullApiKey, setShowFullApiKey] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [testingSync, setTestingSync] = useState(false);

  // Retrying order sync
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);

  // Fetch all data
  const loadAllData = async () => {
    try {
      setLoading(true);
      const [prodsRes, catsRes, ordersRes, configRes, summaryRes] = await Promise.all([
        api.getProducts({ includeHidden: true, status: 'ALL' }),
        api.getCategories(true),
        api.getOrders(),
        api.getN8nConfig().catch(() => null),
        api.getBillzSyncSummary().catch(() => null),
      ]);

      setProducts(prodsRes || []);
      setCategories(catsRes || []);
      setOrders(ordersRes || []);
      if (configRes) setN8nConfig(configRes);
      if (summaryRes) setSummary(summaryRes);
    } catch (err: any) {
      showToast(err.message || 'Ma‘lumotlarni yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(id);
    showToast('Nusxa olindi!', 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Filtered products based on active tab and search
  const currentTabProducts = useMemo(() => {
    let list = [...products];

    // Status filter by tab
    if (activeTab === 'drafts') {
      list = list.filter((p) => p.status === 'DRAFT' || (!p.status && p.isPublished === false));
    } else if (activeTab === 'editing') {
      list = list.filter((p) => p.status === 'EDITING');
    } else if (activeTab === 'ready') {
      list = list.filter((p) => p.status === 'READY');
    } else if (activeTab === 'published') {
      list = list.filter((p) => p.status === 'PUBLISHED' || (!p.status && p.isPublished === true));
    } else if (activeTab === 'all_billz') {
      list = list.filter((p) => p.source === 'BILLZ' || !!p.billzId);
    } else if (activeTab === 'variants_inventory') {
      // Discrepancies first, then all
      list = list.sort((a, b) => {
        const discA = Math.abs(a.stockDiscrepancy || 0);
        const discB = Math.abs(b.stockDiscrepancy || 0);
        return discB - discA;
      });
    }

    // Category filter
    if (categoryFilter !== 'ALL') {
      list = list.filter((p) => p.categorySlug === categoryFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.categoryName?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.barcode?.toLowerCase().includes(q) ||
          p.billzId?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [products, activeTab, categoryFilter, searchQuery]);

  // Bulk Actions
  const handleSelectAll = () => {
    if (selectedProductIds.length === currentTabProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(currentTabProducts.map((p) => p.id));
    }
  };

  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (targetStatus: ProductLifecycleStatus) => {
    if (selectedProductIds.length === 0) {
      showToast('Hech qanday mahsulot tanlanmadi', 'info');
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.bulkUpdateProductStatus(selectedProductIds, targetStatus);
      showToast(res.message, 'success');
      setSelectedProductIds([]);
      setIsPublishModalOpen(false);
      await loadAllData();
      if (onRefreshCatalog) onRefreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSingleStatusChange = async (productId: string, status: ProductLifecycleStatus) => {
    try {
      setActionLoading(true);
      await api.updateProductStatus(productId, status);
      showToast(`Mahsulot holati "${status}" ga o‘tkazildi`, 'success');
      await loadAllData();
      if (onRefreshCatalog) onRefreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Holatni o‘zgartirishda xatolik', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Product Editor
  const openEditor = (product: Product) => {
    // Clone product to avoid direct mutation
    const copy: Product = JSON.parse(JSON.stringify(product));
    if (!copy.colors || copy.colors.length === 0) copy.colors = ['Qora'];
    if (!copy.sizes || copy.sizes.length === 0) copy.sizes = ['S', 'M', 'L', 'XL'];
    if (!copy.variants || copy.variants.length === 0) {
      copy.variants = [];
      for (const c of copy.colors) {
        for (const s of copy.sizes) {
          copy.variants.push({
            id: `${c}_${s}`,
            color: c,
            size: s,
            stock: Math.floor(copy.stock / (copy.colors.length * copy.sizes.length)) || 0,
          });
        }
      }
    }
    setEditingProduct(copy);
    setEditorTab('general');
    setIsEditorOpen(true);
  };

  // Save from Editor
  const saveEditedProduct = async () => {
    if (!editingProduct) return;
    try {
      setActionLoading(true);

      // Recompute total stock from variants
      const totalVariantsStock = (editingProduct.variants || []).reduce(
        (sum, v) => sum + (Number(v.stock) || 0),
        0
      );

      const billzStock = editingProduct.billzReportedStock !== undefined
        ? editingProduct.billzReportedStock
        : (editingProduct.stock || 0);

      const discrepancy = totalVariantsStock - billzStock;

      const payload: Partial<Product> = {
        ...editingProduct,
        stock: totalVariantsStock,
        billzReportedStock: billzStock,
        stockDiscrepancy: discrepancy,
      };

      const updated = await api.updateProduct(editingProduct.id, payload);
      showToast(`"${updated.name}" muvaffaqiyatli saqlandi!`, 'success');
      setIsEditorOpen(false);
      setEditingProduct(null);
      await loadAllData();
      if (onRefreshCatalog) onRefreshCatalog();
    } catch (err: any) {
      showToast(err.message || 'Mahsulotni saqlashda xatolik', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Image helpers in Editor
  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim() || !editingProduct) return;
    const cleanUrl = imageUrlInput.trim();
    setEditingProduct({
      ...editingProduct,
      images: [...editingProduct.images, cleanUrl],
      hasCustomImages: true,
    });
    setImageUrlInput('');
    showToast('Rasm muvaffaqiyatli qo‘shildi', 'success');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !editingProduct) return;

    try {
      setUploadingImage(true);
      const uploadedUrls = await api.uploadMultipleFiles(files);
      if (uploadedUrls.length > 0) {
        setEditingProduct({
          ...editingProduct,
          images: [...editingProduct.images, ...uploadedUrls],
          hasCustomImages: true,
        });
        showToast(`${uploadedUrls.length} ta rasm muvaffaqiyatli yuklandi!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Rasm yuklashda xatolik', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const setCoverImage = (index: number) => {
    if (!editingProduct) return;
    const images = [...editingProduct.images];
    const [selected] = images.splice(index, 1);
    images.unshift(selected);
    setEditingProduct({
      ...editingProduct,
      images,
      hasCustomImages: true,
    });
    showToast('Asosiy muqova rasmi o‘zgartirildi', 'info');
  };

  const removeImage = (index: number) => {
    if (!editingProduct) return;
    if (editingProduct.images.length <= 1) {
      showToast('Mahsulotda kamida bitta rasm bo‘lishi kerak', 'error');
      return;
    }
    const images = [...editingProduct.images];
    images.splice(index, 1);
    setEditingProduct({
      ...editingProduct,
      images,
      hasCustomImages: true,
    });
  };

  // Variant size helpers in Editor
  const updateVariantStock = (color: string, size: string, newStock: number) => {
    if (!editingProduct) return;
    const cleanStock = Math.max(0, Number(newStock) || 0);
    const variants = [...(editingProduct.variants || [])];
    const idx = variants.findIndex(
      (v) =>
        v.color.trim().toLowerCase() === color.trim().toLowerCase() &&
        v.size.trim().toLowerCase() === size.trim().toLowerCase()
    );

    if (idx >= 0) {
      variants[idx] = { ...variants[idx], stock: cleanStock };
    } else {
      variants.push({
        id: `${color}_${size}`,
        color,
        size,
        stock: cleanStock,
      });
    }

    setEditingProduct({
      ...editingProduct,
      variants,
    });
  };

  const addCustomSize = (newSize: string) => {
    if (!newSize.trim() || !editingProduct) return;
    const size = newSize.trim().toUpperCase();
    if (editingProduct.sizes.includes(size)) {
      showToast('Ushbu razmer allaqachon mavjud', 'info');
      return;
    }
    const sizes = [...editingProduct.sizes, size];
    const variants = [...(editingProduct.variants || [])];
    for (const c of editingProduct.colors) {
      variants.push({
        id: `${c}_${size}`,
        color: c,
        size,
        stock: 0,
      });
    }
    setEditingProduct({
      ...editingProduct,
      sizes,
      variants,
    });
    showToast(`"${size}" razmeri qo‘shildi`, 'success');
  };

  const removeCustomSize = (sizeToRemove: string) => {
    if (!editingProduct) return;
    if (editingProduct.sizes.length <= 1) {
      showToast('Kamida bitta razmer qolishi shart', 'error');
      return;
    }
    const sizes = editingProduct.sizes.filter((s) => s !== sizeToRemove);
    const variants = (editingProduct.variants || []).filter((v) => v.size !== sizeToRemove);
    setEditingProduct({
      ...editingProduct,
      sizes,
      variants,
    });
    showToast(`"${sizeToRemove}" razmeri olib tashlandi`, 'info');
  };

  // Retry BILLZ Sales sync for an order
  const handleRetryOrderSync = async (orderId: string) => {
    try {
      setRetryingOrderId(orderId);
      const res = await api.retryBillzOrderSync(orderId);
      showToast(res.message || 'Sotuv sinxronlandi', 'success');
      await loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Sinxronlashda xatolik', 'error');
    } finally {
      setRetryingOrderId(null);
    }
  };

  // Calculate live variant sum in Editor
  const editorVariantTotal = useMemo(() => {
    if (!editingProduct || !editingProduct.variants) return 0;
    return editingProduct.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  }, [editingProduct]);

  const editorBillzStock = editingProduct?.billzReportedStock !== undefined
    ? editingProduct.billzReportedStock
    : (editingProduct?.stock || 0);

  const editorDiscrepancy = editorVariantTotal - editorBillzStock;

  return (
    <div className="space-y-6 animate-fade-in text-white pb-12">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 border border-[#d4af37]/30 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-[#d4af37]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-gradient-to-br from-[#d4af37] to-[#aa8010] text-black shadow-lg shadow-[#d4af37]/20">
                <Zap className="w-6 h-6 fill-current" />
              </span>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-wide text-white flex items-center gap-2">
                  BILLZ & n8n SMART INVENTORY & PRODUCT CENTER
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Avtomatlashgan Tizim
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  BILLZ’dan n8n orqali kelgan tovarlar qoralama sifatida saqlanadi. Razmerlarni erkin taqsimlang va saytga faqat tasdiqlangan mahsulotlarni chiqaring.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-[#d4af37]/40 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#d4af37]' : ''}`} />
              <span>Yangilash</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#b89025] hover:brightness-110 text-black font-extrabold text-xs transition shadow-lg shadow-[#d4af37]/20 flex items-center gap-2 cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>Webhook & Kalit</span>
            </button>
          </div>
        </div>

        {/* 2. Top Metric KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div
            onClick={() => setActiveTab('drafts')}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/30 hover:border-amber-400/60 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Qoralamalar</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {summary ? summary.draftsCount : '...'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tasdiqlash kutilmoqda</div>
          </div>

          <div
            onClick={() => setActiveTab('editing')}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-500/30 hover:border-purple-400/60 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Tahrirlanmoqda</span>
              <span className="w-2 h-2 rounded-full bg-purple-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {summary ? summary.editingCount : '...'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Razmer yoki rasm kiritilmoqda</div>
          </div>

          <div
            onClick={() => setActiveTab('ready')}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-blue-500/30 hover:border-blue-400/60 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Chiqarishga Tayyor</span>
              <span className="w-2 h-2 rounded-full bg-blue-400" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {summary ? summary.readyCount : '...'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Barcha razmerlar tayyor</div>
          </div>

          <div
            onClick={() => setActiveTab('published')}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 hover:border-emerald-400/60 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Saytda Faol</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {summary ? summary.publishedCount : '...'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Mijozlarga ko‘rinmoqda</div>
          </div>

          <div
            onClick={() => setActiveTab('variants_inventory')}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-rose-500/30 hover:border-rose-400/60 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Nomutanosiblik</span>
              {summary && summary.discrepancyCount > 0 ? (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  Farq bor
                </span>
              ) : (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </div>
            <div className="text-2xl font-black text-rose-400 mt-1">
              {summary ? summary.discrepancyCount : '0'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Razmer yig‘indisi farqi</div>
          </div>

          <div
            onClick={() => setActiveTab('orders')}
            className="p-3.5 rounded-2xl bg-slate-900/80 border border-[#d4af37]/30 hover:border-[#d4af37]/60 transition cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#d4af37] uppercase tracking-wider">Buyurtmalar</span>
              <ShoppingBag className="w-3.5 h-3.5 text-[#d4af37]" />
            </div>
            <div className="text-2xl font-black text-white mt-1">
              {summary ? summary.totalOrdersCount : '0'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {summary ? `${summary.syncedOrdersCount} ta BILLZga bordi` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Tab Navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('drafts')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'drafts'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>📥 Qoralamalar (Draft)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/30 text-amber-200">
            {summary ? summary.draftsCount : 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('editing')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'editing'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>✍️ Tahrirlanmoqda</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-purple-500/30 text-purple-200">
            {summary ? summary.editingCount : 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ready')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'ready'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>🚀 Chiqarishga Tayyor</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-500/30 text-blue-200">
            {summary ? summary.readyCount : 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('published')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'published'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>🟢 Saytda Faol</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/30 text-emerald-200">
            {summary ? summary.publishedCount : 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all_billz')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'all_billz'
              ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>📦 Barcha BILLZ Tovarlari</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {summary ? summary.billzImportedCount : 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('variants_inventory')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'variants_inventory'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>⚖️ Razmer & Ombor Farqlari</span>
          {summary && summary.discrepancyCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/30 text-rose-200 font-black">
              {summary.discrepancyCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>🛒 Saytdagi Sotuvlar & BILLZ</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('sync_errors')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'sync_errors'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>⚠️ Sinxronlash Xatolari</span>
          {summary && summary.failedOrdersCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500/30 text-rose-200 font-black">
              {summary.failedOrdersCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-[#d4af37]/20 text-[#d4af37] border border-[#d4af37]/40 shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <span>⚙️ Sozlamalar & n8n</span>
        </button>
      </div>

      {/* 4. Filter Bar & Bulk Actions (for product listing tabs) */}
      {activeTab !== 'settings' && activeTab !== 'orders' && activeTab !== 'sales_history' && activeTab !== 'sync_errors' && (
        <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Nomi, SKU, Shtrix-kod yoki BILLZ ID orqali qidiring..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37] shrink-0"
            >
              <option value="ALL">Barcha kategoriyalar</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Bulk Operations Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSelectAll}
              className="px-3 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              {selectedProductIds.length > 0 && selectedProductIds.length === currentTabProducts.length ? (
                <CheckSquare className="w-4 h-4 text-[#d4af37]" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span>
                {selectedProductIds.length > 0
                  ? `Tanlandi (${selectedProductIds.length})`
                  : 'Barchasini tanlash'}
              </span>
            </button>

            {selectedProductIds.length > 0 && (
              <>
                <button
                  onClick={() => setIsPublishModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs transition shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SAYTGA CHIQARISH</span>
                </button>

                <button
                  onClick={() => handleBulkStatusChange('DRAFT')}
                  className="px-3 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 font-bold text-xs transition cursor-pointer"
                >
                  Qoralamaga qaytarish
                </button>

                <button
                  onClick={() => handleBulkStatusChange('ARCHIVED')}
                  className="px-3 py-2 rounded-xl bg-rose-900/30 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 font-bold text-xs transition cursor-pointer"
                >
                  Arxivlash
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 5. Main Content: Products Grid / Table */}
      {activeTab !== 'settings' && activeTab !== 'orders' && activeTab !== 'sales_history' && activeTab !== 'sync_errors' && (
        <div>
          {currentTabProducts.length === 0 ? (
            <div className="bg-slate-900/50 rounded-2xl p-12 text-center border border-slate-800">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                <Database className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white">Bu bo‘limda mahsulotlar topilmadi</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                n8n orqali BILLZ mahsulotlari yuborilganda ular avtomatik ravishda bu yerga tushadi.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentTabProducts.map((p) => {
                const isSelected = selectedProductIds.includes(p.id);
                const hasDiscrepancy = (p.stockDiscrepancy || 0) !== 0;

                return (
                  <div
                    key={p.id}
                    className={`relative rounded-2xl border p-4 transition-all ${
                      isSelected
                        ? 'bg-slate-900/90 border-[#d4af37] ring-1 ring-[#d4af37]/40 shadow-xl'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Card Top: Checkbox, Status badge & Image */}
                    <div className="flex gap-3">
                      <div className="relative w-20 h-24 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                        <img
                          src={p.images[0] || '/banners/hero-banner-1.png'}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                        {p.hasCustomImages && (
                          <div
                            className="absolute top-1 left-1 bg-amber-500 text-black text-[8px] font-black px-1 rounded shadow"
                            title="Admin studiya rasmlari himoyalangan"
                          >
                            STUDIO
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <button
                            onClick={() => toggleSelectProduct(p.id)}
                            className="text-slate-400 hover:text-white cursor-pointer mt-0.5"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#d4af37]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex items-center gap-1">
                            {p.status === 'PUBLISHED' ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                SAYTDA FAOL
                              </span>
                            ) : p.status === 'READY' ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                TAYYOR
                              </span>
                            ) : p.status === 'EDITING' ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                TAHRIRLANMOQDA
                              </span>
                            ) : p.status === 'ARCHIVED' ? (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                                ARXIV
                              </span>
                            ) : (
                              <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                QORALAMA
                              </span>
                            )}
                          </div>
                        </div>

                        <h4 className="text-xs font-bold text-white truncate mt-1" title={p.name}>
                          {p.name}
                        </h4>

                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="text-[#d4af37] font-semibold">{p.categoryName}</span>
                          {p.sku && <span>SKU: {p.sku}</span>}
                        </div>

                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-xs font-black text-white">
                            {formatUzbekPrice(p.price)}
                          </span>
                          {p.costPrice && p.costPrice > 0 && (
                            <span className="text-[10px] text-slate-400">
                              Tannarx: {formatUzbekPrice(p.costPrice)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stock & Discrepancy indicator */}
                    <div className="mt-3 pt-3 border-t border-slate-800/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between text-slate-300">
                        <span>Saytdagi jami qoldiq:</span>
                        <strong className="text-white font-bold">{p.stock} dona</strong>
                      </div>

                      {p.billzReportedStock !== undefined && (
                        <div className="flex items-center justify-between text-slate-400 text-[10px]">
                          <span>BILLZ ombor qoldig‘i:</span>
                          <span>{p.billzReportedStock} dona</span>
                        </div>
                      )}

                      {hasDiscrepancy && (
                        <div className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-[10px] flex items-center gap-1.5 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>
                            Farq: {p.stockDiscrepancy! > 0 ? `+${p.stockDiscrepancy}` : p.stockDiscrepancy} ta (BILLZ bilan mos emas)
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Size pills preview */}
                    {p.variants && p.variants.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {p.variants.slice(0, 6).map((v) => (
                          <span
                            key={v.id || `${v.color}_${v.size}`}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                              v.stock > 0
                                ? 'bg-slate-950 text-slate-300 border border-slate-800'
                                : 'bg-rose-950/40 text-rose-400 border border-rose-900/40'
                            }`}
                          >
                            {v.size}: {v.stock}
                          </span>
                        ))}
                        {p.variants.length > 6 && (
                          <span className="text-[9px] text-slate-500 self-center">
                            +{p.variants.length - 6}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions footer */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => openEditor(p)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-[#d4af37]" />
                        <span>Tahrirlash</span>
                      </button>

                      <div className="flex items-center gap-1">
                        {p.status !== 'PUBLISHED' ? (
                          <button
                            onClick={() => handleSingleStatusChange(p.id, 'PUBLISHED')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Chiqarish</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleSingleStatusChange(p.id, 'DRAFT')}
                            className="px-2.5 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 text-xs font-bold transition cursor-pointer"
                            title="Qoralamaga qaytarish"
                          >
                            Qoralama
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. ORDERS & BILLZ SALES SYNC TAB */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#d4af37]" />
              <span>Saytdagi Buyurtmalar va BILLZ Sotuv Sinxronizatsiyasi</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Mijoz saytdan xarid qilganda tanlangan razmer qoldig‘i darhol kamayadi va BILLZ tizimiga yuboriladi.
            </p>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-3 px-3">Buyurtma №</th>
                    <th className="py-3 px-3">Mijoz</th>
                    <th className="py-3 px-3">Tovarlar & Razmerlar</th>
                    <th className="py-3 px-3">Summa</th>
                    <th className="py-3 px-3">To‘lov / Holat</th>
                    <th className="py-3 px-3">BILLZ Sinxronlash</th>
                    <th className="py-3 px-3 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {orders.map((ord) => {
                    const isSynced = ord.billzSaleId && !ord.billzSaleId.startsWith('billz_pending_');
                    const isPending = !ord.billzSaleId || ord.billzSaleId.startsWith('billz_pending_');

                    return (
                      <tr key={ord.id} className="hover:bg-slate-800/30">
                        <td className="py-3.5 px-3 font-mono font-bold text-[#d4af37]">
                          {ord.orderNumber}
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-bold text-white">{ord.customerName}</div>
                          <div className="text-[10px] text-slate-400">{ord.customerPhone}</div>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="space-y-1">
                            {ord.items.map((it) => (
                              <div key={it.id} className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-200">{it.productName}</span>
                                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-[#d4af37] font-bold">
                                  {it.size}
                                </span>
                                <span className="text-[10px] text-slate-400">({it.color})</span>
                                <span className="text-[10px] text-white font-bold">×{it.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-3 font-bold text-white">
                          {formatUzbekPrice(ord.total)}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            ord.paymentStatus === 'TOLANDI'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {ord.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          {isSynced ? (
                            <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Sinxronlandi</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Navbatda (Lokal ayirildi)</span>
                            </div>
                          )}
                          {ord.billzSaleId && (
                            <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                              ID: {ord.billzSaleId}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={() => handleRetryOrderSync(ord.id)}
                            disabled={retryingOrderId === ord.id}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition cursor-pointer"
                          >
                            {retryingOrderId === ord.id ? 'Yuborilmoqda...' : 'Qayta sinxronlash'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 7. SYNC ERRORS TAB */}
      {activeTab === 'sync_errors' && (
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <span>Sinxronlash Xatolari va Qayta Yuborish Navbati</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Tarmoq yoki BILLZ API javob bermagan holatlarda xaridlar bekor qilinmaydi, mahalliy ombordan xavfsiz ayirilib, bu yerda saqlanadi.
            </p>

            {orders.filter((o) => !o.billzSaleId || o.billzSaleId.startsWith('billz_pending_')).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs mt-6 bg-slate-950/40 rounded-xl border border-slate-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <span>Hech qanday xato yoki kutilayotgan sotuv mavjud emas. Barcha buyurtmalar sinxron holatda!</span>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {orders
                  .filter((o) => !o.billzSaleId || o.billzSaleId.startsWith('billz_pending_'))
                  .map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-xl bg-slate-950 border border-rose-900/40 flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2 font-bold text-white text-xs">
                          <span className="text-[#d4af37] font-mono">{ord.orderNumber}</span>
                          <span>— {ord.customerName} ({ord.customerPhone})</span>
                          <span className="text-[10px] text-rose-400 bg-rose-500/20 px-2 py-0.5 rounded">
                            BILLZ kutmoqda
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          Jami: {formatUzbekPrice(ord.total)} | Tovarlar: {ord.items.map((i) => `${i.productName} (${i.size}) ×${i.quantity}`).join(', ')}
                        </div>
                      </div>

                      <button
                        onClick={() => handleRetryOrderSync(ord.id)}
                        disabled={retryingOrderId === ord.id}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa8010] text-black font-extrabold text-xs transition cursor-pointer shrink-0"
                      >
                        {retryingOrderId === ord.id ? 'Yuborilmoqda...' : 'BILLZga Qayta Yuborish'}
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. SETTINGS & N8N WEBHOOK TAB */}
      {activeTab === 'settings' && n8nConfig && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-[#d4af37]" />
              <span>n8n Webhook Manzillari va Autentifikatsiya</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              n8n workflow’ida ushbu URL va X-API-KEY dan foydalaning.
            </p>

            <div className="mt-6 space-y-4">
              {/* API Key Box */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">X-API-KEY (Maxfiy Kirish Kaliti):</span>
                  <button
                    onClick={() => setShowFullApiKey(!showFullApiKey)}
                    className="text-[11px] text-[#d4af37] hover:underline"
                  >
                    {showFullApiKey ? 'Yashirish' : 'To‘liq ko‘rsatish'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-900 px-3 py-2 rounded-xl text-xs font-mono text-amber-300 border border-slate-800 truncate">
                    {showFullApiKey ? n8nConfig.apiKey : n8nConfig.apiKeyMasked}
                  </code>
                  <button
                    onClick={() => copyToClipboard(n8nConfig.apiKey, 'apiKey')}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                    title="Nusxa olish"
                  >
                    {copiedField === 'apiKey' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Bulk Webhook URL */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  1. Ommaviy mahsulotlar Webhooki (Bulk POST):
                </span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-900 px-3 py-2 rounded-xl text-xs font-mono text-emerald-400 border border-slate-800 truncate">
                    {n8nConfig.webhookUrlBulk}
                  </code>
                  <button
                    onClick={() => copyToClipboard(n8nConfig.webhookUrlBulk, 'urlBulk')}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  >
                    {copiedField === 'urlBulk' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Single Webhook URL */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  2. Yagona mahsulot Webhooki (Single POST):
                </span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-slate-900 px-3 py-2 rounded-xl text-xs font-mono text-blue-400 border border-slate-800 truncate">
                    {n8nConfig.webhookUrlSingle}
                  </code>
                  <button
                    onClick={() => copyToClipboard(n8nConfig.webhookUrlSingle, 'urlSingle')}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  >
                    {copiedField === 'urlSingle' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 9. PRODUCT EDITOR MODAL */}
      {isEditorOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-[#d4af37]/40 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <span>Mahsulotni Tahrirlash:</span>
                  <span className="text-[#d4af37] truncate max-w-xs">{editingProduct.name}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  BILLZ ID: {editingProduct.billzId || 'Mavjud emas'} | SKU: {editingProduct.sku || 'N/A'}
                </p>
              </div>

              <button
                onClick={() => setIsEditorOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/50">
              <button
                onClick={() => setEditorTab('general')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  editorTab === 'general'
                    ? 'border-[#d4af37] text-[#d4af37]'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                1. Asosiy Ma’lumotlar & Narx
              </button>
              <button
                onClick={() => setEditorTab('images')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  editorTab === 'images'
                    ? 'border-[#d4af37] text-[#d4af37]'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                2. Rasmlar Galereyasi ({editingProduct.images.length})
              </button>
              <button
                onClick={() => setEditorTab('variants')}
                className={`py-2 px-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  editorTab === 'variants'
                    ? 'border-[#d4af37] text-[#d4af37]'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                3. Razmerlar & Alohida Qoldiq ({editingProduct.sizes.length} ta)
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Tab 1: General Info */}
              {editorTab === 'general' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Mahsulot Nomi *
                    </label>
                    <input
                      type="text"
                      value={editingProduct.name}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, name: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Kategoriya
                      </label>
                      <select
                        value={editingProduct.categorySlug}
                        onChange={(e) => {
                          const cat = categories.find((c) => c.slug === e.target.value);
                          setEditingProduct({
                            ...editingProduct,
                            categorySlug: e.target.value,
                            categoryName: cat ? cat.name : editingProduct.categoryName,
                          });
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                      >
                        {categories.map((c) => (
                          <option key={c.id} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Holat (Status)
                      </label>
                      <select
                        value={editingProduct.status || 'DRAFT'}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            status: e.target.value as ProductLifecycleStatus,
                            isPublished: e.target.value === 'PUBLISHED',
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                      >
                        <option value="DRAFT">Qoralama (DRAFT) — Saytda ko‘rinmaydi</option>
                        <option value="EDITING">Tahrirlanmoqda (EDITING)</option>
                        <option value="READY">Chiqarishga tayyor (READY)</option>
                        <option value="PUBLISHED">Saytda faol (PUBLISHED) — Xaridorlar ko‘radi</option>
                        <option value="ARCHIVED">Arxivlangan (ARCHIVED)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Sotish Narxi (so‘m) *
                      </label>
                      <input
                        type="number"
                        value={editingProduct.price}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            price: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Chegirma Narxi (so‘m)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.discountPrice || ''}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            discountPrice: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        placeholder="Ixtiyoriy"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        Tannarxi (so‘m)
                      </label>
                      <input
                        type="number"
                        value={editingProduct.costPrice || ''}
                        onChange={(e) =>
                          setEditingProduct({
                            ...editingProduct,
                            costPrice: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        placeholder="BILLZ tannarxi"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Mahsulot Tavsifi (Description)
                    </label>
                    <textarea
                      rows={4}
                      value={editingProduct.description || ''}
                      onChange={(e) =>
                        setEditingProduct({ ...editingProduct, description: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                      placeholder="Mato tarkibi, tikilishi va o‘ziga xos xususiyatlari..."
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Images Management */}
              {editorTab === 'images' && (
                <div className="space-y-6">
                  {/* Upload Controls */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                    <span className="text-xs font-bold text-white block">Yangi rasm yuklash:</span>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label className="flex-1 border-2 border-dashed border-slate-700 hover:border-[#d4af37] rounded-xl p-4 text-center cursor-pointer transition flex items-center justify-center gap-2">
                        <Upload className="w-4 h-4 text-[#d4af37]" />
                        <span className="text-xs text-slate-300 font-bold">
                          {uploadingImage ? 'Yuklanmoqda...' : 'Kompyuter / Telefondan rasm tanlash'}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                      </label>

                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          placeholder="Yoki to‘g‘ridan-to‘g‘ri rasm URL manzilini kiriting..."
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                        />
                        <button
                          onClick={handleAddImageUrl}
                          className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition cursor-pointer"
                        >
                          Qo‘shish
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Images Gallery list */}
                  <div>
                    <span className="text-xs font-bold text-slate-300 block mb-3">
                      Yuklangan rasmlar (⭐ belgisini bosib asosiy muqova qiling):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {editingProduct.images.map((img, idx) => (
                        <div
                          key={idx}
                          className={`relative rounded-2xl overflow-hidden border-2 bg-slate-950 aspect-[3/4] group ${
                            idx === 0 ? 'border-[#d4af37] ring-2 ring-[#d4af37]/30' : 'border-slate-800'
                          }`}
                        >
                          <img src={img} alt="" className="w-full h-full object-cover" />

                          {idx === 0 && (
                            <div className="absolute top-2 left-2 bg-[#d4af37] text-black font-black text-[9px] px-2 py-0.5 rounded shadow">
                              ASOSIY MUQOVA
                            </div>
                          )}

                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                            {idx !== 0 && (
                              <button
                                onClick={() => setCoverImage(idx)}
                                className="p-2 rounded-xl bg-[#d4af37] text-black hover:scale-110 transition cursor-pointer"
                                title="Asosiy muqova qilish"
                              >
                                <Star className="w-4 h-4 fill-current" />
                              </button>
                            )}

                            <button
                              onClick={() => removeImage(idx)}
                              className="p-2 rounded-xl bg-rose-600 text-white hover:scale-110 transition cursor-pointer"
                              title="O‘chirish"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Sizes & Discrepancy Manager */}
              {editorTab === 'variants' && (
                <div className="space-y-6">
                  {/* Summary Comparison Alert */}
                  <div
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                      editorDiscrepancy === 0
                        ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                        : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 font-bold text-sm">
                        {editorDiscrepancy === 0 ? (
                          <>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <span>Qoldiqlar mukammal mos keldi!</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-5 h-5 text-rose-400" />
                            <span>
                              Diqqat: Razmerlar yig‘indisi ({editorVariantTotal} ta) BILLZ omboridagi qoldiq ({editorBillzStock} ta) bilan mos kelmadi!
                            </span>
                          </>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        Siz kiritgan razmerlar jami: <strong className="text-white">{editorVariantTotal} dona</strong>. BILLZ ma’lumotidagi umumiy qoldiq: <strong className="text-white">{editorBillzStock} dona</strong>.
                        {editorDiscrepancy !== 0 && ` (Farq: ${editorDiscrepancy > 0 ? `+${editorDiscrepancy}` : editorDiscrepancy} ta)`}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Jami Zaxira</span>
                      <span className="text-xl font-black text-white">{editorVariantTotal} dona</span>
                    </div>
                  </div>

                  {/* Add New Size */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-300 shrink-0">Yangi razmer qo‘shish:</span>
                    <input
                      type="text"
                      id="customSizeInput"
                      placeholder="Masalan: 3XL, 4XL, 56..."
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                    />
                    <button
                      onClick={() => {
                        const el = document.getElementById('customSizeInput') as HTMLInputElement;
                        if (el && el.value) {
                          addCustomSize(el.value);
                          el.value = '';
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-[#d4af37] transition cursor-pointer"
                    >
                      + Qo‘shish
                    </button>
                  </div>

                  {/* Matrix of Sizes and Stocks */}
                  <div className="space-y-4">
                    {editingProduct.colors.map((color) => (
                      <div key={color} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#d4af37]">
                            Rang: <strong className="text-white">{color}</strong>
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {editingProduct.sizes.map((sz) => {
                            const variant = editingProduct.variants?.find(
                              (v) =>
                                v.color.trim().toLowerCase() === color.trim().toLowerCase() &&
                                v.size.trim().toLowerCase() === sz.trim().toLowerCase()
                            );
                            const szStock = variant ? variant.stock : 0;

                            return (
                              <div
                                key={sz}
                                className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-bold text-white text-xs">{sz}</span>
                                  <button
                                    onClick={() => removeCustomSize(sz)}
                                    className="text-slate-500 hover:text-rose-400 text-[10px]"
                                    title="Razmerni o‘chirish"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div className="flex items-center gap-1.5 mt-2">
                                  <input
                                    type="number"
                                    min="0"
                                    value={szStock}
                                    onChange={(e) => updateVariantStock(color, sz, Number(e.target.value))}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold text-center focus:outline-none focus:border-[#d4af37]"
                                  />
                                  <span className="text-[10px] text-slate-400">ta</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                onClick={() => setIsEditorOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Bekor qilish
              </button>

              <button
                onClick={saveEditedProduct}
                disabled={actionLoading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#aa8010] hover:brightness-110 text-black font-extrabold text-xs transition shadow-lg shadow-[#d4af37]/20 flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{actionLoading ? 'Saqlanmoqda...' : 'O‘zgarishlarni Saqlash'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. PUBLISH CONFIRMATION MODAL */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scale-up space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white text-center">
              Tanlangan {selectedProductIds.length} ta mahsulotni saytga chiqarilsinmi?
            </h3>

            <p className="text-xs text-slate-300 text-center leading-relaxed">
              Tasdiqlangandan so‘ng ushbu mahsulotlar SHU BREND internet-do‘koni katalogida barcha mijozlarga faol ko‘rinadi.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => handleBulkStatusChange('PUBLISHED')}
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                {actionLoading ? 'Chiqarilmoqda...' : 'HA, SAYTGA CHIQARISH'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
