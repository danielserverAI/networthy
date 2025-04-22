// import React from 'react'; // Removed
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { NetWorthProvider } from './context/NetWorthContext';
import { ThemeProvider } from './context/ThemeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <NetWorthProvider>
          <App />
        </NetWorthProvider>
      </AuthProvider>
    </ThemeProvider>
  // </React.StrictMode>
);
