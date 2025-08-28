import axios from "axios";
import { LicenseManager } from '../src/main/services/LicenseManager';
import { IApiResponse, IApiErrorResponse, ApiStatus, FAErrorCode, ErrorSeverity } from '../shared/types';

// LicenseManager instance'ını oluştur
const licenseManager = new LicenseManager();

// Lisans anahtarını al
const getLicenseKey = (): string | null => {
  const licenseStatus = licenseManager.getLicenseStatus();
  return licenseStatus.isValid ? licenseStatus.licenseKey || null : null;
};

// Base API yapılandırması
const baseApi = axios.create({
  baseURL: 'http://localhost:8001/api', // Farklı base URL
  proxy: false,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor - Her istekte Authorization header'ını ekle
baseApi.interceptors.request.use(
  (config) => {
    const licenseKey = getLicenseKey();
    if (licenseKey) {
      config.headers.Authorization = `Bearer ${getLicenseKey()}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Response'ları standart formata çevir ve hata durumlarını yönet
baseApi.interceptors.response.use(
  (response) => {
    // Eğer response zaten IApiResponse formatında değilse, wrap et
    if (response.data && typeof response.data === 'object' && !('success' in response.data)) {
      response.data = createSuccessResponse(response.data, {
        originalStatus: response.status,
        originalStatusText: response.statusText
      });
    }
    return response;
  },
  (error) => {
    // 401 Unauthorized durumunda lisans geçersiz
    if (error.response?.status === 401) {
      console.error('Lisans anahtarı geçersiz veya süresi dolmuş');
      // Burada lisans yenileme sayfasına yönlendirme yapılabilir
    }

    // Eğer error response zaten IApiErrorResponse formatında değilse, wrap et
    if (error.response?.data && typeof error.response.data === 'object' && !('success' in error.response.data)) {
      const errorCode = error.response.status === 400 ? FAErrorCode.BAD_REQUEST :
        error.response.status === 401 ? FAErrorCode.AUTHENTICATION_ERROR :
          error.response.status === 403 ? FAErrorCode.AUTHORIZATION_ERROR :
            error.response.status === 404 ? FAErrorCode.NOT_FOUND :
              error.response.status === 409 ? FAErrorCode.CONFLICT :
                error.response.status === 429 ? FAErrorCode.RATE_LIMIT_EXCEEDED :
                  error.response.status === 503 ? FAErrorCode.SERVICE_UNAVAILABLE :
                    FAErrorCode.INTERNAL_SERVER_ERROR;

      const severity = error.response.status >= 500 ? ErrorSeverity.HIGH :
        error.response.status >= 400 ? ErrorSeverity.MEDIUM :
          ErrorSeverity.LOW;

      error.response.data = createErrorResponse(
        error.response.data.message || error.message || 'An error occurred',
        errorCode,
        severity,
        error.response.data,
        `req-${Date.now()}`
      );
    }

    return Promise.reject(error);
  }
);

// Response Helper Functions
export const createSuccessResponse = <T>(
  data: T,
  meta?: Record<string, any>
): IApiResponse<T> => {
  return {
    success: true,
    status: ApiStatus.SUCCESS,
    data,
    meta
  };
};

export const createErrorResponse = (
  message: string,
  code: FAErrorCode = FAErrorCode.INTERNAL_SERVER_ERROR,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  details?: any,
  requestId?: string,
  meta?: Record<string, any>
): IApiErrorResponse => {
  return {
    success: false,
    status: ApiStatus.ERROR,
    error: {
      message,
      code,
      severity,
      details,
      timestamp: new Date().toISOString(),
      requestId
    },
    meta
  };
};

export const createWarningResponse = <T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
): IApiResponse<T> => {
  return {
    success: true,
    status: ApiStatus.WARNING,
    data,
    meta: {
      ...meta,
      warning: message
    }
  };
};

export const createInfoResponse = <T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
): IApiResponse<T> => {
  return {
    success: true,
    status: ApiStatus.INFO,
    data,
    meta: {
      ...meta,
      info: message
    }
  };
};

export default baseApi;
export { ApiStatus, FAErrorCode, ErrorSeverity };