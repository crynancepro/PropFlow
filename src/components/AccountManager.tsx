import React, { useState } from 'react';
import { TradingAccount, Trade } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { Briefcase, CreditCard, Plus, Trash2, CheckCircle2, DollarSign, HelpCircle, Shield, Globe, AlertTriangle, X } from 'lucide-react';

interface AccountManagerProps {
  accounts: TradingAccount[];
  activeAccountId: string;
  onSelectAccount: (id: string) => void;
  onAddAccount: (
    name: string,
    type: 'PROPFIRM' | 'BROKER',
    firmOrBrokerName: string,
    startingBalance: number,
    currency: string,
    phase1TargetPercent?: number,
    phase2TargetPercent?: number,
    dailyDrawdownPercent?: number,
    maxDrawdownPercent?: number
  ) => void;
  onDeleteAccount: (id: string) => void;
  trades: Trade[];
  language?: Language;
}

export default function AccountManager({
  accounts,
  activeAccountId,
  onSelectAccount,
  onAddAccount,
  onDeleteAccount,
  trades,
  language = 'fr'
}: AccountManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [deletingAccountId, setDeletingAccountId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<'PROPFIRM' | 'BROKER'>('PROPFIRM');
  const [firmOrBrokerName, setFirmOrBrokerName] = useState('');
  const [startingBalance, setStartingBalance] = useState('50000');
  const [currency, setCurrency] = useState('USD');
  const [phase1TargetPercent, setPhase1TargetPercent] = useState('8');
  const [phase2TargetPercent, setPhase2TargetPercent] = useState('5');
  const [dailyDrawdownPercent, setDailyDrawdownPercent] = useState('5');
  const [maxDrawdownPercent, setMaxDrawdownPercent] = useState('10');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !firmOrBrokerName || !startingBalance) return;

    onAddAccount(
      name,
      type,
      firmOrBrokerName,
      parseFloat(startingBalance) || 10000,
      currency,
      parseFloat(phase1TargetPercent) || 8,
      parseFloat(phase2TargetPercent) || 5,
      parseFloat(dailyDrawdownPercent) || 5,
      parseFloat(maxDrawdownPercent) || 10
    );

    // Reset Form
    setName('');
    setFirmOrBrokerName('');
    setStartingBalance('50000');
    setPhase1TargetPercent('8');
    setPhase2TargetPercent('5');
    setDailyDrawdownPercent('5');
    setMaxDrawdownPercent('10');
    setShowForm(false);
  };

  // Helper to calculate total balance for an account
  const calculateAccountBalance = (account: TradingAccount) => {
    const accId = account.id;
    // Multiplied by closed trades in this account
    const accTrades = trades.filter(t => t.accountId === accId || (!t.accountId && accId === 'default-propfirm'));
    const closedPnL = accTrades
      .filter(t => t.status === 'CLOSED')
      .reduce((sum, t) => sum + (t.pnl || 0), 0);
    return account.startingBalance + closedPnL;
  };

  // Helper to count active open trades
  const getOpenTradesCount = (accountId: string) => {
    return trades.filter(t => 
      (t.accountId === accountId || (!t.accountId && accountId === 'default-propfirm')) && 
      t.status === 'OPEN'
    ).length;
  };

  const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];
  const activeBalance = activeAccount ? calculateAccountBalance(activeAccount) : 0;
  const activePnl = activeAccount ? (activeBalance - activeAccount.startingBalance) : 0;
  const activeIsPositive = activePnl >= 0;
  const activeOpenCount = activeAccount ? getOpenTradesCount(activeAccount.id) : 0;

  return (
    <div className="space-y-3" id="account-manager-bar-wrapper">
      {/* Sleek Compact Horizontal Control Bar */}
      <div className="bg-[#10141B] border border-white/5 rounded-xl px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md" id="account-manager-bar">
        
        {/* Left Side: Custom dropdown selection & active stats summary */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          
          <div className="hidden sm:flex p-1.5 bg-sky-500/10 rounded-lg text-sky-400">
            <Briefcase className="w-4 h-4" />
          </div>

          {/* Styled Select Dropdown */}
          <div className="relative">
            <select
              value={activeAccountId}
              onChange={(e) => onSelectAccount(e.target.value)}
              className="bg-[#0A0B0D] hover:bg-[#161B22] border border-white/10 rounded-lg pl-3 pr-8 py-1.5 text-xs font-bold text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer transition-all appearance-none font-sans min-w-[180px] sm:min-w-[220px]"
              title={language === 'en' ? 'Select Active Account' : 'Choisir le compte actif'}
            >
              {accounts.map((acc) => {
                const bal = calculateAccountBalance(acc);
                const typeLabel = acc.type === 'PROPFIRM' ? 'PROP' : 'REAL';
                return (
                  <option key={acc.id} value={acc.id} className="bg-[#0A0B0D] text-slate-200 text-xs">
                    [{typeLabel}] {acc.name} — {bal.toLocaleString(undefined, { maximumFractionDigits: 0 })} {acc.currency}
                  </option>
                );
              })}
            </select>
            <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-slate-500">
              <span className="text-[9px]">▼</span>
            </div>
          </div>

          {/* Delete active account button (using existing confirmation logic) */}
          <button
            type="button"
            onClick={() => setDeletingAccountId(activeAccountId)}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 border border-rose-500/20 transition-all cursor-pointer"
            title={language === 'en' ? 'Delete active account' : 'Supprimer ce compte'}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Active Account summary metrics inline */}
          {activeAccount && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs border-l border-white/5 pl-3 font-mono">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Solde:</span>
                <span className="text-slate-100 font-extrabold text-[12px]">
                  {activeBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {activeAccount.currency}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Rétro-PnL:</span>
                <span className={`font-black ${activePnl === 0 ? 'text-slate-400' : activeIsPositive ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                  {activePnl > 0 ? '+' : ''}{activePnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {activeAccount.currency}
                </span>
              </div>

              {/* Deposit details visible in larger screens */}
              <div className="hidden lg:flex items-center gap-3 text-[10px] text-slate-500 border-l border-white/5 pl-3">
                <span>Dépôt: {activeAccount.startingBalance.toLocaleString()} {activeAccount.currency}</span>
                {activeAccount.type === 'PROPFIRM' && (
                  <>
                    {activeAccount.phase1TargetPercent && <span>Obj P1: {activeAccount.phase1TargetPercent}%</span>}
                    {activeAccount.phase2TargetPercent && <span>Obj P2: {activeAccount.phase2TargetPercent}%</span>}
                  </>
                )}
                {activeOpenCount > 0 ? (
                  <span className="text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded font-bold">{activeOpenCount} {language === 'en' ? 'open' : 'ouvert(s)'}</span>
                ) : (
                  <span className="text-slate-600">{language === 'en' ? 'No active trades' : 'Aucun trade actif'}</span>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Quick Action adding new accounts */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-sky-500/10 hover:bg-sky-500 text-sky-400 hover:text-white border border-sky-500/20 font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-sm shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{language === 'en' ? 'Add Account' : 'Ajouter un compte'}</span>
          </button>
        </div>

      </div>

      {/* New account registration Modal form (Absolute Pop-up) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg bg-[#10141B] border border-white/5 p-6 rounded-2xl shadow-2xl space-y-4 animate-scaleUp relative overflow-hidden">
            <button 
              type="button" 
              onClick={() => setShowForm(false)} 
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-100 cursor-pointer border border-white/5 p-1 rounded bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-[45px] pointer-events-none" />
            
            <div className="border-b border-white/5 pb-3">
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-sky-400" />
                {language === 'en' ? 'Add a New Trading Account' : 'Ajouter un nouveau compte de trading'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1 leading-normal">
                {language === 'en'
                  ? 'Create an isolated database container for a new Evaluation Challenge or Broker account.'
                  : 'Créez un espace de stockage étanche pour un nouveau challenge d\'évaluation ou compte Broker.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">{TRANSLATIONS[language].accountName}</label>
                  <input
                    type="text"
                    placeholder={language === 'en' ? "e.g. FTMO Challenge 100K" : "Ex: FTMO Challenge 100K"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">{TRANSLATIONS[language].accountType}</label>
                  <div className="grid grid-cols-2 gap-2 bg-[#0A0B0D] p-1 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => setType('PROPFIRM')}
                      className={`py-1 rounded-md text-xs font-bold transition-all ${type === 'PROPFIRM' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:bg-[#161B22]'}`}
                    >
                      PropFirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('BROKER')}
                      className={`py-1 rounded-md text-xs font-bold transition-all ${type === 'BROKER' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:bg-[#161B22]'}`}
                    >
                      Broker
                    </button>
                  </div>
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">{TRANSLATIONS[language].brokerName}</label>
                  <input
                    type="text"
                    placeholder={language === 'en' ? "e.g. FTMO, Apex, IC Markets..." : "Ex: FTMO, Apex, IC Markets..."}
                    value={firmOrBrokerName}
                    onChange={(e) => setFirmOrBrokerName(e.target.value)}
                    required
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-xs text-slate-400 font-semibold mb-1">{TRANSLATIONS[language].startingBalanceLabel}</label>
                  <input
                    type="number"
                    placeholder="10000"
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(e.target.value)}
                    required
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex flex-col sm:col-span-2">
                  <label className="text-xs text-slate-400 font-semibold mb-1">{language === 'en' ? 'Balance Currency' : 'Devise du solde'}</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 focus:outline-none cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="BTC">BTC (₿)</option>
                    <option value="USDT">USDT</option>
                  </select>
                </div>

              </div>

              {type === 'PROPFIRM' && (
                <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wide">⚙️ Paramètres de Challenge d'Évaluation</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <label className="text-[10px] text-slate-400 font-semibold mb-1">
                        {language === 'en' ? 'Phase 1 Target (%)' : 'Objectif Phase 1 (%)'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="8"
                        value={phase1TargetPercent}
                        onChange={(e) => setPhase1TargetPercent(e.target.value)}
                        className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[10px] text-slate-400 font-semibold mb-1">
                        {language === 'en' ? 'Phase 2 Target (%)' : 'Objectif Phase 2 (%)'}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="5"
                        value={phase2TargetPercent}
                        onChange={(e) => setPhase2TargetPercent(e.target.value)}
                        className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[10px] text-slate-400 font-semibold mb-1">
                        Daily Drawdown Max (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="5"
                        value={dailyDrawdownPercent}
                        onChange={(e) => setDailyDrawdownPercent(e.target.value)}
                        className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[10px] text-slate-400 font-semibold mb-1">
                        Max Drawdown Total (%)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="10"
                        value={maxDrawdownPercent}
                        onChange={(e) => setMaxDrawdownPercent(e.target.value)}
                        className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="bg-transparent border border-white/5 hover:bg-white/5 text-slate-400 text-xs font-bold px-4 py-2 rounded-lg cursor-pointer"
                >
                  {TRANSLATIONS[language].cancel}
                </button>
                <button
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs px-5 py-2 rounded-lg cursor-pointer transition-colors shadow-md"
                >
                  {language === 'en' ? 'Register Account' : 'Enregistrer le compte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* App account delete custom confirmation modal */}
      {deletingAccountId && (() => {
        const accToDelete = accounts.find(a => a.id === deletingAccountId);
        if (!accToDelete) return null;
        
        const isLastAccount = accounts.length <= 1;

        return (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[10000] flex items-center justify-center p-4 animate-fadeIn">
            <div 
              className="w-full max-w-md bg-[#161B22] border border-rose-500/20 p-6 rounded-2xl shadow-2xl space-y-5 animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              {isLastAccount ? (
                <>
                  <div className="flex items-center gap-3 text-amber-500 border-b border-white/5 pb-3">
                    <AlertTriangle className="w-5 h-5 animate-bounce-short" />
                    <h4 className="text-sm font-black uppercase tracking-wider font-mono">
                      Action Impossible
                    </h4>
                  </div>
                  
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Votre journal de trading nécessite au moins un compte actif (PropFirm ou Broker) pour fonctionner.
                  </p>
                  
                  <p className="text-xs text-slate-400 leading-relaxed bg-[#0A0B0D] p-3 rounded-lg border border-white/5">
                    Veuillez d'abord créer un autre compte de trading ("Nouveau Compte") avant de pouvoir supprimer celui-ci (<span className="text-slate-200 font-semibold">{accToDelete.name}</span>).
                  </p>

                  <div className="flex justify-end pt-2">
                    <button 
                      type="button" 
                      onClick={() => setDeletingAccountId(null)}
                      className="bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold px-5 py-2.5 rounded-lg cursor-pointer transition-colors shadow-lg"
                    >
                      D'accord, j'ai compris
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 text-rose-500 border-b border-white/5 pb-3">
                    <Trash2 className="w-5 h-5 text-rose-500" />
                    <h4 className="text-sm font-black uppercase tracking-wider font-mono">
                      Supprimer le compte
                    </h4>
                  </div>
                  
                  <div className="space-y-3">
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Voulez-vous vraiment supprimer le compte de trading : <br />
                      <span className="text-slate-100 font-bold font-mono text-sm block mt-1 bg-[#0A0B0D] p-2.5 rounded border border-white/5">{accToDelete.name}</span>
                    </p>
                    
                    <p className="text-xs text-rose-400 bg-rose-500/5 p-3 rounded-lg border border-rose-500/10 leading-normal">
                      ⚠️ <strong>ATTENTION :</strong> Cette action supprimera définitivement ce compte ainsi que <strong>l'intégralité des positions financières (trades)</strong> qui lui sont associées dans votre journal. Cette opération est totalement irréversible.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-white/5">
                    <button 
                      type="button" 
                      onClick={() => setDeletingAccountId(null)}
                      className="bg-transparent border border-white/5 hover:bg-white/5 text-slate-300 text-xs px-4 py-2.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Annuler
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        onDeleteAccount(accToDelete.id);
                        setDeletingAccountId(null);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg cursor-pointer transition-all shadow-lg hover:shadow-rose-600/15"
                    >
                      Oui, supprimer définitivement
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
