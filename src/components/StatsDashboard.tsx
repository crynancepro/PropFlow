import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trade, TradingStats, TradingAccount } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Award, PieChart as PieIcon, Activity, DollarSign, Target, 
  BrainCircuit, ShieldAlert, AlertTriangle, Settings, Trophy, Sparkles, CheckCircle, Info, 
  ChevronDown, ChevronUp, Calendar, Clock, Lock, ShieldCheck, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';

interface StatsDashboardProps {
  trades: Trade[];
  startingBalance: number;
  currency: string;
  language?: 'fr' | 'en';
  activeAccount?: TradingAccount;
}

const SemicircleGauge = ({ 
  value, 
  max = 100, 
  label, 
  colorClass = "text-emerald-400" 
}: { 
  value: number; 
  max?: number; 
  label: string; 
  colorClass?: string;
}) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = 22;
  const circumference = Math.PI * radius; // ~69.11
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-14 h-8 flex items-center justify-center">
        <svg className="w-14 h-8 transform -rotate-180" viewBox="0 0 54 30">
          <path
            d="M 5 27 A 22 22 0 0 1 49 27"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M 5 27 A 22 22 0 0 1 49 27"
            fill="none"
            stroke="currentColor"
            className={`${colorClass} transition-all duration-500 ease-out`}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute bottom-[-1px] text-[8.5px] font-mono text-slate-300 font-bold">
          {label}
        </span>
      </div>
    </div>
  );
};

