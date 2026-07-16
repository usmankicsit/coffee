import { money } from './format';
import type { Order, ShopSettings } from './types';

function buildInvoiceHtml(
  order: Order,
  shop?: ShopSettings | null,
  autoPrint = false,
) {
  const shopName = shop?.name || 'Brew & Bean';
  const currency = shop?.currency || 'PKR';
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
    body { font-family: Georgia, 'Times New Roman', serif; color: #1a1410; margin: 24px; }
    h1 { margin: 0 0 4px; font-size: 28px; }
    .muted { color: #666; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 8px 4px; border-bottom: 1px solid #ddd; font-size: 14px; }
    th { text-align: left; color: #555; font-size: 12px; text-transform: uppercase; }
    .totals { margin-top: 16px; width: 260px; margin-left: auto; }
    .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
    .totals .grand { font-weight: bold; font-size: 18px; border-top: 2px solid #1a1410; padding-top: 8px; margin-top: 6px; }
    .badge { display: inline-block; padding: 2px 8px; border: 1px solid #999; border-radius: 4px; font-size: 12px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(shopName)}</h1>
  <div class="muted">Invoice / Receipt</div>
  <p>
    <strong>${escapeHtml(order.orderNumber)}</strong>
    <span class="badge">${escapeHtml(order.source || 'POS')}</span><br/>
    ${new Date(order.createdAt).toLocaleString()}<br/>
    Customer: ${escapeHtml(order.createdBy?.name || 'Walk-in')} (${escapeHtml(order.createdBy?.email || '—')})<br/>
    Payment: ${escapeHtml(order.paymentMethod)} · Status: ${escapeHtml(order.status)}
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
  <p class="muted" style="margin-top:32px">Thank you for choosing ${escapeHtml(shopName)}.</p>
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

export function printInvoice(order: Order, shop?: ShopSettings | null) {
  const html = buildInvoiceHtml(order, shop, true);
  const win = window.open('', '_blank', 'width=720,height=900');
  if (!win) {
    alert('Please allow pop-ups to print the invoice.');
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
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
