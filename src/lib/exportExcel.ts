import * as XLSX from 'xlsx';
import { Peserta, Absensi } from '../types';

/**
 * Export daftar peserta ke file Excel (.xlsx)
 */
export function exportPesertaToExcel(data: Peserta[], filename = 'Data_Peserta_Digitalmeera.xlsx') {
  const formattedData = data.map((item, index) => ({
    'No': index + 1,
    'Nomor Murid': item.nomorMurid,
    'Nama Peserta': item.namaPeserta,
    'Tempat Lahir': item.tempatLahir,
    'Tanggal Lahir': item.tanggalLahir,
    'Jenis Kelamin': item.jenisKelamin,
    'Agama': item.agama,
    'Status Siswa': item.status,
    'Nomor WA/Telpon': item.nomorWA,
    'Orang Tua/Wali': item.orangTua,
    'Alamat': item.alamat,
    'Program Kelas': item.programKelas,
    'Harga Program': item.hargaProgram,
    'Barcode Value': item.barcodeValue,
    'Tanggal Pendaftaran': item.tanggalPendaftaran,
    'Status Peserta': item.statusPeserta,
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  // Auto-width columns
  const colWidths = [
    { wch: 5 },  // No
    { wch: 14 }, // Nomor Murid
    { wch: 25 }, // Nama Peserta
    { wch: 18 }, // Tempat Lahir
    { wch: 14 }, // Tanggal Lahir
    { wch: 14 }, // Jenis Kelamin
    { wch: 12 }, // Agama
    { wch: 18 }, // Status
    { wch: 18 }, // WA
    { wch: 22 }, // Orang Tua
    { wch: 30 }, // Alamat
    { wch: 32 }, // Program
    { wch: 15 }, // Harga
    { wch: 14 }, // Barcode
    { wch: 16 }, // Tgl Daftar
    { wch: 12 }, // Status
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Peserta');
  XLSX.writeFile(workbook, filename);
}

/**
 * Export data absensi ke file Excel (.xlsx)
 */
export function exportAbsensiToExcel(data: Absensi[], filename = 'Laporan_Absensi_Digitalmeera.xlsx') {
  const formattedData = data.map((item, index) => ({
    'No': index + 1,
    'Tanggal': item.tanggal,
    'Waktu': item.waktu,
    'Hari': item.hari,
    'Nomor Murid': item.nomorMurid,
    'Nama Peserta': item.namaPeserta,
    'Program Kelas': item.programKelas,
    'Shift': item.shift,
    'Status Presensi': item.statusPresensi,
    'Keterangan': item.keterangan || '-',
    'Admin Pencatat': item.admin || 'Admin',
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);

  const colWidths = [
    { wch: 5 },  // No
    { wch: 14 }, // Tanggal
    { wch: 10 }, // Waktu
    { wch: 12 }, // Hari
    { wch: 14 }, // Nomor Murid
    { wch: 25 }, // Nama Peserta
    { wch: 30 }, // Program Kelas
    { wch: 15 }, // Shift
    { wch: 16 }, // Status
    { wch: 20 }, // Keterangan
    { wch: 16 }, // Admin
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Absensi');
  XLSX.writeFile(workbook, filename);
}
