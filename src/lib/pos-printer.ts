import {
  buildDrawerOnlyEscPos,
  buildReceiptEscPos,
  buildTestPrintEscPos,
} from './escpos';
import type { Order, ShopSettings } from './types';

type SerialPortLike = {
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  open: (options: {
    baudRate: number;
    dataBits?: number;
    stopBits?: number;
    parity?: string;
    bufferSize?: number;
  }) => Promise<void>;
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
  paperWidth: 48 | 42 | 32;
  baudRate: number;
};

const DEFAULT_PREFS: PrinterPrefs = {
  autoPrintOnCash: true,
  openDrawerOnCash: true,
  openDrawerOnPrint: true,
  paperWidth: 48,
  baudRate: 115200, // Ztech IT-800 / POS80 clones usually use 115200
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
    // Chunk writes — some USB-serial adapters drop large buffers
    const CHUNK = 64;
    for (let i = 0; i < data.length; i += CHUNK) {
      await writer.write(data.subarray(i, i + CHUNK));
      await new Promise((r) => setTimeout(r, 5));
    }
  } finally {
    writer.releaseLock();
  }
}

async function openPort(port: SerialPortLike, baudRate: number) {
  await port.open({
    baudRate,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    bufferSize: 255,
  });
}

/** Ask user to pick the USB thermal printer (Chrome / Edge). */
export async function connectPosPrinter(): Promise<void> {
  if (!navigator.serial) {
    throw new Error(
      'Web Serial is not supported. Use Chrome or Edge on the POS computer.',
    );
  }
  if (connectedPort) {
    try {
      await connectedPort.close();
    } catch {
      /* ignore */
    }
    connectedPort = null;
  }
  const baudRate = getPrinterPrefs().baudRate;
  const port = await navigator.serial.requestPort();
  await openPort(port, baudRate);
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

/** Reopen a previously allowed port. */
export async function tryReconnectPosPrinter(): Promise<boolean> {
  if (!navigator.serial) return false;
  try {
    const ports = await navigator.serial.getPorts();
    if (!ports.length) return false;
    if (connectedPort?.writable) return true;
    const port = ports[0];
    const baudRate = getPrinterPrefs().baudRate;
    try {
      await openPort(port, baudRate);
    } catch {
      // Port may already be open from a previous page session
    }
    connectedPort = port;
    return Boolean(connectedPort.writable);
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
 * Print receipt (ASCII ESC/POS), cut, then open cash drawer.
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
    width: prefs.paperWidth,
  });
  await sendToPrinter(payload);
}

export async function openCashDrawerOnly(): Promise<void> {
  await sendToPrinter(buildDrawerOnlyEscPos());
}

export async function testPrintReceipt(): Promise<void> {
  await sendToPrinter(buildTestPrintEscPos());
}

export const BAUD_OPTIONS = [9600, 19200, 38400, 57600, 115200] as const;
