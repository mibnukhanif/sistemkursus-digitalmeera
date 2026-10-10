import QRCode from 'qrcode';

/**
 * Generate a PNG Data URL for a given QR Code value
 */
export async function generateQrCodeDataUrl(
  value: string,
  options?: {
    size?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }
): Promise<string> {
  const size = options?.size || 260;
  const margin = options?.margin ?? 1;
  const dark = options?.darkColor || '#0f172a';
  const light = options?.lightColor || '#ffffff';

  try {
    return await QRCode.toDataURL(value, {
      width: size,
      margin: margin,
      errorCorrectionLevel: 'M',
      color: {
        dark: dark,
        light: light,
      },
    });
  } catch (err) {
    console.error('Failed to generate QR Code:', err);
    return '';
  }
}

/**
 * Render QR Code directly into a Canvas element
 */
export async function renderQrCodeToCanvas(
  canvas: HTMLCanvasElement,
  value: string,
  options?: {
    size?: number;
    margin?: number;
    darkColor?: string;
    lightColor?: string;
  }
): Promise<void> {
  const size = options?.size || 240;
  const margin = options?.margin ?? 1;
  const dark = options?.darkColor || '#0f172a';
  const light = options?.lightColor || '#ffffff';

  try {
    await QRCode.toCanvas(canvas, value, {
      width: size,
      margin: margin,
      errorCorrectionLevel: 'M',
      color: {
        dark: dark,
        light: light,
      },
    });
  } catch (err) {
    console.error('Failed to render QR Code on canvas:', err);
  }
}
