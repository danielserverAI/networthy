// Mock data for testing chart functionality
import { NetWorthSnapshot } from './types/NetWorthSnapshot';
import { HistoricalDataPoint } from './context/NetWorthContext';
import { format, subMonths, subWeeks, subDays } from 'date-fns';

const now = new Date();

// Create mock snapshots for testing different timeframes
export const mockSnapshots: NetWorthSnapshot[] = [
  // Historical snapshots (older than 6 months)
  {
    id: '1',
    date: format(subMonths(now, 8), 'yyyy-MM-dd'),
    totalAssets: 80000,
    totalLiabilities: 20000,
    netWorth: 60000,
    accounts: []
  },
  {
    id: '2',
    date: format(subMonths(now, 7), 'yyyy-MM-dd'),
    totalAssets: 85000,
    totalLiabilities: 22000,
    netWorth: 63000,
    accounts: []
  },
  // Data within 6M range
  {
    id: '3',
    date: format(subMonths(now, 5), 'yyyy-MM-dd'),
    totalAssets: 88000,
    totalLiabilities: 23000,
    netWorth: 65000,
    accounts: []
  },
  {
    id: '4',
    date: format(subMonths(now, 4), 'yyyy-MM-dd'),
    totalAssets: 90000,
    totalLiabilities: 24000,
    netWorth: 66000,
    accounts: []
  },
  // Data within 3M range
  {
    id: '5',
    date: format(subMonths(now, 2.5), 'yyyy-MM-dd'),
    totalAssets: 92000,
    totalLiabilities: 25000,
    netWorth: 67000,
    accounts: []
  },
  {
    id: '6',
    date: format(subMonths(now, 2), 'yyyy-MM-dd'),
    totalAssets: 94000,
    totalLiabilities: 26000,
    netWorth: 68000,
    accounts: []
  },
  // Data within 1M range
  {
    id: '7',
    date: format(subWeeks(now, 3), 'yyyy-MM-dd'),
    totalAssets: 95000,
    totalLiabilities: 26500,
    netWorth: 68500,
    accounts: []
  },
  {
    id: '8',
    date: format(subWeeks(now, 2), 'yyyy-MM-dd'),
    totalAssets: 96000,
    totalLiabilities: 27000,
    netWorth: 69000,
    accounts: []
  },
  {
    id: '9',
    date: format(subWeeks(now, 1), 'yyyy-MM-dd'),
    totalAssets: 97000,
    totalLiabilities: 27500,
    netWorth: 69500,
    accounts: []
  },
  {
    id: '10',
    date: format(subDays(now, 3), 'yyyy-MM-dd'),
    totalAssets: 98000,
    totalLiabilities: 28000,
    netWorth: 70000,
    accounts: []
  },
  {
    id: '11',
    date: format(now, 'yyyy-MM-dd'),
    totalAssets: 100000,
    totalLiabilities: 30000,
    netWorth: 70000,
    accounts: []
  }
];

export const mockHistoricalData: HistoricalDataPoint[] = [
  { year: 2020, net_worth: 50000 },
  { year: 2021, net_worth: 55000 },
  { year: 2022, net_worth: 58000 },
  { year: 2023, net_worth: 62000 }
];