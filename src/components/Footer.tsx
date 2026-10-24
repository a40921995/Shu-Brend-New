import React from 'react';
import { Crown, Phone, MapPin, Clock, Send, Instagram, ShieldCheck, Heart } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

export const Footer: React.FC = () => {
  const { setActiveTab, setSelectedCategory, settings } = useApp();

  return (
    <footer className="bg-[#070b12] border-t border-slate-800/80 text-slate-400 pt-16 pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div
              onClick={() => setActiveTab('home')}
              className="flex items-center gap-3 cursor-pointer group select-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#735400] p-[1.5px] shadow-lg shadow-[#d4af37]/20">
                <div className="w-full h-full bg-[#0b0f17] rounded-[9px] flex items-center justify-center">
                  <Crown className="w-5 h-5 text-[#d4af37]" />
                </div>
              </div>
              <span className="font-brand text-2xl font-black tracking-widest text-white">
                {settings?.storeName || 'SHU BREND'}
              </span>
            </div>

            <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
              {settings?.storeTagline || 'Sifat • Stil • Erkaklar uchun'}. Erkak kishining obro‘si va
              o‘ziga bo‘lgan ishonchini oshiruvchi oliy toifadagi zamonaviy kiyimlar brendi.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <a
                href={settings?.telegramUrl || 'https://t.me/shubrend'}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-[#229ED9] text-[#229ED9] flex items-center justify-center transition"
                title="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href={settings?.instagramUrl || 'https://instagram.com/shubrend'}
                target="_blank"
                rel="noreferrer"
                className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500 text-rose-400 flex items-center justify-center transition"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Sahifalar */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Bo‘limlar
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={() => setActiveTab('home')}
                  className="hover:text-white transition cursor-pointer"
                >
                  Bosh sahifa
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('clothing')}
                  className="hover:text-white transition cursor-pointer"
                >
                  Kiyimlar katalogi
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('favorites')}
                  className="hover:text-white transition cursor-pointer"
                >
                  Yoqtirilganlar
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('cart')}
                  className="hover:text-white transition cursor-pointer"
                >
                  Savat
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('profile')}
                  className="hover:text-white transition cursor-pointer"
                >
                  Mening profilim
                </button>
              </li>
            </ul>
          </div>

          {/* Kategoriyalar */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Kategoriyalar
            </h4>
            <ul className="space-y-2 text-xs">
              {['kurtka', 'dvoyka', 'koylak', 'shim', 'luk-kiyimlar'].map((cat) => (
                <li key={cat}>
                  <button
                    onClick={() => {
                      setSelectedCategory(cat);
                      setActiveTab('clothing');
                    }}
                    className="hover:text-[#d4af37] uppercase transition cursor-pointer"
                  >
                    {cat.replace('-', ' ')}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Aloqa */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
              Aloqa ma‘lumotlari
            </h4>

            <div className="flex items-start gap-2.5 text-xs">
              <Phone className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
              <a href={`tel:${settings?.phone || '+998901234567'}`} className="hover:text-white">
                {settings?.phone || '+998 90 123 45 67'}
              </a>
            </div>

            <div className="flex items-start gap-2.5 text-xs">
              <MapPin className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
              <span>{settings?.address || 'Toshkent shahar, Yunusobod tumani'}</span>
            </div>

            <div className="flex items-start gap-2.5 text-xs">
              <Clock className="w-4 h-4 text-[#d4af37] shrink-0 mt-0.5" />
              <span>{settings?.workingHours || '09:00 - 22:00'}</span>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {settings?.storeName || 'SHU BREND'}. Barcha huquqlar himoyalangan.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>100% O‘zbekistonda ishlab chiqilgan & yetkazib beriladi</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
