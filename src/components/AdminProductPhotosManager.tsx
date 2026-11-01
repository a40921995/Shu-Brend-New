import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Plus,
  Trash2,
  Check,
  Star,
  Search,
  Filter,
  Eye,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Camera,
  Layers,
  Palette,
  ExternalLink,
  ChevronRight,
  X,
} from 'lucide-react';
import type { Product } from '../types/index.ts';
import { api, formatUzbekPrice } from '../lib/api.ts';

interface AdminProductPhotosManagerProps {
  products: Product[];
  onRefreshProducts: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialFilter?: 'ALL' | 'MISSING' | 'HAS_IMAGES' | 'BILLZ';
}

export const AdminProductPhotosManager: React.FC<AdminProductPhotosManagerProps> = ({
  products,
  onRefreshProducts,
  showToast,
  initialFilter = 'ALL',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MISSING' | 'HAS_IMAGES' | 'BILLZ'>(initialFilter);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [uploading, setUploading] = useState(false);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Draft state for selected product photos
  const [draftImages, setDraftImages] = useState<string[]>([]);
  const [draftColorImages, setDraftColorImages] = useState<Record<string, string[]>>({});
  const [selectedColorForAssign, setSelectedColorForAssign] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Helper: check if product has real images
  const hasRealImages = (p: Product) => {
    return (
      Array.isArray(p.images) &&
      p.images.length > 0 &&
      p.images.some((img) => img && !img.includes('placeholder') && img.trim() !== '')
    );
  };

  const missingCount = products.filter((p) => !hasRealImages(p)).length;
  const withImagesCount = products.filter((p) => hasRealImages(p)).length;
  const billzCount = products.filter((p) => Boolean(p.billzId)).length;

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    // Search
    const searchLower = searchTerm.toLowerCase().trim();
    if (searchLower) {
      const matchName = p.name.toLowerCase().includes(searchLower);
      const matchSku = p.sku?.toLowerCase().includes(searchLower);
      const matchBarcode = p.barcode?.toLowerCase().includes(searchLower);
      const matchBillz = p.billzId?.toLowerCase().includes(searchLower);
      const matchCat = p.categoryName.toLowerCase().includes(searchLower);
      if (!matchName && !matchSku && !matchBarcode && !matchBillz && !matchCat) return false;
    }

    // Filter
    if (activeFilter === 'MISSING') return !hasRealImages(p);
    if (activeFilter === 'HAS_IMAGES') return hasRealImages(p);
    if (activeFilter === 'BILLZ') return Boolean(p.billzId);
    return true;
  });

  // Open photo editor for product
  const handleOpenEditor = (product: Product) => {
    setSelectedProduct(product);
    setDraftImages(Array.isArray(product.images) ? [...product.images] : []);
    setDraftColorImages(product.colorImages ? { ...product.colorImages } : {});
    setSelectedColorForAssign(product.colors?.[0] || '');
  };

  // Close editor
  const handleCloseEditor = () => {
    setSelectedProduct(null);
    setDraftImages([]);
    setDraftColorImages({});
  };

  // Upload file handler (supports multiple from phone or computer)
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedProduct) return;

    try {
      setUploading(true);
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Rasm yuklashda xatolik yuz berdi');
        }

        const data = await res.json();
        if (data.url) {
          uploadedUrls.push(data.url);
        }
      }

      if (uploadedUrls.length > 0) {
        setDraftImages((prev) => [...prev, ...uploadedUrls]);
        showToast(`${uploadedUrls.length} ta rasm yuklandi!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Rasm yuklab bo‘lmadi', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // Set primary image (move to index 0)
  const handleSetPrimary = (index: number) => {
    if (index === 0) return;
    setDraftImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
    showToast('Asosiy rasm belgilandi', 'info');
  };

  // Remove image
  const handleRemoveImage = (index: number) => {
    setDraftImages((prev) => prev.filter((_, idx) => idx !== index));
    showToast('Rasm olib tashlandi', 'info');
  };

  // Assign image to a specific color
  const handleAssignToColor = (imageUrl: string, color: string) => {
    if (!color) return;
    setDraftColorImages((prev) => {
      const currentList = prev[color] || [];
      const updated = currentList.includes(imageUrl) ? currentList : [...currentList, imageUrl];
      return {
        ...prev,
        [color]: updated,
      };
    });
    showToast(`Rasm "${color}" rangiga biriktirildi`, 'success');
  };

  // Remove from color
  const handleRemoveFromColor = (imageUrl: string, color: string) => {
    setDraftColorImages((prev) => {
      const currentList = prev[color] || [];
      return {
        ...prev,
        [color]: currentList.filter((img) => img !== imageUrl),
      };
    });
  };

  // Save changes to backend
  const handleSavePhotos = async () => {
    if (!selectedProduct) return;
    try {
      setSavingPhotos(true);
      const res = await api.updateProductPhotos(selectedProduct.id, {
        images: draftImages,
        colorImages: draftColorImages,
      });

      showToast(res.message || 'Mahsulot rasmlari muvaffaqiyatli saqlandi!', 'success');
      onRefreshProducts();
      handleCloseEditor();
    } catch (err: any) {
      showToast(err.message || 'Rasmlarni saqlashda xatolik', 'error');
    } finally {
      setSavingPhotos(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">Mahsulot Rasmlari Tizimi</h3>
              <p className="text-xs text-slate-400">
                BILLZ mahsulotlari va sayt tovarlariga telefon va kompyuterdan rasm yuklash, asosiy rasmni tanlash va ranglarga biriktirish
              </p>
            </div>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeFilter === 'ALL'
                ? 'bg-amber-400 text-black font-black'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>Barchasi</span>
            <span className="opacity-80">({products.length})</span>
          </button>

          <button
            onClick={() => setActiveFilter('MISSING')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeFilter === 'MISSING'
                ? 'bg-rose-500 text-white font-black'
                : 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Rasmsiz tovarlar</span>
            <span className="font-mono">({missingCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('HAS_IMAGES')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeFilter === 'HAS_IMAGES'
                ? 'bg-emerald-500 text-white font-black'
                : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Rasmlilar</span>
            <span className="font-mono">({withImagesCount})</span>
          </button>

          <button
            onClick={() => setActiveFilter('BILLZ')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeFilter === 'BILLZ'
                ? 'bg-blue-500 text-white font-black'
                : 'bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 border border-blue-500/30'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>BILLZ tovarlari</span>
            <span className="font-mono">({billzCount})</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Mahsulot nomi, SKU, shtrix-kod yoki BILLZ ID bo‘yicha izlash..."
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#131b2a] border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => {
          const hasImages = hasRealImages(product);
          const primaryImg = product.images?.[0] || 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=400';
          const imagesCount = product.images?.length || 0;

          return (
            <div
              key={product.id}
              className="bg-[#131b2a] border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition flex flex-col justify-between group"
            >
              <div className="flex gap-3.5">
                {/* Thumbnail */}
                <div className="relative w-20 h-24 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden shrink-0">
                  <img
                    src={primaryImg}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    onError={(e: any) => {
                      e.target.src = 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=400';
                    }}
                  />
                  {!hasImages && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-1 text-center">
                      <span className="text-[9px] font-black text-rose-400 uppercase leading-tight">
                        Rasm yo‘q
                      </span>
                    </div>
                  )}
                  {imagesCount > 1 && (
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/80 text-[10px] font-mono text-white">
                      +{imagesCount - 1}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase text-amber-400 px-2 py-0.5 rounded-md bg-amber-400/10">
                      {product.categoryName}
                    </span>
                    {product.billzId && (
                      <span className="text-[9px] font-mono text-blue-300 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                        BILLZ #{product.billzId.slice(-4)}
                      </span>
                    )}
                    {product.hasCustomImages && (
                      <span className="text-[9px] font-bold text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                        Qo‘lda yuklangan
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-bold text-white truncate" title={product.name}>
                    {product.name}
                  </h4>

                  <div className="text-xs font-black text-slate-200">
                    {formatUzbekPrice(product.price)}
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    {product.sku && <span>SKU: {product.sku}</span>}
                    <span>Qoldiq: <b className="text-white">{product.stock} ta</b></span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span
                  className={`text-[11px] font-bold flex items-center gap-1 ${
                    hasImages ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {hasImages ? (
                    <>
                      <Check className="w-3 h-3" /> {imagesCount} ta rasm
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3" /> Rasmsiz (Yuklash kerak)
                    </>
                  )}
                </span>

                <button
                  onClick={() => handleOpenEditor(product)}
                  className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400 text-amber-300 hover:text-black font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Rasmlarni boshqarish</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-12 text-center text-slate-400">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          <p className="font-bold text-sm text-slate-300">Belgilangan shart bo‘yicha mahsulotlar topilmadi</p>
          <p className="text-xs text-slate-500 mt-1">Qidiruv so‘zini o‘zgartiring yoki boshqa filtrni tanlang</p>
        </div>
      )}

      {/* --- PHOTO MANAGEMENT MODAL --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-[#131b2a] border border-slate-800 rounded-3xl max-w-4xl w-full p-5 sm:p-7 space-y-6 max-h-[92vh] overflow-y-auto shadow-2xl relative">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400/10 text-amber-300 border border-amber-400/20">
                    {selectedProduct.categoryName}
                  </span>
                  {selectedProduct.billzId && (
                    <span className="text-[10px] font-mono text-blue-300 px-2 py-0.5 rounded bg-blue-500/10">
                      BILLZ ID: {selectedProduct.billzId}
                    </span>
                  )}
                  {selectedProduct.sku && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      SKU: {selectedProduct.sku}
                    </span>
                  )}
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                  {selectedProduct.name} — Rasmlar Galereyasi
                </h3>
              </div>

              <button
                onClick={handleCloseEditor}
                className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Upload Buttons */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  Yangi rasm yuklash (Telefon yoki Kompyuterdan)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  JPG, PNG, WEBP formatlari qo‘llab-quvvatlanadi. Bir vaqtning o‘zida bir nechta fayl tanlashingiz mumkin.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />

                {/* Mobile Camera Input */}
                <input
                  type="file"
                  ref={cameraInputRef}
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileUpload(e.target.files)}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer sm:hidden"
                >
                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kameradan olish</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 rounded-xl gold-gradient-bg text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10 hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  {uploading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  <span>{uploading ? 'Yuklanmoqda...' : 'Rasm tanlash / Yuklash'}</span>
                </button>
              </div>
            </div>

            {/* Current Images Gallery */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  Joriy rasmlar ro‘yxati ({draftImages.length} ta)
                </span>
                <span className="text-[11px] text-slate-500">
                  Birinchi rasm (Index #1) saytda asosiy muqova (Hero) bo‘lib ko‘rsatiladi.
                </span>
              </div>

              {draftImages.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center text-slate-500">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                  <p className="text-xs font-bold text-slate-400">Bu mahsulotda hali hech qanday rasm mavjud emas</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">Yuqoridagi "Rasm tanlash" tugmasi orqali rasm yuklang</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {draftImages.map((imgUrl, index) => {
                    const isPrimary = index === 0;

                    return (
                      <div
                        key={imgUrl + index}
                        className={`relative rounded-2xl bg-slate-900 border overflow-hidden group flex flex-col justify-between ${
                          isPrimary
                            ? 'border-amber-400 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/50'
                            : 'border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {/* Image Preview */}
                        <div className="relative aspect-[3/4] overflow-hidden bg-black/40">
                          <img
                            src={imgUrl}
                            alt={`Mahsulot rasmi #${index + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            onError={(e: any) => {
                              e.target.src = 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=400';
                            }}
                          />

                          {/* Primary Badge */}
                          {isPrimary && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-black flex items-center gap-1 shadow-md">
                              <Star className="w-3 h-3 fill-black" /> Asosiy
                            </span>
                          )}

                          {/* Quick view button */}
                          <button
                            type="button"
                            onClick={() => setPreviewImage(imgUrl)}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black text-white text-xs opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            title="Kattalashtirib ko‘rish"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Controls */}
                        <div className="p-2.5 bg-slate-950/80 border-t border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between gap-1">
                            {!isPrimary ? (
                              <button
                                type="button"
                                onClick={() => handleSetPrimary(index)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-black text-[10px] font-bold text-slate-300 transition cursor-pointer flex items-center gap-1"
                              >
                                <Star className="w-3 h-3" />
                                <span>Asosiy qilish</span>
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Asosiy muqova
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveImage(index)}
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                              title="Rasmni o‘chirish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Color assign selector if product has colors */}
                          {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-800/60">
                              <label className="text-[9px] font-bold text-slate-400 block mb-1">
                                Rangga biriktirish:
                              </label>
                              <div className="flex flex-wrap gap-1">
                                {selectedProduct.colors.map((c) => {
                                  const isAssigned = (draftColorImages[c] || []).includes(imgUrl);
                                  return (
                                    <button
                                      key={c}
                                      type="button"
                                      onClick={() => {
                                        if (isAssigned) {
                                          handleRemoveFromColor(imgUrl, c);
                                        } else {
                                          handleAssignToColor(imgUrl, c);
                                        }
                                      }}
                                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition cursor-pointer ${
                                        isAssigned
                                          ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                          : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700'
                                      }`}
                                    >
                                      {c} {isAssigned && '✓'}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Saqlangandan so‘ng ushbu rasmlar doimiy saqlanadi va BILLZ yangilanganda o‘chib ketmaydi.
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseEditor}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Bekor qilish
                </button>

                <button
                  type="button"
                  onClick={handleSavePhotos}
                  disabled={savingPhotos}
                  className="px-5 py-2 rounded-xl gold-gradient-bg text-black font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 cursor-pointer"
                >
                  {savingPhotos ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{savingPhotos ? 'Saqlanmoqda...' : 'Rasmlarni saqlash'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- LIGHTBOX FULLSCREEN PREVIEW --- */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImage}
              alt="Oldindan ko‘rish"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white font-bold text-sm bg-slate-800/80 px-3 py-1 rounded-full cursor-pointer"
            >
              Yopish ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
