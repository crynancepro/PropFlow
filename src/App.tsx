import React, { useState, useEffect } from 'react';
import { Trade, UserProfile, MarketOpportunity, TradingAccount } from './types';
import { Language, TRANSLATIONS } from './utils/i18n';
import StatsDashboard from './components/StatsDashboard';
import TradeJournal from './components/TradeJournal';
import AccountManager from './components/AccountManager';
import DataTicker from './components/DataTicker';
import WorkspaceLinks from './components/WorkspaceLinks';
import FirebaseAuthentication from './components/FirebaseAuthentication';
import { createPremiumInvoice } from './services/nowpayments';
import PremiumPage from './pages/Premium';
import TradingViewCharts from './components/TradingViewCharts';
import SalaryDashboard from './pages/SalaryDashboard';
import SessionAnalysisPage from './pages/SessionAnalysisPage';
import { playHighTechClick } from './utils/soundEffects';

import { 
  auth, db, isConfigured, loginWithGoogle, logoutUser, handleFirestoreError, OperationType, sanitizeFirestoreData 
} from './firebase-setup';
import { doc, setDoc, getDoc, collection, onSnapshot, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';

import { 
  TrendingUp, BarChart2, BookOpen, PlayCircle, ShieldCheck, 
  Settings, LogIn, LogOut, RefreshCw, HelpCircle, BadgeCheck, DollarSign, Globe, Monitor,
  Sun, Moon, Crown, Tv, Coins, Calendar
} from 'lucide-react';

const DEFAULT_TRADES: Trade[] = [
  {
    id: "mock-1",
    userId: "local",
    symbol: "BTC/USD",
    direction: "BUY",
    entryPrice: 62000,
    exitPrice: 64500,
    quantity: 0.1,
    status: "CLOSED",
    pnl: 240,
    fees: 10,
    setup: "Double Top / Creux",
    rating: 5,
    notes: "Parfait respect du plan après la cassure du support 1H. Aucune émotionalité FOMO décelée.",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    closedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 4 * 3600 * 1000).toISOString()
  },
  {
    id: "mock-2",
    userId: "local",
    symbol: "EUR/USD",
    direction: "BUY",
    entryPrice: 1.0820,
    exitPrice: 1.0780,
    quantity: 10000,
    status: "CLOSED",
    pnl: -45,
    fees: 5,
    setup: "Cassure de Support/Résistance",
    rating: 3,
    notes: "Saisie hâtive par ennui. Le Stop Loss m'a préservé de pertes plus conséquentes.",
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    closedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 1 * 3600 * 1000).toISOString()
  },
  {
    id: "mock-3",
    userId: "local",
    symbol: "GOLD",
    direction: "BUY",
    entryPrice: 2350,
    exitPrice: 2410,
    quantity: 5,
    status: "CLOSED",
    pnl: 280,
    fees: 20,
    setup: "Croisement Moyennes Mobiles (EMA)",
    rating: 4,
    notes: "Tendance haussière confirmée par les moyennes 20 et 50 EMA. Objectif de take profit touché en fin de session US.",
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    closedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 8 * 3600 * 1000).toISOString()
  },
  {
    id: "mock-4",
    userId: "local",
    symbol: "ETH/USD",
    direction: "SELL",
    entryPrice: 3250,
    quantity: 1,
    status: "OPEN",
    stopLoss: 3400,
    takeProfit: 2900,
    fees: 15,
    setup: "Divergence RSI / MACD",
    rating: 3,
    notes: "Divergence baissière majeure détectée sur le RSI 4H à l'approche du canal vendeur.",
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString()
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'STATS' | 'JOURNAL' | 'ANALYSIS' | 'WORKSPACE' | 'CHARTS' | 'SALARY' | 'PREMIUM'>('STATS');
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [demoUser, setDemoUser] = useState<{ uid: string; email: string; displayName?: string } | null>(() => {
    const saved = localStorage.getItem('trading_demo_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [authResolving, setAuthResolving] = useState<boolean>(true);

  const activeUser = currentUser || demoUser;

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('trading_language');
    return (saved === 'en' || saved === 'fr') ? saved : 'fr';
  });
  
  // Theme state and persistence rules
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('trading_theme');
    return (saved === 'light') ? 'light' : 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('trading_theme', theme);
  }, [theme]);
  
  // Multiple account management state
  const [accounts, setAccounts] = useState<TradingAccount[]>([
    {
      id: "default-propfirm",
      name: "Compte Principal (PropFirm)",
      type: "PROPFIRM",
      firmOrBrokerName: "FTMO",
      startingBalance: 100000,
      currency: "USD",
      createdAt: new Date().toISOString()
    }
  ]);
  const [activeAccountId, setActiveAccountId] = useState<string>("default-propfirm");

  // User configs
  const [startingBalance, setStartingBalance] = useState<number>(100000);
  const [currency, setCurrency] = useState<string>('USD');
  const [isPremiumState, setIsPremiumState] = useState<boolean>(false);
  // Seul cet email bénéficie de l'accès gratuit permanent sur le site
  const isPremium = (activeUser?.email?.toLowerCase() === "peter25ngouala@gmail.com") || isPremiumState;
  const setIsPremium = (val: boolean) => {
    setIsPremiumState(val);
  };
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loadingCloud, setLoadingCloud] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Load starting configuration
  useEffect(() => {
    // 1. Authenticated state listener
    let unsubscribeTrades: () => void = () => {};
    let unsubscribeUser: () => void = () => {};

    if (isConfigured && auth) {
      const authUnsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        
        // Clean up previous listeners if they exist
        if (unsubscribeTrades) unsubscribeTrades();
        if (unsubscribeUser) unsubscribeUser();

        if (user) {
          setLoadingCloud(true);

          try {
            const userDocRef = doc(db, 'users', user.uid);
            
            // 1. Subscribe to real-time User Document changes (accounts, starting balance, currency, etc.)
            unsubscribeUser = onSnapshot(userDocRef, async (userSnap) => {
              if (userSnap.exists()) {
                const userData = userSnap.data();
                if (userData.startingBalance !== undefined) {
                  setStartingBalance(userData.startingBalance);
                }
                if (userData.currency !== undefined) {
                  setCurrency(userData.currency);
                }
                if (userData.accounts && userData.accounts.length > 0) {
                  setAccounts(userData.accounts);
                }
                if (userData.activeAccountId !== undefined) {
                  setActiveAccountId(userData.activeAccountId);
                }
                if (userData.isPremium !== undefined) {
                  setIsPremium(userData.isPremium);
                } else {
                  setIsPremium(false);
                }

                if (userData.createdAt) {
                  let dateStr = "";
                  if (typeof userData.createdAt.toDate === "function") {
                    dateStr = userData.createdAt.toDate().toISOString();
                  } else {
                    dateStr = String(userData.createdAt);
                  }
                  setUserCreatedAt(dateStr);
                } else {
                  // Sauvegarder la date d'inscription actuelle s'il n'y en a pas dans Firestore
                  const nowStr = new Date().toISOString();
                  setUserCreatedAt(nowStr);
                  updateDoc(userDocRef, { createdAt: nowStr }).catch(err => {
                    console.warn("Échec d'actualisation silencieuse de createdAt dans Firestore:", err);
                  });
                }
              } else {
                // Initialize user document in cloud Firestore using current template/local data
                const currentCap = parseFloat(localStorage.getItem('trading_capital') || '100000');
                const currentCurrVal = localStorage.getItem('trading_currency') || 'USD';
                let currentAccounts = accounts;
                const rawLocalAccs = localStorage.getItem('trading_accounts');
                if (rawLocalAccs) {
                  try {
                    currentAccounts = JSON.parse(rawLocalAccs);
                  } catch(_) {}
                }
                const currentActiveId = localStorage.getItem('trading_active_account_id') || 'default-propfirm';

                const nowIsoString = new Date().toISOString();
                await setDoc(userDocRef, {
                  ...sanitizeFirestoreData({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    startingBalance: currentCap,
                    currency: currentCurrVal,
                    accounts: currentAccounts,
                    activeAccountId: currentActiveId,
                    isPremium: false,
                    createdAt: nowIsoString
                  })
                });
              }
            }, (err) => {
              console.error("Échec du chargement en temps réel du profil utilisateur:", err);
            });

            // 2. Subscribe to real-time Trades Subcollection changes
            const tradesColl = collection(db, 'users', user.uid, 'trades');
            unsubscribeTrades = onSnapshot(tradesColl, async (snapshot) => {
              const cloudTrades: Trade[] = [];
              snapshot.forEach((docSnap) => {
                cloudTrades.push({ id: docSnap.id, ...docSnap.data() } as Trade);
              });
              
              if (cloudTrades.length > 0) {
                setTrades(cloudTrades);
                // Cache instantly
                localStorage.setItem(`trading_journal_trades_${user.uid}`, JSON.stringify(cloudTrades));
                localStorage.setItem('trading_journal_trades', JSON.stringify(cloudTrades));
              } else {
                // Cloud is empty. If we have local offline trades, sync them up to the cloud!
                const localTr = localStorage.getItem(`trading_journal_trades_${user.uid}`) || localStorage.getItem('trading_journal_trades');
                if (localTr) {
                  try {
                    const parsedLocal = JSON.parse(localTr) as Trade[];
                    // Only sync actual trades, not the bare initial default mocks
                    const userCreatedTrades = parsedLocal.filter(t => !DEFAULT_TRADES.some(dt => dt.id === t.id));
                    
                    if (userCreatedTrades.length > 0) {
                      setTrades(parsedLocal);
                      // Back-sync in background without holding UI
                      for (const t of parsedLocal) {
                        const syncedTrade = { ...t, userId: user.uid };
                        setDoc(doc(db, 'users', user.uid, 'trades', t.id), sanitizeFirestoreData(syncedTrade)).catch(e => {
                          console.warn("Retrying/Silent save for trade sync failed:", e);
                        });
                      }
                    } else {
                      setTrades([]);
                      localStorage.setItem(`trading_journal_trades_${user.uid}`, JSON.stringify([]));
                      localStorage.setItem('trading_journal_trades', JSON.stringify([]));
                    }
                  } catch (err) {
                    setTrades([]);
                  }
                } else {
                  setTrades([]);
                }
              }
              setLoadingCloud(false);
              setAuthResolving(false);
            }, (err) => {
              console.warn("Firestore collection list permission restricted. Mode local actif.", err);
              loadLocalFallback(user.uid);
              setLoadingCloud(false);
              setAuthResolving(false);
            });

          } catch (e) {
            console.error("Échec d'alignement avec les serveurs cloud:", e);
            // Gracefully load local storage to avoid white screens
            loadLocalFallback(user.uid);
            setLoadingCloud(false);
            setAuthResolving(false);
          }
        } else {
          // Logged out: fallback to Local Storage data
          if (unsubscribeTrades) unsubscribeTrades();
          if (unsubscribeUser) unsubscribeUser();
          loadLocalFallback();
          setAuthResolving(false);
        }
      });

      return () => {
        authUnsubscribe();
        if (unsubscribeTrades) unsubscribeTrades();
        if (unsubscribeUser) unsubscribeUser();
      };
    } else {
      // Offline Local Fallback
      loadLocalFallback();
      setAuthResolving(false);
    }
  }, []);

  // NOWPayments URL Redirect parameter checker (for instant Premium status activation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const activeUserUid = activeUser?.uid || 'local';
      
      // Update in Local Storage immediately for local resilience
      localStorage.setItem(`trading_premium_local_${activeUserUid}`, 'true');
      setIsPremium(true);
      
      // Update in cloud Firestore in background if available
      if (isConfigured && db && activeUser && activeUser.uid !== 'local') {
        const userDocRef = doc(db, 'users', activeUser.uid);
        updateDoc(userDocRef, { isPremium: true }).catch(err => {
          console.warn("Échec d'actualisation de l'abonnement dans Firestore client-side:", err);
        });
      }
      
      alert("Félicitations ! Votre abonnement PropFlow Premium a été validé avec succès ! Profitez de tous vos outils de trading avancés.");
      // Clean query parameters so they don't re-trigger alert on page refreshes
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('payment') === 'cancel') {
      alert("Le paiement a été annulé par l'utilisateur.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [activeUser, isConfigured]);

  const loadLocalFallback = (userUid?: string) => {
    const keySuffix = userUid ? `_${userUid}` : '';
    
    const localCapital = localStorage.getItem(`trading_capital${keySuffix}`) || localStorage.getItem('trading_capital');
    const localCurrency = localStorage.getItem(`trading_currency${keySuffix}`) || localStorage.getItem('trading_currency');
    const localStoredTrades = localStorage.getItem(`trading_journal_trades${keySuffix}`) || localStorage.getItem('trading_journal_trades');
    const localAccounts = localStorage.getItem(`trading_accounts${keySuffix}`) || localStorage.getItem('trading_accounts');
    const localActiveAcc = localStorage.getItem(`trading_active_account_id${keySuffix}`) || localStorage.getItem('trading_active_account_id');

    if (localAccounts) {
      try {
        setAccounts(JSON.parse(localAccounts));
      } catch (_) {
        setAccounts([]);
      }
    } else {
      const defaultAccs: TradingAccount[] = [
        {
          id: "default-propfirm",
          name: "Compte Principal (PropFirm)",
          type: "PROPFIRM",
          firmOrBrokerName: "FTMO",
          startingBalance: 100000,
          currency: "USD",
          createdAt: new Date().toISOString()
        }
      ];
      setAccounts(defaultAccs);
      localStorage.setItem(`trading_accounts${keySuffix}`, JSON.stringify(defaultAccs));
    }

    if (localActiveAcc) {
      setActiveAccountId(localActiveAcc);
    } else {
      setActiveAccountId("default-propfirm");
    }

    if (localCapital) {
      setStartingBalance(parseFloat(localCapital));
    } else {
      setStartingBalance(100000);
    }

    if (localCurrency) {
      setCurrency(localCurrency);
    } else {
      setCurrency('USD');
    }

    if (localStoredTrades) {
      try {
        setTrades(JSON.parse(localStoredTrades));
      } catch (_) {
        setTrades([]);
      }
    } else {
      // Set default mocks so workspace looks instantly engaging!
      setTrades(DEFAULT_TRADES);
      localStorage.setItem(`trading_journal_trades${keySuffix}`, JSON.stringify(DEFAULT_TRADES));
    }

    const localPremiumVal = localStorage.getItem(`trading_premium_local_${userUid || 'local'}`) === 'true';
    setIsPremium(localPremiumVal);

    const trialStartedKey = `trading_trial_started_${userUid || 'local'}`;
    let trialStart = localStorage.getItem(trialStartedKey);
    if (!trialStart) {
      trialStart = new Date().toISOString();
      localStorage.setItem(trialStartedKey, trialStart);
    }
    setUserCreatedAt(trialStart);
  };

  // Write variables back when in Local Fallback context
  const saveLocalState = (updatedTrades: Trade[], cap: number, curr: string, accs?: TradingAccount[], activeAccId?: string) => {
    const keySuffix = currentUser ? `_${currentUser.uid}` : '';
    
    try {
      localStorage.setItem(`trading_journal_trades${keySuffix}`, JSON.stringify(updatedTrades));
      localStorage.setItem(`trading_capital${keySuffix}`, String(cap));
      localStorage.setItem(`trading_currency${keySuffix}`, curr);
      
      const accountsToSave = accs !== undefined ? accs : accounts;
      const activeIdToSave = activeAccId !== undefined ? activeAccId : activeAccountId;
      localStorage.setItem(`trading_accounts${keySuffix}`, JSON.stringify(accountsToSave));
      localStorage.setItem(`trading_active_account_id${keySuffix}`, activeIdToSave);

      // Also sync to general keys so it remains accessible as standard fallback
      localStorage.setItem('trading_journal_trades', JSON.stringify(updatedTrades));
      localStorage.setItem('trading_capital', String(cap));
      localStorage.setItem('trading_currency', curr);
      localStorage.setItem('trading_accounts', JSON.stringify(accountsToSave));
      localStorage.setItem('trading_active_account_id', activeIdToSave);
    } catch (e) {
      console.error("Erreur d'écriture localStorage:", e);
    }
  };

  const handleUpdateCapital = async (newVal: number) => {
    if (currentUser && isConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), sanitizeFirestoreData({ startingBalance: newVal }), { merge: true });
      } catch (err) {
        console.error("Échec de mise à jour du capital sur Firestore:", err);
      }
    } else {
      setStartingBalance(newVal);
      saveLocalState(trades, newVal, currency);
    }
  };

  const handleUpdateCurrency = async (newCurr: string) => {
    if (currentUser && isConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), sanitizeFirestoreData({ currency: newCurr }), { merge: true });
      } catch (err) {
        console.error("Échec de mise à jour de la devise sur Firestore:", err);
      }
    } else {
      setCurrency(newCurr);
      saveLocalState(trades, startingBalance, newCurr, accounts, activeAccountId);
    }
  };

  const handleUpdateLanguage = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('trading_language', newLang);
  };

  const handleSelectAccount = async (id: string) => {
    const selected = accounts.find(a => a.id === id);
    if (currentUser && isConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), sanitizeFirestoreData({ 
          activeAccountId: id,
          startingBalance: selected?.startingBalance || startingBalance,
          currency: selected?.currency || currency
        }), { merge: true });
      } catch (err) {
        console.error("Échec de sélection du compte sur Firestore:", err);
      }
    } else {
      setActiveAccountId(id);
      if (selected) {
        setStartingBalance(selected.startingBalance);
        setCurrency(selected.currency);
      }
      saveLocalState(trades, selected?.startingBalance || startingBalance, selected?.currency || currency, accounts, id);
    }
  };

  const handleAddAccount = async (
    name: string,
    type: 'PROPFIRM' | 'BROKER',
    firmOrBrokerName: string,
    startingBalanceVal: number,
    currencyVal: string,
    phase1TargetPercent?: number,
    phase2TargetPercent?: number,
    dailyDrawdownPercent?: number,
    maxDrawdownPercent?: number
  ) => {
    const newAcc: TradingAccount = {
      id: "account_" + Date.now().toString(),
      name,
      type,
      firmOrBrokerName,
      startingBalance: startingBalanceVal,
      currency: currencyVal,
      createdAt: new Date().toISOString(),
      phase1TargetPercent,
      phase2TargetPercent,
      dailyDrawdownPercent,
      maxDrawdownPercent
    };

    const updatedAccs = [...accounts, newAcc];

    if (currentUser && isConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), sanitizeFirestoreData({ 
          accounts: updatedAccs, 
          activeAccountId: newAcc.id,
          startingBalance: startingBalanceVal,
          currency: currencyVal
        }), { merge: true });
      } catch (err) {
        console.error("Échec d'ajout de compte sur Firestore:", err);
      }
    } else {
      setAccounts(updatedAccs);
      setActiveAccountId(newAcc.id);
      setStartingBalance(startingBalanceVal);
      setCurrency(currencyVal);
      saveLocalState(trades, startingBalanceVal, currencyVal, updatedAccs, newAcc.id);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (accounts.length <= 1) return;
    const updatedAccs = accounts.filter(a => a.id !== id);
    
    let newActiveId = activeAccountId;
    let newCapital = startingBalance;
    let newCurrVal = currency;
    
    if (activeAccountId === id) {
      const fallbackAcc = updatedAccs[0];
      newActiveId = fallbackAcc.id;
      newCapital = fallbackAcc.startingBalance;
      newCurrVal = fallbackAcc.currency;
    }

    const updatedTrades = trades.filter(t => t.accountId !== id);

    if (currentUser && isConfigured) {
      try {
        // 1. Delete associated trades from Firestore in background
        const collectionToRemove = trades.filter(t => t.accountId === id);
        for (const t of collectionToRemove) {
          await deleteDoc(doc(db, 'users', currentUser.uid, 'trades', t.id));
        }

        // 2. Update user profile document on Firestore
        await setDoc(doc(db, 'users', currentUser.uid), sanitizeFirestoreData({ 
          accounts: updatedAccs, 
          activeAccountId: newActiveId,
          startingBalance: newCapital,
          currency: newCurrVal
        }), { merge: true });
      } catch (err) {
        console.error("Échec de suppression du compte sur Firestore:", err);
      }
    } else {
      setAccounts(updatedAccs);
      setActiveAccountId(newActiveId);
      setStartingBalance(newCapital);
      setCurrency(newCurrVal);
      setTrades(updatedTrades);
      saveLocalState(updatedTrades, newCapital, newCurrVal, updatedAccs, newActiveId);
    }
  };

  // Actions Interface
  const handleAddNewTrade = async (newTradeData: Omit<Trade, 'id' | 'userId' | 'createdAt'>) => {
    const id = "trade_" + Date.now().toString();
    const trade: Trade = {
      ...newTradeData,
      id,
      userId: currentUser ? currentUser.uid : 'local',
      accountId: activeAccountId, // Bind trade specifically to selected account context
      createdAt: new Date().toISOString()
    };

    if (currentUser && isConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'trades', id), sanitizeFirestoreData(trade));
      } catch (err) {
        console.error("Échec d'ajout du trade sur Firestore:", err);
      }
    } else {
      const updated = [trade, ...trades];
      setTrades(updated);
      saveLocalState(updated, startingBalance, currency, accounts, activeAccountId);
    }
  };

  const handleUpdateTrade = async (id: string, updatedFields: Partial<Trade>) => {
    if (currentUser && isConfigured) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'trades', id), sanitizeFirestoreData(updatedFields), { merge: true });
      } catch (err) {
        console.error("Échec de mise à jour du trade sur Firestore:", err);
      }
    } else {
      const updated = trades.map(t => t.id === id ? { ...t, ...updatedFields } : t);
      setTrades(updated);
      saveLocalState(updated, startingBalance, currency);
    }
  };

  const handleDeleteTrade = async (id: string) => {
    if (currentUser && isConfigured) {
      try {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'trades', id));
      } catch (err) {
        console.error("Échec de suppression du trade sur Firestore:", err);
      }
    } else {
      const updated = trades.filter(t => t.id !== id);
      setTrades(updated);
      saveLocalState(updated, startingBalance, currency);
    }
  };

  // Restores decryped data
  const handleRestoreDecryptData = async (restoredTrades: Trade[], cap: number, curr: string) => {
    setTrades(restoredTrades);
    setStartingBalance(cap);
    setCurrency(curr);
    
    saveLocalState(restoredTrades, cap, curr);

    if (currentUser && isConfigured) {
      // Sync whole array recursively to Cloud database
      try {
        await setDoc(doc(db, 'users', currentUser.uid), sanitizeFirestoreData({ startingBalance: cap, currency: curr }), { merge: true });
        // Add all trades
        for (const t of restoredTrades) {
          const syncedTrade = { ...t, userId: currentUser.uid };
          await setDoc(doc(db, 'users', currentUser.uid, 'trades', t.id), sanitizeFirestoreData(syncedTrade));
        }
      } catch (e) {
        console.error("Échec d'exportation vers Firebase.", e);
      }
    }
  };

  // Maps opportunities to Journal Position
  const handleCopyOpportunity = (opp: MarketOpportunity) => {
    // Determine Entry Price & Stop, Take profit numbers from string
    const entryNum = parseFloat(opp.entryZone.replace(/[^\d.]/g, '')) || 100;
    const tpNum = parseFloat(opp.targetZone.replace(/[^\d.]/g, '')) || 110;
    const slNum = parseFloat(opp.stopZone.replace(/[^\d.]/g, '')) || 95;

    handleAddNewTrade({
      symbol: opp.symbol,
      direction: opp.direction,
      entryPrice: entryNum,
      quantity: 1, // default quantity
      stopLoss: slNum,
      takeProfit: tpNum,
      status: 'OPEN',
      setup: "AI Opportunity Idea",
      fees: 0,
      notes: `Opportunité suggérée par l'IA : ${opp.rationale}`,
      rating: 3
    });
  };

  // Google Login popup Action
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (e: any) {
      alert("Erreur d'authentification Cloud : " + e.message);
    }
  };

  // Sign out helper
  const handleSignOut = async () => {
    if (currentUser) {
      await logoutUser();
    }
    setDemoUser(null);
    localStorage.removeItem('trading_demo_user');
  };

  // Filter trades dependent on the active selected account
  const activeTrades = React.useMemo(() => {
    return trades.filter(t => t.accountId === activeAccountId || (!t.accountId && activeAccountId === 'default-propfirm'));
  }, [trades, activeAccountId]);

  const activeAccount = React.useMemo(() => {
    return accounts.find(a => a.id === activeAccountId);
  }, [accounts, activeAccountId]);

  if (authResolving) {
    return (
      <div className="min-h-screen bg-[#0A0B0D] text-slate-200 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-sky-500/20 border-t-sky-450 rounded-full animate-spin" />
          <p className="text-xs font-mono text-slate-400 tracking-wider">SECURE SHIELD LOADING...</p>
        </div>
      </div>
    );
  }

  if (!activeUser) {
    return (
      <FirebaseAuthentication 
        isOpen={true}
        onClose={() => {}} 
        language={language}
        isFullScreen={true}
        onAuthSuccess={(user) => {
          if (!isConfigured) {
            setDemoUser(user);
            localStorage.setItem('trading_demo_user', JSON.stringify(user));
          } else {
            setCurrentUser(user as any);
          }
        }}
      />
    );
  }

  // Garde-fou (middleware) vérifiant l'accès à chaque chargement/affichage de page
  const isTrialExpired = (() => {
    // Si l'utilisateur est Premium, il accède à l'intégralité du site sans restriction
    if (isPremium) return false;
    
    // Déterminer la date de création du compte (createdAt)
    let startMs = 0;
    if (userCreatedAt) {
      try {
        startMs = new Date(userCreatedAt).getTime();
      } catch (_) {}
    }
    
    // Secours local si la date de création distante est absente ou non encore chargée
    if (!startMs && activeUser) {
      const trialStartedKey = `trading_trial_started_${activeUser.uid}`;
      const localStart = localStorage.getItem(trialStartedKey);
      if (localStart) {
        try {
          startMs = new Date(localStart).getTime();
        } catch (_) {}
      } else {
        const nowStr = new Date().toISOString();
        localStorage.setItem(trialStartedKey, nowStr);
        startMs = Date.now();
      }
    }
    
    if (!startMs) return false;
    
    // Calculer la différence entre la date actuelle et la date d'inscription (createdAt)
    const trialDurationMs = 3 * 24 * 60 * 60 * 1000; // 3 jours (soit 72 heures)
    const elapsedMs = Date.now() - startMs;
    
    // Si plus de 72 heures se sont écoulées et qu'il n'a pas payé, on bloque l'accès
    return elapsedMs > trialDurationMs;
  })();

  // Middleware Redirection : si la période d'essai de 72h a expiré et qu'il n'a pas payé,
  // on bloque l'accès au tableau de bord et on le redirige vers l'interface de paiement unique.
  if (isTrialExpired) {
    return (
      <PremiumPage 
        userId={activeUser?.uid || 'local'}
        userEmail={activeUser?.email}
        createdAt={userCreatedAt}
        currency={currency}
        isExpired={true}
        onLogout={handleSignOut}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-slate-200 font-sans tracking-tight">
      
      {/* Top Horizontal Market & Prop Ticker */}
      <DataTicker language={language} trades={activeTrades} currency={currency} />
      
      {/* Top Main Navigation Bar */}
      <header className="border-b border-white/5 bg-[#07090E]/90 backdrop-blur sticky top-0 z-50 px-4 py-3 lg:px-8">
        {/* Laser glow indicator line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
        
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Slogan */}
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl p-2.5 shadow-[0_0_20px_rgba(14,165,233,0.3)]">
              <TrendingUp className="w-5 h-5 text-white stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-md font-extrabold tracking-tight text-white flex items-center gap-2">
                <span className="shimmer-text font-sans font-black uppercase text-sm tracking-wide">
                  {TRANSLATIONS[language].appName}
                </span>
                <span className="text-[9px] text-[#0ea5e9] font-bold bg-[#0ea5e9]/10 px-2 py-0.5 rounded border border-[#0ea5e9]/20 font-mono tracking-wider">
                  LIVE SYNC
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{TRANSLATIONS[language].authSlogan}</p>
            </div>
          </div>

          {/* Quick configs parameters and Sync state */}
          <div className="flex flex-wrap items-center gap-4">
            
            {/* NOWPayments Monetization Premium system */}
            {isPremium ? (
              <span 
                onClick={() => setActiveTab('PREMIUM')}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/5 border border-amber-500/30 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-wider text-amber-400 font-mono select-none shadow-[0_0_15px_rgba(245,158,11,0.15)] cursor-pointer hover:scale-[1.03] active:scale-[0.97] transition-all duration-300"
              >
                👑 PREMIUM
              </span>
            ) : (
              <button
                onClick={() => setActiveTab('PREMIUM')}
                className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500/20 via-yellow-500/25 to-amber-500/10 hover:from-amber-500/35 hover:to-yellow-500/35 border border-amber-500/35 hover:border-amber-400 px-3.5 py-1.5 rounded-xl text-[10px] font-black tracking-wider text-amber-300 hover:text-white transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.08)] cursor-pointer hover:scale-[1.03] active:scale-[0.97] animate-pulse"
                title="Devenir Premium (Monétisation PropFlow)"
              >
                👑 DEVENIR PREMIUM
              </button>
            )}
            
            {/* Language Selection Toggle */}
            <div className="flex items-center gap-1.5 bg-[#161B22] border border-white/5 px-2.5 py-1 rounded-lg">
              <Globe className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={language}
                onChange={(e) => handleUpdateLanguage(e.target.value as Language)}
                className="bg-transparent text-[10px] text-slate-200 font-bold font-mono outline-none cursor-pointer"
                title="Choisir la langue / Select language"
              >
                <option value="fr">FR 🇫🇷</option>
                <option value="en">EN 🇬🇧</option>
              </select>
            </div>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-1.5 bg-[#161B22] hover:bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold font-mono text-slate-200 transition-all cursor-pointer"
              title={theme === 'dark' ? TRANSLATIONS[language].themeToggleLight : TRANSLATIONS[language].themeToggleDark}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span className="hidden sm:inline">{TRANSLATIONS[language].themeToggleLight}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">{TRANSLATIONS[language].themeToggleDark}</span>
                </>
              )}
            </button>

            {/* Balance parameters */}
            <div className="flex items-center gap-1 bg-[#161B22] border border-white/5 px-3 py-1 rounded-lg">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[9px] text-slate-500 font-bold uppercase hidden sm:inline mr-1">{TRANSLATIONS[language].startingCapital} :</span>
              <input 
                type="number" 
                value={startingBalance}
                onChange={(e) => handleUpdateCapital(parseFloat(e.target.value) || 0)}
                className="w-16 bg-transparent text-xs text-slate-200 outline-none font-bold font-mono text-center"
                title={TRANSLATIONS[language].startingCapital}
              />
              <select
                value={currency}
                onChange={(e) => handleUpdateCurrency(e.target.value)}
                className="bg-transparent text-[10px] text-slate-400 font-bold font-mono outline-none border-l border-white/5 pl-1.5 cursor-pointer"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="BTC">BTC (₿)</option>
                <option value="USDT">USDT</option>
              </select>
            </div>

            {/* Firebase cloud or local simulated marker */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <span className="text-[10px] font-bold text-slate-200 block truncate max-w-[120px]">
                  {activeUser.displayName || activeUser.email}
                </span>
                <span className={`text-[9px] font-bold flex items-center gap-1 justify-end ${currentUser ? 'text-emerald-400' : 'text-amber-450'}`}>
                  <BadgeCheck className="w-3 h-3" />
                  <span>
                    {currentUser 
                      ? TRANSLATIONS[language].cloudSyncActive 
                      : (language === 'en' ? 'Simulated Offline Sync' : 'Espace Local Sécurisé')}
                  </span>
                </span>
              </div>
              <button 
                onClick={handleSignOut}
                className="bg-[#161B22] hover:bg-white/5 border border-white/5 text-slate-300 hover:text-slate-100 p-2 rounded-lg transition-colors cursor-pointer"
                title={TRANSLATIONS[language].signOut}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Primary Panels Layout */}
      <main className="max-w-7xl mx-auto px-4 py-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* Core Tab Nav Links (Vertical Sidebar on the left) */}
          <div className="w-full lg:w-64 shrink-0 bg-[#0E1116]/80 backdrop-blur rounded-2xl border border-white/5 p-3 shadow-xl relative overflow-hidden" id="tabs-main-wrapper">
            <div className="absolute top-0 left-0 w-32 h-32 bg-sky-500/5 rounded-full blur-[40px] pointer-events-none" />
            <nav className="flex flex-col gap-1.5 relative z-10" id="tabs-main-nav">
              {[
                { id: 'STATS', label: TRANSLATIONS[language].tabDashboard, icon: BarChart2, color: 'text-sky-400' },
                { id: 'JOURNAL', label: TRANSLATIONS[language].tabJournal, icon: BookOpen, color: 'text-emerald-400' },
                { id: 'ANALYSIS', label: TRANSLATIONS[language].tabAnalysis || "Archivage & Sessions", icon: Calendar, color: 'text-cyan-400' },
                { id: 'SALARY', label: TRANSLATIONS[language].tabSalary || "Revenus & Payouts", icon: Coins, color: 'text-rose-400' },
                { id: 'WORKSPACE', label: TRANSLATIONS[language].tabWorkspace, icon: Monitor, color: 'text-teal-400' },
                { id: 'CHARTS', label: TRANSLATIONS[language].tabCharts || 'Double Graphique', icon: Tv, color: 'text-pink-400' },
                { id: 'PREMIUM', label: '👑 Premium', icon: Crown, color: 'text-amber-400' }
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => { playHighTechClick(); setActiveTab(tab.id as any); }}
                    className={`flex items-center gap-3 px-4 py-3 text-xs font-bold font-sans tracking-wide rounded-xl transition-all cursor-pointer w-full text-left justify-start ${
                      isActive 
                        ? (tab.id === 'PREMIUM'
                          ? 'bg-gradient-to-r from-amber-500/15 to-yellow-500/2 border border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.12)]'
                          : 'bg-gradient-to-r from-sky-500/10 to-sky-500/2 border border-sky-500/20 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.08)]') 
                        : 'border border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/3'
                    }`}
                  >
                    <IconComp className={`w-4 h-4 shrink-0 ${isActive ? tab.color : 'text-slate-400'}`} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Dynamic Display components based on active tab state */}
          <div className="flex-1 w-full min-w-0 min-h-[480px]">
            {loadingCloud && (
              <div className="flex flex-col items-center justify-center py-24 space-y-3">
                <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
                <p className="text-xs text-slate-400 font-medium">{TRANSLATIONS[language].syncProgress}</p>
              </div>
            )}

            {!loadingCloud && activeTab === 'STATS' && (
              <div className="space-y-6">
                <AccountManager 
                  accounts={accounts}
                  activeAccountId={activeAccountId}
                  onSelectAccount={handleSelectAccount}
                  onAddAccount={handleAddAccount}
                  onDeleteAccount={handleDeleteAccount}
                  trades={trades}
                  language={language}
                />
                <StatsDashboard 
                  trades={activeTrades} 
                  startingBalance={startingBalance} 
                  currency={currency} 
                  language={language}
                  activeAccount={activeAccount}
                />
              </div>
            )}

            {!loadingCloud && activeTab === 'JOURNAL' && (
              <div className="space-y-6">
                <AccountManager 
                  accounts={accounts}
                  activeAccountId={activeAccountId}
                  onSelectAccount={handleSelectAccount}
                  onAddAccount={handleAddAccount}
                  onDeleteAccount={handleDeleteAccount}
                  trades={trades}
                  language={language}
                />
                <TradeJournal 
                  trades={activeTrades}
                  onAddTrade={handleAddNewTrade}
                  onUpdateTrade={handleUpdateTrade}
                  onDeleteTrade={handleDeleteTrade}
                  currency={currency}
                  language={language}
                />
              </div>
            )}

            {!loadingCloud && activeTab === 'ANALYSIS' && (
              <div className="w-full">
                <SessionAnalysisPage 
                  userId={activeUser?.uid || 'local'}
                  language={language}
                />
              </div>
            )}

            {!loadingCloud && activeTab === 'WORKSPACE' && (
              <WorkspaceLinks language={language} />
            )}

            {!loadingCloud && activeTab === 'SALARY' && (
              <SalaryDashboard 
                trades={activeTrades} 
                language={language} 
                currency={currency} 
              />
            )}

            {!loadingCloud && activeTab === 'CHARTS' && (
              <TradingViewCharts 
                language={language} 
                isPremium={isPremium} 
                onUpgradeClick={() => setActiveTab('PREMIUM')}
              />
            )}

            {!loadingCloud && activeTab === 'PREMIUM' && (
              <PremiumPage 
                userId={activeUser?.uid || 'local'}
                userEmail={activeUser?.email}
                createdAt={userCreatedAt}
                currency={currency}
                isExpired={false}
              />
            )}
          </div>
        </div>

      </main>

      {/* Simple Footer */}
      <footer className="border-t border-white/5 bg-[#0F1115] py-8 mt-12 text-center text-[11px] text-slate-400">
        <p>{TRANSLATIONS[language].footerCopyright}</p>
        <p className="mt-1 text-slate-500">{TRANSLATIONS[language].footerDisclaimer}</p>
      </footer>

      {/* Authentication System Modal */}
      <FirebaseAuthentication 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        language={language}
      />

    </div>
  );
}
