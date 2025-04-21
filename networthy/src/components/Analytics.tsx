import React, { useState, useMemo } from 'react';
import { useNetWorth } from '../context/NetWorthContext';
import { format, parseISO } from 'date-fns';

// Helper to format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Helper to calculate percentage change
const calculatePercentageChange = (oldValue: number, newValue: number): number => {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
};

interface Goal {
  targetAmount: number;
  targetDate: string;
  currentAmount: number;
}

export function Analytics() {
  const { state } = useNetWorth();
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goal, setGoal] = useState<Goal>({
    targetAmount: 0,
    targetDate: format(new Date(), 'yyyy-MM-dd'),
    currentAmount: 0,
  });

  // Calculate account performance
  const accountPerformance = useMemo(() => {
    return state.accounts.map(account => {
      if (!account.balanceHistory || account.balanceHistory.length === 0) return null;
      
      const sortedHistory = [...account.balanceHistory].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
      const oldestEntry = sortedHistory[0];
      const latestEntry = sortedHistory[sortedHistory.length - 1];

      if (sortedHistory.length < 2) {
           return {
              account,
              percentageChange: 0,
              oldestBalance: latestEntry.balance,
              latestBalance: latestEntry.balance,
           }
      } 
      
      const oldestBalance = oldestEntry.balance;
      const latestBalance = latestEntry.balance;
      const percentageChange = calculatePercentageChange(oldestBalance, latestBalance);

      return {
        account,
        percentageChange,
        oldestBalance,
        latestBalance,
      };
    }).filter(Boolean);
  }, [state.accounts]);

  // Update current goal amount when net worth changes
  React.useEffect(() => {
      const latestSnapshot = state.snapshots.length > 0 ? state.snapshots[state.snapshots.length - 1] : null;
      if (goal.targetAmount > 0 && latestSnapshot) {
          setGoal(prevGoal => ({ ...prevGoal, currentAmount: latestSnapshot.netWorth }));
      }
  }, [state.snapshots, goal.targetAmount]);

  return (
    <div className="space-y-8">
      {/* Account Performance */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Performance</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {accountPerformance.map((performance) => (
                performance && <tr key={performance.account.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {performance.account.institution}
                    </div>
                    <div className="text-sm text-gray-500">
                      {performance.account.name || performance.account.type}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      performance.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {accountPerformance.find(p => p?.account.id === performance.account.id && p.oldestBalance !== p.latestBalance) 
                        ? `${performance.percentageChange.toFixed(2)}%`
                        : 'N/A' 
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(performance.latestBalance)}
                  </td>
                </tr>
              ))}
              {accountPerformance.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                    No performance data available (requires balance history). 
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Goal Tracking */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800">Goal Tracking</h3>
          <button
            onClick={() => setShowGoalForm(true)}
            className="btn-secondary text-sm"
          >
            Set Goal
          </button>
        </div>
        {goal.targetAmount > 0 ? (
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Target Amount</span>
              <span className="font-medium">{formatCurrency(goal.targetAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Target Date</span>
              <span className="font-medium">{format(parseISO(goal.targetDate), 'MMM d, yyyy')}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-primary-500 h-2.5 rounded-full"
                style={{
                   width: `${Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)}%`
                }}
              ></div>
            </div>
            <div className="text-sm text-gray-600">
              {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)} 
              ({goal.targetAmount > 0 ? ((goal.currentAmount / goal.targetAmount) * 100).toFixed(1) : 0}%)
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Set a goal to track your progress</p>
        )}
      </div>

      {/* Goal Setting Modal */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Set Net Worth Goal</h3>
              <button
                onClick={() => setShowGoalForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
              >
                &times;
              </button>
            </div>
            <form className="space-y-4" onSubmit={(e) => { 
                e.preventDefault(); 
                const latestSnapshot = state.snapshots.length > 0 ? state.snapshots[state.snapshots.length - 1] : null;
                setGoal({ ...goal, currentAmount: latestSnapshot?.netWorth || 0 });
                setShowGoalForm(false);
              }}>
              <div>
                <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700">
                  Target Amount
                </label>
                <input
                  type="number"
                  id="targetAmount"
                  value={goal.targetAmount > 0 ? goal.targetAmount : ''}
                  onChange={(e) => setGoal({ ...goal, targetAmount: parseFloat(e.target.value) || 0 })}
                  className="input mt-1 w-full"
                  required
                  min="1"
                />
              </div>
              <div>
                <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700">
                  Target Date
                </label>
                <input
                  type="date"
                  id="targetDate"
                  value={goal.targetDate}
                  onChange={(e) => setGoal({ ...goal, targetDate: e.target.value })}
                  className="input mt-1 w-full"
                  required
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalForm(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  Set Goal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 