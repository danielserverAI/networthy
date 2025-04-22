import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

interface UserProfileDropdownProps {
  onDataManagementClick: () => void;
}

// Helper to get initials from email
const getInitials = (email: string | undefined): string => {
  if (!email) return '?';
  const parts = email.split('@')[0];
  const nameParts = parts.split(/[._-]/);
  if (nameParts.length >= 2) {
    return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
  } else if (parts.length >= 2) {
      return (parts[0] + parts[1]).toUpperCase();
  }
  return parts[0]?.toUpperCase() || '?';
};

export function UserProfileDropdown({ onDataManagementClick }: UserProfileDropdownProps) {
  const { user, signOut, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null; // Don't render if no user

  const avatarUrl = user.user_metadata?.avatar_url;
  const userEmail = user.email;

  const handleSignOut = async () => {
    setIsOpen(false); // Close dropdown first
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
      // Optionally show error to user via toast or alert
    }
  };

  const handleDataManagement = () => {
      setIsOpen(false);
      onDataManagementClick();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-full text-sm font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {avatarUrl ? (
          <img 
            src={avatarUrl}
            alt="User Avatar"
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span>{getInitials(userEmail)}</span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="user-menu-button"
          tabIndex={-1}
        >
          {/* Menu Item 1: Data Management */}
          <button
            onClick={handleDataManagement}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            role="menuitem"
            tabIndex={-1}
            id="user-menu-item-0"
          >
            Data Management
          </button>

          {/* Menu Item 2: Sign Out */}
          <button
            onClick={handleSignOut}
            disabled={loading} // Disable while signing out
            className="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            role="menuitem"
            tabIndex={-1}
            id="user-menu-item-1"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
} 