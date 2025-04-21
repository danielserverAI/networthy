export type AccountType = 
  | 'CASH'
  | 'SAVINGS'
  | 'CHECKINGS'
  | 'INVESTMENT'
  | 'RETIREMENT'
  | 'CREDIT_CARD'
  | 'LOAN'
  | 'MORTGAGE'
  | 'OTHER';

export type BalanceEntry = {
  date: string;
  balance: number;
};

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  balanceHistory: BalanceEntry[];
  category: string;
  tags: string[];
}; 