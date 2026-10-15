import { ReceiptPaperSize } from '../../../../../environments/environment.types';
import { ReceiptData } from '../../../../models/receipt.model';

export function getReceiptPrintStyles(paperSize: ReceiptPaperSize): string {
  const pageSize =
    paperSize === 'auto' ? 'auto' : `${paperSize} auto`;

  return `
    @page {
      size: ${pageSize};
      margin: 0;
    }

    * { box-sizing: border-box; }

    html, body {
      width: 100%;
      max-width: 100%;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Sarabun', sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
      padding: 2mm 3mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .receipt {
      width: 100%;
      max-width: 100%;
    }

    .receipt__header { text-align: center; margin-bottom: 8px; }
    .receipt__header h2 { margin: 0; font-size: 1.4em; font-weight: 600; }
    .receipt__header p { margin: 2px 0 0; font-size: 0.9em; color: #444; }

    hr {
      border: none;
      border-top: 1px dashed #999;
      margin: 8px 0;
    }

    .receipt__meta {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 0.95em;
      margin-bottom: 8px;
    }

    .receipt__meta div {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    .receipt__meta span { color: #555; }
    .receipt__meta strong { font-weight: 600; text-align: right; }

    .receipt__items { margin: 8px 0; }

    .receipt-item {
      padding: 6px 0;
      border-bottom: 1px dotted #ccc;
    }

    .receipt-item:last-child { border-bottom: none; }

    .receipt-item__top {
      display: flex;
      justify-content: space-between;
      gap: 6px;
      font-weight: 600;
      font-size: 1em;
    }

    .receipt-item__name { flex: 1; word-break: break-word; }
    .receipt-item__qty { white-space: nowrap; }

    .receipt-item__sub {
      display: flex;
      justify-content: space-between;
      font-size: 0.9em;
      color: #555;
      margin-top: 2px;
    }

    .receipt-item__barcode {
      font-size: 0.8em;
      color: #777;
      font-family: monospace;
    }

    .receipt__summary { margin: 8px 0; }

    .receipt__row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 0.95em;
    }

    .receipt__total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed #999;
      font-size: 1.1em;
      font-weight: 600;
    }

    .receipt__total strong { font-size: 1.3em; }

    .receipt__thanks {
      text-align: center;
      font-size: 0.9em;
      color: #555;
      margin: 8px 0 0;
    }

    @media print {
      html, body {
        width: 100% !important;
        height: auto !important;
        overflow: visible !important;
      }

      .receipt {
        page-break-inside: avoid;
      }
    }
  `;
}

export function buildReceiptPrintHtml(
  receipt: ReceiptData,
  escape: (v: string) => string,
): string {
  const date = new Date(receipt.createdAt).toLocaleString('th-TH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const fmt = (n: number) =>
    n.toLocaleString('th-TH', { style: 'currency', currency: 'THB', minimumFractionDigits: 2 });

  const items = receipt.items
    .map(
      (item) => `
      <div class="receipt-item">
        <div class="receipt-item__top">
          <span class="receipt-item__name">${escape(item.product.name)}</span>
          <span class="receipt-item__qty">x${item.quantity}</span>
        </div>
        <div class="receipt-item__sub">
          <span class="receipt-item__barcode">${escape(item.product.barcode)}</span>
          <span>${fmt(item.product.price)} / ชิ้น</span>
        </div>
        <div class="receipt-item__sub">
          <span>รวม</span>
          <span>${fmt(item.product.price * item.quantity)}</span>
        </div>
      </div>`,
    )
    .join('');

  return `
    <div class="receipt">
      <div class="receipt__header">
        <h2>POS System</h2>
        <p>ใบเสร็จรับเงิน / Receipt</p>
      </div>
      <hr />
      <div class="receipt__meta">
        <div><span>เลขที่</span><strong>${escape(receipt.receiptNo)}</strong></div>
        <div><span>วันที่</span><strong>${date}</strong></div>
        <div><span>พนักงาน</span><strong>${escape(receipt.cashierName)}</strong></div>
      </div>
      <hr />
      <div class="receipt__items">${items}</div>
      <hr />
      <div class="receipt__summary">
        <div class="receipt__row"><span>รวม (${receipt.summary.itemCount} ชิ้น)</span><span>${fmt(receipt.summary.subtotal)}</span></div>
        <div class="receipt__row"><span>ส่วนลด</span><span>${fmt(receipt.summary.discount)}</span></div>
        <div class="receipt__row"><span>ภาษี</span><span>${fmt(receipt.summary.tax)}</span></div>
        <div class="receipt__total"><span>ยอดสุทธิ</span><strong>${fmt(receipt.summary.total)}</strong></div>
      </div>
      <hr />
      <p class="receipt__thanks">ขอบคุณที่ใช้บริการ</p>
    </div>
  `;
}
