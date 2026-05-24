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

// 1. API: Analyze Trades
app.post("/api/gemini/analyze-trades", async (req, res) => {
  try {
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

    const finalTargetValue = targetValue !== undefined ? targetValue : (startingBalance * 0.10);
    const finalDailyDrawdown = dailyDrawdown !== undefined ? dailyDrawdown : (startingBalance * 0.05);
    const finalTotalDrawdown = totalDrawdown !== undefined ? totalDrawdown : (startingBalance * 0.10);
    const finalCurrentBalance = currentBalance !== undefined ? currentBalance : startingBalance;
    const finalCurrentPnL = currentPnL !== undefined ? currentPnL : 0;

    const prompt = `Tu es un Gestionnaire de Risque Senior et un Coach Expert pour les challenges Prop Firm (type FTMO, FundedNext, Apex, etc.). Ton unique objectif est d'aider le trader à valider son compte en gérant ses émotions et ses mathématiques, surtout en période de perte (drawdown). Ton approche est basée sur le trading institutionnel (Smart Money Concepts / ICT) et une gestion des risques ultra-stricte.

Paramètres et état actuel du compte :
- Capital de départ/initial : ${startingBalance} ${currency}
- Objectif de profit à atteindre (Target) : ${finalTargetValue} ${currency} (${((finalTargetValue / startingBalance) * 100).toFixed(1)}%)
- Drawdown Quotidien Maximum autorisé : ${finalDailyDrawdown} ${currency} (${((finalDailyDrawdown / startingBalance) * 100).toFixed(1)}%)
- Drawdown Total Maximum autorisé : ${finalTotalDrawdown} ${currency} (${((finalTotalDrawdown / startingBalance) * 100).toFixed(1)}%)
- Balance actuelle du compte : ${finalCurrentBalance} ${currency}
- Gain/Perte net cumulé (PnL global) : ${finalCurrentPnL} ${currency} (Rendement net : ${((finalCurrentPnL / startingBalance) * 100).toFixed(2)}%)

Historique des derniers trades (Optionnel mais recommandé) :
${tradesSummary.length === 0 ? "Aucun trade enregistré dans le journal pour le moment." : JSON.stringify(tradesSummary, null, 2)}

Ta tâche est de générer un "Plan de Trading et de Gestion du Risque Dynamique" très précis pour la journée d'aujourd'hui, rédigé en français sous format Markdown professionnel structuré, divisé STRICTEMENT en 3 parties claires avec des titres précis :

1. STATUT DU COMPTE ET DIAGNOSTIC :
Fais un résumé rapide de la situation. Analyse le ratio de réussite ou le drawdown actuel par rapport aux règles d'invalidation (Ex: "Tu es à +4% de ton objectif" ou "Attention, tu es en drawdown de -3% sous tension"). Donne un diagnostic honnête et motivant.

2. LE PLAN DE JEU DU JOUR (MATHÉMATIQUE) :
Calcule précisément ce que le trader a le droit de faire aujourd'hui :
- Le risque maximum autorisé pour la journée en dollars (${currency}) et en % de la balance actuelle (Ce risque doit baisser drastiquement et être ultra-protecteur si le compte est en perte pour préserver le capital !).
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
    console.error("Gemini Analyze Trades Error:", error);
    res.status(500).json({ error: error.message || "Erreur de communication avec l'IA." });
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
    console.error("Gemini Opportunities Error:", error);
    res.status(500).json({ error: error.message || "Erreur de génération d'opportunités." });
  }
});

// 3. API: Generate Backtest Simulator
app.post("/api/gemini/backtest", async (req, res) => {
  try {
    const { strategyName, symbol, startingCapital } = req.body;
    if (!strategyName || !symbol) {
      res.status(400).json({ error: "strategyName et symbol sont obligatoires." });
      return;
    }

    const ai = getGeminiClient();

    const prompt = `Génère une simulation rétroactive (backtesting) hautement réaliste pour la stratégie de trading suivante:
- Nom de la Stratégie: ${strategyName}
- Actif cible: ${symbol}
- Capital virtuel initial: ${startingCapital}

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
    console.error("Gemini Backtest Error:", error);
    res.status(500).json({ error: error.message || "Erreur de génération du backtesting." });
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
