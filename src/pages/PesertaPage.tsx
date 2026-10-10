import React, { useState, useEffect } from 'react';
import { Peserta, ProfilLembaga, CardTemplateConfig } from '../types';
import { gasApi } from '../services/gasApi';
import { FormPesertaModal } from './FormPesertaModal';
import { DetailPesertaModal } from './DetailPesertaModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { downloadSingleCardPdf, downloadCardAsJpg } from '../lib/exportPdf';
import { getOptimizedPhotoUrl, getFallbackPhotoUrl, getProxyPhotoUrl } from '../lib/photo';
import { StudentPhoto } from '../components/StudentPhoto';
import { 
  UserPlus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit3, 
  Trash2, 
  CreditCard, 
  Download, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

interface PesertaPageProps {
  profil: ProfilLembaga;
}

export const PesertaPage: React.FC<PesertaPageProps> = ({ profil }) => {
  const [pesertaList, setPesertaList] = useState<Peserta[]>(() => {
    return gasApi.getLocalPeserta().filter(p => p.statusPeserta !== 'Deleted');
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  // Modals
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedPesertaForEdit, setSelectedPesertaForEdit] = useState<Peserta | null>(null);
  const [selectedPesertaForDetail, setSelectedPesertaForDetail] = useState<Peserta | null>(null);

  // Confirm Delete
  const [pesertaToDelete, setPesertaToDelete] = useState<Peserta | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string>('');
  const [cardConfig, setCardConfig] = useState<CardTemplateConfig | undefined>();

  // Lightbox Preview Foto
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string; noMurid: string } | null>(null);

  const fetchPeserta = async (isManual = false) => {
    setIsSyncing(true);
    try {
      if (isManual) {
        const syncRes = await gasApi.syncAll(true);
        if (syncRes.success && syncRes.data?.peserta) {
          setPesertaList(syncRes.data.peserta.filter(p => p.statusPeserta !== 'Deleted'));
          showToast(syncRes.message || `Data berhasil disegarkan! ${syncRes.data.peserta.length} peserta di Spreadsheet.`);
        } else if (syncRes.message) {
          showToast(syncRes.message);
        }
      } else {
        const [res, cfg] = await Promise.all([
          gasApi.getPeserta(),
          gasApi.getCardConfig(),
        ]);
        if (res.success && res.data) {
          setPesertaList(res.data.filter(p => p.statusPeserta !== 'Deleted'));
        }
        setCardConfig(cfg);
      }
    } catch (err: any) {
      console.error('Failed to load peserta', err);
      if (isManual) {
        showToast(`Gagal menyegarkan data: ${err.message || 'Koneksi error'}`);
      }
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPeserta();

    const handleSync = () => {
      fetchPeserta();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('peserta_updated', handleSync);
    window.addEventListener('digitalmeera_synced', handleSync);

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel('digitalmeera_sync');
        channel.onmessage = (msg) => {
          if (msg.data?.type === 'PESERTA_ADDED' || msg.data?.type === 'PESERTA_UPDATED' || msg.data?.type === 'SYNC') {
            fetchPeserta();
          }
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

  const handleOpenCreate = () => {
    setSelectedPesertaForEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (p: Peserta) => {
    setSelectedPesertaForEdit(p);
    setIsFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pesertaToDelete) return;
    setDeleting(true);
    try {
      const res = await gasApi.deletePeserta(pesertaToDelete.id, pesertaToDelete.nomorMurid);
      if (res.success) {
        showToast('Peserta berhasil dihapus (soft delete).');
        setPesertaToDelete(null);
        fetchPeserta();
      }
    } catch (err) {
      console.error('Delete error', err);
    } finally {
      setDeleting(false);
    }
  };

  // Filtered List
  const filteredList = pesertaList.filter((p) => {
    const sTerm = searchTerm.toLowerCase().trim();
    const namaStr = (p.namaPeserta || '').toString().toLowerCase();
    const noMuridStr = (p.nomorMurid || '').toString().toLowerCase();
    const waStr = (p.nomorWA || '').toString();
    const progStr = (p.programKelas || '').toString();
    const statStr = (p.statusPeserta || '').toString();

    // Search
    const matchesSearch =
      !sTerm ||
      namaStr.includes(sTerm) ||
      noMuridStr.includes(sTerm) ||
      waStr.includes(sTerm);

    // Program
    const matchesProgram =
      filterProgram === 'all' || progStr.includes(filterProgram);

    // Status
    const matchesStatus =
      filterStatus === 'all' || statStr === filterStatus;

    return matchesSearch && matchesProgram && matchesStatus;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredList.length / itemsPerPage) || 1;
  const paginatedList = filteredList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs sm:text-sm font-semibold text-white shadow-xl animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Data Peserta Kursus
            </h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Spreadsheet Terhubung
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Google Spreadsheet ID: <span className="font-mono text-slate-700 font-semibold">{gasApi.getSpreadsheetId()}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <a
            href={`https://docs.google.com/spreadsheets/d/${gasApi.getSpreadsheetId()}/edit`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all"
            title="Buka Google Spreadsheet langsung di tab baru"
          >
            <ExternalLink className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Buka Spreadsheet</span>
          </a>

          <button
            type="button"
            onClick={() => fetchPeserta(true)}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-sky-800 shadow-2xs hover:bg-sky-100 transition-all disabled:opacity-50"
            title="Segarkan data dari spreadsheet"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-sky-600' : 'text-sky-700'}`} />
            <span>{isSyncing ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
          </button>

          <a
            href="/pendaftaran.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-sky-700 shadow-2xs hover:bg-sky-100 transition-all"
            title="Buka formulir pendaftaran mandiri siswa publik"
          >
            <ExternalLink className="h-4 w-4 text-sky-600" />
            <span>Formulir Mandiri</span>
          </a>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            <span>Pendaftaran Peserta Baru</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-1 lg:col-span-2 relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Cari nama peserta, nomor murid, atau nomor WA..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Program Filter */}
          <div>
            <select
              value={filterProgram}
              onChange={(e) => {
                setFilterProgram(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Semua Program Kelas</option>
              <option value="Office Pemula">Paket Office Pemula</option>
              <option value="Office + Desain">Paket Office + Desain</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Semua Status</option>
              <option value="Aktif">Status: Aktif</option>
              <option value="Nonaktif">Status: Nonaktif</option>
              <option value="Alumni">Status: Alumni</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {(loading || (isSyncing && pesertaList.length === 0)) ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto mb-2" />
            Memuat data peserta dari Google Spreadsheet...
          </div>
        ) : filteredList.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">Foto</th>
                    <th className="px-4 py-3.5">Nomor Murid</th>
                    <th className="px-4 py-3.5">Nama Peserta</th>
                    <th className="px-4 py-3.5">Program</th>
                    <th className="px-4 py-3.5">Status Siswa</th>
                    <th className="px-4 py-3.5">No. WA</th>
                    <th className="px-4 py-3.5">Orang Tua/Wali</th>
                    <th className="px-4 py-3.5">Tgl Daftar</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedList.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Foto */}
                      <td className="px-4 py-3">
                        <div
                          onClick={() => {
                            if (p.foto) {
                              setPreviewPhoto({
                                url: getOptimizedPhotoUrl(p.foto, 800),
                                name: p.namaPeserta,
                                noMurid: p.nomorMurid,
                              });
                            }
                          }}
                          className={`h-11 w-9.5 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center relative shadow-2xs transition-all ${
                            p.foto
                              ? 'cursor-pointer hover:border-sky-500 hover:ring-2 hover:ring-sky-200 hover:shadow-xs'
                              : ''
                          }`}
                          title={p.foto ? `Klik untuk memperbesar foto ${p.namaPeserta}` : 'Belum ada foto'}
                        >
                          <StudentPhoto
                            photoUrl={p.foto}
                            alt={p.namaPeserta}
                            size={200}
                            className="h-full w-full object-cover transition-transform duration-200 hover:scale-110"
                            containerClassName="relative h-full w-full overflow-hidden flex items-center justify-center bg-slate-100"
                            initials={p.namaPeserta.slice(0, 2).toUpperCase()}
                          />
                        </div>
                      </td>

                      {/* Nomor Murid */}
                      <td className="px-4 py-3 font-mono font-bold text-sky-700 whitespace-nowrap">
                        {p.nomorMurid}
                      </td>

                      {/* Nama */}
                      <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                        {p.namaPeserta}
                      </td>

                      {/* Program */}
                      <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                        <span className="font-medium">{p.programKelas}</span>
                      </td>

                      {/* Status Jenjang */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {p.status}
                      </td>

                      {/* No WA */}
                      <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                        {p.nomorWA}
                      </td>

                      {/* Orang Tua */}
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {p.orangTua}
                      </td>

                      {/* Tgl Daftar */}
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {p.tanggalPendaftaran}
                      </td>

                      {/* Status Peserta */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                            p.statusPeserta === 'Aktif'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {p.statusPeserta}
                        </span>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Lihat Detail */}
                          <button
                            type="button"
                            onClick={() => setSelectedPesertaForDetail(p)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600 transition-colors"
                            title="Lihat Detail Siswa"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Unduh Kartu PDF */}
                          <button
                            type="button"
                            onClick={() => downloadSingleCardPdf(p, profil, cardConfig)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                            title="Unduh Kartu PDF (85.6x53.98 mm)"
                          >
                            <FileText className="h-4 w-4 text-sky-600" />
                          </button>

                          {/* Unduh Kartu JPG */}
                          <button
                            type="button"
                            onClick={() => downloadCardAsJpg(p, profil, cardConfig)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                            title="Unduh Kartu Gambar JPG"
                          >
                            <ImageIcon className="h-4 w-4 text-emerald-600" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            title="Edit Data Peserta"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => setPesertaToDelete(p)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Hapus Peserta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-5 py-3 gap-2">
              <span className="text-xs text-slate-500">
                Menampilkan {(currentPage - 1) * itemsPerPage + 1} -{' '}
                {Math.min(currentPage * itemsPerPage, filteredList.length)} dari{' '}
                {filteredList.length} peserta
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span className="px-2 text-xs font-semibold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-slate-300" />
            <h4 className="mt-3 text-sm font-bold text-slate-800">
              {searchTerm || filterProgram !== 'all' || filterStatus !== 'all'
                ? 'Tidak ada peserta yang cocok dengan filter'
                : 'Belum Ada Data Peserta'}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              {searchTerm || filterProgram !== 'all' || filterStatus !== 'all'
                ? 'Coba ganti kata kunci pencarian atau reset filter'
                : 'Database peserta kosong. Silakan daftarkan peserta baru sekarang.'}
            </p>
            {!(searchTerm || filterProgram !== 'all' || filterStatus !== 'all') && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700"
              >
                <UserPlus className="h-4 w-4" />
                <span>Daftarkan Siswa Pertama</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Form Modal (Create / Edit) */}
      <FormPesertaModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        pesertaToEdit={selectedPesertaForEdit}
        onSuccess={(msg) => {
          showToast(msg);
          fetchPeserta();
        }}
      />

      {/* Detail Modal */}
      <DetailPesertaModal
        isOpen={!!selectedPesertaForDetail}
        onClose={() => setSelectedPesertaForDetail(null)}
        peserta={selectedPesertaForDetail}
        profil={profil}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!pesertaToDelete}
        onClose={() => setPesertaToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Konfirmasi Hapus Peserta"
        message={`Apakah Anda yakin ingin menghapus peserta ${pesertaToDelete?.namaPeserta} (${pesertaToDelete?.nomorMurid})? Nomor murid ini akan tetap diarsipkan agar urutan penomoran DM tetap aman.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        isLoading={deleting}
      />

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
