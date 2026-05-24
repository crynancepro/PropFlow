import React, { useState } from 'react';
import { TradingAccount, Trade } from '../types';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { Briefcase, CreditCard, Plus, Trash2, CheckCircle2, DollarSign, HelpCircle, Shield, Globe, AlertTriangle, X } from 'lucide-react';

interface AccountManagerProps {
  accounts: TradingAccount[];
  activeAccountId: string;
  onSelectAccount: (id: string) => void;
  onAddAccount: (name: string, type: 'PROPFIRM' | 'BROKER', firmOrBrokerName: string, startingBalance: number, currency: string) => void;
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !firmOrBrokerName || !startingBalance) return;

    onAddAccount(
      name,
      type,
      firmOrBrokerName,
      parseFloat(startingBalance) || 10000,
      currency
    );

    // Reset Form
    setName('');
    setFirmOrBrokerName('');
    setStartingBalance('50000');
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-sky-400" />
            <span>{language === 'en' ? 'Manage Trading Accounts (PropFirms & Brokers)' : 'Gestion de vos Comptes (PropFirms & Brokers)'}</span>
          </h3>
          <p className="text-xs text-slate-400 leading-normal">
            {language === 'en' 
              ? "Switch between your evaluation challenges (FTMO, FundedNext) and real broker accounts. Each maintains its own isolated database."
              : "Basculez entre vos challenge d'évaluation (FTMO, FundedNext) et vos comptes broker réels. Chacun maintient son propre historique étanche."}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{TRANSLATIONS[language].addAccount}</span>
        </button>
      </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gradient-to-b from-[#161B22] to-[#0E1116] border border-white/5 p-6 rounded-2xl space-y-4 animate-fadeIn shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-[45px] pointer-events-none" />
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-100 border-b border-white/5 pb-2 relative z-10">
              {language === 'en' ? 'Add a New Trading Account' : 'Ajouter un nouveau compte de trading'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            
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

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

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

            <div className="flex flex-col">
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

          <div className="flex justify-end gap-2 pt-2">
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
              {language === 'en' ? 'Register Trading Account' : 'Enregistrer le compte de trading'}
            </button>
          </div>
        </form>
      )}

      {/* Grid listing the accounts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {accounts.map((acc) => {
          const isActive = acc.id === activeAccountId;
          const liveBalance = calculateAccountBalance(acc);
          const openCount = getOpenTradesCount(acc.id);
          const pnlSinceStart = liveBalance - acc.startingBalance;
          const isPositive = pnlSinceStart >= 0;

          return (
            <div
              key={acc.id}
              onClick={() => onSelectAccount(acc.id)}
              className={`p-5 rounded-2xl border relative cursor-pointer select-none transition-all duration-300 hover:translate-y-[-2px] ${
                isActive
                  ? 'bg-gradient-to-br from-sky-500/15 to-[#0E1116] border-sky-500 shadow-[0_4px_20px_rgba(14,165,233,0.1)]'
                  : 'bg-gradient-to-b from-[#161B22] to-[#0E1116] border-white/5 hover:border-slate-700/60 hover:shadow-lg'
              }`}
            >
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                {isActive && (
                  <div className="flex items-center gap-1 bg-sky-500/15 text-sky-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-sky-500/30 uppercase">
                    <CheckCircle2 className="w-3 h-3 text-sky-400" />
                    <span>Actif</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingAccountId(acc.id);
                  }}
                  className="p-1 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-slate-950 transition-all cursor-pointer border border-rose-500/20"
                  title="Supprimer ce compte de trading"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className={`p-1.5 rounded-lg text-xs font-extrabold ${acc.type === 'PROPFIRM' ? 'bg-amber-500/15 text-amber-500' : 'bg-pink-500/15 text-pink-500'}`}>
                  {acc.type === 'PROPFIRM' ? 'PROP' : 'BROKER'}
                </span>
                <span className="text-[10px] text-slate-500 font-bold tracking-wide italic">{acc.firmOrBrokerName}</span>
              </div>

              <h4 className="text-xs font-bold text-slate-200 truncate leading-tight mb-1 pr-24">{acc.name}</h4>

              <div className="mt-3 flex items-baseline justify-between border-t border-white/5 pt-2">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase font-semibold">Solde virtuel</span>
                  <div className="text-sm font-black text-slate-100 font-mono mt-0.5">
                    {liveBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {acc.currency}
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-[9px] text-slate-500 uppercase font-semibold block mb-0.5">Rétro-pnl</span>
                  <span className={`text-[11px] font-bold font-mono ${pnlSinceStart === 0 ? 'text-slate-400' : isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                     {pnlSinceStart > 0 ? '+' : ''}
                    {pnlSinceStart.toLocaleString(undefined, { maximumFractionDigits: 2 })} {acc.currency}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-white/5 border-dashed">
                <span>Dépôt: {acc.startingBalance.toLocaleString()} {acc.currency}</span>
                {openCount > 0 ? (
                  <span className="text-sky-400 bg-sky-500/10 px-1.5 rounded-full font-bold">{openCount} ouverts</span>
                ) : (
                  <span>Aucun actif</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

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
