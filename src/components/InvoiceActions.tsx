'use client';

import { IconButton } from '@/components/IconButton';
import { downloadInvoice, printInvoice } from '@/lib/print-invoice';
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
        label="Print invoice"
        icon="print"
        onClick={() => {
          void printInvoice(order, shop, {
            openDrawer: order.paymentMethod === 'CASH',
          });
        }}
      />
      <IconButton
        label="Download invoice"
        icon="download"
        onClick={() => downloadInvoice(order, shop)}
      />
    </>
  );
}
