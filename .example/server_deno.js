import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";

const NetworkReceiptPrinter = (await import("npm:@point-of-sale/network-receipt-printer")).default;
const ReceiptPrinterEncoder = (await import("npm:@point-of-sale/receipt-printer-encoder")).default;
const getPixels = (await import("npm:get-pixels")).default;

const PORT = 3001;

const router = new Router();

const PRINTER_WIDTH = 576;

async function base64ToPNG(base64Data, filename = 'temp_image.png') {
  try {
    const cleanBase64 = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');

    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    try {
      await Deno.mkdir('./tmp', { recursive: true });
    } catch (err) {
    }

    const filePath = `./tmp/${filename}`;
    await Deno.writeFile(filePath, bytes);

    console.log(`💾 PNG dosyası oluşturuldu: ${filePath}`);
    return filePath;

  } catch (error) {
    console.error("Base64 to PNG error:", error);
    throw error;
  }
}

async function processSimpleImage(filePath) {
  return new Promise((resolve, reject) => {
    try {
      getPixels(filePath, (err, pixels) => {
        if (err) {
          console.error("PNG file processing error:", err);
          reject(err);
          return;
        }

        const originalWidth = pixels.shape[0];
        const originalHeight = pixels.shape[1];

        console.log(`📏 Orijinal resim: ${originalWidth}x${originalHeight}`);

        const scale = PRINTER_WIDTH / originalWidth;
        let width = PRINTER_WIDTH;
        let height = Math.floor(originalHeight * scale);

        width = Math.floor(width / 8) * 8;
        if (width === 0) width = 8;

        height = Math.floor(height / 8) * 8;
        if (height === 0) height = 8;

        console.log(`🎯 Tam genişlik: ${width}x${height} (scale: ${scale.toFixed(2)})`);

        Deno.remove(filePath).catch(() => {
        });

        resolve({
          pixels: pixels,
          width: width,
          height: height
        });
      });

    } catch (error) {
      reject(error);
    }
  });
}

async function processImageData(base64Data) {
  try {
    const filename = `image_${Date.now()}.png`;
    const filePath = await base64ToPNG(base64Data, filename);

    const result = await processSimpleImage(filePath);

    return result;

  } catch (error) {
    console.error("Simple image processing error:", error);
    throw error;
  }
}

class PrinterQueue {
  constructor() {
    this.jobs = new Map();
    this.queues = new Map();
    this.processing = new Map();
    this.jobCounter = 0;
    this.maxRetries = 3;
    this.retryDelay = 5000;
    this.startQueueProcessor();
  }

  addJob(printerConfig, elements, priority = 'normal', jobType = 'print') {
    const jobId = `job_${++this.jobCounter}_${Date.now()}`;
    const printerKey = `${printerConfig.ip}:${printerConfig.port}`;

    const job = {
      id: jobId,
      printerKey,
      printerConfig,
      elements,
      priority,
      jobType,
      status: 'pending',
      createdAt: new Date(),
      retryCount: 0,
      error: null,
      result: null
    };

    this.jobs.set(jobId, job);

    if (!this.queues.has(printerKey)) {
      this.queues.set(printerKey, []);
    }

    const queue = this.queues.get(printerKey);
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    const insertIndex = queue.findIndex(existingJob =>
      priorityOrder[job.priority] > priorityOrder[existingJob.priority]
    );

    if (insertIndex === -1) {
      queue.push(job);
    } else {
      queue.splice(insertIndex, 0, job);
    }

    console.log(`📋 Job eklendi: ${jobId} - ${printerKey}`);
    return jobId;
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
  }

  completeJob(jobId, result) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
      job.result = result;
      console.log(`✅ Job tamamlandı: ${jobId}`);
    }
  }

  failJob(jobId, error) {
    const job = this.jobs.get(jobId);
    if (job) {
      job.error = error.message;

      if (job.retryCount >= this.maxRetries) {
        job.status = 'failed';
        console.log(`❌ Job başarısız: ${jobId}`);
      } else {
        job.status = 'retrying';
        job.retryCount++;
        console.log(`🔄 Job retry: ${jobId}`);

        setTimeout(() => {
          const printerKey = job.printerKey;
          const queue = this.queues.get(printerKey);
          if (queue) {
            job.status = 'pending';
            queue.unshift(job);
          }
        }, this.retryDelay);
      }
    }
  }

  async startQueueProcessor() {
    setInterval(async () => {
      for (const [printerKey, queue] of this.queues.entries()) {
        if (this.processing.get(printerKey)) continue;

        const pendingJobs = queue.filter(job => job.status === 'pending');
        if (pendingJobs.length === 0) continue;

        const job = pendingJobs[0];
        job.status = 'processing';
        this.processing.set(printerKey, true);

        try {
          const result = await this.processJob(job);
          const jobIndex = queue.findIndex(j => j.id === job.id);
          if (jobIndex !== -1) queue.splice(jobIndex, 1);
          this.completeJob(job.id, result);
        } catch (error) {
          console.error(`❌ Job hatası: ${job.id}`, error);
          const jobIndex = queue.findIndex(j => j.id === job.id);
          if (jobIndex !== -1) queue.splice(jobIndex, 1);
          this.failJob(job.id, error);
        } finally {
          this.processing.set(printerKey, false);
        }
      }
    }, 1000);
  }

  async processJob(job) {
    const { printerConfig, elements } = job;
    const printData = await createReceiptCommands(elements);
    await printWithEventListeners(printerConfig, printData);

    return {
      success: true,
      message: `Yazdırma başarılı: ${printerConfig.name || 'Yazıcı'}`,
      elementsProcessed: elements.length
    };
  }
}

