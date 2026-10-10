import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  Clock, 
  User, 
  LogOut,
  RefreshCw,
  Database
} from 'lucide-react';
import { ProfilLembaga } from '../types';
import { gasApi } from '../services/gasApi';

interface HeaderProps {
  onToggleSidebar: () => void;
  onLogout: () => void;
  profil: ProfilLembaga;
  adminName: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onLogout,
  profil,
  adminName,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string>('');
  const [logoError, setLogoError] = useState<boolean>(false);

  const formattedLogo = profil?.logo ? gasApi.formatLogoUrl(profil.logo) : '';

  const handleGlobalSync = async () => {
    setIsSyncing(true);
    setSyncFeedback('');
    try {
      const res = await gasApi.syncAll(true);
      if (res.success && res.data) {
        setSyncFeedback(`Tersinkron: ${res.data.peserta.length} siswa`);
      } else {
        setSyncFeedback(res.message || 'Sinkronisasi selesai');
      }
    } catch (err: any) {
      setSyncFeedback('Gagal sinkron');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(''), 4000);
    }
  };

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setCurrentDate(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Left: Mobile hamburger & Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          title="Buka Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          {formattedLogo && !logoError ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-slate-200/90 p-1 shadow-xs overflow-hidden">
              <img 
                src={formattedLogo} 
                alt={profil.namaLembaga || 'Logo'} 
                className="max-h-full max-w-full object-contain" 
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 font-bold text-white text-xs tracking-wider shadow-xs">
              DM
            </div>
          )}
          <span className="hidden sm:inline font-bold tracking-tight text-slate-800 text-base">
            {profil.namaLembaga || 'DIGITALMEERA'}
          </span>
          <span className="hidden md:inline text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            Presensi & Kursus
          </span>
        </div>
      </div>

      {/* Right: Refresh button, Clock & Admin Info */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Segarkan Data Button */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleGlobalSync}
            disabled={isSyncing}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold shadow-2xs transition-all disabled:opacity-60 ${
              isSyncing
                ? 'border-sky-300 bg-sky-50 text-sky-700'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
            title="Segarkan data langsung dari Google Spreadsheet"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
          </button>
          {syncFeedback && (
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md animate-in fade-in hidden md:inline">
              {syncFeedback}
            </span>
          )}
        </div>

        {/* Real-time Clock */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-700 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/80">
          <Clock className="h-3.5 w-3.5 text-sky-500" />
          <span className="font-semibold text-slate-800">{currentTime}</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-600">{currentDate}</span>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <User className="h-4 w-4" />
          </div>
          <div className="hidden xl:block text-left text-xs">
            <p className="font-semibold text-slate-800 leading-none">{adminName || 'Admin'}</p>
            <p className="text-slate-600 mt-0.5">Administrator</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Keluar / Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
