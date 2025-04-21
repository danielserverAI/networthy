import React, { useState, useMemo } from 'react';
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

export function AccountList() {
  const { state, deleteAccount, loading: contextLoading, error: contextError } = useNetWorth();
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('institution');

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
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setSelectedAccount(null);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setSelectedAccount(null);
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

      <div className="accounts-container p-1 space-y-0">
        {contextLoading ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading accounts...</div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <p className="text-lg mb-2">No accounts match your criteria.</p>
            <p>Try adjusting your search or filters, or add a new account!</p>
          </div>
        ) : (
          filteredAccounts.map((account, index) => {
            const latestBalanceEntry = getLatestBalanceEntry(account);
            const displayBalance = latestBalanceEntry ? latestBalanceEntry.balance : 0;
            const displayDate = latestBalanceEntry ? latestBalanceEntry.date : null;

            return (
              <div 
                key={account.id}
                className={`bg-white dark:bg-gray-800 p-4 flex items-center justify-between 
                           ${index < filteredAccounts.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
              >
                <div className="flex items-center space-x-4">
                  <span className="text-2xl">{getAccountIcon(account.type)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                      {account.institution}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {account.name ? `${account.name} • ` : ''} 
                      {formatAccountType(account.type)}
                      {account.category && ` • ${account.category}`}
                    </p>
                    {account.tags && account.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {account.tags.map((tag: string) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right flex flex-col items-end space-y-1">
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {displayBalance.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {displayDate ? `as of ${format(parseISO(displayDate), 'PP')}` : 'No balance history'}
                  </p>
                  <div className="flex space-x-2 pt-1">
                    <button
                      onClick={() => handleEdit(account)}
                      className="btn-secondary btn-xs"
                      aria-label={`Edit ${account.institution}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(account)}
                      className="btn-danger btn-xs"
                      aria-label={`Delete ${account.institution}`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
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