import React, { useState, useMemo, useEffect } from 'react';
import { useNetWorth, useNetWorthCalculations, getLatestBalanceEntry, getCurrentBalance } from '../context/NetWorthContext';
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

// Interface for the goal data used in the form/display
interface GoalFormData {
  target_amount: number;
  target_date: string;
}

export function Analytics() {
  const { 
      state, 
      setUserGoal, 
      deleteUserGoal, 
  } = useNetWorth();
  
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalFormData, setGoalFormData] = useState<GoalFormData>({ target_amount: 0, target_date: format(new Date(), 'yyyy-MM-dd') });
  const [goalFormError, setGoalFormError] = useState<string | null>(null);
  const [isGoalSubmitting, setIsGoalSubmitting] = useState(false);

  useEffect(() => {
    if (state.userGoal) {
      setGoalFormData({
        target_amount: state.userGoal.target_amount,
        target_date: state.userGoal.target_date,
      });
    } else {
        setGoalFormData({ target_amount: 0, target_date: format(new Date(), 'yyyy-MM-dd') });
    }
  }, [state.userGoal]);

  // Calculate current amount for goal display (using latest snapshot)
  const currentGoalAmount = useMemo(() => {
      return state.snapshots.length > 0 ? state.snapshots[state.snapshots.length - 1].netWorth : 0;
  }, [state.snapshots]);

  // --- Goal Form Handlers ---
  const handleOpenGoalForm = () => {
      if (state.userGoal) {
          setGoalFormData({
              target_amount: state.userGoal.target_amount,
              target_date: state.userGoal.target_date,
          });
      } else {
           setGoalFormData({ target_amount: 0, target_date: format(new Date(), 'yyyy-MM-dd') });
      }
      setGoalFormError(null);
      setShowGoalForm(true);
  };

  const handleGoalFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalFormError(null);
    setIsGoalSubmitting(true);

    if (goalFormData.target_amount <= 0) {
        setGoalFormError("Target amount must be greater than zero.");
        setIsGoalSubmitting(false);
        return;
    }

    try {
      await setUserGoal(goalFormData);
      setShowGoalForm(false);
    } catch (err: any) {
      console.error("Error setting goal:", err);
      setGoalFormError(err?.message || "Failed to save goal. Please try again.");
    } finally {
      setIsGoalSubmitting(false);
    }
  };
  
  const handleDeleteGoal = async () => {
      if (!confirm("Are you sure you want to delete your goal?")) return;
      
      setIsGoalSubmitting(true);
      setGoalFormError(null);
      try {
          await deleteUserGoal();
          setShowGoalForm(false);
      } catch (err: any) { 
           console.error("Error deleting goal:", err);
           alert(`Failed to delete goal: ${err?.message}`);
           setGoalFormError(err?.message || "Failed to delete goal.");
      } finally {
          setIsGoalSubmitting(false);
      }
  };

  return (
    <div className="space-y-8">
      {/* Account Performance */}
      {/* ... (Account performance table remains the same) ... */}

      {/* --- Goal Tracking (Uses context state.userGoal) --- */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Goal Tracking</h3>
           <div className="flex items-center gap-2">
               {state.userGoal && (
                   <button
                     onClick={handleDeleteGoal}
                     className="btn-danger-outline btn-xs"
                     disabled={isGoalSubmitting}
                   >
                     Delete Goal
                   </button>
               )}
               <button
                 onClick={handleOpenGoalForm}
                 className="btn-secondary text-sm"
                 disabled={isGoalSubmitting}
               >
                 {state.userGoal ? 'Edit Goal' : 'Set Goal'}
               </button>
           </div>
        </div>
        {state.userGoal ? (
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Target Amount</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(state.userGoal.target_amount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Target Date</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{format(parseISO(state.userGoal.target_date), 'MMM d, yyyy')}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-primary-500 h-2.5 rounded-full"
                style={{
                   width: `${Math.min(100, (currentGoalAmount / state.userGoal.target_amount) * 100)}%` 
                }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {formatCurrency(currentGoalAmount)} of {formatCurrency(state.userGoal.target_amount)} 
              ({state.userGoal.target_amount > 0 ? ((currentGoalAmount / state.userGoal.target_amount) * 100).toFixed(1) : 0}%)
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm">Set a goal to track your progress</p>
        )}
      </div>

      {/* Goal Setting Modal (Uses goalFormData) */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {state.userGoal ? 'Edit Net Worth Goal' : 'Set Net Worth Goal'}
              </h3>
              <button
                onClick={() => setShowGoalForm(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                disabled={isGoalSubmitting}
              >
                &times;
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleGoalFormSubmit}>
              <div>
                <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700">
                  Target Amount
                </label>
                <input
                  type="number"
                  id="targetAmount"
                  value={goalFormData.target_amount > 0 ? goalFormData.target_amount : ''} 
                  onChange={(e) => setGoalFormData({ ...goalFormData, target_amount: parseFloat(e.target.value) || 0 })}
                  className="input mt-1 w-full"
                  required
                  min="1"
                  disabled={isGoalSubmitting}
                />
              </div>
              <div>
                <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700">
                  Target Date
                </label>
                <input
                  type="date"
                  id="targetDate"
                  value={goalFormData.target_date}
                  onChange={(e) => setGoalFormData({ ...goalFormData, target_date: e.target.value })}
                  className="input mt-1 w-full"
                  required
                  min={format(new Date(), 'yyyy-MM-dd')} 
                  disabled={isGoalSubmitting}
                />
              </div>
              {goalFormError && (
                  <p className="text-sm text-red-600">Error: {goalFormError}</p>
              )}
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoalForm(false)}
                  className="btn-secondary"
                  disabled={isGoalSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isGoalSubmitting}
                >
                  {isGoalSubmitting ? 'Saving...' : (state.userGoal ? 'Update Goal' : 'Set Goal')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 