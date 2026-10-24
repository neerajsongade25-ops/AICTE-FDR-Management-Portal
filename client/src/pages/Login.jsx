import { useState } from 'react';
import { login } from '../api';
import { Shield, Mail, Lock, Zap, Building2, Search, Landmark, Crown } from 'lucide-react';

const quickLogins = [
  { role: 'INSTITUTION', email: 'institution@demo.com', label: 'College Admin', icon: Building2, color: 'from-blue-500 to-blue-700', desc: 'Submit & manage FDRs' },
  { role: 'SCRUTINY_OFFICER', email: 'scrutiny@demo.com', label: 'Scrutiny Officer', icon: Search, color: 'from-purple-500 to-purple-700', desc: 'Verify & review FDRs' },
  { role: 'BANK_OFFICER', email: 'bank@demo.com', label: 'Bank Officer', icon: Landmark, color: 'from-cyan-500 to-cyan-700', desc: 'CBS verification' },
  { role: 'DIRECTOR', email: 'director@demo.com', label: 'AICTE Director', icon: Crown, color: 'from-amber-500 to-amber-700', desc: 'Approve & oversee' },
];

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login({ email, password });
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickLogin) => {
    setLoading(true);
    setError('');
    try {
      const res = await login({ email: quickLogin.email, password: 'demo123' });
      onLogin(res.data.token, res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #080e1a 0%, #0f172a 40%, #1e3a5f 100%)' }}>
      <div className="w-full max-w-5xl fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 mb-4 shadow-lg shadow-blue-500/25">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            AICTE FDR Management Portal
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Centralized Security Deposit & Fixed Deposit Receipt Lifecycle Management
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20">
              Regulation Bureau
            </span>
            <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold border border-blue-500/20">
              Government of India
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Quick Login Cards */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Hackathon Quick Login</h2>
            </div>
            <p className="text-slate-400 text-xs mb-4">Click any role to instantly login with demo credentials</p>
            <div className="grid grid-cols-2 gap-3">
              {quickLogins.map((ql) => (
                <button
                  key={ql.role}
                  onClick={() => handleQuickLogin(ql)}
                  disabled={loading}
                  className="group p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/15 transition-all duration-200 text-left"
                >
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${ql.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <ql.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-sm font-semibold text-white">{ql.label}</h3>
                  <p className="text-xs text-slate-500 mt-1">{ql.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Login */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold text-white mb-4">Manual Login</h2>
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-4">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    className="form-input pl-10"
                    placeholder="institution@demo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    className="form-input pl-10"
                    placeholder="demo123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <div className="mt-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <p className="text-xs font-semibold text-slate-400 mb-2">Demo Credentials</p>
              <div className="space-y-1 text-xs text-slate-500">
                <p>📧 institution@demo.com / scrutiny@demo.com</p>
                <p>📧 bank@demo.com / director@demo.com</p>
                <p>🔑 Password: <span className="text-slate-300 font-mono">demo123</span></p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          All India Council for Technical Education © {new Date().getFullYear()} • Regulation Bureau
        </p>
      </div>
    </div>
  );
}
