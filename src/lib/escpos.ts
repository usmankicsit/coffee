import type { Order, ShopSettings } from './types';

/**
 * ESC/POS for Ztech IT-800 / POS80 (80mm).
 * ASCII + CR/LF, large headers, Epson QR — clones often print blank with UTF-8.
 */

const ESC = 0x1b;
const GS = 0x1d;
const FS = 0x1c;

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

function toAscii(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '');
}

function encodeAscii(text: string): Uint8Array {
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n');
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0x7f;
  return out;
}

function moneyAscii(value: number | string): string {
  const n = Math.round(typeof value === 'string' ? Number(value) : value) || 0;
  return `Rs ${n}`;
}

/** Public site URL for QR (customers scan receipt → website). */
export function getReceiptSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/$/, '');
    // Prefer live site when testing on localhost so QR is useful for customers
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return 'https://coffee-vm1s.vercel.app';
    }
    return origin;
  }
  return 'https://coffee-vm1s.vercel.app';
}

export function initPrinter(): Uint8Array {
  return concat(
    new Uint8Array([ESC, 0x40]), // reset
    new Uint8Array([ESC, 0x53]), // standard mode (cancel page mode)
    new Uint8Array([FS, 0x2e]), // cancel Chinese character mode (FS .)
    new Uint8Array([ESC, 0x74, 0x00]), // code page PC437
    new Uint8Array([ESC, 0x52, 0x00]), // international character set USA
    new Uint8Array([ESC, 0x4d, 0x00]), // Font A
    new Uint8Array([ESC, 0x61, 0x00]), // left align
    new Uint8Array([ESC, 0x32]), // default line spacing
    new Uint8Array([ESC, 0x21, 0x00]), // normal size
  );
}

export function openCashDrawerCommand(): Uint8Array {
  // Try drawer pin 2 and pin 5 (some cables use either)
  return concat(
    new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]),
    new Uint8Array([ESC, 0x70, 0x01, 0x19, 0xfa]),
  );
}

export function cutPaper(): Uint8Array {
  return concat(
    new Uint8Array([ESC, 0x64, 0x04]), // feed 4 lines
    new Uint8Array([GS, 0x56, 0x00]), // full cut
  );
}

function setAlign(n: 0 | 1 | 2): Uint8Array {
  return new Uint8Array([ESC, 0x61, n]);
}

function setSize(flags: number): Uint8Array {
  return new Uint8Array([ESC, 0x21, flags]);
}

function textLine(text: string): Uint8Array {
  return encodeAscii(`${toAscii(text)}\n`);
}

function pairLine(left: string, right: string, width: number): Uint8Array {
  const l = toAscii(left);
  const r = toAscii(right);
  const space = Math.max(1, width - l.length - r.length);
  return encodeAscii(`${l}${' '.repeat(space)}${r}\n`);
}

function divider(width: number): Uint8Array {
  return encodeAscii(`${'='.repeat(width)}\n`);
}

/** Epson QR code (GS ( k) — works on most POS80 / IT-800 clones. */
function qrCodeEscPos(data: string, moduleSize = 5): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < data.length; i++) {
    bytes.push(data.charCodeAt(i) & 0x7f);
  }
  const storeLen = bytes.length + 3;
  const pL = storeLen & 0xff;
  const pH = (storeLen >> 8) & 0xff;

  return concat(
    setAlign(1),
    // QR Model 2
    new Uint8Array([GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00]),
    // Module size 1-16
    new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize]),
    // Error correction L
    new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30]),
    // Store data
    new Uint8Array([GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]),
    new Uint8Array(bytes),
    // Print QR
    new Uint8Array([GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]),
    setAlign(0),
    encodeAscii('\n'),
  );
}

