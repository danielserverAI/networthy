import { Account, NetWorthSnapshot } from '../types';
import * as XLSX from 'xlsx';

// Export accounts to Excel
export const exportAccountsToExcel = (accounts: Account[]) => {
  // Prepare data for export
  const exportData = accounts.map(account => ({
    Institution: account.institution,
    Name: account.name || '',
    Type: account.type,
    'Current Balance': account.balanceHistory[account.balanceHistory.length - 1]?.balance || 0,
    'Last Updated': account.balanceHistory[account.balanceHistory.length - 1]?.date || '',
    'Balance History': JSON.stringify(account.balanceHistory)
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);
  XLSX.utils.book_append_sheet(wb, ws, 'Accounts');

  // Generate and download file
  XLSX.writeFile(wb, 'networthy_accounts.xlsx');
};

// Export accounts to CSV
export const exportAccountsToCSV = (accounts: Account[]) => {
  const headers = ['Institution', 'Name', 'Type', 'Current Balance', 'Last Updated'];
  const rows = accounts.map(account => [
    account.institution,
    account.name || '',
    account.type,
    account.balanceHistory[account.balanceHistory.length - 1]?.balance || 0,
    account.balanceHistory[account.balanceHistory.length - 1]?.date || ''
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'networthy_accounts.csv';
  link.click();
};

// Backup data to local storage
export const backupToLocalStorage = (accounts: Account[], snapshots: NetWorthSnapshot[]) => {
  const backupData = {
    accounts,
    snapshots,
    timestamp: new Date().toISOString()
  };

  localStorage.setItem('networthy_backup', JSON.stringify(backupData));
};

// Restore data from local storage
export const restoreFromLocalStorage = () => {
  const backupData = localStorage.getItem('networthy_backup');
  if (!backupData) return null;

  try {
    return JSON.parse(backupData);
  } catch (error) {
    console.error('Error restoring backup:', error);
    return null;
  }
};

// Auto backup every 24 hours
export const setupAutoBackup = (accounts: Account[], snapshots: NetWorthSnapshot[]) => {
  const lastBackup = localStorage.getItem('networthy_last_backup');
  const now = new Date().getTime();

  if (!lastBackup || (now - parseInt(lastBackup)) > 24 * 60 * 60 * 1000) {
    backupToLocalStorage(accounts, snapshots);
    localStorage.setItem('networthy_last_backup', now.toString());
  }
}; 