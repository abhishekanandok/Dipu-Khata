import { Request, Response, NextFunction } from 'express';
import { Sale } from '../sales/sale.model.js';
import { Estimate } from '../sales/estimate.model.js';
import { Customer } from '../customers/customer.model.js';
import { LedgerEntry } from '../ledger/ledger.model.js';
import { Payment } from '../payments/payment.model.js';
import { Delivery } from '../deliveries/delivery.model.js';
import { DocumentTemplateService } from './documentTemplate.service.js';
import { AppError } from '../../middleware/errorHandler.js';

export class DocumentController {
  static async getInvoiceHtml(req: Request, res: Response, next: NextFunction) {
    try {
      const sale = await Sale.findById(req.params.id);
      if (!sale) {
        throw new AppError('Sale invoice not found', 404);
      }

      const html = DocumentTemplateService.generateInvoiceHtml(sale);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (error) {
      return next(error);
    }
  }

  static async getEstimateHtml(req: Request, res: Response, next: NextFunction) {
    try {
      const estimate = await Estimate.findById(req.params.id);
      if (!estimate) {
        throw new AppError('Estimate not found', 404);
      }

      const html = DocumentTemplateService.generateEstimateHtml(estimate);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (error) {
      return next(error);
    }
  }

  static async getCustomerStatementHtml(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await Customer.findById(req.params.id);
      if (!customer) {
        throw new AppError('Customer not found', 404);
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const filter: any = { customerId: customer._id };
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = startDate;
        if (endDate) filter.date.$lte = endDate;
      }

      const entries = await LedgerEntry.find(filter).sort({ date: 1, createdAt: 1 });
      const html = DocumentTemplateService.generateLedgerStatementHtml(
        customer,
        entries,
        startDate,
        endDate
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (error) {
      return next(error);
    }
  }

  static async getPaymentReceiptHtml(req: Request, res: Response, next: NextFunction) {
    try {
      const payment = await Payment.findById(req.params.id);
      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      const html = DocumentTemplateService.generatePaymentReceiptHtml(payment);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (error) {
      return next(error);
    }
  }

  static async getChallanHtml(req: Request, res: Response, next: NextFunction) {
    try {
      const delivery = await Delivery.findById(req.params.id);
      if (!delivery) {
        throw new AppError('Delivery challan not found', 404);
      }

      const html = DocumentTemplateService.generateChallanHtml(delivery);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (error) {
      return next(error);
    }
  }
}
