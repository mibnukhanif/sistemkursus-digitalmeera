/**
 * DIGITALMEERA - Sistem Pendaftaran & Absensi Kursus
 * Backend Google Apps Script (Code.gs)
 * 
 * Database: Google Spreadsheet
 * File Storage: Google Drive (Folder: DIGITALMEERA/Peserta & DIGITALMEERA/Logo)
 * 
 * PETUNJUK SETUP AWAL:
 * 1. Buka spreadsheet Google baru yang kosong.
 * 2. Masuk ke menu Extensions -> Apps Script.
 * 3. Hapus semua kode default dan tempelkan (paste) seluruh isi file ini.
 * 4. Simpan proyek (Ctrl+S / Cmd+S).
 * 5. Pilih fungsi 'setupDatabase' dari dropdown fungsi, lalu klik 'Run' / 'Jalankan'.
 * 6. Setujui izin akses (Review Permissions -> Lanjutkan -> Izinkan).
 * 7. Klik tombol 'Deploy' -> 'New deployment' (Penerapan baru).
 * 8. Pilih jenis: 'Web app'.
 * 9. Konfigurasi:
 *    - Description: Digitalmeera API v1
 *    - Execute as: Me (email Anda)
 *    - Who has access: Anyone (Siapa saja - agar frontend Vercel dapat mengakses API)
 * 10. Klik 'Deploy', lalu salin URL Web App (contoh: https://script.google.com/macros/s/XXXX/exec).
 * 11. Masukkan URL tersebut ke konfigurasi frontend (.env atau menu Pengaturan Sistem di web).
 */

// ============================================================================
// KONFIGURASI SPREADSHEET & GOOGLE DRIVE
// ============================================================================
const SPREADSHEET_ID = "18d2NpE-Y4cm19LjNWo7UPZdMPdcv8CQImRcF3jupTa8";
const DRIVE_ROOT_FOLDER_ID = "1mQwSeNLsVGFaNzTKqbUyV4-NeViBuObo";

function getAppSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID.trim());
      if (ss) return ss;
    } catch (e) {
      Logger.log("Peringatan openById: " + e.message);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getAppRootFolder() {
  if (DRIVE_ROOT_FOLDER_ID && DRIVE_ROOT_FOLDER_ID.trim() !== "") {
    try {
      const folder = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID.trim());
      if (folder) return folder;
    } catch (e) {
      Logger.log("Peringatan getFolderById: " + e.message);
    }
  }
  const rootFolders = DriveApp.getFoldersByName(DRIVE_FOLDERS.ROOT);
  if (rootFolders.hasNext()) {
    return rootFolders.next();
  }
  return DriveApp.createFolder(DRIVE_FOLDERS.ROOT);
}

// ============================================================================
// KONFIGURASI NAMA SHEET & FOLDER
// ============================================================================
const SHEET_NAMES = {
  PESERTA: "Peserta",
  ABSENSI: "Absensi",
  ADMIN: "Admin",
  PENGATURAN: "Pengaturan",
  SHIFT: "Shift",
  PROFIL: "Profil"
};

const DRIVE_FOLDERS = {
  ROOT: "DIGITALMEERA",
  PESERTA: "Peserta",
  LOGO: "Logo"
};

// ============================================================================
// FUNGSI UTAMA: SETUP DATABASE OTOMATIS (IDEMPOTENT)
// ============================================================================
/**
 * setupDatabase()
 * Aman dijalankan berkali-kali. Memeriksa dan membuat sheet, header,
 * folder Google Drive, akun admin default (admin / Digitalmeera@2026),
 * serta konfigurasi bawaan jika belum ada.
 */
function setupDatabase() {
  const ss = getAppSpreadsheet();
  Logger.log("=== Memulai Inisialisasi Database DIGITALMEERA ===");

  // 1. Sheet Peserta
  setupSheet(ss, SHEET_NAMES.PESERTA, [
    "ID",
    "Nomor Murid",
    "Foto",
    "Nama Peserta",
    "Tempat Lahir",
    "Tanggal Lahir",
    "Jenis Kelamin",
    "Agama",
    "Status",
    "Nomor WA/Telpon",
    "Orang Tua/Wali",
    "Alamat",
    "Program Kelas",
    "Harga Program",
    "Barcode ID",
    "Barcode Value",
    "Tanggal Pendaftaran",
    "Status Peserta",
    "Created At",
    "Updated At"
  ]);

  // 2. Sheet Absensi
  setupSheet(ss, SHEET_NAMES.ABSENSI, [
    "ID Absensi",
    "Nomor Murid",
    "Nama Peserta",
    "Program Kelas",
    "Tanggal",
    "Waktu",
    "Hari",
    "Status Presensi",
    "Shift",
    "Keterangan",
    "Admin",
    "Created At",
    "Updated At"
  ]);

  // 3. Sheet Admin
  const adminSheet = setupSheet(ss, SHEET_NAMES.ADMIN, [
    "ID",
    "Username",
    "Password Hash",
    "Nama Admin",
    "Status",
    "Created At",
    "Updated At"
  ]);

  // Inisialisasi Akun Admin Awal jika kosong
  if (adminSheet.getLastRow() <= 1) {
    const now = new Date().toISOString();
    const defaultPasswordHash = hashPassword("Digitalmeera@2026");
    adminSheet.appendRow([
      "ADM0001",
      "admin",
      defaultPasswordHash,
      "Administrator Digitalmeera",
      "Aktif",
      now,
      now
    ]);
    Logger.log("Akun admin awal dibuat: Username 'admin', Password 'Digitalmeera@2026'");
  }

  // 4. Sheet Pengaturan
  const pengaturanSheet = setupSheet(ss, SHEET_NAMES.PENGATURAN, [
    "Key",
    "Value",
    "Description",
    "Updated At"
  ]);

  initDefaultPengaturan(pengaturanSheet);

  // 5. Sheet Shift
  const shiftSheet = setupSheet(ss, SHEET_NAMES.SHIFT, [
    "ID Shift",
    "Nama Shift",
    "Jam Mulai",
    "Jam Selesai",
    "Status",
    "Created At",
    "Updated At"
  ]);

  // Inisialisasi Shift Default jika belum ada
  if (shiftSheet.getLastRow() <= 1) {
    const now = new Date().toISOString();
    shiftSheet.appendRow(["SHF01", "Shift Pagi", "08:00", "10:00", "Aktif", now, now]);
    shiftSheet.appendRow(["SHF02", "Shift Siang", "10:00", "12:00", "Aktif", now, now]);
    shiftSheet.appendRow(["SHF03", "Shift Sore", "13:00", "15:00", "Aktif", now, now]);
    Logger.log("Shift default (Pagi, Siang, Sore) berhasil dibuat.");
  }

  // 6. Sheet Profil
  const profilSheet = setupSheet(ss, SHEET_NAMES.PROFIL, [
    "Nama Lembaga",
    "Logo",
    "Alamat",
    "Nomor WA",
    "Email",
    "Website",
    "Footer",
    "Updated At"
  ]);

  if (profilSheet.getLastRow() <= 1) {
    const now = new Date().toISOString();
    profilSheet.appendRow([
      "DIGITALMEERA",
      "",
      "Jl. Pendidikan No. 12, Indonesia",
      "081234567890",
      "info@digitalmeera.com",
      "https://digitalmeera.com",
      "© DIGITALMEERA - Sistem Kursus & Les Privat",
      now
    ]);
    Logger.log("Profil lembaga default berhasil dibuat.");
  }

  // Hapus sheet default 'Sheet1' jika ada dan sheet kita sudah siap
  try {
    const sheet1 = ss.getSheetByName("Sheet1");
    if (sheet1 && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet1);
    }
  } catch (e) {
    Logger.log("Info: Sheet1 tidak dapat dihapus atau sudah terhapus.");
  }

  // Buat folder Google Drive
  setupDriveFolders();

  Logger.log("=== Setup Database DIGITALMEERA Selesai dengan Sukses! ===");
  return { success: true, message: "Database dan folder berhasil diinisialisasi" };
}

