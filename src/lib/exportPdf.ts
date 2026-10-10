import jsPDF from 'jspdf';
import { Peserta, Absensi, ProfilLembaga, CardTemplateConfig } from '../types';
import { generateQrCodeDataUrl } from './qrcode';
import { fetchPhotoAsDataUrl } from './photo';

const CARD_WIDTH_MM = 85.6;
const CARD_HEIGHT_MM = 53.98;

/**
 * Crop image with object-fit: cover behavior matching system UI preview
 */
export async function cropImageToCoverDataUrl(
  imageSource: string,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  if (typeof document === 'undefined') return imageSource;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSource);
          return;
        }

        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;

        const imgRatio = imgWidth / imgHeight;
        const targetRatio = targetWidth / targetHeight;

        let sx = 0;
        let sy = 0;
        let sWidth = imgWidth;
        let sHeight = imgHeight;

        if (imgRatio > targetRatio) {
          // Source image is wider than target box: crop left and right
          sHeight = imgHeight;
          sWidth = imgHeight * targetRatio;
          sx = (imgWidth - sWidth) / 2;
          sy = 0;
        } else {
          // Source image is taller than target box: crop top and bottom
          sWidth = imgWidth;
          sHeight = imgWidth / targetRatio;
          sx = 0;
          sy = (imgHeight - sHeight) / 2;
        }

        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        console.error('Error cropping image:', err);
        resolve(imageSource);
      }
    };
    img.onerror = () => {
      resolve(imageSource);
    };
    img.src = imageSource;
  });
}

/**
 * Download single participant card in PDF format (85.60 mm x 53.98 mm)
 */
export async function downloadSingleCardPdf(
  peserta: Peserta,
  profil: ProfilLembaga,
  config?: CardTemplateConfig
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
  });

  await renderCardOnPdfPage(doc, peserta, profil, config);
  doc.save(`Kartu_${peserta.nomorMurid}_${peserta.namaPeserta.replace(/\s+/g, '_')}.pdf`);
}

/**
 * Download all cards in a single multi-page PDF file
 */
export async function downloadAllCardsPdf(
  pesertaList: Peserta[],
  profil: ProfilLembaga,
  config?: CardTemplateConfig
): Promise<void> {
  if (pesertaList.length === 0) return;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [CARD_WIDTH_MM, CARD_HEIGHT_MM],
  });

  for (let i = 0; i < pesertaList.length; i++) {
    if (i > 0) {
      doc.addPage([CARD_WIDTH_MM, CARD_HEIGHT_MM], 'landscape');
    }
    await renderCardOnPdfPage(doc, pesertaList[i], profil, config);
  }

  doc.save(`Kartu_Semua_Peserta_Digitalmeera_${Date.now()}.pdf`);
}

/**
 * Render one student card onto a jsPDF document page
 */
