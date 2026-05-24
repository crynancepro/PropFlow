import React, { useState, useEffect, useMemo } from 'react';
import { 
  ExternalLink, Plus, Trash2, Search, Link2, Monitor, Globe, 
  Sparkles, CheckCircle, AlertCircle, X, Compass, ChevronRight
} from 'lucide-react';
import { WorkspaceLink } from '../types';
import { auth, db } from '../firebase-setup';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

interface WorkspaceLinksProps {
  language?: 'fr' | 'en';
}

const DEFAULT_LINKS_EXAMPLES: Omit<WorkspaceLink, 'userId'>[] = [
  {
    id: 'lnk-ex-1',
    name: 'TradingView',
    url: 'https://www.tradingview.com',
    domain: 'tradingview.com',
    createdAt: new Date().toISOString()
  },
  {
    id: 'lnk-ex-2',
    name: 'Forex Factory',
    url: 'https://www.forexfactory.com',
    domain: 'forexfactory.com',
    createdAt: new Date().toISOString()
  },
  {
    id: 'lnk-ex-3',
    name: 'FTMO (Prop Firm)',
    url: 'https://ftmo.com',
    domain: 'ftmo.com',
    createdAt: new Date().toISOString()
  }
];

const QUICK_SUGGESTIONS = [
  { name: 'Investing.com', url: 'https://www.investing.com' },
  { name: 'MyFxBook', url: 'https://www.myfxbook.com' },
  { name: 'Binance', url: 'https://www.binance.com' },
  { name: 'CMC Markets', url: 'https://www.cmcmarkets.com' },
];

