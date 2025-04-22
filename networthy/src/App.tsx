import { useNetWorth } from './context/NetWorthContext';
import { useTheme } from './context/ThemeContext';
import { NetWorthDashboard } from './components/NetWorthDashboard';
import { AccountList } from './components/AccountList';
import { useEffect, useState } from 'react';
import { useNetWorthCalculations } from './context/NetWorthContext';
import { DataManagement } from './components/DataManagement';
import { Analytics } from './components/Analytics';
import { KeyboardShortcuts } from './components/KeyboardShortcuts';
import { useAuth } from './context/AuthContext';
import AuthGate from './components/AuthGate';
import { AssetAllocationChart } from './components/AssetAllocationChart';
import { NetWorthTrendChart } from './components/NetWorthTrendChart';
import { UserProfileDropdown } from './components/UserProfileDropdown';

function AppContent() {
  const { state, dispatch } = useNetWorth();
  const { theme, toggleTheme } = useTheme();
  const { totalAssets, totalLiabilities, netWorth } = useNetWorthCalculations();
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { user, loading } = useAuth();

  // Create snapshot whenever balances change (Conditional on user)
  useEffect(() => {
    if (!user || loading || state.accounts.length === 0) {
      return;
    }

    // Dispatch action to create snapshot with calculated totals
    dispatch({
      type: 'ADD_SNAPSHOT',
      payload: {
        date: new Date().toISOString(),
        totalAssets,
        totalLiabilities,
        netWorth,
      }
    });

    // Setup auto backup (Temporarily commented out)
    // Consider replacing with Supabase sync logic later
    // setupAutoBackup(state.accounts, state.snapshots);

  }, [state.accounts, dispatch, user, loading, totalAssets, totalLiabilities, netWorth]);

  // Handle keyboard shortcuts (No change needed for AuthGate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            toggleTheme();
            break;
          case 'n':
            e.preventDefault();
            // Add new account - handled by AccountList component
            break;
          case 's':
            e.preventDefault();
            // Save changes - handled by individual components
            break;
          case 'h':
            e.preventDefault();
            alert('Historical data entry shortcut (Ctrl+H) pressed, but component is not implemented/used.');
            break;
          case 'm':
            e.preventDefault();
            setShowDataManagement(true);
            break;
          case '/':
            e.preventDefault();
            setShowShortcuts(prev => !prev);
            break;
        }
      }
      if (e.key === 'Escape') {
        setShowDataManagement(false);
        setShowShortcuts(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTheme]);

  // Render loading state or main content guarded by AuthGate
  return (
    <AuthGate>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-primary-600">Networthy</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="btn-secondary"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              {user && (
                <UserProfileDropdown 
                  onDataManagementClick={() => setShowDataManagement(true)} 
                />
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Top Row: Summary Cards */}
          <div>
             <NetWorthDashboard />
          </div>

          {/* Second Row: Charts (using grid) - Make items stretch and set min height */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-stretch min-h-[350px]">
             {/* Net Worth Trend Chart */}
             <div className="lg:col-span-3">
                <NetWorthTrendChart />
             </div>
             {/* Asset Allocation Chart */}
             <div className="lg:col-span-2">
                 <AssetAllocationChart />
             </div>
          </div>

          {/* Third Row: Remaining Analytics (Perf/Goals) */}
          <div>
            <Analytics />
          </div>

          {/* Fourth Row: Account List */}
          <div>
            <AccountList />
          </div>
        </main>

        {/* Footer */}
        <footer className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          © {new Date().getFullYear()} Networthy App
        </footer>

        {/* Modal for Data Management */}
        {showDataManagement && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-lg w-full m-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Data Management</h3>
                <button
                  onClick={() => setShowDataManagement(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                >
                  &times;
                </button>
              </div>
              <DataManagement />
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Modal */}
        {showShortcuts && <KeyboardShortcuts />}
      </div>
    </AuthGate>
  );
}

function App() {
  return <AppContent />;
}

export default App;
