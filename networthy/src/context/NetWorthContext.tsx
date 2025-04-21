import React, { createContext, useContext, useReducer, ReactNode, useEffect, useState, useCallback } from 'react';
import { Account, AccountType, BalanceEntry } from '../types';
import { NetWorthSnapshot } from '../types/NetWorthSnapshot';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabaseClient';
import { PostgrestError } from '@supabase/supabase-js';

type Snapshot = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  date: string;
};

type HistoricalData = {
  year: number;
  netWorth: number;
};

export interface HistoricalDataPoint {
  year: number;
  net_worth: number;
}

type State = {
  accounts: Account[];
  snapshots: NetWorthSnapshot[];
  historicalData: HistoricalDataPoint[];
};

const getLatestBalanceEntry = (account: Account): BalanceEntry | null => {
  if (!account.balanceHistory || account.balanceHistory.length === 0) {
    return null;
  }
  const sortedHistory = [...account.balanceHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return sortedHistory[0];
};

const getCurrentBalance = (account: Account): number => {
  const latestEntry = getLatestBalanceEntry(account);
  return latestEntry ? latestEntry.balance : 0;
}

interface AddAccountPayload {
  institution: string;
  type: AccountType;
  name?: string;
  balance: number;
}

interface AddBalanceEntryPayload {
  accountId: string;
  balance: number;
  date?: string;
}

interface UpdateAccountMetadataPayload extends Partial<Omit<Account, 'balanceHistory' | 'id'>> {
    id: string;
}

export type NetWorthAction =
  | { type: 'SET_ACCOUNTS'; payload: Account[] }
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT_METADATA'; payload: Account }
  | { type: 'ADD_BALANCE_ENTRY'; payload: { accountId: string; balanceHistory: BalanceEntry[] } }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'ADD_SNAPSHOT'; payload: Snapshot }
  | { type: 'UPDATE_ACCOUNTS_ORDER'; payload: Account[] }
  | { type: 'SET_HISTORICAL_DATA'; payload: HistoricalDataPoint[] }
  | { type: 'UPSERT_HISTORICAL_DATA_POINT'; payload: HistoricalDataPoint }
  | { type: 'DELETE_HISTORICAL_DATA_POINT'; payload: { year: number } };

const initialState: State = {
  accounts: [],
  snapshots: [],
  historicalData: [],
};

function calculateNetWorth(accounts: Account[]): {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
} {
  const totals = accounts.reduce(
    (acc, account) => {
      const currentBalance = getCurrentBalance(account);
      if (account.type === 'liability') {
        acc.totalLiabilities += currentBalance;
      } else {
        acc.totalAssets += currentBalance;
      }
      return acc;
    },
    { totalAssets: 0, totalLiabilities: 0 }
  );

  return {
    ...totals,
    netWorth: totals.totalAssets - totals.totalLiabilities,
  };
}

function reducer(state: State, action: NetWorthAction): State {
  switch (action.type) {
    case 'SET_ACCOUNTS':
      return {
        ...state,
        accounts: action.payload,
        snapshots: [],
        historicalData: [],
      };
    case 'ADD_ACCOUNT': {
      if (state.accounts.some((acc: Account) => acc.id === action.payload.id)) {
          return state;
      }
      return {
        ...state,
        accounts: [...state.accounts, action.payload],
      };
    }
    case 'UPDATE_ACCOUNT_METADATA': {
      return {
        ...state,
        accounts: state.accounts.map((account: Account) =>
          account.id === action.payload.id
            ? action.payload
            : account
        ),
      };
    }
    case 'ADD_BALANCE_ENTRY': {
      return {
        ...state,
        accounts: state.accounts.map((account: Account) =>
          account.id === action.payload.accountId
            ? {
                ...account,
                balanceHistory: action.payload.balanceHistory,
              }
            : account
        ),
      };
    }
    case 'DELETE_ACCOUNT': {
      return {
        ...state,
        accounts: state.accounts.filter((account: Account) => account.id !== action.payload),
      };
    }
    case 'ADD_SNAPSHOT': {
      const currentTotals = calculateNetWorth(state.accounts);
      const snapshotAccounts = state.accounts.map((acc: Account) => ({
        id: acc.id,
        balance: getCurrentBalance(acc)
      }));

      const newSnapshot: NetWorthSnapshot = {
        id: uuidv4(),
        date: action.payload.date,
        totalAssets: currentTotals.totalAssets,
        totalLiabilities: currentTotals.totalLiabilities,
        netWorth: currentTotals.netWorth,
        accounts: snapshotAccounts,
      };

      if (state.accounts.length === 0) {
        return state;
      }
      return {
        ...state,
        snapshots: [...state.snapshots, newSnapshot],
      };
    }
    case 'UPDATE_ACCOUNTS_ORDER':
        return { ...state, accounts: action.payload };
    case 'SET_HISTORICAL_DATA':
        return {
            ...state,
            historicalData: action.payload.sort((a, b) => a.year - b.year),
        };
    case 'UPSERT_HISTORICAL_DATA_POINT': {
        const existingIndex = state.historicalData.findIndex(
            (item: HistoricalDataPoint) => item.year === action.payload.year
        );
        let updatedHistoricalData;
        if (existingIndex !== -1) {
            updatedHistoricalData = state.historicalData.map((item: HistoricalDataPoint, index: number) =>
                index === existingIndex ? action.payload : item
            );
        } else {
            updatedHistoricalData = [...state.historicalData, action.payload].sort((a, b) => a.year - b.year);
        }
        return {
            ...state,
            historicalData: updatedHistoricalData,
        };
    }
    case 'DELETE_HISTORICAL_DATA_POINT': {
        return {
            ...state,
            historicalData: state.historicalData.filter(
                (item: HistoricalDataPoint) => item.year !== action.payload.year
            ),
        };
    }
    default:
      return state;
  }
}

