import React, { useEffect, useRef, useState } from 'react';
import { 
  Crown, 
  Lock, 
  Search, 
  RefreshCw, 
  Layers, 
  Check, 
  ArrowRight,
  TrendingUp,
  Sliders,
  Maximize2,
  Tv
} from 'lucide-react';
import { Language, TRANSLATIONS } from '../utils/i18n';

interface TradingViewChartsProps {
  language: Language;
  isPremium: boolean;
  onUpgradeClick?: () => void;
}

// Liste de paires populaires pour prop firms
const POPULAR_SYMBOLS = [
  { value: 'FX:EURUSD', label: 'EUR/USD (Euro)' },
  { value: 'FX:GBPUSD', label: 'GBP/USD (Livre)' },
  { value: 'FX:USDJPY', label: 'USD/JPY (Yen)' },
  { value: 'OANDA:XAUUSD', label: 'XAU/USD (Or)' },
  { value: 'BINANCE:BTCUSDT', label: 'BTC/USD (Bitcoin)' },
  { value: 'BINANCE:ETHUSDT', label: 'ETH/USD (Ethereum)' },
  { value: 'FOREXCOM:SPX500', label: 'S&P 500' },
  { value: 'FOREXCOM:NAS100', label: 'Nasdaq 100' },
];

const TIMEFRAMES = [
  { value: '1', label: '1 min' },
  { value: '5', label: '5 min' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '1 h' },
  { value: '240', label: '4 h' },
  { value: 'D', label: 'Journalier (1D)' },
];

// Gestion de chargement unique du script de TradingView
let scriptLoaded = false;
let globalLoading = false;
const scriptListeners = new Set<() => void>();

function loadTradingViewScript(callback: () => void) {
  if (scriptLoaded) {
    callback();
    return;
  }

  if (typeof window !== 'undefined' && (window as any).TradingView) {
    scriptLoaded = true;
    callback();
    return;
  }

  scriptListeners.add(callback);

  if (globalLoading) return;
  globalLoading = true;

  const script = document.createElement('script');
  script.id = 'tradingview-advanced-widget-script';
  script.src = 'https://s3.tradingview.com/tv.js';
  script.type = 'text/javascript';
  script.async = true;
  script.onload = () => {
    scriptLoaded = true;
    globalLoading = false;
    scriptListeners.forEach(listener => listener());
    scriptListeners.clear();
  };
  script.onerror = () => {
    globalLoading = false;
    console.error('Échec de chargement du script TradingView Widget.');
  };
  document.head.appendChild(script);
}

