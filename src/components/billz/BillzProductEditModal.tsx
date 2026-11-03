import React, { useState } from 'react';
import {
  X,
  Save,
  Rocket,
  Image as ImageIcon,
  Upload,
  Star,
  Trash2,
  DollarSign,
  Layers,
  Sparkles,
  Building2,
  Tag,
  Eye,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { BillzStagingProduct, BillzProductStatus } from '../../types/index.ts';
import { api, formatUzbekPrice } from '../../lib/api.ts';

interface BillzProductEditModalProps {
  item: BillzStagingProduct;
  onClose: () => void;
  onSave: (updatedItem: BillzStagingProduct) => void;
  onPublish: (publishedItem: BillzStagingProduct) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const BillzProductEditModal: React.FC<BillzProductEditModalProps> = ({
  item,
  onClose,
  onSave,
  onPublish,
  showToast,
}) => {
  // Form fields
  const [name, setName] = useState(item.name || '');
  const [sku, setSku] = useState(item.sku || '');
  const [barcode, setBarcode] = useState(item.barcode || '');
  const [categoryName, setCategoryName] = useState(item.categoryName || 'Erkaklar kiyimi');
  const [brand, setBrand] = useState(item.brand || 'SHU BREND');
  const [price, setPrice] = useState(item.price || 0);
  const [discountPrice, setDiscountPrice] = useState(item.discountPrice || 0);
  const [costPrice, setCostPrice] = useState(item.costPrice || 0);
  const [description, setDescription] = useState(item.description || '');
  const [colorsInput, setColorsInput] = useState((item.colors || []).join(', '));
  const [sizesInput, setSizesInput] = useState((item.sizes || []).join(', '));
  const [mainWarehouseStock, setMainWarehouseStock] = useState(item.mainWarehouseStock || 0);
  const [branchStock, setBranchStock] = useState(item.branchStock || 0);
  const [status, setStatus] = useState<BillzProductStatus>(item.status || 'EDITING');

  // Images state
  const [images, setImages] = useState<string[]>(item.images || []);
  const [hasCustomImages, setHasCustomImages] = useState(item.hasCustomImages || false);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  // Loading actions
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Handle Image Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploadingImage(true);
      const file = files[0];
      const url = await api.uploadFile(file);
      setImages((prev) => [...prev, url]);
      setHasCustomImages(true);
      showToast('Rasm muvaffaqiyatli yuklandi!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Rasm yuklashda xatolik', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    const trimmed = newImageUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/uploads/')) {
      showToast('Iltimos, to‘g‘ri rasm URL manzilini kiriting', 'error');
      return;
    }
    setImages((prev) => [...prev, trimmed]);
    setHasCustomImages(true);
    setNewImageUrl('');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setHasCustomImages(true);
  };

  const handleSetPrimaryImage = (indexToPrimary: number) => {
    setImages((prev) => {
      const copy = [...prev];
      const [primary] = copy.splice(indexToPrimary, 1);
      return [primary, ...copy];
    });
    setHasCustomImages(true);
  };

  const getPayload = (): Partial<BillzStagingProduct> => {
    const colors = colorsInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const sizes = sizesInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      name: name.trim(),
      sku: sku.trim() || undefined,
      barcode: barcode.trim() || undefined,
      categoryName: categoryName.trim(),
      brand: brand.trim(),
      price: Number(price) || 0,
      discountPrice: discountPrice ? Number(discountPrice) : undefined,
      costPrice: costPrice ? Number(costPrice) : undefined,
      description: description.trim(),
      colors,
      sizes,
      mainWarehouseStock: Number(mainWarehouseStock) || 0,
      branchStock: Number(branchStock) || 0,
      totalStock: (Number(mainWarehouseStock) || 0) + (Number(branchStock) || 0),
      status,
      images,
      hasCustomImages,
    };
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      const updates = getPayload();
      const res = await api.updateBillzStagingProduct(item.id, updates);
      showToast(res.message || 'Mahsulot o‘zgarishlari saqlandi!', 'success');
      onSave(res.item);
    } catch (err: any) {
      showToast(err.message || 'Saqlashda xatolik yuz berdi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndPublish = async () => {
    try {
      setPublishing(true);
      const updates = getPayload();
      const res = await api.publishBillzStagingProduct(item.id, updates);
      if (res.success && res.stagingProduct) {
        showToast(
          res.message || 'Mahsulot muvaffaqiyatli web saytga chiqarildi!',
          'success'
        );
        onPublish(res.stagingProduct);
      } else {
        showToast(res.message || 'Saytga chiqarishda xatolik', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Saytga chiqarish jarayonida xatolik', 'error');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-[#101726] border border-slate-800 rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between gap-4 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gold-gradient-bg text-black font-black flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                Mahsulotni Tahrirlash & Tasdiqlash
              </h3>
              <p className="text-xs text-slate-400">
                BILLZ ID: <code className="text-amber-300 font-mono">{item.billzId}</code> | Status: <b className="text-white">{status}</b>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 text-xs sm:text-sm">
          {/* Photos Management Section */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-black text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  Mahsulot Rasmlari Galereyasi ({images.length} ta)
                </span>
                <p className="text-[11px] text-slate-400">
                  {hasCustomImages
                    ? '✓ Qo‘lda yuklangan rasmlar mavjud (Avto-sinxronizatsiya ularni buzmaydi)'
                    : 'BILLZ dasturidan olingan standart rasmlar'}
                </p>
              </div>

              {/* Upload Button */}
              <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-2 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingImage ? 'Yuklanmoqda...' : 'Fayl yuklash (PC/Tel)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>

            {/* Images Grid */}
            {images.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Hozircha rasmlar mavjud emas. Yuqoridagi tugma orqali kompyuterdan rasm yuklang.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                {images.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-xl bg-slate-900 border border-slate-800 overflow-hidden aspect-square flex items-center justify-center"
                  >
                    <img
                      src={img}
                      alt={`Mahsulot ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-400 text-black shadow">
                        Asosiy
                      </span>
                    )}

                    {/* Actions overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryImage(idx)}
                          className="p-1.5 rounded-lg bg-amber-400 text-black hover:scale-110 transition cursor-pointer"
                          title="Asosiy rasm qilish"
                        >
                          <Star className="w-3.5 h-3.5 fill-black" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="p-1.5 rounded-lg bg-rose-500 text-white hover:scale-110 transition cursor-pointer"
                        title="O‘chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add by URL */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Rasm havolasi (URL) orqali qo‘shish..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleAddImageUrl}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                URL Qo‘shish
              </button>
            </div>
          </div>

          {/* General Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Title */}
            <div className="sm:col-span-2 space-y-1">
              <label className="text-xs font-bold text-slate-300">Mahsulot Nomi *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Kategoriya</label>
              <input
                type="text"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Erkaklar kiyimi"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* SKU */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Artikul (SKU)</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="SHU-001"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Barcode */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Shtrix-kod</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="200000000000"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Brand */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Brend</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="SHU BREND"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
            <span className="font-bold text-amber-300 text-xs block">
              Narxlar Boshqaruvi
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Selling Price */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-white">Sotish Narxi (so‘m) *</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  required
                  min={0}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-amber-300 font-black text-sm focus:outline-none focus:border-amber-400"
                />
                <span className="text-[11px] text-slate-400 block font-mono">
                  {formatUzbekPrice(price)}
                </span>
              </div>

              {/* Discount Price */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Chegirma Narxi (so‘m)</label>
                <input
                  type="number"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(Number(e.target.value))}
                  min={0}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-rose-300 font-bold focus:outline-none focus:border-amber-400"
                />
                <span className="text-[11px] text-slate-400 block font-mono">
                  {discountPrice > 0 ? formatUzbekPrice(discountPrice) : 'Chegirmasiz'}
                </span>
              </div>

              {/* Cost Price */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-400 flex items-center justify-between">
                  <span>Tannarx (Kirim)</span>
                  <span className="text-[10px] text-slate-500 font-normal">Faqat admin uchun</span>
                </label>
                <input
                  type="number"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  min={0}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 focus:outline-none focus:border-amber-400"
                />
                <span className="text-[11px] text-slate-500 block font-mono">
                  {costPrice > 0 ? formatUzbekPrice(costPrice) : 'Belgilanmagan'}
                </span>
              </div>
            </div>
          </div>

          {/* Warehouses Stock Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Main Warehouse "SHU BREND" */}
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
              <label className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                Asosiy «SHU BREND» Ombori Qoldig‘i (Sayt xaridi uchun) *
              </label>
              <input
                type="number"
                value={mainWarehouseStock}
                onChange={(e) => setMainWarehouseStock(Number(e.target.value))}
                min={0}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-emerald-500/40 text-emerald-300 font-black text-base focus:outline-none focus:border-emerald-400"
              />
              <p className="text-[11px] text-slate-400">
                Web sayt xaridorlari aynan shu qoldiq bo‘yicha tovar xarid qila oladi. Agar 0 bo‘lsa, «Sotuvda mavjud emas» bo‘ladi.
              </p>
            </div>

            {/* Branch Warehouse "Mingbuloq" */}
            <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 space-y-1.5">
              <label className="text-xs font-black text-blue-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                «Mingbuloq» Filiali Qoldig‘i
              </label>
              <input
                type="number"
                value={branchStock}
                onChange={(e) => setBranchStock(Number(e.target.value))}
                min={0}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-blue-500/40 text-blue-300 font-black text-base focus:outline-none focus:border-blue-400"
              />
              <p className="text-[11px] text-slate-400">
                Ushbu zaxira filial savdosi uchun. U asosiy ombor qoldig‘iga qo‘shilmaydi.
              </p>
            </div>
          </div>

          {/* Variants: Colors & Sizes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Ranglar (vergul bilan ajrating)
              </label>
              <input
                type="text"
                value={colorsInput}
                onChange={(e) => setColorsInput(e.target.value)}
                placeholder="Qora, Oq, Ko‘k"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">
                Razmerlar (vergul bilan ajrating)
              </label>
              <input
                type="text"
                value={sizesInput}
                onChange={(e) => setSizesInput(e.target.value)}
                placeholder="S, M, L, XL, XXL"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">
              Mahsulot Tavsifi (Saytda ko‘rsatiladi)
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mahsulot haqida batafsil ma’lumot, mato tarkibi, model xususiyatlari..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          {/* Staging Status Selector */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <label className="text-xs font-bold text-slate-300">
              Staging Holati (Ish jarayoni)
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BillzProductStatus)}
              className="w-full sm:w-64 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white font-bold text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="SELECTED">1. Tanlangan (SELECTED)</option>
              <option value="UNDER_REVIEW">2. Ko‘rib chiqilmoqda (UNDER_REVIEW)</option>
              <option value="EDITING">3. Tahrirlanmoqda (EDITING)</option>
              <option value="READY">4. Saytga chiqarishga tayyor (READY)</option>
              <option value="PUBLISHED">5. Saytga chiqarilgan (PUBLISHED)</option>
              <option value="REJECTED">6. Rad etilgan (REJECTED)</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
          >
            Bekor qilish
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || publishing}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saqlanmoqda...' : 'Qoralama saqlash'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndPublish}
              disabled={publishing || saving}
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl gold-gradient-bg text-black font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition cursor-pointer disabled:opacity-50"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>{publishing ? 'Chiqarilmoqda...' : '🚀 Web Saytga Jo‘natish'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
