import { useAuthStore } from '../store/authStore';
import { handleDemoRequest } from '../utils/demoData';

const API_BASE_URL = '/api';

interface RequestOptions extends RequestInit {
  body?: any;
}

async function request(endpoint: string, options: RequestOptions = {}) {
  // Check if Demo Mode is active (auth and chat endpoints always reach live backend)
  const isDemo = localStorage.getItem('demo_mode') === 'true';
  const isChatEndpoint = endpoint.startsWith('/chat');
  const isAuthEndpoint = endpoint.startsWith('/auth');
  if (isDemo && !isChatEndpoint && !isAuthEndpoint) {
    // Artificial latency to keep dashboard loader states realistic
    await new Promise((resolve) => setTimeout(resolve, 300));
    return handleDemoRequest(endpoint, options);
  }

  const token = useAuthStore.getState().token;
  
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30000ms connection timeout

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

    // Handle session expiration for non-auth endpoints only
    if (response.status === 401 && !isAuthEndpoint) {
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
    throw error;
  }
}

export const api = {
  get: (endpoint: string, options?: Omit<RequestOptions, 'body'>) => 
    request(endpoint, { ...options, method: 'GET' }),
    
  post: (endpoint: string, body?: any, options?: Omit<RequestOptions, 'body'>) => 
    request(endpoint, { ...options, method: 'POST', body }),
    
  delete: (endpoint: string, options?: Omit<RequestOptions, 'body'>) => 
    request(endpoint, { ...options, method: 'DELETE' }),
};

