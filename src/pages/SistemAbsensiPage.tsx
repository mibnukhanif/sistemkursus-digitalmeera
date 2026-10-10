import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { gasApi } from '../services/gasApi';
import { Absensi, Peserta, Shift } from '../types';
import { sound } from '../lib/sound';
import { StudentPhoto } from '../components/StudentPhoto';
import { 
  Camera, 
  CameraOff, 
  CheckCircle2, 
  AlertTriangle, 
  Keyboard, 
  Clock, 
  User, 
  Volume2, 
  RefreshCw,
  ShieldAlert,
  Sparkles,
  QrCode as QrCodeIcon,
  SwitchCamera
} from 'lucide-react';

export const SistemAbsensiPage: React.FC = () => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [shifts, setShifts] = useState<Shift[]>(() => gasApi.getLocalShifts());
  const [selectedShift, setSelectedShift] = useState<string>(() => {
    const local = gasApi.getLocalShifts();
    const nowStr = new Date().toTimeString().slice(0, 5);
    const active = local.find(s => s.status === 'Aktif' && nowStr >= s.jamMulai && nowStr <= s.jamSelesai);
    return active ? active.namaShift : (local[0]?.namaShift || '');
  });
  const [override, setOverride] = useState<boolean>(false);

  // Manual Input fallback
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Last scanned student result display
  const [lastScanResult, setLastScanResult] = useState<{
    peserta?: Peserta;
    absensi?: Absensi;
    message: string;
    isError?: boolean;
    isWarning?: boolean;
    timestamp: string;
  } | null>(null);

  // Recent scans in this session
  const [sessionScans, setSessionScans] = useState<Array<{
    nomorMurid: string;
    nama: string;
    waktu: string;
    status: string;
    shift: string;
  }>>([]);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isStartingRef = useRef<boolean>(false);
  const lastScannedBarcodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const containerId = 'qrcode-reader-viewfinder';

  // Safe helper to stop and clear Html5Qrcode instance without throwing unhandled exceptions
  const stopScannerSafely = async (scanner: Html5Qrcode | null) => {
    if (!scanner) return;
    try {
      const state = scanner.getState();
      if (
        state === Html5QrcodeScannerState.SCANNING ||
        state === Html5QrcodeScannerState.PAUSED
      ) {
        await scanner.stop();
      }
    } catch {
      // Html5Qrcode throws synchronously or rejects if stop() is called when not scanning/paused.
      // We safely suppress this expected race/transition condition.
    }
    try {
      scanner.clear();
    } catch {
      // Suppress clearing if container was removed from DOM
    }
  };

  // Load shifts on mount
  useEffect(() => {
    const loadShifts = async () => {
      try {
        const res = await gasApi.getShifts();
        if (res.success && res.data) {
          setShifts(res.data);
          // Set shift yang aktif saat ini jika ada
          const nowStr = new Date().toTimeString().slice(0, 5);
          const active = res.data.find(
            (s) => s.status === 'Aktif' && nowStr >= s.jamMulai && nowStr <= s.jamSelesai
          );
          if (active) setSelectedShift(active.namaShift);
        }
      } catch (err) {
        console.error('Failed to load shifts', err);
      }
    };
    loadShifts();
  }, []);

  // Initialize Camera Scanner dengan konfigurasi rasio 1:1 untuk QR Code
  const startCameraWithMode = async (mode: 'environment' | 'user') => {
    if (!isMountedRef.current) return;
    setCameraError('');
    isStartingRef.current = true;

    try {
      // Stop and clean up any existing scanner instance safely
      if (html5QrCodeRef.current) {
        const prev = html5QrCodeRef.current;
        html5QrCodeRef.current = null;
        await stopScannerSafely(prev);
      }

      if (!isMountedRef.current) return;

      const container = document.getElementById(containerId);
      if (!container) {
        isStartingRef.current = false;
        return;
      }

      const qrCodeInstance = new Html5Qrcode(containerId);
      html5QrCodeRef.current = qrCodeInstance;

      // Konfigurasi 1:1 bujursangkar untuk QR Code
      const config = {
        fps: 20,
        qrbox: { width: 250, height: 250 }, // Aspek rasio 1:1 bujursangkar
        aspectRatio: 1.0,
      };

      await qrCodeInstance.start(
        { facingMode: mode },
        config,
        (decodedText) => {
          handleBarcodeScanned(decodedText);
        },
        () => {
          // Frame non-match - ignore silently
        }
      );

      // In case unmounted while starting camera stream
      if (!isMountedRef.current) {
        await stopScannerSafely(qrCodeInstance);
        html5QrCodeRef.current = null;
        return;
      }

      setCameraActive(true);
      setCameraFacingMode(mode);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.warn('Camera start error:', err);
      setCameraActive(false);
      setCameraError(
        typeof err === 'string'
          ? err
          : err?.message || 'Izin kamera ditolak atau kamera tidak dapat diakses.'
      );
    } finally {
      isStartingRef.current = false;
    }
  };

  const handleFlipCamera = async () => {
    if (isFlipping || isStartingRef.current) return;
    setIsFlipping(true);
    const nextMode = cameraFacingMode === 'environment' ? 'user' : 'environment';
    await startCameraWithMode(nextMode);
    setIsFlipping(false);
  };

  const handleRestartCamera = async () => {
    if (isStartingRef.current) return;
    await startCameraWithMode(cameraFacingMode);
  };

  useEffect(() => {
    isMountedRef.current = true;
    startCameraWithMode('environment');

    return () => {
      isMountedRef.current = false;
      const scanner = html5QrCodeRef.current;
      html5QrCodeRef.current = null;
      if (scanner) {
        stopScannerSafely(scanner).catch(() => {});
      }
    };
  }, []);

  // Core handler for QR code detection (from camera or manual input)
  const handleBarcodeScanned = async (barcodeVal: string) => {
    const cleanVal = barcodeVal.trim();
    if (!cleanVal) return;

    // Cooldown check (2.0 detik) untuk mencegah pemindaian berulang yang tidak disengaja
    const now = Date.now();
    if (
      cleanVal === lastScannedBarcodeRef.current &&
      now - lastScannedTimeRef.current < 2000
    ) {
      return;
    }

    lastScannedBarcodeRef.current = cleanVal;
    lastScannedTimeRef.current = now;

    await processAttendance(cleanVal);
  };

  const processAttendance = async (barcodeVal: string) => {
    setIsProcessing(true);

    try {
      const res = await gasApi.recordAbsensi({
        barcodeValue: barcodeVal,
        shift: selectedShift || undefined,
        statusPresensi: 'Hadir',
        override: override,
      });

      const nowTimeStr = new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      if (res.success && res.data) {
        // SUKSES
        sound.playSuccess();
        const matchedPeserta = gasApi.getLocalPeserta().find(
          (p) =>
            p.nomorMurid === res.data!.nomorMurid ||
            p.barcodeId === res.data!.nomorMurid ||
            p.nomorMurid === barcodeVal ||
            p.barcodeId === barcodeVal
        );

        setLastScanResult({
          peserta: matchedPeserta,
          absensi: res.data,
          message: res.message || 'Presensi berhasil dicatat!',
          timestamp: nowTimeStr,
        });

        // Tambah ke riwayat sesi lokal
        setSessionScans((prev) => [
          {
            nomorMurid: res.data!.nomorMurid,
            nama: res.data!.namaPeserta,
            waktu: res.data!.waktu,
            status: res.data!.statusPresensi,
            shift: res.data!.shift,
          },
          ...prev.slice(0, 9), // simpan 10 terakhir
        ]);
      } else {
        // GAGAL / DUPLIKAT / DI LUAR JAM
        sound.playWarning();
        setLastScanResult({
          message: res.message || 'Presensi tidak dapat dicatat.',
          isError: true,
          isWarning: res.isDuplicate || res.canOverride,
          timestamp: nowTimeStr,
        });
      }
    } catch (err: any) {
      sound.playWarning();
      setLastScanResult({
        message: err.message || 'Terjadi kesalahan sistem saat mencatat absensi.',
        isError: true,
        timestamp: new Date().toLocaleTimeString('id-ID'),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    processAttendance(manualBarcode.trim());
    setManualBarcode('');
  };

  return (
    <div className="space-y-6">
      {/* Title & Shift Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Sistem Absensi QR Code</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Arahkan kamera ke QR Code (rasio 1:1) kartu siswa. Pemindaian berlangsung kontinu dan otomatis.
          </p>
        </div>

        {/* Shift Selector & Override Option */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
            <Clock className="h-4 w-4 text-sky-600" />
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="text-xs font-semibold text-slate-700 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Shift Otomatis (Sesuai Jam)</option>
              {shifts.map((s) => (
                <option key={s.idShift} value={s.namaShift}>
                  {s.namaShift} ({s.jamMulai} - {s.jamSelesai})
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl cursor-pointer shadow-2xs hover:bg-slate-50">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              className="h-3.5 w-3.5 text-sky-600 rounded border-slate-300"
            />
            <span>Override Jam</span>
          </label>
        </div>
      </div>

      {/* Main Grid: Scanner Left, Result & History Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewfinder & Manual Input (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Scanner Viewfinder Box */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-xl">
            {/* Camera Frame */}
            <div className="relative min-h-[320px] sm:min-h-[380px] flex items-center justify-center">
              <div id={containerId} className="w-full h-full overflow-hidden" />

              {/* Floating Flip Camera Button (Always accessible) */}
              <button
                type="button"
                onClick={handleFlipCamera}
                disabled={isFlipping}
                className="absolute top-3.5 right-3.5 z-30 inline-flex items-center gap-1.5 rounded-full bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 text-xs font-bold text-white border border-slate-700/80 hover:bg-slate-800 shadow-lg transition-all active:scale-95 disabled:opacity-50"
                title="Ganti ke kamera depan atau belakang"
              >
                <SwitchCamera className={`h-3.5 w-3.5 text-sky-400 ${isFlipping ? 'animate-spin' : ''}`} />
                <span>Flip: {cameraFacingMode === 'environment' ? 'Kamera Belakang' : 'Kamera Depan'}</span>
              </button>

              {/* QR Code 1:1 Square Target Box Overlay Animation */}
              {cameraActive && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-4">
                  {/* Square 1:1 Frame with Corner Brackets */}
                  <div className="relative h-56 w-56 sm:h-64 sm:w-64 aspect-square border-2 border-sky-400/80 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(14,165,233,0.3)]">
                    {/* Corner Accent Brackets */}
                    <div className="absolute -top-1 -left-1 h-6 w-6 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 h-6 w-6 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 h-6 w-6 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />

                    {/* Animated Scanning Laser Line */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_10px_#ef4444] animate-pulse" />

                    {/* Frame Label */}
                    <span className="absolute -bottom-7 text-[10px] font-mono tracking-widest text-sky-300 font-semibold uppercase bg-slate-900/80 px-2 py-0.5 rounded">
                      Posisikan QR Code Disini (1:1)
                    </span>
                  </div>
                </div>
              )}

              {/* Camera Error / Permission Fallback */}
              {!cameraActive && (
                <div className="p-8 text-center text-white z-10 max-w-sm">
                  <CameraOff className="mx-auto h-12 w-12 text-slate-500 mb-3" />
                  <h4 className="text-sm font-bold text-slate-200">
                    Kamera Tidak Aktif
                  </h4>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    {cameraError || 'Browser membutuhkan izin untuk mengakses webcam/kamera.'}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={handleRestartCamera}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-700"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>Coba Aktifkan Ulang</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFlipCamera}
                      className="inline-flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2 text-xs font-semibold text-sky-300 shadow-xs hover:bg-slate-700"
                    >
                      <SwitchCamera className="h-3.5 w-3.5" />
                      <span>Ganti Kamera {cameraFacingMode === 'environment' ? 'Depan' : 'Belakang'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Viewfinder Status Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 bg-slate-900/90 px-4 py-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${cameraActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                <span>{cameraActive ? 'QR Scanner Aktif' : 'Kamera Nonaktif'}</span>
                <span className="text-slate-600">•</span>
                <span className="text-sky-400 font-semibold">
                  {cameraFacingMode === 'environment' ? 'Belakang (Environment)' : 'Depan (User)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  disabled={!cameraActive || isFlipping}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 px-2.5 py-1 text-xs font-semibold transition-colors border border-slate-700 disabled:opacity-50"
                  title="Balik ke kamera depan atau belakang"
                >
                  <SwitchCamera className={`h-3 w-3 text-sky-400 ${isFlipping ? 'animate-spin' : ''}`} />
                  <span>Flip Kamera</span>
                </button>
                <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <Volume2 className="h-3.5 w-3.5 text-sky-400" />
                  <span>Beep ON</span>
                </div>
              </div>
            </div>
          </div>

          {/* Backup: Manual Barcode / USB Scanner Barcode Input */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <form onSubmit={handleManualSubmit} className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Keyboard className="h-3.5 w-3.5 text-sky-600" />
                <span>Input Manual / Scanner USB (QR / Barcode)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="Ketik Nomor Murid (contoh: DM0001) lalu Enter..."
                  className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  disabled={isProcessing || !manualBarcode.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
                >
                  {isProcessing ? 'Memproses...' : 'Presensi'}
                </button>
              </div>
              <p className="text-[11px] text-slate-600">
                Mendukung scanner QR code optik kamera serta barcode reader USB eksternal secara otomatis.
              </p>
            </form>
          </div>
        </div>

        {/* Right Column: Instant Result Card & Session History (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Last Scan Result Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Status Presensi Terakhir
            </h3>

            {lastScanResult ? (
              <div
                className={`rounded-2xl p-4 border transition-all ${
                  lastScanResult.isError
                    ? lastScanResult.isWarning
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-red-200 bg-red-50 text-red-900'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {lastScanResult.isError ? (
                    lastScanResult.isWarning ? (
                      <AlertTriangle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldAlert className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                    )
                  ) : (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight">
                      {lastScanResult.message}
                    </p>
                    <span className="text-[11px] font-mono text-slate-500 mt-0.5 block">
                      Waktu scan: {lastScanResult.timestamp}
                    </span>

                    {/* Jika sukses, tampilkan detail siswa & foto */}
                    {lastScanResult.absensi && (
                      <div className="mt-3.5 pt-3 border-t border-emerald-200/80 text-xs text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="h-16 w-14 shrink-0 overflow-hidden rounded-xl border border-emerald-300 bg-white shadow-xs">
                            <StudentPhoto
                              photoUrl={lastScanResult.peserta?.foto}
                              alt={lastScanResult.absensi.namaPeserta}
                              size={200}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-sky-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                                {lastScanResult.absensi.nomorMurid}
                              </span>
                              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                                {lastScanResult.absensi.statusPresensi || 'Hadir'}
                              </span>
                            </div>
                            <p className="font-bold text-slate-900 truncate text-sm">
                              {lastScanResult.absensi.namaPeserta}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate">
                              {lastScanResult.absensi.programKelas} &bull; {lastScanResult.absensi.shift} ({lastScanResult.absensi.waktu})
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-slate-400">
                <QrCodeIcon className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">
                  Belum Ada Pemindaian QR Code
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Scan QR code pada kartu peserta untuk mulai mencatat kehadiran otomatis.
                </p>
              </div>
            )}
          </div>

          {/* Session History (10 scans) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Riwayat Sesi Ini ({sessionScans.length})
              </h3>
              {sessionScans.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSessionScans([])}
                  className="text-[11px] text-slate-400 hover:text-slate-600 hover:underline"
                >
                  Bersihkan
                </button>
              )}
            </div>

            {sessionScans.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {sessionScans.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 text-xs transition-colors hover:bg-slate-100/70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-[11px] text-sky-700">
                          {item.nomorMurid}
                        </span>
                        <span className="font-semibold text-slate-900 truncate">
                          {item.nama}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {item.shift} &bull; {item.waktu}
                      </span>
                    </div>

                    <span className="ml-2 shrink-0 rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-xs text-slate-400">
                Riwayat presensi sesi berjalan akan muncul di sini.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
