import { useState, useMemo } from 'react';
import { useNetWorth, getCurrentBalance, getLatestBalanceEntry } from '../context/NetWorthContext';
import { AccountForm } from './AccountForm';
import { Account, AccountType } from '../types';
import { format, parseISO } from 'date-fns';
import { AccountProgression } from './AccountProgression';

// Helper to format type names for display
const formatAccountType = (type: AccountType): string => {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper to get account icon
const getAccountIcon = (type: AccountType): string => {
  const icons: Record<AccountType, string> = {
    checkings: '🏦',
    savings: '💰',
    cash: '💵',
    investment: '📈',
    crypto: '₿',
    real_estate: '🏠',
    other_assets: '📦',
    liability: '💳',
  };
  return icons[type];
};

// --- Helper function moved from Analytics.tsx ---
const calculatePercentageChange = (oldValue: number, newValue: number): number => {
  if (oldValue === 0 && newValue === 0) return 0; // Avoid NaN if both are 0
  if (oldValue === 0) return Infinity; // Or handle as appropriate (e.g., return 100 if newValue > 0)
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
};

// Helper to format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2, // Keep cents for account list
  }).format(value);
};

export function AccountList() {
  const { state, deleteAccount, addBalanceEntry, loading: contextLoading, error: contextError } = useNetWorth();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('institution');
  
  // State for inline editing
  const [editingBalanceAccountId, setEditingBalanceAccountId] = useState<string | null>(null);
  const [inlineBalanceValue, setInlineBalanceValue] = useState<string>('');

  const handleDelete = (account: Account) => {
    setAccountToDelete(account);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    if (!accountToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount(accountToDelete.id);
      setAccountToDelete(null);
    } catch (err) {
      console.error("Failed to delete account:", err);
      setDeleteError(contextError?.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (account: Account) => {
    // Cancel inline editing if trying to open full form
    setEditingBalanceAccountId(null);
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    // Cancel inline editing if trying to open full form
    setEditingBalanceAccountId(null);
    setSelectedAccount(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedAccount(null);
  };

  // --- Inline Balance Edit Functions ---
  const startInlineEdit = (account: Account) => {
    // Cancel other inline edits first
    setEditingBalanceAccountId(account.id);
    // Set initial input value without currency symbols/commas
    setInlineBalanceValue(String(getCurrentBalance(account) || 0)); 
    // Close full form if open
    setIsFormOpen(false);
    setSelectedAccount(null);
  };

  const handleCancelInlineEdit = () => {
    setEditingBalanceAccountId(null);
    setInlineBalanceValue('');
  };

  const handleSaveInlineBalance = async () => {
    if (editingBalanceAccountId === null) return;

    const newBalance = parseFloat(inlineBalanceValue);
    if (isNaN(newBalance)) {
      // Handle invalid input - maybe show an error briefly
      console.error("Invalid balance value");
      return;
    }

    try {
      await addBalanceEntry(editingBalanceAccountId, newBalance, new Date().toISOString());
      handleCancelInlineEdit(); // Close editor on success
    } catch (err) {
      console.error("Failed to add balance entry:", err);
      // Optionally show error to user near the input
    }
  };

  const { categories, tags } = useMemo(() => {
    const uniqueCategories = new Set<string>();
    const uniqueTags = new Set<string>();
    
    state.accounts.forEach(account => {
      if (account.category) uniqueCategories.add(account.category);
      if (account.tags && Array.isArray(account.tags)) {
        account.tags.forEach((tag: string) => uniqueTags.add(tag));
      }
    });

    return {
      categories: Array.from(uniqueCategories).sort(),
      tags: Array.from(uniqueTags).sort()
    };
  }, [state.accounts]);

  const filteredAccounts = useMemo(() => {
    return state.accounts
      .filter(account => {
        const matchesSearch = 
          account.institution.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (account.name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
        
        const matchesCategory = 
          selectedCategory === 'all' || account.category === selectedCategory;
        
        const accountTags = account.tags || [];
        const matchesTags = 
          selectedTags.length === 0 || 
          selectedTags.every(tag => accountTags.includes(tag));
        
        return matchesSearch && matchesCategory && matchesTags;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'institution':
            return a.institution.localeCompare(b.institution);
          case 'name': {
            const nameA = a.name || formatAccountType(a.type);
            const nameB = b.name || formatAccountType(b.type);
            return nameA.localeCompare(nameB);
          }
          case 'category': {
            const catA = a.category || '';
            const catB = b.category || '';
            if (catA === catB) return 0;
            if (!catA) return 1;
            if (!catB) return -1;
            return catA.localeCompare(catB);
          }
          case 'balance_high_low': {
            const balanceA = getCurrentBalance(a);
            const balanceB = getCurrentBalance(b);
            return balanceB - balanceA;
          }
          case 'balance_low_high': {
            const balanceA = getCurrentBalance(a);
            const balanceB = getCurrentBalance(b);
            return balanceA - balanceB;
          }
          case 'date_updated': {
            const dateA = getLatestBalanceEntry(a)?.date;
            const dateB = getLatestBalanceEntry(b)?.date;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          }
          default:
            return a.institution.localeCompare(b.institution);
        }
      });
  }, [state.accounts, searchQuery, selectedCategory, selectedTags, sortBy]);

  // --- Account Performance Calculation (Moved from Analytics.tsx) ---
  const accountPerformance = useMemo(() => {
    return state.accounts.map(account => {
      if (!account.balanceHistory || account.balanceHistory.length === 0) return null;
      
      const sortedHistory = [...account.balanceHistory].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
      const oldestEntry = sortedHistory[0];
      const latestEntry = sortedHistory[sortedHistory.length - 1];

      if (sortedHistory.length < 2) {
           return {
              id: account.id, // Need id to map back
              percentageChange: 0,
              hasEnoughData: false // Flag to indicate N/A
           }
      } 
      
      const oldestBalance = oldestEntry.balance;
      const latestBalance = latestEntry.balance;
      const percentageChange = calculatePercentageChange(oldestBalance, latestBalance);

      return {
        id: account.id,
        percentageChange,
        hasEnoughData: true
      };
    }).filter(Boolean);
  }, [state.accounts]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Accounts</h2>
        <div className="flex items-center gap-3">
          <button onClick={handleAddNew} className="btn-primary">
            + Add Account
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative md:col-span-1">
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            🔍
          </span>
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="input md:col-span-1"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="input md:col-span-1"
        >
          <option value="institution">Sort by Institution</option>
          <option value="name">Sort by Name</option>
          <option value="category">Sort by Category</option>
          <option value="balance_high_low">Sort by Balance (High-Low)</option>
          <option value="balance_low_high">Sort by Balance (Low-High)</option>
          <option value="date_updated">Sort by Date Updated</option>
        </select>

        <div className="flex flex-wrap gap-2 md:col-span-1 items-center">
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => {
                setSelectedTags(prev => 
                  prev.includes(tag)
                    ? prev.filter(t => t !== tag)
                    : [...prev, tag]
                );
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedTags.includes(tag)
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="accounts-container overflow-x-auto">
        {contextLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading accounts...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-lg mb-2">No accounts match your criteria.</p>
            <p>Try adjusting your search or filters, or add a new account!</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAccounts.map((account) => {
                const latestBalanceEntry = getLatestBalanceEntry(account);
                const currentBalance = latestBalanceEntry?.balance ?? 0;
                const balanceDate = latestBalanceEntry?.date ? format(parseISO(latestBalanceEntry.date), 'MMM dd, yyyy') : 'No date';
                const performanceData = accountPerformance.find(p => p?.id === account.id);
                const isEditingBalance = editingBalanceAccountId === account.id;

                return (
                  <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center text-xl">
                          {getAccountIcon(account.type)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{account.institution}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">{account.name || account.type}</div>
                          {account.tags && account.tags.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {account.tags.map(tag => (
                                <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {performanceData?.hasEnoughData ? (
                        <span className={`font-medium ${
                          performanceData.percentageChange === Infinity ? 'text-green-600' : 
                          performanceData.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {performanceData.percentageChange === Infinity ? 'New+' : `${performanceData.percentageChange.toFixed(1)}%`}
                        </span>
                      ) : (
                        <span>N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      {isEditingBalance ? (
                        <div className="flex items-center justify-end gap-2">
                          <input 
                            type="number"
                            value={inlineBalanceValue}
                            onChange={(e) => setInlineBalanceValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveInlineBalance(); if (e.key === 'Escape') handleCancelInlineEdit(); }}
                            className="input input-sm w-32 text-right"
                            autoFocus
                          />
                          <button onClick={handleSaveInlineBalance} className="text-green-600 hover:text-green-800" aria-label="Save Balance">✓</button>
                          <button onClick={handleCancelInlineEdit} className="text-red-600 hover:text-red-800" aria-label="Cancel Edit">✗</button>
                        </div>
                      ) : (
                        <div onClick={() => startInlineEdit(account)} className="cursor-pointer group">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600">
                            {formatCurrency(currentBalance)}
                            <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                           </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">as of {balanceDate}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button onClick={() => handleEdit(account)} className="text-primary-600 hover:text-primary-800 dark:hover:text-primary-400">Update</button>
                      <button 
                        onClick={() => handleDelete(account)} 
                        className="text-red-600 hover:text-red-800 dark:hover:text-red-400" 
                        aria-label={`Delete ${account.institution}`}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-lg w-full m-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {selectedAccount ? 'Edit Account' : 'Add New Account'}
              </h3>
              <button 
                onClick={closeForm} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
              >
                &times;
              </button>
            </div>
            <AccountForm account={selectedAccount || undefined} onClose={closeForm} />
            {selectedAccount && <AccountProgression account={selectedAccount} />}
          </div>
        </div>
      )}

      {accountToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Delete Account
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete {accountToDelete.institution}?
              This action cannot be undone.
            </p>
            {deleteError && <p className="text-red-500 text-sm mb-3">Error: {deleteError}</p>}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setAccountToDelete(null)}
                className="btn-secondary"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="btn bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 