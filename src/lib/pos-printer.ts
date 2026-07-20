import {
  buildDrawerOnlyEscPos,
  buildHelloEscPos,
  buildReceiptEscPos,
  buildTestPrintEscPos,
  cutPaper,
  getReceiptSiteUrl,
  openCashDrawerCommand,
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
};

type UsbDeviceLike = {
  opened: boolean;
  configuration: {
    interfaces: Array<{
      claimed: boolean;
      alternate: {
        interfaceClass: number;
        endpoints: Array<{
          direction: string;
          endpointNumber: number;
          type: string;
        }>;
      };
      interfaceNumber: number;
    }>;
  } | null;
  open: () => Promise<void>;
  close: () => Promise<void>;
  selectConfiguration: (n: number) => Promise<void>;
  claimInterface: (n: number) => Promise<void>;
  releaseInterface: (n: number) => Promise<void>;
  transferOut: (endpoint: number, data: BufferSource) => Promise<unknown>;
  productName?: string;
  manufacturerName?: string;
};

declare global {
  interface Navigator {
    serial?: {
      requestPort: (opts?: {
        filters?: Array<{ usbVendorId?: number; usbProductId?: number }>;
      }) => Promise<SerialPortLike>;
      getPorts: () => Promise<SerialPortLike[]>;
    };
    usb?: {
      requestDevice: (options: {
        filters: Array<{
          vendorId?: number;
          productId?: number;
          classCode?: number;
        }>;
      }) => Promise<UsbDeviceLike>;
      getDevices: () => Promise<UsbDeviceLike[]>;
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
  transport: 'usb' | 'serial';
};

const DEFAULT_PREFS: PrinterPrefs = {
  autoPrintOnCash: true,
  openDrawerOnCash: true,
  openDrawerOnPrint: true,
  paperWidth: 48,
  baudRate: 115200,
  transport: 'usb',
};

let serialPort: SerialPortLike | null = null;
let usbDevice: UsbDeviceLike | null = null;
let usbOutEndpoint = 1;
let usbInterface = 0;

export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.serial);
}

export function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.usb);
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
  return Boolean(serialPort?.writable) || Boolean(usbDevice?.opened);
}

async function writeUsb(device: UsbDeviceLike, data: Uint8Array) {
  // Very small packets — POS80 USB drops large buffers (blank paper + feed only)
  const CHUNK = 16;
  for (let i = 0; i < data.length; i += CHUNK) {
    await device.transferOut(usbOutEndpoint, data.subarray(i, i + CHUNK));
    await new Promise((r) => setTimeout(r, 20));
  }
  await new Promise((r) => setTimeout(r, 500));
}

async function writeSerial(port: SerialPortLike, data: Uint8Array) {
  if (!port.writable) throw new Error('Printer port is not writable');
  const writer = port.writable.getWriter();
  try {
    const CHUNK = 16;
    for (let i = 0; i < data.length; i += CHUNK) {
      await writer.write(data.subarray(i, i + CHUNK));
      await new Promise((r) => setTimeout(r, 20));
    }
    await new Promise((r) => setTimeout(r, 500));
  } finally {
    writer.releaseLock();
  }
}

function pickUsbInterface(device: UsbDeviceLike) {
  const config = device.configuration;
  if (!config) throw new Error('USB device has no configuration');

  for (const iface of config.interfaces) {
    const alt = iface.alternate;
    const out = alt.endpoints.find(
      (e) => e.direction === 'out' && (e.type === 'bulk' || e.type === 'interrupt'),
    );
    if (out) {
      return {
        interfaceNumber: iface.interfaceNumber,
        endpointNumber: out.endpointNumber,
      };
    }
  }
  throw new Error('No USB OUT endpoint found on this printer');
}

