import { ISale } from '../sales/sale.model.js';
import { IEstimate } from '../sales/estimate.model.js';
import { ICustomer } from '../customers/customer.model.js';
import { ILedgerEntry } from '../ledger/ledger.model.js';
import { IPayment } from '../payments/payment.model.js';
import { IDelivery } from '../deliveries/delivery.model.js';

export class DocumentTemplateService {
  /**
   * Converts integer paise into Indian English words (e.g. Twelve Thousand Five Hundred Rupees Only).
   */
  static numberToIndianWords(paise: number): string {
    const rupees = Math.floor(Math.abs(paise) / 100);
    if (rupees === 0) return 'Zero Rupees Only';

    const a = [
      '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ',
      'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ',
      'Seventeen ', 'Eighteen ', 'Nineteen ',
    ];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const formatHundreds = (n: number): string => {
      let str = '';
      if (n > 99) {
        str += a[Math.floor(n / 100)] + 'Hundred ';
        n %= 100;
      }
      if (n > 19) {
        str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      } else {
        str += a[n];
      }
      return str;
    };

    let result = '';
    const crore = Math.floor(rupees / 10000000);
    const lakh = Math.floor((rupees % 10000000) / 100000);
    const thousand = Math.floor((rupees % 100000) / 1000);
    const remainder = rupees % 1000;

    if (crore > 0) result += formatHundreds(crore) + 'Crore ';
    if (lakh > 0) result += formatHundreds(lakh) + 'Lakh ';
    if (thousand > 0) result += formatHundreds(thousand) + 'Thousand ';
    if (remainder > 0) result += formatHundreds(remainder);

    return result.trim() + ' Rupees Only';
  }

  static formatPaise(paise: number): string {
    const rupees = (paise / 100).toFixed(2);
    const parts = rupees.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    const lastThree = integerPart.substring(integerPart.length - 3);
    const otherNumbers = integerPart.substring(0, integerPart.length - 3);
    if (otherNumbers !== '') {
      integerPart = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
    }
    return `₹${integerPart}${decimalPart !== '00' ? '.' + decimalPart : ''}`;
  }

  private static getBaseCss(): string {
    return `
      <style>
        @page { size: A4; margin: 12mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; margin: 0; padding: 10px; font-size: 13px; background: #fff; }
        .header { border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 16px; }
        .brand-row { display: flex; justify-content: space-between; align-items: flex-start; }
        .brand-title { font-size: 22px; font-weight: 800; color: #0f766e; margin: 0; }
        .brand-hindi { font-size: 16px; font-weight: 700; color: #0d9488; margin-top: 2px; }
        .brand-tagline { font-size: 11px; color: #64748b; margin-top: 4px; }
        .brand-contact { font-size: 11px; color: #475569; text-align: right; }
        .doc-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-weight: 700; font-size: 14px; text-transform: uppercase; margin-top: 6px; }
        .badge-paid { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .badge-partial { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .badge-unpaid { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        .info-grid { display: flex; justify-content: space-between; margin-bottom: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; }
        .info-col { flex: 1; }
        .info-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
        .info-val { font-size: 13px; font-weight: 600; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th { background: #0f766e; color: #fff; font-weight: 600; text-align: left; padding: 8px 10px; font-size: 12px; }
        td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
        tr:nth-child(even) td { background: #f8fafc; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .totals-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .words-box { flex: 1.4; padding-right: 20px; }
        .words-title { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; }
        .words-text { font-size: 12px; font-style: italic; color: #0f766e; font-weight: 600; margin-top: 4px; }
        .totals-table { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 12px; border-bottom: 1px solid #f1f5f9; }
        .totals-row.grand { background: #f0fdfa; font-weight: 800; font-size: 15px; color: #0f766e; border-top: 2px solid #0d9488; }
        .totals-row.due { background: #fff1f2; font-weight: 800; font-size: 14px; color: #be123c; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 10px; }
        .sign-box { text-align: center; width: 200px; border-top: 1px dashed #94a3b8; padding-top: 6px; font-size: 11px; color: #475569; font-weight: 600; }
        .footer-note { margin-top: 24px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; }
      </style>
    `;
  }

