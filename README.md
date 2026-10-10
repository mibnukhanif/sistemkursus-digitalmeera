# DIGITALMEERA – Sistem Pendaftaran & Absensi Kursus

Aplikasi web profesional untuk mengelola peserta kursus dan les privat Digitalmeera, mencakup:
* Pendaftaran peserta & nomor murid otomatis (**DM0001**, **DM0002**, dst.)
* Kartu peserta resmi otomatis berukuran standar ID-1 (**85,60 mm × 53,98 mm**)
* Barcode unik statis siswa (format **Code 128**)
* Sistem absensi kamera kontinu (scanner webcam & kamera smartphone tanpa henti)
* Pencegahan absensi ganda (double-attendance prevention) & verifikasi batas jam shift
* Monitoring absensi & histori kehadiran
* Laporan & export data ke format **Excel (.xlsx)** dan **PDF resmi**
* Pengaturan sistem (akun admin, profil lembaga, logo, shift presensi, template kartu, dan footer)
* Database utama: **Google Spreadsheet**
* Backend Web App: **Google Apps Script** (`google-apps-script/Code.gs`)
* File storage foto peserta & logo: **Google Drive**

---

## 1. Arsitektur Sistem

```text
Vercel / React SPA (Vite + Tailwind CSS)
            │
            ▼ (JSON Action API via fetch)
Google Apps Script Web App (Code.gs)
            │
    ┌───────┴────────────────────────┐
    ▼                                ▼
Google Spreadsheet Database    Google Drive File Storage
(Peserta, Absensi, Admin,      (DIGITALMEERA/Peserta,
 Pengaturan, Shift, Profil)     DIGITALMEERA/Logo)
```

---

## 2. Struktur Google Spreadsheet

Fungsi `setupDatabase()` di dalam `Code.gs` otomatis membuat seluruh sheet dan header berikut secara idempotent (tanpa duplikasi):

1. **`Peserta`**:
   `ID`, `Nomor Murid`, `Foto`, `Nama Peserta`, `Tempat Lahir`, `Tanggal Lahir`, `Jenis Kelamin`, `Agama`, `Status`, `Nomor WA/Telpon`, `Orang Tua/Wali`, `Alamat`, `Program Kelas`, `Harga Program`, `Barcode ID`, `Barcode Value`, `Tanggal Pendaftaran`, `Status Peserta`, `Created At`, `Updated At`

2. **`Absensi`**:
   `ID Absensi`, `Nomor Murid`, `Nama Peserta`, `Program Kelas`, `Tanggal`, `Waktu`, `Hari`, `Status Presensi`, `Shift`, `Keterangan`, `Admin`, `Created At`, `Updated At`

3. **`Admin`**:
   `ID`, `Username`, `Password Hash` (SHA-256), `Nama Admin`, `Status`, `Created At`, `Updated At`

4. **`Pengaturan`**:
   `Key`, `Value`, `Description`, `Updated At`

5. **`Shift`**:
   `ID Shift`, `Nama Shift`, `Jam Mulai`, `Jam Selesai`, `Status`, `Created At`, `Updated At`

6. **`Profil`**:
   `Nama Lembaga`, `Logo`, `Alamat`, `Nomor WA`, `Email`, `Website`, `Footer`, `Updated At`

---

## 3. Akun Administrator Default

* **Username:** `admin`
* **Password:** `Digitalmeera@2026`

> Setelah login pertama kali, administrator dapat mengubah username dan password sewaktu-waktu di menu **Pengaturan Sistem → Profil Admin**. Password disimpan dalam bentuk hash SHA-256.

---

## 4. Panduan Setup Google Spreadsheet & Apps Script (5 Menit)

