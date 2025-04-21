import React from 'react';
import { Account, BalanceEntry } from '../types';
import { format, parseISO } from 'date-fns';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface AccountProgressionProps {
  account: Account;
}

// Helper to format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function AccountProgression({ account }: AccountProgressionProps) {
  // Prepare data for the chart
  const chartData = account.balanceHistory
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((entry: BalanceEntry) => ({
      date: format(parseISO(entry.date), 'MMM d, yyyy'),
      balance: entry.balance,
    }));

  if (chartData.length < 2) {
    return (
      <div className="text-center py-4 text-gray-500">
        Add more balance entries to see progression
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h4 className="text-lg font-semibold text-gray-800 mb-4">
        Balance Progression
      </h4>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="balance"
              name="Balance"
              stroke={account.type === 'liability' ? '#ef4444' : '#10b981'}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 