import React, { useEffect, useState } from 'react';
import {
  Heart,
  ShoppingBag,
  Star,
  Truck,
  ShieldCheck,
  RotateCcw,
  Plus,
  Minus,
  Check,
  MessageSquare,
  ChevronRight,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api, formatUzbekPrice } from '../lib/api.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import type { Product, Review } from '../types/index.ts';

export const ProductDetailPage: React.FC = () => {
  const {
    selectedProductId,
    setActiveTab,
    addToCart,
    isFavorite,
    toggleFavorite,
    showToast,
    user,
  } = useApp();

  const [product, setProduct] = useState<Product | null>(null);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [activeTabName, setActiveTabName] = useState<'tavsif' | 'olchamlar' | 'izohlar'>('tavsif');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Review form state
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!selectedProductId) return;

    async function loadProduct() {
      try {
        setLoading(true);
        const prod = await api.getProduct(selectedProductId!);
        setProduct(prod);
        setActiveImageIdx(0);
        setSelectedSize(prod.sizes[0] || 'L');
        setSelectedColor(prod.colors[0] || 'Qora');
        setQuantity(1);

        const [revList, allProds] = await Promise.all([
          api.getReviews(prod.id),
          api.getProducts({ category: prod.categorySlug }),
        ]);
        setReviews(revList);
        setRelatedProducts(allProds.filter((p) => p.id !== prod.id).slice(0, 4));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [selectedProductId]);

  if (loading || !product) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#d4af37]/30 border-t-[#d4af37] rounded-full animate-spin" />
      </div>
    );
  }

  const favorited = isFavorite(product.id);

  const handleAddToCart = () => {
    addToCart(product, selectedSize, selectedColor, quantity);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingReview(true);
    try {
      const added = await api.addReview({
        productId: product.id,
        userId: user?.id || 'usr_guest',
        userName: user?.name || 'Xaridor',
        rating: newRating,
        comment: newComment,
      });
      setReviews((prev) => [added, ...prev]);
      setNewComment('');
      showToast('Izohingiz muvaffaqiyatli qabul qilindi!', 'success');
    } catch {
      showToast('Izoh qoldirishda xatolik yuz berdi', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
      {/* Breadcrumbs Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-400 mb-6 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveTab('clothing')}
          className="hover:text-white flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Orqaga</span>
        </button>
        <span>/</span>
        <button onClick={() => setActiveTab('home')} className="hover:text-white">
          Bosh sahifa
        </button>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <button onClick={() => setActiveTab('clothing')} className="hover:text-white">
          Kiyimlar
        </button>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-[#d4af37] font-semibold">{product.categoryName}</span>
        <ChevronRight className="w-3 h-3 text-slate-600" />
        <span className="text-white truncate max-w-[180px]">{product.name}</span>
      </div>

      {/* Main Product Showcase (Left Gallery + Right Controls) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Gallery (Thumbnails + Big Image) */}
        <div className="lg:col-span-7 flex flex-col-reverse sm:flex-row gap-4">
          {/* Thumbnails (Vertical on desktop) */}
          {product.images.length > 1 && (
            <div className="flex sm:flex-col gap-3 overflow-x-auto sm:overflow-y-auto max-h-[520px] no-scrollbar">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`relative w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                    activeImageIdx === idx
                      ? 'border-[#d4af37] ring-2 ring-[#d4af37]/30 scale-102'
                      : 'border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Big Featured Image */}
          <div className="relative flex-1 aspect-[3/4] max-h-[580px] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
            <img
              src={product.images[activeImageIdx] || product.images[0]}
              alt={product.name}
              className={`w-full h-full object-cover object-center transition-all duration-300 ${
                product.stock <= 0 ? 'grayscale-[35%] opacity-85' : ''
              }`}
            />
            {/* Out of stock overlay banner */}
            {product.stock <= 0 && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-rose-600/95 text-white px-5 py-2.5 rounded-2xl font-black text-base sm:text-lg tracking-wider shadow-2xl border border-rose-400/40 flex items-center gap-2">
                  <span className="text-xl">❌</span>
                  <span>SOTUVDA YO‘Q</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 max-w-xs font-medium">
                  Ushbu mahsulot barcha rang va o‘lchamlarda vaqtincha tugadi. Yangi partiya keltirilganda sotuvga chiqadi.
                </p>
              </div>
            )}
            {product.discountPrice && product.stock > 0 && (
              <span className="absolute top-4 left-4 px-3 py-1 rounded-xl text-xs font-black bg-rose-600 text-white shadow-lg">
                -{Math.round(((product.discountPrice - product.price) / product.discountPrice) * 100)}% CHEGIRMA
              </span>
            )}
          </div>
        </div>

        {/* Right Product Details & Action Panel */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            {/* Category & Rating */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#d4af37]">
                {product.categoryName}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>{product.rating}</span>
                <span className="text-slate-400">({product.reviewCount} izoh)</span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-2 leading-tight">
              {product.name}
            </h1>

            {/* Price section */}
            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {formatUzbekPrice(product.price)}
              </span>
              {product.discountPrice && (
                <span className="text-base text-slate-500 line-through">
                  {formatUzbekPrice(product.discountPrice)}
                </span>
              )}
            </div>

            {/* Color selection */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Rang: <strong className="text-white">{selectedColor}</strong>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {product.colors.map((color) => {
                  const colorHasStock = !product.variants || product.variants.length === 0
                    ? product.stock > 0
                    : product.variants.some(
                        v => v.color.trim().toLowerCase() === color.trim().toLowerCase() && v.stock > 0
                      );

                  return (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        // Auto-select first available size in this color if current size is 0 stock
                        if (product.variants && product.variants.length > 0) {
                          const currV = product.variants.find(
                            v => v.color.trim().toLowerCase() === color.trim().toLowerCase() &&
                                 v.size.trim().toLowerCase() === selectedSize.trim().toLowerCase()
                          );
                          if (!currV || currV.stock <= 0) {
                            const firstAvail = product.variants.find(
                              v => v.color.trim().toLowerCase() === color.trim().toLowerCase() && v.stock > 0
                            );
                            if (firstAvail) setSelectedSize(firstAvail.size);
                          }
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        selectedColor === color
                          ? 'gold-gradient-bg text-black shadow'
                          : !colorHasStock
                          ? 'bg-slate-900/60 text-slate-500 border border-rose-900/50'
                          : 'bg-slate-900 text-slate-300 border border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      {selectedColor === color && <Check className="w-3.5 h-3.5" />}
                      <span>{color}</span>
                      {!colorHasStock && (
                        <span className="text-[10px] text-rose-500 font-extrabold" title="Ushbu rang barcha razmerlarda tugagan">❌</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size selection */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  O‘lcham: <strong className="text-white">{selectedSize}</strong>
                </span>
                <button
                  onClick={() => setActiveTabName('olchamlar')}
                  className="text-[11px] text-[#d4af37] hover:underline"
                >
                  O‘lcham jadvali
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {product.sizes.map((sz) => {
                  const variant = product.variants?.find(
                    v => v.size.trim().toLowerCase() === sz.trim().toLowerCase() &&
                         v.color.trim().toLowerCase() === selectedColor.trim().toLowerCase()
                  );
                  const szStock = variant !== undefined ? variant.stock : product.stock;
                  const isAvailable = szStock > 0;

                  return (
                    <button
                      key={sz}
                      disabled={!isAvailable}
                      onClick={() => {
                        if (isAvailable) {
                          setSelectedSize(sz);
                          setQuantity(1);
                        }
                      }}
                      className={`relative py-2.5 px-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center gap-0.5 ${
                        !isAvailable
                          ? 'bg-slate-900/40 text-slate-500 border border-rose-900/40 cursor-not-allowed opacity-75'
                          : selectedSize === sz
                          ? 'bg-[#d4af37] text-black shadow-lg shadow-[#d4af37]/30 scale-102 cursor-pointer font-black'
                          : 'bg-slate-900 text-slate-200 border border-slate-700 hover:bg-slate-800 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className={!isAvailable ? 'line-through text-slate-400' : ''}>{sz}</span>
                        {!isAvailable && <span className="text-[10px] text-rose-500 font-bold">❌</span>}
                      </div>
                      <span className={`text-[9px] ${!isAvailable ? 'text-rose-400' : selectedSize === sz ? 'text-black/80 font-bold' : 'text-slate-400'}`}>
                        {isAvailable ? `${szStock} ta` : 'Tugagan'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Variant Stock Status Box */}
            {(() => {
              const currentVariant = product.variants?.find(
                v => v.size.trim().toLowerCase() === selectedSize.trim().toLowerCase() &&
                     v.color.trim().toLowerCase() === selectedColor.trim().toLowerCase()
              );
              const activeStock = currentVariant !== undefined ? currentVariant.stock : product.stock;
              const hasStock = activeStock > 0;

              return (
                <div className={`mt-5 p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                  hasStock
                    ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-800/50 text-rose-300'
                }`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${hasStock ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                    <span>
                      Omborda mavjud ({selectedColor}, {selectedSize}):
                    </span>
                  </div>
                  <div className="font-extrabold flex items-center gap-1 text-sm">
                    {hasStock ? (
                      <span className="text-emerald-400">{activeStock} ta</span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1 font-bold">
                        <span>❌</span>
                        <span>Tugagan (0 ta)</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Product Identifiers & Branch info (SKU, Barcode, Brand) */}
            {(product.sku || product.barcode || product.brand || product.billzId) && (
              <div className="mt-3 py-2 px-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                {product.brand && (
                  <span>Brend: <strong className="text-slate-200">{product.brand}</strong></span>
                )}
                {product.sku && (
                  <span>Artikul / SKU: <code className="text-amber-300 font-mono">{product.sku}</code></span>
                )}
                {product.barcode && (
                  <span>Shtrix-kod: <code className="text-slate-300 font-mono">{product.barcode}</code></span>
                )}
                <span className="text-emerald-400/90 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Markaziy filialda mavjud
                </span>
              </div>
            )}

            {/* Quantity selector */}
            {(() => {
              const currentVariant = product.variants?.find(
                v => v.size.trim().toLowerCase() === selectedSize.trim().toLowerCase() &&
                     v.color.trim().toLowerCase() === selectedColor.trim().toLowerCase()
              );
              const maxAvailable = currentVariant !== undefined ? currentVariant.stock : product.stock;
              const canOrder = maxAvailable > 0;

              return (
                <div className="mt-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Miqdor:
                    </span>
                    <div className="flex items-center bg-slate-900 rounded-xl border border-slate-700 p-1">
                      <button
                        disabled={!canOrder || quantity <= 1}
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-10 text-center font-bold text-sm text-white">
                        {quantity}
                      </span>
                      <button
                        disabled={!canOrder || quantity >= maxAvailable}
                        onClick={() => {
                          if (quantity < maxAvailable) {
                            setQuantity((q) => q + 1);
                          } else {
                            showToast(`Omborda faqat ${maxAvailable} ta mahsulot mavjud!`, 'info');
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {canOrder && (
                    <span className="text-[11px] text-slate-400">
                      Maksimal: {maxAvailable} ta
                    </span>
                  )}
                </div>
              );
            })()}

            {/* Add to Cart & Favorite CTAs */}
            {(() => {
              const currentVariant = product.variants?.find(
                v => v.size.trim().toLowerCase() === selectedSize.trim().toLowerCase() &&
                     v.color.trim().toLowerCase() === selectedColor.trim().toLowerCase()
              );
              const maxAvailable = currentVariant !== undefined ? currentVariant.stock : product.stock;
              const canOrder = maxAvailable > 0;

              return (
                <div className="mt-7 flex items-center gap-3">
                  <button
                    disabled={!canOrder}
                    onClick={() => {
                      if (!canOrder) {
                        showToast('Ushbu o‘lcham va rang omborda tugagan!', 'error');
                        return;
                      }
                      handleAddToCart();
                    }}
                    className={`flex-1 py-4 rounded-xl font-extrabold text-sm sm:text-base tracking-wider uppercase shadow-xl transition flex items-center justify-center gap-2.5 ${
                      !canOrder
                        ? 'bg-slate-800/80 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                        : 'gold-gradient-bg text-black shadow-[#d4af37]/20 hover:brightness-110 active:scale-98 cursor-pointer'
                    }`}
                  >
                    <ShoppingBag className="w-5 h-5 stroke-[2.3]" />
                    <span>
                      {product.stock <= 0
                        ? '❌ Sotuvda yo‘q'
                        : !canOrder
                        ? '❌ Ushbu razmer tugagan'
                        : 'Savatga qo‘shish'}
                    </span>
                  </button>

                  <button
                    onClick={() => toggleFavorite(product.id)}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-700 text-white hover:bg-slate-800 transition active:scale-95 cursor-pointer"
                    aria-label="Yoqtirish"
                  >
                    <Heart
                      className={`w-6 h-6 transition-colors ${
                        favorited ? 'text-rose-500 fill-rose-500' : 'text-slate-400'
                      }`}
                    />
                  </button>
                </div>
              );
            })()}

            {/* Guarantees / Badges */}
            <div className="mt-8 grid grid-cols-3 gap-2.5 pt-6 border-t border-slate-800">
              <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
                <Truck className="w-5 h-5 text-[#d4af37] mb-1.5" />
                <span className="text-[11px] font-bold text-white">Bepul yetkazish</span>
                <span className="text-[10px] text-slate-400">1 kunda</span>
              </div>
              <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
                <ShieldCheck className="w-5 h-5 text-[#d4af37] mb-1.5" />
                <span className="text-[11px] font-bold text-white">Sifat kafolati</span>
                <span className="text-[10px] text-slate-400">100% original</span>
              </div>
              <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
                <RotateCcw className="w-5 h-5 text-[#d4af37] mb-1.5" />
                <span className="text-[11px] font-bold text-white">14 kun qaytarish</span>
                <span className="text-[10px] text-slate-400">Tekin almashtirish</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Tabs (Tavsif, O'lchamlar, Izohlar) */}
      <div className="mt-14 pt-8 border-t border-slate-800">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
          {[
            { id: 'tavsif', label: 'Tavsif va xususiyatlar' },
            { id: 'olchamlar', label: 'O‘lchamlar jadvali' },
            { id: 'izohlar', label: `Mijozlar izohlari (${reviews.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabName(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition cursor-pointer whitespace-nowrap ${
                activeTabName === tab.id
                  ? 'gold-gradient-bg text-black shadow-md'
                  : 'text-slate-400 hover:text-white bg-slate-900/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pt-6">
          {activeTabName === 'tavsif' && (
            <div className="max-w-3xl space-y-6">
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
                {product.description}
              </p>

              {product.details && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800/80">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Mato tarkibi</span>
                    <span className="text-xs sm:text-sm font-bold text-white mt-1 block">
                      {product.details.material}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Mavsum</span>
                    <span className="text-xs sm:text-sm font-bold text-white mt-1 block">
                      {product.details.season}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Bichim (Fit)</span>
                    <span className="text-xs sm:text-sm font-bold text-white mt-1 block">
                      {product.details.fit}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Ishlab chiqarilgan</span>
                    <span className="text-xs sm:text-sm font-bold text-white mt-1 block">
                      {product.details.origin}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTabName === 'olchamlar' && (
            <div className="max-w-xl bg-slate-900/80 rounded-2xl border border-slate-800 p-5 overflow-x-auto">
              <h4 className="text-sm font-bold text-white mb-3">Erkaklar kiyimi o‘lchamlari (sm)</h4>
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-slate-700 text-[#d4af37]">
                    <th className="py-2">O‘lcham</th>
                    <th className="py-2">Bo‘y (sm)</th>
                    <th className="py-2">Vazn (kg)</th>
                    <th className="py-2">Ko‘krak (sm)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="py-2 font-bold text-white">S (46)</td>
                    <td>165 - 172</td>
                    <td>58 - 66</td>
                    <td>90 - 94</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold text-white">M (48)</td>
                    <td>170 - 178</td>
                    <td>67 - 75</td>
                    <td>95 - 100</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold text-white">L (50)</td>
                    <td>175 - 183</td>
                    <td>76 - 84</td>
                    <td>101 - 106</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold text-white">XL (52)</td>
                    <td>180 - 188</td>
                    <td>85 - 93</td>
                    <td>107 - 112</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-bold text-white">XXL (54)</td>
                    <td>182 - 192</td>
                    <td>94 - 105</td>
                    <td>113 - 120</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {activeTabName === 'izohlar' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Existing Reviews */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#d4af37]" />
                  <span>Xaridorlar fikrlari ({reviews.length})</span>
                </h4>

                {reviews.length > 0 ? (
                  reviews.map((r) => (
                    <div key={r.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">{r.userName}</span>
                        <div className="flex items-center text-amber-400 text-xs">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300">{r.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Ushbu mahsulotga birinchi bo‘lib izoh qoldiring!</p>
                )}
              </div>

              {/* Leave Review Form */}
              <form onSubmit={handleReviewSubmit} className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800">
                <h4 className="text-sm font-bold text-white mb-4">Mahsulotga baho va izoh qoldirish</h4>

                <div className="mb-4">
                  <label className="text-xs text-slate-400 block mb-1">Baholang:</label>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setNewRating(val)}
                        className="p-1 hover:scale-110 transition cursor-pointer"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            val <= newRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-slate-400 block mb-1">Fikringiz:</label>
                  <textarea
                    rows={3}
                    required
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Mahsulot sifati, o‘lchami va ko‘rinishi haqida yozing..."
                    className="w-full px-3 py-2 bg-slate-950 text-xs text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-extrabold text-xs shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {submittingReview ? 'Yuborilmoqda...' : 'Izohni yuborish'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Related Products Carousel */}
      {relatedProducts.length > 0 && (
        <div className="mt-16 pt-8 border-t border-slate-800">
          <h3 className="text-xl font-black text-white mb-6">O‘xshash mahsulotlar</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {relatedProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
