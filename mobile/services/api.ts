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
  createCustomer: async (data: {
    name: string;
    mobile: string;
    village?: string;
    address?: string;
    notes?: string;
    openingBalance: number;
    openingBalanceType: 'RECEIVABLE' | 'PAYABLE';
  }) => {
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
  addCustomerAdjustment: async (id: string, data: {
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    description: string;
  }) => {
    const response = await apiClient.post(`/customers/${id}/adjustment`, data);
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
