import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Compass,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  UserCircle,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Alunos', href: '/alunos', icon: Users },
    { name: 'Viagens', href: '/viagens', icon: Compass },
    { name: 'Documentos', href: '/documentos', icon: FileText },
    { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
    { name: 'Configurações', href: '/configuracoes', icon: Settings },
  ];

  const roleLabels: Record<string, { label: string; color: string }> = {
    ADMIN_HOST: { label: 'Admin Host', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    ADMIN: { label: 'Administrador', color: 'bg-teal-100 text-teal-800 border-teal-300' },
    GESTOR: { label: 'Gestor', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    VISUALIZADOR: { label: 'Visualizador', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  };

  const currentRole = user?.role ? roleLabels[user.role] : { label: 'Usuário', color: 'bg-slate-100 text-slate-700 border-slate-300' };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased font-sans text-slate-800">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <Logo size="sm" showSubtitle={false} />
        <div className="flex items-center gap-2">
          <PWAInstallButton compact />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none"
            aria-label="Abrir menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Sidebar Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-72 max-w-[80vw] h-full bg-slate-900 text-white p-5 flex flex-col justify-between shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="pb-6 border-b border-slate-800 flex items-center justify-between">
                <Logo size="md" variant="white" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User profile brief */}
              <div className="mt-5 p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center font-bold text-white text-base">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 ${currentRole.color}`}
                  >
                    {currentRole.label}
                  </span>
                </div>
              </div>

              {/* Nav links */}
              <nav className="mt-6 space-y-1.5">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                        isActive
                          ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-950/30'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.name}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 transition"
              >
                <LogOut className="w-5 h-5" />
                <span>Sair do sistema</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Permanent Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-72 flex-col justify-between bg-slate-900 text-white p-5 border-r border-slate-800 flex-shrink-0 sticky top-0 h-screen select-none">
        <div>
          <div className="pb-6 border-b border-slate-800/80">
            <Logo size="lg" variant="white" />
          </div>

          {/* User profile card in Sidebar */}
          <div className="mt-5 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 flex items-center justify-center font-bold text-white shadow-xs">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate" title={user?.name}>
                {user?.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span className="text-[11px] font-medium text-emerald-300 truncate">
                  {currentRole.label}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="mt-6 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.href);
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-emerald-700 text-white font-semibold shadow-md shadow-emerald-950/40'
                      : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <PWAInstallButton />

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-300 hover:bg-rose-950/40 hover:text-rose-100 transition border border-rose-900/30"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair da conta</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Desktop Top Header Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
              LOG MMS • Produção
            </span>
          </div>

          <div className="flex items-center gap-4">
            <PWAInstallButton compact />
            <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200 text-sm">
              <UserCircle className="w-5 h-5 text-slate-400" />
              <span className="font-semibold text-slate-800">{user?.name}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentRole.color}`}
              >
                {currentRole.label}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content Viewport */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>

      <OfflineIndicator />
    </div>
  );
};
