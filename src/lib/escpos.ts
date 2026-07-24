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
      return 'https://thebrewingcottage.com';
    }
    return origin;
  }
  return 'https://thebrewingcottage.com';
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

function tableHeader(width: number): string {
  const qtyW = 4;
  const priceW = 8;
  const nameW = Math.max(10, width - qtyW - priceW - 2);
  const name = 'ITEM'.padEnd(nameW).slice(0, nameW);
  const qty = 'QTY'.padStart(qtyW);
  const price = 'TOTAL'.padStart(priceW);
  return `${name} ${qty} ${price}`;
}

function tableRow(
  name: string,
  qty: number,
  total: number | string,
  width: number,
): string[] {
  const qtyW = 4;
  const priceW = 8;
  const nameW = Math.max(10, width - qtyW - priceW - 2);
  const price = moneyAscii(total).padStart(priceW).slice(-priceW);
  const qtyStr = String(qty).padStart(qtyW);
  const clean = toAscii(name);
  if (clean.length <= nameW) {
    return [`${clean.padEnd(nameW)} ${qtyStr} ${price}`];
  }
  const first = clean.slice(0, nameW);
  const rest = clean.slice(nameW);
  return [
    `${first.padEnd(nameW)} ${qtyStr} ${price}`,
    rest.slice(0, width),
  ];
}

/**
 * Customer thermal receipt — table layout, #CUSTOMER tag, QR to website home.
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
  const shopName = toAscii(shop?.name || 'The Brewing Cottage') || 'The Brewing Cottage';
  const siteUrl = (options?.siteUrl || getReceiptSiteUrl()).replace(/\/$/, '');
  const includeQr = options?.includeQr !== false;

  const lines: string[] = [];
  lines.push(center('# CUSTOMER', width));
  lines.push(center(shopName, width));
  lines.push(center('TAX INVOICE / RECEIPT', width));
  if (shop?.phone) lines.push(center(toAscii(shop.phone), width));
  if (shop?.address) lines.push(center(toAscii(shop.address).slice(0, width), width));
  lines.push('='.repeat(width));
  lines.push(`Order: ${toAscii(order.orderNumber)}`);
  lines.push(`Date : ${toAscii(new Date(order.createdAt).toLocaleString('en-GB'))}`);
  lines.push(`Pay  : ${toAscii(order.paymentMethod || 'UNPAID')}`);
  if (order.note) lines.push(`Note : ${toAscii(order.note).slice(0, width - 7)}`);
  lines.push('-'.repeat(width));
  lines.push(tableHeader(width));
  lines.push('-'.repeat(width));

  for (const item of order.items || []) {
    lines.push(...tableRow(item.productName, item.quantity, item.lineTotal, width));
  }

  lines.push('-'.repeat(width));
  lines.push(padPair('Subtotal', moneyAscii(order.subtotal), width));
  lines.push(padPair('Tax', moneyAscii(order.tax), width));
  lines.push(padPair('TOTAL', moneyAscii(order.total), width));
  lines.push('='.repeat(width));
  lines.push(center('Scan QR to visit us online', width));
  lines.push('');

  const chunks: Uint8Array[] = [
    initPrinter(),
    new Uint8Array([ESC, 0x21, 0x30]),
    encodeLines([center('# CUSTOMER', 21), center(shopName, 21)]),
    new Uint8Array([ESC, 0x21, 0x00]),
    encodeLines(lines.slice(2)),
  ];

  if (includeQr) {
    chunks.push(qrCodeEscPos(siteUrl, 4));
  }

  chunks.push(encodeLines(['', center('Thank you!', width), '', '']));

  if (options?.cut !== false) chunks.push(cutPaper());
  if (options?.openDrawer) chunks.push(openCashDrawerCommand());

  return concat(...chunks);
}

/**
 * Kitchen ticket — items + qty only (no prices / QR).
 */
export function buildKitchenTicketEscPos(
  order: Order,
  shop?: ShopSettings | null,
  options?: { cut?: boolean; width?: number },
): Uint8Array {
  const width = options?.width ?? 42;
  const shopName = toAscii(shop?.name || 'The Brewing Cottage') || 'The Brewing Cottage';
  const lines: string[] = [];
  lines.push(center('# KITCHEN ORDER', width));
  lines.push(center(shopName, width));
  lines.push('='.repeat(width));
  lines.push(`Order: ${toAscii(order.orderNumber)}`);
  lines.push(`Time : ${toAscii(new Date(order.createdAt).toLocaleString('en-GB'))}`);
  lines.push(`Source: ${toAscii(order.source || 'POS')}`);
  if (order.note) lines.push(`Note : ${toAscii(order.note).slice(0, width - 7)}`);
  lines.push('-'.repeat(width));
  lines.push(padPair('QTY', 'ITEM', width));
  lines.push('-'.repeat(width));

  for (const item of order.items || []) {
    const qty = String(item.quantity).padStart(3);
    const name = toAscii(item.productName);
    lines.push(`${qty}  ${name}`.slice(0, width));
    if (name.length > width - 5) {
      lines.push(`     ${name.slice(width - 5)}`.slice(0, width));
    }
  }

  lines.push('='.repeat(width));
  lines.push(center('PREPARE & SERVE', width));
  lines.push('');

  const chunks: Uint8Array[] = [
    initPrinter(),
    new Uint8Array([ESC, 0x21, 0x30]),
    encodeLines([center('# KITCHEN', 21), center('ORDER TICKET', 21)]),
    new Uint8Array([ESC, 0x21, 0x00]),
    encodeLines(lines.slice(2)),
  ];

  if (options?.cut !== false) chunks.push(cutPaper());
  return concat(...chunks);
}

export function buildTestPrintEscPos(siteUrl?: string): Uint8Array {
  const url = (siteUrl || getReceiptSiteUrl()).replace(/\/$/, '');
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
      'QR -> website:',
      '',
    ]),
    qrCodeEscPos(url, 4),
    encodeLines(['', '', '']),
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
