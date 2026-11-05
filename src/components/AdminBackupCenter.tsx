import React, { useState, useEffect } from 'react';
import {
  Database,
  Download,
  FileSpreadsheet,
  Laptop,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Server,
  FileCode,
  HardDrive,
  Copy,
  Check,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import type { AuditLogEntry, SupabaseConfig } from '../types/index.ts';

export const AdminBackupCenter: React.FC = () => {
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseConfig | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const [supa, logs] = await Promise.all([
        api.getSupabaseStatus(),
        api.getAuditLogs(30),
      ]);
      setSupabaseStatus(supa);
      setAuditLogs(logs);
    } catch (err) {
      console.error('Failed to load backup status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(id);
    setTimeout(() => setCopiedScript(null), 2000);
  };

  const windowsScript = `git clone <REPOSITORIY_LINKI>
cd shubrend
npm install
npm run dev`;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold tracking-wider uppercase">
                Zaxira & Ma’lumotlar Xavfsizligi
              </span>
              <span className="text-xs text-neutral-400">SHU BRAND NEW Backup Center</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-white tracking-tight">
              Baza Zaxirasi, CSV Eksport va Windows 11 Sozlamalari
            </h1>
            <p className="text-neutral-400 text-sm mt-1 max-w-2xl">
              Tizim ma’lumotlarini to‘liq JSON yoki Excel/CSV formatida yuklab olish, Supabase PostgreSQL ulanish holati va mustaqil ishga tushirish qo‘llanmasi.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={api.getBackupJsonUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black font-semibold text-xs transition-all shadow-lg shadow-amber-900/30"
            >
              <Download className="w-4 h-4 text-black" />
              <span>To‘liq Baza JSON Zaxirasini Yuklash</span>
            </a>
          </div>
        </div>
      </div>

      {/* 4 CSV Download Cards */}
      <div>
        <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          Excel / CSV Hisobotlar va Eksportlar
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Products */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all">
            <div>
              <div className="text-xs font-bold text-white mb-1">Mahsulotlar Bazasi</div>
              <p className="text-[11px] text-neutral-400 mb-3">
                Barcha mahsulotlar, narxlar, tannarxlar, SKU, shtrix-kod va qoldiqlar.
              </p>
            </div>
            <a
              href={api.getBackupCsvUrl('products')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mahsulotlar CSV</span>
            </a>
          </div>

          {/* 2. Orders */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all">
            <div>
              <div className="text-xs font-bold text-white mb-1">Buyurtmalar Tarixi</div>
              <p className="text-[11px] text-neutral-400 mb-3">
                Barcha buyurtmalar, mijozlar ismi, telefon, manzillar va to‘lov holatlari.
              </p>
            </div>
            <a
              href={api.getBackupCsvUrl('orders')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Buyurtmalar CSV</span>
            </a>
          </div>

          {/* 3. Sales */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all">
            <div>
              <div className="text-xs font-bold text-white mb-1">Sotuvlar & Mahsulotlar</div>
              <p className="text-[11px] text-neutral-400 mb-3">
                Har bir sotilgan tovar bo‘yicha narx, tannarx va hisoblangan sof foyda.
              </p>
            </div>
            <a
              href={api.getBackupCsvUrl('sales')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Sotuvlar CSV</span>
            </a>
          </div>

          {/* 4. Finance */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between hover:border-neutral-700 transition-all">
            <div>
              <div className="text-xs font-bold text-white mb-1">Moliya & Foyda Xulosasi</div>
              <p className="text-[11px] text-neutral-400 mb-3">
                Aylanma, COGS, yalpi va sof daromad, xarajatlar va rentabellik hisoboti.
              </p>
            </div>
            <a
              href={api.getBackupCsvUrl('finance')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium border border-neutral-700"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Moliya CSV</span>
            </a>
          </div>
        </div>
      </div>

      {/* Supabase PostgreSQL & Architecture Dual-Engine Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supabase Status */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Supabase Cloud PostgreSQL Holati</h3>
            </div>
            <button
              onClick={loadStatus}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-all"
              title="Qayta tekshirish"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Ishlash rejimi (Mode):</span>
              <span className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                supabaseStatus?.connected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {supabaseStatus?.mode || 'LOCAL_PERSISTENT (Disk/JSON)'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-neutral-400">Aloqa holati:</span>
              <span className="font-semibold text-white">
                {supabaseStatus?.connected ? '🟢 Ulanish faol' : '🟡 Mahalliy barqaror rejim faol'}
              </span>
            </div>

            {supabaseStatus?.url && (
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Baza URL manzili:</span>
                <span className="font-mono text-neutral-300 text-[11px] truncate max-w-xs">{supabaseStatus.url}</span>
              </div>
            )}

            {supabaseStatus?.error && (
              <div className="mt-2 p-2 rounded bg-amber-950/30 border border-amber-800/40 text-amber-200 text-[11px]">
                {supabaseStatus.error}
              </div>
            )}
          </div>

          <div className="text-xs text-neutral-400 space-y-1">
            <p className="font-semibold text-neutral-300">Dual-Engine arxitekturasi:</p>
            <p>
              Loyihamiz ham bulutli Supabase PostgreSQL bazasi bilan, ham mustaqil lokal disk (JSON) orqali hech qanday to‘xtovsiz ishlayveradi.
            </p>
          </div>
        </div>

        {/* Windows 11 Pro Laptop Setup */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Windows 11 Pro Noutbukda Ishga Tushirish</h3>
          </div>

          <p className="text-xs text-neutral-400">
            SHU BRAND NEW dasturini internet yo‘q bo‘lgan taqdirda ham Windows noutbukda to‘liq lokal do‘kon va admin panel sifatida ishlatish mumkin.
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-300">
              <span className="font-medium">PowerShell / CMD buyruqlari:</span>
              <button
                onClick={() => copyToClipboard(windowsScript, 'win')}
                className="text-amber-400 hover:text-amber-300 text-xs flex items-center gap-1 font-medium"
              >
                {copiedScript === 'win' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript === 'win' ? 'Nusxalandi' : 'Nusxa olish'}</span>
              </button>
            </div>

            <pre className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] text-amber-300 font-mono overflow-x-auto">
              {windowsScript}
            </pre>
          </div>

          <div className="text-[11px] text-neutral-400 space-y-1">
            <p>• Dastur porti: <strong>http://localhost:3000</strong></p>
            <p>• Barcha yuklangan rasmlar va ma’lumotlar avtomatik saqlanadi.</p>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Tizim Xavfsizlik va Harakatlar Jurnali (Audit Logs)
            </h3>
            <p className="text-xs text-neutral-400">
              Admin parolini yangilash, statistik davrlarni arxivlash va tizim o‘zgarishlari qaydlari.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-950/50">
                <th className="py-2.5 px-3 font-medium">Sana & Vaqt</th>
                <th className="py-2.5 px-3 font-medium">Foydalanuvchi</th>
                <th className="py-2.5 px-3 font-medium">Amal</th>
                <th className="py-2.5 px-3 font-medium">Tafsilot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-neutral-500">
                    Hozircha audit yozuvlari mavjud emas
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-neutral-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('uz-UZ')}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-white">
                      {log.adminUsername} ({log.adminRole})
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-neutral-800 text-amber-400 font-mono text-[10px] font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-neutral-300 max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