const printerQueue = new PrinterQueue();

async function createReceiptCommands(elements) {
  const encoder = new ReceiptPrinterEncoder({
    language: 'esc-pos',
    columns: 48
  });

  encoder.initialize();
  encoder.codepage('cp857');

  for (const element of elements) {
    try {
      await processElement(encoder, element);
    } catch (error) {
      console.error(`Element hatası (${element.type}):`, error);
      encoder.text(`[Hata: ${element.type}]`);
      encoder.newline();
    }
  }

  encoder.newline(4);
  encoder.cut('full');

  return encoder.encode();
}

async function processElement(encoder, element) {
  switch (element.type) {
    case 'text':
      encoder.align(element.align || 'left');
      if (element.bold) encoder.bold(true);
      if (element.underline) encoder.underline(true);
      encoder.text(element.content || '');
      encoder.newline();
      if (element.bold) encoder.bold(false);
      if (element.underline) encoder.underline(false);
      break;

    case 'header':
      encoder.align(element.align || 'center');
      encoder.bold(true);
      encoder.size(2, 2);
      encoder.text(element.content || '');
      encoder.newline();
      encoder.bold(false);
      encoder.size(1, 1);
      break;

    case 'image':
      if (element.imageData) {
        try {
          encoder.align(element.align || 'center');

          const base64Data = element.imageData.replace(/^data:image\/[a-z]+;base64,/, '');

          const processedImage = await processImageData(base64Data);

          console.log(`🖼️ Resim işlendi: ${processedImage.width}x${processedImage.height}`);

          encoder.image(
            processedImage.pixels,
            576,
            processedImage.height,
            element.algorithm || 'threshold',
            element.threshold || 128
          );

          encoder.newline();
        } catch (e) {
          console.error("Full width image processing hatası:", e);
          encoder.text('[Tam genişlik resim hatası]');
          encoder.newline();
        }
      }
      break;
    case 'barcode':
      if (element.data) {
        try {
          encoder.align(element.align || 'center');
          const symbology = element.symbology || 'code128';
          const options = {
            height: element.height || 60,
            width: element.width || 2,
            text: element.showText !== false
          };
          encoder.barcode(element.data, symbology, options);
          encoder.newline();
        } catch (e) {
          console.error("Barkod hatası:", e);
          encoder.text(`[Barkod: ${element.data}]`);
          encoder.newline();
        }
      }
      break;

    case 'qrcode':
      if (element.data) {
        try {
          encoder.align(element.align || 'center');
          const options = {
            model: element.model || 2,
            size: element.size || 6,
            errorlevel: element.errorlevel || 'm'
          };
          encoder.qrcode(element.data, options);
          encoder.newline();
        } catch (e) {
          console.error("QR kod hatası:", e);
          encoder.text(`[QR: ${element.data}]`);
          encoder.newline();
        }
      }
      break;

    case 'table':
      if (element.columns && element.rows) {
        try {
          encoder.table(element.columns, element.rows);
        } catch (e) {
          console.error("Tablo hatası:", e);
          encoder.text('[Tablo hatası]');
          encoder.newline();
        }
      }
      break;

    case 'line':
      encoder.align(element.align || 'center');
      const char = element.char || '=';
      const length = element.length || 32;
      encoder.text(char.repeat(length));
      encoder.newline();
      break;

    case 'newline':
      const count = element.count || 1;
      encoder.newline(count);
      break;

    case 'cut':
      encoder.newline(4);
      encoder.cut('full');
      break;

    default:
      encoder.text(`[${element.type}]`);
      encoder.newline();
  }
}

async function printWithEventListeners(printerConfig, printData) {
  return new Promise((resolve, reject) => {
    const networkPrinter = new NetworkReceiptPrinter({
      host: printerConfig.ip,
      port: parseInt(printerConfig.port),
      timeout: 15000
    });

    let isResolved = false;

    networkPrinter.addEventListener('connected', async () => {
      if (isResolved) return;
      try {
        await networkPrinter.print(printData);
        await networkPrinter.disconnect();
        if (!isResolved) {
          isResolved = true;
          resolve(true);
        }
      } catch (error) {
        if (!isResolved) {
          isResolved = true;
          reject(error);
        }
      }
    });

    networkPrinter.addEventListener('error', (error) => {
      if (!isResolved) {
        isResolved = true;
        reject(error);
      }
    });

    networkPrinter.addEventListener('timeout', () => {
      if (!isResolved) {
        isResolved = true;
        reject(new Error('Timeout'));
      }
    });

    networkPrinter.connect().catch(reject);
  });
}

router.post('/api/print', async (ctx) => {
  try {
    const body = await ctx.request.body().value;
    const { printer, elements, priority = 'normal' } = body;

    if (!printer?.ip || !printer?.port) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: 'Printer IP ve port gerekli' };
      return;
    }

    if (!elements || !Array.isArray(elements)) {
      ctx.response.status = 400;
      ctx.response.body = { success: false, message: 'Elements array gerekli' };
      return;
    }

    const jobId = printerQueue.addJob(printer, elements, priority, 'print');

    ctx.response.body = {
      success: true,
      message: 'Yazdırma job\'ı eklendi',
      jobId: jobId
    };

  } catch (error) {
    ctx.response.status = 500;
    ctx.response.body = { success: false, message: error.message };
  }
});

const app = new Application();
app.use(oakCors({ origin: "*" }));
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: PORT });