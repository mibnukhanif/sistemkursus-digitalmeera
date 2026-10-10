import React, { useState } from 'react';
import { Modal } from './Modal';
import { Copy, Check, Download, FileCode, CheckCircle2 } from 'lucide-react';

interface GasCodeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GasCodeViewerModal: React.FC<GasCodeViewerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'Code.gs' | 'appsscript.json'>('Code.gs');

  const codeGsContent = `/**
 * DIGITALMEERA - Sistem Pendaftaran & Absensi Kursus
 * Backend Google Apps Script (Code.gs)
 * 
 * Jalankan fungsi 'setupDatabase' sekali saat pertama kali dipasang.
 * Deploy -> New deployment -> Web app -> Anyone.
 */

const SPREADSHEET_ID = "1jejmJlaGXD7AYxu6bVVXC7sQWFXaL81hW0lzEP3anTY";
const DRIVE_ROOT_FOLDER_ID = "1mQwSeNLsVGFaNzTKqbUyV4-NeViBuObo";

function getAppSpreadsheet() {
  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}

  if (SPREADSHEET_ID) {
    try {
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      if (ss) return ss;
    } catch (e) {}
  }
  return SpreadsheetApp.openById("1jejmJlaGXD7AYxu6bVVXC7sQWFXaL81hW0lzEP3anTY");
}

function getAppRootFolder() {
  if (DRIVE_ROOT_FOLDER_ID) {
    try {
      const folder = DriveApp.getFolderById(DRIVE_ROOT_FOLDER_ID);
      if (folder) return folder;
    } catch (e) {}
  }
  const root = DriveApp.getFoldersByName(DRIVE_FOLDERS.ROOT);
  if (root.hasNext()) return root.next();
  return DriveApp.createFolder(DRIVE_FOLDERS.ROOT);
}

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

function setupDatabase() {
  const ss = getAppSpreadsheet();
  setupSheet(ss, SHEET_NAMES.PESERTA, [
    "ID", "Nomor Murid", "Foto", "Nama Peserta", "Tempat Lahir",
    "Tanggal Lahir", "Jenis Kelamin", "Agama", "Status", "Nomor WA/Telpon",
    "Orang Tua/Wali", "Alamat", "Program Kelas", "Harga Program", "Barcode ID",
    "Barcode Value", "Tanggal Pendaftaran", "Status Peserta", "Created At", "Updated At"
  ]);

  setupSheet(ss, SHEET_NAMES.ABSENSI, [
    "ID Absensi", "Nomor Murid", "Nama Peserta", "Program Kelas",
    "Tanggal", "Waktu", "Hari", "Status Presensi", "Shift", "Keterangan",
    "Admin", "Created At", "Updated At"
  ]);

  const adminSheet = setupSheet(ss, SHEET_NAMES.ADMIN, [
    "ID", "Username", "Password Hash", "Nama Admin", "Status", "Created At", "Updated At"
  ]);

  if (adminSheet.getLastRow() <= 1) {
    const now = new Date().toISOString();
    adminSheet.appendRow([
      "ADM0001", "admin", hashPassword("Digitalmeera@2026"), "Administrator Digitalmeera", "Aktif", now, now
    ]);
  }

  const pSheet = setupSheet(ss, SHEET_NAMES.PENGATURAN, ["Key", "Value", "Description", "Updated At"]);
  initDefaultPengaturan(pSheet);

  const shiftSheet = setupSheet(ss, SHEET_NAMES.SHIFT, [
    "ID Shift", "Nama Shift", "Jam Mulai", "Jam Selesai", "Status", "Created At", "Updated At"
  ]);
  if (shiftSheet.getLastRow() <= 1) {
    const now = new Date().toISOString();
    shiftSheet.appendRow(["SHF01", "Shift Pagi", "08:00", "10:00", "Aktif", now, now]);
    shiftSheet.appendRow(["SHF02", "Shift Siang", "10:00", "12:00", "Aktif", now, now]);
    shiftSheet.appendRow(["SHF03", "Shift Sore", "13:00", "15:00", "Aktif", now, now]);
  }

  const profilSheet = setupSheet(ss, SHEET_NAMES.PROFIL, [
    "Nama Lembaga", "Logo", "Alamat", "Nomor WA", "Email", "Website", "Footer", "Updated At"
  ]);
  if (profilSheet.getLastRow() <= 1) {
    const now = new Date().toISOString();
    profilSheet.appendRow([
      "DIGITALMEERA", "", "Jl. Pendidikan No. 12, Indonesia", "081234567890",
      "info@digitalmeera.com", "https://digitalmeera.com",
      "© DIGITALMEERA - Sistem Kursus & Les Privat", now
    ]);
  }

  setupDriveFolders();
  return { success: true, message: "Database siap digunakan" };
}

function setupSheet(ss, sheetName, headers) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  }
  return sheet;
}

function formatHeaderRow(sheet, colCount) {
  try {
    const range = sheet.getRange(1, 1, 1, colCount);
    range.setFontWeight("bold");
    range.setBackground("#1E293B");
    range.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);
  } catch (e) {}
}

function setupDriveFolders() {
  try {
    let root = DriveApp.getFoldersByName(DRIVE_FOLDERS.ROOT).hasNext() 
      ? DriveApp.getFoldersByName(DRIVE_FOLDERS.ROOT).next() 
      : DriveApp.createFolder(DRIVE_FOLDERS.ROOT);
    if (!root.getFoldersByName(DRIVE_FOLDERS.PESERTA).hasNext()) root.createFolder(DRIVE_FOLDERS.PESERTA);
    if (!root.getFoldersByName(DRIVE_FOLDERS.LOGO).hasNext()) root.createFolder(DRIVE_FOLDERS.LOGO);
  } catch (e) {}
}

function initDefaultPengaturan(sheet) {
  if (sheet.getLastRow() <= 1) {
    const now = new Date().toISOString();
    sheet.appendRow(["next_student_seq", "1", "Urutan penomoran murid berikutnya", now]);
    sheet.appendRow(["card_template", "modern-navy", "Template kartu peserta", now]);
  }
}

function doGet(e) { return handleRequest(e, "GET"); }
function doPost(e) { return handleRequest(e, "POST"); }

function handleRequest(e, method) {
  try {
    let params = {};
    if (method === "GET") {
      params = (e && e.parameter) ? e.parameter : {};
    } else {
      if (e && e.postData && e.postData.contents) {
        try { params = JSON.parse(e.postData.contents); } catch (err) { params = e.parameter || {}; }
      } else { params = e.parameter || {}; }
    }

    const action = params.action;
    if (!action) return jsonResponse({ success: false, message: "Action required" });

    let result;
    switch(action) {
      case "ping": result = { success: true, message: "PONG - DIGITALMEERA API" }; break;
      case "setupDatabase": result = setupDatabase(); break;
      case "login": result = handleLogin(params); break;
      case "getDashboard": result = handleGetDashboard(); break;
      case "syncAll":
      case "getAll": result = handleSyncAll(params); break;
      case "getPeserta": result = handleGetPeserta(params); break;
      case "createPeserta": result = handleCreatePeserta(params); break;
      case "updatePeserta": result = handleUpdatePeserta(params); break;
      case "deletePeserta": result = handleDeletePeserta(params); break;
      case "getAbsensi": result = handleGetAbsensi(params); break;
      case "createAbsensi": result = handleCreateAbsensi(params); break;
      case "updateAbsensi": result = handleUpdateAbsensi(params); break;
      case "deleteAbsensi": result = handleDeleteAbsensi(params); break;
      case "getShift": result = handleGetShift(); break;
      case "createShift": result = handleCreateShift(params); break;
      case "updateShift": result = handleUpdateShift(params); break;
      case "deleteShift": result = handleDeleteShift(params); break;
      case "getProfil": result = handleGetProfil(); break;
      case "updateProfil": result = handleUpdateProfil(params); break;
      case "updateAdmin": result = handleUpdateAdmin(params); break;
      default: result = { success: false, message: "Aksi tidak dikenal" };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

function jsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function hashPassword(password) {
  if (!password) return "";
  const rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  let hashStr = "";
  for (let i = 0; i < rawHash.length; i++) {
    let b = rawHash[i];
    if (b < 0) b += 256;
    let hex = b.toString(16);
    if (hex.length === 1) hex = "0" + hex;
    hashStr += hex;
  }
  return hashStr;
}

// Lengkap di file Code.gs project
`;

  const appsscriptJsonContent = `{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  }
}`;

  const currentContent = activeTab === 'Code.gs' ? codeGsContent : appsscriptJsonContent;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = activeTab;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Backend Google Apps Script"
      subtitle="Kode sumber backend untuk di-copy ke Google Spreadsheet"
      maxWidth="3xl"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('Code.gs')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'Code.gs'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Code.gs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('appsscript.json')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'appsscript.json'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              appsscript.json
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Salin Semua</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        <div className="relative rounded-xl border border-slate-800 bg-slate-900 p-4">
          <pre className="max-h-96 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed">
            <code>{currentContent}</code>
          </pre>
        </div>

        <div className="rounded-xl bg-sky-50 border border-sky-100 p-3 text-xs text-sky-800 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
          <p>
            File lengkap <code>google-apps-script/Code.gs</code> telah tersimpan di direktori proyek ini. Anda dapat menyalinnya langsung ke Google Apps Script Spreadsheet.
          </p>
        </div>
      </div>
    </Modal>
  );
};