/**
 * Membantu membuat atau memastikan sheet dan header tersedia dengan rapi
 */
function setupSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log("Membuat Sheet baru: " + sheetName);
  }

  // Pastikan header ada di baris 1
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
    Logger.log("Menambahkan header pada Sheet: " + sheetName);
  } else {
    // Periksa apakah baris 1 cocok, jika kosong isi
    const currentHeader = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const isHeaderEmpty = currentHeader.every(cell => !cell || cell.toString().trim() === "");
    if (isHeaderEmpty) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      formatHeaderRow(sheet, headers.length);
    }
  }

  return sheet;
}

/**
 * Format baris header agar terlihat rapi dan elegan di spreadsheet
 */
function formatHeaderRow(sheet, colCount) {
  try {
    const headerRange = sheet.getRange(1, 1, 1, colCount);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#1E293B"); // Slate dark
    headerRange.setFontColor("#FFFFFF");
    headerRange.setHorizontalAlignment("center");
    sheet.setFrozenRows(1);
  } catch (e) {
    // Jangan menghentikan proses jika formatting gagal
  }
}

/**
 * Membuat folder Google Drive jika belum ada
 */
function setupDriveFolders() {
  try {
    let rootFolder = getAppRootFolder();

    // Subfolder Peserta
    const pesertaFolders = rootFolder.getFoldersByName(DRIVE_FOLDERS.PESERTA);
    if (!pesertaFolders.hasNext()) {
      rootFolder.createFolder(DRIVE_FOLDERS.PESERTA);
    }

    // Subfolder Logo
    const logoFolders = rootFolder.getFoldersByName(DRIVE_FOLDERS.LOGO);
    if (!logoFolders.hasNext()) {
      rootFolder.createFolder(DRIVE_FOLDERS.LOGO);
    }

    Logger.log("Folder Google Drive DIGITALMEERA siap.");
  } catch (e) {
    Logger.log("Peringatan Drive: " + e.message);
  }
}

/**
 * Inisialisasi default settings
 */
function initDefaultPengaturan(sheet) {
  const defaults = [
    { key: "next_student_seq", value: "1", desc: "Urutan penomoran murid berikutnya" },
    { key: "card_template", value: "modern-navy", desc: "Template kartu peserta bawaan" },
    { key: "card_accent_color", value: "#0ea5e9", desc: "Warna aksen kartu peserta" },
    { key: "card_barcode_size", value: "large", desc: "Ukuran barcode kartu peserta" },
    { key: "card_show_photo", value: "true", desc: "Tampilkan foto siswa di kartu" },
    { key: "card_show_program", value: "true", desc: "Tampilkan nama kelas di kartu" },
    { key: "scan_cooldown_ms", value: "1500", desc: "Jeda waktu antar scan (ms)" }
  ];

  const existingKeys = {};
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    data.forEach(row => {
      if (row[0]) existingKeys[row[0].toString().trim()] = true;
    });
  }

  const now = new Date().toISOString();
  defaults.forEach(item => {
    if (!existingKeys[item.key]) {
      sheet.appendRow([item.key, item.value, item.desc, now]);
    }
  });
}

// ============================================================================
// ROUTING API: doGet & doPost
// ============================================================================
function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, method) {
  try {
    let params = {};
    
    if (method === "GET") {
      params = (e && e.parameter) ? e.parameter : {};
    } else {
      // POST: dapat berupa JSON body atau parameter form
      if (e && e.postData && e.postData.contents) {
        try {
          params = JSON.parse(e.postData.contents);
        } catch (parseErr) {
          params = (e && e.parameter) ? e.parameter : {};
        }
      } else if (e && e.parameter) {
        params = e.parameter;
      }
    }

    const action = params.action;
    if (!action) {
      return jsonResponse({
        success: false,
        message: "Parameter 'action' wajib disertakan. Digitalmeera API aktif."
      });
    }

    let result;
    switch (action) {
      case "ping":
        result = { success: true, message: "PONG - Digitalmeera API aktif", timestamp: new Date().toISOString() };
        break;

      case "setupDatabase":
        result = setupDatabase();
        break;

      // Autentikasi
      case "login":
        result = handleLogin(params);
        break;

      // Dashboard
      case "getDashboard":
        result = handleGetDashboard();
        break;

      // Sync All Data (High-Performance Consolidated Read)
      case "syncAll":
      case "getAll":
        result = handleSyncAll(params);
        break;

      // Peserta CRUD
      case "getPeserta":
        result = handleGetPeserta(params);
        break;
      case "createPeserta":
        result = handleCreatePeserta(params);
        break;
      case "updatePeserta":
        result = handleUpdatePeserta(params);
        break;
      case "deletePeserta":
        result = handleDeletePeserta(params);
        break;

      // Absensi CRUD & Scanner
      case "getAbsensi":
        result = handleGetAbsensi(params);
        break;
      case "createAbsensi":
        result = handleCreateAbsensi(params);
        break;
      case "updateAbsensi":
        result = handleUpdateAbsensi(params);
        break;
      case "deleteAbsensi":
        result = handleDeleteAbsensi(params);
        break;

      // Shift CRUD
      case "getShift":
        result = handleGetShift();
        break;
      case "createShift":
        result = handleCreateShift(params);
        break;
      case "updateShift":
        result = handleUpdateShift(params);
        break;
      case "deleteShift":
        result = handleDeleteShift(params);
        break;

      // Pengaturan & Profil
      case "getPengaturan":
        result = handleGetPengaturan();
        break;
      case "updatePengaturan":
        result = handleUpdatePengaturan(params);
        break;
      case "getProfil":
        result = handleGetProfil();
        break;
      case "updateProfil":
        result = handleUpdateProfil(params);
        break;
      case "updateAdmin":
        result = handleUpdateAdmin(params);
        break;

      // Upload file ke Drive
      case "uploadFile":
        result = handleUploadFile(params);
        break;

      default:
        result = { success: false, message: "Aksi '" + action + "' tidak dikenali" };
    }

    return jsonResponse(result);
  } catch (err) {
    Logger.log("Error dalam handleRequest: " + err.stack || err.message);
    return jsonResponse({
      success: false,
      message: "Terjadi kesalahan internal server: " + (err.message || "Unknown error")
    });
  }
}

function jsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ============================================================================
// KEAMANAN & PASSWORD HASHING
// ============================================================================
function hashPassword(password) {
  if (!password) return "";
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  let hashStr = "";
  for (let i = 0; i < rawHash.length; i++) {
    let byteVal = rawHash[i];
    if (byteVal < 0) byteVal += 256;
    let hex = byteVal.toString(16);
    if (hex.length === 1) hex = "0" + hex;
    hashStr += hex;
  }
  return hashStr;
}

// ============================================================================
// HANDLER: AUTENTIKASI ADMIN
// ============================================================================
function handleLogin(params) {
  const username = (params.username || "").trim();
  const password = params.password || "";

  if (!username || !password) {
    return { success: false, message: "Username dan password wajib diisi." };
  }

  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ADMIN);
  if (!sheet) {
    return { success: false, message: "Sheet Admin belum diinisialisasi. Silakan jalankan setupDatabase." };
  }

  const data = getSheetRowsAsObjects(sheet);
  const inputHash = hashPassword(password);

  const admin = data.find(item => item.Username === username && (item["Password Hash"] === inputHash || item["Password Hash"] === password));
  if (!admin) {
    return { success: false, message: "Username atau password salah." };
  }

  if (admin.Status && admin.Status.toLowerCase() !== "aktif") {
    return { success: false, message: "Akun administrator tidak aktif." };
  }

  return {
    success: true,
    message: "Login berhasil",
    data: {
      id: admin.ID,
      username: admin.Username,
      nama: admin["Nama Admin"] || admin.Username
    }
  };
}

function handleUpdateAdmin(params) {
  const id = params.id || "ADM0001";
  const newUsername = (params.username || "").trim();
  const newNama = (params.nama || "").trim();
  const newPassword = params.password || "";
  const currentPassword = params.currentPassword || "";

  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ADMIN);
  if (!sheet) return { success: false, message: "Sheet Admin tidak ditemukan." };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: false, message: "Data admin kosong." };

  const values = sheet.getRange(2, 1, lastRow - 1, 7).getValues();
  let targetRowIdx = -1;

  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === id || values[i][1] === newUsername) {
      targetRowIdx = i + 2;
      // Validasi password lama jika mengganti password
      if (newPassword) {
        const storedHash = values[i][2];
        if (currentPassword && hashPassword(currentPassword) !== storedHash && currentPassword !== storedHash) {
          return { success: false, message: "Password saat ini tidak cocok." };
        }
      }
      break;
    }
  }

  if (targetRowIdx === -1) {
    return { success: false, message: "Admin tidak ditemukan." };
  }

  const now = new Date().toISOString();
  if (newUsername) sheet.getRange(targetRowIdx, 2).setValue(newUsername);
  if (newPassword) sheet.getRange(targetRowIdx, 3).setValue(hashPassword(newPassword));
  if (newNama) sheet.getRange(targetRowIdx, 4).setValue(newNama);
  sheet.getRange(targetRowIdx, 7).setValue(now);

  return { success: true, message: "Profil administrator berhasil diperbarui." };
}

// ============================================================================
// HANDLER: NOMOR MURID ATOMIK & KONSISTEN
// ============================================================================
/**
 * Mendapatkan Nomor Murid berikutnya tanpa pernah mengulang nomor lama
 * Format: DM0001, DM0002, dst.
 * Menggunakan LockService untuk mencegah race condition.
 */
function getNextStudentNumber(ss) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Tunggu hingga 10 detik

    const pengaturanSheet = ss.getSheetByName(SHEET_NAMES.PENGATURAN);
    let nextSeq = 1;

    // Baca urutan dari Pengaturan
    let seqRowIdx = -1;
    if (pengaturanSheet && pengaturanSheet.getLastRow() > 1) {
      const pData = pengaturanSheet.getRange(2, 1, pengaturanSheet.getLastRow() - 1, 2).getValues();
      for (let i = 0; i < pData.length; i++) {
        if (pData[i][0] === "next_student_seq") {
          nextSeq = parseInt(pData[i][1], 10) || 1;
          seqRowIdx = i + 2;
          break;
        }
      }
    }

    // Double check terhadap nomor murid yang pernah ada di sheet Peserta
    const pesertaSheet = ss.getSheetByName(SHEET_NAMES.PESERTA);
    if (pesertaSheet && pesertaSheet.getLastRow() > 1) {
      const studentNos = pesertaSheet.getRange(2, 2, pesertaSheet.getLastRow() - 1, 1).getValues();
      for (let j = 0; j < studentNos.length; j++) {
        const val = studentNos[j][0] ? studentNos[j][0].toString() : "";
        if (val.startsWith("DM")) {
          const num = parseInt(val.replace("DM", ""), 10);
          if (!isNaN(num) && num >= nextSeq) {
            nextSeq = num + 1;
          }
        }
      }
    }

    // Format DM0001
    const pad = String(nextSeq).padStart(4, "0");
    const studentNumber = "DM" + pad;

    // Simpan urutan berikutnya ke Pengaturan
    const now = new Date().toISOString();
    if (pengaturanSheet) {
      if (seqRowIdx !== -1) {
        pengaturanSheet.getRange(seqRowIdx, 2).setValue(nextSeq + 1);
        pengaturanSheet.getRange(seqRowIdx, 4).setValue(now);
      } else {
        pengaturanSheet.appendRow(["next_student_seq", (nextSeq + 1).toString(), "Urutan penomoran murid berikutnya", now]);
      }
    }

    return studentNumber;
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// HANDLER: PESERTA CRUD
// ============================================================================
function handleGetPeserta(params) {
  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PESERTA);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, data: [] };
  }

  const rows = getSheetRowsAsObjects(sheet);
  
  // Filter jika ada status
  const includeDeleted = params && params.includeDeleted === "true";
  const filtered = rows.filter(r => {
    if (!includeDeleted && r["Status Peserta"] === "Deleted") return false;
    return true;
  });

  return { success: true, data: filtered };
}

