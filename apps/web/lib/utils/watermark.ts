/**
 * Applies a centered italic watermark to an image using the Canvas API.
 * Dual-layer technique (white + dark) makes it visible on any background.
 */
export async function applyWatermarkToBlob(source: Blob, shopName: string): Promise<Blob> {
  // Get the actual font-family name next/font injected (it's a hashed internal name,
  // not 'Cormorant Garamond' directly). Falls back to Georgia if unavailable.
  const cssFont = getComputedStyle(document.documentElement)
    .getPropertyValue('--font-serif')
    .trim();
  const fontFamily = cssFont || 'Georgia, serif';

  const bitmap = await createImageBitmap(source);
  const { width, height } = bitmap; // capture before close()

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const fontSize = Math.round(Math.min(width, height) * 0.07);
  const maxWidth = Math.round(width * 0.75);
  const cx = width / 2;
  const cy = height / 2;

  ctx.font = `italic ${fontSize}px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  // Dark layer — visible on light backgrounds
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#1a1a1a';
  ctx.fillText(shopName, cx + 1, cy + 1, maxWidth);

  // White layer — visible on dark backgrounds
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(shopName, cx, cy, maxWidth);

  ctx.globalAlpha = 1;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      source.type || 'image/jpeg',
      0.93,
    );
  });
}
