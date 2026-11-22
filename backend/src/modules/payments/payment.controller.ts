import { Response, NextFunction } from 'express';
import { PaymentService } from './payment.service.js';
import {
  createPaymentSchema,
  paymentQuerySchema,
  cashBookQuerySchema,
} from './payment.schema.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { ApiRes } from '../../utils/apiResponse.js';

export class PaymentController {
  static async createPayment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const idempotencyKey = (req.headers['idempotency-key'] as string) || req.body.idempotencyKey;
      const validated = createPaymentSchema.parse({
        ...req.body,
        idempotencyKey,
      });

      const payment = await PaymentService.createPayment(validated, req.userId);

      return ApiRes.created(
        res,
        payment,
        `Payment #${payment.paymentNumber} recorded successfully`
      );
    } catch (error) {
      return next(error);
    }
  }

  static async getPayments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = paymentQuerySchema.parse(req.query);
      const result = await PaymentService.getPayments(validated);

      return ApiRes.success(
        res,
        {
          payments: result.payments,
          summary: result.summary,
        },
        'Payments fetched successfully',
        200,
        {
          timestamp: new Date().toISOString(),
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.totalCount,
            totalPages: result.totalPages,
          },
        }
      );
    } catch (error) {
      return next(error);
    }
  }

  static async getPaymentById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const payment = await PaymentService.getPaymentById(req.params.id as string);
      return ApiRes.success(res, payment, 'Payment details fetched');
    } catch (error) {
      return next(error);
    }
  }

  static async getCashBook(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = cashBookQuerySchema.parse(req.query);
      const cashBook = await PaymentService.getCashBook(validated);

      return ApiRes.success(res, cashBook, 'Daily cash book reconciled successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getOutstandingDues(_req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const outstanding = await PaymentService.getOutstandingDues();
      return ApiRes.success(res, outstanding, 'Outstanding aged receivables fetched');
    } catch (error) {
      return next(error);
    }
  }
}
