// Shared types between main and renderer processes

export interface LicenseVerificationRequest {
  apiKey: string;
}

export interface LicenseVerificationResponse {
  valid: boolean;
  message?: string;
  expiresAt?: string;
  isExpired?: boolean;
}

export interface LicenseStatus {
  isValid: boolean;
  expiresAt?: Date;
  lastVerified?: Date;
  apiKey?: string;
}

export interface AppConfig {
  apiKey?: string;
  autoVerifyInterval: number; // minutes
  kioskMode: boolean;
}

// Port Management Types
export interface PortStatus {
  port: number;
  isAvailable: boolean;
  isInUse: boolean;
  conflictsWith?: string[];
  lastChecked?: string;
}

export interface PortConflictResolution {
  port: number;
  changed: boolean;
  resolved?: boolean;
  newPort?: number;
}

export interface PortScanResult {
  startPort: number;
  endPort: number;
  results: PortStatus[];
  totalScanned: number;
  availablePorts: number[];
  usedPorts: number[];
}

// Update Management Types
export interface UpdateStatus {
  available: boolean;
  version?: string;
  releaseDate?: string;
  downloadProgress?: number;
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  error?: string;
  downloading?: boolean;
  downloaded?: boolean;
  autoCheckEnabled?: boolean;
  lastChecked?: string;
  releaseNotes?: string;
  progress?: number;
}

export interface UpdateInfo {
  currentVersion: string;
  appName: string;
  updateStatus: UpdateStatus;
  platform: string;
  arch: string;
  nodeVersion: string;
  releaseDate?: string;
}

export interface UpdateSettings {
  autoDownload: boolean;
  autoInstall: boolean;
  checkInterval: number; // minutes
}

// Printer Types
export type PrinterProviderType = 'ip' | 'usb';

export interface PrinterDevice {
  id: string;
  name: string;
  provider: PrinterProviderType;
  online: boolean;
  details?: Record<string, any>;
}

export interface IPPrinterConfig {
  ip: string;
  port: number; // default 9100
  name?: string;
}

export interface USBPrinterInfo {
  name: string;
  isDefault: boolean;
  status?: string;
}

export interface PrintElementText {
  type: 'text';
  content: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  underline?: boolean;
}

export type PrintElement = PrintElementText; // genişletilebilir: image, barcode, qrcode

export interface PrintJobRequest {
  printerId: string;
  elements: PrintElement[];
}

export interface PrinterModuleSettings {
  ipEnabled: boolean;
  usbEnabled: boolean;
}

export interface IPDiscoveryRange {
  base: string; // e.g. "192.168.1"
  start: number; // 1
  end: number;   // 254
  port?: number; // default 9100
}

// Notification Types
export interface PortChangeNotification {
  oldPort: number;
  newPort: number;
  timestamp: string;
}

export interface UpdateNotification {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  progress?: number;
  error?: string;
}

export interface LogEntry {
  id: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// IPC Channel names
export const IPC_CHANNELS = {
  // License operations
  LICENSE_VERIFY: 'license:verify',
  LICENSE_STATUS: 'license:status',
  LICENSE_SAVE_KEY: 'license:save-key',
  LICENSE_GET_KEY: 'license:get-key',
  
  // Window operations
  WINDOW_SHOW_KIOSK: 'window:show-kiosk',
  WINDOW_SHOW_LICENSE_INPUT: 'window:show-license-input',
  WINDOW_SHOW_LICENSE_RENEWAL: 'window:show-license-renewal',
  
  // App operations
  APP_QUIT: 'app:quit',
  APP_MINIMIZE: 'app:minimize',
  APP_MAXIMIZE: 'app:maximize',
  
  // Port management operations
  PORT_GET_STATUS: 'port:get-status',
  PORT_CHECK: 'port:check',
  PORT_FIND_AVAILABLE: 'port:find-available',
  PORT_SCAN_RANGE: 'port:scan-range',
  PORT_RESOLVE_CONFLICT: 'port:resolve-conflict',
  PORT_SET_CURRENT: 'port:set-current',
  PORT_START_MONITORING: 'port:start-monitoring',
  PORT_STOP_MONITORING: 'port:stop-monitoring',
  
  // Update management operations
  UPDATE_GET_STATUS: 'update:get-status',
  UPDATE_CHECK: 'update:check',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_INSTALL: 'update:install',
  UPDATE_START_AUTO_CHECK: 'update:start-auto-check',
  UPDATE_STOP_AUTO_CHECK: 'update:stop-auto-check',
  UPDATE_SET_SETTINGS: 'update:set-settings',
  UPDATE_GET_INFO: 'update:get-info',
  
  // Notification channels (renderer <- main)
  NOTIFICATION_PORT_CHANGED: 'notification:port-changed',
  NOTIFICATION_UPDATE_STATUS: 'notification:update-status'
} as const;

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];

// Printer IPC Channels
export const PRINTER_IPC = {
  LIST: 'printer:list',
  ADD_IP: 'printer:add-ip',
  REMOVE: 'printer:remove',
  SET_ACTIVE: 'printer:set-active',
  GET_ACTIVE: 'printer:get-active',
  PRINT_TEST: 'printer:print-test',
  PRINT_JOB: 'printer:print-job',
  GET_SETTINGS: 'printer:get-settings',
  SET_SETTINGS: 'printer:set-settings',
  DISCOVER_USB: 'printer:discover-usb',
  DISCOVER_IP: 'printer:discover-ip'
} as const;