async function renderCardOnPdfPage(
  doc: jsPDF,
  peserta: Peserta,
  profil: ProfilLembaga,
  config?: CardTemplateConfig
): Promise<void> {
  const hasCustomTemplate = !!(config?.useCustomTemplate && config?.templateImage);
  const theme = config?.theme || 'modern-navy';

  // Palette warna background bawaan
  let primaryColor = [15, 23, 42]; // Slate 900
  let accentColor = [14, 165, 233]; // Sky 500
  let ribbonColor = [30, 41, 59]; // Slate 800

  if (theme === 'emerald-green') {
    primaryColor = [6, 78, 59];
    accentColor = [16, 185, 129];
    ribbonColor = [4, 120, 87];
  } else if (theme === 'royal-indigo') {
    primaryColor = [49, 46, 129];
    accentColor = [99, 102, 241];
    ribbonColor = [67, 56, 202];
  } else if (theme === 'crimson-amber') {
    primaryColor = [127, 29, 29];
    accentColor = [245, 158, 11];
    ribbonColor = [153, 27, 27];
  }

  if (hasCustomTemplate && config?.templateImage) {
    // 1. Gambar Template Kustom Background
    try {
      doc.addImage(config.templateImage, 'JPEG', 0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM);
    } catch (e) {
      console.warn('Failed to draw custom template on PDF, using fallback background', e);
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM, 'F');
    }
  } else {
    // 1. Background Theme Standar
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, CARD_WIDTH_MM, CARD_HEIGHT_MM, 'F');

    // Decorative Accent bar top
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.rect(0, 0, CARD_WIDTH_MM, 2, 'F');

    // LOGO LEMBAGA pada PDF
    let textStartX = 5;
    if (profil.logo && (profil.logo.startsWith('data:image') || profil.logo.startsWith('http'))) {
      try {
        doc.addImage(profil.logo, 'PNG', 4.5, 3.2, 7.5, 7.5);
        textStartX = 13.5;
      } catch {
        drawDefaultLogoEmblemPdf(doc, 4.5, 3.2, 7.5, accentColor);
        textStartX = 13.5;
      }
    } else {
      drawDefaultLogoEmblemPdf(doc, 4.5, 3.2, 7.5, accentColor);
      textStartX = 13.5;
    }

    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(profil.namaLembaga || 'DIGITALMEERA', textStartX, 7.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.setTextColor(186, 230, 253);
    doc.text('KARTU PESERTA RESMI', textStartX, 10.2);

    // Official Badge right top
    doc.setFillColor(ribbonColor[0], ribbonColor[1], ribbonColor[2]);
    doc.roundedRect(CARD_WIDTH_MM - 22, 3.5, 17.5, 6.2, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.text('OFFICIAL CARD', CARD_WIDTH_MM - 20.2, 7.8);

    // Inner card body container putih
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(3.5, 12.5, CARD_WIDTH_MM - 7, 34.5, 1.8, 1.8, 'F');
  }

  // 2. Foto Siswa (Kiri) - Crop center cover presisi sesuai preview sistem
  const photoX = 5.2;
  const photoY = 14;
  const photoW = 19;
  const photoH = 24.5;

  // Frame Foto
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(photoX, photoY, photoW, photoH, 0.8, 0.8, 'D');

  let photoDataUrl = '';
  if (peserta.foto) {
    try {
      photoDataUrl = await fetchPhotoAsDataUrl(peserta.foto);
    } catch {
      photoDataUrl = '';
    }
  }

  if (photoDataUrl) {
    try {
      // Crop image to exact 19x24.5 aspect ratio with object-cover
      const croppedPhotoDataUrl = await cropImageToCoverDataUrl(photoDataUrl, 380, 490);
      doc.addImage(croppedPhotoDataUrl, 'JPEG', photoX + 0.3, photoY + 0.3, photoW - 0.6, photoH - 0.6);
    } catch {
      drawPhotoPlaceholder(doc, photoX, photoY, photoW, photoH, peserta.namaPeserta);
    }
  } else {
    drawPhotoPlaceholder(doc, photoX, photoY, photoW, photoH, peserta.namaPeserta);
  }

  // Status Badge di bawah foto
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(photoX, 39.8, photoW, 4.4, 0.8, 0.8, 'F');
  doc.setTextColor(5, 150, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.8);
  doc.text(peserta.statusPeserta || 'Aktif', photoX + photoW / 2, 43, { align: 'center' });

  // 3. Info Siswa (Tengah) - Presisi tanpa bertumpukan
  const infoX = 26.5;

  // Nama Peserta (Auto adjust font size agar tidak terpotong)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  if (peserta.namaPeserta.length > 24) {
    doc.setFontSize(6.5);
  } else if (peserta.namaPeserta.length > 18) {
    doc.setFontSize(7.2);
  } else {
    doc.setFontSize(8.2);
  }
  const cleanNama = peserta.namaPeserta.length > 28 ? peserta.namaPeserta.substring(0, 27) + '...' : peserta.namaPeserta;
  doc.text(cleanNama, infoX, 17.2);

  // Nomor Murid Badge
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(infoX, 19.8, 23, 4.4, 0.8, 0.8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text(peserta.nomorMurid, infoX + 2, 23.1);

  // Label Program Kelas
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.2);
  doc.text('PROGRAM KELAS', infoX, 27.5);

  // Nilai Program Kelas (Tanpa Harga, bersih)
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  const cleanProgram = peserta.programKelas.replace(/\s*—\s*Rp[\d.,]+/g, '');
  doc.text(cleanProgram, infoX, 31.2);

  // Tanggal Pendaftaran
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.4);
  doc.text(`Tgl Daftar: ${peserta.tanggalPendaftaran || '-'}`, infoX, 35.2);

  // Nomor WhatsApp
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.4);
  doc.text(`WA: ${peserta.nomorWA || '-'}`, infoX, 39);

  // Orang Tua / Wali
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(4.2);
  const waliText = `Wali: ${peserta.orangTua || '-'}`;
  const truncatedWali = waliText.length > 22 ? waliText.substring(0, 21) + '...' : waliText;
  doc.text(truncatedWali, infoX, 42.6);

  // 4. QR Code di Sebelah Kanan (Ratio 1:1)
  const qrBoxX = 58.8;
  const qrBoxY = 13.8;
  const qrBoxW = 22.2;
  const qrBoxH = 32.2;

  // Box container putih 1:1 untuk QR Code
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(qrBoxX, qrBoxY, qrBoxW, qrBoxH, 1.2, 1.2, 'FD');

  const qrSizeMm = 18.5; // 1:1 square
  const qrX = qrBoxX + (qrBoxW - qrSizeMm) / 2;
  const qrY = qrBoxY + 1.6;

  const qrDataUrl = await generateQrCodeDataUrl(peserta.nomorMurid, {
    size: 260,
    margin: 1,
  });

  if (qrDataUrl) {
    try {
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSizeMm, qrSizeMm);
    } catch (err) {
      console.error('Failed to add QR Code to PDF', err);
    }
  }

  // Label di bawah QR Code
  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.text('SCAN PRESENSI', qrBoxX + qrBoxW / 2, qrBoxY + qrSizeMm + 5.2, { align: 'center' });

  doc.setTextColor(148, 163, 184);
  doc.setFont('courier', 'bold');
  doc.setFontSize(4.2);
  doc.text(peserta.nomorMurid, qrBoxX + qrBoxW / 2, qrBoxY + qrSizeMm + 8.8, { align: 'center' });

  // 5. Footer Kartu: Website www.digitalmeera.tech
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.text('www.digitalmeera.tech', CARD_WIDTH_MM / 2, CARD_HEIGHT_MM - 2.2, { align: 'center' });
}

