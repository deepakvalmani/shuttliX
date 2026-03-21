// frontend/src/components/MaintenanceModal.jsx
import { useState } from 'react';
import { X, Wrench, Save, Calendar } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const MaintenanceModal = ({ shuttle, onClose, onSaved }) => {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'scheduled',
    description: '',
    performedBy: '',
    cost: '',
    nextServiceDue: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!form.description.trim()) { toast.error('Description required'); return; }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        cost: form.cost ? Number(form.cost) : undefined,
        nextServiceDue: form.nextServiceDue || undefined,
      };
      await api.post(`/shuttles/${shuttle._id}/maintenance`, payload);
      toast.success('Maintenance log added');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-md rounded-2xl animate-slide-up"
        style={{ background: 'var(--glass-2)', border: '1px solid var(--border-2)' }}>

        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Wrench size={17} style={{ color: '#D97706' }} />
            <div>
              <h3 className="font-semibold text-base" style={{ color: 'var(--text-1)' }}>Log Maintenance</h3>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{shuttle?.name} · {shuttle?.plateNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input type="date" className="input" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                <option value="scheduled">Scheduled</option>
                <option value="repair">Repair</option>
                <option value="inspection">Inspection</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Description *</label>
            <textarea className="input resize-none" rows={3}
              placeholder="What was done? e.g. Oil change, tire rotation, brake inspection..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Performed by</label>
              <input className="input" placeholder="Mechanic / workshop name"
                value={form.performedBy}
                onChange={e => setForm(f => ({ ...f, performedBy: e.target.value }))} />
            </div>
            <div>
              <label className="label">Cost (PKR)</label>
              <input type="number" className="input" placeholder="e.g. 5000" min={0}
                value={form.cost}
                onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="label">Next service due</label>
            <input type="date" className="input" value={form.nextServiceDue}
              onChange={e => setForm(f => ({ ...f, nextServiceDue: e.target.value }))} />
          </div>

          {/* Existing log */}
          {shuttle?.maintenanceLog?.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--text-4)' }}>Recent History</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {shuttle.maintenanceLog.slice(-3).reverse().map((log, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs py-1.5 px-2 rounded-lg"
                    style={{ background: 'var(--glass-2)' }}>
                    <Calendar size={11} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--text-4)' }} />
                    <div>
                      <span style={{ color: 'var(--text-2)' }}>
                        {new Date(log.date).toLocaleDateString()} · {log.type}
                      </span>
                      <p className="truncate" style={{ color: 'var(--text-4)' }}>{log.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="btn-primary flex-1 gap-2">
            {isSaving
              ? <span className="loader"><span /><span /><span /></span>
              : <><Save size={14} /> Save Log</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceModal;