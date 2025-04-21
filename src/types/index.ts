export interface BalanceEntry {
  date: string; // ISO date string
  balance: number;
}

export type AccountType = 
  | 'checkings' 
  | 'savings' 
  | 'cash' 
  | 'investment' 
  | 'crypto' 
  | 'real_estate' 
  | 'other_assets' 
  | 'liability';

export interface Account {
  id: string;
  institution: string;
  type: AccountType;
  name?: string; // Optional custom name
  balanceHistory: BalanceEntry[]; // Make sure this line exists and uses the exported type
}

export interface NetWorthSnapshot {
  date: string; // ISO date string
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accounts: Account[]; 
} 