1. Buka [Google Sheets](https://sheets.new) baru yang kosong dan beri nama file (misal: `Database Digitalmeera`).
2. Klik menu **Extensions (Ekstensi) → Apps Script**.
3. Hapus seluruh isi editor dan tempelkan (paste) seluruh isi file `google-apps-script/Code.gs` yang ada di proyek ini.
4. Simpan proyek dengan menekan tombol **Save** (`Ctrl+S` / `Cmd+S`).
5. Pada dropdown fungsi di sebelah tombol **Run (Jalankan)**, pilih fungsi **`setupDatabase`**, lalu klik **Run (Jalankan)**.
6. Berikan izin otorisasi saat diminta (*Review Permissions → Akun Anda → Advanced → Go to Untitled project (unsafe) → Allow*).
7. Tunggu hingga eksekusi selesai. Seluruh sheet, header, akun admin, shift, profil, dan folder Google Drive akan otomatis dibuat!
8. Klik tombol **Deploy (Terapkan) → New deployment (Penerapan baru)** di kanan atas.
9. Pilih jenis deployment: **Web app**.
10. Konfigurasikan:
    * **Description:** `Digitalmeera API v1`
    * **Execute as:** `Me (email Anda)`
    * **Who has access:** `Anyone` (Siapa saja — agar aplikasi web dapat berkomunikasi dengan API)
11. Klik tombol **Deploy**.
12. Salin **Web App URL** yang berakhiran `/exec` (contoh: `https://script.google.com/macros/s/AKfyc.../exec`).
13. Masukkan URL tersebut ke aplikasi web:
    * Melalui environment variable `VITE_API_URL`
    * Atau langsung masukkan melalui menu **Pengaturan Sistem → Koneksi Google Spreadsheet** di aplikasi.

---

## 5. Instalasi & Menjalankan Frontend Secara Lokal

### Prasyarat
* Node.js versi 18 atau lebih baru
* npm atau yarn

### Langkah Instalasi
```bash
# 1. Clone repository
git clone https://github.com/username/digitalmeera.git
cd digitalmeera

# 2. Install dependensi
npm install

# 3. Konfigurasi environment (opsional)
cp .env.example .env
# Edit file .env dan isi VITE_API_URL jika sudah memiliki URL Web App Google Apps Script

# 4. Jalankan development server
npm run dev
```

Buka browser di alamat `http://localhost:3000`.

---

## 6. Panduan Deploy ke Vercel

1. Unggah proyek ini ke repository GitHub pribadi Anda.
2. Buka dashboard [Vercel](https://vercel.com) dan klik **Add New... → Project**.
3. Impor repository GitHub tersebut.
4. Pada bagian **Environment Variables**, tambahkan:
   * **Key:** `VITE_API_URL`
   * **Value:** URL Web App Google Apps Script Anda (misal: `https://script.google.com/macros/s/AKfycb.../exec`)
5. Klik tombol **Deploy**.
6. Aplikasi DIGITALMEERA Anda siap digunakan di URL Vercel produksi!

---

## 7. Fitur Utama Sistem

* **Pendaftaran Peserta**:
  * Upload foto siswa dengan pratinjau instan & validasi file
  * Penomoran otomatis format `DM0001`, `DM0002` menggunakan `LockService` di backend Apps Script untuk mencegah nomor ganda/race condition
  * Paket Office Pemula (Rp300.000) dan Paket Office + Desain (Rp400.000) dengan kalkulasi biaya otomatis
* **Barcode Permanen & Kartu Peserta**:
  * Barcode Code 128 permanen berbasis Nomor Murid
  * Kartu rasio standar ID-1 (85,60 mm × 53,98 mm)
  * Download satu kartu atau semua kartu dalam format JPG (300 DPI) & PDF
* **Sistem Absensi Scanner**:
  * Menggunakan kamera webcam / smartphone secara terus-menerus (*continuous scan*)
  * Audio beep feedback menggunakan Web Audio API
  * Pencegahan absensi ganda pada tanggal & shift yang sama
  * Validasi batas jam shift dengan opsi override manual
  * Dukungan scanner barcode hardware eksternal (USB barcode scanner)
* **Monitoring & Koreksi**:
  * Histori kehadiran lengkap dengan filter tanggal, shift, dan status
  * Admin dapat mengedit waktu/status atau menghapus rekaman absensi
* **Laporan & Export**:
  * Filter periode (Hari ini, Kemarin, Minggu ini, Bulan ini, Custom)
  * Export rekap kehadiran ke file Excel (.xlsx) dan PDF resmi
  * Export biodata peserta lengkap ke Excel
* **Zero Dummy Data**:
  * Tidak menggunakan data rekaan; dashboard dan tabel langsung merefleksikan database riil di Google Spreadsheet.
