import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.ts';
import type { CartItem, Product, SiteSettings, User } from '../types/index.ts';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedProductId: string | null;
  openProductDetail: (id: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;

  // Cart
  cart: CartItem[];
  addToCart: (product: Product, size: string, color: string, quantity?: number) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;

  // Favorites
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;

  // User & Auth
  user: User | null;
  login: (phone: string, pass: string) => Promise<boolean>;
  adminLogin: (usernameOrPhone: string, pass: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: Partial<User>) => Promise<void>;
  isAdminLoginModalOpen: boolean;
  setIsAdminLoginModalOpen: (open: boolean) => void;

  // Settings
  settings: SiteSettings | null;
  refreshSettings: () => Promise<void>;

  // Toast
  toasts: Toast[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // Cart state persisted in localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('shubrend_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Favorites persisted in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('shubrend_favorites');
      return saved ? JSON.parse(saved) : ['prod_1', 'prod_2'];
    } catch {
      return ['prod_1', 'prod_2'];
    }
  });

  // User
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('shubrend_user');
      return saved
        ? JSON.parse(saved)
        : {
            id: 'usr_abdulaziz',
            name: 'Abdulaziz',
            phone: '+998 90 123 45 67',
            email: 'abdulaziz@gmail.com',
            role: 'CUSTOMER',
            region: 'Toshkent viloyati',
            city: 'Toshkent',
            address: 'Yunusobod tumani, 5-mavze, 14-uy',
            location: { lat: 41.3533, lng: 69.2872, address: 'Yunusobod tumani, 5-mavze' },
            createdAt: '2025-01-10T00:00:00Z',
          };
    } catch {
      return null;
    }
  });

  // Settings
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem('shubrend_cart', JSON.stringify(cart));
    } catch (e) {
      console.error(e);
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem('shubrend_favorites', JSON.stringify(favorites));
    } catch (e) {
      console.error(e);
    }
  }, [favorites]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('shubrend_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('shubrend_user');
    }
  }, [user]);

  const loadSettings = async () => {
    try {
      const s = await api.getSettings();
      setSettings(s);
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const openProductDetail = (id: string) => {
    setSelectedProductId(id);
    setActiveTab('product_detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addToCart = (product: Product, size: string, color: string, quantity = 1) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.productId === product.id && item.size === size && item.color === color
      );
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].quantity += quantity;
        return next;
      } else {
        const newItem: CartItem = {
          id: 'cart_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          productId: product.id,
          product,
          size,
          color,
          quantity,
          unitPrice: product.price,
        };
        return [...prev, newItem];
      }
    });
    showToast(`"${product.name}" savatga qo‘shildi!`, 'success');
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== cartItemId));
    showToast('Mahsulot savatdan olib tashlandi', 'info');
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const toggleFavorite = (productId: string) => {
    setFavorites((prev) => {
      if (prev.includes(productId)) {
        showToast('Yoqtirilganlardan olib tashlandi', 'info');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Yoqtirilganlarga qo‘shildi ❤️', 'success');
        return [...prev, productId];
      }
    });
  };

  const isFavorite = (productId: string) => favorites.includes(productId);

  const login = async (phone: string, pass: string) => {
    try {
      const res = await api.login(phone, pass);
      setUser(res.user);
      showToast(`Xush kelibsiz, ${res.user.name}!`, 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Login qilishda xatolik', 'error');
      return false;
    }
  };

  const adminLogin = async (usernameOrPhone: string, pass: string) => {
    try {
      const res = await api.adminLogin(usernameOrPhone, pass);
      setUser(res.user);
      setIsAdminLoginModalOpen(false);
      setActiveTab('admin');
      showToast(`Xush kelibsiz, Boshqaruvchi ${res.user.name}! 👑`, 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Admin login yoki parol noto‘g‘ri', 'error');
      return false;
    }
  };

  const register = async (data: any) => {
    try {
      const res = await api.register(data);
      setUser(res.user);
      showToast('Muvaffaqiyatli ro‘yxatdan o‘tdingiz!', 'success');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Ro‘yxatdan o‘tishda xatolik', 'error');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    showToast('Tizimdan chiqildi', 'info');
    setActiveTab('home');
  };

  const updateUser = async (data: Partial<User>) => {
    if (!user) return;
    try {
      const updated = await api.updateProfile({ ...user, ...data });
      setUser(updated);
      showToast('Ma‘lumotlar muvaffaqiyatli saqlandi', 'success');
    } catch (err: any) {
      showToast(err.message || 'Saqlashda xatolik', 'error');
    }
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedProductId,
        openProductDetail,
        selectedCategory,
        setSelectedCategory,
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        cartCount,
        favorites,
        toggleFavorite,
        isFavorite,
        user,
        login,
        adminLogin,
        register,
        logout,
        updateUser,
        isAdminLoginModalOpen,
        setIsAdminLoginModalOpen,
        settings,
        refreshSettings: loadSettings,
        toasts,
        showToast,
      }}
    >
      {children}
      {/* Toast notifications container */}
      <div className="fixed bottom-20 md:bottom-6 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between text-sm font-medium border transition-all animate-bounce-short ${
              t.type === 'success'
                ? 'bg-slate-900/95 text-amber-300 border-amber-500/40 shadow-amber-900/20'
                : t.type === 'error'
                ? 'bg-rose-950/95 text-rose-200 border-rose-500/40'
                : 'bg-slate-800/95 text-slate-200 border-slate-700'
            }`}
          >
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
