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

// Add this helper function near the top with other helpers
const highlightMatch = (text: string, query: string) => {
  if (!query) return text;
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() 
      ? <span key={i} className="bg-yellow-100 dark:bg-yellow-900/50">{part}</span>
      : part
  );
};

export function AccountList() {
  const { state, deleteAccount, addBalanceEntry, loading: contextLoading, error: contextError } = useNetWorth();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<AccountType[]>([]);
  const [sortBy, setSortBy] = useState<string>('balance_high_low');
  
  // State for inline editing
  const [editingBalanceAccountId, setEditingBalanceAccountId] = useState<string | null>(null);
  const [inlineBalanceValue, setInlineBalanceValue] = useState<string>('');

  // Add this state for managing dropdown visibility
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

  const { categories, accountTypes } = useMemo(() => {
    const uniqueCategories = new Set<string>();
    const uniqueTypes = new Set<AccountType>();
    
    state.accounts.forEach(account => {
      if (account.category) uniqueCategories.add(account.category);
      uniqueTypes.add(account.type);
    });

    return {
      categories: Array.from(uniqueCategories).sort(),
      accountTypes: Array.from(uniqueTypes).sort(),
    };
  }, [state.accounts]);

  const filteredAccounts = useMemo(() => {
    return state.accounts
      .filter((account: Account) => {
        const searchTerms = searchQuery.toLowerCase().split(' ');
        const institutionMatch = searchTerms.every(term => 
          account.institution.toLowerCase().includes(term)
        );
        const nameMatch = account.name ? searchTerms.every(term => 
          account.name!.toLowerCase().includes(term)
        ) : false;

        const categoryMatch = selectedCategories.length === 0 || 
          (account.category && selectedCategories.includes(account.category));
        
        const typeMatch = selectedTypes.length === 0 || 
          selectedTypes.includes(account.type);

        return (institutionMatch || nameMatch) && categoryMatch && typeMatch;
      })
      .sort((a: Account, b: Account) => {
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
  }, [state.accounts, searchQuery, selectedCategories, selectedTypes, sortBy]);

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

  // Add this function to handle search result selection
  const handleSearchResultClick = (account: Account) => {
    setSearchQuery(account.institution);
    setIsSearchFocused(false);
  };

  // Add searchResults computation
  const searchResults = useMemo(() => {
    if (!searchQuery || !isSearchFocused) return [];
    return state.accounts
      .filter(account => {
        const institutionMatch = account.institution.toLowerCase().includes(searchQuery.toLowerCase());
        const nameMatch = account.name?.toLowerCase().includes(searchQuery.toLowerCase());
        return institutionMatch || nameMatch;
      })
      .slice(0, 5); // Limit to 5 results
  }, [state.accounts, searchQuery, isSearchFocused]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-wrap justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Accounts</h2>
        <button onClick={handleAddNew} className="btn-primary">
          + Add Account
        </button>
      </div>

      {/* Search, Sort and Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search and Sort Group */}
          <div className="flex flex-1 min-w-0 gap-2">
            {/* Search with Dropdown */}
            <div className="relative flex-1 min-w-[160px]">
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => {
                  setTimeout(() => setIsSearchFocused(false), 200);
                }}
                className="input pl-8 py-1.5 w-full text-sm"
              />
              <span className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                🔍
              </span>
              
              {/* Search Results Dropdown */}
              {isSearchFocused && searchQuery && searchResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
                  {searchResults.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleSearchResultClick(account)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center gap-2 text-sm"
                    >
                      <span className="text-base flex-shrink-0">{getAccountIcon(account.type)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                          {highlightMatch(account.institution, searchQuery)}
                        </div>
                        {account.name && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {highlightMatch(account.name, searchQuery)}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input py-1.5 w-32 sm:w-40 text-sm"
            >
              <option value="institution">Sort by Institution</option>
              <option value="name">Sort by Name</option>
              <option value="category">Sort by Category</option>
              <option value="balance_high_low">Balance (High-Low)</option>
              <option value="balance_low_high">Balance (Low-High)</option>
              <option value="date_updated">Date Updated</option>
            </select>
          </div>

          {/* Filters Group */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* Categories */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategories(prev => 
                      prev.includes(category)
                        ? prev.filter(c => c !== category)
                        : [...prev, category]
                    );
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                    selectedCategories.includes(category)
                      ? 'bg-purple-500 text-white'
                      : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200 hover:bg-purple-100 dark:hover:bg-purple-800/30'
                  }`}
                >
                  {category}
                  {selectedCategories.includes(category) && (
                    <span className="ml-1 opacity-75">×</span>
                  )}
                </button>
              ))}
            </div>

            {/* Account Types */}
            <div className="flex flex-wrap gap-1.5">
              {accountTypes.map(type => (
                <button
                  key={type}
                  onClick={() => {
                    setSelectedTypes(prev => 
                      prev.includes(type)
                        ? prev.filter(t => t !== type)
                        : [...prev, type]
                    );
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                    selectedTypes.includes(type)
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800/30'
                  }`}
                >
                  {formatAccountType(type)}
                  {selectedTypes.includes(type) && (
                    <span className="ml-1 opacity-75">×</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Accounts Table/Cards */}
      <div className="accounts-container mt-6">
        {contextLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading accounts...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-lg mb-2">No accounts match your criteria.</p>
            <p>Try adjusting your search or filters, or add a new account!</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
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
                              <div className="mt-1 flex flex-wrap gap-1">
                                {account.category && (
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                    {account.category}
                                  </span>
                                )}
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {formatAccountType(account.type)}
                                </span>
                                {account.tags && account.tags.length > 0 && account.tags.map(tag => (
                                  <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                    {tag}
                                  </span>
                                ))}
                              </div>
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-4">
              {filteredAccounts.map((account) => {
                const latestBalanceEntry = getLatestBalanceEntry(account);
                const currentBalance = latestBalanceEntry?.balance ?? 0;
                const balanceDate = latestBalanceEntry?.date ? format(parseISO(latestBalanceEntry.date), 'MMM dd, yyyy') : 'No date';
                const performanceData = accountPerformance.find(p => p?.id === account.id);
                const isEditingBalance = editingBalanceAccountId === account.id;

                return (
                  <div key={account.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                    {/* Account Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">{getAccountIcon(account.type)}</div>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">{account.institution}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{account.name || account.type}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleEdit(account)} className="text-primary-600 hover:text-primary-800 dark:hover:text-primary-400">
                          Update
                        </button>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {account.category && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                          {account.category}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {formatAccountType(account.type)}
                      </span>
                      {account.tags && account.tags.length > 0 && account.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Balance and Change */}
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Change</div>
                        <div className="font-medium">
                          {performanceData?.hasEnoughData ? (
                            <span className={`${
                              performanceData.percentageChange === Infinity ? 'text-green-600' : 
                              performanceData.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {performanceData.percentageChange === Infinity ? 'New+' : `${performanceData.percentageChange.toFixed(1)}%`}
                            </span>
                          ) : (
                            <span>N/A</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
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
                            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600">
                              {formatCurrency(currentBalance)}
                              <span className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">as of {balanceDate}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-start sm:items-center justify-center p-0 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-none sm:rounded-xl shadow-xl w-full sm:max-w-lg min-h-screen sm:min-h-0 sm:m-4 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
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

            {/* Content - Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <AccountForm account={selectedAccount || undefined} onClose={closeForm} />
              {selectedAccount && (
                <>
                  <AccountProgression account={selectedAccount} />
                </>
              )}
            </div>

            {/* Footer */}
            {selectedAccount && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 sm:p-6">
                <button
                  onClick={() => handleDelete(selectedAccount)}
                  className="w-full px-4 py-2 text-sm font-medium text-red-600 hover:text-white hover:bg-red-600 rounded-md border border-red-600 transition-colors"
                >
                  Delete Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {accountToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Delete Account
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Are you sure you want to delete {accountToDelete.institution}? This action cannot be undone.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 mb-4">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setAccountToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
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