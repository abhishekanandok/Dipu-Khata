import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiRes } from '../utils/apiResponse.js';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = parsed.body ?? req.body;
      req.query = parsed.query ?? req.query;
      req.params = parsed.params ?? req.params;
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        return ApiRes.badRequest(res, 'Request validation failed', error.errors);
      }
      return ApiRes.badRequest(res, 'Invalid request data');
    }
  };
};
