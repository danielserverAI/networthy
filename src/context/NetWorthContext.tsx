import React, { createContext, useContext, useReducer, ReactNode } from 'react';
// Updated import to include BalanceEntry
import { Account, NetWorthSnapshot, BalanceEntry, AccountType } from '../types'; 
import { v4 as uuidv4 } from 'uuid';

// ... HistoricalDataPoint interface remains the same ...
interface HistoricalDataPoint {
  year: number;
  netWorth: number;
}


interface State {
  accounts: Account[];
  snapshots: NetWorthSnapshot[];
  historicalData: HistoricalDataPoint[];
}

// Helper to get the latest balance for an account
const getCurrentBalance = (account: Account): number => {
  if (!account.balanceHistory || account.balanceHistory.length === 0) {
    return 0;
  }
  // Assuming history is sorted, but let's sort just in case to be safe
  const sortedHistory = [...account.balanceHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return sortedHistory[0].balance;
};

// Omit balanceHistory from ADD_ACCOUNT payload, require initial balance
interface AddAccountPayload extends Omit<Account, 'id' | 'balanceHistory'> {
  balance: number;
}

// Define payload for adding a balance entry
interface AddBalanceEntryPayload {
  accountId: string;
  balance: number;
  date?: string; // Optional date, defaults to now
}

// Define payload for updating account metadata (excluding balance)
interface UpdateAccountMetadataPayload extends Omit<Account, 'balanceHistory'> { }

type Action =
  | { type: 'ADD_ACCOUNT'; payload: AddAccountPayload }
  // UPDATE_ACCOUNT now only updates metadata (name, institution, type)
  | { type: 'UPDATE_ACCOUNT_METADATA'; payload: UpdateAccountMetadataPayload }
  // New action specifically for adding balance entries
  | { type: 'ADD_BALANCE_ENTRY'; payload: AddBalanceEntryPayload }
  | { type: 'DELETE_ACCOUNT'; payload: string }
  | { type: 'ADD_SNAPSHOT'; payload: Omit<NetWorthSnapshot, 'accounts'> }
  | { type: 'ADD_HISTORICAL_DATA'; payload: HistoricalDataPoint };

const initialState: State = {
  accounts: [],
  snapshots: [],
  historicalData: [],
};

// Updated calculateNetWorth to use getCurrentBalance
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

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_ACCOUNT': {
      const { balance, ...metadata } = action.payload;
      const newAccount: Account = {
        ...metadata,
        id: uuidv4(),
        balanceHistory: [
          { date: new Date().toISOString(), balance: balance } // Create initial balance entry
        ],
      };
      return {
        ...state,
        accounts: [...state.accounts, newAccount],
      };
    }
    // Renamed from UPDATE_ACCOUNT
    case 'UPDATE_ACCOUNT_METADATA': {
      return {
        ...state,
        accounts: state.accounts.map((account) =>
          account.id === action.payload.id ? 
          { ...account, // Keep existing balance history 
            institution: action.payload.institution,
            type: action.payload.type,
            name: action.payload.name 
          } : account
        ),
      };
    }
    // New action handler for adding balance entries
    case 'ADD_BALANCE_ENTRY': {
      return {
        ...state,
        accounts: state.accounts.map((account) => {
          if (account.id === action.payload.accountId) {
            const newEntry: BalanceEntry = {
              date: action.payload.date || new Date().toISOString(),
              balance: action.payload.balance,
            };
            // Add new entry and sort history by date descending
            const updatedHistory = [...account.balanceHistory, newEntry].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            return { ...account, balanceHistory: updatedHistory };
          } 
          return account;
        }),
      };
    }
    case 'DELETE_ACCOUNT': {
      // Logic remains the same
      return {
        ...state,
        accounts: state.accounts.filter((account) => account.id !== action.payload),
      };
    }
    case 'ADD_SNAPSHOT': {
      // Logic remains the same, but the included accounts now have history
      const newSnapshot: NetWorthSnapshot = {
        ...action.payload,
        accounts: [...state.accounts], // Store accounts state at snapshot time
      };
      return {
        ...state,
        snapshots: [...state.snapshots, newSnapshot],
      };
    }
    case 'ADD_HISTORICAL_DATA': {
      // Logic remains the same
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
    default:
      return state;
  }
}

// Context and Provider remain structurally the same
const NetWorthContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function NetWorthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <NetWorthContext.Provider value={{ state, dispatch }}>
      {children}
    </NetWorthContext.Provider>
  );
}

// useNetWorth hook remains the same
export function useNetWorth() {
  const context = useContext(NetWorthContext);
  if (!context) {
    throw new Error('useNetWorth must be used within a NetWorthProvider');
  }
  return context;
}

// useNetWorthCalculations hook remains the same but uses updated calculateNetWorth
export function useNetWorthCalculations() {
  const { state } = useNetWorth();
  return calculateNetWorth(state.accounts);
}

// Export helper function to get current balance if needed elsewhere
export { getCurrentBalance }; 