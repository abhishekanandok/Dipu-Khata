import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { ApiHealthStatus } from '../types';

const getBaseUrl = (): string => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

export const API_BASE_URL = getBaseUrl();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {}
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/register')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refresh_token');
        if (!refreshToken) throw new Error('No refresh token available');

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data;
        await SecureStore.setItemAsync('auth_token', accessToken);
        await SecureStore.setItemAsync('refresh_token', newRefreshToken);

        apiClient.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user_profile');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const api = {
  getHealth: async (): Promise<ApiHealthStatus> => {
    const response = await apiClient.get('/health');
    return response.data.data;
  },
  getDashboardSummary: async (filter = 'today', startDate?: string, endDate?: string) => {
    const params: Record<string, string> = { filter };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiClient.get('/dashboard/summary', { params });
    return response.data.data;
  },
  // Customer & Khata APIs
  getCustomers: async (search?: string, filter = 'all', page = 1, limit = 30) => {
    const params: Record<string, any> = { filter, page, limit };
    if (search) params.search = search;
    const response = await apiClient.get('/customers', { params });
    return response.data;
  },
  getCustomerById: async (id: string) => {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data.data;
  },
  createCustomer: async (data: any) => {
    const response = await apiClient.post('/customers', data);
    return response.data.data;
  },
  updateCustomer: async (id: string, data: any) => {
    const response = await apiClient.put(`/customers/${id}`, data);
    return response.data.data;
  },
  getCustomerLedger: async (id: string, page = 1, limit = 50) => {
    const response = await apiClient.get(`/customers/${id}/ledger`, {
      params: { page, limit },
    });
    return response.data;
  },
  getCustomerSummary: async (id: string) => {
    const response = await apiClient.get(`/customers/${id}/summary`);
    return response.data.data;
  },
  addCustomerAdjustment: async (id: string, data: any) => {
    const response = await apiClient.post(`/customers/${id}/adjustment`, data);
    return response.data.data;
  },
  // Material & Category APIs
  getCategories: async () => {
    const response = await apiClient.get('/categories');
    return response.data.data;
  },
  createCategory: async (data: { name: string; hindiName?: string; description?: string }) => {
    const response = await apiClient.post('/categories', data);
    return response.data.data;
  },
  getMaterials: async (search?: string, category?: string, lowStockOnly?: boolean) => {
    const params: Record<string, any> = {};
    if (search) params.search = search;
    if (category && category !== 'All') params.category = category;
    if (lowStockOnly) params.lowStockOnly = 'true';
    const response = await apiClient.get('/materials', { params });
    return response.data;
  },
  getMaterialById: async (id: string) => {
    const response = await apiClient.get(`/materials/${id}`);
    return response.data.data;
  },
  createMaterial: async (data: any) => {
    const response = await apiClient.post('/materials', data);
    return response.data.data;
  },
  updateMaterial: async (id: string, data: any) => {
    const response = await apiClient.put(`/materials/${id}`, data);
    return response.data.data;
  },
  getPriceHistory: async (id: string) => {
    const response = await apiClient.get(`/materials/${id}/price-history`);
    return response.data.data;
  },
  // Purchase & Supplier APIs
  getSuppliers: async () => {
    const response = await apiClient.get('/suppliers');
    return response.data.data;
  },
  createSupplier: async (data: {
    name: string;
    companyName?: string;
    mobile: string;
    address?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post('/suppliers', data);
    return response.data.data;
  },
  getPurchases: async (search?: string, supplierId?: string) => {
    const params: Record<string, any> = {};
    if (search) params.search = search;
    if (supplierId) params.supplierId = supplierId;
    const response = await apiClient.get('/purchases', { params });
    return response.data;
  },
  getPurchaseById: async (id: string) => {
    const response = await apiClient.get(`/purchases/${id}`);
    return response.data.data;
  },
  createPurchase: async (data: any) => {
    const response = await apiClient.post('/purchases', data);
    return response.data.data;
  },
  // Sales & Invoices APIs
  getSales: async (params?: {
    search?: string;
    customerId?: string;
    paymentStatus?: string;
    deliveryStatus?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/sales', { params });
    return response.data;
  },
  getSaleById: async (id: string) => {
    const response = await apiClient.get(`/sales/${id}`);
    return response.data.data;
  },
  createSale: async (data: any) => {
    const response = await apiClient.post('/sales', data);
    return response.data.data;
  },
  cancelSale: async (id: string, reason: string) => {
    const response = await apiClient.post(`/sales/${id}/cancel`, { reason });
    return response.data.data;
  },
  // Estimates APIs
  getEstimates: async (params?: { search?: string; status?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/estimates', { params });
    return response.data;
  },
  getEstimateById: async (id: string) => {
    const response = await apiClient.get(`/estimates/${id}`);
    return response.data.data;
  },
  createEstimate: async (data: any) => {
    const response = await apiClient.post('/estimates', data);
    return response.data.data;
  },
  convertEstimate: async (id: string, data: any) => {
    const response = await apiClient.post(`/estimates/${id}/convert`, data);
    return response.data.data;
  },
  // Payments & Cash Book APIs
  createPayment: async (data: {
    customerId: string;
    amount: number;
    paymentMethod: 'CASH' | 'UPI' | 'BANK' | 'CHEQUE';
    referenceNumber?: string;
    relatedSaleId?: string;
    paymentDate?: string;
    notes?: string;
  }) => {
    const response = await apiClient.post('/payments', data);
    return response.data.data;
  },
  getPayments: async (params?: {
    search?: string;
    customerId?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/payments', { params });
    return response.data;
  },
  getPaymentById: async (id: string) => {
    const response = await apiClient.get(`/payments/${id}`);
    return response.data.data;
  },
  getCashBook: async (params?: { date?: string; startDate?: string; endDate?: string }) => {
    const response = await apiClient.get('/accounting/cash-book', { params });
    return response.data.data;
  },
  getOutstandingDues: async () => {
    const response = await apiClient.get('/accounting/outstanding');
    return response.data.data;
  },
  // Drivers & Vehicles APIs
  getDrivers: async () => {
    const response = await apiClient.get('/drivers');
    return response.data.data;
  },
  createDriver: async (data: { name: string; mobile: string; licenseNumber?: string; address?: string }) => {
    const response = await apiClient.post('/drivers', data);
    return response.data.data;
  },
  getVehicles: async () => {
    const response = await apiClient.get('/vehicles');
    return response.data.data;
  },
  createVehicle: async (data: { vehicleNumber: string; vehicleType: string; capacity?: string; notes?: string }) => {
    const response = await apiClient.post('/vehicles', data);
    return response.data.data;
  },
  // Deliveries & Challans APIs
  getDeliveries: async (params?: { saleId?: string; customerId?: string; status?: string; search?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get('/deliveries', { params });
    return response.data;
  },
  getDeliveryById: async (id: string) => {
    const response = await apiClient.get(`/deliveries/${id}`);
    return response.data.data;
  },
  createDelivery: async (data: any) => {
    const response = await apiClient.post('/deliveries', data);
    return response.data.data;
  },
  // Expenses APIs
  getExpenses: async (params?: {
    search?: string;
    category?: string;
    paymentMethod?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const response = await apiClient.get('/expenses', { params });
    return response.data;
  },
  createExpense: async (data: {
    category: 'TRANSPORT' | 'FUEL' | 'LABOUR' | 'MAINTENANCE' | 'SHOP' | 'MISC';
    amount: number;
    paymentMethod: 'CASH' | 'UPI' | 'BANK';
    paidTo?: string;
    notes?: string;
    date?: string;
  }) => {
    const response = await apiClient.post('/expenses', data);
    return response.data.data;
  },
  cancelExpense: async (id: string) => {
    const response = await apiClient.post(`/expenses/${id}/cancel`);
    return response.data.data;
  },
  // Financial Reports APIs
  getSalesSummaryReport: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await apiClient.get('/reports/sales-summary', { params });
    return response.data.data;
  },
  getCashFlowReport: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await apiClient.get('/reports/cash-flow', { params });
    return response.data.data;
  },
  getProfitLossReport: async (params?: { startDate?: string; endDate?: string }) => {
    const response = await apiClient.get('/reports/profit-loss', { params });
    return response.data.data;
  },
  getStockValuationReport: async () => {
    const response = await apiClient.get('/reports/stock-valuation');
    return response.data.data;
  },
  // Inventory APIs
  getStockOverview: async () => {
    const response = await apiClient.get('/inventory');
    return response.data.data;
  },
  getStockMovements: async (materialId?: string, movementType?: string) => {
    const params: Record<string, any> = {};
    if (materialId) params.materialId = materialId;
    if (movementType) params.movementType = movementType;
    const response = await apiClient.get('/inventory/movements', { params });
    return response.data;
  },
  adjustStock: async (data: {
    materialId: string;
    type: 'ADD' | 'SUBTRACT' | 'DAMAGE' | 'WASTAGE';
    quantity: number;
    reason: string;
  }) => {
    const response = await apiClient.post('/inventory/adjustments', data);
    return response.data.data;
  },
  // Auth APIs
  forgotPassword: async (email: string) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },
  resetPassword: async (token: string, password: string) => {
    const response = await apiClient.post('/auth/reset-password', { token, password });
    return response.data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },
};
