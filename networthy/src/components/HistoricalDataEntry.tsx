import React, { useState, useEffect } from 'react';
import { useNetWorth } from '../context/NetWorthContext';
import { HistoricalDataPoint } from '../context/NetWorthContext';

interface HistoricalDataEntryProps {
  onClose: () => void;
  dataPointToEdit?: HistoricalDataPoint | null;
}

export function HistoricalDataEntry({ onClose, dataPointToEdit }: HistoricalDataEntryProps) {
  const { upsertHistoricalDataPoint } = useNetWorth();
  const [year, setYear] = useState<number | ''>('');
  const [netWorth, setNetWorth] = useState<number | ''>('');
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!dataPointToEdit;

  useEffect(() => {
    if (isEditing) {
      setYear(dataPointToEdit.year);
      setNetWorth(dataPointToEdit.net_worth);
    } else {
      setYear('');
      setNetWorth('');
    }
    setError('');
  }, [dataPointToEdit, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (year === '' || netWorth === '') {
      setError('Both year and net worth are required.');
      return;
    }
    const numericYear = Number(year);
    const numericNetWorth = Number(netWorth);
    if (isNaN(numericYear) || isNaN(numericNetWorth)){
        setError('Invalid number format.');
        return;
    }
    if (!isEditing && (numericYear < 1900 || numericYear > new Date().getFullYear())) {
       setError(`Year must be between 1900 and ${new Date().getFullYear()}.`);
       return;
    }

    setIsSubmitting(true);
    try {
      const result = await upsertHistoricalDataPoint({ 
        year: numericYear,
        net_worth: numericNetWorth
      });

      if (result) {
        console.log(`${isEditing ? 'Updated' : 'Added'} historical data: Year ${year}, Net Worth ${netWorth}`);
        onClose();
      } else {
          setError(`Failed to ${isEditing ? 'update' : 'add'} historical data. Please try again.`);
      }

    } catch (err) {
        console.error("Error submitting historical data:", err);
        setError('An unexpected error occurred.');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full m-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Add/Edit Historical Net Worth</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
            aria-label="Close"
            disabled={isSubmitting}
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
            <input
              type="number"
              id="year"
              value={year}
              onChange={(e) => setYear(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              placeholder="YYYY"
              className="input w-full"
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="netWorth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Net Worth</label>
            <div className="relative">
               <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">$</span>
               <input
                 type="number"
                 id="netWorth"
                 value={netWorth}
                 onChange={(e) => setNetWorth(e.target.value === '' ? '' : parseFloat(e.target.value))}
                 placeholder="Enter total net worth for that year"
                 className="input w-full pl-7"
                 step="0.01"
                 required
                 disabled={isSubmitting}
               />
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex justify-end space-x-3 pt-2">
             <button 
               type="button" 
               onClick={onClose} 
               className="btn-secondary"
               disabled={isSubmitting}
             >
               Cancel
             </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Historical Data'} 
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 