import { useAuthStore } from '../store/authStore';
import { handleDemoRequest } from '../utils/demoData';

export const DEFAULT_PRODUCTION_API = 'https://hridayadarpana-api.onrender.com/api';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());

  // 1. Runtime override via localStorage for developer/network agility
  if (typeof window !== 'undefined') {
    const customBase = localStorage.getItem('hridaya_api_base');
    if (customBase) {
      const base = customBase.endsWith('/') ? customBase.slice(0, -1) : customBase;
      return base.endsWith('/api') ? base : `${base}/api`;
    }
  }

  // 2. Native Android / Capacitor Runtime
  if (isCapacitor) {
    if (envUrl) {
      const base = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
      return base.endsWith('/api') ? base : `${base}/api`;
    }
    // Emulator detection fallback only in development mode
    const isEmulator = typeof navigator !== 'undefined' && /sdk_gphone|emulator|google_sdk/i.test(navigator.userAgent || '');
    if (isEmulator && import.meta.env.DEV) {
      return 'http://10.0.2.2:5000/api';
    }
    return DEFAULT_PRODUCTION_API;
  }

  // 3. Desktop Localhost Web: always use relative /api with Vite dev proxy
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return '/api';
  }

  // 4. Remote/Hosted Web
  if (envUrl) {
    const base = envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
    return base.endsWith('/api') ? base : `${base}/api`;
  }

  return DEFAULT_PRODUCTION_API;
};

export const API_BASE_URL = getApiBaseUrl();

interface RequestOptions extends RequestInit {
  body?: any;
  timeout?: number;
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
  if (!token && isDemo) {
    token = 'demo-token-123';
  }
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Bounded timeout: 60s for LLM inference (chat endpoints), 25s for standard endpoints
  const timeoutMs = options.timeout ?? (isChatEndpoint ? 60000 : 25000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const config: RequestInit = {
    ...options,
    headers,
    signal: controller.signal
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const fullUrl = `${API_BASE_URL}${endpoint}`;
  const startTime = performance.now();
  const isCapacitor = typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());

  if (import.meta.env.DEV) {
    console.log(`[HridayaAI Diagnostic] platform=${isCapacitor ? 'android' : 'web'} apiBase=${API_BASE_URL} endpoint=${endpoint} requestStarted=true`);
  }

  try {
    const response = await fetch(fullUrl, config);
    clearTimeout(timeoutId);

    if (import.meta.env.DEV) {
      const durationMs = Math.round(performance.now() - startTime);
      console.log(`[HridayaAI Diagnostic] platform=${isCapacitor ? 'android' : 'web'} endpoint=${endpoint} responseStatus=${response.status} responseReceived=true durationMs=${durationMs}`);
    }

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
          // Refresh failed
        }
      }
      useAuthStore.getState().clearAuth();
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json();

    if (!response.ok) {
      const apiError = new Error(data.message || `API Error (${response.status})`);
      (apiError as any).isApiError = true;
      (apiError as any).response = { status: response.status, data };
      throw apiError;
    }

    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`[API Timeout] ${options.method || 'GET'} ${fullUrl} timed out after 30s.`);
      throw new Error('Request timeout. Please check your network connection.');
    }
    if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      console.error(`[API Network Failure] Could not connect to backend server at ${API_BASE_URL}`);
      throw new Error(`Unable to connect to HridayaDarpana server at ${API_BASE_URL}. Please verify your network connection.`);
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
