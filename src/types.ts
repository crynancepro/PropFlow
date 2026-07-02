export interface TradingAccount {
  id: string;
  name: string;
  type: 'PROPFIRM' | 'BROKER';
  firmOrBrokerName: string;
  startingBalance: number;
  currency: string;
  createdAt: string;
  phase1TargetPercent?: number;
  phase2TargetPercent?: number;
  dailyDrawdownPercent?: number;
  maxDrawdownPercent?: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  startingBalance: number;
  currency: string;
  riskPerTrade: number; // default risk percentage (e.g. 1%)
  createdAt: string;
  updatedAt?: string;
  isPremium?: boolean; // Premium status from NOWPayments or manual toggle
}

export type TradeDirection = 'BUY' | 'SELL';
export type TradeStatus = 'OPEN' | 'CLOSED';

export interface Trade {
  id: string;
  userId: string;
  accountId?: string; // linked to a specific propfirm/broker account
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  status: TradeStatus;
  pnl?: number; // Calculated: status === 'CLOSED' ? (exit - entry) * quantity * (direction === 'BUY' ? 1 : -1) - fees : 0
  fees: number;
  notes?: string;
  setup?: string;
  rating?: number; // For trading psychology tracking (1-5 stars)
  psychologyTags?: string[]; // E.g., FOMO, Revenge Trading, Confident, Patient
  mistakeTags?: string[]; // E.g., Over-leveraging, Moved SL early, None (Disciplined)
  tradingViewImageUrl?: string; // TV chart image URL (Avant / Entrée)
  tradingViewImageExitUrl?: string; // TV chart image URL (Après / Sortie)
  economicNewsUrl?: string; // economic news URL
  createdAt: string;
  updatedAt?: string;
  closedAt?: string;
}

export interface BacktestTrade {
  id: string;
  date: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  comments: string;
}

export interface Backtest {
  id: string;
  userId: string;
  strategyName: string;
  symbol: string;
  startingCapital: number;
  simulationTrades: BacktestTrade[];
  winRate: number; // in Percentage
  profitFactor: number;
  netProfit: number; // final PnL
  totalTrades: number;
  createdAt: string;
}

export interface MarketOpportunity {
  id: string;
  symbol: string;
  timeframe: string;
  direction: TradeDirection;
  entryZone: string;
  targetZone: string;
  stopZone: string;
  rationale: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
}

export interface TradingStats {
  totalTrades: number;
  winRate: number; // %
  netProfit: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  maxDrawdown: number;
  totalWins: number;
  totalLosses: number;
  winPnLTotal: number;
  lossPnLTotal: number;
}

export interface EconomicNews {
  id: string;
  userId: string;
  name: string;
  dateTime: string;
  previousValue: string;
  forecastValue: string;
  actualValue: string;
  globalImpact: 'POSITIF_USD' | 'NEGATIF_USD';
  marketReaction: string;
  createdAt: string;
}

export interface WorkspaceLink {
  id: string;
  userId: string;
  name: string;
  url: string;
  domain: string;
  createdAt: string;
}

