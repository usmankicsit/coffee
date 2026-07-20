import type { Order, ShopSettings } from './types';

/**
 * ESC/POS for Ztech / POS80 / Epson-compatible 80mm printers.
 * Uses ASCII only — cheap clones often ignore UTF-8 multi-byte text.
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

/** Strip to printable ASCII (0x20-0x7E) + newlines. */
function toAscii(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[^\x20-\x7E\n\r]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

function encodeAscii(text: string): Uint8Array {
  const s = toAscii(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

function moneyAscii(value: number | string): string {
  const n = Math.round(typeof value === 'string' ? Number(value) : value) || 0;
  return `Rs ${n}`;
}

export function initPrinter(): Uint8Array {
  return concat(
    new Uint8Array([ESC, 0x40]), // ESC @ reset
    new Uint8Array([ESC, 0x74, 0x00]), // ESC t 0 — PC437 code page
    new Uint8Array([ESC, 0x4d, 0x00]), // ESC M 0 — Font A
    new Uint8Array([ESC, 0x61, 0x00]), // ESC a 0 — left align
    new Uint8Array([ESC, 0x32]), // ESC 2 — default line spacing
  );
}

/** Kick cash drawer on printer CASH / DK port. */
export function openCashDrawerCommand(): Uint8Array {
  // ESC p 0 t1 t2 — drawer pin 2
  return new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]);
}

export function cutPaper(): Uint8Array {
  // Feed then partial cut (works on most POS80 / IT-800 clones)
  return concat(
    encodeAscii('\n\n\n'),
    new Uint8Array([GS, 0x56, 0x41, 0x00]), // GS V A 0
  );
}

function line(text: string, width: number): string {
  const t = toAscii(text);
  if (t.length <= width) return `${t}\n`;
  return `${t.slice(0, width)}\n`;
}

function pair(left: string, right: string, width: number): string {
  const l = toAscii(left);
  const r = toAscii(right);
  const space = Math.max(1, width - l.length - r.length);
  return `${l}${' '.repeat(space)}${r}\n`;
}

function center(text: string, width: number): string {
  const t = toAscii(text);
  if (t.length >= width) return `${t.slice(0, width)}\n`;
  const pad = Math.floor((width - t.length) / 2);
  return `${' '.repeat(pad)}${t}\n`;
}

function divider(width: number): string {
  return `${'-'.repeat(width)}\n`;
}

export function buildTestPrintEscPos(): Uint8Array {
  const width = 48;
  const body = [
    center('BREW & BEAN', width),
    center('PRINTER TEST', width),
    divider(width),
    line('If you can read this, print OK.', width),
    line(new Date().toLocaleString('en-GB'), width),
    divider(width),
    center('Test passed', width),
    '\n\n',
  ].join('');

  return concat(initPrinter(), encodeAscii(body), cutPaper());
}

export function buildReceiptEscPos(
  order: Order,
  shop?: ShopSettings | null,
  options?: { openDrawer?: boolean; cut?: boolean; width?: number },
): Uint8Array {
  const shopName = toAscii(shop?.name || 'Brew & Bean') || 'Brew & Bean';
  const width = options?.width ?? 48;
  const openDrawer = options?.openDrawer ?? false;
  const cut = options?.cut ?? true;

  const parts: string[] = [];
  parts.push(center(shopName, width));
  parts.push(center('INVOICE / RECEIPT', width));
  parts.push(divider(width));
  parts.push(line(`Order: ${order.orderNumber}`, width));
  parts.push(
    line(new Date(order.createdAt).toLocaleString('en-GB'), width),
  );
  parts.push(line(`Customer: ${order.createdBy?.name || 'Walk-in'}`, width));
  parts.push(
    line(`Pay: ${order.paymentMethod}  Status: ${order.status}`, width),
  );
  if (order.note) parts.push(line(`Note: ${order.note}`, width));
  parts.push(divider(width));

  for (const item of order.items || []) {
    parts.push(line(item.productName, width));
    parts.push(
      pair(
        `  ${item.quantity} x ${moneyAscii(item.unitPrice)}`,
        moneyAscii(item.lineTotal),
        width,
      ),
    );
  }

  parts.push(divider(width));
  parts.push(pair('Subtotal', moneyAscii(order.subtotal), width));
  parts.push(pair('Tax', moneyAscii(order.tax), width));
  parts.push(pair('TOTAL', moneyAscii(order.total), width));
  parts.push(divider(width));
  parts.push(center(`Thank you - ${shopName}`, width));
  parts.push('\n\n');

  // Print first (so text is not lost), then cut, then kick drawer
  const chunks: Uint8Array[] = [
    initPrinter(),
    encodeAscii(parts.join('')),
  ];
  if (cut) chunks.push(cutPaper());
  if (openDrawer) chunks.push(openCashDrawerCommand());

  return concat(...chunks);
}

export function buildDrawerOnlyEscPos(): Uint8Array {
  return concat(initPrinter(), openCashDrawerCommand());
}
