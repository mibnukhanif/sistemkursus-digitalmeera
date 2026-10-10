import React, { useState, useEffect } from 'react';
import { ProfilLembaga, Shift, CardTemplateConfig, AdminUser } from '../types';
import { gasApi } from '../services/gasApi';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { 
  User, 
  Building2, 
  Clock, 
  CreditCard, 
  FileText, 
  Upload, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Link2, 
  Save, 
  RefreshCw,
  Code2,
  Image as ImageIcon,
  Sparkles,
  QrCode as QrCodeIcon,
  ExternalLink
} from 'lucide-react';
import { generateQrCodeDataUrl } from '../lib/qrcode';

interface PengaturanPageProps {
  profil: ProfilLembaga;
  onProfilUpdated: (p: ProfilLembaga) => void;
  adminUser: AdminUser;
  onAdminUpdated: (admin: AdminUser) => void;
  onOpenCodeModal: () => void;
  onOpenGasModal: () => void;
}

export const PengaturanPage: React.FC<PengaturanPageProps> = ({
  profil,
  onProfilUpdated,
  adminUser,
  onAdminUpdated,
  onOpenCodeModal,
  onOpenGasModal,
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'lembaga' | 'shift' | 'kartu' | 'backend'>('admin');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Tab A: Admin State
  const [adminUsername, setAdminUsername] = useState<string>(adminUser.username);
  const [adminNama, setAdminNama] = useState<string>(adminUser.nama);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [adminSaving, setAdminSaving] = useState<boolean>(false);
  const [adminMsg, setAdminMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Tab B: Lembaga State
  const [namaLembaga, setNamaLembaga] = useState<string>(profil.namaLembaga || 'DIGITALMEERA');
  const [logo, setLogo] = useState<string>(profil.logo || '');
  const [alamat, setAlamat] = useState<string>(profil.alamat || '');
  const [nomorWA, setNomorWA] = useState<string>(profil.nomorWA || '');
  const [email, setEmail] = useState<string>(profil.email || '');
  const [website, setWebsite] = useState<string>(profil.website || '');
  const [footer, setFooter] = useState<string>(profil.footer || '');
  const [lembagaSaving, setLembagaSaving] = useState<boolean>(false);
  const [logoUploading, setLogoUploading] = useState<boolean>(false);

  // Sinkronisasi otomatis saat prop profil diperbarui
  useEffect(() => {
    setNamaLembaga(profil.namaLembaga || 'DIGITALMEERA');
    setLogo(profil.logo || '');
    setAlamat(profil.alamat || '');
    setNomorWA(profil.nomorWA || '');
    setEmail(profil.email || '');
    setWebsite(profil.website || '');
    setFooter(profil.footer || '');
  }, [profil]);

  // Tab C: Shift State
  const [shifts, setShifts] = useState<Shift[]>(() => gasApi.getLocalShifts());
  const [shiftModalOpen, setShiftModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [shiftNama, setShiftNama] = useState<string>('');
  const [shiftJamMulai, setShiftJamMulai] = useState<string>('08:00');
  const [shiftJamSelesai, setShiftJamSelesai] = useState<string>('10:00');
  const [shiftStatus, setShiftStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);

  // Tab D: Kartu Config State
  const [cardConfig, setCardConfig] = useState<CardTemplateConfig>({
    theme: 'modern-navy',
    accentColor: '#0ea5e9',
    barcodeSize: 'large',
    showPhoto: true,
    showProgram: true,
    showWatermark: true,
  });

  // Tab E: Backend GAS URL
  const [gasUrl, setGasUrl] = useState<string>(gasApi.getApiUrl());
  const [testingGas, setTestingGas] = useState<boolean>(false);

  useEffect(() => {
    // Load shifts & card config
    const load = async () => {
      const [sRes, cCfg] = await Promise.all([
        gasApi.getShifts(),
        gasApi.getCardConfig(),
      ]);
      if (sRes.success && sRes.data) setShifts(sRes.data);
      if (cCfg) setCardConfig(cCfg);
    };
    load();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Submit Admin Profile
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setAdminMsg({ type: 'error', text: 'Konfirmasi password baru tidak cocok.' });
      return;
    }

    setAdminSaving(true);
    try {
      const res = await gasApi.updateAdmin(
        adminUser.id,
        adminUsername,
        adminNama,
        currentPassword,
        newPassword || undefined
      );

      if (res.success) {
        setAdminMsg({ type: 'success', text: 'Profil administrator berhasil disimpan.' });
        onAdminUpdated({ ...adminUser, username: adminUsername, nama: adminNama });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setAdminMsg({ type: 'error', text: res.message || 'Gagal menyimpan profil.' });
      }
    } catch (err: any) {
      setAdminMsg({ type: 'error', text: err.message || 'Terjadi kesalahan sistem.' });
    } finally {
      setAdminSaving(false);
    }
  };

  // Submit Profil Lembaga
  const handleSaveLembaga = async (e: React.FormEvent) => {
    e.preventDefault();
    setLembagaSaving(true);
    try {
      const updated: ProfilLembaga = {
        namaLembaga,
        logo,
        alamat,
        nomorWA,
        email,
        website,
        footer,
      };
      const res = await gasApi.updateProfil(updated);
      if (res.success) {
        onProfilUpdated(updated);
        showToast('Identitas lembaga berhasil diperbarui.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLembagaSaving(false);
    }
  };

  // Upload Logo Lembaga
  const handleUploadLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('Ukuran file maksimal 8 MB.');
      return;
    }

    setLogoUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 512;
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          let dataUrl = src;
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9);
          }
          setLogo(dataUrl);

          // Secara otomatis update profil & simpan agar logo di login & sidebar langsung berganti seketika
          const updated: ProfilLembaga = {
            namaLembaga,
            logo: dataUrl,
            alamat,
            nomorWA,
            email,
            website,
            footer,
          };
          await gasApi.updateProfil(updated);
          onProfilUpdated(updated);
          showToast('Logo Digitalmeera berhasil diperbarui & otomatis diterapkan di Dashboard, Sidebar & Login!');
        } catch (err) {
          console.error('Error processing logo image:', err);
          showToast('Gagal memproses gambar logo.');
        } finally {
          setLogoUploading(false);
        }
      };
      img.onerror = async () => {
        try {
          setLogo(src);
          const updated: ProfilLembaga = {
            namaLembaga,
            logo: src,
            alamat,
            nomorWA,
            email,
            website,
            footer,
          };
          await gasApi.updateProfil(updated);
          onProfilUpdated(updated);
          showToast('Logo Digitalmeera berhasil diperbarui & otomatis diterapkan di Dashboard, Sidebar & Login!');
        } finally {
          setLogoUploading(false);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Hapus Logo Lembaga
  const handleRemoveLogo = async () => {
    setLogo('');
    const updated: ProfilLembaga = {
      namaLembaga,
      logo: '',
      alamat,
      nomorWA,
      email,
      website,
      footer,
    };
    await gasApi.updateProfil(updated);
    onProfilUpdated(updated);
    showToast('Logo lembaga berhasil dihapus.');
  };

  // Shift CRUD Handlers
  const handleOpenAddShift = () => {
    setEditingShift(null);
    setShiftNama('');
    setShiftJamMulai('08:00');
    setShiftJamSelesai('10:00');
    setShiftStatus('Aktif');
    setShiftModalOpen(true);
  };

  const handleOpenEditShift = (s: Shift) => {
    setEditingShift(s);
    setShiftNama(s.namaShift);
    setShiftJamMulai(s.jamMulai);
    setShiftJamSelesai(s.jamSelesai);
    setShiftStatus(s.status);
    setShiftModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftNama.trim()) return;

    if (editingShift) {
      const res = await gasApi.updateShift({
        ...editingShift,
        namaShift: shiftNama.trim(),
        jamMulai: shiftJamMulai,
        jamSelesai: shiftJamSelesai,
        status: shiftStatus,
      });
      if (res.success) {
        showToast('Shift berhasil diperbarui.');
        setShiftModalOpen(false);
        const sRes = await gasApi.getShifts();
        if (sRes.success && sRes.data) setShifts(sRes.data);
      }
    } else {
      const res = await gasApi.createShift({
        namaShift: shiftNama.trim(),
        jamMulai: shiftJamMulai,
        jamSelesai: shiftJamSelesai,
        status: shiftStatus,
      });
      if (res.success) {
        showToast('Shift baru berhasil ditambahkan.');
        setShiftModalOpen(false);
        const sRes = await gasApi.getShifts();
        if (sRes.success && sRes.data) setShifts(sRes.data);
      }
    }
  };

  const handleDeleteShift = async () => {
    if (!shiftToDelete) return;
    const res = await gasApi.deleteShift(shiftToDelete.idShift);
    if (res.success) {
      showToast('Shift berhasil dihapus.');
      setShiftToDelete(null);
      const sRes = await gasApi.getShifts();
      if (sRes.success && sRes.data) setShifts(sRes.data);
    }
  };

  // Tab D: Card Template State
  const [templateUploading, setTemplateUploading] = useState<boolean>(false);
  const [sampleQrUrl, setSampleQrUrl] = useState<string>('');

  useEffect(() => {
    generateQrCodeDataUrl('DM0001', { size: 200, margin: 1 }).then((url) => {
      setSampleQrUrl(url);
    });
  }, []);

  const handleUploadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/i)) {
      showToast('Format file harus berupa gambar JPG atau PNG.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      showToast('Ukuran file maksimal 8 MB.');
      return;
    }

    setTemplateUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.92);
          setCardConfig((prev) => ({
            ...prev,
            templateImage: dataUrl,
            useCustomTemplate: true,
          }));
          showToast('Template kartu berhasil diunggah! Klik Simpan Pengaturan Kartu.');
        }
        setTemplateUploading(false);
      };
      img.onerror = () => {
        setTemplateUploading(false);
        showToast('Gagal memproses gambar template.');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Save Card Config
  const handleSaveCardConfig = () => {
    gasApi.saveCardConfig(cardConfig);
    showToast('Konfigurasi template kartu berhasil disimpan.');
  };

  const [syncingNow, setSyncingNow] = useState<boolean>(false);

  // Test GAS URL
  const handleTestGas = async () => {
    setTestingGas(true);
    const res = await gasApi.testConnection(gasUrl);
    setTestingGas(false);
    showToast(res.message);
  };

  const handleSaveGasUrl = () => {
    gasApi.setApiUrl(gasUrl);
    showToast('URL Google Apps Script berhasil disimpan!');
    handleTestGas();
  };

  const handleResetGasUrl = () => {
    const defaultUrl = gasApi.resetToDefaultUrl();
    setGasUrl(defaultUrl);
    showToast('URL Google Apps Script direset ke URL resmi Digitalmeera.');
  };

  const handleSyncNow = async () => {
    setSyncingNow(true);
    const res = await gasApi.syncAll(true);
    setSyncingNow(false);
    if (res.success && res.data) {
      showToast(res.message || `Data berhasil disegarkan! ${res.data.peserta.length} peserta di Spreadsheet.`);
    } else {
      showToast(res.message || 'Gagal menyegarkan data dari Spreadsheet.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Pengaturan Sistem
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Konfigurasi akun administrator, identitas lembaga, jam shift presensi, template kartu, dan API backend.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'admin'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Profil Admin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lembaga')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'lembaga'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Identitas Lembaga</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('shift')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'shift'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Jam Presensi & Shift</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('kartu')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'kartu'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Template Kartu</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backend')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap transition-colors ${
            activeTab === 'backend'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Link2 className="h-4 w-4" />
          <span>Koneksi Google Spreadsheet</span>
        </button>
      </div>

      {/* TAB A: PROFIL ADMIN */}
      {activeTab === 'admin' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Akun & Keamanan Administrator
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Ganti username atau password administrator untuk menjaga keamanan sistem.
          </p>

          {adminMsg && (
            <div
              className={`mb-5 flex items-start gap-2.5 rounded-xl p-3 text-xs ${
                adminMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {adminMsg.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <p className="font-medium">{adminMsg.text}</p>
            </div>
          )}

          <form onSubmit={handleSaveAdmin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Username Admin
              </label>
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Nama Lengkap Administrator
              </label>
              <input
                type="text"
                value={adminNama}
                onChange={(e) => setAdminNama(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Ubah Password (Kosongkan jika tidak ingin mengganti)
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Password Saat Ini</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini jika ganti password..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Password Baru</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-600 block mb-1">Konfirmasi Password Baru</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru..."
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={adminSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{adminSaving ? 'Menyimpan...' : 'Simpan Profil Admin'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB B: IDENTITAS LEMBAGA */}
      {activeTab === 'lembaga' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs max-w-2xl">
          <h3 className="text-sm font-bold text-slate-900 mb-1">
            Identitas Lembaga Digitalmeera
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Nama lembaga dan logo ini akan ditampilkan pada kop laporan, kartu peserta, login, dan header.
          </p>

          <form onSubmit={handleSaveLembaga} className="space-y-4">
            {/* Logo Upload */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Logo Digitalmeera
              </label>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden p-1 shadow-2xs">
                  {logo ? (
                    <img src={logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="font-bold text-sm text-slate-400">DM</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <label className={`cursor-pointer rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                    {logoUploading ? 'Memproses Logo...' : 'Ganti Logo'}
                    <input type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" disabled={logoUploading} />
                  </label>
                  {logo && !logoUploading && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Hapus Logo
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Logo yang diunggah akan otomatis langsung diperbarui pada menu dashboard admin, sidebar navigasi, header atas, login, dan kartu peserta.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Nama Lembaga
              </label>
              <input
                type="text"
                value={namaLembaga}
                onChange={(e) => setNamaLembaga(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Alamat Lembaga
              </label>
              <textarea
                rows={2}
                value={alamat}
                onChange={(e) => setAlamat(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Nomor WhatsApp
                </label>
                <input
                  type="text"
                  value={nomorWA}
                  onChange={(e) => setNomorWA(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Website
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Teks Footer Website
              </label>
              <input
                type="text"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={lembagaSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{lembagaSaving ? 'Menyimpan...' : 'Simpan Identitas Lembaga'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB C: JAM PRESENSI & SHIFT */}
      {activeTab === 'shift' && (
        <div className="space-y-4 max-w-3xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pengaturan Jam Batas Presensi & Shift
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Barcode yang discan akan otomatis mencocokkan jadwal shift yang berlaku.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddShift}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Shift</span>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">ID Shift</th>
                  <th className="px-4 py-3">Nama Shift</th>
                  <th className="px-4 py-3">Jam Mulai</th>
                  <th className="px-4 py-3">Jam Selesai</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shifts.map((s) => (
                  <tr key={s.idShift} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-500">{s.idShift}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{s.namaShift}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-sky-700">{s.jamMulai}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-sky-700">{s.jamSelesai}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          s.status === 'Aktif'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditShift(s)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShiftToDelete(s)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB D: TEMPLATE KARTU PESERTA */}
      {activeTab === 'kartu' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs max-w-4xl space-y-6">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Pengaturan & Upload Template Kartu Peserta
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Kustomisasi desain kartu peserta dengan mengunggah gambar latar template kustom (JPG/PNG) atau menggunakan preset tema warna resmi.
            </p>
          </div>

          {/* Mode Pemilihan Desain */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Pilihan Mode Desain Latar Kartu
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                cardConfig.useCustomTemplate 
                  ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20' 
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="cardTemplateMode"
                  checked={!!cardConfig.useCustomTemplate}
                  onChange={() => setCardConfig({ ...cardConfig, useCustomTemplate: true })}
                  className="mt-0.5 text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Gunakan Gambar Template Kustom (JPG / PNG)
                  </span>
                  <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                    Unggah gambar desain template buatan Anda sendiri (misal dari Canva/Photoshop).
                  </span>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                !cardConfig.useCustomTemplate 
                  ? 'border-sky-500 bg-sky-50/60 ring-2 ring-sky-500/20' 
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}>
                <input
                  type="radio"
                  name="cardTemplateMode"
                  checked={!cardConfig.useCustomTemplate}
                  onChange={() => setCardConfig({ ...cardConfig, useCustomTemplate: false })}
                  className="mt-0.5 text-sky-600 focus:ring-sky-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    Gunakan Preset Tema Warna Sistem
                  </span>
                  <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                    Gunakan desain modern bawaan dengan palet warna resmi Digitalmeera.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Area Upload Gambar Template Kartu (JPG / PNG) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Unggah File Template Kartu (JPG / PNG)
              </label>
              <span className="text-[11px] text-slate-500">
                Rasio ID-1: 85,60 mm &times; 53,98 mm (~1012 &times; 638 px)
              </span>
            </div>

            {cardConfig.templateImage ? (
              <div className="space-y-3">
                <div className="relative aspect-[85.6/53.98] w-full max-w-md overflow-hidden rounded-2xl border-2 border-sky-400 shadow-md">
                  <img
                    src={cardConfig.templateImage}
                    alt="Template Kartu"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2 right-2 rounded-md bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                    Template Aktif
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50">
                    <Upload className="h-3.5 w-3.5 text-sky-600" />
                    <span>{templateUploading ? 'Memproses...' : 'Ganti Gambar Template'}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleUploadTemplate}
                      disabled={templateUploading}
                      className="hidden"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setCardConfig({
                        ...cardConfig,
                        templateImage: '',
                        useCustomTemplate: false,
                      });
                      showToast('Template gambar kustom dihapus.');
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Hapus Template Kustom</span>
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center hover:bg-slate-50 cursor-pointer transition-colors max-w-xl">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 mb-3 shadow-2xs">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800">
                  {templateUploading ? 'Memproses gambar...' : 'Klik untuk Unggah Gambar Template Kartu'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 max-w-sm">
                  Format gambar yang didukung: <strong>JPG, JPEG, PNG</strong> (Maksimal 8 MB). Disarankan rasio standar kartu 1.586 : 1.
                </span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleUploadTemplate}
                  disabled={templateUploading}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Pengaturan Tambahan: Preset Tema (Bila tidak menggunakan template kustom) */}
          <div className="border-t border-slate-200 pt-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Pilihan Tema Warna (Mode Standar / Fallback)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Pilih Palet Tema Kartu
                </label>
                <select
                  value={cardConfig.theme}
                  onChange={(e) => setCardConfig({ ...cardConfig, theme: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-sky-500"
                >
                  <option value="modern-navy">Modern Navy (Slate & Sky Blue)</option>
                  <option value="emerald-green">Emerald Green (Deep Green & Mint)</option>
                  <option value="royal-indigo">Royal Indigo (Deep Indigo & Violet)</option>
                  <option value="crimson-amber">Crimson Amber (Deep Red & Warm Gold)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">
                  Format Kode Siswa Pada Kartu
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <QrCodeIcon className="h-4 w-4 text-sky-600 shrink-0" />
                  <span className="font-medium">QR Code 1:1 di sisi kanan kartu (Aktif)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pratinjau Langsung (Live Preview) Kartu Siswa */}
          <div className="border-t border-slate-200 pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>Pratinjau Hasil Kartu (Live Preview)</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Ukuran 85,60 mm &times; 53,98 mm &bull; QR Code 1:1 &bull; Tanpa Harga
              </span>
            </div>

            <div className="max-w-md">
              <div
                className={`relative w-full aspect-[85.6/53.98] overflow-hidden rounded-2xl ${
                  cardConfig.useCustomTemplate && cardConfig.templateImage
                    ? 'bg-slate-900'
                    : cardConfig.theme === 'emerald-green'
                    ? 'bg-gradient-to-br from-emerald-950 to-teal-900'
                    : cardConfig.theme === 'royal-indigo'
                    ? 'bg-gradient-to-br from-indigo-950 to-slate-900'
                    : cardConfig.theme === 'crimson-amber'
                    ? 'bg-gradient-to-br from-red-950 to-slate-900'
                    : 'bg-gradient-to-br from-slate-900 to-slate-800'
                } p-3 text-white shadow-lg flex flex-col justify-between`}
              >
                {/* Background Kustom jika aktif */}
                {cardConfig.useCustomTemplate && cardConfig.templateImage && (
                  <img
                    src={cardConfig.templateImage}
                    alt="Background Template"
                    className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                  />
                )}

                <div className="relative z-10 flex flex-col justify-between h-full">
                  {/* Header */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-1 pt-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/20 text-[9px] font-black">
                        DM
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold tracking-wider leading-none text-white truncate">
                          {profil.namaLembaga || 'DIGITALMEERA'}
                        </h4>
                        <span className="text-[7px] text-slate-300 uppercase tracking-widest font-medium">
                          Kartu Peserta Resmi
                        </span>
                      </div>
                    </div>
                    <span className="text-[8px] font-bold uppercase tracking-wider bg-white/15 px-1.5 py-0.5 rounded text-white/90">
                      OFFICIAL
                    </span>
                  </div>

                  {/* Body Layout: Foto (Kiri) | Info (Tengah) | QR Code (Kanan 1:1) */}
                  <div className="flex items-center gap-2.5 my-auto">
                    <div className="h-16 w-13 shrink-0 overflow-hidden rounded-lg border-2 border-white/40 bg-slate-800 shadow-sm flex items-center justify-center">
                      <span className="font-bold text-xs text-white/70">FOTO</span>
                    </div>

                    <div className="flex-1 min-w-0 pr-1">
                      <p className="text-[11px] font-bold text-white truncate leading-snug drop-shadow-sm">
                        Ahmad Fauzi Pratama
                      </p>
                      <div className="mt-0.5 inline-block">
                        <span className="font-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded bg-sky-500 text-white shadow-xs">
                          DM0001
                        </span>
                      </div>
                      <div className="mt-1">
                        <p className="text-[6.5px] text-slate-300 uppercase tracking-wider font-semibold">
                          Program Kelas:
                        </p>
                        <p className="text-[8.5px] text-white font-medium truncate">
                          Microsoft Office Pemula
                        </p>
                      </div>
                      <div className="mt-1">
                        <span className="inline-block text-[7px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                          Aktif
                        </span>
                      </div>
                    </div>

                    {/* QR Code di Sebelah Kanan (Rasio 1:1) */}
                    <div className="shrink-0 flex flex-col items-center justify-center rounded-xl bg-white p-1 shadow-md border border-slate-200">
                      {sampleQrUrl ? (
                        <img
                          src={sampleQrUrl}
                          alt="Contoh QR Code"
                          className="h-12 w-12 aspect-square object-contain"
                        />
                      ) : (
                        <div className="h-12 w-12 aspect-square bg-slate-100 flex items-center justify-center">
                          <QrCodeIcon className="h-6 w-6 text-slate-400" />
                        </div>
                      )}
                      <span className="text-[6.5px] font-mono font-bold text-slate-700 tracking-wider mt-0.5">
                        SCAN QR
                      </span>
                    </div>
                  </div>

                  <div className="text-center pt-0.5">
                    <span className="text-[6px] text-slate-300 tracking-wider">
                      {profil.website || 'digitalmeera.com'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Simpan */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveCardConfig}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-sky-700 transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Simpan Pengaturan Kartu</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB E: BACKEND SPREADSHEET URL */}
      {activeTab === 'backend' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs max-w-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Koneksi Google Spreadsheet & Apps Script
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pusat data real-time menggunakan Google Spreadsheet & Google Drive.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                gasApi.isConnectedToGas()
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}>
                <span className={`h-2 w-2 rounded-full ${gasApi.isConnectedToGas() ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {gasApi.isConnectedToGas() ? 'Terhubung ke Google Cloud' : 'Mode Offline'}
              </span>
            </div>
          </div>

          {/* Form Input URL GAS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Google Apps Script Web App URL
              </label>
              <button
                type="button"
                onClick={handleResetGasUrl}
                className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline"
              >
                Reset ke URL Resmi
              </button>
            </div>
            <input
              type="text"
              value={gasUrl}
              onChange={(e) => setGasUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfyc.../exec"
              className="w-full rounded-xl border border-slate-300 font-mono text-xs px-3.5 py-2.5 text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Tombol Aksi URL */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleSaveGasUrl}
              disabled={testingGas}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-2xs hover:bg-sky-700 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Simpan URL</span>
            </button>

            <button
              type="button"
              onClick={handleTestGas}
              disabled={testingGas}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {testingGas ? <RefreshCw className="h-4 w-4 animate-spin text-sky-600" /> : <Link2 className="h-4 w-4 text-slate-500" />}
              <span>{testingGas ? 'Menguji Koneksi...' : 'Uji Koneksi'}</span>
            </button>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncingNow}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs sm:text-sm font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${syncingNow ? 'animate-spin text-emerald-600' : 'text-emerald-700'}`} />
              <span>{syncingNow ? 'Menyinkronkan...' : 'Segarkan Data Sekarang'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenCodeModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Code2 className="h-4 w-4 text-indigo-600" />
              <span>Lihat Source Code.gs</span>
            </button>
          </div>

          {/* Cloud Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Google Spreadsheet Database
              </span>
              <p className="font-mono text-xs text-slate-800 font-semibold break-all">
                18d2NpE-Y4cm19LjNWo7UPZdMPdcv8CQImRcF3jupTa8
              </p>
              <a
                href="https://docs.google.com/spreadsheets/d/18d2NpE-Y4cm19LjNWo7UPZdMPdcv8CQImRcF3jupTa8/edit"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:underline pt-1"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Buka Google Spreadsheet</span>
              </a>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Google Drive Storage Folder
              </span>
              <p className="font-mono text-xs text-slate-800 font-semibold break-all">
                1mQwSeNLsVGFaNzTKqbUyV4-NeViBuObo
              </p>
              <a
                href="https://drive.google.com/drive/folders/1mQwSeNLsVGFaNzTKqbUyV4-NeViBuObo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-600 hover:underline pt-1"
              >
                <ExternalLink className="h-3 w-3" />
                <span>Buka Google Drive</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Shift Form Modal */}
      <Modal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title={editingShift ? 'Edit Shift Presensi' : 'Tambah Shift Baru'}
        maxWidth="sm"
      >
        <form onSubmit={handleSaveShift} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Nama Shift
            </label>
            <input
              type="text"
              value={shiftNama}
              onChange={(e) => setShiftNama(e.target.value)}
              placeholder="Contoh: Shift Pagi"
              required
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Jam Mulai
              </label>
              <input
                type="text"
                value={shiftJamMulai}
                onChange={(e) => setShiftJamMulai(e.target.value)}
                placeholder="08:00"
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
                Jam Selesai
              </label>
              <input
                type="text"
                value={shiftJamSelesai}
                onChange={(e) => setShiftJamSelesai(e.target.value)}
                placeholder="10:00"
                required
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              Status Shift
            </label>
            <select
              value={shiftStatus}
              onChange={(e) => setShiftStatus(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShiftModalOpen(false)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              Simpan Shift
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Shift Dialog */}
      <ConfirmDialog
        isOpen={!!shiftToDelete}
        onClose={() => setShiftToDelete(null)}
        onConfirm={handleDeleteShift}
        title="Hapus Shift"
        message={`Apakah Anda yakin ingin menghapus ${shiftToDelete?.namaShift}?`}
        confirmText="Hapus Shift"
        cancelText="Batal"
      />
    </div>
  );
};
