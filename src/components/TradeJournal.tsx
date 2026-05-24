import React, { useState, useMemo } from 'react';
import { Trade, TradeDirection, TradeStatus } from '../types';
import { 
  Plus, Search, Calendar, Edit2, CheckCircle, Trash2, X, Star, Filter, 
  TrendingUp, TrendingDown, BookOpen, Camera, Globe, ChevronLeft, ChevronRight, Eye, ExternalLink
} from 'lucide-react';

interface TradeJournalProps {
  trades: Trade[];
  onAddTrade: (trade: Omit<Trade, 'id' | 'userId' | 'createdAt'>) => void;
  onUpdateTrade: (id: string, updatedFields: Partial<Trade>) => void;
  onDeleteTrade: (id: string) => void;
  currency: string;
  language?: 'fr' | 'en';
}

const COMMON_SETUPS = [
  "Cassure de Support/Résistance",
  "Divergence RSI / MACD",
  "Croisement Moyennes Mobiles (EMA)",
  "Retracement Fibonacci",
  "Configuration Bougies / Englobante",
  "Double Top / Creux",
  "Breakout Range",
  "AI Opportunity Idea"
];

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function TradeJournal({ trades, onAddTrade, onUpdateTrade, onDeleteTrade, currency, language = 'fr' }: TradeJournalProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'WON' | 'LOST'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // View mode: LIST or CALENDAR
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // Image lightbox preview state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Close trade modal state
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closeResult, setCloseResult] = useState<'WON' | 'LOST'>('WON');
  const [closeAmountInput, setCloseAmountInput] = useState('');
  const [exitNotesInput, setExitNotesInput] = useState('');
  const [closeImageExitUrlInput, setCloseImageExitUrlInput] = useState('');

  // Delete trade custom confirmation modal state
  const [deletingTradeId, setDeletingTradeId] = useState<string | null>(null);

  // Edit trade modal state
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [editSymbol, setEditSymbol] = useState('');
  const [editDirection, setEditDirection] = useState<TradeDirection>('BUY');
  const [editSetup, setEditSetup] = useState('');
  const [editStopLoss, setEditStopLoss] = useState(''); // Montant attendu pour perdre
  const [editTakeProfit, setEditTakeProfit] = useState(''); // Montant attendu pour gagner
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

  const handleEditTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrade || !editSymbol) return;

    const stopVal = editStopLoss ? parseFloat(editStopLoss) : undefined;
    const profitVal = editTakeProfit ? parseFloat(editTakeProfit) : undefined;
    
    // Direct PNL from the simplified inputs
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

  // Add trade form state
  const [symbol, setSymbol] = useState('');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [addStatus, setAddStatus] = useState<TradeStatus>('OPEN');
  const [addResult, setAddResult] = useState<'WON' | 'LOST'>('WON');
  const [realizedAmount, setRealizedAmount] = useState('');
  const [stopLoss, setStopLoss] = useState(''); // Montant attendu pour perdre
  const [takeProfit, setTakeProfit] = useState(''); // Montant attendu pour gagner
  const [setup, setSetup] = useState('');
  const [notes, setNotes] = useState('');
  const [rating, setRating] = useState<number>(3);
  const [psychologyTags, setPsychologyTags] = useState<string[]>([]);
  const [mistakeTags, setMistakeTags] = useState<string[]>([]);
  const [tradingViewImageUrl, setTradingViewImageUrl] = useState('');
  const [tradingViewImageExitUrl, setTradingViewImageExitUrl] = useState('');
  const [economicNewsUrl, setEconomicNewsUrl] = useState('');

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

    // Reset Form
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

    // Reset closing state
    setClosingTradeId(null);
    setCloseResult('WON');
    setCloseAmountInput('');
    setExitNotesInput('');
    setCloseImageExitUrlInput('');
  };

  // Filter & Search Logic
  const filteredTrades = useMemo(() => {
    return trades
      .filter(t => {
        if (filterStatus === 'OPEN' && t.status !== 'OPEN') return false;
        if (filterStatus === 'CLOSED' && t.status !== 'CLOSED') return false;
        if (filterStatus === 'WON' && (t.status !== 'CLOSED' || (t.pnl || 0) < 0)) return false;
        if (filterStatus === 'LOST' && (t.status !== 'CLOSED' || (t.pnl || 0) >= 0)) return false;
        
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          return (
            t.symbol.toLowerCase().includes(term) ||
            (t.setup || '').toLowerCase().includes(term) ||
            (t.notes || '').toLowerCase().includes(term)
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Newest first
  }, [trades, filterStatus, searchTerm]);

  return (
    <div className="space-y-6">
      
      {/* Search Header and Action Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#161B22] border border-white/5 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-sky-450" />
          <div>
            <h3 className="text-sm font-semibold text-slate-200">Journal des Positions</h3>
            <p className="text-xs text-slate-400">Enregistrez et analysez votre feuille de route</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Segmented Vue Mode controls */}
          <div className="flex items-center bg-[#0A0B0D] p-1 rounded-lg border border-white/5">
            <button
              type="button"
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'LIST' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Liste</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('CALENDAR')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'CALENDAR' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Calendrier</span>
            </button>
          </div>

          <button 
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-md transition-all cursor-pointer"
            id="btn-add-trade"
          >
            {showAddForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddForm ? 'Fermer le formulaire' : 'Enregistrer un Trade'}
          </button>
        </div>
      </div>

      {/* Add New Trade Form (Collapsible) */}
      {showAddForm && (
        <form onSubmit={handleSubmitTrade} className="bg-[#161B22] border border-white/5 p-6 rounded-xl space-y-4 animate-fadeIn" id="form-register-trade">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-350 border-b border-white/5 pb-2">Nouvelle Position Financière</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-semibold mb-1">Symbole de l'Actif</label>
              <input 
                type="text" 
                placeholder="Ex: BTC/USD ou EUR/USD"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
                className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-semibold mb-1">Direction</label>
              <div className="grid grid-cols-2 gap-2 bg-[#0A0B0D] p-1 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={() => setDirection('BUY')}
                  className={`py-1 rounded-md text-xs font-bold transition-all ${direction === 'BUY' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-emerald-400 hover:bg-[#161B22]'}`}
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
                list="common-setups-list"
                placeholder="Ex: RSI Divergence, SMC..."
                value={setup}
                onChange={(e) => setSetup(e.target.value)}
                required
                className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
              <datalist id="common-setups-list">
                {COMMON_SETUPS.map((s, idx) => (
                  <option key={idx} value={s} />
                ))}
              </datalist>
            </div>

          </div>

          {/* Conditional Layout for CLOSED trades */}
          {addStatus === 'CLOSED' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900/40 p-3 rounded-xl border border-white/5">
              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1">Résultat Réalisé</label>
                <div className="grid grid-cols-2 gap-2 bg-[#0A0B0D] p-1 rounded-lg border border-white/5">
                  <button
                    type="button"
                    onClick={() => setAddResult('WON')}
                    className={`py-1 rounded-md text-xs font-bold transition-all ${addResult === 'WON' ? 'bg-emerald-505 bg-emerald-500 text-slate-950 shadow' : 'text-emerald-400 hover:bg-[#161B22]'}`}
                  >
                    GAGNANT 🟢
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddResult('LOST')}
                    className={`py-1 rounded-md text-xs font-bold transition-all ${addResult === 'LOST' ? 'bg-rose-500 text-slate-950 shadow' : 'text-rose-450 hover:bg-[#161B22]'}`}
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
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-semibold mb-1">
                🏆 Montant attendu pour gagner ({currency}) <span className="text-[10px] text-slate-500">(Optionnel)</span>
              </label>
              <input 
                type="number" 
                step="any"
                placeholder="Ex : Objectif de gain ciblé"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 focus:outline-none font-mono"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-semibold mb-1">
                🛡️ Montant attendu pour perdre ({currency}) <span className="text-[10px] text-slate-500">(Optionnel)</span>
              </label>
              <input 
                type="number" 
                step="any"
                placeholder="Ex : Risque maximum planifié"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 focus:outline-none font-mono"
              />
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="flex flex-col md:col-span-3">
              <label className="text-xs text-slate-400 font-semibold mb-1">Notes psychologiques & techniques</label>
              <textarea 
                rows={2}
                placeholder="Ressenti émotionnel, conditions du SMC / ICT, respect du plan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none"
              />
            </div>

            <div className="flex flex-col justify-center">
              <label className="text-xs text-slate-400 font-semibold mb-1">Discipline (Note mentale)</label>
              <div className="flex items-center gap-1.5 bg-[#0A0B0D] p-2.5 rounded-lg border border-white/5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="hover:scale-110 transition-transform"
                  >
                    <Star className={`w-4 h-4 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                  </button>
                ))}
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-3">
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
                <span>🧠 État Psychologique / Émotions</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['FOMO 🚀', 'Overconfidence 😎', 'Patience 🙏', 'Stress 😰', 'Revenge Trading 😡', 'Discipline 🎯', 'Greed 🤑', 'Fear of Loss 😨'].map((tag) => {
                  const active = psychologyTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setPsychologyTags(psychologyTags.filter(t => t !== tag));
                        } else {
                          setPsychologyTags([...psychologyTags, tag]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-all cursor-pointer ${
                        active 
                          ? 'bg-sky-500/15 text-sky-450 border-sky-500/30 font-bold' 
                          : 'bg-[#0A0B0D] text-slate-400 border-white/5 hover:text-slate-300'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
                <span>⚠️ Erreurs Comportementales / Techniques</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['Over-leveraging ⚠️', 'Moved SL/TP early 🚫', 'Chasing Market 🏃‍♂️', 'Bad Entry 📉', 'Broke SMC Rules ❌', 'Revenge Entry 🔄', 'No Mistake ✅'].map((tag) => {
                  const active = mistakeTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (active) {
                          setMistakeTags(mistakeTags.filter(t => t !== tag));
                        } else {
                          setMistakeTags([...mistakeTags, tag]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-all cursor-pointer ${
                        active 
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold' 
                          : 'bg-[#0A0B0D] text-slate-400 border-white/5 hover:text-slate-300'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-3">
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-sky-400" />
                <span>Graphique Avant (Prix d'Entrée)</span>
              </label>
              <input 
                type="url" 
                placeholder="Lien de l'image (TradingView, etc.)"
                value={tradingViewImageUrl}
                onChange={(e) => setTradingViewImageUrl(e.target.value)}
                className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Graphique Après (Analyse Sortie)</span>
              </label>
              <input 
                type="url" 
                placeholder="Lien de l'image (TradingView, etc.)"
                value={tradingViewImageExitUrl}
                onChange={(e) => setTradingViewImageExitUrl(e.target.value)}
                className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                <span>Lien de l'annonce économique</span>
              </label>
              <input 
                type="url" 
                placeholder="Ex : ForexFactory, Investing..."
                value={economicNewsUrl}
                onChange={(e) => setEconomicNewsUrl(e.target.value)}
                className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
               type="submit"
               className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs px-6 py-2.5 rounded-lg cursor-pointer transition-colors shadow-lg hover:shadow-sky-500/10"
            >
              Enregistrer dans le Journal
            </button>
          </div>
        </form>
      )}

      {viewMode === 'LIST' ? (
        <>
          {/* Filtering and search row */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#161B22] border border-white/5 p-3 rounded-xl col-span-full">
            <div className="flex flex-wrap items-center gap-1.5 bg-[#0A0B0D] p-1 rounded-lg border border-white/5">
              <button
                type="button"
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${filterStatus === 'ALL' ? 'bg-white/5 text-slate-100 shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Tous ({trades.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('OPEN')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${filterStatus === 'OPEN' ? 'bg-sky-500/10 text-sky-400 shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Encours ({trades.filter(t => t.status === 'OPEN').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('CLOSED')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${filterStatus === 'CLOSED' ? 'bg-slate-500/10 text-slate-300 shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Clôturés ({trades.filter(t => t.status === 'CLOSED').length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('WON')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${filterStatus === 'WON' ? 'bg-emerald-500/10 text-emerald-400 shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Gagnés ({trades.filter(t => t.status === 'CLOSED' && (t.pnl || 0) >= 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('LOST')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${filterStatus === 'LOST' ? 'bg-rose-500/10 text-rose-455 shadow' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Perdus ({trades.filter(t => t.status === 'CLOSED' && (t.pnl || 0) < 0).length})
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Rechercher actif, note, plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#0A0B0D] border border-white/5 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 w-64"
              />
            </div>
          </div>

          {/* Trades History Table */}
          <div className="bg-[#161B22] border border-white/5 rounded-xl overflow-hidden">
            {filteredTrades.length === 0 ? (
              <div className="p-8 text-center">
                <Filter className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-400 text-xs font-semibold">Aucun trade trouvé correspondant à ces filtres.</p>
                <p className="text-slate-500 text-[10px] mt-1">Saisissez une nouvelle position à l'aide du bouton ci-dessus.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0A0B0D] text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-white/5">
                      <th className="p-4">Date</th>
                      <th className="p-4">Actif</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Objectifs & Risques</th>
                      <th className="p-4">Note Psycho & Discipline</th>
                      <th className="p-4 text-right">PnL ({currency})</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTrades.map((trade) => {
                      const isProfit = (trade.pnl || 0) >= 0;
                      
                      return (
                        <tr key={trade.id} className="hover:bg-white/5 transition-colors text-xs text-slate-300">
                          <td className="p-4 text-slate-400 font-mono text-[10px]">
                            {new Date(trade.createdAt).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-100">{trade.symbol}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                {trade.tradingViewImageUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxUrl(trade.tradingViewImageUrl || null)}
                                    className="text-sky-400 hover:text-sky-300 transition-colors px-1.5 py-0.5 hover:bg-sky-500/10 rounded border border-sky-500/15 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide cursor-pointer"
                                    title="Graphique d'entrée (Avant)"
                                  >
                                    <Camera className="w-2.5 h-2.5" />
                                    <span>Avant</span>
                                  </button>
                                )}
                                {trade.tradingViewImageExitUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxUrl(trade.tradingViewImageExitUrl || null)}
                                    className="text-emerald-400 hover:text-emerald-300 transition-colors px-1.5 py-0.5 hover:bg-emerald-500/10 rounded border border-emerald-500/15 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide cursor-pointer"
                                    title="Graphique de sortie (Après)"
                                  >
                                    <Camera className="w-2.5 h-2.5 text-emerald-400" />
                                    <span>Après</span>
                                  </button>
                                )}
                                {trade.economicNewsUrl && (
                                  <a
                                    href={trade.economicNewsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-amber-500 hover:text-amber-400 transition-colors p-0.5 hover:bg-white/5 rounded"
                                    title="Consulter l'annonce économique"
                                  >
                                    <Globe className="w-3 h-3 text-amber-500" />
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="text-[9px] text-slate-500 italic mt-0.5">{trade.setup}</div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${trade.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                              {trade.direction}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-[10.5px]">
                            <div className="flex flex-col gap-0.5">
                              {trade.takeProfit ? (
                                <span className="text-emerald-400/90 font-medium">🎯 Gain attendu: +{trade.takeProfit.toLocaleString()} {currency}</span>
                              ) : (
                                <span className="text-slate-600 font-medium">🎯 Gain attendu: -</span>
                              )}
                              {trade.stopLoss ? (
                                <span className="text-rose-400/95 font-medium">🛡️ Perte attendue: -{trade.stopLoss.toLocaleString()} {currency}</span>
                              ) : (
                                <span className="text-slate-600 font-medium">🛡️ Perte attendue: -</span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 max-w-xs">
                            <div className="truncate text-slate-400 text-[11px]" title={trade.notes}>
                              {trade.notes || <span className="text-slate-650 italic text-[10px]">Aucune observation</span>}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-1">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: trade.rating || 3 }).map((_, i) => (
                                  <Star key={i} className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                                ))}
                              </div>
                              {trade.psychologyTags && trade.psychologyTags.map((tag) => (
                                <span key={tag} className="text-[9px] bg-sky-500/10 text-sky-400 px-1 py-0.2 rounded font-medium border border-sky-500/10">
                                  {tag}
                                </span>
                              ))}
                              {trade.mistakeTags && trade.mistakeTags.map((tag) => (
                                <span key={tag} className={`text-[9px] px-1 py-0.2 rounded font-medium border ${tag.includes('No Mistake') || tag.includes('None') || tag.includes('✅') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10' : 'bg-rose-500/10 text-rose-400 border-rose-500/10'}`}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            {trade.status === 'OPEN' ? (
                              <span className="text-[10px] font-bold bg-sky-500/10 text-sky-400 px-2.5 py-1 rounded-md uppercase border border-sky-500/10 font-mono">
                                🟡 En cours
                              </span>
                            ) : (
                              <div className="flex flex-col items-end gap-1">
                                <span className={`font-mono font-bold text-xs ${isProfit ? 'text-emerald-400' : 'text-rose-450'}`}>
                                  {isProfit ? '+' : ''}{trade.pnl?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                                </span>
                                <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full font-mono ${isProfit ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' : 'bg-rose-500/10 text-[#FF5D6B] border border-rose-500/10'}`}>
                                  {isProfit ? '🟢 GAGNÉ' : '🔴 PERDU'}
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit Action */}
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
                                    const isWin = (trade.pnl || 0) >= 0;
                                    setEditPnlResult(isWin ? 'WON' : 'LOST');
                                    setEditPnlAmount(String(Math.abs(trade.pnl || 0)));
                                  } else {
                                    setEditPnlResult('WON');
                                    setEditPnlAmount('');
                                  }
                                }}
                                className="bg-amber-500/10 hover:bg-amber-500 hover:text-slate-950 text-amber-500 p-1.5 rounded transition-all cursor-pointer"
                                title="Modifier la position"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {trade.status === 'OPEN' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClosingTradeId(trade.id);
                                    setCloseResult('WON');
                                    setCloseAmountInput(trade.takeProfit ? String(trade.takeProfit) : '');
                                  }}
                                  className="bg-sky-500/20 hover:bg-sky-500 hover:text-white text-sky-400 p-1.5 rounded transition-all cursor-pointer"
                                  title="Clôturer le trade"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                              )}
                              
                              <button
                                type="button"
                                onClick={() => setDeletingTradeId(trade.id)}
                                className="bg-rose-500/10 hover:bg-rose-600 hover:text-slate-100 text-rose-400 p-1.5 rounded transition-all cursor-pointer"
                                title="Supprimer du journal"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-[#161B22] border border-white/5 p-5 rounded-2xl space-y-4 animate-fadeIn">
          {/* Calendar Navigation Header */}
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-sky-400" />
              <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest font-mono">
                {MONTHS_FR[calendarDate.getMonth()]} {calendarDate.getFullYear()}
              </h2>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const prev = new Date(calendarDate);
                  prev.setMonth(prev.getMonth() - 1);
                  setCalendarDate(prev);
                }}
                className="bg-[#0A0B0D] hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Mois Précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCalendarDate(new Date())}
                className="bg-[#0A0B0D] hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white text-[10px] uppercase font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
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
                className="bg-[#0A0B0D] hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
                title="Mois Suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-black uppercase text-slate-500 tracking-wider font-mono">
            <div>Lun</div>
            <div>Mar</div>
            <div>Mer</div>
            <div>Jeu</div>
            <div>Ven</div>
            <div className="text-slate-600">Sam</div>
            <div className="text-slate-600">Dim</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {(() => {
              const year = calendarDate.getFullYear();
              const month = calendarDate.getMonth();
              const firstDayOfMonth = new Date(year, month, 1);
              
              let startOffset = firstDayOfMonth.getDay() - 1;
              if (startOffset === -1) startOffset = 6;

              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells = [];

              // Padding cells
              for (let i = 0; i < startOffset; i++) {
                cells.push(
                  <div key={`pad-${i}`} className="bg-[#0A0B0D]/20 border border-transparent rounded-xl h-24 opacity-30" />
                );
              }

              // Days cells
              for (let d = 1; d <= daysInMonth; d++) {
                const dayTrades = trades.filter(t => {
                  if (t.status !== 'CLOSED' || !t.closedAt) return false;
                  const closedDate = new Date(t.closedAt);
                  return closedDate.getDate() === d &&
                         closedDate.getMonth() === month &&
                         closedDate.getFullYear() === year;
                });

                const dayPnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
                const hasTrades = dayTrades.length > 0;
                const isWinDay = dayPnl > 0;
                const isLossDay = dayPnl < 0;

                cells.push(
                  <div
                    key={`day-${d}`}
                    className={`bg-[#0A0B0D]/50 border ${
                      hasTrades 
                        ? isWinDay 
                          ? 'border-emerald-500/30 bg-emerald-950/10 shadow-lg shadow-emerald-500/2' 
                          : isLossDay 
                            ? 'border-rose-500/30 bg-rose-950/10 shadow-lg shadow-rose-500/2' 
                            : 'border-white/5'
                        : 'border-white/5 hover:border-slate-800'
                    } rounded-xl h-24 p-2 flex flex-col justify-between transition-all group overflow-hidden relative`}
                  >
                    <div className="flex justify-between items-center z-10">
                      <span className={`text-xs font-bold leading-none ${hasTrades ? 'text-slate-100 font-black' : 'text-slate-500'}`}>{d}</span>
                      {hasTrades && (
                        <span className="text-[9px] text-sky-450 font-bold font-mono bg-sky-500/10 px-1 py-px rounded shrink-0">
                          {dayTrades.length} Tr.
                        </span>
                      )}
                    </div>

                    {hasTrades ? (
                      <div className="text-left space-y-1.5 mt-1 z-10">
                        <div className={`text-[10px] font-black font-mono leading-none ${isWinDay ? 'text-emerald-400' : isLossDay ? 'text-rose-500' : 'text-slate-400'}`}>
                          {isWinDay ? '+' : ''}
                          {dayPnl.toLocaleString(undefined, { maximumFractionDigits: 1 })} {currency}
                        </div>
                        {/* Mini trades symbols */}
                        <div className="flex flex-col gap-0.5 max-h-[36px] overflow-hidden">
                          {dayTrades.slice(0, 2).map((t, idx) => (
                            <div key={idx} className="text-[8px] text-slate-400 truncate font-mono flex items-center justify-between">
                              <span className="font-semibold text-slate-300">{t.symbol}</span>
                              <span className={t.pnl && t.pnl > 0 ? 'text-emerald-400' : 'text-rose-500'}>
                                {t.pnl && t.pnl > 0 ? '+' : ''}{Math.round(t.pnl || 0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[8px] text-slate-700 italic text-center font-mono my-auto">aucun</div>
                    )}
                  </div>
                );
              }

              return cells;
            })()}
          </div>
          
          <div className="flex flex-wrap gap-4 text-[10px] text-slate-500 justify-end pt-3 border-t border-white/5 font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 block" /> Gain net journalier</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-950/20 border border-rose-500/30 block" /> Perte nette journalière</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#0A0B0D]/50 border border-white/5 block" /> Sans transactions</span>
          </div>
        </div>
      )}

      {/* Lightbox zoomed layout for TradingView charts */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn"
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
                alt="Graphique TradingView chargé" 
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
              />
              <div className="text-[10px] text-slate-400 mt-2 text-center font-mono">
                Aperçu de TradingView • <a href={lightboxUrl} target="_blank" rel="noreferrer" className="text-sky-400 underline hover:text-sky-300">Ouvrir l'image en pleine taille</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Centered Modal for Closing a Trade */}
      {closingTradeId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <form 
            onSubmit={handleCloseTradeSubmit} 
            className="w-full max-w-lg bg-[#161B22] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
            id="form-close-trade"
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-sky-400" />
                <h4 className="text-sm font-black text-slate-100 uppercase tracking-wider font-mono">
                  Clôturer et Enregistrer le Résultat
                </h4>
              </div>
              <button 
                type="button" 
                onClick={() => setClosingTradeId(null)} 
                className="text-slate-400 hover:text-slate-100 p-1 hover:bg-white/5 rounded-full transition-colors"
                title="Fermer"
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
                    className={`py-1.5 rounded-md text-all font-bold text-xs cursor-pointer ${closeResult === 'WON' ? 'bg-emerald-505 bg-emerald-500 text-slate-950 shadow' : 'text-emerald-450 hover:bg-[#161B22]'}`}
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
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1">Notes Post-Arbitrage (Optionnel)</label>
                <textarea 
                  placeholder="Raison de la fermeture, apprentissage, état d'esprit, respect de la discipline..."
                  value={exitNotesInput}
                  onChange={(e) => setExitNotesInput(e.target.value)}
                  rows={3}
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Graphique de Sortie / Après (Lien d'image TradingView)</span>
                </label>
                <input 
                  type="url" 
                  placeholder="Ex : https://www.tradingview.com/x/abc12345/"
                  value={closeImageExitUrlInput}
                  onChange={(e) => setCloseImageExitUrlInput(e.target.value)}
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
              <button 
                type="button" 
                onClick={() => setClosingTradeId(null)}
                className="bg-[#0A0B0D] hover:bg-white/5 border border-white/5 text-slate-300 text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Annuler
              </button>
              <button 
                type="submit"
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer shadow-lg hover:shadow-sky-500/10 transition-all font-mono"
              >
                Valider la Clôture
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Custom Modal for Deleting a Trade */}
      {deletingTradeId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div 
            className="w-full max-w-md bg-[#161B22] border border-rose-500/20 p-6 rounded-2xl shadow-2xl space-y-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-rose-400 border-b border-white/5 pb-3">
              <Trash2 className="w-5 h-5 animate-bounce-short" />
              <h4 className="text-sm font-black uppercase tracking-wider font-mono">
                Confirmation de Suppression
              </h4>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Voulez-vous vraiment supprimer cet enregistrement du journal ? Cette action est irréversible et retirera définitivement cette transaction de vos statistiques.
            </p>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
              <button 
                type="button" 
                onClick={() => setDeletingTradeId(null)}
                className="bg-[#0A0B0D] hover:bg-white/5 border border-white/5 text-slate-300 text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Annuler
              </button>
              <button 
                type="button"
                onClick={() => {
                  onDeleteTrade(deletingTradeId);
                  setDeletingTradeId(null);
                }}
                className="bg-rose-500/20 hover:bg-rose-600 text-rose-200 hover:text-white font-bold text-xs px-5 py-2 rounded-lg cursor-pointer transition-all"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal for Editing a Trade */}
      {editingTrade && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <form 
            onSubmit={handleEditTradeSubmit} 
            className="w-full max-w-2xl bg-[#161B22] border border-white/10 p-6 rounded-2xl shadow-2xl space-y-4 my-8 animate-scaleUp"
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
                title="Fermer"
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
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1">Direction</label>
                <div className="grid grid-cols-2 gap-2 bg-[#0A0B0D] p-1 rounded-lg border border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditDirection('BUY')}
                    className={`py-1.5 rounded-md text-all font-bold text-xs cursor-pointer ${editDirection === 'BUY' ? 'bg-emerald-500 text-slate-950 shadow' : 'text-emerald-400 hover:bg-[#161B22]'}`}
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
                <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">Status de Position</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TradeStatus)}
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                >
                  <option value="OPEN">🔴 EN COURS</option>
                  <option value="CLOSED">🟢 CLÔTURÉ</option>
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1">Stratégie / Configuration</label>
                <input 
                  type="text"
                  list="common-edit-setups-list"
                  value={editSetup}
                  onChange={(e) => setEditSetup(e.target.value)}
                  required
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
                <datalist id="common-edit-setups-list">
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
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1">🏆 Montant attendu pour gagner ({currency})</label>
                <input 
                  type="number" 
                  step="any"
                  value={editTakeProfit}
                  placeholder="Invalide"
                  onChange={(e) => setEditTakeProfit(e.target.value)}
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1">🛡️ Montant attendu pour perdre ({currency})</label>
                <input 
                  type="number" 
                  step="any"
                  value={editStopLoss}
                  placeholder="Invalide"
                  onChange={(e) => setEditStopLoss(e.target.value)}
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1">Discipline (Note mentale)</label>
                <div className="flex items-center gap-1.5 bg-[#0A0B0D] p-3 rounded-lg border border-white/5 h-[41px] w-full max-w-xs">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditRating(star)}
                      className="hover:scale-110 transition-transform cursor-pointer"
                    >
                      <Star className={`w-4 h-4 ${star <= editRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

             <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-semibold mb-1">Notes psychologiques & techniques</label>
              <textarea 
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 pt-3">
              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
                  <span>🧠 État Psychologique / Émotions</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['FOMO 🚀', 'Overconfidence 😎', 'Patience 🙏', 'Stress 😰', 'Revenge Trading 😡', 'Discipline 🎯', 'Greed 🤑', 'Fear of Loss 😨'].map((tag) => {
                    const active = editPsychologyTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (active) {
                            setEditPsychologyTags(editPsychologyTags.filter(t => t !== tag));
                          } else {
                            setEditPsychologyTags([...editPsychologyTags, tag]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-all cursor-pointer ${
                          active 
                            ? 'bg-sky-500/15 text-sky-450 border-sky-500/30 font-bold' 
                            : 'bg-[#0A0B0D] text-slate-400 border-white/5 hover:text-slate-300'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1.5 flex items-center gap-1">
                  <span>⚠️ Erreurs Comportementales / Techniques</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['Over-leveraging ⚠️', 'Moved SL/TP early 🚫', 'Chasing Market 🏃‍♂️', 'Bad Entry 📉', 'Broke SMC Rules ❌', 'Revenge Entry 🔄', 'No Mistake ✅'].map((tag) => {
                    const active = editMistakeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          if (active) {
                            setEditMistakeTags(editMistakeTags.filter(t => t !== tag));
                          } else {
                            setEditMistakeTags([...editMistakeTags, tag]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-all cursor-pointer ${
                          active 
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold' 
                            : 'bg-[#0A0B0D] text-slate-400 border-white/5 hover:text-slate-300'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-sky-450" />
                  <span>Graphique Avant (Prix d'Entrée)</span>
                </label>
                <input 
                  type="url" 
                  value={editTradingViewImageUrl}
                  placeholder="Lien de l'image"
                  onChange={(e) => setEditTradingViewImageUrl(e.target.value)}
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Graphique Après (Analyse Sortie)</span>
                </label>
                <input 
                  type="url" 
                  value={editTradingViewImageExitUrl}
                  placeholder="Lien de l'image"
                  onChange={(e) => setEditTradingViewImageExitUrl(e.target.value)}
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-xs text-slate-400 font-semibold mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-amber-500" />
                  <span>Lien Annonce Économique</span>
                </label>
                <input 
                  type="url" 
                  value={editEconomicNewsUrl}
                  placeholder="Lien ForexFactory..."
                  onChange={(e) => setEditEconomicNewsUrl(e.target.value)}
                  className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
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
                className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer shadow-lg hover:shadow-sky-500/10 transition-all font-mono"
              >
                Valider les Modifications
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
