// frontend/src/pages/QRScanPage.jsx
// Students are directed here when they scan the driver's QR code
// URL format: /checkin/:token

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Bus, ArrowLeft } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const QRScanPage = () => {
  const { token } = useParams();
  const { isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState('scanning'); // scanning | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      // Redirect to login, come back after
      navigate(`/login?redirect=/checkin/${token}`, { replace: true });
      return;
    }
    confirmCheckin();
  }, [isAuthenticated, isLoading, token]);

  const confirmCheckin = async () => {
    try {
      await api.post('/checkin/scan', { token });
      setStatus('success');
      setMessage('You\'re checked in! Have a safe journey.');
    } catch (err) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Check-in failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: 'var(--bg-base)' }}>

      <div className="w-full max-w-sm text-center animate-fade-in">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{
            background: status === 'success' ? 'rgba(16,185,129,0.12)'
              : status === 'error' ? 'rgba(239,68,68,0.12)'
              : 'var(--glass-2)',
            border: `2px solid ${status === 'success' ? 'rgba(16,185,129,0.4)'
              : status === 'error' ? 'rgba(239,68,68,0.4)'
              : 'var(--border-2)'}`,
          }}>
          {status === 'scanning' && (
            <Bus size={36} style={{ color: 'var(--brand)' }} />
          )}
          {status === 'success' && (
            <CheckCircle size={36} style={{ color: '#10B981' }} />
          )}
          {status === 'error' && (
            <XCircle size={36} style={{ color: '#EF4444' }} />
          )}
        </div>

        {status === 'scanning' && (
          <>
            <h1 className="font-display font-bold text-2xl mb-2" style={{ color: 'var(--text-1)' }}>
              Confirming check-in...
            </h1>
            <div className="loader justify-center mt-4"><span /><span /><span /></div>
          </>
        )}

        {status === 'success' && (
          <>
            <h1 className="font-display font-bold text-2xl mb-2" style={{ color: '#10B981' }}>
              Boarded!
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>{message}</p>
            <button onClick={() => navigate('/student')} className="btn-primary btn-lg w-full">
              Track my shuttle
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="font-display font-bold text-2xl mb-2" style={{ color: '#EF4444' }}>
              Check-in failed
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>{message}</p>
            <div className="flex gap-3">
              <button onClick={() => navigate('/student')}
                className="btn-secondary flex-1 gap-2">
                <ArrowLeft size={15} /> Back
              </button>
              <button onClick={confirmCheckin} className="btn-primary flex-1">
                Try again
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QRScanPage;