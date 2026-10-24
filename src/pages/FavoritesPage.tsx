import React, { useEffect, useState } from 'react';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import type { Product } from '../types/index.ts';

export const FavoritesPage: React.FC = () => {
  const { favorites, setActiveTab } = useApp();
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      try {
        setLoading(true);
        const all = await api.getProducts();
        const filtered = all.filter((p) => favorites.includes(p.id));
        setFavoriteProducts(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadFavorites();
  }, [favorites]);

  if (favorites.length === 0) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-slate-900 border border-slate-800 text-rose-500/80 flex items-center justify-center mb-4">
          <Heart className="w-10 h-10 stroke-[1.8]" />
        </div>
        <h2 className="text-2xl font-black text-white">Yoqtirilgan mahsulotlar yo‘q</h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mt-1 mb-6">
          O‘zingizga yoqqan kiyimlarning yurakcha tugmasini bosib shu yerda saqlab qo‘yishingiz mumkin.
        </p>
        <button
          onClick={() => setActiveTab('clothing')}
          className="px-6 py-3 rounded-xl gold-gradient-bg text-black font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-[#d4af37]/20 flex items-center gap-2 cursor-pointer hover:brightness-110 active:scale-95 transition"
        >
          <span>Kiyimlarni ko‘rish</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold text-[#d4af37] tracking-widest uppercase block mb-1">
            Tanlanganlar
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Yoqtirilganlar{' '}
            <span className="text-slate-400 font-normal text-lg">({favorites.length} ta mahsulot)</span>
          </h1>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="aspect-[3/4] bg-slate-900 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
          {favoriteProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}
        </div>
      )}
    </div>
  );
};
