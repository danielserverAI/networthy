import React, { useState } from 'react';
import { useNetWorth } from '../context/NetWorthContext';
import { exportAccountsToExcel, exportAccountsToCSV } from '../utils/dataManagement';
import { HistoricalDataList } from './HistoricalDataList';
import { HistoricalDataEntry } from './HistoricalDataEntry';
import { HistoricalDataPoint } from '../context/NetWorthContext';

export function DataManagement() {
  const { state } = useNetWorth();
  
  const [showHistoricalForm, setShowHistoricalForm] = useState(false);
  const [editingDataPoint, setEditingDataPoint] = useState<HistoricalDataPoint | null>(null);

  const handleAddHistoricalClick = () => {
    setEditingDataPoint(null);
    setShowHistoricalForm(true);
  };
  
  const handleEditHistoricalClick = (dataPoint: HistoricalDataPoint) => {
    setEditingDataPoint(dataPoint);
    setShowHistoricalForm(true);
  };
  
  const handleCloseHistoricalForm = () => {
    setShowHistoricalForm(false);
    setEditingDataPoint(null);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Data Management</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => exportAccountsToExcel(state.accounts)}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export to Excel
        </button>

        <button
          onClick={() => exportAccountsToCSV(state.accounts)}
          className="btn-secondary flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export to CSV
        </button>
      </div>

      <div className="border-t dark:border-gray-700 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">Historical Data</h4>
          <button 
            onClick={handleAddHistoricalClick}
            className="btn-primary btn-xs"
          >
            + Add Entry
          </button>
        </div>
        <HistoricalDataList onEdit={handleEditHistoricalClick} />
      </div>

      {showHistoricalForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-[70]">
          <HistoricalDataEntry 
            onClose={handleCloseHistoricalForm} 
            dataPointToEdit={editingDataPoint} 
          />
        </div>
      )}
    </div>
  );
} 