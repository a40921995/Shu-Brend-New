import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  CheckSquare,
  Square,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Plus,
  ArrowRight,
  ExternalLink,
  Building2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { api, formatUzbekPrice } from '../../lib/api.ts';

interface BillzBrowserItem {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  brand?: string;
  categoryName?: string;
  price: number;
  discountPrice?: number;
  images: string[];
  mainWarehouseStock: number;
  branchStock: number;
  totalStock: number;
  isStaged: boolean;
  isPublished: boolean;
  stagingId?: string;
  publishedProductId?: string;
  rawItem?: any;
}

interface BillzCatalogBrowserProps {
  onItemsStaged: () => void;
  onGoToStaging: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BillzCatalogBrowser: React.FC<BillzCatalogBrowserProps> = ({
  onItemsStaged,
  onGoToStaging,
  showToast,
}) => {
  const [items, setItems] = useState<BillzBrowserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [stagingLoading, setStagingLoading] = useState(false);

  const fetchItems = async (targetPage = page) => {
    try {
      setLoading(true);
      const res = await api.browseBillzCatalog({
        page: targetPage,
        limit,
        search: searchQuery.trim() || undefined,
        inStockOnly,
      });

      setItems(res.items || []);
      setTotalCount(res.total || 0);
      setTotalPages(res.totalPages || 1);
      setPage(res.page || targetPage);
    } catch (err: any) {
      showToast(err.message || 'BILLZ katalogini yuklab bo‘lmadi', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(1);
  }, [inStockOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSelectedIds(new Set());
    fetchItems(1);
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllOnPage = () => {
    const allPageIds = items.map((i) => i.id);
    const allSelected = allPageIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allPageIds.forEach((id) => next.delete(id));
      } else {
        allPageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleStageSelected = async () => {
    if (selectedIds.size === 0) {
      showToast('Iltimos, qo‘shish uchun kamida bitta mahsulotni tanlang', 'info');
      return;
    }

    try {
      setStagingLoading(true);
      const itemsToStage = items.filter((i) => selectedIds.has(i.id));

      const res = await api.stageSelectedBillzProducts(itemsToStage);
      showToast(
        `${res.stagedCount} ta mahsulot admin panelga muvaffaqiyatli qo‘shildi!`,
        'success'
      );
      setSelectedIds(new Set());
      onItemsStaged();
      fetchItems(page);
    } catch (err: any) {
      showToast(err.message || 'Tanlangan mahsulotlarni qo‘shishda xatolik', 'error');
    } finally {
      setStagingLoading(false);
    }
  };

  const isAllPageSelected =
    items.length > 0 && items.every((i) => selectedIds.has(i.id));

  return (
    <div className="space-y-6">
      {/* Search & Filters Card */}
      <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-400" />
              BILLZ Mahsulotlar Katalogi (10 300+ tovar)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              BILLZ hisobingizdagi tovarlarni ko‘ring, keraklilarini tanlab admin panel (staging)ga qo‘shing. Saytga faqat siz tasdiqlagan mahsulotlar chiqadi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchItems(page)}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              title="Katalog ma’lumotlarini yangilash"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onGoToStaging}
              className="px-3.5 py-2.5 rounded-xl bg-amber-400/10 hover:bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Admin panelga o‘tish (Staging)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search Bar & Checkbox Filters */}
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nomi, artikul (SKU), shtrix-kod yoki BILLZ ID bo‘yicha qidirish..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Qidirish</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-400">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-800 border-slate-700 cursor-pointer"
              />
              <span className="text-slate-300">
                Faqat omborda qoldig‘i bor tovarlarni ko‘rsatish
              </span>
            </label>

            <span className="text-slate-400">
              Jami topildi: <b className="text-white">{totalCount} ta</b> tovar (Sahifa {page} / {totalPages})
            </span>
          </div>
        </form>
      </div>

      {/* Sticky Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="sticky top-4 z-20 p-4 rounded-2xl bg-[#0e1626] border-2 border-amber-400 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-400 text-black font-black text-xs flex items-center justify-center">
              {selectedIds.size}
            </div>
            <div>
              <span className="text-xs font-black text-white block">
                {selectedIds.size} ta mahsulot tanlandi
              </span>
              <span className="text-[11px] text-slate-400">
                Tanlangan tovarlar admin panelga qoralama (staging) sifatida nusxalanadi
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Bekor qilish
            </button>
            <button
              onClick={handleStageSelected}
              disabled={stagingLoading}
              className="px-5 py-2 rounded-xl gold-gradient-bg text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {stagingLoading
                  ? 'Qo‘shilmoqda...'
                  : `📥 TANLANGANLARNI ADMIN PANELGA QO‘SHISH (${selectedIds.size})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Table & Cards List */}
      <div className="bg-[#131b2a] border border-slate-800 rounded-3xl overflow-hidden">
        {/* Table Controls Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-3 text-xs bg-slate-900/40">
          <button
            onClick={handleSelectAllOnPage}
            className="flex items-center gap-2 text-slate-300 hover:text-white font-bold cursor-pointer select-none"
          >
            {isAllPageSelected ? (
              <CheckSquare className="w-4 h-4 text-amber-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-500" />
            )}
            <span>Joriy sahifadagi barchasini tanlash (20 ta)</span>
          </button>

          <span className="text-slate-400 text-[11px]">
            Asosiy ombor: <b className="text-emerald-400">SHU BREND</b> | Filial: <b className="text-blue-400">Mingbuloq</b>
          </span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">BILLZ tovarlari yuklanmoqda...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs space-y-2">
            <Package className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-bold text-slate-300">Mahsulotlar topilmadi</p>
            <p>Qidiruv so‘zini o‘zgartiring yoki filtrlarni tozalang</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {items.map((item) => {
              const isSelected = selectedIds.has(item.id);
              const hasImage = item.images && item.images.length > 0;

              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelectItem(item.id)}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition cursor-pointer select-none ${
                    isSelected
                      ? 'bg-amber-500/10 hover:bg-amber-500/15'
                      : 'hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Checkbox */}
                    <div className="shrink-0 text-slate-400">
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-amber-400" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                      )}
                    </div>

                    {/* Image Thumbnail */}
                    <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative">
                      {hasImage ? (
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-600" />
                      )}
                      {item.images.length > 1 && (
                        <span className="absolute bottom-1 right-1 bg-black/80 text-[9px] font-bold text-white px-1 rounded">
                          +{item.images.length - 1}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white hover:text-amber-300 transition">
                          {item.name}
                        </span>
                        {item.categoryName && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300">
                            {item.categoryName}
                          </span>
                        )}
                        {item.isPublished ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            ✓ Web saytda faol
                          </span>
                        ) : item.isStaged ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Admin panelda (Staging)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-slate-800/80 text-slate-400">
                            Yangi BILLZ
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                        {item.sku && <span>Artikul: <b className="text-slate-300">{item.sku}</b></span>}
                        {item.barcode && <span>Shtrix-kod: <b className="text-slate-300">{item.barcode}</b></span>}
                        <span>ID: <b className="text-slate-400">{item.id.slice(0, 8)}...</b></span>
                      </div>
                    </div>
                  </div>

                  {/* Stock & Prices */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0 pl-8 sm:pl-0">
                    {/* Stocks per warehouse */}
                    <div className="text-right space-y-0.5 text-xs">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="text-[10px] uppercase text-slate-500">Asosiy ombor:</span>
                        <span
                          className={`font-black ${
                            item.mainWarehouseStock > 0
                              ? 'text-emerald-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {item.mainWarehouseStock} dona
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end text-[11px] text-slate-400">
                        <span className="text-[10px] uppercase text-slate-500">Mingbuloq:</span>
                        <span>{item.branchStock} dona</span>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <span className="text-sm sm:text-base font-black text-amber-400 block">
                        {formatUzbekPrice(item.price)}
                      </span>
                      {item.discountPrice && item.discountPrice > 0 ? (
                        <span className="text-[11px] text-rose-400 line-through block">
                          {formatUzbekPrice(item.discountPrice)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-900/40">
          <span className="text-slate-400">
            Jami: <b className="text-white">{totalCount}</b> ta tovar | Sahifa {page} / {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchItems(page - 1)}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-bold"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Oldingi</span>
            </button>

            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-amber-300">
              {page}
            </span>

            <button
              onClick={() => fetchItems(page + 1)}
              disabled={page >= totalPages || loading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 font-bold"
            >
              <span>Keyingi</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
