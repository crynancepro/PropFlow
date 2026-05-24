import React, { useState } from 'react';
import { Trade } from '../types';
import { Shield, Lock, Unlock, Download, Upload, Cpu, FolderKey, FileCheck, RefreshCw, Layers } from 'lucide-react';

interface BackupSecurityProps {
  trades: Trade[];
  startingBalance: number;
  currency: string;
  isCloudSynced: boolean;
  onRestoreData: (restoredTrades: Trade[], startingBalance: number, currency: string) => void;
}

export default function BackupSecurity({ trades, startingBalance, currency, isCloudSynced, onRestoreData }: BackupSecurityProps) {
  const [passphrase, setPassphrase] = useState('');
  const [encryptedOutput, setEncryptedOutput] = useState<string | null>(null);
  const [decryptionInput, setDecryptionInput] = useState('');
  const [decryptPassphrase, setDecryptPassphrase] = useState('');
  const [decryptedResult, setDecryptedResult] = useState<any | null>(null);
  
  const [loadingEncrypt, setLoadingEncrypt] = useState(false);
  const [loadingDecrypt, setLoadingDecrypt] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [decryptErrorText, setDecryptErrorText] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleEncryptBackup = async () => {
    if (!passphrase) {
      setErrorText("Veuillez saisir une phrase de passe secrète.");
      return;
    }
    setLoadingEncrypt(true);
    setErrorText(null);
    setEncryptedOutput(null);

    const payload = {
      trades,
      startingBalance,
      currency,
      exportedAt: new Date().toISOString(),
      agent: "TradingJournalSecuredV2"
    };

    try {
      const resp = await fetch("/api/backup/encrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataPayload: JSON.stringify(payload),
          passphrase
        })
      });

      if (!resp.ok) {
        throw new Error("Échec du chiffrement sur notre serveur privé.");
      }

      const res = await resp.json();
      if (res.success) {
        // We package the output with the IV is crucial for decryption!
        const packedObject = {
          iv: res.iv,
          data: res.encryptedData
        };
        setEncryptedOutput(JSON.stringify(packedObject, null, 2));
        setSuccessMsg("Sauvegarde cryptée et compilée avec succès !");
        setErrorText(null);
      }
    } catch (err: any) {
      setErrorText(err.message || "Erreur de chiffrement.");
    } finally {
      setLoadingEncrypt(false);
    }
  };

  const handleDecryptBackup = async () => {
    if (!decryptionInput || !decryptPassphrase) {
      setDecryptErrorText("Données ou phrase de passe de décodage non fournies.");
      return;
    }
    setLoadingDecrypt(true);
    setDecryptErrorText(null);
    setDecryptedResult(null);

    try {
      // Parse packed input
      const parsedInput = JSON.parse(decryptionInput);
      if (!parsedInput.iv || !parsedInput.data) {
        throw new Error("Format de paquet de sauvegarde invalide (iv/data absents).");
      }

      const resp = await fetch("/api/backup/decrypt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          encryptedData: parsedInput.data,
          iv: parsedInput.iv,
          passphrase: decryptPassphrase
        })
      });

      if (!resp.ok) {
        throw new Error("Clé erronée ou paquet de données corrompu.");
      }

      const res = await resp.json();
      if (res.success) {
        const decompiledPayload = typeof res.decryptedData === 'string' 
          ? JSON.parse(res.decryptedData) 
          : res.decryptedData;

        setDecryptedResult(decompiledPayload);
        setDecryptErrorText(null);
      }
    } catch (err: any) {
      setDecryptErrorText(err.message || "Échec d'analyse de la sauvegarde.");
    } finally {
      setLoadingDecrypt(false);
    }
  };

  const handleApplyDecryptedBackup = () => {
    if (!decryptedResult) return;
    try {
      if (Array.isArray(decryptedResult.trades)) {
        onRestoreData(
          decryptedResult.trades,
          decryptedResult.startingBalance || 10000,
          decryptedResult.currency || 'USD'
        );
        alert("Sauvegarde décryptée restaurée avec succès ! Vos données ont été synchronisées.");
        setDecryptedResult(null);
        setDecryptionInput('');
        setDecryptPassphrase('');
      } else {
        alert("Le paquet décrypté n'est pas un journal valide.");
      }
    } catch (e: any) {
      alert("Erreur d'importation : " + e.message);
    }
  };

  const handleDownloadFile = () => {
    if (!encryptedOutput) return;
    const element = document.createElement("a");
    const file = new Blob([encryptedOutput], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `journal_sauvegarde_cryptee_${new Date().toISOString().slice(0, 10)}.trade`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      
      {/* Cloud status card & Privé */}
      <div className="bg-[#161B22] border border-white/5 p-5 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        
        <div className="col-span-1 border-r border-white/5 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-sky-400" />
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Confidentialité Totale</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed mb-1">
            Chiffrement intégral AES-256 en banque de données locale et privée. Aucun de vos setups financiers n'est enregistré en clair sur des serveurs tiers.
          </p>
          <div className="flex items-center gap-1.5 text-[9px] text-sky-450 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/15 w-fit mt-3">
            <Cpu className="w-3.5 h-3.5" />
            <span>Serveurs Cloud Privés Actifs</span>
          </div>
        </div>

        {/* Sync panel */}
        <div className="col-span-2 space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">État de Synchronisation Multi-Appareils</h4>
          <div className="flex items-center gap-3.5 bg-[#0A0B0D] p-3.5 rounded-lg border border-white/5">
            <div className={`w-3 h-3 rounded-full animate-pulse ${isCloudSynced ? 'bg-emerald-500' : 'bg-slate-600'}`} />
            <div className="text-xs">
              <span className="font-bold text-slate-200 block mb-0.5">
                {isCloudSynced ? "Mode Cloud Connecté (Synchronisé)" : "Mode Local Isolé"}
              </span>
              <span className="text-slate-400">
                {isCloudSynced 
                  ? "Vos performances s'actualisent en direct sur tous vos navigateurs et téléphones mobiles associés." 
                  : "Le cloud n'est pas actif. Configurez Firebase dans l'onglet d'en-tête pour débloquer la synchronisation."}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Backup and restore grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Encryption Segment */}
        <div className="bg-[#161B22] border border-white/5 p-5 rounded-xl space-y-4" id="export-encrypted-backup font-sans">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Lock className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Créer un export chiffré</span>
          </div>
          <p className="text-xs text-slate-400">
            Saisissez une clé de décryptage personnelle. Vos trades et configurations de capital initial seront compilés dans un document chiffré hexadécimal sécurisé infalsifiable.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Phrase de passe secrète</label>
            <input 
              type="password"
              placeholder="Évitez les mots de passe simples (ex: 1234)"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            onClick={handleEncryptBackup}
            disabled={loadingEncrypt}
            className="w-full bg-[#0A0B0D] border border-white/5 hover:border-slate-800 text-slate-200 hover:text-slate-100 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <FolderKey className="w-4 h-4 text-sky-400" />
            {loadingEncrypt ? "Chiffrement en cours..." : "Compiler la sauvegarde cryptée"}
          </button>

          {successMsg && <p className="text-emerald-400 text-xs font-semibold">{successMsg}</p>}
          {errorText && <p className="text-rose-400 text-xs font-semibold">{errorText}</p>}

          {encryptedOutput && (
            <div className="space-y-3">
              <label className="text-xs text-slate-400 block font-semibold">Fichier de cryptogramme prêt :</label>
              <textarea 
                rows={3} 
                readOnly 
                value={encryptedOutput}
                className="w-full bg-[#0A0B0D] text-[10px] font-mono p-2.5 rounded border border-white/5 text-slate-450"
              />
              <button
                onClick={handleDownloadFile}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4" />
                Télécharger .trade Chiffré (.trade)
              </button>
            </div>
          )}
        </div>

        {/* Decryption restoring Segment */}
        <div className="bg-[#161B22] border border-white/5 p-5 rounded-xl space-y-4" id="import-decrypted-backup">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Unlock className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">Restaurer un export chiffré</span>
          </div>
          <p className="text-xs text-slate-400">
            Collez le cryptogramme issu de votre fichier de sauvegarde .trade téléchargé précédement (contenant l'objet iv et data) et renseignez votre phrase de passe d'origine.
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Objet de sauvegarde crypté (JSON)</label>
            <textarea 
              rows={3}
              placeholder='Ex: { "iv": "...", "data": "..." }'
              value={decryptionInput}
              onChange={(e) => setDecryptionInput(e.target.value)}
              className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Phrase de passe d'origine</label>
            <input 
              type="password"
              placeholder="Exatamente celle utilisée lors du cryptage"
              value={decryptPassphrase}
              onChange={(e) => setDecryptPassphrase(e.target.value)}
              className="bg-[#0A0B0D] border border-white/5 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            onClick={handleDecryptBackup}
            disabled={loadingDecrypt}
            className="w-full bg-[#0A0B0D] border border-white/5 hover:border-slate-800 text-slate-200 hover:text-slate-100 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-sky-450 ${loadingDecrypt ? 'animate-spin' : ''}`} />
            {loadingDecrypt ? "Décryptage..." : "Déchiffrer la sauvegarde"}
          </button>

          {decryptErrorText && <p className="text-rose-450 text-xs font-semibold">{decryptErrorText}</p>}

          {decryptedResult && (
            <div className="p-4 bg-sky-950/20 border border-sky-500/20 rounded-lg space-y-3">
              <div className="flex items-center gap-1.5 text-sky-400 text-xs font-bold">
                <FileCheck className="w-4 h-4" />
                <span>Restauration Prête !</span>
              </div>
              <ul className="text-[11px] text-slate-400 space-y-1 font-medium select-none">
                <li>• Trades scannés : {decryptedResult.trades?.length || 0}</li>
                <li>• Capital d'origine déclaré : {decryptedResult.startingBalance} {decryptedResult.currency}</li>
                <li>• Date d'export : {new Date(decryptedResult.exportedAt).toLocaleDateString()}</li>
              </ul>
              <button
                type="button"
                onClick={handleApplyDecryptedBackup}
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs py-2 rounded-lg cursor-pointer transition-all"
              >
                Injecter et écraser mon journal actif
              </button>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
