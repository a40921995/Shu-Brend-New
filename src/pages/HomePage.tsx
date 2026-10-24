import React, { useEffect, useState } from 'react';
import {
  Truck,
  ShieldCheck,
  CreditCard,
  Headphones,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Clock,
  Phone,
  Send,
  Instagram,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import type { Banner, Category, Product } from '../types/index.ts';

export const HomePage: React.FC = () => {
  const { user, setActiveTab, setSelectedCategory, settings } = useApp();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentBannerIdx, setCurrentBannerIdx] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        setLoading(true);
        const [bannerList, catList, prodList] = await Promise.all([
          api.getBanners(),
          api.getCategories(),
          api.getProducts(),
        ]);
        setBanners(bannerList.filter((b) => b.isActive));
        setCategories(catList);
        setProducts(prodList);
      } catch (err) {
        console.error('Failed to load home data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

  // Banner slider auto-cycle
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIdx((prev) => (prev + 1) % banners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [banners.length]);

  const nextBanner = () => {
    setCurrentBannerIdx((prev) => (prev + 1) % (banners.length || 1));
  };
  const prevBanner = () => {
    setCurrentBannerIdx((prev) => (prev - 1 + (banners.length || 1)) % (banners.length || 1));
  };

  const handleCategoryClick = (slug: string) => {
    setSelectedCategory(slug);
    setActiveTab('clothing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeBanner = banners[currentBannerIdx] || {
    title: 'Har bir erkak uchun o‘z uslubi!',
    subtitle: 'Zamonaviy kiyimlar • Sifat • Ishonch',
    buttonText: 'Kolleksiyani ko‘rish',
    buttonLink: '/clothing',
    imageUrl: '/banners/hero-banner-1.png',
  };

  const newProducts = products.filter((p) => p.isNew).slice(0, 4);
  const trendingProducts = products.filter((p) => p.isTrending || p.isFeatured).slice(0, 4);
  const discountProducts = products.filter((p) => p.discountPrice).slice(0, 4);

  return (
    <div className="min-h-screen pb-16">
      {/* 1. HERO BANNER SECTION */}
      <section className="relative w-full overflow-hidden bg-black">
        <div className="relative min-h-[460px] sm:min-h-[540px] md:min-h-[620px] lg:h-[72vh] flex items-center">
          {/* Banner Image with dark overlay gradient */}
          <div className="absolute inset-0 z-0">
            <img
              src={activeBanner.imageUrl}
              alt={activeBanner.title}
              className="w-full h-full object-cover object-center transition-all duration-700 brightness-90"
            />
            {/* Dark luxury gradient overlays for readability and cinema mood */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-transparent to-black/40" />
          </div>

          {/* Banner Content Container */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 w-full">
            <div className="max-w-xl lg:max-w-2xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#d4af37] text-xs font-bold tracking-widest uppercase mb-4 shadow-lg backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{activeBanner.badge || 'SHU BREND — STYLE & CONFIDENCE'}</span>
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight drop-shadow-md">
                {activeBanner.title}
              </h1>

              {/* Subtitle */}
              <p className="mt-4 text-base sm:text-lg text-slate-300 font-medium leading-relaxed max-w-lg drop-shadow">
                {activeBanner.subtitle}
              </p>

              {/* CTA Button */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={() => {
                    setActiveTab('clothing');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-8 py-4 rounded-xl gold-gradient-bg text-black font-extrabold text-sm sm:text-base tracking-wider uppercase shadow-xl shadow-[#d4af37]/25 hover:brightness-110 active:scale-95 transition-all flex items-center gap-2.5 cursor-pointer group"
                >
                  <span>{activeBanner.buttonText || 'Kolleksiyani ko‘rish'}</span>
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>

          {/* Slider Prev / Next Controls */}
          {banners.length > 1 && (
            <>
              <button
                onClick={prevBanner}
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white border border-slate-700/60 backdrop-blur-md flex items-center justify-center transition active:scale-90 cursor-pointer"
                aria-label="Oldingi banner"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={nextBanner}
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-black/50 hover:bg-black/80 text-white border border-slate-700/60 backdrop-blur-md flex items-center justify-center transition active:scale-90 cursor-pointer"
                aria-label="Keyingi banner"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Indicator dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                {banners.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentBannerIdx(i)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      i === currentBannerIdx ? 'w-8 bg-[#d4af37]' : 'w-2 bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* 2. FEATURE BADGES (Screenshot 1) */}
      <section className="border-y border-slate-800/80 bg-[#0e1624]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              {
                icon: Truck,
                title: settings?.heroBadge1 || 'Tez yetkazib berish',
                desc: 'Butun O‘zbekiston bo‘ylab tez va xavfsiz',
              },
              {
                icon: ShieldCheck,
                title: settings?.heroBadge2 || 'Sifat kafolati',
                desc: '100% original va premium materiallar',
              },
              {
                icon: CreditCard,
                title: settings?.heroBadge3 || 'Qulay to‘lov',
                desc: 'Kartaga xavfsiz o‘tkazma (Click / Paynet)',
              },

              {
                icon: Headphones,
                title: settings?.heroBadge4 || '24/7 qo‘llab-quvvatlash',
                desc: 'Har qanday savolingizga doimiy javob',
              },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900/40 border border-slate-800/50">
                  <div className="p-2.5 rounded-xl bg-[#d4af37]/10 text-[#d4af37] shrink-0">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">{f.title}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. YANGI KELGANLAR (NEW ARRIVALS) + KUZ-QISH PROMO CARD (Screenshot 1) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-[#d4af37] tracking-widest uppercase block mb-1">
              Yangi to‘plam
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Yangi kelganlar</h2>
          </div>
          <button
            onClick={() => handleCategoryClick('all')}
            className="text-xs sm:text-sm font-bold text-[#d4af37] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Barchasini ko‘rish</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-5">
          {/* 4 Product Cards */}
          {newProducts.map((prod) => (
            <ProductCard key={prod.id} product={prod} />
          ))}

          {/* 5th Card: Kuz-Qish Kolleksiyasi Banner Card (Screenshot 1) */}
          <div
            onClick={() => handleCategoryClick('kurtka')}
            className="relative rounded-2xl overflow-hidden bg-slate-900 border border-[#d4af37]/40 shadow-xl group cursor-pointer flex flex-col justify-end p-5 min-h-[280px]"
          >
            <img
              src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop"
              alt="Kuz-Qish Kolleksiyasi"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-108 brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

            <div className="relative z-10">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-[#d4af37] text-black uppercase tracking-wider inline-block mb-2">
                Eksklyuziv
              </span>
              <h3 className="text-xl font-black text-white leading-tight">
                KUZ-QISH KOLLEKSIYASI
              </h3>
              <p className="text-xs text-slate-300 mt-1 mb-4">
                Sifat va uslub birga!
              </p>
              <button className="w-full py-2.5 rounded-xl gold-gradient-bg text-black font-extrabold text-xs shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95">
                <span>Ko‘rish</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. KIYIM KATEGORIYALARI (CATEGORY SHOWCASE) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold text-[#d4af37] tracking-widest uppercase block mb-1">
            Kategoriyalar
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Kiyim turlari bo‘yicha tanlang
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Har bir kategoriya uchun eng sara va talabgir modellar saralab olingan
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-5">
          {categories
            .filter((c) => c.slug !== 'all')
            .map((cat) => (
              <div
                key={cat.id}
                onClick={() => handleCategoryClick(cat.slug)}
                className="group relative rounded-2xl overflow-hidden bg-[#131b2a] border border-slate-800 hover:border-[#d4af37]/60 aspect-[4/5] cursor-pointer shadow-lg transition-all"
              >
                <img
                  src={
                    cat.imageUrl ||
                    'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800&auto=format&fit=crop'
                  }
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 brightness-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white tracking-wide group-hover:text-[#d4af37] transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {cat.itemCount || 8} ta mahsulot
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-[#d4af37] text-white group-hover:text-black flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </section>

      {/* 5. ENG KO'P SOTILGANLAR (BESTSELLERS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-bold text-[#d4af37] tracking-widest uppercase block mb-1">
              Mijozlar tanlovi
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Eng ko‘p sotilgan kiyimlar</h2>
          </div>
          <button
            onClick={() => handleCategoryClick('all')}
            className="text-xs sm:text-sm font-bold text-[#d4af37] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Barchasi</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {trendingProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
            {trendingProducts.map((prod) => (
              <ProductCard key={prod.id} product={prod} />
            ))}
          </div>
        ) : (
          <div className="py-14 px-6 rounded-3xl bg-[#0e1624] border border-slate-800 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#d4af37]/10 border border-[#d4af37]/30 flex items-center justify-center text-[#d4af37] mx-auto mb-4 shadow-lg shadow-[#d4af37]/10">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">Yangi to‘plamlar tayyorlanmoqda</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
              Barcha eski mahsulotlar olib tashlandi. Tez orada do‘konga yangi eksklyuziv erkaklar kiyimlari joylashtiriladi!
            </p>
            {user?.role === 'ADMIN' && (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl gold-gradient-bg text-black font-extrabold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition cursor-pointer"
              >
                <span>+ Yangi mahsulot qo‘shish (Admin)</span>
              </button>
            )}
          </div>
        )}
      </section>

      {/* 6. CHEGIRMADAGI MAHSULOTLAR */}
      {discountProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#161220] via-[#101728] to-[#0c121e] border border-amber-500/30 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <span className="px-3 py-1 rounded-full bg-rose-600/20 text-rose-400 border border-rose-500/30 text-[11px] font-black uppercase tracking-wider inline-block mb-2">
                  Maxsus Takliflar
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white">Chegirmadagi kiyimlar</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Mavsumiy chegirmalar bilan premium kiyimlarni qulay narxlarda xarid qiling
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-5">
              {discountProducts.map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 7. DO'KON HAQIDA (ABOUT SECTION) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl aspect-[4/3] bg-slate-900">
            <img
              src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=1000&auto=format&fit=crop"
              alt="SHU BREND haqida"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-black/70 backdrop-blur-md border border-slate-700">
              <span className="text-[#d4af37] font-brand text-xl font-bold tracking-wider block">
                {settings?.storeName || 'SHU BREND'}
              </span>
              <p className="text-xs text-slate-300 mt-1">
                Har bir tikuvda aniqlik, oliy sifat va erkaklarga xos qat’iyat.
              </p>
            </div>
          </div>

          <div>
            <span className="text-xs font-bold text-[#d4af37] tracking-widest uppercase block mb-2">
              Biz haqimizda
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
              Kiyimingiz — sizning shaxsiyatingiz va obro‘yingizdir
            </h2>
            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              {settings?.aboutText ||
                'SHU BREND — zamonaviy erkaklar uchun individual uslub, oliy darajadagi sifat va qulaylikni o‘zida mujassam etgan premium kiyimlar do‘koni. Har bir tikuv, mato tanlovi va dizayn erkak kishining obro‘si va o‘ziga bo‘lgan ishonchini oshirishga xizmat qiladi.'}
            </p>

            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-slate-800 pt-6">
              <div>
                <span className="text-2xl sm:text-3xl font-black text-[#d4af37] block">10 000+</span>
                <span className="text-xs text-slate-400 font-medium">Mamnun mijozlar</span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-[#d4af37] block">100%</span>
                <span className="text-xs text-slate-400 font-medium">Tabiiy matolar</span>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-[#d4af37] block">24/7</span>
                <span className="text-xs text-slate-400 font-medium">Tez xizmat</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. DO'KON ALOQA, ISH VAQTI VA XARITA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        <div className="bg-[#131b2a] rounded-3xl border border-slate-800 p-6 sm:p-10 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Contacts */}
            <div>
              <span className="text-xs font-bold text-[#d4af37] tracking-widest uppercase block mb-1">
                Aloqa va Manzil
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Biz bilan doimo bog‘laning
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 mb-8">
                Toshkentdagi do‘konimizga tashrif buyuring yoki onlayn buyurtma bering
              </p>

              <div className="space-y-4">
                {/* Manzil */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="p-2 rounded-lg bg-[#d4af37]/10 text-[#d4af37] shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block">Do‘kon manzili</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {settings?.address || 'Toshkent shahar, Yunusobod tumani, 5-mavze'}
                    </span>
                  </div>
                </div>

                {/* Ish vaqti */}
                <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="p-2 rounded-lg bg-[#d4af37]/10 text-[#d4af37] shrink-0 mt-0.5">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block">Ish vaqti</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {settings?.workingHours || '09:00 - 22:00 (Har kuni)'}
                    </span>
                  </div>
                </div>

                {/* Telefon */}
                <a
                  href={`tel:${settings?.phone || '+998901234567'}`}
                  className="flex items-start gap-3.5 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-[#d4af37]/50 transition group"
                >
                  <div className="p-2 rounded-lg bg-[#d4af37]/10 text-[#d4af37] group-hover:bg-[#d4af37] group-hover:text-black transition shrink-0 mt-0.5">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block">Qo‘ng‘iroq qilish</span>
                    <span className="text-sm font-bold text-white group-hover:text-[#d4af37] transition mt-0.5 block">
                      {settings?.phone || '+998 90 123 45 67'}
                    </span>
                  </div>
                </a>

                {/* Telegram & Instagram real links */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <a
                    href={settings?.telegramUrl || 'https://t.me/shubrend'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#229ED9]/15 border border-[#229ED9]/40 text-[#229ED9] hover:bg-[#229ED9]/25 font-bold text-xs transition"
                  >
                    <Send className="w-4 h-4" />
                    <span>Telegram kanal</span>
                  </a>
                  <a
                    href={settings?.instagramUrl || 'https://instagram.com/shubrend'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500/15 via-rose-500/15 to-amber-500/15 border border-rose-500/40 text-rose-300 hover:brightness-125 font-bold text-xs transition"
                  >
                    <Instagram className="w-4 h-4" />
                    <span>Instagram sahifa</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Interactive Boutique Location Card / Static Map preview */}
            <div className="rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl relative min-h-[300px] sm:min-h-[360px] bg-slate-950 flex flex-col justify-end p-5">
              <iframe
                title="SHU BREND Lokatsiyasi"
                width="100%"
                height="100%"
                className="absolute inset-0 border-0 filter invert-[0.9] hue-rotate-180 brightness-90 contrast-125"
                src="https://www.openstreetmap.org/export/embed.html?bbox=69.2600%2C41.3400%2C69.3100%2C41.3700&amp;layer=mapnik&amp;marker=41.3533%2C69.2872"
              />
              <div className="relative z-10 p-4 rounded-xl bg-black/85 backdrop-blur-md border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#d4af37] block">Boutique & Showroom</span>
                  <span className="text-sm font-semibold text-white">Yunusobod tumani, 5-mavze</span>
                </div>
                <a
                  href={`https://yandex.uz/maps/?pt=${settings?.location.lng || 69.2872},${settings?.location.lat || 41.3533}&z=16&l=map`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-lg gold-gradient-bg text-black font-extrabold text-xs shadow-md transition active:scale-95"
                >
                  Xaritada ochish
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
