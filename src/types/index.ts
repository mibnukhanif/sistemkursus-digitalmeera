export interface Peserta {
  id: string;
  nomorMurid: string; // DM0001
  foto: string;
  namaPeserta: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: 'Laki-laki' | 'Perempuan';
  agama: string;
  status: 'Siswa SD/MI' | 'Siswa SMP/MTs' | 'Siswa SMA/MA' | 'Umum' | string;
  nomorWA: string;
  orangTua: string;
  alamat: string;
  programKelas: string;
  hargaProgram: string;
  barcodeId: string;
  barcodeValue: string;
  tanggalPendaftaran: string;
  statusPeserta: 'Aktif' | 'Nonaktif' | 'Alumni' | 'Deleted';
  createdAt: string;
  updatedAt: string;
}

export interface Absensi {
  idAbsensi: string;
  nomorMurid: string;
  namaPeserta: string;
  programKelas: string;
  tanggal: string; // YYYY-MM-DD
  waktu: string; // HH:mm
  hari: string; // Senin, etc.
  statusPresensi: 'Hadir' | 'Izin' | 'Sakit' | 'Terlambat';
  shift: string;
  keterangan: string;
  admin: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser {
  id: string;
  username: string;
  nama: string;
}

export interface Shift {
  idShift: string;
  namaShift: string;
  jamMulai: string; // HH:mm
  jamSelesai: string; // HH:mm
  status: 'Aktif' | 'Nonaktif';
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfilLembaga {
  namaLembaga: string;
  logo: string;
  alamat: string;
  nomorWA: string;
  email: string;
  website: string;
  footer: string;
  updatedAt?: string;
}

export interface DashboardStats {
  totalPeserta: number;
  paketOfficePemula: number;
  paketOfficeDesain: number;
  absensiHariIni: number;
  tidakHadirHariIni: number;
  totalAbsensi: number;
  recentAbsensi: Absensi[];
}

export interface CardTemplateConfig {
  theme: 'modern-navy' | 'emerald-green' | 'royal-indigo' | 'crimson-amber';
  accentColor: string;
  barcodeSize: 'normal' | 'large';
  showPhoto: boolean;
  showProgram: boolean;
  showWatermark: boolean;
  templateImage?: string; // Data URL / URL background template kustom kartu
  useCustomTemplate?: boolean; // Gunakan template background gambar kustom
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  isDuplicate?: boolean;
  canOverride?: boolean;
}
