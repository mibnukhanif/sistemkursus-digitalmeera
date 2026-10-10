import React, { useState, useEffect } from 'react';
import { Peserta, ProfilLembaga, CardTemplateConfig } from '../types';
import { gasApi } from '../services/gasApi';
import { downloadSingleCardPdf, downloadAllCardsPdf, downloadCardAsJpg } from '../lib/exportPdf';
import { generateQrCodeDataUrl } from '../lib/qrcode';
import { getOptimizedPhotoUrl, getFallbackPhotoUrl, getProxyPhotoUrl } from '../lib/photo';
import { Modal } from '../components/Modal';
import { StudentPhoto } from '../components/StudentPhoto';
import { 
  CreditCard, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Search, 
  CheckCircle2,
  QrCode as QrCodeIcon,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ZoomIn,
  Eye
} from 'lucide-react';

interface KartuPesertaPageProps {
  profil: ProfilLembaga;
}

// Subcomponent for each student card with 1:1 QR Code, fast photo preview & custom template support
const StudentCardItem: React.FC<{
  peserta: Peserta;
  profil: ProfilLembaga;
  cardConfig: CardTemplateConfig;
  onPreviewPhoto?: (photo: { url: string; name: string; noMurid: string }) => void;
}> = ({ peserta, profil, cardConfig, onPreviewPhoto }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    generateQrCodeDataUrl(peserta.nomorMurid, { size: 240, margin: 1 }).then((url) => {
      if (active) setQrCodeUrl(url);
    });
    return () => {
      active = false;
    };
  }, [peserta.nomorMurid]);

  const hasCustomTemplate = !!(cardConfig.useCustomTemplate && cardConfig.templateImage);

  // Theme colors
  let themeBg = 'from-slate-900 to-slate-800';
  let themeBadge = 'bg-sky-500 text-white';

  if (cardConfig.theme === 'emerald-green') {
    themeBg = 'from-emerald-950 to-teal-900';
    themeBadge = 'bg-emerald-500 text-white';
  } else if (cardConfig.theme === 'royal-indigo') {
    themeBg = 'from-indigo-950 to-slate-900';
    themeBadge = 'bg-indigo-500 text-white';
  } else if (cardConfig.theme === 'crimson-amber') {
    themeBg = 'from-red-950 to-slate-900';
    themeBadge = 'bg-amber-500 text-slate-900';
  }

  const optimizedPhoto = getOptimizedPhotoUrl(peserta.foto, 300);

  return (
    <div className="flex flex-col rounded-3xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Visual Card (Aspect Ratio ID-1 standard ~85.60 x 53.98 = 1.586) */}
      <div
        className={`relative w-full aspect-[85.6/53.98] overflow-hidden rounded-2xl ${
          hasCustomTemplate ? 'bg-slate-900' : `bg-gradient-to-br ${themeBg}`
        } p-3 text-white shadow-md flex flex-col justify-between`}
      >
        {/* Background Custom Template if enabled */}
        {hasCustomTemplate && cardConfig.templateImage && (
          <img
            src={cardConfig.templateImage}
            alt="Card Template Background"
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />
        )}

        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col justify-between h-full">
          {/* Header of Card */}
          {!hasCustomTemplate ? (
            <div className="flex items-center justify-between border-b border-white/10 pb-1.5 pt-0.5">
              <div className="flex items-center gap-1.5 min-w-0">
                {profil.logo ? (
                  <img src={profil.logo} alt="Logo" className="h-5 w-5 rounded object-contain bg-white/20 p-0.5" />
                ) : (
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/20 text-[9px] font-black">
                    DM
                  </div>
                )}
                <div className="min-w-0">
                  <h4 className="text-[11px] font-bold tracking-wider leading-none text-white truncate">
                    {profil.namaLembaga || 'DIGITALMEERA'}
                  </h4>
                  <span className="text-[7px] text-sky-200 uppercase tracking-widest font-medium">
                    Kartu Peserta Resmi
                  </span>
                </div>
              </div>
              <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider bg-white/15 px-1.5 py-0.5 rounded text-white/90">
                OFFICIAL
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-1.5">
                {profil.logo && (
                  <img src={profil.logo} alt="Logo" className="h-5 w-5 rounded object-contain bg-white/40 p-0.5" />
                )}
                <span className="text-[9px] font-bold text-white drop-shadow-md">
                  {profil.namaLembaga || 'DIGITALMEERA'}
                </span>
              </div>
              <span className="text-[7.5px] font-extrabold uppercase tracking-wider bg-black/40 backdrop-blur-xs px-1.5 py-0.5 rounded text-white border border-white/20">
                OFFICIAL
              </span>
            </div>
          )}

          {/* Middle Body Layout: Foto (Kiri) | Info (Tengah) | QR Code 1:1 (Kanan) */}
          <div className="flex items-center gap-2.5 my-auto">
            {/* Foto Siswa (Kiri) dengan preview object-cover & klik untuk perbesar */}
            <div 
              onClick={() => {
                if (peserta.foto && onPreviewPhoto) {
                  onPreviewPhoto({
                    url: getOptimizedPhotoUrl(peserta.foto, 800),
                    name: peserta.namaPeserta,
                    noMurid: peserta.nomorMurid,
                  });
                }
              }}
              className={`group relative h-16 w-13 sm:h-18 sm:w-14 shrink-0 overflow-hidden rounded-lg border-2 border-white/50 bg-slate-800 shadow-sm flex items-center justify-center transition-all ${
                peserta.foto ? 'cursor-pointer hover:border-sky-300 hover:ring-2 hover:ring-sky-400/50' : ''
              }`}
              title={peserta.foto ? `Klik untuk memperbesar foto ${peserta.namaPeserta}` : 'Belum ada foto'}
            >
              <StudentPhoto
                photoUrl={peserta.foto}
                alt={peserta.namaPeserta}
                size={300}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                containerClassName="relative h-full w-full overflow-hidden flex items-center justify-center bg-slate-800"
                initials={peserta.namaPeserta.slice(0, 2).toUpperCase()}
              />
              {/* Hover icon zoom if photo exists */}
              {peserta.foto && (
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <ZoomIn className="h-4 w-4 text-white drop-shadow-md" />
                </div>
              )}
            </div>

            {/* Student Info (Tengah) - Tanpa Harga Program */}
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-[11px] sm:text-[12px] font-bold text-white truncate leading-snug drop-shadow-sm">
                {peserta.namaPeserta}
              </p>

              <div className="mt-0.5 inline-block">
                <span className={`font-mono text-[8.5px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs ${themeBadge}`}>
                  {peserta.nomorMurid}
                </span>
              </div>

              <div className="mt-1">
                <p className="text-[6.5px] text-slate-300 uppercase tracking-wider font-semibold">
                  Program Kelas:
                </p>
                <p className="text-[8.5px] sm:text-[9px] text-white font-medium truncate drop-shadow-xs">
                  {peserta.programKelas.replace(/\s*—\s*Rp[\d.,]+/g, '')}
                </p>
              </div>

              <div className="mt-1">
                <span className="inline-block text-[7px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded">
                  {peserta.statusPeserta || 'Aktif'}
                </span>
              </div>
            </div>

            {/* QR Code di Sebelah Kanan (Rasio 1:1) */}
            <div className="shrink-0 flex flex-col items-center justify-center rounded-xl bg-white p-1 sm:p-1.5 shadow-md border border-slate-200">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt={`QR Code ${peserta.nomorMurid}`}
                  className="h-12 w-12 sm:h-14 sm:w-14 aspect-square object-contain"
                />
              ) : (
                <div className="h-12 w-12 sm:h-14 sm:w-14 aspect-square bg-slate-100 flex items-center justify-center">
                  <QrCodeIcon className="h-6 w-6 text-slate-400 animate-pulse" />
                </div>
              )}
              <span className="text-[6.5px] font-mono font-bold text-slate-700 tracking-wider mt-0.5">
                SCAN QR
              </span>
            </div>
          </div>

          {/* Footer Website www.digitalmeera.tech */}
          <div className="text-center pt-0.5">
            <span className="text-[6.5px] font-semibold text-slate-200 tracking-wider drop-shadow-xs">
              www.digitalmeera.tech
            </span>
          </div>
        </div>
      </div>

      {/* Card Controls */}
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500">
          <span className="font-mono font-bold text-slate-800">{peserta.nomorMurid}</span>
          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
            QR Code 1:1
          </span>
        </div>

        <div className="flex items-center gap-2">
          {peserta.foto && onPreviewPhoto && (
            <button
              type="button"
              onClick={() => onPreviewPhoto({
                url: getOptimizedPhotoUrl(peserta.foto, 800),
                name: peserta.namaPeserta,
                noMurid: peserta.nomorMurid,
              })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
              title="Lihat Preview Foto"
            >
              <Eye className="h-3.5 w-3.5 text-sky-600" />
              <span className="hidden sm:inline">Foto</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => downloadCardAsJpg(peserta, profil, cardConfig)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Download format Gambar JPG (300 DPI)"
          >
            <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
            <span>JPG</span>
          </button>

          <button
            type="button"
            onClick={() => downloadSingleCardPdf(peserta, profil, cardConfig)}
            className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-sky-700 transition-colors"
            title="Download format PDF (85.60 x 53.98 mm)"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export const KartuPesertaPage: React.FC<KartuPesertaPageProps> = ({ profil }) => {
  const [pesertaList, setPesertaList] = useState<Peserta[]>(() => {
    return gasApi.getLocalPeserta().filter((p) => p.statusPeserta !== 'Deleted');
  });
  const [cardConfig, setCardConfig] = useState<CardTemplateConfig>({
    theme: 'modern-navy',
    accentColor: '#0ea5e9',
    barcodeSize: 'large',
    showPhoto: true,
    showProgram: true,
    showWatermark: true,
    useCustomTemplate: false,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [downloadingAll, setDownloadingAll] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');

  // Lightbox Preview Foto
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string; noMurid: string } | null>(null);

  const fetchCards = async (isManual = false) => {
    setIsSyncing(true);
    try {
      if (isManual) {
        const res = await gasApi.syncAll(true);
        if (res.success && res.data?.peserta) {
          setPesertaList(res.data.peserta.filter(p => p.statusPeserta !== 'Deleted'));
          showToast(`Data kartu berhasil disegarkan! (${res.data.peserta.length} peserta di Spreadsheet).`);
        } else if (res.message) {
          showToast(res.message);
        }
      } else {
        const [pRes, cfg] = await Promise.all([
          gasApi.getPeserta(),
          gasApi.getCardConfig(),
        ]);
        if (pRes.success && pRes.data) {
          setPesertaList(pRes.data.filter((p) => p.statusPeserta !== 'Deleted'));
        }
        setCardConfig(cfg);
      }
    } catch (err: any) {
      console.error('Error loading cards:', err);
      if (isManual) {
        showToast(`Gagal menyegarkan: ${err.message || 'Koneksi error'}`);
      }
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCards();

    const handleSync = () => {
      fetchCards();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('peserta_updated', handleSync);
    window.addEventListener('digitalmeera_synced', handleSync);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('digitalmeera_sync');
        channel.onmessage = () => {
          fetchCards();
        };
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('peserta_updated', handleSync);
      window.removeEventListener('digitalmeera_synced', handleSync);
      if (channel) {
        channel.close();
      }
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleDownloadAll = async () => {
    if (pesertaList.length === 0) return;
    setDownloadingAll(true);
    try {
      await downloadAllCardsPdf(pesertaList, profil, cardConfig);
      showToast('Semua kartu berhasil di-download dalam satu file PDF.');
    } catch (err) {
      console.error('Download all error', err);
    } finally {
      setDownloadingAll(false);
    }
  };

  const filtered = pesertaList.filter(
    (p) =>
      p.namaPeserta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.nomorMurid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header and Download All */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Kartu Peserta Siswa
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Spreadsheet Terhubung
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Kartu standar ID-1 (85,60 mm &times; 53,98 mm) dengan QR Code 1:1, preview foto resolusi tinggi, dan export instan.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchCards(true)}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-sky-800 shadow-2xs hover:bg-sky-100 transition-all disabled:opacity-50"
            title="Segarkan data kartu dari Google Spreadsheet"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-sky-600' : 'text-sky-700'}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={downloadingAll || pesertaList.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>{downloadingAll ? 'Menyiapkan PDF...' : 'Download Semua Kartu (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Template Status Notice */}
      {cardConfig.useCustomTemplate && cardConfig.templateImage && (
        <div className="flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-medium text-sky-800">
          <Sparkles className="h-4 w-4 text-sky-600 shrink-0" />
          <span>Kartu menggunakan template desain kustom latar belakang yang diunggah dari Pengaturan.</span>
        </div>
      )}

      {/* Search Input */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari kartu berdasarkan nama murid atau nomor murid (DM000X)..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Card Grid */}
      {(loading || (isSyncing && pesertaList.length === 0)) ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto mb-2" />
          Memuat kartu peserta dari Google Spreadsheet...
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((peserta) => (
            <StudentCardItem
              key={peserta.id}
              peserta={peserta}
              profil={profil}
              cardConfig={cardConfig}
              onPreviewPhoto={setPreviewPhoto}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <CreditCard className="mx-auto h-10 w-10 text-slate-300" />
          <h4 className="mt-3 text-sm font-bold text-slate-800">
            {searchTerm ? 'Tidak ada kartu yang cocok' : 'Belum Ada Kartu Peserta'}
          </h4>
          <p className="mt-1 text-xs text-slate-500">
            {searchTerm
              ? 'Silakan coba kata kunci pencarian yang lain'
              : 'Daftarkan peserta di menu Data Peserta untuk membuat kartu otomatis.'}
          </p>
        </div>
      )}

      {/* Lightbox / Preview Foto Modal */}
      {previewPhoto && (
        <Modal
          isOpen={!!previewPhoto}
          onClose={() => setPreviewPhoto(null)}
          title={`Foto Peserta: ${previewPhoto.name}`}
          subtitle={`Nomor Murid: ${previewPhoto.noMurid}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-center">
            <div className="mx-auto max-h-[70vh] max-w-xs overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 shadow-md flex items-center justify-center p-1">
              <StudentPhoto
                photoUrl={previewPhoto.url}
                alt={previewPhoto.name}
                size={800}
                className="h-full w-full object-contain max-h-[60vh]"
                containerClassName="relative h-full w-full min-h-[220px] overflow-hidden flex items-center justify-center bg-slate-900"
                initials={previewPhoto.name.slice(0, 2).toUpperCase()}
              />
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <a
                href={previewPhoto.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <ExternalLink className="h-3.5 w-3.5 text-sky-600" />
                <span>Buka Gambar Asli</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