export default function StatsDashboard({ trades, startingBalance, currency, language = 'fr', activeAccount }: StatsDashboardProps) {
  
  // Prop Firm Challenge Active View Tab (Phase 1 vs Phase 2)
  const [challengePhaseView, setChallengePhaseView] = useState<'PHASE1' | 'PHASE2'>('PHASE1');

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

  // Calendar states
  const [calendarYear, setCalendarYear] = useState<number>(() => new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState<number>(() => new Date().getMonth());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);

  const handlePrevMonth = () => {
    setSelectedCalendarDay(null);
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(prev => prev - 1);
    } else {
      setCalendarMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setSelectedCalendarDay(null);
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(prev => prev + 1);
    } else {
      setCalendarMonth(prev => prev + 1);
    }
  };

  const monthFullNames = useMemo(() => {
    return language === 'fr' 
      ? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
      : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  }, [language]);

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

  // Prop Firm Challenge Realtime Metrics
  const propFirmMetrics = useMemo(() => {
    if (!activeAccount || activeAccount.type !== 'PROPFIRM') return null;

    const todayStr = new Date().toDateString();
    
    // Starting balance/capital reference
    const capital = activeAccount.startingBalance || startingBalance;
    
    // Configured targets & limits (fallback to standard Prop Firm values if undefined)
    const targetP1Pct = activeAccount.phase1TargetPercent !== undefined ? activeAccount.phase1TargetPercent : 8;
    const targetP2Pct = activeAccount.phase2TargetPercent !== undefined ? activeAccount.phase2TargetPercent : 5;
    const dailyDrawdownPct = activeAccount.dailyDrawdownPercent !== undefined ? activeAccount.dailyDrawdownPercent : 5;
    const maxDrawdownPct = activeAccount.maxDrawdownPercent !== undefined ? activeAccount.maxDrawdownPercent : 10;

    // Target currency values
    const targetP1Amt = (capital * targetP1Pct) / 100;
    const targetP2Amt = (capital * targetP2Pct) / 100;
    
    // Limits
    const dailyDrawdownAmt = (capital * dailyDrawdownPct) / 100;
    const maxDrawdownAmt = (capital * maxDrawdownPct) / 100;

    // Closed trades of this account context
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const netProfitVal = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const balanceCurrent = capital + netProfitVal;

    // Today's closed trades for Daily loss
    const todayTrades = trades.filter(t => {
      if (t.status !== 'CLOSED' || !t.closedAt) return false;
      return new Date(t.closedAt).toDateString() === todayStr;
    });
    const todayPnlVal = todayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const dailyLossCurrent = todayPnlVal < 0 ? Math.abs(todayPnlVal) : 0;

    // High peak equity to trace drawdown
    let peakBalance = capital;
    let balanceAccum = capital;
    
    const sortedTrades = [...closedTrades].sort(
      (a, b) => new Date(a.closedAt || a.createdAt).getTime() - new Date(b.closedAt || b.createdAt).getTime()
    );
    
    sortedTrades.forEach(t => {
      balanceAccum += (t.pnl || 0);
      if (balanceAccum > peakBalance) {
        peakBalance = balanceAccum;
      }
    });

    const overallLossCurrent = balanceCurrent < capital ? (capital - balanceCurrent) : 0;

    // Progression rates
    const p1Progress = Math.min(100, Math.max(0, (netProfitVal / targetP1Amt) * 100));
    const p2Progress = Math.min(100, Math.max(0, (netProfitVal / targetP2Amt) * 100));

    // Threat triggers (75% threshold)
    const dailyDrawdownRisk = dailyLossCurrent >= (dailyDrawdownAmt * 0.75);
    const maxDrawdownRisk = overallLossCurrent >= (maxDrawdownAmt * 0.75);
    const hasRisk = dailyDrawdownRisk || maxDrawdownRisk;
    
    // Hard breach
    const dailyDrawdownViolated = dailyLossCurrent >= dailyDrawdownAmt;
    const maxDrawdownViolated = overallLossCurrent >= maxDrawdownAmt;
    const isViolated = dailyDrawdownViolated || maxDrawdownViolated;

    return {
      capital,
      targetP1Pct,
      targetP2Pct,
      dailyDrawdownPct,
      maxDrawdownPct,
      targetP1Amt,
      targetP2Amt,
      dailyDrawdownAmt,
      maxDrawdownAmt,
      netProfitVal,
      balanceCurrent,
      dailyLossCurrent,
      overallLossCurrent,
      p1Progress,
      p2Progress,
      dailyDrawdownRisk,
      maxDrawdownRisk,
      hasRisk,
      isViolated,
      peakBalance
    };
  }, [activeAccount, trades, startingBalance]);

  const peakBalance = useMemo(() => {
    let balance = startingBalance;
    let peak = startingBalance;
    const closedChronological = [...trades]
      .filter(t => t.status === 'CLOSED')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    closedChronological.forEach(t => {
      balance += (t.pnl || 0);
      if (balance > peak) {
        peak = balance;
      }
    });
    return peak;
  }, [trades, startingBalance]);

  const currentDrawdownVal = useMemo(() => {
    const currentBalance = startingBalance + stats.netProfit;
    return Math.max(0, peakBalance - currentBalance);
  }, [peakBalance, startingBalance, stats.netProfit]);

  const currentDrawdownPercent = useMemo(() => {
    return peakBalance > 0 ? (currentDrawdownVal / peakBalance) * 100 : 0;
  }, [peakBalance, currentDrawdownVal]);

  const monthlyPerformance = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    
    let activeYear = new Date().getFullYear();
    if (closedTrades.length > 0) {
      const years = closedTrades.map(t => new Date(t.closedAt || t.createdAt).getFullYear());
      activeYear = Math.max(...years);
    }

    const monthsData = Array.from({ length: 12 }, (_, i) => {
      return {
        monthIndex: i, // 0 to 11
        pnl: 0,
        rValue: 0,
        tradesCount: 0
      };
    });

    closedTrades.forEach(t => {
      const date = new Date(t.closedAt || t.createdAt);
      if (date.getFullYear() === activeYear) {
        const month = date.getMonth();
        const pnl = t.pnl || 0;
        
        let rVal = 0;
        if (t.stopLoss && Math.abs(t.entryPrice - t.stopLoss) > 0) {
          const risk = Math.abs(t.entryPrice - t.stopLoss) * t.quantity;
          rVal = risk > 0 ? pnl / risk : pnl / (startingBalance * 0.01);
        } else {
          rVal = pnl / (startingBalance * 0.01);
        }

        monthsData[month].pnl += pnl;
        monthsData[month].rValue += rVal;
        monthsData[month].tradesCount += 1;
      }
    });

    const totalPnL = monthsData.reduce((sum, m) => sum + m.pnl, 0);
    const totalRValue = monthsData.reduce((sum, m) => sum + m.rValue, 0);

    return {
      year: activeYear,
      months: monthsData,
      totalPnL,
      totalRValue
    };
  }, [trades, startingBalance]);

  const barChartData = useMemo(() => {
    const monthNamesFr = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const names = language === 'fr' ? monthNamesFr : monthNamesEn;

    return monthlyPerformance.months.map((m, idx) => {
      return {
        name: names[idx],
        pnl: Number(m.pnl.toFixed(2))
      };
    });
  }, [monthlyPerformance, language]);

  // Calendar grouping and statistics useMemo
  const calendarData = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const rawDayOfWeek = firstDay.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
    // We want Monday as day 0 in our grid, so map:
    // Sunday (0) -> 6, Monday (1) -> 0, Tuesday (2) -> 1, etc.
    const emptyCells = rawDayOfWeek === 0 ? 6 : rawDayOfWeek - 1;
    const totalDays = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    
    // Group closed trades of selected month
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const dayMap: { [day: number]: { trades: Trade[]; pnl: number; winCount: number; lossCount: number } } = {};
    
    for (let d = 1; d <= totalDays; d++) {
      dayMap[d] = { trades: [], pnl: 0, winCount: 0, lossCount: 0 };
    }

    closedTrades.forEach(t => {
      const dateStr = t.closedAt || t.createdAt;
      if (!dateStr) return;
      const date = new Date(dateStr);
      if (date.getFullYear() === calendarYear && date.getMonth() === calendarMonth) {
        const day = date.getDate();
        if (dayMap[day]) {
          dayMap[day].trades.push(t);
          const pnl = t.pnl || 0;
          dayMap[day].pnl += pnl;
          if (pnl > 0) {
            dayMap[day].winCount++;
          } else if (pnl < 0) {
            dayMap[day].lossCount++;
          }
        }
      }
    });

    // Month stats calculation
    let monthlyTotalPnL = 0;
    let monthlyTradeCount = 0;
    let monthlyWinningDays = 0;
    let monthlyLosingDays = 0;
    let bestDayPnL = 0;
    let bestDayNum = 0;
    let worstDayPnL = 0;
    let worstDayNum = 0;

    let grossProfit = 0;
    let grossLoss = 0;
    let monthlyWinningTrades = 0;
    let monthlyLosingTrades = 0;
    let totalWinDaysPnL = 0;
    let totalLossDaysPnL = 0;

    Object.entries(dayMap).forEach(([dayStr, data]) => {
      const day = parseInt(dayStr);
      const pnl = data.pnl;
      monthlyTotalPnL += pnl;
      monthlyTradeCount += data.trades.length;

      data.trades.forEach(t => {
        const tPnL = t.pnl || 0;
        if (tPnL > 0) {
          grossProfit += tPnL;
          monthlyWinningTrades++;
        } else if (tPnL < 0) {
          grossLoss += Math.abs(tPnL);
          monthlyLosingTrades++;
        }
      });

      if (data.trades.length > 0) {
        if (pnl > 0) {
          monthlyWinningDays++;
          totalWinDaysPnL += pnl;
          if (pnl > bestDayPnL) {
            bestDayPnL = pnl;
            bestDayNum = day;
          }
        } else if (pnl < 0) {
          monthlyLosingDays++;
          totalLossDaysPnL += Math.abs(pnl);
          if (pnl < worstDayPnL) {
            worstDayPnL = pnl;
            worstDayNum = day;
          }
        }
      }
    });

    const activeDaysCount = monthlyWinningDays + monthlyLosingDays;
    const dayWinRate = activeDaysCount > 0 ? (monthlyWinningDays / activeDaysCount) * 100 : 0;
    const tradeWinRate = monthlyTradeCount > 0 ? (monthlyWinningTrades / monthlyTradeCount) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
    const averageWinDay = monthlyWinningDays > 0 ? totalWinDaysPnL / monthlyWinningDays : 0;
    const averageLossDay = monthlyLosingDays > 0 ? totalLossDaysPnL / monthlyLosingDays : 0;

    return {
      emptyCells,
      totalDays,
      dayMap,
      monthlyTotalPnL,
      monthlyTradeCount,
      monthlyWinningDays,
      monthlyLosingDays,
      bestDayPnL,
      bestDayNum,
      worstDayPnL,
      worstDayNum,
      dayWinRate,
      tradeWinRate,
      profitFactor,
      averageWinDay,
      averageLossDay,
      monthlyWinningTrades,
      monthlyLosingTrades
    };
  }, [trades, calendarYear, calendarMonth]);

  // Available years selector calculation
  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    trades.forEach(t => {
      const dateStr = t.closedAt || t.createdAt;
      if (dateStr) {
        years.add(new Date(dateStr).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [trades]);

  return (
    <div className="space-y-4">
      
      {/* SECTION 1: STATISTIQUES COMPACTES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-fadeInUp">
        
        {/* Card 1: Bénéfice Net */}
        <div className="bg-[#10141B] border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-md" id="metric-net-profit">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Bénéfice Net</span>
            <div className={`text-lg font-black font-mono tracking-tight ${stats.netProfit >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              Solde: <span className="text-slate-300 font-mono font-bold">{(startingBalance + stats.netProfit).toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</span>
            </div>
          </div>
          <div className={`p-2 rounded-lg ${stats.netProfit >= 0 ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
            <DollarSign className="w-4 h-4" />
          </div>
        </div>

        {/* Card 2: Taux de Réussite */}
        <div className="bg-[#10141B] border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-md" id="metric-win-rate">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Taux de Réussite</span>
            <div className="text-lg font-black text-slate-100 font-mono tracking-tight">
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-[10px] text-slate-500 font-medium font-sans">
              <span className="text-[#10B981] font-bold">{stats.totalWins}W</span> <span className="text-slate-700">/</span> <span className="text-rose-450 font-bold">{stats.totalLosses}L</span>
            </div>
          </div>
          <SemicircleGauge 
            value={stats.winRate} 
            label={`${stats.winRate.toFixed(0)}%`} 
            colorClass="text-[#10B981]" 
          />
        </div>

        {/* Card 3: Facteur de Profit (Ratio Moyen) */}
        <div className="bg-[#10141B] border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-md" id="metric-profit-factor">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Ratio Moyen & PF</span>
            <div className="text-lg font-black text-slate-100 font-mono tracking-tight">
              PF: {stats.profitFactor.toFixed(2)}
            </div>
            {/* Split bar representation under the average win vs average loss ratio */}
            <div className="space-y-1 pt-1">
              <div className="flex w-24 bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                {stats.averageWin + stats.averageLoss > 0 ? (
                  <>
                    <div 
                      className="bg-[#10B981] h-full" 
                      style={{ width: `${(stats.averageWin / (stats.averageWin + stats.averageLoss)) * 100}%` }}
                    />
                    <div 
                      className="bg-[#EF4444] h-full" 
                      style={{ width: `${(stats.averageLoss / (stats.averageWin + stats.averageLoss)) * 100}%` }}
                    />
                  </>
                ) : (
                  <div className="bg-slate-600 h-full w-full" />
                )}
              </div>
              <div className="text-[9px] text-slate-500 font-mono flex gap-1 font-bold">
                <span className="text-[#10B981]">+{stats.averageWin.toFixed(0)}</span>
                <span className="text-slate-600">/</span>
                <span className="text-[#EF4444]">-{stats.averageLoss.toFixed(0)}</span>
              </div>
            </div>
          </div>
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <Award className="w-4 h-4" />
          </div>
        </div>

        {/* Card 4: Drawdown Actuel */}
        <div className="bg-[#10141B] border border-white/5 p-4 rounded-xl flex items-center justify-between shadow-md" id="metric-current-drawdown">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Drawdown Actuel</span>
            <div className="text-lg font-black text-[#EF4444] font-mono tracking-tight">
              -{currentDrawdownPercent.toFixed(2)}%
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              Perte: <span className="text-rose-450 font-bold font-mono">-{currentDrawdownVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} {currency}</span>
            </div>
          </div>
          {/* We use our custom SemicircleGauge for the drawdown level! */}
          <SemicircleGauge 
            value={currentDrawdownPercent} 
            max={propFirmMetrics?.maxDrawdownPct || 10} 
            label={`${currentDrawdownPercent.toFixed(1)}%`} 
            colorClass={currentDrawdownPercent > 5 ? "text-rose-500" : currentDrawdownPercent > 2.5 ? "text-amber-500" : "text-emerald-400"} 
          />
        </div>

      </div>

      {/* SECTION 2: TABLEAU DE PERFORMANCE ANNUEL */}
      <div className="bg-[#10141B] border border-white/5 rounded-xl p-4 shadow-md overflow-hidden" id="annual-performance-table">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <h4 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
              {language === 'fr' ? 'Tableau de Performance Annuel' : 'Annual Performance Matrix'}
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-500 font-bold bg-white/5 px-2 py-0.5 rounded">
            {monthlyPerformance.year}
          </span>
        </div>

        <div className="overflow-x-auto scroller-thin">
          <table className="w-full text-center border-collapse text-[11px] font-mono">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="p-2 border border-white/5 text-left text-slate-400 text-[10px] font-bold min-w-[70px]">Année</th>
                {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((m) => (
                  <th key={m} className="p-2 border border-white/5 text-slate-400 text-[10px] font-semibold min-w-[75px]">
                    {language === 'fr' ? m : m.substring(0, 3)}
                  </th>
                ))}
                <th className="p-2 border border-white/5 text-slate-300 text-[10px] font-black min-w-[80px]">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {/* Year */}
                <td className="p-2.5 border border-white/5 text-left font-bold text-slate-300 bg-white/[0.01]">
                  {monthlyPerformance.year}
                </td>
                
                {/* Months */}
                {monthlyPerformance.months.map((m) => {
                  const pct = (m.pnl / startingBalance) * 100;
                  const isPositive = m.pnl > 0;
                  const isNegative = m.pnl < 0;
                  
                  // Discrete neon green or crimson colors
                  const textClass = isPositive 
                    ? "text-[#10B981] font-bold" 
                    : isNegative 
                      ? "text-[#EF4444] font-bold" 
                      : "text-slate-500";

                  const formattedPct = pct > 0 ? `+${pct.toFixed(2)}%` : pct < 0 ? `${pct.toFixed(2)}%` : `0.00%`;
                  const formattedR = m.rValue > 0 ? `+${m.rValue.toFixed(2)}R` : m.rValue < 0 ? `${m.rValue.toFixed(2)}R` : `0.00R`;

                  return (
                    <td key={m.monthIndex} className="p-2.5 border border-white/5 font-mono">
                      <div className="flex flex-col items-center">
                        <span className={textClass}>{m.tradesCount > 0 ? formattedPct : '-'}</span>
                        {m.tradesCount > 0 && (
                          <span className="text-[9.5px] text-slate-500 mt-0.5">{formattedR}</span>
                        )}
                      </div>
                    </td>
                  );
                })}

                {/* Total Column */}
                <td className="p-2.5 border border-white/5 bg-white/[0.02] font-mono">
                  {(() => {
                    const totalPct = (monthlyPerformance.totalPnL / startingBalance) * 100;
                    const isTotalPositive = monthlyPerformance.totalPnL > 0;
                    const isTotalNegative = monthlyPerformance.totalPnL < 0;
                    
                    const totalTextClass = isTotalPositive 
                      ? "text-[#10B981] font-extrabold" 
                      : isTotalNegative 
                        ? "text-[#EF4444] font-extrabold" 
                        : "text-slate-500 font-bold";

                    const formattedTotalPct = totalPct > 0 ? `+${totalPct.toFixed(2)}%` : totalPct < 0 ? `${totalPct.toFixed(2)}%` : `0.00%`;
                    const formattedTotalR = monthlyPerformance.totalRValue > 0 ? `+${monthlyPerformance.totalRValue.toFixed(2)}R` : monthlyPerformance.totalRValue < 0 ? `${monthlyPerformance.totalRValue.toFixed(2)}R` : `0.00R`;

                    return (
                      <div className="flex flex-col items-center">
                        <span className={totalTextClass}>{formattedTotalPct}</span>
                        {monthlyPerformance.months.some(m => m.tradesCount > 0) && (
                          <span className="text-[9.5px] text-slate-400 font-bold mt-0.5">{formattedTotalR}</span>
                        )}
                      </div>
                    );
                  })()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION: CALENDRIER DE TRADING MENSUEL */}
      <div className="bg-gradient-to-b from-[#111520] to-[#0c0f17] border border-white/[0.06] rounded-2xl p-4 md:p-6 shadow-xl relative overflow-hidden" id="monthly-trading-calendar">
        {/* Decorative background glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/[0.01] rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#10B981]/[0.01] rounded-full blur-[100px] pointer-events-none" />

        {/* Calendar Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-white/[0.05] pb-5 mb-5 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 rounded-xl border border-sky-500/20 text-sky-400">
              <Calendar className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm md:text-base font-black font-mono text-slate-100 uppercase tracking-widest flex items-center gap-2">
                {language === 'fr' ? 'Calendrier de Trading Mensuel' : 'Monthly Trading Calendar'}
                <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-400/20 px-2 py-0.5 rounded-full font-sans font-normal lowercase tracking-normal">
                  live
                </span>
              </h4>
              <p className="text-[10px] md:text-xs text-slate-400 mt-1 font-sans">
                {language === 'fr' 
                  ? 'Analyse visuelle et statistique de vos performances journalières.' 
                  : 'Visual and statistical summary of your daily trading performances.'}
              </p>
            </div>
          </div>

          {/* Nav Controls */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            <div className="flex items-center bg-[#090b11] border border-white/[0.06] rounded-xl p-1 shadow-inner w-full sm:w-auto justify-between sm:justify-start gap-1">
              <button
                onClick={handlePrevMonth}
                title={language === 'fr' ? 'Mois Précédent' : 'Previous Month'}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all duration-200 cursor-pointer shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Month Select */}
              <select
                value={calendarMonth}
                onChange={(e) => {
                  setSelectedCalendarDay(null);
                  setCalendarMonth(parseInt(e.target.value));
                }}
                className="bg-transparent border-0 rounded-lg py-1 px-2.5 text-xs text-slate-300 focus:ring-0 focus:outline-none cursor-pointer font-mono font-bold text-center"
              >
                {(language === 'fr' 
                  ? ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
                  : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                ).map((m, idx) => (
                  <option key={m} value={idx} className="bg-[#10141B] text-slate-300">{m}</option>
                ))}
              </select>

              <span className="text-white/10 text-xs">|</span>

              {/* Year Select */}
              <select
                value={calendarYear}
                onChange={(e) => {
                  setSelectedCalendarDay(null);
                  setCalendarYear(parseInt(e.target.value));
                }}
                className="bg-transparent border-0 rounded-lg py-1 px-2.5 text-xs text-slate-300 focus:ring-0 focus:outline-none cursor-pointer font-mono font-bold text-center"
              >
                {availableYears.map(y => (
                  <option key={y} value={y} className="bg-[#10141B] text-slate-300">{y}</option>
                ))}
              </select>

              <button
                onClick={handleNextMonth}
                title={language === 'fr' ? 'Mois Suivant' : 'Next Month'}
                className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all duration-200 cursor-pointer shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Body Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
          
          {/* Calendar Table (Left Col Span 3) */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Days of week titles */}
            <div className="grid grid-cols-7 gap-1.5 md:gap-2 text-center text-[10px] font-black uppercase font-mono tracking-widest text-slate-500 border-b border-white/[0.03] pb-2">
              {(language === 'fr' 
                ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] 
                : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
              ).map(dayTitle => (
                <div key={dayTitle} className="py-1">
                  {dayTitle}
                </div>
              ))}
            </div>

            {/* Grid Cells */}
            <div className="grid grid-cols-7 gap-1.5 md:gap-2 font-mono">
              {/* Render Empty Pre-offset days */}
              {Array.from({ length: calendarData.emptyCells }).map((_, idx) => (
                <div 
                  key={`empty-${idx}`} 
                  className="aspect-square bg-white/[0.01] border border-white/[0.01] rounded-xl opacity-20 pointer-events-none"
                />
              ))}

              {/* Render Calendar Days */}
              {Array.from({ length: calendarData.totalDays }).map((_, idx) => {
                const day = idx + 1;
                const dayStats = calendarData.dayMap[day];
                const hasTrades = dayStats && dayStats.trades.length > 0;
                const isSelected = selectedCalendarDay === day;
                const isProfit = dayStats ? dayStats.pnl > 0 : false;
                const isLoss = dayStats ? dayStats.pnl < 0 : false;

                // Advanced color palettes
                let cellClass = "bg-[#0B0E14]/40 hover:bg-[#0B0E14]/75 border border-white/[0.03] hover:border-white/10";
                let pnlColor = "text-slate-500";
                
                if (hasTrades) {
                  if (isProfit) {
                    // Soft glow and emerald color palette
                    cellClass = "bg-gradient-to-br from-[#10B981]/10 to-[#10B981]/[0.01] border-[#10B981]/25 hover:border-[#10B981]/50 shadow-[inset_0_1px_12px_rgba(16,185,129,0.03)] hover:shadow-[0_0_15px_rgba(16,185,129,0.15)]";
                    pnlColor = "text-[#10B981] font-black";
                  } else if (isLoss) {
                    // Soft glow and rose color palette
                    cellClass = "bg-gradient-to-br from-[#EF4444]/10 to-[#EF4444]/[0.01] border-[#EF4444]/25 hover:border-[#EF4444]/50 shadow-[inset_0_1px_12px_rgba(239,68,68,0.03)] hover:shadow-[0_0_15px_rgba(239,68,68,0.15)]";
                    pnlColor = "text-[#EF4444] font-black";
                  } else {
                    cellClass = "bg-slate-500/5 border-slate-500/20 hover:border-slate-500/40 hover:bg-slate-500/10";
                    pnlColor = "text-slate-400 font-bold";
                  }
                }

                if (isSelected) {
                  cellClass = "bg-gradient-to-br from-sky-500/15 to-transparent border-sky-400 ring-2 ring-sky-400/20 shadow-[0_0_20px_rgba(56,189,248,0.2)]";
                }

                // Split win rate bar logic
                const totalTrades = dayStats?.trades?.length || 0;
                const winRatio = totalTrades > 0 ? (dayStats.winCount / totalTrades) * 100 : 0;

                return (
                  <div
                    key={`day-${day}`}
                    onClick={() => {
                      if (hasTrades) {
                        setSelectedCalendarDay(isSelected ? null : day);
                      }
                    }}
                    className={`aspect-square p-1.5 md:p-2.5 rounded-xl flex flex-col justify-between transition-all duration-200 select-none relative ${cellClass} ${
                      hasTrades ? 'cursor-pointer hover:scale-[1.04] hover:z-10' : 'cursor-default'
                    }`}
                  >
                    {/* Top row: Day label */}
                    <div className="flex items-center justify-between w-full">
                      {hasTrades && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isProfit ? 'bg-[#10B981] shadow-[0_0_6px_#10B981]' : 'bg-[#EF4444] shadow-[0_0_6px_#EF4444]'}`} />
                      )}
                      {!hasTrades && <span />}
                      <span className={`text-[10px] md:text-xs font-black ${
                        isSelected ? 'text-sky-400' : 'text-slate-400/80'
                      }`}>
                        {day}
                      </span>
                    </div>

                    {/* Middle row: PnL Display */}
                    <div className="flex flex-col items-center justify-center flex-1 w-full my-1">
                      {hasTrades ? (
                        <div className="text-center w-full">
                          <div className={`text-[8.5px] md:text-xs tracking-tighter truncate ${pnlColor}`}>
                            {dayStats.pnl > 0 ? '+' : ''}
                            {dayStats.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            <span className="text-[7.5px] ml-0.5 opacity-80">{currency}</span>
                          </div>
                          
                          <div className="text-[7.5px] text-slate-500 mt-0.5 font-sans hidden sm:block">
                            {totalTrades} {totalTrades > 1 ? 'trades' : 'trade'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[8px] text-slate-700/60 font-sans block self-center">·</span>
                      )}
                    </div>

                    {/* Bottom row: Mini visual stats line indicator */}
                    {hasTrades ? (
                      <div className="w-full h-1 bg-white/[0.04] rounded-full overflow-hidden flex gap-0.5 mt-0.5 shadow-inner">
                        <div className="h-full bg-[#10B981] transition-all" style={{ width: `${winRatio}%` }} />
                        <div className="h-full bg-[#EF4444] transition-all" style={{ width: `${100 - winRatio}%` }} />
                      </div>
                    ) : (
                      <div className="w-full h-1 bg-transparent" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Visual Color Legend */}
            <div className="flex flex-wrap items-center gap-4 text-[9px] text-slate-500 font-mono mt-4 pt-3 border-t border-white/[0.04] justify-between lg:justify-start">
              <div className="flex flex-wrap items-center gap-4">
                <span className="uppercase tracking-wider text-[8px] font-black text-slate-400/70">{language === 'fr' ? 'Légende :' : 'Legend :'}</span>
                
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-[#10B981]/15 to-transparent border border-[#10B981]/30"></span>
                  <span>{language === 'fr' ? 'Jour Gagnant' : 'Winning Day'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-[#EF4444]/15 to-transparent border border-[#EF4444]/30"></span>
                  <span>{language === 'fr' ? 'Jour Perdant' : 'Losing Day'}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-gradient-to-br from-sky-500/15 to-transparent border border-sky-400/80"></span>
                  <span>{language === 'fr' ? 'Sélectionné' : 'Selected'}</span>
                </div>
              </div>

              <div className="text-slate-500 font-sans hidden md:block">
                {language === 'fr' ? 'Barre au bas :' : 'Bottom bar :'} <span className="text-[#10B981]">% de wins</span> / <span className="text-[#EF4444]">% de losses</span>
              </div>
            </div>

          </div>

          {/* Calendar Sidebar Stats (Right Col Span 1) */}
          <div className="bg-[#090b11]/70 border border-white/[0.06] rounded-2xl p-4 md:p-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <h5 className="text-[10px] md:text-[11px] font-black font-mono text-slate-400 uppercase tracking-widest border-b border-white/[0.04] pb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>{language === 'fr' ? 'Statistiques du Mois' : 'Monthly Performance'}</span>
              </h5>
              
              {/* Gross Profit Block */}
              <div className="bg-gradient-to-br from-white/[0.01] to-transparent border border-white/[0.03] rounded-xl p-3 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/[0.02] rounded-full blur-xl pointer-events-none" />
                <span className="text-[9px] text-slate-500 uppercase block font-sans tracking-wide">
                  {language === 'fr' ? 'Résultat Net' : 'Net Profits'}
                </span>
                <span className={`text-base md:text-xl font-black font-mono block mt-1 tracking-tight ${
                  calendarData.monthlyTotalPnL > 0 
                    ? 'text-[#10B981] drop-shadow-[0_2px_10px_rgba(16,185,129,0.15)]' 
                    : calendarData.monthlyTotalPnL < 0 
                      ? 'text-[#EF4444] drop-shadow-[0_2px_10px_rgba(239,68,68,0.15)]' 
                      : 'text-slate-400'
                }`}>
                  {calendarData.monthlyTotalPnL > 0 ? '+' : ''}
                  {calendarData.monthlyTotalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                </span>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-2.5">
                  <span className="text-[8px] text-slate-500 block uppercase font-sans tracking-wide">Trades</span>
                  <span className="text-xs font-black text-slate-200 mt-1 block">
                    {calendarData.monthlyTradeCount}
                  </span>
                </div>
                
                <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-2.5">
                  <span className="text-[8px] text-slate-500 block uppercase font-sans tracking-wide">
                    {language === 'fr' ? 'Win Rate (Trades)' : 'Trade Win Rate'}
                  </span>
                  <span className="text-xs font-black text-[#10B981] mt-1 block">
                    {calendarData.tradeWinRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Advanced metrics section */}
              <div className="space-y-2.5 pt-2 font-mono text-[10.5px]">
                
                {/* Profit Factor */}
                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                  <span className="text-slate-500 font-sans flex items-center gap-1">
                    {language === 'fr' ? 'Facteur de Profit' : 'Profit Factor'}
                    <span className="cursor-help text-slate-600 hover:text-slate-400" title={language === 'fr' ? 'Ratio profits bruts / pertes brutes' : 'Ratio of gross profits / gross losses'}>🛈</span>
                  </span>
                  <span className={`font-black px-1.5 py-0.5 rounded text-[9.5px] ${
                    calendarData.profitFactor >= 2 
                      ? 'bg-emerald-500/10 text-emerald-400' 
                      : calendarData.profitFactor >= 1.2 
                        ? 'bg-sky-500/10 text-sky-400' 
                        : calendarData.profitFactor >= 1.0 
                          ? 'bg-amber-500/10 text-amber-400' 
                          : 'bg-rose-500/10 text-rose-400'
                  }`}>
                    {calendarData.profitFactor === 99.9 ? 'Perfect (∞)' : calendarData.profitFactor.toFixed(2)}
                  </span>
                </div>

                {/* Day Win Rate (Green Days Rate) */}
                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                  <span className="text-slate-500 font-sans">{language === 'fr' ? 'Jours Verts' : 'Green Days'}</span>
                  <span className="text-slate-300 font-bold">
                    {calendarData.monthlyWinningDays} / {calendarData.monthlyWinningDays + calendarData.monthlyLosingDays}{' '}
                    <span className="text-slate-500 font-normal">({calendarData.dayWinRate.toFixed(0)}%)</span>
                  </span>
                </div>

                {/* Average Profit / Loss per active day */}
                <div className="flex justify-between items-center py-1.5 border-b border-white/[0.03]">
                  <span className="text-slate-500 font-sans">{language === 'fr' ? 'Gain moyen / Jour' : 'Avg Win Day'}</span>
                  <span className="text-[#10B981] font-bold">
                    +{calendarData.averageWinDay.toFixed(0)} {currency}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1.5">
                  <span className="text-slate-500 font-sans">{language === 'fr' ? 'Perte moyenne / Jour' : 'Avg Loss Day'}</span>
                  <span className="text-[#EF4444] font-bold">
                    -{calendarData.averageLossDay.toFixed(0)} {currency}
                  </span>
                </div>

                {/* Record Days */}
                <div className="pt-2 border-t border-white/[0.04] space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 font-sans">{language === 'fr' ? 'Meilleur jour' : 'Best day'}</span>
                    <span className="text-[#10B981] font-extrabold bg-[#10B981]/5 px-1.5 py-0.5 rounded">
                      {calendarData.bestDayPnL > 0 
                        ? `+${calendarData.bestDayPnL.toFixed(0)} ${currency} (#${calendarData.bestDayNum})`
                        : '-'
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 font-sans">{language === 'fr' ? 'Pire jour' : 'Worst day'}</span>
                    <span className="text-[#EF4444] font-extrabold bg-[#EF4444]/5 px-1.5 py-0.5 rounded">
                      {calendarData.worstDayPnL < 0 
                        ? `${calendarData.worstDayPnL.toFixed(0)} ${currency} (#${calendarData.worstDayNum})`
                        : '-'
                      }
                    </span>
                  </div>
                </div>

              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.04]">
              <div className="text-[10px] text-slate-500 leading-relaxed font-sans flex items-start gap-1.5 bg-white/[0.01] p-2.5 rounded-lg border border-white/[0.02]">
                <span className="text-sky-400 shrink-0">🛈</span>
                <span>
                  {language === 'fr' 
                    ? 'Cliquez sur un jour de couleur pour inspecter la liste des transactions de cette journée.' 
                    : 'Click on any colored day to inspect that day\'s active trade list.'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Selected Day Trade Details Panel */}
        {selectedCalendarDay !== null && calendarData.dayMap[selectedCalendarDay] && calendarData.dayMap[selectedCalendarDay].trades.length > 0 && (
          <div className="mt-6 p-4 md:p-5 bg-gradient-to-r from-[#0d1017] to-[#121622] border border-sky-500/30 rounded-2xl space-y-4 animate-fadeInUp shadow-2xl relative">
            <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/[0.01] rounded-full blur-xl pointer-events-none" />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.05] pb-3 relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400">
                  <Clock className="w-4 h-4 animate-spin-slow" />
                </div>
                <div>
                  <h5 className="text-xs md:text-sm font-black font-mono text-sky-400 uppercase tracking-widest flex items-center gap-2">
                    <span>
                      {language === 'fr' 
                        ? `Détail des Trades du ${selectedCalendarDay} ${monthFullNames[calendarMonth]}` 
                        : `Trade Details for ${selectedCalendarDay} ${monthFullNames[calendarMonth]}`}
                    </span>
                  </h5>
                  <p className="text-[9.5px] text-slate-500 mt-0.5 font-sans">
                    {language === 'fr' ? 'Liste complète des ordres clôturés ce jour.' : 'Full list of positions completed on this day.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Day Net Summary Badges */}
                <div className="flex items-center gap-1.5 font-mono text-[10.5px]">
                  <span className="text-slate-500 font-sans">{language === 'fr' ? 'Bilan :' : 'Net PnL :'}</span>
                  <span className={`font-black px-2 py-0.5 rounded-lg ${
                    calendarData.dayMap[selectedCalendarDay].pnl > 0 
                      ? 'bg-[#10B981]/10 text-[#10B981]' 
                      : 'bg-[#EF4444]/10 text-[#EF4444]'
                  }`}>
                    {calendarData.dayMap[selectedCalendarDay].pnl > 0 ? '+' : ''}
                    {calendarData.dayMap[selectedCalendarDay].pnl.toFixed(2)} {currency}
                  </span>
                </div>

                <button 
                  onClick={() => setSelectedCalendarDay(null)}
                  className="text-[10px] font-mono text-slate-400 hover:text-white font-extrabold hover:bg-white/10 border border-white/5 bg-white/[0.02] px-2.5 py-1 rounded-lg cursor-pointer transition-all duration-150"
                >
                  {language === 'fr' ? 'Fermer' : 'Close'}
                </button>
              </div>
            </div>

            {/* List of Trades on that day */}
            <div className="overflow-x-auto scroller-thin relative z-10">
              <table className="w-full text-left text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-white/[0.04] text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="pb-2 font-black">{language === 'fr' ? 'Heure' : 'Time'}</th>
                    <th className="pb-2 font-black">{language === 'fr' ? 'Symbole' : 'Symbol'}</th>
                    <th className="pb-2 font-black">{language === 'fr' ? 'Sens' : 'Type'}</th>
                    <th className="pb-2 font-black">{language === 'fr' ? 'Levier / Lots' : 'Size'}</th>
                    <th className="pb-2 font-black">{language === 'fr' ? 'Concept / Setup' : 'Setup'}</th>
                    <th className="pb-2 font-black text-right">{language === 'fr' ? 'Résultat' : 'PnL'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-slate-300">
                  {calendarData.dayMap[selectedCalendarDay].trades.map((t) => {
                    const isWin = (t.pnl || 0) >= 0;
                    const dateObj = new Date(t.closedAt || t.createdAt);
                    const timeStr = dateObj.toLocaleTimeString(language === 'fr' ? 'fr-FR' : 'en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors duration-150">
                        <td className="py-2.5 text-slate-400 font-bold">{timeStr}</td>
                        <td className="py-2.5 font-extrabold text-slate-100">{t.symbol}</td>
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider ${
                            t.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border border-rose-500/10'
                          }`}>
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-2.5 text-slate-400">{t.quantity}</td>
                        <td className="py-2.5 text-slate-400 font-sans">{t.setup || 'SMC Concept'}</td>
                        <td className={`py-2.5 text-right font-black text-xs ${isWin ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                          {isWin ? '+' : ''}
                          {t.pnl?.toFixed(2)} {currency}
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

    {/* SECTION: LIVE PROP FIRM CHALLENGE TRACKER COMPONENT */}
    {propFirmMetrics && (
      <div className="bg-[#161B22] border border-purple-500/10 rounded-2xl overflow-hidden p-5 md:p-6 shadow-xl relative animate-fadeInUp" id="propfirm-live-tracker">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/[0.02] rounded-full blur-[80px] pointer-events-none" />
        
        {/* Header Row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 border border-purple-500/20 bg-purple-500/10 text-purple-400 rounded-xl">
              <Award className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider font-mono text-slate-100">
                  {language === 'fr' ? 'Moniteur de Challenge Prop Firm' : 'Prop Firm Challenge Guard'}
                </h3>
                <span className="text-[9.5px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  {activeAccount?.firmOrBrokerName || 'SMC Prop'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-medium">
                {language === 'fr' 
                   ? 'Logiciel de surveillance en temps réel et respect des pertes maximales de votre challenge.'
                   : 'Real-time telemetry and margin enforcement of your target thresholds.'}
              </p>
            </div>
          </div>

          {/* Selector buttons for view phase progress */}
          <div className="flex items-center gap-1.5 bg-black/30 border border-white/5 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setChallengePhaseView('PHASE1')}
              className={`px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                challengePhaseView === 'PHASE1'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Phase 1 ({propFirmMetrics.targetP1Pct}%)
            </button>
            <button
              type="button"
              onClick={() => setChallengePhaseView('PHASE2')}
              className={`px-3 py-1.5 text-[10px] font-black font-mono uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                challengePhaseView === 'PHASE2'
                  ? 'bg-pink-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Phase 2 ({propFirmMetrics.targetP2Pct}%)
            </button>
          </div>
        </div>

        {/* Warning Visual alert if drawdowns are high */}
        {propFirmMetrics.isViolated ? (
          <div className="mb-5 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex gap-3 items-start p-4 animate-pulse">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-extrabold text-rose-400 uppercase tracking-wider">
                ⚠️ {language === 'fr' ? 'Violations des Règles Détectée' : 'Challenge Threshold Breached'}
              </h4>
              <p className="text-[11px] text-slate-300 leading-normal font-sans">
                {language === 'fr'
                  ? "Limite de drawdown dépassée. Ce compte n'est plus éligible pour le financement Prop Firm."
                  : "The close/trailing drawdown bounds has been exceeded. Account disqualified."}
              </p>
            </div>
          </div>
        ) : propFirmMetrics.hasRisk ? (
          <div className="mb-5 bg-gradient-to-r from-rose-500/10 to-transparent border border-rose-500/20 rounded-xl p-4 flex gap-3 items-start p-4 card-glow-critical">
            <AlertCircle className="w-5 h-5 text-rose-450 shrink-0 mt-0.5 animate-bounce" />
            <div className="space-y-1">
              <h4 className="text-xs font-black text-rose-450 uppercase tracking-wider">
                🚨 {language === 'fr' ? 'Risque de violation du compte' : 'RISK OF VIOLATION DETECTED'}
              </h4>
              <p className="text-[11px] text-slate-300 leading-normal font-sans font-medium">
                {language === 'fr' 
                   ? "Attention ! Vos pertes approchent la limite critique autorisée de Drawdown (75% ou plus). Réduisez immédiatement votre exposition !" 
                   : "Warning! Your loss velocity is extremely high and nearing drawdown thresholds (75%+). Reduce margin allocation immediately."}
              </p>
            </div>
          </div>
        ) : null}

        {/* Progression grid layouts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Phase target box: display progress circle/indicator */}
          <div className="bg-black/25 border border-white/5 rounded-xl p-4 flex flex-col justify-between" id="pf-profit-target-box">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-slate-400 font-extrabold font-mono uppercase tracking-wider">
                {language === 'fr' ? 'OBJECTIF DE GAINS' : 'PROFIT TARGET'}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-black font-mono ${
                propFirmMetrics.netProfitVal >= (challengePhaseView === 'PHASE1' ? propFirmMetrics.targetP1Amt : propFirmMetrics.targetP2Amt)
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-purple-500/10 text-purple-400'
              }`}>
                {challengePhaseView === 'PHASE1' ? propFirmMetrics.p1Progress.toFixed(1) : propFirmMetrics.p2Progress.toFixed(1)}%
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-black font-mono tracking-tight text-white flex items-baseline gap-1.5">
                <span>{propFirmMetrics.netProfitVal >= 0 ? '+' : ''}{propFirmMetrics.netProfitVal.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                <span className="text-xs text-slate-500 font-medium font-sans">
                  / +{(challengePhaseView === 'PHASE1' ? propFirmMetrics.targetP1Amt : propFirmMetrics.targetP2Amt).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
                </span>
              </div>
              
              {/* Visual state percent text */}
              <p className="text-[11px] text-slate-300 font-medium">
                {language === 'fr' 
                  ? `${propFirmMetrics.netProfitVal >= 0 ? '+' : ''}${((propFirmMetrics.netProfitVal / propFirmMetrics.capital) * 100).toFixed(2)}% sur les ${(challengePhaseView === 'PHASE1' ? propFirmMetrics.targetP1Pct : propFirmMetrics.targetP2Pct)}% requis` 
                  : `${propFirmMetrics.netProfitVal >= 0 ? '+' : ''}${((propFirmMetrics.netProfitVal / propFirmMetrics.capital) * 100).toFixed(2)}% of the ${(challengePhaseView === 'PHASE1' ? propFirmMetrics.targetP1Pct : propFirmMetrics.targetP2Pct)}% target`}
              </p>

              {/* Progress bar */}
              <div className="w-full bg-[#0A0B0D] h-2.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    challengePhaseView === 'PHASE1' ? 'bg-gradient-to-r from-purple-600 to-indigo-500' : 'bg-gradient-to-r from-pink-600 to-rose-500'
                  }`}
                  style={{ width: `${challengePhaseView === 'PHASE1' ? propFirmMetrics.p1Progress : propFirmMetrics.p2Progress}%` }}
                />
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 pt-3 border-t border-white/5 mt-3 flex justify-between items-center">
              <span>{language === 'fr' ? 'Capital de départ :' : 'Starting balance:'}</span>
              <span className="text-slate-300 font-bold">{propFirmMetrics.capital.toLocaleString()} {currency}</span>
            </div>
          </div>

          {/* Daily loss limit tracker */}
          <div className="bg-black/25 border border-white/5 rounded-xl p-4 flex flex-col justify-between" id="pf-daily-drawdown-box">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] text-rose-400 font-extrabold font-mono uppercase tracking-wider">
                {language === 'fr' ? 'DRAWDOWN QUOTIDIEN MAX' : 'DAILY MAX LOSS'}
              </span>
              <span className="text-[9.5px] font-mono font-bold text-slate-500">
                {propFirmMetrics.dailyDrawdownPct}% Max
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-black font-mono tracking-tight text-white flex items-baseline gap-1.5">
                <span className="text-rose-400">-{propFirmMetrics.dailyLossCurrent.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                <span className="text-xs text-slate-500 font-medium font-sans">
                  / -{propFirmMetrics.dailyDrawdownAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
                </span>
              </div>
              
              <p className="text-[11px] text-slate-300 font-medium">
                {language === 'fr'
                  ? `${((propFirmMetrics.dailyLossCurrent / propFirmMetrics.dailyDrawdownAmt) * 100).toFixed(0)}% consommé aujourd'hui`
                  : `${((propFirmMetrics.dailyLossCurrent / propFirmMetrics.dailyDrawdownAmt) * 100).toFixed(0)}% limit spent output`}
              </p>

              {/* Progress bar */}
              <div className="w-full bg-[#0A0B0D] h-2.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    propFirmMetrics.dailyLossCurrent >= propFirmMetrics.dailyDrawdownAmt
                      ? 'bg-rose-600'
                      : propFirmMetrics.dailyDrawdownRisk
                      ? 'bg-amber-500'
                      : 'bg-rose-500/70'
                  }`}
                  style={{ width: `${Math.min(100, (propFirmMetrics.dailyLossCurrent / propFirmMetrics.dailyDrawdownAmt) * 100)}%` }}
                />
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 pt-3 border-t border-white/5 mt-3 flex justify-between items-center">
              <span>{language === 'fr' ? 'Gains aujourd\'hui :' : 'Closed returns today:'}</span>
              <span className={`font-bold ${propFirmMetrics.dailyLossCurrent === 0 ? 'text-slate-300' : 'text-rose-400'}`}>
                -{propFirmMetrics.dailyLossCurrent.toLocaleString()} {currency}
              </span>
            </div>
          </div>

          {/* Overall max loss limit tracker */}
          <div className="bg-black/25 border border-white/5 rounded-xl p-4 flex flex-col justify-between" id="pf-max-drawdown-box">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[10px] font-extrabold font-mono uppercase tracking-wider ${propFirmMetrics.overallLossCurrent === 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                {language === 'fr' ? 'DRAWDOWN MAX GLOBAL' : 'MAX DRAWDOWN LIMIT'}
              </span>
              <span className="text-[9.5px] font-mono font-bold text-slate-500">
                {propFirmMetrics.maxDrawdownPct}% Max
              </span>
            </div>

            <div className="space-y-2">
              <div className="text-2xl font-black font-mono tracking-tight text-white flex items-baseline gap-1.5 flex-wrap">
                {propFirmMetrics.overallLossCurrent === 0 ? (
                  <span className="text-cyan-400">0.00 {currency}</span>
                ) : (
                  <span className="text-rose-400">-{propFirmMetrics.overallLossCurrent.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                )}
                <span className="text-xs text-slate-500 font-medium font-sans">
                  / -{propFirmMetrics.maxDrawdownAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
                </span>
              </div>
              
              {propFirmMetrics.overallLossCurrent === 0 ? (
                <div className="text-[10px] font-bold text-cyan-400 font-sans tracking-wide flex items-center gap-1 py-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  {language === 'fr' ? 'Compte Sécurisé (0% consommé)' : 'Account Secured (0% consumed)'}
                </div>
              ) : (
                <p className="text-[11px] text-slate-300 font-medium">
                  {language === 'fr'
                    ? `${((propFirmMetrics.overallLossCurrent / propFirmMetrics.maxDrawdownAmt) * 100).toFixed(0)}% consommé au total`
                    : `${((propFirmMetrics.overallLossCurrent / propFirmMetrics.maxDrawdownAmt) * 100).toFixed(0)}% total limit consumed`}
                </p>
              )}

              {/* Progress bar */}
              <div className="w-full bg-[#0A0B0D] h-2.5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    propFirmMetrics.overallLossCurrent >= propFirmMetrics.maxDrawdownAmt
                      ? 'bg-rose-600'
                      : propFirmMetrics.maxDrawdownRisk
                      ? 'bg-amber-500'
                      : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, (propFirmMetrics.overallLossCurrent / propFirmMetrics.maxDrawdownAmt) * 100)}%` }}
                />
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-500 pt-3 border-t border-white/5 mt-3 flex justify-between items-center">
              <span>{language === 'fr' ? 'Capital de Départ :' : 'Initial Capital:'}</span>
              <span className="text-slate-300 font-bold">{propFirmMetrics.capital.toLocaleString()} {currency}</span>
            </div>
          </div>

        </div>
      </div>
    )}

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
          {/* SECTION 3: GRAPHIQUES COTE A COTE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="charts-container">
            
            {/* Left: Evolution du Capital */}
            <div className="bg-[#10141B] border border-white/5 p-4 rounded-xl flex flex-col justify-between shadow-md relative overflow-hidden" id="chart-equity-curve">
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  {language === 'fr' ? 'Évolution du Capital' : 'Capital Growth Curve'}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">Progression chronologique de votre solde de trading</p>
              </div>
              
              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={equityCurveData}>
                    <defs>
                      <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis 
                      stroke="#64748B" 
                      fontSize={9} 
                      tickLine={false} 
                      axisLine={false}
                      domain={['dataMin - 100', 'dataMax + 100']}
                      tickFormatter={(v) => `${v}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#10141B', borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}
                      labelStyle={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      itemStyle={{ color: '#10B981', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                    />
                    <Area type="monotone" dataKey="capital" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorCapital)" name="Solde" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Profits/Pertes par mois (Bar Chart) */}
            <div className="bg-[#10141B] border border-white/5 p-4 rounded-xl flex flex-col justify-between shadow-md relative overflow-hidden" id="chart-monthly-pnl">
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  {language === 'fr' ? 'Profits/Pertes par mois' : 'Monthly Performance Bar'}
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">Distribution mensuelle des résultats nets</p>
              </div>
              
              <div className="h-64 w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={9} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" fontSize={9} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#10141B', borderColor: 'rgba(255, 255, 255, 0.08)', borderRadius: '8px' }}
                      labelStyle={{ color: '#94A3B8', fontWeight: 'bold', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      itemStyle={{ color: '#FFFFFF', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                      formatter={(v: any) => [`${Number(v).toLocaleString()} ${currency}`, 'PnL']}
                    />
                    <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                      {barChartData.map((entry, idx) => {
                        const isPositive = entry.pnl >= 0;
                        return (
                          <Cell 
                            key={`cell-${idx}`} 
                            fill={isPositive ? "rgba(16, 185, 129, 0.85)" : "rgba(239, 68, 68, 0.85)"}
                            stroke={isPositive ? "#10B981" : "#EF4444"}
                            strokeWidth={1}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
