import React, { useState, FormEvent, useEffect } from 'react';
import { Account, AccountType /*, BalanceEntry */ } from '../types'; // Removed BalanceEntry
import { useNetWorth, getCurrentBalance } from '../context/NetWorthContext';

interface AccountFormProps {
  account?: Account | null; // Allow null explicitly
  onClose: () => void;
}

const accountTypes: AccountType[] = [
  'checkings',
  'savings',
  'cash',
  'investment',
  'crypto',
  'real_estate',
  'other_assets',
  'liability',
];

// Helper to format type names for display
const formatAccountType = (type: AccountType): string => {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export function AccountForm({ account, onClose }: AccountFormProps) {
  // Use the new async functions from context
  const { addAccount, updateAccountMetadata, addBalanceEntry, error: contextError } = useNetWorth();

  const initialBalance = account ? getCurrentBalance(account) : 0;

  const [formData, setFormData] = useState({
    // Initialize based on account prop or defaults
    institution: account?.institution || '',
    name: account?.name || '',
    type: account?.type || 'checkings',
    balance: initialBalance.toString(),
    category: account?.category || '', // Add category
    tags: account?.tags || [], // Add tags
  });

  const [isSubmitting, setIsSubmitting] = useState(false); // Form submission loading state
  const [formError, setFormError] = useState<string | null>(null); // Form-specific error message
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({}); // Field validation errors

  // Reset form state when the account prop changes (e.g., opening for edit vs add)
  useEffect(() => {
    const currentBal = account ? getCurrentBalance(account) : 0;
    setFormData({
        institution: account?.institution || '',
        name: account?.name || '',
        type: account?.type || 'checkings',
        balance: currentBal.toString(),
        category: account?.category || '',
        tags: account?.tags || [],
    });
    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(false);
  }, [account]);

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.institution.trim()) {
      newErrors.institution = 'Institution is required';
    }
    const balance = parseFloat(formData.balance);
    if (isNaN(balance)) {
      newErrors.balance = 'Balance must be a valid number';
    } 
    // Removed liability balance sign check for simplicity, can be added back if needed
    // else if (formData.type === 'liability' && balance > 0) {
    //   newErrors.balance = 'Liabilities should be entered as negative numbers';
    // } else if (formData.type !== 'liability' && balance < 0) {
    //   newErrors.balance = 'Assets should be positive numbers';
    // }

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const currentBalance = parseFloat(formData.balance);
      let success = false; 

      if (account) {
        // --- UPDATING EXISTING ACCOUNT ---
        let isValid = true; // Start assuming valid
        if (isNaN(currentBalance)) {
          setFieldErrors(prev => ({ ...prev, balance: "Invalid balance number."}) );
          isValid = false; // Set to false if balance is NaN
        }

        // Use isValid here, not success!
        if (isValid) { 
           const updatedAccountData: Omit<Account, 'user_id' | 'created_at' | 'balanceHistory'> = { 
             id: account.id, 
             institution: formData.institution,
             type: formData.type as AccountType,
             name: formData.name || undefined,
             category: formData.category || undefined,
             tags: formData.tags || [],
             order: account.order ?? 0 
          };

          const metadataUpdated = await updateAccountMetadata(updatedAccountData); 

          const previousBalance = getCurrentBalance(account);
          let balanceUpdated = true; // Assume balance update succeeds or isn't needed
          if (currentBalance !== previousBalance) {
            try {
                await addBalanceEntry(account.id, currentBalance, new Date().toISOString());
            } catch (balanceError) {
                console.error("Error adding balance entry during update:", balanceError);
                // Optionally set a specific error message about balance update failing
                balanceUpdated = false; // Mark balance update as failed
            }
          }
          // Success if metadata update worked AND balance update worked (or wasn't needed)
          success = !!metadataUpdated && balanceUpdated; 
        }

      } else {
        // --- ADDING NEW ACCOUNT ---
        const newAccountData = {
          institution: formData.institution,
          type: formData.type as AccountType,
          name: formData.name || undefined,
          balance: currentBalance, // Pass balance separately
          category: formData.category || undefined,
          tags: formData.tags || [],
          order: 0 // Default order for new accounts
        };
        const newAccount = await addAccount(newAccountData);
        if (newAccount) {
             success = true;
         } else {
             throw new Error(contextError?.message || "Failed to add new account.");
         }
      }

      if (success) {
        onClose(); // Close form only on successful operation
      }

    } catch (err) {
      console.error("Error submitting account form:", err);
      setFormError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle tag input (simple comma-separated string for now)
  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const tagsArray = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
      setFormData({...formData, tags: tagsArray});
  }

  return (
    // Modal wrapper - assuming parent component handles the modal itself
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-lg w-full m-4">
         <div className="flex justify-between items-center mb-4">
           <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
             {account ? 'Edit Account' : 'Add New Account'}
           </h3>
           <button
             onClick={onClose}
             className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
             disabled={isSubmitting}
           >
             &times;
           </button>
         </div>

         <form onSubmit={handleSubmit} className="space-y-4">
             {/* Institution */}
             <div>
               <label htmlFor="institution" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                 Institution <span className="text-red-500">*</span>
               </label>
               <input
                 type="text"
                 id="institution"
                 value={formData.institution}
                 onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                 className={`input mt-1 ${fieldErrors.institution ? 'border-red-500' : ''}`}
                 disabled={isSubmitting}
                 required
               />
               {fieldErrors.institution && (
                 <p className="mt-1 text-sm text-red-600">{fieldErrors.institution}</p>
               )}
             </div>

             {/* Account Name (Optional) */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Account Name (Optional)
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input mt-1"
                  placeholder="e.g., Primary Checking"
                  disabled={isSubmitting}
                />
              </div>

             {/* Account Type */}
             <div>
               <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                 Account Type
               </label>
               <select
                 id="type"
                 value={formData.type}
                 onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                 className="input mt-1"
                 disabled={isSubmitting}
               >
                 {accountTypes.map((type) => (
                   <option key={type} value={type}>
                     {formatAccountType(type)}
                   </option>
                 ))}
               </select>
             </div>

             {/* Category (Optional) */}
             <div>
                 <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                     Category (Optional)
                 </label>
                 <input
                     type="text"
                     id="category"
                     value={formData.category}
                     onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                     className="input mt-1"
                     placeholder="e.g., Cash, Investment, Debt"
                     disabled={isSubmitting}
                 />
             </div>

             {/* Tags (Optional, comma-separated) */}
             <div>
                 <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                     Tags (Optional, comma-separated)
                 </label>
                 <input
                     type="text"
                     id="tags"
                     value={formData.tags.join(', ')} // Display as comma-separated string
                     onChange={handleTagsChange}
                     className="input mt-1"
                     placeholder="e.g., primary, travel, emergency"
                     disabled={isSubmitting}
                 />
             </div>


             {/* Balance */}
             <div>
               <label htmlFor="balance" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                 Balance <span className="text-red-500">*</span>
               </label>
               <div className="relative mt-1 rounded-md shadow-sm">
                 <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                   <span className="text-gray-500 sm:text-sm">$</span>
                 </div>
                 <input
                   type="number"
                   id="balance"
                   value={formData.balance}
                   onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                   className={`input pl-7 pr-12 ${fieldErrors.balance ? 'border-red-500' : ''}`}
                   step="0.01"
                   placeholder="0.00"
                   disabled={isSubmitting}
                   required
                 />
               </div>
               {fieldErrors.balance && (
                 <p className="mt-1 text-sm text-red-600">{fieldErrors.balance}</p>
               )}
             </div>

             {/* Form Error Message */}
             {formError && (
                 <p className="mt-1 text-sm text-red-600 text-center">Error: {formError}</p>
             )}

             {/* Buttons */}
             <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
               <button type="button" onClick={onClose} className="btn-secondary" disabled={isSubmitting}>
                 Cancel
               </button>
               <button type="submit" className="btn-primary" disabled={isSubmitting}>
                 {isSubmitting ? 'Saving...' : (account ? 'Save Changes' : 'Add Account')}
               </button>
             </div>
         </form>
     </div>

  );
} 