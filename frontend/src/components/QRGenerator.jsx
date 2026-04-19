// frontend/src/components/QRGenerator.jsx
// Driver shows this QR on their screen; students scan it to board

import { useState, useEffect, useCallback } from 'react';
import { QrCode, RefreshCw, Clock } from 'lucide-react';
import api from '../services/api';

// Simple QR code SVG generator using a lightweight algorithm
// We use a URL-based approach via the free QR API (no library needed)
const QR_API = 'https://api.qrserver.com/v1/create-qr-code';

const QRGenerator = ({ tripId, shuttleId, isActive }) => {
  const [qrData, setQrData] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const generateQR = useCallback(async () => {
    if (!tripId || !shuttleId || !isActive) return;
    setIsLoading(true);
    setError('');
    try {
      const { data } = await api.post('/checkin/generate', { tripId, shuttleId });
      setQrData(data.data);
      setTimeLeft(60);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate QR');
    } finally {
      setIsLoading(false);
    }
  }, [tripId, shuttleId, isActive]);

  // Auto-generate on mount and every 55s
  useEffect(() => {
    if (!isActive) return;
    generateQR();
    const interval = setInterval(generateQR, 55000);
    return () => clearInterval(interval);
  }, [generateQR, isActive]);

  // Countdown timer
  useEffect(() => {
    if (!qrData) return;
    const tick = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(tick); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [qrData]);

  const qrImageUrl = qrData
    ? `${QR_API}?size=200x200&data=${encodeURIComponent(qrData.qrUrl)}&color=F9FAFB&bgcolor=132C47&margin=2`
    : null;

  if (!isActive) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <QrCode size={40} style={{ color: 'var(--text-4)' }} />
        <p className="text-sm" style={{ color: 'var(--text-3)' }}>
          Start a trip to enable QR check-in
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--glass-2)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <QrCode size={18} style={{ color: 'var(--brand)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
            Passenger QR Check-In
          </span>
        </div>
        <button onClick={generateQR} disabled={isLoading}
          className="btn-ghost btn-icon" title="Refresh QR">
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="text-sm text-center py-4" style={{ color: '#F87171' }}>{error}</div>
      )}

      {isLoading && !qrData && (
        <div className="flex justify-center py-8">
          <div className="loader"><span /><span /><span /></div>
        </div>
      )}

      {qrImageUrl && (
        <div className="flex flex-col items-center gap-4">
          {/* QR image */}
          <div className="rounded-2xl p-3" style={{ background: '#132C47', border: '1px solid var(--border-2)' }}>
            <img
              src={qrImageUrl}
              alt="Check-in QR Code"
              width={180}
              height={180}
              style={{ display: 'block', borderRadius: 8 }}
            />
          </div>

          {/* Countdown */}
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} style={{ color: timeLeft < 15 ? '#F87171' : 'var(--text-3)' }} />
            <span style={{ color: timeLeft < 15 ? '#F87171' : 'var(--text-3)' }}>
              Refreshes in {timeLeft}s
            </span>
            {/* Progress bar */}
            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--glass-1)' }}>
              <div className="h-full rounded-full transition-all"
                style={{
                  width: `${(timeLeft / 60) * 100}%`,
                  background: timeLeft < 15 ? '#EF4444' : '#1A56DB',
                  transition: 'width 1s linear',
                }} />
            </div>
          </div>

          <p className="text-xs text-center" style={{ color: 'var(--text-4)' }}>
            Show this to passengers to scan with ShutliX
          </p>
        </div>
      )}
    </div>
  );
};

export default QRGenerator;