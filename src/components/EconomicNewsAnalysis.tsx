import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, PlusCircle, Trash2, Calendar, TrendingUp, TrendingDown, 
  ArrowUp, ArrowDown, Clock, Search, Filter, AlertTriangle, Zap, Sparkles
} from 'lucide-react';
import { EconomicNews } from '../types';
import { auth, db } from '../firebase-setup';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

interface EconomicNewsProps {
  language?: 'fr' | 'en';
}

const DEFAULT_NEWS_EXAMPLES: Omit<EconomicNews, 'userId'>[] = [
  {
    id: 'ex-1',
    name: 'NFP (Non-Farm Payrolls)',
    dateTime: '2026-05-08T12:30',
    previousValue: '175K',
    forecastValue: '185K',
    actualValue: '215K',
    globalImpact: 'POSITIF_USD',
    marketReaction: 'HAUSSE_USD_BAISSE_EURUSD',
    createdAt: new Date(Date.now() - 16 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'ex-2',
    name: 'CPI (Consumer Price Index) MoM',
    dateTime: '2026-05-13T12:30',
    previousValue: '0.4%',
    forecastValue: '0.3%',
    actualValue: '0.2%',
    globalImpact: 'NEGATIF_USD',
    marketReaction: 'BAISSE_USD_HAUSSE_EURUSD',
    createdAt: new Date(Date.now() - 11 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'ex-3',
    name: 'FOMC Meeting Statement',
    dateTime: '2026-05-20T18:00',
    previousValue: '5.50%',
    forecastValue: '5.50%',
    actualValue: '5.50%',
    globalImpact: 'POSITIF_USD',
    marketReaction: 'HAUSSE_USD_BAISSE_EURUSD',
    createdAt: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString()
  }
];

export default function EconomicNewsAnalysis({ language = 'fr' }: EconomicNewsProps) {
  const isFr = language === 'fr';
  const [newsList, setNewsList] = useState<EconomicNews[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [name, setName] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [previousValue, setPreviousValue] = useState('');
  const [forecastValue, setForecastValue] = useState('');
  const [actualValue, setActualValue] = useState('');
  const [globalImpact, setGlobalImpact] = useState<'POSITIF_USD' | 'NEGATIF_USD'>('POSITIF_USD');
  const [marketReaction, setMarketReaction] = useState('');
  
  // Filter/Search states
  const [search, setSearch] = useState('');
  const [impactFilter, setImpactFilter] = useState<'ALL' | 'POSITIF_USD' | 'NEGATIF_USD'>('ALL');
  
  // Custom alerts or notifications
  const [successMsg, setSuccessMsg] = useState('');
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // States for custom non-blocking confirmation overlays
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);

  // Sync auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return unsub;
  }, []);

  // Sync data with Firestore or LocalStorage
  useEffect(() => {
    setLoading(true);
    if (currentUser && db) {
      // Load from Firestore
      const newsCollection = collection(db, 'economic_news');
      const unsubscribe = onSnapshot(newsCollection, (snapshot) => {
        const items: EconomicNews[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Filter by current user id
          if (data.userId === currentUser.uid) {
            items.push({
              id: docSnap.id,
              userId: data.userId,
              name: data.name,
              dateTime: data.dateTime,
              previousValue: data.previousValue,
              forecastValue: data.forecastValue,
              actualValue: data.actualValue,
              globalImpact: data.globalImpact,
              marketReaction: data.marketReaction,
              createdAt: data.createdAt,
            });
          }
        });
        
        // Sort chronologically (newest first)
        items.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        setNewsList(items);
        setLoading(false);
      }, (err) => {
        console.error('Firestore Economic News error:', err);
        loadFromLocalStorage();
        setLoading(false);
      });
      return unsubscribe;
    } else {
      // Locally
      loadFromLocalStorage();
      setLoading(false);
    }
  }, [currentUser]);

  const loadFromLocalStorage = () => {
    const localData = localStorage.getItem('trader_journal_news');
    if (localData) {
      try {
        const parsed: EconomicNews[] = JSON.parse(localData);
        parsed.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
        setNewsList(parsed);
      } catch (err) {
        console.error('Error parsing local news data:', err);
        // Fallback to presets
        setNewsList(DEFAULT_NEWS_EXAMPLES.map(n => ({ ...n, userId: 'local' }) as EconomicNews));
      }
    } else {
      // Populate defaults on first load
      const formattedDefaults = DEFAULT_NEWS_EXAMPLES.map(n => ({ ...n, userId: 'local' }) as EconomicNews);
      setNewsList(formattedDefaults);
      localStorage.setItem('trader_journal_news', JSON.stringify(formattedDefaults));
    }
  };

  const saveToLocalStorage = (newItems: EconomicNews[]) => {
    localStorage.setItem('trader_journal_news', JSON.stringify(newItems));
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !dateTime) {
      alert(isFr ? 'Veuillez saisir au moins le nom de la news et la date/heure !' : 'Please provide at least a news name and date/time!');
      return;
    }

    const newsData: Omit<EconomicNews, 'id'> = {
      userId: currentUser ? currentUser.uid : 'local',
      name: name.trim(),
      dateTime,
      previousValue: previousValue.trim() || '-',
      forecastValue: forecastValue.trim() || '-',
      actualValue: actualValue.trim() || '-',
      globalImpact,
      marketReaction,
      createdAt: new Date().toISOString()
    };

    if (currentUser && db) {
      try {
        await addDoc(collection(db, 'economic_news'), newsData);
        setSuccessMsg(isFr ? 'News enregistrée avec succès dans le cloud !' : 'News successfully registered to the cloud!');
      } catch (err) {
        console.error('Error adding news to Firestore:', err);
        // Failover locally
        addLocalNews(newsData);
      }
    } else {
      addLocalNews(newsData);
    }

    // Reset Form
    setName('');
    setDateTime('');
    setPreviousValue('');
    setForecastValue('');
    setActualValue('');
    setGlobalImpact('POSITIF_USD');
    setMarketReaction('');

    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  const addLocalNews = (data: Omit<EconomicNews, 'id'>) => {
    const newId = 'news_' + Date.now();
    const newItem: EconomicNews = {
      id: newId,
      ...data
    };
    const updatedList = [newItem, ...newsList];
    updatedList.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    setNewsList(updatedList);
    saveToLocalStorage(updatedList);
    setSuccessMsg(isFr ? 'News enregistrée localement avec succès !' : 'News successfully registered locally!');
  };

  const handleDeleteNews = async (id: string) => {
    // Always filter out immediately from the state to provide instant visual feedback to the user
    setNewsList(prev => prev.filter(n => n.id !== id));

    // Update localStorage
    const localData = localStorage.getItem('trader_journal_news');
    if (localData) {
      try {
        const parsed: EconomicNews[] = JSON.parse(localData);
        const updated = parsed.filter(n => n.id !== id);
        localStorage.setItem('trader_journal_news', JSON.stringify(updated));
      } catch (err) {
        console.error('Error updating localStorage:', err);
      }
    }

    // Attempt firestore doc deletion if it's a persistent remote cloud doc
    if (currentUser && db && !id.startsWith('news_') && !id.startsWith('ex-')) {
      try {
        await deleteDoc(doc(db, 'economic_news', id));
      } catch (err) {
        console.error('Error deleting news from Firestore:', err);
      }
    }

    setConfirmDeleteId(null);
  };

  const handleClearAllNews = async () => {
    const itemsToDelete = [...newsList];

    // Clear UI state and localStorage immediately
    setNewsList([]);
    localStorage.removeItem('trader_journal_news');

    if (currentUser && db) {
      try {
        const promises = itemsToDelete.map(item => {
          if (!item.id.startsWith('news_') && !item.id.startsWith('ex-')) {
            return deleteDoc(doc(db, 'economic_news', item.id));
          }
          return Promise.resolve();
        });
        await Promise.all(promises);
      } catch (err) {
        console.error('Error clearing Firestore news:', err);
      }
    }

    setShowConfirmClearAll(false);
  };

  // Pre-fill helper to make testing ultra easy for user
  const handleLoadTemplate = (presetName: string) => {
    const year = new Date().getFullYear();
    const nowStr = `${year}-05-24T14:30`;
    setName(presetName);
    setDateTime(nowStr);
    
    if (presetName === 'NFP') {
      setPreviousValue('175K');
      setForecastValue('190K');
      setActualValue('220K');
      setGlobalImpact('POSITIF_USD');
      setMarketReaction(isFr ? 'Hausse USD + Baisse EUR/USD' : 'US Dollar up + EUR/USD down');
    } else if (presetName === 'CPI MoM') {
      setPreviousValue('0.3%');
      setForecastValue('0.3%');
      setActualValue('0.4%');
      setGlobalImpact('POSITIF_USD');
      setMarketReaction(isFr ? 'Hausse USD + Baisse EUR/USD' : 'US Dollar up + EUR/USD down');
    } else if (presetName === 'FOMC Statement') {
      setPreviousValue('5.50%');
      setForecastValue('5.50%');
      setActualValue('5.50%');
      setGlobalImpact('POSITIF_USD');
      setMarketReaction(isFr ? 'Hausse USD + Baisse EUR/USD' : 'US Dollar up + EUR/USD down');
    } else if (presetName === 'Retail Sales') {
      setPreviousValue('0.1%');
      setForecastValue('0.2%');
      setActualValue('-0.1%');
      setGlobalImpact('NEGATIF_USD');
      setMarketReaction(isFr ? 'Baisse USD + Hausse EUR/USD' : 'US Dollar down + EUR/USD up');
    }
  };

  // Filtered news compute
  const filteredNews = useMemo(() => {
    return newsList.filter(n => {
      const matchesSearch = n.name.toLowerCase().includes(search.toLowerCase());
      const matchesImpact = impactFilter === 'ALL' || n.globalImpact === impactFilter;
      return matchesSearch && matchesImpact;
    });
  }, [newsList, search, impactFilter]);

  return (
    <div className="space-y-6 animate-fadeInUp" id="economic-news-panel">
      
      {/* Title block with premium design */}
      <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden glow-sky-card">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-[45px] pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
              <Globe className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest font-mono flex items-center gap-2">
                {isFr ? 'Analyse des News Économiques' : 'Economic News Analysis'}
                <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-extrabold font-mono tracking-wider">
                  SMC FILTER
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isFr 
                  ? 'Étudiez la macro-économie, consignez les écarts et analysez objectivement les réactions systémiques.' 
                  : 'Study macroeconomic news events, record deviations, and analyze market reactions.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold font-mono uppercase bg-slate-800/40 px-3 py-1 rounded border border-white/5">
              {currentUser ? '☁️ Cloud Sync' : '💾 Local Storage'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Form Container */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden h-fit">
          <div className="absolute top-0 left-0 w-24 h-24 bg-sky-500/2 rounded-full blur-[40px] pointer-events-none" />
          
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-5">
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-sky-400" />
              {isFr ? 'Enregistrer une News' : 'Record a News Event'}
            </h3>
            
            <span className="text-[10px] text-slate-500 font-bold font-mono">STEP 1</span>
          </div>

          {/* Preset templates for rapid entry testing */}
          <div className="mb-5">
            <span className="text-[9px] text-slate-400 font-bold tracking-wider uppercase block mb-1.5">{isFr ? '💡 Modèles Express' : '💡 Express Templates'} :</span>
            <div className="flex flex-wrap gap-1.5">
              {['NFP', 'CPI MoM', 'FOMC Statement', 'Retail Sales'].map((pName) => (
                <button
                  key={pName}
                  type="button"
                  onClick={() => handleLoadTemplate(pName)}
                  className="text-[10px] font-bold font-mono text-slate-300 bg-[#0A0B0D] hover:bg-sky-500/10 hover:text-sky-400 px-2.5 py-1 rounded-lg border border-white/5 transition-all cursor-pointer"
                >
                  +{pName}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleAddNews} className="space-y-4">
            
            {/* Nom de la news */}
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-bold mb-1.5">{isFr ? 'Nom de la news (ex: NFP, CPI, FOMC)' : 'News Name (e.g. NFP, CPI, FOMC)'} *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: NFP, Interest Rate Decision, CPI YoY"
                className="bg-[#0A0B0D] border border-white/5 focus:border-sky-500/40 rounded-xl px-3 py-2 text-xs font-medium text-slate-100 outline-none transition-colors placeholder:text-slate-650"
              />
            </div>

            {/* Date et Heure */}
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-bold mb-1.5">{isFr ? 'Date et Heure de publication' : 'Release Date & Time'} *</label>
              <input
                type="datetime-local"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="bg-[#0A0B0D] border border-white/5 focus:border-sky-500/40 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 outline-none transition-colors font-mono"
              />
            </div>

            {/* Figures values row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col">
                <label className="text-[10px] text-slate-400 font-bold mb-1.5 truncate">{isFr ? 'Précédent' : 'Previous'}</label>
                <input
                  type="text"
                  placeholder="ex: 3.1%"
                  value={previousValue}
                  onChange={(e) => setPreviousValue(e.target.value)}
                  className="bg-[#0A0B0D] border border-white/5 focus:border-sky-500/40 rounded-xl px-2.5 py-2 text-xs text-center font-bold text-slate-100 outline-none transition-colors font-mono"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] text-slate-400 font-bold mb-1.5 truncate">{isFr ? 'Prévu' : 'Forecast'}</label>
                <input
                  type="text"
                  placeholder="ex: 2.9%"
                  value={forecastValue}
                  onChange={(e) => setForecastValue(e.target.value)}
                  className="bg-[#0A0B0D] border border-white/5 focus:border-sky-500/40 rounded-xl px-2.5 py-2 text-xs text-center font-bold text-slate-100 outline-none transition-colors font-mono"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] text-slate-400 font-bold mb-1.5 truncate">{isFr ? 'Réel' : 'Actual'}</label>
                <input
                  type="text"
                  placeholder="ex: 3.4%"
                  value={actualValue}
                  onChange={(e) => setActualValue(e.target.value)}
                  className="bg-[#0A0B0D] border border-white/10 focus:border-sky-500/40 rounded-xl px-2.5 py-2 text-xs text-center font-black text-sky-400 outline-none transition-colors font-mono"
                />
              </div>
            </div>

            {/* Global impact select */}
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-bold mb-1.5">{isFr ? 'Impact global sur le marché' : 'Global Market Impact'}</label>
              <select
                value={globalImpact}
                onChange={(e) => setGlobalImpact(e.target.value as any)}
                className="bg-[#0A0B0D] border border-white/5 focus:border-sky-500/40 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 outline-none transition-colors cursor-pointer"
              >
                <option value="POSITIF_USD">🟢 {isFr ? 'Positif USD / Force Dollar' : 'Positif USD / Strong Dollar'}</option>
                <option value="NEGATIF_USD">🔴 {isFr ? 'Négatif USD / Faiblesse Dollar' : 'Négatif USD / Weak Dollar'}</option>
              </select>
            </div>

            {/* Market reaction description */}
            <div className="flex flex-col">
              <label className="text-xs text-slate-400 font-bold mb-1.5">{isFr ? 'Réaction typique constatée' : 'Typical Market Reaction'} *</label>
              <input
                type="text"
                required
                value={marketReaction}
                onChange={(e) => setMarketReaction(e.target.value)}
                placeholder={isFr ? "ex: Hausse USD + Baisse EUR/USD" : "e.g. US Dollar up + EUR/USD down"}
                className="bg-[#0A0B0D] border border-white/5 focus:border-sky-500/40 rounded-xl px-3 py-2 text-xs font-medium text-slate-100 outline-none transition-colors placeholder:text-slate-600 font-mono"
              />
            </div>

            {/* Success message banner info */}
            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs px-3.5 py-2 rounded-xl text-center font-bold animate-fadeIn">
                {successMsg}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-extrabold text-xs py-2.5 rounded-xl shadow-lg shadow-sky-500/10 flex items-center justify-center gap-2 transition-all transform hover:translate-y-[-1px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isFr ? 'Ajouter à la Timeline' : 'Add to Timeline'}</span>
            </button>
          </form>
        </div>

        {/* Timeline List Column */}
        <div className="lg:col-span-7 bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/2 rounded-full blur-[45px] pointer-events-none" />
          
          <div className="relative z-10">
            {/* Filter Search Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/5 pb-4 mb-6">
              <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider font-mono flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                {isFr ? 'Flux Chronologique des News' : 'Chronological News Timeline'}
              </h3>
              
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {/* Micro Search Input */}
                <div className="bg-[#0A0B0D] border border-white/5 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-xs w-full sm:w-40">
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={isFr ? 'Chercher...' : 'Search...'}
                    className="bg-transparent text-[11px] text-slate-200 outline-none w-full font-bold placeholder:text-slate-600"
                  />
                </div>

                {/* Filter Selector */}
                <select
                  value={impactFilter}
                  onChange={(e) => setImpactFilter(e.target.value as any)}
                  className="bg-[#0A0B0D] border border-white/5 focus:border-sky-500/40 rounded-xl px-2.5 py-1.5 text-[10px] font-black tracking-wide text-slate-350 outline-none cursor-pointer"
                >
                  <option value="ALL">🔍 ALL IMPACTS</option>
                  <option value="POSITIF_USD">🟢 POSITIF USD</option>
                  <option value="NEGATIF_USD">🔴 NEGATIF USD</option>
                </select>

                {/* Clear All Flow Button with custom inline confirmation */}
                {newsList.length > 0 && (
                  showConfirmClearAll ? (
                    <div className="flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-xl animate-scaleIn shrink-0">
                      <span className="text-[9px] text-rose-400 font-black font-mono uppercase tracking-wider">
                        {isFr ? 'TOUT SUPPRIMER ?' : 'CLEAR ALL?'}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllNews}
                        className="px-1.5 py-0.5 bg-rose-500 text-white rounded text-[8px] font-extrabold cursor-pointer hover:bg-rose-600 transition-colors"
                      >
                        {isFr ? 'Oui' : 'Yes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfirmClearAll(false)}
                        className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[8px] font-bold cursor-pointer hover:bg-slate-700 transition-colors"
                      >
                        {isFr ? 'Annuler' : 'Cancel'}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowConfirmClearAll(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-550/20 text-rose-400 border border-rose-500/20 rounded-xl text-[10px] font-black tracking-wide uppercase transition-all duration-200 cursor-pointer shrink-0"
                      title={isFr ? 'Effacer tout le flux de news' : 'Clear all news items'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isFr ? 'Effacer Tout' : 'Clear All'}</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Historical News list */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-6 h-6 border-2 border-sky-500 rounded-full border-t-transparent animate-spin" />
                <p className="text-[10px] font-bold font-mono text-slate-500 uppercase">{isFr ? 'Chargement...' : 'Loading...'}</p>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/5 rounded-2xl bg-[#0A0B0D]/40 text-center px-4">
                <AlertTriangle className="w-7 h-7 text-slate-500 mb-2" />
                <p className="text-xs font-bold text-slate-300">
                  {isFr ? 'Aucun événement macro-économique' : 'No economic news registered'}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-[280px]">
                  {isFr 
                    ? 'Saisissez vos premières données de news dans le formulaire de gauche ou chargez un modèle express !' 
                    : 'Enter your first news deviance values or load a preset on the left form!'}
                </p>
              </div>
            ) : (
              <div className="relative border-l border-white/5 ml-3 pl-6 space-y-6 max-h-[580px] overflow-y-auto pr-2 scroller-none">
                
                {filteredNews.map((news) => {
                  const isPositiveUSD = news.globalImpact === 'POSITIF_USD';
                  const dateObj = new Date(news.dateTime);
                  const formattedDate = dateObj.toLocaleDateString(isFr ? 'fr-FR' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });
                  const formattedTime = dateObj.toLocaleTimeString(isFr ? 'fr-FR' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div 
                      key={news.id} 
                      className={`relative bg-[#0E1217] rounded-2xl p-4 transition-all hover:bg-[#12171E] group border ${
                        isPositiveUSD 
                          ? 'border-emerald-500/15 hover:border-emerald-500/30 shadow-[0_4px_15px_rgba(16,185,129,0.02)]' 
                          : 'border-rose-500/15 hover:border-rose-500/30 shadow-[0_4px_15px_rgba(244,63,94,0.02)]'
                      }`}
                    >
                      {/* Left glowing dot anchored to chronology border timeline line */}
                      <span className={`absolute top-6 -left-[31px] w-2.5 h-2.5 rounded-full z-10 border-2 ${
                        isPositiveUSD ? 'bg-emerald-500 border-[#0E1116]' : 'bg-rose-500 border-[#0E1116]'
                      } shadow-[0_0_8px_currentColor]`} />

                      {/* Top Header Card */}
                      <div className="flex items-center justify-between gap-3 mb-3 pb-2.5 border-b border-white/5">
                        <div>
                          <h4 className="text-xs font-black text-white uppercase tracking-wide flex items-center gap-1.5 font-sans">
                            {news.name}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-bold font-mono flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {formattedDate} - {formattedTime}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {confirmDeleteId === news.id ? (
                            <div className="flex items-center gap-1.5 p-1 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-scaleIn">
                              <span className="text-[10px] text-rose-400 font-bold uppercase font-mono tracking-wider px-1">
                                {isFr ? 'Sûr ?' : 'Sure?'}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteNews(news.id);
                                }}
                                className="px-2 py-0.5 bg-rose-500 hover:bg-rose-600 text-white rounded text-[10px] font-black uppercase tracking-wide cursor-pointer transition-colors duration-150"
                              >
                                {isFr ? 'Oui' : 'Yes'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-0.5 bg-[#161B22] hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold uppercase tracking-wide cursor-pointer transition-colors duration-150 border border-white/5"
                              >
                                {isFr ? 'Non' : 'No'}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDeleteId(news.id);
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/15 border border-transparent hover:border-rose-500/10 transition-all cursor-pointer duration-200"
                              title={isFr ? 'Supprimer cet enregistrement' : 'Delete record'}
                            >
                              <Trash2 className="w-4 h-4 text-slate-400 hover:text-rose-450" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Prev / Forecast / Actual Stats boxes */}
                      <div className="grid grid-cols-3 gap-2 bg-[#0A0B0D]/50 p-2.5 rounded-xl border border-white/4 mb-4">
                        <div className="text-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{isFr ? 'Précédent' : 'Previous'}</span>
                          <span className="text-xs text-slate-300 font-bold font-mono">{news.previousValue}</span>
                        </div>
                        <div className="text-center border-x border-white/5">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{isFr ? 'Prévu' : 'Forecast'}</span>
                          <span className="text-xs text-slate-300 font-bold font-mono">{news.forecastValue}</span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">{isFr ? 'Réel constaté' : 'Actual'}</span>
                          <span className={`text-xs font-extrabold font-mono ${isPositiveUSD ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {news.actualValue}
                          </span>
                        </div>
                      </div>

                      {/* Visual Market Impacts displays requested */}
                      <div className="space-y-2">
                        {/* Impact descriptor */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-semibold">{isFr ? 'Impact Global :' : 'Global Impact :'}</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold font-mono tracking-wider ${
                            isPositiveUSD 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                          }`}>
                            {isPositiveUSD ? 'USD BULLISH (HAUSSE)' : 'USD BEARISH (BAISSE)'}
                          </span>
                        </div>

                        {/* Standard FX representation arrows (USD up direction, EURUSD down direction) */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {/* USD direction banner */}
                          <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl border ${
                            isPositiveUSD 
                              ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400' 
                              : 'bg-rose-500/5 border-rose-500/10 text-rose-400'
                          }`}>
                            <span className="text-[10px] font-extrabold tracking-widest font-mono">💵 DXY (USD)</span>
                            <div className="flex items-center gap-1 font-black font-mono">
                              {isPositiveUSD ? (
                                <>
                                  <ArrowUp className="w-3.5 h-3.5 animate-bounce" />
                                  <span className="text-xs">HAUSSE</span>
                                </>
                              ) : (
                                <>
                                  <ArrowDown className="w-3.5 h-3.5" />
                                  <span className="text-xs">BAISSE</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* EUR/USD corresponding inverse reaction banner */}
                          <div className={`flex items-center justify-between px-3 py-1.5 rounded-xl border ${
                            isPositiveUSD 
                              ? 'bg-rose-500/5 border-rose-500/10 text-rose-400' 
                              : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400'
                          }`}>
                            <span className="text-[10px] font-extrabold tracking-widest font-mono">🇪🇺 EUR/USD</span>
                            <div className="flex items-center gap-1 font-black font-mono">
                              {isPositiveUSD ? (
                                <>
                                  <ArrowDown className="w-3.5 h-3.5" />
                                  <span className="text-xs">BAISSE</span>
                                </>
                              ) : (
                                <>
                                  <ArrowUp className="w-3.5 h-3.5 animate-bounce" />
                                  <span className="text-xs">HAUSSE</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Market reaction textual description */}
                        <div className="text-[10px] text-slate-450 italic mt-2.5 pt-2 border-t border-white/4 flex items-center gap-1.5 font-medium">
                          <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>
                            {isFr ? 'Réaction générale constatée : ' : 'Global recorded system reaction: '} 
                            <strong className="text-slate-300 font-mono not-italic bg-slate-800/30 px-1.5 py-0.5 rounded ml-1 border border-white/5">
                              {news.marketReaction === 'HAUSSE_USD_BAISSE_EURUSD' 
                                ? (isFr ? 'Hausse USD + Baisse EUR/USD' : 'US Dollar up + EUR/USD down')
                                : news.marketReaction === 'BAISSE_USD_HAUSSE_EURUSD'
                                ? (isFr ? 'Baisse USD + Hausse EUR/USD' : 'US Dollar down + EUR/USD up')
                                : news.marketReaction
                              }
                            </strong>
                          </span>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick instructions Footer */}
          <div className="border-t border-white/5 pt-4 mt-6 text-[10px] text-slate-550 flex items-center gap-2 font-mono justify-center font-bold">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>{isFr ? 'ANALYSES CORRÉLÉES SANS RECHARGEMENT DE PAGE' : 'CORRELATED ANALYSIS WITHOUT PAGE RELOADING'}</span>
          </div>

        </div>

      </div>

    </div>
  );
}
