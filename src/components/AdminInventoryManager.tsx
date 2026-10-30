import React, { useEffect, useState } from 'react';
import {
  Package,
  TrendingUp,
  Search,
  Plus,
  Minus,
  RefreshCw,
  AlertTriangle,
  XCircle,
  CheckCircle,
  History,
  RotateCcw,
  Sliders,
  DollarSign,
  Shirt,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  Edit2,
  Check,
  ChevronDown,
  ChevronUp,
  Folder,
  X,
} from 'lucide-react';
import { api, formatUzbekPrice } from '../lib/api.ts';
import type { Category, InventoryLog, Product, ProductVariant, WarehouseStats } from '../types/index.ts';

interface AdminInventoryManagerProps {
  products: Product[];
  categories?: Category[];
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminInventoryManager: React.FC<AdminInventoryManagerProps> = ({
  products,
  categories,
  onRefresh,
  showToast,
}) => {
  const [stats, setStats] = useState<WarehouseStats | null>(null);
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Category[]>(categories || []);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'AVAILABLE'>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'warehouse' | 'history' | 'analytics'>('warehouse');

  // Collapsible cards: all cards start closed / collapsed by default
  const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

  // Direct editing of variant stock
  const [editingVariantKey, setEditingVariantKey] = useState<string | null>(null);
  const [editStockValue, setEditStockValue] = useState<string>('');

  // Add new variant modal
  const [addVariantProduct, setAddVariantProduct] = useState<Product | null>(null);
  const [newVariantColor, setNewVariantColor] = useState('');
  const [newVariantSize, setNewVariantSize] = useState('');
  const [newVariantStock, setNewVariantStock] = useState('10');
  const [isSubmittingVariant, setIsSubmittingVariant] = useState(false);

  // Load stats, movement logs and categories
  const loadInventoryData = async () => {
    try {
      setLoading(true);
      const [s, l, cats] = await Promise.all([
        api.getInventoryStats().catch(() => null),
        api.getInventoryLogs(100).catch(() => []),
        api.getCategories(true).catch(() => []),
      ]);
      setStats(s);
      setLogs(l);
      if (cats && cats.length > 0) {
        setAvailableCategories(cats.filter((c: Category) => c.slug !== 'all'));
      }
    } catch (err: any) {
      console.error('Ombor ma‘lumotlarini yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (categories && categories.length > 0) {
      setAvailableCategories(categories.filter((c) => c.slug !== 'all'));
    }
  }, [categories]);

  useEffect(() => {
    loadInventoryData();
  }, []);

  // Handle single tap Offline Sale (-1)
  const handleOfflineSale = async (product: Product, color: string, size: string, currentStock: number) => {
    if (currentStock <= 0) {
      showToast(`${product.name} (${color}, ${size}) omborda tugagan!`, 'error');
      return;
    }

    const key = `${product.id}_${color}_${size}_minus`;
    setActionLoadingId(key);
    try {
      await api.adjustInventoryStock({
        productId: product.id,
        color,
        size,
        delta: -1,
        type: 'OFFLINE_SALE',
        price: product.price,
        note: 'Do‘konda oflayn sotuv',
      });
      showToast(`Oflayn sotuv: ${product.name} (${color}, ${size}) -1 ta (${currentStock - 1} ta qoldi)`, 'success');
      onRefresh();
      loadInventoryData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Handle Restock (+1 or bulk +10, +20)
  const handleRestock = async (product: Product, color: string, size: string, count: number) => {
    const key = `${product.id}_${color}_${size}_plus_${count}`;
    setActionLoadingId(key);
    try {
      await api.adjustInventoryStock({
        productId: product.id,
        color,
        size,
        delta: count,
        type: 'RESTOCK',
        note: `Omborga +${count} ta qabul qilindi`,
      });
      showToast(`Omborga qo‘shildi: ${product.name} (${color}, ${size}) +${count} ta`, 'success');
      onRefresh();
      loadInventoryData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Save manual exact stock
  const handleSaveExactStock = async (product: Product, color: string, size: string) => {
    const parsed = Number(editStockValue);
    if (isNaN(parsed) || parsed < 0) {
      showToast('Qoldiq soni musbat son bo‘lishi kerak', 'error');
      return;
    }

    try {
      await api.setInventoryStock({
        productId: product.id,
        color,
        size,
        stock: parsed,
        type: 'MANUAL_ADJUST',
        note: 'Admin qoldiqni qo‘lda kiritdi',
      });
      showToast(`Qoldiq saqlandi: ${product.name} (${color}, ${size}) = ${parsed} ta`, 'success');
      setEditingVariantKey(null);
      onRefresh();
      loadInventoryData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle Cancel Offline Sale (Undo)
  const handleCancelSale = async (logId: string) => {
    if (!window.confirm('Haqiqatan ham ushbu sotuvni bekor qilib, mahsulotni omborga qaytarmoqchimisiz?')) {
      return;
    }
    try {
      const res = await api.cancelInventoryLog(logId);
      showToast(res.message, 'success');
      onRefresh();
      loadInventoryData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Handle add new color/size variant
  const handleAddNewVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addVariantProduct) return;
    if (!newVariantColor.trim() || !newVariantSize.trim()) {
      showToast('Iltimos, rang va razmer nomini kiriting', 'error');
      return;
    }
    const stockNum = Math.max(0, Number(newVariantStock) || 0);

    setIsSubmittingVariant(true);
    try {
      await api.addInventoryVariant({
        productId: addVariantProduct.id,
        color: newVariantColor.trim(),
        size: newVariantSize.trim(),
        stock: stockNum,
      });
      showToast(`Yangi variant qo‘shildi: ${newVariantColor} - ${newVariantSize} (${stockNum} ta)`, 'success');
      setAddVariantProduct(null);
      setNewVariantColor('');
      setNewVariantSize('');
      setNewVariantStock('10');
      onRefresh();
      loadInventoryData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmittingVariant(false);
    }
  };

  const toggleExpandProduct = (id: string) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAllProducts = () => {
    setExpandedProductIds(new Set(filteredProducts.map((p) => p.id)));
  };

  const collapseAllProducts = () => {
    setExpandedProductIds(new Set());
  };

  // Count products by category
  const categoryCounts = React.useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of products) {
      map[p.categorySlug] = (map[p.categorySlug] || 0) + 1;
    }
    return map;
  }, [products]);

  // Filter products by category, search and mode
  const filteredProducts = products.filter((prod) => {
    // 1. Category filter
    if (selectedCategorySlug !== 'ALL' && prod.categorySlug !== selectedCategorySlug) {
      return false;
    }

    // 2. Search query
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      prod.name.toLowerCase().includes(q) ||
      prod.categoryName.toLowerCase().includes(q) ||
      prod.colors.some((c) => c.toLowerCase().includes(q)) ||
      prod.sizes.some((s) => s.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    // 3. Filter mode
    if (filterMode === 'OUT_OF_STOCK') {
      return prod.stock <= 0 || (prod.variants && prod.variants.some((v) => v.stock <= 0));
    }
    if (filterMode === 'LOW_STOCK') {
      return prod.variants && prod.variants.some((v) => v.stock > 0 && v.stock <= 2);
    }
    if (filterMode === 'AVAILABLE') {
      return prod.stock > 0;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* OMBOR TOP NAVIGATION & ACTION BAR */}
      <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Package className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Yagona Ombor Boshqaruv Tizimi
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Do‘kondagi oflayn savdo va onlayn sayt uchun <strong className="text-amber-400 font-bold">bitta umumiy qoldiq</strong>.
              Rang va razmerlar bo‘yicha avtomatik sinxronizatsiya.
            </p>
          </div>

          {/* Sub-tabs switcher */}
          <div className="flex items-center bg-[#0b0f17] p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('warehouse')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'warehouse'
                  ? 'gold-gradient-bg text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Ombor va Qoldiqlar</span>
            </button>
            <button
              onClick={() => setActiveSubTab('history')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'history'
                  ? 'gold-gradient-bg text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Harakatlar Tarixi</span>
            </button>
            <button
              onClick={() => setActiveSubTab('analytics')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeSubTab === 'analytics'
                  ? 'gold-gradient-bg text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Statistika</span>
            </button>
          </div>
        </div>

        {/* Real-time KPI Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5 pt-5 border-t border-slate-800/80">
            {/* 1. Total stock units */}
            <div className="bg-[#0b0f17] p-3.5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Ombordagi jami
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-white">
                  {stats.totalStockUnits}
                </span>
                <span className="text-xs text-slate-400">dona</span>
              </div>
              <span className="text-[10px] text-amber-400 mt-1">
                {stats.totalProductsCount} xil model
              </span>
            </div>

            {/* 2. Today offline sales */}
            <div className="bg-[#0b0f17] p-3.5 rounded-2xl border border-emerald-900/40 bg-emerald-950/10 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Bugun oflayn
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-emerald-400">
                  {stats.todayOfflineSalesCount}
                </span>
                <span className="text-xs text-emerald-400/70">ta sotildi</span>
              </div>
              <span className="text-[10px] text-slate-300 mt-1 truncate">
                {formatUzbekPrice(stats.todayOfflineSalesRevenue)}
              </span>
            </div>

            {/* 3. Today online sales */}
            <div className="bg-[#0b0f17] p-3.5 rounded-2xl border border-blue-900/40 bg-blue-950/10 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                Bugun onlayn
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-blue-400">
                  {stats.todayOnlineSalesCount}
                </span>
                <span className="text-xs text-blue-400/70">ta buyurtma</span>
              </div>
              <span className="text-[10px] text-slate-300 mt-1 truncate">
                {formatUzbekPrice(stats.todayOnlineSalesRevenue)}
              </span>
            </div>

            {/* 4. Total today revenue */}
            <div className="bg-[#0b0f17] p-3.5 rounded-2xl border border-amber-900/40 bg-amber-950/10 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                Bugungi savdo
              </span>
              <div className="mt-1">
                <span className="text-base sm:text-lg font-black text-amber-400 truncate block">
                  {formatUzbekPrice(stats.totalTodayRevenue)}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Oylik: {formatUzbekPrice(stats.monthlyRevenue)}
              </span>
            </div>

            {/* 5. Low stock alert */}
            <div
              onClick={() => setFilterMode(filterMode === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                filterMode === 'LOW_STOCK'
                  ? 'bg-amber-500/20 border-amber-400'
                  : 'bg-[#0b0f17] border-amber-900/40 hover:border-amber-500/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  Kam qolgan
                </span>
                <span className="text-sm">⚠️</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-amber-400">
                  {stats.lowStockVariantsCount}
                </span>
                <span className="text-xs text-amber-400/70">razmer (≤2)</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Filtrni bosish
              </span>
            </div>

            {/* 6. Out of stock alert */}
            <div
              onClick={() => setFilterMode(filterMode === 'OUT_OF_STOCK' ? 'ALL' : 'OUT_OF_STOCK')}
              className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                filterMode === 'OUT_OF_STOCK'
                  ? 'bg-rose-500/20 border-rose-400'
                  : 'bg-[#0b0f17] border-rose-900/40 hover:border-rose-500/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">
                  Tugagan
                </span>
                <span className="text-sm">❌</span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-xl sm:text-2xl font-black text-rose-400">
                  {stats.outOfStockVariantsCount}
                </span>
                <span className="text-xs text-rose-400/70">razmer (0 ta)</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1">
                Filtrni bosish
              </span>
            </div>
          </div>
        )}
      </div>

      {/* SUB-TAB 1: WAREHOUSE & PRODUCTS VARIANT MANAGEMENT */}
      {activeSubTab === 'warehouse' && (
        <div className="space-y-4">
          {/* Search, Filter chips and Refresh */}
          <div className="bg-[#131b2a] p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Mahsulot nomi, rangi, razmeri..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
              {[
                { id: 'ALL', label: 'Barchasi' },
                { id: 'LOW_STOCK', label: '⚠️ Kam qolgan (≤2)' },
                { id: 'OUT_OF_STOCK', label: '❌ Tugagan (0 ta)' },
                { id: 'AVAILABLE', label: '🟢 Mavjudlar' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilterMode(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    filterMode === f.id
                      ? 'gold-gradient-bg text-black'
                      : 'bg-[#0b0f17] text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}

              <button
                onClick={() => {
                  onRefresh();
                  loadInventoryData();
                }}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 ml-auto transition"
                title="Yangilash"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 1. Horizontal Swipeable Categories Tabs Bar (User Requirement 1) */}
          <div className="bg-[#131b2a] border border-slate-800 rounded-2xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-md">
            {/* Horizontal swipeable buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setSelectedCategorySlug('ALL')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                  selectedCategorySlug === 'ALL'
                    ? 'gold-gradient-bg text-black shadow'
                    : 'bg-[#0b0f17] text-slate-300 hover:text-white border border-slate-800'
                }`}
              >
                <span>HAMMASI</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    selectedCategorySlug === 'ALL' ? 'bg-black text-amber-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {products.length}
                </span>
              </button>

              {availableCategories.map((c) => {
                const isSelected = selectedCategorySlug === c.slug;
                const count = categoryCounts[c.slug] || 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategorySlug(c.slug)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
                      isSelected
                        ? 'gold-gradient-bg text-black shadow'
                        : 'bg-[#0b0f17] text-slate-300 hover:text-white border border-slate-800'
                    }`}
                  >
                    <span>{c.name.toUpperCase()}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                        isSelected ? 'bg-black text-amber-300' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                    {c.isHidden && (
                      <span className="text-[10px]" title="Mavsumiy yashirilgan">👁‍🗨</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Expand All / Collapse All buttons */}
            <div className="flex items-center gap-2 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-3 justify-end">
              <button
                onClick={expandAllProducts}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="Barcha kartalarni kengaytirib ochish"
              >
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Hammasini ochish ▼</span>
              </button>
              <button
                onClick={collapseAllProducts}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                title="Barcha kartalarni ixcham qilish"
              >
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                <span>Hammasini yopish ▲</span>
              </button>
            </div>
          </div>

          {/* Product Variant Cards List */}
          {filteredProducts.length === 0 ? (
            <div className="bg-[#131b2a] p-12 rounded-3xl border border-slate-800 text-center">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">Hech qanday mahsulot topilmadi</h3>
              <p className="text-xs text-slate-400 mt-1">
                Qidiruv so‘rovingizni yoki tanlangan kategoriyani o‘zgartirib ko‘ring
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {filteredProducts.map((prod) => {
                const isProdOutOfStock = prod.stock <= 0;
                const isExpanded = expandedProductIds.has(prod.id);
                const variants = prod.variants || [];

                // Group variants by color
                const colorGroups: Record<string, ProductVariant[]> = {};
                for (const col of prod.colors) {
                  colorGroups[col] = [];
                }
                for (const v of variants) {
                  if (!colorGroups[v.color]) {
                    colorGroups[v.color] = [];
                  }
                  colorGroups[v.color].push(v);
                }

                return (
                  <div
                    key={prod.id}
                    className={`bg-[#131b2a] border rounded-3xl overflow-hidden transition-all shadow-lg ${
                      isProdOutOfStock
                        ? 'border-rose-900/60 bg-gradient-to-r from-rose-950/10 via-[#131b2a] to-[#131b2a]'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Header: Ixcham Mahsulot Kartasi (User Requirement 2) */}
                    <div
                      className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111726] transition ${
                        isExpanded ? 'border-b border-slate-800/80' : ''
                      }`}
                    >
                      <div
                        onClick={() => toggleExpandProduct(prod.id)}
                        className="flex items-center gap-3.5 cursor-pointer flex-1 min-w-0"
                      >
                        <div className="relative w-14 h-16 sm:w-16 sm:h-20 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                          <img
                            src={prod.images[0] || '/banners/hero-banner-1.png'}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          {isProdOutOfStock && (
                            <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                              <span className="text-[10px] font-black text-rose-500">❌</span>
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-[#d4af37]">
                              {prod.categoryName}
                            </span>
                            {isProdOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-600/90 text-white">
                                ❌ SOTUVDA YO‘Q
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                                🟢 Sotuvda mavjud
                              </span>
                            )}
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">
                            {prod.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs">
                            <span className="font-extrabold text-white">
                              {formatUzbekPrice(prod.price)}
                            </span>
                            <span className="text-slate-400">
                              Jami qoldiq:{' '}
                              <strong className={prod.stock <= 0 ? 'text-rose-400 font-black' : 'text-emerald-400 font-bold'}>
                                {prod.stock} ta
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action Buttons: [BATAFSIL ▼] / [YOPISH ▲] + [Yangi rang/razmer] */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {isExpanded && (
                          <button
                            onClick={() => {
                              setAddVariantProduct(prod);
                              setNewVariantColor(prod.colors[0] || 'Qora');
                              setNewVariantSize('');
                              setNewVariantStock('10');
                            }}
                            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Yangi rang/razmer</span>
                          </button>
                        )}

                        <button
                          onClick={() => toggleExpandProduct(prod.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                            isExpanded
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30'
                              : 'gold-gradient-bg text-black hover:brightness-110'
                          }`}
                        >
                          <span>{isExpanded ? 'YOPISH ▲' : 'BATAFSIL ▼'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Body: Colors and Variants Grid (Only rendered when expanded) */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-4">
                        {Object.entries(colorGroups).map(([color, colorVariants]) => {
                        const totalColorStock = colorVariants.reduce((sum, v) => sum + v.stock, 0);
                        const isColorOutOfStock = totalColorStock <= 0;

                        return (
                          <div
                            key={color}
                            className={`p-3.5 sm:p-4 rounded-2xl border transition ${
                              isColorOutOfStock
                                ? 'bg-rose-950/10 border-rose-900/40'
                                : 'bg-[#0b0f17] border-slate-800/80'
                            }`}
                          >
                            {/* Color Header */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full border border-slate-600 bg-slate-700 inline-block" />
                                <span className="text-xs sm:text-sm font-bold text-white">
                                  {color} rang
                                </span>
                                {isColorOutOfStock ? (
                                  <span className="text-[10px] font-extrabold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/30">
                                    ❌ Bu rang barcha razmerlarda tugagan (0 ta)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium text-slate-400">
                                    (Jami: {totalColorStock} ta)
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Sizes with Touch-Friendly [−] and [+] Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5">
                              {colorVariants.map((variant) => {
                                const vKey = `${prod.id}_${color}_${variant.size}`;
                                const isZero = variant.stock <= 0;
                                const isLow = variant.stock > 0 && variant.stock <= 2;
                                const isMinusLoading = actionLoadingId === `${vKey}_minus`;
                                const isPlusLoading = actionLoadingId?.startsWith(`${vKey}_plus`);
                                const isEditing = editingVariantKey === vKey;

                                return (
                                  <div
                                    key={variant.size}
                                    className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition ${
                                      isZero
                                        ? 'bg-rose-950/20 border-rose-800/60'
                                        : isLow
                                        ? 'bg-amber-950/15 border-amber-800/50'
                                        : 'bg-[#131b2a] border-slate-800 hover:border-slate-700'
                                    }`}
                                  >
                                    {/* Left: Size badge & Stock status */}
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <span
                                        className={`w-9 h-9 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-sm ${
                                          isZero
                                            ? 'bg-rose-900/40 text-rose-300 border border-rose-800/80'
                                            : 'bg-slate-800 text-white border border-slate-700'
                                        }`}
                                      >
                                        {variant.size}
                                      </span>

                                      {/* Stock count or inline editor */}
                                      {isEditing ? (
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="number"
                                            min="0"
                                            value={editStockValue}
                                            onChange={(e) => setEditStockValue(e.target.value)}
                                            className="w-16 bg-[#0b0f17] border border-[#d4af37] rounded-lg px-2 py-1 text-xs text-white font-black focus:outline-none"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => handleSaveExactStock(prod, color, variant.size)}
                                            className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                                            title="Saqlash"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => setEditingVariantKey(null)}
                                            className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                                            title="Bekor qilish"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div
                                          onClick={() => {
                                            setEditingVariantKey(vKey);
                                            setEditStockValue(String(variant.stock));
                                          }}
                                          className="cursor-pointer group/stock"
                                          title="Qoldiq sonini qo‘lda o‘zgartirish uchun bosing"
                                        >
                                          <div className="flex items-center gap-1">
                                            <span
                                              className={`text-sm sm:text-base font-black ${
                                                isZero
                                                  ? 'text-rose-400'
                                                  : isLow
                                                  ? 'text-amber-400'
                                                  : 'text-white'
                                              }`}
                                            >
                                              {variant.stock} ta
                                            </span>
                                            <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover/stock:opacity-100 transition" />
                                          </div>
                                          <span className="text-[10px] font-semibold block leading-tight">
                                            {isZero ? (
                                              <span className="text-rose-400 font-bold">❌ Tugagan</span>
                                            ) : isLow ? (
                                              <span className="text-amber-400">⚠️ Kam qoldi</span>
                                            ) : (
                                              <span className="text-slate-400">Mavjud</span>
                                            )}
                                          </span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Right: Touch-Friendly Action Controls [−] and [+] */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      {/* [−] MINUS BUTTON — 1-Tap Offline Sale */}
                                      <button
                                        disabled={isZero || isMinusLoading}
                                        onClick={() => handleOfflineSale(prod, color, variant.size, variant.stock)}
                                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-black text-sm flex items-center justify-center transition active:scale-90 shadow-md ${
                                          isZero
                                            ? 'bg-slate-800/40 text-slate-600 border border-slate-800 cursor-not-allowed'
                                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500 hover:text-white cursor-pointer active:bg-rose-600'
                                        }`}
                                        title="Oflayn do‘konda 1 ta sotildi (Ombordan -1)"
                                      >
                                        <Minus className="w-4 h-4 stroke-[3]" />
                                      </button>

                                      {/* [+] PLUS BUTTON — Restock (+1) */}
                                      <button
                                        disabled={isPlusLoading}
                                        onClick={() => handleRestock(prod, color, variant.size, 1)}
                                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-white font-black text-sm flex items-center justify-center transition active:scale-90 shadow-md cursor-pointer active:bg-emerald-600"
                                        title="Omborga +1 ta qo‘shish"
                                      >
                                        <Plus className="w-4 h-4 stroke-[3]" />
                                      </button>

                                      {/* Quick Bulk Restock (+10) */}
                                      <button
                                        disabled={isPlusLoading}
                                        onClick={() => handleRestock(prod, color, variant.size, 10)}
                                        className="px-2 h-9 sm:h-10 rounded-xl bg-slate-800 hover:bg-[#d4af37] hover:text-black text-slate-300 text-[10px] font-black transition border border-slate-700 cursor-pointer"
                                        title="Tezkor +10 ta qo‘shish"
                                      >
                                        +10
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: MOVEMENT & OFFLINE SALES HISTORY (OMBOR TARIXI) */}
      {activeSubTab === 'history' && (
        <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Ombor Harakatlari va Oflayn Sotuvlar Tarixi</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Barcha oflayn sotuvlar, omborga qo‘shishlar va onlayn buyurtmalar ro‘yxati.
                Xato bosilgan sotuvni bekor qilish imkoniyati mavjud.
              </p>
            </div>
            <button
              onClick={loadInventoryData}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition shrink-0"
              title="Yangilash"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <span>Hozircha ombor harakatlari tarixi mavjud emas</span>
            </div>
          ) : (
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                    <th className="py-3 px-3">Vaqt</th>
                    <th className="py-3 px-3">Mahsulot</th>
                    <th className="py-3 px-3">Rang & Razmer</th>
                    <th className="py-3 px-3">Amal turi</th>
                    <th className="py-3 px-3">O‘zgarish</th>
                    <th className="py-3 px-3">Yangi qoldiq</th>
                    <th className="py-3 px-3">Mas‘ul / Izoh</th>
                    <th className="py-3 px-3 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {logs.map((log) => {
                    const isMinus = log.delta < 0;
                    const dateFormatted = new Date(log.timestamp).toLocaleString('uz-UZ', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr
                        key={log.id}
                        className={`hover:bg-slate-800/30 transition ${
                          log.cancelled ? 'opacity-50 line-through bg-slate-900/40' : ''
                        }`}
                      >
                        <td className="py-3 px-3 whitespace-nowrap text-slate-400">
                          {dateFormatted}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <img
                              src={log.productImage || '/banners/hero-banner-1.png'}
                              alt=""
                              className="w-7 h-9 rounded-lg object-cover bg-slate-900 shrink-0"
                            />
                            <span className="font-bold text-white line-clamp-1 max-w-[180px]">
                              {log.productName}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold mr-1">
                            {log.color}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-white font-black">
                            {log.size}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {log.type === 'OFFLINE_SALE' ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              🛍 Oflayn sotuv
                            </span>
                          ) : log.type === 'RESTOCK' ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              📦 Omborga qo‘shildi
                            </span>
                          ) : log.type === 'ONLINE_ORDER_RESERVED' ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              🌐 Onlayn buyurtma
                            </span>
                          ) : log.type === 'ONLINE_ORDER_CANCELLED' ? (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-500/20 text-purple-400 border border-purple-500/30">
                              🔄 Buyurtma bekor bo‘ldi
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 text-slate-300">
                              ⚙️ {log.type}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span
                            className={`font-black text-sm ${
                              isMinus ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {isMinus ? log.delta : `+${log.delta}`} ta
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-bold text-white">
                          {log.newStock} ta
                        </td>
                        <td className="py-3 px-3 text-slate-400 max-w-[200px] truncate">
                          <div className="font-semibold text-slate-300">{log.operator || 'Admin'}</div>
                          <span className="text-[10px] text-slate-500">{log.note}</span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap text-right">
                          {log.type === 'OFFLINE_SALE' && !log.cancelled && (
                            <button
                              onClick={() => handleCancelSale(log.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-300 font-bold text-[11px] border border-slate-700 hover:border-rose-500/40 transition cursor-pointer"
                              title="Sotuvni bekor qilib omborga qaytarish"
                            >
                              Sotuvni bekor qilish
                            </button>
                          )}
                          {log.cancelled && (
                            <span className="text-[10px] text-slate-500 italic">Bekor qilingan</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: ANALYTICS & INSIGHTS */}
      {activeSubTab === 'analytics' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Top Selling Products */}
            <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 shadow-xl">
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#d4af37] mb-4 flex items-center gap-2">
                <Shirt className="w-4 h-4" />
                <span>Eng ko‘p sotilgan mahsulotlar</span>
              </h4>
              {stats.topSellingProducts.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">Hozircha sotuvlar yetarli emas</p>
              ) : (
                <div className="space-y-3">
                  {stats.topSellingProducts.map((p, idx) => (
                    <div
                      key={p.productId}
                      className="flex items-center justify-between p-3 rounded-2xl bg-[#0b0f17] border border-slate-800"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-white truncate max-w-[140px]">
                          {p.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-emerald-400 block">
                          {p.quantity} ta
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {formatUzbekPrice(p.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Selling Sizes */}
            <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 shadow-xl">
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#d4af37] mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span>Eng xaridorgir o‘lchamlar</span>
              </h4>
              {stats.topSellingSizes.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">Hozircha ma‘lumot yo‘q</p>
              ) : (
                <div className="space-y-2.5">
                  {stats.topSellingSizes.map((s, idx) => (
                    <div
                      key={s.size}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#0b0f17] border border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 text-white font-black text-xs flex items-center justify-center">
                          {s.size}
                        </span>
                        <span className="text-xs text-slate-300 font-medium">O‘lcham</span>
                      </div>
                      <span className="text-xs font-black text-emerald-400">
                        {s.quantity} ta sotildi
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Selling Colors */}
            <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 shadow-xl">
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#d4af37] mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Eng mashhur ranglar</span>
              </h4>
              {stats.topSellingColors.length === 0 ? (
                <p className="text-xs text-slate-500 py-4">Hozircha ma‘lumot yo‘q</p>
              ) : (
                <div className="space-y-2.5">
                  {stats.topSellingColors.map((c) => (
                    <div
                      key={c.color}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#0b0f17] border border-slate-800"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-amber-400" />
                        <span className="text-xs text-white font-bold">{c.color}</span>
                      </div>
                      <span className="text-xs font-black text-emerald-400">
                        {c.quantity} ta sotildi
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Alert List: Out of Stock & Low Stock Items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Out of Stock (❌ = 0) */}
            <div className="bg-[#131b2a] border border-rose-900/40 rounded-3xl p-5 shadow-xl">
              <h4 className="text-sm font-extrabold text-rose-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                <span>Tugab qolgan variantlar (❌ 0 ta)</span>
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Ushbu tovarlar tugagani sababli onlayn saytda ❌ belgisi bilan ko‘rinmoqda.
              </p>
              {stats.outOfStockVariants.length === 0 ? (
                <p className="text-xs text-emerald-400 font-bold py-2">
                  🎉 Barcha mahsulotlar omborda yetarli!
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
                  {stats.outOfStockVariants.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#0b0f17] border border-rose-900/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.productImage}
                          alt=""
                          className="w-8 h-10 rounded-lg object-cover bg-slate-900"
                        />
                        <div>
                          <div className="text-xs font-bold text-white line-clamp-1">
                            {item.productName}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {item.color} — {item.size}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const prod = products.find((p) => p.id === item.productId);
                          if (prod) handleRestock(prod, item.color, item.size, 10);
                        }}
                        className="px-2.5 py-1 rounded-lg gold-gradient-bg text-black font-extrabold text-[11px] shadow cursor-pointer hover:brightness-110"
                      >
                        +10 ta to‘ldirish
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Low Stock (⚠️ <= 2) */}
            <div className="bg-[#131b2a] border border-amber-900/40 rounded-3xl p-5 shadow-xl">
              <h4 className="text-sm font-extrabold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>Kam qolgan variantlar (⚠️ ≤ 2 ta)</span>
              </h4>
              <p className="text-xs text-slate-400 mb-4">
                Ushbu tovarlar tez kunda tugashi mumkin, yangi partiya buyurtma qilish tavsiya etiladi.
              </p>
              {stats.lowStockVariants.length === 0 ? (
                <p className="text-xs text-emerald-400 font-bold py-2">
                  Qoldiqlar xavfsiz darajada
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto no-scrollbar">
                  {stats.lowStockVariants.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-[#0b0f17] border border-amber-900/40 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={item.productImage}
                          alt=""
                          className="w-8 h-10 rounded-lg object-cover bg-slate-900"
                        />
                        <div>
                          <div className="text-xs font-bold text-white line-clamp-1">
                            {item.productName}
                          </div>
                          <span className="text-[10px] text-amber-300 font-bold">
                            {item.color} — {item.size} ({item.stock} ta qoldi)
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const prod = products.find((p) => p.id === item.productId);
                          if (prod) handleRestock(prod, item.color, item.size, 10);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-extrabold text-[11px] hover:bg-amber-500 hover:text-black cursor-pointer transition"
                      >
                        +10 ta qo‘shish
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM COLOR OR SIZE VARIANT */}
      {addVariantProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2a] border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">
                Yangi rang yoki o‘lcham qo‘shish
              </h3>
              <button
                onClick={() => setAddVariantProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewVariant} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Mahsulot:
                </label>
                <div className="p-2.5 rounded-xl bg-[#0b0f17] border border-slate-800 text-xs font-bold text-white">
                  {addVariantProduct.name}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Rang nomi:
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Qora, Oq, To‘q ko‘k, Bej..."
                  value={newVariantColor}
                  onChange={(e) => setNewVariantColor(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  O‘lcham (Razmer):
                </label>
                <input
                  type="text"
                  placeholder="Masalan: S, M, L, XL, XXL, 28, 29, 30, 31, 32..."
                  value={newVariantSize}
                  onChange={(e) => setNewVariantSize(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Dastlabki ombor qoldig‘i (ta):
                </label>
                <input
                  type="number"
                  min="0"
                  value={newVariantStock}
                  onChange={(e) => setNewVariantStock(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setAddVariantProduct(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingVariant}
                  className="flex-1 py-3 rounded-xl gold-gradient-bg text-black text-xs font-extrabold shadow-lg hover:brightness-110 disabled:opacity-50"
                >
                  {isSubmittingVariant ? 'Qo‘shilmoqda...' : 'Variantni saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
