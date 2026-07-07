import React, { useState, useMemo } from 'react';
import { Trade, TradeDirection, TradeStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Search, Calendar, Edit2, CheckCircle, Trash2, X, Star, Filter, 
  TrendingUp, TrendingDown, BookOpen, Camera, Globe, ChevronLeft, ChevronRight, 
  Settings, ChevronUp, ChevronDown, Check, Download, Layers, Eye, EyeOff,
  Mic, MicOff, Maximize2, Minimize2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface TradeJournalProps {
  trades: Trade[];
  onAddTrade: (trade: Omit<Trade, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdateTrade: (id: string, updatedFields: Partial<Trade>) => void;
  onDeleteTrade: (id: string) => void;
  currency: string;
  language?: 'fr' | 'en';
}

const COMMON_SETUPS = [
  "SMC (Smart Money Concepts)",
  "ICT (Inner Circle Trader)",
  "Cassure & Retest S/R",
  "Divergence RSI / MACD",
  "EMA Cross",
  "Fibonacci Retracement",
  "Order Block Entry",
  "Liquidity Sweep"
];

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const VoiceInputButton = ({ 
  value, 
  onChange, 
  language = 'fr'
}: { 
  value: string; 
  onChange: (val: string) => void;
  language?: 'fr' | 'en';
}) => {
  const [isListening, setIsListening] = React.useState(false);
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSupported(true);
    }
  }, []);

  if (!supported) return null;

  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = language === 'fr' ? 'fr-FR' : 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onerror = (event: any) => {
      console.error(event);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        const spacing = value && !value.endsWith(' ') ? ' ' : '';
        onChange(value + spacing + transcript);
      }
    };

    recognition.start();
  };

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={`px-2 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1.5 border text-[10px] font-black font-mono ${
        isListening 
          ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 animate-pulse' 
          : 'bg-[#0A0B0D] border-white/5 text-slate-400 hover:text-white hover:border-white/10'
      }`}
      title={isListening 
        ? (language === 'fr' ? "Enregistrement en cours... Cliquez pour arrêter." : "Recording... Click to stop.")
        : (language === 'fr' ? "Dicter des notes" : "Voice dictation")
      }
    >
      {isListening ? (
        <>
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
          <span>Listening</span>
        </>
      ) : (
        <>
          <Mic className="w-3.5 h-3.5" />
          <span>{language === 'fr' ? "DICTÉE" : "DICTATE"}</span>
        </>
      )}
    </button>
  );
};