function drawDefaultLogoEmblemPdf(
  doc: jsPDF,
  x: number,
  y: number,
  size: number,
  accentColor: number[]
) {
  doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.roundedRect(x, y, size, size, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.5);
  doc.text('DM', x + size / 2, y + size / 2 + 1.2, { align: 'center' });
}

function drawPhotoPlaceholder(doc: jsPDF, x: number, y: number, w: number, h: number, name: string) {
  doc.setFillColor(241, 245, 249);
  doc.rect(x + 0.3, y + 0.3, w - 0.6, h - 0.6, 'F');
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  const initials = name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'DM';
  doc.text(initials, x + w / 2, y + h / 2 + 2, { align: 'center' });
  doc.setFontSize(4);
  doc.text('FOTO SISWA', x + w / 2, y + h / 2 + 6, { align: 'center' });
}

/**
 * Render kartu ke resolusi tinggi Canvas lalu download sebagai file JPG (300 DPI)
 */
export async function downloadCardAsJpg(
  peserta: Peserta,
  profil: ProfilLembaga,
  config?: CardTemplateConfig
): Promise<void> {
  const canvas = document.createElement('canvas');
  const width = 1012; // Resolusi standar kartu ID-1 (300 DPI)
  const height = 638;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const hasCustomTemplate = !!(config?.useCustomTemplate && config?.templateImage);
  const theme = config?.theme || 'modern-navy';

  let primaryGrad1 = '#0f172a';
  let primaryGrad2 = '#1e293b';
  let accentColor = '#0ea5e9';

  if (theme === 'emerald-green') {
    primaryGrad1 = '#064e3b';
    primaryGrad2 = '#065f46';
    accentColor = '#10b981';
  } else if (theme === 'royal-indigo') {
    primaryGrad1 = '#312e81';
    primaryGrad2 = '#3730a3';
    accentColor = '#6366f1';
  } else if (theme === 'crimson-amber') {
    primaryGrad1 = '#7f1d1d';
    primaryGrad2 = '#991b1b';
    accentColor = '#f59e0b';
  }

  if (hasCustomTemplate && config?.templateImage) {
    // Background kustom dari file template kartu
    try {
      const tmplImg = new Image();
      tmplImg.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        tmplImg.onload = () => {
          ctx.drawImage(tmplImg, 0, 0, width, height);
          resolve(true);
        };
        tmplImg.onerror = () => resolve(false);
        tmplImg.src = config.templateImage!;
      });
    } catch {
      // fallback
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, primaryGrad1);
      grad.addColorStop(1, primaryGrad2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  } else {
    // 1. Background Theme bawaan
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, primaryGrad1);
    grad.addColorStop(1, primaryGrad2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Top accent bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(0, 0, width, 16);

    // LOGO LEMBAGA pada Canvas JPG
    let headerTextStartX = 42;
    let logoDrawn = false;
    if (profil.logo && (profil.logo.startsWith('data:image') || profil.logo.startsWith('http'))) {
      try {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        await new Promise((resolve) => {
          logoImg.onload = () => {
            ctx.drawImage(logoImg, 42, 28, 64, 64);
            logoDrawn = true;
            resolve(true);
          };
          logoImg.onerror = () => resolve(false);
          logoImg.src = profil.logo!;
        });
      } catch {}
    }

    if (!logoDrawn) {
      // Draw Modern Brand Emblem
      ctx.fillStyle = accentColor;
      roundRect(ctx, 42, 28, 64, 64, 12);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DM', 74, 71);
      ctx.textAlign = 'left';
    }
    headerTextStartX = 120;

    // Header Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(profil.namaLembaga || 'DIGITALMEERA', headerTextStartX, 62);

    ctx.fillStyle = '#7dd3fc';
    ctx.font = '600 15px sans-serif';
    ctx.fillText('KARTU PESERTA RESMI', headerTextStartX, 88);

    // Official badge
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, width - 210, 40, 168, 44, 10);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OFFICIAL CARD', width - 210 + 84, 68);
    ctx.textAlign = 'left';

    // Inner card body container putih
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    roundRect(ctx, 36, 115, 940, 450, 18);
    ctx.fill();
  }

  // 2. Photo Siswa (Kiri) - Crop center cover presisi sesuai preview web
  const photoX = 56;
  const photoY = 135;
  const photoW = 220;
  const photoH = 285;

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 3;
  roundRect(ctx, photoX, photoY, photoW, photoH, 12);
  ctx.stroke();

  let photoRendered = false;
  let photoDataUrl = '';
  if (peserta.foto) {
    try {
      photoDataUrl = await fetchPhotoAsDataUrl(peserta.foto);
    } catch {
      photoDataUrl = '';
    }
  }

  if (photoDataUrl) {
    try {
      const croppedPhotoUrl = await cropImageToCoverDataUrl(photoDataUrl, photoW * 2, photoH * 2);
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = () => {
          ctx.save();
          roundRect(ctx, photoX, photoY, photoW, photoH, 12);
          ctx.clip();
          ctx.drawImage(img, photoX, photoY, photoW, photoH);
          ctx.restore();
          photoRendered = true;
          resolve(true);
        };
        img.onerror = () => resolve(false);
        img.src = croppedPhotoUrl;
      });
    } catch {
      // fallback to placeholder
    }
  }

  if (!photoRendered) {
    ctx.fillStyle = '#f1f5f9';
    roundRect(ctx, photoX, photoY, photoW, photoH, 12);
    ctx.fill();
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    const initials = peserta.namaPeserta.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || 'DM';
    ctx.fillText(initials, photoX + photoW / 2, photoY + photoH / 2 + 10);
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('FOTO SISWA', photoX + photoW / 2, photoY + photoH / 2 + 40);
    ctx.textAlign = 'left';
  }

  // Status Badge di bawah foto
  ctx.fillStyle = '#ecfdf5';
  roundRect(ctx, photoX, 435, photoW, 46, 10);
  ctx.fill();
  ctx.fillStyle = '#059669';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`● ${peserta.statusPeserta || 'Aktif'}`, photoX + photoW / 2, 464);
  ctx.textAlign = 'left';

  // 3. Student details (Tengah) - Presisi tanpa tumpang tindih
  const infoX = 305;
  ctx.fillStyle = '#0f172a';
  if (peserta.namaPeserta.length > 24) {
    ctx.font = 'bold 22px sans-serif';
  } else if (peserta.namaPeserta.length > 18) {
    ctx.font = 'bold 25px sans-serif';
  } else {
    ctx.font = 'bold 28px sans-serif';
  }
  const cleanNamaJpg = peserta.namaPeserta.length > 28 ? peserta.namaPeserta.substring(0, 27) + '...' : peserta.namaPeserta;
  ctx.fillText(cleanNamaJpg, infoX, 175);

  // Student ID Badge
  ctx.fillStyle = accentColor;
  roundRect(ctx, infoX, 195, 200, 46, 10);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 23px monospace';
  ctx.fillText(peserta.nomorMurid, infoX + 20, 226);

  // Program Kelas Label
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('PROGRAM KELAS', infoX, 278);

  // Program Kelas Value (Tanpa Harga)
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 22px sans-serif';
  const cleanProgramJpg = peserta.programKelas.replace(/\s*—\s*Rp[\d.,]+/g, '');
  ctx.fillText(cleanProgramJpg, infoX, 310);

  // Tanggal Pendaftaran
  ctx.fillStyle = '#64748b';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Tgl Daftar: ${peserta.tanggalPendaftaran || '-'}`, infoX, 355);

  // WhatsApp
  ctx.fillStyle = '#475569';
  ctx.font = '16px sans-serif';
  ctx.fillText(`No. WhatsApp: ${peserta.nomorWA || '-'}`, infoX, 395);

  // Wali
  ctx.fillStyle = '#64748b';
  ctx.font = '16px sans-serif';
  ctx.fillText(`Orang Tua / Wali: ${peserta.orangTua || '-'}`, infoX, 435);

  // 4. QR Code di Sebelah Kanan (Rasio 1:1)
  const qrContainerX = 705;
  const qrContainerY = 135;
  const qrContainerW = 245;
  const qrContainerH = 390;

  // Box container putih untuk QR Code
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 2.5;
  roundRect(ctx, qrContainerX, qrContainerY, qrContainerW, qrContainerH, 16);
  ctx.fill();
  ctx.stroke();

  const qrSizePx = 210; // 1:1 Square
  const qrX = qrContainerX + (qrContainerW - qrSizePx) / 2;
  const qrY = qrContainerY + 20;

  const qrDataUrl = await generateQrCodeDataUrl(peserta.nomorMurid, {
    size: 320,
    margin: 1,
  });

  if (qrDataUrl) {
    const qrImg = new Image();
    await new Promise((resolve) => {
      qrImg.onload = () => {
        ctx.drawImage(qrImg, qrX, qrY, qrSizePx, qrSizePx);
        resolve(true);
      };
      qrImg.onerror = () => resolve(false);
      qrImg.src = qrDataUrl;
    });
  }

  // Label di bawah QR Code
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SCAN PRESENSI', qrContainerX + qrContainerW / 2, qrY + qrSizePx + 40);

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(peserta.nomorMurid, qrContainerX + qrContainerW / 2, qrY + qrSizePx + 72);
  ctx.textAlign = 'left';

  // 5. Footer Website www.digitalmeera.tech
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.fillText('www.digitalmeera.tech', width / 2, 608);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';

  const link = document.createElement('a');
  link.download = `Kartu_${peserta.nomorMurid}_${peserta.namaPeserta.replace(/\s+/g, '_')}.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y + r, x, y, r);
  ctx.closePath();
}

