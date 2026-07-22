import { getReceiptSiteUrl } from './escpos';
import type { Order, ShopSettings } from './types';

/**
 * Render receipt as a 1-bit bitmap and print via ESC/POS raster (GS v 0).
 * Works on Ztech/POS80 clones that feed paper but print blank text.
 */

const ESC = 0x1b;
const GS = 0x1d;

function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function moneyPlain(value: number | string): string {
  const n = Math.round(typeof value === 'string' ? Number(value) : value) || 0;
  return `Rs ${n}`;
}

function openCashDrawerCommand(): Uint8Array {
  return concat(
    new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]),
    new Uint8Array([ESC, 0x70, 0x01, 0x19, 0xfa]),
  );
}

function cutPaper(): Uint8Array {
  return concat(
    new Uint8Array([ESC, 0x64, 0x05]),
    new Uint8Array([GS, 0x56, 0x00]),
  );
}

async function loadQrImage(data: string): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=4&data=${encodeURIComponent(data)}`;
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/** Convert canvas to ESC/POS raster bitmap (GS v 0). */
function canvasToRasterEscPos(canvas: HTMLCanvasElement): Uint8Array {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.getImageData(0, 0, width, height);
  const bytesPerRow = Math.ceil(width / 8);
  const bitmap = new Uint8Array(bytesPerRow * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = image.data[i];
      const g = image.data[i + 1];
      const b = image.data[i + 2];
      // Dark pixels → black (print)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 160) {
        bitmap[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }

  const xL = bytesPerRow & 0xff;
  const xH = (bytesPerRow >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;

  return concat(
    new Uint8Array([ESC, 0x40]), // init
    new Uint8Array([ESC, 0x61, 0x01]), // center
    new Uint8Array([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]),
    bitmap,
    new Uint8Array([ESC, 0x61, 0x00]),
    new Uint8Array([0x0a, 0x0a]),
  );
}

async function renderReceiptCanvas(
  order: Order,
  shop?: ShopSettings | null,
): Promise<HTMLCanvasElement> {
  const width = 576; // 80mm @ ~203dpi
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const pad = 16;
  const contentW = width - pad * 2;
  const siteUrl = getReceiptSiteUrl().replace(/\/$/, '');
  const menuUrl = `${siteUrl}/menu`;
  const shopName = shop?.name || 'The Brewing Cottage';

  // Measure height first with a temporary canvas height
  let y = pad;
  const line = (size: number, gap = 4) => {
    y += size + gap;
  };

  // Estimate height
  let est = pad;
  est += 36 + 8; // title
  est += 18 + 6;
  if (shop?.phone) est += 16;
  if (shop?.address) est += 32;
  est += 12;
  est += 18 * 4;
  est += 12;
  for (const item of order.items || []) {
    est += 18 + 16;
  }
  est += 18 * 4 + 12;
  est += 200; // QR block
  est += 40;
  est += pad;

  canvas.width = width;
  canvas.height = Math.ceil(est / 8) * 8; // row align

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  y = pad;

  const centerText = (text: string, size: number, bold = false) => {
    ctx.font = `${bold ? 'bold ' : ''}${size}px Arial, Helvetica, sans-serif`;
    const tw = ctx.measureText(text).width;
    ctx.fillText(text, (width - tw) / 2, y);
    y += size + 6;
  };

  const leftText = (text: string, size = 18) => {
    ctx.font = `${size}px Arial, Helvetica, sans-serif`;
    for (const part of wrapText(ctx, text, contentW)) {
      ctx.fillText(part, pad, y);
      y += size + 4;
    }
  };

  const row = (left: string, right: string, size = 18, bold = false) => {
    ctx.font = `${bold ? 'bold ' : ''}${size}px Arial, Helvetica, sans-serif`;
    ctx.fillText(left, pad, y);
    const tw = ctx.measureText(right).width;
    ctx.fillText(right, width - pad - tw, y);
    y += size + 6;
  };

  const rule = () => {
    y += 4;
    ctx.fillRect(pad, y, contentW, 2);
    y += 10;
  };

  centerText(shopName, 28, true);
  centerText('TAX INVOICE / RECEIPT', 16);
  if (shop?.phone) centerText(shop.phone, 14);
  if (shop?.address) {
    ctx.font = '14px Arial, Helvetica, sans-serif';
    for (const part of wrapText(ctx, shop.address, contentW)) {
      const tw = ctx.measureText(part).width;
      ctx.fillText(part, (width - tw) / 2, y);
      y += 18;
    }
  }

  rule();
  leftText(`Order : ${order.orderNumber}`);
  leftText(`Date  : ${new Date(order.createdAt).toLocaleString('en-GB')}`);
  leftText(`Cust  : ${order.createdBy?.name || 'Walk-in'}`);
  leftText(`Pay   : ${order.paymentMethod}  ${order.status}`);
  if (order.note) leftText(`Note  : ${order.note}`);
  rule();
  row('ITEM', 'AMOUNT', 16, true);
  ctx.fillRect(pad, y, contentW, 1);
  y += 8;

  for (const item of order.items || []) {
    leftText(item.productName, 18);
    row(
      `  ${item.quantity} x ${moneyPlain(item.unitPrice)}`,
      moneyPlain(item.lineTotal),
      16,
    );
  }

  rule();
  row('Subtotal', moneyPlain(order.subtotal));
  row('Tax', moneyPlain(order.tax));
  row('TOTAL', moneyPlain(order.total), 22, true);
  rule();

  centerText('Scan for menu & online orders', 15, true);

  const qr = await loadQrImage(menuUrl);
  if (qr) {
    const qrSize = 160;
    ctx.drawImage(qr, (width - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize + 8;
  }

  centerText(menuUrl.replace(/^https?:\/\//, ''), 12);
  centerText(`Thank you for choosing ${shopName}`, 14);
  y += 8;

  // Crop unused white space
  const finalH = Math.min(canvas.height, Math.ceil((y + pad) / 8) * 8);
  if (finalH < canvas.height) {
    const cropped = document.createElement('canvas');
    cropped.width = width;
    cropped.height = finalH;
    cropped.getContext('2d')!.drawImage(canvas, 0, 0);
    return cropped;
  }
  return canvas;
}

export async function buildRasterReceiptEscPos(
  order: Order,
  shop?: ShopSettings | null,
  options?: { openDrawer?: boolean; cut?: boolean },
): Promise<Uint8Array> {
  const canvas = await renderReceiptCanvas(order, shop);
  const chunks: Uint8Array[] = [canvasToRasterEscPos(canvas)];
  if (options?.cut !== false) chunks.push(cutPaper());
  if (options?.openDrawer) chunks.push(openCashDrawerCommand());
  return concat(...chunks);
}

export async function buildRasterTestEscPos(): Promise<Uint8Array> {
  const width = 384;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, width, canvas.height);
  ctx.fillStyle = '#000';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('BREW & BEAN', width / 2, 50);
  ctx.font = '20px Arial';
  ctx.fillText('PRINTER TEST OK', width / 2, 90);
  // Solid black bar — proves thermal head works
  ctx.fillRect(40, 120, width - 80, 24);
  ctx.font = '14px Arial';
  ctx.fillText('If you see text + black bar, print works', width / 2, 170);
  ctx.fillText(new Date().toLocaleString('en-GB'), width / 2, 200);

  const site = getReceiptSiteUrl().replace(/\/$/, '') + '/menu';
  const qr = await loadQrImage(site);
  if (qr) ctx.drawImage(qr, (width - 100) / 2, 210, 100, 100);

  return concat(canvasToRasterEscPos(canvas), cutPaper());
}
