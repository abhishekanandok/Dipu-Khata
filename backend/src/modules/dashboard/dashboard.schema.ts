import { z } from 'zod';

export const dashboardSummaryQuerySchema = z.object({
  query: z.object({
    filter: z.enum(['today', 'yesterday', 'this_week', 'this_month', 'custom']).default('today'),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
});

export type DashboardSummaryQuery = z.infer<typeof dashboardSummaryQuerySchema>['query'];