export default function TradingViewCharts({ language, isPremium, onUpgradeClick }: TradingViewChartsProps) {
  const isFr = language === 'fr';

  // State des graphiques
  const [symbolLeft, setSymbolLeft] = useState('FX:EURUSD');
  const [symbolRight, setSymbolRight] = useState('FX:EURUSD');
  const [intervalLeft, setIntervalLeft] = useState('60'); // 1H
  const [intervalRight, setIntervalRight] = useState('5');   // 5M
  const [syncSymbol, setSyncSymbol] = useState(true);          // Synchroniser actif par défaut
  
  // Custom inputs si l'utilisateur saisit son propre ticker
  const [customInputLeft, setCustomInputLeft] = useState('');
  const [customInputRight, setCustomInputRight] = useState('');

  // S'assurer que le script est chargé
  const [isTvReady, setIsTvReady] = useState(false);

  useEffect(() => {
    loadTradingViewScript(() => {
      setIsTvReady(true);
    });
  }, []);

  // Recréation des Widgets TradingView lors du changement de symbol ou d'intervalle
  useEffect(() => {
    if (!isTvReady || !isPremium) return;

    // Nettoyer les anciens widgets s'ils existent (TradingView s'en charge généralement en remplaçant la div intérieure, mais vider aide à éviter des conflits)
    const initWidget = (containerId: string, symbol: string, interval: string) => {
      try {
        if ((window as any).TradingView) {
          new (window as any).TradingView.widget({
            autosize: true,
            symbol: symbol,
            interval: interval,
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1", // Bougies japonaises (candlesticks)
            locale: isFr ? "fr" : "en",
            toolbar_bg: "#0A0B0D", // Couleur sombre de fond de barre d'outils
            enable_publishing: false,
            hide_side_toolbar: false, // Activer les outils de dessin sur le côté gauche
            allow_symbol_change: true, // Permettre la recherche de symboles native
            withavedatarange: true, // Activer la sauvegarde de la zone de données
            save_image: true, // Activer le screenshot TradingView
            container_id: containerId,
            
            // Paramètres additionnels pour la persistence avec le compte TradingView
            saved_data_meta_info: true,
            auto_save_changes: true,
            remember_withavedatarange: true,
            client_id: "tradingview.com",
            user_id: "public_user_id",
            charts_storage_url: "https://saveload.tradingview.com",
            charts_storage_api_version: "1.1",
            
            // Fonctionnalités activées de dessins, indicateurs et modèles de sauvegarde
            studies_access: { type: "all" },
            drawings_access: { type: "all" },
            enabled_features: [
              "study_templates", 
              "saved_shortcuts", 
              "header_widget", 
              "drawings_access", 
              "use_localstorage_for_settings_saver"
            ],
            
            loading_screen: {
              backgroundColor: "#11141a"
            }
          });
        }
      } catch (err) {
        console.warn(`Erreur lors d'initialisation du widget TradingView pour ${containerId}:`, err);
      }
    };

    // Initialiser les deux graphiques
    // Un léger délai permet de s'assurer que les éléments DOM sont bien présents
    const timer = setTimeout(() => {
      initWidget('tv-chart-left-container', symbolLeft, intervalLeft);
      initWidget('tv-chart-right-container', symbolRight, intervalRight);
    }, 150);

    return () => clearTimeout(timer);
  }, [isTvReady, symbolLeft, symbolRight, intervalLeft, intervalRight, isPremium, isFr]);

  // Synchronisation des symboles si activée
  const handleSymbolLeftChange = (val: string) => {
    setSymbolLeft(val);
    if (syncSymbol) {
      setSymbolRight(val);
    }
  };

  const handleCustomSymbolSearch = (side: 'left' | 'right', inputVal: string) => {
    if (!inputVal.trim()) return;
    const cleanVal = inputVal.trim().toUpperCase();
    if (side === 'left') {
      handleSymbolLeftChange(cleanVal);
      setCustomInputLeft('');
    } else {
      setSymbolRight(cleanVal);
      setCustomInputRight('');
    }
  };

  return (
    <div className="space-y-6" id="tradingview-charts-main">
      {/* Header section */}
      <div className="bg-[#0E1116]/60 backdrop-blur rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="absolute top-0 right-0 w-48 h-48 bg-sky-500/5 rounded-full blur-[50px] pointer-events-none" />
        
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Tv className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 font-sans">
              {isFr ? 'Double Graphique TradingView' : 'Dual TradingView Charts'}
              {isPremium && (
                <span className="text-[9px] bg-amber-500/15 border border-amber-500/30 text-amber-400 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  PREMIUM
                </span>
              )}
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {isFr 
              ? 'Analysez deux unités de temps en temps réel pour valider vos modèles SMC (Smart Money Concepts).' 
              : 'Analyze multiple timeframes simultaneously to align your SMC & structural trade plans.'}
          </p>
        </div>

        {isPremium && (
          <div className="flex items-center gap-3 bg-[#0A0B0D]/80 border border-white/5 px-4 py-2.5 rounded-xl self-start md:self-auto">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox"
                checked={syncSymbol}
                onChange={(e) => {
                  setSyncSymbol(e.target.checked);
                  if (e.target.checked) {
                    setSymbolRight(symbolLeft);
                  }
                }}
                className="rounded border-white/10 bg-black text-sky-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[11px] font-black text-slate-300 font-mono tracking-wider uppercase flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                {isFr ? 'Synchroniser les actifs' : 'Sync Assets'}
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Reste de la page : Premium VS Non-Premium */}
      {!isPremium ? (
        <div className="relative rounded-2xl border border-white/5 bg-[#0E1116]/40 overflow-hidden py-16 px-6 min-h-[500px] flex flex-col justify-center items-center">
          {/* Simulated blurred charts layout in background */}
          <div className="absolute inset-0 grid grid-cols-2 gap-4 p-6 opacity-10 filter blur-sm pointer-events-none">
            <div className="border border-white/5 bg-slate-900 rounded-xl flex items-center justify-center">Grid Left</div>
            <div className="border border-white/5 bg-slate-900 rounded-xl flex items-center justify-center">Grid Right</div>
          </div>

          <div className="relative max-w-md w-full bg-[#111420]/95 border border-amber-500/20 rounded-2xl p-6 md:p-8 flex flex-col items-center text-center space-y-6 shadow-2xl z-10">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)] animate-bounce">
              <Crown className="w-7 h-7 fill-amber-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-md font-extrabold text-white tracking-wide uppercase font-sans">
                {isFr ? 'Analyse Multi-Graphique Premium' : 'Premium Multi-Chart Suite'}
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                {isFr 
                  ? 'Gagnez en discipline en corrélant vos graphiques directement depuis votre tableau de bord. Ne ratez aucun alignement structurel.'
                  : 'SMC strategy dictates multi-timeframe confirmation. Monitor HTF structure alongside LTF entries.'}
              </p>
            </div>

            <div className="w-full text-left bg-black/40 border border-white/5 rounded-xl p-4 space-y-3 font-medium text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{isFr ? "Double écran : EURUSD 1H à gauche & EURUSD 5M à droite." : "Dual view: EURUSD 1H on left & EURUSD 5M on right."}</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{isFr ? "Barre de dessin active : Traces de zones (Order Blocks, FVG, liquidités) sauvegardées." : "Drawings active: Your levels, labels and zones are saved locally."}</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{isFr ? "Liberté d'actifs : Recherchez n'importe quel actif ou indice mondial." : "Asset freedom: Look up any pair, crypto or stock index globally."}</span>
              </div>
            </div>

            <button
              onClick={onUpgradeClick}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-450 to-amber-500 text-black font-extrabold rounded-xl uppercase text-[11px] tracking-wider hover:shadow-[0_0_20px_rgba(242,193,46,0.3)] transition-all flex items-center justify-center gap-1.5 cursor-pointer transform hover:scale-[1.01]"
            >
              <span>{isFr ? "Débloquer l'Accès Premium" : "Unlock Premium Suite"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Interactive controls grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left Chart Options Panel */}
            <div className="bg-[#0E1116]/60 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-300 font-mono tracking-wider uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  {isFr ? "GRAPHIQUE GAUCHE (Unités Majeures - HTF)" : "LEFT CHART (High Timeframe - HTF)"}
                </span>
                <span className="text-[10px] text-sky-400 font-semibold font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                  {symbolLeft.split(':').pop()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Symbol Select dropdown */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Actif prédéfini</label>
                  <select
                    value={symbolLeft}
                    onChange={(e) => handleSymbolLeftChange(e.target.value)}
                    className="w-full bg-[#0A0B0D] border border-white/5 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
                  >
                    {POPULAR_SYMBOLS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* Left Interval Selector */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Temps (Timeframe)</label>
                  <select
                    value={intervalLeft}
                    onChange={(e) => setIntervalLeft(e.target.value)}
                    className="w-full bg-[#0A0B0D] border border-white/5 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
                  >
                    {TIMEFRAMES.map((tf) => (
                      <option key={tf.value} value={tf.value}>{tf.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Search bar left */}
              <div className="pt-2 border-t border-white/5 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Saisir autre actif... ex: FX:GBPCHF"
                    value={customInputLeft}
                    onChange={(e) => setCustomInputLeft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomSymbolSearch('left', customInputLeft)}
                    className="w-full bg-[#0A0B0D]/50 border border-white/5 rounded-lg pl-8 pr-2 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-medium"
                  />
                </div>
                <button
                  onClick={() => handleCustomSymbolSearch('left', customInputLeft)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all"
                >
                  Charger
                </button>
              </div>
            </div>

            {/* Right Chart Options Panel */}
            <div className="bg-[#0E1116]/60 border border-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-300 font-mono tracking-wider uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {isFr ? "GRAPHIQUE DROITE (Unités Juniors - LTF)" : "RIGHT CHART (Low Timeframe - LTF)"}
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {symbolRight.split(':').pop()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Symbol Select dropdown */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Actif prédéfini</label>
                  <select
                    disabled={syncSymbol}
                    value={symbolRight}
                    onChange={(e) => setSymbolRight(e.target.value)}
                    className="w-full bg-[#0A0B0D] border border-white/5 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {syncSymbol ? (
                      <option value={symbolLeft}>Synchronisé 🔗</option>
                    ) : (
                      POPULAR_SYMBOLS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))
                    )}
                  </select>
                </div>

                {/* Right Interval Selector */}
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Temps (Timeframe)</label>
                  <select
                    value={intervalRight}
                    onChange={(e) => setIntervalRight(e.target.value)}
                    className="w-full bg-[#0A0B0D] border border-white/5 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-sky-500 font-medium"
                  >
                    {TIMEFRAMES.map((tf) => (
                      <option key={tf.value} value={tf.value}>{tf.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Search bar right */}
              <div className="pt-2 border-t border-white/5 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
                  <input
                    disabled={syncSymbol}
                    type="text"
                    placeholder={syncSymbol ? "Désactiver Synchro pour rechercher..." : "Saisir autre actif... ex: FX:USDCHF"}
                    value={customInputRight}
                    onChange={(e) => setCustomInputRight(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCustomSymbolSearch('right', customInputRight)}
                    className="w-full bg-[#0A0B0D]/50 border border-white/5 rounded-lg pl-8 pr-2 py-2 text-[11px] text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                  />
                </div>
                <button
                  disabled={syncSymbol}
                  onClick={() => handleCustomSymbolSearch('right', customInputRight)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/5 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Charger
                </button>
              </div>
            </div>

          </div>

          {/* Actual Dual Tradingview Iframes Layout */}
          {!isTvReady ? (
            <div className="flex flex-col items-center justify-center py-24 min-h-[500px] bg-[#0E1116]/40 rounded-2xl border border-white/5 space-y-3">
              <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-xs text-slate-400 font-semibold font-mono tracking-wider uppercase">
                {isFr ? "Chargement de TradingView..." : "Loading TradingView Components..."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[550px] md:h-[650px]">
              
              {/* Left Chart Iframe Wrapper Component */}
              <div className="bg-[#0A0B0D] rounded-xl border border-white/5 p-1 relative overflow-hidden h-full flex flex-col group hover:border-sky-500/20 transition-all">
                <div className="flex items-center justify-between px-3 py-2 bg-[#0E1116]/50 border-b border-white/5">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                    {POPULAR_SYMBOLS.find(s => s.value === symbolLeft)?.label || symbolLeft}
                  </span>
                  <span className="text-[9px] bg-slate-800/80 px-1.5 py-0.5 rounded text-sky-400 font-black font-mono">
                    {TIMEFRAMES.find(tf => tf.value === intervalLeft)?.label || intervalLeft}
                  </span>
                </div>
                <div className="flex-1 w-full relative" id="tv-chart-left-container-parent">
                  {/* Container with EXACT required ID of child to load inside */}
                  <div id="tv-chart-left-container" className="absolute inset-0 w-full h-full" />
                </div>
              </div>

              {/* Right Chart Iframe Wrapper Component */}
              <div className="bg-[#0A0B0D] rounded-xl border border-white/5 p-1 relative overflow-hidden h-full flex flex-col group hover:border-emerald-500/20 transition-all">
                <div className="flex items-center justify-between px-3 py-2 bg-[#0E1116]/50 border-b border-white/5">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest font-mono flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {POPULAR_SYMBOLS.find(s => s.value === symbolRight)?.label || symbolRight}
                  </span>
                  <span className="text-[9px] bg-slate-800/80 px-1.5 py-0.5 rounded text-emerald-400 font-black font-mono">
                    {TIMEFRAMES.find(tf => tf.value === intervalRight)?.label || intervalRight}
                  </span>
                </div>
                <div className="flex-1 w-full relative" id="tv-chart-right-container-parent">
                  {/* Container with EXACT required ID of child to load inside */}
                  <div id="tv-chart-right-container" className="absolute inset-0 w-full h-full" />
                </div>
              </div>

            </div>
          )}

          {/* Quick instructions Footer */}
          <div className="bg-[#0E1116]/30 border border-white/5 p-4 rounded-xl flex items-center gap-2 text-[10px] text-slate-400 font-semibold font-mono">
            <Sliders className="w-4 h-4 text-sky-400" />
            <span>
              {isFr
                ? "💡 Astuce : L'utilisation simultanée de deux graphiques permet de repérer instantanément des divergences de momentum ou des liquidations de paliers asiatiques."
                : "💡 Pro Tip: Aligning multiple timeframes helps identify market structure shifts before executing trades."}
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
