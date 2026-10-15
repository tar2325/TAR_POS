import { Component, inject } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { environment } from '../../../../../environments/environment';
import { ReceiptData } from '../../../../models/receipt.model';
import { buildReceiptPrintHtml, getReceiptPrintStyles } from './receipt-print.util';

@Component({
  selector: 'app-receipt-dialog',
  imports: [CurrencyPipe, DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule],
  templateUrl: './receipt-dialog.component.html',
  styleUrl: './receipt-dialog.component.scss',
})
export class ReceiptDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ReceiptDialogComponent>);
  readonly receipt = inject<ReceiptData>(MAT_DIALOG_DATA);

  print(): void {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none;';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      return;
    }

    const printStyles = getReceiptPrintStyles(environment.receiptPaperSize);
    const printHtml = buildReceiptPrintHtml(this.receipt, (v) => this.escape(v));

    doc.open();
    doc.write(`<!DOCTYPE html>
      <html lang="th">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>ใบเสร็จ ${this.receipt.receiptNo}</title>
          <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600&display=swap" rel="stylesheet" />
          <style>${printStyles}</style>
        </head>
        <body>${printHtml}</body>
      </html>`);
    doc.close();

    const printWindow = iframe.contentWindow;
    if (!printWindow) {
      iframe.remove();
      return;
    }

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => iframe.remove(), 500);
    }, 300);
  }

  close(): void {
    this.dialogRef.close(true);
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
