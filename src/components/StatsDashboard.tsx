import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trade, TradingStats } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Award, PieChart as PieIcon, Activity, DollarSign, Target, 
  BrainCircuit, ShieldAlert, AlertTriangle, Settings, Trophy, Sparkles, CheckCircle, Info, 
  ChevronDown, ChevronUp, Calendar, Clock, Lock
} from 'lucide-react';

interface StatsDashboardProps {
  trades: Trade[];
  startingBalance: number;
  currency: string;
  language?: 'fr' | 'en';
}

export default function StatsDashboard({ trades, startingBalance, currency, language = 'fr' }: StatsDashboardProps) {
  
  // Daily Target states
  const [dailyTargetPercent, setDailyTargetPercent] = useState<number>(() => {
    const saved = localStorage.getItem('trading_daily_target_percent');
    return saved ? parseFloat(saved) : 1.0; // Default 1%
  });
  
  const [dailyDrawdownPercent, setDailyDrawdownPercent] = useState<number>(() => {
    const saved = localStorage.getItem('trading_daily_drawdown_percent');
    return saved ? parseFloat(saved) : 2.0; // Default 2%
  });

  const [customDailyTarget, setCustomDailyTarget] = useState<string>(() => {
    return localStorage.getItem('trading_custom_daily_target') || '';
  });

  const [customDailyDrawdown, setCustomDailyDrawdown] = useState<string>(() => {
    return localStorage.getItem('trading_custom_daily_drawdown') || '';
  });

  const [showDailySettings, setShowDailySettings] = useState<boolean>(false);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('trading_daily_target_percent', String(dailyTargetPercent));
  }, [dailyTargetPercent]);

  useEffect(() => {
    localStorage.setItem('trading_daily_drawdown_percent', String(dailyDrawdownPercent));
  }, [dailyDrawdownPercent]);

  useEffect(() => {
    localStorage.setItem('trading_custom_daily_target', customDailyTarget);
  }, [customDailyTarget]);

  useEffect(() => {
    localStorage.setItem('trading_custom_daily_drawdown', customDailyDrawdown);
  }, [customDailyDrawdown]);

  // Daily stats & metrics math for the Progress Bar
  const dailyStats = useMemo(() => {
    const todayStr = new Date().toDateString();
    
    // Filter closed trades belonging to today in local time
    const todayTrades = trades.filter(t => {
      if (t.status !== 'CLOSED' || !t.closedAt) return false;
      return new Date(t.closedAt).toDateString() === todayStr;
    });

    const todayPnL = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const todayWins = todayTrades.filter(t => (t.pnl || 0) > 0).length;
    const todayLosses = todayTrades.filter(t => (t.pnl || 0) < 0).length;
    
    const actualDailyTarget = customDailyTarget !== '' 
      ? parseFloat(customDailyTarget) || (startingBalance * 0.01)
      : startingBalance * (dailyTargetPercent / 100);

    const actualDailyDrawdown = customDailyDrawdown !== '' 
      ? parseFloat(customDailyDrawdown) || (startingBalance * 0.02)
      : startingBalance * (dailyDrawdownPercent / 100);

    // Progression ratio
    const progressPercent = actualDailyTarget > 0 
      ? Math.min(100, Math.max(0, (todayPnL / actualDailyTarget) * 100)) 
      : 0;

    const drawdownSpentAmount = todayPnL < 0 ? Math.abs(todayPnL) : 0;
    const drawdownProgressPercent = actualDailyDrawdown > 0 
      ? Math.min(100, Math.max(0, (drawdownSpentAmount / actualDailyDrawdown) * 100)) 
      : 0;

    return {
      todayTrades,
      todayPnL,
      todayWins,
      todayLosses,
      actualDailyTarget,
      actualDailyDrawdown,
      progressPercent,
      drawdownSpentAmount,
      drawdownProgressPercent
    };
  }, [trades, startingBalance, dailyTargetPercent, dailyDrawdownPercent, customDailyTarget, customDailyDrawdown]);

  // Calculate comprehensive statistics
  const stats = useMemo((): TradingStats => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const totalTrades = closedTrades.length;
    
    if (totalTrades === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        netProfit: 0,
        profitFactor: 0,
        averageWin: 0,
        averageLoss: 0,
        maxDrawdown: 0,
        totalWins: 0,
        totalLosses: 0,
        winPnLTotal: 0,
        lossPnLTotal: 0
      };
    }

    let totalWins = 0;
    let totalLosses = 0;
    let winPnLTotal = 0;
    let lossPnLTotal = 0;
    let netProfit = 0;

    // Peak balance tracking for Drawdown
    let currentBalance = startingBalance;
    let peakBalance = startingBalance;
    let maxDrawdown = 0;

    closedTrades.forEach(t => {
      const pnl = t.pnl || 0;
      netProfit += pnl;
      currentBalance += pnl;

      if (currentBalance > peakBalance) {
        peakBalance = currentBalance;
      }
      const dd = ((peakBalance - currentBalance) / peakBalance) * 100;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
      }

      if (pnl > 0) {
        totalWins++;
        winPnLTotal += pnl;
      } else if (pnl < 0) {
        totalLosses++;
        lossPnLTotal += Math.abs(pnl);
      }
    });

    const winRate = totalTrades > 0 ? (totalWins / totalTrades) * 100 : 0;
    const averageWin = totalWins > 0 ? winPnLTotal / totalWins : 0;
    const averageLoss = totalLosses > 0 ? lossPnLTotal / totalLosses : 0;
    const profitFactor = lossPnLTotal > 0 ? (winPnLTotal / lossPnLTotal) : winPnLTotal > 0 ? 99.9 : 0;

    return {
      totalTrades,
      winRate,
      netProfit,
      profitFactor,
      averageWin,
      averageLoss,
      maxDrawdown,
      totalWins,
      totalLosses,
      winPnLTotal,
      lossPnLTotal
    };
  }, [trades, startingBalance]);

  // Equity curve data (Chronological)
  const equityCurveData = useMemo(() => {
    const closedChronological = [...trades]
      .filter(t => t.status === 'CLOSED')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let balance = startingBalance;
    const points = [{ name: 'Début', capital: balance, pnl: 0 }];

    closedChronological.forEach((t, index) => {
      const pnl = t.pnl || 0;
      balance += pnl;
      points.push({
        name: `T${index + 1} (${t.symbol})`,
        capital: Number(balance.toFixed(2)),
        pnl: Number(pnl.toFixed(2))
      });
    });

    return points;
  }, [trades, startingBalance]);

  // Behavioral, psychological, and mistake metrics calculation
  const behavioralStats = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    
    const emotionMap: { [key: string]: { count: number; wins: number; losses: number; pnl: number } } = {};
    const mistakeMap: { [key: string]: { count: number; wins: number; losses: number; pnl: number } } = {};
    
    let totalRating = 0;
    let ratingCount = 0;

    closedTrades.forEach(t => {
      if (t.rating) {
        totalRating += t.rating;
        ratingCount++;
      }

      const pTags = t.psychologyTags || [];
      pTags.forEach(tag => {
        if (!emotionMap[tag]) {
          emotionMap[tag] = { count: 0, wins: 0, losses: 0, pnl: 0 };
        }
        emotionMap[tag].count++;
        emotionMap[tag].pnl += t.pnl || 0;
        if ((t.pnl || 0) > 0) emotionMap[tag].wins++;
        else emotionMap[tag].losses++;
      });

      const mTags = t.mistakeTags || [];
      mTags.forEach(tag => {
        if (!mistakeMap[tag]) {
          mistakeMap[tag] = { count: 0, wins: 0, losses: 0, pnl: 0 };
        }
        mistakeMap[tag].count++;
        mistakeMap[tag].pnl += t.pnl || 0;
        if ((t.pnl || 0) > 0) mistakeMap[tag].wins++;
        else mistakeMap[tag].losses++;
      });
    });

    const averageDisciplineRating = ratingCount > 0 ? totalRating / ratingCount : 0;

    const emotionsList = Object.keys(emotionMap).map(name => ({
      name,
      ...emotionMap[name]
    })).sort((a, b) => b.count - a.count);

    const mistakesList = Object.keys(mistakeMap).map(name => ({
      name,
      ...mistakeMap[name]
    })).sort((a, b) => b.count - a.count);

    return {
      emotionsList,
      mistakesList,
      averageDisciplineRating,
      closedTradesCount: closedTrades.length
    };
  }, [trades]);

  // Setup performance breakdowns
  const setupPerformanceData = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const setupsMap: { [key: string]: { name: string; profit: number; count: number } } = {};

    closedTrades.forEach(t => {
      const setup = t.setup || "Autre / Aucun";
      const pnl = t.pnl || 0;
      if (!setupsMap[setup]) {
        setupsMap[setup] = { name: setup, profit: 0, count: 0 };
      }
      setupsMap[setup].profit += pnl;
      setupsMap[setup].count += 1;
    });

    return Object.values(setupsMap).map(s => ({
      name: s.name,
      profit: Number(s.profit.toFixed(2)),
      count: s.count
    })).sort((a, b) => b.profit - a.profit);
  }, [trades]);

  // Distribution chart Data (Win vs Loss)
  const winLossPieData = useMemo(() => {
    return [
      { name: 'Gagnants', value: stats.totalWins, color: '#10B981' },
      { name: 'Perdants', value: stats.totalLosses, color: '#EF4444' }
    ].filter(item => item.value > 0);
  }, [stats]);

  const formattedPnl = (val: number) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  return (
    <div className="space-y-6">
      
      {/* Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fadeInUp">
        
        <div className={`bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-5 rounded-2xl flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:border-sky-500/25 ${stats.netProfit >= 0 ? 'glow-emerald-card' : 'glow-rose-card'}`} id="metric-net-profit">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mb-3">
            <span>Bénéfice Net</span>
            <div className={`p-1.5 rounded-lg ${stats.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black font-mono tracking-tight ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formattedPnl(stats.netProfit)}
            </div>
            <p className="text-slate-500 text-xs mt-1.5 font-medium">
              Solde: <span className="text-slate-300 font-bold font-mono">{(startingBalance + stats.netProfit).toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</span>
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-5 rounded-2xl flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:border-sky-500/25 glow-sky-card" id="metric-win-rate">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mb-3">
            <span>Taux de Réussite</span>
            <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg">
              <Target className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="w-full bg-[#0A0B0D] h-2 rounded-full mt-2.5 overflow-hidden border border-white/5">
              <div 
                className="bg-gradient-to-r from-sky-500 to-sky-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stats.winRate}%` }}
              />
            </div>
            <p className="text-slate-500 text-xs mt-2 font-medium">
              <span className="text-emerald-400 font-bold">{stats.totalWins} {language === 'en' ? 'Wins' : 'Gagnants'}</span> <span className="text-slate-600">/</span> <span className="text-rose-400 font-bold">{stats.totalLosses} {language === 'en' ? 'Losses' : 'Perdants'}</span>
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-5 rounded-2xl flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:border-sky-500/25" id="metric-profit-factor">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mb-3">
            <span>Facteur de Profit</span>
            <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black font-mono tracking-tight ${stats.profitFactor >= 2 ? 'text-emerald-400' : stats.profitFactor >= 1 ? 'text-amber-400' : 'text-rose-400'}`}>
              {stats.profitFactor.toFixed(2)}
            </div>
            <p className="text-slate-400 text-xs mt-1.5 font-bold flex items-center gap-1">
              {stats.profitFactor >= 1.5 ? (
                <>
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-emerald-400 text-[11px] font-bold">✓ Excellent facteur</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                  <span className="text-amber-400 text-[11px] font-bold">⚠ Amélioration possible</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-5 rounded-2xl flex flex-col justify-between transition-all hover:translate-y-[-2px] hover:border-sky-500/25" id="metric-avg-win-loss">
          <div className="flex items-center justify-between text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mb-3">
            <span>Moyennes Gain/Perte</span>
            <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg font-black font-mono text-slate-100 flex items-center gap-1.5">
              <span className="text-emerald-400">+{stats.averageWin.toFixed(0)}</span>
              <span className="text-slate-600 font-normal">/</span>
              <span className="text-rose-400">-{stats.averageLoss.toFixed(0)}</span>
            </div>
            <p className="text-slate-400 text-[11px] mt-2 font-bold font-sans">
              Ratio R:R Moyen: <span className="text-sky-400 font-mono font-extrabold">{stats.averageLoss > 0 ? (stats.averageWin / stats.averageLoss).toFixed(2) : '0.00'}</span>
            </p>
          </div>
        </div>

      </div>

      {/* SECTION: BARRE DE PROGRESSION QUOTIDIENNE & RISK MANAGER DYNAMIQUE */}
      <div className="bg-[#161B22] border border-white/5 rounded-2xl overflow-hidden p-5 shadow-xl relative" id="daily-progress-widget">
        
        {/* Glow Effects */}
        {dailyStats.todayPnL > 0 && (
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none" />
        )}
        {dailyStats.todayPnL < 0 && (
          <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 rounded-full blur-[60px] pointer-events-none" />
        )}

        {/* Top Header of the Widget */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              dailyStats.todayPnL > 0 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : dailyStats.todayPnL < 0 
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-450' 
                  : 'bg-slate-500/10 border-white/5 text-slate-400'
            }`}>
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs font-black uppercase tracking-wider font-mono text-slate-100">
                  Risk & Objectif Quotidien (Guidage IA)
                </h3>
                {dailyStats.todayPnL >= dailyStats.actualDailyTarget && (
                  <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border border-amber-500/25 flex items-center gap-1">
                    <Trophy className="w-2.5 h-2.5" />
                    <span>Cible du Jour Validée</span>
                  </span>
                )}
                {dailyStats.todayPnL < 0 && dailyStats.drawdownProgressPercent >= 100 && (
                  <span className="bg-rose-500/15 text-rose-400 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border border-rose-500/30 flex items-center gap-1 animate-pulse">
                    <ShieldAlert className="w-2.5 h-2.5" />
                    <span>Drawdown Max Atteint</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                Suivi algorithmique et recommandations SMC de votre performance du jour.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setShowDailySettings(!showDailySettings)}
              className="px-2.5 py-1.5 rounded-lg border border-white/5 bg-[#0A0B0D] text-slate-400 hover:text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Configurer les rapports quotidiens"
            >
              <Settings className={`w-3.5 h-3.5 ${showDailySettings ? 'rotate-45' : ''} transition-transform`} />
              <span>Ajuster</span>
              {showDailySettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Dynamic configurations drawer */}
        {showDailySettings && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-[#0A0B0D] border border-white/5 rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
          >
            {/* COLUMN 1: TARGET CONFIG */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-1">
                <span className="font-bold text-slate-300 flex items-center gap-1 font-mono uppercase text-[10px]">
                  <Target className="w-3.5 h-3.5 text-emerald-400" /> Cible de profit journalière
                </span>
                <span className="font-mono text-emerald-400 font-bold text-[10px]">
                  {customDailyTarget !== '' ? `${parseFloat(customDailyTarget).toLocaleString()} ${currency}` : `${dailyTargetPercent}% (~${(startingBalance * dailyTargetPercent / 100).toLocaleString()} ${currency})`}
                </span>
              </div>
              <div className="flex gap-1.5">
                {[0.5, 1.0, 1.5, 2.0].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setDailyTargetPercent(p);
                      setCustomDailyTarget('');
                    }}
                    className={`flex-1 text-[10px] py-1 font-bold rounded border transition-colors cursor-pointer ${
                      dailyTargetPercent === p && customDailyTarget === ''
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : 'bg-[#161B22] text-slate-500 border-white/5 hover:text-slate-300'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
              <div>
                <input
                  type="number"
                  placeholder={`Montant personnalisé en ${currency} (Ex : 500)`}
                  value={customDailyTarget}
                  onChange={(e) => setCustomDailyTarget(e.target.value)}
                  className="w-full bg-[#161B22] border border-white/5 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-[#10B981]"
                />
              </div>
            </div>

            {/* COLUMN 2: DRAWDOWN CONFIG */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/5 pb-1">
                <span className="font-bold text-slate-300 flex items-center gap-1 font-mono uppercase text-[10px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Perte Max Quotidienne
                </span>
                <span className="font-mono text-rose-400 font-bold text-[10px]">
                  {customDailyDrawdown !== '' ? `${parseFloat(customDailyDrawdown).toLocaleString()} ${currency}` : `${dailyDrawdownPercent}% (~${(startingBalance * dailyDrawdownPercent / 100).toLocaleString()} ${currency})`}
                </span>
              </div>
              <div className="flex gap-1.5">
                {[1.0, 2.0, 3.0, 5.0].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setDailyDrawdownPercent(p);
                      setCustomDailyDrawdown('');
                    }}
                    className={`flex-1 text-[10px] py-1 font-bold rounded border transition-colors cursor-pointer ${
                      dailyDrawdownPercent === p && customDailyDrawdown === ''
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/25'
                        : 'bg-[#161B22] text-slate-500 border-white/5 hover:text-slate-300'
                    }`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
              <div>
                <input
                  type="number"
                  placeholder={`Montant personnalisé en ${currency} (Ex : 1000)`}
                  value={customDailyDrawdown}
                  onChange={(e) => setCustomDailyDrawdown(e.target.value)}
                  className="w-full bg-[#161B22] border border-white/5 rounded-lg p-2 text-xs font-mono text-slate-200 focus:outline-[#EF4444]"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Summary row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-[#0A0B0D] p-3 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block mb-0.5">Performance Actuelle</span>
            <span className={`text-sm font-bold font-mono ${dailyStats.todayPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {dailyStats.todayPnL >= 0 ? '+' : ''}{dailyStats.todayPnL.toLocaleString(undefined, { minimumFractionDigits: 1 })} {currency}
            </span>
          </div>

          <div className="bg-[#0A0B0D] p-3 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block mb-0.5">Nombre d'opérations</span>
            <span className="text-sm font-bold text-slate-200 font-mono">
              {dailyStats.todayTrades.length} closed <span className="text-[10px] text-slate-500 font-normal">({dailyStats.todayWins}W / {dailyStats.todayLosses}L)</span>
            </span>
          </div>

          <div className="bg-[#0A0B0D] p-3 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block mb-0.5">Objectif Profit du Jour</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {dailyStats.actualDailyTarget.toLocaleString()} {currency}
            </span>
          </div>

          <div className="bg-[#0A0B0D] p-3 rounded-xl border border-white/5">
            <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block mb-0.5">Perte Maximum Quotidienne</span>
            <span className="text-sm font-bold text-rose-500 font-mono">
              {dailyStats.actualDailyDrawdown.toLocaleString()} {currency}
            </span>
          </div>
        </div>

        {/* PROGRESS BARS HOUSING CONTAINER */}
        <div className="space-y-5 bg-[#0A0B0D] p-4 rounded-xl border border-white/5">
          {dailyStats.todayPnL >= 0 ? (
            /* STATE 1: POSITIVE OR NEUTRAL PROGRESSION */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-400 flex items-center gap-1 font-mono uppercase text-[10px]">
                  <TrendingUp className="w-3.5 h-3.5" /> Progression vers le profit journalier
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  {dailyStats.progressPercent.toFixed(1)}% atteints
                </span>
              </div>
              
              <div className="w-full bg-[#161B22] h-4 rounded-full overflow-hidden p-0.5 border border-white/5 flex items-center">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyStats.progressPercent}%` }}
                  transition={{ type: "spring", stiffness: 60, damping: 15 }}
                  className={`h-full rounded-full transition-all relative overflow-hidden ${
                    dailyStats.progressPercent >= 100 
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 animate-pulse' 
                      : 'bg-gradient-to-r from-sky-600 via-teal-500 to-emerald-500'
                  }`}
                  style={{ minWidth: dailyStats.todayPnL > 0 ? '4%' : '0%' }}
                >
                  {/* Subtle shining light stream inside filled bar */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full" />
                </motion.div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1">
                <span>0 {currency}</span>
                {dailyStats.todayPnL >= dailyStats.actualDailyTarget ? (
                  <span className="text-amber-400 font-bold flex items-center gap-1 uppercase tracking-wider">
                    🔥 Cible complétée : {dailyStats.todayPnL - dailyStats.actualDailyTarget >= 1 ? `Excédent de +${(dailyStats.todayPnL - dailyStats.actualDailyTarget).toFixed(1)} ${currency}` : 'Gain validé !'}
                  </span>
                ) : (
                  <span>Manque : <strong className="text-emerald-400 font-bold">+{(dailyStats.actualDailyTarget - dailyStats.todayPnL).toFixed(1)} {currency}</strong> pour atteindre l'objectif</span>
                )}
                <span>{dailyStats.actualDailyTarget.toLocaleString()} {currency}</span>
              </div>
            </div>
          ) : (
            /* STATE 2: DRAWDOWN / NEGATIVE PROGRESSION GAUGE */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-400 flex items-center gap-1 font-mono uppercase text-[10px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-bounce" /> Consommation de Drawdown Quotidien
                </span>
                <span className="font-mono text-rose-450 font-bold">
                  {dailyStats.drawdownProgressPercent.toFixed(1)}% consommés
                </span>
              </div>

              <div className="w-full bg-[#161B22] h-4 rounded-full overflow-hidden p-0.5 border border-white/5 flex items-center">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyStats.drawdownProgressPercent}%` }}
                  transition={{ type: "spring", stiffness: 60, damping: 15 }}
                  className={`h-full rounded-full relative overflow-hidden ${
                    dailyStats.drawdownProgressPercent >= 90
                      ? 'bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 text-rose-300'
                      : 'bg-gradient-to-r from-amber-500 to-rose-500'
                  }`}
                  style={{ minWidth: '4%' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full" />
                </motion.div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono pt-1">
                <span>0 {currency}</span>
                {dailyStats.drawdownProgressPercent >= 100 ? (
                  <span className="text-rose-400 font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
                    🚨 ADVISOR : LIMITE DE PERTE EXTRASÉCURITÉ BRÛLÉE !
                  </span>
                ) : (
                  <span>Buffer restant : <strong className="text-emerald-400 font-bold">{(dailyStats.actualDailyDrawdown - dailyStats.drawdownSpentAmount).toFixed(1)} {currency}</strong> avant blocage</span>
                )}
                <span>-{dailyStats.actualDailyDrawdown.toLocaleString()} {currency} Max</span>
              </div>
            </div>
          )}

          {/* AI Advisor Panel inside progress bar housing */}
          <div className="bg-[#161B22]/50 border border-white/5 rounded-xl p-3 flex gap-2.5 items-start">
            <div className="bg-[#0A0B0D] p-1.5 rounded-lg border border-white/5 text-[10px] font-mono text-sky-450 font-black tracking-wide shrink-0">
              CONSEIL IA
            </div>
            
            <div className="text-[11px] text-slate-300 leading-normal font-medium">
              {dailyStats.todayPnL >= dailyStats.actualDailyTarget ? (
                <span>
                  <strong className="text-amber-400 flex items-center gap-1 mb-0.5">
                    <Trophy className="w-3.5 h-3.5 stroke-[2.5]" /> Objectif de session validé !
                  </strong>
                  Félicitations. Notre modèle vous conseille de stopper immédiatement vos terminaux de trading. Prendre une position supplémentaire après avoir validé votre cible quotidienne expose votre portefeuille à l'effet d'emballement émotionnel ("Over-trading").
                </span>
              ) : dailyStats.todayPnL > 0 ? (
                <span>
                  <strong className="text-emerald-400 flex items-center gap-1 mb-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Solde au vert (+{dailyStats.todayPnL.toLocaleString()} {currency})
                  </strong>
                  Progression de {dailyStats.progressPercent.toFixed(1)}% vers votre objectif du jour. Votre ratio moyen d'aujourd'hui démontre un bon contrôle. N'accélérez pas vos lots, fiez-vous uniquement aux configurations de haute probabilité (A+ setup).
                </span>
              ) : dailyStats.todayPnL === 0 ? (
                <span>
                  <strong className="text-sky-400 flex items-center gap-1 mb-0.5">
                    <Clock className="w-3.5 h-3.5 text-sky-400" /> Attente d'opportunité
                  </strong>
                  Aucun trade clôturé ce jour pour le moment. Pratiquez le filtrage de patience recommandé par le coach IA. Attendez la prise de liquidité de session (Londres/New York) et vérifiez les annonces économiques avant d'agir.
                </span>
              ) : dailyStats.drawdownProgressPercent < 50 ? (
                <span>
                  <strong className="text-amber-400 flex items-center gap-1 mb-0.5">
                    <Info className="w-3.5 h-3.5 text-amber-500" /> Perte mineure sous contrôle (-{Math.abs(dailyStats.todayPnL).toLocaleString()} {currency})
                  </strong>
                  Consommation de {dailyStats.drawdownProgressPercent.toFixed(1)}% du drawdown de déblocage journalier. Ne tentez pas de regagner cette perte sur un coup de tête ("revenge-trading"). Conservez votre plan de gestion du risque initial.
                </span>
              ) : dailyStats.drawdownProgressPercent < 100 ? (
                <span>
                  <strong className="text-rose-400 flex items-center gap-1 mb-0.5 animate-pulse">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> ZONE DE STRESS DÉCELÉE
                  </strong>
                  Attention : Vous avez perdu {dailyStats.drawdownProgressPercent.toFixed(1)}% de la limite quotidienne admissible ({dailyStats.drawdownSpentAmount.toLocaleString()} {currency}). Pour lisser l'érosion, divisez par deux vos tailles de positions sur le prochain trade. La survie est la première clé !
                </span>
              ) : (
                <span>
                  <strong className="text-rose-500 flex items-center gap-1 mb-0.5 animate-pulse">
                    <Lock className="w-3.5 h-3.5" /> BLOCAGE OPÉRATIONNEL REQUIS
                  </strong>
                  Alerte Drawdown : Perte journalière admissible consumée. S'obstiner mènera à des violations systématiques de compte ou de challenge Prop Firm. Videz vos graphiques. Allez vous aérer ou faites une re-visualisation mentale neutre.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* TODAY'S TRANSACTIONS MICRO-LOG PANEL */}
        {dailyStats.todayTrades.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-[10px] font-black uppercase text-slate-300 tracking-wider font-mono">
                Transactions Clôturées Aujourd'hui ({dailyStats.todayTrades.length})
              </span>
            </div>
            
            <div className="overflow-x-auto rounded-lg border border-white/5 bg-[#0A0B0D]">
              <table className="w-full text-left text-[11px] text-slate-400">
                <thead>
                  <tr className="border-b border-white/5 bg-[#161B22]/50 text-slate-500 uppercase tracking-wider text-[9px] font-mono">
                    <th className="p-2 pl-3">Heure de Sortie</th>
                    <th className="p-2">Symbole</th>
                    <th className="p-2">Sens</th>
                    <th className="p-2">Plan / Setup</th>
                    <th className="p-2 pr-3 text-right">PnL Net réalisé</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/2 font-mono">
                  {dailyStats.todayTrades.map((t) => {
                    const timeStr = t.closedAt ? new Date(t.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                    const isWin = (t.pnl || 0) > 0;
                    return (
                      <tr key={t.id} className="hover:bg-white/2 transition-colors">
                        <td className="p-2 pl-3 text-slate-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{timeStr}</span>
                        </td>
                        <td className="p-2 font-black text-slate-200">{t.symbol}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wide ${
                            t.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {t.direction}
                          </span>
                        </td>
                        <td className="p-2 text-slate-400 text-xs font-sans truncate max-w-[120px]" title={t.setup}>
                          {t.setup || 'SMC'}
                        </td>
                        <td className={`p-2 pr-3 text-right font-bold ${isWin ? 'text-emerald-400' : 'text-rose-500'}`}>
                          {isWin ? '+' : ''}{(t.pnl || 0).toLocaleString()} {currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {stats.totalTrades === 0 ? (
        <div className="bg-[#161B22]/50 border border-white/5 p-12 rounded-xl text-center">
          <PieIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">Aucune donnée disponible</h3>
          <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
            Une fois vos premiers trades complétés et clôturés, vous aurez accès aux graphiques de performance et d'analyse d'équité.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Equity progression */}
          <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-6 rounded-2xl lg:col-span-2 flex flex-col justify-between shadow-xl glow-sky-card relative overflow-hidden" id="chart-equity-curve">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-[45px] pointer-events-none" />
            <div className="relative z-10">
              <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest font-mono flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-400" /> Evolution du Capital de Trading
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Progression chronologique de votre compte de trading</p>
            </div>
            <div className="h-72 w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurveData}>
                  <defs>
                    <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={10} tickLine={false} />
                  <YAxis 
                    stroke="#64748B" 
                    fontSize={10} 
                    tickLine={false} 
                    domain={['dataMin - 100', 'dataMax + 100']}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0A0B0D', borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px' }}
                    labelStyle={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    itemStyle={{ color: '#38bdf8', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <Area type="monotone" dataKey="capital" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCapital)" name="Solde" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Setup Breakdown & Win proportion */}
          <div className="space-y-6">
            
            {/* Pie Chart Win/Loss Ratio */}
            <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-6 rounded-2xl flex flex-col justify-between shadow-xl relative overflow-hidden" id="chart-win-loss-distribution">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-[40px] pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" /> Répartition des Opérations
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Part de trades gagnants vs perdants</p>
              </div>
              <div className="flex items-center justify-around h-44 mt-4 relative z-10">
                <div className="w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={winLossPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {winLossPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0A0B0D', borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: 12, fontFamily: 'JetBrains Mono' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 text-xs font-bold">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <span className="text-slate-300">Gagnants ({stats.totalWins})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-rose-500 rounded-full" />
                    <span className="text-slate-300">Perdants ({stats.totalLosses})</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono pt-1.5 border-t border-white/5">
                    Ratio: <span className="text-sky-400">{(stats.totalWins / (stats.totalLosses || 1)).toFixed(2)} W/L</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Top performing setups list */}
            <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-6 rounded-2xl shadow-xl relative overflow-hidden" id="setup-profitability">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-[40px] pointer-events-none" />
              <div className="relative z-10">
                <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest font-mono flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" /> Profitabilité par Stratégie
                </h3>
              </div>
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1 mt-4 relative z-10 scroller-none">
                {setupPerformanceData.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Aucune stratégie répertoriée.</p>
                ) : (
                  setupPerformanceData.map((setup, index) => (
                    <div key={index} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                      <div>
                        <p className="font-bold text-slate-200">{setup.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold font-mono">Trades: {setup.count}</p>
                      </div>
                      <div className={`font-mono font-extrabold ${setup.profit >= 0 ? 'text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded' : 'text-rose-400 bg-rose-500/5 border border-rose-500/10 px-2 py-0.5 rounded'}`}>
                        {setup.profit >= 0 ? '+' : ''}{setup.profit.toFixed(2)} {currency}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

        {/* SECTION: WEEKLY PSYCHOLOGY & ERROR REVIEW JOURNAL */}
        <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 rounded-2xl p-6 mt-6 shadow-xl relative overflow-hidden animate-fade-in" id="weekly-psych-dashboard">
          {/* Subtle decoration bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500" />
          <div className="absolute -top-10 -left-10 w-44 h-44 bg-indigo-500/5 rounded-full blur-[50px] pointer-events-none" />

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 p-2.5 rounded-xl text-indigo-400">
                <BrainCircuit className="w-5 h-5" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider font-mono text-slate-100 flex items-center gap-1.5 flex-wrap">
                  Revue Psychologique & Erreurs de Fin de Semaine
                  <span className="bg-indigo-500/15 text-indigo-300 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border border-indigo-500/20">
                    SMC AI Coach
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Rapport consolidé sur votre résilience mentale et la correction des érosions de capital.
                </p>
              </div>
            </div>

            {/* Discipline Score Indicator */}
            <div className="bg-[#0A0B0D] border border-white/5 rounded-xl p-3 flex items-center gap-4 shrink-0 self-stretch sm:self-auto justify-between">
              <div>
                <span className="text-[9px] text-slate-500 uppercase font-black tracking-wider block mb-0.5">Discipline Globale</span>
                <span className="text-sm font-bold font-mono text-amber-400">
                  {behavioralStats.averageDisciplineRating > 0 ? `${behavioralStats.averageDisciplineRating.toFixed(1)} / 5` : 'N/A'}
                </span>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const rounded = Math.round(behavioralStats.averageDisciplineRating || 3);
                  return (
                    <Trophy 
                      key={star} 
                      className={`w-3.5 h-3.5 ${star <= rounded ? 'text-amber-450 fill-amber-450 text-amber-400' : 'text-slate-800'}`} 
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Column 1: Emotions Breakdown */}
            <div className="bg-[#0A0B0D] p-5 rounded-xl border border-white/5 space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider font-mono flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-450" />
                  Impact Psychologique & Émotions
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Fréquence et impact financier de vos états émotionnels.
                </p>
              </div>

              <div className="space-y-3">
                {behavioralStats.emotionsList.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-slate-500 italic">Aucune émotion répertoriée dans vos trades.</p>
                  </div>
                ) : (
                  behavioralStats.emotionsList.map((tag) => {
                    const isWinFactor = tag.wins / (tag.count || 1) >= 0.5;
                    const isPnlPositive = tag.pnl >= 0;
                    return (
                      <div key={tag.name} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-bold text-slate-200 bg-white/5 px-2 py-0.5 rounded text-[10px]">
                            {tag.name}
                          </span>
                          <span className={`font-mono font-bold ${isPnlPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPnlPositive ? '+' : ''}{tag.pnl.toLocaleString()} {currency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Fidélité : <strong className="text-slate-200">{tag.count} trades</strong></span>
                          <span>Wins : <strong className={isWinFactor ? 'text-emerald-400' : 'text-rose-450'}>{((tag.wins / tag.count) * 100).toFixed(0)}%</strong></span>
                        </div>
                        <div className="w-full bg-[#161B22] h-1 rounded-full overflow-hidden mt-1.5">
                          <div 
                            className={`h-full rounded-full ${isPnlPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, (tag.count / behavioralStats.closedTradesCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 2: Mistakes Breakdown */}
            <div className="bg-[#0A0B0D] p-5 rounded-xl border border-white/5 space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  Erosion des Pertes & Erreurs Commises
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Identifier les dérives techniques de la semaine pour stopper l'usure.
                </p>
              </div>

              <div className="space-y-3">
                {behavioralStats.mistakesList.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-xs text-slate-500 italic">Aucune dérive ou erreur répertoriée. Idéal !</p>
                  </div>
                ) : (
                  behavioralStats.mistakesList.map((tag) => {
                    const isNoMistake = tag.name.includes('No Mistake') || tag.name.includes('None') || tag.name.includes('✅');
                    return (
                      <div key={tag.name} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            isNoMistake 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/10'
                          }`}>
                            {tag.name}
                          </span>
                          <span className={`font-mono font-bold ${tag.pnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                            {tag.pnl >= 0 ? '+' : ''}{tag.pnl.toLocaleString()} {currency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                          <span>Occurrences : <strong className="text-slate-200">{tag.count} fois</strong></span>
                          <span>Taux : <strong className={tag.wins >= tag.losses ? 'text-emerald-400' : 'text-rose-450'}>{((tag.wins / tag.count) * 100).toFixed(0)}%</strong></span>
                        </div>
                        <div className="w-full bg-[#161B22] h-1 rounded-full overflow-hidden mt-1.5">
                          <div 
                            className={`h-full rounded-full ${isNoMistake ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(100, (tag.count / behavioralStats.closedTradesCount) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Column 3: AI Advice Report Panel */}
            <div className="bg-[#0A0B0D] p-5 rounded-xl border border-white/5 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider font-mono flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" />
                  Diagnostic IA & Actions Correctives
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Plan de travail psychologique et comportemental de week-end.
                </p>
              </div>

              {/* Dynamic Advisor advice */}
              <div className="bg-[#161B22]/50 border border-white/5 rounded-lg p-3.5 space-y-3 flex-1 mt-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-wider font-mono text-indigo-400 block">
                    Points Vulnérables Identifiés
                  </span>
                  <div className="text-xs text-slate-300 font-medium leading-relaxed">
                    {behavioralStats.mistakesList.length > 0 && behavioralStats.mistakesList[0] && !behavioralStats.mistakesList[0].name.includes('No Mistake') ? (
                      <span>
                        L'erreur principale sabotant vos statistiques est : <strong className="text-rose-400 font-bold">{behavioralStats.mistakesList[0].name}</strong> ({behavioralStats.mistakesList[0].count} fois). Son coût financier s'élève à <strong className="text-rose-400 font-bold">{behavioralStats.mistakesList[0].pnl.toLocaleString()} {currency}</strong>.
                      </span>
                    ) : behavioralStats.emotionsList.length > 0 ? (
                      <span>
                        L'état d'esprit récurrent impactant vos décisions est : <strong className="text-sky-450 font-bold">{behavioralStats.emotionsList[0].name}</strong>. C'est le principal facteur limitant votre progression.
                      </span>
                    ) : (
                      <span>
                        Aucune dérive statistique majeure décelée cette semaine ! Vos émotions et techniques de filtrage des trades respectent fermement votre cahier des charges de trader professionnel.
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1 border-t border-white/5 pt-3">
                  <span className="text-[9px] font-black uppercase tracking-wider font-mono text-emerald-400 block">
                    Plan d'Action de Fin de Semaine
                  </span>
                  <div className="text-xs text-slate-300 leading-relaxed font-medium">
                    {behavioralStats.mistakesList.length > 0 && behavioralStats.mistakesList[0] && behavioralStats.mistakesList[0].name.includes('Over-leveraging') ? (
                      <span>
                        👉 <strong className="text-emerald-400 block font-bold mt-1 mb-0.5">Lissage de levier :</strong> Limitez le risque maximum à 0.5% ou 1% par trade sur vos prochaines sessions. Ne tradez que 1 seul lot fixe jusqu'à correction.
                      </span>
                    ) : behavioralStats.mistakesList.length > 0 && behavioralStats.mistakesList[0] && behavioralStats.mistakesList[0].name.includes('Moved SL') ? (
                      <span>
                        👉 <strong className="text-emerald-400 block font-bold mt-1 mb-0.5">Règle 'Set & Forget' :</strong> Ce week-end, entraînez-vous à lâcher vos positions après l'entrée. Ne touchez plus jamais aux limites si le trade est ouvert !
                      </span>
                    ) : behavioralStats.emotionsList.length > 0 && behavioralStats.emotionsList[0] && behavioralStats.emotionsList[0].name.includes('FOMO') ? (
                      <span>
                        👉 <strong className="text-emerald-400 block font-bold mt-1 mb-0.5">Filtrage de patience :</strong> Pratiquez la respiration de cohérence cardiaque 2 minutes avant de lancer l'ordre. Attendez impérativement un CHoCH ou MSS 1M/5M.
                      </span>
                    ) : behavioralStats.emotionsList.length > 0 && behavioralStats.emotionsList[0] && behavioralStats.emotionsList[0].name.includes('Revenge') ? (
                      <span>
                        👉 <strong className="text-emerald-400 block font-bold mt-1 mb-0.5">Verrouillage de perte :</strong> Règle des deux stops consécutifs. Dès que 2 transactions échouent, obligation absolue de fermer l'ordinateur pendant 4 heures.
                      </span>
                    ) : (
                      <span>
                        👉 <strong className="text-emerald-400 block font-semibold mt-1 mb-0.5">Pratique de la Déconnexion :</strong> Tout est en ordre. Votre processus opérationnel est idéal. Coupez l'accès aux graphiques ce week-end pour recharger vos réserves mentales.
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Weekend checklist */}
              <div className="bg-[#0A0B0D] p-3 rounded-lg border border-white/5 mt-3 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-300">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                  <span>Checklist de Fin de Semaine</span>
                </div>
                <p>1. Exportez vos captures de graphiques clôturés.</p>
                <p>2. Éteignez vos terminaux vendredi soir à 22h00.</p>
                <p>3. Planifiez vos zones H4 dimanche soir.</p>
              </div>
            </div>
          </div>
        </div>
      </>
    )}

    </div>
  );
}
