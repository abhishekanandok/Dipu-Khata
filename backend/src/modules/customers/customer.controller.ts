import { Response, NextFunction } from 'express';
import { ApiRes } from '../../utils/apiResponse.js';
import { CustomerService } from './customer.service.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import {
  CustomerQueryParams,
  LedgerQueryParams,
} from './customer.schema.js';

export class CustomerController {
  static async createCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await CustomerService.createCustomer(req.body, req.userId);
      return ApiRes.created(res, result, 'Customer created successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getCustomers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = req.query as unknown as CustomerQueryParams;
      const result = await CustomerService.getCustomers(query);
      return ApiRes.success(res, result.customers, 'Customers fetched successfully', 200, {
        pagination: result.meta,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getCustomerById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customerId = req.params.id as string;
      const customer = await CustomerService.getCustomerById(customerId);
      return ApiRes.success(res, customer, 'Customer retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async updateCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customerId = req.params.id as string;
      const customer = await CustomerService.updateCustomer(customerId, req.body);
      return ApiRes.success(res, customer, 'Customer updated successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async getCustomerLedger(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customerId = req.params.id as string;
      const query = req.query as unknown as LedgerQueryParams;
      const result = await CustomerService.getCustomerLedger(customerId, query);
      return ApiRes.success(res, result.entries, 'Ledger entries retrieved', 200, {
        pagination: result.meta,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return next(error);
    }
  }

  static async getCustomerSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customerId = req.params.id as string;
      const summary = await CustomerService.getCustomerSummary(customerId);
      return ApiRes.success(res, summary, 'Customer summary retrieved successfully');
    } catch (error) {
      return next(error);
    }
  }

  static async addAdjustment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customerId = req.params.id as string;
      const entry = await CustomerService.addAdjustment(customerId, req.body, req.userId);
      return ApiRes.created(res, entry, 'Adjustment entry posted successfully');
    } catch (error) {
      return next(error);
    }
  }
}