function handleCreatePeserta(params) {
  try {
    if (!params) {
      return { success: false, message: "Parameter tidak boleh kosong." };
    }

    // Normalisasi field yang mungkin dikirimkan dengan format berbeda
    if (!params.nama && params.namaPeserta) {
      params.nama = params.namaPeserta;
    }
    if (!params.nama && params.namaLengkap) {
      params.nama = params.namaLengkap;
    }
    if (!params.nama || params.nama.toString().trim() === "") {
      return { success: false, message: "Nama Peserta wajib diisi." };
    }

    if (!params.nomorWA && (params.telepon || params.hp || params.noHp)) {
      params.nomorWA = params.telepon || params.hp || params.noHp;
    }

    // Default nilai opsional jika kosong (mencegah error input formulir)
    if (!params.tempatLahir) params.tempatLahir = "-";
    if (!params.tanggalLahir) params.tanggalLahir = new Date().toISOString().slice(0, 10);
    if (!params.jenisKelamin) params.jenisKelamin = "Laki-laki";
    if (!params.agama) params.agama = "Islam";
    if (!params.status) params.status = "Umum";
    if (!params.nomorWA) params.nomorWA = "-";
    if (!params.orangTua) params.orangTua = "-";
    if (!params.alamat) params.alamat = "-";
    if (!params.programKelas) params.programKelas = "Paket Office Pemula";

    const ss = getAppSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAMES.PESERTA);
    if (!sheet) {
      sheet = setupSheet(ss, SHEET_NAMES.PESERTA, [
        "ID", "Nomor Murid", "Foto", "Nama Peserta", "Tempat Lahir",
        "Tanggal Lahir", "Jenis Kelamin", "Agama", "Status", "Nomor WA/Telpon",
        "Orang Tua/Wali", "Alamat", "Program Kelas", "Harga Program", "Barcode ID",
        "Barcode Value", "Tanggal Pendaftaran", "Status Peserta", "Created At", "Updated At"
      ]);
    }

    // Hitung harga otomatis berdasarkan program
    let harga = "Rp0";
    const program = params.programKelas;
    if (program.indexOf("Paket Office Pemula") !== -1) {
      harga = "Rp300.000";
    } else if (program.indexOf("Paket Office + Desain") !== -1) {
      harga = "Rp400.000";
    } else if (params.hargaProgram) {
      harga = params.hargaProgram;
    }

    // Upload foto jika berupa base64
    let fotoUrl = "";
    if (params.foto && params.foto.indexOf("data:image") === 0) {
      const uploadRes = saveBase64Image(params.foto, DRIVE_FOLDERS.PESERTA, "foto_mhs_" + Date.now());
      if (uploadRes.success) {
        fotoUrl = uploadRes.url;
      } else {
        fotoUrl = ""; // JANGAN simpan raw base64 ke cell agar tidak melebihi 50.000 karakter
      }
    } else if (params.foto && params.foto.indexOf("http") === 0) {
      fotoUrl = params.foto;
    }

    // Generate Nomor Murid atomik
    const nomorMurid = getNextStudentNumber(ss);
    const now = new Date().toISOString();
    const id = "PST" + Date.now();
    const barcodeId = "BAR-" + nomorMurid;
    const barcodeValue = nomorMurid; // Static Barcode Value = Nomor Murid

    const rowData = [
      id,
      nomorMurid,
      fotoUrl,
      params.nama.trim(),
      params.tempatLahir.trim(),
      params.tanggalLahir,
      params.jenisKelamin,
      params.agama,
      params.status,
      params.nomorWA.trim(),
      params.orangTua.trim(),
      params.alamat.trim(),
      params.programKelas,
      harga,
      barcodeId,
      barcodeValue,
      params.tanggalPendaftaran || now.slice(0, 10),
      params.statusPeserta || "Aktif",
      now,
      now
    ];

    sheet.appendRow(rowData);
    clearSyncCache();

    const newPesertaRecord = {
      id: id,
      nomorMurid: nomorMurid,
      foto: fotoUrl,
      namaPeserta: params.nama.trim(),
      tempatLahir: params.tempatLahir.trim(),
      tanggalLahir: params.tanggalLahir,
      jenisKelamin: params.jenisKelamin,
      agama: params.agama,
      status: params.status,
      nomorWA: params.nomorWA.trim(),
      orangTua: params.orangTua.trim(),
      alamat: params.alamat.trim(),
      programKelas: params.programKelas,
      hargaProgram: harga,
      barcodeId: barcodeId,
      barcodeValue: barcodeValue,
      tanggalPendaftaran: params.tanggalPendaftaran || now.slice(0, 10),
      statusPeserta: params.statusPeserta || "Aktif",
      createdAt: now,
      updatedAt: now
    };

    return {
      success: true,
      message: "Data peserta berhasil ditambahkan.",
      data: newPesertaRecord
    };
  } catch (err) {
    Logger.log("Error handleCreatePeserta: " + err.message);
    return {
      success: false,
      message: "Gagal menyimpan ke Spreadsheet: " + err.message
    };
  }
}

function handleUpdatePeserta(params) {
  if (!params.id && !params.nomorMurid) {
    return { success: false, message: "ID atau Nomor Murid peserta wajib disertakan." };
  }

  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PESERTA);
  if (!sheet) return { success: false, message: "Sheet Peserta tidak ditemukan." };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: false, message: "Belum ada data peserta." };

  const values = sheet.getRange(2, 1, lastRow - 1, 20).getValues();
  let targetRowIdx = -1;

  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === params.id || values[i][1] === params.nomorMurid) {
      targetRowIdx = i + 2;
      break;
    }
  }

  if (targetRowIdx === -1) {
    return { success: false, message: "Peserta tidak ditemukan." };
  }

  // Ambil data lama agar Nomor Murid, Barcode, dan Created At TIDAK PERNAH BERUBAH
  const oldRow = sheet.getRange(targetRowIdx, 1, 1, 20).getValues()[0];
  const oldNomorMurid = oldRow[1];
  const oldBarcodeId = oldRow[14];
  const oldBarcodeValue = oldRow[15];
  const oldCreatedAt = oldRow[18];
  let oldFoto = oldRow[2];

  // Upload foto jika diganti base64
  let fotoUrl = params.foto !== undefined ? params.foto : oldFoto;
  if (fotoUrl && fotoUrl.startsWith("data:image")) {
    const uploadRes = saveBase64Image(fotoUrl, DRIVE_FOLDERS.PESERTA, "foto_mhs_" + oldNomorMurid + "_" + Date.now());
    if (uploadRes.success) {
      fotoUrl = uploadRes.url;
    }
  }

  let harga = oldRow[13];
  if (params.programKelas) {
    if (params.programKelas.indexOf("Paket Office Pemula") !== -1) {
      harga = "Rp300.000";
    } else if (params.programKelas.indexOf("Paket Office + Desain") !== -1) {
      harga = "Rp400.000";
    }
  }

  const now = new Date().toISOString();

  const updatedData = [
    oldRow[0],                                        // 1. ID (tetap)
    oldNomorMurid,                                    // 2. Nomor Murid (TETAP)
    fotoUrl,                                          // 3. Foto
    params.nama || oldRow[3],                         // 4. Nama Peserta
    params.tempatLahir || oldRow[4],                  // 5. Tempat Lahir
    params.tanggalLahir || oldRow[5],                  // 6. Tanggal Lahir
    params.jenisKelamin || oldRow[6],                  // 7. Jenis Kelamin
    params.agama || oldRow[7],                         // 8. Agama
    params.status || oldRow[8],                       // 9. Status
    params.nomorWA || oldRow[9],                       // 10. Nomor WA
    params.orangTua || oldRow[10],                     // 11. Orang Tua/Wali
    params.alamat || oldRow[11],                       // 12. Alamat
    params.programKelas || oldRow[12],                 // 13. Program Kelas
    harga,                                            // 14. Harga Program
    oldBarcodeId,                                     // 15. Barcode ID (TETAP)
    oldBarcodeValue,                                  // 16. Barcode Value (TETAP)
    params.tanggalPendaftaran || oldRow[16],          // 17. Tanggal Pendaftaran
    params.statusPeserta || oldRow[17],               // 18. Status Peserta
    oldCreatedAt,                                     // 19. Created At (TETAP)
    now                                               // 20. Updated At (BARU)
  ];

  sheet.getRange(targetRowIdx, 1, 1, 20).setValues([updatedData]);
  clearSyncCache();

  return { success: true, message: "Data peserta berhasil diperbarui." };
}

