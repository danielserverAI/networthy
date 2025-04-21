export type NetWorthSnapshot = {
  id: string;
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  accounts: {
    id: string;
    balance: number;
  }[];
}; 