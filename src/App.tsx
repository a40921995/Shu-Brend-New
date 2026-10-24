import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Header } from './components/Header.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { Footer } from './components/Footer.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ClothingPage } from './pages/ClothingPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { FavoritesPage } from './pages/FavoritesPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { AdminDashboardPage } from './pages/AdminDashboardPage.tsx';
import { TelegramAdminPage } from './pages/TelegramAdminPage.tsx';
import { AdminLoginModal } from './components/AdminLoginModal.tsx';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab, isAdminLoginModalOpen, setIsAdminLoginModalOpen } = useApp();

  // Route detection on mount for /telegram-admin or direct URLs
  useEffect(() => {
    const handleUrl = () => {
      const pathname = window.location.pathname;
      if (pathname === '/telegram-admin' || pathname.startsWith('/telegram-admin')) {
        setActiveTab('telegram-admin');
      }
    };
    handleUrl();
    window.addEventListener('popstate', handleUrl);
    return () => window.removeEventListener('popstate', handleUrl);
  }, [setActiveTab]);

  // Scroll to top on tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f17] text-slate-100">
      {activeTab !== 'telegram-admin' && <Header />}

      <main className="flex-1">
        {activeTab === 'home' && <HomePage />}
        {activeTab === 'clothing' && <ClothingPage />}
        {activeTab === 'product_detail' && <ProductDetailPage />}
        {activeTab === 'cart' && <CartPage />}
        {activeTab === 'favorites' && <FavoritesPage />}
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'admin' && <AdminDashboardPage />}
        {activeTab === 'telegram-admin' && <TelegramAdminPage />}
      </main>

      {/* Hide footer in admin or telegram-admin mode */}
      {activeTab !== 'admin' && activeTab !== 'telegram-admin' && <Footer />}

      {/* Mobile Bottom Navigation Bar (Visible only on mobile screens when not in telegram-admin) */}
      {activeTab !== 'telegram-admin' && <MobileBottomNav />}

      {/* Global Admin Login Modal */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
