import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const PORT = 3000;

// Lazy initialization of Gemini AI
let aiClient: GoogleGenAI | null = null;
let isGeminiKeyBlocked = false;

function hasValidGeminiKey(): boolean {
  if (isGeminiKeyBlocked) return false;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return false;
  const normalized = apiKey.trim();
  if (
    normalized === "" || 
    normalized === "MY_GEMINI_API_KEY" || 
    normalized === "YOUR_GEMINI_API_KEY" ||
    normalized.length < 15
  ) {
    return false;
  }
  return true;
}

function handleGeminiCallError(endpointName: string, error: any) {
  const errStr = String(error?.message || error || "");
  const isInvalidKey = errStr.includes("API key not valid") || 
                       errStr.includes("API_KEY_INVALID") || 
                       errStr.includes("API key expired") ||
                       errStr.includes("INVALID_ARGUMENT") ||
                       errStr.includes("API_KEY");
                       
  if (isInvalidKey) {
    isGeminiKeyBlocked = true;
    console.warn(`[Gemini] Clé API non active détectée dans ${endpointName}. Passage automatique en mode de secours local.`);
  } else {
    console.warn(`[Gemini] Problème d'appel dans ${endpointName}:`, error?.message || String(error));
  }
}

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!hasValidGeminiKey() || !apiKey) {
      throw new Error("GEMINI_API_KEY non configurée ou invalide. Veuillez l'ajouter dans les Secrets de l'AI Studio.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Global normalize function for Gemini ApiError / Key issues
function handleGeminiError(error: any, res: express.Response, fallbackMessage: string) {
  const errorStr = (error && typeof error === 'object') ? JSON.stringify(error) : String(error);
  console.error("Normalized Gemini Error Details:", error);
  
  if (
    errorStr.includes("API_KEY_INVALID") || 
    errorStr.includes("API key not valid") || 
    errorStr.includes("INVALID_ARGUMENT") ||
    errorStr.includes("key not valid")
  ) {
    res.status(400).json({
      error: "La clé API Gemini est absente ou invalide. Pour utiliser les fonctions d'opportunités de trading et le coach IA, veuillez ajouter une clé API valide dans l'onglet 'Settings' > 'Secrets' de l'AI Studio."
    });
  } else if (errorStr.includes("quota") || errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED")) {
    res.status(429).json({
      error: "La limite de requêtes de l'API Gemini est dépassée. Veuillez patienter une minute avant de réessayer."
    });
  } else {
    res.status(500).json({ error: error.message || fallbackMessage });
  }
}

// --- Gemini Local Fallback Utilities (Used when the API key is invalid or Gemini API fails) ---

interface AnalyzeTradesParams {
  trades: any[];
  startingBalance: number;
  currency: string;
  targetValue: number;
  dailyDrawdown: number;
  totalDrawdown: number;
  currentBalance: number;
  currentPnL: number;
}

function getAnalyzeTradesFallback(params: AnalyzeTradesParams): string {
  const { trades, startingBalance, currency, targetValue, dailyDrawdown, totalDrawdown, currentBalance, currentPnL } = params;
  const netReturnPercent = ((currentPnL / startingBalance) * 100).toFixed(2);
  const targetPercent = ((targetValue / startingBalance) * 100).toFixed(1);
  const dailyDrawdownPercent = ((dailyDrawdown / startingBalance) * 100).toFixed(1);
  const totalDrawdownPercent = ((totalDrawdown / startingBalance) * 100).toFixed(1);
  
  const totalTrades = trades.length;
  const winningTrades = trades.filter(t => (t.pnl !== undefined ? t.pnl : 0) > 0).length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : "0.0";
  
  let diagnostics = "";
  let gamePlan = "";
  let recoveryStrategy = "";

  if (currentPnL >= 0) {
    diagnostics = `### 🎯 Diagnostic de Performance : PROGRES EXCELLENT
Compte actuellement positif de **+${currentPnL} ${currency}** (${netReturnPercent}% de gain).
Tu as réalisé un taux de réussite de **${winRate}%** sur un total de **${totalTrades}** trades. 
Ton compte est sain et tu te rapproches pas à pas de ton objectif cible de **${targetValue} ${currency}** (${targetPercent}%). 

⚠️ **Alerte Discipline :** Ne laisse pas l'excès de confiance saboter ton progrès. Le risque de sur-trading augmente lorsque tout se passe bien. Reste rigoureux et respecte tes setups !`;

    gamePlan = `### 📊 Règles Mathématiques du Jour : MODE SÉCURISATION
- **Risque maximum quotidien autorisé :** **${(startingBalance * 0.01).toFixed(0)} ${currency}** (1.0% maximum du capital initial).
- **Risque suggéré par trade :** **0.25% à 0.50%** de la balance (excellent pour sécuriser les gains récents).
- **Nombre maximum de positions aujourd'hui :** **2 à 3 trades** maximum, pas plus.
- **Ratio Risque-Rendement minimum visé (R:R) :** **1:2** sur des setups d'Order Blocks de haute probabilité.
- **Actifs privilégiés :** Les paires majeures liquides (EUR/USD, GBP/USD) durant la session de Londres ou New York.`;

    recoveryStrategy = `### 🛡️ Plan de Sécurisation Adaptive : SÉCURISATION ACTIVE
- **Diminution du levier :** Étant donné que tu es dans le positif, l'objectif principal est de réduire l'exposition. Divise par deux tes tailles de lot usuelles.
- **Objectif résiduel :** Cherche uniquement des setups de niveau A+ (alignement de tendance HTF, prise de liquidité asiatique et cassure de structure en LTF).
- **Règle d'or :** Si tu gagnes ton premier trade de la journée, arrête-toi là et profite de ta journée. "Prends tes profits et laisse respirer le graphique."`;
  } else {
    const drawdownAmount = Math.abs(currentPnL);
    const drawdownPercent = ((drawdownAmount / startingBalance) * 100).toFixed(2);
    diagnostics = `### 🚨 Diagnostic de Performance : MODE RÉCUPÉRATION ACTIF
Compte actuellement en drawdown de **-${drawdownAmount} ${currency}** (Perte de **-${drawdownPercent}%**).
Tu as réalisé un taux de réussite de **${winRate}%** sur un total de **${totalTrades}** trades.
Tu es toujours à l'abri de la limite de drawdown total (**${totalDrawdown} ${currency}**), mais la préservation du compte est désormais ta priorité absolue de survie.

💡 **Note du Coach :** Être en perte fait partie intégrante du travail d'un trader professionnel. Ce qui te définira n'est pas cette perte temporaire, mais ta réaction de discipline face à elle. Respire et élimine l'ego.`;

    gamePlan = `### 📊 Règles Mathématiques du Jour : CONSERVATION STRICTE
- **Risque maximum quotidien autorisé :** **${(startingBalance * 0.005).toFixed(0)} ${currency}** (Réduit à 0.5% du capital pour stopper l'hémorragie).
- **Risque suggéré par trade :** **0.1% à 0.25%** maximum par setup.
- **Nombre maximum de positions aujourd'hui :** **1 seul trade** qualitatif. Si tu le perds, la journée est finie.
- **Ratio Risque-Rendement minimum visé :** **1:3** minimum (permet de récupérer 3 pertes avec un seul gain).`;

    recoveryStrategy = `### 🛡️ Plan de Sécurisation Adaptive : MODE RÉCUPÉRATION STRICT
- **Règle anti revenge trading :** Toute envie impulsive d'augmenter le risque pour "se refaire" est formellement interdite. C'est le piège numéro 1 des comptes invalidés.
- **Focus unique :** Ne trade que les configurations parfaites de bloc de contrats (Order Block/FVG) sur l'or ou l'EUR/USD avec confirmation d'un signal clair à l'ouverture de la session New Yorkaise.
- **Objectif :** Ne cherche pas à redevenir positif en un jour. Vise simplement une petite victoire technique aujourd'hui pour restaurer ta confiance et stopper la spirale de pertes.`;
  }

  return `## 🧠 Diagnostic et Coaching IA PropFlow - Plan Précis du Jour
*(Rapport d'analyse de secours activé suite à une absence ou indisponibilité de clé API de l'AI Studio)*

---

${diagnostics}

---

${gamePlan}

---

${recoveryStrategy}

---
*💡 Conseils psychologiques additionnels : Le drawdown n'est pas un problème de technique, c'est un test d'endurance émotionnelle. Suis ce plan à la lettre et protège ton capital.*`;
}

function getOpportunitiesFallback(): any[] {
  return [
    {
      id: "opp-1",
      symbol: "BTC/USD",
      timeframe: "4H",
      direction: "BUY",
      entryZone: "67,200 - 67,800 $",
      targetZone: "71,500 - 72,000 $",
      stopZone: "66,100 $",
      rationale: "Le Bitcoin a rebondi sur une zone de support clé renforcée par un ordre de bloc de 4 heures et l'EMA 200. On observe une divergence haussière cachée sur le RSI, suggérant une continuation de la tendance de fond.",
      probability: "HIGH"
    },
    {
      id: "opp-2",
      symbol: "EUR/USD",
      timeframe: "1H",
      direction: "SELL",
      entryZone: "1.0880 - 1.0895",
      targetZone: "1.0820 - 1.0805",
      stopZone: "1.0925",
      rationale: "La paire teste la borne supérieure d'un canal baissier et un niveau de retracement Fibonacci de 61.8 %. Une structure de cassure de marché (Market Structure Shift) s'est formée sur 15 minutes à l'ouverture de la session de Londres, avec une FVG non comblée juste au-dessus.",
      probability: "MEDIUM"
    },
    {
      id: "opp-3",
      symbol: "XAU/USD (Gold)",
      timeframe: "Daily",
      direction: "BUY",
      entryZone: "2320 - 2335 $",
      targetZone: "2410 - 2435 $",
      stopZone: "2285 $",
      rationale: "L'or consolide de manière constructive après une puissante impulsion haussière. Un schéma en drapeau haussier est en cours de validation avec une compression extrême de la MACD hebdomadaire. Idéal pour une position swing moyen terme.",
      probability: "HIGH"
    },
    {
      id: "opp-4",
      symbol: "NVDA",
      timeframe: "1H",
      direction: "SELL",
      entryZone: "910 - 918 $",
      targetZone: "870 - 860 $",
      stopZone: "932 $",
      rationale: "Double sommet technique sur l'unité de temps 1 heure avec divergence baissière RSI très prononcée en zone de surachat extrême. Comblement partiel attendu de la rupture d'hier à l'ouverture de Wall Street.",
      probability: "MEDIUM"
    },
    {
      id: "opp-5",
      symbol: "ETH/USD",
      timeframe: "4H",
      direction: "BUY",
      entryZone: "3410 - 3450 $",
      targetZone: "3720 - 3800 $",
      stopZone: "3315 $",
      rationale: "Accumulation de Wyckoff en phase C sur le support d'unité de temps majeure. Le volume augmente sur le rebond, indiquant le retour de l'intérêt acheteur institutionnel.",
      probability: "MEDIUM"
    }
  ];
}

function getBacktestFallback(strategyName: string, symbol: string, startingCapital: number): any {
  const winRate = 60.0;
  const totalTrades = 10;
  const isTargetSymbolUsd = symbol.toUpperCase().includes("USD") || symbol.toUpperCase() === "GOLD" || symbol.toUpperCase() === "BTC";
  const startPrice = isTargetSymbolUsd ? 1500 : 1.10;
  
  const simulationTrades = [];
  let currentCap = startingCapital;
  
  const tradesData = [
    { direction: "BUY", win: true, change: 0.02, desc: "Cassure d'une ligne de tendance avec fort volume institutionnel." },
    { direction: "SELL", win: false, change: -0.01, desc: "Faux signal de cassure au-dessus de la résistance clé." },
    { direction: "BUY", win: true, change: 0.03, desc: "Rebond précis sur le retracement Fibonacci 61.8% en session Londres." },
    { direction: "BUY", win: true, change: 0.015, desc: "Exécution sur comblement d'une Value Area Low (Volume Profile)." },
    { direction: "SELL", win: false, change: -0.01, desc: "Stop loss touché par un pic de volatilité lors de l'annonce CPI." },
    { direction: "SELL", win: true, change: 0.025, desc: "Rejet de chandelier sur bloc de contrat baissier H4." },
    { direction: "BUY", win: false, change: -0.008, desc: "Inversion de tendance LTF suite à un retournement imprévu." },
    { direction: "BUY", win: true, change: 0.04, desc: "Setup parfait SMC de balayage de liquidité asiatique." },
    { direction: "SELL", win: false, change: -0.01, desc: "Invalidation suite à un élargissement des spreads en fin de session." },
    { direction: "BUY", win: true, change: 0.022, desc: "Poursuite du momentum de marché après reprise de structure." }
  ];

  for (let i = 0; i < tradesData.length; i++) {
    const t = tradesData[i];
    const qty = Math.round((currentCap * 0.1) / (startPrice * (t.direction === "BUY" ? 1.002 : 0.998)));
    const changeAmt = startPrice * t.change;
    const entryPrice = parseFloat((startPrice + (i * 0.005 * (t.win ? 1 : -1))).toFixed(4));
    const exitPrice = parseFloat((entryPrice + (t.direction === "BUY" ? changeAmt : -changeAmt)).toFixed(4));
    const pnl = parseFloat((qty * (exitPrice - entryPrice) * (t.direction === "BUY" ? 1 : -1) * (isTargetSymbolUsd ? 10 : 10000)).toFixed(2));
    const pnlPercent = parseFloat(((pnl / startingCapital) * 100).toFixed(2));
    currentCap += pnl;

    simulationTrades.push({
      id: `trade-${i+1}`,
      date: `${(10+i).toString().padStart(2, "0")}-05-2026`,
      direction: t.direction as "BUY" | "SELL",
      entryPrice,
      exitPrice,
      quantity: Math.max(qty, 1),
      pnl,
      pnlPercent,
      comments: t.desc
    });
  }

  const netProfit = parseFloat((currentCap - startingCapital).toFixed(2));
  const gp = simulationTrades.filter(t => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
  const gl = Math.abs(simulationTrades.filter(t => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = gl > 0 ? parseFloat((gp / gl).toFixed(2)) : 3.5;

  return {
    strategyName,
    symbol,
    startingCapital,
    winRate,
    profitFactor,
    netProfit,
    totalTrades,
    simulationTrades
  };
}


// 1. API: Analyze Trades
app.post("/api/gemini/analyze-trades", async (req, res) => {
  const { 
    trades, 
    startingBalance, 
    currency, 
    targetValue, 
    dailyDrawdown, 
    totalDrawdown, 
    currentBalance, 
    currentPnL 
  } = req.body;

  if (!Array.isArray(trades)) {
    res.status(400).json({ error: "Liste de trades invalide pour l'analyse." });
    return;
  }

  const finalStartingBalance = Number(startingBalance) || 10000;
  const finalCurrency = currency || "USD";
  const finalTargetValue = targetValue !== undefined ? Number(targetValue) : (finalStartingBalance * 0.10);
  const finalDailyDrawdown = dailyDrawdown !== undefined ? Number(dailyDrawdown) : (finalStartingBalance * 0.05);
  const finalTotalDrawdown = totalDrawdown !== undefined ? Number(totalDrawdown) : (finalStartingBalance * 0.10);
  const finalCurrentBalance = currentBalance !== undefined ? Number(currentBalance) : finalStartingBalance;
  const finalCurrentPnL = currentPnL !== undefined ? Number(currentPnL) : 0;

  if (!hasValidGeminiKey()) {
    const fallbackText = getAnalyzeTradesFallback({
      trades,
      startingBalance: finalStartingBalance,
      currency: finalCurrency,
      targetValue: finalTargetValue,
      dailyDrawdown: finalDailyDrawdown,
      totalDrawdown: finalTotalDrawdown,
      currentBalance: finalCurrentBalance,
      currentPnL: finalCurrentPnL
    });
    res.json({ analysis: fallbackText });
    return;
  }

  try {
    const ai = getGeminiClient();
    
    // Prepare a summarized trades payload for Gemini to keep it lightweight.
    const tradesSummary = trades.map((t, idx) => ({
      idx: idx + 1,
      symbol: t.symbol,
      type: t.direction,
      entry: t.entryPrice,
      exit: t.exitPrice || "Non sorti",
      pnl: t.pnl || 0,
      setup: t.setup || "Non spécifié",
      status: t.status,
      notes: t.notes || "",
      rating: t.rating || 3
    }));

    const prompt = `Tu es un Gestionnaire de Risque Senior et un Coach Expert pour les challenges Prop Firm (type FTMO, FundedNext, Apex, etc.). Ton unique objectif est d'aider le trader à valider son compte en gérant ses émotions et ses mathématiques, surtout en période de perte (drawdown). Ton approche est basée sur le trading institutionnel (Smart Money Concepts / ICT) et une gestion des risques ultra-stricte.

Paramètres et état actuel du compte :
- Capital de départ/initial : ${finalStartingBalance} ${finalCurrency}
- Objectif de profit à atteindre (Target) : ${finalTargetValue} ${finalCurrency} (${((finalTargetValue / finalStartingBalance) * 100).toFixed(1)}%)
- Drawdown Quotidien Maximum autorisé : ${finalDailyDrawdown} ${finalCurrency} (${((finalDailyDrawdown / finalStartingBalance) * 100).toFixed(1)}%)
- Drawdown Total Maximum autorisé : ${finalTotalDrawdown} ${finalCurrency} (${((finalTotalDrawdown / finalStartingBalance) * 100).toFixed(1)}%)
- Balance actuelle du compte : ${finalCurrentBalance} ${finalCurrency}
- Gain/Perte net cumulé (PnL global) : ${finalCurrentPnL} ${finalCurrency} (Rendement net : ${((finalCurrentPnL / finalStartingBalance) * 100).toFixed(2)}%)

Historique des derniers trades (Optionnel mais recommandé) :
${tradesSummary.length === 0 ? "Aucun trade enregistré dans le journal pour le moment." : JSON.stringify(tradesSummary, null, 2)}

Ta tâche est de générer un "Plan de Trading et de Gestion du Risque Dynamique" très précis pour la journée d'aujourd'hui, rédigé en français sous format Markdown professionnel structuré, divisé STRICTEMENT en 3 parties claires avec des titres précis :

1. STATUT DU COMPTE ET DIAGNOSTIC :
Fais un résumé rapide de la situation. Analyse le ratio de réussite ou le drawdown actuel par rapport aux règles d'invalidation (Ex: "Tu es à +4% de ton objectif" ou "Attention, tu es en drawdown de -3% sous tension"). Donne un diagnostic honnête et motivant.

2. LE PLAN DE JEU DU JOUR (MATHÉMATIQUE) :
Calcule précisément ce que le trader a le droit de faire aujourd'hui :
- Le risque maximum autorisé pour la journée en dollars (${finalCurrency}) et en % de la balance actuelle (Ce risque doit baisser drastiquement et être ultra-protecteur si le compte est en perte pour préserver le capital !).
- Le nombre maximum de trades autorisés aujourd'hui pour stopper l'overtrading.
- La taille de lot suggérée ou le ratio de profit cible (R:R) minimum à viser en appliquant l'approche SMC / ICT (ex: viser des zones de Liquidité HSTF, des FVG ou Order Blocks solides avec 1:3 minimum).

3. STRATÉGIE DE RATTRAPAGE OU DE SÉCURISATION (MODE ADAPTATIF) :
- SI LE TRADER EST EN GAIN (Proche de la validation) : Active le mode de sécurisation. Recommande-lui de réduire son risque usuel (ex: passer de 0.5% à 0.25%) pour valider l'objectif résiduel de manière ultra conservatrice sans stress de drawdown.
- SI LE TRADER EST EN PERTE / DRAWDOWN : Active expressément le "Mode Récupération". Interdis formellement le revenge trading. Donne-lui un plan conservateur précis (ex: diviser le risque par deux, ne chercher que des setups A+ de haute probabilité de distribution institutionnelle, viser d'abord le retour à l'équilibre psychologique avant de penser à l'objectif de validation).

Règles de style et ton :
Reste hyper professionnel, direct, extrêmement mathématique et encourageant. Utilise des émojis pertinents pour rendre le plan limpide et scannable d'un coup d'œil. Ne donne jamais de signaux d'achat/vente directs (ne dis pas d'acheter ou vendre tel actif maintenant), concentre-toi uniquement sur le PLAN, l'état d'esprit et la GESTION MATHÉMATIQUE de la performance.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    handleGeminiCallError("analyze-trades", error);
    const fallbackText = getAnalyzeTradesFallback({
      trades,
      startingBalance: finalStartingBalance,
      currency: finalCurrency,
      targetValue: finalTargetValue,
      dailyDrawdown: finalDailyDrawdown,
      totalDrawdown: finalTotalDrawdown,
      currentBalance: finalCurrentBalance,
      currentPnL: finalCurrentPnL
    });
    res.json({ analysis: fallbackText });
  }
});

// 2. API: Opportunities System
app.post("/api/gemini/opportunities", async (req, res) => {
  if (!hasValidGeminiKey()) {
    res.json({ opportunities: getOpportunitiesFallback() });
    return;
  }

  try {
    const ai = getGeminiClient();
    
    const prompt = `Génère 5 opportunités de marché réalistes et éducatives de niveau professionnel fondées sur l'analyse technique (par ex. cassure de support, divergence RSI, double creux, retracement Fibonacci). 
Ces opportunités doivent porter sur des actifs majeurs variés et d'actualité (par exemple: BTC/USD, ETH/USD, EUR/USD, Gold, S&P 500, AAPL, NVDA).
Tu dois renvoyer le résultat strictly sous format JSON respectant exactement le schéma demandé. Rédige en français pour les explications.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Identifiant unique" },
              symbol: { type: Type.STRING, description: "Le symbole de l'actif, ex BTC/USD" },
              timeframe: { type: Type.STRING, description: "Unité de temps recommandée, ex: 1H, 4H, Daily" },
              direction: { type: Type.STRING, enum: ["BUY", "SELL"], description: "Direction recommandée" },
              entryZone: { type: Type.STRING, description: "Zone d'entrée recommandée" },
              targetZone: { type: Type.STRING, description: "Zone cible de take profit" },
              stopZone: { type: Type.STRING, description: "Zone d'invalidation (stop loss)" },
              rationale: { type: Type.STRING, description: "Justification technique détaillée de cette opportunité en français" },
              probability: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"], description: "Niveau de probabilité estimé" },
            },
            required: ["id", "symbol", "timeframe", "direction", "entryZone", "targetZone", "stopZone", "rationale", "probability"]
          }
        }
      }
    });

    const items = JSON.parse(response.text || "[]");
    res.json({ opportunities: items });
  } catch (error: any) {
    handleGeminiCallError("opportunities", error);
    res.json({ opportunities: getOpportunitiesFallback() });
  }
});

