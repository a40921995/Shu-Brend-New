import React, { useEffect, useState } from 'react';
import {
  User as UserIcon,
  Package,
  Heart,
  MapPin,
  LogOut,
  Settings as SettingsIcon,
  Check,
  Clock,
  ChevronRight,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api, formatUzbekPrice } from '../lib/api.ts';
import { MapPickerModal } from '../components/MapPickerModal.tsx';
import type { LocationCoords, Order, OrderStatus } from '../types/index.ts';

export const ProfilePage: React.FC = () => {
  const {
    user,
    login,
    register,
    logout,
    updateUser,
    setActiveTab,
    showToast,
    isAdminLoginModalOpen,
    setIsAdminLoginModalOpen,
  } = useApp();

  const [activeMenu, setActiveMenu] = useState<
    'shaxsiy' | 'buyurtmalar' | 'manzillar' | 'auth'
  >('shaxsiy');

  // Profile fields state
  const [name, setName] = useState(user?.name || 'Abdulaziz');
  const [phone, setPhone] = useState(user?.phone || '+998 90 123 45 67');
  const [email, setEmail] = useState(user?.email || 'abdulaziz@gmail.com');
  const [region, setRegion] = useState(user?.region || 'Toshkent viloyati');
  const [city, setCity] = useState(user?.city || 'Toshkent');
  const [address, setAddress] = useState(user?.address || 'Yunusobod tumani, 5-mavze, 14-uy');
  const [location, setLocation] = useState<LocationCoords | undefined>(
    user?.location || { lat: 41.3533, lng: 69.2872, address: 'Yunusobod tumani, 5-mavze' }
  );

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auth form states (for login / register)
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [authPhone, setAuthPhone] = useState('+998 ');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
      setEmail(user.email || '');
      setRegion(user.region);
      setCity(user.city);
      setAddress(user.address);
      if (user.location) setLocation(user.location);
    }
  }, [user]);

  // Load orders for this user
  useEffect(() => {
    async function fetchOrders() {
      if (!user) return;
      try {
        setOrdersLoading(true);
        const list = await api.getOrders({ userId: user.id, phone: user.phone });
        setOrders(list);
      } catch (err) {
        console.error(err);
      } finally {
        setOrdersLoading(false);
      }
    }
    if (activeMenu === 'buyurtmalar') {
      fetchOrders();
    }
  }, [activeMenu, user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await updateUser({
      name,
      phone,
      email,
      region,
      city,
      address,
      location,
    });
    setIsSaving(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegisterMode) {
      await register({
        name: authName,
        phone: authPhone,
        password: authPassword,
      });
    } else {
      await login(authPhone, authPassword);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'YANGI':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">🟡 Yangi</span>;
      case 'TASDIQLANDI':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">🔵 Tasdiqlandi</span>;
      case 'TAYYORLANMOQDA':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40">🟣 Tayyorlanmoqda</span>;
      case 'YETKAZILMOQDA':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">🚚 Yetkazilmoqda</span>;
      case 'YETKAZILDI':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">🟢 Yetkazildi</span>;
      case 'BEKOR_QILINDI':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">🔴 Bekor qilindi</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  // If no user is logged in
  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-[#131b2a] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl gold-gradient-bg text-black font-black text-xl flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-7 h-7 stroke-[2.2]" />
          </div>

          <h2 className="text-2xl font-black text-white text-center">
            {isRegisterMode ? 'Ro‘yxatdan o‘tish' : 'Profilga kirish'}
          </h2>
          <p className="text-xs text-slate-400 text-center mt-1 mb-6">
            Buyurtmalaringizni kuzatish va manzilingizni saqlash uchun kiring
          </p>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="text-xs text-slate-300 block mb-1">Ismingiz *</label>
                <input
                  type="text"
                  required
                  placeholder="Ism Familiya"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="text-xs text-slate-300 block mb-1">Telefon raqam *</label>
              <input
                type="tel"
                required
                placeholder="+998 90 123 45 67"
                value={authPhone}
                onChange={(e) => setAuthPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-slate-300 block mb-1">Parol *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl gold-gradient-bg text-black font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-[#d4af37]/25 hover:brightness-110 active:scale-98 transition mt-2 cursor-pointer"
            >
              {isRegisterMode ? 'Ro‘yxatdan o‘tish' : 'Kirish'}
            </button>
          </form>

          <div className="mt-6 text-center pt-4 border-t border-slate-800 space-y-3">
            <button
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              className="text-xs text-[#d4af37] hover:underline font-semibold block w-full"
            >
              {isRegisterMode
                ? 'Profilingiz bormi? Kirish'
                : 'Yangi foydalanuvchimisiz? Ro‘yxatdan o‘tish'}
            </button>
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setIsAdminLoginModalOpen(true)}
                className="w-full py-2.5 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⚙️ Admin panelga kirish</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar (Screenshot 6) */}
        <div className="lg:col-span-4 space-y-4">
          {/* User ID card */}
          <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-6 text-center shadow-lg relative">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#d4af37] to-amber-200 text-black font-black text-2xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#d4af37]/20">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="text-lg font-black text-white">{user.name}</h3>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{user.phone}</p>
            {user.role === 'ADMIN' && (
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                ADMIN FOYDALANUVCHI
              </span>
            )}
          </div>

          {/* Menu list items (Screenshot 6) */}
          <div className="bg-[#131b2a] border border-slate-800 rounded-2xl p-2 space-y-1">
            {[
              { id: 'shaxsiy', label: 'Shaxsiy ma‘lumotlar', icon: UserIcon },
              { id: 'buyurtmalar', label: 'Buyurtmalarim', icon: Package },
              { id: 'manzillar', label: 'Manzillarim & Lokatsiya', icon: MapPin },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id as any)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[#d4af37]" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              );
            })}

            {/* Admin shortcut */}
            {user.role === 'ADMIN' && (
              <button
                onClick={() => setActiveTab('admin')}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs sm:text-sm font-bold text-amber-300 hover:bg-amber-500/15 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Admin Boshqaruv Paneli</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            {/* Logout button */}
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>

        {/* Right Content Panel (Screenshot 6) */}
        <div className="lg:col-span-8">
          {activeMenu === 'shaxsiy' && (
            <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl font-black text-white mb-6 pb-3 border-b border-slate-800">
                Shaxsiy ma‘lumotlar
              </h2>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Ism Familiya</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Telefon raqam</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Viloyat</label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                    >
                      <option value="Toshkent viloyati">Toshkent viloyati</option>
                      <option value="Toshkent shahri">Toshkent shahri</option>
                      <option value="Samarqand viloyati">Samarqand viloyati</option>
                      <option value="Farg‘ona viloyati">Farg‘ona viloyati</option>
                      <option value="Andijon viloyati">Andijon viloyati</option>
                      <option value="Namangan viloyati">Namangan viloyati</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Shahar / Tuman</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Yetkazib berish manzili</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                  />
                </div>

                {/* Map location card preview */}
                <div className="pt-2">
                  <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <span className="text-xs font-bold text-[#d4af37] flex items-center gap-1.5 uppercase">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Xarita orqali belgilangan lokatsiya</span>
                      </span>
                      <p className="text-xs text-white mt-1">
                        {location?.address || 'Lokatsiya hali xaritadan belgilanmagan'}
                      </p>
                      {location && (
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMapModalOpen(true)}
                      className="px-4 py-2 rounded-xl border border-[#d4af37]/60 text-[#d4af37] hover:bg-[#d4af37]/10 text-xs font-bold transition cursor-pointer"
                    >
                      Lokatsiyani o‘zgartirish
                    </button>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-8 py-3 rounded-xl gold-gradient-bg text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#d4af37]/20 hover:brightness-110 active:scale-95 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Saqlash</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeMenu === 'buyurtmalar' && (
            <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl font-black text-white mb-6 pb-3 border-b border-slate-800">
                Buyurtmalar tarixi ({orders.length})
              </h2>

              {ordersLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-[#d4af37]" />
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-white">
                            {ord.orderNumber}
                          </span>
                          <span className="text-xs text-slate-400">
                            • {new Date(ord.createdAt).toLocaleDateString('uz-UZ')}
                          </span>
                        </div>
                        {getStatusBadge(ord.status)}
                      </div>

                      {/* Items preview */}
                      <div className="space-y-2">
                        {ord.items.map((it) => (
                          <div key={it.id} className="flex items-center gap-3">
                            <img
                              src={it.productImage}
                              alt={it.productName}
                              className="w-12 h-14 rounded-lg object-cover bg-slate-950 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-white truncate">
                                {it.productName}
                              </h4>
                              <p className="text-[11px] text-slate-400">
                                {it.size} • {it.color} • {it.quantity} dona
                              </p>
                            </div>
                            <span className="text-xs font-bold text-white">
                              {formatUzbekPrice(it.totalPrice)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">To‘lov usuli:</span>
                          <span className="font-bold text-slate-200">
                            {ord.paymentMethod === 'PAYNET_CARD'
                              ? '💳 Paynet orqali kartaga'
                              : '💳 Click orqali kartaga'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">To‘lov holati:</span>
                          <span
                            className={`font-bold ${
                              ord.paymentStatus === 'TOLANDI'
                                ? 'text-emerald-400'
                                : ord.paymentStatus === 'BEKOR_QILINDI'
                                ? 'text-rose-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {ord.paymentStatus === 'TOLANDI'
                              ? '🟢 To‘langan'
                              : ord.paymentStatus === 'BEKOR_QILINDI'
                              ? '🔴 Bekor qilingan'
                              : '🟡 To‘lov kutilmoqda'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                          <span className="text-slate-400 font-medium">Umumiy to‘lov:</span>
                          <span className="text-sm font-black text-[#d4af37]">
                            {formatUzbekPrice(ord.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-white font-bold">Hozircha buyurtmalar mavjud emas</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Kiyimlarni tanlab birinchi buyurtmangizni bering!
                  </p>
                  <button
                    onClick={() => setActiveTab('clothing')}
                    className="px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-bold text-xs"
                  >
                    Kolleksiyaga o‘tish
                  </button>
                </div>
              )}
            </div>
          )}

          {activeMenu === 'manzillar' && (
            <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl font-black text-white mb-6 pb-3 border-b border-slate-800">
                Mening manzillarim va Lokatsiya
              </h2>

              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#d4af37]/20 text-[#d4af37] uppercase">
                      Asosiy yetkazib berish manzili
                    </span>
                    <h3 className="text-base font-bold text-white mt-2">{address || 'Kiritilmagan'}</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      {city}, {region}
                    </p>
                    {location && (
                      <p className="text-xs text-amber-400/90 font-mono mt-2 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>GPS: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsMapModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl gold-gradient-bg text-black font-bold text-xs shadow cursor-pointer"
                  >
                    Xaritadan yangilash
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ⚙️ Profil sahifasining eng pastiga: Admin panelga kirish tugmasi */}
      <div className="mt-14 pt-8 border-t border-slate-800/80 flex flex-col items-center justify-center text-center">
        <button
          onClick={() => {
            if (user?.role === 'ADMIN') {
              setActiveTab('admin');
            } else {
              setIsAdminLoginModalOpen(true);
            }
          }}
          className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-[#d4af37]/30 to-amber-500/20 hover:from-amber-500/30 hover:to-[#d4af37]/40 text-amber-300 border border-[#d4af37]/50 font-black text-sm tracking-wide shadow-xl shadow-amber-950/20 hover:border-[#d4af37] hover:shadow-[#d4af37]/20 transition-all flex items-center gap-2.5 active:scale-95 cursor-pointer group"
        >
          <span className="text-base group-hover:rotate-45 transition-transform duration-300">⚙️</span>
          <span>Admin panelga kirish</span>
        </button>
        <p className="text-[11px] text-slate-500 mt-2">
          Do‘kon boshqaruvi, mahsulotlar va buyurtmalar nazorati
        </p>
      </div>

      <MapPickerModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onSelectLocation={(coords) => {
          setLocation(coords);
          if (coords.address) setAddress(coords.address);
          showToast('Lokatsiya xaritadan tanlandi!', 'success');
        }}
        initialCoords={location}
      />
    </div>
  );
};
