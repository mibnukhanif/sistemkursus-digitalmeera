import React, { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import { Peserta, ProfilLembaga, CardTemplateConfig } from '../types';
import { downloadSingleCardPdf, downloadCardAsJpg } from '../lib/exportPdf';
import { FileText, Image as ImageIcon, QrCode as QrCodeIcon, ExternalLink, ZoomIn } from 'lucide-react';
import { generateQrCodeDataUrl } from '../lib/qrcode';
import { getOptimizedPhotoUrl, getFallbackPhotoUrl, getProxyPhotoUrl } from '../lib/photo';
import { StudentPhoto } from '../components/StudentPhoto';
import { gasApi } from '../services/gasApi';

interface DetailPesertaModalProps {
  isOpen: boolean;
  onClose: () => void;
  peserta: Peserta | null;
  profil: ProfilLembaga;
}

export const DetailPesertaModal: React.FC<DetailPesertaModalProps> = ({
  isOpen,
  onClose,
  peserta,
  profil,
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [cardConfig, setCardConfig] = useState<CardTemplateConfig | undefined>();
  const [showFullPhoto, setShowFullPhoto] = useState<boolean>(false);

  useEffect(() => {
    if (peserta) {
      generateQrCodeDataUrl(peserta.nomorMurid, { size: 240, margin: 1 }).then((url) => {
        setQrCodeUrl(url);
      });
      gasApi.getCardConfig().then((cfg) => setCardConfig(cfg));
    }
  }, [peserta]);

  if (!peserta) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Detail Profil Peserta"
        subtitle={`Nomor Murid: ${peserta.nomorMurid}`}
        maxWidth="2xl"
      >
        <div className="space-y-6">
          {/* Top Header Card */}
          <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
            {/* Foto Siswa */}
            <div 
              onClick={() => {
                if (peserta.foto) setShowFullPhoto(true);
              }}
              className={`group relative h-28 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xs flex items-center justify-center ${
                peserta.foto ? 'cursor-pointer hover:ring-2 hover:ring-sky-400' : ''
              }`}
              title={peserta.foto ? 'Klik untuk melihat foto ukuran penuh' : ''}
            >
              <StudentPhoto
                photoUrl={peserta.foto}
                alt={peserta.namaPeserta}
                size={400}
                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                containerClassName="relative h-full w-full overflow-hidden flex items-center justify-center bg-slate-100"
                initials={peserta.namaPeserta.slice(0, 2).toUpperCase()}
              />
              {peserta.foto && (
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <ZoomIn className="h-5 w-5 text-white drop-shadow-md" />
                </div>
              )}
            </div>

            {/* Core Info */}
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <span className="font-mono text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-md">
                  {peserta.nomorMurid}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  peserta.statusPeserta === 'Aktif'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {peserta.statusPeserta}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">{peserta.namaPeserta}</h3>
              <p className="text-xs font-semibold text-slate-600">{peserta.programKelas.replace(/\s*—\s*Rp[\d.,]+/g, '')}</p>
              <p className="text-xs text-slate-500">{peserta.status} &bull; {peserta.jenisKelamin}</p>
            </div>

            {/* QR Code 1:1 Preview */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-2xs shrink-0">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code Siswa" className="h-16 w-16 aspect-square object-contain" />
              ) : (
                <div className="h-16 w-16 aspect-square bg-slate-50 flex items-center justify-center">
                  <QrCodeIcon className="h-8 w-8 text-slate-400" />
                </div>
              )}
              <span className="text-[9px] font-mono font-bold text-slate-600 mt-0.5">QR Code 1:1</span>
            </div>
          </div>

        {/* Detailed Fields Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Tempat, Tanggal Lahir</span>
            <p className="font-medium text-slate-800">{peserta.tempatLahir}, {peserta.tanggalLahir}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Agama</span>
            <p className="font-medium text-slate-800">{peserta.agama}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Nomor WA / Telpon</span>
            <p className="font-medium text-slate-800 font-mono">{peserta.nomorWA}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Orang Tua / Wali</span>
            <p className="font-medium text-slate-800">{peserta.orangTua}</p>
          </div>

          <div className="sm:col-span-2 rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Alamat Tempat Tinggal</span>
            <p className="font-medium text-slate-800">{peserta.alamat}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Biaya Program (Administrasi)</span>
            <p className="font-bold text-sky-700">{peserta.hargaProgram}</p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-3.5 space-y-1">
            <span className="text-slate-600 uppercase tracking-wider font-semibold">Tanggal Pendaftaran</span>
            <p className="font-medium text-slate-800">{peserta.tanggalPendaftaran}</p>
          </div>
        </div>

        {/* Card Export Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div>
            <p className="text-xs font-bold text-slate-900">Cetak Kartu Peserta Resmi</p>
            <p className="text-[11px] text-slate-600">Kartu dengan QR Code 1:1 standar ID-1 tanpa harga</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadCardAsJpg(peserta, profil, cardConfig)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100 transition-colors"
            >
              <ImageIcon className="h-3.5 w-3.5 text-sky-600" />
              <span>Unduh JPG</span>
            </button>
            <button
              type="button"
              onClick={() => downloadSingleCardPdf(peserta, profil, cardConfig)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Unduh PDF</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>

    {/* Lightbox / Full Photo Preview Modal */}
    {showFullPhoto && peserta.foto && (
      <Modal
        isOpen={showFullPhoto}
        onClose={() => setShowFullPhoto(false)}
        title={`Foto Peserta: ${peserta.namaPeserta}`}
        subtitle={`Nomor Murid: ${peserta.nomorMurid}`}
        maxWidth="md"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto max-h-[70vh] max-w-xs overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 shadow-md flex items-center justify-center p-1">
            <StudentPhoto
              photoUrl={peserta.foto}
              alt={peserta.namaPeserta}
              size={800}
              className="h-full w-full object-contain max-h-[60vh]"
              containerClassName="relative h-full w-full min-h-[220px] overflow-hidden flex items-center justify-center bg-slate-900"
              initials={peserta.namaPeserta.slice(0, 2).toUpperCase()}
            />
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <a
              href={getOptimizedPhotoUrl(peserta.foto, 800)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ExternalLink className="h-3.5 w-3.5 text-sky-600" />
              <span>Buka Gambar Asli</span>
            </a>
            <button
              type="button"
              onClick={() => setShowFullPhoto(false)}
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>
    )}
  </>
  );
};
