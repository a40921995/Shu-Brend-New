import React, { useState } from 'react';
import { Heart, ShoppingBag, Eye, Star } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { formatUzbekPrice } from '../lib/api.ts';
import type { Product } from '../types/index.ts';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { isFavorite, toggleFavorite, addToCart, openProductDetail } = useApp();
  const sizes = Array.isArray(product.sizes) && product.sizes.length > 0 ? product.sizes : ['M', 'L', 'XL'];
  const colors = Array.isArray(product.colors) && product.colors.length > 0 ? product.colors : ['Qora'];
  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : ['/banners/hero-banner-1.png'];

  const [selectedSize, setSelectedSize] = useState<string>(sizes[0] || 'L');
  const [selectedColor, setSelectedColor] = useState<string>(colors[0] || 'Qora');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const isOutOfStock = product.stock <= 0;
  const favorited = isFavorite(product.id);

  const isSizeAvailable = (size: string) => {
    if (!product.variants || product.variants.length === 0) {
      return product.stock > 0;
    }
    const matchingVariant = product.variants.find(
      v => v.size.trim().toLowerCase() === size.trim().toLowerCase() &&
           v.color.trim().toLowerCase() === selectedColor.trim().toLowerCase()
    );
    if (matchingVariant) return matchingVariant.stock > 0;
    return product.variants.some(v => v.size.trim().toLowerCase() === size.trim().toLowerCase() && v.stock > 0);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addToCart(product, selectedSize, selectedColor, 1);
    setShowQuickAdd(false);
  };

  return (
    <div
      onClick={() => openProductDetail(product.id)}
      className="group relative bg-[#131b2a] rounded-2xl overflow-hidden border border-slate-800/80 hover:border-[#d4af37]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#d4af37]/10 flex flex-col cursor-pointer"
    >
      {/* Image and Badges */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-900">
        <img
          src={images[0]}
          alt={product.name || 'SHU BREND kiyim'}
          loading="lazy"
          className={`w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-108 ${
            isOutOfStock ? 'grayscale-[40%] opacity-85' : ''
          }`}
        />

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-3 text-center">
            <div className="bg-rose-600/95 text-white px-3 py-1.5 rounded-xl font-extrabold text-xs sm:text-sm tracking-wide shadow-xl border border-rose-400/40 flex items-center gap-1.5">
              <span>❌</span>
              <span>SOTUVDA YO‘Q</span>
            </div>
            <span className="text-[10px] text-slate-300 mt-1.5 font-medium">Omborda vaqtincha tugadi</span>
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {product.discountPrice && !isOutOfStock && (
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-black bg-rose-600 text-white shadow-md">
              -{Math.round(((product.discountPrice - product.price) / product.discountPrice) * 100)}%
            </span>
          )}
          {product.isNew && !isOutOfStock && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-[#d4af37] text-black shadow-md">
              YANGI
            </span>
          )}
        </div>

        {/* Heart Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          className="absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full bg-[#0b0f17]/70 backdrop-blur-md border border-slate-700/60 flex items-center justify-center text-white transition-transform active:scale-75 hover:bg-[#0b0f17] cursor-pointer"
          aria-label="Yoqtirish"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              favorited ? 'text-rose-500 fill-rose-500 stroke-rose-500 scale-110' : 'text-slate-300 group-hover:text-white'
            }`}
          />
        </button>

        {/* Quick View Overlay on Hover */}
        <div className="hidden sm:flex absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openProductDetail(product.id);
            }}
            className="px-3.5 py-2 rounded-xl bg-white/95 text-black text-xs font-bold shadow-lg hover:bg-white flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Batafsil</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3.5 sm:p-4 flex flex-col flex-1 justify-between">
        <div>
          {/* Category & Rating */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="uppercase tracking-wider font-semibold text-[#d4af37]/90 text-[10px]">
              {product.categoryName}
            </span>
            <div className="flex items-center gap-1 text-amber-400 font-medium">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span>{product.rating}</span>
            </div>
          </div>

          {/* Product Name */}
          <h3 className="text-sm sm:text-base font-semibold text-white line-clamp-1 group-hover:text-[#d4af37] transition-colors">
            {product.name}
          </h3>

          {/* Prices */}
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-black text-white">
              {formatUzbekPrice(product.price)}
            </span>
            {product.discountPrice && (
              <span className="text-xs text-slate-500 line-through">
                {formatUzbekPrice(product.discountPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Sizes and Add to Cart Button */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
          {/* Quick size selection chips */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {sizes.slice(0, 3).map((size) => {
              const available = isSizeAvailable(size);
              return (
                <button
                  key={size}
                  disabled={!available}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (available) setSelectedSize(size);
                  }}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition flex items-center gap-0.5 ${
                    !available
                      ? 'bg-slate-800/50 text-slate-500 line-through cursor-not-allowed border border-rose-900/40'
                      : selectedSize === size
                      ? 'bg-[#d4af37] text-black font-extrabold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={!available ? 'Razmer tugagan' : size}
                >
                  <span>{size}</span>
                  {!available && <span className="text-[9px] text-rose-500 no-underline font-normal">❌</span>}
                </button>
              );
            })}
            {sizes.length > 3 && (
              <span className="text-[9px] text-slate-500">+{sizes.length - 3}</span>
            )}
          </div>

          {/* Cart add icon button */}
          <button
            disabled={isOutOfStock}
            onClick={handleQuickAdd}
            className={`p-2 sm:px-3 sm:py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition ${
              isOutOfStock
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/60'
                : 'gold-gradient-bg text-black shadow-[#d4af37]/20 hover:brightness-110 active:scale-95 cursor-pointer'
            }`}
            title={isOutOfStock ? 'Sotuvda yo‘q' : 'Savatga qo‘shish'}
          >
            <ShoppingBag className="w-3.5 h-3.5 stroke-[2.2]" />
            <span className="hidden sm:inline">{isOutOfStock ? 'Tugagan' : 'Savatga'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
