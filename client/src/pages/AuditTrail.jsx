import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { getAuditLogs } from '../api';
import {
  ScrollText, Search, Filter, Shield, Loader2, Hash, Clock, User, Globe
} from 'lucide-react';

const MODULE_COLORS = {
  FDR_SUBMISSION: 'text-blue-400',
  SCRUTINY: 'text-purple-400',
  BANK_VERIFICATION: 'text-cyan-400',
  BANK_CBS: 'text-teal-400',
  RENEWAL: 'text-indigo-400',
  RELEASE_REFUND: 'text-emerald-400',
  FORFEITURE: 'text-red-400',
  MATURITY_TRACKER: 'text-amber-400',
  LEGACY_IMPORT: 'text-slate-400'
};

const ACTION_ICONS = {
  FDR_SUBMITTED: '📤',
  FDR_UNDER_SCRUTINY: '🔍',
  FDR_APPROVED_ACTIVE: '✅',
  DISCREPANCY_FLAGGED: '🚩',
  CBS_VERIFICATION: '🏦',
  CBS_RECORD_CREATED: '➕',
  CBS_RECORD_UPDATED: '✏️',
  BANK_MANUAL_VERIFICATION: '🔐',
  FDR_RENEWED: '🔄',
  RELEASE_REQUESTED: '📋',
  SCRUTINY_RECOMMENDATION: '📝',
  RELEASE_APPROVED: '✅',
  RELEASE_REJECTED: '❌',
  FDR_FORFEITED: '⛔',
  MATURITY_CHECK_RUN: '⏰',
  BULK_IMPORT: '📦'
};

export default function AuditTrail() {
  const { showToast } = useContext(AuthContext);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      const params = {};
      if (moduleFilter) params.module = moduleFilter;
      if (roleFilter) params.userRole = roleFilter;
      if (search) params.fdrNumber = search;
      const res = await getAuditLogs(params);
      setLogs(res.data);
    } catch { showToast('Failed to load audit logs', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (!loading) { setLoading(true); fetchLogs(); } }, [moduleFilter, roleFilter]);

  const filtered = logs.filter(log => {
    if (search) {
      const s = search.toLowerCase();
      return (log.fdrNumber || '').toLowerCase().includes(s) ||
        log.action.toLowerCase().includes(s) ||
        log.performedBy.toLowerCase().includes(s);
    }
    return true;
  });

  if (loading) return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></div>;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3"><ScrollText className="w-7 h-7 text-indigo-400" /> Immutable Audit Trail</h1>
        <p className="text-slate-400 text-sm mt-1">Cryptographically hashed, chronological log of all system actions • {filtered.length} entries</p>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="form-label">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input className="form-input pl-9" placeholder="FDR number, action, user..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="w-48">
          <label className="form-label">Module</label>
          <select className="form-select" value={moduleFilter} onChange={e => setModuleFilter(e.target.value)}>
            <option value="">All Modules</option>
            {Object.keys(MODULE_COLORS).map(m => <option key={m} value={m}>{m.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div className="w-48">
          <label className="form-label">Role</label>
          <select className="form-select" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="INSTITUTION">Institution</option>
            <option value="SCRUTINY_OFFICER">Scrutiny Officer</option>
            <option value="BANK_OFFICER">Bank Officer</option>
            <option value="DIRECTOR">Director</option>
            <option value="SYSTEM">System</option>
          </select>
        </div>
      </div>

      {/* Audit Log Entries */}
      <div className="glass-card overflow-hidden">
        <div className="max-h-[65vh] overflow-y-auto">
          {filtered.map((log, i) => (
            <div key={log._id || i} className="p-4 border-b border-white/5 hover:bg-slate-800/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="text-2xl mt-0.5 flex-shrink-0">{ACTION_ICONS[log.action] || '📋'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-white">{log.action.replace(/_/g, ' ')}</span>
                    <span className={`text-xs font-semibold ${MODULE_COLORS[log.module] || 'text-slate-400'}`}>{log.module?.replace(/_/g, ' ')}</span>
                    {log.fdrNumber && (
                      <span className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded">
                        <Hash className="w-3 h-3 inline" /> {log.fdrNumber}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {log.performedBy}</span>
                    <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {log.userRole}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(log.timestamp).toLocaleString('en-IN')}</span>
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {log.ipAddress}</span>
                  </div>
                  {(log.previousState || log.newState) && (
                    <div className="mt-2 flex gap-4 text-xs">
                      {log.previousState && (
                        <div className="bg-red-500/5 rounded-lg p-2 flex-1">
                          <p className="text-red-400 font-semibold mb-1">Previous State</p>
                          <pre className="text-slate-500 whitespace-pre-wrap">{JSON.stringify(log.previousState, null, 1)}</pre>
                        </div>
                      )}
                      {log.newState && (
                        <div className="bg-emerald-500/5 rounded-lg p-2 flex-1">
                          <p className="text-emerald-400 font-semibold mb-1">New State</p>
                          <pre className="text-slate-500 whitespace-pre-wrap">{JSON.stringify(log.newState, null, 1)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                  {log.recordHash && (
                    <p className="text-[10px] font-mono text-slate-700 mt-1 truncate">Hash: {log.recordHash}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-500">No audit log entries found</div>
          )}
        </div>
      </div>
    </div>
  );
}
