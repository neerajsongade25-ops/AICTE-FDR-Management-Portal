import { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { downloadSampleCSV, previewBulkImport, executeBulkImport } from '../api';
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertTriangle, FileUp
} from 'lucide-react';

export default function BulkImport() {
  const { showToast } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleDownloadSample = async () => {
    try {
      const res = await downloadSampleCSV();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sample_legacy_fdr_import.csv';
      a.click();
      showToast('Sample CSV downloaded', 'success');
    } catch { showToast('Download failed', 'error'); }
  };

  const handlePreview = async () => {
    if (!file) return;
    setLoading(true);
    setPreview(null);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await previewBulkImport(formData);
      setPreview(res.data);
      showToast(`Preview: ${res.data.validCount} valid, ${res.data.invalidCount} invalid`, 'info');
    } catch (err) {
      showToast(err.response?.data?.error || 'Preview failed', 'error');
    } finally { setLoading(false); }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await executeBulkImport(formData);
      setImportResult(res.data);
      showToast(`Import complete: ${res.data.imported} imported, ${res.data.skipped} skipped`, 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Import failed', 'error');
    } finally { setImporting(false); }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3"><Upload className="w-7 h-7 text-indigo-400" /> Legacy Data Bulk Import</h1>
        <p className="text-slate-400 text-sm mt-1">CSV / Excel migration tool for importing historical FDR records</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Panel */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Upload CSV File</h3>
            <button onClick={handleDownloadSample} className="btn-outline text-xs">
              <Download className="w-3 h-3" /> Download Sample CSV
            </button>
          </div>

          <div
            className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-indigo-500/30 transition-colors cursor-pointer"
            onClick={() => document.getElementById('bulk-file').click()}
          >
            <FileSpreadsheet className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <input type="file" accept=".csv,.xlsx,.xls" onChange={e => { setFile(e.target.files[0]); setPreview(null); setImportResult(null); }} className="hidden" id="bulk-file" />
            <p className="text-sm text-blue-400">{file ? file.name : 'Click to upload CSV or Excel file'}</p>
            {file && <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>}
          </div>

          <div className="flex gap-3">
            <button onClick={handlePreview} className="btn-primary flex-1 justify-center" disabled={!file || loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
              Preview & Validate
            </button>
            <button onClick={handleImport} className="btn-success flex-1 justify-center" disabled={!file || importing || !preview || preview.validCount === 0}>
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Import Valid Records
            </button>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <h4 className="text-sm font-bold text-emerald-400 mb-2">Import Complete</h4>
              <p className="text-sm text-slate-300">✅ Imported: <span className="font-bold text-emerald-400">{importResult.imported}</span></p>
              <p className="text-sm text-slate-300">⏭️ Skipped: <span className="font-bold text-amber-400">{importResult.skipped}</span></p>
              {importResult.errors?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {importResult.errors.map((err, i) => <p key={i} className="text-xs text-red-300">• {err}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview Table */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4">
            Validation Preview
            {preview && (
              <span className="ml-3 text-sm font-normal text-slate-400">
                {preview.validCount} valid / {preview.invalidCount} invalid of {preview.totalRows} rows
              </span>
            )}
          </h3>

          {preview ? (
            <div className="max-h-[50vh] overflow-y-auto">
              <table className="data-table">
                <thead>
                  <tr><th>#</th><th>FDR Number</th><th>Institution</th><th>Amount</th><th>Status</th><th>Issues</th></tr>
                </thead>
                <tbody>
                  {preview.rows.map((row, i) => (
                    <tr key={i} className={row.valid ? '' : 'bg-red-500/5'}>
                      <td>{row.rowIndex}</td>
                      <td className="font-mono text-xs">{row.data.fdrNumber}</td>
                      <td className="text-xs max-w-[120px] truncate">{row.data.institutionName}</td>
                      <td className="text-xs">{row.data.depositAmount ? `₹${parseFloat(row.data.depositAmount).toLocaleString('en-IN')}` : '-'}</td>
                      <td>
                        {row.valid
                          ? <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 className="w-3 h-3" /> Valid</span>
                          : <span className="flex items-center gap-1 text-red-400 text-xs"><XCircle className="w-3 h-3" /> Invalid</span>
                        }
                      </td>
                      <td>
                        {row.errors.length > 0 && (
                          <div className="space-y-0.5">
                            {row.errors.map((err, j) => <p key={j} className="text-[10px] text-red-300">• {err}</p>)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileSpreadsheet className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Upload a CSV file and click "Preview & Validate"</p>
              <p className="text-xs text-slate-600 mt-2">Valid rows appear in green, invalid in red</p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-white mb-3">CSV Format Instructions</h3>
        <div className="grid md:grid-cols-2 gap-4 text-xs text-slate-400">
          <div>
            <p className="font-semibold text-slate-300 mb-1">Required Columns:</p>
            <p>fdrNumber, institutionName, issuingBank, depositAmount, issueDate, maturityDate</p>
          </div>
          <div>
            <p className="font-semibold text-slate-300 mb-1">Optional Columns:</p>
            <p>institutionId, aictePermanentId, courseCategory, branchIfsc, lockInYears, jointHolderName, lienMarkedToAicte</p>
          </div>
          <div>
            <p className="font-semibold text-slate-300 mb-1">Date Format:</p>
            <p>YYYY-MM-DD (e.g., 2024-01-15)</p>
          </div>
          <div>
            <p className="font-semibold text-slate-300 mb-1">Validation Checks:</p>
            <p>Duplicate FDR numbers, invalid dates, missing required fields, IFSC format, maturity status</p>
          </div>
        </div>
      </div>
    </div>
  );
}
