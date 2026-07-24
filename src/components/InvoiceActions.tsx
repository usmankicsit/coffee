'use client';

import { IconButton } from '@/components/IconButton';
import {
  downloadInvoice,
  printInvoice,
  printKitchenTicket,
} from '@/lib/print-invoice';
import type { Order, ShopSettings } from '@/lib/types';

export function InvoiceActions({
  order,
  shop,
}: {
  order: Order;
  shop?: ShopSettings | null;
}) {
  return (
    <>
      <IconButton
        label="Invoice"
        icon="print"
        showLabel
        onClick={() => {
          void printInvoice(order, shop, {
            openDrawer: order.paymentMethod === 'CASH',
          }).catch((err) => {
            alert(err instanceof Error ? err.message : 'Print failed');
          });
        }}
      />
      <IconButton
        label="Kitchen"
        icon="kitchen"
        showLabel
        onClick={() => {
          void printKitchenTicket(order, shop).catch((err) => {
            alert(err instanceof Error ? err.message : 'Kitchen print failed');
          });
        }}
      />
      <IconButton
        label="Save"
        icon="download"
        showLabel
        onClick={() => downloadInvoice(order, shop)}
      />
    </>
  );
}
