import { z } from 'zod';

export const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ReportQueryParams = z.infer<typeof reportQuerySchema>;
