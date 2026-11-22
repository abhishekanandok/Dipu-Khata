import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import { apiClient } from './api';

export class PrintService {
  /**
   * Directly prints the HTML content via native Print Dialog (AirPrint / Wi-Fi thermal / A4).
   */
  static async printHtml(html: string): Promise<void> {
    try {
      await Print.printAsync({ html });
    } catch (err: any) {
      console.error('Print Error:', err);
      Alert.alert('Printing Error', err.message || 'Could not send document to printer.');
    }
  }

  /**
   * Converts HTML to PDF and opens the native Share Sheet (WhatsApp, Email, Drive, etc.).
   */
  static async sharePdf(html: string, dialogTitle = 'Share Document'): Promise<void> {
    try {
      const { uri } = await Print.printToFileAsync({ html });
      if (Platform.OS === 'web') {
        Alert.alert('Notice', 'Direct file sharing is supported on iOS and Android devices.');
        return;
      }
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Notice', 'Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle,
      });
    } catch (err: any) {
      console.error('Sharing Error:', err);
      Alert.alert('Sharing Error', err.message || 'Failed to export PDF.');
    }
  }

  /**
   * Fetches the formatted HTML invoice from backend and opens print/share.
   */
  static async printInvoice(saleId: string, action: 'print' | 'share' = 'share'): Promise<void> {
    try {
      const res = await apiClient.get(`/documents/invoices/${saleId}/html`);
      const html = res.data;
      if (action === 'print') {
        await this.printHtml(html);
      } else {
        await this.sharePdf(html, 'Share Invoice PDF');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to retrieve invoice document.');
    }
  }

  /**
   * Fetches the formatted HTML quotation and opens print/share.
   */
  static async printEstimate(estimateId: string, action: 'print' | 'share' = 'share'): Promise<void> {
    try {
      const res = await apiClient.get(`/documents/estimates/${estimateId}/html`);
      const html = res.data;
      if (action === 'print') {
        await this.printHtml(html);
      } else {
        await this.sharePdf(html, 'Share Quotation PDF');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to retrieve quotation document.');
    }
  }

  /**
   * Fetches customer account ledger statement and opens print/share.
   */
  static async printStatement(
    customerId: string,
    action: 'print' | 'share' = 'share',
    startDate?: string,
    endDate?: string
  ): Promise<void> {
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await apiClient.get(`/documents/statements/${customerId}/html`, { params });
      const html = res.data;
      if (action === 'print') {
        await this.printHtml(html);
      } else {
        await this.sharePdf(html, 'Share Account Statement PDF');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to retrieve account statement document.');
    }
  }

  /**
   * Fetches payment receipt and opens print/share.
   */
  static async printReceipt(paymentId: string, action: 'print' | 'share' = 'share'): Promise<void> {
    try {
      const res = await apiClient.get(`/documents/receipts/${paymentId}/html`);
      const html = res.data;
      if (action === 'print') {
        await this.printHtml(html);
      } else {
        await this.sharePdf(html, 'Share Payment Receipt PDF');
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to retrieve payment receipt document.');
    }
  }
}