function handleDeletePeserta(params) {
  if (!params.id && !params.nomorMurid) {
    return { success: false, message: "ID atau Nomor Murid peserta wajib disertakan." };
  }

  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PESERTA);
  if (!sheet) return { success: false, message: "Sheet Peserta tidak ditemukan." };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: false, message: "Data peserta kosong." };

  const values = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  let targetRowIdx = -1;

  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === params.id || values[i][1] === params.nomorMurid) {
      targetRowIdx = i + 2;
      break;
    }
  }

  if (targetRowIdx === -1) {
    return { success: false, message: "Peserta tidak ditemukan." };
  }

  // Soft Delete: Ubah Status Peserta menjadi "Deleted" agar sequence penomoran aman & histori utuh
  const now = new Date().toISOString();
  sheet.getRange(targetRowIdx, 18).setValue("Deleted");
  sheet.getRange(targetRowIdx, 20).setValue(now);
  clearSyncCache();

  return { success: true, message: "Peserta berhasil dihapus (soft delete)." };
}

// ============================================================================
// HANDLER: SISTEM ABSENSI (SCANNER & MONITORING)
// ============================================================================
function handleGetAbsensi(params) {
  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ABSENSI);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, data: [] };
  }

  const rows = getSheetRowsAsObjects(sheet);

  // Filter tanggal / periode jika ada
  let result = rows;
  if (params && params.tanggal) {
    result = result.filter(r => r.Tanggal === params.tanggal);
  }
  if (params && params.nomorMurid) {
    result = result.filter(r => r["Nomor Murid"] === params.nomorMurid);
  }

  return { success: true, data: result };
}

/**
 * createAbsensi
 * Menerima scan barcode atau input manual.
 * Melakukan:
 * 1. Validasi peserta berdasarkan Barcode Value / Nomor Murid
 * 2. Cek apakah peserta aktif
 * 3. Pencegahan absensi ganda pada hari & shift yang sama
 * 4. Pengecekan batas jam presensi shift (dapat dioverride oleh admin jika override=true)
 */
