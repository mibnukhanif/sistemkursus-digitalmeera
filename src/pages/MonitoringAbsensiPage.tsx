import React, { useState, useEffect } from 'react';
import { Absensi, Shift } from '../types';
import { gasApi } from '../services/gasApi';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Calendar, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  User, 
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';

export const MonitoringAbsensiPage: React.FC = () => {
  const [absensiList, setAbsensiList] = useState<Absensi[]>(() => gasApi.getLocalAbsensi());
  const [shifts, setShifts] = useState<Shift[]>(() => gasApi.getLocalShifts());
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<Absensi | null>(null);
  const [editWaktu, setEditWaktu] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'Hadir' | 'Izin' | 'Sakit' | 'Terlambat'>('Hadir');
  const [editShift, setEditShift] = useState<string>('');
  const [editKeterangan, setEditKeterangan] = useState<string>('');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Delete State
  const [itemToDelete, setItemToDelete] = useState<Absensi | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  // Toast
  const [toastMessage, setToastMessage] = useState<string>('');

  const fetchAbsensi = async () => {
    setIsSyncing(true);
    try {
      const [aRes, sRes] = await Promise.all([
        gasApi.getAbsensi(),
        gasApi.getShifts(),
      ]);
      if (aRes.success && aRes.data) {
        setAbsensiList(aRes.data);
      }
      if (sRes.success && sRes.data) {
        setShifts(sRes.data);
      }
    } catch (err) {
      console.error('Failed to load absensi monitoring', err);
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsensi();

    const handleSync = () => {
      fetchAbsensi();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('digitalmeera_synced', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('digitalmeera_synced', handleSync);
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const handleOpenEdit = (item: Absensi) => {
    setEditingItem(item);
    setEditWaktu(item.waktu);
    setEditStatus(item.statusPresensi as any);
    setEditShift(item.shift);
    setEditKeterangan(item.keterangan || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setSavingEdit(true);
    try {
      const res = await gasApi.updateAbsensi(editingItem.idAbsensi, {
        waktu: editWaktu,
        statusPresensi: editStatus,
        shift: editShift,
        keterangan: editKeterangan,
      });

      if (res.success) {
        showToast('Data absensi berhasil diperbarui.');
        setEditingItem(null);
        fetchAbsensi();
      }
    } catch (err) {
      console.error('Update absensi error', err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleting(true);
    try {
      const res = await gasApi.deleteAbsensi(itemToDelete.idAbsensi);
      if (res.success) {
        showToast('Data absensi berhasil dihapus.');
        setItemToDelete(null);
        fetchAbsensi();
      }
    } catch (err) {
      console.error('Delete absensi error', err);
    } finally {
      setDeleting(false);
    }
  };

  // Filter List
  const filtered = absensiList.filter((item) => {
    const matchesSearch =
      item.namaPeserta.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.nomorMurid.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !filterDate || item.tanggal === filterDate;
    const matchesStatus = filterStatus === 'all' || item.statusPresensi === filterStatus;
    const matchesShift = filterShift === 'all' || item.shift === filterShift;

    return matchesSearch && matchesDate && matchesStatus && matchesShift;
  });

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Monitoring Absensi
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Pantau seluruh rekaman presensi barcode, verifikasi kehadiran, dan edit koreksi waktu.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAbsensi}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-sky-600' : 'text-slate-500'}`} />
          <span>{isSyncing ? 'Menyinkronkan...' : 'Segarkan Data'}</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama peserta / DM000X..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Date Filter */}
          <div className="relative">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Semua Status Kehadiran</option>
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Terlambat">Terlambat</option>
            </select>
          </div>

          {/* Shift Filter */}
          <div>
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs sm:text-sm text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">Semua Shift</option>
              {shifts.map((s) => (
                <option key={s.idShift} value={s.namaShift}>
                  {s.namaShift}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filterDate && (
          <div className="mt-2.5 flex items-center justify-between text-xs text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-100">
            <span>Filter Tanggal: <strong>{filterDate}</strong></span>
            <button
              type="button"
              onClick={() => setFilterDate('')}
              className="font-bold hover:underline"
            >
              Reset Tanggal
            </button>
          </div>
        )}
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        {(loading || (isSyncing && absensiList.length === 0)) ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <RefreshCw className="h-6 w-6 animate-spin text-sky-600 mx-auto mb-2" />
            Memuat data absensi...
          </div>
        ) : filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Tanggal</th>
                  <th className="px-4 py-3.5">Jam</th>
                  <th className="px-4 py-3.5">Nomor Murid</th>
                  <th className="px-4 py-3.5">Nama Peserta</th>
                  <th className="px-4 py-3.5">Program</th>
                  <th className="px-4 py-3.5">Shift</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Admin</th>
                  <th className="px-4 py-3.5">Keterangan</th>
                  <th className="px-4 py-3.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((item) => (
                  <tr key={item.idAbsensi} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono text-slate-600 whitespace-nowrap">
                      {item.tanggal} ({item.hari})
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800 whitespace-nowrap">
                      {item.waktu}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-sky-700 whitespace-nowrap">
                      {item.nomorMurid}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      {item.namaPeserta}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {item.programKelas}
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                        {item.shift}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                          item.statusPresensi === 'Hadir'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.statusPresensi === 'Terlambat'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {item.statusPresensi}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {item.admin || 'Admin'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {item.keterangan || '-'}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600 transition-colors"
                          title="Edit Presensi"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Hapus Presensi"
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
        ) : (
          <div className="p-12 text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
            <h4 className="mt-3 text-sm font-bold text-slate-800">
              {searchTerm || filterDate || filterStatus !== 'all' || filterShift !== 'all'
                ? 'Tidak ada rekaman absensi yang cocok'
                : 'Belum Ada Data Absensi'}
            </h4>
            <p className="mt-1 text-xs text-slate-500">
              {searchTerm || filterDate
                ? 'Coba ganti filter pencarian atau tanggal'
                : 'Pindai barcode siswa di menu Sistem Absensi untuk mencatat kehadiran.'}
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Data Presensi Siswa"
        subtitle={`Siswa: ${editingItem?.namaPeserta} (${editingItem?.nomorMurid})`}
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Waktu Presensi (Jam:Menit)
            </label>
            <input
              type="text"
              value={editWaktu}
              onChange={(e) => setEditWaktu(e.target.value)}
              placeholder="08:15"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Status Kehadiran
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="Hadir">Hadir</option>
              <option value="Izin">Izin</option>
              <option value="Sakit">Sakit</option>
              <option value="Terlambat">Terlambat</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Shift Presensi
            </label>
            <select
              value={editShift}
              onChange={(e) => setEditShift(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              {shifts.map((s) => (
                <option key={s.idShift} value={s.namaShift}>
                  {s.namaShift}
                </option>
              ))}
              <option value="Di Luar Shift">Di Luar Shift</option>
              <option value="Reguler">Reguler</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Keterangan
            </label>
            <input
              type="text"
              value={editKeterangan}
              onChange={(e) => setEditKeterangan(e.target.value)}
              placeholder="Catatan tambahan..."
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="rounded-xl bg-sky-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Hapus Rekaman Absensi"
        message={`Apakah Anda yakin ingin menghapus data presensi ${itemToDelete?.namaPeserta} pada tanggal ${itemToDelete?.tanggal} pukul ${itemToDelete?.waktu}?`}
        confirmText="Hapus Presensi"
        cancelText="Batal"
        isLoading={deleting}
      />
    </div>
  );
};
