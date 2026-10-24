import React, { useState } from 'react';
import { ShieldCheck, Lock, User, X, Eye, EyeOff, Loader2, KeyRound } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const { adminLogin } = useApp();

  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const success = await adminLogin(username, password);
      if (success) {
        onClose();
      } else {
        setErrorMessage('Login yoki parol noto‘g‘ri! Iltimos, qayta urinib ko‘ring.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Serverda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#131b2a] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-amber-950/30 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#d4af37]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#d4af37] via-[#b89628] to-[#aa820a] p-[1.5px] mx-auto mb-3 shadow-xl shadow-[#d4af37]/20">
            <div className="w-full h-full bg-[#0b0f17] rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-[#d4af37]" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            ⚙️ Admin panelga kirish
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            SHU BREND do‘konini to‘liq boshqarish uchun administrator hisobingizga kiring
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
            <KeyRound className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
              Admin Login yoki Telefon
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoFocus
                placeholder="admin yoki +998901234567"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-xl border border-slate-700 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
              Parol
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-11 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-xl border border-slate-700 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Quick Helper hint */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Standart admin:</span>
            <span className="font-mono text-amber-300/90 font-bold">admin / admin</span>
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-xl gold-gradient-bg text-black font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-[#d4af37]/25 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Tekshirilmoqda...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Admin panelga kirish</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