function handleCreateAbsensi(params) {
  const barcodeValue = (params.barcodeValue || params.nomorMurid || "").trim();
  if (!barcodeValue) {
    return { success: false, message: "Barcode atau Nomor Murid wajib disertakan." };
  }

  const ss = getAppSpreadsheet();
  const pesertaSheet = ss.getSheetByName(SHEET_NAMES.PESERTA);
  if (!pesertaSheet || pesertaSheet.getLastRow() <= 1) {
    return { success: false, message: "Barcode tidak terdaftar. Database peserta kosong." };
  }

  // 1. Cari Peserta
  const pesertaList = getSheetRowsAsObjects(pesertaSheet);
  const student = pesertaList.find(p => 
    p["Barcode Value"] === barcodeValue || 
    p["Nomor Murid"] === barcodeValue || 
    p["Barcode ID"] === barcodeValue
  );

  if (!student) {
    return { success: false, message: "Barcode tidak terdaftar." };
  }

  if (student["Status Peserta"] && student["Status Peserta"] !== "Aktif") {
    return { success: false, message: "Peserta tidak aktif (" + student["Status Peserta"] + ")." };
  }

  // Format Waktu Sekarang (WIB / zona lokal Apps Script)
  const nowDate = new Date();
  const timeZone = ss.getSpreadsheetTimeZone() || "Asia/Jakarta";
  const dateStr = Utilities.formatDate(nowDate, timeZone, "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(nowDate, timeZone, "HH:mm");
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const dayStr = dayNames[nowDate.getDay()];

  // Tentukan Shift
  let shiftName = params.shift || "";
  const shiftSheet = ss.getSheetByName(SHEET_NAMES.SHIFT);
  let activeShifts = [];
  if (shiftSheet && shiftSheet.getLastRow() > 1) {
    activeShifts = getSheetRowsAsObjects(shiftSheet).filter(s => s.Status === "Aktif");
  }

  if (!shiftName && activeShifts.length > 0) {
    // Cocokkan jam sekarang dengan interval shift
    const currentShift = activeShifts.find(s => {
      return timeStr >= s["Jam Mulai"] && timeStr <= s["Jam Selesai"];
    });
    if (currentShift) {
      shiftName = currentShift["Nama Shift"];
    } else {
      // Jika di luar shift dan admin tidak override
      if (!params.override) {
        // Berikan keterangan peringatan
        const firstShift = activeShifts[0];
        if (timeStr < firstShift["Jam Mulai"]) {
          return {
            success: false,
            canOverride: true,
            message: "Presensi belum dibuka (Pukul " + timeStr + "). Jam presensi mulai " + firstShift["Jam Mulai"] + "."
          };
        } else {
          return {
            success: false,
            canOverride: true,
            message: "Waktu presensi telah berakhir (Pukul " + timeStr + ")."
          };
        }
      }
      shiftName = "Di Luar Shift";
    }
  }

  // 2. Pencegahan Absensi Ganda
  const absensiSheet = ss.getSheetByName(SHEET_NAMES.ABSENSI);
  if (!absensiSheet) {
    return { success: false, message: "Sheet Absensi belum diinisialisasi." };
  }

  if (absensiSheet.getLastRow() > 1) {
    const existingAbsensi = getSheetRowsAsObjects(absensiSheet);
    const alreadyAttended = existingAbsensi.find(a => 
      a["Nomor Murid"] === student["Nomor Murid"] &&
      a["Tanggal"] === (params.tanggal || dateStr) &&
      (!shiftName || a["Shift"] === shiftName)
    );

    if (alreadyAttended && !params.override) {
      return {
        success: false,
        isDuplicate: true,
        canOverride: true,
        message: "Peserta " + student["Nama Peserta"] + " sudah melakukan presensi pada pukul " + alreadyAttended.Waktu + (alreadyAttended.Shift ? " (" + alreadyAttended.Shift + ")" : "") + "."
      };
    }
  }

  // 3. Simpan ke Sheet Absensi
  const nowIso = nowDate.toISOString();
  const idAbsensi = "ABS" + Date.now();
  const statusPresensi = params.statusPresensi || "Hadir";
  const keterangan = params.keterangan || (params.override ? "Override Manual" : "-");
  const adminName = params.admin || "Admin";

  const rowData = [
    idAbsensi,
    student["Nomor Murid"],
    student["Nama Peserta"],
    student["Program Kelas"],
    params.tanggal || dateStr,
    params.waktu || timeStr,
    params.hari || dayStr,
    statusPresensi,
    shiftName || "Reguler",
    keterangan,
    adminName,
    nowIso,
    nowIso
  ];

  absensiSheet.appendRow(rowData);
  clearSyncCache();

  return {
    success: true,
    message: "Presensi berhasil dicatat untuk " + student["Nama Peserta"],
    data: {
      idAbsensi: idAbsensi,
      nomorMurid: student["Nomor Murid"],
      namaPeserta: student["Nama Peserta"],
      foto: student["Foto"],
      programKelas: student["Program Kelas"],
      tanggal: params.tanggal || dateStr,
      waktu: params.waktu || timeStr,
      statusPresensi: statusPresensi,
      shift: shiftName || "Reguler"
    }
  };
}

function handleUpdateAbsensi(params) {
  if (!params.idAbsensi) {
    return { success: false, message: "ID Absensi wajib disertakan." };
  }

  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ABSENSI);
  if (!sheet) return { success: false, message: "Sheet Absensi tidak ditemukan." };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: false, message: "Data absensi kosong." };

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRowIdx = -1;

  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === params.idAbsensi) {
      targetRowIdx = i + 2;
      break;
    }
  }

  if (targetRowIdx === -1) {
    return { success: false, message: "Data absensi tidak ditemukan." };
  }

  const now = new Date().toISOString();
  if (params.waktu) sheet.getRange(targetRowIdx, 6).setValue(params.waktu);
  if (params.statusPresensi) sheet.getRange(targetRowIdx, 8).setValue(params.statusPresensi);
  if (params.shift) sheet.getRange(targetRowIdx, 9).setValue(params.shift);
  if (params.keterangan !== undefined) sheet.getRange(targetRowIdx, 10).setValue(params.keterangan);
  sheet.getRange(targetRowIdx, 13).setValue(now);
  clearSyncCache();

  return { success: true, message: "Data absensi berhasil diperbarui." };
}

function handleDeleteAbsensi(params) {
  if (!params.idAbsensi) {
    return { success: false, message: "ID Absensi wajib disertakan." };
  }

  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.ABSENSI);
  if (!sheet) return { success: false, message: "Sheet Absensi tidak ditemukan." };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: false, message: "Data absensi kosong." };

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRowIdx = -1;

  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === params.idAbsensi) {
      targetRowIdx = i + 2;
      break;
    }
  }

  if (targetRowIdx === -1) {
    return { success: false, message: "Data absensi tidak ditemukan." };
  }

  sheet.deleteRow(targetRowIdx);
  clearSyncCache();
  return { success: true, message: "Data absensi berhasil dihapus." };
}

// ============================================================================
// HANDLER: SHIFT CRUD
// ============================================================================
function handleGetShift() {
  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SHIFT);
  if (!sheet || sheet.getLastRow() <= 1) {
    return { success: true, data: [] };
  }
  return { success: true, data: getSheetRowsAsObjects(sheet) };
}

function handleCreateShift(params) {
  if (!params.namaShift || !params.jamMulai || !params.jamSelesai) {
    return { success: false, message: "Nama Shift, Jam Mulai, dan Jam Selesai wajib diisi." };
  }

  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SHIFT);
  if (!sheet) return { success: false, message: "Sheet Shift tidak ditemukan." };

  const idShift = "SHF" + Date.now().toString().slice(-4);
  const now = new Date().toISOString();

  sheet.appendRow([
    idShift,
    params.namaShift,
    params.jamMulai,
    params.jamSelesai,
    params.status || "Aktif",
    now,
    now
  ]);

  return { success: true, message: "Shift berhasil ditambahkan.", idShift: idShift };
}

function handleUpdateShift(params) {
  if (!params.idShift) return { success: false, message: "ID Shift wajib disertakan." };

  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SHIFT);
  if (!sheet) return { success: false, message: "Sheet Shift tidak ditemukan." };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: false, message: "Data shift kosong." };

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRowIdx = -1;
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === params.idShift) {
      targetRowIdx = i + 2;
      break;
    }
  }

  if (targetRowIdx === -1) return { success: false, message: "Shift tidak ditemukan." };

  const now = new Date().toISOString();
  if (params.namaShift) sheet.getRange(targetRowIdx, 2).setValue(params.namaShift);
  if (params.jamMulai) sheet.getRange(targetRowIdx, 3).setValue(params.jamMulai);
  if (params.jamSelesai) sheet.getRange(targetRowIdx, 4).setValue(params.jamSelesai);
  if (params.status) sheet.getRange(targetRowIdx, 5).setValue(params.status);
  sheet.getRange(targetRowIdx, 7).setValue(now);

  return { success: true, message: "Shift berhasil diperbarui." };
}

function handleDeleteShift(params) {
  if (!params.idShift) return { success: false, message: "ID Shift wajib disertakan." };

  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.SHIFT);
  if (!sheet) return { success: false, message: "Sheet Shift tidak ditemukan." };

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return { success: false, message: "Data shift kosong." };

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRowIdx = -1;
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === params.idShift) {
      targetRowIdx = i + 2;
      break;
    }
  }

  if (targetRowIdx === -1) return { success: false, message: "Shift tidak ditemukan." };

  sheet.deleteRow(targetRowIdx);
  return { success: true, message: "Shift berhasil dihapus." };
}

