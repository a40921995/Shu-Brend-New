import React, { useEffect, useState } from 'react';
import { Search, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api, formatUzbekPrice } from '../lib/api.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import type { Category, Product } from '../types/index.ts';

export const ClothingPage: React.FC = () => {
  const { user, selectedCategory, setSelectedCategory, setActiveTab } = useApp();

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [maxPrice, setMaxPrice] = useState<number>(3000000);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [sort, setSort] = useState<string>('popular');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cats, prods] = await Promise.all([
          api.getCategories(),
          api.getProducts({
            category: selectedCategory,
            search,
            maxPrice,
            size: selectedSize || undefined,
            color: selectedColor || undefined,
            sort,
          }),
        ]);
        setCategories(cats);
        setProducts(prods);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCategory, search, maxPrice, selectedSize, selectedColor, sort]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearch('');
    setMaxPrice(3000000);
    setSelectedSize('');
    setSelectedColor('');
    setSort('popular');
  };

  const availableColors = [
    { name: 'Qora', hex: '#000000' },
    { name: 'To‘q ko‘k', hex: '#162b4d' },
    { name: 'Kulrang', hex: '#64748b' },
    { name: 'Oq', hex: '#ffffff' },
    { name: 'Jigarrang', hex: '#68402b' },
    { name: 'Havorang', hex: '#7dd3fc' },
  ];

  const availableSizes = ['S', 'M', 'L', 'XL', 'XXL', '30', '32', '34', '50', '52'];

  return (
    <div className="min-h-screen pb-20">
      {/* 1. Header Banner (Screenshot 2) */}
      <section className="relative bg-gradient-to-r from-[#0d1424] via-[#152038] to-[#0a101d] border-b border-slate-800 py-10 sm:py-14 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold text-[#d4af37] tracking-widest uppercase block mb-1">
              Erkaklar Kolleksiyasi
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white">
              Kiyimlar — Siz uchun eng yaxshi tanlov
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1.5 max-w-xl">
              Sifatli matolar, aniq bichimlar va har qanday vaziyatga mos eksklyuziv modellar
            </p>
          </div>

          {/* Search bar inside header */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Mahsulot nomi yoki turi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none transition shadow-inner"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 2. Category Pills Navigation (Screenshot 2) */}
      <section className="bg-[#0b0f17] border-b border-slate-800/80 sticky top-18 sm:top-20 z-30 py-3 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap transition cursor-pointer ${
                selectedCategory === 'all'
                  ? 'gold-gradient-bg text-black shadow-md shadow-[#d4af37]/20'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              HAMMASI
            </button>
            {categories
              .filter((c) => c.slug !== 'all')
              .map((cat) => {
                const isSelected = selectedCategory === cat.slug;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap transition cursor-pointer ${
                      isSelected
                        ? 'gold-gradient-bg text-black shadow-md shadow-[#d4af37]/20'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
          </div>

          {/* Mobile Filter Trigger Button */}
          <button
            onClick={() => setMobileFilterOpen(true)}
            className="lg:hidden shrink-0 px-3 py-2 rounded-xl bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-2 text-xs font-bold"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#d4af37]" />
            <span>Filtrlar</span>
          </button>
        </div>
      </section>

      {/* 3. Main Catalog Section (Left Filters + Right Grid) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Desktop Left Filter Sidebar (Screenshot 2) */}
          <aside className="hidden lg:block lg:col-span-1 space-y-6 bg-[#131b2a] p-5 rounded-2xl border border-slate-800 h-fit sticky top-36">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#d4af37]" />
                <span>Filtrlar</span>
              </h3>
              <button
                onClick={resetFilters}
                className="text-xs text-slate-400 hover:text-[#d4af37] flex items-center gap-1 cursor-pointer transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Tozalash</span>
              </button>
            </div>

            {/* Saralash (Sort) */}
            <div>
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Saralash
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
              >
                <option value="popular">Mashhurlar bo‘yicha</option>
                <option value="newest">Yangi mahsulotlar</option>
                <option value="price_asc">Arzonidan qimmatiga</option>
                <option value="price_desc">Qimmatidan arzoniga</option>
              </select>
            </div>

            {/* Narx oralig'i (Price slider) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Narx oralig‘i
                </label>
                <span className="text-xs font-bold text-[#d4af37]">
                  {formatUzbekPrice(maxPrice)} gacha
                </span>
              </div>
              <input
                type="range"
                min="100000"
                max="3000000"
                step="50000"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full accent-[#d4af37] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0 so‘m</span>
                <span>3 000 000 so‘m</span>
              </div>
            </div>

            {/* Ranglar (Colors) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Ranglar
                </label>
                {selectedColor && (
                  <button
                    onClick={() => setSelectedColor('')}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    Barchasi
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2.5">
                {availableColors.map((c) => {
                  const isPicked = selectedColor === c.name;
                  return (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(isPicked ? '' : c.name)}
                      className={`relative w-8 h-8 rounded-full border-2 transition-transform cursor-pointer ${
                        isPicked ? 'scale-115 border-[#d4af37] ring-2 ring-[#d4af37]/40' : 'border-slate-600 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  );
                })}
              </div>
            </div>

            {/* O'lcham (Size) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  O‘lcham
                </label>
                {selectedSize && (
                  <button
                    onClick={() => setSelectedSize('')}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    Barchasi
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {availableSizes.map((sz) => {
                  const isPicked = selectedSize === sz;
                  return (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(isPicked ? '' : sz)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                        isPicked
                          ? 'bg-[#d4af37] text-black shadow'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Product Grid Area */}
          <div className="lg:col-span-3">
            {/* Top counter info */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-xs sm:text-sm text-slate-400 font-medium">
                Jami: <strong className="text-white">{products.length}</strong> ta kiyim topildi
              </span>

              {/* Desktop quick sort toggle */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-slate-400">Saralash:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-900 text-xs text-white rounded-lg border border-slate-700 focus:outline-none"
                >
                  <option value="popular">Mashhurlar</option>
                  <option value="newest">Yangi</option>
                  <option value="price_asc">Arzonidan qimmatiga</option>
                  <option value="price_desc">Qimmatidan arzoniga</option>
                </select>
              </div>
            </div>

            {/* Products List */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="aspect-[3/4] bg-slate-900 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4 bg-[#131b2a] rounded-2xl border border-slate-800">
                <p className="text-base font-semibold text-white">Hozircha kiyimlar mavjud emas</p>
                <p className="text-xs text-slate-400 mt-1 mb-5">
                  Barcha eski mahsulotlar o‘chirildi. Yangi kiyimlar qo‘shilgach bu yerda ko‘rinadi.
                </p>
                {user?.role === 'ADMIN' ? (
                  <button
                    onClick={() => {
                      setActiveTab('admin');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-extrabold text-xs shadow uppercase tracking-wider cursor-pointer hover:brightness-110 transition"
                  >
                    + Yangi mahsulot qo‘shish (Admin)
                  </button>
                ) : (
                  <button
                    onClick={resetFilters}
                    className="px-4 py-2 rounded-xl gold-gradient-bg text-black font-bold text-xs shadow cursor-pointer"
                  >
                    Filtrlarni bekor qilish
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Mobile Filters Drawer Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#131b2a] border-t sm:border border-slate-800 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white">Filtrlar</h3>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Saralash</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 text-sm text-white rounded-xl border border-slate-700"
                >
                  <option value="popular">Mashhurlar</option>
                  <option value="newest">Yangi</option>
                  <option value="price_asc">Arzonidan qimmatiga</option>
                  <option value="price_desc">Qimmatidan arzoniga</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-bold">Narx chegarasi:</span>
                  <span className="text-[#d4af37] font-bold">{formatUzbekPrice(maxPrice)}</span>
                </div>
                <input
                  type="range"
                  min="100000"
                  max="3000000"
                  step="50000"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#d4af37]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Ranglar</label>
                <div className="flex flex-wrap gap-2">
                  {availableColors.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(selectedColor === c.name ? '' : c.name)}
                      className={`w-8 h-8 rounded-full border-2 ${
                        selectedColor === c.name ? 'border-[#d4af37] ring-2 ring-[#d4af37]' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">O‘lcham</label>
                <div className="grid grid-cols-4 gap-2">
                  {availableSizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(selectedSize === sz ? '' : sz)}
                      className={`py-2 rounded-xl text-xs font-bold ${
                        selectedSize === sz ? 'bg-[#d4af37] text-black' : 'bg-slate-900 text-slate-300'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex gap-3">
              <button
                onClick={resetFilters}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300"
              >
                Tozalash
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-2.5 rounded-xl gold-gradient-bg text-black text-xs font-black shadow"
              >
                Natijani ko‘rish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
