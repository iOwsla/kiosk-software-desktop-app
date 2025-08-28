import { Request, Response } from 'express';
import axios from 'axios';
import type { PavoRequestPayload, PavoResponse, PavoScanRequest, PavoScanResult } from '../../shared/types';
import { PavoDeviceStore } from '../services/PavoDeviceStore';


let lastTransactionSequence = 1;
let isBusy = false;
const ALLOWED_DURING_BUSY = new Set(['AbortCurrentPayment', 'GetSaleResult', 'GetCancellationResult']);

async function isPortOpen(ip: string, port: number, timeoutMs = 300): Promise<boolean> {
  const net = await import('net');
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    let done = false;
    const finish = (ok: boolean) => {
      if (!done) {
        done = true;
        try { socket.destroy(); } catch (e) { /* noop */ }
        resolve(ok);
      }
    };
    socket.setTimeout(timeoutMs);
    socket.once('error', () => finish(false));
    socket.once('timeout', () => finish(false));
    socket.connect(port, ip, () => finish(true));
  });
}

export class PavoController {
  private deviceStore = PavoDeviceStore.getInstance();

  public async scan(_req: Request, res: Response) {
    const body = (_req.body || {}) as PavoScanRequest;
    const base = body.base || '192.168.1';
    const start = Math.max(1, body.start ?? 1);
    const end = Math.min(254, body.end ?? 254);
    const port = body.port ?? 4567;
    const timeout = Math.max(100, Math.min(1000, body.timeoutMs ?? 200));
    const hosts = Array.from({ length: end - start + 1 }, (_, i) => `${base}.${start + i}`);
    const concurrency = 50;
    const results: boolean[] = [];
    for (let i = 0; i < hosts.length; i += concurrency) {
      const chunk = hosts.slice(i, i + concurrency);
      const chunkResults = await Promise.all(chunk.map(h => isPortOpen(h, port, timeout)));
      results.push(...chunkResults);
    }
    const devices = hosts.filter((_, i) => results[i]);
    const payload: PavoScanResult = { devices, totalScanned: hosts.length };
    res.json({ success: true, data: payload });
  }

  public async proxy(_req: Request, res: Response) {
    try {
      const reqBody = _req.body as PavoRequestPayload;
      const deviceId = (_req.body?.deviceId as string) || undefined;
      const deviceState = deviceId ? this.deviceStore.get(deviceId) : undefined;
      const device = (_req.body?.device as { ip: string, serial: string, fp: string }) || undefined;

      console.log(reqBody);
      
      const ip = deviceState?.ipAddress ?? device?.ip ?? "192.168.1.218";
      const port = deviceState?.port ?? "4567";
      const serial = deviceState?.serialNumber ?? device?.serial ?? "";
      const fp = deviceState?.fingerPrint ?? device?.fp ?? "GAFDIGI_FERHAT_" + serial;
      
      const baseUrl = `${reqBody.protocol}://${ip}:${port}`;
      const url = `${baseUrl}/${reqBody.endPoint}`;

      const nowIso = new Date().toISOString();
      const isPairing = reqBody.endPoint === 'Pairing';
      const currentSeq = deviceState ? deviceState.lastTransactionSequence : lastTransactionSequence;
      const requestedSequenceBase = isPairing ? currentSeq : (currentSeq + 1);

      const buildPayload = (sequence: number) => {
        const transactionHandle = {
          SerialNumber: serial,
          TransactionDate: nowIso,
          TransactionSequence: sequence,
          Fingerprint: fp
        };
        const wrapped: Record<string, unknown> = { TransactionHandle: transactionHandle };
        if (reqBody.meta && typeof reqBody.meta === 'object') {
          for (const [k, v] of Object.entries(reqBody.meta)) {
            wrapped[k] = v as unknown;
          }
        }
        return wrapped;
      };

      if (isBusy && !ALLOWED_DURING_BUSY.has(reqBody.endPoint)) {
        return res.status(423).json({ success: false, data: null, error: 'Cihaz Meşgul (20)', meta: {} });
      }

      if (!isPairing && !ALLOWED_DURING_BUSY.has(reqBody.endPoint)) {
        isBusy = true;
      }

      let axiosResponse;
      try {
        const httpAgent = new (await import('http')).Agent({ keepAlive: false });
        const httpsAgent = reqBody.protocol === 'https'
          ? new (await import('https')).Agent({ keepAlive: false, rejectUnauthorized: false })
          : undefined;

        const sendWithSequence = async (sequence: number) => {
          const payload = buildPayload(sequence);
          const response = await axios.request({
            url,
            method: reqBody.method,
            data: payload,
            timeout: 61000,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Connection': 'close'
            },
            proxy: false,
            httpAgent,
            httpsAgent,
            validateStatus: () => true
          });
          return response;
        };

        axiosResponse = await sendWithSequence(requestedSequenceBase);

        const firstHasError = axiosResponse.data?.ErrorCode == 73;
        const shouldRetry = firstHasError;
        if (shouldRetry) {
          const retrySequence = requestedSequenceBase + 1;
          const retryResponse = await sendWithSequence(retrySequence);
          axiosResponse = retryResponse;
        }
      } finally {
        if (!isPairing && !ALLOWED_DURING_BUSY.has(reqBody.endPoint)) {
          isBusy = false;
        }
      }

      const success = !(axiosResponse.data?.HasError ?? (axiosResponse.status < 200 || axiosResponse.status >= 300));
      const out: PavoResponse = { success, data: axiosResponse.data, error: success ? null : 'Request failed', meta: {} };

      const returnedSeq = axiosResponse?.data?.TransactionHandle?.TransactionSequence;
      if (typeof returnedSeq === 'number' && Number.isFinite(returnedSeq)) {
        if (deviceState) {
          this.deviceStore.update(deviceState.id, { lastTransactionSequence: returnedSeq, isPaired: isPairing ? success : deviceState.isPaired });
        } else {
          lastTransactionSequence = returnedSeq;
        }
      } else {
        try {
          const sent = typeof axiosResponse.config.data === 'string' ? JSON.parse(axiosResponse.config.data) : axiosResponse.config.data;
          const sentSeq = sent?.TransactionHandle?.TransactionSequence;
          if (typeof sentSeq === 'number' && Number.isFinite(sentSeq)) {
            if (deviceState) {
              this.deviceStore.update(deviceState.id, { lastTransactionSequence: sentSeq, isPaired: isPairing ? success : deviceState.isPaired });
            } else {
              lastTransactionSequence = sentSeq;
            }
          } else {
            if (deviceState) {
              this.deviceStore.update(deviceState.id, { lastTransactionSequence: requestedSequenceBase, isPaired: isPairing ? success : deviceState.isPaired });
            } else {
              lastTransactionSequence = requestedSequenceBase;
            }
          }
        } catch {
          if (deviceState) {
            this.deviceStore.update(deviceState.id, { lastTransactionSequence: requestedSequenceBase, isPaired: isPairing ? success : deviceState.isPaired });
          } else {
            lastTransactionSequence = requestedSequenceBase;
          }
        }
      }

      if (isPairing && success) {
        if (deviceState) {
          this.deviceStore.update(deviceState.id, { isPaired: true });
        }
      }
      res.json(out);
    } catch (err: unknown) {
      res.status(500).json({ success: false, data: null, error: (err as Error).message, meta: {} });
    }
  }
}

export const pavoController = new PavoController();