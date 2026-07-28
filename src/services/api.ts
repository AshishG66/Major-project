import { useAuthStore } from '../store/authStore';
import { handleDemoRequest } from '../utils/demoData';

const API_BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  body?: any;
}

async function request(endpoint: string, options: RequestOptions = {}, isRetry = false): Promise<any> {
  const isDemo = localStorage.getItem('demo_mode') === 'true';
  const isChatEndpoint = endpoint.startsWith('/chat');
  const isAuthEndpoint = endpoint.startsWith('/auth');
  const isPredictionEndpoint = endpoint.startsWith('/prediction');
  const isDashboardEndpoint = endpoint.startsWith('/dashboard');

  if (isDemo && !isChatEndpoint && !isAuthEndpoint && !isPredictionEndpoint && !isDashboardEndpoint) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return handleDemoRequest(endpoint, options);
  }

  let token = useAuthStore.getState().token;
  if (!token && (isDemo || isChatEndpoint)) {
    token = 'demo-token-123';
  }
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const config: RequestInit = {
    ...options,
    headers,
    signal: controller.signal
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    clearTimeout(timeoutId);

    if (response.status === 401 && !isAuthEndpoint && token !== 'demo-token-123' && !isRetry) {
      const { refreshToken, user } = useAuthStore.getState();
      if (refreshToken) {
        try {
          const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
          });
          
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            const newAccessToken = refreshData.accessToken;
            const newRefreshToken = refreshData.refreshToken;
            if (newAccessToken && user) {
              useAuthStore.getState().setAuth(user, newAccessToken, newRefreshToken);
              return request(endpoint, options, true);
            }
          }
        } catch (e) {
          // Refresh failed, proceed to handle as normal 401
        }
      }
      useAuthStore.getState().clearAuth();
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();

    if (!response.ok) {
      const apiError = new Error(data.message || 'Something went wrong');
      (apiError as any).isApiError = true;
      (apiError as any).response = { data };
      throw apiError;
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please check your connection.');
    }
    throw error;
  }
}

export const api = {
  get: (endpoint: string, options?: RequestOptions) => 
    request(endpoint, { ...options, method: 'GET' }),
  
  post: (endpoint: string, body?: any, options?: RequestOptions) => 
    request(endpoint, { ...options, method: 'POST', body }),
  
  put: (endpoint: string, body?: any, options?: RequestOptions) => 
    request(endpoint, { ...options, method: 'PUT', body }),
  
  delete: (endpoint: string, options?: RequestOptions) => 
    request(endpoint, { ...options, method: 'DELETE' }),
};
