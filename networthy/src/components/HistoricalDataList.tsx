import React, { useState } from 'react';
import { useNetWorth } from '../context/NetWorthContext';
import { HistoricalDataPoint } from '../context/NetWorthContext'; // Import the type

interface HistoricalDataListProps {
  onEdit: (dataPoint: HistoricalDataPoint) => void; // Callback to signal editing
}

export function HistoricalDataList({ onEdit }: HistoricalDataListProps) {
  const { state, deleteHistoricalDataPoint, loading, error } = useNetWorth();
  const [dataPointToDelete, setDataPointToDelete] = useState<HistoricalDataPoint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteClick = (dataPoint: HistoricalDataPoint) => {
    setDataPointToDelete(dataPoint);
    setDeleteError(null); // Clear previous errors
  };

  const confirmDelete = async () => {
    if (!dataPointToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteHistoricalDataPoint(dataPointToDelete.year);
      setDataPointToDelete(null); // Close modal on success
    } catch (err) {
      console.error("Failed to delete historical data point:", err);
      // Use context error if available, otherwise generic message
      const errorMessage = (error instanceof Error ? error.message : null) || 'Failed to delete data point. Please try again.';
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };

  return (
    <div className="mt-6">
      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Existing Historical Data</h4>
      {loading && <p className="text-gray-500 dark:text-gray-400">Loading data...</p>}
      {!loading && state.historicalData.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">No historical data added yet.</p>
      )}
      {!loading && state.historicalData.length > 0 && (
        <ul className="space-y-2 max-h-60 overflow-y-auto border dark:border-gray-700 rounded-md p-3">
          {state.historicalData.map((dp) => (
            <li key={dp.year} className="flex justify-between items-center py-1 border-b dark:border-gray-700 last:border-b-0">
              <span className="text-gray-800 dark:text-gray-200">
                {dp.year}: {formatCurrency(dp.net_worth)}
              </span>
              <div className="space-x-2">
                <button 
                  onClick={() => onEdit(dp)} 
                  className="text-blue-600 hover:text-blue-800 text-sm"
                  aria-label={`Edit data for ${dp.year}`}
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteClick(dp)} 
                  className="text-red-600 hover:text-red-800 text-sm"
                  aria-label={`Delete data for ${dp.year}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Delete Confirmation Modal */}
      {dataPointToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-[60]"> {/* Ensure higher z-index */} 
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-sm w-full m-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Confirm Delete</h3>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Are you sure you want to delete the historical data for the year {dataPointToDelete.year}? This action cannot be undone.
            </p>
            {deleteError && <p className="text-red-500 text-sm mb-3">Error: {deleteError}</p>}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDataPointToDelete(null)}
                className="btn-secondary"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="btn-danger"
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