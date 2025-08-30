import { contextBridge, ipcRenderer } from 'electron';
import { 
  IPC_CHANNELS, 
  UpdateStatus, 
  UpdateInfo,
  UpdateNotification
} from '../../../shared/types';
import { LicenseStatus } from '../services/LicenseManager';

// Define the API that will be exposed to the renderer process
interface ElectronAPI {
  // App info
  getAppVersion: () => Promise<string>;
  
  // Generic invoke method for IPC calls
  invoke: (channel: string, ...args: any[]) => Promise<any>;
  
  // License operations
  license: {
    getStatus: () => Promise<LicenseStatus>;
  };
  
  // App operations
  app: {
    quit: () => Promise<void>;
  };
  
  // Window operations
  window: {
    showCustom: () => Promise<{ success: boolean }>;
    hideCustom: () => Promise<{ success: boolean }>;
    showDealerSettings: () => Promise<{ success: boolean }>;
    hideDealerSettings: () => Promise<{ success: boolean }>;
  };
  
  // Update operations
  update: {
    getStatus: () => Promise<UpdateStatus>;
    getInfo: () => Promise<UpdateInfo>;
  };
  
  // Event listeners
  on: {
    updateStatus: (callback: (data: UpdateNotification) => void) => void;
  };
  
  // Event removers
  off: {
    updateStatus: (callback: (data: UpdateNotification) => void) => void;
  };
}

// Create the API object
const electronAPI: ElectronAPI = {
  getAppVersion: () => 
    ipcRenderer.invoke('app:getVersion'),
  
  invoke: (channel: string, ...args: any[]) => 
    ipcRenderer.invoke(channel, ...args),
  
  app: {
    quit: () => 
      ipcRenderer.invoke('app:quit')
  },
  
  window: {
    showCustom: () => 
      ipcRenderer.invoke('window:show-custom'),
    hideCustom: () => 
      ipcRenderer.invoke('window:hide-custom'),
    showDealerSettings: () => 
      ipcRenderer.invoke('window:show-dealer-settings'),
    hideDealerSettings: () => 
      ipcRenderer.invoke('window:hide-dealer-settings')
  },
  
  update: {
    getStatus: () => 
      ipcRenderer.invoke('update:getStatus'),
    
    getInfo: () => 
      ipcRenderer.invoke('update:getInfo')
  },
  
  license: {
    getStatus: () => 
      ipcRenderer.invoke('license:getStatus')
  },
  
  on: {
    updateStatus: (callback: (data: UpdateNotification) => void) => {
      ipcRenderer.on('update:status', (_, data) => callback(data));
    }
  },
  
  off: {
    updateStatus: (_callback: (data: UpdateNotification) => void) => {
      ipcRenderer.removeAllListeners('update:status');
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