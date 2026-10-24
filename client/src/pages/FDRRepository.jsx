import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { getAllFDRs, exportCSV } from '../api';
import { useNavigate } from 'react-router-dom';
import {
  Database, Search, Filter, Download, Eye, Loader2, AlertTriangle,
  CheckCircle2, Clock, IndianRupee, XCircle
} from 'lucide-react';

const formatCurrency = (val) => val ? `₹${parseFloat(val).toLocaleString('en-IN')}` : '-';
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-';

const statusBadge = (status) => {
  const map = { SUBMITTED: 'badge-submitted', UNDER_SCRUTINY: 'badge-scrutiny', DISCREPANCY_FLAGGED: 'badge-discrepancy', ACTIVE_VERIFIED: 'badge-verified', EXPIRING_SOON: 'badge-expiring', MATURED_OVERDUE: 'badge-overdue', RENEWED: 'badge-renewed', RELEASE_REQUESTED: 'badge-pending', RELEASED_REFUNDED: 'badge-released', FORFEITED_ENCASHED: 'badge-forfeited' };
  return map[status] || 'badge-pending';
};

const STATUSES = ['', 'SUBMITTED', 'UNDER_SCRUTINY', 'DISCREPANCY_FLAGGED', 'ACTIVE_VERIFIED', 'EXPIRING_SOON', 'MATURED_OVERDUE', 'RENEWED', 'RELEASE_REQUESTED', 'RELEASED_REFUNDED', 'FORFEITED_ENCASHED'];
const BANKS = ['', 'State Bank of India', 'Punjab National Bank', 'Canara Bank', 'Bank of Baroda', 'HDFC Bank'];

export default function FDRRepository() {
  const { showToast } = useContext(AuthContext);
  const navigate = useNavigate();
  const [fdrs, setFdrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [bankFilter, setBankFilter] = useState('');
  const [maturityWindow, setMaturityWindow] = useState('');

  useEffect(() => { fetchFDRs(); }, []);

  const fetchFDRs = async () => {
    try {
      const res = await getAllFDRs();
      setFdrs(res.data);
    } catch { showToast('Failed to load FDRs', 'error'); }
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      const res = await exportCSV();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fdr_records_export.csv';
      a.click();
      showToast('CSV exported', 'success');
    } catch { showToast('Export failed', 'error'); }
  };

  const filtered = fdrs.filter(fdr => {
    if (statusFilter && fdr.status !== statusFilter) return false;
    if (bankFilter && fdr.issuingBank !== bankFilter) return false;
    if (maturityWindow) {
      const days = Math.ceil((new Date(fdr.maturityDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (days < 0 || days > parseInt(maturityWindow)) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      return fdr.fdrNumber.toLowerCase().includes(s) || fdr.institutionName.toLowerCase().includes(s) || fdr.issuingBank.toLowerCase().includes(s);
    }
    return true;
  });

  const daysToMaturity = (d) => {
    const days = Math.ceil((new Date(d) - new Date()) / (1000 * 60 * 60 * 24));
    if (days < 0) return <span className="text-red-400 font-bold">Overdue {Math.abs(days)}d</span>;
    if (days <= 30) return <span className="text-amber-400 font-bold">{days}d</span>;
    return <span className="text-slate-400">{days}d</span>;
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Database className="w-7 h-7 text-blue-400" /> FDR Repository</h1>
          <p className="text-slate-400 text-sm mt-1">Search, filter, and export all FDR records • {filtered.length} of {fdrs.length} records</p>
        </div>
        <button onClick={handleExport} className="btn-primary"><Download className="w-4 h-4" /> Export CSV</button>
      </div>

      {/* Filters */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="form-label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input className="form-input pl-9" placeholder="FDR number, institution, bank..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="w-48">
            <label className="form-label">Status</label>
            <select className="form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="w-48">
            <label className="form-label">Bank</label>
            <select className="form-select" value={bankFilter} onChange={e => setBankFilter(e.target.value)}>
              <option value="">All Banks</option>
              {BANKS.filter(Boolean).map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="w-40">
            <label className="form-label">Maturity Window</label>
            <select className="form-select" value={maturityWindow} onChange={e => setMaturityWindow(e.target.value)}>
              <option value="">All</option>
              <option value="7">7 Days</option>
              <option value="30">30 Days</option>
              <option value="60">60 Days</option>
              <option value="90">90 Days</option>
            </select>
          </div>
          <button onClick={() => { setSearch(''); setStatusFilter(''); setBankFilter(''); setMaturityWindow(''); }} className="btn-outline"><Filter className="w-4 h-4" /> Clear</button>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="data-table">
            <thead>
              <tr>
                <th>FDR Number</th><th>Institution</th><th>Bank</th><th>Amount</th><th>Maturity</th><th>Days Left</th><th>Status</th><th>Bank Ver.</th><th>Flags</th><th>Ver</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(fdr => (
                <tr key={fdr._id} className="cursor-pointer" onClick={() => navigate(`/fdr/${fdr._id}`)}>
                  <td className="font-mono font-bold text-white">{fdr.fdrNumber}</td>
                  <td className="max-w-[180px] truncate">{fdr.institutionName}</td>
                  <td className="text-xs">{fdr.issuingBank}</td>
                  <td className="font-semibold">{formatCurrency(fdr.depositAmount)}</td>
                  <td className="text-xs">{formatDate(fdr.maturityDate)}</td>
                  <td>{daysToMaturity(fdr.maturityDate)}</td>
                  <td><span className={`badge ${statusBadge(fdr.status)}`}>{fdr.status.replace(/_/g, ' ')}</span></td>
                  <td>
                    {fdr.bankVerificationStatus === 'VERIFIED' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {fdr.bankVerificationStatus === 'MISMATCH' && <XCircle className="w-4 h-4 text-red-400" />}
                    {fdr.bankVerificationStatus === 'PENDING' && <Clock className="w-4 h-4 text-amber-400" />}
                  </td>
                  <td>
                    {fdr.discrepancyFlags?.length > 0 && (
                      <span className="flex items-center gap-1 text-red-400">
                        <AlertTriangle className="w-3 h-3" /> {fdr.discrepancyFlags.length}
                      </span>
                    )}
                  </td>
                  <td className="text-xs text-slate-500">v{fdr.version}</td>
                  <td><Eye className="w-4 h-4 text-blue-400" /></td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan="11" className="text-center py-8 text-slate-500">No records match filters</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
