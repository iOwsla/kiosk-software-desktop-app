import { contextBridge, ipcRenderer } from 'electron';
import { 
  IPC_CHANNELS, 
  LicenseVerificationResponse, 
  PortStatus, 
  PortConflictResolution, 
  PortScanResult, 
  UpdateStatus, 
  UpdateInfo,
  PortChangeNotification,
  UpdateNotification,
  PRINTER_IPC,
  PrinterDevice,
  PrinterModuleSettings,
  IPPrinterConfig,
  PrintJobRequest
} from '../../../shared/types';

// Define the API that will be exposed to the renderer process
interface ElectronAPI {
  // License operations
  license: {
    verify: (apiKey: string) => Promise<LicenseVerificationResponse>;
    getStatus: () => Promise<LicenseVerificationResponse>;
    saveKey: (apiKey: string) => Promise<{ success: boolean; message?: string }>;
    getSavedKey: () => Promise<string | null>;
  };
  
  // Printer operations
  printer: {
    getSettings: () => Promise<PrinterModuleSettings>;
    setSettings: (next: Partial<PrinterModuleSettings>) => Promise<PrinterModuleSettings>;
    list: () => Promise<PrinterDevice[]>;
    addIP: (cfg: IPPrinterConfig) => Promise<PrinterDevice>;
    remove: (id: string) => Promise<void>;
    getActive: () => Promise<PrinterDevice | null>;
    setActive: (id: string) => Promise<void>;
    printTest: (id?: string) => Promise<{ success: boolean }>;
    printJob: (job: PrintJobRequest) => Promise<{ success: boolean }>;
    discoverIp: (range: { base: string; start: number; end: number; port?: number }) => Promise<PrinterDevice[]>;
  };
  // Window operations
  window: {
    showKiosk: () => Promise<void>;
    showLicenseInput: () => Promise<void>;
    showLicenseRenewal: () => Promise<void>;
  };
  
  // App operations
  app: {
    quit: () => Promise<void>;
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    openDevTools: () => Promise<void>;
  };
  
  // Port management operations
  port: {
    getStatus: () => Promise<PortStatus>;
    check: (port: number) => Promise<PortStatus>;
    findAvailable: (startPort?: number) => Promise<number>;
    scanRange: (startPort: number, endPort: number) => Promise<PortScanResult>;
    resolveConflict: () => Promise<PortConflictResolution>;
    setCurrent: (port: number) => Promise<{ success: boolean; port: number }>;
    startMonitoring: () => Promise<{ success: boolean }>;
    stopMonitoring: () => Promise<{ success: boolean }>;
  };
  
  // Update management operations
  update: {
    getStatus: () => Promise<UpdateStatus>;
    check: () => Promise<UpdateStatus>;
    download: () => Promise<{ success: boolean }>;
    install: () => Promise<{ success: boolean }>;
    startAutoCheck: (intervalMinutes?: number) => Promise<{ success: boolean; intervalMinutes: number }>;
    stopAutoCheck: () => Promise<{ success: boolean }>;
    setSettings: (settings: { autoDownload?: boolean; autoInstall?: boolean }) => Promise<{ success: boolean; settings: any }>;
    getInfo: () => Promise<UpdateInfo>;
  };
  
  // Event listeners for notifications
  on: {
    portChanged: (callback: (data: PortChangeNotification) => void) => void;
    updateStatus: (callback: (data: UpdateNotification) => void) => void;
  };
  
  // Remove event listeners
  off: {
    portChanged: (callback: (data: PortChangeNotification) => void) => void;
    updateStatus: (callback: (data: UpdateNotification) => void) => void;
  };
}