// ============================================================================
// HANDLER: PENGATURAN & PROFIL
// ============================================================================
function handleGetPengaturan() {
  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PENGATURAN);
  if (!sheet || sheet.getLastRow() <= 1) return { success: true, data: {} };

  const rows = getSheetRowsAsObjects(sheet);
  const result = {};
  rows.forEach(r => {
    if (r.Key) result[r.Key] = r.Value;
  });

  return { success: true, data: result };
}

function handleUpdatePengaturan(params) {
  const settings = params.settings || params;
  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PENGATURAN);
  if (!sheet) return { success: false, message: "Sheet Pengaturan tidak ditemukan." };

  const lastRow = sheet.getLastRow();
  const existingMap = {};
  if (lastRow > 1) {
    const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
    for (let i = 0; i < data.length; i++) {
      existingMap[data[i][0]] = i + 2;
    }
  }

  const now = new Date().toISOString();
  for (const key in settings) {
    if (key === "action") continue;
    const val = settings[key];
    if (existingMap[key]) {
      sheet.getRange(existingMap[key], 2).setValue(val);
      sheet.getRange(existingMap[key], 4).setValue(now);
    } else {
      sheet.appendRow([key, val, "Pengaturan " + key, now]);
    }
  }

  return { success: true, message: "Pengaturan berhasil disimpan." };
}

function handleGetProfil() {
  const ss = getAppSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.PROFIL);
  if (!sheet || sheet.getLastRow() <= 1) {
    return {
      success: true,
      data: {
        namaLembaga: "DIGITALMEERA",
        logo: "",
        alamat: "Jl. Pendidikan No. 12, Indonesia",
        nomorWA: "081234567890",
        email: "info@digitalmeera.com",
        website: "https://digitalmeera.com",
        footer: "© DIGITALMEERA - Sistem Kursus & Les Privat"
      }
    };
  }

  const row = sheet.getRange(2, 1, 1, 8).getValues()[0];
  return {
    success: true,
    data: {
      namaLembaga: row[0] || "DIGITALMEERA",
      logo: row[1] || "",
      alamat: row[2] || "",
      nomorWA: row[3] || "",
      email: row[4] || "",
      website: row[5] || "",
      footer: row[6] || "© DIGITALMEERA - Sistem Kursus & Les Privat"
    }
  };
}

function handleUpdateProfil(params) {
  const ss = getAppSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAMES.PROFIL);
  if (!sheet) sheet = setupSheet(ss, SHEET_NAMES.PROFIL, ["Nama Lembaga", "Logo", "Alamat", "Nomor WA", "Email", "Website", "Footer", "Updated At"]);

  let logoUrl = params.logo || "";
  if (logoUrl && logoUrl.startsWith("data:image")) {
    const uploadRes = saveBase64Image(logoUrl, DRIVE_FOLDERS.LOGO, "logo_digitalmeera_" + Date.now());
    if (uploadRes.success) logoUrl = uploadRes.url;
  }

  const now = new Date().toISOString();
  const rowData = [
    params.namaLembaga || "DIGITALMEERA",
    logoUrl,
    params.alamat || "",
    params.nomorWA || "",
    params.email || "",
    params.website || "",
    params.footer || "© DIGITALMEERA - Sistem Kursus & Les Privat",
    now
  ];

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, 1, 8).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return { success: true, message: "Profil lembaga berhasil diperbarui.", logo: logoUrl };
}

// ============================================================================
// HANDLER: DASHBOARD STATISTIK (DATA ASLI DARI SPREADSHEET)
// ============================================================================
function handleGetDashboard() {
  const ss = getAppSpreadsheet();
  
  // Baca Peserta
  const pesertaSheet = ss.getSheetByName(SHEET_NAMES.PESERTA);
  let totalPeserta = 0;
  let paketOfficePemula = 0;
  let paketOfficeDesain = 0;
  let activeStudentNumbers = new Set();

  if (pesertaSheet && pesertaSheet.getLastRow() > 1) {
    const pRows = getSheetRowsAsObjects(pesertaSheet);
    pRows.forEach(p => {
      if (p["Status Peserta"] !== "Deleted") {
        totalPeserta++;
        activeStudentNumbers.add(p["Nomor Murid"]);
        const program = p["Program Kelas"] || "";
        if (program.indexOf("Paket Office Pemula") !== -1) {
          paketOfficePemula++;
        } else if (program.indexOf("Paket Office + Desain") !== -1) {
          paketOfficeDesain++;
        }
      }
    });
  }

  // Baca Absensi
  const absensiSheet = ss.getSheetByName(SHEET_NAMES.ABSENSI);
  let totalAbsensi = 0;
  let absensiHariIni = 0;
  let hadirHariIniSet = new Set();
  const timeZone = ss.getSpreadsheetTimeZone() || "Asia/Jakarta";
  const todayStr = Utilities.formatDate(new Date(), timeZone, "yyyy-MM-dd");

  let recentAbsensi = [];

  if (absensiSheet && absensiSheet.getLastRow() > 1) {
    const aRows = getSheetRowsAsObjects(absensiSheet);
    totalAbsensi = aRows.length;

    aRows.forEach(a => {
      if (a.Tanggal === todayStr) {
        absensiHariIni++;
        hadirHariIniSet.add(a["Nomor Murid"]);
      }
    });

    // Ambil 5 aktivitas absensi terbaru
    recentAbsensi = aRows.slice(-5).reverse();
  }

  const tidakHadirHariIni = Math.max(0, totalPeserta - hadirHariIniSet.size);

  return {
    success: true,
    data: {
      totalPeserta: totalPeserta,
      paketOfficePemula: paketOfficePemula,
      paketOfficeDesain: paketOfficeDesain,
      absensiHariIni: absensiHariIni,
      tidakHadirHariIni: tidakHadirHariIni,
      totalAbsensi: totalAbsensi,
      recentAbsensi: recentAbsensi
    }
  };
}

// ============================================================================
// HANDLER: UPLOAD FILE KE GOOGLE DRIVE
// ============================================================================
function handleUploadFile(params) {
  const base64Data = params.file;
  const folderType = params.folder || DRIVE_FOLDERS.PESERTA;
  const fileName = params.fileName || ("file_" + Date.now());

  if (!base64Data) {
    return { success: false, message: "File data (base64) wajib disertakan." };
  }

  return saveBase64Image(base64Data, folderType, fileName);
}

