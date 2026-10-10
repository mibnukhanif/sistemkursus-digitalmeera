import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle, ExternalLink } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'banner' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'button',
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState<boolean>(false);

  // If already installed as PWA standalone, no need to show
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (!ok) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={handleClick}
          className={`flex w-full items-center gap-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-3 py-2 text-xs font-bold text-white shadow-md hover:from-sky-500 hover:to-cyan-500 transition-all ${className}`}
        >
          <Smartphone className="h-4 w-4 shrink-0 text-cyan-200" />
          <div className="flex flex-col text-left">
            <span>Pasang Aplikasi di HP</span>
            <span className="text-[10px] text-cyan-100 font-normal">Google Chrome / Android</span>
          </div>
        </button>
      ) : variant === 'banner' ? (
        <div className={`flex items-center justify-between gap-3 rounded-2xl border border-sky-200 bg-sky-50/90 p-3 sm:p-4 text-xs ${className}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-xs">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-slate-900">Pasang DIGITALMEERA di Layar HP</p>
              <p className="text-slate-600 text-[11px]">Buka cepat layaknya aplikasi native tanpa membuka browser lagi.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClick}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 font-bold text-white shadow-xs hover:bg-sky-700 transition"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Instal</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-sky-700 transition active:scale-95 ${className}`}
          title="Instal aplikasi ke layar beranda HP melalui Chrome"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Instal di HP</span>
        </button>
      )}

      {/* Modal Panduan Instalasi Chrome Mobile & iOS */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md">
                <Smartphone className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Cara Instal di Handphone
                </h3>
                <p className="text-xs text-sky-600 font-semibold">
                  Google Chrome (Android) &amp; Safari (iOS)
                </p>
              </div>
            </div>

            {/* Android / Google Chrome Guide */}
            <div className="space-y-3.5 text-xs text-slate-700">
              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3.5">
                <h4 className="font-bold text-sky-900 flex items-center gap-1.5 mb-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-[10px] text-white">1</span>
                  Panduan Google Chrome di HP Android:
                </h4>
                <ol className="space-y-2 list-decimal list-inside text-slate-700 leading-relaxed">
                  <li>
                    Buka situs ini di browser <strong>Google Chrome</strong> di HP Anda.
                  </li>
                  <li>
                    Ketuk menu <strong>titik tiga (⋮)</strong> di pojok kanan atas browser Chrome.
                  </li>
                  <li>
                    Pilih opsi <strong>"Instal aplikasi"</strong> atau <strong>"Tambahkan ke Layar Utama" (Add to Home screen)</strong>.
                  </li>
                  <li>
                    Ketuk <strong>Instal</strong>. Ikon DIGITALMEERA akan langsung muncul di menu dan layar utama HP Anda layaknya aplikasi Play Store.
                  </li>
                </ol>
              </div>

              {/* iOS Guide */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 mb-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-[10px] text-white">2</span>
                  Jika Menggunakan iPhone / iPad (Safari):
                </h4>
                <ol className="space-y-1.5 list-decimal list-inside text-slate-600 leading-relaxed">
                  <li>
                    Ketuk tombol <strong>Bagikan / Share</strong> (ikon kotak tanda panah ke atas) di menu Safari bawah.
                  </li>
                  <li>
                    Gulir ke bawah dan ketuk <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
                  </li>
                </ol>
              </div>

              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Setelah terpasang, aplikasi dapat dibuka dalam layar penuh (fullscreen) tanpa bilah URL browser.</span>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              {isInstallable && (
                <button
                  type="button"
                  onClick={async () => {
                    await install();
                    setShowGuide(false);
                  }}
                  className="flex-1 rounded-xl bg-sky-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-sky-700 transition"
                >
                  Buka Dialog Instal Chrome
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
              >
                Mengerti &amp; Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
