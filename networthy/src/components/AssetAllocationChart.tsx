import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { useNetWorth, useNetWorthCalculations, getCurrentBalance } from '../context/NetWorthContext';
import { AccountType } from '../types'; // Only need AccountType if formatAccountType is kept

// Define colors here or import from a central place
const COLORS: Record<string, string> = {
  // Use institution names as keys? Or generate dynamically?
  // For now, let's use a fallback strategy with predefined colors
  default1: '#38bdf8', 
  default2: '#60a5fa', 
  default3: '#a3e635', 
  default4: '#34d399', 
  default5: '#a78bfa', 
  default6: '#f472b6', 
  default7: '#fbbf24', 
  default8: '#ef4444',
  // Add more if needed
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function AssetAllocationChart() {
  const { state } = useNetWorth();
  const { totalAssets } = useNetWorthCalculations(); // Needed for percentage calculation

  // Calculate data grouped by INSTITUTION
  const pieChartData = useMemo(() => {
    const dataMap = new Map<string, { name: string; value: number }>();

    state.accounts.forEach(account => {
      const currentBalance = getCurrentBalance(account);
      // Exclude liabilities and zero/negative balance assets
      if (account.type === 'liability' || currentBalance <= 0) return;
      
      const institution = account.institution || 'Unknown Institution'; // Fallback for missing institution
      
      const existing = dataMap.get(institution);
      if (existing) {
        existing.value += currentBalance;
      } else {
        dataMap.set(institution, {
          name: institution, // Use institution as the name key for the chart
          value: currentBalance,
        });
      }
    });

    return Array.from(dataMap.values()).sort((a, b) => b.value - a.value); // Sort descending by value
  }, [state.accounts]);

  // Assign colors dynamically or based on a predefined list
  const colorKeys = Object.keys(COLORS);
  const dataWithColors = pieChartData.map((entry, index) => ({
      ...entry,
      fill: COLORS[entry.name] || colorKeys[index % colorKeys.length] // Fallback color rotation
  }));

  return (
    <div className="card border border-gray-200 dark:border-gray-700 flex flex-col h-full">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4 shrink-0">Asset Allocation by Institution</h3>
      {dataWithColors.length > 0 ? (
        <div className="w-full flex-grow">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dataWithColors}
                dataKey="value"
                nameKey="name" 
                cx="50%" 
                cy="50%"
                innerRadius="40%" 
                outerRadius="70%" 
                paddingAngle={2}
              >
                {dataWithColors.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${formatCurrency(value)} (${totalAssets > 0 ? ((value / totalAssets) * 100).toFixed(1) : 0}%)`,
                  name, 
                ]}
              />
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingLeft: '10px' }} 
                formatter={(value: string) => (
                  <span className="text-gray-700 dark:text-gray-300 truncate max-w-[100px]" title={value}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center flex-grow text-gray-500 dark:text-gray-400">
          No asset data available.
        </div>
      )}
    </div>
  );
} 