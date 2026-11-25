import { Router } from 'express';
import { ExpenseController } from './expense.controller.js';
import { requireAuth } from '../auth/auth.middleware.js';

export const expenseRouter = Router();

expenseRouter.use(requireAuth);
expenseRouter.post('/', ExpenseController.createExpense);
expenseRouter.get('/', ExpenseController.getExpenses);
expenseRouter.post('/:id/cancel', ExpenseController.cancelExpense);
