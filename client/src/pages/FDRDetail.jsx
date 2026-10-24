import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { getFDR, verifyCBS, requestRelease, renewFDR, forfeitFDR } from '../api';
import {
  Shield, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, Clock,
  Calendar, IndianRupee, Landmark, Building2, Hash, FileText, RefreshCw,
  GitBranch, FileCheck, Ban, Loader2, Printer, QrCode
} from 'lucide-react';

const formatCurrency = (val) => val ? `₹${parseFloat(val).toLocaleString('en-IN')}` : '-';
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

const statusBadge = (status) => {
  const map = { SUBMITTED: 'badge-submitted', UNDER_SCRUTINY: 'badge-scrutiny', DISCREPANCY_FLAGGED: 'badge-discrepancy', ACTIVE_VERIFIED: 'badge-verified', EXPIRING_SOON: 'badge-expiring', MATURED_OVERDUE: 'badge-overdue', RENEWED: 'badge-renewed', RELEASE_REQUESTED: 'badge-pending', RELEASED_REFUNDED: 'badge-released', FORFEITED_ENCASHED: 'badge-forfeited' };
  return map[status] || 'badge-pending';
};

export default function FDRDetail() {
  const { id } = useParams();
  const { user, showToast } = useContext(AuthContext);
  const navigate = useNavigate();
  const [fdr, setFdr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showForfeitModal, setShowForfeitModal] = useState(false);
  const [showNOC, setShowNOC] = useState(false);
  const [renewForm, setRenewForm] = useState({ fdrNumber: '', issuingBank: '', depositAmount: '', issueDate: '', maturityDate: '', lockInYears: '3', jointHolderName: 'AICTE (Joint Holder)', lienMarkedToAicte: true });
  const [forfeitReason, setForfeitReason] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => { fetchFDR(); }, [id]);

  const fetchFDR = async () => {
    try {
      const res = await getFDR(id);
      setFdr(res.data);
    } catch { showToast('Failed to load FDR', 'error'); }
    finally { setLoading(false); }
  };

  const handleRequestRelease = async () => {
    setActionLoading('release');
    try {
      await requestRelease(fdr._id, { reason: 'Lock-in period completed. Requesting FDR release/refund.' });
      showToast('Release request submitted', 'success');
      fetchFDR();
    } catch (err) { showToast('Failed', 'error'); }
    finally { setActionLoading(''); }
  };

  const handleRenew = async () => {
    setActionLoading('renew');
    try {
      const formData = new FormData();
      Object.entries(renewForm).forEach(([k, v]) => formData.append(k, v));
      formData.append('testCase', 'VALID');
      await renewFDR(fdr._id, formData);
      showToast('Renewal submitted successfully', 'success');
      setShowRenewModal(false);
      fetchFDR();
    } catch (err) { showToast(err.response?.data?.error || 'Renewal failed', 'error'); }
    finally { setActionLoading(''); }
  };

  const handleForfeit = async () => {
    setActionLoading('forfeit');
    try {
      await forfeitFDR(fdr._id, { violationReason: forfeitReason });
      showToast('FDR forfeited. Encashment order generated.', 'warning');
      setShowForfeitModal(false);
      fetchFDR();
    } catch (err) { showToast('Failed', 'error'); }
    finally { setActionLoading(''); }
  };

  const daysToMaturity = fdr ? Math.ceil((new Date(fdr.maturityDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;
  if (!fdr) return <p className="text-red-400">FDR not found</p>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-outline p-2"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Hash className="w-5 h-5 text-blue-400" /> {fdr.fdrNumber}
          </h1>
          <p className="text-slate-400 text-sm">{fdr.institutionName} • v{fdr.version}</p>
        </div>
        <span className={`badge text-sm px-4 py-2 ${statusBadge(fdr.status)}`}>{fdr.status.replace(/_/g, ' ')}</span>
      </div>

      {/* Maturity Alert */}
      {daysToMaturity <= 30 && daysToMaturity > 0 && !['RELEASED_REFUNDED', 'FORFEITED_ENCASHED', 'RENEWED'].includes(fdr.status) && (
        <div className="glass-card p-4 border-amber-500/20 pulse-alert flex items-center gap-3">
          <Clock className="w-6 h-6 text-amber-400" />
          <div>
            <p className="text-sm font-bold text-amber-400">Expiring in {daysToMaturity} days</p>
            <p className="text-xs text-slate-400">Maturity Date: {formatDate(fdr.maturityDate)}</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Instrument Details */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-blue-400" /> Instrument Details</h3>
          <div className="space-y-3">
            {[
              { label: 'FDR Number', value: fdr.fdrNumber, icon: Hash },
              { label: 'Institution', value: fdr.institutionName, icon: Building2 },
              { label: 'AICTE Permanent ID', value: fdr.aictePermanentId },
              { label: 'Course Category', value: fdr.courseCategory },
              { label: 'Issuing Bank', value: fdr.issuingBank, icon: Landmark },
              { label: 'Branch IFSC', value: fdr.branchIfsc },
              { label: 'Deposit Amount', value: formatCurrency(fdr.depositAmount), icon: IndianRupee },
              { label: 'Issue Date', value: formatDate(fdr.issueDate), icon: Calendar },
              { label: 'Maturity Date', value: formatDate(fdr.maturityDate), icon: Calendar },
              { label: 'Lock-in Period', value: `${fdr.lockInYears} years` },
              { label: 'Joint Holder', value: fdr.jointHolderName || 'Not specified' },
              { label: 'Lien to AICTE', value: fdr.lienMarkedToAicte ? '✓ Yes' : '✗ No' },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-xs text-slate-500">{item.label}</span>
                <span className="text-sm text-slate-200 font-medium text-right max-w-[60%] truncate">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* OCR + Bank Verification */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-purple-400" /> OCR Extraction</h3>
            {fdr.ocrExtractedData ? (
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-slate-500">Amount</span><span className={`text-xs font-bold ${fdr.ocrExtractedData.extractedAmount === fdr.depositAmount ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(fdr.ocrExtractedData.extractedAmount)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Confidence</span><span className="text-xs text-blue-400 font-bold">{(fdr.ocrExtractedData.ocrConfidenceScore * 100).toFixed(1)}%</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Joint Clause</span>{fdr.ocrExtractedData.hasJointAccountClause ? <span className="badge badge-verified text-[10px]">FOUND</span> : <span className="badge badge-discrepancy text-[10px]">NOT FOUND</span>}</div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Lien Clause</span>{fdr.ocrExtractedData.hasAicteLienClause ? <span className="badge badge-verified text-[10px]">FOUND</span> : <span className="badge badge-discrepancy text-[10px]">NOT FOUND</span>}</div>
              </div>
            ) : <p className="text-xs text-slate-500">No OCR data</p>}
          </div>

          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Landmark className="w-4 h-4 text-cyan-400" /> Bank Verification</h3>
            <p className="text-xs text-slate-400 mb-2">Status: <span className={`font-bold ${fdr.bankVerificationStatus === 'VERIFIED' ? 'text-emerald-400' : fdr.bankVerificationStatus === 'MISMATCH' ? 'text-red-400' : 'text-amber-400'}`}>{fdr.bankVerificationStatus}</span></p>
            {fdr.bankConfirmedData?.confirmedAmount && (
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-slate-500">Confirmed Amount</span><span className="text-xs text-slate-200">{formatCurrency(fdr.bankConfirmedData.confirmedAmount)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Lien Active</span><span className={`text-xs ${fdr.bankConfirmedData.confirmedLienActive ? 'text-emerald-400' : 'text-red-400'}`}>{fdr.bankConfirmedData.confirmedLienActive ? '✓ Yes' : '✗ No'}</span></div>
                <div className="flex justify-between"><span className="text-xs text-slate-500">Verified By</span><span className="text-xs text-slate-300">{fdr.bankConfirmedData.verifiedByBankOfficer}</span></div>
                {fdr.bankConfirmedData.bankRemarks && <p className="text-xs text-slate-500 bg-slate-800/50 p-2 rounded mt-2">{fdr.bankConfirmedData.bankRemarks}</p>}
              </div>
            )}
          </div>
        </div>

        {/* Document Security + Actions */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h3 className="text-sm font-bold text-white mb-3">Document Security (SHA-256)</h3>
            <p className="text-[10px] font-mono text-slate-400 break-all bg-slate-800/50 p-2 rounded mb-3">{fdr.fileSha256Hash || 'N/A'}</p>
            {fdr.discrepancyFlags?.length > 0 && (
              <>
                <h4 className="text-sm font-bold text-red-400 mb-2">Discrepancy Flags</h4>
                <ul className="space-y-1">{fdr.discrepancyFlags.map((f, i) => <li key={i} className="text-xs text-red-300">• {f}</li>)}</ul>
              </>
            )}
            {fdr.scrutinyRemarks && <p className="text-xs text-slate-400 mt-3 italic">Remarks: {fdr.scrutinyRemarks}</p>}
          </div>

          {/* Renewal History Timeline */}
          {(fdr.renewalHistory?.length > 0 || fdr.version > 1) && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><GitBranch className="w-4 h-4 text-cyan-400" /> Version Lineage</h3>
              <div className="space-y-0">
                {fdr.renewalHistory?.map((hist, i) => (
                  <div key={i} className="timeline-item">
                    <div className="timeline-dot border-slate-500" />
                    <p className="text-xs font-bold text-slate-300">v{hist.version} • {hist.fdrNumber}</p>
                    <p className="text-[10px] text-slate-500">{formatCurrency(hist.amount)} • {formatDate(hist.issueDate)} → {formatDate(hist.maturityDate)}</p>
                    <p className="text-[10px] text-slate-600">Archived: {formatDate(hist.archivedAt)}</p>
                  </div>
                ))}
                <div className="timeline-item">
                  <div className="timeline-dot border-emerald-500" />
                  <p className="text-xs font-bold text-emerald-400">v{fdr.version} • {fdr.fdrNumber} (Current)</p>
                  <p className="text-[10px] text-slate-500">{formatCurrency(fdr.depositAmount)} • {formatDate(fdr.issueDate)} → {formatDate(fdr.maturityDate)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Release NOC display */}
          {fdr.status === 'RELEASED_REFUNDED' && fdr.releaseRequest?.nocReferenceNumber && (
            <div className="glass-card p-6 border-emerald-500/20">
              <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2"><FileCheck className="w-4 h-4" /> Digital NOC Generated</h3>
              <p className="text-xs text-slate-300">Reference: <span className="font-mono font-bold text-white">{fdr.releaseRequest.nocReferenceNumber}</span></p>
              <button onClick={() => setShowNOC(true)} className="btn-success w-full mt-3 justify-center"><Printer className="w-4 h-4" /> View NOC Certificate</button>
            </div>
          )}

          {/* Forfeiture details */}
          {fdr.status === 'FORFEITED_ENCASHED' && fdr.forfeitureDetails && (
            <div className="glass-card p-6 border-red-500/20">
              <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2"><Ban className="w-4 h-4" /> Forfeiture Details</h3>
              <p className="text-xs text-slate-300">Order No: <span className="font-mono font-bold text-white">{fdr.forfeitureDetails.encashmentOrderNo}</span></p>
              <p className="text-xs text-slate-400 mt-1">Reason: {fdr.forfeitureDetails.violationReason}</p>
              <p className="text-xs text-slate-500 mt-1">Initiated by: {fdr.forfeitureDetails.initiatedBy}</p>
              <p className="text-xs text-slate-500">Date: {formatDate(fdr.forfeitureDetails.forfeitedAt)}</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {user?.role === 'INSTITUTION' && ['ACTIVE_VERIFIED', 'EXPIRING_SOON', 'MATURED_OVERDUE'].includes(fdr.status) && (
              <>
                <button onClick={() => setShowRenewModal(true)} className="btn-primary w-full justify-center"><RefreshCw className="w-4 h-4" /> Submit Renewed FDR</button>
                <button onClick={handleRequestRelease} className="btn-outline w-full justify-center" disabled={actionLoading === 'release'}>
                  {actionLoading === 'release' ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />} Request Release / Refund
                </button>
              </>
            )}
            {['DIRECTOR', 'SCRUTINY_OFFICER'].includes(user?.role) && !['RELEASED_REFUNDED', 'FORFEITED_ENCASHED'].includes(fdr.status) && (
              <button onClick={() => setShowForfeitModal(true)} className="btn-danger w-full justify-center"><Ban className="w-4 h-4" /> Initiate Forfeiture</button>
            )}
          </div>
        </div>
      </div>

      {/* Renew Modal */}
      {showRenewModal && (
        <div className="modal-overlay" onClick={() => setShowRenewModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-white mb-4">Submit Renewed FDR (v{fdr.version} → v{fdr.version + 1})</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div><label className="form-label">New FDR Number</label><input className="form-input" value={renewForm.fdrNumber} onChange={e => setRenewForm({...renewForm, fdrNumber: e.target.value})} required /></div>
              <div><label className="form-label">Issuing Bank</label><input className="form-input" value={renewForm.issuingBank || fdr.issuingBank} onChange={e => setRenewForm({...renewForm, issuingBank: e.target.value})} /></div>
              <div><label className="form-label">Deposit Amount (₹)</label><input className="form-input" type="number" value={renewForm.depositAmount} onChange={e => setRenewForm({...renewForm, depositAmount: e.target.value})} required /></div>
              <div><label className="form-label">Lock-in Years</label><input className="form-input" type="number" value={renewForm.lockInYears} onChange={e => setRenewForm({...renewForm, lockInYears: e.target.value})} /></div>
              <div><label className="form-label">Issue Date</label><input className="form-input" type="date" value={renewForm.issueDate} onChange={e => setRenewForm({...renewForm, issueDate: e.target.value})} required /></div>
              <div><label className="form-label">Maturity Date</label><input className="form-input" type="date" value={renewForm.maturityDate} onChange={e => setRenewForm({...renewForm, maturityDate: e.target.value})} required /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleRenew} className="btn-success flex-1 justify-center" disabled={actionLoading === 'renew'}>
                {actionLoading === 'renew' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Submit Renewal
              </button>
              <button onClick={() => setShowRenewModal(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Forfeit Modal */}
      {showForfeitModal && (
        <div className="modal-overlay" onClick={() => setShowForfeitModal(false)}>
          <div className="modal-content p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2"><Ban className="w-5 h-5" /> Initiate FDR Forfeiture / Encashment</h2>
            <p className="text-sm text-slate-400 mb-4">This will forfeit FDR {fdr.fdrNumber} ({formatCurrency(fdr.depositAmount)}) and generate a Bank Encashment Order.</p>
            <label className="form-label">Violation Reason</label>
            <textarea className="form-input h-24" value={forfeitReason} onChange={e => setForfeitReason(e.target.value)} placeholder="e.g., Institution closed illegally, forged documents, faculty salary default..." />
            <div className="flex gap-3 mt-6">
              <button onClick={handleForfeit} className="btn-danger flex-1 justify-center" disabled={actionLoading === 'forfeit' || !forfeitReason}>
                {actionLoading === 'forfeit' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />} Confirm Forfeiture
              </button>
              <button onClick={() => setShowForfeitModal(false)} className="btn-outline flex-1 justify-center">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* NOC Certificate Modal */}
      {showNOC && (
        <div className="modal-overlay" onClick={() => setShowNOC(false)}>
          <div className="modal-content p-0 max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Digital FDR Release Certificate (NOC)</h2>
              <button onClick={() => window.print()} className="btn-primary"><Printer className="w-4 h-4" /> Print</button>
            </div>
            <div className="noc-certificate m-4">
              <div className="text-center border-b-2 border-navy-900 pb-4 mb-4">
                <h1 className="text-xl font-bold">ALL INDIA COUNCIL FOR TECHNICAL EDUCATION</h1>
                <h2 className="text-base mt-1">Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070</h2>
                <p className="text-sm mt-2 font-bold">FDR RELEASE / DISCHARGE CERTIFICATE (NOC)</p>
              </div>
              <div className="space-y-3 text-sm">
                <p><strong>Reference No:</strong> {fdr.releaseRequest?.nocReferenceNumber}</p>
                <p><strong>Date:</strong> {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <hr />
                <p>This is to certify that the Fixed Deposit Receipt (FDR) bearing the details mentioned below has been duly verified and approved for release/refund by the competent authority of AICTE.</p>
                <table className="w-full text-left border-collapse mt-3">
                  <tbody>
                    {[
                      ['FDR Number', fdr.fdrNumber], ['Institution', fdr.institutionName], ['AICTE Permanent ID', fdr.aictePermanentId],
                      ['Issuing Bank', fdr.issuingBank], ['IFSC Code', fdr.branchIfsc], ['Deposit Amount', formatCurrency(fdr.depositAmount)],
                      ['Issue Date', formatDate(fdr.issueDate)], ['Maturity Date', formatDate(fdr.maturityDate)]
                    ].map(([k, v], i) => (
                      <tr key={i} className="border-b"><td className="py-2 font-semibold w-1/3">{k}</td><td className="py-2">{v}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-4">The issuing bank is hereby authorized to release the above-mentioned FDR to the institution. AICTE relinquishes its lien and joint holder rights on this instrument.</p>
                <div className="mt-8 flex justify-between items-end">
                  <div><p className="font-bold">Authorized Signatory</p><p>AICTE Competent Authority</p></div>
                  <div className="text-center"><div className="w-24 h-24 border-2 border-dashed border-gray-400 flex items-center justify-center"><QrCode className="w-10 h-10 text-gray-400" /></div><p className="text-xs mt-1">Verify: {fdr.releaseRequest?.nocReferenceNumber}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
