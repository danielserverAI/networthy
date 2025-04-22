import { useNetWorthCalculations } from '../context/NetWorthContext';
// import { AccountType } from '../types'; // Keep if formatAccountType is used, remove otherwise

// Removed unused imports: React, Recharts components, date-fns, useNetWorth, other types, helpers

// const COLORS = { ... }; // Removed

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
  // const { state } = useNetWorth(); // Removed
  const { totalAssets, totalLiabilities, netWorth } = useNetWorthCalculations();

  // Helper to format type names for display
  // const formatAccountType = (type: AccountType): string => { ... }; // Removed

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