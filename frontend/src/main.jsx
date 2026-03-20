import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';
import useThemeStore from './store/themeStore';

// Initialise theme BEFORE first render to prevent flash
useThemeStore.getState().init();

// Dynamic Toaster that reads CSS variables (works for both dark & light)
const ThemedToaster = () => {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--surface-2)',
          color: 'var(--text-1)',
          border: '1px solid var(--border-md)',
          borderRadius: '12px',
          fontSize: '14px',
          fontFamily: 'Inter, sans-serif',
        },
        success: {
          iconTheme: { primary: '#10B981', secondary: 'var(--surface-2)' },
        },
        error: {
          iconTheme: { primary: '#EF4444', secondary: 'var(--surface-2)' },
        },
      }}
    />
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <ThemedToaster />
    </BrowserRouter>
  </React.StrictMode>
);
