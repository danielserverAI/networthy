import React, { createContext, useContext, useReducer, ReactNode, useEffect, useCallback } from 'react';
import { Account, BalanceEntry } from '../types';
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

interface UserGoal {
  target_amount: number;
  target_date: string; 
}

export interface HistoricalDataPoint {
  year: number;
  net_worth: number;
}

type State = {
  accounts: Account[];
  snapshots: NetWorthSnapshot[];
  historicalData: HistoricalDataPoint[];
  loading: boolean;
  error: PostgrestError | Error | null;
  userGoal: UserGoal | null;
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

export type NetWorthAction =
  | { type: 'SET_ACCOUNTS'; payload: Account[] }
  | { type: 'ADD_ACCOUNT'; payload: Account }
  | { type: 'UPDATE_ACCOUNT_METADATA'; payload: Account }
  | { type: 'ADD_BALANCE_ENTRY'; payload: { accountId: string; balance: number; date: string } }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'ADD_SNAPSHOT'; payload: Snapshot }
  | { type: 'SET_SNAPSHOTS'; payload: NetWorthSnapshot[] }
  | { type: 'UPDATE_ACCOUNTS_ORDER'; payload: Account[] }
  | { type: 'SET_HISTORICAL_DATA'; payload: HistoricalDataPoint[] }
  | { type: 'UPSERT_HISTORICAL_DATA'; payload: HistoricalDataPoint }
  | { type: 'DELETE_HISTORICAL_DATA'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: PostgrestError | Error | null }
  | { type: 'SET_USER_GOAL'; payload: UserGoal | null }
  | { type: 'DELETE_USER_GOAL' };

