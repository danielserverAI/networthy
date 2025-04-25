import { useMemo, useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip
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

// Helper to truncate text with ellipsis
const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
};

// Custom label renderer for pie slices
const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, percent, name, viewBox } = props;
  
  const RADIAN = Math.PI / 180;
  
  // Skip small segments
  if (percent < 0.02) return null;

  // Detect mobile and set initial parameters
  const isMobile = (viewBox?.width ?? 0) < 400;

  // Calculate label position based on angle
  const angle = -midAngle * RADIAN;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  
  // Adjust radius based on position in the circle
  const isTopOrBottom = Math.abs(sin) > 0.7;
  const baseRadius = isTopOrBottom ? 1.5 : 1.35;
  let labelRadius = outerRadius * (isMobile ? baseRadius * 0.85 : baseRadius);

  // For labels in the same quadrant, add some spacing
  const quadrant = Math.floor((midAngle + 360) % 360 / 90);
  labelRadius += (quadrant % 2) * 0.1 * outerRadius;

  // Calculate final position
  const x = cx + labelRadius * cos;
  const y = cy + labelRadius * sin;

  // Determine text anchor and offset
  const textAnchor = cos > 0 ? 'start' : 'end';
  const xOffset = cos > 0 ? (isMobile ? 5 : 8) : (isMobile ? -5 : -8);
  
  // Add y-offset for near-horizontal labels
  const yOffset = Math.abs(sin) < 0.3 ? (isMobile ? 10 : 15) : 0;
  
  // Truncate name based on screen size
  const maxLength = isMobile ? 10 : 15;
  const truncatedName = truncateText(name, maxLength);
  const percentText = `${(percent * 100).toFixed(0)}%`;

  // Calculate leader line points
  const startPoint = {
    x: cx + outerRadius * cos,
    y: cy + outerRadius * sin
  };
  
  // Control point for the curved leader line
  const controlPoint = {
    x: cx + (labelRadius * 0.65) * cos,
    y: cy + (labelRadius * 0.65) * sin + yOffset * 0.5
  };
  
  return (
    <g>
      <path
        d={`
          M ${startPoint.x},${startPoint.y}
          Q ${controlPoint.x},${controlPoint.y}
          ${x},${y + yOffset}
        `}
        stroke="#9CA3AF"
        strokeWidth={isMobile ? 0.75 : 1}
        fill="none"
        strokeDasharray={isMobile ? "2 2" : "3 3"}
        className="dark:stroke-gray-600"
      />
      
      <text 
        x={x + xOffset} 
        y={y + yOffset} 
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="text-base font-semibold text-gray-900 dark:text-white"
        style={{ 
          fill: 'currentColor',
          fontFamily: 'inherit',
          whiteSpace: 'pre',
          fontSize: isMobile ? '0.75rem' : '0.875rem'
        }}
      >
        <title>{name}</title>
        {truncatedName}
      </text>
      <text 
        x={x + xOffset} 
        y={y + yOffset + (isMobile ? 12 : 14)} 
        textAnchor={textAnchor}
        dominantBaseline="central"
        className="text-gray-500 dark:text-gray-400"
        style={{ 
          fill: 'currentColor',
          fontFamily: 'inherit',
          whiteSpace: 'pre',
          fontSize: isMobile ? '0.625rem' : '0.75rem'
        }}
      >
        {percentText}
      </text>
    </g>
  );
};

// Type for the grouping key
type GroupingKey = 'institution' | 'type' | 'category';

