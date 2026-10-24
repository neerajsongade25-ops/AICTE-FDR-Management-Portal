import { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { submitFDR } from '../api';
import { useNavigate } from 'react-router-dom';
import {
  FileUp, Upload, CheckCircle2, XCircle, AlertTriangle, Shield,
  Hash, Building2, Calendar, IndianRupee, Landmark, FileText, Zap, Loader2
} from 'lucide-react';

const TEST_CASES = [
  {
    id: 'VALID',
    label: '✅ Valid Perfect FDR',
    desc: 'Matches Bank CBS, Joint/Lien clauses present',
    color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    data: {
      fdrNumber: 'FDR/SBI/2026/TEST001',
      institutionName: 'Test Engineering College, Mumbai',
      institutionId: 'INST-TEST-001',
      aictePermanentId: '1-9999888877',
      courseCategory: 'ENGINEERING',
      issuingBank: 'State Bank of India',
      branchIfsc: 'SBIN0009999',
      depositAmount: '2500000',
      issueDate: '2026-01-15',
      maturityDate: '2029-01-15',
      lockInYears: '3',
      jointHolderName: 'AICTE (Joint Holder)',
      lienMarkedToAicte: true,
    }
  },
  {
    id: 'AMOUNT_MISMATCH',
    label: '⚠️ Tampered Amount FDR',
    desc: 'Claims ₹50L but OCR & Bank show ₹5L',
    color: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    data: {
      fdrNumber: 'FDR/CNB/2026/TEST002',
      institutionName: 'Fraudulent Institute of Technology',
      institutionId: 'INST-TEST-002',
      aictePermanentId: '1-1111222233',
      courseCategory: 'ENGINEERING',
      issuingBank: 'Canara Bank',
      branchIfsc: 'CNRB0001111',
      depositAmount: '5000000',
      issueDate: '2026-02-01',
      maturityDate: '2029-02-01',
      lockInYears: '3',
      jointHolderName: 'AICTE (Joint Holder)',
      lienMarkedToAicte: true,
    }
  },
  {
    id: 'MISSING_LIEN',
    label: '🚫 Missing Lien Clause',
    desc: 'No AICTE lien/joint holder clause detected',
    color: 'bg-red-500/10 border-red-500/20 text-red-400',
    data: {
      fdrNumber: 'FDR/BOB/2026/TEST003',
      institutionName: 'Non-Compliant College of Engineering',
      institutionId: 'INST-TEST-003',
      aictePermanentId: '1-3333444455',
      courseCategory: 'MBA',
      issuingBank: 'Bank of Baroda',
      branchIfsc: 'BARB0TEST01',
      depositAmount: '3000000',
      issueDate: '2026-03-01',
      maturityDate: '2029-03-01',
      lockInYears: '3',
      jointHolderName: '',
      lienMarkedToAicte: false,
    }
  },
  {
    id: 'DUPLICATE',
    label: '🔴 Duplicate Instrument',
    desc: 'Reuses existing FDR number',
    color: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
    data: {
      fdrNumber: 'FDR/SBI/2023/001247',
      institutionName: 'Duplicate Submission College',
      institutionId: 'INST-TEST-004',
      aictePermanentId: '1-5555666677',
      courseCategory: 'ENGINEERING',
      issuingBank: 'State Bank of India',
      branchIfsc: 'SBIN0001234',
      depositAmount: '5000000',
      issueDate: '2023-03-15',
      maturityDate: '2026-03-15',
      lockInYears: '3',
      jointHolderName: 'AICTE (Joint Holder)',
      lienMarkedToAicte: true,
    }
  }
];

export default function FDRSubmission() {
  const { user, showToast } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fdrNumber: '', institutionName: user?.institutionName || '', institutionId: user?.institutionId || '',
    aictePermanentId: user?.aictePermanentId || '', courseCategory: 'ENGINEERING',
    issuingBank: '', branchIfsc: '', depositAmount: '', issueDate: '', maturityDate: '',
    lockInYears: '3', jointHolderName: '', lienMarkedToAicte: false,
  });
  const [testCase, setTestCase] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const loadTestCase = (tc) => {
    setForm({ ...tc.data });
    setTestCase(tc.id);
    setResult(null);
    setError(null);
    showToast(`Loaded test case: ${tc.label}`, 'info');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));
      formData.append('testCase', testCase);
      if (file) formData.append('document', file);

      const res = await submitFDR(formData);
      setResult(res.data);
      showToast('FDR submitted successfully!', 'success');
    } catch (err) {
      const errData = err.response?.data;
      setError(errData);
      showToast(errData?.error || 'Submission failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val) => {
    if (!val) return '';
    return `₹${parseFloat(val).toLocaleString('en-IN')}`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <FileUp className="w-7 h-7 text-blue-400" /> Smart FDR Submission
        </h1>
        <p className="text-slate-400 text-sm mt-1">Submit a new Fixed Deposit Receipt with AI/OCR auto-verification</p>
      </div>

      {/* Test Case Buttons */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Load Sample Test Case (1-Click Demo)</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {TEST_CASES.map(tc => (
            <button
              key={tc.id}
              onClick={() => loadTestCase(tc)}
              className={`p-3 rounded-xl border text-left transition-all hover:scale-[1.02] ${tc.color} ${testCase === tc.id ? 'ring-2 ring-white/20' : ''}`}
            >
              <p className="text-sm font-semibold">{tc.label}</p>
              <p className="text-xs opacity-70 mt-1">{tc.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 glass-card p-6 space-y-5">
          <h3 className="text-lg font-bold text-white">FDR Instrument Details</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="form-label"><Hash className="w-3 h-3 inline mr-1" />FDR Number</label>
              <input className="form-input" value={form.fdrNumber} onChange={e => setForm({...form, fdrNumber: e.target.value})} required placeholder="FDR/BANK/YEAR/XXXXX" />
            </div>
            <div>
              <label className="form-label"><Building2 className="w-3 h-3 inline mr-1" />Institution Name</label>
              <input className="form-input" value={form.institutionName} onChange={e => setForm({...form, institutionName: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">AICTE Permanent ID</label>
              <input className="form-input" value={form.aictePermanentId} onChange={e => setForm({...form, aictePermanentId: e.target.value})} placeholder="1-XXXXXXXXXX" />
            </div>
            <div>
              <label className="form-label">Course Category</label>
              <select className="form-select" value={form.courseCategory} onChange={e => setForm({...form, courseCategory: e.target.value})}>
                <option value="ENGINEERING">Engineering</option>
                <option value="PHARMACY">Pharmacy</option>
                <option value="MBA">MBA</option>
                <option value="MCA">MCA</option>
                <option value="ARCHITECTURE">Architecture</option>
                <option value="POLYTECHNIC">Polytechnic</option>
              </select>
            </div>
            <div>
              <label className="form-label"><Landmark className="w-3 h-3 inline mr-1" />Issuing Bank</label>
              <input className="form-input" value={form.issuingBank} onChange={e => setForm({...form, issuingBank: e.target.value})} required placeholder="State Bank of India" />
            </div>
            <div>
              <label className="form-label">Branch IFSC</label>
              <input className="form-input" value={form.branchIfsc} onChange={e => setForm({...form, branchIfsc: e.target.value})} placeholder="SBIN0001234" />
            </div>
            <div>
              <label className="form-label"><IndianRupee className="w-3 h-3 inline mr-1" />Deposit Amount (₹)</label>
              <input className="form-input" type="number" value={form.depositAmount} onChange={e => setForm({...form, depositAmount: e.target.value})} required placeholder="2500000" />
              {form.depositAmount && <p className="text-xs text-slate-500 mt-1">{formatCurrency(form.depositAmount)}</p>}
            </div>
            <div>
              <label className="form-label">Lock-in Years</label>
              <input className="form-input" type="number" value={form.lockInYears} onChange={e => setForm({...form, lockInYears: e.target.value})} />
            </div>
            <div>
              <label className="form-label"><Calendar className="w-3 h-3 inline mr-1" />Issue Date</label>
              <input className="form-input" type="date" value={form.issueDate} onChange={e => setForm({...form, issueDate: e.target.value})} required />
            </div>
            <div>
              <label className="form-label"><Calendar className="w-3 h-3 inline mr-1" />Maturity Date</label>
              <input className="form-input" type="date" value={form.maturityDate} onChange={e => setForm({...form, maturityDate: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Joint Holder Name</label>
              <input className="form-input" value={form.jointHolderName} onChange={e => setForm({...form, jointHolderName: e.target.value})} placeholder="AICTE (Joint Holder)" />
            </div>
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.lienMarkedToAicte} onChange={e => setForm({...form, lienMarkedToAicte: e.target.checked})} className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-300">Lien Marked to AICTE</span>
              </label>
            </div>
          </div>

          {/* File Upload */}
          <div>
            <label className="form-label"><FileText className="w-3 h-3 inline mr-1" />Upload FDR Document (Optional)</label>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center hover:border-blue-500/30 transition-colors">
              <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files[0])} className="hidden" id="fdr-upload" />
              <label htmlFor="fdr-upload" className="text-sm text-blue-400 cursor-pointer hover:text-blue-300">
                {file ? file.name : 'Click to upload PDF, JPG, or PNG'}
              </label>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full justify-center text-base py-3" disabled={loading}>
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : <><Shield className="w-5 h-5" /> Submit FDR for Verification</>}
          </button>
        </form>

        {/* Results Panel */}
        <div className="space-y-4">
          {/* Error Alert */}
          {error && (
            <div className="glass-card p-5 border-red-500/30 pulse-alert">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-red-400" />
                <h3 className="text-sm font-bold text-red-400">{error.alert === 'DUPLICATE_FDR_NUMBER' ? 'Duplicate FDR Number' : error.alert === 'DUPLICATE_FILE_HASH' ? 'Duplicate Document' : 'Submission Error'}</h3>
              </div>
              <p className="text-xs text-red-300 mb-2">{error.error}</p>
              {error.detail && <p className="text-xs text-slate-400">{error.detail}</p>}
              {error.existingRecord && (
                <div className="mt-3 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                  <p className="text-xs text-slate-300">Existing Record: <span className="text-white font-semibold">{error.existingRecord.institutionName}</span></p>
                  {error.existingRecord.fdrNumber && <p className="text-xs text-slate-400">FDR: {error.existingRecord.fdrNumber}</p>}
                </div>
              )}
            </div>
          )}

          {/* OCR Extraction Results */}
          {result && (
            <>
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-white">AI/OCR Extraction Results</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'FDR Number', ocr: result.ocrResults.extractedFdrNumber, submitted: form.fdrNumber },
                    { label: 'Amount', ocr: formatCurrency(result.ocrResults.extractedAmount), submitted: formatCurrency(form.depositAmount) },
                    { label: 'Bank', ocr: result.ocrResults.extractedBank, submitted: form.issuingBank },
                    { label: 'Confidence', ocr: `${(result.ocrResults.ocrConfidenceScore * 100).toFixed(1)}%`, submitted: '-', noCompare: true },
                  ].map((item, i) => {
                    const match = item.noCompare || item.ocr === item.submitted;
                    return (
                      <div key={i} className={`flex items-center justify-between p-2 rounded-lg ${match ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
                        <span className="text-xs text-slate-400">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono ${match ? 'text-emerald-400' : 'text-red-400'}`}>{item.ocr}</span>
                          {match ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Regulatory Clause Card */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-bold text-white mb-3">Regulatory Clause Verification</h3>
                <div className="space-y-2">
                  <div className={`flex items-center justify-between p-3 rounded-lg ${result.ocrResults.hasJointAccountClause ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-red-500/5 border border-red-500/10'}`}>
                    <span className="text-xs text-slate-300">Joint Account with AICTE</span>
                    {result.ocrResults.hasJointAccountClause
                      ? <span className="badge badge-verified">PASS</span>
                      : <span className="badge badge-discrepancy">FAIL</span>}
                  </div>
                  <div className={`flex items-center justify-between p-3 rounded-lg ${result.ocrResults.hasAicteLienClause ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-red-500/5 border border-red-500/10'}`}>
                    <span className="text-xs text-slate-300">Lien Marked to AICTE</span>
                    {result.ocrResults.hasAicteLienClause
                      ? <span className="badge badge-verified">PASS</span>
                      : <span className="badge badge-discrepancy">FAIL</span>}
                  </div>
                </div>
              </div>

              {/* SHA-256 Hash */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-bold text-white mb-2">Document Integrity (SHA-256)</h3>
                <p className="text-xs font-mono text-slate-400 break-all bg-slate-800/50 p-2 rounded">{result.sha256Hash}</p>
              </div>

              {/* Discrepancy Flags */}
              {result.discrepancyFlags?.length > 0 && (
                <div className="glass-card p-5 border-amber-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-amber-400">Discrepancy Flags</h3>
                  </div>
                  <ul className="space-y-1">
                    {result.discrepancyFlags.map((flag, i) => (
                      <li key={i} className="text-xs text-amber-300 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Status */}
              <div className="glass-card p-5 text-center">
                <p className="text-sm text-slate-300 mb-2">FDR Status</p>
                <span className={`badge text-base px-4 py-2 ${result.fdr?.status === 'SUBMITTED' ? 'badge-submitted' : 'badge-discrepancy'}`}>
                  {result.fdr?.status?.replace(/_/g, ' ')}
                </span>
                <button onClick={() => navigate('/repository')} className="btn-outline w-full mt-4 justify-center">
                  View in Repository →
                </button>
              </div>
            </>
          )}

          {!result && !error && (
            <div className="glass-card p-8 text-center">
              <FileUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Fill the form and submit to see AI/OCR extraction results</p>
              <p className="text-xs text-slate-600 mt-2">Or use a Test Case button above for instant demo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
