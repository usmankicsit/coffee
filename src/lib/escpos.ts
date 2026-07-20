import { money } from './format';
import type { Order, ShopSettings } from './types';

/** ESC/POS byte helpers for 80mm thermal printers (Epson-compatible). */

function encodeText(text: string): Uint8Array {
  // Prefer UTF-8; many modern printers accept it. Fallback path still works for ASCII.
  return new TextEncoder().encode(text);
}

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

const ESC = 0x1b;
const GS = 0x1d;

export function initPrinter(): Uint8Array {
  return new Uint8Array([ESC, 0x40]); // ESC @
}

/** Kick cash drawer on printer DK port (pin 2). */
export function openCashDrawerCommand(): Uint8Array {
  // ESC p m t1 t2 — m=0 (drawer 1), pulse ~25ms / 250ms
  return new Uint8Array([ESC, 0x70, 0x00, 0x19, 0xfa]);
}

export function cutPaper(): Uint8Array {
  // GS V 0 — full cut
  return new Uint8Array([GS, 0x56, 0x00]);
}

function line(text: string, width = 42): string {
  if (text.length <= width) return `${text}\n`;
  return `${text.slice(0, width)}\n`;
}

function pair(left: string, right: string, width = 42): string {
  const space = Math.max(1, width - left.length - right.length);
  return `${left}${' '.repeat(space)}${right}\n`;
}

function center(text: string, width = 42): string {
  if (text.length >= width) return `${text.slice(0, width)}\n`;
  const pad = Math.floor((width - text.length) / 2);
  return `${' '.repeat(pad)}${text}\n`;
}

function divider(width = 42): string {
  return `${'-'.repeat(width)}\n`;
}

export function buildReceiptEscPos(
  order: Order,
  shop?: ShopSettings | null,
  options?: { openDrawer?: boolean; cut?: boolean },
): Uint8Array {
  const shopName = shop?.name || 'Brew & Bean';
  const currency = shop?.currency || 'PKR';
  const width = 42;
  const openDrawer = options?.openDrawer ?? false;
  const cut = options?.cut ?? true;

  const parts: string[] = [];
  parts.push(center(shopName, width));
  parts.push(center('INVOICE / RECEIPT', width));
  parts.push(divider(width));
  parts.push(line(`Order: ${order.orderNumber}`, width));
  parts.push(line(new Date(order.createdAt).toLocaleString(), width));
  parts.push(
    line(`Customer: ${order.createdBy?.name || 'Walk-in'}`, width),
  );
  parts.push(
    line(`Pay: ${order.paymentMethod}  Status: ${order.status}`, width),
  );
  if (order.note) parts.push(line(`Note: ${order.note}`, width));
  parts.push(divider(width));

  for (const item of order.items || []) {
    const name = item.productName;
    const qtyPrice = `${item.quantity} x ${money(item.unitPrice, currency)}`;
    const total = money(item.lineTotal, currency);
    parts.push(line(name, width));
    parts.push(pair(`  ${qtyPrice}`, total, width));
  }

  parts.push(divider(width));
  parts.push(pair('Subtotal', money(order.subtotal, currency), width));
  parts.push(pair('Tax', money(order.tax, currency), width));
  parts.push(pair('TOTAL', money(order.total, currency), width));
  parts.push(divider(width));
  parts.push(center(`Thank you — ${shopName}`, width));
  parts.push('\n\n');

  const body = encodeText(parts.join(''));
  const chunks: Uint8Array[] = [initPrinter()];

  if (openDrawer) {
    chunks.push(openCashDrawerCommand());
  }
  chunks.push(body);
  if (cut) {
    chunks.push(cutPaper());
  }

  return concat(...chunks);
}

export function buildDrawerOnlyEscPos(): Uint8Array {
  return concat(initPrinter(), openCashDrawerCommand());
}
