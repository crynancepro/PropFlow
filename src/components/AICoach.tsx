import React, { useState, useEffect } from 'react';
import { Trade } from '../types';
import { 
  BrainCircuit, 
  Sparkles, 
  MessageSquare, 
  ShieldAlert, 
  BadgeCheck, 
  Lightbulb, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Percent, 
  Settings, 
  Activity,
  AlertTriangle,
  Info
} from 'lucide-react';

interface AICoachProps {
  trades: Trade[];
  startingBalance: number;
  currency: string;
}

export default function AICoach({ trades, startingBalance, currency }: AICoachProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);

  // States for Prop Firm Challenge parameters (customizable, with default presets)
  const [targetPercent, setTargetPercent] = useState<number>(10); // Default: 10%
  const [dailyDrawdownPercent, setDailyDrawdownPercent] = useState<number>(5); // Default: 5%
  const [totalDrawdownPercent, setTotalDrawdownPercent] = useState<number>(10); // Default: 10%

  // Custom inputs (if user overrides raw dollar values)
  const [customTarget, setCustomTarget] = useState<string>('');
  const [customDaily, setCustomDaily] = useState<string>('');
  const [customTotal, setCustomTotal] = useState<string>('');

  // Calculate actual current state
  const closedTrades = trades.filter(t => t.status === 'CLOSED');
  const currentPnL = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const currentBalance = startingBalance + currentPnL;
  const yieldPercent = startingBalance > 0 ? (currentPnL / startingBalance) * 100 : 0;

  // Compute values to send
  const finalTargetValue = customTarget !== '' ? parseFloat(customTarget) : (startingBalance * (targetPercent / 100));
  const finalDailyDrawdown = customDaily !== '' ? parseFloat(customDaily) : (startingBalance * (dailyDrawdownPercent / 100));
  const finalTotalDrawdown = customTotal !== '' ? parseFloat(customTotal) : (startingBalance * (totalDrawdownPercent / 100));

  // Auto-reset custom input overrides when startingBalance updates
  useEffect(() => {
    setCustomTarget('');
    setCustomDaily('');
    setCustomTotal('');
  }, [startingBalance]);

  // Calculations for display warnings
  const currentDrawdownAmount = currentPnL < 0 ? Math.abs(currentPnL) : 0;
  const drawdownPercent = startingBalance > 0 ? (currentDrawdownAmount / startingBalance) * 100 : 0;
  const remainingTotalDrawdown = Math.max(0, finalTotalDrawdown - currentDrawdownAmount);
  const totalDrawdownRatio = finalTotalDrawdown > 0 ? (currentDrawdownAmount / finalTotalDrawdown) * 100 : 0;

  const targetDistanceAmount = finalTargetValue - currentPnL;
  const percentCompletedOfTarget = finalTargetValue > 0 ? Math.min(100, Math.max(0, (currentPnL / finalTargetValue) * 100)) : 0;

  const handleRequestAudit = async () => {
    setLoading(true);
    setErrorHeader(null);
    setAnalysis(null);

    try {
      const resp = await fetch("/api/gemini/analyze-trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trades: trades, // Send all active trades to give AI full visibility
          startingBalance,
          currency,
          targetValue: finalTargetValue,
          dailyDrawdown: finalDailyDrawdown,
          totalDrawdown: finalTotalDrawdown,
          currentBalance,
          currentPnL
        })
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "L'IA n'a pas pu traiter l'historique du journal ou formuler le plan.");
      }

      const data = await resp.json();
      setAnalysis(data.analysis);
    } catch (err: any) {
      console.error(err);
      setErrorHeader(err.message || "Erreur réseau de communication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Introduction Card with Coach Persona Block */}
      <div className="bg-[#161B22] border border-white/5 p-5 rounded-2xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-[80px] -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[60px] -ml-20 -mb-20 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start justify-between gap-5 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="bg-sky-500/10 p-2 rounded-xl border border-sky-500/10 shrink-0">
                <BrainCircuit className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider font-mono">
                  Plan de Jeu & Gestion des Risques IA
                </h3>
                <div className="text-[10px] text-sky-450 font-bold uppercase tracking-widest font-mono">
                  Challenge Coach • Senior Risk Manager Mode
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Inspiré du trading institutionnel (<span className="text-sky-300 font-semibold font-mono text-[11px]">SMC / ICT</span>) et d'un cadre mathématique ultra-conservateur. Ce coach intelligent analyse vos indicateurs de stress, vos configurations critiques et calcule instantanément vos verrous opérationnels quotidiens.
            </p>
          </div>

          <button
            onClick={handleRequestAudit}
            disabled={loading}
            className="w-full md:w-auto flex-shrink-0 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white font-bold text-xs px-6 py-3.5 rounded-xl flex items-center justify-center gap-2 transform active:scale-95 transition-all cursor-pointer shadow-lg hover:shadow-sky-500/10"
          >
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
            {loading ? "Calcul du plan de jeu..." : "Générer mon Plan de Jeu du Jour"}
          </button>
        </div>
      </div>

      {/* Prop Firm and Challenge Parameter Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHALLENGE SETTINGS CARD */}
        <div className="bg-[#161B22] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Settings className="w-4 h-4 text-slate-400" />
            <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider font-mono">
              Paramètres du Challenge
            </h4>
          </div>

          <div className="space-y-4">
            
            {/* Profit Target Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-400" />
                  <span>Objectif de Profit</span>
                </label>
                <span className="text-[10px] font-bold font-mono text-emerald-400">
                  {targetPercent}% ({ (startingBalance * (targetPercent / 100)).toLocaleString() } {currency})
                </span>
              </div>
              <div className="flex gap-2">
                {[8, 10, 12].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setTargetPercent(p);
                      setCustomTarget('');
                    }}
                    className={`flex-1 text-[10px] font-bold py-1 rounded-md border transition-all cursor-pointer ${
                      targetPercent === p && customTarget === ''
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-[#0A0B0D] text-slate-500 border-white/5 hover:text-slate-300'
                    }`}
                  >
                    {p}% Target
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder={`Saisir valeur en ${currency} (Ex: 10000)`}
                value={customTarget}
                onChange={(e) => {
                  setCustomTarget(e.target.value);
                }}
                className="w-full bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Daily Drawdown Max Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <span>Dr. Max Quotidien</span>
                </label>
                <span className="text-[10px] font-bold font-mono text-amber-400">
                  {dailyDrawdownPercent}% ({ (startingBalance * (dailyDrawdownPercent / 100)).toLocaleString() } {currency})
                </span>
              </div>
              <div className="flex gap-2">
                {[4, 5, 6].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setDailyDrawdownPercent(p);
                      setCustomDaily('');
                    }}
                    className={`flex-1 text-[10px] font-bold py-1 rounded-md border transition-all cursor-pointer ${
                      dailyDrawdownPercent === p && customDaily === ''
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                        : 'bg-[#0A0B0D] text-slate-500 border-white/5 hover:text-slate-300'
                    }`}
                  >
                    {p}% Max
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder={`Saisir valeur en ${currency} (Ex: 5000)`}
                value={customDaily}
                onChange={(e) => {
                  setCustomDaily(e.target.value);
                }}
                className="w-full bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Total Drawdown Max Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] text-slate-400 font-black uppercase tracking-wider flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-500" />
                  <span>Dr. Max Total</span>
                </label>
                <span className="text-[10px] font-bold font-mono text-rose-500">
                  {totalDrawdownPercent}% ({ (startingBalance * (totalDrawdownPercent / 100)).toLocaleString() } {currency})
                </span>
              </div>
              <div className="flex gap-2">
                {[8, 10, 12].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setTotalDrawdownPercent(p);
                      setCustomTotal('');
                    }}
                    className={`flex-1 text-[10px] font-bold py-1 rounded-md border transition-all cursor-pointer ${
                      totalDrawdownPercent === p && customTotal === ''
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                        : 'bg-[#0A0B0D] text-slate-500 border-white/5 hover:text-slate-300'
                    }`}
                  >
                    {p}% Max
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder={`Saisir valeur en ${currency} (Ex: 10000)`}
                value={customTotal}
                onChange={(e) => {
                  setCustomTotal(e.target.value);
                }}
                className="w-full bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

          </div>
        </div>

        {/* REAL-TIME ACCOUNT STATUS CARD */}
        <div className="bg-[#161B22] border border-white/5 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Activity className="w-4 h-4 text-sky-400" />
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider font-mono">
                Statut Actuel du Compte
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#0A0B0D] p-3 rounded-xl border border-white/5">
                <div className="text-[9px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Wallet className="w-3 h-3 text-slate-400" />
                  <span>Balance</span>
                </div>
                <div className="text-sm font-black font-mono text-slate-100">
                  {currentBalance.toLocaleString(undefined, { minimumFractionDigits: 1 })} {currency}
                </div>
              </div>

              <div className="bg-[#0A0B0D] p-3 rounded-xl border border-white/5">
                <div className="text-[9px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Percent className="w-3 h-3 text-slate-400" />
                  <span>Rendement Net</span>
                </div>
                <div className={`text-sm font-black font-mono ${currentPnL >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {currentPnL >= 0 ? '+' : ''}{yieldPercent.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-semibold">Progression Objectif</span>
                <span className="font-bold text-emerald-400 font-mono">{percentCompletedOfTarget.toFixed(1)}%</span>
              </div>
              <div className="w-full h-2 bg-[#0A0B0D] rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-sky-400 transition-all duration-500" 
                  style={{ width: `${percentCompletedOfTarget}%` }}
                />
              </div>
              <div className="text-[9.5px] text-slate-500 leading-normal flex justify-between font-mono">
                <span>Init: {startingBalance.toLocaleString()} {currency}</span>
                {targetDistanceAmount > 0 ? (
                  <span>Manque: <strong className="text-emerald-400">+{targetDistanceAmount.toLocaleString()} {currency}</strong></span>
                ) : (
                  <span className="text-emerald-400 font-black uppercase tracking-wider">Objectif validé ! 🎉</span>
                )}
              </div>
            </div>
          </div>

          {/* Drawdown Risk Gauge */}
          <div className="bg-rose-950/10 border border-rose-500/10 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-rose-400 font-black uppercase tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Niveau de Drawdown Total</span>
              </span>
              <span className="font-black text-rose-400 font-mono">{drawdownPercent.toFixed(1)}% / { (finalTotalDrawdown / startingBalance * 100).toFixed(0) }%</span>
            </div>
            <div className="w-full h-1.5 bg-[#0A0B0D] rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${totalDrawdownRatio > 65 ? 'bg-rose-500 animate-pulse' : 'bg-rose-400'}`} 
                style={{ width: `${Math.min(100, totalDrawdownRatio)}%` }}
              />
            </div>
            <p className="text-[9px] text-slate-400 leading-relaxed font-mono">
              {currentPnL < 0 ? (
                <>Attention : Vous avez consommé <strong className="text-rose-400">{currentDrawdownAmount.toLocaleString()} {currency}</strong> de votre limite de perte. Capital préservable restant : <strong className="text-emerald-400">{remainingTotalDrawdown.toLocaleString()} {currency}</strong>.</>
              ) : (
                <>Excellent : Aucun drawdown à déclarer. Vous opérez sur un coussin de sécurité de <span className="text-emerald-400">100%</span>.</>
              )}
            </p>
          </div>
        </div>

        {/* EDUCATIONAL RULES & SMC SUMMARY CARD */}
        <div className="bg-[#161B22] border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <BadgeCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-black text-slate-200 uppercase tracking-wider font-mono">
              Mécanique de Validation
            </h4>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2 text-xs">
              <div className="bg-[#0A0B0D] p-1.5 rounded-lg border border-white/5 text-sky-400 font-black font-mono text-[9px] shrink-0 mt-0.5">SMC</div>
              <p className="text-[11px] text-slate-400 leading-normal">
                <strong>Smart Money Concept :</strong> Ne chassez pas le prix. Attendez la prise de liquidité (Sell Side / Buy Side Liquidity) sous forme de mèches suivies d'un déplacement (MSB/BOS) et entrez exclusivement sur les FVG ou l'Order Block résiduel.
              </p>
            </div>

            <div className="flex items-start gap-2 text-xs">
              <div className="bg-[#0A0B0D] p-1.5 rounded-lg border border-white/5 text-amber-500 font-black font-mono text-[9px] shrink-0 mt-0.5">MATH</div>
              <p className="text-[11px] text-slate-400 leading-normal">
                <strong>Règle de Gestion stricte :</strong> Si votre compte plonge en drawdown de plus de 2%, divisez systématiquement votre risque par trade par deux (ex: 0.5% &rarr; 0.25%) pour ralentir l'érosion géométrique de vos fonds.
              </p>
            </div>

            <div className="bg-[#0A0B0D]/50 border border-white/5 p-2 px-3 rounded-xl flex items-center gap-2 text-[10.5px] text-slate-400 leading-normal">
              <Info className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Vos positions récentes et l'état actuel de votre solde sont automatiquement injectés lors du calcul du plan.</span>
            </div>
          </div>
        </div>

      </div>

      {errorHeader && (
        <div className="bg-rose-950/40 border border-rose-900/60 text-slate-200 p-4 rounded-xl text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorHeader}</span>
        </div>
      )}

      {/* Loading state visual */}
      {loading && (
        <div className="bg-[#161B22] border border-white/5 p-8 rounded-xl text-center space-y-4">
          <div className="w-10 h-10 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin mx-auto" />
          <h4 className="text-slate-200 text-xs font-semibold font-mono uppercase tracking-wider">Calcul de la feuille de route du Risk Manager...</h4>
          <p className="text-slate-500 text-[10px] max-w-sm mx-auto leading-relaxed">
            Établissement du diagnostic géométrique pour votre licence {startingBalance.toLocaleString()} {currency}. Préparation des règles adaptatives selon l'alignement SMC/ICT.
          </p>
        </div>
      )}

      {/* Audit Markdown Output */}
      {analysis && (
        <div className="bg-[#161B22] border border-white/5 rounded-2xl overflow-hidden shadow-2xl animate-fadeIn">
          
          <div className="bg-[#0A0B0D] p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              <h4 className="text-xs font-black text-slate-200 uppercase tracking-widest font-mono">
                PLAN DE JEU DYNAMIQUE ET SÉCURISATION IA
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold bg-[#0A0B0D] px-2.5 py-1 rounded border border-white/5 uppercase font-mono">
              <BadgeCheck className="w-3.5 h-3.5" />
              <span>Calculé Réel</span>
            </div>
          </div>

          <div className="p-6 prose prose-invert max-w-none text-slate-300 text-xs leading-relaxed space-y-3 max-h-[600px] overflow-y-auto font-sans">
            {analysis.split('\n').map((line, idx) => {
              if (line.startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-xs font-black text-sky-400 mt-4 mb-2 flex items-center gap-1 border-b border-white/5 pb-1 uppercase tracking-wider font-mono">
                    {line.replace('### ', '')}
                  </h3>
                );
              }
              if (line.startsWith('## ')) {
                return (
                  <h2 key={idx} className="text-sm font-black text-slate-100 mt-5 mb-3 border-b border-white/5 pb-1.5 uppercase tracking-widest font-mono flex items-center gap-2">
                    {line.replace('## ', '')}
                  </h2>
                );
              }
              if (line.startsWith('# ')) {
                return (
                  <h1 key={idx} className="text-base font-black text-slate-100 mt-6 mb-4 flex items-center gap-2 bg-[#0A0B0D] p-3 rounded-lg border border-white/5 font-mono">
                    {line.replace('# ', '')}
                  </h1>
                );
              }
              if (line.startsWith('- ') || line.startsWith('* ')) {
                return <li key={idx} className="ml-4 list-disc text-slate-300 my-1 font-sans">{line.substring(2)}</li>;
              }
              if (line.trim() === '') {
                return <div key={idx} className="h-1.5" />;
              }
              // Normal line
              return <p key={idx} className="mb-2 leading-relaxed text-slate-300">{line}</p>;
            })}
          </div>

        </div>
      )}

      {/* Static Info Cards if no AI report yet */}
      {!analysis && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          <div className="bg-[#161B22]/60 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-sky-400" />
              <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest font-mono">
                Pourquoi utiliser le risk manager dynamique ?
              </span>
            </div>
            <p className="text-[11px] text-slate-450 leading-relaxed font-sans">
              La principale cause d'échec aux épreuves de financement provient de l'aspect psychologique lors du drawdown. En automatisant vos limites de lot et d'intervention quotidiennes basées sur la géométrie de votre compte, vous retirez l'aspect émotionnel de votre processus de prise de décision.
            </p>
          </div>

          <div className="bg-[#161B22]/60 p-4 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <BadgeCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest font-mono">
                Règle de retour d'équilibre
              </span>
            </div>
            <p className="text-[11px] text-slate-450 leading-relaxed font-sans">
              Le coach identifiera immédiatement si vous devez passer en <strong>Mode Récupération</strong>. Ce mode spécial préconise des ratios R/R de 1:3 minimum et demande d'ignorer les signaux secondaires pour ne filtrer que le setup d'invalidation de liquidité de session (Londres/New-York Kill zones).
            </p>
          </div>

        </div>
      )}

    </div>
  );
}