export function buildTestPrintEscPos(siteUrl?: string): Uint8Array {
  const url = siteUrl || getReceiptSiteUrl();
  const width = 48;
  return concat(
    initPrinter(),
    setAlign(1),
    setSize(0x30), // double width + height
    textLine('BREW & BEAN'),
    setSize(0x00),
    textLine('PRINTER TEST OK'),
    setAlign(0),
    divider(width),
    textLine('If you see this text, print works.'),
    textLine(new Date().toLocaleString('en-GB')),
    divider(width),
    setAlign(1),
    textLine('Scan for menu'),
    qrCodeEscPos(url, 5),
    textLine(toAscii(url).slice(0, width)),
    setAlign(0),
    encodeAscii('\n\n'),
    cutPaper(),
  );
}

export function buildReceiptEscPos(
  order: Order,
  shop?: ShopSettings | null,
  options?: {
    openDrawer?: boolean;
    cut?: boolean;
    width?: number;
    siteUrl?: string;
  },
): Uint8Array {
  const shopName = toAscii(shop?.name || 'Brew & Bean') || 'Brew & Bean';
  const width = options?.width ?? 48;
  const openDrawer = options?.openDrawer ?? false;
  const cut = options?.cut ?? true;
  const siteUrl = options?.siteUrl || getReceiptSiteUrl();
  const menuUrl = `${siteUrl.replace(/\/$/, '')}/menu`;

  const chunks: Uint8Array[] = [initPrinter()];

  // Header
  chunks.push(setAlign(1));
  chunks.push(setSize(0x30));
  chunks.push(textLine(shopName));
  chunks.push(setSize(0x00));
  chunks.push(textLine('TAX INVOICE / RECEIPT'));
  if (shop?.phone) chunks.push(textLine(toAscii(`Tel: ${shop.phone}`)));
  if (shop?.address) {
    const addr = toAscii(shop.address);
    for (let i = 0; i < addr.length; i += width) {
      chunks.push(textLine(addr.slice(i, i + width)));
    }
  }
  chunks.push(setAlign(0));
  chunks.push(divider(width));

  // Meta
  chunks.push(textLine(`Order : ${toAscii(order.orderNumber)}`));
  chunks.push(
    textLine(`Date  : ${toAscii(new Date(order.createdAt).toLocaleString('en-GB'))}`),
  );
  chunks.push(
    textLine(`Cust  : ${toAscii(order.createdBy?.name || 'Walk-in')}`),
  );
  chunks.push(
    textLine(
      `Pay   : ${toAscii(order.paymentMethod)}  ${toAscii(order.status)}`,
    ),
  );
  if (order.note) chunks.push(textLine(`Note  : ${toAscii(order.note)}`));
  chunks.push(divider(width));
  chunks.push(pairLine('Item', 'Amount', width));
  chunks.push(encodeAscii(`${'-'.repeat(width)}\n`));

  for (const item of order.items || []) {
    const name = toAscii(item.productName);
    chunks.push(textLine(name));
    chunks.push(
      pairLine(
        `  ${item.quantity} x ${moneyAscii(item.unitPrice)}`,
        moneyAscii(item.lineTotal),
        width,
      ),
    );
  }

  chunks.push(divider(width));
  chunks.push(pairLine('Subtotal', moneyAscii(order.subtotal), width));
  chunks.push(pairLine('Tax', moneyAscii(order.tax), width));
  chunks.push(setSize(0x08)); // emphasized
  chunks.push(pairLine('TOTAL', moneyAscii(order.total), width));
  chunks.push(setSize(0x00));
  chunks.push(divider(width));

  // QR → website / menu
  chunks.push(setAlign(1));
  chunks.push(textLine('Scan for menu & orders'));
  chunks.push(qrCodeEscPos(menuUrl, 5));
  chunks.push(textLine(toAscii(menuUrl).slice(0, width)));
  chunks.push(textLine('Thank you! Visit again'));
  chunks.push(setAlign(0));
  chunks.push(encodeAscii('\n\n'));

  if (cut) chunks.push(cutPaper());
  if (openDrawer) chunks.push(openCashDrawerCommand());

  return concat(...chunks);
}

export function buildDrawerOnlyEscPos(): Uint8Array {
  return concat(initPrinter(), openCashDrawerCommand());
}
