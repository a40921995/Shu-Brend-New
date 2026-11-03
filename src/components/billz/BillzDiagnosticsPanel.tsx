import React from 'react';
import {
  Activity,
  Server,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
  ExternalLink,
} from 'lucide-react';
import type { BillzDiagnosticInfo } from '../../types/index.ts';

interface BillzDiagnosticsPanelProps {
  diagnostics: BillzDiagnosticInfo | null;
  loading: boolean;
  onRefresh: () => void;
  onTestImport5: () => void;
  onSyncPublished: () => void;
  onTestConnection: () => void;
  onIdentifyWarehouses: () => void;
  testingImport5: boolean;
  syncingPublished: boolean;
  testingConnection: boolean;
  identifyingWarehouses: boolean;
}

export const BillzDiagnosticsPanel: React.FC<BillzDiagnosticsPanelProps> = ({
  diagnostics,
  loading,
  onRefresh,
  onTestImport5,
  onSyncPublished,
  onTestConnection,
  onIdentifyWarehouses,
  testingImport5,
  syncingPublished,
  testingConnection,
  identifyingWarehouses,
}) => {
  if (loading && !diagnostics) {
    return (
      <div className="py-16 text-center text-slate-400 space-y-3">
        <RefreshCw className="w-7 h-7 animate-spin mx-auto text-amber-400" />
        <p className="text-sm">BILLZ tizimi diagnostika ma’lumotlari tekshirilmoqda...</p>
      </div>
    );
  }

  const isConnected = diagnostics?.status === 'CONNECTED';
  const isError = diagnostics?.status === 'ERROR';

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Actions */}
      <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-white">
                BILLZ Tizim Diagnostikasi & Omborlar Holati
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Real vaqt rejimidagi API ulanish holati, token muddati, «SHU BREND» asosiy ombori va «Mingbuloq» filiali tahlili hamda oxirgi HTTP telemetriyasi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Yangilash</span>
            </button>

            <button
              onClick={onTestConnection}
              disabled={testingConnection}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <Zap className={`w-3.5 h-3.5 ${testingConnection ? 'animate-spin' : ''}`} />
              <span>{testingConnection ? 'Tekshirilmoqda...' : 'Ulanishni tekshirish'}</span>
            </button>

            <button
              onClick={onTestImport5}
              disabled={testingImport5}
              className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-black flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className={`w-3.5 h-3.5 ${testingImport5 ? 'animate-spin' : ''}`} />
              <span>{testingImport5 ? 'Import qilinmoqda...' : '🔬 5 ta bilan sinov importi'}</span>
            </button>

            <button
              onClick={onSyncPublished}
              disabled={syncingPublished}
              className="px-3.5 py-2 rounded-xl gold-gradient-bg text-black text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/10 hover:scale-[1.02] active:scale-95 transition disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncingPublished ? 'animate-spin' : ''}`} />
              <span>{syncingPublished ? 'Yangilanmoqda...' : '🔄 Sayt qoldiqlarini yangilash'}</span>
            </button>
          </div>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {/* Card 1: Connection & Auth */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                1. API & Autentifikatsiya
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected
                    ? 'bg-emerald-400 shadow-md shadow-emerald-400/50 animate-pulse'
                    : isError
                    ? 'bg-rose-400'
                    : 'bg-amber-400'
                }`}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Holat:</span>
                <span
                  className={`font-black uppercase ${
                    isConnected
                      ? 'text-emerald-400'
                      : isError
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {diagnostics?.status || 'KUTILMOQDA'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Token holati:</span>
                <span className="font-bold text-amber-300">
                  {diagnostics?.tokenStatus || 'Mavjud emas'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Token muddati:</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {diagnostics?.tokenExpiry
                    ? new Date(diagnostics.tokenExpiry).toLocaleTimeString('uz-UZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '24 soat faol'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Main Warehouse "SHU BREND" */}
          <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                2. Asosiy Ombor: SHU BREND
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300">
                Markaziy
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Shop ID:</span>
                <span className="font-mono text-[11px] font-bold text-emerald-300 truncate max-w-[140px]">
                  {diagnostics?.mainWarehouse?.id || 'Aniqlanmoqda...'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Holati:</span>
                <span className="font-bold text-emerald-400">
                  {diagnostics?.mainWarehouse?.status === 'FOUND'
                    ? '✓ Tizimda aniqlandi'
                    : 'Kutilmoqda'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Ombor zaxirasi:</span>
                <span className="font-black text-white">
                  {diagnostics?.mainWarehouse?.stockSum ?? 0} dona
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Branch Warehouse "Shu brand Mingbuloq" */}
          <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" />
                3. Filial: Mingbuloq
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-blue-500/20 text-blue-300">
                Filial
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Shop ID:</span>
                <span className="font-mono text-[11px] font-bold text-blue-300 truncate max-w-[140px]">
                  {diagnostics?.branchWarehouse?.id || 'Aniqlanmoqda...'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Holati:</span>
                <span className="font-bold text-blue-400">
                  {diagnostics?.branchWarehouse?.status === 'FOUND'
                    ? '✓ Tizimda aniqlandi'
                    : 'Kutilmoqda'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Filial zaxirasi:</span>
                <span className="font-black text-white">
                  {diagnostics?.branchWarehouse?.stockSum ?? 0} dona
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Catalog Counts */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
              4. Mahsulotlar Balansi
            </span>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">BILLZ katalogi:</span>
                <span className="font-black text-white">
                  {diagnostics?.totalProductsInBillz ?? 0} ta
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Admin panel (Staging):</span>
                <span className="font-black text-amber-300">
                  {diagnostics?.totalStagedProducts ?? 0} ta
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Web saytda chiqarilgan:</span>
                <span className="font-black text-emerald-400">
                  {diagnostics?.totalPublishedProducts ?? 0} ta
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Warehouse Business Rules Banner */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 text-slate-300">
          <div className="flex items-center gap-2 font-bold text-amber-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>SHU BREND Omborlari va Savdo Qoidalari Bo‘yicha Qat’iy Tartib:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
            <li>
              <b>Asosiy ombor:</b> «SHU BREND» — asosiy va eng katta ombor. Saytdagi xaridlar uchun qoldiq aynan shu ombordan olinadi.
            </li>
            <li>
              <b>Mingbuloq filiali:</b> Filialda savdo amalga oshirilganda, BILLZ asosiy SHU BREND omboridagi qoldiqni kamaytiradi. Sayt filial qoldig‘ini asosiy omborga qo‘shmaydi.
            </li>
            <li>
              <b>Zaxira 0 bo‘lsa:</b> Asosiy omborda mahsulot qoldig‘i 0 dona bo‘lsa, mahsulot katalogda qoladi, lekin xaridorga «Sotuvda mavjud emas» deb ko‘rsatiladi.
            </li>
            <li>
              <b>Faqat tasdiqlangan tovarlar:</b> BILLZdagi 10 300+ ta tovar to‘g‘ridan-to‘g‘ri saytga chiqmaydi. Avval admin tanlaydi, tekshiradi, rasm biriktiradi va «Web saytga jo‘natish» tugmasi orqali chiqaradi.
            </li>
          </ul>
        </div>
      </div>

      {/* HTTP Telemetry Card */}
      <div className="bg-[#131b2a] border border-slate-800 rounded-3xl p-5 sm:p-7 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-black text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-amber-400" />
            Oxirgi BILLZ API So‘rovi Telemetriyasi (Real HTTP Logs)
          </h4>
          <button
            onClick={onIdentifyWarehouses}
            disabled={identifyingWarehouses}
            className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Building2 className={`w-3.5 h-3.5 ${identifyingWarehouses ? 'animate-spin' : ''}`} />
            <span>{identifyingWarehouses ? 'Aniqlanmoqda...' : 'Filiallarni qayta aniqlash'}</span>
          </button>
        </div>

        {diagnostics?.lastRequest ? (
          <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Method & URL:</span>
                <span className="text-amber-300 font-bold">
                  {diagnostics.lastRequest.method} {diagnostics.lastRequest.url}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">HTTP Status:</span>
                <span
                  className={`font-black ${
                    diagnostics.lastRequest.statusCode >= 200 &&
                    diagnostics.lastRequest.statusCode < 300
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {diagnostics.lastRequest.statusCode} OK
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Content-Type:</span>
                <span className="text-slate-300">
                  {diagnostics.lastRequest.contentType || 'application/json'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Davomiyligi:</span>
                <span className="text-blue-300 font-bold">
                  {diagnostics.lastRequest.durationMs} ms
                </span>
              </div>
            </div>

            {diagnostics.lastRequest.errorSnippet && (
              <div className="mt-2 p-3 rounded-xl bg-rose-950/40 border border-rose-900/40 text-rose-300 text-[11px] whitespace-pre-wrap">
                Xatolik tafsiloti: {diagnostics.lastRequest.errorSnippet}
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 text-xs bg-slate-900/40 rounded-2xl border border-slate-800">
            Hozircha faol telemetriya yozuvi yo‘q. Yuqoridagi «Ulanishni tekshirish» tugmasini bosing.
          </div>
        )}

        {/* Explanatory Technical Note */}
        <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-300 font-bold block mb-0.5">
              URL va HTML Parsing Xatosi Bo‘yicha Texnik Yechim:
            </span>
            <p>
              Oldingi <code>Unexpected token &apos;&lt;&apos;, &quot;&lt;!DOCTYPE ...&quot;</code> xatosi <code>admin.billz.ai</code> manziliga yuborilganidan kelib chiqqan (chunki u veb-interfeys). Backend tizimi avtomatik tarzda rasmiy <code>https://api-admin.billz.ai</code> REST API manziliga yo‘naltiradi va <code>Content-Type: application/json</code> tekshiruvini qat’iy amalga oshiradi.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