function saveBase64Image(base64Data, targetFolderName, fileName) {
  try {
    let contentType = "image/jpeg";
    let pureBase64 = base64Data;

    if (base64Data.indexOf(";base64,") !== -1) {
      const parts = base64Data.split(";base64,");
      contentType = parts[0].replace("data:", "");
      pureBase64 = parts[1];
    }

    const decoded = Utilities.base64Decode(pureBase64);
    const blob = Utilities.newBlob(decoded, contentType, fileName);

    // Dapatkan folder tujuan
    let rootFolder = getAppRootFolder();

    let targetFolder;
    const targetFolders = rootFolder.getFoldersByName(targetFolderName);
    if (targetFolders.hasNext()) {
      targetFolder = targetFolders.next();
    } else {
      targetFolder = rootFolder.createFolder(targetFolderName);
    }

    const file = targetFolder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingErr) {
      Logger.log("Peringatan sharing: " + sharingErr.message);
    }

    // URL view Google Drive
    const fileUrl = file.getUrl();

    return {
      success: true,
      fileId: file.getId(),
      url: fileUrl,
      downloadUrl: "https://drive.google.com/uc?export=view&id=" + file.getId()
    };
  } catch (err) {
    Logger.log("Gagal menyimpan file ke Drive: " + err.message);
    return { success: false, message: err.message };
  }
}

// ============================================================================
// HELPER UTILITY: BACA SHEET SEBAGAI ARRAY OF OBJECTS (HIGH PERFORMANCE ATOMIC READ)
// ============================================================================
function getSheetRowsAsObjects(sheet) {
  if (!sheet) return [];
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (!values || values.length <= 1) return [];

  const headers = values[0].map(h => (h != null ? h.toString().trim() : ""));
  const rows = values.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      if (h) {
        let val = row[idx];
        if (val instanceof Date) {
          // Jika tahun <= 1900, ini adalah format Jam/Waktu dari Spreadsheet (misal 08:00)
          if (val.getFullYear() <= 1900) {
            val = Utilities.formatDate(val, "Asia/Jakarta", "HH:mm");
          } else {
            val = Utilities.formatDate(val, "Asia/Jakarta", "yyyy-MM-dd");
          }
        }
        obj[h] = val;
      }
    });
    return obj;
  });
}

function clearSyncCache() {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove("digitalmeera_sync_all_v2");
  } catch (e) {
    // Abaikan kegagalan cache
  }
}

/**
 * High-Performance Consolidated Read (syncAll)
 * Mengambil semua data untuk admin panel dalam 1 kali round-trip ultra-cepat.
 * Mendukung force sync untuk membaca data real-time langsung dari Spreadsheet.
 */
function handleSyncAll(params) {
  const isForce = params && (
    params.force === true || params.force === "true" ||
    params.bypassCache === true || params.bypassCache === "true" ||
    params._t != null
  );

  const cache = CacheService.getScriptCache();
  if (isForce) {
    try {
      cache.remove("digitalmeera_sync_all_v2");
    } catch (e) {}
  } else {
    const cached = cache.get("digitalmeera_sync_all_v2");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }
  }

  const ss = getAppSpreadsheet();

  // 1. Peserta
  const pesertaSheet = ss.getSheetByName(SHEET_NAMES.PESERTA);
  let peserta = [];
  let totalPeserta = 0;
  let paketOfficePemula = 0;
  let paketOfficeDesain = 0;

  if (pesertaSheet) {
    const pRows = getSheetRowsAsObjects(pesertaSheet);
    peserta = pRows.filter(p => p["Status Peserta"] !== "Deleted");
    totalPeserta = peserta.length;
    peserta.forEach(p => {
      const prog = p["Program Kelas"] || "";
      if (prog.indexOf("Paket Office Pemula") !== -1) paketOfficePemula++;
      else if (prog.indexOf("Paket Office + Desain") !== -1) paketOfficeDesain++;
    });
  }

  // 2. Absensi
  const absensiSheet = ss.getSheetByName(SHEET_NAMES.ABSENSI);
  let absensi = [];
  let totalAbsensi = 0;
  let absensiHariIni = 0;
  let hadirHariIniSet = {};
  const timeZone = ss.getSpreadsheetTimeZone() || "Asia/Jakarta";
  const todayStr = Utilities.formatDate(new Date(), timeZone, "yyyy-MM-dd");
  let recentAbsensi = [];

  if (absensiSheet) {
    const aRows = getSheetRowsAsObjects(absensiSheet);
    totalAbsensi = aRows.length;
    absensi = aRows;
    aRows.forEach(a => {
      if (a.Tanggal === todayStr) {
        absensiHariIni++;
        if (a["Nomor Murid"]) hadirHariIniSet[a["Nomor Murid"]] = true;
      }
    });
    recentAbsensi = aRows.slice(-5).reverse();
  }

  const tidakHadirHariIni = Math.max(0, totalPeserta - Object.keys(hadirHariIniSet).length);

  // 3. Shift
  const shiftSheet = ss.getSheetByName(SHEET_NAMES.SHIFT);
  let shifts = [];
  if (shiftSheet) {
    shifts = getSheetRowsAsObjects(shiftSheet);
  }

  // 4. Profil
  let profil = {};
  const profilSheet = ss.getSheetByName(SHEET_NAMES.PROFIL);
  if (profilSheet) {
    const prRows = getSheetRowsAsObjects(profilSheet);
    if (prRows.length > 0) {
      profil = {
        namaLembaga: prRows[0]["Nama Lembaga"] || "DIGITALMEERA",
        tagline: prRows[0].Tagline || "Lembaga Kursus Komputer & Desain Terpercaya",
        alamat: prRows[0].Alamat || "",
        nomorWA: prRows[0]["Nomor WA"] || "",
        email: prRows[0].Email || "",
        website: prRows[0].Website || "https://www.digitalmeera.tech",
        logo: prRows[0].Logo || "",
        footer: prRows[0].Footer || "© 2026 DIGITALMEERA. Hak Cipta Dilindungi."
      };
    }
  }

  // 5. Pengaturan
  let pengaturan = {};
  const pengSheet = ss.getSheetByName(SHEET_NAMES.PENGATURAN);
  if (pengSheet) {
    const pengRows = getSheetRowsAsObjects(pengSheet);
    pengRows.forEach(r => {
      if (r["Kunci Pengaturan"]) {
        pengaturan[r["Kunci Pengaturan"]] = r["Nilai Pengaturan"];
      }
    });
  }

  const responseObj = {
    success: true,
    data: {
      peserta: peserta,
      absensi: absensi,
      shifts: shifts,
      profil: profil,
      pengaturan: pengaturan,
      dashboard: {
        totalPeserta: totalPeserta,
        paketOfficePemula: paketOfficePemula,
        paketOfficeDesain: paketOfficeDesain,
        absensiHariIni: absensiHariIni,
        tidakHadirHariIni: tidakHadirHariIni,
        totalAbsensi: totalAbsensi,
        recentAbsensi: recentAbsensi
      }
    }
  };

  try {
    const jsonStr = JSON.stringify(responseObj);
    // Simpan ke CacheService jika ukuran di bawah batas Apps Script 100KB
    if (jsonStr.length < 90000) {
      cache.put("digitalmeera_sync_all_v2", jsonStr, 60);
    }
  } catch (err) {}

  return responseObj;
}