// 3. API: Generate Backtest Simulator
app.post("/api/gemini/backtest", async (req, res) => {
  const { strategyName, symbol, startingCapital } = req.body;
  if (!strategyName || !symbol) {
    res.status(400).json({ error: "strategyName et symbol sont obligatoires." });
    return;
  }

  const finalCapital = Number(startingCapital) || 10000;

  if (!hasValidGeminiKey()) {
    res.json(getBacktestFallback(strategyName, symbol, finalCapital));
    return;
  }

  try {
    const ai = getGeminiClient();

    const prompt = `Génère une simulation rétroactive (backtesting) hautement réaliste pour la stratégie de trading suivante:
- Nom de la Stratégie: ${strategyName}
- Actif cible: ${symbol}
- Capital virtuel initial: ${finalCapital}

Crée une série de 8 à 12 transactions historiques chronologiques détaillant l'impact de cette stratégie et calcule les statistiques globales de performance.
Renvoie STRICTEMENT un objet JSON en français respectant scrupuleusement le schéma spécifié.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            strategyName: { type: Type.STRING, description: "Nom abrégé de la stratégie" },
            symbol: { type: Type.STRING, description: "Symbole de l'actif" },
            startingCapital: { type: Type.NUMBER },
            winRate: { type: Type.NUMBER, description: "Pourcentage de réussite global entre 0 et 100" },
            profitFactor: { type: Type.NUMBER, description: "Facteur de profit, ex: 1.65" },
            netProfit: { type: Type.NUMBER, description: "Profit ou perte nette globale générée" },
            totalTrades: { type: Type.NUMBER, description: "Nombre de trades simulés" },
            simulationTrades: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  date: { type: Type.STRING, description: "Date fictive au format JJ-MM-AAAA" },
                  direction: { type: Type.STRING, enum: ["BUY", "SELL"] },
                  entryPrice: { type: Type.NUMBER },
                  exitPrice: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER },
                  pnl: { type: Type.NUMBER, description: "Gain ou perte net en monnaie" },
                  pnlPercent: { type: Type.NUMBER, description: "Gain ou perte en pourcentage" },
                  comments: { type: Type.STRING, description: "Note d'analyse technique décrivant le trade de façon professionnelle" }
                },
                required: ["id", "date", "direction", "entryPrice", "exitPrice", "quantity", "pnl", "pnlPercent", "comments"]
              }
            }
          },
          required: ["strategyName", "symbol", "startingCapital", "winRate", "profitFactor", "netProfit", "totalTrades", "simulationTrades"]
        }
      }
    });

    const backtestResult = JSON.parse(response.text || "{}");
    res.json(backtestResult);
  } catch (error: any) {
    handleGeminiCallError("backtest", error);
    res.json(getBacktestFallback(strategyName, symbol, finalCapital));
  }
});

// 3b. API: Analyze News
app.post("/api/gemini/analyze-news", async (req, res) => {
  const { newsName, previousValue, forecastValue, actualValue, globalImpact, marketReaction } = req.body;

  if (!newsName) {
    res.status(400).json({ error: "Le nom de la news est requis pour l'analyse." });
    return;
  }

  if (!hasValidGeminiKey()) {
    const fallbackText = getNewsAnalysisFallback(
      newsName,
      previousValue || '-',
      forecastValue || '-',
      actualValue || '-',
      globalImpact || 'POSITIF_USD',
      marketReaction || '-'
    );
    res.json({ analysis: fallbackText });
    return;
  }

  try {
    const ai = getGeminiClient();

    const prompt = `Tu es un Expert Analyste Macro-économique Senior spécialisé en Smart Money Concepts (SMC) et Inner Circle Trader (ICT). 
Analyse l'événement macro-économique suivant :
- Nom de la news : ${newsName}
- Valeur précédente : ${previousValue || '-'}
- Valeur prévue (Forecast) : ${forecastValue || '-'}
- Valeur réelle (Actual) : ${actualValue || '-'}
- Impact global actuel : ${globalImpact || 'POSITIF_USD'} (Direction induite: ${globalImpact === 'POSITIF_USD' ? 'Bullish USD / Bearish EURUSD' : 'Bearish USD / Bullish EURUSD'})
- Réaction constatée : ${marketReaction || '-'}

Génère un rapport d'analyse macro-économique extrêmement rigoureux et formel en français pour guider le trader sur prop firms. Il doit adopter une mise en page Markdown riche, moderne et aérée.
La structure doit impérativement respecter les sections suivantes rédigées entièrement en français :

### 🌐 ACCUEIL : EXPLICATION MAJEURE
[Donne une explication extrêmement claire, didactique et professionnelle du rôle de cette publication macro-économique. Pourquoi est-elle surveillée par les banques centrales et les teneurs de marché (Market Makers) ? Explique l'écart (deviance) entre la valeur réelle, la prévision et la valeur précédente, et son incidence psychologique immédiate sur les banques.]

### ⏳ HORIZON TEMPOREL & FLUIDITÉ DE LIQUIDITÉ
[Précise clairement l'amplitude de l'impact en termes d'horizon temporel actuel et de manipulation algorithmique (IPDA) :
- Est-ce un impact à **Court Terme** (quelques heures, idéal pour chasser la liquidité intra_session, balayage des stop-loss / BSL / SSL sur les m15/H1) ?
- Est-ce un impact à **Moyen Terme** (durant la journée entière / clôture de la daily expansion) ?
- Ou un impact à **Long Terme** (impulsion structurelle affectant l'Order Flow sur plusieurs semaines ou mois) ?
Justifie techniquement avec le vocabulaire SMC/ICT.]

### 🎯 SCÉNARIO DE TRADING PRÉCIS (XAU/USD & DXY)
[Propose un guide d'intervention précis et institutionnel pour corréler le XAU/USD (Gold) et le DXY (US Dollar Index) :
1. **Sur le DXY (Index Dollar)** : Comment lire la structure ? Est-ce qu'on cherche un comblement d'un Fair Value Gap (FVG) ou un rejet sur un Order Block (OB) de l'Inversion de tendance ?
2. **Sur le XAU/USD (Or)** : Attendre spécifiquement l'ouverture ou la manipulation de la Killzone de New York (NY Killzone) ou London Open. Comment viser l'accumulation/manipulation/distribution (AMD) ? Attraper les rejets de liquidité (Liquidity Sweeps) sous les creux ou sommets relatifs avant de rechercher des retournements de structure (MSS / Market Structure Shift) ?
Reste extrêmement précis sur l'utilisation du temps et du prix (Time & Price).]

Rédige ce rapport en français avec un ton expert, pragmatique et structuré. Utilise des émojis pertinents pour rendre le rapport moderne, aéré et ultra-scannable.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ analysis: response.text });
  } catch (error: any) {
    handleGeminiCallError("analyze-news", error);
    const fallbackText = getNewsAnalysisFallback(
      newsName,
      previousValue || '-',
      forecastValue || '-',
      actualValue || '-',
      globalImpact || 'POSITIF_USD',
      marketReaction || '-'
    );
    res.json({ analysis: fallbackText });
  }
});

// --- Ruthless AI Coach Chat helper and endpoint ---
function getCoachChatFallback(userMessage: string, lang: string, dailyDrawdownPercent: string, winRate: string, recentTradesList: any[] = []): string {
  const msg = userMessage.toLowerCase();
  const isEn = lang === "en";

  // Identify any trade to roast
  const lastTrade = Array.isArray(recentTradesList) && recentTradesList.length > 0 ? recentTradesList[0] : null;
  const lastTradeSymbol = lastTrade ? lastTrade.symbol : "";
  const lastTradePnl = lastTrade ? (lastTrade.pnl || 0) : 0;
  const lastTradeSetup = lastTrade ? (lastTrade.setup || "") : "";
  const lastTradeRep = lastTrade 
    ? (isEn 
        ? `Look at your recent trade on ${lastTradeSymbol} (${lastTrade.direction}) with ${lastTradePnl} USD. You entered on a setup "${lastTradeSetup || 'N/A'}" and got smashed!`
        : `Regarde ton dernier trade sur ${lastTradeSymbol} (${lastTrade.direction}) avec un PnL de ${lastTradePnl} USD. Tu es entré sur un setup "${lastTradeSetup || 'N/A'}" et tu t'es fait couper !`)
    : "";

  // Dynamic selection key based on message length and timestamp to rotate responses
  const rotateIdx = (userMessage.length + new Date().getSeconds()) % 4;

  if (isEn) {
    // 1. FOMO
    if (msg.includes("fomo") || msg.includes("chase") || msg.includes("hurry") || msg.includes("fear") || msg.includes("impatience") || msg.includes("miss")) {
      const fomoOptions = [
        `FOMO IS THE SIGN OF A WEAK MIND. You chased the candle and now you're whining? You deserve that loss! ${lastTradeSymbol ? `Just like you chased ${lastTradeSymbol} earlier!` : ''} Until you learn to wait for liquidity sweeps (BSL/SSL) and a proper MSS, stay away from the charts!`,
        `Are you a professional or a retail degenerate clicker? Chasing price is a ticket to bankruptcy. ${lastTradeRep} Turn off your screen and read the trading plan again.`,
        `Oh, you thought the train was leaving without you? Excellent of you to buy the absolute high of the day. The Market Makers thank you for providing liquidity. WALK AWAY!`,
        `IMPATIENCE is the primary source of revenue for brokers. You entered because you were bored, not because you had a setup. Do 50 pushups and rethink your life choices.`
      ];
      return fomoOptions[rotateIdx % fomoOptions.length];
    }
    // 2. REVENGE / TILT
    if (msg.includes("revenge") || msg.includes("double") || msg.includes("tilt") || msg.includes("angry") || msg.includes("mad") || msg.includes("recover") || msg.includes("rattraper")) {
      const revengeOptions = [
        `REVENGE TRADING? You reduced yourself to a crying casino degenerate! You are literally donating your hard-earned capital to the market maker pools. Turn off your computer right now! Your current win rate is only ${winRate}%!`,
        `Oh, you're angry at the market? Sure, type representatively on your keyboard, that will surely move the chart back in your favor. PATHETIC! Walk away before you blow your entire prop evaluation.`,
        `Revenge trading on ${lastTradeSymbol || 'the market'}? You are trading on tilt and emotion. That is clinical insanity. Your statistics are terrible right now (${winRate}% win rate). STOP CLIKING!`,
        `Every time you try to 'get it back', you double your risk and cut your brain in half. Close the app. This is not a game. I am here to build a mercenary, not a whiner.`
      ];
      return revengeOptions[rotateIdx % revengeOptions.length];
    }
    // 3. LOSS
    if (msg.includes("lost") || msg.includes("lose") || msg.includes("negative") || msg.includes("drawdown") || msg.includes("loss") || msg.includes("perte")) {
      const lossOptions = [
        `YOU ARE IN DRAWDOWN (${dailyDrawdownPercent}% today). SO WHAT? Loss is a structural statistic, not a personal tragedy. Did you follow the setup? If yes, move on. If no, you committed a crime against your account. ${lastTradeRep}`,
        `A loss is the direct price of business. Whining about it shows you're psychologically unfit to manage real institutional capital. Tighten your stop losses and reduce risk to 0.25%.`,
        `Your drawdown of ${dailyDrawdownPercent}% today is exactly within normal system variance IF you followed the rules. But looking at your trade history, you entered like an amateur. Control your risk!`,
        `Losses happen. Even my best algorithms experience drawdown. The difference is they don't cry and change setups mid-session. Execute with cold precision or leave.`
      ];
      return lossOptions[rotateIdx % lossOptions.length];
    }
    // 4. WIN
    if (msg.includes("win") || msg.includes("won") || msg.includes("gagn") || msg.includes("profit") || msg.includes("success")) {
      const winOptions = [
        `A WIN? DO NOT GET COCKY! Overconfidence is the silent serial killer. Was it a real high-probability trade? If not, you are just a lucky idiot, and lucky idiots blow their account on the next trade!`,
        `Congratulations on clicking a button and seeing green numbers. Now stay humble. Arrogance starts the decay. Keep your risk strictly at 1% max and protect the capital.`,
        `Good execution on ${lastTradeSymbol ? lastTradeSymbol : "the setup"}. But remember: tomorrow is a clean slate. One win doesn't make you a market god. Analyze what worked and enforce it.`,
        `Profit secured. Do not celebrate too early. The market is an expert at giving you a tiny treat before pulling down the guillotine. What are you doing with your risk next?`
      ];
      return winOptions[rotateIdx % winOptions.length];
    }
    // 5. TECHNICAL QUESTIONS
    if (msg.includes("how") || msg.includes("setup") || msg.includes("fvg") || msg.includes("block") || msg.includes("learn") || msg.includes("help") || msg.includes("explain") || msg.includes("comment") || msg.includes("concept")) {
      const questionOptions = [
        `A technical inquiry? Listen closely: You look for market structure shifts (MSS) with displacement on M5/M15, identifying the premier Fair Value Gap (FVG) or optimal order block (OB). But tell me, do you actually wait for the price to hit premium/discount levels or do you rush in like a novice?`,
        `Smart Money Concepts (SMC) require clinical execution. You map your swing highs/lows on H1/H4, find liquidity pools (BSL/SSL), and wait for NY/London Killzones. Do you actually wait for structural sweeps or do you trade the Asian range like a headless retail chicken?`,
        `Order blocks are useless if you don't look at higher-timeframe order flow. Let me ask you: how do you validate your entries? If it's not backed by a real session sweep, it's just retail noise. Explain your confirmation protocol or go back to demo!`,
        `To survive here, you must master liquidity. Price travels from internal range liquidity to external range liquidity. Explain to me what an Optimal Trade Entry (OTE) is, or go flip burgers instead!`
      ];
      return questionOptions[rotateIdx % questionOptions.length];
    }
    // 6. GENERAL
    const generalOptions = [
      `DISCIPLINE IS NOT OPTIONAL! The Market Makers (IPDA) are waiting for your next impatient, bored click to sweep your stops. Today your drawdown is ${dailyDrawdownPercent}%. Are you ready to execute strictly or have you given up?`,
      `Stop talking and show me clean, rule-based execution. ${lastTradeRep} What is your precise risk allocation for the next trade? Answer me!`,
      `I don't care about your feelings, I care about your drawdown and your win rate (${winRate}%). Every trade in excess of your plan is a betrayal of your vision. Stay focused!`,
      `Rentability isn't about magical indicators; it's about cold, boring military discipline. Are you going to wait for your setup in the next institutional Killzone, or continue acting like an amateur gambler?`
    ];
    return generalOptions[rotateIdx % generalOptions.length];
  } else {
    // FRENCH
    // 1. FOMO
    if (msg.includes("fomo") || msg.includes("impatience") || msg.includes("peur") || msg.includes("rater") || msg.includes("rapide")) {
      const fomoOptions = [
        `LE FOMO EST LA SIGNATURE D'UN ESPRIT FAIBLE ET SANS COLONNE ! Tu as couru après la bougie comme un affamé et maintenant tu viens pleurer ? Tu as mérité cette claque ! ${lastTradeSymbol ? `Comme sur ton trade sur ${lastTradeSymbol} où tu as paniqué !` : ''} Tant que tu n'attendras pas une vraie prise de liquidité (BSL/SSL) en Killzone, interdiction de toucher aux graphiques !`,
        `Tu te prends pour un trader de haut niveau ou un joueur de loto compulsif ? Courir après le prix est le meilleur moyen de cramer ton évaluation. ${lastTradeRep} Ferme ton terminal et relis ton putain de plan.`,
        `Ah, tu avais peur que le train parte sans toi ? Félicitations pour avoir acheté le plus haut historique du jour ! Le teneur de marché IPDA te remercie pour ta contribution charitable. VA T'AÉRER LE CERVEAU !`,
        `L'IMPATIENCE est le fond de commerce des brokers. Tu es entré parce que tu t'ennuyais, pas parce que tu avais un setup A+. Fais 50 pompes immédiatement et demande-toi si tu es sérieux ou si tu joues à la console.`
      ];
      return fomoOptions[rotateIdx % fomoOptions.length];
    }
    // 2. REVENGE / TILT
    if (msg.includes("revenge") || msg.includes("double") || msg.includes("tilt") || msg.includes("colère") || msg.includes("énerve") || msg.includes("refaire") || msg.includes("rattraper")) {
      const revengeOptions = [
        `DU REVENGE TRADING ? TU T'ES ABAISSÉ AU RANG DE JOUEUR DE CASINO SANS FIERTÉ ! Tu es en train d'offrir ton capital durement gagné aux liquidity pools sur un plateau d'argent. Éteins cette machine tout de suite ! Ton taux de réussite est à un niveau misérable de ${winRate}% !`,
        `Oh, monsieur est fâché contre les graphiques ? Vas-y, tape bien fort sur ton clavier, ça va sûrement faire remonter la bougie en ta faveur. MINABLE ! Éloigne-toi des écrans avant de cramer définitivement ton compte.`,
        `Du revenge trading sur ${lastTradeSymbol || 'les marchés'} ? Tu trades sous le coup de l'émotion pure et dure. C'est de la folie clinique ! Tes statistiques sont désastreuses (${winRate}% de win rate). ARRÊTE DE CLIQUER !`,
        `Chaque fois que tu essaies de "te refaire", tu doubles ton risque et divises ton QI par deux. Ferme cette plateforme de trading. Je suis là pour former un soldat de la finance, pas un pleurnicheur de forum.`
      ];
      return revengeOptions[rotateIdx % revengeOptions.length];
    }
    // 3. LOSS
    if (msg.includes("perdu") || msg.includes("perte") || msg.includes("drawdown") || msg.includes("rouge") || msg.includes("moins") || msg.includes("perte")) {
      const lossOptions = [
        `TU AS ESSUYÉ UNE PERTE ? ET ALORS ?! Ton drawdown quotidien est de ${dailyDrawdownPercent}%. La perte est une donnée géométrique et statistique normale du business. La seule question qui compte : AS-TU RESPECTÉ LE PLAN ? Si oui, c'est ton coût de fonctionnement. Si non, tu es un hors-la-loi. ${lastTradeRep}`,
        `Une perte est le coût normal de faire du business. Chouiner à ce sujet prouve que tu n'es pas encore prêt pour gérer les capitaux d'une prop firm. Réduis ton risque à 0.25% sur ton prochain trade et surveille ton stop loss.`,
        `Ton drawdown de ${dailyDrawdownPercent}% aujourd'hui est parfaitement tolérable pour nos modèles SI tu as respecté les règles. Mais au vu de tes derniers trades, tu as fait preuve d'amateurisme. Reprends-toi !`,
        `Les pertes font partie du jeu. Mes meilleurs algorithmes encaissent des drawdowns. La différence, c'est qu'ils ne paniquent pas et ne changent pas de setup au milieu de la session. Exécute comme un robot ou reste sur simulateur !`
      ];
      return lossOptions[rotateIdx % lossOptions.length];
    }
    // 4. WIN
    if (msg.includes("gagné") || msg.includes("gain") || msg.includes("profit") || msg.includes("réussi") || msg.includes("valide") || msg.includes("win")) {
      const winOptions = [
        `UN GAIN ? NE SOURIS PAS TROP VITE ! L'excès de confiance est le baiser de la mort. Était-ce un setup A+ validé sur un FVG clair en Killzone ? Si non : tu n'as été qu'un imbécile chanceux, et les imbéciles chanceux finissent toujours ruinés !`,
        `Félicitations pour avoir appuyé sur un bouton et vu du vert. Reste humble. L'arrogance est le début du déclin. Garde ton risque sous contrôle strict à 1% maximum et protège tes gains !`,
        `Belle exécution technique sur ${lastTradeSymbol ? lastTradeSymbol : "le marché"}. Cependant, retiens bien ceci : demain, ton compteur repart à zéro. Un gain ne fait pas de toi un génie. Analyse ce qui a fonctionné et verrouille ta discipline.`,
        `Profit encaissé. Ne te réjouis pas trop vite. Le marché adore te donner un biscuit avant d'actionner la guillotine. Quel est ton plan de gestion de risque pour tes prochains trades ?`
      ];
      return winOptions[rotateIdx % winOptions.length];
    }
    // 5. TECHNICAL QUESTIONS
    if (msg.includes("comment") || msg.includes("setup") || msg.includes("fvg") || msg.includes("block") || msg.includes("apprendre") || msg.includes("aide") || msg.includes("explique") || msg.includes("ordre") || msg.includes("concept")) {
      const questionOptions = [
        `Tu veux de la technique ? Écoute attentivement : tu dois cartographier tes structures H1/H4, chasser la liquidité externe (BSL/SSL), attendre un bris de structure (MSS) en M5 avec déplacement, puis entrer sur le FVG optimal. Mais dis-moi : as-tu la patience d'attendre ces niveaux premium ou discounts, ou es-tu un amateur impulsif ?`,
        `Les Smart Money Concepts (SMC) exigent une rigueur chirurgicale. On ne trade pas pour passer le temps ! Tu identifies les blocs de contrats (Order Blocks) de haute probabilité créés par les institutions lors des Killzones de Londres ou NY. Est-ce que tu as déjà formalisé ce protocole de confirmation ou tu t'en remets au hasard ?`,
        `Un bloc d'ordres ne vaut rien si le flux d'ordres supérieur (Order Flow) est contre toi. Comment valides-tu tes setups ? Si ça ne repose pas sur une prise de liquidité d'une session précédente, c'est du bruit de marché. Quel est ton protocole de confirmation exact ? Réponds ou retourne sur démo !`,
        `Pour survivre ici, tu dois maîtriser la liquidité interbancaire. Le prix se déplace uniquement d'un déséquilibre à une zone de liquidité. Explique-moi ce qu'est une Optimal Trade Entry (OTE) avec Fibonacci, ou va plutôt travailler dans la restauration rapide !`
      ];
      return questionOptions[rotateIdx % questionOptions.length];
    }
    // 6. GENERAL / CHAT GREETINGS
    const generalOptions = [
      `LA DISCIPLINE SANS COMPROMIS EST LA SEULE VOIE VERS LE PAYOUT. Les algorithmes d'arbitrage (IPDA) n'attendent que ton prochain clic impulsif pour raser tes stops. Actuellement, ton drawdown du jour est de ${dailyDrawdownPercent}%. Es-tu prêt à obéir à tes règles ou es-tu déjà vaincu ?`,
      `Assez parlé. Montre-moi une exécution froide, robotique et sans âme. ${lastTradeRep} Quel est ton levier et ton plan de risque de survie exact pour les prochaines 24h ?`,
      `Je me contrefiche de tes états d'âme. Ce qui m'importe, c'est ton drawdown et ton taux de réussite (${winRate}%). Chaque trade hors plan est une trahison psychiatrique. Mets tes émotions de côté et concentre-toi !`,
      `La rentabilité ne dépend pas d'indicateurs miracles, mais d'une rigueur militaire. Vas-tu attendre calmement l'ouverture de la prochaine Killzone ou vas-tu continuer à cliquer comme un joueur de casino malade ?`
    ];
    return generalOptions[rotateIdx % generalOptions.length];
  }
}

app.post("/api/gemini/coach-chat", async (req, res) => {
  const { messages, trades, startingBalance, currency, activeAccount, language } = req.body;

  const finalStartingBalance = Number(startingBalance) || 100000;
  const finalCurrency = currency || "USD";
  const finalLang = language || "fr";

  const totalTrades = Array.isArray(trades) ? trades.length : 0;
  const closedTrades = Array.isArray(trades) ? trades.filter((t: any) => t.status === "CLOSED") : [];
  const winningTrades = closedTrades.filter((t: any) => (t.pnl || 0) > 0).length;
  const winRate = closedTrades.length > 0 ? ((winningTrades / closedTrades.length) * 100).toFixed(1) : "0.0";
  const currentPnL = closedTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0);
  const currentBalance = finalStartingBalance + currentPnL;

  const dailyDrawdownAmount = currentPnL < 0 ? Math.abs(currentPnL) : 0;
  const dailyDrawdownPercent = finalStartingBalance > 0 ? ((dailyDrawdownAmount / finalStartingBalance) * 100).toFixed(2) : "0.0";

  const activeAccountName = activeAccount?.name || "Compte Standard";
  const activeAccountFirm = activeAccount?.firmOrBrokerName || "PropFirm";

  const sortedClosedTrades = [...closedTrades].sort((a: any, b: any) => {
    const timeA = new Date(a.closedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.closedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
  const recentTradesList = sortedClosedTrades.slice(0, 5);
  const recentTradesSummary = recentTradesList.length > 0
    ? recentTradesList.map((t: any, i: number) => {
        return `- Trade #${i+1}: ${t.symbol} ${t.direction} | PnL = ${t.pnl || 0} ${finalCurrency} | Entrée: ${t.entryPrice || 'N/A'} | SL: ${t.stopLoss || 'N/A'} | TP: ${t.takeProfit || 'N/A'} | Sortie: ${t.exitPrice || 'N/A'} | Setup: ${t.setup || 'N/A'} | Tags: ${[...(t.mistakeTags || []), ...(t.psychologyTags || [])].join(', ') || 'Aucun'} | Notes: ${t.notes || 'Aucune'}`;
      }).join("\n")
    : "Aucun trade clôturé récemment dans le journal.";

  // Safe recovery mechanism if no key or Gemini error
  if (!hasValidGeminiKey()) {
    const lastUserMsg = Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1]?.text || "" : "";
    const fallbackText = getCoachChatFallback(lastUserMsg, finalLang, dailyDrawdownPercent, winRate, recentTradesList);
    res.json({ reply: fallbackText });
    return;
  }

  // Map and normalize messages to Gemini alternating role format (user -> model -> user -> model)
  const rawMapped = (messages || []).map((msg: any) => ({
    role: msg.sender === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text || "" }]
  }));

  // Collapse consecutive messages of the same role to conform to standard WebRTC/Gemini protocols
  const mappedContents: any[] = [];
  for (const m of rawMapped) {
    if (mappedContents.length === 0) {
      mappedContents.push(m);
    } else {
      const last = mappedContents[mappedContents.length - 1];
      if (last.role === m.role) {
        last.parts[0].text += "\n" + m.parts[0].text;
      } else {
        mappedContents.push(m);
      }
    }
  }

  // Ensure history has correct turn-taking (always starts with user)
  if (mappedContents.length === 0) {
    mappedContents.push({ role: 'user', parts: [{ text: "Bonjour." }] });
  } else if (mappedContents[0].role !== 'user') {
    mappedContents.unshift({ role: 'user', parts: [{ text: "Bonjour." }] });
  }

  let systemInstruction = "";

  if (finalLang === "en") {
    systemInstruction = `You are the Elite Coach / Savage Drill Sergeant of PropFlow, specializing in institutional trading (SMC/ICT concepts: Smart Money Concepts & Inner Circle Trader).
Your supreme and only goal is to make this trader profitable by destroying their ego, instilling absolute iron discipline, and forcing them to strictly protect their capital.

★★★★ CRITICAL / NO REPETITION RULE ★★★★
You are STRICTLY FORBIDDEN from repeating the same sentence structures, opening greetings, or coaching clichés over and over. Avoid reciting predictable boilerplate scold phrases in a loop.
Analyze precisely what the user just said in their message, evaluate its technical legitimacy and logic. Give a highly tech-savvy, direct, precise and mathematical response using actual SMC/ICT concepts, and then apply your demanding, severe professor tone. Vary your phrases and vocabulary for a real live human co-pilot simulation.

Here is the REAL-TIME data of their trading account:
- Current Capital Balance: ${currentBalance} ${finalCurrency} (Account Name: "${activeAccountName}" via "${activeAccountFirm}")
- Today's Drawdown Consumption: ${dailyDrawdownPercent}% of starting balance (${finalStartingBalance} ${finalCurrency})
- Win Rate: ${winRate}% (on ${closedTrades.length} closed trades)
- Cumulative PnL: ${currentPnL} ${finalCurrency}
- The 5 most recently closed trades (analyze these for recurring errors or patterns of loss):
${recentTradesSummary}

Absolute behavior guidelines:
1. SAVAGE & COLD TONE: Highly demanding, cynical, direct, and completely unfiltered. Use all caps (SHOUTING) if they complain, exhibit FOMO/revenge trading, make excuses, or try to bend risk rules. Do NOT use artificial AI helper templates (never write "As an AI...", "I am happy to...", get straight into the mud). Remember: 95% of traders fail due to psychological weakness. Remind them of this constantly.
2. RECURRING ERRORS & PAST TRADES CITATIONS: You must analyze the list of their recent trades to identify patterns of failure (e.g. repeated losses on EURUSD, trading a Fair Value Gap setup without confirmations, forgetting to set stop losses, or running bad risk-reward ratios). You must explicitly cite specific examples of their past trades from the provided list to back up your critiques (e.g., "You keep talking about H1 FVG, but you just lost 3 times of capital on GBPUSD because you entered without waiting for NY session confirmation. Do you expect me to accept this trash performance?"). Vary your phrasing, avoid repeating the exact same canned lines, and dynamically match the user's current dialog state.
3. OPERATIONAL STANDARDS (SMC/ICT): Their entire trading survival depends on high-probability liquidity sweeps (BSL/SSL), trading only during institutional sessions (London/NY Killzones), observing Market Structure Shifts (MSS/BOS), and executing strictly on Fair Value Gaps (FVG) or high quality Order Blocks in discount/premium areas. Any trade outside this protocol is a crime against capital.
4. LIVE DIALOGUE ADAPTATION & TECHNICAL QUESTIONS:
- If they ask a technical trading question: Explain with precise professional SMC/ICT terms, but ALWAYS conclude with a provocative question or a direct challenge to force them to analyze their own flaws (e.g., "Explain to me how you specify order blocks in discount versus premium territory, or are you just guessing like an retail amateur?").
- If they complain about a loss: Roasted them. Remind them that losing while following the plan is normal, but whining is for losers.
- If they brag about a lucky trade outside the plan: DO NOT congratulate them. Call them a "lucky fool" or "lucky idiot" and warn them that this bad habit will blow their account next time.
- If they followed the plan perfectly on a loss: Encourage them. Tell them that taking structured losses is professional.
- If they won inside the plan: Validate their execution, but tell them to stay humble because overconfidence is the invisible killer.
5. RESPONSE FORMAT: Direct, impact-driven, punchy responses. Maximum size 150-250 words. Do not write boring essays, keep it razor-sharp.`;
  } else {
    systemInstruction = `Tu es le Coach d'Élite / Sergent-Chef Impitoyable de PropFlow, spécialisé dans la discipline militaire du trading institutionnel (concepts SMC et ICT - Smart Money Concepts et Inner Circle Trader).
Ton but unique et suprême est de rendre ce trader rentable en détruisant son ego, en lui instillant une discipline de fer et en le forçant à respecter scrupuleusement son plan et sa gestion des risques.

★★★★ CRÈGLES DE SURVIE / INTERDICTION STRICTE DE RÉPÉTITIONS ★★★★
Il t'est STRICTEMENT INTERDIT de répéter en boucle les mêmes structures de phrases, tournures d'introductions ("soldat ! / recrue ! / dans l'arène graphique") ou reproches tout au long du dialogue. Éloigne-toi absolument du comportement d'un chatbot classique qui réutilise sans cesse les mêmes leçons prémâchées.
Analyse précisément et intelligemment ce que l'utilisateur vient d'écrire ou de soumettre. Réponds-y de manière claire, technique et logique en utilisant toute l'étendue de l'arsenal SMC/ICT (IPDA, FVG, MSS, BOS, Killzones, OTE, sweeps, discount/premium ranges), puis applique ton ton sévère et cynique de professeur exigeant sans paraphraser ou radoter tes réponses antérieures.

Voici les informations réelles et actualisées de son compte de trading :
- Licence de capital actuelle : ${currentBalance} ${finalCurrency} (Compte: "${activeAccountName}" chez "${activeAccountFirm}")
- Drawdown actuel consommé : ${dailyDrawdownPercent}% du capital initial de ${finalStartingBalance} ${finalCurrency}
- Taux de réussite (Win Rate) : ${winRate}% (sur ${closedTrades.length} trades clôturés)
- Somme totale du PnL cumulé : ${currentPnL} ${finalCurrency}
- Les 5 derniers trades clôturés récemment (à analyser pour des erreurs récurrentes ou patterns de pertes) :
${recentTradesSummary}

Voici tes règles de comportement absolues :
1. TON ET SÉVÉRITÉ : Tu es extrêmement exigeant, direct, cynique et impitoyable. Tu cries (en MAJUSCULES) s'il se plaint, s'il fait preuve de FOMO ou de revenge trading, s'il cherche des excuses ou s'il essaie de négocier les règles de risque. Tu n'utilises aucun mot inutile de politesse artificielle (ne dis jamais "En tant qu'IA...", "Je suis ravi de t'aider...", sois directement dans l'arène graphique). Rappelle-lui que 95% des traders échouent à cause de l'indiscipline et qu'il se comporte comme un amateur si son journal est brouillon.
2. ANALYSE DES ERREURS RÉCURRENTES & CITATION DES TRADES PASSÉS : Tu dois impérativement analyser la liste de ses derniers trades pour y chercher des schémas d'échecs (ex: pertes répétées sur EURUSD, utilisation d'un setup de Fair Value Gap sans confirmation, oubli récurrent du stop loss, mauvais ratio gain/perte). Tu dois citer des exemples précis de ses trades passés pour illustrer tes critiques et tes furies (ex: "Tu parles encore de FVG H1, mais récemment sur ton Trade #1 sur GBPUSD, tu t'es fait sortir à cause d'un stop serré ridicule sans structure. Tu ne comprends vraiment rien ?"). Ne te répète pas dans tes phrases d'une réponse à l'autre. Varie tes tournures et adapte-toi précisément au flux immédiat de la discussion.
3. RIGUEUR OPÉRATIONNELLE (SMC/ICT) : Tout son succès repose sur la rigueur opérationnelle : chasser exclusivement la liquidité et les arrêts (Liquidity Sweeps / BSL / SSL), attendre précisément l'ouverture et les distributions des Killzones (Londres/New York), observer le bris de structure (MSS/BOS) et exécuter uniquement sur les FVG (Fair Value Gaps) ou les blocs de contrats (Order Blocks) de haute probabilité. Tout trade en dehors de ces paramètres est qualifié de CRIME.
4. ADAPTATION EN DIRECT & QUESTIONS TECHNIQUES :
- S'il pose une question de trading : Réponds de manière technique et structurée avec la précision SMC/ICT interbancaire, mais conclus TOUJOURS ta réponse par une question provocante ou un défi cinglant pour le pousser à réfléchir par lui-même et à s'améliorer (ex: "Quel est l'impact d'un OTE en Premium si tu n'as pas liquidé l'Asian High avant ? Réponds ou retourne sur simulateur !").
- S'il se plaint d'une perte : Recadre-le. Perdre de l'argent en respectant le plan est normal, mais chouiner est indigne d'un pro.
- S'il se vante d'un gain chanceux hors plan : Ne le félicite surtout PAS. Dis-lui que c'est un "imbécile chanceux" et qu'il finira ruiné.
- S'il a fait un trade gagnant dans le plan : Valide la technique mais garde-le sous tension. L'excès de confiance est mortel.
5. FORMAT DE RÉPONSE : Des réponses percutantes, directes, courtes. Maximum 150-250 mots. Pas de dissertation inutile, sois tranchant et percutant comme un couperet.`;
  }

  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: mappedContents,
      config: {
        systemInstruction,
        temperature: 1.0,
      }
    });

    res.json({ reply: response.text || "La discipline n'a pas pu être formulée." });
  } catch (error: any) {
    handleGeminiCallError("coach-chat", error);
    const lastUserMsg = Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1]?.text || "" : "";
    const fallbackText = getCoachChatFallback(lastUserMsg, finalLang, dailyDrawdownPercent, winRate, recentTradesList);
    res.json({ reply: fallbackText });
  }
});

