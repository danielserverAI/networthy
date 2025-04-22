import { useState, useEffect } from 'react'; // Import hooks explicitly
import { useTheme } from '../context/ThemeContext';

interface Shortcut {
  key: string;
  description: string;
}

const shortcuts: Shortcut[] = [
  { key: '⌘ + /', description: 'Show keyboard shortcuts' },
  { key: '⌘ + D', description: 'Toggle dark mode' },
  { key: '⌘ + N', description: 'Add new account' },
  { key: '⌘ + A', description: 'Toggle analytics view' },
  { key: '⌘ + S', description: 'Save changes' },
  { key: '⌘ + H', description: 'Add historical data' },
  { key: '⌘ + M', description: 'Open data management' },
  { key: 'Esc', description: 'Close modal/dialog' },
];

export function KeyboardShortcuts() {
  const { /* theme, */ toggleTheme } = useTheme(); // Removed theme variable
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd + / (Mac) or Ctrl + / (Windows)
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-lg w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Keyboard Shortcuts</h3>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            &times;
          </button>
        </div>
        <div className="space-y-4">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-300">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          <p>Press <kbd className="px-1 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">Esc</kbd> to close this dialog</p>
        </div>
      </div>
    </div>
  );
} 