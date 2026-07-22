import { getReceiptSiteUrl } from './escpos';
import { money } from './format';
import {
  isPrinterConnected,
  printReceiptWithDrawer,
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
  const menuUrl = `${siteUrl}/menu`;
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=${encodeURIComponent(menuUrl)}`;
  const rows = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.productName)}</td>
        <td style="text-align:center">${item.quantity}</td>
        <td style="text-align:right">${money(item.unitPrice, currency)}</td>
        <td style="text-align:right">${money(item.lineTotal, currency)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${escapeHtml(order.orderNumber)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 16px; max-width: 420px; }
    h1 { margin: 0 0 4px; font-size: 22px; text-align: center; }
    .sub { text-align: center; color: #555; font-size: 12px; margin-bottom: 12px; }
    .muted { color: #666; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 6px 2px; border-bottom: 1px solid #ddd; font-size: 13px; }
    th { text-align: left; color: #555; font-size: 11px; text-transform: uppercase; }
    .totals { margin-top: 12px; }
    .totals div { display: flex; justify-content: space-between; padding: 3px 0; font-size: 13px; }
    .totals .grand { font-weight: bold; font-size: 16px; border-top: 2px solid #111; padding-top: 8px; margin-top: 6px; }
    .qr { text-align: center; margin-top: 20px; padding-top: 12px; border-top: 1px dashed #999; }
    .qr img { display: block; margin: 8px auto; width: 140px; height: 140px; }
    .badge { display: inline-block; padding: 2px 8px; border: 1px solid #999; border-radius: 4px; font-size: 11px; }
    @media print { body { margin: 0; padding: 8px; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(shopName)}</h1>
  <div class="sub">Tax Invoice / Receipt</div>
  ${shop?.phone ? `<div class="sub muted">${escapeHtml(shop.phone)}</div>` : ''}
  ${shop?.address ? `<div class="sub muted">${escapeHtml(shop.address)}</div>` : ''}
  <p>
    <strong>${escapeHtml(order.orderNumber)}</strong>
    <span class="badge">${escapeHtml(order.source || 'POS')}</span><br/>
    ${new Date(order.createdAt).toLocaleString()}<br/>
    Customer: ${escapeHtml(order.createdBy?.name || 'Walk-in')}<br/>
    Payment: ${escapeHtml(order.paymentMethod)} · ${escapeHtml(order.status)}
    ${order.note ? `<br/>Note: ${escapeHtml(order.note)}` : ''}
  </p>
  <table>
    <thead>
      <tr>
        <th>Item</th>
        <th style="text-align:center">Qty</th>
        <th style="text-align:right">Price</th>
        <th style="text-align:right">Total</th>
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
    <div><strong>Scan for menu &amp; online orders</strong></div>
    <img src="${qrImg}" alt="QR code" width="140" height="140" />
    <div class="muted">${escapeHtml(menuUrl)}</div>
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
