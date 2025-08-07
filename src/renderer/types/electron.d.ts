// Type definitions for Electron API exposed to renderer process

import { ElectronAPI } from '../../main/preload/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Re-export types for convenience
export type { ElectronAPI } from '../../main/preload/preload';
export type { 
  LicenseVerificationRequest,
  LicenseVerificationResponse,
  LicenseStatus,
  AppConfig,
  LogEntry
} from '../../../shared/types';

// Additional renderer-specific types
export interface PageProps {
  className?: string;
}

export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface FormState {
  isLoading: boolean;
  error: string | null;
  success: string | null;
}

export interface LicenseFormData {
  apiKey: string;
}

export interface AppState {
  currentPage: 'license-input' | 'kiosk' | 'license-renewal';
  licenseStatus: LicenseStatus | null;
  isInitialized: boolean;
}