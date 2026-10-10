import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  ClipboardList, 
  QrCode, 
  FileSpreadsheet, 
  Settings, 
  LogOut, 
  X,
  GraduationCap,
  ExternalLink
} from 'lucide-react';
import { InstitutionLogo } from './InstitutionLogo';

export type ActivePage = 
  | 'dashboard'
  | 'peserta'
  | 'kartu'
  | 'monitoring'
  | 'absensi'
  | 'laporan'
  | 'pengaturan';

interface SidebarProps {
  activePage: ActivePage;
  onSelectPage: (page: ActivePage) => void;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  appTitle?: string;
  footerText?: string;
  logo?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  onSelectPage,
  isOpen,
  onClose,
  onLogout,
  appTitle = 'DIGITALMEERA',
  footerText = '© DIGITALMEERA',
  logo,
}) => {
  const menuItems: Array<{ id: ActivePage; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'peserta', label: 'Data Peserta', icon: Users },
    { id: 'kartu', label: 'Kartu Peserta', icon: CreditCard },
    { id: 'absensi', label: 'Sistem Absensi', icon: QrCode },
    { id: 'monitoring', label: 'Monitoring Absensi', icon: ClipboardList },
    { id: 'laporan', label: 'Laporan & Export', icon: FileSpreadsheet },
    { id: 'pengaturan', label: 'Pengaturan Sistem', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/95 border border-slate-700/80 p-1 shadow-md overflow-hidden">
              <InstitutionLogo
                logo={logo}
                alt={appTitle}
                size={200}
                fallbackType="cap"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold tracking-wider text-sm text-white truncate">
                {appTitle}
              </h1>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium truncate">
                Sistem Kursus & Absensi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Menu Utama
          </div>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectPage(item.id);
                    onClose();
                  }}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-sm font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 transition-colors ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-sky-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Public Registration Link */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
            <a
              href="/pendaftaran.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg bg-sky-950/60 border border-sky-800/50 px-3 py-2 text-xs font-semibold text-sky-300 hover:bg-sky-900/60 hover:text-white transition-all shadow-2xs group"
              title="Buka form pendaftaran mandiri calon siswa"
            >
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span>Pendaftaran Mandiri</span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-sky-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </a>
          </div>
        </div>

        {/* Bottom Section: Logout & Footer */}
        <div className="border-t border-slate-800 p-3">
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Logout</span>
          </button>

          <div className="mt-3 px-3 text-center">
            <p className="text-[11px] text-slate-400 truncate">
              {footerText}
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Google Apps Script Backend
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
