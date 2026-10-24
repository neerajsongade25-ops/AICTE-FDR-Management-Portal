import { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import {
  LayoutDashboard, FileUp, Search, Building2, FileCheck, ScrollText,
  Upload, Bell, LogOut, Shield, ChevronLeft, ChevronRight,
  Database, AlertTriangle, Menu, X
} from 'lucide-react';

const roleLabels = {
  INSTITUTION: 'College Admin',
  SCRUTINY_OFFICER: 'Scrutiny Officer',
  BANK_OFFICER: 'Bank Nodal Officer',
  DIRECTOR: 'AICTE Director'
};

const roleColors = {
  INSTITUTION: 'institution',
  SCRUTINY_OFFICER: 'scrutiny',
  BANK_OFFICER: 'bank',
  DIRECTOR: 'director'
};

export default function Layout({ children }) {
  const { user, logout, handleSwitchRole, unreadCount } = useContext(AuthContext);
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['ALL'] },
    { path: '/submit', icon: FileUp, label: 'Submit FDR', roles: ['INSTITUTION'] },
    { path: '/scrutiny', icon: Search, label: 'Scrutiny Workbench', roles: ['SCRUTINY_OFFICER', 'DIRECTOR'] },
    { path: '/bank', icon: Building2, label: 'Bank CBS Registry', roles: ['BANK_OFFICER', 'SCRUTINY_OFFICER', 'DIRECTOR'] },
    { path: '/release', icon: FileCheck, label: 'Release / Refund', roles: ['INSTITUTION', 'SCRUTINY_OFFICER', 'DIRECTOR'] },
    { path: '/repository', icon: Database, label: 'FDR Repository', roles: ['ALL'] },
    { path: '/bulk-import', icon: Upload, label: 'Bulk Import', roles: ['SCRUTINY_OFFICER', 'DIRECTOR'] },
    { path: '/audit', icon: ScrollText, label: 'Audit Trail', roles: ['SCRUTINY_OFFICER', 'DIRECTOR'] },
  ];

  const visibleNav = navItems.filter(item =>
    item.roles.includes('ALL') || item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hackathon Role Switcher Bar */}
      <div className="role-switcher">
        <div className="flex items-center gap-2 mr-4">
          <Shield className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hackathon Demo Switcher</span>
        </div>
        {['INSTITUTION', 'SCRUTINY_OFFICER', 'BANK_OFFICER', 'DIRECTOR'].map(role => (
          <button
            key={role}
            onClick={() => handleSwitchRole(role)}
            className={`role-btn ${roleColors[role]} ${user?.role === role ? 'active' : ''}`}
          >
            {roleLabels[role]}
          </button>
        ))}
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className={`${collapsed ? 'w-[70px]' : 'w-[260px]'} transition-all duration-300 bg-navy-950/80 border-r border-white/5 flex flex-col hidden md:flex`}>
          {/* Logo */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              {!collapsed && (
                <div>
                  <h1 className="text-sm font-bold text-white tracking-tight">AICTE FDR Portal</h1>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Security Deposit Mgmt</p>
                </div>
              )}
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {visibleNav.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-white/5">
            {!collapsed && (
              <div className="mb-3">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className={`text-xs font-medium badge ${roleColors[user?.role] === 'institution' ? 'badge-submitted' : roleColors[user?.role] === 'scrutiny' ? 'badge-scrutiny' : roleColors[user?.role] === 'bank' ? 'badge-renewed' : 'badge-expiring'} mt-1 inline-block`}>
                  {roleLabels[user?.role]}
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <button onClick={() => setCollapsed(!collapsed)} className="btn-outline p-2 flex-shrink-0" title="Toggle sidebar">
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              {!collapsed && (
                <button onClick={logout} className="btn-outline p-2 flex-1 justify-center" title="Logout">
                  <LogOut className="w-4 h-4" />
                  <span className="text-xs">Logout</span>
                </button>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="md:hidden fixed top-[42px] left-0 right-0 z-40 bg-navy-950/95 backdrop-blur-lg border-b border-white/5 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-bold text-white">AICTE FDR</span>
          </div>
          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="text-slate-400">
            {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {showMobileMenu && (
          <div className="md:hidden fixed inset-0 z-30 bg-navy-950/95 backdrop-blur-lg pt-[100px] p-4">
            <nav className="space-y-2">
              {visibleNav.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 md:pt-6 pt-16 max-h-screen">
          <div className="fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
