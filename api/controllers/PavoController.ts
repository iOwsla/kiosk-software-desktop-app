import { Request, Response } from 'express';
import axios from 'axios';
import type { PavoConfig, PavoRequestPayload, PavoResponse, PavoScanRequest, PavoScanResult } from '../../shared/types';

const pavoConfig: PavoConfig = {
  ipAddress: '192.168.1.10',
  port: 4567
};

// Pavo durum yönetimi (eşleşme, sıra no, meşguliyet)
let isPaired = false;
let lastTransactionSequence = 1; // Pairing için kullanılan sabit
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
  public getConfig = (_req: Request, res: Response) => {
    res.json({ success: true, data: { ...pavoConfig, isPaired, lastTransactionSequence } });
  };

  public setConfig = (req: Request, res: Response) => {
    const { ipAddress, port, serialNumber, fingerPrint, kioskSerialNumber } = req.body as Partial<PavoConfig>;
    if (ipAddress) pavoConfig.ipAddress = ipAddress;
    if (typeof port === 'number') pavoConfig.port = port;
    if (serialNumber !== undefined) pavoConfig.serialNumber = serialNumber;
    if (fingerPrint !== undefined) pavoConfig.fingerPrint = fingerPrint;
    if (kioskSerialNumber !== undefined) pavoConfig.kioskSerialNumber = kioskSerialNumber;
    res.json({ success: true, data: { ...pavoConfig, isPaired, lastTransactionSequence } });
  };

  public async scan(_req: Request, res: Response) {
    const body = (_req.body || {}) as PavoScanRequest;
    const base = body.base || '192.168.1';
    const start = Math.max(1, body.start ?? 1);
    const end = Math.min(254, body.end ?? 254);
    const port = body.port ?? 4567;
    const timeout = Math.max(100, Math.min(1000, body.timeoutMs ?? 200));
    const hosts = Array.from({ length: end - start + 1 }, (_, i) => `${base}.${start + i}`);
    // Paralel taramada bağlantı sayısını sınırlayalım (50)
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
      const baseUrl = `${reqBody.protocol}://${pavoConfig.ipAddress}:${pavoConfig.port}`;
      const url = `${baseUrl}/${reqBody.endPoint}`;

      // pavo.py make_request ile aynı TransactionHandle yapısı
      const nowIso = new Date().toISOString();
      // TransactionSequence kuralı: Pairing dışındaki her istekte artır
      const isPairing = reqBody.endPoint === 'Pairing';
      const nextSequence = isPairing ? 1453 : (lastTransactionSequence + 1);

      const transactionHandle = {
        SerialNumber: pavoConfig.serialNumber,
        TransactionDate: nowIso,
        TransactionSequence: nextSequence,
        Fingerprint: pavoConfig.fingerPrint
      };
      const wrappedPayload: Record<string, unknown> = { TransactionHandle: transactionHandle };
      // meta içeriğini üst seviyeye ekle
      if (reqBody.meta && typeof reqBody.meta === 'object') {
        for (const [k, v] of Object.entries(reqBody.meta)) {
          wrappedPayload[k] = v as unknown;
        }
      }

      // HTTPS doğrulamasını kapatma (pavo.py verify=false eşdeğeri)
      const httpsAgent = reqBody.protocol === 'https'
        ? new (await import('https')).Agent({ rejectUnauthorized: false })
        : undefined;

      // Meşguliyet kontrolü (istisnalar hariç)
      if (isBusy && !ALLOWED_DURING_BUSY.has(reqBody.endPoint)) {
        return res.status(423).json({ success: false, data: null, error: 'Cihaz Meşgul (20)', meta: {} });
      }

      if (!isPairing && !ALLOWED_DURING_BUSY.has(reqBody.endPoint)) {
        isBusy = true;
      }

      let axiosResponse;
      try {
        axiosResponse = await axios.request({
          url,
          method: reqBody.method,
          data: wrappedPayload,
          timeout: 10000,
          httpsAgent,
          // GET için de body gönderimine izin vermek üzere validateStatus sadece başarı kontrolü için
          validateStatus: () => true
        });
      } finally {
        if (!isPairing && !ALLOWED_DURING_BUSY.has(reqBody.endPoint)) {
          isBusy = false;
        }
      }

      const success = !(axiosResponse.data?.HasError ?? (axiosResponse.status < 200 || axiosResponse.status >= 300));
      const out: PavoResponse = { success, data: axiosResponse.data, error: success ? null : 'Request failed', meta: {} };
      // Eşleşme başarılı ise pairing bayrağını set et, sırayı resetle
      if (isPairing && success) {
        isPaired = true;
        lastTransactionSequence = 1;
      }
      // Pairing dışı isteklerde, başarı durumuna bakılmaksızın sequence'i ilerlet
      if (!isPairing) {
        lastTransactionSequence = nextSequence;
      }
      res.json(out);
    } catch (err: unknown) {
      res.status(500).json({ success: false, data: null, error: (err as Error).message, meta: {} });
    }
  }
}

export const pavoController = new PavoController();


