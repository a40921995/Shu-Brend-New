import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Lock,
  LogOut,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  Send,
  Shield,
  ShoppingBag,
  TrendingUp,
  Truck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useApp } from '../context/AppContext.tsx';
import { AdminInventoryManager } from '../components/AdminInventoryManager.tsx';
import type { Order, OrderStatus, PaymentStatus, Product } from '../types/index.ts';

// Declare Telegram WebApp global interface
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        themeParams?: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        MainButton?: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (fn: () => void) => void;
        };
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
      };
    };
  }
}

export const TelegramAdminPage: React.FC = () => {
  const { user, adminLogin, logout, setActiveTab, showToast } = useApp();

  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [mobileTab, setMobileTab] = useState<'orders' | 'inventory'>('orders');
  const [stats, setStats] = useState<any>(null);
  const [tgStatus, setTgStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Admin login states if not authenticated as admin
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Telegram environment detection
  const isInsideTelegram = typeof window !== 'undefined' && Boolean(window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
  const tgUser = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initDataUnsafe?.user : null;

  useEffect(() => {
    // Notify Telegram WebApp that the app is ready and expand to full screen
    try {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
      }
    } catch {
      // safe fallback
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [fetchedOrders, fetchedStats, fetchedTg, fetchedProducts] = await Promise.all([
        api.getOrders(),
        api.getAdminStats().catch(() => null),
        api.getTelegramStatus().catch(() => null),
        api.getProducts().catch(() => []),
      ]);
      setOrders(fetchedOrders);
      setStats(fetchedStats);
      setTgStatus(fetchedTg);
      setProducts(fetchedProducts);
    } catch (err: any) {
      console.error('Failed to load Telegram Admin data:', err);
      showToast(err.message || 'Ma‘lumotlarni yuklashda xatolik', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword.trim()) {
      setLoginError('Iltimos, admin parolini kiriting');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const ok = await adminLogin(adminUsername, adminPassword);
      if (ok) {
        showToast('Admin tizimiga xush kelibsiz! 👑', 'success');
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
        await loadData();
      } else {
        setLoginError('Login yoki parol noto‘g‘ri!');
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
        }
      }
    } catch (err: any) {
      setLoginError(err.message || 'Kirishda xatolik');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
      }
      const updated = await api.updateOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updated);
      }
      showToast(`Buyurtma holati yangilandi: ${newStatus}`, 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Holatni o‘zgartirishda xatolik', 'error');
    }
  };

  const handleTogglePayment = async (order: Order) => {
    const nextPayStatus: PaymentStatus = order.paymentStatus === 'TOLANDI' ? 'KUTILMOQDA' : 'TOLANDI';
    try {
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
      }
      const updated = await api.updateOrderStatus(order.id, order.status, nextPayStatus);
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(updated);
      }
      showToast(
        nextPayStatus === 'TOLANDI' ? 'To‘lov tasdiqlandi ✅' : 'To‘lov kutilmoqda holatiga o‘tkazildi',
        'info'
      );
    } catch (err: any) {
      showToast(err.message || 'To‘lov holatini yangilashda xatolik', 'error');
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesSearch =
      !searchQuery.trim() ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'YANGI':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">Yangi</span>;
      case 'TASDIQLANDI':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">Tasdiqlandi</span>;
      case 'YETKAZILMOQDA':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">Yetkazilmoqda</span>;
      case 'YETKAZILDI':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Yetkazildi</span>;
      case 'BEKOR_QILINDI':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">Bekor qilindi</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-700 text-slate-300">{status}</span>;
    }
  };

  // If user is not admin, show safe admin password gate
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-center items-center px-4 py-8">
        <div className="w-full max-w-sm bg-[#0e131f] border border-amber-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 flex items-center gap-1.5">
                SHU BREND <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono">TG Mini App</span>
              </h1>
              <p className="text-xs text-slate-400">Telegram Admin boshqaruv paneli</p>
            </div>
          </div>

          {tgUser && (
            <div className="mb-4 p-3 bg-blue-950/30 border border-blue-500/30 rounded-xl flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                {tgUser.first_name[0]}
              </div>
              <div className="text-xs">
                <div className="text-slate-200 font-medium">{tgUser.first_name} {tgUser.last_name || ''}</div>
                <div className="text-blue-400">@{tgUser.username || `id_${tgUser.id}`}</div>
              </div>
            </div>
          )}

          <form onSubmit={handleAdminAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Admin Login</label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                placeholder="admin"
                className="w-full bg-[#141b2d] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Admin Parol</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Parolni kiriting..."
                className="w-full bg-[#141b2d] border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
              <span>Admin tizimiga kirish</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <button
              onClick={() => setActiveTab('home')}
              className="text-xs text-slate-400 hover:text-amber-400 transition inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Bosh sahifaga qaytish</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#0e131f]/95 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              SHU
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm tracking-wide text-slate-100">TELEGRAM ADMIN</h1>
                {tgStatus?.connected ? (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ulangan
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    Ulanmagan
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[180px]">
                {tgStatus?.botUsername ? `@${tgStatus.botUsername}` : 'Do‘kon boshqaruvi'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={refreshing}
              title="Yangilash"
              className="p-2 rounded-xl bg-[#141b2d] border border-slate-700 text-slate-300 hover:text-amber-400 transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              title="To‘liq Web Admin paneli"
              className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition text-xs flex items-center gap-1"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              title="Chiqish"
              className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Top Tabs: Buyurtmalar vs OMBOR */}
      <div className="max-w-2xl mx-auto px-4 pt-3">
        <div className="grid grid-cols-2 gap-2 bg-[#0e131f] p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setMobileTab('orders')}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              mobileTab === 'orders'
                ? 'gold-gradient-bg text-black shadow font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Buyurtmalar ({orders.length})</span>
          </button>
          <button
            onClick={() => setMobileTab('inventory')}
            className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
              mobileTab === 'inventory'
                ? 'gold-gradient-bg text-black shadow font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>📦 OMBOR ({products.length})</span>
          </button>
        </div>
      </div>

      {mobileTab === 'inventory' ? (
        <div className="max-w-2xl mx-auto px-4 py-3">
          <AdminInventoryManager
            products={products}
            onRefresh={loadData}
            showToast={showToast}
          />
        </div>
      ) : (
        /* Main Content Area */
        <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Yangi</div>
            <div className="text-xl font-extrabold text-amber-400 mt-0.5">
              {orders.filter((o) => o.status === 'YANGI').length}
            </div>
          </div>
          <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Jami buyurtma</div>
            <div className="text-xl font-extrabold text-slate-100 mt-0.5">{orders.length}</div>
          </div>
          <div className="bg-[#0e131f] border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] text-slate-400">Jami tushum</div>
            <div className="text-xs font-bold text-emerald-400 mt-1 truncate">
              {(stats?.totalRevenue || orders.filter((o) => o.status === 'YETKAZILDI').reduce((s, o) => s + o.total, 0)).toLocaleString()}{' '}
              so‘m
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Qidiruv: buyurtma raqami, ism yoki telefon..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#0e131f] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {[
              { id: 'ALL', label: 'Barchasi', count: orders.length },
              { id: 'YANGI', label: 'Yangi', count: orders.filter((o) => o.status === 'YANGI').length },
              { id: 'TASDIQLANDI', label: 'Tasdiq', count: orders.filter((o) => o.status === 'TASDIQLANDI').length },
              { id: 'YETKAZILMOQDA', label: 'Yo‘lda', count: orders.filter((o) => o.status === 'YETKAZILMOQDA').length },
              { id: 'YETKAZILDI', label: 'Yetkazildi', count: orders.filter((o) => o.status === 'YETKAZILDI').length },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-[#0e131f] text-slate-300 border border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{f.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${statusFilter === f.id ? 'bg-slate-950/20' : 'bg-slate-800'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
            <p className="text-xs">Buyurtmalar yuklanmoqda...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-12 bg-[#0e131f] border border-slate-800 rounded-2xl text-center px-4">
            <ShoppingBag className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-300">Buyurtmalar topilmadi</h3>
            <p className="text-xs text-slate-500 mt-1">Ushbu holat bo‘yicha hozircha hech qanday buyurtma yo‘q.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                className="bg-[#0e131f] border border-slate-800 rounded-2xl p-4 shadow-sm hover:border-slate-700 transition space-y-3"
              >
                {/* Order Header */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400 text-sm">{order.orderNumber}</span>
                      {getStatusBadge(order.status)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(order.createdAt).toLocaleString('uz-UZ', { dateStyle: 'short', timeStyle: 'short' })}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-extrabold text-slate-100">{order.total.toLocaleString()} so‘m</div>
                    <button
                      onClick={() => handleTogglePayment(order)}
                      className={`text-[10px] mt-1 px-2 py-0.5 rounded-md border font-medium inline-block transition cursor-pointer ${
                        order.paymentStatus === 'TOLANDI'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      {order.paymentStatus === 'TOLANDI' ? '✅ To‘langan' : '⏳ Kutilmoqda'}
                    </button>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="bg-[#141b2d]/60 rounded-xl p-3 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{order.customerName}</span>
                    <a
                      href={`tel:${order.customerPhone}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-medium text-[11px] transition"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{order.customerPhone}</span>
                    </a>
                  </div>
                  <div className="text-slate-400 flex items-start gap-1.5 text-[11px]">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                    <span>
                      {order.region}, {order.city} {order.address ? `— ${order.address}` : ''}
                    </span>
                  </div>
                  {order.note && (
                    <div className="text-[11px] text-amber-300/80 bg-amber-500/10 rounded px-2 py-1 mt-1">
                      Izoh: {order.note}
                    </div>
                  )}
                </div>

                {/* Order Items preview with photos */}
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Mahsulotlar ({order.items.length})
                  </div>
                  <div className="divide-y divide-slate-800/60">
                    {order.items.map((item, idx) => (
                      <div key={item.id || idx} className="py-1.5 flex items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={item.productImage || '/banners/hero-banner-1.png'}
                            alt={item.productName}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-800 shrink-0 border border-slate-700"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = '/banners/hero-banner-1.png';
                            }}
                          />
                          <div className="truncate">
                            <div className="font-medium text-slate-200 truncate">{item.productName}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                              <span>O‘lcham: <strong className="text-slate-300">{item.size}</strong></span>
                              <span>•</span>
                              <span>{item.color}</span>
                              <span>•</span>
                              <span>{item.quantity} dona</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 text-slate-300 font-medium text-xs">
                          {item.totalPrice.toLocaleString()} so‘m
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Switcher Actions */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-xs">
                  {order.status !== 'TASDIQLANDI' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'TASDIQLANDI')}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 border border-blue-500/30 font-medium transition cursor-pointer"
                    >
                      Tasdiqlash
                    </button>
                  )}
                  {order.status !== 'YETKAZILMOQDA' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'YETKAZILMOQDA')}
                      className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 font-medium transition cursor-pointer"
                    >
                      Yetkazishga berish
                    </button>
                  )}
                  {order.status !== 'YETKAZILDI' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'YETKAZILDI')}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 font-medium transition cursor-pointer"
                    >
                      Yetkazildi
                    </button>
                  )}
                  {order.status !== 'BEKOR_QILINDI' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'BEKOR_QILINDI')}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-medium transition cursor-pointer ml-auto"
                    >
                      Bekor qilish
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      )}

      {/* Floating Bottom Quick Action Bar for Mini App */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0e131f]/95 backdrop-blur-md border-t border-slate-800 px-4 py-2.5 z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-between text-xs">
          <button
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-1.5 text-slate-400 hover:text-amber-400 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Do‘kon sayti</span>
          </button>

          <div className="text-[11px] text-slate-500 font-mono">
            SHU BREND v1.0
          </div>

          <button
            onClick={() => setActiveTab('admin')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 font-medium hover:bg-amber-500/25 transition"
          >
            <span>Katta panel</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>
    </div>
  );
};