  /**
   * Generates bilingual printable HTML for a Retail Sale Invoice.
   */
  static generateInvoiceHtml(sale: ISale): string {
    const itemsHtml = sale.items
      .map(
        (item, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td><strong>${item.materialName}</strong></td>
          <td class="text-center">${item.quantity} ${item.unit}</td>
          <td class="text-right">${this.formatPaise(item.rate)}</td>
          <td class="text-right"><strong>${this.formatPaise(item.lineTotal)}</strong></td>
        </tr>
      `
      )
      .join('');

    const badgeClass =
      sale.paymentStatus === 'PAID'
        ? 'badge-paid'
        : sale.paymentStatus === 'PARTIAL'
        ? 'badge-partial'
        : 'badge-unpaid';

    const badgeLabel =
      sale.paymentStatus === 'PAID'
        ? 'PAID / नकद'
        : sale.paymentStatus === 'PARTIAL'
        ? 'PARTIAL / आंशिक'
        : 'UNPAID / बाकी';

    const words = this.numberToIndianWords(sale.grandTotal);
    const dateFormatted = new Date(sale.saleDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice #${sale.invoiceNumber}</title>
        ${this.getBaseCss()}
      </head>
      <body>
        <div class="header">
          <div class="brand-row">
            <div>
              <h1 class="brand-title">GITTIBALU DEPO</h1>
              <div class="brand-hindi">गिट्टी बालू डिपो • Aapke Construction Business Ka Digital Khata.</div>
              <div class="brand-tagline">Balu, Cement, Gitti, Steel TMT, Bricks & Building Materials</div>
            </div>
            <div class="brand-contact">
              <div><strong>Main Road, Koelwar / Bihta</strong></div>
              <div>Patna - 801103, Bihar</div>
              <div>Mobile: +91 98350 XXXXX</div>
              <div>GSTIN: 10AABCB1234F1Z8</div>
              <span class="doc-badge ${badgeClass}">${badgeLabel}</span>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-col">
            <div class="info-label">Billed To (ग्राहक):</div>
            <div class="info-val">${sale.customerName}</div>
            <div style="font-size: 11px; color: #475569;">📞 ${sale.customerMobile}</div>
          </div>
          <div class="info-col" style="text-align: right;">
            <div class="info-label">Invoice Details:</div>
            <div class="info-val">#${sale.invoiceNumber}</div>
            <div style="font-size: 11px; color: #475569;">Date: ${dateFormatted}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">#</th>
              <th>Material Description (सामान)</th>
              <th class="text-center" style="width: 100px;">Qty & Unit</th>
              <th class="text-right" style="width: 110px;">Rate (दर)</th>
              <th class="text-right" style="width: 120px;">Amount (कुल)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals-container">
          <div class="words-box">
            <div class="words-title">Amount in Words (शब्दों में):</div>
            <div class="words-text">${words}</div>
            ${
              sale.notes
                ? `<div style="margin-top: 12px; font-size: 11px; color: #64748b;"><strong>Notes:</strong> ${sale.notes}</div>`
                : ''
            }
          </div>

          <div class="totals-table">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>${this.formatPaise(sale.subtotal)}</span>
            </div>
            ${
              sale.transportCharges > 0
                ? `<div class="totals-row">
                     <span>Transport / भाड़ा:</span>
                     <span>+${this.formatPaise(sale.transportCharges)}</span>
                   </div>`
                : ''
            }
            ${
              sale.discount > 0
                ? `<div class="totals-row">
                     <span>Discount / छूट:</span>
                     <span>-${this.formatPaise(sale.discount)}</span>
                   </div>`
                : ''
            }
            <div class="totals-row grand">
              <span>Grand Total:</span>
              <span>${this.formatPaise(sale.grandTotal)}</span>
            </div>
            <div class="totals-row">
              <span>Amount Paid:</span>
              <span style="color: #166534; font-weight: 700;">${this.formatPaise(sale.amountPaid)}</span>
            </div>
            <div class="totals-row due">
              <span>Balance Due (बाकी):</span>
              <span>${this.formatPaise(sale.balanceDue)}</span>
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="sign-box">Customer / Receiver's Signature</div>
          <div class="sign-box">For GittiBalu Depo<br>(Authorized Signatory)</div>
        </div>

        <div class="footer-note">
          Computer generated retail tax bill • GittiBalu Depo • Thank you for your business!
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generates bilingual printable HTML for an Estimate / Price Quotation.
   */
  static generateEstimateHtml(estimate: IEstimate): string {
    const itemsHtml = estimate.items
      .map(
        (item, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td><strong>${item.materialName}</strong></td>
          <td class="text-center">${item.quantity} ${item.unit}</td>
          <td class="text-right">${this.formatPaise(item.rate)}</td>
          <td class="text-right"><strong>${this.formatPaise(item.lineTotal)}</strong></td>
        </tr>
      `
      )
      .join('');

    const words = this.numberToIndianWords(estimate.grandTotal);
    const dateFormatted = new Date(estimate.estimateDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Quotation #${estimate.estimateNumber}</title>
        ${this.getBaseCss()}
      </head>
      <body>
        <div class="header">
          <div class="brand-row">
            <div>
              <h1 class="brand-title">GITTIBALU DEPO</h1>
              <div class="brand-hindi">अनुमान / कोटेशन (PRICE QUOTATION)</div>
              <div class="brand-tagline">Retail Construction Materials & Logistics</div>
            </div>
            <div class="brand-contact">
              <div>Main Road, Koelwar / Bihta</div>
              <div>Mobile: +91 98350 XXXXX</div>
              <span class="doc-badge badge-partial">QUOTATION</span>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-col">
            <div class="info-label">Quoted To (ग्राहक):</div>
            <div class="info-val">${estimate.customerName}</div>
            <div style="font-size: 11px; color: #475569;">📞 ${estimate.customerMobile}</div>
            ${estimate.village ? `<div style="font-size: 11px; color: #475569;">📍 ${estimate.village}</div>` : ''}
          </div>
          <div class="info-col" style="text-align: right;">
            <div class="info-label">Quotation Details:</div>
            <div class="info-val">#${estimate.estimateNumber}</div>
            <div style="font-size: 11px; color: #475569;">Date: ${dateFormatted}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">#</th>
              <th>Material Description</th>
              <th class="text-center" style="width: 100px;">Qty & Unit</th>
              <th class="text-right" style="width: 110px;">Quoted Rate</th>
              <th class="text-right" style="width: 120px;">Estimated Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals-container">
          <div class="words-box">
            <div class="words-title">Estimated Amount in Words:</div>
            <div class="words-text">${words}</div>
            <div style="margin-top: 12px; font-size: 11px; color: #64748b;">
              <strong>Terms:</strong> Quoted rates are valid for 7 days from the quotation date. Subject to market price fluctuations.
            </div>
          </div>

          <div class="totals-table">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>${this.formatPaise(estimate.subtotal)}</span>
            </div>
            ${
              estimate.transportCharges > 0
                ? `<div class="totals-row">
                     <span>Transport / भाड़ा:</span>
                     <span>+${this.formatPaise(estimate.transportCharges)}</span>
                   </div>`
                : ''
            }
            ${
              estimate.discount > 0
                ? `<div class="totals-row">
                     <span>Discount / छूट:</span>
                     <span>-${this.formatPaise(estimate.discount)}</span>
                   </div>`
                : ''
            }
            <div class="totals-row grand">
              <span>Estimated Total:</span>
              <span>${this.formatPaise(estimate.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div class="signatures">
          <div class="sign-box">Client Acceptance</div>
          <div class="sign-box">For GittiBalu Depo</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generates bilingual printable HTML for Customer Ledger Statement (Bahi Khata).
   */
  static generateLedgerStatementHtml(
    customer: ICustomer,
    entries: ILedgerEntry[],
    startDate?: Date,
    endDate?: Date
  ): string {
    let totalDebit = 0;
    let totalCredit = 0;

    const rowsHtml = entries
      .map((entry, idx) => {
        totalDebit += entry.debit;
        totalCredit += entry.credit;

        const dateStr = new Date(entry.date).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        return `
          <tr>
            <td class="text-center">${idx + 1}</td>
            <td>${dateStr}</td>
            <td>${entry.description}</td>
            <td class="text-right" style="color: #b91c1c;">${entry.debit > 0 ? this.formatPaise(entry.debit) : '-'}</td>
            <td class="text-right" style="color: #15803d;">${entry.credit > 0 ? this.formatPaise(entry.credit) : '-'}</td>
            <td class="text-right"><strong>${this.formatPaise(entry.runningBalance)}</strong></td>
          </tr>
        `;
      })
      .join('');

    const periodStr =
      startDate && endDate
        ? `${startDate.toLocaleDateString('en-IN')} to ${endDate.toLocaleDateString('en-IN')}`
        : 'All Historical Transactions';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Khata Statement - ${customer.name}</title>
        ${this.getBaseCss()}
      </head>
      <body>
        <div class="header">
          <div class="brand-row">
            <div>
              <h1 class="brand-title">GITTIBALU DEPO</h1>
              <div class="brand-hindi">ग्राहक खाता विवरणी (CUSTOMER ACCOUNT STATEMENT)</div>
              <div class="brand-tagline">Retail Building Materials • Ledger Book</div>
            </div>
            <div class="brand-contact">
              <div>Main Road, Koelwar / Bihta, Bihar</div>
              <div>Phone: +91 98350 XXXXX</div>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-col">
            <div class="info-label">Customer Profile (खाताधारक):</div>
            <div class="info-val">${customer.name}</div>
            <div style="font-size: 11px; color: #475569;">📞 ${customer.mobile} ${customer.village ? `• 📍 ${customer.village}` : ''}</div>
          </div>
          <div class="info-col" style="text-align: right;">
            <div class="info-label">Statement Period:</div>
            <div class="info-val">${periodStr}</div>
            <div style="font-size: 13px; font-weight: 700; color: ${customer.currentBalance > 0 ? '#b91c1c' : '#15803d'}; margin-top: 4px;">
              Net Balance: ${this.formatPaise(customer.currentBalance)} (${customer.currentBalance > 0 ? 'Dues / बाकी' : 'Advance / जमा'})
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 40px;">#</th>
              <th style="width: 90px;">Date</th>
              <th>Particulars / विवरण</th>
              <th class="text-right" style="width: 110px;">Debit (+) माल</th>
              <th class="text-right" style="width: 110px;">Credit (-) जमा</th>
              <th class="text-right" style="width: 120px;">Balance (बाकी)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
          <tfoot>
            <tr style="background: #f1f5f9; font-weight: 700;">
              <td colspan="3" class="text-right">Totals:</td>
              <td class="text-right" style="color: #b91c1c;">${this.formatPaise(totalDebit)}</td>
              <td class="text-right" style="color: #15803d;">${this.formatPaise(totalCredit)}</td>
              <td class="text-right">${this.formatPaise(customer.currentBalance)}</td>
            </tr>
          </tfoot>
        </table>

        <div class="signatures" style="margin-top: 50px;">
          <div class="sign-box">Customer Signature</div>
          <div class="sign-box">For GittiBalu Depo</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generates bilingual printable HTML for a Payment Receipt.
   */
  static generatePaymentReceiptHtml(payment: IPayment): string {
    const words = this.numberToIndianWords(payment.amount);
    const dateFormatted = new Date(payment.paymentDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Payment Receipt #${payment.paymentNumber}</title>
        ${this.getBaseCss()}
      </head>
      <body>
        <div class="header">
          <div class="brand-row">
            <div>
              <h1 class="brand-title">GITTIBALU DEPO</h1>
              <div class="brand-hindi">भुगतान रसीद (PAYMENT RECEIPT)</div>
            </div>
            <div class="brand-contact">
              <div>Main Road, Koelwar / Bihta</div>
              <div>Phone: +91 98350 XXXXX</div>
              <span class="doc-badge badge-paid">PAYMENT RECEIVED</span>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-col">
            <div class="info-label">Received From (प्राप्तकर्ता):</div>
            <div class="info-val">${payment.customerName}</div>
            <div style="font-size: 11px; color: #475569;">📞 ${payment.customerMobile}</div>
          </div>
          <div class="info-col" style="text-align: right;">
            <div class="info-label">Receipt Details:</div>
            <div class="info-val">#${payment.paymentNumber}</div>
            <div style="font-size: 11px; color: #475569;">Date: ${dateFormatted}</div>
          </div>
        </div>

        <div style="border: 2px solid #0d9488; border-radius: 8px; padding: 20px; background: #f0fdfa; margin-bottom: 24px;">
          <div style="font-size: 14px; color: #0f766e; margin-bottom: 8px;">Received with thanks the sum of:</div>
          <div style="font-size: 26px; font-weight: 800; color: #0f766e;">${this.formatPaise(payment.amount)}</div>
          <div style="font-size: 13px; font-style: italic; color: #475569; margin-top: 6px;">(${words})</div>

          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #ccfbf1; font-size: 12px; color: #334155;">
            <div><strong>Mode:</strong> ${payment.paymentMethod} ${payment.referenceNumber ? `• Ref/UTR: ${payment.referenceNumber}` : ''}</div>
            ${payment.notes ? `<div><strong>Notes:</strong> ${payment.notes}</div>` : ''}
          </div>
        </div>

        <div class="signatures">
          <div class="sign-box">Payer's Signature</div>
          <div class="sign-box">Authorized Signatory<br>GittiBalu Depo</div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generates bilingual printable HTML for Delivery Challan.
   */
  static generateChallanHtml(delivery: IDelivery): string {
    const itemsHtml = delivery.items
      .map(
        (item, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td><strong>${item.materialName}</strong></td>
          <td class="text-center" style="font-size: 14px; font-weight: 700;">${item.quantity} ${item.unit}</td>
        </tr>
      `
      )
      .join('');

    const dateFormatted = new Date(delivery.dispatchDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Challan #${delivery.challanNumber}</title>
        ${this.getBaseCss()}
      </head>
      <body>
        <div class="header">
          <div class="brand-row">
            <div>
              <h1 class="brand-title">GITTIBALU DEPO</h1>
              <div class="brand-hindi">सामान डिलीवरी चालान (DELIVERY CHALLAN)</div>
              <div class="brand-tagline">Building Materials Transport & Logistics</div>
            </div>
            <div class="brand-contact">
              <div>Main Road, Koelwar / Bihta, Bihar</div>
              <div>Phone: +91 98350 XXXXX</div>
              <span class="doc-badge badge-paid">GOODS DISPATCHED</span>
            </div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-col">
            <div class="info-label">Customer & Delivery Site:</div>
            <div class="info-val">${delivery.customerName}</div>
            <div style="font-size: 11px; color: #475569;">📞 ${delivery.customerMobile}</div>
            <div style="font-size: 11px; color: #0f766e; margin-top: 4px;">📍 <strong>Site Address:</strong> ${delivery.deliveryAddress}</div>
          </div>
          <div class="info-col" style="text-align: right;">
            <div class="info-label">Challan Details:</div>
            <div class="info-val">#${delivery.challanNumber}</div>
            <div style="font-size: 11px; color: #475569;">Against Invoice: #${delivery.invoiceNumber}</div>
            <div style="font-size: 11px; color: #475569;">Dispatch Date: ${dateFormatted}</div>
          </div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 16px; display: flex; justify-content: space-between;">
          <div>
            <strong>Vehicle (गाड़ी):</strong> ${delivery.vehicleNumber || 'Store Vehicle'}
          </div>
          <div>
            <strong>Driver (चालक):</strong> ${delivery.driverName || 'Designated Driver'} ${delivery.driverMobile ? `(${delivery.driverMobile})` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 50px;">#</th>
              <th>Material Dispatched (भेजा गया सामान)</th>
              <th class="text-center" style="width: 180px;">Dispatched Quantity</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        ${delivery.notes ? `<div style="font-size: 11px; color: #64748b; margin-bottom: 16px;"><strong>Remarks:</strong> ${delivery.notes}</div>` : ''}

        <div class="signatures" style="margin-top: 60px;">
          <div class="sign-box">Driver Signature (चालक हस्ताक्षर)</div>
          <div class="sign-box">Receiver Signature (प्राप्तकर्ता हस्ताक्षर)</div>
          <div class="sign-box">Authorized Dispatcher<br>GittiBalu Depo</div>
        </div>

        <div class="footer-note">
          Check goods upon delivery • GittiBalu Depo • Thank you!
        </div>
      </body>
      </html>
    `;
  }
}
