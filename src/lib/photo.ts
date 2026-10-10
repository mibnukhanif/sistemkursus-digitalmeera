/**
 * Utility Pengolahan & Optimasi Foto Peserta (Google Drive CDN & Base64)
 * Menjamin render foto instan, tajam, dan bebas blokir CORS di browser & cetak kartu
 */

/**
 * Mengekstrak File ID Google Drive dari berbagai variasi URL
 */
export function extractDriveFileId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // 1. Format: https://drive.google.com/file/d/FILE_ID/view...
  const match1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (match1 && match1[1]) return match1[1];

  // 2. Format: https://drive.google.com/open?id=FILE_ID atau uc?id=FILE_ID atau thumbnail?id=FILE_ID
  const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (match2 && match2[1]) return match2[1];

  // 3. Format: https://lh3.googleusercontent.com/d/FILE_ID (=s400 dll)
  const match3 = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match3 && match3[1]) return match3[1];

  // 4. Jika input berupa raw File ID Google Drive (25 - 45 karakter)
  if (/^[a-zA-Z0-9_-]{25,45}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Mengubah URL foto (Google Drive view link / raw id / URL luar) menjadi
 * Google Image CDN URL resolusi tinggi yang langsung dapat dirender tag <img> dan canvas
 * Menggunakan parameter =s{size} untuk download instan (~40ms) dan konsumsi data ringan
 */
export function getOptimizedPhotoUrl(photoUrl: string | null | undefined, size: number = 400): string {
  if (!photoUrl || typeof photoUrl !== 'string') return '';
  const trimmed = photoUrl.trim();
  if (!trimmed) return '';

  // 1. Jika data URL (base64) dari upload lokal, langsung kembalikan
  if (trimmed.startsWith('data:image')) {
    return trimmed;
  }

  // 2. Ekstrak Google Drive File ID
  const driveId = extractDriveFileId(trimmed);
  if (driveId) {
    // Google High-Speed Image CDN dengan parameter ukuran untuk pemuatan instan & tajam
    return `https://lh3.googleusercontent.com/d/${driveId}=s${size}`;
  }

  return trimmed;
}

/**
 * Fallback alternative URL jika CDN utama mengalami rate limit atau blokir jaringan
 */
export function getFallbackPhotoUrl(photoUrl: string | null | undefined, size: number = 400): string {
  const driveId = extractDriveFileId(photoUrl || '');
  if (driveId) {
    // Fallback 1: Drive Thumbnail API (sangat reliabel dan publik)
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w${size}`;
  }
  return '';
}

/**
 * Fallback sekunder melalui Express proxy internal (/api/photo)
 */
export function getProxyPhotoUrl(photoUrl: string | null | undefined): string {
  const driveId = extractDriveFileId(photoUrl || '');
  if (driveId) {
    return `/api/photo?id=${driveId}`;
  }
  return '';
}

/**
 * Mengunduh atau mengonversi foto peserta menjadi base64 Data URL
 * untuk keperluan embedding ke jsPDF dan Canvas kartu agar tidak terpengaruh CORS
 */
export async function fetchPhotoAsDataUrl(photoUrl: string | null | undefined): Promise<string> {
  if (!photoUrl || typeof photoUrl !== 'string') return '';
  const trimmed = photoUrl.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('data:image')) {
    return trimmed;
  }

  const optimizedUrl = getOptimizedPhotoUrl(trimmed);
  if (!optimizedUrl) return '';

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      resolve('');
    }, 8000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 300;
        canvas.height = img.naturalHeight || img.height || 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
          return;
        }
      } catch (err) {
        console.warn('Canvas export tainted:', err);
      }
      resolve(optimizedUrl);
    };

    img.onerror = async () => {
      clearTimeout(timer);
      // Coba fallback lewat proxy backend
      const driveId = extractDriveFileId(trimmed);
      if (driveId) {
        try {
          const proxyRes = await fetch(`/api/photo?id=${driveId}`);
          if (proxyRes.ok) {
            const blob = await proxyRes.blob();
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
            return;
          }
        } catch {}
      }
      resolve('');
    };

    img.src = optimizedUrl;
  });
}
