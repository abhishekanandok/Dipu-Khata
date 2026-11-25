import { Response, NextFunction } from 'express';
import { ExpenseService } from './expense.service.js';
import { createExpenseSchema, expenseQuerySchema } from './expense.schema.js';
import { AuthenticatedRequest } from '../auth/auth.middleware.js';
import { ApiRes } from '../../utils/apiResponse.js';

export class ExpenseController {
  static async createExpense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = createExpenseSchema.parse(req.body);
      const expense = await ExpenseService.createExpense(validated, req.userId);
      return ApiRes.created(
        res,
        expense,
        `Expense #${expense.expenseNumber} recorded successfully`
      );
    } catch (error) {
      return next(error);
    }
  }

  static async getExpenses(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const validated = expenseQuerySchema.parse(req.query);
      const result = await ExpenseService.getExpenses(validated);
      return ApiRes.success(
        res,
        {
          expenses: result.expenses,
          summary: result.summary,
        },
        'Expenses fetched successfully',
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

  static async cancelExpense(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const expense = await ExpenseService.cancelExpense(req.params.id as string);
      return ApiRes.success(res, expense, `Expense #${expense.expenseNumber} cancelled`);
    } catch (error) {
      return next(error);
    }
  }
}
