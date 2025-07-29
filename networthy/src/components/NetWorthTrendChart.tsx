import { useMemo, useState } from 'react';
import { useNetWorth } from '../context/NetWorthContext';
import { format, parseISO, subMonths, subYears, formatISO, endOfYear } from 'date-fns';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';
import { Performance } from '../types/Performance'; // Import Performance type

// Helper to format currency (Consider moving to a utils file)
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

type TimeFrame = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export function NetWorthTrendChart() {
  const { state } = useNetWorth();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('ALL');

  // --- Net Worth Trend Data Calculation (Copied from Analytics) ---
  const netWorthTrendData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    // Determine start date based on timeFrame
    switch (timeFrame) {
      case '1M': {
        startDate = subMonths(now, 1);
        break;
      }
      case '3M': {
        startDate = subMonths(now, 3);
        break;
      }
      case '6M': {
        startDate = subMonths(now, 6);
        break;
      }
      case '1Y': {
        startDate = subYears(now, 1);
        break;
      }
      case 'ALL':
      default: {
         const earliestSnapshotDate = state.snapshots.length > 0 
            ? parseISO(state.snapshots.reduce((earliest, s) => s.date < earliest ? s.date : earliest, state.snapshots[0].date))
            : now;
         const earliestHistoricalDate = state.historicalData.length > 0
            ? new Date(state.historicalData.reduce((earliest, h) => h.year < earliest ? h.year : earliest, state.historicalData[0].year), 0, 1) // Jan 1st of earliest year
            : now;
          startDate = earliestSnapshotDate < earliestHistoricalDate ? earliestSnapshotDate : earliestHistoricalDate;
         if (state.snapshots.length === 0 && state.historicalData.length === 0) {
            startDate = subYears(now, 100); 
         }
        break;
      }
    }

    const historicalPoints = state.historicalData
        .map(dp => ({
            date: formatISO(endOfYear(new Date(dp.year, 0, 1))),
            value: dp.net_worth,
            isHistorical: true 
        }));

    const allSnapshotPoints = state.snapshots
        .map(snapshot => ({
            date: snapshot.date,
            value: snapshot.netWorth,
            isHistorical: false
        }));

    const allPoints = [...historicalPoints, ...allSnapshotPoints]
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    const filteredPoints = allPoints.filter(p => parseISO(p.date) >= startDate);
    
    if (filteredPoints.length === 0) {
        return [];
    }

    // Use different aggregation strategies based on timeframe
    const finalChartPoints: { date: string; value: number; isHistorical?: boolean }[] = [];

    // Add historical points first (always included as-is)
    filteredPoints.forEach(point => {
      if (point.isHistorical) {
        finalChartPoints.push({
          date: format(parseISO(point.date), 'yyyy-MM-dd'), 
          value: point.value,
          isHistorical: true
        });
      }
    });

    // Get only snapshot points for aggregation
    const snapshotPoints = filteredPoints.filter(p => !p.isHistorical);

    if (timeFrame === '1M') {
      // For 1M: Show individual data points (no aggregation)
      snapshotPoints.forEach(point => {
        finalChartPoints.push({
          date: format(parseISO(point.date), 'yyyy-MM-dd'),
          value: point.value,
          isHistorical: false
        });
      });
    } else if (timeFrame === '3M') {
      // For 3M: Use weekly aggregation
      const weeklyDataMap = new Map<string, { sum: number; count: number; points: number[] }>();
      
      snapshotPoints.forEach(point => {
        const pointDate = parseISO(point.date);
        // Get the start of the week (Monday)
        const startOfWeek = new Date(pointDate);
        startOfWeek.setDate(pointDate.getDate() - pointDate.getDay() + 1);
        const weekKey = format(startOfWeek, 'yyyy-MM-dd');
        
        if (!weeklyDataMap.has(weekKey)) {
          weeklyDataMap.set(weekKey, { sum: 0, count: 0, points: [] });
        }
        const weekData = weeklyDataMap.get(weekKey)!;
        weekData.sum += point.value;
        weekData.count += 1;
        weekData.points.push(point.value);
      });

      weeklyDataMap.forEach((data, weekKey) => {
        finalChartPoints.push({
          date: weekKey,
          value: data.sum / data.count,
          isHistorical: false
        });
      });
    } else if (timeFrame === '6M') {
      // For 6M: Use bi-weekly aggregation
      const biWeeklyDataMap = new Map<string, { sum: number; count: number; points: number[] }>();
      
      snapshotPoints.forEach(point => {
        const pointDate = parseISO(point.date);
        // Get bi-weekly period (every 14 days)
        const dayOfMonth = pointDate.getDate();
        const biWeeklyPeriod = dayOfMonth <= 14 ? 1 : 15;
        const biWeeklyKey = format(new Date(pointDate.getFullYear(), pointDate.getMonth(), biWeeklyPeriod), 'yyyy-MM-dd');
        
        if (!biWeeklyDataMap.has(biWeeklyKey)) {
          biWeeklyDataMap.set(biWeeklyKey, { sum: 0, count: 0, points: [] });
        }
        const biWeeklyData = biWeeklyDataMap.get(biWeeklyKey)!;
        biWeeklyData.sum += point.value;
        biWeeklyData.count += 1;
        biWeeklyData.points.push(point.value);
      });

      biWeeklyDataMap.forEach((data, biWeeklyKey) => {
        finalChartPoints.push({
          date: biWeeklyKey,
          value: data.sum / data.count,
          isHistorical: false
        });
      });
    } else {
      // For 1Y and ALL: Use monthly aggregation (original logic)
      const monthlyDataMap = new Map<string, { sum: number; count: number; points: number[] }>();
      
      snapshotPoints.forEach(point => {
        const monthKey = format(parseISO(point.date), 'yyyy-MM');
        if (!monthlyDataMap.has(monthKey)) {
          monthlyDataMap.set(monthKey, { sum: 0, count: 0, points: [] });
        }
        const monthData = monthlyDataMap.get(monthKey)!;
        monthData.sum += point.value;
        monthData.count += 1;
        monthData.points.push(point.value);
      });

      monthlyDataMap.forEach((data, monthKey) => {
        finalChartPoints.push({
          date: format(parseISO(`${monthKey}-01`), 'yyyy-MM-dd'), 
          value: data.sum / data.count, 
          isHistorical: false
        });
      });
    }

    finalChartPoints.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    return finalChartPoints;
  }, [state.snapshots, state.historicalData, timeFrame]);

  // --- Performance Calculation (Copied from Analytics, needed for summary) ---
  const performance = useMemo((): Performance | null => {
    if (netWorthTrendData.length < 2) {
      return null;
    }
    const startData = netWorthTrendData[0];
    const endData = netWorthTrendData[netWorthTrendData.length - 1];
    
    const startValue = startData.value;
    const endValue = endData.value;
    const percentageChange = startValue === 0 ? 0 : ((endValue - startValue) / startValue) * 100;

    return {
      totalReturn: endValue - startValue,
      percentageChange: percentageChange,
      timeWeightedReturn: 0, 
      annualizedReturn: 0, 
      startDate: startData.date,
      endDate: endData.date,
      startValue: startValue,
      endValue: endValue,
    };
  }, [netWorthTrendData]);


  return (
    // Add h-full here to ensure it fills the grid cell height
    <div className="card h-full flex flex-col"> 
      {/* Trend Chart Section */}
      <div className="flex justify-between items-center mb-4 shrink-0"> {/* Header part */}
        <h3 className="text-lg font-semibold text-gray-800">Net Worth Trend</h3>
        <div className="flex space-x-2">
          {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeFrame(tf)}
              className={`px-3 py-1 text-sm rounded-md ${
                timeFrame === tf
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-grow"> {/* Chart container */}
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={netWorthTrendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: '#6b7280' }}
              tickFormatter={(dateStr) => format(parseISO(dateStr), 'MMM yy')}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              width={100}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              labelFormatter={(label) => `Date: ${format(parseISO(label), 'MMM d, yyyy')}`} // Improved label format
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
              cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              name="Net Worth"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Performance Summary Section (Copied from Analytics) */}
      {performance && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap justify-around text-sm text-gray-700 dark:text-gray-300 shrink-0"> {/* Adjusted dark color */}
          <div>
            <span className="font-medium">Start ({format(parseISO(performance.startDate), 'MMM d')}): </span>
            {formatCurrency(performance.startValue)}
          </div>
          <div>
            <span className="font-medium">End ({format(parseISO(performance.endDate), 'MMM d')}): </span>
            {formatCurrency(performance.endValue)}
          </div>
          <div>
            <span className="font-medium">Change: </span>
            <span className={performance.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}>
              {formatCurrency(performance.totalReturn)} ({performance.percentageChange?.toFixed(1) ?? 0}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 