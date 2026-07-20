import {
  buildDrawerOnlyEscPos,
  buildReceiptEscPos,
} from './escpos';
import type { Order, ShopSettings } from './types';

type SerialPortLike = {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
};

declare global {
  interface Navigator {
    serial?: {
      requestPort: () => Promise<SerialPortLike>;
      getPorts: () => Promise<SerialPortLike[]>;
    };
  }
}

const PREF_KEY = 'coffee_pos_printer';

export type PrinterPrefs = {
  autoPrintOnCash: boolean;
  openDrawerOnCash: boolean;
  openDrawerOnPrint: boolean;
  paperWidth: 42 | 32;
};

const DEFAULT_PREFS: PrinterPrefs = {
  autoPrintOnCash: true,
  openDrawerOnCash: true,
  openDrawerOnPrint: true,
  paperWidth: 42,
};

let connectedPort: SerialPortLike | null = null;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.serial);
}

export function getPrinterPrefs(): PrinterPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function setPrinterPrefs(partial: Partial<PrinterPrefs>) {
  const next = { ...getPrinterPrefs(), ...partial };
  localStorage.setItem(PREF_KEY, JSON.stringify(next));
  return next;
}

export function isPrinterConnected(): boolean {
  return Boolean(connectedPort?.writable);
}

async function writeBytes(port: SerialPortLike, data: Uint8Array) {
  if (!port.writable) throw new Error('Printer port is not writable');
  const writer = port.writable.getWriter();
  try {
    await writer.write(data);
  } finally {
    writer.releaseLock();
  }
}

/** Ask user to pick the USB/serial thermal printer (Chrome / Edge). */
export async function connectPosPrinter(): Promise<void> {
  if (!navigator.serial) {
    throw new Error(
      'Web Serial is not supported. Use Chrome or Edge on the POS computer.',
    );
  }
  const port = await navigator.serial.requestPort();
  await port.open({ baudRate: 9600 });
  connectedPort = port;
}

export async function disconnectPosPrinter(): Promise<void> {
  if (!connectedPort) return;
  try {
    await connectedPort.close();
  } catch {
    /* ignore */
  }
  connectedPort = null;
}

/** Try to reopen a previously granted port without a picker. */
export async function tryReconnectPosPrinter(): Promise<boolean> {
  if (!navigator.serial) return false;
  try {
    const ports = await navigator.serial.getPorts();
    if (!ports.length) return false;
    const port = ports[0];
    if (!port.writable) {
      await port.open({ baudRate: 9600 });
    }
    connectedPort = port;
    return true;
  } catch {
    return false;
  }
}

export async function sendToPrinter(data: Uint8Array): Promise<void> {
  if (!connectedPort?.writable) {
    const ok = await tryReconnectPosPrinter();
    if (!ok || !connectedPort?.writable) {
      throw new Error(
        'Printer not connected. Click “Connect printer” on the POS page first.',
      );
    }
  }
  await writeBytes(connectedPort!, data);
}

/**
 * Sequence: open cash drawer (optional) → print receipt → cut paper.
 */
export async function printReceiptWithDrawer(
  order: Order,
  shop?: ShopSettings | null,
  options?: { openDrawer?: boolean },
): Promise<void> {
  const prefs = getPrinterPrefs();
  const openDrawer = options?.openDrawer ?? prefs.openDrawerOnPrint;
  const payload = buildReceiptEscPos(order, shop, {
    openDrawer,
    cut: true,
  });
  await sendToPrinter(payload);
}

export async function openCashDrawerOnly(): Promise<void> {
  await sendToPrinter(buildDrawerOnlyEscPos());
}
