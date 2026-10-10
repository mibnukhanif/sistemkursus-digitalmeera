import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, ActivePage } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PesertaPage } from './pages/PesertaPage';
import { KartuPesertaPage } from './pages/KartuPesertaPage';
import { SistemAbsensiPage } from './pages/SistemAbsensiPage';
import { MonitoringAbsensiPage } from './pages/MonitoringAbsensiPage';
import { LaporanExportPage } from './pages/LaporanExportPage';
import { PengaturanPage } from './pages/PengaturanPage';
import { GasConnectionModal } from './components/GasConnectionModal';
import { GasCodeViewerModal } from './components/GasCodeViewerModal';
import { gasApi } from './services/gasApi';
import { AdminUser, ProfilLembaga } from './types';

const ADMIN_SESSION_KEY = 'digitalmeera_admin_session';

export function App() {
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(ADMIN_SESSION_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {}
      }
    }
    return null;
  });

  const [activePage, setActivePage] = useState<ActivePage>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Lembaga Profil
  const [profil, setProfil] = useState<ProfilLembaga>(() => {
    return gasApi.getLocalProfil();
  });

  // Assistant Modals
  const [gasModalOpen, setGasModalOpen] = useState<boolean>(false);
  const [codeModalOpen, setCodeModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Sinkronisasi data awal menyeluruh (peserta, absensi, profil) secara simultan & instan
    const initApp = async () => {
      try {
        await gasApi.initCustomLogo();
        setProfil(gasApi.getLocalProfil());

        const res = await gasApi.syncAll();
        if (res.success && res.data?.profil?.namaLembaga) {
          setProfil(res.data.profil);
        }
      } catch (err) {
        console.warn('Failed initial background sync', err);
      }
    };
    initApp();

    const handleProfilSync = (e: any) => {
      const p = e?.detail || gasApi.getLocalProfil();
      setProfil(p);
    };

    window.addEventListener('profil_updated', handleProfilSync);
    window.addEventListener('storage', handleProfilSync);

    return () => {
      window.removeEventListener('profil_updated', handleProfilSync);
      window.removeEventListener('storage', handleProfilSync);
    };
  }, []);

  const handleLoginSuccess = (admin: AdminUser) => {
    setCurrentUser(admin);
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(admin));
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    }
    // Pastikan profil & logo tetap terjaga saat kembali ke layar login
    setProfil(gasApi.getLocalProfil());
  };

  // If not logged in, show LoginPage
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        profil={profil}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800 antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        activePage={activePage}
        onSelectPage={(page) => setActivePage(page)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
        appTitle={profil.namaLembaga}
        footerText={profil.footer}
        logo={profil.logo}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLogout={handleLogout}
          profil={profil}
          adminName={currentUser.nama}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {activePage === 'dashboard' && (
              <DashboardPage profil={profil} onNavigate={(p) => setActivePage(p)} />
            )}
            {activePage === 'peserta' && (
              <PesertaPage profil={profil} />
            )}
            {activePage === 'kartu' && (
              <KartuPesertaPage profil={profil} />
            )}
            {activePage === 'absensi' && (
              <SistemAbsensiPage />
            )}
            {activePage === 'monitoring' && (
              <MonitoringAbsensiPage />
            )}
            {activePage === 'laporan' && (
              <LaporanExportPage profil={profil} />
            )}
            {activePage === 'pengaturan' && (
              <PengaturanPage
                profil={profil}
                onProfilUpdated={setProfil}
                adminUser={currentUser}
                onAdminUpdated={setCurrentUser}
                onOpenCodeModal={() => setCodeModalOpen(true)}
                onOpenGasModal={() => setGasModalOpen(true)}
              />
            )}
          </div>

          {/* Page Footer */}
          <footer className="mt-12 text-center text-xs text-slate-400 pb-4">
            <p>{profil.footer || '© DIGITALMEERA - Sistem Kursus & Les Privat'}</p>
          </footer>
        </main>
      </div>

      {/* Backend Setup Assistant Modal */}
      <GasConnectionModal
        isOpen={gasModalOpen}
        onClose={() => setGasModalOpen(false)}
        onConnectionChanged={() => {
          setGasModalOpen(false);
        }}
        onOpenCodeViewer={() => {
          setGasModalOpen(false);
          setCodeModalOpen(true);
        }}
      />

      {/* Backend Code Viewer Modal */}
      <GasCodeViewerModal
        isOpen={codeModalOpen}
        onClose={() => setCodeModalOpen(false)}
      />
    </div>
  );
}

export default App;