async function setupUsbDevice(device: UsbDeviceLike) {
  if (!device.opened) await device.open();
  if (!device.configuration) await device.selectConfiguration(1);
  const picked = pickUsbInterface(device);
  usbInterface = picked.interfaceNumber;
  usbOutEndpoint = picked.endpointNumber;
  try {
    await device.claimInterface(usbInterface);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Cannot claim USB printer (${msg}). Remove “STMicroelectronics POS80” from macOS Printers & Scanners, unplug/replug USB, then try again.`,
    );
  }
  usbDevice = device;
  serialPort = null;
}

/** Preferred for Ztech / POS80 USB printers (not serial Bluetooth ports). */
export async function connectUsbPrinter(): Promise<string> {
  if (!navigator.usb) {
    throw new Error('WebUSB not supported. Use Chrome or Edge.');
  }
  await disconnectPosPrinter();

  // Empty filters = show all USB devices so POS80 appears even if VID unknown
  const device = await navigator.usb.requestDevice({
    filters: [
      { classCode: 0x07 }, // USB printer class
      { vendorId: 0x0483 }, // STMicroelectronics
      { vendorId: 0x0416 }, // Winbond / common POS
      { vendorId: 0x0519 }, // Star / clones
      { vendorId: 0x1504 }, // common ESC/POS clones
      {}, // fallback: allow picking any device in the chooser
    ],
  });

  await setupUsbDevice(device);
  setPrinterPrefs({ transport: 'usb' });
  return device.productName || device.manufacturerName || 'USB printer';
}

/** Only use if the printer appears as a real serial/CDC device. */
export async function connectSerialPrinter(): Promise<void> {
  if (!navigator.serial) {
    throw new Error('Web Serial not supported. Use Chrome or Edge.');
  }
  await disconnectPosPrinter();
  const baudRate = getPrinterPrefs().baudRate;
  const port = await navigator.serial.requestPort();
  await port.open({
    baudRate,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    bufferSize: 255,
  });
  serialPort = port;
  usbDevice = null;
  setPrinterPrefs({ transport: 'serial' });
}

/** @deprecated use connectUsbPrinter */
export async function connectPosPrinter(): Promise<void> {
  await connectUsbPrinter();
}

export async function disconnectPosPrinter(): Promise<void> {
  if (serialPort) {
    try {
      await serialPort.close();
    } catch {
      /* ignore */
    }
    serialPort = null;
  }
  if (usbDevice) {
    try {
      await usbDevice.releaseInterface(usbInterface);
    } catch {
      /* ignore */
    }
    try {
      await usbDevice.close();
    } catch {
      /* ignore */
    }
    usbDevice = null;
  }
}

export async function tryReconnectPosPrinter(): Promise<boolean> {
  const prefs = getPrinterPrefs();
  try {
    if (prefs.transport === 'usb' && navigator.usb) {
      const devices = await navigator.usb.getDevices();
      if (!devices.length) return false;
      await setupUsbDevice(devices[0]);
      return true;
    }
    if (navigator.serial) {
      const ports = await navigator.serial.getPorts();
      if (!ports.length) return false;
      const port = ports[0];
      try {
        await port.open({
          baudRate: prefs.baudRate,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          bufferSize: 255,
        });
      } catch {
        /* may already be open */
      }
      if (port.writable) {
        serialPort = port;
        return true;
      }
    }
  } catch {
    return false;
  }
  return false;
}

export async function sendToPrinter(data: Uint8Array): Promise<void> {
  if (!isPrinterConnected()) {
    const ok = await tryReconnectPosPrinter();
    if (!ok || !isPrinterConnected()) {
      throw new Error(
        'Printer not connected. Click “Connect USB printer”, pick POS80 (not Bluetooth).',
      );
    }
  }
  if (usbDevice?.opened) {
    await writeUsb(usbDevice, data);
    return;
  }
  if (serialPort?.writable) {
    await writeSerial(serialPort, data);
    return;
  }
  throw new Error('Printer not connected.');
}

/**
 * Cash / Print: send TEXT receipt in 3 steps so POS80 does not drop the job.
 * 1) invoice text  2) cut  3) cash drawer
 */
export async function printReceiptWithDrawer(
  order: Order,
  shop?: ShopSettings | null,
  options?: { openDrawer?: boolean },
): Promise<void> {
  const prefs = getPrinterPrefs();
  const openDrawer = options?.openDrawer ?? prefs.openDrawerOnPrint;

  // Body only (no cut/drawer yet)
  const body = buildReceiptEscPos(order, shop, {
    openDrawer: false,
    cut: false,
    width: prefs.paperWidth === 48 ? 42 : prefs.paperWidth,
    includeQr: true,
  });
  await sendToPrinter(body);
  await new Promise((r) => setTimeout(r, 400));

  await sendToPrinter(cutPaper());
  await new Promise((r) => setTimeout(r, 300));

  if (openDrawer) {
    await sendToPrinter(openCashDrawerCommand());
  }
}

export async function openCashDrawerOnly(): Promise<void> {
  await sendToPrinter(buildDrawerOnlyEscPos());
}

export async function testPrintReceipt(): Promise<void> {
  // Step 1: absolute HELLO — if this is blank, paper/head issue
  await sendToPrinter(buildHelloEscPos());
  await new Promise((r) => setTimeout(r, 400));
  // Step 2: full test with QR
  await sendToPrinter(buildTestPrintEscPos(getReceiptSiteUrl()));
}

export async function testHelloOnly(): Promise<void> {
  await sendToPrinter(buildHelloEscPos());
}

export const BAUD_OPTIONS = [9600, 19200, 38400, 57600, 115200] as const;
