import JsBarcode from 'jsbarcode';

export interface BarcodeRenderOptions {
  format?: 'CODE128' | 'CODE39' | 'EAN13';
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  background?: string;
  lineColor?: string;
}

/**
 * Generate a PNG data URL for a given barcode value
 */
export function generateBarcodeDataUrl(
  value: string,
  options?: BarcodeRenderOptions
): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, value, {
      format: options?.format || 'CODE128',
      width: options?.width || 2,
      height: options?.height || 60,
      displayValue: options?.displayValue ?? true,
      fontSize: options?.fontSize || 14,
      font: 'monospace',
      textMargin: 3,
      margin: options?.margin ?? 6,
      background: options?.background || '#ffffff',
      lineColor: options?.lineColor || '#000000',
    });
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.error('Failed to generate barcode data URL:', err);
    return '';
  }
}

/**
 * Render barcode into an existing HTML SVG element
 */
export function renderBarcodeSvg(
  svgElement: SVGSVGElement,
  value: string,
  options?: BarcodeRenderOptions
): void {
  try {
    JsBarcode(svgElement, value, {
      format: options?.format || 'CODE128',
      width: options?.width || 2,
      height: options?.height || 50,
      displayValue: options?.displayValue ?? true,
      fontSize: options?.fontSize || 14,
      font: 'monospace',
      textMargin: 2,
      margin: options?.margin ?? 4,
      background: options?.background || 'transparent',
      lineColor: options?.lineColor || '#0f172a',
    });
  } catch (err) {
    console.error('Barcode rendering error:', err);
  }
}
