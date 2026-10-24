import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { getAllFDRs, scrutinyRecommend, directorApprove } from '../api';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck, CheckCircle2, XCircle, AlertTriangle, Loader2, Eye,
  ClipboardCheck, Shield, Printer, QrCode, Ban
} from 'lucide-react';

const formatCurrency = (val) => val ? `₹${parseFloat(val).toLocaleString('en-IN')}` : '-';
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-';

export default function ReleaseWorkflow() {
  const { user, showToast } = useContext(AuthContext);
  const navigate = useNavigate();
  const [fdrs, setFdrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [checklist, setChecklist] = useState({ lockInCompleted: false, noCourtCase: false, noFacultyDues: false, complianceVerified: false });
  const [actionLoading, setActionLoading] = useState('');
  const [showNOC, setShowNOC] = useState(null);

  useEffect(() => { fetchFDRs(); }, []);

  const fetchFDRs = async () => {
    try {
      const res = await getAllFDRs();
      setFdrs(res.data.filter(f => ['RELEASE_REQUESTED', 'RELEASED_REFUNDED'].includes(f.status)));
    } catch { showToast('Failed to load', 'error'); }
    finally { setLoading(false); }
  };

  const handleScrutinyRecommend = async (recommendation) => {
    setActionLoading('recommend');
    try {
      await scrutinyRecommend(selected._id, {
        checklist,
        recommendation,
        remarks: recommendation === 'RECOMMENDED' ? 'All checklist items verified. Recommended for release.' : 'Checklist incomplete. Not recommended.'
      });
      showToast(`${recommendation === 'RECOMMENDED' ? 'Recommended' : 'Not recommended'} for release`, recommendation === 'RECOMMENDED' ? 'success' : 'warning');
      fetchFDRs();
      setSelected(null);
    } catch { showToast('Failed', 'error'); }
    finally { setActionLoading(''); }
  };

  const handleDirectorApprove = async (approved) => {
    setActionLoading('approve');
    try {
      const res = await directorApprove(selected._id, { approved, remarks: approved ? 'Approved for release' : 'Release rejected' });
      showToast(approved ? `Release approved! NOC: ${res.data.nocReference}` : 'Release rejected', approved ? 'success' : 'warning');
      fetchFDRs();
      setSelected(null);
    } catch { showToast('Failed', 'error'); }
    finally { setActionLoading(''); }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3"><FileCheck className="w-7 h-7 text-emerald-400" /> Release / Refund Workflow</h1>
        <p className="text-slate-400 text-sm mt-1">Manage FDR release requests and generate Digital NOCs</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* List */}
        <div className="lg:col-span-2 glass-card p-4 max-h-[75vh] overflow-y-auto">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Release Requests ({fdrs.length})</h3>
          <div className="space-y-2">
            {fdrs.map(fdr => (
              <div key={fdr._id} onClick={() => { setSelected(fdr); setChecklist(fdr.releaseRequest?.checklist || {}); }}
                className={`p-4 rounded-xl cursor-pointer transition-all ${selected?._id === fdr._id ? 'bg-emerald-500/10 border border-emerald-500/20' : 'hover:bg-slate-800/50 border border-transparent'}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-white font-mono">{fdr.fdrNumber}</p>
                  <span className={`badge ${fdr.status === 'RELEASED_REFUNDED' ? 'badge-released' : 'badge-pending'}`}>
                    {fdr.status === 'RELEASED_REFUNDED' ? 'RELEASED' : 'PENDING'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{fdr.institutionName}</p>
                <p className="text-xs text-slate-500 mt-1">{formatCurrency(fdr.depositAmount)} • {fdr.issuingBank}</p>
                {fdr.releaseRequest?.scrutinyRecommendation && fdr.releaseRequest.scrutinyRecommendation !== 'PENDING' && (
                  <p className={`text-xs mt-1 ${fdr.releaseRequest.scrutinyRecommendation === 'RECOMMENDED' ? 'text-emerald-400' : 'text-red-400'}`}>
                    Scrutiny: {fdr.releaseRequest.scrutinyRecommendation}
                  </p>
                )}
              </div>
            ))}
            {fdrs.length === 0 && <p className="text-center text-slate-600 text-sm py-8">No release requests</p>}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-3 space-y-4">
          {selected ? (
            <>
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">{selected.fdrNumber}</h3>
                  <button onClick={() => navigate(`/fdr/${selected._id}`)} className="btn-outline"><Eye className="w-4 h-4" /> Full Details</button>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-500">Institution</span><p className="text-white font-medium">{selected.institutionName}</p></div>
                  <div><span className="text-slate-500">Amount</span><p className="text-white font-medium">{formatCurrency(selected.depositAmount)}</p></div>
                  <div><span className="text-slate-500">Bank</span><p className="text-white font-medium">{selected.issuingBank}</p></div>
                  <div><span className="text-slate-500">Maturity</span><p className="text-white font-medium">{formatDate(selected.maturityDate)}</p></div>
                  <div className="col-span-2"><span className="text-slate-500">Reason</span><p className="text-slate-300">{selected.releaseRequest?.reason || 'N/A'}</p></div>
                </div>
              </div>

              {/* Regulatory Compliance Checklist */}
              {user?.role === 'SCRUTINY_OFFICER' && selected.status === 'RELEASE_REQUESTED' && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-purple-400" /> Regulatory Compliance Checklist</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'lockInCompleted', label: 'Lock-in period completed (3 years)' },
                      { key: 'noCourtCase', label: 'No pending court cases against institution' },
                      { key: 'noFacultyDues', label: 'No pending faculty salary dues' },
                      { key: 'complianceVerified', label: 'No regulatory penalties or non-compliance issues' },
                    ].map(item => (
                      <label key={item.key} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${checklist[item.key] ? 'bg-emerald-500/5 border border-emerald-500/15' : 'bg-slate-800/30 border border-slate-700/30'}`}>
                        <input type="checkbox" checked={checklist[item.key]} onChange={e => setChecklist({ ...checklist, [item.key]: e.target.checked })} className="w-5 h-5 rounded" />
                        <span className={`text-sm ${checklist[item.key] ? 'text-emerald-400' : 'text-slate-400'}`}>{item.label}</span>
                        {checklist[item.key] ? <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" /> : <XCircle className="w-4 h-4 text-slate-600 ml-auto" />}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => handleScrutinyRecommend('RECOMMENDED')} className="btn-success flex-1 justify-center" disabled={actionLoading === 'recommend' || !Object.values(checklist).every(v => v)}>
                      <CheckCircle2 className="w-4 h-4" /> Recommend Release
                    </button>
                    <button onClick={() => handleScrutinyRecommend('NOT_RECOMMENDED')} className="btn-danger flex-1 justify-center" disabled={actionLoading === 'recommend'}>
                      <XCircle className="w-4 h-4" /> Not Recommended
                    </button>
                  </div>
                </div>
              )}

              {/* Director Approval */}
              {user?.role === 'DIRECTOR' && selected.status === 'RELEASE_REQUESTED' && (
                <div className="glass-card p-6">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Shield className="w-4 h-4 text-amber-400" /> Director Approval</h3>
                  <div className="p-4 bg-slate-800/50 rounded-xl mb-4">
                    <p className="text-xs text-slate-400">Scrutiny Recommendation</p>
                    <p className={`text-sm font-bold ${selected.releaseRequest?.scrutinyRecommendation === 'RECOMMENDED' ? 'text-emerald-400' : selected.releaseRequest?.scrutinyRecommendation === 'NOT_RECOMMENDED' ? 'text-red-400' : 'text-amber-400'}`}>
                      {selected.releaseRequest?.scrutinyRecommendation || 'PENDING'}
                    </p>
                    <div className="grid grid-cols-2 gap-2 mt-3">
                      {Object.entries(selected.releaseRequest?.checklist || {}).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-1">
                          {v ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                          <span className="text-xs text-slate-400">{k.replace(/([A-Z])/g, ' $1')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleDirectorApprove(true)} className="btn-success flex-1 justify-center" disabled={actionLoading === 'approve'}>
                      {actionLoading === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve & Generate NOC
                    </button>
                    <button onClick={() => handleDirectorApprove(false)} className="btn-danger flex-1 justify-center" disabled={actionLoading === 'approve'}>
                      <Ban className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Show NOC if already released */}
              {selected.status === 'RELEASED_REFUNDED' && selected.releaseRequest?.nocReferenceNumber && (
                <div className="glass-card p-6 border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <FileCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-emerald-400">Digital NOC Issued</h3>
                  </div>
                  <p className="text-sm text-white font-mono mb-3">{selected.releaseRequest.nocReferenceNumber}</p>
                  <button onClick={() => setShowNOC(selected)} className="btn-success w-full justify-center"><Printer className="w-4 h-4" /> View & Print NOC</button>
                </div>
              )}
            </>
          ) : (
            <div className="glass-card p-12 text-center">
              <FileCheck className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400">Select a release request to manage</p>
            </div>
          )}
        </div>
      </div>

      {/* NOC Modal */}
      {showNOC && (
        <div className="modal-overlay" onClick={() => setShowNOC(null)}>
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
                <p><strong>Reference No:</strong> {showNOC.releaseRequest?.nocReferenceNumber}</p>
                <p><strong>Date:</strong> {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                <hr />
                <p>This is to certify that the Fixed Deposit Receipt (FDR) bearing the details mentioned below has been duly verified and approved for release/refund by the competent authority of AICTE.</p>
                <table className="w-full text-left border-collapse mt-3">
                  <tbody>
                    {[['FDR Number', showNOC.fdrNumber], ['Institution', showNOC.institutionName], ['Issuing Bank', showNOC.issuingBank], ['Amount', formatCurrency(showNOC.depositAmount)], ['Maturity Date', formatDate(showNOC.maturityDate)]].map(([k, v], i) => (
                      <tr key={i} className="border-b"><td className="py-2 font-semibold w-1/3">{k}</td><td className="py-2">{v}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-4">The issuing bank is hereby authorized to release the above-mentioned FDR to the institution. AICTE relinquishes its lien and joint holder rights on this instrument.</p>
                <div className="mt-8 flex justify-between items-end">
                  <div><p className="font-bold">Authorized Signatory</p><p>AICTE Competent Authority</p></div>
                  <div className="text-center"><div className="w-24 h-24 border-2 border-dashed border-gray-400 flex items-center justify-center"><QrCode className="w-10 h-10 text-gray-400" /></div><p className="text-xs mt-1">{showNOC.releaseRequest?.nocReferenceNumber}</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
