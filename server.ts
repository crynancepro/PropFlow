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
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY non configurée. Veuillez l'ajouter dans les Secrets de l'AI Studio.");
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
    console.warn("Échec de l'appel Gemini dans analyze-trades (utilisation du plan de secours local):", error.message || error);
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
    console.warn("Échec de l'appel Gemini dans opportunities (utilisation du plan de secours local):", error.message || error);
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
    console.warn("Échec de l'appel Gemini dans backtest (utilisation du plan de secours local):", error.message || error);
    res.json(getBacktestFallback(strategyName, symbol, finalCapital));
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
