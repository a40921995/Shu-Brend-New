import React from 'react';
import { Home, LayoutGrid, Heart, ShoppingBag, User } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export const MobileBottomNav: React.FC = () => {
  const { activeTab, setActiveTab, cartCount, favorites } = useApp();

  const navItems = [
    { id: 'home', label: 'Bosh sahifa', icon: Home },
    { id: 'clothing', label: 'Kiyimlar', icon: LayoutGrid },
    { id: 'favorites', label: 'Yoqtirilgan', icon: Heart, count: favorites.length },
    { id: 'cart', label: 'Savat', icon: ShoppingBag, count: cartCount },
    { id: 'profile', label: 'Profil', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f17]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-1.5 pb-safe shadow-2xl">
      <div className="grid grid-cols-5 items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 relative transition-all duration-200 cursor-pointer ${
                isActive ? 'text-[#d4af37]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />
                {typeof item.count === 'number' && item.count > 0 && (
                  <span
                    className={`absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 text-[10px] font-black rounded-full flex items-center justify-center text-black shadow ${
                      item.id === 'favorites' ? 'bg-rose-500 text-white' : 'bg-[#d4af37]'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 font-medium ${
                  isActive ? 'text-[#d4af37] font-bold' : 'text-slate-400'
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-[#d4af37] mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
