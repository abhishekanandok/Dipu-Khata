export type PaymentMethod = 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';

export type TransactionType = 'OPENING_BALANCE' | 'SALE' | 'PAYMENT' | 'SALES_RETURN' | 'ADJUSTMENT';

export type BalanceType = 'RECEIVABLE' | 'PAYABLE';

export type MaterialUnit = 'CFT' | 'TON' | 'BAG' | 'KG' | 'PIECE' | 'TRIP' | 'CUSTOM';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  village?: string;
  address?: string;
  currentBalance: number; // In paise
  openingBalance: number;
  openingBalanceType: BalanceType;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  name: string;
  hindiName?: string;
  categoryId: string;
  defaultUnit: MaterialUnit;
  sellingRate: number; // In paise
  purchaseRate: number; // In paise
  currentStock: number;
  minimumStockAlert: number;
  isActive: boolean;
}

export interface ApiHealthStatus {
  status: string;
  service: string;
  version: string;
  uptime: string;
  database: {
    status: string;
    connected: boolean;
  };
  system: {
    nodeVersion: string;
    memoryUsageMb: number;
  };
  timestamp: string;
}
