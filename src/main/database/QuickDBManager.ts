import { app } from 'electron';
import path from 'path';
import { QuickDB } from 'quick.db';
import { logger } from '../../../api/utils/logger';

export interface Device {
  hwid: string;
  serial: string;
  name: string;
  secretKey: string;
  createdAt: string;
  updatedAt: string;
}

export class QuickDBManager {
  private static instance: QuickDBManager;
  private db: QuickDB;

  private constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'kiosk-hub.db');

    this.db = new QuickDB({ filePath: dbPath });
    logger.info('QuickDBManager initialized', { dbPath });
  }

  public static getInstance(): QuickDBManager {
    if (!QuickDBManager.instance) {
      QuickDBManager.instance = new QuickDBManager();
    }
    return QuickDBManager.instance;
  }

  // Device operations
  public async createDevice(deviceData: {
    hwid: string;
    serial: string;
    name: string;
    secretKey: string;
  }): Promise<Device> {
    try {
      const device: Device = {
        ...deviceData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Store device with hwid as key
      await this.db.set(`device_hwid_${device.hwid}`, device);
      // Also store by serial for quick lookup
      await this.db.set(`device_serial_${device.serial}`, device.hwid);

      logger.info('Device created successfully', { hwid: device.hwid });
      return device;
    } catch (error) {
      logger.error('Failed to create device', { error, deviceData });
      throw error;
    }
  }

  public async findDeviceByHwid(hwid: string): Promise<Device | null> {
    try {
      const device = await this.db.get(`device_hwid_${hwid}`) as Device | undefined;
      logger.info('Device search by HWID completed', { hwid, found: !!device });
      return device || null;
    } catch (error) {
      logger.error('Failed to find device by HWID', { error, hwid });
      throw error;
    }
  }

  public async findDeviceBySerial(serial: string): Promise<Device | null> {
    try {
      const hwid = await this.db.get(`device_serial_${serial}`) as string | undefined;
      if (!hwid) {
        logger.info('Device search by serial completed', { serial, found: false });
        return null;
      }

      const device = await this.findDeviceByHwid(hwid);
      logger.info('Device search by serial completed', { serial, found: !!device });
      return device;
    } catch (error) {
      logger.error('Failed to find device by serial', { error, serial });
      throw error;
    }
  }

  public async updateDevice(device: Device): Promise<Device> {
    try {
      const updatedDevice = {
        ...device,
        updatedAt: new Date().toISOString()
      };

      await this.db.set(`device_hwid_${device.hwid}`, updatedDevice);
      logger.info('Device updated successfully', { hwid: device.hwid });
      return updatedDevice;
    } catch (error) {
      logger.error('Failed to update device', { error, hwid: device.hwid });
      throw error;
    }
  }

  public async deleteDevice(hwid: string): Promise<void> {
    try {
      const device = await this.findDeviceByHwid(hwid);
      if (device) {
        await this.db.delete(`device_hwid_${hwid}`);
        await this.db.delete(`device_serial_${device.serial}`);
        logger.info('Device deleted successfully', { hwid });
      }
    } catch (error) {
      logger.error('Failed to delete device', { error, hwid });
      throw error;
    }
  }

  public async getAllDevices(): Promise<Device[]> {
    try {
      const allData = await this.db.all();
      const devices: Device[] = [];

      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('device_hwid_')) {
          devices.push(value as unknown as Device);
        }
      }

      logger.info('Retrieved all devices', { count: devices.length });
      return devices;
    } catch (error) {
      logger.error('Failed to get all devices', { error });
      throw error;
    }
  }

  public async ensureDeviceExists(hwid: string, serial: string, name: string = 'Unknown Device'): Promise<Device> {
    try {
      // Check if device already exists
      let device = await this.findDeviceByHwid(hwid);

      if (!device) {
        // Check by serial as well
        device = await this.findDeviceBySerial(serial);
      }

      if (!device) {
        // Create new device
        device = await this.createDevice({
          hwid,
          serial,
          name,
          secretKey: this.generateSecretKey()
        });
        logger.info('New device created', { hwid, serial });
      } else {
        logger.info('Existing device found', { hwid, serial });
      }

      return device;
    } catch (error) {
      logger.error('Failed to ensure device exists', { error, hwid, serial });
      throw error;
    }
  }

  private generateSecretKey(): string {
    // Generate a random secret key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  public getDatabase() {
    return this.db;
  }
}