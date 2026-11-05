import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  ShoppingCart,
  Calendar,
  Download,
  Printer,
  RotateCcw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  ShieldCheck,
  ChevronRight,
  Eye,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import { api, formatUzbekPrice } from '../lib/api.ts';
import type { SalesFinanceStats, SoldItemRecord, StatisticalPeriod } from '../types/index.ts';

export const AdminSalesFinanceManager: React.FC = () => {
  const [stats, setStats] = useState<SalesFinanceStats | null>(null);
  const [soldHistory, setSoldHistory] = useState<SoldItemRecord[]>([]);
  const [totalSoldRecords, setTotalSoldRecords] = useState(0);
  const [periods, setPeriods] = useState<StatisticalPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset Period Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Active view tab: 'overview' | 'sold_items' | 'periods_archive'
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'sold_items' | 'periods_archive'>('overview');

  // Load initial data
  const loadData = async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      // 1. Load periods
      const periodsRes = await api.getStatisticalPeriods();
      setPeriods(periodsRes.periods || []);
      if (!selectedPeriodId && periodsRes.currentPeriod) {
        setSelectedPeriodId(periodsRes.currentPeriod.id);
      }

      // Calculate start and end date based on dateFilter
      let startDate: string | undefined;
      let endDate: string | undefined;
      const now = new Date();

      if (dateFilter === 'TODAY') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10);
        endDate = startDate;
      } else if (dateFilter === 'WEEK') {
        const weekAgo = new Date(Date.now() - 7 * 86400000);
        startDate = weekAgo.toISOString().slice(0, 10);
        endDate = now.toISOString().slice(0, 10);
      } else if (dateFilter === 'MONTH') {
        const monthAgo = new Date(Date.now() - 30 * 86400000);
        startDate = monthAgo.toISOString().slice(0, 10);
        endDate = now.toISOString().slice(0, 10);
      } else if (dateFilter === 'CUSTOM') {
        startDate = customStartDate || undefined;
        endDate = customEndDate || undefined;
      }

      // 2. Load analytics
      const analyticsData = await api.getSalesFinanceStats({
        periodId: selectedPeriodId || undefined,
        startDate,
        endDate,
      });
      setStats(analyticsData);

      // 3. Load sold history
      const historyData = await api.getSoldItemsHistory({
        periodId: selectedPeriodId || undefined,
        startDate,
        endDate,
        search: searchTerm || undefined,
        limit: 100,
      });
      setSoldHistory(historyData.items || []);
      setTotalSoldRecords(historyData.total || 0);
    } catch (err: any) {
      setError(err.message || 'Moliya ma’lumotlarini yuklashda xatolik yuz berdi');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPeriodId, dateFilter, customStartDate, customEndDate]);

  // Debounced search on sold history
  useEffect(() => {
    const handler = setTimeout(() => {
      if (activeSubTab === 'sold_items') {
        loadData(true);
      }
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleStartNewPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword) {
      setResetError('Super Admin parolini kiritish shart!');
      return;
    }

    setIsResetting(true);
    setResetError(null);
    try {
      const res = await api.resetStatisticalPeriod(adminPassword, resetReason);
      setResetSuccess(res.message);
      setAdminPassword('');
      setResetReason('');
      setTimeout(() => {
        setIsResetModalOpen(false);
        setResetSuccess(null);
        loadData(true);
      }, 1500);
    } catch (err: any) {
      setResetError(err.message || 'Yangi davrni boshlashda xatolik yuz berdi');
    } finally {
      setIsResetting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold tracking-wider uppercase">
                Moliya & Savdo Nazorati
              </span>
              <span className="text-xs text-neutral-400">
                SHU BRAND NEW ERP
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-serif font-bold text-white tracking-tight">
              Savdo, Daromad va Sof Foyda
            </h1>
            <p className="text-neutral-400 text-sm mt-1 max-w-2xl">
              Real vaqt rejimida aylanma, tannarx (COGS), yetkazib berish xarajatlari, chegirmalar va sof rentabellik tahlili.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={api.getBackupCsvUrl('finance')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-medium transition-all shadow-sm hover:text-white"
              title="Moliya hisobotini Excel/CSV formatida yuklab olish"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Excel / CSV Hisobot</span>
            </a>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-medium transition-all shadow-sm hover:text-white"
              title="Hisobotni chop etish yoki PDF sifatida saqlash"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span>Chop etish / PDF</span>
            </button>

            <button
              onClick={() => {
                setResetError(null);
                setResetSuccess(null);
                setAdminPassword('');
                setResetReason('');
                setIsResetModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-black font-semibold text-xs transition-all shadow-lg shadow-amber-900/20 active:scale-95"
              title="Statistikani 0 qilish va yangi davr boshlash (Eski davr arxivlanadi)"
            >
              <RotateCcw className="w-4 h-4 text-black" />
              <span>Yangi davrni boshlash (0 qilish)</span>
            </button>
          </div>
        </div>

        {/* Filters and Period Bar */}
        <div className="relative z-10 mt-6 pt-5 border-t border-neutral-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Period Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-neutral-400 flex items-center gap-1.5 whitespace-nowrap">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              Statistik davr:
            </span>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">Barcha davrlar (Tarixiy yig‘indi)</option>
              {periods.map((p, idx) => (
                <option key={p.id} value={p.id}>
                  {idx === 0 ? '🟢 ' : '📦 '} {p.name} {p.archivedAt ? '(Arxiv)' : '(Joriy faol)'}
                </option>
              ))}
            </select>

            {stats?.period && (
              <span className="text-xs text-neutral-400 hidden xl:inline">
                Boshlangan sana: {new Date(stats.period.startedAt).toLocaleDateString('uz-UZ')}
              </span>
            )}
          </div>

          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'ALL', label: 'Davr bo‘yicha' },
              { id: 'TODAY', label: 'Bugun' },
              { id: 'WEEK', label: 'Oxirgi 7 kun' },
              { id: 'MONTH', label: 'Oxirgi 30 kun' },
              { id: 'CUSTOM', label: 'Maxsus sana' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setDateFilter(btn.id as any)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  dateFilter === btn.id
                    ? 'bg-amber-500 text-black font-semibold shadow'
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range inputs if selected */}
        {dateFilter === 'CUSTOM' && (
          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center gap-3 text-xs text-neutral-300">
            <span>Dan:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-amber-500"
            />
            <span>Gacha:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-neutral-800 gap-4">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeSubTab === 'overview'
              ? 'text-amber-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Umumiy Moliya & Grafiklar
          {activeSubTab === 'overview' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('sold_items')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-1.5 ${
            activeSubTab === 'sold_items'
              ? 'text-amber-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Sotilgan Mahsulotlar Tarixi
          <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-xs text-neutral-300">
            {totalSoldRecords}
          </span>
          {activeSubTab === 'sold_items' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>
        <button
          onClick={() => setActiveSubTab('periods_archive')}
          className={`pb-3 text-sm font-medium transition-colors relative ${
            activeSubTab === 'periods_archive'
              ? 'text-amber-400 font-semibold'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Statistik Davrlar Arxivi ({periods.length})
          {activeSubTab === 'periods_archive' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>
      </div>

      {/* Loading & Error Indicators */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-neutral-400">Moliya ko‘rsatkichlari hisoblanmoqda...</p>
        </div>
      ) : error ? (
        <div className="bg-red-950/40 border border-red-800 text-red-200 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      ) : stats ? (
        <>
          {/* SUB-TAB 1: OVERVIEW */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              {/* 6 Key Financial Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* 1. Umumiy aylanma */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-sm hover:border-neutral-700 transition-all">
                  <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                    <span>Umumiy Aylanma</span>
                    <ShoppingCart className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="text-lg font-bold text-white tracking-tight">
                    {formatUzbekPrice(stats.totalTurnover)}
                  </div>
                  <div className="mt-2 text-[11px] text-neutral-400 flex items-center gap-1">
                    <span>Jami buyurtmalar:</span>
                    <strong className="text-neutral-200">{stats.totalOrdersCount} ta</strong>
                  </div>
                </div>

                {/* 2. Haqiqiy Tushum */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-sm hover:border-neutral-700 transition-all">
                  <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                    <span>Haqiqiy Tushum (Yetkazilgan)</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-lg font-bold text-emerald-400 tracking-tight">
                    {formatUzbekPrice(stats.totalRevenue)}
                  </div>
                  <div className="mt-2 text-[11px] text-neutral-400 flex items-center gap-1">
                    <span>Yetkazilgan:</span>
                    <strong className="text-emerald-400">{stats.completedOrdersCount} ta</strong>
                  </div>
                </div>

                {/* 3. Tannarx (COGS) */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-sm hover:border-neutral-700 transition-all">
                  <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                    <span>Mahsulotlar Tannarxi (COGS)</span>
                    <Package className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-lg font-bold text-neutral-300 tracking-tight">
                    {formatUzbekPrice(stats.cogsTotal)}
                  </div>
                  <div className="mt-2 text-[11px] text-neutral-400 flex items-center gap-1">
                    <span>Sotilgan tovarlar:</span>
                    <strong className="text-neutral-200">{stats.totalSoldItems} dona</strong>
                  </div>
                </div>

                {/* 4. Yalpi Daromad (Gross Profit) */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-sm hover:border-neutral-700 transition-all">
                  <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                    <span>Yalpi Daromad</span>
                    <DollarSign className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-lg font-bold text-cyan-300 tracking-tight">
                    {formatUzbekPrice(stats.grossProfit)}
                  </div>
                  <div className="mt-2 text-[11px] text-neutral-400">
                    Tushum - Tannarx
                  </div>
                </div>

                {/* 5. Xarajatlar & Chegirmalar */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-sm hover:border-neutral-700 transition-all">
                  <div className="flex items-center justify-between text-neutral-400 text-xs mb-2">
                    <span>Yetkazish & Chegirmalar</span>
                    <Info className="w-4 h-4 text-rose-400" />
                  </div>
                  <div className="text-sm font-semibold text-rose-300">
                    Yetkazish: {formatUzbekPrice(stats.deliveryExpensesTotal)}
                  </div>
                  <div className="mt-1 text-[11px] text-neutral-400">
                    Chegirmalar: {formatUzbekPrice(stats.discountsTotal)}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Qaytarilgan: {formatUzbekPrice(stats.refundsTotal)}
                  </div>
                </div>

                {/* 6. Haqiqiy Sof Foyda (Net Real Profit) */}
                <div className="bg-gradient-to-br from-amber-950/40 via-neutral-900 to-neutral-950 border-2 border-amber-500/40 rounded-2xl p-4 shadow-lg relative overflow-hidden">
                  <div className="flex items-center justify-between text-amber-300 text-xs font-semibold mb-2">
                    <span>Haqiqiy Sof Foyda</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">
                      {stats.profitMarginPercent}% marja
                    </span>
                  </div>
                  <div className="text-xl font-extrabold text-amber-400 tracking-tight">
                    {formatUzbekPrice(stats.netRealProfit)}
                  </div>
                  <div className="mt-2 text-[11px] text-amber-200/80">
                    Sof rentabellik darajasi
                  </div>
                </div>
              </div>

              {/* Real-time Order Status Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-neutral-400">Yetkazilgan (Muvaffaqiyatli)</div>
                    <div className="text-xl font-bold text-emerald-400 mt-1">{stats.completedOrdersCount} ta</div>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/30" />
                </div>
                <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-neutral-400">Kutilmoqda / Tayyorlanmoqda</div>
                    <div className="text-xl font-bold text-amber-400 mt-1">{stats.pendingOrdersCount} ta</div>
                    <div className="text-[11px] text-neutral-500">{formatUzbekPrice(stats.pendingRevenue)} kutilmoqda</div>
                  </div>
                  <Clock className="w-8 h-8 text-amber-500/30" />
                </div>
                <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-neutral-400">Bekor qilingan</div>
                    <div className="text-xl font-bold text-rose-400 mt-1">{stats.cancelledOrdersCount} ta</div>
                  </div>
                  <XCircle className="w-8 h-8 text-rose-500/30" />
                </div>
                <div className="bg-neutral-900/70 border border-neutral-800 rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-neutral-400">O‘rtacha buyurtma qiymati (AOV)</div>
                    <div className="text-xl font-bold text-blue-400 mt-1">
                      {stats.completedOrdersCount > 0
                        ? formatUzbekPrice(Math.round(stats.totalRevenue / stats.completedOrdersCount))
                        : '0 so‘m'}
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-500/30" />
                </div>
              </div>

              {/* Charts & Categorical Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Daily Sales Timeline Bar Chart */}
                <div className="lg:col-span-2 bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-white">Kunlik Savdo va Sof Foyda Dinamikasi</h3>
                      <p className="text-xs text-neutral-400">Oxirgi 7 kundagi tushum va sof foyda taqqoslanishi</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5 text-neutral-300">
                        <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Tushum
                      </span>
                      <span className="flex items-center gap-1.5 text-neutral-300">
                        <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Sof Foyda
                      </span>
                    </div>
                  </div>

                  <div className="h-56 flex items-end gap-3 pt-6 pb-2 border-b border-neutral-800">
                    {stats.dailySales.map((day, idx) => {
                      const maxVal = Math.max(...stats.dailySales.map(d => d.revenue), 1000000);
                      const revHeight = Math.max(8, Math.round((day.revenue / maxVal) * 100));
                      const profHeight = Math.max(4, Math.round((day.profit / maxVal) * 100));

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                          {/* Tooltip */}
                          <div className="absolute -top-12 bg-black border border-neutral-700 text-white text-[10px] rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                            <div>{day.label}</div>
                            <div>Tushum: {formatUzbekPrice(day.revenue)}</div>
                            <div className="text-emerald-400">Sof foyda: {formatUzbekPrice(day.profit)}</div>
                          </div>

                          <div className="w-full flex items-end justify-center gap-1">
                            <div
                              style={{ height: `${revHeight}%` }}
                              className="w-1/2 bg-amber-500/80 hover:bg-amber-400 rounded-t-sm transition-all"
                            />
                            <div
                              style={{ height: `${profHeight}%` }}
                              className="w-1/2 bg-emerald-500/80 hover:bg-emerald-400 rounded-t-sm transition-all"
                            />
                          </div>
                          <span className="text-[10px] text-neutral-400 mt-2 truncate w-full text-center">
                            {day.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Category Distribution */}
                <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-white mb-1">Kategoriyalar Bo‘yicha Ulush</h3>
                  <p className="text-xs text-neutral-400 mb-4">Eng ko‘p daromad keltirayotgan kiyim turlari</p>

                  <div className="space-y-3.5">
                    {stats.categorySalesDistribution.length === 0 ? (
                      <p className="text-xs text-neutral-500 py-6 text-center">Savdolar topilmadi</p>
                    ) : (
                      stats.categorySalesDistribution.slice(0, 5).map((cat, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-neutral-200">{cat.categoryName}</span>
                            <span className="text-amber-400 font-semibold">{cat.percentage}%</span>
                          </div>
                          <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                              style={{ width: `${Math.min(100, cat.percentage)}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[11px] text-neutral-500">
                            <span>{cat.count} ta mahsulot</span>
                            <span>{formatUzbekPrice(cat.revenue)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Top Selling Products List */}
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      Eng Ko‘p Sotilgan Mahsulotlar (Top Sellers)
                    </h3>
                    <p className="text-xs text-neutral-400">Joriy davrda eng yuqori talab va foyda keltirgan tovarlar</p>
                  </div>
                  <button
                    onClick={() => setActiveSubTab('sold_items')}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                  >
                    Barcha sotuvlarni ko‘rish <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-400">
                        <th className="pb-2.5 font-medium">Mahsulot</th>
                        <th className="pb-2.5 font-medium">SKU</th>
                        <th className="pb-2.5 font-medium text-center">Sotilgan Soni</th>
                        <th className="pb-2.5 font-medium text-right">Jami Tushum</th>
                        <th className="pb-2.5 font-medium text-right">Keltirilgan Foyda</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60">
                      {stats.topSellingProducts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-neutral-500">
                            Hozircha sotilgan mahsulotlar mavjud emas
                          </td>
                        </tr>
                      ) : (
                        stats.topSellingProducts.map((p) => (
                          <tr key={p.productId} className="hover:bg-neutral-800/40 transition-colors">
                            <td className="py-3 flex items-center gap-3">
                              <img
                                src={p.image}
                                alt={p.name}
                                className="w-10 h-10 object-cover rounded-lg border border-neutral-700 shrink-0"
                              />
                              <span className="font-medium text-white truncate max-w-xs">{p.name}</span>
                            </td>
                            <td className="py-3 text-neutral-400 font-mono text-[11px]">{p.sku || '—'}</td>
                            <td className="py-3 text-center font-bold text-amber-400">{p.unitsSold} dona</td>
                            <td className="py-3 text-right font-medium text-white">{formatUzbekPrice(p.totalRevenue)}</td>
                            <td className="py-3 text-right font-bold text-emerald-400">{formatUzbekPrice(p.totalProfit)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: SOLD ITEMS HISTORY TABLE */}
          {activeSubTab === 'sold_items' && (
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Mahsulot nomi, SKU, buyurtma raqami yoki mijoz telefoni..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href={api.getBackupCsvUrl('sales')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-all"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Sotuvlar CSV</span>
                  </a>
                  <button
                    onClick={() => loadData(true)}
                    className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition-all"
                  >
                    Yangilash
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-950/50">
                      <th className="py-3 px-3 font-medium">Mahsulot</th>
                      <th className="py-3 px-3 font-medium">Buyurtma & Sana</th>
                      <th className="py-3 px-3 font-medium text-center">O‘lcham / Rang</th>
                      <th className="py-3 px-3 font-medium text-center">Soni</th>
                      <th className="py-3 px-3 font-medium text-right">Sotuv Narxi</th>
                      <th className="py-3 px-3 font-medium text-right">Tannarx</th>
                      <th className="py-3 px-3 font-medium text-right">Sof Foyda</th>
                      <th className="py-3 px-3 font-medium">Mijoz</th>
                      <th className="py-3 px-3 font-medium text-center">Holat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {soldHistory.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-neutral-500">
                          Tanlangan mezonlar bo‘yicha sotilgan mahsulot topilmadi
                        </td>
                      </tr>
                    ) : (
                      soldHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                          <td className="py-3 px-3 flex items-center gap-2.5">
                            <img
                              src={item.productImage}
                              alt={item.productName}
                              className="w-10 h-10 object-cover rounded-lg border border-neutral-700 shrink-0"
                            />
                            <div>
                              <div className="font-semibold text-white">{item.productName}</div>
                              <div className="text-[10px] text-neutral-400 font-mono">
                                {item.sku ? `SKU: ${item.sku}` : item.billzId ? `BILLZ: ${item.billzId.slice(-6)}` : item.categoryName}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-mono text-amber-400 font-semibold">{item.orderNumber}</div>
                            <div className="text-[10px] text-neutral-500">
                              {new Date(item.soldAt).toLocaleString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[11px]">
                              {item.size} • {item.color}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-white">
                            {item.quantity} ta
                          </td>
                          <td className="py-3 px-3 text-right font-medium text-white">
                            {formatUzbekPrice(item.unitPrice)}
                          </td>
                          <td className="py-3 px-3 text-right text-neutral-400">
                            {formatUzbekPrice(item.costPrice)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-emerald-400">
                            +{formatUzbekPrice(item.profit)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-white font-medium">{item.customerName}</div>
                            <div className="text-[10px] text-neutral-400 font-mono">{item.customerPhone}</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              item.orderStatus === 'YETKAZILDI'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : item.orderStatus === 'BEKOR_QILINDI'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}>
                              {item.orderStatus}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: PERIODS ARCHIVE */}
          {activeSubTab === 'periods_archive' && (
            <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Statistik Davrlar Arxiv Tarixi</h3>
                <p className="text-xs text-neutral-400">
                  Har safar «Statistikani 0 qilish» bosilganda avvalgi barcha buyurtma va daromadlar saqlanadi, hech narsa o‘chirilmaydi.
                </p>
              </div>

              <div className="space-y-3">
                {periods.map((period, idx) => (
                  <div
                    key={period.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      !period.archivedAt
                        ? 'bg-amber-950/20 border-amber-500/40 shadow-sm'
                        : 'bg-neutral-950/60 border-neutral-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{period.name}</span>
                        {!period.archivedAt ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            HOZIRGI FAOL DAVR
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 text-[10px]">
                            ARXIVLANGAN
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Boshlandi: {new Date(period.startedAt).toLocaleString('uz-UZ')}</span>
                        {period.archivedAt && (
                          <span>Yopildi: {new Date(period.archivedAt).toLocaleString('uz-UZ')}</span>
                        )}
                      </div>
                      {period.snapshot && (
                        <div className="mt-2 text-xs text-neutral-300 flex flex-wrap gap-3">
                          <span>Aylanma: <strong>{formatUzbekPrice(period.snapshot.turnover)}</strong></span>
                          <span>Tushum: <strong className="text-emerald-400">{formatUzbekPrice(period.snapshot.revenue)}</strong></span>
                          <span>Sof foyda: <strong className="text-amber-400">{formatUzbekPrice(period.snapshot.netRealProfit)}</strong></span>
                          <span>Buyurtmalar: <strong>{period.snapshot.ordersCount} ta</strong></span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPeriodId(period.id);
                        setActiveSubTab('overview');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 self-start md:self-center"
                    >
                      Ushbu davr hisobotini ko‘rish
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* START NEW STATISTICAL PERIOD (RESET STATS TO 0) MODAL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Yangi Statistik Davrni Boshlash</h3>
                <p className="text-xs text-neutral-400">Statistikani 0 qilish va arxivlash</p>
              </div>
            </div>

            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3.5 text-xs text-amber-200/90 space-y-1 mb-4">
              <p className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Xavfsizlik va ma’lumotlar daxlsizligi:
              </p>
              <p>
                Ushbu amal mijozlar buyurtmalarini, tovarlar qoldig‘ini yoki sotuv tarixini <strong>O‘CHIRMAYDI</strong>!
              </p>
              <p>
                Oldingi davr ko‘rsatkichlari avtomatik arxivlanadi va istalgan payt ko‘rish mumkin bo‘ladi. Dashboard esa yangi savdolarni 0 dan hisoblashni boshlaydi.
              </p>
            </div>

            {resetError && (
              <div className="mb-4 bg-red-950/40 border border-red-800 text-red-200 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="mb-4 bg-emerald-950/40 border border-emerald-800 text-emerald-200 p-3 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <form onSubmit={handleStartNewPeriod} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Super Admin Paroli <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Tasdiqlash uchun parolingizni kiriting..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Izoh / Sabab (Ixtiyoriy)
                </label>
                <input
                  type="text"
                  placeholder="Masalan: 2026-yil 2-chorak savdolari yoki Yangi do‘kon ochilishi"
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-all"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isResetting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg shadow-amber-900/30 flex items-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Arxivlanmoqda...</span>
                    </>
                  ) : (
                    <span>Tasdiqlash va 0 dan boshlash</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
