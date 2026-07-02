import React, { useState, useEffect } from 'react';
import { Crown, Sparkles, CheckCircle2, ArrowRight, Loader2, HelpCircle, Lock, Mail, CreditCard, ChevronRight, LogOut } from 'lucide-react';
import { createPremiumInvoice } from '../services/nowpayments';

interface PremiumProps {
  userId: string;
  userEmail?: string | null;
  createdAt: string | null;
  isExpired?: boolean;
  onLogout?: () => void;
  currency: string;
}

export default function PremiumPage({ 
  userId, 
  userEmail, 
  createdAt, 
  isExpired = false, 
  onLogout, 
  currency 
}: PremiumProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [hoursElapsed, setHoursElapsed] = useState<number>(0);

  useEffect(() => {
    if (createdAt) {
      const createdTime = new Date(createdAt).getTime();
      const elapsedMs = Date.now() - createdTime;
      const elapsedHours = Math.floor(elapsedMs / (1000 * 60 * 60));
      setHoursElapsed(elapsedHours > 0 ? elapsedHours : 0);
    }
  }, [createdAt]);

  const handleActivatePremium = async () => {
    setLoading(true);
    setError(null);
    setInvoiceUrl(null);
    console.log("Clic déclenché sur 'Activer mon accès Premium'. ID utilisateur:", userId);
    try {
      const url = await createPremiumInvoice(userId);
      if (url) {
        setInvoiceUrl(url);
      }
    } catch (err: any) {
      console.error("Erreur critique interceptée dans le composant page Premium:", err);
      // Extraire le message d'erreur
      setError(err?.message || "Une erreur est survenue lors de l'appel direct de NOWPayments pour générer votre lien de redirection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`w-full text-slate-100 flex flex-col items-center justify-center relative font-sans ${isExpired ? 'min-h-screen bg-[#0A0B0D] p-4 overflow-hidden' : 'py-2'}`}>
      
      {/* Visual background lights for dramatic premium effect */}
      {isExpired && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
        </>
      )}

      {/* Main Container */}
      <div className={`w-full max-w-4xl bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 rounded-3xl p-6 sm:p-10 shadow-2xl relative z-10 space-y-10 animate-fadeIn ${isExpired ? 'border-rose-500/20 shadow-[0_0_50px_rgba(244,63,94,0.05)]' : ''}`}>
        
        {/* Banner header stating state */}
        <div className="text-center space-y-5 relative">
          {userEmail?.toLowerCase() === 'peter25ngouala@gmail.com' ? (
            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 rounded-full text-emerald-400 font-mono text-[11px] font-black tracking-widest uppercase shadow-[0_0_15px_rgba(16,185,129,0.15)]">
              <Crown className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
              Accès Spécial Administrateur (Gratuit)
            </div>
          ) : isExpired ? (
            <div className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-4 py-1.5 rounded-full text-rose-400 font-mono text-[11px] font-black tracking-widest uppercase animate-pulse">
              <Lock className="w-3.5 h-3.5" />
              Essai Gratuit Terminé ({hoursElapsed}h écoulées)
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/25 px-4 py-1.5 rounded-full text-amber-300 font-mono text-[11px] font-black tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              PropFlow Premium
            </div>
          )}

          <div className="flex justify-center">
            <div className="bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-500 p-4 rounded-3xl shadow-[0_0_35px_rgba(245,158,11,0.25)] relative group hover:scale-105 transition-transform duration-300 cursor-pointer">
              <Crown className="w-14 h-14 text-slate-950 animate-pulse" />
              <Sparkles className="w-5 h-5 text-amber-200 absolute -top-1 -right-1 animate-spin" style={{ animationDuration: '8s' }} />
            </div>
          </div>

          <h1 id="premium-title" className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            {isExpired ? "Votre essai gratuit de 3 jours a expiré" : "Donnez des ailes à votre de trading"}
          </h1>

          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto font-medium leading-relaxed">
            {isExpired 
              ? "Votre période d'évaluation gratuite de 72 heures a pris fin. Passez au niveau supérieur pour conserver l'accès complet au journal, à l'analyseur de comptes, et au coach IA comportemental."
              : "Améliorez vos performances et protégez votre capital de trading grâce aux informations quantitatives exclusives et la surveillance automatisée du drawdown de la version Premium."
            }
          </p>
        </div>

        {/* Dynamic Interactive Bento comparison dashboard representation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Box 1: Drawdown Security system */}
          <div className="bg-[#0A0B0D]/60 border border-white/5 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between group hover:border-amber-500/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-amber-500/5 to-transparent pointer-events-none" />
            <div className="space-y-3">
              <div className="w-9 h-9 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Suivi Intégral Prop Firm</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Calcul en temps réel de votre perte journalière, drawdown maximal relatif et respect des formules d'objectifs sans aucune restriction de volume.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 font-mono">Illimité</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
          </div>

          {/* Box 2: Automated Custom AI Coach with Gemini */}
          <div className="bg-[#0A0B0D]/60 border border-white/5 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between group hover:border-amber-500/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-purple-500/5 to-transparent pointer-events-none" />
            <div className="space-y-3">
              <div className="w-9 h-9 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Coach IA Intelligence Active</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Générez des rapports synthétisés poussés sur vos biais émotionnels, vos ratios espérance mathématique par actif, et recevez des alertes en direct avant l'overtrading.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 font-mono">Illimité</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
          </div>

          {/* Box 3: Live Market Opportunities signals */}
          <div className="bg-[#0A0B0D]/60 border border-white/5 p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between group hover:border-amber-500/20 transition-all duration-300">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-sky-500/5 to-transparent pointer-events-none" />
            <div className="space-y-3">
              <div className="w-9 h-9 bg-sky-500/10 border border-sky-500/20 rounded-lg flex items-center justify-center">
                <ArrowRight className="w-5 h-5 text-sky-400" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">Signaux Quantitatifs Avancés</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                Accédez à l'explorateur de configurations repérant automatiquement les cassures structurelles et intégrez-les directement dans votre journal de trading en un clic.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 font-mono">Illimité</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
          </div>

        </div>

        {/* Pricing / CTA Section */}
        <div className="bg-[#060709] border border-amber-500/20 rounded-3xl p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-[80px] pointer-events-none" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            
            <div className="space-y-4 max-w-md text-center md:text-left">
              <div className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 px-3 py-1 rounded-md text-amber-300 font-mono text-[10px] font-bold uppercase tracking-wider">
                👑 Licences PropFlow Premium
              </div>
              <div className="flex items-baseline justify-center md:justify-start gap-2">
                <span className="text-4xl sm:text-5xl font-black text-white font-mono antialiased tracking-tight">5.00$</span>
                <span className="text-slate-400 text-sm font-semibold">/ mois</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                Payez en toute sécurité en quelques secondes avec du Bitcoin, Litecoin, USDT, BNB ou plus de 50 autres crypto-monnaies de votre choix. Aucun abonnement récurent forcé, aucun prélèvement bancaire surprise.
              </p>
              
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 justify-center md:justify-start text-xs text-slate-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Garantie d'activation instantanée de l'IPN
                </div>
                <div className="flex items-center gap-2 justify-center md:justify-start text-xs text-slate-300 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Mises à jour à vie et sans frais supplémentaires
                </div>
              </div>
            </div>

            <div className="w-full max-w-xs bg-[#12161E]/80 border border-white/5 rounded-2xl p-6 text-center space-y-6">
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase font-mono tracking-widest">Abonnement Référence</div>
                <div className="text-xs text-slate-300 font-black truncate">{userEmail || "Trading local (Essai)"}</div>
              </div>

              {userEmail?.toLowerCase() === 'peter25ngouala@gmail.com' ? (
                <div className="space-y-5 animate-fadeIn">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-left space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 leading-none">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Accès Gratuit Actif
                    </span>
                    <p className="text-[10px] text-slate-300 leading-normal font-medium">
                      Votre adresse e-mail a été spécifiquement répertoriée pour bénéficier de l'accès Premium gratuit et illimité de PropFlow. Pas besoin de paiement !
                    </p>
                  </div>
                  <div className="bg-[#0A0B0D] border border-white/5 px-4 py-3 rounded-xl text-[10px] text-slate-400 font-semibold font-mono flex items-center justify-center gap-1.5">
                    👑 LICENCE VIP ACTIVÉE
                  </div>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/25 p-3 rounded-xl text-[11px] text-rose-400 font-medium leading-normal text-left space-y-1 animate-fadeIn">
                      <span className="font-bold text-red-400 block">⚠️ Échec d'activation :</span>
                      <span>{error}</span>
                    </div>
                  )}

                  {invoiceUrl && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-left space-y-3 animate-fadeIn">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 leading-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                        Facture Prête !
                      </span>
                      <p className="text-[10px] text-slate-300 leading-normal font-medium">
                        Si l'onglet indépendant n'a pas réussi à s'ouvrir automatiquement, cliquez sur le bouton vert ci-dessous :
                      </p>
                      <a
                        href={invoiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] uppercase tracking-wider py-3 rounded-xl cursor-pointer hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:scale-[1.01] transition-all"
                      >
                        Ouvrir la Facture Crypto
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  <button
                    disabled={loading}
                    onClick={handleActivatePremium}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-350 text-black font-extrabold text-xs uppercase tracking-wider py-4 rounded-xl cursor-pointer hover:shadow-[0_0_20px_rgba(242,193,46,0.25)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <Crown className="w-4 h-4 fill-black text-black" />
                        Activer mon accès Premium
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-semibold font-mono">
                    <CreditCard className="w-3.5 h-3.5" />
                    Passerelle NOWPayments
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Footer actions bar if locked */}
        {isExpired && onLogout && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-white/5">
            <div className="text-center sm:text-left">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono block">Référence de l'utilisateur</span>
              <span className="text-xs font-semibold text-slate-300 font-mono select-all bg-[#0A0B0D] px-2.5 py-1.5 rounded-lg border border-white/5 inline-block mt-1">
                {userId}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 bg-[#0A0B0D] hover:bg-white/5 border border-white/5 text-slate-400 hover:text-white px-4 h-10 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion / Se connecter
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
