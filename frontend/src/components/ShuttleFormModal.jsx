import { useState, useEffect } from 'react';
import { X, Bus, Save } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ShuttleFormModal = ({ shuttle, drivers = [], routes = [], onSave, onClose }) => {
  const isEdit = !!shuttle?._id;
  const [form, setForm] = useState({
    name: '',
    shortCode: '',
    plateNumber: '',
    capacity: 30,
    make: '',
    model: '',
    year: new Date().getFullYear(),
    color: 'White',
    currentDriverId: '',
    assignedRouteId: '',
    status: 'idle',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (shuttle) {
      setForm({
        name:            shuttle.name || '',
        shortCode:       shuttle.shortCode || '',
        plateNumber:     shuttle.plateNumber || '',
        capacity:        shuttle.capacity || 30,
        make:            shuttle.make || '',
        model:           shuttle.model || '',
        year:            shuttle.year || new Date().getFullYear(),
        color:           shuttle.color || 'White',
        currentDriverId: shuttle.currentDriverId?._id || shuttle.currentDriverId || '',
        assignedRouteId: shuttle.assignedRouteId?._id || shuttle.assignedRouteId || '',
        status:          shuttle.status || 'idle',
        notes:           shuttle.notes || '',
      });
    }
  }, [shuttle]);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Vehicle name required'); return; }
    if (!form.plateNumber.trim()) { toast.error('Plate number required'); return; }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        shortCode: form.shortCode.toUpperCase(),
        capacity: Number(form.capacity),
        year: Number(form.year),
      };
      if (!payload.currentDriverId) delete payload.currentDriverId;
      if (!payload.assignedRouteId) delete payload.assignedRouteId;

      let result;
      if (isEdit) {
        const res = await api.patch(`/admin/shuttles/${shuttle._id}`, payload);
        result = res.data.data;
        toast.success('Vehicle updated');
      } else {
        const res = await api.post('/admin/shuttles', payload);
        result = res.data.data;
        toast.success('Vehicle added');
      }
      onSave(result);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-lg rounded-2xl animate-slide-up overflow-hidden"
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-md)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <Bus size={18} style={{ color: 'var(--brand)' }} />
            <h3 className="font-display font-bold text-lg" style={{ color: 'var(--text-1)' }}>
              {isEdit ? 'Edit Vehicle' : 'Add Vehicle'}
            </h3>
          </div>
          <button onClick={onClose} className="btn-ghost btn-icon"><X size={16} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4" style={{ maxHeight: '70vh' }}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Vehicle name *</label>
              <input className="input" placeholder="e.g. Shuttle A" value={form.name} onChange={e => f('name', e.target.value)} />
            </div>
            <div>
              <label className="label">Short code <span style={{ color: 'var(--text-4)', fontSize: 11 }}>(shown on map)</span></label>
              <input className="input uppercase" placeholder="e.g. A, B1, RED" maxLength={4}
                value={form.shortCode} onChange={e => f('shortCode', e.target.value.toUpperCase())} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Plate number *</label>
              <input className="input uppercase" placeholder="e.g. KHI-1234" value={form.plateNumber}
                onChange={e => f('plateNumber', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label className="label">Capacity *</label>
              <input className="input" type="number" min={1} max={100} value={form.capacity}
                onChange={e => f('capacity', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Make</label>
              <input className="input" placeholder="e.g. Toyota" value={form.make} onChange={e => f('make', e.target.value)} />
            </div>
            <div>
              <label className="label">Model</label>
              <input className="input" placeholder="e.g. Hiace" value={form.model} onChange={e => f('model', e.target.value)} />
            </div>
            <div>
              <label className="label">Year</label>
              <input className="input" type="number" min={2000} max={2030} value={form.year}
                onChange={e => f('year', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Assign driver</label>
            <select className="input" value={form.currentDriverId} onChange={e => f('currentDriverId', e.target.value)}>
              <option value="">Unassigned</option>
              {drivers.map(d => <option key={d.id || d._id} value={d.id || d._id}>{d.name} ({d.email})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Assign route</label>
            <select className="input" value={form.assignedRouteId} onChange={e => f('assignedRouteId', e.target.value)}>
              <option value="">No route</option>
              {routes.map(r => <option key={r._id} value={r._id}>{r.name} ({r.shortCode})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => f('status', e.target.value)}>
              <option value="idle">Idle</option>
              <option value="active">Active</option>
              <option value="maintenance">Maintenance</option>
              <option value="retired">Retired</option>
            </select>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes}
              onChange={e => f('notes', e.target.value)} placeholder="Any additional notes..." />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className="btn-primary flex-1 gap-2">
            {isSaving ? <span className="dot-loader"><span/><span/><span/></span>
              : <><Save size={15} />{isEdit ? 'Save changes' : 'Add vehicle'}</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShuttleFormModal;
