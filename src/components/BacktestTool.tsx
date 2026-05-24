import React, { useState } from 'react';
import { Backtest } from '../types';
import { Sparkles, Play, DollarSign, Activity, Percent, Award, Bookmark, ArrowRightLeft, LayoutGrid, CalendarRange } from 'lucide-react';

export default function BacktestTool() {
  const [strategyName, setStrategyName] = useState('EMA 20/50 Trend Following');
  const [symbol, setSymbol] = useState('BTC/USD');
  const [startingCapital, setStartingCapital] = useState('10000');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backtestResult, setBacktestResult] = useState<Backtest | null>(null);

  const handleRunBacktest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strategyName || !symbol || !startingCapital) return;

    setLoading(true);
    setError(null);
    setBacktestResult(null);

    try {
      const resp = await fetch("/api/gemini/backtest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategyName,
          symbol,
          startingCapital: parseFloat(startingCapital)
        })
      });

      if (!resp.ok) {
        throw new Error("L'IA a échoué à exécuter la simulation de backtest. Vérifiez vos variables.");
      }

      const result = await resp.json();
      setBacktestResult(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur de communication avec le serveur.");
    } finally {
      setLoading(false);
    }
  };

  const getPnLStyle = (val: number) => {
    return val >= 0 ? 'text-emerald-400' : 'text-rose-400';
  };

  return (
    <div className="space-y-6">
      
      {/* Intro & Search Settings */}
      <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-6 rounded-2xl shadow-xl relative overflow-hidden glow-sky-card">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-[45px] pointer-events-none" />
        <div className="flex items-center gap-2 mb-3 relative z-10">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest font-mono">Laboratoire de Rétro-testing (Backtesting)</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-5 font-medium relative z-10">
          Définissez une idée de stratégie et un actif. Notre algorithme épaulé par l'IA va simuler des transactions basées sur des modèles de chandeliers historiques réels pour évaluer l'espérance de gain à long terme de votre méthode.
        </p>

        <form onSubmit={handleRunBacktest} className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
          <div className="flex flex-col">
            <label className="text-xs text-slate-400 font-semibold mb-1">Stratégie à tester</label>
            <input 
              type="text"
              value={strategyName}
              onChange={(e) => setStrategyName(e.target.value)}
              placeholder="Ex: RSI Divergence Buy"
              required
              className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400 font-semibold mb-1">Actif (Symbol)</label>
            <input 
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="Ex: GBP/USD, Gold sur 4H"
              required
              className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-slate-400 font-semibold mb-1">Capital initial simulé</label>
            <input 
              type="number"
              value={startingCapital}
              onChange={(e) => setStartingCapital(e.target.value)}
              placeholder="10000"
              required
              className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex flex-col justify-end">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-55 text-white font-bold text-xs py-3 rounded-lg cursor-pointer transition-all active:scale-[0.99] shadow-lg"
            >
              <Play className="w-4 h-4" />
              {loading ? "Calcul Rétroactif (IA)..." : "Simuler la Stratégie"}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 bg-rose-950/40 border border-rose-900 text-rose-300 p-3.5 rounded-lg text-xs">
            {error}
          </div>
        )}
      </div>

      {/* Loading state placeholders */}
      {loading && (
        <div className="bg-[#161B22] border border-white/5 p-8 rounded-xl text-center space-y-4">
          <div className="w-12 h-12 border-4 border-sky-500/25 border-t-sky-450 rounded-full animate-spin mx-auto" />
          <h4 className="text-slate-200 text-xs font-semibold">Analyse de l'espérance mathématique en cours...</h4>
          <p className="text-slate-500 text-[11px] max-w-sm mx-auto leading-normal">
            L'intelligence artificielle simule les points d'entrée, calcule les Drawdowns consécutifs et établit la balance finale. Veuillez patienter une dizaine de secondes.
          </p>
        </div>
      )}

      {/* Simulation Result */}
      {backtestResult && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Dashboard Summary Column */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-5 rounded-2xl shadow-md">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Profit Net Virtuel</span>
              <div className={`text-lg font-bold font-mono ${getPnLStyle(backtestResult.netProfit)}`}>
                {backtestResult.netProfit >= 0 ? '+' : ''}{backtestResult.netProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })} $
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Capital final : {(backtestResult.startingCapital + backtestResult.netProfit).toLocaleString()} $</p>
            </div>

            <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-5 rounded-2xl shadow-md">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Taux de gain (Win Rate)</span>
              <div className="text-lg font-bold text-slate-100 font-mono">
                {backtestResult.winRate}%
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{backtestResult.totalTrades} positions simulées</p>
            </div>

            <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-5 rounded-2xl shadow-md">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Facteur de Profit</span>
              <div className={`text-lg font-bold text-slate-100 font-mono ${backtestResult.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-slate-300'}`}>
                {backtestResult.profitFactor}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Gains cumulés / pertes cumulées</p>
            </div>

            <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-5 rounded-2xl shadow-md">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1">Verdict de la Stratégie</span>
              <span className={`inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full mt-2 ${backtestResult.winRate >= 50 && backtestResult.profitFactor >= 1.2 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-500'}`}>
                {backtestResult.winRate >= 50 && backtestResult.profitFactor >= 1.2 ? "✓ Viable à long terme" : "⚠ À réajuster"}
              </span>
            </div>

          </div>

          {/* Timeline of backtest trades */}
          <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-[#0A0B0D] p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarRange className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-slate-200">Rapport de Transactions Rétroactives</h4>
              </div>
              <span className="text-[10px] text-slate-400 font-bold italic">Simulé sur historique réel</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0A0B0D] text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-white/5">
                    <th className="p-4">Date simulée</th>
                    <th className="p-4">Sens</th>
                    <th className="p-4 text-right">Prix Entrée</th>
                    <th className="p-4 text-right">Prix Sortie</th>
                    <th className="p-4 text-right">Gains/Pertes ($)</th>
                    <th className="p-4 text-right">Gains %</th>
                    <th className="p-4">Commentaire d'Analyse IA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {backtestResult.simulationTrades.map((t) => (
                    <tr key={t.id} className="hover:bg-white/5 text-xs text-slate-300 transition-colors">
                      <td className="p-4 font-mono text-[11px] text-slate-400">{t.date}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold ${t.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {t.direction}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-200">{t.entryPrice.toLocaleString()}</td>
                      <td className="p-4 text-right font-mono text-slate-200">{t.exitPrice.toLocaleString()}</td>
                      <td className={`p-4 text-right font-bold font-mono ${getPnLStyle(t.pnl)}`}>
                        {t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}
                      </td>
                      <td className={`p-4 text-right font-bold font-mono ${getPnLStyle(t.pnlPercent)}`}>
                        {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent.toFixed(1)}%
                      </td>
                      <td className="p-4 text-slate-400 leading-relaxed text-[11px] max-w-sm">
                        {t.comments}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