// 4. API: Encrypt Backup
app.post("/api/backup/encrypt", (req, res) => {
  try {
    const { dataPayload, passphrase } = req.body;
    if (!dataPayload || !passphrase) {
      res.status(400).json({ error: "dataPayload et passphrase requis." });
      return;
    }

    // Hash passphrase with scrypt to obtain a stable key
    const key = crypto.scryptSync(passphrase, 'trading-salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(typeof dataPayload === 'string' ? dataPayload : JSON.stringify(dataPayload), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    res.json({
      success: true,
      iv: iv.toString('hex'),
      encryptedData: encrypted
    });
  } catch (err: any) {
    res.status(500).json({ error: "Échec du cryptage: " + err.message });
  }
});

// 5. API: Decrypt Backup
app.post("/api/backup/decrypt", (req, res) => {
  try {
    const { encryptedData, iv, passphrase } = req.body;
    if (!encryptedData || !iv || !passphrase) {
      res.status(400).json({ error: "Données requises manquantes pour le décryptage." });
      return;
    }

    const key = crypto.scryptSync(passphrase, 'trading-salt', 32);
    const ivBuffer = Buffer.from(iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, ivBuffer);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    try {
      res.json({ success: true, decryptedData: JSON.parse(decrypted) });
    } catch {
      res.json({ success: true, decryptedData: decrypted }); // return as raw if not JSON
    }
  } catch (err: any) {
    res.status(400).json({ error: "Passphrase incorrecte ou données de sauvegarde corrompues." });
  }
});

