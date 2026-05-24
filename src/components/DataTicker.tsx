import React, { useMemo } from 'react';
import { Trade } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface DataTickerProps {
  language: Language;
  trades: Trade[];
  currency: string;
}

export default function DataTicker({ language, trades, currency }: DataTickerProps) {
  const isFr = language === 'fr';

  // 1. CALCULS DES DONNÉES RÉELLES DU JOURNAL
  const stats = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED');
    const totalTrades = closedTrades.length;
    
    // Calcul du profit net réel
    const netProfit = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    
    // Calcul du taux de réussite réel
    const wins = closedTrades.filter(t => (t.pnl || 0) > 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    
    // Nombre de positions actives en cours
    const openTradesCount = trades.filter(t => t.status === 'OPEN').length;

    // Sélection des 5 dernières positions enregistrées pour le défilement
    // Triés par date de création décroissante (la plus récente d'abord)
    const recentTrades = [...trades]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      netProfit,
      winRate,
      openTradesCount,
      recentTrades,
      totalTrades
    };
  }, [trades]);

  // 2. SIMULATION OU GESTION OBJECTIFS PROP FIRM
  // On estime un compte à 100 000$ par défaut ou basé sur votre capital réel de départ
  const propFirmCapital = trades.length > 0 ? 100000 : 5000;
  const targetGoal = propFirmCapital * 0.10; // Objectif standard de +10% pour passer l'évaluation
  const currentProfit = stats.netProfit;
  const targetCompletedPercent = Math.min(100, Math.max(0, (currentProfit / targetGoal) * 100));
  const targetRemainingPercent = 100 - targetCompletedPercent;

  // Libellés traduits pour le Ticker
  const labels = {
    target: isFr ? 'Objectif Progrès' : 'Target Progress',
    remaining: isFr ? 'Encore' : 'Left',
    dailyDrawdown: isFr ? 'Drawdown Jour Restant' : 'Daily DD Remaining',
    totalDrawdown: isFr ? 'Drawdown Total Restant' : 'Total DD Remaining',
    newsAlert: isFr ? 'ALERTE CALENDRIER' : 'CALENDAR ALERT',
    liveTick: isFr ? 'JOURNAL EN DIRECT' : 'LIVE JOURNAL FEED',
    noTrades: isFr 
      ? 'Enregistrez votre premier trade dans le journal pour voir vos statistiques ici ! 🚀' 
      : 'Register your first trade in the journal to see live statistics here! 🚀',
    netProfitLabel: isFr ? 'Profit Journal' : 'Journal Profit',
    winRateLabel: isFr ? 'Taux de Réussite' : 'Win Rate',
    openTradesLabel: isFr ? 'Positions Actives' : 'Open Positions',
    recentTitle: isFr ? 'Derniers enregistrements' : 'Last recorded'
  };

  // Rendu du contenu du défilement
  const renderTickerContent = () => {
    return (
      <div className="flex items-center gap-12 whitespace-nowrap px-4 py-1">
        
        {/* SECTION 1: STATS DU JOURNAL EN TEMPS RÉEL */}
        <div className="flex items-center gap-6">
          <span className="text-[10px] bg-sky-500/15 text-sky-400 font-extrabold tracking-wider px-2 py-0.5 rounded border border-sky-500/20 uppercase font-mono">
            📊 STATS JOURNAL
          </span>
          
          {/* Profit Net */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold font-mono">
            <span>💶 {labels.netProfitLabel} :</span>
            <span className={`font-extrabold ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.netProfit >= 0 ? '+' : ''}{stats.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
            </span>
          </div>

          <div className="w-px h-3.5 bg-white/10" />

          {/* Win Rate */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold font-mono">
            <span>🎯 {labels.winRateLabel} :</span>
            <span className="text-white font-extrabold">{stats.winRate.toFixed(1)}%</span>
            <span className="text-slate-500 text-[10px]">({stats.totalTrades} trades)</span>
          </div>

          <div className="w-px h-3.5 bg-white/10" />

          {/* Active Positions */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-bold font-mono">
            <span>⚡ {labels.openTradesLabel} :</span>
            <span className={`px-2 py-0.2 rounded font-extrabold text-[11px] ${stats.openTradesCount > 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400'}`}>
              {stats.openTradesCount}
            </span>
          </div>
        </div>

        {/* Separateur inter-sections */}
        <span className="text-slate-700 font-bold text-sm tracking-widest font-mono">|||</span>

        {/* SECTION 2: VOS DERNIÈRES POSITIONS RÉELLES DU JOURNAL */}
        <div className="flex items-center gap-6">
          <span className="text-[10px] bg-emerald-500/15 text-emerald-400 font-extrabold tracking-wider px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-mono">
            📈 JOURNAL POSITIONS
          </span>
          
          {stats.recentTrades.length === 0 ? (
            <span className="text-xs text-slate-400 italic font-mono">{labels.noTrades}</span>
          ) : (
            stats.recentTrades.map((trade, idx) => {
              const isProfit = (trade.pnl || 0) > 0;
              const isClosed = trade.status === 'CLOSED';
              
              return (
                <React.Fragment key={trade.id}>
                  <div className="flex items-center gap-2 text-xs font-semibold font-mono bg-[#161B22]/60 px-3 py-1 rounded border border-white/5">
                    {/* Direction symbol / badge */}
                    <span className={`text-[10px] font-extrabold px-1.5 rounded ${trade.direction === 'BUY' ? 'bg-sky-500/10 text-sky-400' : 'bg-red-500/10 text-red-400'}`}>
                      {trade.direction}
                    </span>

                    {/* Pair / Symbol */}
                    <span className="text-slate-100 font-bold">{trade.symbol}</span>

                    {/* Entry / Exit Rates */}
                    <span className="text-slate-400 font-medium">@{trade.entryPrice.toLocaleString()}</span>
                    
                    {/* Status / PnL Display */}
                    {isClosed ? (
                      <span className={`text-[11px] font-extrabold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfit ? '✅' : '❌'} {isProfit ? '+' : ''}{(trade.pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 1 })} {currency}
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.2 rounded font-extrabold">
                        🟢 OPEN
                      </span>
                    )}
                  </div>
                  {idx < stats.recentTrades.length - 1 && (
                    <div className="w-1.5 h-1.5 bg-white/20 rounded-full" />
                  )}
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Separateur inter-sections */}
        <span className="text-slate-700 font-bold text-sm tracking-widest font-mono">|||</span>

        {/* SECTION 3: CALENDRIER ÉCONOMIQUE & INFRASTRUCTURE */}
        <div className="flex items-center gap-4">
          <span className="text-[10px] bg-rose-500/15 text-rose-400 font-extrabold tracking-wider px-2 py-0.5 rounded border border-rose-500/20 uppercase font-mono animate-pulse">
            📅 ECO CALENDAR
          </span>
          <div className="flex items-center gap-2 text-xs font-semibold font-mono text-slate-200 bg-[#1e1518] px-3 py-1 rounded border border-red-500/15">
            <span className="text-red-500 font-extrabold">🔴 {labels.newsAlert} :</span>
            <span className="text-[#fd999a] font-bold">USD</span>
            <span className="text-slate-300 font-medium">
              - Core Retail Sales dans 2h15 (Haute Volatilité attendue / SMC Trade setups sous étroite surveillance)
            </span>
          </div>
        </div>

        {/* Ending padding gap */}
        <div className="w-12" />
      </div>
    );
  };

  return (
    <div 
      className="w-full bg-[#0E1116] border-b border-white/5 overflow-hidden flex items-center h-9 relative z-50 select-none"
      id="global-market-ticker"
    >
      {/* Live Badge Fixed Left to anchor style */}
      <div className="absolute left-0 top-0 bottom-0 px-3 bg-[#0A0B0D] border-r border-white/5 flex items-center gap-1.5 z-20 shadow-[8px_0_12px_rgba(0,0,0,0.5)]">
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full absolute left-[12px] shrink-0" />
        <span className="text-[9px] font-bold font-mono tracking-wider text-slate-400 uppercase">
          {labels.liveTick}
        </span>
      </div>

      {/* Scrolling Container */}
      <div className="w-full ml-[160px] sm:ml-[180px] overflow-hidden flex">
        <div 
          className="flex animate-[ticker_45s_linear_infinite] hover:[animation-play-state:paused]"
          style={{ width: 'max-content' }}
        >
          {/* Render thrice to maintain perfectly dense continuous alignment loops */}
          {renderTickerContent()}
          {renderTickerContent()}
          {renderTickerContent()}
        </div>
      </div>

      {/* CSS Animation Keyframes Injector */}
      <style>{`
        @keyframes ticker {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translate3d(-33.3333%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
