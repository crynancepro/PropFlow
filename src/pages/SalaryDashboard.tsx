import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building, 
  Calendar, 
  ChevronDown, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  HelpCircle, 
  Clock, 
  Award, 
  Coins, 
  Zap, 
  Scale, 
  ArrowUpRight,
  Info,
  Percent,
  ShieldAlert,
  CheckCircle,
  Wallet,
  RefreshCw,
  Plus,
  Trash,
  PlusCircle,
  Sparkles,
  Lock,
  Check,
  TrendingDown as TrendDownIcon
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, AreaChart, Area } from 'recharts';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { Trade } from '../types';

interface SalaryDashboardProps {
  trades: Trade[];
  language: Language;
  currency: string;
}

export default function SalaryDashboard({ trades, language, currency }: SalaryDashboardProps) {
  const isFr = language === 'fr';

  // State
  const [profitSplit, setProfitSplit] = useState<number>(() => {
    const saved = localStorage.getItem('trading_profit_split');
    return saved ? Number(saved) : 80;
  });
  const [capital, setCapital] = useState<number>(() => {
    const saved = localStorage.getItem('trading_prop_firm_capital');
    return saved ? Number(saved) : 100000;
  });
  const [propFirmName, setPropFirmName] = useState<string>(() => {
    const saved = localStorage.getItem('trading_prop_firm_name');
    return saved || 'FTMO';
  });
  const [targetPercent, setTargetPercent] = useState<number>(() => {
    const saved = localStorage.getItem('trading_prop_firm_target_percent');
    return saved ? Number(saved) : 8; // Default 8% target
  });
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState<number>(0);
  const [chartView, setChartView] = useState<'bar' | 'equity'>('bar');
  
  // Payouts history
  const [payouts, setPayouts] = useState<{
    id: string;
    date: string;
    amount: number;
    propFirm: string;
    status: 'PAID' | 'PENDING';
  }[]>(() => {
    const saved = localStorage.getItem('trading_payouts_history');
    return saved ? JSON.parse(saved) : [
      { id: 'p1', date: '2026-05-15', amount: 5320.00, propFirm: 'FTMO', status: 'PAID' },
      { id: 'p2', date: '2026-06-10', amount: 3120.50, propFirm: 'FundedNext', status: 'PAID' }
    ];
  });

  // New payout form states
  const [showAddPayoutForm, setShowAddPayoutForm] = useState(false);
  const [newPayoutDate, setNewPayoutDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newPayoutAmount, setNewPayoutAmount] = useState('');
  const [newPayoutFirm, setNewPayoutFirm] = useState('FTMO');
  const [newPayoutStatus, setNewPayoutStatus] = useState<'PAID' | 'PENDING'>('PAID');

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('trading_profit_split', String(profitSplit));
  }, [profitSplit]);

  useEffect(() => {
    localStorage.setItem('trading_prop_firm_capital', String(capital));
  }, [capital]);

  useEffect(() => {
    localStorage.setItem('trading_prop_firm_name', propFirmName);
  }, [propFirmName]);

  useEffect(() => {
    localStorage.setItem('trading_prop_firm_target_percent', String(targetPercent));
  }, [targetPercent]);

  useEffect(() => {
    localStorage.setItem('trading_payouts_history', JSON.stringify(payouts));
  }, [payouts]);

  // 1. Génération dynamique des 18 derniers mois de manière future-proof
  const periods = useMemo(() => {
    const monthsFr = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    const monthsEn = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const arr = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 18; i++) {
      const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yVal = d.getFullYear();
      const monthLabel = isFr ? monthsFr[mIdx] : monthsEn[mIdx];
      
      arr.push({
        value: `${yVal}-${String(mIdx + 1).padStart(2, '0')}`,
        label: `${monthLabel} ${yVal}`,
        month: mIdx,
        year: yVal
      });
    }
    return arr;
  }, [isFr]);

  const activePeriod = periods[selectedPeriodIndex] || periods[0];

  // Helper pour formater l'argent
  const formatMoney = (val: number) => {
    const sign = val >= 0 ? '+' : '';
    const formatted = Math.abs(val).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
    return `${sign}${formatted} ${currency}`;
  };

  // 2. Logique de calcul exhaustive des gains
  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();

    // Récupérer le début de la semaine en cours (Lundi 00:00)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diffToMonday = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(today.setDate(diffToMonday));
    startOfWeek.setHours(0, 0, 0, 0);

    // Initialiser les filtres de montant
    let dailySum = 0;
    let weeklySum = 0;
    let monthlySum = 0;
    let yearlySum = 0;

    // Métriques avancées du mois sélectionné
    let monthlyWins = 0;
    let monthlyLosses = 0;
    let bestDayPnL = 0;
    let worstDayPnL = 0;
    const dailyGroupings: Record<string, number> = {};

    // Parcourir tous les trades fermés de l'utilisateur
    trades.forEach(t => {
      if (t.status !== 'CLOSED' || !t.closedAt || t.pnl === undefined) return;
      
      const closedDate = new Date(t.closedAt);
      const tradePnl = t.pnl;

      // a) Gain Journalier (Aujourd'hui)
      if (closedDate.toDateString() === todayStr) {
        dailySum += tradePnl;
      }

      // b) Gain Hebdomadaire (Cette semaine)
      if (closedDate >= startOfWeek) {
        weeklySum += tradePnl;
      }

      // c) Gain Mensuel (Du mois sélectionné dans le filtre dropdown)
      if (
        closedDate.getMonth() === activePeriod.month && 
        closedDate.getFullYear() === activePeriod.year
      ) {
        monthlySum += tradePnl;

        // Regroupements quotidiens pour calculer le meilleur/pire jour du mois
        const dateKey = closedDate.toDateString();
        dailyGroupings[dateKey] = (dailyGroupings[dateKey] || 0) + tradePnl;

        if (tradePnl >= 0) {
          monthlyWins++;
        } else {
          monthlyLosses++;
        }
      }

      // d) Gain Annuel (Cumul de l'année du mois sélectionné)
      if (closedDate.getFullYear() === activePeriod.year) {
        yearlySum += tradePnl;
      }
    });

    // Déterminer le meilleur et le pire jour du mois sélectionné
    const dailyPnLValues = Object.values(dailyGroupings);
    if (dailyPnLValues.length > 0) {
      bestDayPnL = Math.max(...dailyPnLValues);
      worstDayPnL = Math.min(...dailyPnLValues);
    }

    const totalSelectedMonthTrades = monthlyWins + monthlyLosses;
    const monthlyWinRate = totalSelectedMonthTrades > 0 
      ? Math.round((monthlyWins / totalSelectedMonthTrades) * 100) 
      : 0;

    return {
      dailyGain: dailySum,
      weeklyGain: weeklySum,
      monthlyGain: monthlySum,
      yearlyGain: yearlySum,
      monthlyWins,
      monthlyLosses,
      monthlyWinRate,
      bestDayPnL,
      worstDayPnL,
      totalSelectedMonthTrades
    };
  }, [trades, activePeriod]);

  // 3. Modélisation de la courbe des 6 derniers mois pour le graphique
  const chartData = useMemo(() => {
    const list = [...periods].slice(0, 6).reverse(); // On montre les 6 derniers mois
    return list.map(p => {
      // Calcul du net cumulé pour ce mois
      const sum = trades.reduce((acc, t) => {
        if (t.status !== 'CLOSED' || !t.closedAt || t.pnl === undefined) return acc;
        const closedDate = new Date(t.closedAt);
        if (closedDate.getMonth() === p.month && closedDate.getFullYear() === p.year) {
          return acc + t.pnl;
        }
        return acc;
      }, 0);

      const traderShare = sum > 0 ? (sum * profitSplit) / 100 : sum;

      return {
        name: p.label.split(' ')[0], // Juste le nom du mois
        'Performance brute': Math.round(sum),
        'Votre part du Payout': Math.round(traderShare)
      };
    });
  }, [trades, periods, profitSplit]);

  // Curve modelling for cumulative equity account growth
  const equityCurveData = useMemo(() => {
    const list = [...periods].slice(0, 6).reverse(); // On montre les 6 derniers mois, le plus vieux d'abord
    let runningBalance = capital;
    let runningPayouts = 0;

    return list.map(p => {
      const sum = trades.reduce((acc, t) => {
        if (t.status !== 'CLOSED' || !t.closedAt || t.pnl === undefined) return acc;
        const closedDate = new Date(t.closedAt);
        if (closedDate.getMonth() === p.month && closedDate.getFullYear() === p.year) {
          return acc + t.pnl;
        }
        return acc;
      }, 0);

      runningBalance += sum;
      const payoutVal = sum > 0 ? (sum * profitSplit) / 100 : 0;
      runningPayouts += payoutVal;

      return {
        name: p.label.split(' ')[0], // Nom du mois
        'Solde du Compte': Math.round(runningBalance),
        'Payouts Cumulés': Math.round(runningPayouts),
        'Net mensuel': Math.round(sum)
      };
    });
  }, [trades, periods, capital, profitSplit]);

  // Calcul du payout modélisé
  const traderShareAmount = stats.monthlyGain > 0 
    ? (stats.monthlyGain * profitSplit) / 100 
    : stats.monthlyGain;
  const propFirmShareAmount = stats.monthlyGain > 0 
    ? (stats.monthlyGain * (100 - profitSplit)) / 100 
    : 0;

  return (
    <div className="space-y-6" id="salary-dashboard-page">
      {/* 1. Header Section */}
      <div className="bg-[#0E1116]/80 backdrop-blur-md rounded-2xl border border-white/5 p-6 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#EC4899]/5 rounded-full blur-[40px] pointer-events-none" />
        
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-gradient-to-tr from-pink-500/10 to-purple-500/10 border border-pink-500/20 text-pink-400 rounded-xl">
              <Coins className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                {isFr ? 'Suivi des Revenus & Payouts' : 'Income & Payouts Tracker'}
              </h2>
              <p className="text-xs text-slate-400 font-semibold font-mono tracking-wider uppercase mt-0.5">
                {isFr ? 'Prop Firm & Performance Financière' : 'Prop Firm & Performance Dashboard'}
              </p>
            </div>
          </div>
        </div>

        {/* Dropdown de Filtrage de la période de revenus */}
        <div className="flex items-center gap-3">
          <div className="relative inline-block text-left">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pink-400 shrink-0" />
              <select
                value={selectedPeriodIndex}
                onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
                className="bg-[#0A0B0D] hover:bg-slate-900 border border-white/10 px-4 py-2.5 rounded-xl text-xs font-black text-slate-200 focus:outline-none focus:ring-1 focus:ring-pink-500 cursor-pointer appearance-none pr-10 shadow-lg min-w-[150px]"
              >
                {periods.map((p, idx) => (
                  <option key={p.value} value={idx}>
                    {p.label}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-3.5 pointer-events-none text-slate-400">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Les 4 Cartes KPIs (Scorecards conforme USD / Rouge ou Vert) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gain Journalier (Aujourd'hui) */}
        <div className={`border rounded-2xl p-5 space-y-3 relative hover:scale-[1.02] transition-all flex flex-col justify-between shadow-xl overflow-hidden group min-h-[125px] ${
          stats.dailyGain >= 0 
            ? 'bg-gradient-to-br from-[#0E1116] to-[#0b241b]/20 border-emerald-500/15 shadow-emerald-950/10' 
            : 'bg-gradient-to-br from-[#0E1116] to-[#220d12]/20 border-rose-500/15 shadow-rose-950/10'
        }`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.01] rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 font-mono flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.dailyGain >= 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`} />
              {isFr ? "Aujourd'hui" : "Today"}
            </span>
            <span className={`p-1.5 rounded-lg border ${
              stats.dailyGain >= 0 
                ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/10 text-rose-400'
            }`}>
              <Clock className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="space-y-1">
            <div className={`text-2xl font-black font-mono tracking-tight ${stats.dailyGain >= 0 ? 'text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.2)]' : 'text-rose-400 drop-shadow-[0_2px_8px_rgba(244,63,94,0.2)]'}`}>
              {formatMoney(stats.dailyGain)}
            </div>
            <p className="text-[10px] text-slate-500 font-medium font-sans">
              {isFr ? "Clôturés ce jour" : "Closed trades today"}
            </p>
          </div>
        </div>

        {/* Gain Hebdomadaire (Cette semaine) */}
        <div className={`border rounded-2xl p-5 space-y-3 relative hover:scale-[1.02] transition-all flex flex-col justify-between shadow-xl overflow-hidden group min-h-[125px] ${
          stats.weeklyGain >= 0 
            ? 'bg-gradient-to-br from-[#0E1116] to-[#0b241b]/20 border-emerald-500/15 shadow-emerald-950/10' 
            : 'bg-gradient-to-br from-[#0E1116] to-[#220d12]/20 border-rose-500/15 shadow-rose-950/10'
        }`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.01] rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 font-mono flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.weeklyGain >= 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`} />
              {isFr ? "Cette Semaine" : "This Week"}
            </span>
            <span className={`p-1.5 rounded-lg border ${
              stats.weeklyGain >= 0 
                ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/10 text-rose-400'
            }`}>
              <Zap className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="space-y-1">
            <div className={`text-2xl font-black font-mono tracking-tight ${stats.weeklyGain >= 0 ? 'text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.2)]' : 'text-rose-400 drop-shadow-[0_2px_8px_rgba(244,63,94,0.2)]'}`}>
              {formatMoney(stats.weeklyGain)}
            </div>
            <p className="text-[10px] text-slate-500 font-medium font-sans">
              {isFr ? "Depuis lundi 00h" : "Since Monday morning"}
            </p>
          </div>
        </div>

        {/* Gain Mensuel (Du mois sélectionné) */}
        <div className={`border rounded-2xl p-5 space-y-3 relative hover:scale-[1.02] transition-all flex flex-col justify-between shadow-xl overflow-hidden group min-h-[125px] ${
          stats.monthlyGain >= 0 
            ? 'bg-gradient-to-br from-[#0E1116] to-[#0b241b]/20 border-emerald-500/15 shadow-emerald-950/10' 
            : 'bg-gradient-to-br from-[#0E1116] to-[#220d12]/20 border-rose-500/15 shadow-rose-950/10'
        }`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.01] rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 font-mono flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.monthlyGain >= 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`} />
              {isFr ? `Mois (${activePeriod.label.split(' ')[0]})` : `Month (${activePeriod.label.split(' ')[0]})`}
            </span>
            <span className={`p-1.5 rounded-lg border ${
              stats.monthlyGain >= 0 
                ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/10 text-rose-400'
            }`}>
              <Calendar className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="space-y-1">
            <div className={`text-2xl font-black font-mono tracking-tight ${stats.monthlyGain >= 0 ? 'text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.2)]' : 'text-rose-400 drop-shadow-[0_2px_8px_rgba(244,63,94,0.2)]'}`}>
              {formatMoney(stats.monthlyGain)}
            </div>
            <p className="text-[10px] text-slate-500 font-medium font-sans">
              {isFr ? `Période filtrée sélectionnée` : `Selected filter month`}
            </p>
          </div>
        </div>

        {/* Gain Annuel (Du mois sélectionné) */}
        <div className={`border rounded-2xl p-5 space-y-3 relative hover:scale-[1.02] transition-all flex flex-col justify-between shadow-xl overflow-hidden group min-h-[125px] ${
          stats.yearlyGain >= 0 
            ? 'bg-gradient-to-br from-[#0E1116] to-[#0b241b]/20 border-emerald-500/15 shadow-emerald-950/10' 
            : 'bg-gradient-to-br from-[#0E1116] to-[#220d12]/20 border-rose-500/15 shadow-rose-950/10'
        }`}>
          <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.01] rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-all" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 font-mono flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${stats.yearlyGain >= 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400 animate-pulse'}`} />
              {isFr ? `Cumul Année ${activePeriod.year}` : `Yearly Accumulation ${activePeriod.year}`}
            </span>
            <span className={`p-1.5 rounded-lg border ${
              stats.yearlyGain >= 0 
                ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/10 text-rose-400'
            }`}>
              <Award className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="space-y-1">
            <div className={`text-2xl font-black font-mono tracking-tight ${stats.yearlyGain >= 0 ? 'text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.2)]' : 'text-rose-400 drop-shadow-[0_2px_8px_rgba(244,63,94,0.2)]'}`}>
              {formatMoney(stats.yearlyGain)}
            </div>
            <p className="text-[10px] text-slate-500 font-medium font-sans">
              {isFr ? `Cumulé annuel estimé` : `Yearly performance calculation`}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Graphique Recharts et Simulateur de Partage PropFirm */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graphique de performance des 6 derniers mois (Recharts) */}
        <div className="bg-[#0E1116]/60 border border-white/5 rounded-2xl p-5 md:p-6 lg:col-span-2 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.04] pb-4">
            <div>
              <h3 className="text-xs font-black tracking-widest uppercase text-slate-300 font-mono flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-pink-400" />
                {isFr ? "Performance & Évolution" : "Performance & Growth"}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                {isFr 
                  ? "Comparez vos performances brutes mensuelles ou analysez la courbe de croissance cumulée." 
                  : "Compare monthly raw performance or analyze cumulative growth curves."}
              </p>
            </div>

            {/* Toggle de vue du Graphique */}
            <div className="flex bg-[#0A0B0D] p-1 rounded-xl border border-white/5 self-start sm:self-auto shadow-inner">
              <button
                type="button"
                onClick={() => setChartView('bar')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                  chartView === 'bar'
                    ? 'bg-pink-500/15 border border-pink-500/30 text-pink-400 font-black shadow-lg shadow-pink-950/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                📊 {isFr ? "Histogramme" : "Bar Chart"}
              </button>
              <button
                type="button"
                onClick={() => setChartView('equity')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider uppercase transition-all cursor-pointer ${
                  chartView === 'equity'
                    ? 'bg-pink-500/15 border border-pink-500/30 text-pink-400 font-black shadow-lg shadow-pink-950/20'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                📈 {isFr ? "Courbe d'Équité" : "Equity Curve"}
              </button>
            </div>
          </div>

          <div className="h-64 z-0">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#25252d" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0E1116', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '11px' }}
                    itemStyle={{ color: '#FFFFFF', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <ReferenceLine y={0} stroke="#475569" />
                  <Bar name={isFr ? "Performance brute" : "Raw Performance"} dataKey="Performance brute" fill="#38bdf8" fillOpacity={0.25} radius={[4, 4, 0, 0]} />
                  <Bar name={isFr ? "Votre part du Payout" : "Your Share"} dataKey="Votre part du Payout" fill="#f43f5e" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPayouts" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#25252d" opacity={0.3} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0E1116', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    labelStyle={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '11px' }}
                    itemStyle={{ color: '#FFFFFF', fontSize: '11px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" name={isFr ? "Balance Modélisée" : "Modelled Balance"} dataKey="Solde du Compte" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorBalance)" />
                  <Area type="monotone" name={isFr ? "Payouts Cumulés" : "Cumulative Payouts"} dataKey="Payouts Cumulés" stroke="#ec4899" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPayouts)" />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Simulateur interactif Payout Split & PropFirm Rules */}
        <div className="bg-[#0C0F14] border border-white/5 rounded-2xl p-5 md:p-6 flex flex-col justify-between space-y-5 shadow-xl">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-[10px] font-black tracking-widest uppercase text-slate-400 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>{isFr ? "Configuration & Règles Prop Firm" : "Prop Firm Setup & Rules"}</span>
              </div>
              <p className="text-[10.5px] text-slate-500 font-semibold leading-relaxed">
                {isFr 
                  ? "Configurez vos objectifs de validation de compte pour suivre votre réussite en temps réel."
                  : "Configure account validation targets to track validation requirements in real time."}
              </p>
            </div>

            {/* Sélecteurs de configuration de Capital */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="flex flex-col">
                <label className="text-[9px] text-slate-400 font-black uppercase font-mono mb-1">{isFr ? "Capital du compte" : "Account Capital"}</label>
                <select
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value))}
                  className="bg-[#0A0B0D] border border-white/5 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500 font-mono font-bold cursor-pointer"
                >
                  <option value="10000">$10,000</option>
                  <option value="25000">$25,000</option>
                  <option value="50000">$50,000</option>
                  <option value="100000">$100,000</option>
                  <option value="200000">$200,000</option>
                  <option value="300000">$300,000</option>
                  <option value="400000">$400,000</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[9px] text-slate-400 font-black uppercase font-mono mb-1">{isFr ? "Objectif cible" : "Target percentage"}</label>
                <select
                  value={targetPercent}
                  onChange={(e) => setTargetPercent(Number(e.target.value))}
                  className="bg-[#0A0B0D] border border-white/5 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-pink-500 font-mono font-bold cursor-pointer"
                >
                  <option value="5">5% (Phase 2)</option>
                  <option value="8">8% (Standard)</option>
                  <option value="10">10% (Phase 1)</option>
                  <option value="12">12%</option>
                </select>
              </div>
            </div>

            {/* Slider interactif pour le Profit Split */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-bold font-mono">
                <span className="text-slate-400">{isFr ? "Votre Part (Split)" : "Your Share (Split)"}:</span>
                <span className="text-pink-400 font-black">{profitSplit}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="100"
                step="5"
                value={profitSplit}
                onChange={(e) => setProfitSplit(Number(e.target.value))}
                className="w-full accent-pink-500 bg-slate-800 rounded-lg appearance-none h-1.5 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-bold font-mono text-slate-600">
                <span>50%</span>
                <span>80%</span>
                <span>90%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Objectifs en cours de validation */}
            <div className="border-t border-white/[0.04] pt-3.5 space-y-3">
              <div className="text-[10px] font-black uppercase text-slate-500 font-mono">
                {isFr ? "Métriques de Réussite & Risques" : "Safety & Target Checklist"}
              </div>

              {/* Règle 1: Objectif de Profit */}
              {(() => {
                const targetAmt = (capital * targetPercent) / 100;
                const progress = stats.monthlyGain > 0 ? Math.min((stats.monthlyGain / targetAmt) * 100, 100) : 0;
                const isPassed = progress >= 100;
                return (
                  <div className="space-y-1 bg-[#0A0B0D]/50 border border-white/[0.03] p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-[11px] font-bold font-mono">
                      <span className="text-slate-400 flex items-center gap-1">
                        {isPassed ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <RefreshCw className="w-3.5 h-3.5 text-pink-400 animate-spin-slow" />}
                        {isFr ? `Objectif (${targetPercent}%)` : `Target (${targetPercent}%)`}
                      </span>
                      <span className={isPassed ? "text-emerald-400 font-black" : "text-slate-300"}>
                        {Math.round(progress)}% ({Math.max(0, stats.monthlyGain).toLocaleString(undefined, { maximumFractionDigits: 0 })} / {targetAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency})
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${isPassed ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-pink-500 to-rose-400'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Règle 2: Drawdown de Sécurité quotidien */}
              {(() => {
                const dailyLimit = capital * 0.05;
                const currentDrawdown = stats.worstDayPnL < 0 ? Math.abs(stats.worstDayPnL) : 0;
                const limitUsage = Math.min((currentDrawdown / dailyLimit) * 100, 100);
                const isSafe = limitUsage < 100;
                let safetyLabel = isFr ? "Sécurité maximale" : "Max safety";
                let safetyColor = "text-emerald-400";
                if (limitUsage > 0 && limitUsage < 50) {
                  safetyLabel = isFr ? "Risque faible" : "Low risk";
                  safetyColor = "text-emerald-400";
                } else if (limitUsage >= 50 && limitUsage < 80) {
                  safetyLabel = isFr ? "Risque modéré" : "Moderate risk";
                  safetyColor = "text-amber-400";
                } else if (limitUsage >= 80) {
                  safetyLabel = isFr ? "Danger critique ! ⚠️" : "Critical limit ! ⚠️";
                  safetyColor = "text-rose-500";
                }

                return (
                  <div className="space-y-1 bg-[#0A0B0D]/50 border border-white/[0.03] p-2.5 rounded-xl">
                    <div className="flex items-center justify-between text-[11px] font-bold font-mono">
                      <span className="text-slate-400 flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                        {isFr ? "Risque Quotidien (5% max)" : "Daily Risk (5% max)"}
                      </span>
                      <span className={`font-black ${safetyColor}`}>
                        {safetyLabel} ({Math.round(limitUsage)}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full bg-gradient-to-r ${limitUsage > 75 ? 'from-amber-500 to-rose-500' : 'from-emerald-500 to-emerald-400'}`}
                        style={{ width: `${limitUsage}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Décomposition financière du mois sélectionné */}
          <div className="bg-[#0A0B0D]/80 rounded-xl p-4 border border-white/5 space-y-3">
            <div className="text-[10px] font-black uppercase text-slate-500 font-mono">
              {isFr ? `Bilan de Répartition (${activePeriod.label})` : `Payout Breakdown (${activePeriod.label})`}
            </div>
            
            <div className="space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-400">{isFr ? "Performance brute :" : "Raw performance :"}</span>
                <span className={stats.monthlyGain >= 0 ? "text-slate-200" : "text-rose-400"}>
                  {stats.monthlyGain.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                </span>
              </div>

              {stats.monthlyGain > 0 ? (
                <>
                  <div className="flex items-center justify-between font-bold text-emerald-400 pt-1.5 border-t border-white/5">
                    <span className="flex items-center gap-1">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      {isFr ? `Votre Payout (${profitSplit}%) :` : `Your Share (${profitSplit}%) :`}
                    </span>
                    <span>
                      {traderShareAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{isFr ? `Part Prop Firm (${100 - profitSplit}%) :` : `Prop Firm Share (${100 - profitSplit}%) :`}</span>
                    <span>
                      {propFirmShareAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}
                    </span>
                  </div>
                </>
              ) : (
                <div className="bg-rose-500/5 text-rose-400/80 p-2.5 rounded-lg text-[10px] flex items-start gap-1.5 leading-normal">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {isFr 
                      ? "Aucun bénéfice brut n'a été réalisé pour ce mois. Les gains doivent être positifs pour simuler le payout."
                      : "No net monthly profit recorded. Payout values require positive closed PnL values."}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