const initialState: State = {
  accounts: [],
  snapshots: [],
  historicalData: [],
  loading: true,
  error: null,
  userGoal: null,
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
      const { accountId, balance, date } = action.payload;
      return {
        ...state,
        accounts: state.accounts.map(acc => {
          if (acc.id === accountId) {
            const newHistory: BalanceEntry = { date, balance };
            const updatedHistory = [...(acc.balanceHistory || []), newHistory]
                                   .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            return { ...acc, balanceHistory: updatedHistory };
          } 
          return acc;
        }),
      };
    }
    case 'DELETE_ACCOUNT': {
      return {
        ...state,
        accounts: state.accounts.filter((account: Account) => account.id !== action.payload),
      };
    }
    case 'SET_SNAPSHOTS':
      return {
        ...state,
        snapshots: action.payload.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      };
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
    case 'UPSERT_HISTORICAL_DATA': {
        const existingIndex = state.historicalData.findIndex(
            (item) => item.year === action.payload.year
        );
        let updatedHistoricalData;
        if (existingIndex !== -1) {
            updatedHistoricalData = state.historicalData.map((item, index) =>
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
    case 'DELETE_HISTORICAL_DATA': {
        return {
            ...state,
            historicalData: state.historicalData.filter(
                (item) => item.year !== action.payload
            ),
        };
    }
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_USER_GOAL':
        return { ...state, userGoal: action.payload };
    case 'DELETE_USER_GOAL':
        return { ...state, userGoal: null };
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
  addBalanceEntry: (accountId: string, balance: number, date: string) => Promise<void>;
  fetchSnapshots: () => Promise<void>;
  saveSnapshot: (snapshot: NetWorthSnapshot) => Promise<void>;
  createAndSaveSnapshot: (date?: string) => Promise<void>;
  fetchHistoricalData: () => Promise<void>;
  upsertHistoricalData: (dataPoint: HistoricalDataPoint) => Promise<void>;
  deleteHistoricalData: (year: number) => Promise<void>;
  fetchUserGoal: () => Promise<void>;
  setUserGoal: (goal: UserGoal) => Promise<void>;
  deleteUserGoal: () => Promise<void>;
}

const NetWorthContext = createContext<NetWorthContextType | null>(null);

export function NetWorthProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, initialState);

  const fetchSnapshots = useCallback(async () => {
    if (!user) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // Try to fetch from database first
      const { data, error } = await supabase
        .from('net_worth_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });
      
      if (error) {
        // If database table doesn't exist, try localStorage fallback
        if (error.code === '42P01') { // Table doesn't exist
          console.log('net_worth_snapshots table not found, using localStorage fallback');
          const localSnapshots = localStorage.getItem(`snapshots_${user.id}`);
          if (localSnapshots) {
            const snapshots = JSON.parse(localSnapshots);
            dispatch({ type: 'SET_SNAPSHOTS', payload: snapshots });
          } else {
            dispatch({ type: 'SET_SNAPSHOTS', payload: [] });
          }
        } else {
          throw error;
        }
      } else {
        const snapshots = data.map(snap => ({
          id: snap.id,
          date: snap.date,
          totalAssets: snap.total_assets,
          totalLiabilities: snap.total_liabilities,
          netWorth: snap.net_worth,
          accounts: snap.accounts || []
        }));
        dispatch({ type: 'SET_SNAPSHOTS', payload: snapshots });
      }
      
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (err: any) {
      console.error("Error fetching snapshots:", err);
      dispatch({ type: 'SET_ERROR', payload: err });
      dispatch({ type: 'SET_SNAPSHOTS', payload: [] });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user]);

  const saveSnapshot = useCallback(async (snapshot: NetWorthSnapshot) => {
    if (!user) throw new Error("User not authenticated");
    
    try {
      // Try to save to database first
      const snapshotToSave = {
        id: snapshot.id,
        user_id: user.id,
        date: snapshot.date,
        total_assets: snapshot.totalAssets,
        total_liabilities: snapshot.totalLiabilities,
        net_worth: snapshot.netWorth,
        accounts: snapshot.accounts
      };
      
      const { error } = await supabase
        .from('net_worth_snapshots')
        .upsert(snapshotToSave);
      
      if (error) {
        // If database table doesn't exist, use localStorage fallback
        if (error.code === '42P01') { // Table doesn't exist
          console.log('net_worth_snapshots table not found, saving to localStorage');
          const localSnapshots = localStorage.getItem(`snapshots_${user.id}`);
          const snapshots = localSnapshots ? JSON.parse(localSnapshots) : [];
          
          // Find and replace existing snapshot with same ID, or add new one
          const existingIndex = snapshots.findIndex((s: NetWorthSnapshot) => s.id === snapshot.id);
          if (existingIndex >= 0) {
            snapshots[existingIndex] = snapshot;
          } else {
            snapshots.push(snapshot);
          }
          
          localStorage.setItem(`snapshots_${user.id}`, JSON.stringify(snapshots));
        } else {
          throw error;
        }
      }
    } catch (err: any) {
      console.error("Error saving snapshot:", err);
      // Still try localStorage as fallback
      try {
        const localSnapshots = localStorage.getItem(`snapshots_${user.id}`);
        const snapshots = localSnapshots ? JSON.parse(localSnapshots) : [];
        
        const existingIndex = snapshots.findIndex((s: NetWorthSnapshot) => s.id === snapshot.id);
        if (existingIndex >= 0) {
          snapshots[existingIndex] = snapshot;
        } else {
          snapshots.push(snapshot);
        }
        
        localStorage.setItem(`snapshots_${user.id}`, JSON.stringify(snapshots));
        console.log('Saved snapshot to localStorage as fallback');
      } catch (localErr) {
        console.error("Failed to save to localStorage as well:", localErr);
        throw err; // Re-throw original error
      }
    }
  }, [user]);

  const createAndSaveSnapshot = useCallback(async (date?: string) => {
    if (!user || state.accounts.length === 0) return;
    
    const snapshotDate = date || new Date().toISOString();
    const snapshotDateOnly = snapshotDate.split('T')[0]; // Get just the date part
    
    // Check if we already have a snapshot for today
    const existingTodaySnapshot = state.snapshots.find(snapshot => 
      snapshot.date.split('T')[0] === snapshotDateOnly
    );
    
    const currentTotals = calculateNetWorth(state.accounts);
    
    // If we have a snapshot for today, only update it if the values have changed significantly
    if (existingTodaySnapshot) {
      const netWorthDiff = Math.abs(existingTodaySnapshot.netWorth - currentTotals.netWorth);
      if (netWorthDiff < 0.01) { // Less than 1 cent difference
        return; // Skip creating new snapshot
      }
    }
    
    const snapshotAccounts = state.accounts.map((acc: Account) => ({
      id: acc.id,
      balance: getCurrentBalance(acc)
    }));

    const newSnapshot: NetWorthSnapshot = {
      id: existingTodaySnapshot?.id || uuidv4(), // Reuse ID if updating today's snapshot
      date: snapshotDate,
      totalAssets: currentTotals.totalAssets,
      totalLiabilities: currentTotals.totalLiabilities,
      netWorth: currentTotals.netWorth,
      accounts: snapshotAccounts,
    };

    try {
      // Save to database/localStorage
      await saveSnapshot(newSnapshot);
      
      // Update local state
      dispatch({ type: 'ADD_SNAPSHOT', payload: {
        date: newSnapshot.date,
        totalAssets: newSnapshot.totalAssets,
        totalLiabilities: newSnapshot.totalLiabilities,
        netWorth: newSnapshot.netWorth,
      }});
      
      console.log('Successfully created snapshot:', { 
        date: snapshotDate, 
        netWorth: currentTotals.netWorth,
        isUpdate: !!existingTodaySnapshot 
      });
    } catch (err: any) {
      console.error("Error creating and saving snapshot:", err);
      // Still update local state even if database save fails
      dispatch({ type: 'ADD_SNAPSHOT', payload: {
        date: newSnapshot.date,
        totalAssets: newSnapshot.totalAssets,
        totalLiabilities: newSnapshot.totalLiabilities,
        netWorth: newSnapshot.netWorth,
      }});
    }
  }, [user, state.accounts, state.snapshots, saveSnapshot]);

  const fetchAllUserData = useCallback(async () => {
    if (!user) {
      dispatch({ type: 'SET_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_HISTORICAL_DATA', payload: [] });
      dispatch({ type: 'SET_SNAPSHOTS', payload: [] });
      dispatch({ type: 'SET_USER_GOAL', payload: null });
      dispatch({ type: 'SET_ERROR', payload: null });
      dispatch({ type: 'SET_LOADING', payload: false });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    console.log(`Fetching all data for user: ${user.id}`);

    try {
      const [accountsResponse, historicalDataResponse, goalResponse] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', user.id),
        supabase.from('historical_data').select('year, net_worth').eq('user_id', user.id),
        supabase.from('user_goals').select('target_amount, target_date').eq('user_id', user.id).maybeSingle()
      ]);

      if (accountsResponse.error) {
        console.error("Error fetching accounts:", accountsResponse.error);
        dispatch({ type: 'SET_ERROR', payload: accountsResponse.error });
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
          dispatch({ type: 'SET_ERROR', payload: historicalDataResponse.error });
          dispatch({ type: 'SET_HISTORICAL_DATA', payload: [] });
      } else {
          dispatch({ type: 'SET_HISTORICAL_DATA', payload: historicalDataResponse.data as HistoricalDataPoint[] });
      }

      // Fetch snapshots separately to handle table not existing
      try {
        await fetchSnapshots();
      } catch (snapshotError: any) {
        console.error("Error fetching snapshots:", snapshotError);
        // Don't fail the entire data fetch if snapshots fail
      }

      if (goalResponse.error) {
          console.error("Error fetching user goal:", goalResponse.error);
          dispatch({ type: 'SET_USER_GOAL', payload: null });
          dispatch({ type: 'SET_ERROR', payload: goalResponse.error });
      } else {
          dispatch({ type: 'SET_USER_GOAL', payload: goalResponse.data as UserGoal | null });
      }

    } catch (err: any) {
        console.error("Error fetching data:", err);
        dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err : new Error(String(err)) });
        dispatch({ type: 'SET_ACCOUNTS', payload: [] });
        dispatch({ type: 'SET_HISTORICAL_DATA', payload: [] });
        dispatch({ type: 'SET_SNAPSHOTS', payload: [] });
        dispatch({ type: 'SET_USER_GOAL', payload: null });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user]);

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
      dispatch({ type: 'SET_ERROR', payload: insertError });
      return null;
    } else {
       console.log("Successfully inserted account:", data);
       
       const newAccount: Account = {
           ...data,
           balanceHistory: Array.isArray(data.balance_history) ? data.balance_history : [],
           tags: Array.isArray(data.tags) ? data.tags : [],
        };
      dispatch({ type: 'ADD_ACCOUNT', payload: newAccount });
      dispatch({ type: 'SET_ERROR', payload: null });
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
       dispatch({ type: 'SET_ERROR', payload: updateError });
       return null;
     } else {
       const updatedAccount: Account = {
           ...data,
           balanceHistory: Array.isArray(data.balance_history) ? data.balance_history : [],
           tags: Array.isArray(data.tags) ? data.tags : [],
        };
       dispatch({ type: 'UPDATE_ACCOUNT_METADATA', payload: updatedAccount });
       dispatch({ type: 'SET_ERROR', payload: null });
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
       dispatch({ type: 'SET_ERROR', payload: deleteError });
     } else {
       dispatch({ type: 'DELETE_ACCOUNT', payload: accountId });
     }
   };

   const addBalanceEntry = async (accountId: string, balance: number, date: string) => {
    if (!user) throw new Error("User not authenticated");

    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // 1. Fetch current balance history for the specific account
      const { data: accountData, error: fetchError } = await supabase
        .from('accounts')
        .select('balance_history')
        .eq('user_id', user.id)
        .eq('id', accountId)
        .single();

      if (fetchError) throw fetchError;
      if (!accountData) throw new Error('Account not found');

      // 2. Prepare the new entry and updated history
      const currentHistory: BalanceEntry[] = accountData.balance_history || [];
      const newEntry: BalanceEntry = { date, balance }; // Use the date passed in
      
      // Filter out any existing entry for the exact same date string before adding
      // Note: Supabase uses timestamptz, direct string comparison might be okay,
      // but comparing Date objects might be safer if formats vary.
      const filteredHistory = currentHistory.filter(entry => entry.date !== date);
      const updatedHistory = [...filteredHistory, newEntry]
                                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // 3. Update the account in Supabase with the new history
      const { error: updateError } = await supabase
        .from('accounts')
        .update({ balance_history: updatedHistory })
        .eq('user_id', user.id)
        .eq('id', accountId);

      if (updateError) throw updateError;

      // 4. Dispatch locally AFTER successful DB update using the correct payload
      dispatch({ type: 'ADD_BALANCE_ENTRY', payload: { accountId, balance, date } });
      dispatch({ type: 'SET_ERROR', payload: null });

    } catch (error: any) {
      console.error("Error adding balance entry:", error);
      dispatch({ type: 'SET_ERROR', payload: error });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchHistoricalData = async () => {
      if (!user) return;
       dispatch({ type: 'SET_LOADING', payload: true });
       try {
           const { data, error } = await supabase
               .from('historical_data')
               .select('year, net_worth')
               .eq('user_id', user.id);
           if (error) throw error;
           dispatch({ type: 'SET_HISTORICAL_DATA', payload: data as HistoricalDataPoint[] });
           dispatch({ type: 'SET_ERROR', payload: null });
       } catch (err: any) {
           console.error("Error fetching historical data:", err);
           dispatch({ type: 'SET_ERROR', payload: err });
           dispatch({ type: 'SET_HISTORICAL_DATA', payload: [] });
       } finally {
            dispatch({ type: 'SET_LOADING', payload: false });
       }
  };

  const upsertHistoricalData = async (dataPoint: HistoricalDataPoint) => {
    if (!user) throw new Error("User not authenticated");
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const upsertData = { ...dataPoint, user_id: user.id };
      const { error } = await supabase.from('historical_data').upsert(upsertData, { onConflict: 'user_id, year' });
      if (error) throw error;
      dispatch({ type: 'UPSERT_HISTORICAL_DATA', payload: dataPoint });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (err: any) {
      console.error("Error saving historical data:", err);
      dispatch({ type: 'SET_ERROR', payload: err });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteHistoricalData = async (year: number) => {
    if (!user) throw new Error("User not authenticated");
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { error } = await supabase.from('historical_data').delete().eq('user_id', user.id).eq('year', year);
      if (error) throw error;
      dispatch({ type: 'DELETE_HISTORICAL_DATA', payload: year });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (err: any) {
      console.error("Error deleting historical data:", err);
      dispatch({ type: 'SET_ERROR', payload: err });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const fetchUserGoal = async () => {
      if (!user) return;
       dispatch({ type: 'SET_LOADING', payload: true });
       try {
           const { data, error } = await supabase
               .from('user_goals')
               .select('target_amount, target_date')
               .eq('user_id', user.id)
               .single();
           if (error) {
               if (error.code !== 'PGRST116') {
                  throw error;
               } else {
                   dispatch({ type: 'SET_USER_GOAL', payload: null }); 
               }
           } else {
               dispatch({ type: 'SET_USER_GOAL', payload: data as UserGoal });
           }
           dispatch({ type: 'SET_ERROR', payload: null });
       } catch (err: any) {
            console.error("Error fetching user goal:", err);
            dispatch({ type: 'SET_ERROR', payload: err });
            dispatch({ type: 'SET_USER_GOAL', payload: null });
       } finally {
           dispatch({ type: 'SET_LOADING', payload: false });
       }
  };

  const setUserGoal = async (goal: UserGoal) => {
    if (!user) throw new Error("User not authenticated");
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const upsertData = { ...goal, user_id: user.id };
      const { data, error } = await supabase.from('user_goals').upsert(upsertData).select().single();
      
      if (error) throw error;
      
      dispatch({ type: 'SET_USER_GOAL', payload: data as UserGoal });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (err: any) {
      console.error("Error setting user goal:", err);
      dispatch({ type: 'SET_ERROR', payload: err });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const deleteUserGoal = async () => {
    if (!user) throw new Error("User not authenticated");
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { error } = await supabase.from('user_goals').delete().eq('user_id', user.id);
      if (error) throw error;
      
      dispatch({ type: 'DELETE_USER_GOAL' });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (err: any) {
      console.error("Error deleting user goal:", err);
      dispatch({ type: 'SET_ERROR', payload: err });
      throw err;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const contextValue: NetWorthContextType = {
    state,
    dispatch,
    loading: state.loading,
    error: state.error,
    fetchAccounts: fetchAllUserData,
    addAccount,
    updateAccountMetadata,
    deleteAccount,
    addBalanceEntry,
    fetchSnapshots,
    saveSnapshot,
    createAndSaveSnapshot,
    fetchHistoricalData,
    upsertHistoricalData,
    deleteHistoricalData,
    fetchUserGoal,
    setUserGoal,
    deleteUserGoal,
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