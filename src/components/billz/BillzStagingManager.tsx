import React, { useState, useEffect } from 'react';
import {
  Layers,
  Search,
  Filter,
  Sparkles,
  Edit,
  Rocket,
  CheckCircle2,
  XCircle,
  Trash2,
  Building2,
  Package,
  RefreshCw,
  Plus,
  ArrowRight,
  Eye,
  Camera,
  AlertCircle,
} from 'lucide-react';
import type { BillzStagingProduct, BillzProductStatus } from '../../types/index.ts';
import { api, formatUzbekPrice } from '../../lib/api.ts';
import { BillzProductEditModal } from './BillzProductEditModal.tsx';

interface BillzStagingManagerProps {
  onRefreshCatalog?: () => void;
  onOpenBrowser: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BillzStagingManager: React.FC<BillzStagingManagerProps> = ({
  onRefreshCatalog,
  onOpenBrowser,
  showToast,
}) => {
  const [items, setItems] = useState<BillzStagingProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | BillzProductStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected item for Edit Modal
  const [editingItem, setEditingItem] = useState<BillzStagingProduct | null>(null);

  // In-flight action tracking
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [testingImport, setTestingImport] = useState(false);

  const loadStagingItems = async () => {
    try {
      setLoading(true);
      const res = await api.getBillzStagingProducts({
        status: statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setItems(res || []);
    } catch (err: any) {
      showToast(err.message || 'Staging mahsulotlarini yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStagingItems();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadStagingItems();
  };

  // Direct Publish to Web Store
  const handlePublish = async (item: BillzStagingProduct) => {
    try {
      setPublishingId(item.id);
      const res = await api.publishBillzStagingProduct(item.id);
      if (res.success) {
        showToast(
          `«${item.name}» muvaffaqiyatli web sayt katalogiga chiqarildi!`,
          'success'
        );
        if (onRefreshCatalog) onRefreshCatalog();
        loadStagingItems();
      } else {
        showToast(res.message || 'Saytga chiqarishda xatolik', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Saytga chiqarishda xatolik', 'error');
    } finally {
      setPublishingId(null);
    }
  };

  // Reject Item
  const handleReject = async (id: string) => {
    try {
      setRejectingId(id);
      await api.rejectBillzStagingProduct(id);
      showToast('Mahsulot rad etildi', 'info');
      loadStagingItems();
    } catch (err: any) {
      showToast(err.message || 'Rad etishda xatolik', 'error');
    } finally {
      setRejectingId(null);
    }
  };

  // Delete Item
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Haqiqatan ham «${name}» mahsulotini staging ro‘yxatidan o‘chirmoqchimisiz?`)) {
      return;
    }
    try {
      setDeletingId(id);
      await api.deleteBillzStagingProduct(id);
      showToast('Mahsulot o‘chirildi', 'success');
      loadStagingItems();
    } catch (err: any) {
      showToast(err.message || 'O‘chirishda xatolik', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  // Test import 5 items
  const handleTestImport5 = async () => {
    try {
      setTestingImport(true);
      const res = await api.testImport5BillzProducts();
      if (res.success) {
        showToast(res.message || `${res.count} ta sinov mahsuloti yuklandi!`, 'success');
        loadStagingItems();
      } else {
        showToast(res.message || 'Sinov importida xatolik', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Sinov importi bajarilmadi', 'error');
    } finally {
      setTestingImport(false);
    }
  };

  const getStatusBadge = (status: BillzProductStatus) => {
    switch (status) {
      case 'SELECTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            Tanlangan
          </span>
        );
      case 'UNDER_REVIEW':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Ko‘rib chiqilmoqda
          </span>
        );
      case 'EDITING':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Tahrirlanmoqda
          </span>
        );
      case 'READY':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Chiqarishga tayyor
          </span>
        );
      case 'PUBLISHED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-black font-black">
            ✓ Saytda faol
          </span>
        );
      case 'REJECTED':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Rad etilgan
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Card */}
      <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              BILLZ&apos;dan Kelgan Mahsulotlar (Staging Boshqaruvi)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Admin panelga qabul qilingan tovarlarni tahrirlang, rasm yuklang, narxlarni belgilang va tasdiqlab web saytga chiqaring.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleTestImport5}
              disabled={testingImport}
              className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${testingImport ? 'animate-spin' : ''}`} />
              <span>{testingImport ? 'Yuklanmoqda...' : '🔬 5 ta bilan sinov importi'}</span>
            </button>

            <button
              onClick={onOpenBrowser}
              className="px-4 py-2 rounded-xl gold-gradient-bg text-black font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/10 hover:scale-[1.02] active:scale-95 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>📦 BILLZ Mahsulotlarini Ochish</span>
            </button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'ALL', label: 'Hammasi' },
            { id: 'SELECTED', label: 'Tanlangan' },
            { id: 'UNDER_REVIEW', label: 'Ko‘rib chiqilmoqda' },
            { id: 'EDITING', label: 'Tahrirlanmoqda' },
            { id: 'READY', label: 'Tayyor' },
            { id: 'PUBLISHED', label: 'Saytda faol' },
            { id: 'REJECTED', label: 'Rad etilgan' },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-400 text-black font-black shadow-md'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Staging ichidan nomi yoki artikul bo‘yicha qidirish..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs sm:text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
          >
            Qidirish
          </button>
          <button
            type="button"
            onClick={loadStagingItems}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </div>

      {/* Items List */}
      <div className="bg-[#131b2a] border border-slate-800 rounded-3xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-amber-400" />
            <p className="text-xs">Staging mahsulotlari yuklanmoqda...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-slate-500 space-y-3 p-6">
            <Package className="w-9 h-9 mx-auto text-slate-600" />
            <p className="text-sm font-bold text-slate-300">
              Ushbu filtr bo‘yicha tovarlar mavjud emas
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              «📦 BILLZ Mahsulotlarini Ochish» tugmasi orqali katalogdan mahsulotlarni tanlab qo‘shing yoki «5 ta bilan sinov importi»ni bosing.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={handleTestImport5}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold cursor-pointer"
              >
                🔬 5 ta sinov importi
              </button>
              <button
                onClick={onOpenBrowser}
                className="px-4 py-2 rounded-xl gold-gradient-bg text-black font-black text-xs cursor-pointer"
              >
                📦 BILLZ Mahsulotlarini Ochish
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {items.map((item) => {
              const hasImage = item.images && item.images.length > 0;
              const isPublishing = publishingId === item.id;
              const isRejecting = rejectingId === item.id;
              const isDeleting = deletingId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-900/40 transition"
                >
                  {/* Left: Image & Info */}
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative">
                      {hasImage ? (
                        <img
                          src={item.images[0]}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-7 h-7 text-slate-600" />
                      )}
                      {item.hasCustomImages && (
                        <span
                          className="absolute bottom-1 right-1 p-0.5 rounded bg-amber-400 text-black shadow"
                          title="Qo‘lda rasm biriktirilgan"
                        >
                          <Camera className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm sm:text-base font-black text-white truncate block">
                          {item.name}
                        </span>
                        {getStatusBadge(item.status)}
                        {item.categoryName && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-300">
                            {item.categoryName}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                        {item.sku && <span>SKU: <b className="text-slate-300">{item.sku}</b></span>}
                        {item.barcode && <span>Shtrix-kod: <b className="text-slate-300">{item.barcode}</b></span>}
                        {item.colors && item.colors.length > 0 && (
                          <span>Ranglar: <b className="text-slate-300">{item.colors.join(', ')}</b></span>
                        )}
                        {item.sizes && item.sizes.length > 0 && (
                          <span>Razmerlar: <b className="text-slate-300">{item.sizes.join(', ')}</b></span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Stocks & Prices */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800/80">
                    {/* Stocks */}
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] uppercase text-slate-500">Asosiy ombor:</span>
                        <span
                          className={`font-black ${
                            item.mainWarehouseStock > 0 ? 'text-emerald-400' : 'text-slate-500'
                          }`}
                        >
                          {item.mainWarehouseStock} dona
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span className="text-[10px] uppercase text-slate-500">Mingbuloq:</span>
                        <span>{item.branchStock} dona</span>
                      </div>
                    </div>

                    {/* Prices */}
                    <div className="text-right">
                      <span className="text-sm sm:text-base font-black text-amber-400 block">
                        {formatUzbekPrice(item.price)}
                      </span>
                      {item.discountPrice && item.discountPrice > 0 ? (
                        <span className="text-[11px] text-rose-400 line-through block">
                          {formatUzbekPrice(item.discountPrice)}
                        </span>
                      ) : null}
                      {item.costPrice && item.costPrice > 0 ? (
                        <span className="text-[10px] text-slate-500 block font-mono">
                          Tannarx: {formatUzbekPrice(item.costPrice)}
                        </span>
                      ) : null}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {/* Edit Button */}
                      <button
                        onClick={() => setEditingItem(item)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        title="Tahrirlash va rasmlarni sozlash"
                      >
                        <Edit className="w-3.5 h-3.5 text-amber-400" />
                        <span>Tahrirlash</span>
                      </button>

                      {/* Direct Publish Button */}
                      <button
                        onClick={() => handlePublish(item)}
                        disabled={isPublishing}
                        className="px-3.5 py-2 rounded-xl gold-gradient-bg text-black font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition cursor-pointer disabled:opacity-50"
                        title="Web sayt katalogiga chiqarish"
                      >
                        <Rocket className={`w-3.5 h-3.5 ${isPublishing ? 'animate-spin' : ''}`} />
                        <span>{isPublishing ? 'Chiqarilmoqda...' : '🚀 Web Saytga'}</span>
                      </button>

                      {/* Reject */}
                      {item.status !== 'REJECTED' && (
                        <button
                          onClick={() => handleReject(item.id)}
                          disabled={isRejecting}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
                          title="Rad etish"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        disabled={isDeleting}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 text-slate-500 hover:text-rose-400 border border-slate-800 transition cursor-pointer"
                        title="Stagingdan o‘chirish"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Product Edit Modal */}
      {editingItem && (
        <BillzProductEditModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(updated) => {
            setEditingItem(null);
            loadStagingItems();
          }}
          onPublish={(published) => {
            setEditingItem(null);
            if (onRefreshCatalog) onRefreshCatalog();
            loadStagingItems();
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
};