interface NetWorthContextType {
  state: State;
  dispatch: React.Dispatch<NetWorthAction>;
  loading: boolean;
  error: PostgrestError | Error | null;
  fetchAccounts: () => Promise<void>;
  addAccount: (accountData: Omit<Account, 'id' | 'user_id' | 'created_at' | 'balanceHistory'> & { balance: number }) => Promise<Account | null>;
  updateAccountMetadata: (accountData: Omit<Account, 'user_id' | 'created_at' | 'balanceHistory'>) => Promise<Account | null>;
  deleteAccount: (accountId: string) => Promise<void>;
  addBalanceEntry: (payload: { accountId: string; balance: number; date?: string }) => Promise<void>;
  fetchHistoricalData: () => Promise<void>;
  upsertHistoricalDataPoint: (dataPoint: { year: number; net_worth: number }) => Promise<HistoricalDataPoint | null>;
  deleteHistoricalDataPoint: (year: number) => Promise<void>;
}

const NetWorthContext = createContext<NetWorthContextType | null>(null);

export function NetWorthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PostgrestError | Error | null>(null);

  const fetchAllUserData = useCallback(async () => {
    if (!user) {
      dispatch({ type: 'SET_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_HISTORICAL_DATA', payload: [] });
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`Fetching all data for user: ${user.id}`);

    try {
      const [accountsResponse, historicalDataResponse] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('historical_data').select('year, net_worth').eq('user_id', user.id)
      ]);

      if (accountsResponse.error) {
        console.error("Error fetching accounts:", accountsResponse.error);
        setError(accountsResponse.error);
        dispatch({ type: 'SET_ACCOUNTS', payload: [] });
      } else {
        const accountsWithCorrectMapping = accountsResponse.data.map(acc => ({
           ...acc,
           balanceHistory: Array.isArray(acc.balance_history) ? acc.balance_history : [],
           tags: Array.isArray(acc.tags) ? acc.tags : [],
         }));
        dispatch({ type: 'SET_ACCOUNTS', payload: accountsWithCorrectMapping });
      }

      if (historicalDataResponse.error) {
        console.error("Error fetching historical data:", historicalDataResponse.error);
        if (!error) setError(historicalDataResponse.error);
        dispatch({ type: 'SET_HISTORICAL_DATA', payload: [] });
      } else {
        dispatch({ type: 'SET_HISTORICAL_DATA', payload: historicalDataResponse.data as HistoricalDataPoint[] });
      }

    } catch (err) {
        console.error("Unexpected error during fetchAllUserData:", err);
        setError(err instanceof Error ? err : new Error("An unexpected error occurred fetching data"));
        dispatch({ type: 'SET_ACCOUNTS', payload: [] });
        dispatch({ type: 'SET_HISTORICAL_DATA', payload: [] });
    } finally {
      setLoading(false);
    }
  }, [user, error]);

  useEffect(() => {
    fetchAllUserData();
  }, [fetchAllUserData]);

  const addAccount = async (accountData: Omit<Account, 'id' | 'user_id' | 'created_at' | 'balanceHistory'> & { balance: number }): Promise<Account | null> => {
    if (!user) {
        console.error("Cannot add account: no user logged in.");
        return null;
    }

    const initialBalanceEntry: BalanceEntry = {
        date: new Date().toISOString(),
        balance: accountData.balance,
    };

    const accountToInsert = {
      ...accountData,
      user_id: user.id,
      balance_history: [initialBalanceEntry],
      tags: accountData.tags || [],
      order: accountData.order,
    };
    delete (accountToInsert as any).balance;

    console.log("Attempting to insert account:", accountToInsert);

    const { data, error: insertError } = await supabase
      .from('accounts')
      .insert(accountToInsert)
      .select()
      .single();

    if (insertError) {
      console.error("Error adding account:", insertError);
      setError(insertError);
      return null;
    } else {
       console.log("Successfully inserted account:", data);
       
       const newAccount: Account = {
           ...data,
           balanceHistory: Array.isArray(data.balance_history) ? data.balance_history : [],
           tags: Array.isArray(data.tags) ? data.tags : [],
        };
      dispatch({ type: 'ADD_ACCOUNT', payload: newAccount });
      return newAccount;
    }
  };

  const updateAccountMetadata = async (accountData: Omit<Account, 'user_id' | 'created_at' | 'balanceHistory'>): Promise<Account | null> => {
     if (!user) {
         console.error("Cannot update account: no user logged in.");
         return null;
     }

     const { id, ...updateData } = accountData;

     console.log(`Attempting to update account ${id}:`, updateData);

     const { data, error: updateError } = await supabase
       .from('accounts')
       .update(updateData)
       .eq('id', id)
       .eq('user_id', user.id)
       .select()
       .single();

     if (updateError) {
       console.error("Error updating account:", updateError);
       setError(updateError);
       return null;
     } else {
       const updatedAccount: Account = {
           ...data,
           balanceHistory: Array.isArray(data.balance_history) ? data.balance_history : [],
           tags: Array.isArray(data.tags) ? data.tags : [],
        };
       dispatch({ type: 'UPDATE_ACCOUNT_METADATA', payload: updatedAccount });
       return updatedAccount;
     }
   };

   const deleteAccount = async (accountId: string): Promise<void> => {
     if (!user) return;
     const { error: deleteError } = await supabase
       .from('accounts')
       .delete()
       .eq('id', accountId)
       .eq('user_id', user.id);

     if (deleteError) {
       console.error("Error deleting account:", deleteError);
       setError(deleteError);
     } else {
       dispatch({ type: 'DELETE_ACCOUNT', payload: accountId });
     }
   };

   const addBalanceEntry = async (payload: { accountId: string; balance: number; date?: string }): Promise<void> => {
        if (!user) return;
         const { accountId, balance, date } = payload;
         const entryDate = date || new Date().toISOString();
         const account = state.accounts.find(acc => acc.id === accountId);
         if (!account) return;

         const newBalanceHistory = [
             ...account.balanceHistory,
             { date: entryDate, balance: balance }
         ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

         const { data, error: updateError } = await supabase
           .from('accounts')
           .update({ balance_history: newBalanceHistory })
           .eq('id', accountId)
           .eq('user_id', user.id)
           .select('id, balance_history')
           .single();

         if (updateError) {
           console.error("Error adding balance entry:", updateError);
           setError(updateError);
         } else {
           dispatch({ type: 'ADD_BALANCE_ENTRY', payload: { accountId, balanceHistory: data.balance_history } });
         }
    };

  const upsertHistoricalDataPoint = async (dataPoint: { year: number; net_worth: number }): Promise<HistoricalDataPoint | null> => {
      if (!user) return null;
      setError(null);

      const dataToUpsert = {
          ...dataPoint,
          user_id: user.id,
      };

      const { data, error: upsertError } = await supabase
          .from('historical_data')
          .upsert(dataToUpsert, { onConflict: 'user_id, year' })
          .select('year, net_worth')
          .single();

      if (upsertError) {
          console.error("Error upserting historical data:", upsertError);
          setError(upsertError);
          return null;
      } else {
          dispatch({ type: 'UPSERT_HISTORICAL_DATA_POINT', payload: data as HistoricalDataPoint });
          return data as HistoricalDataPoint;
      }
  };

  const deleteHistoricalDataPoint = async (year: number): Promise<void> => {
      if (!user) return;
      setError(null);

      const { error: deleteError } = await supabase
          .from('historical_data')
          .delete()
          .eq('user_id', user.id)
          .eq('year', year);

      if (deleteError) {
          console.error("Error deleting historical data point:", deleteError);
          setError(deleteError);
      } else {
          dispatch({ type: 'DELETE_HISTORICAL_DATA_POINT', payload: { year } });
      }
  };

  const contextValue: NetWorthContextType = {
    state,
    dispatch,
    loading,
    error,
    fetchAccounts: fetchAllUserData,
    addAccount,
    updateAccountMetadata,
    deleteAccount,
    addBalanceEntry,
    fetchHistoricalData: fetchAllUserData,
    upsertHistoricalDataPoint,
    deleteHistoricalDataPoint,
  };

  return <NetWorthContext.Provider value={contextValue}>{children}</NetWorthContext.Provider>;
}

export function useNetWorth() {
  const context = useContext(NetWorthContext);
  if (!context) {
    throw new Error('useNetWorth must be used within a NetWorthProvider');
  }
  return context;
}

export function useNetWorthCalculations() {
  const { state } = useNetWorth();
  return calculateNetWorth(state.accounts);
}

export { getCurrentBalance, getLatestBalanceEntry }; 