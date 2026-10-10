import React, { useState, useEffect } from 'react';
import { Absensi, Peserta, ProfilLembaga, Shift } from '../types';
import { gasApi } from '../services/gasApi';
import { exportAbsensiToExcel, exportPesertaToExcel } from '../lib/exportExcel';
import { exportAbsensiToPdf } from '../lib/exportPdf';
import { 
  FileSpreadsheet, 
  FileText, 
  Download, 
  Calendar, 
  Filter, 
  Users, 
  CheckCircle2, 
  Clock,
  Printer
} from 'lucide-react';

interface LaporanExportPageProps {
  profil: ProfilLembaga;
}

export const LaporanExportPage: React.FC<LaporanExportPageProps> = ({ profil }) => {
  const [activeTab, setActiveTab] = useState<'absensi' | 'peserta'>('absensi');
  const [absensiList, setAbsensiList] = useState<Absensi[]>(() => gasApi.getLocalAbsensi());
  const [pesertaList, setPesertaList] = useState<Peserta[]>(() => gasApi.getLocalPeserta().filter((p) => p.statusPeserta !== 'Deleted'));
  const [shifts, setShifts] = useState<Shift[]>(() => gasApi.getLocalShifts());
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Filters Periode
  const [periode, setPeriode] = useState<string>('bulan-ini');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Other Filters
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterShift, setFilterShift] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchData = async () => {
    setIsSyncing(true);
    try {
      const [aRes, pRes, sRes] = await Promise.all([
        gasApi.getAbsensi(),
        gasApi.getPeserta(),
        gasApi.getShifts(),
      ]);
      if (aRes.success && aRes.data) setAbsensiList(aRes.data);
      if (pRes.success && pRes.data) setPesertaList(pRes.data.filter((p) => p.statusPeserta !== 'Deleted'));
      if (sRes.success && sRes.data) setShifts(sRes.data);
    } catch (err) {
      console.error('Fetch report data error', err);
    } finally {
      setIsSyncing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleSync = () => {
      fetchData();
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('digitalmeera_synced', handleSync);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('digitalmeera_synced', handleSync);
    };
  }, []);

  // Compute date range based on period selection
  const getDateRangeForPeriod = (p: string) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    if (p === 'hari-ini') {
      return { start: todayStr, end: todayStr, label: 'Hari Ini' };
    }
    if (p === 'kemarin') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      return { start: yStr, end: yStr, label: 'Kemarin' };
    }
    if (p === 'minggu-ini') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Senin
      const monday = new Date(now.setDate(diff));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return {
        start: monday.toISOString().slice(0, 10),
        end: sunday.toISOString().slice(0, 10),
        label: 'Minggu Ini',
      };
    }
    if (p === 'bulan-ini') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      return { start, end, label: 'Bulan Ini' };
    }
    if (p === 'bulan-lalu') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      return { start, end, label: 'Bulan Lalu' };
    }
    if (p === 'custom') {
      return {
        start: startDate || todayStr,
        end: endDate || todayStr,
        label: `${startDate || todayStr} s/d ${endDate || todayStr}`,
      };
    }

    return { start: '', end: '', label: 'Semua Waktu' };
  };

  const currentRange = getDateRangeForPeriod(periode);

  // Filter Absensi
  const filteredAbsensi = absensiList.filter((item) => {
    if (currentRange.start && item.tanggal < currentRange.start) return false;
    if (currentRange.end && item.tanggal > currentRange.end) return false;
    if (filterProgram !== 'all' && !item.programKelas.includes(filterProgram)) return false;
    if (filterShift !== 'all' && item.shift !== filterShift) return false;
    if (filterStatus !== 'all' && item.statusPresensi !== filterStatus) return false;
    return true;
  });

  // Filter Peserta
  const filteredPeserta = pesertaList.filter((item) => {
    if (filterProgram !== 'all' && !item.programKelas.includes(filterProgram)) return false;
    if (filterStatus !== 'all' && item.statusPeserta !== filterStatus) return false;
    return true;
  });

  // Export handlers
  const handleExportAbsensiExcel = () => {
    exportAbsensiToExcel(filteredAbsensi, `Laporan_Absensi_${currentRange.label.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleExportAbsensiPdf = () => {
    exportAbsensiToPdf(filteredAbsensi, profil, currentRange.label);
  };

  const handleExportPesertaExcel = () => {
    exportPesertaToExcel(filteredPeserta, 'Data_Peserta_Digitalmeera.xlsx');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Laporan & Export Data
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Rekap data kehadiran dan data murid lengkap dalam format spreadsheet Excel (.xlsx) dan PDF resmi.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('absensi')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors ${
            activeTab === 'absensi'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Laporan Kehadiran & Absensi</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('peserta')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs sm:text-sm font-bold transition-colors ${
            activeTab === 'peserta'
              ? 'border-sky-600 text-sky-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Laporan Data Peserta</span>
        </button>
      </div>

      {/* TAB 1: ABSENSI */}
      {activeTab === 'absensi' && (
        <div className="space-y-6">
          {/* Filters Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Filter Parameter Laporan
            </h3>

            {/* Periode Buttons */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                Pilih Periode:
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'hari-ini', label: 'Hari Ini' },
                  { id: 'kemarin', label: 'Kemarin' },
                  { id: 'minggu-ini', label: 'Minggu Ini' },
                  { id: 'bulan-ini', label: 'Bulan Ini' },
                  { id: 'bulan-lalu', label: 'Bulan Lalu' },
                  { id: 'custom', label: 'Rentang Khusus (Custom)' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPeriode(p.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                      periode === p.id
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Picker */}
            {periode === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">Mulai:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-semibold text-slate-500 block mb-1">Sampai:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-700"
                  />
                </div>
              </div>
            )}

            {/* Program, Shift, Status Dropdowns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Program Kelas</label>
                <select
                  value={filterProgram}
                  onChange={(e) => setFilterProgram(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700"
                >
                  <option value="all">Semua Program</option>
                  <option value="Office Pemula">Paket Office Pemula</option>
                  <option value="Office + Desain">Paket Office + Desain</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Shift</label>
                <select
                  value={filterShift}
                  onChange={(e) => setFilterShift(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700"
                >
                  <option value="all">Semua Shift</option>
                  {shifts.map((s) => (
                    <option key={s.idShift} value={s.namaShift}>
                      {s.namaShift}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Status Kehadiran</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-700"
                >
                  <option value="all">Semua Status</option>
                  <option value="Hadir">Hadir</option>
                  <option value="Izin">Izin</option>
                  <option value="Sakit">Sakit</option>
                  <option value="Terlambat">Terlambat</option>
                </select>
              </div>
            </div>

            {/* Export Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-600">
                Total rekaman ditemukan: <strong>{filteredAbsensi.length}</strong> data
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportAbsensiExcel}
                  disabled={filteredAbsensi.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Export Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAbsensiPdf}
                  disabled={filteredAbsensi.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700 transition-colors disabled:opacity-50"
                >
                  <FileText className="h-4 w-4" />
                  <span>Export PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Pratinjau Hasil Laporan
              </h4>
              <span className="text-xs text-slate-500 font-medium">Periode: {currentRange.label}</span>
            </div>

            {filteredAbsensi.length > 0 ? (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">No</th>
                      <th className="px-4 py-2.5">Tanggal</th>
                      <th className="px-4 py-2.5">Jam</th>
                      <th className="px-4 py-2.5">Nomor Murid</th>
                      <th className="px-4 py-2.5">Nama Peserta</th>
                      <th className="px-4 py-2.5">Program</th>
                      <th className="px-4 py-2.5">Shift</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAbsensi.map((item, idx) => (
                      <tr key={item.idAbsensi || idx} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2 text-slate-600">{item.tanggal}</td>
                        <td className="px-4 py-2 font-mono text-slate-800">{item.waktu}</td>
                        <td className="px-4 py-2 font-mono font-bold text-sky-700">{item.nomorMurid}</td>
                        <td className="px-4 py-2 font-semibold text-slate-900">{item.namaPeserta}</td>
                        <td className="px-4 py-2 text-slate-600">{item.programKelas}</td>
                        <td className="px-4 py-2 text-slate-600">{item.shift}</td>
                        <td className="px-4 py-2">
                          <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {item.statusPresensi}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Tidak ada data presensi pada parameter filter yang dipilih.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DATA PESERTA */}
      {activeTab === 'peserta' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Laporan Master Data Peserta
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Export seluruh biodata siswa, nomor murid DM, orang tua/wali, dan kontak WhatsApp.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportPesertaExcel}
                  disabled={filteredPeserta.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                  <span>Export Excel Peserta</span>
                </button>
              </div>
            </div>

            {/* Filter Program */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
              <div className="w-60">
                <select
                  value={filterProgram}
                  onChange={(e) => setFilterProgram(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-700"
                >
                  <option value="all">Semua Program Kelas</option>
                  <option value="Office Pemula">Paket Office Pemula</option>
                  <option value="Office + Desain">Paket Office + Desain</option>
                </select>
              </div>

              <span className="text-xs text-slate-500">
                Total: <strong>{filteredPeserta.length}</strong> peserta terdaftar
              </span>
            </div>
          </div>

          {/* Table Preview */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {filteredPeserta.length > 0 ? (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">No</th>
                      <th className="px-4 py-2.5">Nomor Murid</th>
                      <th className="px-4 py-2.5">Nama Peserta</th>
                      <th className="px-4 py-2.5">Program</th>
                      <th className="px-4 py-2.5">No. WA</th>
                      <th className="px-4 py-2.5">Orang Tua/Wali</th>
                      <th className="px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPeserta.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2 font-mono font-bold text-sky-700">{item.nomorMurid}</td>
                        <td className="px-4 py-2 font-semibold text-slate-900">{item.namaPeserta}</td>
                        <td className="px-4 py-2 text-slate-600">{item.programKelas}</td>
                        <td className="px-4 py-2 font-mono text-slate-600">{item.nomorWA}</td>
                        <td className="px-4 py-2 text-slate-600">{item.orangTua}</td>
                        <td className="px-4 py-2">
                          <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            {item.statusPeserta}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Belum ada data peserta.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
