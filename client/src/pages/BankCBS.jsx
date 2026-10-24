import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { getBankRecords, createBankRecord, updateBankRecord, deleteBankRecord, getAllFDRs, bankVerify } from '../api';
import {
  Landmark, Plus, Edit3, Trash2, CheckCircle2, XCircle, Search, Loader2, Save, X
} from 'lucide-react';

const formatCurrency = (val) => val ? `₹${parseFloat(val).toLocaleString('en-IN')}` : '-';
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-';

const emptyRecord = {
  fdrNumber: '', bankName: '', ifsc: '', actualAmount: '', actualIssueDate: '', actualMaturityDate: '',
  isJointWithAicte: true, isLienMarked: true, accountStatus: 'ACTIVE', holderName: '', holderInstitution: ''
};

export default function BankCBS() {
  const { user, showToast } = useContext(AuthContext);
  const [records, setRecords] = useState([]);
  const [fdrs, setFdrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyRecord);
  const [saving, setSaving] = useState(false);
  const [pendingTab, setPendingTab] = useState('registry');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [bankRes, fdrRes] = await Promise.all([getBankRecords(), getAllFDRs()]);
      setRecords(bankRes.data);
      setFdrs(fdrRes.data);
    } catch (err) { showToast('Failed to load data', 'error'); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { ...form, actualAmount: parseFloat(form.actualAmount) };
      if (editId) {
        await updateBankRecord(editId, data);
        showToast('CBS record updated', 'success');
      } else {
        await createBankRecord(data);
        showToast('CBS record created', 'success');
      }
      setShowForm(false);
      setForm(emptyRecord);
      setEditId(null);
      fetchData();
    } catch (err) { showToast(err.response?.data?.error || 'Save failed', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this CBS record?')) return;
    try {
      await deleteBankRecord(id);
      showToast('Record deleted', 'success');
      fetchData();
    } catch { showToast('Delete failed', 'error'); }
  };

  const handleBankVerify = async (fdr, status) => {
    try {
      await bankVerify(fdr._id, {
        confirmedAmount: fdr.depositAmount,
        confirmedMaturityDate: fdr.maturityDate,
        confirmedJointHolder: 'AICTE (Joint Holder)',
        confirmedLienActive: true,
        bankRemarks: status === 'VERIFIED' ? 'Manually verified by bank officer' : 'Rejected - details do not match bank records',
        verificationStatus: status
      });
      showToast(`FDR ${status.toLowerCase()}`, status === 'VERIFIED' ? 'success' : 'warning');
      fetchData();
    } catch { showToast('Verification failed', 'error'); }
  };

  const pendingFdrs = fdrs.filter(f => f.bankVerificationStatus === 'PENDING');
  const filtered = records.filter(r =>
    !search || r.fdrNumber.toLowerCase().includes(search.toLowerCase()) || r.bankName.toLowerCase().includes(search.toLowerCase()) || (r.holderInstitution || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Landmark className="w-7 h-7 text-cyan-400" /> Mock Bank CBS Registry</h1>
          <p className="text-slate-400 text-sm mt-1">Core Banking System simulation • {records.length} records</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input className="form-input pl-9 w-56" placeholder="Search CBS..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {['BANK_OFFICER', 'DIRECTOR'].includes(user?.role) && (
            <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyRecord); }} className="btn-primary"><Plus className="w-4 h-4" /> Add Record</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setPendingTab('registry')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${pendingTab === 'registry' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
          CBS Registry ({records.length})
        </button>
        <button onClick={() => setPendingTab('pending')} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${pendingTab === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
          Pending Verification ({pendingFdrs.length})
        </button>
      </div>

      {pendingTab === 'registry' ? (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>FDR Number</th><th>Bank</th><th>IFSC</th><th>Amount</th><th>Issue Date</th><th>Maturity</th><th>Joint</th><th>Lien</th><th>Status</th>
                  {['BANK_OFFICER', 'DIRECTOR'].includes(user?.role) && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r._id}>
                    <td className="font-mono font-bold text-white">{r.fdrNumber}</td>
                    <td>{r.bankName}</td>
                    <td className="font-mono text-xs">{r.ifsc}</td>
                    <td className="font-semibold">{formatCurrency(r.actualAmount)}</td>
                    <td>{formatDate(r.actualIssueDate)}</td>
                    <td>{formatDate(r.actualMaturityDate)}</td>
                    <td>{r.isJointWithAicte ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}</td>
                    <td>{r.isLienMarked ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}</td>
                    <td><span className={`badge ${r.accountStatus === 'ACTIVE' ? 'badge-verified' : 'badge-pending'}`}>{r.accountStatus}</span></td>
                    {['BANK_OFFICER', 'DIRECTOR'].includes(user?.role) && (
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditId(r._id); setForm({ ...r, actualAmount: r.actualAmount, actualIssueDate: r.actualIssueDate?.substring(0, 10), actualMaturityDate: r.actualMaturityDate?.substring(0, 10) }); setShowForm(true); }} className="p-1 text-blue-400 hover:text-blue-300"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(r._id)} className="p-1 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>FDR Number</th><th>Institution</th><th>Bank</th><th>Amount</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pendingFdrs.map(fdr => (
                  <tr key={fdr._id}>
                    <td className="font-mono font-bold text-white">{fdr.fdrNumber}</td>
                    <td>{fdr.institutionName}</td>
                    <td>{fdr.issuingBank}</td>
                    <td>{formatCurrency(fdr.depositAmount)}</td>
                    <td><span className="badge badge-expiring">PENDING</span></td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => handleBankVerify(fdr, 'VERIFIED')} className="btn-success text-xs py-1 px-3"><CheckCircle2 className="w-3 h-3" /> Verify</button>
                        <button onClick={() => handleBankVerify(fdr, 'FAKE_REJECTED')} className="btn-danger text-xs py-1 px-3"><XCircle className="w-3 h-3" /> Reject</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pendingFdrs.length === 0 && <tr><td colSpan="6" className="text-center py-8 text-slate-500">No pending verifications</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white">{editId ? 'Edit' : 'Add'} CBS Record</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="form-label">FDR Number</label><input className="form-input" value={form.fdrNumber} onChange={e => setForm({...form, fdrNumber: e.target.value})} /></div>
              <div><label className="form-label">Bank Name</label><input className="form-input" value={form.bankName} onChange={e => setForm({...form, bankName: e.target.value})} /></div>
              <div><label className="form-label">IFSC Code</label><input className="form-input" value={form.ifsc} onChange={e => setForm({...form, ifsc: e.target.value})} /></div>
              <div><label className="form-label">Actual Amount (₹)</label><input className="form-input" type="number" value={form.actualAmount} onChange={e => setForm({...form, actualAmount: e.target.value})} /></div>
              <div><label className="form-label">Issue Date</label><input className="form-input" type="date" value={typeof form.actualIssueDate === 'string' ? form.actualIssueDate.substring(0,10) : ''} onChange={e => setForm({...form, actualIssueDate: e.target.value})} /></div>
              <div><label className="form-label">Maturity Date</label><input className="form-input" type="date" value={typeof form.actualMaturityDate === 'string' ? form.actualMaturityDate.substring(0,10) : ''} onChange={e => setForm({...form, actualMaturityDate: e.target.value})} /></div>
              <div><label className="form-label">Holder Name</label><input className="form-input" value={form.holderName} onChange={e => setForm({...form, holderName: e.target.value})} /></div>
              <div><label className="form-label">Holder Institution</label><input className="form-input" value={form.holderInstitution} onChange={e => setForm({...form, holderInstitution: e.target.value})} /></div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isJointWithAicte} onChange={e => setForm({...form, isJointWithAicte: e.target.checked})} className="w-4 h-4" /><span className="text-sm text-slate-300">Joint with AICTE</span></label>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isLienMarked} onChange={e => setForm({...form, isLienMarked: e.target.checked})} className="w-4 h-4" /><span className="text-sm text-slate-300">Lien Marked</span></label>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} className="btn-success flex-1 justify-center" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save</button>
              <button onClick={() => setShowForm(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
