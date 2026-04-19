import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { LoadingScreen } from './components/ui/index';
import './styles/mobile.css';
import useThemeStore from './store/themeStore';

// Init theme before first render — prevents flash of wrong theme
useThemeStore.getState().init();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<LoadingScreen />}>
          <App />
        </Suspense>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background:    'var(--glass-3)',
              backdropFilter:'blur(20px)',
              color:         'var(--text-1)',
              border:        '1px solid var(--border-2)',
              borderRadius:  '14px',
              fontSize:      '14px',
              fontFamily:    'Inter, sans-serif',
              boxShadow:     '0 8px 32px rgba(0,0,0,0.5)',
              maxWidth:      '420px',
            },
            success: { iconTheme: { primary: '#10B981', secondary: 'transparent' } },
            error:   { iconTheme: { primary: '#EF4444', secondary: 'transparent' } },
            loading: { iconTheme: { primary: '#7C3AED', secondary: 'transparent' } },
          }}
        />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
