import React, { useState, useEffect } from 'react';
import { Modal } from '../components/Modal';
import { Peserta } from '../types';
import { gasApi } from '../services/gasApi';
import { getOptimizedPhotoUrl, getFallbackPhotoUrl, getProxyPhotoUrl } from '../lib/photo';
import { Upload, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface FormPesertaModalProps {
  isOpen: boolean;
  onClose: () => void;
  pesertaToEdit?: Peserta | null;
  onSuccess: (msg: string) => void;
}

export const FormPesertaModal: React.FC<FormPesertaModalProps> = ({
  isOpen,
  onClose,
  pesertaToEdit,
  onSuccess,
}) => {
  const isEditMode = !!pesertaToEdit;

  // Form State
  const [foto, setFoto] = useState<string>('');
  const [nomorMurid, setNomorMurid] = useState<string>('');
  const [namaPeserta, setNamaPeserta] = useState<string>('');
  const [tempatLahir, setTempatLahir] = useState<string>('');
  const [tanggalLahir, setTanggalLahir] = useState<string>('');
  const [jenisKelamin, setJenisKelamin] = useState<'Laki-laki' | 'Perempuan'>('Laki-laki');
  const [agama, setAgama] = useState<string>('Islam');
  const [customAgama, setCustomAgama] = useState<string>('');
  const [status, setStatus] = useState<string>('Siswa SD/MI');
  const [nomorWA, setNomorWA] = useState<string>('');
  const [orangTua, setOrangTua] = useState<string>('');
  const [alamat, setAlamat] = useState<string>('');
  const [programKelas, setProgramKelas] = useState<string>('Paket Office Pemula');
  const [hargaProgram, setHargaProgram] = useState<string>('Rp300.000');
  const [statusPeserta, setStatusPeserta] = useState<'Aktif' | 'Nonaktif' | 'Alumni'>('Aktif');

  // UI state
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Update Harga otomatis saat program berubah
  useEffect(() => {
    if (programKelas.includes('Desain')) {
      setHargaProgram('Rp400.000');
    } else {
      setHargaProgram('Rp300.000');
    }
  }, [programKelas]);

  // Load existing data jika Edit Mode, atau generate nomor preview jika Tambah
  useEffect(() => {
    if (!isOpen) return;

    if (pesertaToEdit) {
      setFoto(pesertaToEdit.foto || '');
      setNomorMurid(pesertaToEdit.nomorMurid);
      setNamaPeserta(pesertaToEdit.namaPeserta);
      setTempatLahir(pesertaToEdit.tempatLahir);
      setTanggalLahir(pesertaToEdit.tanggalLahir);
      setJenisKelamin(pesertaToEdit.jenisKelamin);

      const standardAgama = ['Islam', 'Kristen', 'Hindu', 'Budha', 'Konghucu'];
      if (standardAgama.includes(pesertaToEdit.agama)) {
        setAgama(pesertaToEdit.agama);
        setCustomAgama('');
      } else {
        setAgama('Lainnya');
        setCustomAgama(pesertaToEdit.agama);
      }

      setStatus(pesertaToEdit.status);
      setNomorWA(pesertaToEdit.nomorWA);
      setOrangTua(pesertaToEdit.orangTua);
      setAlamat(pesertaToEdit.alamat);
      setProgramKelas(pesertaToEdit.programKelas);
      setHargaProgram(pesertaToEdit.hargaProgram);
      setStatusPeserta((pesertaToEdit.statusPeserta as any) || 'Aktif');
    } else {
      // Tambah baru: reset form
      setFoto('');
      setNomorMurid('[Dibuat Otomatis: DM000X]');
      setNamaPeserta('');
      setTempatLahir('');
      setTanggalLahir('');
      setJenisKelamin('Laki-laki');
      setAgama('Islam');
      setCustomAgama('');
      setStatus('Siswa SD/MI');
      setNomorWA('');
      setOrangTua('');
      setAlamat('');
      setProgramKelas('Paket Office Pemula');
      setHargaProgram('Rp300.000');
      setStatusPeserta('Aktif');
    }
    setErrorMsg('');
  }, [isOpen, pesertaToEdit]);

  // Handle Photo Upload dengan Kompresi Otomatis (Ultra Cepat & Ringan)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi tipe
    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      setErrorMsg('Format foto harus berupa JPG, JPEG, atau PNG.');
      return;
    }

    // Validasi ukuran (maksimal 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto maksimal 5 MB.');
      return;
    }

    setErrorMsg('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setFoto(compressedDataUrl);
        } else {
          setFoto(evt.target?.result as string);
        }
      };
      img.src = evt.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Validasi dan Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Validasi Wajib
    if (!namaPeserta.trim()) {
      setErrorMsg('Nama Peserta wajib diisi.');
      return;
    }
    if (!tempatLahir.trim()) {
      setErrorMsg('Tempat Lahir wajib diisi.');
      return;
    }
    if (!tanggalLahir) {
      setErrorMsg('Tanggal Lahir wajib diisi.');
      return;
    }
    if (!jenisKelamin) {
      setErrorMsg('Jenis Kelamin wajib dipilih.');
      return;
    }

    const finalAgama = agama === 'Lainnya' ? customAgama.trim() : agama;
    if (!finalAgama) {
      setErrorMsg('Agama wajib diisi.');
      return;
    }

    if (!status) {
      setErrorMsg('Status peserta wajib dipilih.');
      return;
    }

    // Validasi nomor WA
    const cleanWA = nomorWA.replace(/[^0-9]/g, '');
    if (cleanWA.length < 9) {
      setErrorMsg('Nomor WA/Telpon minimal 9 digit angka.');
      return;
    }

    if (!orangTua.trim()) {
      setErrorMsg('Nama Orang Tua / Wali wajib diisi.');
      return;
    }
    if (!alamat.trim()) {
      setErrorMsg('Alamat tempat tinggal wajib diisi.');
      return;
    }
    if (!programKelas) {
      setErrorMsg('Program Kelas wajib dipilih.');
      return;
    }

    setLoading(true);

    try {
      if (isEditMode && pesertaToEdit) {
        // UPDATE
        const res = await gasApi.updatePeserta({
          ...pesertaToEdit,
          foto,
          namaPeserta: namaPeserta.trim(),
          tempatLahir: tempatLahir.trim(),
          tanggalLahir,
          jenisKelamin,
          agama: finalAgama,
          status,
          nomorWA: nomorWA.trim(),
          orangTua: orangTua.trim(),
          alamat: alamat.trim(),
          programKelas,
          hargaProgram,
          statusPeserta,
        });

        if (res.success) {
          onSuccess('Data peserta berhasil diperbarui.');
          onClose();
        } else {
          setErrorMsg(res.message || 'Gagal memperbarui data peserta.');
        }
      } else {
        // CREATE
        const res = await gasApi.createPeserta({
          foto,
          namaPeserta: namaPeserta.trim(),
          tempatLahir: tempatLahir.trim(),
          tanggalLahir,
          jenisKelamin,
          agama: finalAgama,
          status,
          nomorWA: nomorWA.trim(),
          orangTua: orangTua.trim(),
          alamat: alamat.trim(),
          programKelas,
          hargaProgram,
          tanggalPendaftaran: new Date().toISOString().slice(0, 10),
          statusPeserta: 'Aktif',
        });

        if (res.success) {
          onSuccess(res.message || 'Data peserta berhasil ditambahkan ke Google Spreadsheet!');
          onClose();
        } else {
          setErrorMsg(res.message || 'Gagal menambahkan peserta ke Google Spreadsheet.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Data Peserta Kursus' : 'Pendaftaran Peserta Baru'}
      subtitle={isEditMode ? `Nomor Murid: ${nomorMurid}` : 'Lengkapi seluruh data pendaftaran peserta Digitalmeera'}
      maxWidth="3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMsg && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800 animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Section 1: Foto Siswa & Nomor Murid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
          {/* Foto Preview & Upload */}
          <div className="sm:col-span-1 flex flex-col items-center">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Foto Siswa
            </span>
            <div className="relative h-32 w-28 overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white shadow-xs flex items-center justify-center">
              {foto ? (
                <>
                  <img
                    src={getOptimizedPhotoUrl(foto, 400)}
                    alt="Preview Foto"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget;
                      const fallback = getFallbackPhotoUrl(foto, 400);
                      const proxy = getProxyPhotoUrl(foto);
                      if (fallback && target.src !== fallback) {
                        target.src = fallback;
                      } else if (proxy && target.src !== proxy) {
                        target.src = proxy;
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setFoto('')}
                    className="absolute top-1 right-1 rounded-full bg-slate-900/70 p-1 text-white hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <div className="text-center p-2 text-slate-400">
                  <Upload className="mx-auto h-6 w-6 mb-1 text-slate-400" />
                  <span className="text-[10px] leading-tight block">Upload Foto JPG/PNG</span>
                </div>
              )}
            </div>

            <label className="mt-2.5 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50">
              Pilih Foto
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
            <span className="text-[10px] text-slate-600 mt-1">Maks. 2MB (Opsional)</span>
          </div>

          {/* Nomor Murid (Otomatis & Read-Only) */}
          <div className="sm:col-span-2 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nomor Murid
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="text"
                  value={nomorMurid}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 font-mono text-sm font-bold text-slate-700 cursor-not-allowed shadow-2xs"
                />
              </div>
              <p className="text-[11px] text-slate-600 mt-1">
                {isEditMode
                  ? 'Nomor murid permanen dan tidak dapat diubah.'
                  : 'Nomor murid dibuat otomatis oleh backend (contoh: DM0001, DM0002).'}
              </p>
            </div>

            {/* Nama Peserta */}
            <div>
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Nama Lengkap Peserta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={namaPeserta}
                onChange={(e) => setNamaPeserta(e.target.value)}
                placeholder="Contoh: Muhammad Farhan"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Informasi Kelahiran & Identitas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tempat Lahir <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={tempatLahir}
              onChange={(e) => setTempatLahir(e.target.value)}
              placeholder="Contoh: Jakarta"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tanggal Lahir <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={tanggalLahir}
              onChange={(e) => setTanggalLahir(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Jenis Kelamin <span className="text-red-500">*</span>
            </label>
            <select
              value={jenisKelamin}
              onChange={(e) => setJenisKelamin(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="Laki-laki">Laki-laki</option>
              <option value="Perempuan">Perempuan</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Agama <span className="text-red-500">*</span>
            </label>
            <select
              value={agama}
              onChange={(e) => setAgama(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="Islam">Islam</option>
              <option value="Kristen">Kristen</option>
              <option value="Hindu">Hindu</option>
              <option value="Budha">Budha</option>
              <option value="Konghucu">Konghucu</option>
              <option value="Lainnya">Lainnya</option>
            </select>
            {agama === 'Lainnya' && (
              <input
                type="text"
                value={customAgama}
                onChange={(e) => setCustomAgama(e.target.value)}
                placeholder="Tuliskan agama..."
                required
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Status Peserta / Pendidikan <span className="text-red-500">*</span>
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="Siswa SD/MI">Siswa SD/MI</option>
              <option value="Siswa SMP/MTs">Siswa SMP/MTs</option>
              <option value="Siswa SMA/MA">Siswa SMA/MA</option>
              <option value="Umum">Umum</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nomor WhatsApp / Telpon <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={nomorWA}
              onChange={(e) => setNomorWA(e.target.value)}
              placeholder="Contoh: 081234567890"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Section 3: Orang Tua & Alamat */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nama Orang Tua / Wali <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={orangTua}
              onChange={(e) => setOrangTua(e.target.value)}
              placeholder="Nama ayah/ibu/wali"
              required
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Status Keanggotaan
            </label>
            <select
              value={statusPeserta}
              onChange={(e) => setStatusPeserta(e.target.value as any)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="Aktif">Aktif</option>
              <option value="Nonaktif">Nonaktif</option>
              <option value="Alumni">Alumni</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Alamat Lengkap <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={2}
              value={alamat}
              onChange={(e) => setAlamat(e.target.value)}
              placeholder="Alamat rumah lengkap..."
              required
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Section 4: Program Kelas & Biaya Otomatis */}
        <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                Pilih Program Kelas <span className="text-red-500">*</span>
              </label>
              <select
                value={programKelas}
                onChange={(e) => setProgramKelas(e.target.value)}
                className="mt-1 w-full rounded-xl border border-sky-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-2xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
              >
                <option value="Paket Office Pemula">Paket Office Pemula</option>
                <option value="Paket Office + Desain">Paket Office + Desain</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                Biaya Program (Otomatis)
              </label>
              <input
                type="text"
                value={hargaProgram}
                readOnly
                className="mt-1 w-full rounded-xl border border-sky-300 bg-sky-100/70 px-3.5 py-2 text-sm font-bold text-sky-900 cursor-not-allowed shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <span>Menyimpan ke Spreadsheet...</span>
            ) : (
              <span>{isEditMode ? 'Simpan Perubahan' : 'Daftarkan Peserta'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
