import {
  buildKitchenTicketEscPos,
  cutPaper,
  getReceiptSiteUrl,
} from './escpos';
import { money } from './format';
import {
  getPrinterPrefs,
  isPrinterConnected,
  printReceiptWithDrawer,
  sendToPrinter,
  tryReconnectPosPrinter,
} from './pos-printer';
import type { Order, ShopSettings } from './types';

function buildInvoiceHtml(
  order: Order,
  shop?: ShopSettings | null,
  autoPrint = false,
) {
  const shopName = shop?.name || 'The Brewing Cottage';
  const currency = shop?.currency || 'PKR';
  const siteUrl = getReceiptSiteUrl().replace(/\/$/, '');
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(siteUrl)}`;
  const rows = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.productName)}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${money(item.unitPrice, currency)}</td>
        <td class="num">${money(item.lineTotal, currency)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(order.orderNumber)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      color: #1a1410;
      margin: 0;
      padding: 20px;
      max-width: 440px;
      background: #fff;
    }
    .tag {
      display: inline-block;
      background: #3d2b1f;
      color: #f5ebe0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      padding: 4px 10px;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    h1 { margin: 0 0 2px; font-size: 22px; text-align: center; color: #3d2b1f; }
    .sub { text-align: center; color: #6b5a4c; font-size: 12px; margin: 2px 0; }
    .meta {
      margin: 14px 0;
      padding: 10px 12px;
      background: #f7f1ea;
      border-radius: 8px;
      font-size: 13px;
      line-height: 1.55;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 4px;
      border: 1px solid #e0d4c8;
      border-radius: 8px;
      overflow: hidden;
    }
    thead th {
      background: #3d2b1f;
      color: #f5ebe0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 8px 10px;
      text-align: left;
      font-weight: 600;
    }
    thead th.num { text-align: right; }
    tbody td {
      padding: 8px 10px;
      border-bottom: 1px solid #ebe3da;
      font-size: 13px;
    }
    tbody tr:nth-child(even) td { background: #faf7f3; }
    tbody tr:last-child td { border-bottom: none; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    .totals { margin-top: 14px; }
    .totals div {
      display: flex;
      justify-content: space-between;
      padding: 4px 2px;
      font-size: 13px;
      color: #4a3b30;
    }
    .totals .grand {
      font-weight: 700;
      font-size: 17px;
      color: #1a1410;
      border-top: 2px solid #3d2b1f;
      padding-top: 10px;
      margin-top: 6px;
    }
    .qr {
      text-align: center;
      margin-top: 22px;
      padding-top: 14px;
      border-top: 1px dashed #c4b5a5;
    }
    .qr img { display: block; margin: 8px auto; width: 120px; height: 120px; }
    .muted { color: #6b5a4c; font-size: 12px; }
    @media print { body { margin: 0; padding: 8px; } }
  </style>
</head>
<body>
  <div class="tag"># CUSTOMER</div>
  <h1>${escapeHtml(shopName)}</h1>
  <div class="sub">Tax Invoice / Receipt</div>
  ${shop?.phone ? `<div class="sub muted">${escapeHtml(shop.phone)}</div>` : ''}
  ${shop?.address ? `<div class="sub muted">${escapeHtml(shop.address)}</div>` : ''}
  <div class="meta">
    <strong>${escapeHtml(order.orderNumber)}</strong>
    · ${escapeHtml(order.source || 'POS')}<br/>
    ${new Date(order.createdAt).toLocaleString()}<br/>
    Payment: ${escapeHtml(order.paymentMethod || 'UNPAID')} · ${escapeHtml(order.status)}
    ${order.note ? `<br/>Note: ${escapeHtml(order.note)}` : ''}
  </div>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th class="num">Qty</th>
        <th class="num">Price</th>
        <th class="num">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><span>${money(order.subtotal, currency)}</span></div>
    <div><span>Tax</span><span>${money(order.tax, currency)}</span></div>
    <div class="grand"><span>Total</span><span>${money(order.total, currency)}</span></div>
  </div>
  <div class="qr">
    <div><strong>Scan to visit us online</strong></div>
    <img src="${qrImg}" alt="QR code to website" width="120" height="120" />
    <div class="muted" style="margin-top:8px">Thank you for choosing ${escapeHtml(shopName)}</div>
  </div>
  ${autoPrint ? '<script>window.onload = function(){ window.print(); }</script>' : ''}
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Thermal print only — does NOT open a browser page.
 * Use Download invoice for the HTML copy.
 */
export async function printInvoice(
  order: Order,
  shop?: ShopSettings | null,
  options?: { openDrawer?: boolean },
) {
  const openDrawer = options?.openDrawer ?? order.paymentMethod === 'CASH';

  if (!isPrinterConnected()) {
    await tryReconnectPosPrinter();
  }

  if (!isPrinterConnected()) {
    throw new Error(
      'Printer not connected. Click “Connect USB printer” on POS first. (Do not use browser Print to the POS80 — that prints blank.)',
    );
  }

  await printReceiptWithDrawer(order, shop, { openDrawer });
}

/** Kitchen order ticket — items + qty only. */
export async function printKitchenTicket(
  order: Order,
  shop?: ShopSettings | null,
) {
  if (!isPrinterConnected()) {
    await tryReconnectPosPrinter();
  }
  if (!isPrinterConnected()) {
    throw new Error(
      'Printer not connected. Click “Connect USB printer” on POS first.',
    );
  }
  const prefs = getPrinterPrefs();
  const body = buildKitchenTicketEscPos(order, shop, {
    cut: false,
    width: prefs.paperWidth === 48 ? 42 : prefs.paperWidth,
  });
  await sendToPrinter(body);
  await new Promise((r) => setTimeout(r, 300));
  await sendToPrinter(cutPaper());
}

export function downloadInvoice(order: Order, shop?: ShopSettings | null) {
  const html = buildInvoiceHtml(order, shop, false);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${order.orderNumber}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
