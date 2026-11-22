import { Router, Request, Response } from 'express';
import { ApiRes } from '../utils/apiResponse.js';
import { getDbState } from '../config/database.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const db = getDbState();
  const uptime = process.uptime();
  
  const healthData = {
    status: db.isConnected ? 'healthy' : 'degraded',
    service: 'Dipu Khata & Trade API',
    version: '1.0.0',
    uptime: `${Math.floor(uptime)}s`,
    database: {
      status: db.state,
      connected: db.isConnected,
    },
    system: {
      nodeVersion: process.version,
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    },
    timestamp: new Date().toISOString(),
  };

  const statusCode = db.isConnected ? 200 : 503;
  return ApiRes.success(res, healthData, 'API is operational', statusCode);
});
