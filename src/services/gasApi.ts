import { Peserta, Absensi, AdminUser, Shift, ProfilLembaga, DashboardStats, CardTemplateConfig, ApiResponse } from '../types';
import { getOptimizedPhotoUrl } from '../lib/photo';

const GAS_URL_STORAGE_KEY = 'digitalmeera_gas_url';
const LOCAL_PESERTA_KEY = 'digitalmeera_local_peserta';
const LOCAL_ABSENSI_KEY = 'digitalmeera_local_absensi';
const LOCAL_SHIFTS_KEY = 'digitalmeera_local_shifts';
const LOCAL_PROFIL_KEY = 'digitalmeera_local_profil';
const LOCAL_SETTINGS_KEY = 'digitalmeera_local_settings';
const LOCAL_ADMIN_KEY = 'digitalmeera_local_admin';
const LOCAL_SEQ_KEY = 'digitalmeera_local_seq';

export const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzu-zcoOlitQEF6Rsq7i9Yr-wNdKZqsKJGqWvUsXOQDehqWpsNk-3aYXqX1pC88xr-0lg/exec';
export const DEFAULT_SPREADSHEET_ID = '18d2NpE-Y4cm19LjNWo7UPZdMPdcv8CQImRcF3jupTa8';
export const DEFAULT_DRIVE_FOLDER_ID = '1mQwSeNLsVGFaNzTKqbUyV4-NeViBuObo';

export class GasApiService {
  private apiUrl: string = DEFAULT_GAS_URL;

  constructor() {
    this.initUrl();
  }

  private initUrl() {
    const envUrl = import.meta.env.VITE_API_URL || '';
    const storedUrl = typeof window !== 'undefined' ? (localStorage.getItem(GAS_URL_STORAGE_KEY) || '') : '';
    
    // Validasi URL: jika kosong atau bukan URL Apps Script valid, gunakan DEFAULT_GAS_URL
    let finalUrl = (storedUrl || envUrl || DEFAULT_GAS_URL).trim();
    if (!finalUrl.startsWith('https://script.google.com/macros/s/')) {
      finalUrl = DEFAULT_GAS_URL;
    }

    this.apiUrl = finalUrl;
    if (typeof window !== 'undefined') {
      localStorage.setItem(GAS_URL_STORAGE_KEY, this.apiUrl);
    }
  }

  public getApiUrl(): string {
    return this.apiUrl;
  }

  public getSpreadsheetId(): string {
    return DEFAULT_SPREADSHEET_ID;
  }

  public getDriveFolderId(): string {
    return DEFAULT_DRIVE_FOLDER_ID;
  }

  public setApiUrl(url: string): void {
    const trimmed = url.trim();
    this.apiUrl = trimmed || DEFAULT_GAS_URL;
    if (typeof window !== 'undefined') {
      localStorage.setItem(GAS_URL_STORAGE_KEY, this.apiUrl);
    }
  }

  public resetToDefaultUrl(): string {
    this.apiUrl = DEFAULT_GAS_URL;
    if (typeof window !== 'undefined') {
      localStorage.setItem(GAS_URL_STORAGE_KEY, DEFAULT_GAS_URL);
    }
    return DEFAULT_GAS_URL;
  }

  public isConnectedToGas(): boolean {
    return !!this.apiUrl && this.apiUrl.includes('script.google.com/macros/s/');
  }

  private inFlightRequests = new Map<string, Promise<any>>();

