import React, { useState, useEffect } from 'react';
import { MarketOpportunity } from '../types';
import { Target, AlertCircle, RefreshCw, Compass, ArrowRight, ShieldCheck, TrendingUp, TrendingDown, BadgeCheck, BellRing } from 'lucide-react';

interface MarketAlertsProps {
  onCopyOpportunityToJournal: (opportunity: MarketOpportunity) => void;
}

export default function MarketAlerts({ onCopyOpportunityToJournal }: MarketAlertsProps) {
  const [opportunities, setOpportunities] = useState<MarketOpportunity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  const fetchOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch("/api/gemini/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (!resp.ok) {
        throw new Error("Impossible de récupérer les signaux d'opportunités.");
      }
      const data = await resp.json();
      if (data.opportunities && Array.isArray(data.opportunities)) {
        setOpportunities(data.opportunities);
        // Show simulated notification toast
        setSuccessNotification("5 nouvelles alertes d'opportunités calculées par l'IA !");
        setTimeout(() => setSuccessNotification(null), 6000);
      } else {
        throw new Error("Format de réponse d'opportunités invalide.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Generate initial set
    fetchOpportunities();
  }, []);

  const getProbabilityStyles = (level: string) => {
    switch (level) {
      case 'HIGH':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'LOW':
        return 'bg-slate-800 text-slate-400';
      default:
        return 'bg-slate-800 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Opportunity Notification */}
      {successNotification && (
        <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-300 p-4 rounded-xl flex items-center gap-3 shadow-2xl animate-slideLeft">
          <BellRing className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold block text-slate-100">Notification en temps réel</span>
            {successNotification}
          </div>
        </div>
      )}

      {/* Main Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Help Banner */}
        <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-6 rounded-2xl flex flex-col justify-between h-full col-span-1 shadow-xl relative overflow-hidden glow-sky-card">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-[40px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Compass className="w-5 h-5 text-sky-400" />
              <h3 className="text-xs font-black text-slate-100 uppercase tracking-widest font-mono">Opportunités IA</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              Ce système de balayage intelligent chercheur de tendances surveille les cassures d'accumulation, divergences et signaux techniques d'après l'IA de Gemini.
            </p>
            <div className="mt-4 p-3.5 bg-[#0A0B0D] rounded-xl border border-white/5 space-y-2.5">
              <div className="flex items-start gap-2.5 text-[11px] text-slate-400 font-medium">
                <BadgeCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Niveaux calculés d'entrée, objectifs de gains (TP) et limites de pertes (SL).</span>
              </div>
              <div className="flex items-start gap-2.5 text-[11px] text-slate-400 font-medium">
                <ShieldCheck className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
                <span>Synchronisation cloud : recevez automatiquement ces alertes sur vos mobiles raccordés.</span>
              </div>
            </div>
          </div>

          <button
            onClick={fetchOpportunities}
            disabled={loading}
            className="mt-6 w-full flex items-center justify-center gap-2 bg-[#0A0B0D] border border-white/5 hover:border-sky-500/25 disabled:opacity-50 text-slate-200 hover:text-slate-100 text-xs font-semibold py-2.5 rounded-lg active:scale-[0.98] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
            {loading ? "Recherche en cours..." : "Scanner le Marché (IA)"}
          </button>
        </div>

        {/* Signals Flow */}
        <div className="md:col-span-2 space-y-4">
          
          {error && (
            <div className="bg-rose-950/50 border border-rose-800 text-rose-300 p-4 rounded-xl flex items-center gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-[#161B22] border border-white/5 p-5 rounded-xl space-y-3 animate-pulse">
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-32 bg-[#0A0B0D] rounded" />
                    <div className="h-4 w-16 bg-[#0A0B0D] rounded" />
                  </div>
                  <div className="h-3 w-3/4 bg-[#0A0B0D] rounded" />
                  <div className="h-3 w-1/2 bg-[#0A0B0D] rounded" />
                </div>
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="text-center bg-[#161B22] p-12 rounded-xl border border-white/5">
              <AlertCircle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-400 text-xs">Aucune alerte active trouvée.</p>
              <p className="text-slate-500 text-[10px] mt-1">Cliquez sur Scanner le marché pour interroger l'IA.</p>
            </div>
          ) : (
            <div className="space-y-4 overflow-y-auto max-h-[500px] pr-1">
              {opportunities.map((opp) => (
                <div key={opp.id} className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-5 rounded-2xl space-y-4 hover:border-white/12 transition-all hover:translate-y-[-1px] shadow-md relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${opp.direction === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  
                  {/* Headline */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100 text-sm tracking-tight">{opp.symbol}</span>
                      <span className="text-[10px] text-slate-500 font-semibold bg-[#0A0B0D] px-2 py-0.5 rounded border border-white/5">{opp.timeframe}</span>
                      <span className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${opp.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                        {opp.direction === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {opp.direction}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${getProbabilityStyles(opp.probability)}`}>
                        PROB: {opp.probability}
                      </span>
                    </div>
                  </div>

                  {/* Body description */}
                  <p className="text-xs text-slate-300 leading-relaxed font-medium">
                    {opp.rationale}
                  </p>

                  {/* Level Targets Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-[#0A0B0D] p-2.5 rounded-lg border border-white/5 font-mono text-center">
                    <div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Entrée</p>
                      <p className="text-xs font-bold text-slate-300 mt-0.5">{opp.entryZone}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Objectif (TP)</p>
                      <p className="text-xs font-bold text-emerald-400 mt-0.5">{opp.targetZone}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">Invalidation (SL)</p>
                      <p className="text-xs font-bold text-rose-450 mt-0.5">{opp.stopZone}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => {
                        onCopyOpportunityToJournal(opp);
                        // Show specific warning
                        alert(`Configuration copiée ! Allez dans l'onglet 'Journal' pour valider et modifier vos gains/pertes pour ${opp.symbol}.`);
                      }}
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 font-semibold tracking-wide transition-colors cursor-pointer"
                    >
                      <span>Importer dans mon journal</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
