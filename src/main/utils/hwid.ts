import { execSync } from 'child_process';
import * as os from 'os';
import * as crypto from 'crypto';
import { logger } from '../../../api/utils/logger';

export interface HardwareInfo {
  hwid: string;
  hostname: string;
  platform: string;
  arch: string;
  cpuModel: string;
  totalMemory: number;
  networkInterfaces: string[];
}

export class HardwareIdGenerator {
  private static cachedHwid: string | null = null;

  /**
   * Get unique hardware ID for this machine
   */
  public static async getHardwareId(): Promise<string> {
    if (this.cachedHwid) {
      return this.cachedHwid;
    }

    try {
      let hardwareId = '';

      switch (process.platform) {
        case 'win32':
          hardwareId = this.getWindowsHardwareId();
          break;
        case 'darwin':
          hardwareId = this.getMacHardwareId();
          break;
        case 'linux':
          hardwareId = this.getLinuxHardwareId();
          break;
        default:
          hardwareId = this.getFallbackHardwareId();
      }

      // Hash the hardware ID for consistency and privacy
      this.cachedHwid = crypto
        .createHash('sha256')
        .update(hardwareId)
        .digest('hex');

      logger.info('Hardware ID generated successfully');
      return this.cachedHwid;
    } catch (error) {
      logger.error('Failed to generate hardware ID', { error });
      // Generate a fallback ID based on available system info
      return this.getFallbackHardwareId();
    }
  }

  /**
   * Get detailed hardware information
   */
  public static async getHardwareInfo(): Promise<HardwareInfo> {
    const hwid = await this.getHardwareId();
    const cpus = os.cpus();
    const networkInterfaces = this.getNetworkInterfaces();

    return {
      hwid,
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpuModel: cpus[0]?.model || 'Unknown',
      totalMemory: os.totalmem(),
      networkInterfaces
    };
  }

  private static getWindowsHardwareId(): string {
    try {
      // Get motherboard serial number
      const motherboardSerial = execSync('wmic baseboard get serialnumber', { encoding: 'utf8' })
        .split('\n')[1]
        .trim();

      // Get CPU ID
      const cpuId = execSync('wmic cpu get processorid', { encoding: 'utf8' })
        .split('\n')[1]
        .trim();

      // Get BIOS serial number
      const biosSerial = execSync('wmic bios get serialnumber', { encoding: 'utf8' })
        .split('\n')[1]
        .trim();

      return `${motherboardSerial}-${cpuId}-${biosSerial}`;
    } catch (error) {
      logger.warn('Failed to get Windows hardware ID via WMI', { error });
      return this.getFallbackHardwareId();
    }
  }

  private static getMacHardwareId(): string {
    try {
      // Get hardware UUID
      const hardwareUuid = execSync(
        'system_profiler SPHardwareDataType | grep "Hardware UUID"',
        { encoding: 'utf8' }
      )
        .split(':')[1]
        .trim();

      return hardwareUuid;
    } catch (error) {
      logger.warn('Failed to get Mac hardware ID', { error });
      return this.getFallbackHardwareId();
    }
  }

  private static getLinuxHardwareId(): string {
    try {
      // Try to get machine-id
      const machineId = execSync('cat /etc/machine-id', { encoding: 'utf8' }).trim();
      
      // Get CPU info
      const cpuInfo = execSync('cat /proc/cpuinfo | grep "model name" | head -1', { encoding: 'utf8' })
        .split(':')[1]
        .trim();

      return `${machineId}-${cpuInfo}`;
    } catch (error) {
      logger.warn('Failed to get Linux hardware ID', { error });
      return this.getFallbackHardwareId();
    }
  }

  private static getFallbackHardwareId(): string {
    // Create a fallback ID based on available system information
    const networkInterfaces = os.networkInterfaces();
    const macs: string[] = [];

    // Collect MAC addresses
    for (const [name, infos] of Object.entries(networkInterfaces)) {
      if (infos) {
        for (const info of infos) {
          if (!info.internal && info.mac && info.mac !== '00:00:00:00:00:00') {
            macs.push(info.mac);
          }
        }
      }
    }

    // Combine system info for a unique ID
    const systemInfo = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().map(cpu => cpu.model).join(','),
      macs: macs.sort().join(','),
      totalMemory: os.totalmem()
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(systemInfo))
      .digest('hex');
  }

  private static getNetworkInterfaces(): string[] {
    const interfaces: string[] = [];
    const networkInterfaces = os.networkInterfaces();

    for (const [name, infos] of Object.entries(networkInterfaces)) {
      if (infos) {
        for (const info of infos) {
          if (!info.internal && info.mac && info.mac !== '00:00:00:00:00:00') {
            interfaces.push(`${name}: ${info.mac}`);
          }
        }
      }
    }

    return interfaces;
  }
}