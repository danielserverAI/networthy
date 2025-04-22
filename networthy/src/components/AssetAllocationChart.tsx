import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { useNetWorth, useNetWorthCalculations, getCurrentBalance } from '../context/NetWorthContext';
import { Account } from '../types';

// Color generation helper
const stringToHslColor = (str: string, s: number, l: number): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, ${s}%, ${l}%)`;
};

// Format currency helper
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Type for the grouping key
type GroupingKey = 'institution' | 'type' | 'category';

const AssetAllocationChart = () => {
  const { state } = useNetWorth();
  const { accounts } = state;
  const { totalAssets } = useNetWorthCalculations();
  // Add state for the selected grouping
  const [currentGroupBy, setCurrentGroupBy] = useState<GroupingKey>('institution');

  // Calculate data based on the internal state `currentGroupBy`
  const pieChartData = useMemo(() => {
    const dataMap = new Map<string, { name: string; value: number }>();

    accounts.forEach((account: Account) => {
      const currentBalance = getCurrentBalance(account);
      // Exclude liabilities and zero/negative balance assets for all views
      if (account.type === 'liability' || currentBalance <= 0) return;
      
      let groupKey: string | undefined;
      switch (currentGroupBy) {
        case 'institution':
          groupKey = account.institution;
          break;
        case 'type':
          // Format the type name for display
          groupKey = account.type.split('_').map((w: string) => w[0].toUpperCase() + w.slice(1)).join(' ');
          break;
        case 'category':
          groupKey = account.category;
          break;
      }
      
      // Use a fallback if the key is missing/empty
      const key = groupKey || 'Uncategorized'; 
      
      const existing = dataMap.get(key);
      if (existing) {
        existing.value += currentBalance;
      } else {
        dataMap.set(key, {
          name: key, // Use the determined key as the name for the chart
          value: currentBalance,
        });
      }
    });

    return Array.from(dataMap.values()).sort((a, b) => b.value - a.value); 
  }, [accounts, currentGroupBy]);

  // Assign colors using the helper function based on the group name
  const dataWithColors = pieChartData.map((entry) => ({
      ...entry,
      fill: stringToHslColor(entry.name, 60, 70) 
  }));

  // Dynamic title based on state
  const chartTitle = `Allocation by ${currentGroupBy.charAt(0).toUpperCase() + currentGroupBy.slice(1)}`;

  return (
    // Keep h-full on the card itself, flex-col, etc.
    <div className="card border border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header with Title and Dropdown */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{chartTitle}</h3> 
        <select
           value={currentGroupBy}
           onChange={(e) => setCurrentGroupBy(e.target.value as GroupingKey)}
           className="input input-sm py-1 text-xs"
        >
           <option value="institution">Institution</option>
           <option value="type">Type</option>
           <option value="category">Category</option>
        </select>
      </div>
      
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
                  <Cell key={`cell-${index}-${currentGroupBy}`} fill={entry.fill} /> // Use state in key
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${formatCurrency(value)} (${totalAssets > 0 ? ((value / totalAssets) * 100).toFixed(1) : 0}%)`,
                  <span key={name} className="dark:text-gray-700">{name}</span>, // Force tooltip text dark
                ]}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '0.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
                }}
                cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}
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
          No asset data available for this view.
        </div>
      )}
    </div>
  );
}

export default AssetAllocationChart; 