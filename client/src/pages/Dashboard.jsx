import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../App';
import { getDashboard, runMaturityCheck, getNotifications, markAllNotificationsRead } from '../api';
import { useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  IndianRupee, ShieldCheck, AlertTriangle, Clock, XCircle, FileCheck,
  Bell, Play, CheckCheck, Ban, RefreshCw, TrendingUp
} from 'lucide-react';

const STATUS_COLORS = {
  ACTIVE_VERIFIED: '#10b981',
  SUBMITTED: '#3b82f6',
  UNDER_SCRUTINY: '#8b5cf6',
  DISCREPANCY_FLAGGED: '#ef4444',
  EXPIRING_SOON: '#f59e0b',
  MATURED_OVERDUE: '#dc2626',
  RENEWED: '#06b6d4',
  RELEASE_REQUESTED: '#6366f1',
  RELEASED_REFUNDED: '#22c55e',
  FORFEITED_ENCASHED: '#be123c'
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b', '#dc2626', '#06b6d4', '#6366f1', '#22c55e', '#be123c'];

export default function Dashboard() {
  const { user, showToast, notifications, unreadCount, fetchNotifications } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [runningCron, setRunningCron] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await getDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMaturity = async () => {
    setRunningCron(true);
    try {
      const res = await runMaturityCheck();
      showToast(`Maturity check complete! ${JSON.stringify(res.data.results)}`, 'success');
      fetchDashboard();
      fetchNotifications();
    } catch (err) {
      showToast('Failed to run maturity check', 'error');
    } finally {
      setRunningCron(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      fetchNotifications();
      showToast('All notifications marked as read', 'success');
    } catch (err) {
      showToast('Failed', 'error');
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="shimmer w-64 h-8 rounded-lg"></div></div>;

  const pieData = data?.statusCounts ? Object.entries(data.statusCounts).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value
  })) : [];

  const kpis = [
    { label: 'Total Deposit Corpus', value: `₹${data?.totalCorpusCrores || 0} Cr`, icon: IndianRupee, color: 'emerald', sub: `${data?.totalFdrs || 0} instruments` },
    { label: 'Active Verified', value: data?.activeVerified || 0, icon: ShieldCheck, color: 'blue', sub: 'Verified FDRs' },
    { label: 'Expiring Soon', value: data?.expiringSoon || 0, icon: Clock, color: 'amber', sub: 'Within 90 days' },
    { label: 'Overdue / Matured', value: data?.overdue || 0, icon: AlertTriangle, color: 'red', sub: 'Action required' },
    { label: 'Discrepancies', value: data?.discrepancyFlagged || 0, icon: XCircle, color: 'purple', sub: 'Flagged records' },
    { label: 'Released / Forfeited', value: (data?.releasedRefunded || 0) + (data?.forfeitedEncashed || 0), icon: FileCheck, color: 'cyan', sub: 'Completed lifecycle' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Executive Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Welcome back, {user?.name} • {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRunMaturity} className="btn-warning" disabled={runningCron}>
            <Play className="w-4 h-4" />
            {runningCron ? 'Running...' : 'Run Maturity Engine'}
          </button>
          <button onClick={fetchDashboard} className="btn-outline">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className={`kpi-card ${kpi.color}`}>
            <div className="flex items-center justify-between mb-3">
              <kpi.icon className="w-5 h-5 text-slate-400" />
              <TrendingUp className="w-3 h-3 text-slate-600" />
            </div>
            <p className="text-2xl font-bold text-white">{kpi.value}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{kpi.label}</p>
            <p className="text-[10px] text-slate-600 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Status Distribution Pie */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4">FDR Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${value}`}>
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0' }} />
              <Legend formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '11px' }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Maturity Timeline Bar */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4">Upcoming Maturities by Month</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data?.maturityTimeline || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bank Distribution + Notifications */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bank Distribution */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white mb-4">FDRs by Bank</h3>
          <div className="space-y-3">
            {data?.bankDistribution && Object.entries(data.bankDistribution).map(([bank, count]) => (
              <div key={bank} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-300">{bank}</span>
                    <span className="text-sm font-bold text-white">{count}</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(count / data.totalFdrs) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Alerts & Notifications</h3>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {notifications.length === 0 && <p className="text-slate-500 text-sm">No notifications</p>}
            {notifications.slice(0, 8).map((notif) => (
              <div
                key={notif._id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  notif.isRead
                    ? 'bg-slate-800/30 border-slate-700/30'
                    : 'bg-blue-500/5 border-blue-500/15'
                }`}
                onClick={() => notif.fdrNumber && navigate('/repository')}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.isRead ? 'bg-slate-600' : 'bg-blue-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 leading-relaxed">{notif.message}</p>
                    <p className="text-[10px] text-slate-600 mt-1">{new Date(notif.createdAt).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
