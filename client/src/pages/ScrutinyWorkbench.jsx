import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { getAllFDRs, verifyCBS, approveFDR, flagDiscrepancy, markUnderScrutiny } from '../api';
import { useNavigate } from 'react-router-dom';
import {
  Search, CheckCircle2, XCircle, AlertTriangle, Shield, Eye,
  ChevronDown, ChevronUp, Building2, Landmark, IndianRupee, Calendar, Loader2
} from 'lucide-react';

const statusBadge = (status) => {
  const map = {
    SUBMITTED: 'badge-submitted', UNDER_SCRUTINY: 'badge-scrutiny', DISCREPANCY_FLAGGED: 'badge-discrepancy',
    ACTIVE_VERIFIED: 'badge-verified', EXPIRING_SOON: 'badge-expiring', MATURED_OVERDUE: 'badge-overdue',
    RENEWED: 'badge-renewed', RELEASE_REQUESTED: 'badge-pending', RELEASED_REFUNDED: 'badge-released',
    FORFEITED_ENCASHED: 'badge-forfeited'
  };
  return map[status] || 'badge-pending';
};

const formatCurrency = (val) => val ? `₹${parseFloat(val).toLocaleString('en-IN')}` : '-';

export default function ScrutinyWorkbench() {
  const { showToast } = useContext(AuthContext);
  const navigate = useNavigate();
  const [fdrs, setFdrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [cbsLoading, setCbsLoading] = useState(false);
  const [cbsResult, setCbsResult] = useState(null);
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => { fetchFDRs(); }, []);

  const fetchFDRs = async () => {
    try {
      const res = await getAllFDRs();
      setFdrs(res.data);
    } catch (err) {
      showToast('Failed to fetch FDRs', 'error');
    } finally { setLoading(false); }
  };

  const handleVerifyCBS = async (fdr) => {
    setCbsLoading(true);
    setCbsResult(null);
    try {
      const res = await verifyCBS(fdr._id);
      setCbsResult(res.data);
      showToast(res.data.verified ? 'CBS Verification: MATCH ✓' : `CBS Verification: ${res.data.mismatches?.length} mismatch(es)`, res.data.verified ? 'success' : 'warning');
      fetchFDRs();
    } catch (err) {
      showToast('CBS verification failed', 'error');
    } finally { setCbsLoading(false); }
  };

  const handleApprove = async (fdr) => {
    setActionLoading('approve');
    try {
      await approveFDR(fdr._id, { remarks: 'Verified and approved by scrutiny officer' });
      showToast('FDR approved and marked as Active Verified', 'success');
      fetchFDRs();
      setSelected(null);
    } catch (err) {
      showToast('Approval failed', 'error');
    } finally { setActionLoading(''); }
  };

  const handleFlag = async (fdr) => {
    setActionLoading('flag');
    try {
      await flagDiscrepancy(fdr._id, {
        discrepancyFlags: ['Flagged by scrutiny officer during manual review'],
        scrutinyRemarks: 'Flagged for further investigation'
      });
      showToast('Discrepancy flagged', 'warning');
      fetchFDRs();
      setSelected(null);
    } catch (err) {
      showToast('Flag failed', 'error');
    } finally { setActionLoading(''); }
  };

  const pendingFdrs = fdrs.filter(f =>
    ['SUBMITTED', 'UNDER_SCRUTINY', 'DISCREPANCY_FLAGGED'].includes(f.status) &&
    (!filter || f.fdrNumber.toLowerCase().includes(filter.toLowerCase()) || f.institutionName.toLowerCase().includes(filter.toLowerCase()))
  );

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Search className="w-7 h-7 text-purple-400" /> Scrutiny Workbench
          </h1>
          <p className="text-slate-400 text-sm mt-1">Dual-source verification engine • {pendingFdrs.length} pending review</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input className="form-input pl-9 w-64" placeholder="Search FDR or institution..." value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* FDR List */}
        <div className="lg:col-span-2 glass-card p-4 max-h-[75vh] overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Pending Review ({pendingFdrs.length})</h3>
          <div className="space-y-2">
            {pendingFdrs.map(fdr => (
              <div
                key={fdr._id}
                onClick={() => { setSelected(fdr); setCbsResult(null); }}
                className={`p-4 rounded-xl cursor-pointer transition-all ${selected?._id === fdr._id ? 'bg-blue-500/10 border border-blue-500/20' : 'hover:bg-slate-800/50 border border-transparent'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-white font-mono">{fdr.fdrNumber}</p>
                  <span className={`badge ${statusBadge(fdr.status)}`}>{fdr.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-xs text-slate-400">{fdr.institutionName}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span>{fdr.issuingBank}</span>
                  <span>{formatCurrency(fdr.depositAmount)}</span>
                </div>
                {fdr.discrepancyFlags?.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] text-red-400">{fdr.discrepancyFlags.length} flag(s)</span>
                  </div>
                )}
              </div>
            ))}
            {pendingFdrs.length === 0 && <p className="text-center text-slate-600 text-sm py-8">No FDRs pending review</p>}
          </div>
        </div>

        {/* 3-Column Comparison Matrix */}
        <div className="lg:col-span-3 space-y-4">
          {selected ? (
            <>
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">3-Column Verification Matrix</h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleVerifyCBS(selected)} className="btn-primary" disabled={cbsLoading}>
                      {cbsLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Landmark className="w-4 h-4" />}
                      Verify with Bank CBS
                    </button>
                    <button onClick={() => navigate(`/fdr/${selected._id}`)} className="btn-outline">
                      <Eye className="w-4 h-4" /> Details
                    </button>
                  </div>
                </div>

                {/* Comparison Table */}
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="w-1/4">Field</th>
                        <th className="w-1/4"><span className="text-blue-400">A:</span> Institution</th>
                        <th className="w-1/4"><span className="text-purple-400">B:</span> OCR Extracted</th>
                        <th className="w-1/4"><span className="text-cyan-400">C:</span> Bank CBS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        {
                          label: 'FDR Number', a: selected.fdrNumber,
                          b: selected.ocrExtractedData?.extractedFdrNumber || '-',
                          c: cbsResult?.bankData?.fdrNumber || selected.bankConfirmedData?.confirmedAmount ? selected.fdrNumber : '-'
                        },
                        {
                          label: 'Deposit Amount', a: formatCurrency(selected.depositAmount),
                          b: formatCurrency(selected.ocrExtractedData?.extractedAmount),
                          c: cbsResult?.bankData?.actualAmount ? formatCurrency(cbsResult.bankData.actualAmount) : (selected.bankConfirmedData?.confirmedAmount ? formatCurrency(selected.bankConfirmedData.confirmedAmount) : '-')
                        },
                        {
                          label: 'Issuing Bank', a: selected.issuingBank,
                          b: selected.ocrExtractedData?.extractedBank || '-',
                          c: cbsResult?.bankData?.bankName || '-'
                        },
                        {
                          label: 'Maturity Date',
                          a: new Date(selected.maturityDate).toLocaleDateString('en-IN'),
                          b: selected.ocrExtractedData?.extractedMaturityDate ? new Date(selected.ocrExtractedData.extractedMaturityDate).toLocaleDateString('en-IN') : '-',
                          c: cbsResult?.bankData?.actualMaturityDate ? new Date(cbsResult.bankData.actualMaturityDate).toLocaleDateString('en-IN') : (selected.bankConfirmedData?.confirmedMaturityDate ? new Date(selected.bankConfirmedData.confirmedMaturityDate).toLocaleDateString('en-IN') : '-')
                        },
                        {
                          label: 'Joint Holder', a: selected.jointHolderName || 'Not specified',
                          b: selected.ocrExtractedData?.hasJointAccountClause ? '✓ Detected' : '✗ Not found',
                          c: cbsResult?.bankData?.isJointWithAicte !== undefined ? (cbsResult.bankData.isJointWithAicte ? '✓ Confirmed' : '✗ Not Joint') : (selected.bankConfirmedData?.confirmedJointHolder || '-')
                        },
                        {
                          label: 'AICTE Lien', a: selected.lienMarkedToAicte ? '✓ Yes' : '✗ No',
                          b: selected.ocrExtractedData?.hasAicteLienClause ? '✓ Detected' : '✗ Not found',
                          c: cbsResult?.bankData?.isLienMarked !== undefined ? (cbsResult.bankData.isLienMarked ? '✓ Active' : '✗ Not Marked') : (selected.bankConfirmedData?.confirmedLienActive !== undefined ? (selected.bankConfirmedData.confirmedLienActive ? '✓ Active' : '✗ Not Marked') : '-')
                        }
                      ].map((row, i) => {
                        const aVal = String(row.a).replace(/[₹,\s]/g, '');
                        const cVal = String(row.c).replace(/[₹,\s]/g, '');
                        const mismatch = row.c !== '-' && aVal !== cVal;
                        return (
                          <tr key={i} className={mismatch ? 'comparison-mismatch' : ''}>
                            <td className="font-semibold text-slate-300">{row.label}</td>
                            <td>{row.a}</td>
                            <td>{row.b}</td>
                            <td className={mismatch ? 'comparison-cell-mismatch' : 'comparison-cell-match'}>
                              {row.c}
                              {mismatch && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-400" />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* CBS Result */}
                {cbsResult && (
                  <div className={`mt-4 p-4 rounded-xl border ${cbsResult.verified ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {cbsResult.verified ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                      <p className={`text-sm font-bold ${cbsResult.verified ? 'text-emerald-400' : 'text-red-400'}`}>
                        {cbsResult.verified ? 'CBS Verification: ALL MATCH' : `CBS Verification: ${cbsResult.mismatches?.length} MISMATCH(ES)`}
                      </p>
                    </div>
                    {cbsResult.mismatches?.map((m, i) => (
                      <p key={i} className="text-xs text-red-300 ml-7">• {m}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* SHA-256 & Discrepancy Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                  <h4 className="text-sm font-bold text-white mb-2">Document Integrity</h4>
                  <p className="text-[10px] font-mono text-slate-500 break-all bg-slate-800/50 p-2 rounded">{selected.fileSha256Hash || 'No hash available'}</p>
                  <p className="text-xs text-slate-400 mt-2">Bank Verification: <span className={`font-bold ${selected.bankVerificationStatus === 'VERIFIED' ? 'text-emerald-400' : selected.bankVerificationStatus === 'MISMATCH' ? 'text-red-400' : 'text-amber-400'}`}>{selected.bankVerificationStatus}</span></p>
                </div>
                <div className="glass-card p-5">
                  <h4 className="text-sm font-bold text-white mb-2">Discrepancy Flags ({selected.discrepancyFlags?.length || 0})</h4>
                  {selected.discrepancyFlags?.length > 0 ? (
                    <ul className="space-y-1">
                      {selected.discrepancyFlags.map((f, i) => (
                        <li key={i} className="text-xs text-red-300 flex items-center gap-1"><XCircle className="w-3 h-3" /> {f}</li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-emerald-400">No discrepancies flagged</p>}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button onClick={() => handleApprove(selected)} className="btn-success flex-1 justify-center" disabled={actionLoading === 'approve'}>
                  {actionLoading === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve & Mark Active
                </button>
                <button onClick={() => handleFlag(selected)} className="btn-danger flex-1 justify-center" disabled={actionLoading === 'flag'}>
                  {actionLoading === 'flag' ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  Flag Discrepancy
                </button>
              </div>
            </>
          ) : (
            <div className="glass-card p-12 text-center">
              <Search className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400">Select an FDR from the list to begin verification</p>
              <p className="text-xs text-slate-600 mt-2">Use the 3-column comparison matrix to verify institution data against OCR extraction and Bank CBS records</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
