import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';
import useThemeStore from './store/themeStore';

// Init theme before first render — prevents flash
useThemeStore.getState().init();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--glass-3)',
            backdropFilter: 'blur(20px)',
            color: 'var(--text-1)',
            border: '1px solid var(--border-2)',
            borderRadius: '14px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          },
          success: { iconTheme: { primary: '#10B981', secondary: 'transparent' } },
          error:   { iconTheme: { primary: '#EF4444', secondary: 'transparent' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
