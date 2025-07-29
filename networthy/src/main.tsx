// import React from 'react'; // Removed
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { TestApp } from './TestApp.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { NetWorthProvider } from './context/NetWorthContext';
import { ThemeProvider } from './context/ThemeContext';

// Use TestApp to debug chart issue
const isDevelopment = import.meta.env.DEV;
const useTestApp = isDevelopment && window.location.search.includes('test=chart');

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    useTestApp ? (
      <TestApp />
    ) : (
      <ThemeProvider>
        <AuthProvider>
          <NetWorthProvider>
            <App />
          </NetWorthProvider>
        </AuthProvider>
      </ThemeProvider>
    )
  // </React.StrictMode>
);
