import React, { useState, useMemo } from 'react';
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
import { mockSnapshots, mockHistoricalData } from '../mockData';

// Helper to format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

type TimeFrame = '1M' | '3M' | '6M' | '1Y' | 'ALL';

export function TestChart() {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('ALL');
  const [showDebug, setShowDebug] = useState(false);

  // Net Worth Trend Data Calculation (same logic as original)
  const netWorthTrendData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    console.log(`=== Processing timeframe: ${timeFrame} ===`);

    // Determine start date based on timeFrame
    switch (timeFrame) {
      case '1M':
        startDate = subMonths(now, 1);
        break;
      case '3M':
        startDate = subMonths(now, 3);
        break;
      case '6M':
        startDate = subMonths(now, 6);
        break;
      case '1Y':
        startDate = subYears(now, 1);
        break;
      case 'ALL':
      default:
        const earliestSnapshotDate = mockSnapshots.length > 0 
          ? parseISO(mockSnapshots.reduce((earliest, s) => s.date < earliest ? s.date : earliest, mockSnapshots[0].date))
          : now;
        const earliestHistoricalDate = mockHistoricalData.length > 0
          ? new Date(mockHistoricalData.reduce((earliest, h) => h.year < earliest ? h.year : earliest, mockHistoricalData[0].year), 0, 1)
          : now;
        startDate = earliestSnapshotDate < earliestHistoricalDate ? earliestSnapshotDate : earliestHistoricalDate;
        if (mockSnapshots.length === 0 && mockHistoricalData.length === 0) {
          startDate = subYears(now, 100); 
        }
        break;
    }

    console.log(`Start date for ${timeFrame}:`, startDate);

    const historicalPoints = mockHistoricalData
      .map(dp => ({
        date: formatISO(endOfYear(new Date(dp.year, 0, 1))),
        value: dp.net_worth,
        isHistorical: true 
      }));

    const snapshotPoints = mockSnapshots
      .map(snapshot => ({
        date: snapshot.date,
        value: snapshot.netWorth,
        isHistorical: false
      }));

    console.log(`Historical points: ${historicalPoints.length}`);
    console.log(`Snapshot points: ${snapshotPoints.length}`);

    const allPoints = [...historicalPoints, ...snapshotPoints]
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    console.log(`All points: ${allPoints.length}`);

    const filteredPoints = allPoints.filter(p => parseISO(p.date) >= startDate);
    
    console.log(`Filtered points for ${timeFrame}: ${filteredPoints.length}`);
    console.log('Filtered points:', filteredPoints.map(p => ({ date: p.date, value: p.value, isHistorical: p.isHistorical })));

    if (filteredPoints.length === 0) {
      console.log('No data after filtering!');
      return [];
    }

    const monthlyDataMap = new Map<string, { sum: number; count: number; points: number[] }>();
    const finalChartPoints: { date: string; value: number; isHistorical?: boolean }[] = [];

    filteredPoints.forEach(point => {
      if (point.isHistorical) {
        finalChartPoints.push({
          date: format(parseISO(point.date), 'yyyy-MM-dd'), 
          value: point.value,
          isHistorical: true
        });
      } else {
        const monthKey = format(parseISO(point.date), 'yyyy-MM');
        if (!monthlyDataMap.has(monthKey)) {
          monthlyDataMap.set(monthKey, { sum: 0, count: 0, points: [] });
        }
        const monthData = monthlyDataMap.get(monthKey)!;
        monthData.sum += point.value;
        monthData.count += 1;
        monthData.points.push(point.value);
      }
    });

    monthlyDataMap.forEach((data, monthKey) => {
      finalChartPoints.push({
        date: format(parseISO(`${monthKey}-01`), 'yyyy-MM-dd'), 
        value: data.sum / data.count, 
        isHistorical: false
      });
    });

    finalChartPoints.sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());

    console.log(`Final chart points: ${finalChartPoints.length}`);
    console.log('Final points:', finalChartPoints.map(p => ({ date: p.date, value: p.value })));

    return finalChartPoints;
  }, [timeFrame]);

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Test Chart - Net Worth Trend</h3>
        <div className="flex space-x-2">
          {(['1M', '3M', '6M', '1Y', 'ALL'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeFrame(tf)}
              className={`px-3 py-1 text-sm rounded-md ${
                timeFrame === tf
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          {showDebug ? 'Hide Debug' : 'Show Debug'}
        </button>
      </div>

      {showDebug && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md text-sm">
          <div><strong>Selected Timeframe:</strong> {timeFrame}</div>
          <div><strong>Data Points:</strong> {netWorthTrendData.length}</div>
          <div><strong>Mock Snapshots:</strong> {mockSnapshots.length}</div>
          <div><strong>Mock Historical:</strong> {mockHistoricalData.length}</div>
        </div>
      )}

      <div style={{ width: '100%', height: '400px' }}>
        {netWorthTrendData.length > 0 ? (
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
                labelFormatter={(label) => `Date: ${format(parseISO(label), 'MMM d, yyyy')}`}
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
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No data available for the selected timeframe
          </div>
        )}
      </div>
    </div>
  );
}