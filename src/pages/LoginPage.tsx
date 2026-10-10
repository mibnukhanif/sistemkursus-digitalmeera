import React, { useState } from 'react';
import { Lock, User, AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { gasApi } from '../services/gasApi';
import { AdminUser, ProfilLembaga } from '../types';
import { InstitutionLogo } from '../components/InstitutionLogo';

interface LoginPageProps {
  onLoginSuccess: (admin: AdminUser) => void;
  profil: ProfilLembaga;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, profil }) => {
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('Digitalmeera@2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const displayLogo = profil?.logo || gasApi.getLocalProfil()?.logo || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await gasApi.login(username.trim(), password);
      if (res.success && res.data) {
        onLoginSuccess(res.data);
      } else {
        setError(res.message || 'Login gagal. Periksa username dan password.');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat menghubungi server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-slate-900 via-slate-950 to-black p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
          {/* Card Header with Glowing Accent */}
          <div className="relative border-b border-slate-800 bg-gradient-to-b from-sky-500/10 to-transparent p-8 text-center">
            <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg transition-all ${
              displayLogo
                ? 'bg-slate-800/90 border border-slate-700/80 p-2 shadow-sky-500/10'
                : 'bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-sky-500/25 p-2.5'
            }`}>
              <InstitutionLogo
                logo={displayLogo}
                alt={profil?.namaLembaga || 'Logo DIGITALMEERA'}
                size={400}
                fallbackType="cap"
              />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {profil.namaLembaga || 'DIGITALMEERA'}
            </h1>
            <p className="mt-1 text-xs font-medium uppercase tracking-widest text-sky-400">
              Sistem Pendaftaran & Absensi Kursus
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Username Administrator
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 hover:from-sky-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Memverifikasi...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {/* Initial Credential Note */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-center">
              <p className="text-[11px] text-slate-400 font-medium">
                Akun Administrator Awal:
              </p>
              <p className="text-xs text-sky-400 font-mono mt-0.5">
                Username: <span className="text-white font-semibold">admin</span> &bull; Password: <span className="text-white font-semibold">Digitalmeera@2026</span>
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="border-t border-slate-800/80 bg-slate-950/40 p-4 text-center">
            <p className="text-[11px] text-slate-400">
              {profil.footer || '© DIGITALMEERA - Sistem Kursus & Les Privat'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
