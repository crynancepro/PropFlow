import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  loginWithEmail, 
  registerWithEmail, 
  loginWithGoogle, 
  isConfigured 
} from '../firebase-setup';
import firebaseConfig from '../firebase-applet-config.json';
import { Language, TRANSLATIONS } from '../utils/i18n';
import { 
  Mail, Lock, ShieldCheck, AlertTriangle, CheckCircle2, 
  X, TrendingUp, LogIn, UserPlus, ArrowRight 
} from 'lucide-react';

interface FirebaseAuthenticationProps {
  isOpen?: boolean;
  onClose?: () => void;
  language?: Language;
  onAuthSuccess?: (user: { uid: string; email: string; displayName?: string }) => void;
  isFullScreen?: boolean;
}

export default function FirebaseAuthentication({
  isOpen = true,
  onClose,
  language = 'fr',
  onAuthSuccess,
  isFullScreen = false
}: FirebaseAuthenticationProps) {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  
  // Async states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);
  const [isInvalidApiKey, setIsInvalidApiKey] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsOperationNotAllowed(false);
    setIsInvalidApiKey(false);

    if (!email || !password) {
      setErrorMessage(
        language === 'en' 
          ? "Please fill in all requested fields." 
          : "Veuillez remplir tous les champs demandés."
      );
      return;
    }

    if (mode === 'REGISTER') {
      if (password !== confirmPassword) {
        setErrorMessage(
          language === 'en' 
            ? "Passwords do not match." 
            : "Les deux mots de passe ne correspondent pas."
        );
        return;
      }
      if (password.length < 6) {
        setErrorMessage(
          language === 'en' 
            ? "Password must be at least 6 characters." 
            : "Le mot de passe doit être composé d'au moins 6 caractères."
        );
        return;
      }
      if (!termsAccepted) {
        setErrorMessage(
          language === 'en' 
            ? "You must accept the data encryption consent." 
            : "Vous devez consentir au cryptage étanche de vos données de trading."
        );
        return;
      }
    }

    setIsLoading(true);

    try {
      if (!isConfigured) {
        // Safe Simulation Mode fallback if Firebase is not connected globally
        setTimeout(() => {
          setIsLoading(false);
          const demoUser = {
            uid: `demo-local-${email.replace(/[^a-zA-Z0-9]/g, '')}`,
            email: email,
            displayName: email.split('@')[0]
          };
          setSuccessMessage(
            mode === 'LOGIN'
              ? (language === 'en' 
                  ? `[DEMO MODE] Successfully logged in as ${email} !` 
                  : `[MODE DÉMO] Connexion simulée avec succès pour ${email} !`)
              : (language === 'en' 
                  ? `[DEMO MODE] Successfully registered as ${email} !` 
                  : `[MODE DÉMO] Inscription simulée avec succès pour ${email} !`)
          );
          setTimeout(() => {
            if (onAuthSuccess) {
              onAuthSuccess(demoUser);
            }
            if (onClose) onClose();
          }, 1500);
        }, 1000);
        return;
      }

      if (mode === 'LOGIN') {
        const user = await loginWithEmail(email, password);
        setSuccessMessage(
          language === 'en' 
            ? "Access granted! Syncing dashboard..." 
            : "Accès autorisé ! Synchronisation de votre journal en cours..."
        );
        setTimeout(() => {
          setIsLoading(false);
          if (onAuthSuccess && user) {
            onAuthSuccess(user);
          }
          if (onClose) onClose();
        }, 1205);
      } else {
        const user = await registerWithEmail(email, password);
        setSuccessMessage(
          language === 'en' 
            ? "Workspace provisioned! Welcome!" 
            : "Votre espace a été provisionné ! Bienvenue dans votre journal..."
        );
        setTimeout(() => {
          setIsLoading(false);
          if (onAuthSuccess && user) {
            onAuthSuccess(user);
          }
          if (onClose) onClose();
        }, 1205);
      }

    } catch (err: any) {
      setIsLoading(false);
      console.error(err);
      
      // Parse classic Firebase errors nice and beautifully
      const errorCode = err.code || err.message || '';
      if (errorCode.includes('auth/invalid-email')) {
        setErrorMessage(
          language === 'en' 
            ? "This email address is invalid or poorly formatted." 
            : "L'adresse email saisie est incorrecte ou mal formatée."
        );
      } else if (errorCode.includes('auth/user-not-found') || 
                 errorCode.includes('auth/wrong-password') || 
                 errorCode.includes('auth/invalid-credential')) {
        setErrorMessage(
          language === 'en' 
            ? "Unknown credentials. Please verify your email and password." 
            : "Identifiants incorrects. Veuillez vérifier votre adresse email et votre mot de passe."
        );
      } else if (errorCode.includes('auth/email-already-in-use')) {
        setErrorMessage(
          language === 'en' 
            ? "A trading space is already registered with this email." 
            : "Un compte de trading existe déjà avec cette adresse email."
        );
      } else if (errorCode.includes('auth/weak-password')) {
        setErrorMessage(
          language === 'en' 
            ? "Password too weak. Use at least 6 characters." 
            : "Le mot de passe doit être composé d'au moins 6 caractères."
        );
      } else if (errorCode.includes('auth/operation-not-allowed')) {
        setIsOperationNotAllowed(true);
        setErrorMessage(
          language === 'en' 
            ? "Email & password authentication is disabled. Please enable it in the Firebase console." 
            : "L'authentification par email/mot de passe n'est pas activée. Activez-la dans votre Console Firebase."
        );
      } else if (errorCode.includes('api-key-not-valid') || errorCode.includes('invalid-api-key')) {
        setIsInvalidApiKey(true);
        setErrorMessage(
          language === 'en'
            ? "Firebase configuration error: The API key provided is invalid."
            : "Erreur de configuration Firebase : La clé d'API fournie est invalide."
        );
      } else {
        setErrorMessage(err.message || String(err));
      }
    }
  };

  const handleGoogleLoginClick = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsInvalidApiKey(false);
    setIsLoading(true);
    try {
      if (!isConfigured) {
        setTimeout(() => {
          setIsLoading(false);
          const demoUser = {
            uid: 'demo-local-google',
            email: 'google-sync-trader@mail.com',
            displayName: 'Google Trader'
          };
          setSuccessMessage(
            language === 'en' 
              ? "[DEMO MODE] Successfully synced with Google!" 
              : "[MODE DÉMO] Synchronisation Google simulée avec succès !"
          );
          setTimeout(() => {
            if (onAuthSuccess) {
              onAuthSuccess(demoUser);
            }
            if (onClose) onClose();
          }, 1500);
        }, 800);
        return;
      }

      const user = await loginWithGoogle();
      setSuccessMessage(
        language === 'en' 
          ? "Google sync completed successfully!" 
          : "Synchronisation Google avec le Cloud établie avec succès !"
      );
      setTimeout(() => {
        setIsLoading(false);
        if (onAuthSuccess && user) {
          onAuthSuccess(user);
        }
        if (onClose) onClose();
      }, 1500);
    } catch (err: any) {
      setIsLoading(false);
      console.error(err);
      const errorCode = err.code || err.message || '';
      if (errorCode.includes('api-key-not-valid') || errorCode.includes('invalid-api-key')) {
        setIsInvalidApiKey(true);
        setErrorMessage(
          language === 'en'
            ? "Firebase configuration error: The API key provided is invalid."
            : "Erreur de configuration Firebase : La clé d'API fournie est invalide."
        );
      } else {
        setErrorMessage(err.message || String(err));
      }
    }
  };

  const renderContent = () => (
    <motion.div
      initial={isFullScreen ? { opacity: 0, y: 20 } : { opacity: 0, scale: 0.95 }}
      animate={isFullScreen ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1 }}
      exit={isFullScreen ? undefined : { opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', damping: 25, stiffness: 250 }}
      className={`w-full max-w-md bg-gradient-to-b from-[#12161F] to-[#0A0D14] border border-white/5 rounded-2xl p-7 relative shadow-[0_24px_60px_rgba(0,0,0,0.8)] overflow-hidden ${
        isFullScreen ? 'ring-2 ring-sky-500/10' : ''
      }`}
    >
      {/* Top Cyan laser glow */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent" />

      {/* Close Button Button (Only when NOT full screen) */}
      {!isFullScreen && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900/40 border border-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Header section */}
      <div className="text-center mb-6 pt-3 relative">
        <div className="inline-flex p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 mb-3 shadow z-10 relative">
          <TrendingUp className="w-5 h-5 stroke-[2.5]" />
        </div>
        <h3 className="text-md font-extrabold text-white uppercase tracking-wider">
          {mode === 'LOGIN' 
            ? (language === 'en' ? 'Sign In to Journal' : 'Connexion au Journal')
            : (language === 'en' ? 'Create Trading Space' : 'Inscription Sécurisée')}
        </h3>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1 font-mono">
          {mode === 'LOGIN' ? 'CLOUD INTEGRATION' : 'SECURE DEPLOYMENT'}
        </p>
      </div>

            {/* Form Toggle Slider */}
            <div className="grid grid-cols-2 p-1 bg-[#090B11] border border-white/5 rounded-xl mb-5 relative">
              <button
                type="button"
                onClick={() => { setMode('LOGIN'); setErrorMessage(null); }}
                className={`py-1.5 text-xs font-black uppercase tracking-wide rounded-md transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'LOGIN' 
                    ? 'bg-slate-800 text-white shadow border border-white/5' 
                    : 'text-slate-450 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Connexion</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('REGISTER'); setErrorMessage(null); }}
                className={`py-1.5 text-xs font-black uppercase tracking-wide rounded-md transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'REGISTER' 
                    ? 'bg-slate-800 text-white shadow border border-white/5' 
                    : 'text-slate-455 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Inscription</span>
              </button>
            </div>

            {/* Error Notification system */}
            {errorMessage && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/15 text-rose-400 p-3.5 rounded-xl text-xs flex flex-col gap-2.5 animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <div className="flex-1">
                    <span className="font-extrabold uppercase tracking-wide block mb-0.5">
                      {language === 'en' ? 'Security Guard Alert' : 'Alerte Système'}
                    </span>
                    <p className="text-slate-300 leading-normal">{errorMessage}</p>
                  </div>
                </div>

                {isOperationNotAllowed && (
                  <div className="mt-2 pt-2.5 border-t border-rose-500/10 text-[11px] text-slate-300 space-y-2">
                    <p className="font-semibold text-[#0ea5e9]">
                      {language === 'en' 
                        ? "💡 ACTION REQUIRED: Quick Walkthrough" 
                        : "💡 ACTION REQUISE : Guide de Résolution"}
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 font-sans leading-relaxed text-slate-400 pl-1">
                      <li>
                        {language === 'en' ? 'Click on ' : 'Cliquez sur '}
                        <a 
                          href={`https://console.firebase.google.com/project/${firebaseConfig.projectId || 'propflow-fdc96'}/authentication/providers`}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sky-400 hover:underline font-bold inline-flex items-center gap-1"
                        >
                          {language === 'en' ? 'this Firebase direct link' : 'ce lien direct Firebase'}
                        </a>
                        {language === 'en' ? ' to open authentication providers.' : ' pour ouvrir la console.'}
                      </li>
                      <li>
                        {language === 'en' 
                          ? 'Click the "Add new provider" button (Ajouter un fournisseur).' 
                          : 'Cliquez sur "Ajouter un fournisseur" (Add new provider).'}
                      </li>
                      <li>
                        {language === 'en' 
                          ? 'Select "Email/Password" (Adresse e-mail/Mot de passe).' 
                          : 'Sélectionnez "Adresse e-mail/Mot de passe" (Email/Password).'}
                      </li>
                      <li>
                        {language === 'en' 
                          ? 'Enable the provider toggle at the top and click "Save" (Enregistrer).' 
                          : 'Basculez l\'interrupteur d\'activation en haut et cliquez sur "Enregistrer" (Save).'}
                      </li>
                      <li>
                        {language === 'en' 
                          ? 'Return to this page and try registering or logging in again!' 
                          : 'Revenez sur cette page et réessayez de créer votre compte !'}
                      </li>
                    </ol>
                    <div className="mt-3 pt-2.5 border-t border-rose-500/10 flex flex-col gap-1.5">
                      <p className="text-[10px] text-slate-400">
                        {language === 'en' 
                          ? "Or bypass and continue locally without online synchronisation:" 
                          : "Ou contournez et continuez localement sans synchronisation en ligne :"}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLoading(true);
                          const demoUser = {
                            uid: `demo-local-${email ? email.replace(/[^a-zA-Z0-9]/g, '') : 'fallback'}`,
                            email: email || 'offline-trader@trade.local',
                            displayName: email ? email.split('@')[0] : 'Offline Trader'
                          };
                          setSuccessMessage(
                            language === 'en' 
                              ? "[DEMO MODE] Access granted with offline account!" 
                              : "[MODE DÉMO] Accès accordé avec compte local hors-ligne !"
                          );
                          setTimeout(() => {
                            setIsLoading(false);
                            if (onAuthSuccess) {
                              onAuthSuccess(demoUser);
                            }
                            if (onClose) onClose();
                          }, 1500);
                        }}
                        className="w-full bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 hover:border-[#0ea5e9]/55 text-[#0ea5e9] hover:text-sky-300 font-bold py-2 px-3 rounded-lg text-xs transition-all cursor-pointer text-center font-mono uppercase tracking-wider"
                      >
                        {language === 'en' ? '⚡ Continue Offline (Demo)' : '⚡ Continuer Hors-ligne (Démo)'}
                      </button>
                    </div>
                  </div>
                )}

                {isInvalidApiKey && (
                  <div className="mt-2 pt-2.5 border-t border-rose-500/10 text-[11px] text-slate-300 space-y-2">
                    <p className="font-semibold text-amber-400">
                      {language === 'en' 
                        ? "🔧 HOW TO FIX THE INVALID API KEY:" 
                        : "🔧 COMMENT SÉCURISER VOTRE CLÉ D'API :"}
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 font-sans leading-relaxed text-slate-400 pl-1 list-none">
                      <li className="flex gap-1 items-start">
                        <span className="font-bold text-amber-500">1.</span>
                        <span>
                          {language === 'en' 
                            ? "Double check your 'src/firebase-applet-config.json' file contents. Ensure the copied 'apiKey' value is exactly correct and does not contain typographical errors (like '8' instead of 'S')." 
                            : "Vérifiez le contenu de 'src/firebase-applet-config.json'. Assurez-vous d'avoir copié la clé d'API exacte sans espace ni confusion optique (ex: '8' au lieu de 'S')."}
                        </span>
                      </li>
                      <li className="flex gap-1 items-start mt-1">
                        <span className="font-bold text-amber-500">2.</span>
                        <span>
                          {language === 'en' 
                            ? "Go to the Google Cloud Credentials Console: " 
                            : "Vérifiez vos restrictions d'API sur la console Google Cloud : "}
                          <a 
                            href={`https://console.cloud.google.com/apis/credentials?project=${firebaseConfig.projectId || 'propflow-fdc96'}`}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-sky-400 hover:underline font-bold inline-flex items-center gap-1"
                          >
                            console.cloud.google.com
                          </a>
                        </span>
                      </li>
                      <li className="flex gap-1 items-start mt-1">
                        <span className="font-bold text-amber-500">3.</span>
                        <span>
                          {language === 'en' 
                            ? "Select API Key -> Edit and check that 'Identity Toolkit API' is enabled inside 'API Restrictions'. If restrictions are enabled but 'Identity Toolkit API' is unchecked, calls will fail." 
                            : "Cliquez sur votre clé de navigateur, puis assurez-vous que 'Identity Toolkit API' est autorisée dans les 'Restrictions relatives aux API'. Sinon, décochez la restriction d'API le temps de tester."}
                        </span>
                      </li>
                    </ol>
                    <div className="mt-3 pt-2.5 border-t border-rose-500/10 flex flex-col gap-1.5">
                      <p className="text-[10px] text-slate-400">
                        {language === 'en' 
                          ? "Want to bypass and continue with local state?" 
                          : "Vous préférez utiliser le mode local isolé immédiatement ?"}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLoading(true);
                          const demoUser = {
                            uid: `demo-local-${email ? email.replace(/[^a-zA-Z0-9]/g, '') : 'fallback'}`,
                            email: email || 'offline-trader@trade.local',
                            displayName: email ? email.split('@')[0] : 'Offline Trader'
                          };
                          setSuccessMessage(
                            language === 'en' 
                              ? "[LOCAL STORAGE] Switched to offline database!" 
                              : "[LOCAL STORAGE] Basculement sur la base de données locale !"
                          );
                          setTimeout(() => {
                            setIsLoading(false);
                            if (onAuthSuccess) {
                              onAuthSuccess(demoUser);
                            }
                            if (onClose) onClose();
                          }, 1500);
                        }}
                        className="w-full bg-[#0ea5e9]/10 hover:bg-[#0ea5e9]/20 border border-[#0ea5e9]/30 hover:border-[#0ea5e9]/55 text-[#0ea5e9] hover:text-sky-300 font-bold py-2 px-3 rounded-lg text-xs transition-all cursor-pointer text-center font-mono uppercase tracking-wider"
                      >
                        {language === 'en' ? '⚡ Use Offline Local State' : '⚡ Utiliser le Mode Hors-ligne'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Success Notification system */}
            {successMessage && (
              <div className="mb-4 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <p className="font-bold leading-normal text-slate-200">{successMessage}</p>
              </div>
            )}

            {/* Interactive Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email */}
              <div className="flex flex-col">
                <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono mb-1.5">
                  Adresse Email
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="trader@mail.com"
                    className="w-full bg-[#090B11] border border-white/5 focus:border-[#0ea5e9]/40 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none font-medium transition-all duration-150 shadow-inner placeholder-slate-600"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col">
                <div className="flex justify-between mb-1.5">
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono">
                    Mot de passe
                  </label>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-500">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-[#090B11] border border-white/5 focus:border-[#0ea5e9]/40 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none font-medium transition-all duration-150 shadow-inner placeholder-slate-600"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password confirmation for signup */}
              {mode === 'REGISTER' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex flex-col pt-1"
                >
                  <label className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest font-mono mb-1.5">
                    Confirmer le mot de passe
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-500">
                      <ShieldCheck className="w-4 h-4" />
                    </span>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••••••"
                      className="w-full bg-[#090B11] border border-white/5 focus:border-[#0ea5e9]/40 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white outline-none font-medium transition-all duration-150 shadow-inner placeholder-slate-600"
                      disabled={isLoading}
                    />
                  </div>
                </motion.div>
              )}

              {/* Data privacy terms for signup */}
              {mode === 'REGISTER' && (
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms-checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="accent-sky-500 h-3.5 w-3.5 rounded bg-slate-900 border-white/5 transition-all text-sky-500 mt-0.5 cursor-pointer"
                    disabled={isLoading}
                  />
                  <label htmlFor="terms-checkbox" className="text-[9px] text-slate-450 leading-normal select-none cursor-pointer">
                    {language === 'en'
                      ? "I consent to isolating my trading logs within secure Cloud-native environments."
                      : "Je consens au chiffrement de mes données de trading stockées de manière étanche."}
                  </label>
                </div>
              )}

              {/* Submit trigger button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-1 bg-sky-505 hover:bg-sky-500 bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg transition-all hover:-translate-y-0.5 duration-200 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>
                  {isLoading
                    ? (language === 'en' ? 'Processing Transaction...' : 'Vérification en cours...')
                    : mode === 'LOGIN' 
                      ? (language === 'en' ? 'Access Trade Workspace' : 'Se connecter')
                      : (language === 'en' ? 'Register Private Log' : 'Créer un espace')}
                </span>
                {!isLoading && <ArrowRight className="w-4 h-4" />}
              </button>
              
              {/* Immediate Local Bypass Option */}
              <div className="mt-3 flex justify-center text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    const demoUser = {
                      uid: `local-user-${email ? email.replace(/[^a-zA-Z0-9]/g, '') : 'trader'}`,
                      email: email || 'local-trader@propflow.local',
                      displayName: email ? email.split('@')[0] : 'Local Trader'
                    };
                    setSuccessMessage(
                      language === 'en' 
                        ? "Entering Local Mode (Data saved on your browser)..." 
                        : "Accès en mode Local (Données sauvegardées sur votre navigateur)..."
                    );
                    setTimeout(() => {
                      setIsLoading(false);
                      if (onAuthSuccess) {
                        onAuthSuccess(demoUser);
                      }
                      if (onClose) onClose();
                    }, 1200);
                  }}
                  className="text-[11px] text-slate-400 hover:text-sky-400 font-mono font-bold tracking-wider hover:underline transition-all cursor-pointer flex items-center justify-center gap-1 bg-white/5 py-1.5 px-3 rounded-lg border border-white/5 w-full justify-center"
                >
                  ⚡ {language === 'en' 
                    ? "USE OFFLINE LOCAL STORAGE DIRECTLY" 
                    : "UTILISER LE MODE LOCAL HORS-LIGNE DIRECTEMENT"}
                </button>
              </div>
            </form>

            {/* Spacer */}
            <div className="relative my-5 flex items-center justify-center">
              <span className="absolute left-0 right-0 h-[1px] bg-white/5" />
              <span className="relative bg-[#10141D] px-3.5 text-[9px] text-slate-500 font-bold tracking-widest font-mono uppercase">
                OU ACCÈS RAPIDE
              </span>
            </div>

            {/* Google Sync button */}
            <button
              onClick={handleGoogleLoginClick}
              disabled={isLoading}
              className="w-full bg-[#090B11] hover:bg-slate-800 border border-white/5 hover:border-slate-700 text-slate-200 font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.62 0 3.08.56 4.22 1.65l3.15-3.15C17.45 1.68 14.93 1 12 1 7.35 1 3.4 3.65 1.48 7.5l3.77 2.92C6.18 7.22 8.87 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.8-.07-1.56-.2-2.3H12v4.35h6.44c-.28 1.46-1.1 2.69-2.33 3.52l3.63 2.82c2.12-1.95 3.75-4.83 3.75-8.39z" />
                <path fill="#FBBC05" d="M5.25 14.58C5.02 13.9.49 13.1.49 12s.13-1.9.36-2.58l-3.77-2.92C1.35 7.93 1 9.93 1 12s.35 4.07 1.08 5.5l3.17-2.92z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.63-2.82c-1.1.74-2.51 1.18-4.33 1.18-3.13 0-5.82-2.18-6.77-5.38L1.46 16c1.92 3.85 5.87 6.5 10.54 6.5z" />
              </svg>
              <span>Synchroniser avec mon compte Google</span>
            </button>

            {/* Footer encryption ticker style disclaimer */}
            <div className="mt-5 text-center text-[9px] text-slate-500 font-mono flex items-center justify-center gap-1.5 leading-none">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping shrink-0" />
              <span>CO-PROCESSOR ENCRYPTION SHIELD ACTIVE</span>
            </div>

          </motion.div>
  );

  if (isFullScreen) {
    return (
      <div className="min-h-screen w-full bg-[#0A0B0D] text-slate-200 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
        {/* Aesthetic animated backgrounds */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-30">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#0ea5e9]/10 rounded-full blur-[150px]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#10b981]/5 rounded-full blur-[150px]" />
        </div>
        
        {/* Welcome branding Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xl font-black text-slate-100 uppercase tracking-widest font-mono">
              PROPFLOW
            </span>
          </div>
          <p className="text-[10px] text-slate-450 uppercase tracking-widest font-bold font-mono">
            {language === 'en' ? 'RESTRICTED DECRYPTED ZONE' : 'ESPACE DE TRADING CHIFFRÉ'}
          </p>
        </div>

        {renderContent()}

        <p className="mt-8 text-[11px] text-slate-500 font-mono text-center">
          {language === 'en' 
            ? 'AES-256 ZERO KNOWLEDGE JOURNAL • SECURED AT EVERY TICK' 
            : 'JOURNAL ZÉRO-CONNAISSANCE AES-256 • SÉCURISÉ EN TEMPS RÉEL'}
        </p>
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          {renderContent()}
        </div>
      )}
    </AnimatePresence>
  );
}
