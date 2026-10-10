import React, { useState } from 'react';
import { Modal } from './Modal';
import { gasApi } from '../services/gasApi';
import { CheckCircle2, AlertCircle, Link2, Copy, ExternalLink, HelpCircle, RefreshCw } from 'lucide-react';

interface GasConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionChanged: () => void;
  onOpenCodeViewer: () => void;
}

export const GasConnectionModal: React.FC<GasConnectionModalProps> = ({
  isOpen,
  onClose,
  onConnectionChanged,
  onOpenCodeViewer,
}) => {
  const [url, setUrl] = useState<string>(gasApi.getApiUrl() || '');
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestAndSave = async () => {
    if (!url.trim()) {
      setTestResult({
        success: false,
        message: 'Masukkan URL Web App Google Apps Script terlebih dahulu.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await gasApi.testConnection(url);
    setTesting(false);
    setTestResult(result);

    if (result.success) {
      gasApi.setApiUrl(url);
      onConnectionChanged();
    }
  };

  const handleDisconnect = () => {
    gasApi.setApiUrl('');
    setUrl('');
    setTestResult({
      success: true,
      message: 'Koneksi dilepas. Sistem beralih ke penyimpanan lokal browser.',
    });
    onConnectionChanged();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Integrasi Google Spreadsheet & Apps Script"
      subtitle="Hubungkan frontend ke backend Google Spreadsheet Anda"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* URL Input Box */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Web App URL Google Apps Script:
          </label>
          <div className="relative">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfyc.../exec"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-mono text-slate-900 shadow-xs focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
          <p className="text-[11px] text-slate-600">
            Dapatkan URL ini dari menu <strong>Deploy → New deployment → Web app</strong> di Google Apps Script (Who has access: <em>Anyone</em>).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleTestAndSave}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition-colors disabled:opacity-50"
          >
            {testing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Menguji Koneksi...</span>
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" />
                <span>Uji & Simpan Koneksi</span>
              </>
            )}
          </button>

          {gasApi.isConnectedToGas() && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Putuskan Koneksi
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCodeViewer}
            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
          >
            <span>Buka Source Code.gs</span>
          </button>
        </div>

        {/* Result Alert */}
        {testResult && (
          <div
            className={`flex items-start gap-3 rounded-xl p-3.5 text-xs sm:text-sm ${
              testResult.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">{testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}</p>
              <p className="text-xs mt-0.5">{testResult.message}</p>
            </div>
          </div>
        )}

        {/* Instructions Box */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
            <HelpCircle className="h-4 w-4 text-sky-600" />
            <span>Langkah Pemasangan Google Spreadsheet (5 Menit)</span>
          </div>
          <ol className="list-decimal pl-4 space-y-1.5 text-xs text-slate-600">
            <li>
              Buka Google Spreadsheet baru (kosong).
            </li>
            <li>
              Pilih menu <strong>Extensions (Ekstensi) → Apps Script</strong>.
            </li>
            <li>
              Klik tombol <strong>Buka Source Code.gs</strong> di atas, salin semua kodenya dan tempel ke editor Apps Script.
            </li>
            <li>
              Pilih fungsi <code>setupDatabase</code> lalu klik tombol <strong>Run (Jalankan)</strong> untuk inisialisasi sheet otomatis.
            </li>
            <li>
              Klik <strong>Deploy → New deployment → Web app</strong>.
            </li>
            <li>
              Setel <strong>Execute as: Me</strong> dan <strong>Who has access: Anyone</strong>.
            </li>
            <li>
              Salin URL Web App yang dihasilkan lalu tempelkan di kotak input di atas!
            </li>
          </ol>
        </div>
      </div>
    </Modal>
  );
};
