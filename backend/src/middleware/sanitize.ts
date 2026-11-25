import { Request, Response, NextFunction } from 'express';

/**
 * Recursively strips MongoDB operator keys (starting with '$' or containing '.')
 * from user-supplied objects to prevent NoSQL injection.
 */
function sanitizeObject(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj !== null && typeof obj === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      clean[key] = sanitizeObject(value);
    }
    return clean;
  }
  return obj;
}

export const sanitizeRequest = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    const sanitizedQuery = sanitizeObject(req.query) as Record<string, any>;
    for (const key of Object.keys(req.query)) {
      if (!(key in sanitizedQuery)) {
        delete (req.query as Record<string, any>)[key];
      }
    }
  }
  next();
};
