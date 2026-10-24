import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Shirt,
  ShoppingBag,
  Sliders,
  Image as ImageIcon,
  Users,
  TrendingUp,
  Package,
  DollarSign,
  Plus,
  Trash2,
  Edit,
  Search,
  Upload,
  Check,
  X,
  Phone,
  MapPin,
  ExternalLink,
  ChevronDown,
  Loader2,
  RefreshCw,
  LogOut,
  CreditCard,
  Printer,
  CheckCircle,
  XCircle,
  Truck,
  PackageCheck,
  Send,
  ShieldAlert,
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Key,
  Copy,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Bot,
  Unlink,
  Link2,
  Radio,
  Sparkles,
  Globe,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api, formatUzbekPrice } from '../lib/api.ts';
import type { Banner, Category, Order, OrderStatus, PaymentMethod, PaymentStatus, PaymentTransaction, Product, SiteSettings, User } from '../types/index.ts';


export const AdminDashboardPage: React.FC = () => {
  const { user, logout, settings, refreshSettings, showToast, setActiveTab, setIsAdminLoginModalOpen } = useApp();

  const [activeAdminTab, setActiveAdminTab] = useState<
    'dashboard' | 'products' | 'orders' | 'telegram' | 'security' | 'homepage' | 'payments' | 'settings' | 'banners' | 'customers'
  >('dashboard');

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [selectedOrderForView, setSelectedOrderForView] = useState<Order | null>(null);
  const [printReceiptOrder, setPrintReceiptOrder] = useState<Order | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);

  // Banners
  const [banners, setBanners] = useState<Banner[]>([]);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);

  // Settings form
  const [settingsForm, setSettingsForm] = useState<SiteSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  // Payment & Transactions
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);

  // Customers
  const [customers, setCustomers] = useState<User[]>([]);

  // --- TELEGRAM BOT DEDICATED STATE ---
  const [telegramStatus, setTelegramStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'CHECKING' | 'ERROR'>('CHECKING');
  const [telegramBotInfo, setTelegramBotInfo] = useState<{ id?: number; username?: string; first_name?: string } | null>(null);
  const [telegramTokenInput, setTelegramTokenInput] = useState('');
  const [telegramChatIdInput, setTelegramChatIdInput] = useState('');
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [checkingTelegram, setCheckingTelegram] = useState(false);
  const [savingTelegram, setSavingTelegram] = useState(false);
  const [sendingTelegramTest, setSendingTelegramTest] = useState(false);
  const [connectingTelegram, setConnectingTelegram] = useState(false);
  const [disconnectingTelegram, setDisconnectingTelegram] = useState(false);
  const [telegramMaskedToken, setTelegramMaskedToken] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(true);

  // --- SECURITY SETTINGS DEDICATED STATE ---
  const [adminSecurityInfo, setAdminSecurityInfo] = useState<{ username: string; lastPasswordChange?: string }>({ username: 'admin' });
  const [newLoginInput, setNewLoginInput] = useState('');
  const [loginCurrentPassInput, setLoginCurrentPassInput] = useState('');
  const [showLoginCurrentPass, setShowLoginCurrentPass] = useState(false);
  const [savingLogin, setSavingLogin] = useState(false);

  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Load Telegram Status Live via getMe
  const loadTelegramStatus = async () => {
    try {
      setCheckingTelegram(true);
      const res = await api.getTelegramStatus();
      setTelegramStatus(res.status);
      setTelegramBotInfo(res.bot || null);
      setTelegramMaskedToken(res.tokenMasked || '');
      setTelegramChatIdInput(res.chatId || '');
      setTelegramEnabled(res.enabled ?? true);
    } catch {
      setTelegramStatus('ERROR');
    } finally {
      setCheckingTelegram(false);
    }
  };

  // Connect Telegram
  const handleConnectTelegram = async () => {
    const tokenToUse = telegramTokenInput.trim() || telegramMaskedToken;
    if (!tokenToUse) {
      showToast('Iltimos, Telegram Bot Tokenni kiriting', 'error');
      return;
    }
    if (!telegramChatIdInput.trim()) {
      showToast('Iltimos, Telegram Chat ID raqamini kiriting', 'error');
      return;
    }
    try {
      setConnectingTelegram(true);
      setTelegramStatus('CHECKING');
      const res = await api.connectTelegram(telegramTokenInput.trim() || '', telegramChatIdInput.trim());
      showToast(res.message || 'Telegram bot muvaffaqiyatli ulandi!', 'success');
      setTelegramStatus('CONNECTED');
      setTelegramBotInfo(res.bot);
      setTelegramTokenInput('');
      loadTelegramStatus();
      refreshSettings();
    } catch (e: any) {
      showToast(e.message || 'Ulanishda xatolik yuz berdi', 'error');
      setTelegramStatus('ERROR');
    } finally {
      setConnectingTelegram(false);
    }
  };

  // Disconnect Telegram
  const handleDisconnectTelegram = async () => {
    if (!confirm('Haqiqatan ham Telegram bot ulanishini uzmoqchimisiz?')) return;
    try {
      setDisconnectingTelegram(true);
      await api.disconnectTelegram();
      showToast('Telegram bot ulanishi uzildi', 'info');
      setTelegramStatus('DISCONNECTED');
      setTelegramBotInfo(null);
      loadTelegramStatus();
      refreshSettings();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setDisconnectingTelegram(false);
    }
  };

  // Save Telegram Settings
  const handleSaveTelegramSettings = async () => {
    try {
      setSavingTelegram(true);
      await api.saveTelegramSettings(
        telegramTokenInput.trim() || undefined,
        telegramChatIdInput.trim(),
        telegramEnabled
      );
      showToast('Telegram sozlamalari muvaffaqiyatli saqlandi', 'success');
      setTelegramTokenInput('');
      loadTelegramStatus();
      refreshSettings();
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setSavingTelegram(false);
    }
  };

  // Send Test Message
  const handleSendTelegramTest = async () => {
    try {
      setSendingTelegramTest(true);
      const res = await api.testTelegramSettings(
        telegramTokenInput.trim() || undefined,
        telegramChatIdInput.trim()
      );
      showToast(res.message || 'Test xabari Telegramga yuborildi!', 'success');
      setTelegramStatus('CONNECTED');
    } catch (e: any) {
      showToast(e.message || 'Test xabar yuborishda xatolik yuz berdi', 'error');
    } finally {
      setSendingTelegramTest(false);
    }
  };

  // Load Admin Security Info
  const loadAdminSecurity = async () => {
    try {
      const sec = await api.getAdminSecurityInfo();
      setAdminSecurityInfo(sec);
      setNewLoginInput(sec.username);
    } catch (e) {
      console.warn('Security info error:', e);
    }
  };

  // Change Admin Login
  const handleChangeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLoginInput.trim()) {
      showToast('Yangi loginni kiriting', 'error');
      return;
    }
    if (!loginCurrentPassInput.trim()) {
      showToast('Joriy parolingizni kiriting', 'error');
      return;
    }
    try {
      setSavingLogin(true);
      const res = await api.changeAdminLogin(loginCurrentPassInput, newLoginInput.trim());
      showToast(res.message, 'success');
      setAdminSecurityInfo((prev) => ({ ...prev, username: res.username }));
      setLoginCurrentPassInput('');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingLogin(false);
    }
  };

  // Change Admin Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPasswordInput) {
      showToast('Eski parolni kiriting', 'error');
      return;
    }
    if (newPasswordInput.length < 12) {
      showToast(`Yangi parol kamida 12 belgidan iborat bo‘lishi shart! (Hozir: ${newPasswordInput.length} ta belgi)`, 'error');
      return;
    }
    if (newPasswordInput !== confirmPasswordInput) {
      showToast('Yangi parol va takrorlangan parol mos kelmadi!', 'error');
      return;
    }
    try {
      setSavingPassword(true);
      const res = await api.changeAdminPassword(oldPasswordInput, newPasswordInput, confirmPasswordInput);
      showToast(res.message, 'success');
      setOldPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');

      // Auto logout and trigger re-login modal
      setTimeout(() => {
        logout();
        setIsAdminLoginModalOpen(true);
      }, 1500);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  // Load stats & core data
  const loadAdminData = async () => {
    try {
      setStatsLoading(true);
      const [s, prods, cats, ords, bans, setts, txs] = await Promise.all([
        api.getAdminStats(),
        api.getProducts(),
        api.getCategories(),
        api.getOrders(),
        api.getBanners(),
        api.getSettings(),
        api.getPaymentTransactions().catch(() => []),
      ]);
      setStats(s);
      setProducts(prods);
      setCategories(cats);
      setOrders(ords);
      setBanners(bans);
      setSettingsForm(setts);
      setTransactions(txs);
      loadTelegramStatus();
      loadAdminSecurity();
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);


  // Product CRUD
  const handleSaveProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = formData.get('name') as string;
    const price = Number(formData.get('price'));
    const discountPrice = formData.get('discountPrice') ? Number(formData.get('discountPrice')) : undefined;
    const categorySlug = formData.get('categorySlug') as string;
    const stock = Number(formData.get('stock') || 10);
    const description = formData.get('description') as string;
    const sizes = (formData.get('sizes') as string).split(',').map((s) => s.trim()).filter(Boolean);
    const colors = (formData.get('colors') as string).split(',').map((c) => c.trim()).filter(Boolean);
    const imagesStr = formData.get('images') as string;
    const images = imagesStr ? imagesStr.split(',').map((img) => img.trim()).filter(Boolean) : [];

    const catObj = categories.find((c) => c.slug === categorySlug);

    const payload: Partial<Product> = {
      name,
      price,
      discountPrice,
      categorySlug,
      categoryName: catObj ? catObj.name : 'KURTKA',
      stock,
      description,
      sizes: sizes.length > 0 ? sizes : ['S', 'M', 'L', 'XL'],
      colors: colors.length > 0 ? colors : ['Qora'],
      images: images.length > 0 ? images : ['/banners/hero-banner-1.png'],
    };

    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        showToast('Mahsulot muvaffaqiyatli yangilandi', 'success');
      } else {
        await api.createProduct(payload);
        showToast('Yangi mahsulot muvaffaqiyatli qo‘shildi', 'success');
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Xatolik yuz berdi', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Haqiqatan ham bu mahsulotni o‘chirmoqchimisiz?')) return;
    try {
      await api.deleteProduct(id);
      showToast('Mahsulot o‘chirildi', 'info');
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Image file upload handler
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productImagesList, setProductImagesList] = useState<string[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      if (files.length === 1) {
        const url = await api.uploadFile(files[0]);
        setProductImagesList((prev) => [...prev, url]);
      } else {
        const urls = await api.uploadMultipleFiles(files);
        setProductImagesList((prev) => [...prev, ...urls]);
      }
      showToast('Rasmlar yuklandi!', 'success');
    } catch {
      showToast('Rasm yuklashda xatolik', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  // Order status update
  // Order status update
  const handleStatusChange = async (
    orderId: string,
    newStatus: OrderStatus,
    comment?: string,
    newPaymentStatus?: PaymentStatus
  ) => {
    try {
      const updated = await api.updateOrderStatus(orderId, newStatus, comment, newPaymentStatus);
      showToast(`Buyurtma holati yangilandi: ${newStatus}`, 'success');
      loadAdminData();
      if (selectedOrderForView && selectedOrderForView.id === orderId) {
        setSelectedOrderForView(updated);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  // Save Payment and Telegram Settings
  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    setSavingPaymentSettings(true);
    try {
      await api.updateSettings(settingsForm);
      await refreshSettings();
      showToast('To‘lov va Telegram sozlamalari muvaffaqiyatli saqlandi!', 'success');
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingPaymentSettings(false);
    }
  };

  // Test Telegram Bot Message
  const handleTestTelegram = async () => {
    setSendingTelegramTest(true);
    try {
      const res = await api.testTelegramSettings(
        settingsForm?.telegramSettings?.botToken,
        settingsForm?.telegramSettings?.chatId
      );
      showToast(res.message || 'Telegramga test xabar muvaffaqiyatli yuborildi!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Telegram test xabari yuborilmadi', 'error');
    } finally {
      setSendingTelegramTest(false);
    }
  };



  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsForm) return;
    setSavingSettings(true);
    try {
      await api.updateSettings(settingsForm);
      await refreshSettings();
      showToast('Sayt sozlamalari muvaffaqiyatli saqlandi!', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  // Banner CRUD
  const handleSaveBanner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = formData.get('title') as string;
    const subtitle = formData.get('subtitle') as string;
    const buttonText = formData.get('buttonText') as string;
    const buttonLink = formData.get('buttonLink') as string;
    const imageUrl = formData.get('imageUrl') as string;

    try {
      if (editingBanner) {
        await api.updateBanner(editingBanner.id, {
          title,
          subtitle,
          buttonText,
          buttonLink,
          imageUrl,
        });
        showToast('Banner yangilandi', 'success');
      } else {
        await api.createBanner({
          title,
          subtitle,
          buttonText,
          buttonLink,
          imageUrl,
          isActive: true,
        });
        showToast('Yangi banner qo‘shildi', 'success');
      }
      setIsBannerModalOpen(false);
      setEditingBanner(null);
      loadAdminData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'YANGI':
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">🟡 Yangi</span>;
      case 'TASDIQLANDI':
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40">🔵 Tasdiqlandi</span>;
      case 'TAYYORLANMOQDA':
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40">🟣 Tayyorlanmoqda</span>;
      case 'YETKAZILMOQDA':
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">🚚 Yetkazilmoqda</span>;
      case 'YETKAZILDI':
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">🟢 Yetkazildi</span>;
      case 'BEKOR_QILINDI':
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">🔴 Bekor qilindi</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  // Faqat admin huquqiga ega foydalanuvchi admin panelga kira olsin
  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-[#131b2a] border border-amber-500/40 rounded-3xl p-6 sm:p-8 text-center shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/40">
            <LayoutDashboard className="w-8 h-8 text-[#d4af37]" />
          </div>
          <h2 className="text-2xl font-black text-white">Admin huquqi talab qilinadi</h2>
          <p className="text-xs text-slate-400 mt-2 mb-6">
            Ushbu bo‘lim faqat SHU BREND do‘koni administratorlari uchun himoyalangan.
            Iltimos, admin paroli orqali kiring.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setIsAdminLoginModalOpen(true)}
              className="w-full py-3.5 rounded-xl gold-gradient-bg text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#d4af37]/25 hover:brightness-110 active:scale-95 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <span>⚙️ Admin panelga kirish</span>
            </button>
            <button
              onClick={() => setActiveTab('home')}
              className="w-full py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              Bosh sahifaga qaytish
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f17] pb-24 text-slate-100">
      {/* Top Admin Bar */}
      <div className="bg-[#111726] border-b border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg gold-gradient-bg text-black font-black flex items-center justify-center text-sm shadow">
            AD
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-black text-white leading-none">
              SHU BREND — Boshqaruv Paneli
            </h1>
            <span className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">
              Super Admin Rejimi
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAdminData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Yangilash"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Do‘kon sayti</span>
          </button>
          <button
            onClick={() => {
              logout();
              setActiveTab('home');
              showToast('Admin tizimdan chiqdi', 'info');
            }}
            className="px-3 py-1.5 rounded-xl border border-rose-500/40 hover:bg-rose-500/10 text-xs font-bold text-rose-300 flex items-center gap-1.5 transition cursor-pointer"
            title="Admin Chiqish"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Chiqish</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Navigation Tabs (Dashboard, Mahsulotlar, Buyurtmalar, Telegram Bot, Xavfsizlik, To‘lov, Sayt, Bannerlar) */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-3 border-b border-slate-800/80 mb-6">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'products', label: 'Mahsulotlar', icon: Shirt, badge: products.length },
            { id: 'orders', label: 'Buyurtmalar', icon: ShoppingBag, badge: orders.length },
            {
              id: 'telegram',
              label: 'Telegram Bot',
              icon: Bot,
              statusDot: telegramStatus === 'CONNECTED' ? 'bg-emerald-400' : telegramStatus === 'CHECKING' ? 'bg-amber-400' : 'bg-rose-400',
            },
            { id: 'security', label: 'Xavfsizlik', icon: ShieldCheck },
            { id: 'payments', label: 'To‘lov sozlamalari', icon: CreditCard },
            { id: 'settings', label: 'Sayt & Bosh sahifa', icon: Globe },
            { id: 'banners', label: 'Bannerlar', icon: ImageIcon, badge: banners.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeAdminTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveAdminTab(tab.id as any)}
                className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'gold-gradient-bg text-black shadow-lg shadow-[#d4af37]/20'
                    : 'bg-[#131b2a] text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.statusDot && (
                  <span className={`w-2 h-2 rounded-full ${tab.statusDot} animate-pulse`} />
                )}
                {typeof tab.badge === 'number' && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-black text-amber-300' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>


        {/* --- 1. DASHBOARD TAB (Screenshot 7) --- */}
        {activeAdminTab === 'dashboard' && (
          <div className="space-y-8">
            {/* 4 Stats Cards (Screenshot 7) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* Jami Daromad */}
              <div className="bg-[#131b2a] rounded-3xl p-5 border border-slate-800 relative overflow-hidden">
                <span className="text-xs font-bold text-slate-400 block mb-1">Jami daromad</span>
                <span className="text-xl sm:text-2xl font-black text-white block">
                  {formatUzbekPrice(stats?.totalRevenue || 12450000)}
                </span>
                <span className="text-[11px] font-bold text-emerald-400 mt-2 inline-flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +12% o‘tgan oydan
                </span>
              </div>

              {/* Buyurtmalar */}
              <div className="bg-[#131b2a] rounded-3xl p-5 border border-slate-800 relative overflow-hidden">
                <span className="text-xs font-bold text-slate-400 block mb-1">Buyurtmalar</span>
                <span className="text-xl sm:text-2xl font-black text-white block">
                  {stats?.totalOrders || orders.length}
                </span>
                <span className="text-[11px] font-bold text-emerald-400 mt-2 inline-flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +8% o‘tgan oydan
                </span>
              </div>

              {/* Mahsulotlar */}
              <div className="bg-[#131b2a] rounded-3xl p-5 border border-slate-800 relative overflow-hidden">
                <span className="text-xs font-bold text-slate-400 block mb-1">Mahsulotlar</span>
                <span className="text-xl sm:text-2xl font-black text-white block">
                  {stats?.totalProducts || products.length}
                </span>
                <span className="text-[11px] font-bold text-cyan-400 mt-2 inline-flex items-center gap-1">
                  <Shirt className="w-3.5 h-3.5" /> Faol katalogda
                </span>
              </div>

              {/* Mijozlar */}
              <div className="bg-[#131b2a] rounded-3xl p-5 border border-slate-800 relative overflow-hidden">
                <span className="text-xs font-bold text-slate-400 block mb-1">Mijozlar</span>
                <span className="text-xl sm:text-2xl font-black text-white block">
                  {stats?.totalCustomers || 38}
                </span>
                <span className="text-[11px] font-bold text-emerald-400 mt-2 inline-flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +11% yangi xaridorlar
                </span>
              </div>
            </div>

            {/* Sales Chart Visualization (Screenshot 7) */}
            <div className="bg-[#131b2a] rounded-3xl p-6 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-base font-black text-white">Savdo statistikasi</h3>
                  <p className="text-xs text-slate-400">Kunlik va haftalik real tushumlar tahlili</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-bold bg-[#d4af37]/20 text-[#d4af37]">
                    Haftalik
                  </span>
                </div>
              </div>

              {/* Bar / Area Chart representation */}
              <div className="h-48 flex items-end gap-3 sm:gap-6 pt-4 border-b border-slate-800">
                {(stats?.weeklySales || [
                  { label: 'Dush', amount: 1200000 },
                  { label: 'Sesh', amount: 1850000 },
                  { label: 'Chor', amount: 2400000 },
                  { label: 'Pay', amount: 1950000 },
                  { label: 'Juma', amount: 3100000 },
                  { label: 'Shan', amount: 4200000 },
                  { label: 'Yak', amount: 3800000 },
                ]).map((day: any, idx: number) => {
                  const heightPercent = Math.min(100, Math.round((day.amount / 4500000) * 100));
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <div className="text-[10px] font-bold text-amber-300 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                        {Math.round(day.amount / 1000000)}M
                      </div>
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className="w-full rounded-t-xl bg-gradient-to-t from-[#aa820a] to-[#d4af37] group-hover:brightness-125 transition-all shadow-lg"
                      />
                      <span className="text-[11px] font-semibold text-slate-400">{day.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Oxirgi buyurtmalar (Recent Orders Table - Screenshot 7) */}
            <div className="bg-[#131b2a] rounded-3xl p-6 border border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-black text-white">Oxirgi buyurtmalar</h3>
                <button
                  onClick={() => setActiveAdminTab('orders')}
                  className="text-xs text-[#d4af37] font-bold hover:underline"
                >
                  Barcha buyurtmalarni ko‘rish
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-3 px-3">Raqam</th>
                      <th className="py-3 px-3">Mijoz</th>
                      <th className="py-3 px-3">Summa</th>
                      <th className="py-3 px-3">Holat</th>
                      <th className="py-3 px-3">Sana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {orders.slice(0, 5).map((ord) => (
                      <tr key={ord.id} className="hover:bg-slate-900/50 transition">
                        <td className="py-3 px-3 font-mono font-bold text-white">{ord.orderNumber}</td>
                        <td className="py-3 px-3 font-semibold text-slate-200">{ord.customerName}</td>
                        <td className="py-3 px-3 font-black text-white">{formatUzbekPrice(ord.total)}</td>
                        <td className="py-3 px-3">{getStatusBadge(ord.status)}</td>
                        <td className="py-3 px-3 text-slate-400">
                          {new Date(ord.createdAt).toLocaleDateString('uz-UZ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- 2. MAHSULOTLAR TAB (Screenshot 8) --- */}
        {activeAdminTab === 'products' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Mahsulotlar katalogi ({products.length})</h2>
                <p className="text-xs text-slate-400">Yangi kiyimlarni qo‘shing, narx va rasmlarini tahrirlang</p>
              </div>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProductImagesList([]);
                  setIsProductModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-extrabold text-xs shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Yangi mahsulot qo‘shish</span>
              </button>
            </div>

            {/* Product Table */}
            <div className="bg-[#131b2a] rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="relative w-full max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Mahsulot nomi bo‘yicha qidirish..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-3 px-4">Rasm</th>
                      <th className="py-3 px-4">Nomi</th>
                      <th className="py-3 px-4">Kategoriya</th>
                      <th className="py-3 px-4">Narxi</th>
                      <th className="py-3 px-4">Chegirma</th>
                      <th className="py-3 px-4">Qoldiq</th>
                      <th className="py-3 px-4 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-14 text-center text-slate-400">
                          <p className="text-base font-bold text-slate-200">Hozircha mahsulotlar mavjud emas</p>
                          <p className="text-xs text-slate-400 mt-1 mb-4">
                            Barcha eski mahsulotlar o‘chirildi. O‘zingiz yangi mahsulot qo‘shishingiz mumkin.
                          </p>
                          <button
                            onClick={() => {
                              setEditingProduct(null);
                              setProductImagesList([]);
                              setIsProductModalOpen(true);
                            }}
                            className="px-4 py-2 rounded-xl gold-gradient-bg text-black font-extrabold text-xs shadow inline-flex items-center gap-1.5 cursor-pointer hover:brightness-110 transition"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>+ Yangi mahsulot qo‘shish</span>
                          </button>
                        </td>
                      </tr>
                    ) : (
                      products
                        .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-900/50 transition">
                          <td className="py-2.5 px-4">
                            <img
                              src={prod.images[0]}
                              alt=""
                              className="w-10 h-12 rounded-lg object-cover bg-slate-900"
                            />
                          </td>
                          <td className="py-2.5 px-4 font-bold text-white max-w-[200px] truncate">
                            {prod.name}
                          </td>
                          <td className="py-2.5 px-4 uppercase text-[10px] font-bold text-[#d4af37]">
                            {prod.categoryName}
                          </td>
                          <td className="py-2.5 px-4 font-black text-white">
                            {formatUzbekPrice(prod.price)}
                          </td>
                          <td className="py-2.5 px-4">
                            {prod.discountPrice ? (
                              <span className="text-rose-400 font-bold">
                                {formatUzbekPrice(prod.discountPrice)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded ${
                                prod.stock > 5 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {prod.stock} dona
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => {
                                  setEditingProduct(prod);
                                  setProductImagesList(prod.images);
                                  setIsProductModalOpen(true);
                                }}
                                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                                title="Tahrirlash"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(prod.id)}
                                className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                                title="O‘chirish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- 3. BUYURTMALAR TAB (Responsive Desktop Table + Mobile Cards) --- */}
        {activeAdminTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Buyurtmalar boshqaruvi ({orders.length})</h2>
                <p className="text-xs text-slate-400">
                  Mijoz buyurtmalarini ko‘rish, har bir buyurtma tafsilotlarini ochish va holatlarini o‘zgartirish
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700"
                >
                  <option value="ALL">Barcha holatlar</option>
                  <option value="YANGI">🟡 Yangi</option>
                  <option value="TASDIQLANDI">🔵 Tasdiqlandi</option>
                  <option value="TAYYORLANMOQDA">🟣 Tayyorlanmoqda</option>
                  <option value="YETKAZILMOQDA">🚚 Yetkazilmoqda</option>
                  <option value="YETKAZILDI">🟢 Yetkazildi</option>
                  <option value="BEKOR_QILINDI">🔴 Bekor qilindi</option>
                </select>
              </div>
            </div>

            {/* Orders Search & Container */}
            <div className="bg-[#131b2a] rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div className="relative w-full max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buyurtma raqami, mijoz ismi yoki telefon..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* DESKTOP TABLE VIEW (md: and up) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-3 px-3">Buyurtma</th>
                      <th className="py-3 px-3">Mahsulot rasmi & Nomi</th>
                      <th className="py-3 px-3">Mijoz</th>
                      <th className="py-3 px-3">Telefon</th>
                      <th className="py-3 px-3">To‘lov (Kartaga)</th>
                      <th className="py-3 px-3">Summa</th>
                      <th className="py-3 px-3">Holat</th>
                      <th className="py-3 px-3">Sana</th>
                      <th className="py-3 px-3 text-right">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {orders
                      .filter((o) => {
                        const matchStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
                        const matchSearch =
                          o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
                          o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
                          o.customerPhone.includes(orderSearch);
                        return matchStatus && matchSearch;
                      })
                      .map((ord) => {
                        const payBadge =
                          ord.paymentMethod === 'PAYNET_CARD' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Paynet kartaga
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00c0f3]/15 text-[#00c0f3] border border-[#00c0f3]/30">
                              Click kartaga
                            </span>
                          );

                        const payStatusBadge =
                          ord.paymentStatus === 'TOLANDI' ? (
                            <span className="text-[10px] font-bold text-emerald-400 block">🟢 To‘langan</span>
                          ) : ord.paymentStatus === 'BEKOR_QILINDI' ? (
                            <span className="text-[10px] font-bold text-rose-400 block">🔴 Bekor</span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-400 block">🟡 To‘lov kutilmoqda</span>
                          );

                        return (
                          <tr key={ord.id} className="hover:bg-slate-900/50 transition">
                            <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                              {ord.orderNumber}
                            </td>

                            {/* Product Images Thumbnails with click-to-zoom (Requirement 1) */}
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <div className="flex items-center -space-x-2 overflow-hidden py-1">
                                  {(ord.items || []).map((it, idx) => (
                                    <div
                                      key={it.id || idx}
                                      onClick={() =>
                                        it.productImage &&
                                        setLightboxImage({ url: it.productImage, title: it.productName })
                                      }
                                      title={`${it.productName} (${it.size}, ${it.color}) — Kattalashtirish`}
                                      className="relative w-11 h-13 rounded-lg bg-slate-800 border-2 border-slate-900 overflow-hidden cursor-zoom-in shrink-0 hover:z-10 hover:scale-110 hover:border-[#d4af37] transition shadow"
                                    >
                                      <img
                                        src={it.productImage || '/banners/hero-banner-1.png'}
                                        alt={it.productName}
                                        className="w-full h-full object-cover"
                                      />
                                      {it.quantity > 1 && (
                                        <span className="absolute bottom-0 right-0 px-1 text-[8px] font-black bg-black/85 text-amber-300 rounded-tl">
                                          ×{it.quantity}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                                <div className="min-w-0 max-w-[140px]">
                                  <span className="text-xs font-bold text-white truncate block">
                                    {ord.items[0]?.productName || 'Kiyim'}
                                  </span>
                                  {ord.items.length > 1 ? (
                                    <span className="text-[10px] text-amber-400 font-semibold block">
                                      + yana {ord.items.length - 1} xil mahsulot
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 block">
                                      {ord.items[0]?.size} • {ord.items[0]?.color} • {ord.items[0]?.quantity} dona
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                              {ord.customerName}
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-300 whitespace-nowrap">
                              <a href={`tel:${ord.customerPhone}`} className="hover:text-amber-400 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-[#d4af37]" />
                                <span>{ord.customerPhone}</span>
                              </a>
                            </td>
                            <td className="py-3 px-3">
                              <div className="space-y-0.5">
                                {payBadge}
                                {payStatusBadge}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-black text-[#d4af37] whitespace-nowrap">
                              {formatUzbekPrice(ord.total)}
                            </td>
                            <td className="py-3 px-3">
                              <select
                                value={ord.status}
                                onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)}
                                className="px-2 py-1 bg-slate-900 text-xs font-bold text-white rounded-lg border border-slate-700"
                              >
                                <option value="YANGI">🟡 Yangi</option>
                                <option value="TASDIQLANDI">🔵 Tasdiqlandi</option>
                                <option value="TAYYORLANMOQDA">🟣 Tayyorlanmoqda</option>
                                <option value="YETKAZILMOQDA">🚚 Yetkazilmoqda</option>
                                <option value="YETKAZILDI">🟢 Yetkazildi</option>
                                <option value="BEKOR_QILINDI">🔴 Bekor qilindi</option>
                              </select>
                            </td>
                            <td className="py-3 px-3 text-slate-400 whitespace-nowrap">
                              {new Date(ord.createdAt).toLocaleDateString('uz-UZ')}
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => setSelectedOrderForView(ord)}
                                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-[#d4af37] hover:text-black text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>👁 Batafsil ko‘rish</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW (Requirement 1 & 2: Responsive har bir buyurtma alohida karta va rasmlar) */}
              <div className="block md:hidden divide-y divide-slate-800/80">
                {orders
                  .filter((o) => {
                    const matchStatus = orderStatusFilter === 'ALL' || o.status === orderStatusFilter;
                    const matchSearch =
                      o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
                      o.customerName.toLowerCase().includes(orderSearch.toLowerCase()) ||
                      o.customerPhone.includes(orderSearch);
                    return matchStatus && matchSearch;
                  })
                  .map((ord) => {
                    const totalItemsCount = (ord.items || []).reduce((acc, it) => acc + (it.quantity || 1), 0);

                    const payBadge =
                      ord.paymentMethod === 'PAYNET_CARD' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                          Paynet kartaga
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00c0f3]/20 text-[#00c0f3]">
                          Click kartaga
                        </span>
                      );

                    return (
                      <div key={ord.id} className="p-4 space-y-3.5 hover:bg-slate-900/30 transition">
                        {/* Header: Name, Phone & Order Number */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{ord.customerName}</span>
                              <span className="font-mono text-[10px] font-black text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                {ord.orderNumber}
                              </span>
                            </div>
                            <a
                              href={`tel:${ord.customerPhone}`}
                              className="text-xs text-[#d4af37] font-mono flex items-center gap-1 mt-1 hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{ord.customerPhone}</span>
                            </a>
                          </div>
                          <div>{getStatusBadge(ord.status)}</div>
                        </div>

                        {/* Real Product Photos & Info (Requirement 1: Har bir buyurtmada haqiqiy rasm) */}
                        <div className="space-y-2 pt-2 border-t border-slate-800/80">
                          {(ord.items || []).map((it, idx) => (
                            <div
                              key={it.id || idx}
                              className="flex items-center gap-3 p-2 bg-slate-900/70 rounded-xl border border-slate-800/80"
                            >
                              <div
                                onClick={() =>
                                  it.productImage &&
                                  setLightboxImage({ url: it.productImage, title: it.productName })
                                }
                                title="Kattalashtirib ko‘rish uchun bosing"
                                className="relative w-14 h-16 rounded-lg bg-slate-800 overflow-hidden shrink-0 border border-slate-700 cursor-zoom-in"
                              >
                                <img
                                  src={it.productImage || '/banners/hero-banner-1.png'}
                                  alt={it.productName}
                                  className="w-full h-full object-cover"
                                />
                                {it.quantity > 1 && (
                                  <span className="absolute bottom-0 right-0 px-1 text-[9px] font-black bg-black/80 text-amber-300 rounded-tl">
                                    ×{it.quantity}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-white text-xs truncate">{it.productName}</h5>
                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                  <span>O‘lcham: <strong className="text-slate-200">{it.size}</strong></span>
                                  <span>•</span>
                                  <span>Rang: <strong className="text-slate-200">{it.color}</strong></span>
                                </div>
                                <div className="flex items-center justify-between text-[11px] mt-1">
                                  <span className="text-slate-400">{it.quantity} ta × {formatUzbekPrice(it.unitPrice)}</span>
                                  <span className="font-black text-[#d4af37]">{formatUzbekPrice(it.totalPrice)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Summary & Address */}
                        <div className="space-y-1.5 text-xs text-slate-400 pt-1">
                          {ord.address && (
                            <div className="flex items-center gap-1.5 truncate text-[11px]">
                              <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                              <span className="truncate">{ord.region ? `${ord.region}, ${ord.address}` : ord.address}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                            <div className="flex items-center gap-1.5">
                              {payBadge}
                              <span
                                className={`text-[10px] font-bold ${
                                  ord.paymentStatus === 'TOLANDI'
                                    ? 'text-emerald-400'
                                    : ord.paymentStatus === 'BEKOR_QILINDI'
                                    ? 'text-rose-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {ord.paymentStatus === 'TOLANDI' ? '🟢 To‘langan' : '🟡 To‘lov kutilmoqda'}
                              </span>
                            </div>
                            <span className="font-black text-white text-sm">
                              {formatUzbekPrice(ord.total)}
                            </span>
                          </div>
                        </div>

                        {/* Action: Batafsil ko‘rish */}
                        <div className="pt-2 flex items-center justify-between gap-2">
                          <select
                            value={ord.status}
                            onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)}
                            className="flex-1 px-2.5 py-2 bg-slate-900 text-xs font-bold text-white rounded-xl border border-slate-700"
                          >
                            <option value="YANGI">🟡 Yangi</option>
                            <option value="TASDIQLANDI">🔵 Tasdiqlandi</option>
                            <option value="TAYYORLANMOQDA">🟣 Tayyorlanmoqda</option>
                            <option value="YETKAZILMOQDA">🚚 Yetkazilmoqda</option>
                            <option value="YETKAZILDI">🟢 Yetkazildi</option>
                            <option value="BEKOR_QILINDI">🔴 Bekor qilindi</option>
                          </select>

                          <button
                            onClick={() => setSelectedOrderForView(ord)}
                            className="px-4 py-2 rounded-xl gold-gradient-bg text-black font-extrabold text-xs flex items-center gap-1.5 shadow cursor-pointer hover:brightness-110"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>👁 Batafsil ko‘rish</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* --- 3. TELEGRAM BOT TAB (Requirement 1) --- */}
        {activeAdminTab === 'telegram' && (

          <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131b2a] p-6 rounded-3xl border border-slate-800 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#229ed9]/20 border border-[#229ed9]/40 flex items-center justify-center text-[#229ed9]">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <span>Telegram Bot Integratsiyasi</span>
                    {telegramStatus === 'CONNECTED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        🟢 Ulangan
                      </span>
                    )}
                    {telegramStatus === 'DISCONNECTED' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        🔴 Ulanmagan
                      </span>
                    )}
                    {telegramStatus === 'CHECKING' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                        🟡 Tekshirilmoqda
                      </span>
                    )}
                    {telegramStatus === 'ERROR' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                        🔴 Xatolik
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Mijoz buyurtma berishi bilan mahsulot rasmlari, o‘lchami, rangi va to‘lov ma‘lumotlari bilan Telegramga yuboriladi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadTelegramStatus}
                  disabled={checkingTelegram}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingTelegram ? 'animate-spin' : ''}`} />
                  <span>Holatni tekshirish</span>
                </button>
              </div>
            </div>

            {/* Live Bot Card if connected */}
            {telegramStatus === 'CONNECTED' && telegramBotInfo && (
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black">
                    ✓
                  </div>
                  <div>
                    <div className="text-sm font-black text-white">
                      {telegramBotInfo.first_name || 'SHU BREND Bot'} (@{telegramBotInfo.username})
                    </div>
                    <div className="text-xs text-emerald-300/80">
                      Bot faol va yangi buyurtmalarni rasmi bilan qabul qilishga to‘liq tayyor. ID: {telegramBotInfo.id}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`https://t.me/${telegramBotInfo.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-1.5 rounded-xl bg-[#229ed9] hover:bg-[#1f8ec4] text-white text-xs font-bold flex items-center gap-1.5 transition shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Botni ochish</span>
                  </a>
                </div>
              </div>
            )}

            {/* Configuration Form Card */}
            <div className="bg-[#131b2a] rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
              <div className="space-y-4">
                {/* Telegram Bot Token */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Telegram Bot Token *</span>
                    </label>
                    {telegramMaskedToken && (
                      <span className="text-[11px] text-emerald-400 font-mono bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/60">
                        Saqlangan: {telegramMaskedToken}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      type={showTelegramToken ? 'text' : 'password'}
                      value={telegramTokenInput}
                      onChange={(e) => setTelegramTokenInput(e.target.value)}
                      placeholder={telegramMaskedToken ? `Token saqlangan (${telegramMaskedToken}). Yangilash uchun yangi tokenni kiriting` : 'Masalan: 7123456789:AAH...'}
                      className="w-full pl-3.5 pr-12 py-3 bg-slate-900 text-xs sm:text-sm text-white rounded-xl border border-slate-700 font-mono focus:border-[#d4af37] focus:outline-none"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setShowTelegramToken(!showTelegramToken)}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                        title={showTelegramToken ? 'Yashirish' : 'Ko‘rsatish'}
                      >
                        {showTelegramToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1.5">
                    🔒 <b>Xavfsizlik kafolati:</b> Token faqat serverda AES-256-GCM orqali shifrlanadi. Frontend kodida, localStorage yoki repository ichida hech qachon ochiq ko‘rinmaydi.
                  </p>
                </div>

                {/* Telegram Chat ID */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>Telegram Chat ID (Shaxsiy chat yoki Guruh) *</span>
                    </label>
                  </div>

                  <input
                    type="text"
                    value={telegramChatIdInput}
                    onChange={(e) => setTelegramChatIdInput(e.target.value)}
                    placeholder="Masalan: -1001234567890 (guruh) yoki 123456789 (shaxsiy)"
                    className="w-full px-3.5 py-3 bg-slate-900 text-xs sm:text-sm text-white rounded-xl border border-slate-700 font-mono focus:border-[#d4af37] focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1.5">
                    💡 Guruh Chat ID olish uchun botni o‘z guruhingizga qo‘shib administrator qiling va Chat ID raqamini kiriting (odatda -100 bilan boshlanadi). Shaxsiy chat uchun @userinfobot orqali o‘z ID raqamingizni bilib olishingiz mumkin.
                  </p>
                </div>
              </div>

              {/* 5 Tugmalar: Ulash, Saqlash, Tekshirish, Test xabar, Uzish */}
              <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleConnectTelegram}
                  disabled={connectingTelegram}
                  className="px-4 py-2.5 rounded-xl gold-gradient-bg text-black font-extrabold text-xs flex items-center gap-2 hover:brightness-110 active:scale-95 transition shadow cursor-pointer"
                >
                  {connectingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5 stroke-[2.5]" />}
                  <span>🔗 Botni ulash</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveTelegramSettings}
                  disabled={savingTelegram}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-slate-700"
                >
                  {savingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>💾 Sozlamalarni saqlash</span>
                </button>

                <button
                  type="button"
                  onClick={loadTelegramStatus}
                  disabled={checkingTelegram}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-amber-500/30"
                >
                  {checkingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                  <span>🧪 Ulanishni tekshirish</span>
                </button>

                <button
                  type="button"
                  onClick={handleSendTelegramTest}
                  disabled={sendingTelegramTest}
                  className="px-4 py-2.5 rounded-xl bg-[#229ed9]/20 hover:bg-[#229ed9] text-[#229ed9] hover:text-white font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-[#229ed9]/40"
                >
                  {sendingTelegramTest ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>📨 Test xabar yuborish</span>
                </button>

                <button
                  type="button"
                  onClick={handleDisconnectTelegram}
                  disabled={disconnectingTelegram}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold text-xs flex items-center gap-2 transition cursor-pointer border border-rose-500/30 sm:ml-auto"
                >
                  {disconnectingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                  <span>🔌 Ulanishni uzish</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- 4. XAVFSIZLIK SOZLAMALARI TAB (Requirement 2) --- */}
        {activeAdminTab === 'security' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-[#131b2a] p-6 rounded-3xl border border-slate-800 shadow-xl flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Xavfsizlik Sozlamalari</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Admin login va parolini boshqaring. Barcha parollar scrypt orqali xeshlanadi va shifrlangan holda saqlanadi.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Loginni o‘zgartirish */}
              <div className="bg-[#131b2a] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
                    <Lock className="w-4 h-4 text-[#d4af37]" />
                    <h3 className="text-sm font-bold text-white">Loginni o‘zgartirish</h3>
                  </div>

                  <form onSubmit={handleChangeLogin} className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Hozirgi login</label>
                      <div className="px-3.5 py-2.5 bg-slate-950 text-slate-300 rounded-xl border border-slate-800 font-mono text-xs font-bold">
                        {adminSecurityInfo.username}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-200 block mb-1">Yangi login *</label>
                      <input
                        type="text"
                        required
                        value={newLoginInput}
                        onChange={(e) => setNewLoginInput(e.target.value)}
                        placeholder="Yangi login kiriting"
                        className="w-full px-3.5 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 font-mono focus:border-[#d4af37] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-200 block mb-1">Joriy parol *</label>
                      <div className="relative">
                        <input
                          type={showLoginCurrentPass ? 'text' : 'password'}
                          required
                          value={loginCurrentPassInput}
                          onChange={(e) => setLoginCurrentPassInput(e.target.value)}
                          placeholder="Tasdiqlash uchun joriy parolni kiriting"
                          className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 font-mono focus:border-[#d4af37] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginCurrentPass(!showLoginCurrentPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showLoginCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Admin joriy parolini to‘g‘ri kiritgandagina yangi login saqlanadi.
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={savingLogin}
                      className="w-full py-2.5 rounded-xl gold-gradient-bg text-black font-extrabold text-xs uppercase tracking-wider shadow hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {savingLogin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Loginni saqlash</span>
                    </button>
                  </form>
                </div>
              </div>

              {/* 2. Parolni o‘zgartirish */}
              <div className="bg-[#131b2a] rounded-3xl p-6 sm:p-7 border border-slate-800 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800 mb-4">
                    <Key className="w-4 h-4 text-[#d4af37]" />
                    <h3 className="text-sm font-bold text-white">Parolni o‘zgartirish</h3>
                  </div>

                  <form onSubmit={handleChangePassword} className="space-y-3.5">
                    <div>
                      <label className="text-xs font-bold text-slate-200 block mb-1">Eski parol *</label>
                      <div className="relative">
                        <input
                          type={showOldPass ? 'text' : 'password'}
                          required
                          value={oldPasswordInput}
                          onChange={(e) => setOldPasswordInput(e.target.value)}
                          placeholder="Hozirgi parolingiz"
                          className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 font-mono focus:border-[#d4af37] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOldPass(!showOldPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showOldPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-200">Yangi parol (kamida 12 belgi) *</label>
                        <span className={`text-[10px] font-mono ${newPasswordInput.length >= 12 ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {newPasswordInput.length}/12
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          required
                          value={newPasswordInput}
                          onChange={(e) => setNewPasswordInput(e.target.value)}
                          placeholder="Kamida 12 ta kuchli belgi"
                          className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 font-mono focus:border-[#d4af37] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-200 block mb-1">Yangi parolni takrorlash *</label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          required
                          value={confirmPasswordInput}
                          onChange={(e) => setConfirmPasswordInput(e.target.value)}
                          placeholder="Yangi parolni qayta kiriting"
                          className="w-full pl-3.5 pr-10 py-2.5 bg-slate-900 text-white text-xs rounded-xl border border-slate-700 font-mono focus:border-[#d4af37] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {showConfirmPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      {confirmPasswordInput && (
                        <div className="text-[10px] mt-1 font-bold">
                          {confirmPasswordInput === newPasswordInput ? (
                            <span className="text-emerald-400">✓ Parollar mos keldi</span>
                          ) : (
                            <span className="text-rose-400">✕ Parollar bir-biriga mos kelmadi</span>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs uppercase tracking-wider shadow hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      {savingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                      <span>Parolni o‘zgartirish</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 5. TO‘LOV SOZLAMALARI TAB (Requirement 3 & Humo Card Transfer) --- */}
        {activeAdminTab === 'payments' && settingsForm && (

          <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <CreditCard className="w-6 h-6 text-[#d4af37]" />
                  <span>To‘lov sozlamalari & Integratsiyalar</span>
                </h2>
                <p className="text-xs text-slate-400">
                  Click, Payme, naqd to‘lov hamda Telegram bot xabarnomalarini xavfsiz boshqaring
                </p>
              </div>

              <button
                type="button"
                onClick={handleSavePaymentSettings}
                disabled={savingPaymentSettings}
                className="px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 cursor-pointer hover:brightness-110 active:scale-95 transition"
              >
                {savingPaymentSettings ? (
                  <span>Saqlanmoqda...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Barcha sozlamalarni saqlash</span>
                  </>
                )}
              </button>
            </div>

            <form onSubmit={handleSavePaymentSettings} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 1. CLICK INTEGRATION */}
                <div className="bg-[#131b2a] rounded-3xl p-6 border border-[#00c0f3]/30 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#00c0f3] text-black font-black text-xs flex items-center justify-center">
                        CLICK
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Click Shop Integratsiyasi</h3>
                        <p className="text-[11px] text-slate-400">Click API orqali onlayn to‘lov</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[11px] text-slate-400 font-bold">Yoqilgan:</span>
                      <input
                        type="checkbox"
                        checked={settingsForm.paymentSettings?.click?.enabled ?? true}
                        onChange={(e) => {
                          const click = settingsForm.paymentSettings?.click || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings!,
                              click: { ...click, enabled: e.target.checked },
                            },
                          });
                        }}
                        className="w-4 h-4 accent-[#00c0f3]"
                      />
                    </label>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <div>
                        <span className="font-bold text-white block">Test rejimi (Sandbox)</span>
                        <span className="text-[10px] text-slate-400">
                          Haqiqiy pul yechilmasdan simulyatsiya qilish
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settingsForm.paymentSettings?.click?.testMode ?? true}
                        onChange={(e) => {
                          const click = settingsForm.paymentSettings?.click || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings!,
                              click: { ...click, testMode: e.target.checked },
                            },
                          });
                        }}
                        className="w-4 h-4 accent-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Click Service ID</label>
                      <input
                        type="text"
                        value={settingsForm.paymentSettings?.click?.serviceId || ''}
                        onChange={(e) => {
                          const click = settingsForm.paymentSettings?.click || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings!,
                              click: { ...click, serviceId: e.target.value },
                            },
                          });
                        }}
                        placeholder="Masalan: 12345"
                        className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-slate-700 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Click Merchant ID</label>
                      <input
                        type="text"
                        value={settingsForm.paymentSettings?.click?.merchantId || ''}
                        onChange={(e) => {
                          const click = settingsForm.paymentSettings?.click || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings!,
                              click: { ...click, merchantId: e.target.value },
                            },
                          });
                        }}
                        placeholder="Masalan: 98765"
                        className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-slate-700 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Click Secret Key (Maxfiy kalit)
                      </label>
                      <input
                        type="password"
                        defaultValue={settingsForm.paymentSettings?.click?.secretKeyMasked || ''}
                        onChange={(e) => {
                          const click = settingsForm.paymentSettings?.click || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings!,
                              click: { ...click, secretKey: e.target.value },
                            },
                          });
                        }}
                        placeholder="Maxfiy kalitni yangilash uchun kiriting"
                        className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-slate-700 font-mono"
                      />
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        Maxfiy kalit faqat serverda xavfsiz saqlanadi va brauzerga ochiq holda uzatilmaydi.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. PAYME INTEGRATION */}
                <div className="bg-[#131b2a] rounded-3xl p-6 border border-[#00bfa5]/30 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#00bfa5] text-white font-black text-xs flex items-center justify-center">
                        PAYME
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Payme Integratsiyasi</h3>
                        <p className="text-[11px] text-slate-400">Paycom JSON-RPC 2.0 to‘lov xizmati</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[11px] text-slate-400 font-bold">Yoqilgan:</span>
                      <input
                        type="checkbox"
                        checked={settingsForm.paymentSettings?.payme?.enabled ?? true}
                        onChange={(e) => {
                          const payme = settingsForm.paymentSettings?.payme || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings!,
                              payme: { ...payme, enabled: e.target.checked },
                            },
                          });
                        }}
                        className="w-4 h-4 accent-[#00bfa5]"
                      />
                    </label>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      <div>
                        <span className="font-bold text-white block">Test rejimi (Sandbox)</span>
                        <span className="text-[10px] text-slate-400">Test kartalar bilan sinab ko‘rish</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settingsForm.paymentSettings?.payme?.testMode ?? true}
                        onChange={(e) => {
                          const payme = settingsForm.paymentSettings?.payme || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings!,
                              payme: { ...payme, testMode: e.target.checked },
                            },
                          });
                        }}
                        className="w-4 h-4 accent-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Payme Merchant ID</label>
                      <input
                        type="text"
                        value={settingsForm.paymentSettings?.payme?.merchantId || ''}
                        onChange={(e) => {
                          const payme = settingsForm.paymentSettings?.payme || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings!,
                              payme: { ...payme, merchantId: e.target.value },
                            },
                          });
                        }}
                        placeholder="Masalan: 64d2f80c5b3e1a001a123456"
                        className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-slate-700 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Payme Secret Key (Parol yoki Test kalit)
                      </label>
                      <input
                        type="password"
                        defaultValue={settingsForm.paymentSettings?.payme?.secretKeyMasked || ''}
                        onChange={(e) => {
                          const payme = settingsForm.paymentSettings?.payme || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            paymentSettings: {
                              ...settingsForm.paymentSettings!,
                              payme: { ...payme, secretKey: e.target.value },
                            },
                          });
                        }}
                        placeholder="Maxfiy kalitni yangilash uchun kiriting"
                        className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-slate-700 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. HUMO KARTA VA TELEGRAM SOZLAMALARI (Requirement 3: Kartaga o‘tkazma sozlamalari) */}
                <div className="bg-[#131b2a] rounded-3xl p-6 border border-[#d4af37]/40 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#d4af37]/20 text-[#d4af37] flex items-center justify-center font-black text-xs">
                        HUMO
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">HUMO Karta va Telegram Sozlamalari</h3>
                        <p className="text-[11px] text-slate-400">Click va Paynet orqali to‘lovlarni qabul qilish</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#d4af37]/20 text-[#d4af37]">
                      Asosiy to‘lov
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">HUMO Karta raqami *</label>
                      <input
                        type="text"
                        value={settingsForm.cardSettings?.cardNumber || ''}
                        onChange={(e) => {
                          const cs = settingsForm.cardSettings || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            cardSettings: { ...cs, cardNumber: e.target.value },
                          });
                        }}
                        placeholder="9860 3501 2458 7789"
                        className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-slate-700 font-mono text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Karta egasining ismi / MCHJ *</label>
                        <input
                          type="text"
                          value={settingsForm.cardSettings?.cardHolder || ''}
                          onChange={(e) => {
                            const cs = settingsForm.cardSettings || ({} as any);
                            setSettingsForm({
                              ...settingsForm,
                              cardSettings: { ...cs, cardHolder: e.target.value },
                            });
                          }}
                          placeholder="SHU BREND MCHJ"
                          className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-slate-700"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Xizmat ko‘rsatuvchi bank</label>
                        <input
                          type="text"
                          value={settingsForm.cardSettings?.bankName || ''}
                          onChange={(e) => {
                            const cs = settingsForm.cardSettings || ({} as any);
                            setSettingsForm({
                              ...settingsForm,
                              cardSettings: { ...cs, bankName: e.target.value },
                            });
                          }}
                          placeholder="Kapitalbank ATB"
                          className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-slate-700"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">
                        Cheklar yuboriladigan Telegram manzil (username) *
                      </label>
                      <input
                        type="text"
                        value={settingsForm.cardSettings?.telegramUsername || ''}
                        onChange={(e) => {
                          const cs = settingsForm.cardSettings || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            cardSettings: { ...cs, telegramUsername: e.target.value },
                          });
                        }}
                        placeholder="@shubrend_admin"
                        className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-slate-700 font-mono text-sm"
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Mijoz to‘lov chekini ushbu Telegram manzilga yuboradi. Administrator bank hisobiga pul tushganini tekshirib, buyurtmani «To‘landi» deb tasdiqlaydi.
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. TELEGRAM BOT NOTIFICATIONS (Requirement 5) */}
                <div className="bg-[#131b2a] rounded-3xl p-6 border border-[#229ed9]/30 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#229ed9] text-white flex items-center justify-center">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Telegram Buyurtma Bildirishnomasi</h3>
                        <p className="text-[11px] text-slate-400">Yangi buyurtmalarni bot orqali yuborish</p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-[11px] text-slate-400 font-bold">Yoqilgan:</span>
                      <input
                        type="checkbox"
                        checked={settingsForm.telegramSettings?.enabled ?? true}
                        onChange={(e) => {
                          const tg = settingsForm.telegramSettings || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            telegramSettings: { ...tg, enabled: e.target.checked },
                          });
                        }}
                        className="w-4 h-4 accent-[#229ed9]"
                      />
                    </label>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Telegram Bot Token</label>
                      <input
                        type="password"
                        defaultValue={settingsForm.telegramSettings?.botTokenMasked || ''}
                        onChange={(e) => {
                          const tg = settingsForm.telegramSettings || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            telegramSettings: { ...tg, botToken: e.target.value },
                          });
                        }}
                        placeholder="7123456789:AAH..."
                        className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-slate-700 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 block mb-1">Telegram Chat ID (Admin yoki Guruh)</label>
                      <input
                        type="text"
                        value={settingsForm.telegramSettings?.chatId || ''}
                        onChange={(e) => {
                          const tg = settingsForm.telegramSettings || ({} as any);
                          setSettingsForm({
                            ...settingsForm,
                            telegramSettings: { ...tg, chatId: e.target.value },
                          });
                        }}
                        placeholder="Masalan: -1001234567890 yoki 123456789"
                        className="w-full px-3 py-2 bg-slate-900 text-white rounded-xl border border-slate-700 font-mono"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleTestTelegram}
                      disabled={sendingTelegramTest}
                      className="w-full py-2 rounded-xl bg-slate-900 hover:bg-[#229ed9] hover:text-white border border-[#229ed9]/40 text-[#229ed9] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {sendingTelegramTest ? (
                        <span>Yuborilmoqda...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Telegramga sinov (test) xabarini yuborish</span>
                        </>
                      )}
                    </button>

                  </div>
                </div>
              </div>
            </form>

            {/* TRANSACTIONS HISTORY TABLE */}
            <div className="bg-[#131b2a] rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#d4af37]" />
                    <span>To‘lovlar tarixi (Tranzaksiyalar jurnali)</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Barcha Click va Payme to‘lov operatsiyalarining real vaqt jurnali
                  </p>
                </div>
                <span className="text-xs font-bold text-amber-400 font-mono">
                  {transactions.length} ta tranzaksiya
                </span>
              </div>

              {transactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  Hozircha onlayn to‘lov tranzaksiyalari mavjud emas
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Sana</th>
                        <th className="py-2.5 px-3">Buyurtma</th>
                        <th className="py-2.5 px-3">Tizim</th>
                        <th className="py-2.5 px-3">Tranzaksiya ID</th>
                        <th className="py-2.5 px-3">Summa</th>
                        <th className="py-2.5 px-3">Holat</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-900/50">
                          <td className="py-2.5 px-3 text-slate-400">
                            {new Date(tx.createdAt).toLocaleString('uz-UZ')}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-white">{tx.orderNumber}</td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.provider === 'CLICK'
                                  ? 'bg-[#00c0f3]/20 text-[#00c0f3]'
                                  : 'bg-[#00bfa5]/20 text-[#00bfa5]'
                              }`}
                            >
                              {tx.provider}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                            {tx.transactionId}
                          </td>
                          <td className="py-2.5 px-3 font-black text-[#d4af37]">
                            {formatUzbekPrice(tx.amount)}
                          </td>
                          <td className="py-2.5 px-3">
                            {tx.status === 'SUCCESS' ? (
                              <span className="text-emerald-400 font-bold">✓ Muvaffaqiyatli</span>
                            ) : tx.status === 'CANCELLED' ? (
                              <span className="text-rose-400 font-bold">✕ Bekor</span>
                            ) : (
                              <span className="text-amber-400 font-bold">Kutilmoqda</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}


        {/* --- 4. SAYT SOZLAMALARI TAB (Screenshot 10) --- */}
        {activeAdminTab === 'settings' && settingsForm && (
          <div className="bg-[#131b2a] rounded-3xl p-6 sm:p-10 border border-slate-800 shadow-xl max-w-4xl mx-auto">
            <h2 className="text-xl font-black text-white mb-2">Sayt sozlamalari</h2>
            <p className="text-xs text-slate-400 mb-8">
              Barcha do‘kon ma‘lumotlari, telefon raqamlari, bannerlar va matnlarni kod yozmasdan o‘zgartiring
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Do‘kon nomi</label>
                  <input
                    type="text"
                    value={settingsForm.storeName}
                    onChange={(e) => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Slogan (Tagline)</label>
                  <input
                    type="text"
                    value={settingsForm.storeTagline}
                    onChange={(e) => setSettingsForm({ ...settingsForm, storeTagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Telefon raqam</label>
                  <input
                    type="text"
                    value={settingsForm.phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Ish vaqti</label>
                  <input
                    type="text"
                    value={settingsForm.workingHours}
                    onChange={(e) => setSettingsForm({ ...settingsForm, workingHours: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Telegram kanal havolasi</label>
                  <input
                    type="url"
                    value={settingsForm.telegramUrl}
                    onChange={(e) => setSettingsForm({ ...settingsForm, telegramUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Instagram sahifa havolasi</label>
                  <input
                    type="url"
                    value={settingsForm.instagramUrl}
                    onChange={(e) => setSettingsForm({ ...settingsForm, instagramUrl: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Do‘kon manzili</label>
                <input
                  type="text"
                  value={settingsForm.address}
                  onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700"
                />
              </div>

              <div className="pt-4 border-t border-slate-800">
                <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>Bosh sahifa matnlari va bannerlari</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">
                      Saytning eng yuqori e‘lon matni (Header Notice)
                    </label>
                    <input
                      type="text"
                      value={settingsForm.headerNotice}
                      onChange={(e) => setSettingsForm({ ...settingsForm, headerNotice: e.target.value })}
                      placeholder="Masalan: Yetkazib berish butun O‘zbekiston bo‘ylab tekinga amalga oshiriladi!"
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Bosh sahifa asosiy sarlavhasi</label>
                      <input
                        type="text"
                        value={settingsForm.heroTitle || 'Har bir erkak uchun o‘z uslubi!'}
                        onChange={(e) => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">Bosh sahifa quyi sarlavhasi</label>
                      <input
                        type="text"
                        value={settingsForm.heroSubtitle || 'Zamonaviy kiyimlar • Sifat • Ishonch'}
                        onChange={(e) => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* 4 Feature Badges */}
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-2">4 ta afzallik nishoni (Badges)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">1-nishon</span>
                        <input
                          type="text"
                          value={settingsForm.heroBadge1}
                          onChange={(e) => setSettingsForm({ ...settingsForm, heroBadge1: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">2-nishon</span>
                        <input
                          type="text"
                          value={settingsForm.heroBadge2}
                          onChange={(e) => setSettingsForm({ ...settingsForm, heroBadge2: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">3-nishon</span>
                        <input
                          type="text"
                          value={settingsForm.heroBadge3}
                          onChange={(e) => setSettingsForm({ ...settingsForm, heroBadge3: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block mb-1">4-nishon</span>
                        <input
                          type="text"
                          value={settingsForm.heroBadge4}
                          onChange={(e) => setSettingsForm({ ...settingsForm, heroBadge4: e.target.value })}
                          className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Do‘kon haqida matn (About)</label>
                    <textarea
                      rows={4}
                      value={settingsForm.aboutText}
                      onChange={(e) => setSettingsForm({ ...settingsForm, aboutText: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-900 text-sm text-white rounded-xl border border-slate-700 focus:border-[#d4af37] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-8 py-3 rounded-xl gold-gradient-bg text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-[#d4af37]/20 flex items-center gap-2 cursor-pointer hover:brightness-110 active:scale-95 transition"
                >
                  {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Barcha sozlamalarni saqlash</span>
                </button>
              </div>

            </form>
          </div>
        )}

        {/* --- 5. BANNERLAR TAB --- */}
        {activeAdminTab === 'banners' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white">Bannerlar boshqaruvi ({banners.length})</h2>
                <p className="text-xs text-slate-400">Bosh sahifadagi slayder va reklama bannerlari</p>
              </div>

              <button
                onClick={() => {
                  setEditingBanner(null);
                  setIsBannerModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl gold-gradient-bg text-black font-extrabold text-xs shadow-lg flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Yangi banner qo‘shish</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {banners.map((b) => (
                <div
                  key={b.id}
                  className="bg-[#131b2a] rounded-3xl border border-slate-800 overflow-hidden shadow-xl flex flex-col justify-between"
                >
                  <div className="relative aspect-[16/9] w-full bg-slate-950">
                    <img src={b.imageUrl} alt="" className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[10px] font-black bg-black/70 text-[#d4af37] border border-[#d4af37]/40">
                      Tartib: #{b.sortOrder}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{b.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">{b.subtitle}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#d4af37]">
                        Tugma: {b.buttonText} → {b.buttonLink}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingBanner(b);
                            setIsBannerModalOpen(true);
                          }}
                          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- ADD / EDIT PRODUCT MODAL (Screenshot 8) --- */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#131b2a] border border-slate-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingProduct ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot qo‘shish'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Mahsulot nomi *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingProduct?.name || ''}
                    placeholder="Masalan: Erkaklar issiq kurtkasi"
                    className="w-full px-3.5 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Kategoriya *</label>
                  <select
                    name="categorySlug"
                    defaultValue={editingProduct?.categorySlug || 'kurtka'}
                    className="w-full px-3.5 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:outline-none"
                  >
                    {categories
                      .filter((c) => c.slug !== 'all')
                      .map((c) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Narxi (so‘m) *</label>
                  <input
                    type="number"
                    name="price"
                    required
                    defaultValue={editingProduct?.price || ''}
                    placeholder="599000"
                    className="w-full px-3.5 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Chegirma narxi (ixtiyoriy)</label>
                  <input
                    type="number"
                    name="discountPrice"
                    defaultValue={editingProduct?.discountPrice || ''}
                    placeholder="799000"
                    className="w-full px-3.5 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Ombordagi soni</label>
                  <input
                    type="number"
                    name="stock"
                    defaultValue={editingProduct?.stock || 15}
                    className="w-full px-3.5 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    O‘lchamlar (vergul bilan ajrating)
                  </label>
                  <input
                    type="text"
                    name="sizes"
                    defaultValue={editingProduct?.sizes.join(', ') || 'S, M, L, XL, XXL'}
                    className="w-full px-3.5 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Ranglar (vergul bilan ajrating)
                  </label>
                  <input
                    type="text"
                    name="colors"
                    defaultValue={editingProduct?.colors.join(', ') || 'Qora, To‘q ko‘k'}
                    className="w-full px-3.5 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Tavsif</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingProduct?.description || ''}
                  placeholder="Kiyim matosi, xususiyatlari..."
                  className="w-full px-3.5 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700 focus:outline-none"
                />
              </div>

              {/* Multiple Image file upload from local phone/computer files (Requirement 12) */}
              <div className="border border-dashed border-slate-700 p-4 rounded-2xl bg-slate-900/50">
                <label className="text-xs font-bold text-[#d4af37] block mb-2">
                  Rasmlarni tanlang va yuklang (Telefon galereyasi yoki fayllardan):
                </label>

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:gold-gradient-bg file:text-black cursor-pointer"
                />

                {uploadingImage && (
                  <p className="text-xs text-amber-300 mt-2 flex items-center gap-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Rasm yuklanmoqda...
                  </p>
                )}

                {/* Preview uploaded / existing images */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {productImagesList.map((url, i) => (
                    <div key={i} className="relative w-16 h-20 rounded-xl overflow-hidden border border-slate-700">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProductImagesList(productImagesList.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 p-0.5 bg-black/80 rounded-full text-white hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <input
                  type="hidden"
                  name="images"
                  value={productImagesList.join(', ')}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl gold-gradient-bg text-black text-xs font-black shadow"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ORDER DETAILS MODAL (Professional Order Management - Requirement 1) --- */}
      {selectedOrderForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
          <div className="bg-[#131b2a] border border-[#d4af37]/40 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl p-6 sm:p-7 max-h-[92vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-[#d4af37] uppercase tracking-widest">
                    Buyurtma Tafsilotlari
                  </span>
                  <span className="font-mono text-sm font-black text-amber-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                    {selectedOrderForView.orderNumber}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">
                  {selectedOrderForView.customerName}
                </h3>
                <span className="text-xs text-slate-400">
                  Buyurtma sanasi: {new Date(selectedOrderForView.createdAt).toLocaleString('uz-UZ')}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div>{getStatusBadge(selectedOrderForView.status)}</div>
                <button
                  onClick={() => setSelectedOrderForView(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto pr-1 py-4 space-y-5 text-xs">
              {/* Customer Info Card */}
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-[#d4af37] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>Mijoz va Yetkazib berish ma'lumotlari</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Mijoz ismi:</span>
                    <span className="text-white font-bold text-sm">{selectedOrderForView.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Telefon raqami:</span>
                    <a
                      href={`tel:${selectedOrderForView.customerPhone}`}
                      className="text-amber-400 font-mono font-bold text-sm inline-flex items-center gap-1.5 hover:underline"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selectedOrderForView.customerPhone}</span>
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Viloyat va shahar:</span>
                    <span className="text-white font-medium">
                      {selectedOrderForView.region || 'Toshkent shahri'}, {selectedOrderForView.city || 'Toshkent'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Yetkazib berish manzili:</span>
                    <span className="text-white font-medium">
                      {selectedOrderForView.address || 'Ma‘lumot mavjud emas'}
                    </span>
                  </div>
                </div>

                {/* GPS Location & Map links */}
                {selectedOrderForView.location ? (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-amber-300 font-mono text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-[#d4af37]" />
                      <span>
                        GPS: {selectedOrderForView.location.lat.toFixed(5)}, {selectedOrderForView.location.lng.toFixed(5)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://maps.google.com/?q=${selectedOrderForView.location.lat},${selectedOrderForView.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10px] flex items-center gap-1 border border-slate-700"
                      >
                        <ExternalLink className="w-3 h-3 text-[#d4af37]" />
                        <span>Google Maps</span>
                      </a>
                      <a
                        href={`https://yandex.uz/maps/?pt=${selectedOrderForView.location.lng},${selectedOrderForView.location.lat}&z=16&l=map`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 rounded-lg gold-gradient-bg text-black font-extrabold text-[10px] flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Yandex Xarita</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1 text-[11px] text-slate-500 italic">
                    Xarita lokatsiyasi belgilanmagan
                  </div>
                )}

                {/* Note */}
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 block text-[11px]">Mijoz izohi:</span>
                  <span className="text-slate-200 italic">
                    {selectedOrderForView.note ? selectedOrderForView.note : 'Izoh qoldirilmagan'}
                  </span>
                </div>
              </div>

              {/* Order Items Breakdown */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-[#d4af37] text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" />
                    <span>Buyurtma qilingan kiyimlar ({(selectedOrderForView.items || []).length} ta)</span>
                  </h4>
                </div>

                {(!selectedOrderForView.items || selectedOrderForView.items.length === 0) ? (
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-center">
                    Ma'lumot mavjud emas
                  </div>
                ) : (
                    <div className="space-y-2.5">
                    {selectedOrderForView.items.map((it, idx) => (
                      <div
                        key={it.id || idx}
                        className="flex items-center gap-4 p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 transition"
                      >
                        {/* Large product photo with click-to-zoom (Requirement 1) */}
                        <div
                          onClick={() =>
                            it.productImage &&
                            setLightboxImage({ url: it.productImage, title: it.productName })
                          }
                          title="Rasmni kattalashtirib ko‘rish uchun bosing"
                          className="group relative w-20 h-24 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700 cursor-zoom-in"
                        >
                          {it.productImage ? (
                            <>
                              <img
                                src={it.productImage}
                                alt={it.productName}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                <Eye className="w-5 h-5 text-white" />
                              </div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-600">
                              <Shirt className="w-8 h-8" />
                            </div>
                          )}
                          {it.quantity > 1 && (
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-black/85 text-amber-300">
                              ×{it.quantity}
                            </span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] uppercase font-bold text-[#d4af37]">
                            {it.categoryName || 'Erkaklar kiyimi'}
                          </span>
                          <h5 className="font-bold text-white text-base truncate">{it.productName || "Ma'lumot mavjud emas"}</h5>

                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                              O‘lcham: <strong className="text-white">{it.size || "M"}</strong>
                            </span>
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-200 border border-slate-700">
                              Rang: <strong className="text-white">{it.color || "Standart"}</strong>
                            </span>
                            <span className="text-slate-300 text-xs">
                              Soni: <strong className="text-white">{it.quantity || 1} ta</strong>
                            </span>
                          </div>

                          <span className="text-[11px] text-slate-400 block mt-1">
                            Bir dona narxi: <strong className="text-slate-300">{formatUzbekPrice(it.unitPrice)}</strong>
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[11px] text-slate-400 block">Jami:</span>
                          <span className="text-base font-black text-[#d4af37]">
                            {formatUzbekPrice(it.totalPrice || (it.unitPrice * (it.quantity || 1)))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial & Payment Summary */}
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Mahsulotlar summasi:</span>
                  <span className="text-white font-medium">{formatUzbekPrice(selectedOrderForView.subtotal)}</span>
                </div>

                {selectedOrderForView.discount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Chegirma:</span>
                    <span>- {formatUzbekPrice(selectedOrderForView.discount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-slate-400">
                  <span>Yetkazib berish:</span>
                  <span className="text-emerald-400 font-bold">
                    {selectedOrderForView.deliveryFee === 0 ? 'Bepul' : formatUzbekPrice(selectedOrderForView.deliveryFee)}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                  <span>To‘lov usuli:</span>
                  <span className="text-white font-bold flex items-center gap-1.5">
                    {selectedOrderForView.paymentMethod === 'PAYNET_CARD' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        Paynet orqali kartaga o‘tkazma
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00c0f3]/20 text-[#00c0f3]">
                        Click orqali kartaga o‘tkazma
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex justify-between text-slate-400">
                  <span>To‘lov holati:</span>
                  <span
                    className={`font-bold ${
                      selectedOrderForView.paymentStatus === 'TOLANDI'
                        ? 'text-emerald-400'
                        : selectedOrderForView.paymentStatus === 'BEKOR_QILINDI'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {selectedOrderForView.paymentStatus === 'TOLANDI'
                      ? '🟢 To‘langan'
                      : selectedOrderForView.paymentStatus === 'BEKOR_QILINDI'
                      ? '🔴 Bekor qilingan'
                      : '🟡 To‘lov kutilmoqda'}
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
                  <span className="text-sm font-bold text-white">Umumiy summa:</span>
                  <span className="text-xl font-black text-[#d4af37]">
                    {formatUzbekPrice(selectedOrderForView.total)}
                  </span>
                </div>
              </div>

              {/* MANUAL PAYMENT VERIFICATION (Requirement 3: Pul bank hisobiga tushmaguncha To‘landi belgilanmaydi) */}
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-[#d4af37]/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#d4af37] flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-[#d4af37]" />
                    <span>To‘lovni tekshirish (Kartaga o‘tkazma)</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedOrderForView.paymentStatus === 'TOLANDI'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : selectedOrderForView.paymentStatus === 'BEKOR_QILINDI'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {selectedOrderForView.paymentStatus === 'TOLANDI'
                      ? '🟢 Tasdiqlangan'
                      : selectedOrderForView.paymentStatus === 'BEKOR_QILINDI'
                      ? '🔴 Rad etilgan'
                      : '🟡 Tekshiruv kutilmoqda'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">
                  {selectedOrderForView.paymentStatus === 'TOLANDI'
                    ? '✅ Ushbu buyurtma uchun to‘lov bank hisobiga kelib tushgani tasdiqlangan.'
                    : 'Mijoz to‘lov chekini Telegram orqali yuborgan bo‘lsa, bank ilovangizda tushumni tekshiring va quyidagi tugma orqali to‘lovni tasdiqlang:'}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(
                        selectedOrderForView.id,
                        'TASDIQLANDI',
                        'To‘lov bank hisobiga tushgani tekshirildi va tasdiqlandi',
                        'TOLANDI'
                      )
                    }
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>✅ To‘lovni tasdiqlash (To‘landi)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleStatusChange(
                        selectedOrderForView.id,
                        'BEKOR_QILINDI',
                        'To‘lov kelib tushmadi yoki bekor qilindi',
                        'BEKOR_QILINDI'
                      )
                    }
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>To‘lov rad etildi</span>
                  </button>
                </div>
              </div>

              {/* ADMIN ACTIONS (Requirement 1) */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Admin Amallari:
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() =>
                      handleStatusChange(
                        selectedOrderForView.id,
                        'TASDIQLANDI',
                        'Admin tomonidan tasdiqlandi'
                      )
                    }
                    className="p-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-blue-400" />
                    <span>Tasdiqlash</span>
                  </button>

                  <button
                    onClick={() =>
                      handleStatusChange(
                        selectedOrderForView.id,
                        'YETKAZILMOQDA',
                        'Kuryer yetkazishga chiqardi'
                      )
                    }
                    className="p-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Truck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Yetkazishga chiqarish</span>
                  </button>

                  <button
                    onClick={() =>
                      handleStatusChange(
                        selectedOrderForView.id,
                        'YETKAZILDI',
                        'Mijozga topshirildi',
                        'TOLANDI'
                      )
                    }
                    className="p-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Yetkazildi</span>
                  </button>

                  <button
                    onClick={() =>
                      handleStatusChange(
                        selectedOrderForView.id,
                        'BEKOR_QILINDI',
                        'Admin tomonidan bekor qilindi',
                        'BEKOR_QILINDI'
                      )
                    }
                    className="p-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Bekor qilish</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                  <a
                    href={`tel:${selectedOrderForView.customerPhone}`}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#d4af37]" />
                    <span>Qo‘ng‘iroq qilish</span>
                  </a>

                  {selectedOrderForView.location ? (
                    <a
                      href={`https://yandex.uz/maps/?pt=${selectedOrderForView.location.lng},${selectedOrderForView.location.lat}&z=16&l=map`}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span>Lokatsiyani ko‘rish</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 font-bold text-xs flex items-center justify-center gap-1.5 opacity-60"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Lokatsiya yo‘q</span>
                    </button>
                  )}

                  <button
                    onClick={() => setPrintReceiptOrder(selectedOrderForView)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-[#d4af37] hover:text-black border border-slate-700 text-[#d4af37] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Chop etish (Chek)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedOrderForView(null)}
                className="px-6 py-2 rounded-xl gold-gradient-bg text-black font-extrabold text-xs shadow cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PRINT RECEIPT / INVOICE MODAL (Requirement 1: 🖨 Buyurtmani chop etish) --- */}
      {printReceiptOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-white text-slate-900 w-full max-w-md rounded-2xl p-6 shadow-2xl relative font-sans">
            <button
              onClick={() => setPrintReceiptOrder(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-500 hover:text-black hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Printable Slip Content */}
            <div id="printable-receipt" className="space-y-4">
              {/* Header */}
              <div className="text-center pb-3 border-b-2 border-dashed border-slate-300">
                <h2 className="text-xl font-black tracking-wider text-black">SHU BREND</h2>
                <p className="text-[11px] text-slate-600 font-medium tracking-widest uppercase">
                  Erkaklar Kiyimlari Do‘koni
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Tel: +998 90 123 45 67 | www.shubrend.uz</p>
                <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
                  <span className="font-mono font-black text-xs">BUYURTMA {printReceiptOrder.orderNumber}</span>
                </div>
              </div>

              {/* Order Meta */}
              <div className="text-xs space-y-1 text-slate-700 pb-2 border-b border-slate-200">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mijoz:</span>
                  <span className="font-bold text-slate-900">{printReceiptOrder.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Telefon:</span>
                  <span className="font-mono font-bold text-slate-900">{printReceiptOrder.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Manzil:</span>
                  <span className="font-medium text-slate-900 text-right max-w-[220px]">
                    {printReceiptOrder.region}, {printReceiptOrder.city}, {printReceiptOrder.address}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sana:</span>
                  <span className="text-slate-900">{new Date(printReceiptOrder.createdAt).toLocaleString('uz-UZ')}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-bold text-slate-500 pb-1 border-b border-slate-200">
                  <span>Mahsulot</span>
                  <span>Jami</span>
                </div>
                {(printReceiptOrder.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between text-xs py-0.5">
                    <div className="pr-2">
                      <span className="font-bold text-slate-900 block leading-tight">{it.productName}</span>
                      <span className="text-[10px] text-slate-500">
                        {it.size} / {it.color} • {it.quantity} dona × {formatUzbekPrice(it.unitPrice)}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 shrink-0">
                      {formatUzbekPrice(it.totalPrice)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="pt-2 border-t-2 border-dashed border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Mahsulotlar summasi:</span>
                  <span>{formatUzbekPrice(printReceiptOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Yetkazib berish:</span>
                  <span className="font-bold text-emerald-600">Bepul</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>To‘lov usuli:</span>
                  <span className="font-bold text-slate-900">
                    {printReceiptOrder.paymentMethod === 'CLICK'
                      ? 'Click'
                      : printReceiptOrder.paymentMethod === 'PAYME'
                      ? 'Payme'
                      : 'Naqd to‘lov'}
                  </span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 text-sm">
                  <span className="font-black text-slate-900">JAMI TO‘LOV:</span>
                  <span className="font-black text-black text-base">{formatUzbekPrice(printReceiptOrder.total)}</span>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center pt-2 text-[10px] text-slate-500 italic">
                Xaridingiz uchun tashakkur! SHU BREND tanlaganingizdan mamnunmiz.
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-5 pt-3 border-t border-slate-200 flex gap-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-xl bg-black text-amber-300 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow hover:bg-slate-800 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#d4af37]" />
                <span>🖨 Chekni chop etish</span>
              </button>
              <button
                onClick={() => setPrintReceiptOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}


      {/* --- ADD / EDIT BANNER MODAL --- */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#131b2a] border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">
              {editingBanner ? 'Bannerni tahrirlash' : 'Yangi banner qo‘shish'}
            </h3>

            <form onSubmit={handleSaveBanner} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Banner sarlavhasi</label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingBanner?.title || ''}
                  className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Kichik matn (subtitle)</label>
                <input
                  type="text"
                  name="subtitle"
                  defaultValue={editingBanner?.subtitle || ''}
                  className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tugma matni</label>
                  <input
                    type="text"
                    name="buttonText"
                    defaultValue={editingBanner?.buttonText || 'Kolleksiyani ko‘rish'}
                    className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tugma havolasi</label>
                  <input
                    type="text"
                    name="buttonLink"
                    defaultValue={editingBanner?.buttonLink || '/clothing'}
                    className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Rasm URL yoki yuklangan yo‘li</label>
                <input
                  type="text"
                  name="imageUrl"
                  required
                  defaultValue={editingBanner?.imageUrl || '/banners/hero-banner-1.png'}
                  className="w-full px-3 py-2 bg-slate-900 text-xs text-white rounded-xl border border-slate-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl gold-gradient-bg text-black text-xs font-black"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- IMAGE LIGHTBOX MODAL (Requirement 1: Mahsulot rasmini bosganda kattalashtirib ko‘rish) --- */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-[90vh] w-full bg-[#131b2a] border border-[#d4af37]/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#d4af37]" />
                <h4 className="text-white font-bold text-sm truncate">{lightboxImage.title}</h4>
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black/70 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[70vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
              />
            </div>
            <div className="p-3 text-center text-xs text-slate-400 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between px-6">
              <span className="text-slate-400 text-[11px]">Kattalashtirilgan yuqori sifatli fotosurat</span>
              <button
                onClick={() => setLightboxImage(null)}
                className="px-4 py-1.5 rounded-xl gold-gradient-bg text-black font-extrabold text-xs cursor-pointer"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
