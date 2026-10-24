import React, { useState } from 'react';
import { Crown, Heart, ShoppingBag, User as UserIcon, Search, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    cartCount,
    favorites,
    user,
    settings,
    setIsAdminLoginModalOpen,
  } = useApp();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveTab('clothing');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0b0f17]/90 backdrop-blur-md border-b border-slate-800/80 transition-colors">
      {/* Top micro bar for announcements */}
      {settings?.headerNotice && (
        <div className="bg-gradient-to-r from-[#111a2e] via-[#1a253d] to-[#111a2e] border-b border-amber-500/20 py-1.5 px-4 text-center">
          <p className="text-xs font-medium text-amber-200/90 tracking-wide flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
            {settings.headerNotice}
          </p>
        </div>
      )}

      {/* Main navigation bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 sm:h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          onClick={() => setActiveTab('home')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-[#d4af37] via-[#aa820a] to-[#735400] p-[1.5px] shadow-lg shadow-[#d4af37]/20 transition-transform group-hover:scale-105">
            <div className="w-full h-full bg-[#0b0f17] rounded-[10px] flex items-center justify-center">
              <Crown className="w-6 h-6 text-[#d4af37] transition-transform group-hover:rotate-6" />
            </div>
          </div>
          <div>
            <span className="font-brand text-xl sm:text-2xl font-black tracking-widest text-white block leading-none">
              {settings?.storeName || 'SHU BREND'}
            </span>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#d4af37] font-semibold block mt-1">
              Erkaklar Kiyimi
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          {[
            { id: 'home', label: 'Bosh sahifa' },
            { id: 'clothing', label: 'Kiyimlar' },
            { id: 'favorites', label: 'Yoqtirilganlar', count: favorites.length },
            { id: 'cart', label: 'Savat', count: cartCount },
            { id: 'profile', label: 'Profil' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2 rounded-xl text-sm font-semibold tracking-wide transition-all cursor-pointer ${
                  isActive
                    ? 'text-[#d4af37] bg-[#d4af37]/10 border border-[#d4af37]/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-[#d4af37] text-black">
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick search input (desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className={`hidden sm:flex items-center relative transition-all duration-300 ${
              searchOpen ? 'w-64' : 'w-48 lg:w-56'
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Kiyim qidirish..."
              value={searchQuery}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => !searchQuery && setSearchOpen(false)}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-xl border border-slate-700/80 focus:border-[#d4af37] focus:outline-none transition-colors"
            />
          </form>

          {/* Search Button (mobile) */}
          <button
            onClick={() => setActiveTab('clothing')}
            className="sm:hidden p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition"
            aria-label="Qidirish"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Favorites Button */}
          <button
            onClick={() => setActiveTab('favorites')}
            className="relative p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Yoqtirilganlar"
          >
            <Heart className={`w-5 h-5 ${favorites.length > 0 ? 'text-rose-500 fill-rose-500/20' : ''}`} />
            {favorites.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[11px] font-black rounded-full flex items-center justify-center shadow-md">
                {favorites.length}
              </span>
            )}
          </button>

          {/* Cart Button */}
          <button
            onClick={() => setActiveTab('cart')}
            className="relative p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Savat"
          >
            <ShoppingBag className="w-5 h-5 text-white" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#d4af37] text-black text-[11px] font-black rounded-full flex items-center justify-center shadow-md">
                {cartCount}
              </span>
            )}
          </button>

          {/* Admin panel shortcut button */}
          <button
            onClick={() => {
              if (user?.role === 'ADMIN') {
                setActiveTab('admin');
              } else {
                setIsAdminLoginModalOpen(true);
              }
            }}
            className={`hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'admin'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                : 'border border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Admin</span>
          </button>

          {/* Profile Button */}
          <button
            onClick={() => setActiveTab('profile')}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-800 text-slate-200 transition flex items-center gap-2 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#d4af37] to-amber-200 text-black font-black text-xs flex items-center justify-center">
              {user ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
            </div>
            <span className="hidden sm:inline text-xs font-semibold max-w-[100px] truncate">
              {user ? user.name : 'Profil'}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
};