const AssetAllocationChart = () => {
  const { state } = useNetWorth();
  const { accounts } = state;
  const { totalAssets } = useNetWorthCalculations();
  const [currentGroupBy, setCurrentGroupBy] = useState<GroupingKey>('institution');
  
  // Add mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  // Add tooltip styles
  useEffect(() => {
    const tooltipStyles = document.createElement('style');
    tooltipStyles.textContent = `
      :root {
        --tooltip-bg: rgba(255, 255, 255, 0.95);
        --tooltip-border: 1px solid #e5e7eb;
      }
      
      .dark {
        --tooltip-bg: rgba(31, 41, 55, 0.95);
        --tooltip-border: 1px solid #374151;
      }
    `;
    document.head.appendChild(tooltipStyles);
    return () => tooltipStyles.remove();
  }, []);

  // Update mobile state on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
          name: key,
          value: currentBalance,
        });
      }
    });

    // Convert to array and sort by value
    let sortedData = Array.from(dataMap.values()).sort((a, b) => b.value - a.value);
    
    // Calculate total value for percentage calculation
    const total = sortedData.reduce((sum, item) => sum + item.value, 0);
    
    // Separate items into main and small segments (less than 2%)
    const mainSegments = [];
    let otherValue = 0;
    
    for (const item of sortedData) {
      const percentage = item.value / total;
      if (percentage >= 0.02) {
        mainSegments.push(item);
      } else {
        otherValue += item.value;
      }
    }
    
    // Add "Other" category if there are small segments
    if (otherValue > 0) {
      mainSegments.push({
        name: 'Other',
        value: otherValue
      });
    }

    return mainSegments;
  }, [accounts, currentGroupBy]);

  // Assign colors using the helper function based on the group name
  const dataWithColors = pieChartData.map((entry) => ({
    ...entry,
    fill: entry.name === 'Other' 
      ? '#9CA3AF' // Use a neutral gray for "Other"
      : stringToHslColor(entry.name, 70, 60)
  }));

  // Simplified title
  const chartTitle = 'Allocation';

  return (
    <div className="card border border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header with Title and Dropdown */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{chartTitle}</h3> 
        <div className="flex space-x-2">
          {(['institution', 'type', 'category'] as GroupingKey[]).map((grouping) => (
            <button
              key={grouping}
              onClick={() => setCurrentGroupBy(grouping)}
              className={`px-3 py-1 text-sm rounded-md ${
                currentGroupBy === grouping
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {grouping.charAt(0).toUpperCase() + grouping.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      {dataWithColors.length > 0 ? (
        <div className="w-full flex-grow relative" style={{ overflow: 'visible' }}> 
          <ResponsiveContainer width="100%" height="100%">
            <PieChart 
              margin={{ 
                top: 30, 
                right: 60, 
                bottom: 30, 
                left: 60 
              }}
              className="sm:scale-100 scale-90" 
              style={{ overflow: 'visible' }}
            > 
              <Pie
                data={dataWithColors}
                dataKey="value"
                nameKey="name"
                cx="50%" 
                cy="50%"
                innerRadius="45%" 
                outerRadius="65%"
                paddingAngle={isMobile ? 2 : 3}
                minAngle={2}
                labelLine={false}
                label={renderCustomizedLabel}
                isAnimationActive={false}
                style={{ overflow: 'visible' }}
              >
                {dataWithColors.map((entry, index) => {
                  const color = entry.name === 'Other' 
                    ? '#9CA3AF'
                    : stringToHslColor(entry.name, 65, 55);
                  return (
                    <Cell 
                      key={`cell-${index}-${currentGroupBy}`} 
                      fill={color}
                      stroke="none"
                      style={{
                        filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.1))',
                        overflow: 'visible'
                      }}
                    />
                  );
                })}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [
                  <div key="tooltip-value" className="flex flex-col gap-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(value)}</span>
                    <span className="text-gray-600 dark:text-gray-400">{totalAssets > 0 ? ((value / totalAssets) * 100).toFixed(1) : 0}% of total</span>
                  </div>,
                  null
                ]}
                contentStyle={{
                  backgroundColor: 'var(--tooltip-bg)',
                  border: 'var(--tooltip-border)',
                  borderRadius: '0.5rem',
                  padding: '0.75rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                } as React.CSSProperties}
                cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}
                wrapperStyle={{ 
                  outline: 'none', 
                  overflow: 'visible'
                } as React.CSSProperties}
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