import type { Order, ShopSettings } from './types';

/**
 * Minimal ESC/POS for Ztech IT-800 / POS80.
 * Keep commands tiny — fancy init/raster often yields blank paper + feed only.
 */

const ESC = 0x1b;
const GS = 0x1d;

export function concat(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function toAscii(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** LF only (0x0A). CR breaks some POS80 clones. */
function encodeLines(lines: string[]): Uint8Array {
  const text = lines.map((l) => toAscii(l)).join('\n') + '\n';
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0x7f;
  return out;
}

function moneyAscii(value: number | string): string {
  const n = Math.round(typeof value === 'string' ? Number(value) : value) || 0;
  return `Rs ${n}`;
}

export function getReceiptSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://coffee-vm1s.vercel.app';
    }
    return origin;
  }
  return 'https://coffee-vm1s.vercel.app';
}

/** Only ESC @ — anything more can blank some clones. */
export function initPrinter(): Uint8Array {
  return new Uint8Array([ESC, 0x40]);
}

export function openCashDrawerCommand(): Uint8Array {
  return concat(
    new Uint8Array([ESC, 0x70, 0x00, 0x40, 0x50]),
    new Uint8Array([ESC, 0x70, 0x01, 0x40, 0x50]),
  );
}

export function cutPaper(): Uint8Array {
  // Feed then cut
  return concat(
    new Uint8Array([ESC, 0x64, 0x06]),
    new Uint8Array([GS, 0x56, 0x41, 0x03]),
  );
}

function padPair(left: string, right: string, width: number): string {
  const l = toAscii(left).slice(0, width - 1);
  const r = toAscii(right).slice(0, width - l.length - 1);
  const spaces = Math.max(1, width - l.length - r.length);
  return l + ' '.repeat(spaces) + r;
}

function center(text: string, width: number): string {
  const t = toAscii(text).slice(0, width);
  const pad = Math.max(0, Math.floor((width - t.length) / 2));
  return ' '.repeat(pad) + t;
}

/** Epson QR (optional — skip if printer ignores it). */
export function qrCodeEscPos(data: string, moduleSize = 4): Uint8Array {
  const bytes = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i) & 0x7f;
  const storeLen = bytes.length + 3;
  return concat(
    new Uint8Array([ESC, 0x61, 0x01]), // center
    new Uint8Array([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize]),
    new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30]),
    new Uint8Array([
      GS,
      0x28,
      0x6b,
      storeLen & 0xff,
      (storeLen >> 8) & 0xff,
      0x31,
      0x50,
      0x30,
    ]),
    bytes,
    new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]),
    new Uint8Array([ESC, 0x61, 0x00]),
    new Uint8Array([0x0a]),
  );
}

/**
 * Simple text receipt — primary path for Cash / Print.
 * No UTF-8, no fancy fonts, no raster.
 */
export function buildReceiptEscPos(
  order: Order,
  shop?: ShopSettings | null,
  options?: {
    openDrawer?: boolean;
    cut?: boolean;
    width?: number;
    siteUrl?: string;
    includeQr?: boolean;
  },
): Uint8Array {
  const width = options?.width ?? 42;
  const shopName = toAscii(shop?.name || 'Brew & Bean') || 'Brew & Bean';
  const siteUrl = (options?.siteUrl || getReceiptSiteUrl()).replace(/\/$/, '');
  const menuUrl = `${siteUrl}/menu`;
  const includeQr = options?.includeQr !== false;

  const lines: string[] = [];
  lines.push(center(shopName, width));
  lines.push(center('TAX INVOICE / RECEIPT', width));
  if (shop?.phone) lines.push(center(toAscii(shop.phone), width));
  if (shop?.address) lines.push(center(toAscii(shop.address).slice(0, width), width));
  lines.push('-'.repeat(width));
  lines.push(`Order: ${toAscii(order.orderNumber)}`);
  lines.push(`Date : ${toAscii(new Date(order.createdAt).toLocaleString('en-GB'))}`);
  lines.push(`Cust : ${toAscii(order.createdBy?.name || 'Walk-in')}`);
  lines.push(`Pay  : ${toAscii(order.paymentMethod)}`);
  lines.push('-'.repeat(width));

  for (const item of order.items || []) {
    lines.push(toAscii(item.productName).slice(0, width));
    lines.push(
      padPair(
        ` ${item.quantity} x ${moneyAscii(item.unitPrice)}`,
        moneyAscii(item.lineTotal),
        width,
      ),
    );
  }

  lines.push('-'.repeat(width));
  lines.push(padPair('Subtotal', moneyAscii(order.subtotal), width));
  lines.push(padPair('Tax', moneyAscii(order.tax), width));
  lines.push(padPair('TOTAL', moneyAscii(order.total), width));
  lines.push('-'.repeat(width));
  lines.push(center('Scan QR for menu', width));
  lines.push('');

  const chunks: Uint8Array[] = [
    initPrinter(),
    // Double-size title line via ESC !
    new Uint8Array([ESC, 0x21, 0x30]),
    encodeLines([center(shopName, 21)]),
    new Uint8Array([ESC, 0x21, 0x00]),
    encodeLines(lines.slice(1)),
  ];

  if (includeQr) {
    chunks.push(encodeLines([center('Menu online:', width)]));
    chunks.push(qrCodeEscPos(menuUrl, 4));
    chunks.push(encodeLines([center(menuUrl.replace('https://', ''), width)]));
  }

  chunks.push(encodeLines(['', center('Thank you!', width), '', '']));

  if (options?.cut !== false) chunks.push(cutPaper());
  if (options?.openDrawer) chunks.push(openCashDrawerCommand());

  return concat(...chunks);
}

export function buildTestPrintEscPos(siteUrl?: string): Uint8Array {
  const url = (siteUrl || getReceiptSiteUrl()).replace(/\/$/, '') + '/menu';
  return concat(
    initPrinter(),
    new Uint8Array([ESC, 0x21, 0x30]),
    encodeLines(['  PRINT TEST OK  ']),
    new Uint8Array([ESC, 0x21, 0x00]),
    encodeLines([
      '--------------------------',
      'If you can read this,',
      'thermal print is working.',
      toAscii(new Date().toLocaleString('en-GB')),
      '--------------------------',
      'QR -> website menu:',
      '',
    ]),
    qrCodeEscPos(url, 4),
    encodeLines(['', url.replace('https://', ''), '', '']),
    cutPaper(),
  );
}

export function buildDrawerOnlyEscPos(): Uint8Array {
  return concat(initPrinter(), openCashDrawerCommand());
}

/** Absolute minimal bytes — for debugging blank paper. */
export function buildHelloEscPos(): Uint8Array {
  return concat(
    new Uint8Array([ESC, 0x40]),
    encodeLines([
      'HELLO FROM BREW AND BEAN',
      '123456789012345678901234',
      'ABCDEFGHIJKLMNOPQRSTUVWX',
      '************************',
      '',
      '',
      '',
    ]),
    new Uint8Array([ESC, 0x64, 0x05]),
  );
}
