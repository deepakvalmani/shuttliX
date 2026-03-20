// frontend/src/components/RatingModal.jsx
import { useState } from 'react';
import { Star, X } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const TAGS = [
  { key: 'on_time',     label: '⏱ On time' },
  { key: 'clean',       label: '✨ Clean' },
  { key: 'safe_driving',label: '🛡 Safe driving' },
  { key: 'helpful',     label: '👍 Helpful driver' },
  { key: 'overcrowded', label: '😤 Overcrowded' },
  { key: 'late',        label: '⏰ Late' },
  { key: 'rough_ride',  label: '🤕 Rough ride' },
  { key: 'great_driver',label: '⭐ Great driver' },
];

const RatingModal = ({ trip, onClose, onSubmitted }) => {
  const [score, setScore] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTag = (key) => {
    setSelectedTags(prev =>
      prev.includes(key) ? prev.filter(t => t !== key) : [...prev, key]
    );
  };

  const handleSubmit = async () => {
    if (score === 0) { toast.error('Please select a rating'); return; }
    setIsSubmitting(true);
    try {
      await api.post('/student/rate', {
        tripId: trip._id,
        score,
        comment: comment.trim() || undefined,
        tags: selectedTags,
      });
      toast.success('Rating submitted! Thank you.');
      onSubmitted?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayScore = hovered || score;
  const labels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 animate-slide-up"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>
              Rate your ride
            </h3>
            {trip?.routeId?.name && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
                {trip.routeId.name}
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-2">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n}
              onClick={() => setScore(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform hover:scale-110 active:scale-95"
              style={{ padding: 4 }}>
              <Star
                size={36}
                style={{
                  fill: n <= displayScore ? '#F59E0B' : 'transparent',
                  color: n <= displayScore ? '#F59E0B' : 'var(--surface-4)',
                  transition: 'all 0.1s',
                }}
              />
            </button>
          ))}
        </div>
        <p className="text-center text-sm font-medium mb-5"
          style={{ color: displayScore ? '#F59E0B' : 'var(--text-4)', minHeight: 20 }}>
          {labels[displayScore]}
        </p>

        {/* Quick tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {TAGS.map(({ key, label }) => (
            <button key={key}
              onClick={() => toggleTag(key)}
              className="text-xs px-3 py-1.5 rounded-full transition-all"
              style={{
                background: selectedTags.includes(key) ? 'rgba(26,86,219,0.2)' : 'var(--surface-3)',
                border: `1px solid ${selectedTags.includes(key) ? 'var(--brand)' : 'var(--border)'}`,
                color: selectedTags.includes(key) ? 'var(--brand)' : 'var(--text-3)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Optional comment */}
        <textarea
          className="input resize-none mb-5"
          rows={2}
          placeholder="Add a comment (optional)..."
          value={comment}
          onChange={e => setComment(e.target.value)}
          maxLength={300}
        />

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Skip</button>
          <button onClick={handleSubmit} disabled={isSubmitting || score === 0}
            className="btn-primary flex-1">
            {isSubmitting
              ? <span className="dot-loader"><span /><span /><span /></span>
              : 'Submit rating'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RatingModal;