// 5.5. NOWPayments Monetization & Webhook endpoints
app.post("/api/nowpayments/invoice", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "L'identifiant de l'utilisateur (userId) est requis." });
      return;
    }

    let apiKey = process.env.NOWPAYMENTS_API_KEY;
    if (!apiKey || apiKey.trim() === "" || apiKey === "undefined") {
      apiKey = "KZ6P654-0TDMKEH-K8BZKF7-B1DBWBM";
    }
    const apiUrl = "https://api.nowpayments.io/v1/invoice";

    // Build self-referential redirect urls dynamically based on request to avoid localhost mismatch in production
    const origin = req.headers.referer ? new URL(req.headers.referer).origin : (process.env.APP_URL || "http://localhost:3000");

    const payload = {
      price_amount: 5,
      price_currency: "usd",
      order_id: userId,
      order_description: "Abonnement PropFlow Premium",
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=cancel`
    };

    console.log("Creating NOWPayments invoice on server side. Payload:", JSON.stringify(payload), "URL:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("NOWPayments invoice creation server error response:", errorText, "Status:", response.status);
      res.status(response.status).json({ 
        error: "Échec de la communication avec NOWPayments API (status: " + response.status + ")",
        details: errorText
      });
      return;
    }

    const data = await response.json();
    console.log("NOWPayments invoice created successfully! Response data:", JSON.stringify(data));
    res.json(data);
  } catch (error: any) {
    console.error("NOWPayments invoice server block try-catch error:", error);
    res.status(500).json({ 
      error: error.message || "Une erreur interne est survenue lors du traitement du paiement.",
      stack: error.stack
    });
  }
});

app.post("/api/nowpayments/webhook", async (req, res) => {
  try {
    const receivedSignature = req.headers["x-nowpayments-sig"];
    if (!receivedSignature) {
      console.warn("[Webhook] Reçu sans en-tête x-nowpayments-sig.");
      res.status(400).json({ error: "L'en-tête de signature x-nowpayments-sig est requis." });
      return;
    }

    const payload = req.body;
    if (!payload || Object.keys(payload).length === 0) {
      console.warn("[Webhook] Reçu avec un corps de requête vide.");
      res.status(400).json({ error: "Le corps de la requête ne peut pas être vide." });
      return;
    }

    // Récupérer la clé secrète IPN NOWPayments
    let ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
    if (!ipnSecret || ipnSecret.trim() === "" || ipnSecret === "undefined") {
      ipnSecret = "m9CIx2jfuTDSK3YB5DQb5OiCx14YzkNP";
    }

    // Calculer la signature HMAC SHA-512 sur le payload trié par ordre alphabétique
    const sortedPayload: any = {};
    Object.keys(payload).sort().forEach(key => {
      sortedPayload[key] = payload[key];
    });

    const sortedStringified = JSON.stringify(sortedPayload);
    const hmac = crypto.createHmac("sha512", ipnSecret);
    hmac.update(sortedStringified);
    const calculatedSignature = hmac.digest("hex");

    console.log("[Webhook NOWPayments Debug] Signature reçue :", receivedSignature);
    console.log("[Webhook NOWPayments Debug] Signature calculée :", calculatedSignature);

    if (calculatedSignature !== receivedSignature) {
      console.error("[Webhook] Échec de la vérification de la signature IPN !");
      res.status(401).json({ error: "Signature IPN de sécurité invalide." });
      return;
    }

    const { order_id, payment_status } = payload;
    console.log(`[Webhook] Signature vérifiée avec succès ! Commande: ${order_id}, Statut: ${payment_status}`);

    // Si le paiement est complété avec succès (finished ou confirmed)
    if (order_id && (payment_status === "finished" || payment_status === "confirmed")) {
      console.log(`[Webhook] Initialisation de la mise à jour Firestore Admin pour l'utilisateur: ${order_id}`);
      
      const adminModule = await import("firebase-admin");
      // Gérer la résolution CommonJS / ES Modules pour la compatibilité à l'exécution
      const firebaseAdmin: any = adminModule.default && typeof adminModule.default.initializeApp === "function" 
        ? adminModule.default 
        : adminModule;

      if (firebaseAdmin.apps.length === 0) {
        firebaseAdmin.initializeApp({
          projectId: "propflow-fdc96"
        });
      }
      
      const firestoreAdmin = firebaseAdmin.firestore();
      const userDocRef = firestoreAdmin.collection("users").doc(order_id);

      // Traiter la mise à jour par transaction ou set fusionné
      await firestoreAdmin.runTransaction(async (transaction: any) => {
        const docSnap = await transaction.get(userDocRef);
        if (!docSnap.exists) {
          console.warn(`[Webhook] Utilisateur ${order_id} non trouvé dans Firestore. Création d'un profil de base.`);
          transaction.set(userDocRef, {
            uid: order_id,
            isPremium: true,
            premiumActivatedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        } else {
          transaction.update(userDocRef, {
            isPremium: true,
            premiumActivatedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      });

      console.log(`[Webhook] Firestore Admin: Utilisateur ${order_id} promu Premium avec succès.`);
      res.json({ success: true, message: "Utilisateur promu Premium avec succès." });
    } else {
      console.log(`[Webhook] Statut de paiement '${payment_status}' reçu pour '${order_id}'. Pas d'action premium requise (confirmed/finished attendus).`);
      res.json({ success: true, message: "Webhook reçu sans modification de statut requise (confirmed ou finished non reçus)." });
    }
  } catch (error: any) {
    console.error("[Webhook] Échec critique du traitement du Webhook NOWPayments:", error);
    res.status(500).json({ error: error.message || "Une erreur interne est survenue lors du traitement du Webhook." });
  }
});

// Fallback helper for macro-economic analyze-news endpoint 
function getNewsAnalysisFallback(newsName: string, previousValue: string, forecastValue: string, actualValue: string, globalImpact: string, marketReaction: string): string {
  const isPositiveUSD = globalImpact === 'POSITIF_USD';
  return `### 🌐 ACCUEIL : EXPLICATION MAJEURE

L'annonce macro-économique **${newsName}** fait l'objet d'une attention rigoureuse de la part des teneurs de marché (*Market Makers*) et des institutions financières mondiales. 
Dans la configuration actuelle :
- **Valeur Précédente :** \`${previousValue}\`
- **Valeur Prévue (Forecast) :** \`${forecastValue}\`
- **Valeur Réelle Constatée (Actual) :** \`**${actualValue}**\`

L'écart constaté révèle un consensus ${isPositiveUSD ? 'favorable' : 'défavorable'} pour l'économie américaine. L'impact global est catégorisé comme **${isPositiveUSD ? 'BULLISH USD' : 'BEARISH USD'}**, entraînant une réévaluation immédiate de la valeur du dollar sur l'échelle de l'algorithme IPDA. L'injection soudaine de volume vise à combler les déséquilibres bidirectionnels créés dans les carnets d'ordres institutionnels.

---

### ⏳ HORIZON TEMPOREL & FLUIDITÉ DE LIQUIDITÉ

Cette annonce produit un impact de **Moyen Terme** à **Long Terme** :
1. **Court Terme (0 à 4 heures) :** Haute volatilité immédiate. Balayage systématique de la liquidité présente au-dessus des sommets de session (*Buy-side Liquidity*) ou en dessous des creux (*Sell-side Liquidity*) sur les graphiques intraday (m1, m5, m15). C'est le terrain de chasse idéal des algorithmes haute fréquence.
2. **Moyen Terme (La journée) :** Clôture de la bougie journalière (Daily Candle expansion). L'action des prix va généralement s'orienter dans la direction du déséquilibre macro-économique majeur si l'écart est prononcé.
3. **Long Terme (Semaines à mois) :** Redéfinition de l'Order Flow institutionnel global. Les banques centrales ajusteront leurs allocations dans ces zones d'inefficacité majeures à la suite de la publication.

---

### 🎯 SCÉNARIO DE TRADING PRÉCIS (XAU/USD & DXY)

Voici le guide tactique pour aborder cet événement selon les principes de la Smart Money (SMC) et d'ICT :

1. **Sur le DXY (Index Dollar)** :
   - En cas d'impact **BULLISH USD** (${isPositiveUSD ? 'Confirmé ici' : 'Alternatif'}): Attendez le retracement du DXY vers un **Fair Value Gap (FVG)** de niveau H1 ou un **Order Block (OB)** haussier créé durant l'impulsion de la news. Cherchez l'alignement des prix pour soutenir l'expansion haussière vers le prochain niveau de liquidité majeure (*Premium Liquidity*).
   - En cas d'impact **BEARISH USD**: L'Index Dollar subira une purge de liquidité. Recherchez un bris de structure baissier (*MSS*) après un balayage de stop-loss haussier d'Asie ou de Londres.

2. **Sur le XAU/USD (Or / Or)** :
   - L'or évolue en corrélation inverse étroite avec le DXY. Durant la **Killzone de New York (13:00 - 16:00 UTC)**, surveillez le comportement du prix lors du contact avec un niveau clé de support/résistance journalier ou hebdomadaire.
   - **Tactique SMC :** Ne prenez aucune position durant les 15 premières minutes de volatilité irrationnelle. Laissez les teneurs de marché chasser les stops des détaillants (*Judas Swing*). Attendez un balayage net de liquidité (*Liquidity Sweep*), suivi d'un transfert de structure sur m1 ou m5 avec création d'un **Displacement** haussier ou baissier laissant un FVG béant. Entrez sur le test du FVG (retracement à 50% de la patte d'impulsion, niveau Premium/Discount optimal d'OTE) avec un stop placé sous le creux/sommet de manipulation. Visez la liquidité opposée de session.`;
}

// 6. Integrate Server with Vite or static production bundles
async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap();
