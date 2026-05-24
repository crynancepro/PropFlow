// Interactive full site i18n file for PropFlow

export type Language = 'fr' | 'en';

export const PSYCHOLOGY_TAGS_MAP: Record<Language, string[]> = {
  fr: ['FOMO 🚀', 'Excès de Confiance 😎', 'Patience 🙏', 'Stress 😰', 'Revenge Trading 😡', 'Discipline 🎯', 'Cupidité 🤑', 'Peur de Perdre 😨'],
  en: ['FOMO 🚀', 'Overconfidence 😎', 'Patience 🙏', 'Stress 😰', 'Revenge Trading 😡', 'Discipline 🎯', 'Greed 🤑', 'Fear of Loss 😨']
};

export const MISTAKE_TAGS_MAP: Record<Language, string[]> = {
  fr: ['Sur-effet de levier ⚠️', 'SL/TP déplacé trop tôt 🚫', 'A couru après le marché 🏃‍♂️', 'Mauvaise Entrée 📉', 'Règles SMC brisées ❌', 'Entrée de Vengeance 🔄', 'Aucune Erreur ✅'],
  en: ['Over-leveraging ⚠️', 'Moved SL/TP early 🚫', 'Chasing Market 🏃‍♂️', 'Bad Entry 📉', 'Broke SMC Rules ❌', 'Revenge Entry 🔄', 'No Mistake ✅']
};

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  fr: {
    // General / Header
    appName: "PROPFLOW",
    authSlogan: "Auto-suivi de performances, IA & Chiffrement local",
    startingCapital: "Capital de départ",
    localIsolated: "Local Isolé",
    cloudSyncActive: "Cloud Sync Actif",
    cloudSynchro: "Synchro Cloud",
    signOut: "Se déconnecter",
    themeToggleLight: "Mode Clair",
    themeToggleDark: "Mode Sombre",
    footerCopyright: "© 2026 PROPFLOW. Tous droits réservés.",
    footerDisclaimer: "Chiffrement de bout en bout AES-256 standard militaire & Zéro-connaissance tiers.",

    // Tabs
    tabDashboard: "Dashboard",
    tabJournal: "Journal des positions",
    tabNews: "Analyse News",
    tabWorkspace: "Espace de Travail",
    tabAlerts: "Alertes AI",
    tabBacktesting: "Backtesting",
    tabCoach: "Coach IA",
    tabSecurity: "Sécurité & Sauvegardes",

    // Sync Loader
    syncProgress: "Synchronisation des transactions en direct sur le serveur privé...",

    // Account Manager
    selectAccount: "Sélectionner un compte de trading",
    addAccount: "Ajouter un compte",
    deleteAccount: "Supprimer le compte",
    accountPrincipal: "Compte Principal (PropFirm)",
    accountName: "Nom du compte",
    brokerName: "Courtier / PropFirm",
    startingBalanceLabel: "Solde initial",
    accountType: "Type de compte",
    createAccount: "Créer le compte",
    cancel: "Annuler",
    confirmDelete: "Confimer la suppression",
    associatedTradesCount: "positions associées seront perdues définitivement.",

    // Trade Psychology / Weekly REVIEW
    weeklyReviewTitle: "Revue Psychologique & Erreurs de Fin de Semaine",
    weeklyReviewSub: "Rapport consolidé sur votre résilience mentale et la correction des érosions de capital.",
    smcAICoachLabel: "SMC AI Coach",
    disciplineRatingLabel: "Discipline Globale",
    noRating: "N/A",
    emotionsImpactTitle: "Impact Psychologique & Émotions",
    emotionsImpactSub: "Fréquence et impact financier de vos états émotionnels.",
    noEmotionsYet: "Aucune émotion répertoriée dans vos trades.",
    mistakesImpactTitle: "Erosion des Pertes & Erreurs Commises",
    mistakesImpactSub: "Identifier les dérives techniques de la semaine pour stopper l'usure.",
    noMistakesYet: "Aucune dérive ou erreur répertoriée. Idéal !",
    aiDiagnosisTitle: "Diagnostic IA & Actions Correctives",
    aiDiagnosisSub: "Plan de travail psychologique et comportemental de week-end.",
    vulnerablePoints: "Points Vulnérables Identifiés",
    weekendActionPlan: "Plan d'Action de Fin de Semaine",
    weekendChecklistTitle: "Checklist de Fin de Semaine",
    checklist1: "1. Exportez vos captures de graphiques clôturés.",
    checklist2: "2. Éteignez vos terminaux vendredi soir à 22h00.",
    checklist3: "3. Planifiez vos zones H4 dimanche soir.",

    // Diagnostic Details (Dynamic French)
    diagMistakePrefix: "L'erreur principale sabotant vos statistiques est :",
    diagCost: "Son coût financier s'élève à",
    diagEmotionRecurrent: "L'état d'esprit récurrent impactant vos décisions est :",
    diagLimitFactor: "C'est le principal facteur limitant votre progression.",
    diagNoDerives: "Aucune dérive statistique majeure décelée cette semaine ! Vos émotions et techniques de filtrage des trades respectent fermement votre cahier des charges de trader professionnel.",

    // Action Plans
    actionPlanOverLeverage: "Lissage de levier : Limitez le risque maximum à 0.5% ou 1% par trade sur vos prochaines sessions. Ne tradez que 1 seul lot fixe jusqu'à correction.",
    actionPlanMovedSL: "Règle 'Set & Forget' : Ce week-end, entraînez-vous à lâcher vos positions après l'entrée. Ne touchez plus jamais aux limites si le trade est ouvert !",
    actionPlanFOMO: "Filtrage de patience : Pratiquez la respiration de cohérence cardiaque 2 minutes avant de lancer l'ordre. Attendez impérativement un CHoCH ou MSS 1M/5M.",
    actionPlanRevenge: "Verrouillage de perte : Règle des deux stops consécutifs. Dès que 2 transactions échouent, obligation absolue de fermer l'ordinateur pendant 4 heures.",
    actionPlanPristine: "Pratique de la Déconnexion : Tout est en ordre. Votre processus opérationnel est idéal. Coupez l'accès aux graphiques ce week-end pour recharger vos réserves mentales.",

    // Add / Edit Trade Psych fields
    labelPsychState: "🧠 État Psychologique / Émotions",
    labelMistakesCommitted: "⚠️ Erreurs Comportementales / Techniques",
    labelPsychNotes: "Notes psychologiques & techniques",
  },
  en: {
    // General / Header
    appName: "PROPFLOW",
    authSlogan: "Auto-performance tracking, AI & Local Encryption",
    startingCapital: "Starting Capital",
    localIsolated: "Isolated Local",
    cloudSyncActive: "Cloud Sync Active",
    cloudSynchro: "Cloud Sync",
    signOut: "Sign Out",
    themeToggleLight: "Light Mode",
    themeToggleDark: "Dark Mode",
    footerCopyright: "© 2026 PROPFLOW. All rights reserved.",
    footerDisclaimer: "Military-grade AES-256 end-to-end encryption & zero-knowledge database.",

    // Tabs
    tabDashboard: "Dashboard",
    tabJournal: "Positions Journal",
    tabNews: "News Analysis",
    tabWorkspace: "Workspace Links",
    tabAlerts: "AI Alerts",
    tabBacktesting: "Backtesting",
    tabCoach: "AI Coach",
    tabSecurity: "Security & Backups",

    // Sync Loader
    syncProgress: "Synchronizing trades in real-time to the private server...",

    // Account Manager
    selectAccount: "Select Trading Account",
    addAccount: "Add Account",
    deleteAccount: "Delete Account",
    accountPrincipal: "Main Account (PropFirm)",
    accountName: "Account Name",
    brokerName: "Broker / PropFirm",
    startingBalanceLabel: "Starting Balance",
    accountType: "Account Type",
    createAccount: "Create Account",
    cancel: "Cancel",
    confirmDelete: "Confirm Deletion",
    associatedTradesCount: "associated trades will be permanently deleted.",

    // Trade Psychology / Weekly REVIEW
    weeklyReviewTitle: "Weekly Psychological & Error Review",
    weeklyReviewSub: "Consolidated report on emotional resilience and capital preservation.",
    smcAICoachLabel: "SMC AI Coach",
    disciplineRatingLabel: "Overall Discipline",
    noRating: "N/A",
    emotionsImpactTitle: "Psychological Impact & Emotions",
    emotionsImpactSub: "Frequency and financial performance of various mental states.",
    noEmotionsYet: "No emotional tags found in your trades yet.",
    mistakesImpactTitle: "Capital Erosion & Operational Mistakes",
    mistakesImpactSub: "Identify technical slippage from this week to plug losses.",
    noMistakesYet: "No operational mistakes recorded. Perfect discipline!",
    aiDiagnosisTitle: "AI Diagnosis & Corrective Actions",
    aiDiagnosisSub: "Weekly behavioral and technical realignment training plan.",
    vulnerablePoints: "Identified Vulnerabilities",
    weekendActionPlan: "Weekend Action Plan",
    weekendChecklistTitle: "Weekend Checklist",
    checklist1: "1. Export your closed position chart screenshots.",
    checklist2: "2. Shut down your trading terminals on Friday at 10 PM.",
    checklist3: "3. Prepare and outline your H4 levels on Sunday evening.",

    // Diagnostic Details (Dynamic English)
    diagMistakePrefix: "The primary error damaging your performance is:",
    diagCost: "Total financial leak is",
    diagEmotionRecurrent: "The primary recurring emotion affecting your flow is:",
    diagLimitFactor: "This is the primary constraint limiting your growth.",
    diagNoDerives: "No critical behavioral drift identified this week! Your trade filters and emotional control meet elite institutional standards.",

    // Action Plans
    actionPlanOverLeverage: "Leverage Smoother: Limit absolute max risk to 0.5% or 1% per trade during the next sessions. Trade 1 standard lot size maximum until fixed.",
    actionPlanMovedSL: "Set & Forget Rule: This weekend, commit to leaving your positions undisturbed once open. Never adjust stop or target mid-trade!",
    actionPlanFOMO: "Patience Filter: Practice 2 minutes of box breathing before entering any order. Re-verify a clear CHoCH or market structure shift (1M/5M).",
    actionPlanRevenge: "Loss Locking: Apply the two-consecutive losses rule. If 2 orders fail back-to-back, terminal lock-out is mandatory for 4 full hours.",
    actionPlanPristine: "Disconnect & Unplug: All stats are pristine. Your workflow is outstanding. Shut your graphs down this weekend to replenish mental capital.",

    // Add / Edit Trade Psych fields
    labelPsychState: "🧠 Psychological State / Emotions",
    labelMistakesCommitted: "⚠️ Behavioral / Technical Mistakes",
    labelPsychNotes: "Psychological & technical notes",
  }
};
