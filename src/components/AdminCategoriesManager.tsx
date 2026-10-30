import React, { useState } from 'react';
import {
  Folder,
  Plus,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle,
  X,
  Layers,
  Sparkles,
  Info,
  MoveRight,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import type { Category, Product } from '../types/index.ts';

interface AdminCategoriesManagerProps {
  categories: Category[];
  products: Product[];
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminCategoriesManager: React.FC<AdminCategoriesManagerProps> = ({
  categories,
  products,
  onRefresh,
  showToast,
}) => {
  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sortOrder, setSortOrder] = useState<number>(1);
  const [imageUrl, setImageUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete & Move states
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [deleteWarningProductsCount, setDeleteWarningProductsCount] = useState<number>(0);
  const [targetCategorySlug, setTargetCategorySlug] = useState<string>('');
  const [isMovingAndDeleting, setIsMovingAndDeleting] = useState(false);

  // Filter out system "all" slug for direct category operations
  const realCategories = categories.filter((c) => c.slug !== 'all');

  const openCreateModal = () => {
    setName('');
    setSlug('');
    setSortOrder(realCategories.length + 1);
    setImageUrl('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setSortOrder(cat.sortOrder || 1);
    setImageUrl(cat.imageUrl || '');
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Kategoriya nomini kiriting', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const generatedSlug = slug.trim() || name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      await api.createCategory({
        name: name.trim(),
        slug: generatedSlug,
        sortOrder: Number(sortOrder) || realCategories.length + 1,
        imageUrl: imageUrl.trim() || undefined,
        isHidden: false,
      });
      showToast(`"${name}" kategoriyasi muvaffaqiyatli qo‘shildi!`, 'success');
      setIsCreateModalOpen(false);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!name.trim()) {
      showToast('Kategoriya nomini kiriting', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.updateCategory(editingCategory.id, {
        name: name.trim(),
        slug: slug.trim() || editingCategory.slug,
        sortOrder: Number(sortOrder),
        imageUrl: imageUrl.trim() || undefined,
      });
      showToast(`"${name}" kategoriyasi muvaffaqiyatli yangilandi!`, 'success');
      setEditingCategory(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 1-tap Seasonal Toggle: Hide / Show
  const handleToggleHide = async (cat: Category) => {
    const newHiddenState = !cat.isHidden;
    try {
      await api.updateCategory(cat.id, { isHidden: newHiddenState });
      if (newHiddenState) {
        showToast(
          `"${cat.name}" va undagi tovarlar mijozlar saytidan vaqtincha yashirildi (Mavsumiy yopildi). Omborda to‘liq saqlandi!`,
          'info'
        );
      } else {
        showToast(
          `"${cat.name}" qayta ochildi va do‘kon saytida ko‘rsatilmoqda!`,
          'success'
        );
      }
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Reorder category up or down
  const handleMoveOrder = async (cat: Category, direction: 'up' | 'down') => {
    const currentIdx = realCategories.findIndex((c) => c.id === cat.id);
    if (currentIdx < 0) return;
    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= realCategories.length) return;

    const targetCat = realCategories[targetIdx];
    const tempOrder = cat.sortOrder || currentIdx + 1;
    const targetOrder = targetCat.sortOrder || targetIdx + 1;

    try {
      await Promise.all([
        api.updateCategory(cat.id, { sortOrder: targetOrder }),
        api.updateCategory(targetCat.id, { sortOrder: tempOrder }),
      ]);
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Safe delete initiation
  const handleInitiateDelete = (cat: Category) => {
    const prodsInCat = products.filter((p) => p.categorySlug === cat.slug);
    if (prodsInCat.length > 0) {
      setDeletingCategory(cat);
      setDeleteWarningProductsCount(prodsInCat.length);
      const otherCats = realCategories.filter((c) => c.slug !== cat.slug);
      setTargetCategorySlug(otherCats[0]?.slug || '');
    } else {
      if (window.confirm(`"${cat.name}" kategoriyasini o‘chirishni tasdiqlaysizmi?`)) {
        api.deleteCategory(cat.id)
          .then(() => {
            showToast(`"${cat.name}" kategoriyasi o‘chirildi`, 'success');
            onRefresh();
          })
          .catch((err) => showToast(err.message, 'error'));
      }
    }
  };

  // Move products and delete category
  const handleMoveAndDelete = async () => {
    if (!deletingCategory || !targetCategorySlug) return;
    setIsMovingAndDeleting(true);
    try {
      // 1. Move all products to target category
      const moveRes = await api.moveCategoryProducts(deletingCategory.id, targetCategorySlug);
      // 2. Delete the empty category
      await api.deleteCategory(deletingCategory.id, true);
      showToast(
        `${moveRes.movedCount} ta mahsulot boshqa kategoriyaga o‘tkazildi va "${deletingCategory.name}" o‘chirildi!`,
        'success'
      );
      setDeletingCategory(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsMovingAndDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Folder className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">
                  📁 Kategoriyalarni Boshqarish
                </h2>
                <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">
                  Mavsumiy do‘kon va tartib boshqaruvi
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Kiyimlarni mavsumga qarab boshqaring (masalan, yozda Kurtkalarni yashirib, qishda qayta ochish).
              Yashirilgan kategoriya mahsulotlari omborda to‘liq saqlanadi, lekin mijozlar saytidan vaqtincha berkitiladi.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl gold-gradient-bg text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#d4af37]/20 hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Yangi kategoriya</span>
          </button>
        </div>

        {/* Informational Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-slate-800/80">
          <div className="bg-[#0b0f17] p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Jami kategoriyalar</span>
            <span className="text-lg font-black text-white">{realCategories.length} ta</span>
          </div>
          <div className="bg-[#0b0f17] p-3 rounded-2xl border border-emerald-900/30 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">🟢 Saytda faol (Ko‘rinadi)</span>
            <span className="text-lg font-black text-emerald-400">
              {realCategories.filter((c) => !c.isHidden).length} ta
            </span>
          </div>
          <div className="bg-[#0b0f17] p-3 rounded-2xl border border-rose-900/30 flex items-center justify-between">
            <span className="text-xs font-bold text-rose-400">🔴 Yashirilgan (Mavsumiy)</span>
            <span className="text-lg font-black text-rose-400">
              {realCategories.filter((c) => c.isHidden).length} ta
            </span>
          </div>
        </div>
      </div>

      {/* Category Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {realCategories.map((cat, idx) => {
          const productCount = products.filter((p) => p.categorySlug === cat.slug).length;
          const isHidden = Boolean(cat.isHidden);

          return (
            <div
              key={cat.id}
              className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col justify-between shadow-lg ${
                isHidden
                  ? 'bg-rose-950/10 border-rose-900/40 opacity-85'
                  : 'bg-[#131b2a] border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Top Status & Order Controls */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  {/* Status Badge */}
                  {isHidden ? (
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span>🔴 Yashirilgan (Mavsumiy)</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>🟢 Saytda ko‘rinadi</span>
                    </span>
                  )}

                  {/* Move Up/Down Order */}
                  <div className="flex items-center gap-1 bg-[#0b0f17] p-1 rounded-xl border border-slate-800">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMoveOrder(cat, 'up')}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Yuqoriga surish"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={idx === realCategories.length - 1}
                      onClick={() => handleMoveOrder(cat, 'down')}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 cursor-pointer"
                      title="Pastga surish"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Category Main Info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0b0f17] border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Folder className="w-5 h-5 text-amber-400" />
                    )}
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white leading-tight">
                      {cat.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-slate-400 font-medium">
                        {productCount} ta mahsulot
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-[10px] text-slate-500">
                        slug: {cat.slug}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Seasonal Hide/Show, Edit, Delete */}
              <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                {/* 1-Tap Seasonal Toggle */}
                <button
                  onClick={() => handleToggleHide(cat)}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    isHidden
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                  }`}
                  title={isHidden ? 'Saytda qayta ko‘rsatish' : 'Saytdan vaqtincha yashirish'}
                >
                  {isHidden ? (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ko‘rsatish</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      <span>Yashirish</span>
                    </>
                  )}
                </button>

                {/* Edit Button */}
                <button
                  onClick={() => openEditModal(cat)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                  title="Tahrirlash"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleInitiateDelete(cat)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition cursor-pointer"
                  title="O‘chirish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: CREATE NEW CATEGORY */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2a] border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Folder className="w-4 h-4 text-amber-400" />
                <span>Yangi kategoriya qo‘shish</span>
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Kategoriya nomi:
                </label>
                <input
                  type="text"
                  placeholder="Masalan: Futbolka, Dvoyka, Kurtka..."
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]/g, '-')) {
                      setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }
                  }}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#d4af37]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Slug (URL identifikatori):
                </label>
                <input
                  type="text"
                  placeholder="Masalan: futbolka"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Tartib raqami (Sort Order):
                </label>
                <input
                  type="number"
                  min="1"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Rasm havolasi (ixtiyoriy):
                </label>
                <input
                  type="text"
                  placeholder="https://... yoki /banners/..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl gold-gradient-bg text-black text-xs font-extrabold shadow-lg hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? 'Saqlanmoqda...' : 'Kategoriyani saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT CATEGORY */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2a] border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <span>Kategoriyani tahrirlash</span>
              </h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Kategoriya nomi:
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Slug (URL identifikatori):
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#d4af37]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Tartib raqami (Sort Order):
                </label>
                <input
                  type="number"
                  min="1"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Rasm havolasi (ixtiyoriy):
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                />
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl gold-gradient-bg text-black text-xs font-extrabold shadow-lg hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? 'Yangilanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAFE DELETE MODAL WITH MOVE PRODUCTS OPTION */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131b2a] border border-amber-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
              <span className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-black text-white">
                  Diqqat: Kategoriya bo‘sh emas!
                </h3>
                <span className="text-xs text-amber-400 font-semibold">
                  "{deletingCategory.name}" ichida {deleteWarningProductsCount} ta mahsulot mavjud
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Mahsulotlar va ularning ombordagi qoldiqlari tasodifan yo‘qolib ketmasligi uchun quyidagi 2 ta xavfsiz yo‘ldan birini tanlang:
            </p>

            <div className="space-y-4">
              {/* Option 1: Seasonal Hide instead of Delete (Recommended) */}
              <div className="p-4 rounded-2xl bg-[#0b0f17] border border-slate-800 hover:border-emerald-500/50 transition">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>1-yo‘l: Vaqtincha yashirish</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-extrabold">
                      TAVSIYA ETILADI
                    </span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Mahsulotlar va qoldiqlar omborda butunligicha saqlanadi, faqat saytdan vaqtincha yashiriladi.
                </p>
                <button
                  onClick={() => {
                    handleToggleHide(deletingCategory);
                    setDeletingCategory(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black font-extrabold text-xs transition flex items-center justify-center gap-2"
                >
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Kategoriyani vaqtincha yashirish</span>
                </button>
              </div>

              {/* Option 2: Move products to another category and delete */}
              <div className="p-4 rounded-2xl bg-[#0b0f17] border border-slate-800">
                <span className="text-xs font-bold text-white block mb-1.5">
                  2-yo‘l: Mahsulotlarni boshqa kategoriyaga ko‘chirish va o‘chirish
                </span>
                <p className="text-[11px] text-slate-400 mb-2.5">
                  Mavjud {deleteWarningProductsCount} ta mahsulot tanlangan yangi kategoriyaga o‘tkaziladi, so‘ng bu kategoriya xavfsiz o‘chiriladi.
                </p>

                <div className="flex items-center gap-2 mb-3">
                  <select
                    value={targetCategorySlug}
                    onChange={(e) => setTargetCategorySlug(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#d4af37]"
                  >
                    {realCategories
                      .filter((c) => c.slug !== deletingCategory.slug)
                      .map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  disabled={!targetCategorySlug || isMovingAndDeleting}
                  onClick={handleMoveAndDelete}
                  className="w-full py-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500 hover:text-black font-extrabold text-xs transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <MoveRight className="w-3.5 h-3.5" />
                  <span>
                    {isMovingAndDeleting
                      ? 'Ko‘chirilmoqda...'
                      : 'Mahsulotlarni ko‘chirish va kategoriyani o‘chirish'}
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-right">
              <button
                onClick={() => setDeletingCategory(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
