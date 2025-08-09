import { randomUUID } from 'crypto';

export interface PavoDeviceState {
  id: string;
  name?: string;
  ipAddress: string;
  port: number;
  serialNumber?: string;
  fingerPrint?: string;
  isPaired: boolean;
  lastTransactionSequence: number;
}

export class PavoDeviceStore {
  private static instance: PavoDeviceStore;
  private devices: Map<string, PavoDeviceState> = new Map();

  private constructor() {}

  public static getInstance(): PavoDeviceStore {
    if (!PavoDeviceStore.instance) {
      PavoDeviceStore.instance = new PavoDeviceStore();
    }
    return PavoDeviceStore.instance;
  }

  public list(): PavoDeviceState[] {
    return Array.from(this.devices.values());
  }

  public get(id: string): PavoDeviceState | undefined {
    return this.devices.get(id);
  }

  public create(input: Partial<PavoDeviceState>): PavoDeviceState {
    const id = input.id || randomUUID();
    const device: PavoDeviceState = {
      id,
      name: input.name?.trim() || undefined,
      ipAddress: input.ipAddress || '192.168.1.10',
      port: typeof input.port === 'number' ? input.port : 4567,
      serialNumber: input.serialNumber || undefined,
      fingerPrint: input.fingerPrint || undefined,
      isPaired: Boolean(input.isPaired) || false,
      lastTransactionSequence: typeof input.lastTransactionSequence === 'number' ? input.lastTransactionSequence : 1,
    };
    this.devices.set(device.id, device);
    return device;
  }

  public update(id: string, input: Partial<PavoDeviceState>): PavoDeviceState {
    const curr = this.devices.get(id);
    if (!curr) {
      throw new Error('Device not found');
    }
    const next: PavoDeviceState = {
      ...curr,
      ...input,
      name: input.name !== undefined ? (input.name?.trim() || undefined) : curr.name,
      ipAddress: input.ipAddress ?? curr.ipAddress,
      port: typeof input.port === 'number' ? input.port : curr.port,
      serialNumber: input.serialNumber !== undefined ? (input.serialNumber || undefined) : curr.serialNumber,
      fingerPrint: input.fingerPrint !== undefined ? (input.fingerPrint || undefined) : curr.fingerPrint,
      isPaired: input.isPaired !== undefined ? Boolean(input.isPaired) : curr.isPaired,
      lastTransactionSequence: typeof input.lastTransactionSequence === 'number' ? input.lastTransactionSequence : curr.lastTransactionSequence,
    };
    this.devices.set(id, next);
    return next;
  }

  public remove(id: string): void {
    this.devices.delete(id);
  }
}