// Create the API object
const electronAPI: ElectronAPI = {
  license: {
    verify: (apiKey: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.LICENSE_VERIFY, apiKey),
    
    getStatus: () => 
      ipcRenderer.invoke(IPC_CHANNELS.LICENSE_STATUS),
    
    saveKey: (apiKey: string) => 
      ipcRenderer.invoke(IPC_CHANNELS.LICENSE_SAVE_KEY, apiKey),
    
    getSavedKey: () => 
      ipcRenderer.invoke(IPC_CHANNELS.LICENSE_GET_KEY)
  },
  
  printer: {
    getSettings: () => ipcRenderer.invoke(PRINTER_IPC.GET_SETTINGS),
    setSettings: (next: Partial<PrinterModuleSettings>) => ipcRenderer.invoke(PRINTER_IPC.SET_SETTINGS, next),
    list: () => ipcRenderer.invoke(PRINTER_IPC.LIST),
    addIP: (cfg: IPPrinterConfig) => ipcRenderer.invoke(PRINTER_IPC.ADD_IP, cfg),
    remove: (id: string) => ipcRenderer.invoke(PRINTER_IPC.REMOVE, id),
    getActive: () => ipcRenderer.invoke(PRINTER_IPC.GET_ACTIVE),
    setActive: (id: string) => ipcRenderer.invoke(PRINTER_IPC.SET_ACTIVE, id),
    printTest: (id?: string) => ipcRenderer.invoke(PRINTER_IPC.PRINT_TEST, id),
    printJob: (job: PrintJobRequest) => ipcRenderer.invoke(PRINTER_IPC.PRINT_JOB, job),
    discoverIp: (range: { base: string; start: number; end: number; port?: number }) => ipcRenderer.invoke(PRINTER_IPC.DISCOVER_IP, range)
  },
  
  window: {
    showKiosk: () => 
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SHOW_KIOSK),
    
    showLicenseInput: () => 
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SHOW_LICENSE_INPUT),
    
    showLicenseRenewal: () => 
      ipcRenderer.invoke(IPC_CHANNELS.WINDOW_SHOW_LICENSE_RENEWAL)
  },
  
  app: {
    quit: () => 
      ipcRenderer.invoke(IPC_CHANNELS.APP_QUIT),
    
    minimize: () => 
      ipcRenderer.invoke(IPC_CHANNELS.APP_MINIMIZE),
    
    maximize: () => 
      ipcRenderer.invoke(IPC_CHANNELS.APP_MAXIMIZE),
    openDevTools: () =>
      ipcRenderer.invoke(IPC_CHANNELS.APP_OPEN_DEVTOOLS)
  },
  
  port: {
    getStatus: () => 
      ipcRenderer.invoke(IPC_CHANNELS.PORT_GET_STATUS),
    
    check: (port: number) => 
      ipcRenderer.invoke(IPC_CHANNELS.PORT_CHECK, port),
    
    findAvailable: (startPort: number = 3000) => 
      ipcRenderer.invoke(IPC_CHANNELS.PORT_FIND_AVAILABLE, startPort),
    
    scanRange: (startPort: number, endPort: number) => 
      ipcRenderer.invoke(IPC_CHANNELS.PORT_SCAN_RANGE, startPort, endPort),
    
    resolveConflict: () => 
      ipcRenderer.invoke(IPC_CHANNELS.PORT_RESOLVE_CONFLICT),
    
    setCurrent: (port: number) => 
      ipcRenderer.invoke(IPC_CHANNELS.PORT_SET_CURRENT, port),
    
    startMonitoring: () => 
      ipcRenderer.invoke(IPC_CHANNELS.PORT_START_MONITORING),
    
    stopMonitoring: () => 
      ipcRenderer.invoke(IPC_CHANNELS.PORT_STOP_MONITORING)
  },
  
  update: {
    getStatus: () => 
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_GET_STATUS),
    
    check: () => 
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_CHECK),
    
    download: () => 
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_DOWNLOAD),
    
    install: () => 
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_INSTALL),
    
    startAutoCheck: (intervalMinutes: number = 60) => 
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_START_AUTO_CHECK, intervalMinutes),
    
    stopAutoCheck: () => 
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_STOP_AUTO_CHECK),
    
    setSettings: (settings: { autoDownload?: boolean; autoInstall?: boolean }) => 
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SET_SETTINGS, settings),
    
    getInfo: () => 
      ipcRenderer.invoke(IPC_CHANNELS.UPDATE_GET_INFO)
  },
  
  on: {
    portChanged: (callback: (data: PortChangeNotification) => void) => {
      ipcRenderer.on(IPC_CHANNELS.NOTIFICATION_PORT_CHANGED, (_event: Electron.IpcRendererEvent, data: PortChangeNotification) => callback(data));
    },
    
    updateStatus: (callback: (data: UpdateNotification) => void) => {
      ipcRenderer.on(IPC_CHANNELS.NOTIFICATION_UPDATE_STATUS, (_event: Electron.IpcRendererEvent, data: UpdateNotification) => callback(data));
    }
  },
  
  off: {
    portChanged: (_callback: (data: PortChangeNotification) => void) => {
      ipcRenderer.removeAllListeners(IPC_CHANNELS.NOTIFICATION_PORT_CHANGED);
    },
    
    updateStatus: (_callback: (data: UpdateNotification) => void) => {
      ipcRenderer.removeAllListeners(IPC_CHANNELS.NOTIFICATION_UPDATE_STATUS);
    }
  }
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type declaration for the global window object
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// Security: Remove node integration
delete (window as any).require;
delete (window as any).exports;
delete (window as any).module;

// Log that preload script has loaded
console.log('Preload script loaded successfully');

// Prevent the renderer from accessing Node.js APIs
Object.freeze(electronAPI);

// Export for TypeScript
export type { ElectronAPI };