export default function WorkspaceLinks({ language = 'fr' }: WorkspaceLinksProps) {
  const isFr = language === 'fr';
  const [links, setLinks] = useState<WorkspaceLink[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and View settings
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteUrl, setNewSiteUrl] = useState('');
  
  // User Authentication State
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  // Deletion tracking (for non-blocking inline confirmation overlays)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

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
      const linksCollection = collection(db, 'workspace_links');
      const unsubscribe = onSnapshot(linksCollection, (snapshot) => {
        const items: WorkspaceLink[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.userId === currentUser.uid) {
            items.push({
              id: docSnap.id,
              userId: data.userId,
              name: data.name,
              url: data.url,
              domain: data.domain,
              createdAt: data.createdAt,
            });
          }
        });
        
        // Sort
        items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLinks(items);
        setLoading(false);
      }, (err) => {
        console.error('Firestore Workspace Links error:', err);
        loadFromLocalStorage();
        setLoading(false);
      });
      return unsubscribe;
    } else {
      loadFromLocalStorage();
      setLoading(false);
    }
  }, [currentUser]);

  const loadFromLocalStorage = () => {
    const localData = localStorage.getItem('trader_workspace_links');
    if (localData) {
      try {
        const parsed: WorkspaceLink[] = JSON.parse(localData);
        parsed.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setLinks(parsed);
      } catch (err) {
        console.error('Error parsing local links data:', err);
        setLinks(DEFAULT_LINKS_EXAMPLES.map(l => ({ ...l, userId: 'local' }) as WorkspaceLink));
      }
    } else {
      // Setup Defaults
      const formattedDefaults = DEFAULT_LINKS_EXAMPLES.map(l => ({ ...l, userId: 'local' }) as WorkspaceLink);
      setLinks(formattedDefaults);
      localStorage.setItem('trader_workspace_links', JSON.stringify(formattedDefaults));
    }
  };

  const saveToLocalStorage = (newItems: WorkspaceLink[]) => {
    localStorage.setItem('trader_workspace_links', JSON.stringify(newItems));
  };

  const extractDomainHelper = (urlStr: string): string => {
    try {
      let temp = urlStr.trim();
      if (!/^https?:\/\//i.test(temp)) {
        temp = 'https://' + temp;
      }
      const u = new URL(temp);
      // Remove 'www.' for a cleaner domain name
      return u.hostname.replace(/^www\./i, '');
    } catch (e) {
      return '';
    }
  };

  const getFaviconUrl = (domain: string) => {
    if (!domain) return '';
    return `https://www.google.com/s2/favicons?sz=64&domain=${domain}`;
  };

  // Real-time extracted domain for Live preview in Modal
  const currentLiveDomain = useMemo(() => {
    return extractDomainHelper(newSiteUrl);
  }, [newSiteUrl]);

  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim() || !newSiteUrl.trim()) {
      return;
    }

    // Format URL correctly
    let finalUrl = newSiteUrl.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    const domain = extractDomainHelper(finalUrl) || 'link';

    const linkData: Omit<WorkspaceLink, 'id'> = {
      userId: currentUser ? currentUser.uid : 'local',
      name: newSiteName.trim(),
      url: finalUrl,
      domain,
      createdAt: new Date().toISOString()
    };

    if (currentUser && db) {
      try {
        await addDoc(collection(db, 'workspace_links'), linkData);
        setSuccessMsg(isFr ? 'Lien enregistré dans le cloud !' : 'Link saved to cloud!');
      } catch (err) {
        console.error('Error adding link to Firestore:', err);
        addLocalLink(linkData);
      }
    } else {
      addLocalLink(linkData);
    }

    // Reset Form
    setNewSiteName('');
    setNewSiteUrl('');
    setIsModalOpen(false);

    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  const addLocalLink = (data: Omit<WorkspaceLink, 'id'>) => {
    const newId = 'lnk_' + Date.now();
    const newItem: WorkspaceLink = {
      id: newId,
      ...data
    };
    const updatedList = [newItem, ...links];
    setLinks(updatedList);
    saveToLocalStorage(updatedList);
    setSuccessMsg(isFr ? 'Lien enregistré localement !' : 'Link saved locally!');
  };

  const handleDeleteLink = async (id: string) => {
    // Delete immediately from UI state for visual speed trigger
    setLinks(prev => prev.filter(l => l.id !== id));

    // Update LocalStorage
    const localData = localStorage.getItem('trader_workspace_links');
    if (localData) {
      try {
        const parsed: WorkspaceLink[] = JSON.parse(localData);
        const updated = parsed.filter(l => l.id !== id);
        localStorage.setItem('trader_workspace_links', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
    }

    // Delete from Firestore if relevant
    if (currentUser && db && !id.startsWith('lnk-ex-') && !id.startsWith('lnk_')) {
      try {
        await deleteDoc(doc(db, 'workspace_links', id));
      } catch (err) {
        console.error('Error deleting link:', err);
      }
    }

    setConfirmDeleteId(null);
  };

  const handleClearAllLinks = async () => {
    const itemsToDelete = [...links];
    setLinks([]);
    localStorage.removeItem('trader_workspace_links');

    if (currentUser && db) {
      try {
        const promises = itemsToDelete.map(item => {
          if (!item.id.startsWith('lnk-ex-') && !item.id.startsWith('lnk_')) {
            return deleteDoc(doc(db, 'workspace_links', item.id));
          }
          return Promise.resolve();
        });
        await Promise.all(promises);
      } catch (err) {
        console.error(err);
      }
    }
    setShowConfirmClearAll(false);
  };

  const handleAddPreset = (name: string, url: string) => {
    const domain = extractDomainHelper(url) || 'link';
    const linkData: Omit<WorkspaceLink, 'id'> = {
      userId: currentUser ? currentUser.uid : 'local',
      name,
      url,
      domain,
      createdAt: new Date().toISOString()
    };

    if (currentUser && db) {
      addDoc(collection(db, 'workspace_links'), linkData).catch(() => {
        addLocalLink(linkData);
      });
    } else {
      addLocalLink(linkData);
    }
  };

  // Filtered computed list
  const filteredLinks = useMemo(() => {
    return links.filter(l => {
      const term = search.toLowerCase();
      return l.name.toLowerCase().includes(term) || l.domain.toLowerCase().includes(term);
    });
  }, [links, search]);

  return (
    <div className="space-y-6 animate-fadeInUp" id="workspace-links-panel">
      
      {/* Title block with premium trading layout */}
      <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden glow-sky-card">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-[45px] pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
              <Monitor className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-100 uppercase tracking-widest font-mono flex items-center gap-2">
                {isFr ? 'Mon Espace de Travail' : 'My Workspace'}
                <span className="text-[9px] bg-cyan-500/15 text-cyan-400 px-1.5 py-0.5 rounded font-extrabold font-mono tracking-wider">
                  QUICK LINKS
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {isFr 
                  ? 'Centralisez vos outils de trading, chartings et prop firms avec détection automatique de logos.' 
                  : 'Centralize your trading tools, charts & prop firms with live auto-retrieved favicons.'}
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

      {/* Main Container */}
      <div className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        
        {/* Actions bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/5 pb-5 mb-6">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="bg-[#0A0B0D] border border-white/5 rounded-xl px-3 py-2 flex items-center gap-2 text-xs w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isFr ? 'Rechercher un lien...' : 'Search a link...'}
                className="bg-transparent text-xs text-slate-200 outline-none w-full font-medium placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Clear All Inline Overlay */}
            {links.length > 0 && (
              showConfirmClearAll ? (
                <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-xl animate-scaleIn">
                  <span className="text-[10px] text-rose-400 font-black font-mono uppercase tracking-wider">
                    {isFr ? 'TOUT EFFACER ?' : 'CLEAR ALL?'}
                  </span>
                  <button
                    onClick={handleClearAllLinks}
                    className="px-2 py-1 bg-rose-500 text-white rounded-lg text-[9px] font-black cursor-pointer hover:bg-rose-600 transition-colors"
                  >
                    {isFr ? 'Oui' : 'Yes'}
                  </button>
                  <button
                    onClick={() => setShowConfirmClearAll(false)}
                    className="px-2 py-1 bg-slate-800 text-slate-305 rounded-lg text-[9px] font-bold cursor-pointer hover:bg-slate-700 transition-colors"
                  >
                    {isFr ? 'Annuler' : 'Cancel'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConfirmClearAll(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 border border-rose-500/15 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isFr ? 'Tout effacer' : 'Clear All'}</span>
                </button>
              )
            )}

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white rounded-xl text-xs font-black shadow-lg shadow-cyan-500/10 cursor-pointer transition-all hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4 animate-bounce" />
              <span>{isFr ? 'Ajouter un Site' : 'Add a Site'}</span>
            </button>
          </div>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="mb-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-xl flex items-center gap-2.5 text-xs font-bold animate-fadeIn">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Links Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-8 h-8 border-3 border-cyan-500 rounded-full border-t-transparent animate-spin" />
            <p className="text-xs font-bold font-mono text-slate-400 uppercase tracking-widest">{isFr ? 'Chargement en cours...' : 'Loading workspace...'}</p>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 border border-dashed border-white/5 rounded-2xl bg-[#0A0B0D]/50 text-center px-4 max-w-xl mx-auto">
            <Link2 className="w-10 h-10 text-slate-600 mb-3 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">{isFr ? 'Espace de travail vide' : 'Empty workspace'}</h3>
            <p className="text-xs text-slate-400 mt-2">
              {isFr 
                ? 'Consignez vos cartes en un clic pour y accéder en cours de session de trading.' 
                : 'Save your customized links to access charting and prop platforms instantly during your trading sessions.'}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isFr ? 'Enregistrer mon premier lien' : 'Add my first URL'}</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredLinks.map((link) => {
              const favicon = getFaviconUrl(link.domain);
              
              return (
                <div 
                  key={link.id}
                  className="group relative bg-[#0E1217] hover:bg-[#12171E] border border-white/5 hover:border-cyan-550/20 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer"
                  onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                >
                  {/* Glass visual background accent glow on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/[0.01] to-cyan-500/[0.03] opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity pointer-events-none" />

                  {/* Left Logo and text container */}
                  <div className="flex items-center gap-3.5 relative z-10 overflow-hidden w-full">
                    {/* Live favicon fetcher frame */}
                    <div className="w-12 h-12 bg-slate-900/80 rounded-xl border border-white/5 flex items-center justify-center shrink-0 shadow-inner group-hover:border-cyan-500/20 transition-all">
                      {link.domain ? (
                        <img 
                          src={favicon}
                          alt={link.name}
                          onError={(e) => {
                            // Fallback to stylized letter if Google engine fails
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const placeholderEl = document.createElement('span');
                              placeholderEl.className = "text-xs font-black font-mono text-cyan-400 uppercase";
                              placeholderEl.innerText = link.name.substring(0, 2);
                              parent.appendChild(placeholderEl);
                            }
                          }}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 object-contain transition-transform group-hover:scale-110 duration-200"
                        />
                      ) : (
                        <Globe className="w-6 h-6 text-slate-500" />
                      )}
                    </div>

                    <div className="overflow-hidden">
                      <h4 className="text-xs font-black text-white group-hover:text-cyan-400 transition-colors uppercase tracking-wider truncate mb-1">
                        {link.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 group-hover:text-slate-400 font-mono font-bold truncate">
                        {link.domain}
                      </p>
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-1.5 shrink-0 relative z-25" onClick={(e) => e.stopPropagation()}>
                    {confirmDeleteId === link.id ? (
                      <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 p-1 rounded-xl animate-scaleIn">
                        <button
                          onClick={() => handleDeleteLink(link.id)}
                          className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[9px] font-black uppercase cursor-pointer"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 bg-slate-800 text-slate-300 rounded text-[9px] font-bold cursor-pointer"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => setConfirmDeleteId(link.id)}
                          className="text-slate-650 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/5 transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                          title={isFr ? 'Supprimer' : 'Delete'}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-slate-500" />
                        </button>

                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-500 hover:text-cyan-400 p-1.5 rounded-lg hover:bg-cyan-500/10 transition-all border border-transparent hover:border-cyan-500/10 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Setup recommendations row */}
        <div className="mt-8 border-t border-white/5 pt-6 relative z-10">
          <h4 className="text-[10px] text-slate-400 font-black tracking-widest font-mono uppercase mb-3 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-cyan-500" />
            {isFr ? '💡 Recommandations et suggestions rapides :' : '💡 Suggested quick setup platforms :'}
          </h4>
          <div className="flex flex-wrap gap-2.5">
            {QUICK_SUGGESTIONS.map((rec) => {
              const domain = extractDomainHelper(rec.url);
              // Avoid duplicates
              const exists = links.some(l => extractDomainHelper(l.url) === domain);
              if (exists) return null;

              return (
                <button
                  key={rec.name}
                  onClick={() => handleAddPreset(rec.name, rec.url)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0E1217]/50 hover:bg-cyan-500/5 hover:text-cyan-400 text-slate-300 border border-white/5 rounded-xl text-[10px] font-bold font-mono transition-all cursor-pointer hover:border-cyan-500/20"
                >
                  <img src={getFaviconUrl(domain)} alt="" className="w-3.5 h-3.5 object-contain" onError={(e) => e.currentTarget.style.display='none'} />
                  <span>+{rec.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Disclaimer signature */}
        <div className="border-t border-white/5 pt-4 mt-6 text-[10px] text-slate-500 flex items-center gap-2 font-mono justify-center font-bold">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>{isFr ? 'ACCÈS DIRECT SÉCURISÉ SANS REDIRECTION' : 'DIRECT SECURE ACCESS WITHOUT REDIRECT'}</span>
        </div>
      </div>

      {/* MODAL VIEW COMPONENT */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#12161F] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl relative overflow-hidden animate-scaleIn">
            
            {/* Ambient subtle glow background */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-[35px]" />
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div className="flex items-center gap-2">
                <Link2 className="text-cyan-400 w-4 h-4" />
                <h3 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                  {isFr ? 'Ajouter à mon espace' : 'Add to my Workspace'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddLink} className="p-6 space-y-5">
              
              {/* Name Site */}
              <div className="flex flex-col">
                <label className="text-[11px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide font-mono">
                  {isFr ? 'Nom du site' : 'Site Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  placeholder="ex: TradingView, Forex Factory"
                  className="bg-[#0A0B0D] border border-white/5 focus:border-cyan-500/40 rounded-xl px-3 py-2.5 text-xs text-white outline-none font-medium transition-all placeholder:text-slate-600"
                />
              </div>

              {/* URL site */}
              <div className="flex flex-col">
                <label className="text-[11px] text-slate-400 font-bold mb-1.5 uppercase tracking-wide font-mono">
                  {isFr ? 'Lien URL du site' : 'Site URL Link'} *
                </label>
                <input
                  type="text"
                  required
                  value={newSiteUrl}
                  onChange={(e) => setNewSiteUrl(e.target.value)}
                  placeholder="ex: https://tradingview.com"
                  className="bg-[#0A0B0D] border border-white/5 focus:border-cyan-500/40 rounded-xl px-3 py-2.5 text-xs text-white outline-none font-medium transition-all placeholder:text-slate-650"
                />
              </div>

              {/* Favicon real-time preview visual section */}
              {newSiteUrl.trim() && currentLiveDomain && (
                <div className="bg-[#0A0B0D]/55 p-3.5 rounded-xl border border-white/5 flex items-center justify-between gap-3 animate-slideIn">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-900 rounded-lg border border-white/5 flex items-center justify-center shrink-0">
                      <img 
                        src={getFaviconUrl(currentLiveDomain)} 
                        alt="Preview" 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent && !parent.querySelector('.fb-icon')) {
                            const icon = document.createElement('span');
                            icon.className = "fb-icon text-xxs font-black text-cyan-400 uppercase font-mono";
                            icon.innerText = newSiteName ? newSiteName.substring(0, 2) : 'WS';
                            parent.appendChild(icon);
                          }
                        }}
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-cyan-400 font-black font-mono uppercase tracking-wider block">
                        {isFr ? 'Favicon ID' : 'Favicon ID'}
                      </span>
                      <span className="text-[11px] text-slate-300 font-semibold font-mono truncate max-w-[200px] block">
                        {currentLiveDomain}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] bg-emerald-500/15 text-emerald-400 font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                    {isFr ? 'Résolu' : 'Resolved'}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold font-mono uppercase tracking-wider bg-transparent hover:bg-white/5 rounded-xl transition-all cursor-pointer"
                >
                  {isFr ? 'Annuler' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/10 cursor-pointer flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isFr ? 'Créer la Carte' : 'Create Card'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
