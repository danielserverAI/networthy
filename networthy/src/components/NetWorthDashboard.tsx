import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format, parseISO, getYear, getMonth, getDate, startOfDay } from 'date-fns';
import { useNetWorth, useNetWorthCalculations, getCurrentBalance, getLatestBalanceEntry } from '../context/NetWorthContext';
import { Account, AccountType, NetWorthSnapshot, BalanceEntry } from '../types';

const COLORS = {
  checkings: '#38bdf8', // Sky 400
  savings: '#60a5fa', // Blue 400
  cash: '#a3e635', // Lime 400
  investment: '#34d399', // Emerald 400
  crypto: '#a78bfa', // Violet 400
  real_estate: '#f472b6', // Pink 400
  other_assets: '#fbbf24', // Amber 400
  liability: '#ef4444', // Red 500
};

// Helper to format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0, // Optional: remove cents for large numbers
    maximumFractionDigits: 0,
  }).format(value);
};

export function NetWorthDashboard() {
  const { state } = useNetWorth();
  const { totalAssets, totalLiabilities, netWorth } = useNetWorthCalculations();

  // Helper to format type names for display
  const formatAccountType = (type: AccountType): string => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-8">
      {/* Summary Cards - Use current calculations based on latest balances */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Net Worth Card */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-xl shadow-lg p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-semibold opacity-90">Net Worth</h3>
            <p className="text-4xl font-bold mt-1">{formatCurrency(netWorth)}</p>
          </div>
        </div>

        {/* Assets Card */}
        <div className="card border border-gray-200">
          <h3 className="text-base font-medium text-gray-500">Total Assets</h3>
          <p className="text-3xl font-semibold text-green-600 mt-2">
            {formatCurrency(totalAssets)}
          </p>
        </div>

        {/* Liabilities Card */}
        <div className="card border border-gray-200">
          <h3 className="text-base font-medium text-gray-500">Total Liabilities</h3>
          <p className="text-3xl font-semibold text-red-600 mt-2">
            {formatCurrency(totalLiabilities)}
          </p>
        </div>
      </div>
    </div>
  );
} 