/**
 * Export Laporan Rekap Absensi ke PDF format A4
 */
export function exportAbsensiToPdf(
  data: Absensi[],
  profil: ProfilLembaga,
  periodInfo: string
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Lembaga
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  doc.text(profil.namaLembaga || 'DIGITALMEERA', pageWidth / 2, 18, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(profil.alamat || 'Lembaga Kursus & Les Privat Komputer', pageWidth / 2, 23, { align: 'center' });
  doc.text(`WA: ${profil.nomorWA || '-'} | Email: ${profil.email || '-'} | www.digitalmeera.tech`, pageWidth / 2, 27, { align: 'center' });

  // Garis Pemisah Kop
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.6);
  doc.line(14, 30, pageWidth - 14, 30);

  // Judul Dokumen
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN PRESENSI & KEHADIRAN SISWA', 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`Periode: ${periodInfo}`, 14, 43);
  doc.text(`Total Kehadiran: ${data.length} data`, pageWidth - 14, 43, { align: 'right' });

  // Tabel Header
  let tableY = 48;
  const rowHeight = 7;

  doc.setFillColor(30, 41, 59);
  doc.rect(14, tableY, pageWidth - 28, rowHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('No', 16, tableY + 4.8);
  doc.text('Tanggal', 24, tableY + 4.8);
  doc.text('Waktu', 44, tableY + 4.8);
  doc.text('ID Siswa', 59, tableY + 4.8);
  doc.text('Nama Peserta', 77, tableY + 4.8);
  doc.text('Program', 122, tableY + 4.8);
  doc.text('Shift', 152, tableY + 4.8);
  doc.text('Status', 174, tableY + 4.8);

  tableY += rowHeight;

  // Rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  data.forEach((item, index) => {
    if (tableY > 260) {
      doc.addPage();
      tableY = 20;
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, tableY, pageWidth - 28, rowHeight, 'F');
    }

    doc.setTextColor(51, 65, 85);
    doc.text((index + 1).toString(), 16, tableY + 4.8);
    doc.text(item.tanggal, 24, tableY + 4.8);
    doc.text(item.waktu, 44, tableY + 4.8);
    doc.text(item.nomorMurid, 59, tableY + 4.8);

    const nameTrunc = item.namaPeserta.length > 24 ? item.namaPeserta.substring(0, 24) + '...' : item.namaPeserta;
    doc.text(nameTrunc, 77, tableY + 4.8);

    const progClean = item.programKelas.replace(/\s*—\s*Rp[\d.,]+/g, '');
    const progTrunc = progClean.length > 18 ? progClean.substring(0, 18) + '...' : progClean;
    doc.text(progTrunc, 122, tableY + 4.8);
    doc.text(item.shift, 152, tableY + 4.8);

    // Status color
    if (item.statusPresensi === 'Hadir') {
      doc.setTextColor(16, 185, 129);
    } else {
      doc.setTextColor(239, 68, 68);
    }
    doc.text(item.statusPresensi, 174, tableY + 4.8);

    tableY += rowHeight;
  });

  // Tanda Tangan
  if (tableY > 240) {
    doc.addPage();
    tableY = 20;
  }
  tableY += 12;

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Dicetak pada: ${todayStr}`, 14, tableY);

  doc.text(`Mengetahui,`, pageWidth - 60, tableY);
  doc.text(`Pimpinan Kursus DIGITALMEERA`, pageWidth - 60, tableY + 4);
  doc.text(`( .................................................. )`, pageWidth - 60, tableY + 24);

  doc.save(`Laporan_Absensi_Digitalmeera_${Date.now()}.pdf`);
}
