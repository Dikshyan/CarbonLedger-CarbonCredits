// frontend/src/lib/api.ts
import axios from 'axios';

const RAW_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const DJANGO_HOST = RAW_URL.replace(/\/api(\/v1)?\/?$/, '');
export const API_BASE_URL = `${DJANGO_HOST}/api/v1`;
export const AI_SERVICE_BASE_URL = (import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8001').replace(/\/+$/, '');

// Helper to get stored auth token
export const getAuthToken = (): string | null => {
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('authToken') ||
    null
  );
};

// 1. Axios instance with interceptor for Authorization
export const carbonAPI = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

carbonAPI.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. apiFetch with automatic Bearer token injection
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  let cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  cleanPath = cleanPath.replace(/^\/api(\/v1)?/, '');
  if (!cleanPath.startsWith('/')) cleanPath = `/${cleanPath}`;

  const fullUrl = `${API_BASE_URL}${cleanPath}`;
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errData.error || (typeof errData === 'string' ? errData : JSON.stringify(errData));
    } catch {
      // response is not JSON
    }
    const err: any = new Error(errorDetail || `API fetch error on ${cleanPath}: ${response.statusText}`);
    err.status = response.status;
    err.detail = errorDetail;
    throw err;
  }

  return response.json();
};

export const registerProject = async (projectData: any) => {
  const response = await carbonAPI.post('/CarbonLedger/', projectData);
  return response.data;
};

export const mintCredits = async (companyId: string, amount: number) => {
  const response = await carbonAPI.post(`/company/${companyId}/mint/`, { amount });
  return response.data;
};

export const fetchTransactionHistory = async () => {
  const response = await carbonAPI.get('/CarbonLedgerTransactions/');
  return response.data;
};




