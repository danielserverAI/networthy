export type AccountType = 
  | 'checkings'
  | 'savings'
  | 'cash'
  | 'investment'
  | 'crypto'
  | 'real_estate'
  | 'other_assets'
  | 'liability';

export interface BalanceEntry {
  date: string;
  balance: number;
}

export interface Account {
  id: string;
  institution: string;
  name?: string;
  type: AccountType;
  balanceHistory: BalanceEntry[];
  category?: string;
  tags: string[];
  notes?: string;
  order: number;
}

export interface NetWorthSnapshot {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accounts: Account[];
}

export interface FinancialInsight {
  type: 'warning' | 'suggestion' | 'achievement';
  message: string;
  metric?: string;
  change?: number;
} 