  /**
   * Deduplikasi request bersamaan agar tidak membebani kuota & antrian Google Apps Script
   */
  private deduplicatedRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }
    const promise = fetcher().finally(() => {
      this.inFlightRequests.delete(key);
    });
    this.inFlightRequests.set(key, promise);
    return promise;
  }

  /**
   * Helper request ke Google Apps Script Web App
   * Mengutamakan proxy internal /api/gas (Bypass 100% CORS & iframe blocker)
   * dengan fallback direct fetch ke Google Apps Script Web App.
   */
  private async requestGAS<T = any>(action: string, payload: any = {}, preferredMethod: 'GET' | 'POST' = 'POST'): Promise<ApiResponse<T>> {
    const isWriteAction = [
      'createPeserta', 'updatePeserta', 'deletePeserta',
      'createAbsensi', 'updateAbsensi', 'deleteAbsensi',
      'createShift', 'updateShift', 'deleteShift',
      'updateProfil', 'uploadFile', 'updateAdmin'
    ].includes(action);

    const timeoutMs = isWriteAction ? 45000 : 25000;

    // 1. Coba lewat proxy internal /api/gas terlebih dahulu
    if (typeof window !== 'undefined') {
      try {
        const proxyController = new AbortController();
        const pTimer = setTimeout(() => proxyController.abort(), timeoutMs);
        
        let pRes: Response;
        if (!isWriteAction && preferredMethod === 'GET') {
          const queryParams = new URLSearchParams({ action, ...payload });
          pRes = await fetch(`/api/gas?${queryParams.toString()}`, {
            method: 'GET',
            signal: proxyController.signal,
          });
        } else {
          pRes = await fetch('/api/gas', {
            method: 'POST',
            signal: proxyController.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...payload }),
          });
        }
        clearTimeout(pTimer);

        if (pRes.ok) {
          const proxyJson = await pRes.json();
          if (proxyJson && typeof proxyJson === 'object' && 'success' in proxyJson) {
            return proxyJson;
          }
        }
      } catch (proxyErr) {
        // Fallback langsung ke direct fetch
      }
    }

    // 2. Direct fetch ke Google Apps Script Web App (Fallback)
    if (!this.apiUrl) {
      throw new Error('URL Google Apps Script belum dikonfigurasi.');
    }

    const controller = new AbortController();
    const timeoutTimer = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      let response: Response;

      if (!isWriteAction && preferredMethod === 'GET') {
        const params = new URLSearchParams({ action, ...payload });
        response = await fetch(`${this.apiUrl}?${params.toString()}`, {
          method: 'GET',
          mode: 'cors',
          redirect: 'follow',
          signal: controller.signal,
        });
      } else {
        response = await fetch(this.apiUrl, {
          method: 'POST',
          mode: 'cors',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify({ action, ...payload }),
        });
      }

      clearTimeout(timeoutTimer);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      return json;
    } catch (err: any) {
      clearTimeout(timeoutTimer);
      if (err.name === 'AbortError') {
        const msg = `Koneksi Google Apps Script melebihi batas waktu (${timeoutMs / 1000} detik). Server sedang memproses, silakan coba beberapa saat lagi.`;
        console.warn(`GAS timeout for action [${action}]:`, msg);
        throw new Error(msg);
      } else {
        console.warn(`GAS request error for action [${action}]:`, err);
        throw err;
      }
    }
  }

  // =========================================================================
  // AUTENTIKASI
  // =========================================================================
  async login(username: string, password: string): Promise<ApiResponse<AdminUser>> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS<AdminUser>('login', { username, password });
      } catch (err) {
        console.warn('Falling back to local auth verification due to GAS error');
      }
    }

    // Local Verification (strictly matching Code.gs logic: initial admin = admin / Digitalmeera@2026)
    const storedAdmin = this.getLocalAdmin();
    if (
      username.trim() === storedAdmin.username &&
      password === storedAdmin.password
    ) {
      return {
        success: true,
        message: 'Login berhasil (Mode Terverifikasi)',
        data: {
          id: storedAdmin.id,
          username: storedAdmin.username,
          nama: storedAdmin.nama,
        },
      };
    }

    return {
      success: false,
      message: 'Username atau password salah.',
    };
  }

  async updateAdmin(id: string, username: string, nama: string, currentPassword?: string, newPassword?: string): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('updateAdmin', { id, username, nama, currentPassword, password: newPassword });
      } catch (err) {
        console.warn('GAS error on updateAdmin');
      }
    }

    const admin = this.getLocalAdmin();
    if (newPassword) {
      if (currentPassword !== admin.password) {
        return { success: false, message: 'Password saat ini tidak cocok.' };
      }
      admin.password = newPassword;
    }
    if (username) admin.username = username;
    if (nama) admin.nama = nama;
    this.saveLocalAdmin(admin);

    return { success: true, message: 'Profil administrator berhasil diperbarui.' };
  }

  // =========================================================================
  // HIGH-PERFORMANCE BATCH SYNC (1 KALI REQUEST UNTUK SEMUA MENU)
  // =========================================================================
  async syncAll(force: boolean = false): Promise<ApiResponse<{
    peserta: Peserta[];
    absensi: Absensi[];
    shifts: Shift[];
    profil: ProfilLembaga;
    dashboard: DashboardStats;
  }>> {
    const fallbackData = {
      peserta: this.getLocalPeserta().filter(p => p.statusPeserta !== 'Deleted'),
      absensi: this.getLocalAbsensi(),
      shifts: this.getLocalShifts(),
      profil: this.getLocalProfil(),
      dashboard: this.calculateLocalDashboardStats(),
    };

    if (!this.isConnectedToGas()) {
      return { success: true, message: 'Mode Lokal (Offline)', data: fallbackData };
    }

    if (force) {
      this.inFlightRequests.delete('syncAll');
    }

    const fetcher = async () => {
      try {
        const res = await this.requestGAS('syncAll', {
          force: force ? 'true' : 'false',
          bypassCache: force ? 'true' : 'false',
          _t: Date.now().toString(),
        }, 'GET');
        if (res.success && res.data) {
          const raw = res.data;
          let normPeserta = fallbackData.peserta;
          let normAbsensi = fallbackData.absensi;
          let normShifts = fallbackData.shifts;

          if (Array.isArray(raw.peserta)) {
            normPeserta = raw.peserta.map((r: any) => this.normalizePesertaRow(r));
            this.saveLocalPeserta(normPeserta);
          }
          if (Array.isArray(raw.absensi)) {
            normAbsensi = raw.absensi.map((r: any) => this.normalizeAbsensiRow(r));
            this.saveLocalAbsensi(normAbsensi);
          }
          if (Array.isArray(raw.shifts)) {
            normShifts = raw.shifts.map((s: any) => {
              let jm = s['Jam Mulai'] || s.jamMulai || '08:00';
              let js = s['Jam Selesai'] || s.jamSelesai || '10:00';
              if (typeof jm === 'string' && jm.startsWith('1899-12-30')) jm = '08:00';
              if (typeof js === 'string' && js.startsWith('1899-12-30')) js = '10:00';
              return {
                idShift: String(s['ID Shift'] || s.idShift || ''),
                namaShift: String(s['Nama Shift'] || s.namaShift || ''),
                jamMulai: String(jm),
                jamSelesai: String(js),
                status: (s['Status'] || s.status || 'Aktif') as any,
              };
            });
            this.saveLocalShifts(normShifts);
          }
          if (raw.profil && raw.profil.namaLembaga) {
            this.saveLocalProfil(raw.profil, false);
          }

          const dbStats = raw.dashboard || this.calculateLocalDashboardStats();
          if (typeof window !== 'undefined') {
            localStorage.setItem('digitalmeera_dashboard_cache', JSON.stringify(dbStats));
            window.dispatchEvent(new CustomEvent('digitalmeera_synced'));
          }

          return {
            success: true,
            message: `Data berhasil disegarkan dari Google Spreadsheet! (${normPeserta.length} peserta terdaftar).`,
            data: {
              peserta: normPeserta,
              absensi: normAbsensi,
              shifts: normShifts,
              profil: this.getLocalProfil(),
              dashboard: dbStats,
            }
          };
        }
      } catch (err: any) {
        console.warn('syncAll batch failed, fallback to local cache:', err);
        return {
          success: false,
          message: `Gagal menyegarkan data: ${err.message || 'Koneksi terputus'}`,
          data: fallbackData,
        };
      }
      return { success: true, message: 'Data dimuat dari cache lokal.', data: fallbackData };
    };

    if (force) {
      return fetcher();
    }
    return this.deduplicatedRequest('syncAll', fetcher);
  }

  // Helper hitung statistik lokal instan tanpa jeda
  private calculateLocalDashboardStats(): DashboardStats {
    const peserta = this.getLocalPeserta().filter(p => p.statusPeserta !== 'Deleted');
    const absensi = this.getLocalAbsensi();
    const todayStr = new Date().toISOString().slice(0, 10);

    let totalPeserta = peserta.length;
    let paketOfficePemula = 0;
    let paketOfficeDesain = 0;
    peserta.forEach(p => {
      if (p.programKelas.includes('Paket Office Pemula')) paketOfficePemula++;
      else if (p.programKelas.includes('Paket Office + Desain')) paketOfficeDesain++;
    });

    let absensiHariIni = 0;
    const hadirTodaySet = new Set<string>();
    absensi.forEach(a => {
      if (a.tanggal === todayStr) {
        absensiHariIni++;
        hadirTodaySet.add(a.nomorMurid);
      }
    });

    const tidakHadirHariIni = Math.max(0, totalPeserta - hadirTodaySet.size);

    return {
      totalPeserta,
      paketOfficePemula,
      paketOfficeDesain,
      absensiHariIni,
      tidakHadirHariIni,
      totalAbsensi: absensi.length,
      recentAbsensi: absensi.slice(-5).reverse(),
    };
  }

  // =========================================================================
  // DASHBOARD STATS (INSTANT CACHE + BACKGROUND REVALIDATION)
  // =========================================================================
  async getDashboard(): Promise<ApiResponse<DashboardStats>> {
    // 1. Ambil cache lokal dulu agar tampilan langsung muncul 0ms
    const localStats = this.calculateLocalDashboardStats();

    if (this.isConnectedToGas()) {
      return this.deduplicatedRequest('getDashboard', async () => {
        try {
          const res = await this.requestGAS<DashboardStats>('getDashboard', {}, 'POST');
          if (res.success && res.data) {
            if (typeof window !== 'undefined') {
              localStorage.setItem('digitalmeera_dashboard_cache', JSON.stringify(res.data));
            }
            return res;
          }
        } catch (err) {
          console.warn('GAS error on getDashboard, using local stats');
        }
        return { success: true, data: localStats };
      });
    }

    return {
      success: true,
      data: localStats,
    };
  }

  // =========================================================================
  // PESERTA CRUD (POST ULTRA CEPAT + SWR)
  // =========================================================================
  async getPeserta(): Promise<ApiResponse<Peserta[]>> {
    const localList = this.getLocalPeserta().filter(p => p.statusPeserta !== 'Deleted');

    if (this.isConnectedToGas()) {
      return this.deduplicatedRequest('getPeserta', async () => {
        try {
          const res = await this.requestGAS<any[]>('getPeserta', {}, 'POST');
          if (res.success && Array.isArray(res.data)) {
            // Normalisasi nama kolom dari Sheet (misal "Nomor Murid" -> nomorMurid)
            const normalized: Peserta[] = res.data.map(r => this.normalizePesertaRow(r));
            this.saveLocalPeserta(normalized);
            return { success: true, data: normalized };
          }
        } catch (err) {
          console.warn('GAS error on getPeserta, returning local cache');
        }
        return { success: true, data: localList };
      });
    }

    return { success: true, data: localList };
  }

  async createPeserta(data: Omit<Peserta, 'id' | 'nomorMurid' | 'barcodeId' | 'barcodeValue' | 'createdAt' | 'updatedAt'>): Promise<ApiResponse<Peserta>> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS('createPeserta', {
          nama: data.namaPeserta.trim(),
          namaPeserta: data.namaPeserta.trim(),
          tempatLahir: data.tempatLahir.trim(),
          tanggalLahir: data.tanggalLahir,
          jenisKelamin: data.jenisKelamin,
          agama: data.agama,
          status: data.status,
          nomorWA: data.nomorWA.trim(),
          orangTua: data.orangTua.trim(),
          alamat: data.alamat.trim(),
          programKelas: data.programKelas,
          hargaProgram: data.hargaProgram,
          foto: data.foto || '',
          tanggalPendaftaran: data.tanggalPendaftaran || new Date().toISOString().slice(0, 10),
          statusPeserta: data.statusPeserta || 'Aktif',
        });

        if (res.success && res.data) {
          const rawCreated = res.data;
          const createdStudent = this.normalizePesertaRow(rawCreated);

          const list = this.getLocalPeserta();
          const existingIdx = list.findIndex(p => p.nomorMurid === createdStudent.nomorMurid || p.id === createdStudent.id);
          if (existingIdx >= 0) {
            list[existingIdx] = createdStudent;
          } else {
            list.push(createdStudent);
          }
          this.saveLocalPeserta(list);

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('digitalmeera_synced'));
          }

          return {
            success: true,
            message: res.message || 'Data peserta berhasil ditambahkan ke Google Spreadsheet.',
            data: createdStudent,
          };
        } else {
          return {
            success: false,
            message: res.message || 'Google Apps Script menolak penambahan data peserta.',
          };
        }
      } catch (err: any) {
        console.error('GAS error on createPeserta', err);
        return {
          success: false,
          message: `Gagal menyimpan ke Google Spreadsheet: ${err.message || 'Koneksi error'}`,
        };
      }
    }

    // Local sequence generator (hanya jika mode offline/tidak terhubung ke GAS)
    const nextNum = this.getNextStudentSequence();
    const pad = String(nextNum).padStart(4, '0');
    const nomorMurid = `DM${pad}`;
    const now = new Date().toISOString();

    const newPeserta: Peserta = {
      id: `PST${Date.now()}`,
      nomorMurid,
      foto: data.foto || '',
      namaPeserta: data.namaPeserta.trim(),
      tempatLahir: data.tempatLahir.trim(),
      tanggalLahir: data.tanggalLahir,
      jenisKelamin: data.jenisKelamin,
      agama: data.agama,
      status: data.status,
      nomorWA: data.nomorWA.trim(),
      orangTua: data.orangTua.trim(),
      alamat: data.alamat.trim(),
      programKelas: data.programKelas,
      hargaProgram: data.hargaProgram,
      barcodeId: `BAR-${nomorMurid}`,
      barcodeValue: nomorMurid,
      tanggalPendaftaran: data.tanggalPendaftaran || now.slice(0, 10),
      statusPeserta: data.statusPeserta || 'Aktif',
      createdAt: now,
      updatedAt: now,
    };

    const list = this.getLocalPeserta();
    list.push(newPeserta);
    this.saveLocalPeserta(list);

    return {
      success: true,
      message: 'Data peserta berhasil disimpan di penyimpanan lokal (Mode Offline).',
      data: newPeserta,
    };
  }

  async updatePeserta(peserta: Peserta): Promise<ApiResponse<Peserta>> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS('updatePeserta', {
          id: peserta.id,
          nomorMurid: peserta.nomorMurid,
          nama: peserta.namaPeserta,
          namaPeserta: peserta.namaPeserta,
          tempatLahir: peserta.tempatLahir,
          tanggalLahir: peserta.tanggalLahir,
          jenisKelamin: peserta.jenisKelamin,
          agama: peserta.agama,
          status: peserta.status,
          nomorWA: peserta.nomorWA,
          orangTua: peserta.orangTua,
          alamat: peserta.alamat,
          programKelas: peserta.programKelas,
          hargaProgram: peserta.hargaProgram,
          foto: peserta.foto,
          statusPeserta: peserta.statusPeserta,
        });

        if (res.success) {
          const list = this.getLocalPeserta();
          const idx = list.findIndex(p => p.id === peserta.id || p.nomorMurid === peserta.nomorMurid);
          if (idx !== -1) {
            list[idx] = { ...list[idx], ...peserta, updatedAt: new Date().toISOString() };
            this.saveLocalPeserta(list);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('digitalmeera_synced'));
          }
          return {
            success: true,
            message: res.message || 'Data peserta berhasil diperbarui di Google Spreadsheet.',
            data: peserta,
          };
        } else {
          return {
            success: false,
            message: res.message || 'Gagal memperbarui data peserta di Google Spreadsheet.',
          };
        }
      } catch (err: any) {
        console.error('GAS error on updatePeserta', err);
        return {
          success: false,
          message: `Gagal memperbarui di Google Spreadsheet: ${err.message || 'Koneksi error'}`,
        };
      }
    }

    const list = this.getLocalPeserta();
    const idx = list.findIndex(p => p.id === peserta.id || p.nomorMurid === peserta.nomorMurid);
    if (idx === -1) {
      return { success: false, message: 'Peserta tidak ditemukan.' };
    }

    const updated: Peserta = {
      ...list[idx],
      ...peserta,
      nomorMurid: list[idx].nomorMurid,
      barcodeId: list[idx].barcodeId,
      barcodeValue: list[idx].barcodeValue,
      createdAt: list[idx].createdAt,
      updatedAt: new Date().toISOString(),
    };

    list[idx] = updated;
    this.saveLocalPeserta(list);

    return {
      success: true,
      message: 'Data peserta berhasil diperbarui di penyimpanan lokal.',
      data: updated,
    };
  }

  async deletePeserta(id: string, nomorMurid: string): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS('deletePeserta', { id, nomorMurid });
        if (res.success) {
          const list = this.getLocalPeserta();
          const idx = list.findIndex(p => p.id === id || p.nomorMurid === nomorMurid);
          if (idx !== -1) {
            list[idx].statusPeserta = 'Deleted';
            list[idx].updatedAt = new Date().toISOString();
            this.saveLocalPeserta(list);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('digitalmeera_synced'));
          }
          return {
            success: true,
            message: res.message || 'Peserta berhasil dihapus dari Google Spreadsheet.',
          };
        } else {
          return {
            success: false,
            message: res.message || 'Gagal menghapus peserta di Google Spreadsheet.',
          };
        }
      } catch (err: any) {
        console.error('GAS error on deletePeserta', err);
        return {
          success: false,
          message: `Gagal menghapus di Google Spreadsheet: ${err.message || 'Koneksi error'}`,
        };
      }
    }

    const list = this.getLocalPeserta();
    const idx = list.findIndex(p => p.id === id || p.nomorMurid === nomorMurid);
    if (idx !== -1) {
      list[idx].statusPeserta = 'Deleted';
      list[idx].updatedAt = new Date().toISOString();
      this.saveLocalPeserta(list);
      return { success: true, message: 'Peserta berhasil dihapus (soft delete).' };
    }

    return { success: false, message: 'Peserta tidak ditemukan.' };
  }

  // =========================================================================
  // SISTEM ABSENSI (SCANNER & CRUD)
  // =========================================================================
  async getAbsensi(): Promise<ApiResponse<Absensi[]>> {
    const localList = this.getLocalAbsensi();

    if (this.isConnectedToGas()) {
      return this.deduplicatedRequest('getAbsensi', async () => {
        try {
          const res = await this.requestGAS<any[]>('getAbsensi', {}, 'POST');
          if (res.success && Array.isArray(res.data)) {
            const normalized = res.data.map(r => this.normalizeAbsensiRow(r));
            this.saveLocalAbsensi(normalized);
            return { success: true, data: normalized };
          }
        } catch (err) {
          console.warn('GAS error on getAbsensi, using local data');
        }
        return { success: true, data: localList };
      });
    }

    return { success: true, data: localList };
  }

  async recordAbsensi(payload: {
    barcodeValue: string;
    shift?: string;
    statusPresensi?: 'Hadir' | 'Izin' | 'Sakit' | 'Terlambat';
    keterangan?: string;
    admin?: string;
    override?: boolean;
  }): Promise<ApiResponse<Absensi>> {
    if (this.isConnectedToGas()) {
      try {
        const res = await this.requestGAS<any>('createAbsensi', payload);
        return res;
      } catch (err) {
        console.warn('GAS error on createAbsensi');
      }
    }

    // Local Logic matching Code.gs
    const pesertaList = this.getLocalPeserta().filter(p => p.statusPeserta !== 'Deleted');
    const student = pesertaList.find(
      p => p.barcodeValue === payload.barcodeValue || p.nomorMurid === payload.barcodeValue
    );

    if (!student) {
      return { success: false, message: 'Barcode tidak terdaftar.' };
    }

    if (student.statusPeserta !== 'Aktif') {
      return { success: false, message: `Peserta tidak aktif (${student.statusPeserta}).` };
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${mins}`;
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayStr = days[now.getDay()];

    // Tentukan shift
    let shiftName = payload.shift || '';
    const activeShifts = this.getLocalShifts().filter(s => s.status === 'Aktif');

    if (!shiftName && activeShifts.length > 0) {
      const match = activeShifts.find(s => timeStr >= s.jamMulai && timeStr <= s.jamSelesai);
      if (match) {
        shiftName = match.namaShift;
      } else {
        if (!payload.override) {
          const first = activeShifts[0];
          if (timeStr < first.jamMulai) {
            return {
              success: false,
              canOverride: true,
              message: `Presensi belum dibuka (Pukul ${timeStr}). Jam presensi mulai ${first.jamMulai}.`,
            };
          } else {
            return {
              success: false,
              canOverride: true,
              message: `Waktu presensi telah berakhir (Pukul ${timeStr}).`,
            };
          }
        }
        shiftName = 'Di Luar Shift';
      }
    }

    // Cegah duplikat absensi pada hari & shift yang sama
    const existingAbsensi = this.getLocalAbsensi();
    const already = existingAbsensi.find(
      a =>
        a.nomorMurid === student.nomorMurid &&
        a.tanggal === dateStr &&
        (!shiftName || a.shift === shiftName)
    );

    if (already && !payload.override) {
      return {
        success: false,
        isDuplicate: true,
        canOverride: true,
        message: `Peserta ${student.namaPeserta} sudah melakukan presensi pada pukul ${already.waktu}${already.shift ? ` (${already.shift})` : ''}.`,
      };
    }

    const newAbsensi: Absensi = {
      idAbsensi: `ABS${Date.now()}`,
      nomorMurid: student.nomorMurid,
      namaPeserta: student.namaPeserta,
      programKelas: student.programKelas,
      tanggal: dateStr,
      waktu: timeStr,
      hari: dayStr,
      statusPresensi: payload.statusPresensi || 'Hadir',
      shift: shiftName || 'Reguler',
      keterangan: payload.keterangan || (payload.override ? 'Override Manual' : '-'),
      admin: payload.admin || 'Admin',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    existingAbsensi.push(newAbsensi);
    this.saveLocalAbsensi(existingAbsensi);

    return {
      success: true,
      message: `Presensi berhasil dicatat untuk ${student.namaPeserta}`,
      data: newAbsensi,
    };
  }

  async updateAbsensi(idAbsensi: string, data: Partial<Absensi>): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('updateAbsensi', { idAbsensi, ...data });
      } catch (err) {
        console.warn('GAS error on updateAbsensi');
      }
    }

    const list = this.getLocalAbsensi();
    const idx = list.findIndex(a => a.idAbsensi === idAbsensi);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
      this.saveLocalAbsensi(list);
      return { success: true, message: 'Data absensi berhasil diperbarui.' };
    }

    return { success: false, message: 'Data absensi tidak ditemukan.' };
  }

  async deleteAbsensi(idAbsensi: string): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('deleteAbsensi', { idAbsensi });
      } catch (err) {
        console.warn('GAS error on deleteAbsensi');
      }
    }

    let list = this.getLocalAbsensi();
    list = list.filter(a => a.idAbsensi !== idAbsensi);
    this.saveLocalAbsensi(list);
    return { success: true, message: 'Data absensi berhasil dihapus.' };
  }

  // =========================================================================
  // SHIFT MANAGEMENT
  // =========================================================================
  async getShifts(): Promise<ApiResponse<Shift[]>> {
    const localShifts = this.getLocalShifts();

    if (this.isConnectedToGas()) {
      return this.deduplicatedRequest('getShift', async () => {
        try {
          const res = await this.requestGAS<any[]>('getShift', {}, 'POST');
          if (res.success && Array.isArray(res.data)) {
            const normalized = res.data.map(s => ({
              idShift: s['ID Shift'] || s.idShift,
              namaShift: s['Nama Shift'] || s.namaShift,
              jamMulai: s['Jam Mulai'] || s.jamMulai,
              jamSelesai: s['Jam Selesai'] || s.jamSelesai,
              status: s['Status'] || s.status,
            }));
            this.saveLocalShifts(normalized);
            return { success: true, data: normalized };
          }
        } catch (err) {
          console.warn('GAS error on getShift, using local shifts');
        }
        return { success: true, data: localShifts };
      });
    }

    return { success: true, data: localShifts };
  }

  async createShift(shift: Omit<Shift, 'idShift'>): Promise<ApiResponse<Shift>> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('createShift', shift);
      } catch (err) {
        console.warn('GAS error on createShift');
      }
    }

    const newShift: Shift = {
      ...shift,
      idShift: `SHF${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    const list = this.getLocalShifts();
    list.push(newShift);
    this.saveLocalShifts(list);
    return { success: true, message: 'Shift berhasil ditambahkan.', data: newShift };
  }

  async updateShift(shift: Shift): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('updateShift', shift);
      } catch (err) {
        console.warn('GAS error on updateShift');
      }
    }

    const list = this.getLocalShifts();
    const idx = list.findIndex(s => s.idShift === shift.idShift);
    if (idx !== -1) {
      list[idx] = { ...shift, updatedAt: new Date().toISOString() };
      this.saveLocalShifts(list);
      return { success: true, message: 'Shift berhasil diperbarui.' };
    }
    return { success: false, message: 'Shift tidak ditemukan.' };
  }

  async deleteShift(idShift: string): Promise<ApiResponse> {
    if (this.isConnectedToGas()) {
      try {
        return await this.requestGAS('deleteShift', { idShift });
      } catch (err) {
        console.warn('GAS error on deleteShift');
      }
    }

    let list = this.getLocalShifts();
    list = list.filter(s => s.idShift !== idShift);
    this.saveLocalShifts(list);
    return { success: true, message: 'Shift berhasil dihapus.' };
  }

  // =========================================================================
  // PROFIL & PENGATURAN
  // =========================================================================
  async getProfil(): Promise<ApiResponse<ProfilLembaga>> {
    const localProfil = this.getLocalProfil();

    if (this.isConnectedToGas()) {
      return this.deduplicatedRequest('getProfil', async () => {
        try {
          const res = await this.requestGAS<ProfilLembaga>('getProfil', {}, 'POST');
          if (res.success && res.data) {
            this.saveLocalProfil(res.data);
            return res;
          }
        } catch (err) {
          console.warn('GAS error on getProfil, using local profil');
        }
        return { success: true, data: localProfil };
      });
    }

    return { success: true, data: localProfil };
  }

  async updateProfil(data: Partial<ProfilLembaga>): Promise<ApiResponse> {
    const local = this.getLocalProfil();
    const isClearingLogo = data.logo === '';
    const profil: ProfilLembaga = {
      ...local,
      ...data,
      logo: isClearingLogo ? '' : (data.logo || local.logo || ''),
      updatedAt: new Date().toISOString()
    };
    this.saveLocalProfil(profil, isClearingLogo);

    if (this.isConnectedToGas()) {
      try {
        const gasRes = await this.requestGAS('updateProfil', data);
        if (gasRes.success && gasRes.data) {
          this.saveLocalProfil({ ...profil, ...gasRes.data }, isClearingLogo);
        }
        return gasRes;
      } catch (err) {
        console.warn('GAS error on updateProfil');
      }
    }

    return { success: true, message: 'Profil lembaga berhasil diperbarui.', data: profil };
  }

  async getCardConfig(): Promise<CardTemplateConfig> {
    if (typeof window === 'undefined') {
      return {
        theme: 'modern-navy',
        accentColor: '#0ea5e9',
        barcodeSize: 'large',
        showPhoto: true,
        showProgram: true,
        showWatermark: true,
      };
    }
    const raw = localStorage.getItem('digitalmeera_card_config');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    return {
      theme: 'modern-navy',
      accentColor: '#0ea5e9',
      barcodeSize: 'large',
      showPhoto: true,
      showProgram: true,
      showWatermark: true,
    };
  }

  saveCardConfig(cfg: CardTemplateConfig): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('digitalmeera_card_config', JSON.stringify(cfg));
    }
  }

  // =========================================================================
  // TEST KONEKSI KE APPS SCRIPT
  // =========================================================================
  async testConnection(url?: string): Promise<{ success: boolean; message: string; data?: any }> {
    const targetUrl = (url || this.apiUrl).trim();
    if (!targetUrl) {
      return { success: false, message: 'Masukkan URL Google Apps Script Web App terlebih dahulu.' };
    }

    try {
      // 1. Coba POST terlebih dahulu (CORS paling ramah untuk browser)
      let response = await fetch(targetUrl, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'ping' }),
      });

      // 2. Fallback ke GET jika POST gagal merespons
      if (!response.ok) {
        response = await fetch(`${targetUrl}?action=ping`, {
          method: 'GET',
          redirect: 'follow',
        });
      }

      if (!response.ok) {
        return {
          success: false,
          message: `Koneksi gagal dengan status HTTP ${response.status} (${response.statusText}).`,
        };
      }

      const json = await response.json();
      if (json.success) {
        this.setApiUrl(targetUrl);
        // Segarkan data dari spreadsheet langsung ke cache lokal
        this.syncAll(true).catch(() => {});
        return {
          success: true,
          message: 'Berhasil terhubung ke Google Apps Script Web App & Spreadsheet!',
          data: json,
        };
      } else {
        return {
          success: false,
          message: json.message || 'Apps Script merespons tetapi mengembalikan error.',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: 'Tidak dapat terhubung ke server. Pastikan Web App disetel "Who has access: Anyone" dan URL berakhiran /exec.',
      };
    }
  }

  // =========================================================================
  // LOCAL STORE HELPERS (ZERO DUMMY DATA COMPLIANT)
  // =========================================================================
  public getLocalPeserta(): Peserta[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_PESERTA_KEY);
    const rawAlt = localStorage.getItem('digitalmeera_peserta_list');
    
    let list1: Peserta[] = [];
    let list2: Peserta[] = [];

    try {
      if (raw) list1 = JSON.parse(raw);
    } catch {}
    try {
      if (rawAlt) list2 = JSON.parse(rawAlt);
    } catch {}

    // Merge and deduplicate by nomorMurid or id
    const map = new Map<string, Peserta>();
    [...list1, ...list2].forEach((p) => {
      const key = p.nomorMurid || p.id;
      if (key && !map.has(key)) {
        map.set(key, p);
      }
    });

    const merged = Array.from(map.values());
    if (merged.length > 0 && (!raw || list1.length !== merged.length)) {
      try {
        localStorage.setItem(LOCAL_PESERTA_KEY, JSON.stringify(merged));
      } catch {}
    }
    return merged;
  }

  public saveLocalPeserta(list: Peserta[]): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCAL_PESERTA_KEY, JSON.stringify(list));
        localStorage.setItem('digitalmeera_peserta_list', JSON.stringify(list));
        localStorage.setItem('digitalmeera_last_sync', Date.now().toString());

        if (typeof BroadcastChannel !== 'undefined') {
          const bc = new BroadcastChannel('digitalmeera_sync');
          bc.postMessage({ type: 'PESERTA_UPDATED' });
          bc.close();
        }
      } catch {}

      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('peserta_updated'));
    }
  }

  public getLocalAbsensi(): Absensi[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_ABSENSI_KEY);
    return raw ? JSON.parse(raw) : []; // EMPTY ARRAY! No dummy attendance!
  }

  public saveLocalAbsensi(list: Absensi[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_ABSENSI_KEY, JSON.stringify(list));
    }
  }

  public getLocalShifts(): Shift[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(LOCAL_SHIFTS_KEY);
    if (raw) return JSON.parse(raw);

    // Initial default shifts per requirement
    const defaults: Shift[] = [
      { idShift: 'SHF01', namaShift: 'Shift Pagi', jamMulai: '08:00', jamSelesai: '10:00', status: 'Aktif' },
      { idShift: 'SHF02', namaShift: 'Shift Siang', jamMulai: '10:00', jamSelesai: '12:00', status: 'Aktif' },
      { idShift: 'SHF03', namaShift: 'Shift Sore', jamMulai: '13:00', jamSelesai: '15:00', status: 'Aktif' },
    ];
    this.saveLocalShifts(defaults);
    return defaults;
  }

  public saveLocalShifts(list: Shift[]): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_SHIFTS_KEY, JSON.stringify(list));
    }
  }

  public getLocalProfil(): ProfilLembaga {
    if (typeof window === 'undefined') {
      return {
        namaLembaga: 'DIGITALMEERA',
        logo: '',
        alamat: 'Jl. Pendidikan No. 12, Indonesia',
        nomorWA: '081234567890',
        email: 'info@digitalmeera.tech',
        website: 'www.digitalmeera.tech',
        footer: '© DIGITALMEERA - Sistem Kursus & Les Privat',
      };
    }
    const raw = localStorage.getItem(LOCAL_PROFIL_KEY);
    if (raw) return JSON.parse(raw);

    const defaultProfil: ProfilLembaga = {
      namaLembaga: 'DIGITALMEERA',
      logo: '',
      alamat: 'Jl. Pendidikan No. 12, Indonesia',
      nomorWA: '081234567890',
      email: 'info@digitalmeera.tech',
      website: 'www.digitalmeera.tech',
      footer: '© DIGITALMEERA - Sistem Kursus & Les Privat',
    };
    this.saveLocalProfil(defaultProfil);
    return defaultProfil;
  }

  public saveLocalProfil(profil: ProfilLembaga, allowClearLogo: boolean = false): void {
    if (typeof window !== 'undefined') {
      let currentLogo = '';
      try {
        const raw = localStorage.getItem(LOCAL_PROFIL_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          currentLogo = parsed.logo || '';
        }
      } catch {}

      // Pertahankan logo yang diunggah jika profil baru tidak menyediakan logo
      const effectiveLogo = allowClearLogo 
        ? (profil.logo || '') 
        : (profil.logo || currentLogo || '');

      const finalProfil: ProfilLembaga = {
        ...profil,
        logo: effectiveLogo,
      };

      try {
        localStorage.setItem(LOCAL_PROFIL_KEY, JSON.stringify(finalProfil));
      } catch (e) {
        console.warn('Failed to save profil to localStorage:', e);
      }

      window.dispatchEvent(new CustomEvent('profil_updated', { detail: finalProfil }));
      window.dispatchEvent(new Event('storage'));

      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = new BroadcastChannel('digitalmeera_sync');
          bc.postMessage({ type: 'PROFIL_UPDATED', profil: finalProfil });
          bc.close();
        } catch {}
      }
    }
  }

  private getLocalAdmin() {
    if (typeof window === 'undefined') {
      return { id: 'ADM0001', username: 'admin', password: 'Digitalmeera@2026', nama: 'Administrator Digitalmeera' };
    }
    const raw = localStorage.getItem(LOCAL_ADMIN_KEY);
    if (raw) return JSON.parse(raw);

    // Initial admin per requirement
    const defaultAdmin = {
      id: 'ADM0001',
      username: 'admin',
      password: 'Digitalmeera@2026',
      nama: 'Administrator Digitalmeera',
    };
    this.saveLocalAdmin(defaultAdmin);
    return defaultAdmin;
  }

  private saveLocalAdmin(admin: any): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_ADMIN_KEY, JSON.stringify(admin));
    }
  }

  private getNextStudentSequence(): number {
    if (typeof window === 'undefined') return 1;
    let seq = parseInt(localStorage.getItem(LOCAL_SEQ_KEY) || '1', 10);
    // Double check with max ID in local students
    const list = this.getLocalPeserta();
    list.forEach(p => {
      if (p.nomorMurid.startsWith('DM')) {
        const num = parseInt(p.nomorMurid.replace('DM', ''), 10);
        if (!isNaN(num) && num >= seq) {
          seq = num + 1;
        }
      }
    });

    localStorage.setItem(LOCAL_SEQ_KEY, String(seq + 1));
    return seq;
  }

  // Normalizer Google Spreadsheet column names (Safe from undefined/number type errors)
  private normalizePesertaRow(r: any): Peserta {
    if (!r || typeof r !== 'object') {
      return {
        id: `PST${Date.now()}`,
        nomorMurid: '',
        foto: '',
        namaPeserta: '',
        tempatLahir: '',
        tanggalLahir: '',
        jenisKelamin: 'Laki-laki',
        agama: 'Islam',
        status: 'Umum',
        nomorWA: '',
        orangTua: '',
        alamat: '',
        programKelas: 'Paket Office Pemula',
        hargaProgram: 'Rp300.000',
        barcodeId: '',
        barcodeValue: '',
        tanggalPendaftaran: '',
        statusPeserta: 'Aktif',
        createdAt: '',
        updatedAt: '',
      };
    }

    const rawWA = r['Nomor WA/Telpon'] ?? r.nomorWA ?? r.telepon ?? r.hp ?? '';
    let nomorWAStr = rawWA != null ? String(rawWA).trim() : '';
    // Format nomor WA jika tanpa 0 di depan (misal dari sheet format number: 85222545654)
    if (nomorWAStr && !nomorWAStr.startsWith('0') && !nomorWAStr.startsWith('+') && !nomorWAStr.startsWith('62')) {
      nomorWAStr = '0' + nomorWAStr;
    }

    const rawHarga = r['Harga Program'] ?? r.hargaProgram ?? '';
    let hargaStr = '';
    if (typeof rawHarga === 'number') {
      hargaStr = 'Rp' + rawHarga.toLocaleString('id-ID');
    } else {
      hargaStr = String(rawHarga || '');
    }

    const nomorMuridStr = String(r['Nomor Murid'] ?? r.nomorMurid ?? '').trim();
    const barcodeVal = String(r['Barcode Value'] ?? r.barcodeValue ?? nomorMuridStr).trim();
    const barcodeId = String(r['Barcode ID'] ?? r.barcodeId ?? (nomorMuridStr ? `BAR-${nomorMuridStr}` : '')).trim();

    return {
      id: String(r.ID ?? r.id ?? `PST${Date.now()}`),
      nomorMurid: nomorMuridStr,
      foto: getOptimizedPhotoUrl(String(r.Foto ?? r.foto ?? '')),
      namaPeserta: String(r['Nama Peserta'] ?? r.namaPeserta ?? r.nama ?? '').trim(),
      tempatLahir: String(r['Tempat Lahir'] ?? r.tempatLahir ?? '').trim(),
      tanggalLahir: String(r['Tanggal Lahir'] ?? r.tanggalLahir ?? '').trim(),
      jenisKelamin: (r['Jenis Kelamin'] ?? r.jenisKelamin ?? 'Laki-laki') as any,
      agama: String(r.Agama ?? r.agama ?? 'Islam').trim(),
      status: String(r.Status ?? r.status ?? 'Umum').trim(),
      nomorWA: nomorWAStr,
      orangTua: String(r['Orang Tua/Wali'] ?? r.orangTua ?? '').trim(),
      alamat: String(r.Alamat ?? r.alamat ?? '').trim(),
      programKelas: String(r['Program Kelas'] ?? r.programKelas ?? '').trim(),
      hargaProgram: hargaStr,
      barcodeId: barcodeId,
      barcodeValue: barcodeVal,
      tanggalPendaftaran: String(r['Tanggal Pendaftaran'] ?? r.tanggalPendaftaran ?? '').trim(),
      statusPeserta: (String(r['Status Peserta'] ?? r.statusPeserta ?? 'Aktif').trim()) as any,
      createdAt: String(r['Created At'] ?? r.createdAt ?? ''),
      updatedAt: String(r['Updated At'] ?? r.updatedAt ?? ''),
    };
  }

  private normalizeAbsensiRow(r: any): Absensi {
    if (!r || typeof r !== 'object') {
      return {
        idAbsensi: '',
        nomorMurid: '',
        namaPeserta: '',
        programKelas: '',
        tanggal: '',
        waktu: '',
        hari: '',
        statusPresensi: 'Hadir',
        shift: '',
        keterangan: '',
        admin: '',
        createdAt: '',
        updatedAt: '',
      };
    }

    return {
      idAbsensi: String(r['ID Absensi'] ?? r.idAbsensi ?? ''),
      nomorMurid: String(r['Nomor Murid'] ?? r.nomorMurid ?? '').trim(),
      namaPeserta: String(r['Nama Peserta'] ?? r.namaPeserta ?? '').trim(),
      programKelas: String(r['Program Kelas'] ?? r.programKelas ?? '').trim(),
      tanggal: String(r.Tanggal ?? r.tanggal ?? '').trim(),
      waktu: String(r.Waktu ?? r.waktu ?? '').trim(),
      hari: String(r.Hari ?? r.hari ?? '').trim(),
      statusPresensi: (r['Status Presensi'] ?? r.statusPresensi ?? 'Hadir') as any,
      shift: String(r.Shift ?? r.shift ?? '').trim(),
      keterangan: String(r.Keterangan ?? r.keterangan ?? '').trim(),
      admin: String(r.Admin ?? r.admin ?? '').trim(),
      createdAt: String(r['Created At'] ?? r.createdAt ?? ''),
      updatedAt: String(r['Updated At'] ?? r.updatedAt ?? ''),
    };
  }
}

export const gasApi = new GasApiService();