export default function TradeJournal({ 
  trades, 
  onAddTrade, 
  onUpdateTrade, 
  onDeleteTrade, 
  currency, 
  language = 'fr'
}: TradeJournalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Interactive calendar state
  const [calendarDate, setCalendarDate] = useState(() => {
    // If there is any trade in June 2024, default to June 2024, otherwise use current date
    const has2024Trades = trades.some(t => {
      const d = t.closedAt || t.createdAt;
      return d && d.startsWith('2024-06');
    });
    return has2024Trades ? new Date(2024, 5, 1) : new Date();
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  // Collapsed / Expanded days tracker
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Bulk actions selection state
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());
  const [showBulkActionsMenu, setShowBulkActionsMenu] = useState(false);
  const [maskAmounts, setMaskAmounts] = useState<boolean>(() => localStorage.getItem('trading_mask_amounts') === 'true');
  const [isFullScreen, setIsFullScreen] = React.useState(false);

  // Lightbox & details state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [activeNotesDay, setActiveNotesDay] = useState<{ dateKey: string; dateLabel: string; trades: Trade[] } | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Editing single trade state
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [editSymbol, setEditSymbol] = useState('');
  const [editDirection, setEditDirection] = useState<TradeDirection>('BUY');
  const [editSetup, setEditSetup] = useState('');
  const [editStopLoss, setEditStopLoss] = useState('');
  const [editTakeProfit, setEditTakeProfit] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editRating, setEditRating] = useState<number>(3);
  const [editPsychologyTags, setEditPsychologyTags] = useState<string[]>([]);
  const [editMistakeTags, setEditMistakeTags] = useState<string[]>([]);
  const [editTradingViewImageUrl, setEditTradingViewImageUrl] = useState('');
  const [editTradingViewImageExitUrl, setEditTradingViewImageExitUrl] = useState('');
  const [editEconomicNewsUrl, setEditEconomicNewsUrl] = useState('');
  const [editStatus, setEditStatus] = useState<TradeStatus>('OPEN');
  const [editPnlResult, setEditPnlResult] = useState<'WON' | 'LOST'>('WON');
  const [editPnlAmount, setEditPnlAmount] = useState('');

  // Closing single trade state
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closeResult, setCloseResult] = useState<'WON' | 'LOST'>('WON');
  const [closeAmountInput, setCloseAmountInput] = useState('');
  const [exitNotesInput, setExitNotesInput] = useState('');
  const [closeImageExitUrlInput, setCloseImageExitUrlInput] = useState('');

  // Deleting confirmation modal
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null);

  // Add trade form state
  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [addStatus, setAddStatus] = useState<TradeStatus>('OPEN');
  const [addResult, setAddResult] = useState<'WON' | 'LOST'>('WON');
  const [realizedAmount, setRealizedAmount] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [setup, setSetup] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number>(3);
  const [psychologyTags, setPsychologyTags] = useState<string[]>([]);
  const [mistakeTags, setMistakeTags] = useState<string[]>([]);
  const [tradingViewImageUrl, setTradingViewImageUrl] = useState('');
  const [tradingViewImageExitUrl, setTradingViewImageExitUrl] = useState('');
  const [economicNewsUrl, setEconomicNewsUrl] = useState('');

  const monthsList = language === 'fr' ? MONTHS_FR : MONTHS_EN;

  // -------------------------------------------------------------
  // SECTION 1: STATS & KPIS CALCULATIONS
  // -------------------------------------------------------------
  const closedTrades = useMemo(() => {
    return trades
      .filter(t => t.status === 'CLOSED')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [trades]);

  const globalStats = useMemo(() => {
    const total = closedTrades.length;
    if (total === 0) {
      return {
        netPnl: 0,
        profitFactor: 0,
        winRate: 0,
        winsCount: 0,
        lossesCount: 0,
        avgWin: 0,
        avgLoss: 0,
        equityCurve: [{ name: '0', value: 0 }]
      };
    }

    let runningPnl = 0;
    const equityCurve = closedTrades.map((t, idx) => {
      runningPnl += t.pnl || 0;
      return {
        name: `T${idx + 1}`,
        value: runningPnl
      };
    });
    // Ensure starting balance representation at 0
    equityCurve.unshift({ name: 'Start', value: 0 });

    const wins = closedTrades.filter(t => (t.pnl || 0) > 0);
    const losses = closedTrades.filter(t => (t.pnl || 0) < 0);

    const netPnl = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalWinsAmt = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const totalLossAmt = losses.reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0);

    const profitFactor = totalLossAmt === 0 ? (totalWinsAmt > 0 ? 99.9 : 0) : totalWinsAmt / totalLossAmt;
    const winRate = (wins.length / total) * 100;

    const avgWin = wins.length > 0 ? totalWinsAmt / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossAmt / losses.length : 0;

    return {
      netPnl,
      profitFactor,
      winRate,
      winsCount: wins.length,
      lossesCount: losses.length,
      avgWin,
      avgLoss,
      equityCurve
    };
  }, [closedTrades]);

  // -------------------------------------------------------------
  // SECTION 2: DAILY GROUPING & CHRONOLOGY
  // -------------------------------------------------------------
  const tradesByDay = useMemo(() => {
    const groups: Record<string, Trade[]> = {};
    trades.forEach(t => {
      const dateStr = t.closedAt || t.createdAt;
      if (!dateStr) return;
      const dayKey = dateStr.substring(0, 10); // YYYY-MM-DD
      if (!groups[dayKey]) {
        groups[dayKey] = [];
      }
      groups[dayKey].push(t);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map(key => {
      const dayTrades = groups[key];
      const netPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const wins = dayTrades.filter(t => (t.pnl || 0) > 0);
      const losses = dayTrades.filter(t => (t.pnl || 0) < 0);
      const totalTrades = dayTrades.length;
      const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;

      const commissions = dayTrades.reduce((sum, t) => sum + (t.fees || 0), 0);
      const volume = dayTrades.reduce((sum, t) => sum + (t.quantity || 0), 0);
      const grossPnl = netPnl + commissions;

      const totalWinsAmt = wins.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const totalLossAmt = losses.reduce((sum, t) => sum + Math.abs(t.pnl || 0), 0);
      const profitFactor = totalLossAmt === 0 ? (totalWinsAmt > 0 ? 99.9 : 0) : totalWinsAmt / totalLossAmt;

      // Intra-day chronological evolution
      const sortedDayTrades = [...dayTrades].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      let accum = 0;
      const intraDayPnlSeries = sortedDayTrades.map((t, idx) => {
        accum += t.pnl || 0;
        return { name: `T${idx + 1}`, value: accum };
      });
      intraDayPnlSeries.unshift({ name: 'Start', value: 0 });

      return {
        dateKey: key,
        dateLabel: new Date(key + 'T12:00:00').toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', {
          weekday: 'short',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }),
        netPnl,
        grossPnl,
        volume,
        commissions,
        profitFactor,
        totalTrades,
        winRate,
        winsCount: wins.length,
        lossesCount: losses.length,
        intraDayPnlSeries,
        trades: dayTrades
      };
    });
  }, [trades, language]);

  // Set default expansion state for new days loaded
  React.useEffect(() => {
    if (tradesByDay.length > 0 && Object.keys(expandedDays).length === 0) {
      const initial: Record<string, boolean> = {};
      tradesByDay.forEach(day => {
        initial[day.dateKey] = true; // Expanded by default for gorgeous visibility
      });
      setExpandedDays(initial);
    }
  }, [tradesByDay]);

  // Handle date filters from calendar
  const filteredDays = useMemo(() => {
    if (selectedDayKey) {
      return tradesByDay.filter(day => day.dateKey === selectedDayKey);
    }
    return tradesByDay;
  }, [tradesByDay, selectedDayKey]);

  // Clean formatted search term days
  const searchedDays = useMemo(() => {
    if (!searchTerm) return filteredDays;
    const term = searchTerm.toLowerCase();
    return filteredDays.filter(day => {
      return day.trades.some(t => 
        t.symbol.toLowerCase().includes(term) ||
        (t.setup || '').toLowerCase().includes(term) ||
        (t.notes || '').toLowerCase().includes(term)
      );
    });
  }, [filteredDays, searchTerm]);

  // -------------------------------------------------------------
  // CALENDAR DAYS RENDER GENERATOR
  // -------------------------------------------------------------
  const calendarGridCells = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    
    // Convert Sunday standard start offset
    let startOffset = firstDay.getDay() - 1;
    if (startOffset === -1) startOffset = 6; // Monday start offset

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    // Empty offset padding cells
    for (let i = 0; i < startOffset; i++) {
      cells.push({ key: `pad-${i}`, dayNum: null, dateStr: null, hasTrades: false });
    }

    // Days filling
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasTrades = trades.some(t => {
        const tDate = t.closedAt || t.createdAt;
        return tDate && tDate.substring(0, 10) === dateStr;
      });
      cells.push({ key: `day-${d}`, dayNum: d, dateStr, hasTrades });
    }

    return cells;
  }, [calendarDate, trades]);

  // -------------------------------------------------------------
  // FORM SUBMISSIONS & ACTIONS HANDLERS
  // -------------------------------------------------------------
  const handleSubmitTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol) return;

    const stopVal = stopLoss ? parseFloat(stopLoss) : undefined;
    const profitVal = takeProfit ? parseFloat(takeProfit) : undefined;

    let pnlVal = undefined;
    if (addStatus === 'CLOSED') {
      const amt = parseFloat(realizedAmount) || 0;
      pnlVal = addResult === 'WON' ? Math.abs(amt) : -Math.abs(amt);
    }

    onAddTrade({
      symbol: symbol.toUpperCase(),
      direction,
      entryPrice: 0,
      quantity: 1,
      stopLoss: stopVal,
      takeProfit: profitVal,
      status: addStatus,
      pnl: pnlVal,
      setup: setup || 'Plan Manuel',
      fees: 0,
      notes,
      rating,
      psychologyTags,
      mistakeTags,
      tradingViewImageUrl: tradingViewImageUrl.trim() || undefined,
      tradingViewImageExitUrl: tradingViewImageExitUrl.trim() || undefined,
      economicNewsUrl: economicNewsUrl.trim() || undefined,
      closedAt: addStatus === 'CLOSED' ? new Date().toISOString() : undefined
    });

    // Reset fields
    setSymbol('');
    setAddStatus('OPEN');
    setAddResult('WON');
    setRealizedAmount('');
    setStopLoss('');
    setTakeProfit('');
    setSetup('');
    setNotes('');
    setRating(3);
    setPsychologyTags([]);
    setMistakeTags([]);
    setTradingViewImageUrl('');
    setTradingViewImageExitUrl('');
    setEconomicNewsUrl('');
    setShowAddForm(false);
  };

  const handleEditTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrade || !editSymbol) return;

    const stopVal = editStopLoss ? parseFloat(editStopLoss) : undefined;
    const profitVal = editTakeProfit ? parseFloat(editTakeProfit) : undefined;
    
    let pnl = undefined;
    if (editStatus === 'CLOSED') {
      const amt = parseFloat(editPnlAmount) || 0;
      pnl = editPnlResult === 'WON' ? Math.abs(amt) : -Math.abs(amt);
    }

    onUpdateTrade(editingTrade.id, {
      symbol: editSymbol.toUpperCase(),
      direction: editDirection,
      entryPrice: 0,
      quantity: 1,
      stopLoss: stopVal,
      takeProfit: profitVal,
      setup: editSetup || 'Plan Manuel',
      fees: 0,
      notes: editNotes,
      rating: editRating,
      psychologyTags: editPsychologyTags,
      mistakeTags: editMistakeTags,
      tradingViewImageUrl: editTradingViewImageUrl.trim() || undefined,
      tradingViewImageExitUrl: editTradingViewImageExitUrl.trim() || undefined,
      economicNewsUrl: editEconomicNewsUrl.trim() || undefined,
      status: editStatus,
      pnl: pnl,
      closedAt: editStatus === 'CLOSED' && !editingTrade.closedAt ? new Date().toISOString() : editingTrade.closedAt
    });

    setEditingTrade(null);
  };

  const handleCloseTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingTradeId || !closeAmountInput) return;

    const trade = trades.find(t => t.id === closingTradeId);
    if (!trade) return;

    const amt = parseFloat(closeAmountInput) || 0;
    const finalPnl = closeResult === 'WON' ? Math.abs(amt) : -Math.abs(amt);

    onUpdateTrade(closingTradeId, {
      status: 'CLOSED',
      pnl: finalPnl,
      takeProfit: closeResult === 'WON' ? Math.abs(amt) : trade.takeProfit,
      stopLoss: closeResult === 'LOST' ? Math.abs(amt) : trade.stopLoss,
      notes: exitNotesInput ? `${trade.notes || ''}\n[Fermeture] : ${exitNotesInput}`.trim() : trade.notes,
      tradingViewImageExitUrl: closeImageExitUrlInput.trim() || trade.tradingViewImageExitUrl,
      closedAt: new Date().toISOString()
    });

    setClosingTradeId(null);
    setCloseResult('WON');
    setCloseAmountInput('');
    setExitNotesInput('');
    setCloseImageExitUrlInput('');
  };

  // Note actions per Day
  const handleOpenNoteModal = (day: { dateKey: string; dateLabel: string; trades: Trade[] }) => {
    setActiveNotesDay(day);
    // Grab the first note found
    const firstNote = day.trades.find(t => t.notes)?.notes || '';
    setEditingNoteText(firstNote);
  };

  const handleSaveDayNote = () => {
    if (!activeNotesDay || activeNotesDay.trades.length === 0) return;
    const firstTrade = activeNotesDay.trades[0];
    onUpdateTrade(firstTrade.id, { notes: editingNoteText });
    setActiveNotesDay(null);
  };

  const hasNote = (day: { trades: Trade[] }) => {
    return day.trades.some(t => t.notes && t.notes.trim().length > 0);
  };

  // Expand / collapse helpers
  const handleExpandAll = () => {
    const updated: Record<string, boolean> = {};
    tradesByDay.forEach(day => {
      updated[day.dateKey] = true;
    });
    setExpandedDays(updated);
  };

  const handleCollapseAll = () => {
    setExpandedDays({});
  };

  // Checkbox select positions helpers
  const handleToggleSelectAll = () => {
    if (selectedTradeIds.size === closedTrades.length) {
      setSelectedTradeIds(new Set());
    } else {
      setSelectedTradeIds(new Set(closedTrades.map(t => t.id)));
    }
  };

  const handleToggleSelectTrade = (id: string) => {
    const next = new Set(selectedTradeIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTradeIds(next);
  };

  const handleBulkDelete = () => {
    selectedTradeIds.forEach(id => {
      onDeleteTrade(id);
    });
    setSelectedTradeIds(new Set());
    setShowBulkActionsMenu(false);
  };

  const handleBulkCSVExport = () => {
    const selectedList = closedTrades.filter(t => selectedTradeIds.has(t.id));
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Date,Symbole,Direction,Resultat Net,ROI %,Setup"].join(",") + "\n"
      + selectedList.map(t => `${t.createdAt.substring(0,10)},${t.symbol},${t.direction},${t.pnl || 0},${(((t.pnl || 0) / 1000) * 100).toFixed(2)}%,${t.setup || ''}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `propflow_journal_export_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowBulkActionsMenu(false);
  };

  // Find max absolute P&L to correctly scale Zella gauges
  const maxAbsPnl = useMemo(() => {
    const pnls = closedTrades.map(t => Math.abs(t.pnl || 0));
    return pnls.length > 0 ? Math.max(...pnls) : 1;
  }, [closedTrades]);

  return (
    <div className="space-y-8 text-slate-100 font-sans" id="trading-journal-page">
      
      {/* -----------------------------------------------------------
          SECTION 1: KPIS GLOBAUX (Premium Dark Mode Dashboard)
          ----------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" id="global-kpi-bar">
        
        {/* KPI 1: P&L cumulatif net */}
        <div className="bg-[#111622] border border-white/5 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-36 min-h-[144px]">
          {/* Back equity chart behind the text */}
          <div className="absolute inset-0 z-0 opacity-25 pointer-events-none">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={globalStats.equityCurve} margin={{ top: 40, right: 0, left: 0, bottom: -5 }}>
                <defs>
                  <linearGradient id="pnlGlowCurve" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#pnlGlowCurve)" 
                  dot={false} 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="relative z-10 space-y-1">
            <span className="text-xs font-medium text-slate-400 block tracking-tight">P&L cumulatif net</span>
            <h3 className={`text-2xl font-black font-mono tracking-tight ${globalStats.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
              {globalStats.netPnl >= 0 ? '+' : ''}{globalStats.netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </h3>
          </div>
          <div className="relative z-10 text-[10px] text-slate-500 font-mono">
            {closedTrades.length} positions clôturées
          </div>
        </div>

        {/* KPI 2: Facteur de profit */}
        <div className="bg-[#111622] border border-white/5 rounded-2xl p-6 flex items-center justify-between h-36 min-h-[144px]">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400 block tracking-tight">Facteur de profit</span>
            <h3 className={`text-2xl font-black font-mono tracking-tight ${
              globalStats.profitFactor >= 2.0 
                ? 'text-emerald-400' 
                : globalStats.profitFactor >= 1.0 
                  ? 'text-amber-400' 
                  : 'text-rose-500'
            }`}>
              {globalStats.profitFactor === 99.9 ? '∞ (No loss)' : globalStats.profitFactor.toFixed(2)}
            </h3>
            <span className="text-[10px] text-slate-500 block">Ratio gains / pertes brutes</span>
          </div>

          {/* Circular green gauge */}
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.03)" strokeWidth="4" fill="transparent" />
              <circle 
                cx="28" 
                cy="28" 
                r="22" 
                stroke="#10b981" 
                strokeWidth="4" 
                fill="transparent" 
                strokeDasharray={138.2}
                strokeDashoffset={138.2 - (138.2 * Math.min(100, (globalStats.profitFactor / 3) * 100)) / 100}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute font-mono text-[9px] font-bold text-emerald-400">
              PF
            </div>
          </div>
        </div>

        {/* KPI 3: % de gains commerciaux */}
        <div className="bg-[#111622] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-36 min-h-[144px]">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs font-medium text-slate-400 block tracking-tight">% de gains commerciaux</span>
              <h3 className="text-2xl font-black font-mono tracking-tight text-emerald-400">
                {globalStats.winRate.toFixed(2)}%
              </h3>
            </div>

            {/* Semi-circular gauge */}
            <div className="relative w-16 h-8 flex items-end justify-center overflow-hidden shrink-0">
              <svg viewBox="0 0 40 20" className="w-16 h-8 overflow-visible">
                <path d="M 4,20 A 16,16 0 0,1 36,20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="3.5" strokeLinecap="round" />
                <path 
                  d="M 4,20 A 16,16 0 0,1 36,20" 
                  fill="none" 
                  stroke="#10b981" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  strokeDasharray={50.2}
                  strokeDashoffset={50.2 - (50.2 * globalStats.winRate) / 100}
                  className="transition-all duration-700"
                />
              </svg>
            </div>
          </div>

          {/* Winners & Losers Counter badges */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              <span>{globalStats.winsCount} Gagnants</span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-500/10 border border-rose-500/10 text-rose-400 text-[10px] font-mono font-bold">
              <span className="w-1 h-1 rounded-full bg-rose-450" />
              <span>{globalStats.lossesCount} Perdants</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Moyenne des échanges gagnés/perdus */}
        <div className="bg-[#111622] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-36 min-h-[144px]">
          <div className="space-y-1">
            <span className="text-xs font-medium text-slate-400 block tracking-tight">Moyenne des échanges gagnés/perdus</span>
            <h3 className="text-lg font-black font-mono tracking-tight text-slate-200">
              Ratio: {globalStats.avgLoss > 0 ? (globalStats.avgWin / globalStats.avgLoss).toFixed(2) : '1.00'}
            </h3>
          </div>

          {/* Two-colored horizontal progress bar */}
          <div className="space-y-1.5">
            {(() => {
              const totalAvg = globalStats.avgWin + Math.abs(globalStats.avgLoss);
              const winBarPercent = totalAvg > 0 ? (globalStats.avgWin / totalAvg) * 100 : 50;
              return (
                <>
                  <div className="h-1.5 rounded-full flex overflow-hidden bg-slate-800">
                    <div style={{ width: `${winBarPercent}%` }} className="bg-emerald-500 h-full" />
                    <div style={{ width: `${100 - winBarPercent}%` }} className="bg-rose-500 h-full" />
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono font-bold">
                    <span className="text-emerald-400">+{globalStats.avgWin.toLocaleString(undefined, { maximumFractionDigits: 1 })} {currency}</span>
                    <span className="text-rose-450">-{Math.abs(globalStats.avgLoss).toLocaleString(undefined, { maximumFractionDigits: 1 })} {currency}</span>
                  </div>
                </>
              );
            })()}
          </div>
        </div>

      </div>

      {/* -----------------------------------------------------------
          SECTION 2: LE JOURNAL QUOTIDIEN (Central Bento Grid)
          ----------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="daily-journal-dashboard">
        
        {/* LEFT COLUMN: Chronological Days List (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Daily Panel Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111622] border border-white/5 p-4 rounded-xl">
            <div className="flex items-center gap-1.5">
              <button 
                type="button"
                onClick={handleCollapseAll}
                className="flex items-center gap-1 bg-[#1a202c] hover:bg-[#232a39] text-slate-300 font-bold text-xs px-3.5 py-2 rounded-lg border border-white/5 cursor-pointer transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Réduire tout</span>
              </button>
              <button 
                type="button"
                onClick={handleExpandAll}
                className="flex items-center gap-1 bg-[#1a202c] hover:bg-[#232a39] text-slate-300 font-bold text-xs px-3.5 py-2 rounded-lg border border-white/5 cursor-pointer transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                <span>Développer tout</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg shadow-md cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Jour De Journalisation</span>
              </button>
              <button 
                type="button"
                className="bg-[#1a202c] hover:bg-[#232a39] text-slate-400 hover:text-white p-2 rounded-lg border border-white/5 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Active Date Filter Bar */}
          {selectedDayKey && (
            <div className="bg-emerald-950/20 border border-emerald-500/20 px-4 py-2.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-bold">
                <Calendar className="w-4 h-4" />
                <span>Filtré pour le : {new Date(selectedDayKey + 'T12:00:00').toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedDayKey(null)}
                className="text-xs text-slate-400 hover:text-white underline font-medium"
              >
                Effacer le filtre
              </button>
            </div>
          )}

          {/* Add Form collapsible */}
          {showAddForm && (
            <motion.form 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleSubmitTrade} 
              className="bg-[#111622] border border-white/5 p-6 rounded-xl space-y-4"
              id="form-journal-add-trade"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Nouvelle Position Financière</h4>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">Symbole de l'Actif</label>
                  <input 
                    type="text" 
                    placeholder="Ex: BTC/USD ou EUR/USD"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    required
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">Direction</label>
                  <div className="grid grid-cols-2 gap-2 bg-[#0A0B0D] p-1 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => setDirection('BUY')}
                      className={`py-1 rounded-md text-xs font-bold transition-all ${direction === 'BUY' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-emerald-450 hover:bg-[#161B22]'}`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('SELL')}
                      className={`py-1 rounded-md text-xs font-bold transition-all ${direction === 'SELL' ? 'bg-rose-500 text-slate-950 shadow' : 'text-rose-450 hover:bg-[#161B22]'}`}
                    >
                      SELL
                    </button>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">Statut du trade</label>
                  <div className="grid grid-cols-2 gap-2 bg-[#0A0B0D] p-1 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => setAddStatus('OPEN')}
                      className={`py-1 rounded-md text-xs font-bold transition-all ${addStatus === 'OPEN' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:bg-[#161B22]'}`}
                    >
                      EN COURS
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddStatus('CLOSED')}
                      className={`py-1 rounded-md text-xs font-bold transition-all ${addStatus === 'CLOSED' ? 'bg-slate-500 text-slate-100 shadow' : 'text-slate-400 hover:bg-[#161B22]'}`}
                    >
                      CLÔTURÉ
                    </button>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">Stratégie / Configuration</label>
                  <input 
                    type="text"
                    list="common-setups"
                    placeholder="Ex: SMC, ICT..."
                    value={setup}
                    onChange={(e) => setSetup(e.target.value)}
                    required
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <datalist id="common-setups">
                    {COMMON_SETUPS.map((s, idx) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              {addStatus === 'CLOSED' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 p-3 rounded-xl border border-white/5">
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold mb-1">Résultat Réalisé</label>
                    <div className="grid grid-cols-2 gap-2 bg-[#0A0B0D] p-1 rounded-lg border border-white/5">
                      <button
                        type="button"
                        onClick={() => setAddResult('WON')}
                        className={`py-1.5 rounded-md text-xs font-bold transition-all ${addResult === 'WON' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-emerald-450 hover:bg-[#161B22]'}`}
                      >
                        GAGNANT 🟢
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddResult('LOST')}
                        className={`py-1.5 rounded-md text-xs font-bold transition-all ${addResult === 'LOST' ? 'bg-rose-500 text-slate-950 shadow' : 'text-rose-450 hover:bg-[#161B22]'}`}
                      >
                        PERDANT 🔴
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold mb-1">
                      {addResult === 'WON' ? 'Montant gagné' : 'Montant perdu'} ({currency})
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="0.00"
                      value={realizedAmount}
                      onChange={(e) => setRealizedAmount(e.target.value)}
                      required={addStatus === 'CLOSED'}
                      className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">🏆 Gain attendu ({currency})</label>
                  <input 
                    type="number" 
                    step="any"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 focus:outline-none font-mono"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">🛡️ Risque attendu ({currency})</label>
                  <input 
                    type="number" 
                    step="any"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* SECTION: CAPTURES D'ÉCRAN & LIENS */}
              <div className="border-t border-white/[0.04] pt-4 mt-2">
                <h5 className="text-[11px] font-black font-mono text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  <span>{language === 'fr' ? "Captures d'écran & Analyse" : "Screenshots & Analysis"}</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                      <span>{language === 'fr' ? "📷 Image Entrée (TradingView)" : "📷 Entry Image (TradingView)"}</span>
                    </label>
                    <input 
                      type="url" 
                      placeholder="https://www.tradingview.com/x/..."
                      value={tradingViewImageUrl}
                      onChange={(e) => setTradingViewImageUrl(e.target.value)}
                      className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                      <span>{language === 'fr' ? "📷 Image Sortie (TradingView)" : "📷 Exit Image (TradingView)"}</span>
                    </label>
                    <input 
                      type="url" 
                      placeholder="https://www.tradingview.com/x/..."
                      value={tradingViewImageExitUrl}
                      onChange={(e) => setTradingViewImageExitUrl(e.target.value)}
                      className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                      <span>{language === 'fr' ? "📰 Lien Investing.com / Actu" : "📰 Investing.com / News Link"}</span>
                    </label>
                    <input 
                      type="url" 
                      placeholder="https://fr.investing.com/news/..."
                      value={economicNewsUrl}
                      onChange={(e) => setEconomicNewsUrl(e.target.value)}
                      className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400 font-semibold">{language === 'fr' ? "Notes du trade" : "Trade Notes"}</label>
                  <VoiceInputButton value={notes} onChange={setNotes} language={language} />
                </div>
                <textarea 
                  rows={2}
                  placeholder="Ressenti, discipline, analyse..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-[#1a202c] hover:bg-[#232a39] text-slate-300 font-bold text-xs px-4 py-2 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer shadow-lg"
                >
                  Enregistrer
                </button>
              </div>
            </motion.form>
          )}

          {/* Chronological trading days cards */}
          <div className="space-y-4" id="daily-trading-days-list">
            {searchedDays.length === 0 ? (
              <div className="bg-[#111622] border border-white/5 p-12 rounded-2xl text-center space-y-2">
                <BookOpen className="w-10 h-10 text-slate-650 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">Aucune note ou journée de trading trouvée</h4>
                <p className="text-xs text-slate-500">Sélectionnez un autre jour dans le calendrier ou ajoutez un nouveau trade.</p>
              </div>
            ) : (
              searchedDays.map(day => {
                const isWinDay = day.netPnl >= 0;
                const isExpanded = expandedDays[day.dateKey] ?? true;

                return (
                  <div 
                    key={day.dateKey}
                    className="bg-[#111622] border border-white/5 rounded-xl p-5 hover:border-slate-800 transition-all space-y-4"
                  >
                    {/* Header elements */}
                    <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedDays(prev => ({ ...prev, [day.dateKey]: !isExpanded }))}>
                      <div className="flex items-center gap-3">
                        <div className="text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                        <span className="font-semibold text-slate-200 text-sm md:text-base">{day.dateLabel}</span>
                        <span className="text-slate-600 font-bold font-mono">•</span>
                        <span className={`font-mono font-black text-sm md:text-base ${isWinDay ? 'text-emerald-400' : 'text-rose-500'}`}>
                          Résultat net {isWinDay ? '+' : ''}{day.netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleOpenNoteModal(day)}
                          className="flex items-center gap-1.5 bg-[#1C212E] hover:bg-[#252C3D] text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-white/5 cursor-pointer transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{hasNote(day) ? "Afficher La Note" : "Ajouter Une Note"}</span>
                        </button>
                        
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold shadow-inner">
                          {isWinDay ? '🟢' : '🔴'}
                        </div>
                      </div>
                    </div>

                    {/* Expandable stats & intra-day curve panel */}
                    {isExpanded && (
                      <div className="flex flex-col md:flex-row gap-5 items-center border-t border-white/5 pt-4">
                        
                        {/* Smooth intra-day AreaChart */}
                        <div className="w-full md:w-48 h-20 shrink-0 bg-[#0A0B0D]/40 border border-white/5 rounded-lg p-2.5 relative overflow-hidden flex flex-col justify-end">
                          <span className="absolute top-1 left-2 text-[8px] font-mono font-bold text-slate-500 tracking-wider">INTRA-DAY EVOLUTION</span>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={day.intraDayPnlSeries} margin={{ top: 12, right: 2, left: 2, bottom: -2 }}>
                              <defs>
                                <linearGradient id={`dayGrad-${day.dateKey}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={isWinDay ? '#10b981' : '#f43f5e'} stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor={isWinDay ? '#10b981' : '#f43f5e'} stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke={isWinDay ? '#10b981' : '#f43f5e'} 
                                strokeWidth={1.5} 
                                fillOpacity={1} 
                                fill={`url(#dayGrad-${day.dateKey})`} 
                                dot={false} 
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Bento layout 4 columns stats */}
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                          
                          {/* Column 1: Total & Success */}
                          <div className="border-r border-white/5 pr-4 space-y-2">
                            <div>
                              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Total transactions</span>
                              <span className="text-sm font-bold text-slate-200 font-mono">{day.totalTrades}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Taux de réussite</span>
                              <span className="text-sm font-bold text-sky-400 font-mono">{day.winRate.toFixed(2)}%</span>
                            </div>
                          </div>

                          {/* Column 2: Winners / Losers */}
                          <div className="border-r border-white/5 px-4 space-y-2">
                            <div>
                              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Gagnants</span>
                              <span className="text-sm font-bold text-emerald-400 font-mono">{day.winsCount}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Perdants</span>
                              <span className="text-sm font-bold text-rose-500 font-mono">{day.lossesCount}</span>
                            </div>
                          </div>

                          {/* Column 3: Gross Result & Volume */}
                          <div className="border-r border-white/5 px-4 space-y-2">
                            <div>
                              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Résultat brut</span>
                              <span className={`text-sm font-bold font-mono ${day.grossPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                {day.grossPnl.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Volume</span>
                              <span className="text-sm font-bold text-slate-200 font-mono">{day.volume.toFixed(2)} Lots</span>
                            </div>
                          </div>

                          {/* Column 4: Fees & Profit Factor */}
                          <div className="px-4 space-y-2">
                            <div>
                              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Commissions</span>
                              <span className="text-sm font-bold text-slate-300 font-mono">
                                {day.commissions.toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">Facteur de profit</span>
                              <span className="text-sm font-bold text-slate-200 font-mono">
                                {day.profitFactor === 99.9 ? '∞' : day.profitFactor.toFixed(2)}
                              </span>
                            </div>
                          </div>

                        </div>

                      </div>
                    )}

                    {/* Sub trades list breakdown if expanded */}
                    {isExpanded && day.trades.length > 0 && (
                      <div className="bg-[#0A0B0D]/40 rounded-lg p-3 border border-white/5 space-y-2 mt-4">
                        <span className="text-[9px] font-mono font-bold text-slate-500 tracking-wider uppercase block border-b border-white/5 pb-1">Positions du jour</span>
                        <div className="divide-y divide-white/5">
                          {day.trades.map(trade => (
                            <div key={trade.id} className="flex items-center justify-between py-2 text-xs">
                              <div className="flex items-center gap-3 flex-wrap">
                                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${trade.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                  {trade.direction}
                                </span>
                                <span className="font-bold text-slate-300">{trade.symbol}</span>
                                <span className="text-slate-500 italic">@{trade.setup}</span>

                                {/* Interactive Mini Visual Links */}
                                <div className="flex items-center gap-1 ml-2">
                                  {trade.tradingViewImageUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setLightboxUrl(trade.tradingViewImageUrl || null)}
                                      className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/25 rounded hover:border-emerald-500/50 text-emerald-400 text-[9px] font-bold cursor-pointer transition-all hover:scale-105"
                                      title={language === 'fr' ? "Voir Graphique Entrée" : "View Entry Chart"}
                                    >
                                      <Camera className="w-2.5 h-2.5" />
                                      <span>{language === 'fr' ? 'Entrée' : 'Entry'}</span>
                                    </button>
                                  )}
                                  {trade.tradingViewImageExitUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setLightboxUrl(trade.tradingViewImageExitUrl || null)}
                                      className="flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-500/10 border border-rose-500/25 rounded hover:border-rose-500/50 text-rose-400 text-[9px] font-bold cursor-pointer transition-all hover:scale-105"
                                      title={language === 'fr' ? "Voir Graphique Sortie" : "View Exit Chart"}
                                    >
                                      <Camera className="w-2.5 h-2.5" />
                                      <span>{language === 'fr' ? 'Sortie' : 'Exit'}</span>
                                    </button>
                                  )}
                                  {trade.economicNewsUrl && (
                                    <a
                                      href={trade.economicNewsUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-0.5 px-1.5 py-0.5 bg-sky-500/10 border border-sky-500/25 rounded hover:border-sky-500/50 text-sky-400 text-[9px] font-bold cursor-pointer transition-all hover:scale-105"
                                      title={language === 'fr' ? "Lien Analyse Investing" : "Investing Analysis Link"}
                                    >
                                      <Globe className="w-2.5 h-2.5" />
                                      <span>Actu</span>
                                    </a>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <span className={`font-mono font-bold ${trade.pnl && trade.pnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                                  {trade.status === 'OPEN' ? '🟡 En cours' : `${trade.pnl && trade.pnl >= 0 ? '+' : ''}${(trade.pnl || 0).toLocaleString()} ${currency}`}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingTrade(trade);
                                      setEditSymbol(trade.symbol);
                                      setEditDirection(trade.direction);
                                      setEditStopLoss(trade.stopLoss ? String(trade.stopLoss) : '');
                                      setEditTakeProfit(trade.takeProfit ? String(trade.takeProfit) : '');
                                      setEditSetup(trade.setup || '');
                                      setEditNotes(trade.notes || '');
                                      setEditRating(trade.rating || 3);
                                      setEditPsychologyTags(trade.psychologyTags || []);
                                      setEditMistakeTags(trade.mistakeTags || []);
                                      setEditTradingViewImageUrl(trade.tradingViewImageUrl || '');
                                      setEditTradingViewImageExitUrl(trade.tradingViewImageExitUrl || '');
                                      setEditEconomicNewsUrl(trade.economicNewsUrl || '');
                                      setEditStatus(trade.status);
                                      if (trade.status === 'CLOSED') {
                                        setEditPnlResult((trade.pnl || 0) >= 0 ? 'WON' : 'LOST');
                                        setEditPnlAmount(String(Math.abs(trade.pnl || 0)));
                                      } else {
                                        setEditPnlResult('WON');
                                        setEditPnlAmount('');
                                      }
                                    }}
                                    className="p-1 text-slate-400 hover:text-amber-400 hover:bg-white/5 rounded transition-colors cursor-pointer"
                                    title="Modifier"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  {trade.status === 'OPEN' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setClosingTradeId(trade.id);
                                        setCloseResult('WON');
                                        setCloseAmountInput(trade.takeProfit ? String(trade.takeProfit) : '');
                                      }}
                                      className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-white/5 rounded transition-colors cursor-pointer"
                                      title="Clôturer"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setDeletingTradeId(trade.id)}
                                    className="p-1 text-slate-400 hover:text-rose-500 hover:bg-white/5 rounded transition-colors cursor-pointer"
                                    title="Supprimer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Monthly Calendar (lg:col-span-4) */}
        <div className="lg:col-span-4 bg-[#111622] border border-white/5 rounded-2xl p-5 space-y-4 h-fit">
          
          {/* Calendar header with month picker */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-black text-slate-200 uppercase tracking-wider font-mono">
              {monthsList[calendarDate.getMonth()]} {calendarDate.getFullYear()}
            </h3>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(calendarDate);
                  prev.setMonth(prev.getMonth() - 1);
                  setCalendarDate(prev);
                }}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarDate(new Date())}
                className="text-[9px] uppercase tracking-wider font-extrabold px-2 py-1 bg-[#1A202C] hover:bg-[#232a39] rounded text-slate-300 border border-white/5 cursor-pointer"
              >
                Courant
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = new Date(calendarDate);
                  next.setMonth(next.getMonth() + 1);
                  setCalendarDate(next);
                }}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekday indicator labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">
            <div>Lu</div>
            <div>Ma</div>
            <div>Me</div>
            <div>Je</div>
            <div>Ve</div>
            <div className="text-rose-450">Sa</div>
            <div className="text-rose-450">Di</div>
          </div>

          {/* Calendar days cells */}
          <div className="grid grid-cols-7 gap-1.5" id="calendar-days-grid">
            {calendarGridCells.map((cell, idx) => {
              if (cell.dayNum === null) {
                return <div key={`empty-${idx}`} className="h-9 bg-transparent" />;
              }

              const isSelected = selectedDayKey === cell.dateStr;
              const hasTrades = cell.hasTrades;

              // Find trades of this day to show quick coloring context
              const dayTrades = trades.filter(t => {
                const dateStr = t.closedAt || t.createdAt;
                return dateStr && dateStr.substring(0, 10) === cell.dateStr;
              });
              const dayPnlVal = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
              const isProfitDay = dayPnlVal > 0;
              const isLossDay = dayPnlVal < 0;

              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedDayKey(null);
                    } else {
                      setSelectedDayKey(cell.dateStr);
                      // Expand automatically if filtered
                      if (cell.dateStr) {
                        setExpandedDays(prev => ({ ...prev, [cell.dateStr!]: true }));
                      }
                    }
                  }}
                  className={`h-9 w-full rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer relative border ${
                    isSelected
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.35)] font-black'
                      : hasTrades
                        ? isProfitDay
                          ? 'bg-emerald-950/45 border-emerald-500/25 text-emerald-400 hover:bg-emerald-900/60'
                          : isLossDay
                            ? 'bg-rose-950/45 border-rose-500/25 text-rose-400 hover:bg-rose-900/60'
                            : 'bg-slate-900/60 border-slate-700/50 text-slate-300'
                        : 'bg-slate-900/20 border-white/[0.02] text-slate-500 hover:border-slate-800 hover:text-slate-300'
                  }`}
                  title={hasTrades ? `${dayTrades.length} trades: ${dayPnlVal > 0 ? '+' : ''}${dayPnlVal.toFixed(1)} ${currency}` : undefined}
                >
                  <span>{cell.dayNum}</span>
                  {hasTrades && !isSelected && (
                    <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isProfitDay ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[10px] text-slate-500 italic leading-relaxed pt-2 border-t border-white/5 font-mono">
            💡 Les jours enregistrant des transactions closes ou actives apparaissent en surbrillance. Cliquez dessus pour charger ou isoler le détail à gauche.
          </div>

        </div>

      </div>

      {/* -----------------------------------------------------------
          SECTION 3: LA LISTE DE POSITIONS AMÉLIORÉE
          ----------------------------------------------------------- */}
      <div 
        className={isFullScreen 
          ? "fixed inset-0 z-[120] bg-[#0A0D14]/98 backdrop-blur-md p-6 md:p-8 overflow-y-auto space-y-4 flex flex-col justify-start border border-white/10 shadow-2xl" 
          : "bg-[#111622] border border-white/5 rounded-2xl p-6 space-y-4"
        } 
        id="positions-table-dashboard"
      >
        
        {/* Bulk Header actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm text-slate-300 uppercase tracking-wide font-mono">Positions clôturées</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const newVal = !maskAmounts;
                  setMaskAmounts(newVal);
                  localStorage.setItem('trading_mask_amounts', String(newVal));
                }}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-white/5"
                title={maskAmounts ? (language === 'fr' ? "Afficher les montants" : "Show amounts") : (language === 'fr' ? "Masquer les montants" : "Hide amounts")}
              >
                {maskAmounts ? <EyeOff className="w-3.5 h-3.5 text-pink-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
              </button>
              <button
                type="button"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-white/5"
                title={isFullScreen ? (language === 'fr' ? "Quitter le plein écran" : "Exit full screen") : (language === 'fr' ? "Plein écran" : "Full screen")}
              >
                {isFullScreen ? <Minimize2 className="w-3.5 h-3.5 text-pink-400" /> : <Maximize2 className="w-3.5 h-3.5 text-slate-400" />}
              </button>
            </div>
            {selectedTradeIds.size > 0 && (
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-0.5 rounded-full font-bold">
                {selectedTradeIds.size} sélectionné(s)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowBulkActionsMenu(!showBulkActionsMenu)}
                className="flex items-center gap-1.5 bg-[#1C212E] hover:bg-[#252C3D] text-slate-300 font-bold text-xs px-4 py-2 rounded-lg border border-white/5 cursor-pointer transition-colors"
              >
                <span>Actions en vrac</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              
              {showBulkActionsMenu && (
                <div className="absolute right-0 mt-1.5 w-48 bg-[#181D29] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-30 animate-fadeIn">
                  <button
                    type="button"
                    onClick={handleBulkCSVExport}
                    disabled={selectedTradeIds.size === 0}
                    className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Exporter en CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={selectedTradeIds.size === 0}
                    className="w-full text-left px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-500/10 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer la sélection</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="bg-[#1C212E] hover:bg-[#252C3D] text-slate-400 hover:text-white p-2 rounded-lg border border-white/5 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Closed Trades Table */}
        <div className="overflow-x-auto">
          {closedTrades.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-semibold">
              Aucune transaction clôturée pour le moment.
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  <th className="py-3 px-4 w-10">
                    <input 
                      type="checkbox" 
                      checked={selectedTradeIds.size === closedTrades.length && closedTrades.length > 0}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5 bg-slate-900 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3">Date d'ouverture</th>
                  <th className="py-3 px-3">Symbole</th>
                  <th className="py-3 px-3">Statut</th>
                  <th className="py-3 px-3">Date de clôture</th>
                  <th className="py-3 px-3 text-right">Prix d'entrée</th>
                  <th className="py-3 px-3 text-right">Prix de sortie</th>
                  <th className="py-3 px-3 text-right">Résultat net</th>
                  <th className="py-3 px-3 text-right">ROI Net</th>
                  <th className="py-3 px-3 text-center">Aperçus de Zella</th>
                  <th className="py-3 px-3">Configurations</th>
                  <th className="py-3 px-4">Échelle de Zella</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {closedTrades.map((trade) => {
                  const isProfit = (trade.pnl || 0) >= 0;
                  const isSelected = selectedTradeIds.has(trade.id);
                  
                  // Quick Zella insights counter: 1 if before image, 2 if both
                  let zellaInsightsCount = 0;
                  if (trade.tradingViewImageUrl) zellaInsightsCount++;
                  if (trade.tradingViewImageExitUrl) zellaInsightsCount++;

                  // ROI Net Calculation: fallback using starter estimate balance
                  const starterBalanceEstimate = 10000;
                  const roiVal = trade.pnl ? (trade.pnl / starterBalanceEstimate) * 100 : 0;

                  // Zella scale percent length
                  const pnlVal = trade.pnl || 0;
                  const relativeSize = Math.min(100, (Math.abs(pnlVal) / maxAbsPnl) * 100);

                  return (
                    <tr 
                      key={trade.id} 
                      className={`hover:bg-white/[0.02] text-xs transition-colors text-slate-300 ${isSelected ? 'bg-emerald-500/[0.01]' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => handleToggleSelectTrade(trade.id)}
                          className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5 bg-slate-900 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {new Date(trade.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-100">
                        {trade.symbol}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${isProfit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-[#FF5D6B] border border-rose-500/10'}`}>
                          {isProfit ? 'GAGNER' : 'PERDRE'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                        {trade.closedAt ? new Date(trade.closedAt).toLocaleDateString('fr-FR') : '--'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {maskAmounts ? '••••' : (trade.entryPrice ? `${trade.entryPrice.toLocaleString()} $` : '0.00 $')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono">
                        {maskAmounts ? '••••' : (trade.exitPrice ? `${trade.exitPrice.toLocaleString()} $` : '--')}
                      </td>
                      <td className={`py-3 px-3 text-right font-bold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {maskAmounts ? '••••' : `${isProfit ? '+' : ''}${(trade.pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`}
                      </td>
                      <td className={`py-3 px-3 text-right font-bold font-mono ${isProfit ? 'text-emerald-400' : 'text-rose-500'}`}>
                        {maskAmounts ? '••••' : `${roiVal >= 0 ? '+' : ''}${roiVal.toFixed(2)}%`}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {trade.tradingViewImageUrl ? (
                            <button 
                              type="button"
                              onClick={() => setLightboxUrl(trade.tradingViewImageUrl || null)}
                              className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/25 hover:border-emerald-500/50 text-emerald-400 rounded text-[10px] font-black tracking-wide cursor-pointer transition-all hover:scale-105"
                              title={language === 'fr' ? "Voir Graphique Entrée (TradingView)" : "View Entry Chart (TradingView)"}
                            >
                              In
                            </button>
                          ) : null}
                          {trade.tradingViewImageExitUrl ? (
                            <button 
                              type="button"
                              onClick={() => setLightboxUrl(trade.tradingViewImageExitUrl || null)}
                              className="px-2 py-1 bg-rose-500/10 border border-rose-500/25 hover:border-rose-500/50 text-rose-400 rounded text-[10px] font-black tracking-wide cursor-pointer transition-all hover:scale-105"
                              title={language === 'fr' ? "Voir Graphique Sortie (TradingView)" : "View Exit Chart (TradingView)"}
                            >
                              Out
                            </button>
                          ) : null}
                          {trade.economicNewsUrl ? (
                            <a 
                              href={trade.economicNewsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 bg-sky-500/10 border border-sky-500/25 hover:border-sky-500/50 text-sky-400 rounded text-[10px] font-black tracking-wide cursor-pointer transition-all hover:scale-105 inline-block text-center"
                              title={language === 'fr' ? "Voir l'Analyse / Actualité (Investing.com)" : "View Analysis / News (Investing.com)"}
                            >
                              Actu
                            </a>
                          ) : null}
                          {!trade.tradingViewImageUrl && !trade.tradingViewImageExitUrl && !trade.economicNewsUrl ? (
                            <span className="text-slate-600 font-mono">-</span>
                          ) : null}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-450 italic">
                        {trade.setup || '--'}
                      </td>
                      <td className="py-3 px-4">
                        {/* Échelle de Zella: custom bicolored dynamic gauge centering at 0 */}
                        <div className="w-24 h-4 flex items-center relative">
                          <div className="absolute left-1/2 top-0 bottom-0 w-[1.5px] bg-slate-600 z-10" />
                          <div className="w-full h-[3px] bg-slate-800 rounded-full" />
                          {isProfit ? (
                            <div 
                              style={{ 
                                left: '50%', 
                                width: `${relativeSize / 2}%` 
                              }} 
                              className="absolute h-[6px] bg-emerald-500 rounded-r-full"
                            />
                          ) : (
                            <div 
                              style={{ 
                                right: '50%', 
                                width: `${relativeSize / 2}%` 
                              }} 
                              className="absolute h-[6px] bg-rose-500 rounded-l-full"
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>

      {/* -----------------------------------------------------------
          MODAL: DAY NOTES EDITOR / VIEWER
          ----------------------------------------------------------- */}
      <AnimatePresence>
        {activeNotesDay && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
            <div 
              className="w-full max-w-lg bg-[#111622] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider font-mono">
                    Notes du journal : {activeNotesDay.dateLabel}
                  </h4>
                </div>
                <button type="button" onClick={() => setActiveNotesDay(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-slate-400">Ressenti psychologique, bilan de la journée, respect de la discipline :</label>
                  <VoiceInputButton value={editingNoteText} onChange={setEditingNoteText} language={language} />
                </div>
                <textarea
                  rows={6}
                  value={editingNoteText}
                  onChange={(e) => setEditingNoteText(e.target.value)}
                  placeholder="Écrivez vos notes de trading de la journée..."
                  className="w-full bg-[#0A0B0D] border border-white/5 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setActiveNotesDay(null)}
                  className="bg-[#1a202c] hover:bg-[#232a39] text-slate-300 text-xs px-4 py-2 rounded-lg cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleSaveDayNote}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer shadow-lg"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* -----------------------------------------------------------
          MODAL: EDIT TRADE
          ----------------------------------------------------------- */}
      <AnimatePresence>
        {editingTrade && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
            <form 
              onSubmit={handleEditTradeSubmit} 
              className="w-full max-w-2xl bg-[#111622] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4 my-8"
              onClick={(e) => e.stopPropagation()}
              id="form-edit-trade"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-amber-500" />
                  <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider font-mono">
                    Modifier la Position
                  </h4>
                </div>
                <button 
                  type="button" 
                  onClick={() => setEditingTrade(null)} 
                  className="text-slate-400 hover:text-slate-100 p-1 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">Symbole de l'Actif</label>
                  <input 
                    type="text" 
                    value={editSymbol}
                    onChange={(e) => setEditSymbol(e.target.value)}
                    required
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">Direction</label>
                  <div className="grid grid-cols-2 gap-2 bg-[#0A0B0D] p-1 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => setEditDirection('BUY')}
                      className={`py-1.5 rounded-md text-all font-bold text-xs cursor-pointer ${editDirection === 'BUY' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-emerald-450 hover:bg-[#161B22]'}`}
                    >
                      BUY
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditDirection('SELL')}
                      className={`py-1.5 rounded-md text-all font-bold text-xs cursor-pointer ${editDirection === 'SELL' ? 'bg-rose-500 text-slate-950 shadow' : 'text-rose-450 hover:bg-[#161B22]'}`}
                    >
                      SELL
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">Status de Position</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as TradeStatus)}
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    <option value="OPEN">🔴 EN COURS</option>
                    <option value="CLOSED">🟢 CLÔTURÉ</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">Stratégie / Configuration</label>
                  <input 
                    type="text"
                    list="common-edit-setups"
                    value={editSetup}
                    onChange={(e) => setEditSetup(e.target.value)}
                    required
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                  <datalist id="common-edit-setups">
                    {COMMON_SETUPS.map((s, idx) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>
                </div>
              </div>

              {editStatus === 'CLOSED' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 p-3 rounded-xl border border-white/5">
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold mb-1">Résultat</label>
                    <div className="grid grid-cols-2 gap-2 bg-[#0A0B0D] p-1 rounded-lg border border-white/5">
                      <button
                        type="button"
                        onClick={() => setEditPnlResult('WON')}
                        className={`py-1 rounded-md text-xs font-bold transition-all ${editPnlResult === 'WON' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-emerald-450 hover:bg-[#161B22]'}`}
                      >
                        GAGNANT 🟢
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditPnlResult('LOST')}
                        className={`py-1 rounded-md text-xs font-bold transition-all ${editPnlResult === 'LOST' ? 'bg-rose-500 text-slate-950 shadow' : 'text-rose-450 hover:bg-[#161B22]'}`}
                      >
                        PERDANT 🔴
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold mb-1">
                      {editPnlResult === 'WON' ? "Montant du Gain réalisé" : "Montant de la Perte réalisée"} ({currency})
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="0.00"
                      value={editPnlAmount}
                      onChange={(e) => setEditPnlAmount(e.target.value)}
                      required={editStatus === 'CLOSED'}
                      className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">🏆 Gain attendu ({currency})</label>
                  <input 
                    type="number" 
                    step="any"
                    value={editTakeProfit}
                    onChange={(e) => setEditTakeProfit(e.target.value)}
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">🛡️ Risque attendu ({currency})</label>
                  <input 
                    type="number" 
                    step="any"
                    value={editStopLoss}
                    onChange={(e) => setEditStopLoss(e.target.value)}
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* SECTION: CAPTURES D'ÉCRAN & LIENS */}
              <div className="border-t border-white/[0.04] pt-4 mt-2">
                <h5 className="text-[11px] font-black font-mono text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-sky-400" />
                  <span>{language === 'fr' ? "Captures d'écran & Analyse" : "Screenshots & Analysis"}</span>
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                      <span>{language === 'fr' ? "📷 Image Entrée (TradingView)" : "📷 Entry Image (TradingView)"}</span>
                    </label>
                    <input 
                      type="url" 
                      placeholder="https://www.tradingview.com/x/..."
                      value={editTradingViewImageUrl}
                      onChange={(e) => setEditTradingViewImageUrl(e.target.value)}
                      className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                      <span>{language === 'fr' ? "📷 Image Sortie (TradingView)" : "📷 Exit Image (TradingView)"}</span>
                    </label>
                    <input 
                      type="url" 
                      placeholder="https://www.tradingview.com/x/..."
                      value={editTradingViewImageExitUrl}
                      onChange={(e) => setEditTradingViewImageExitUrl(e.target.value)}
                      className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                      <span>{language === 'fr' ? "📰 Lien Investing.com / Actu" : "📰 Investing.com / News Link"}</span>
                    </label>
                    <input 
                      type="url" 
                      placeholder="https://fr.investing.com/news/..."
                      value={editEconomicNewsUrl}
                      onChange={(e) => setEditEconomicNewsUrl(e.target.value)}
                      className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-slate-400 font-semibold">Notes psychologiques & techniques</label>
                  <VoiceInputButton value={editNotes} onChange={setEditNotes} language={language} />
                </div>
                <textarea 
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setEditingTrade(null)}
                  className="bg-[#0A0B0D] hover:bg-white/5 border border-white/5 text-slate-300 text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer shadow-lg transition-all font-mono"
                >
                  Valider
                </button>
              </div>
            </form>
          </div>
        )}
      </AnimatePresence>

      {/* -----------------------------------------------------------
          MODAL: CLOSE TRADE
          ----------------------------------------------------------- */}
      <AnimatePresence>
        {closingTradeId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
            <form 
              onSubmit={handleCloseTradeSubmit} 
              className="w-full max-w-lg bg-[#111622] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
              id="form-close-trade"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider font-mono">
                    Clôturer et Enregistrer le Résultat
                  </h4>
                </div>
                <button 
                  type="button" 
                  onClick={() => setClosingTradeId(null)} 
                  className="text-slate-400 hover:text-slate-100 p-1 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">Résultat Réalisé</label>
                  <div className="grid grid-cols-2 gap-2 bg-[#0A0B0D] p-1 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => {
                        setCloseResult('WON');
                        const t = trades.find(tr => tr.id === closingTradeId);
                        if (t && t.takeProfit) {
                          setCloseAmountInput(String(t.takeProfit));
                        }
                      }}
                      className={`py-1.5 rounded-md text-all font-bold text-xs cursor-pointer ${closeResult === 'WON' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-emerald-450 hover:bg-[#161B22]'}`}
                    >
                      GAGNANT 🟢
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCloseResult('LOST');
                        const t = trades.find(tr => tr.id === closingTradeId);
                        if (t && t.stopLoss) {
                          setCloseAmountInput(String(t.stopLoss));
                        }
                      }}
                      className={`py-1.5 rounded-md text-all font-bold text-xs cursor-pointer ${closeResult === 'LOST' ? 'bg-rose-500 text-slate-950 shadow' : 'text-rose-450 hover:bg-[#161B22]'}`}
                    >
                      PERDANT 🔴
                    </button>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">
                    {closeResult === 'WON' ? 'Montant du Gain' : 'Montant de la Perte'} ({currency})
                  </label>
                  <input 
                    type="number" 
                    step="any"
                    placeholder="0.00"
                    value={closeAmountInput}
                    onChange={(e) => setCloseAmountInput(e.target.value)}
                    required
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">Notes Post-Arbitrage (Optionnel)</label>
                  <textarea 
                    placeholder="Pourquoi avez-vous clôturé ?"
                    value={exitNotesInput}
                    onChange={(e) => setExitNotesInput(e.target.value)}
                    rows={3}
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setClosingTradeId(null)}
                  className="bg-[#0A0B0D] hover:bg-white/5 border border-white/5 text-slate-300 text-xs px-4 py-2 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer shadow-lg font-mono"
                >
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        )}
      </AnimatePresence>

      {/* -----------------------------------------------------------
          MODAL: CONFIRM DELETION
          ----------------------------------------------------------- */}
      <AnimatePresence>
        {deletingTradeId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
            <div 
              className="w-full max-w-md bg-[#111622] border border-rose-500/20 p-6 rounded-2xl shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="text-sm font-black uppercase text-rose-400 tracking-wider font-mono">
                Confirmer la Suppression
              </h4>
              <p className="text-xs text-slate-350 leading-relaxed">
                Voulez-vous vraiment supprimer cet enregistrement de transaction ? Cette action retirera définitivement cette position de votre journal.
              </p>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
                <button 
                  type="button" 
                  onClick={() => setDeletingTradeId(null)}
                  className="bg-[#0A0B0D] hover:bg-white/5 border border-white/5 text-slate-350 text-xs px-4 py-2 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    onDeleteTrade(deletingTradeId);
                    setDeletingTradeId(null);
                  }}
                  className="bg-rose-500/20 hover:bg-rose-600 text-rose-200 font-bold text-xs px-5 py-2 rounded-lg cursor-pointer"
                >
                  Oui, Supprimer
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* -----------------------------------------------------------
          LIGHTBOX IMAGE VIEW
          ----------------------------------------------------------- */}
      <AnimatePresence>
        {lightboxUrl && (
          <div 
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <div className="relative max-w-5xl max-h-[85vh] overflow-hidden rounded-xl border border-white/10 bg-[#161B22]" onClick={(e) => e.stopPropagation()}>
              <button 
                type="button" 
                onClick={() => setLightboxUrl(null)}
                className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/85 transition-colors z-20"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="p-3">
                <img 
                  src={lightboxUrl} 
                  alt="Aperçu du Graphique" 
                  referrerPolicy="no-referrer"
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
                />
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
