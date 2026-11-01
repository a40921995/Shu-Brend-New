import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  X,
  Eye,
  EyeOff,
  Loader2,
  KeyRound,
  Send,
  Key,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { api } from '../lib/api.ts';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({ isOpen, onClose }) => {
  const { adminLogin, showToast } = useApp();

  // Mode: 'login' or 'recovery'
  const [mode, setMode] = useState<'login' | 'recovery'>('login');

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Recovery Form States
  const [recoveryMethod, setRecoveryMethod] = useState<'TELEGRAM_CODE' | 'MASTER_KEY'>('TELEGRAM_CODE');
  const [recoveryStatus, setRecoveryStatus] = useState<{
    telegramAvailable: boolean;
    chatIdMasked?: string;
    masterKeyAvailable: boolean;
  }>({
    telegramAvailable: false,
    masterKeyAvailable: true,
  });

  const [codeOrKey, setCodeOrKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Check recovery status when switching to recovery mode
  useEffect(() => {
    if (mode === 'recovery') {
      api.getAdminRecoveryStatus()
        .then((st) => {
          setRecoveryStatus(st);
          if (!st.telegramAvailable) {
            setRecoveryMethod('MASTER_KEY');
          }
        })
        .catch(() => {
          setRecoveryStatus({ telegramAvailable: false, masterKeyAvailable: true });
          setRecoveryMethod('MASTER_KEY');
        });
    }
  }, [mode]);

  // Countdown timer for resending recovery code
  useEffect(() => {
    if (codeCountdown <= 0) return;
    const timer = setTimeout(() => {
      setCodeCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [codeCountdown]);

  if (!isOpen) return null;

  // Handle Standard Admin Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const success = await adminLogin(username.trim(), password.trim());
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

  // Handle Request 6-digit Telegram Code
  const handleRequestTelegramCode = async () => {
    try {
      setSendingCode(true);
      setErrorMessage('');
      const res = await api.requestAdminRecoveryCode();
      setCodeSent(true);
      setCodeCountdown(60); // 60s cooldown before next send
      showToast(res.message, 'success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Telegramga kod yuborishda xatolik yuz berdi');
    } finally {
      setSendingCode(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.trim().length < 12) {
      setErrorMessage('Yangi parol kamida 12 ta belgidan iborat bo‘lishi shart!');
      return;
    }

    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMessage('Yangi parol va tasdiqlovchi parol mos kelmadi!');
      return;
    }

    try {
      setResettingPassword(true);
      const res = await api.resetAdminPassword({
        recoveryMethod,
        codeOrKey: codeOrKey.trim(),
        newPassword: newPassword.trim(),
        confirmPassword: confirmPassword.trim(),
      });

      setSuccessMessage(res.message);
      showToast(res.message, 'success');

      // Reset form & transition back to login with new password prefilled
      setTimeout(() => {
        setMode('login');
        setPassword(newPassword.trim());
        setSuccessMessage('');
        setCodeOrKey('');
        setNewPassword('');
        setConfirmPassword('');
      }, 2200);
    } catch (err: any) {
      setErrorMessage(err.message || 'Parolni tiklashda xatolik yuz berdi');
    } finally {
      setResettingPassword(false);
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

        {/* --- 1. LOGIN MODE --- */}
        {mode === 'login' ? (
          <div>
            {/* Header Icon */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#d4af37] via-[#b89628] to-[#aa820a] p-[1.5px] mx-auto mb-3 shadow-xl shadow-[#d4af37]/20">
                <div className="w-full h-full bg-[#0b0f17] rounded-[14px] flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-[#d4af37]" />
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Super Admin Kirish
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
            <form onSubmit={handleLoginSubmit} className="space-y-4">
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
                    placeholder="Admin login yoki telefon raqami"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-xl border border-slate-700 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] focus:outline-none transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Parol
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('recovery');
                      setErrorMessage('');
                    }}
                    className="text-xs font-bold text-amber-400 hover:text-amber-300 transition cursor-pointer"
                  >
                    Parolni unutdingizmi?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 bg-slate-900/90 text-sm text-white placeholder-slate-500 rounded-xl border border-slate-700 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] focus:outline-none transition font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 rounded-xl gold-gradient-bg text-black font-extrabold text-sm uppercase tracking-wider shadow-lg shadow-[#d4af37]/25 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-3"
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
        ) : (
          /* --- 2. PASSWORD RECOVERY MODE --- */
          <div>
            <div className="flex items-center gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                title="Kirishga qaytish"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-400" />
                Parolni Xavfsiz Tiklash
              </h2>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Super Admin uchun yangi xavfsiz parol o‘rnatish. Tiklash usulini tanlang:
            </p>

            {/* Recovery Method Switcher */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setRecoveryMethod('TELEGRAM_CODE');
                  setErrorMessage('');
                }}
                disabled={!recoveryStatus.telegramAvailable}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  recoveryMethod === 'TELEGRAM_CODE'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-sm'
                    : recoveryStatus.telegramAvailable
                    ? 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    : 'bg-slate-900/40 text-slate-600 border border-slate-800/40 cursor-not-allowed'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Telegram Kod</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRecoveryMethod('MASTER_KEY');
                  setErrorMessage('');
                }}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  recoveryMethod === 'MASTER_KEY'
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Master Kalit</span>
              </button>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Alert */}
            {successMessage && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
              {/* Telegram Code Recovery Sub-view */}
              {recoveryMethod === 'TELEGRAM_CODE' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">
                      Telegram 6 xonali tasdiqlash kodi *
                    </label>
                    <button
                      type="button"
                      onClick={handleRequestTelegramCode}
                      disabled={sendingCode || codeCountdown > 0}
                      className="text-xs font-bold text-amber-400 hover:text-amber-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 cursor-pointer"
                    >
                      {sendingCode ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Yuborilmoqda...</span>
                        </>
                      ) : codeCountdown > 0 ? (
                        <span>Qayta yuborish ({codeCountdown}s)</span>
                      ) : (
                        <span>{codeSent ? 'Kodni qayta yuborish' : 'Kodni Telegramga yuborish'}</span>
                      )}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={codeOrKey}
                    onChange={(e) => setCodeOrKey(e.target.value.replace(/\D/g, ''))}
                    placeholder="Masalan: 849201"
                    className="w-full px-3.5 py-2.5 bg-slate-900 text-white text-sm tracking-widest text-center font-mono rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    Tasdiqlash kodi administratorning ulangan Telegram chatiga yuboriladi va 10 daqiqa amal qiladi.
                  </p>
                </div>
              )}

              {/* Master Recovery Key Sub-view */}
              {recoveryMethod === 'MASTER_KEY' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 block">
                    Master Tiklash Kaliti (Master Recovery Key) *
                  </label>
                  <input
                    type="text"
                    required
                    value={codeOrKey}
                    onChange={(e) => setCodeOrKey(e.target.value)}
                    placeholder="SHU-RCV-XXXX-XXXX-XXXX"
                    className="w-full px-3.5 py-2.5 bg-slate-900 text-white text-xs font-mono rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">
                    Server yoki Render muhiti uchun o‘rnatilgan favqulodda Master Tiklash Kaliti.
                  </p>
                </div>
              )}

              {/* New Password */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Yangi kuchli parol (kamida 12 belgi) *
                  </label>
                  <span className={`text-[10px] font-mono ${newPassword.length >= 12 ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {newPassword.length}/12
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Yangi parolni kiriting"
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-900 text-white text-xs font-mono rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300 block">
                  Yangi parolni takrorlang *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Yangi parolni qayta kiriting"
                    className="w-full pl-9 pr-9 py-2.5 bg-slate-900 text-white text-xs font-mono rounded-xl border border-slate-700 focus:border-amber-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                {confirmPassword && (
                  <div className="text-[10px] font-bold">
                    {confirmPassword === newPassword ? (
                      <span className="text-emerald-400">✓ Parollar mos keldi</span>
                    ) : (
                      <span className="text-rose-400">✕ Parollar bir-biriga mos kelmadi</span>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={resettingPassword}
                className="w-full py-3 rounded-xl gold-gradient-bg text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 mt-3"
              >
                {resettingPassword ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Tekshirilmoqda va saqlanmoqda...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Yangi parolni saqlash</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
