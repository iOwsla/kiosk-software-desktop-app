import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { createSuccessResponse, createErrorResponse, FAErrorCode, ErrorSeverity } from '../api';
import { z } from 'zod';
import baseApi from '../api';
import { checkInternetConnection } from '../utils/networkUtils';
import { OfflineOrderService } from '../services/OfflineOrderService';
import { DailyOrderService } from '../services/DailyOrderService';
import { LicenseManager } from '@/main/services/LicenseManager';
import { QuickDBManager } from '../../src/main/database/QuickDBManager';

export const CreateOrderSchema = z.object({
  sequence: z.string().max(10, 'Sıra numarası en fazla 10 karakter olabilir').optional(),
  tableId: z.string().nullable().optional(),
  dealerId: z.string().min(1, 'Bayi seçimi zorunludur'),
  brandId: z.string().min(1, 'Marka seçimi zorunludur'),
  deviceId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  marketPlaceId: z.string().nullable().optional(),
  marketPlace: z.string().nullable().optional(),
  status: z.string().default('PENDING'),
  type: z.string().default('KIOSK_DINE_IN'),
  priority: z.number().int('Öncelik tam sayı olmalıdır').default(0),
  estimatedTime: z.number().int('Tahmini süre tam sayı olmalıdır').default(15),
  preparationStartTime: z.date().nullable().optional(),
  preparationEndTime: z.date().nullable().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, 'Ürün seçimi zorunludur'),
    name: z.string().min(1, 'Ürün adı boş olamaz'),
    status: z.string().default('DELIVERED'),
    quantity: z.number().int('Adet tam sayı olmalıdır').min(1, 'Adet en az 1 olmalıdır'),
    unitPrice: z.number().min(0, 'Birim fiyat 0\'dan büyük olmalıdır').default(0),
    unitSubtotal: z.number().min(0, 'Birim maliyet fiyatı 0\'dan büyük olmalıdır').default(0),
    totalPrice: z.number().min(0, 'Toplam fiyat 0\'dan büyük olmalıdır').default(0),
    totalSubtotal: z.number().min(0, 'Toplam maliyet fiyatı 0\'dan büyük olmalıdır').default(0),
    extrasTotal: z.number().default(0),
    extrasSubtotal: z.number().default(0),
    notes: z.string().nullable().optional(),
    extras: z.array(z.object({
      name: z.string().min(1, 'Ekstra adı boş olamaz'),
      price: z.number().min(0, 'Ekstra fiyatı 0\'dan büyük olmalıdır'),
      quantity: z.number().int('Ekstra adeti tam sayı olmalıdır').min(1, 'Ekstra adeti en az 1 olmalıdır'),
      variantId: z.string().optional(),
      variantItemId: z.string().optional(),
      meta: z.object({
        type: z.enum(['removal', 'free', 'paid']).optional(),
        children: z.array(z.any()).optional()
      }).optional()
    })).nullable().optional()
  })),
  employeeId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  campaignId: z.string().nullable().optional(),
  discount: z.number().min(0, 'İndirim 0\'dan büyük olmalıdır').nullable().optional(),
  totalAmount: z.number().min(0, 'Toplam tutar'),
  extrasTotal: z.number().min(0, 'Ekstra ürünler toplamı'),
  subtotal: z.number().min(0, 'Ara toplam 0\'dan büyük olmalıdır'),
  extrasSubtotal: z.number().default(0),
  tableNumber: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  receiptImage: z.string().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  paymentType: z.string().nullable().optional(),
});

const router = Router();

// LicenseManager instance'ını oluştur
const licenseManager = new LicenseManager();

// Lisans anahtarını al
const getLicenseKey = (): string | null => {
  const licenseStatus = licenseManager.getLicenseStatus();
  return licenseStatus.isValid ? licenseStatus.licenseKey || null : null;
};
// Service instance'larını al
const offlineOrderService = OfflineOrderService.getInstance();
const dailyOrderService = DailyOrderService.getInstance();
const dbManager = QuickDBManager.getInstance();
const db = dbManager.getDatabase();

/**
 * Sipariş numarası üretir
 * @param brandId - Marka ID'si
 * @param dealerId - Bayi ID'si
 * @param prefix - Ön ek (varsayılan: 'K')
 * @returns Promise<string> - Üretilen sipariş numarası
 */
const generateOrderNumber = async (brandId: string, dealerId: string, prefix: string = 'K'): Promise<string> => {
  const now = new Date();
  const turkeyTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));

  // Günlük kullanılan numaralar için key
  const today = turkeyTime.toISOString().split('T')[0];
  const usedNumbersKey = `ORDER_NUMBERS:${brandId}:${dealerId}:${today}:used`;

  // Maksimum deneme sayısı
  const maxAttempts = 50;
  let attempts = 0;
  let orderNumber = '';

  while (attempts < maxAttempts) {
    // Zaman bazlı rastgele sayı üretimi
    const hours = turkeyTime.getHours();
    const minutes = turkeyTime.getMinutes();
    const seconds = turkeyTime.getSeconds();
    const milliseconds = turkeyTime.getMilliseconds();

    // Rastgele seed oluştur
    const seed = milliseconds + (seconds * 1000) + (attempts * 137);

    // İlk rakam: 1-9 arası rastgele
    const digit1 = ((seed * 7 + hours) % 9) + 1;

    // İkinci rakam: 0-9 arası, zaman bazlı karmaşık hesaplama
    const complexCalc = (minutes * 13 + seconds * 17 + seed) % 100;
    const digit2 = Math.floor(complexCalc / 10);

    // Üçüncü rakam: 0-9 arası, XOR ve modülo kombinasyonu
    const xorValue = hours ^ minutes ^ seconds ^ (seed % 256);
    const digit3 = (xorValue + milliseconds) % 10;

    // Sipariş numarasını oluştur
    const candidateNumber = `${digit1}${digit2}${digit3}`;

    // Bu numara daha önce kullanılmış mı kontrol et
    const usedNumbers = await db.get(usedNumbersKey) || [];
    const isUsed = usedNumbers.includes(candidateNumber);

    if (!isUsed) {
      // Numarayı kullanılanlar listesine ekle
      usedNumbers.push(candidateNumber);
      await db.set(usedNumbersKey, usedNumbers);

      // TTL kontrolü için expiry key'i ayarla (gece yarısına kadar)
      const expiryKey = `${usedNumbersKey}:expiry`;
      const existingExpiry = await db.get(expiryKey);

      if (!existingExpiry) {
        const midnight = new Date(turkeyTime);
        midnight.setHours(24, 0, 0, 0);
        await db.set(expiryKey, midnight.getTime());

        // Temizleme işlemi için timeout ayarla
        const secondsUntilMidnight = Math.ceil((midnight.getTime() - now.getTime()) / 1000);
        setTimeout(async () => {
          await db.delete(usedNumbersKey);
          await db.delete(expiryKey);
        }, secondsUntilMidnight * 1000);
      }

      orderNumber = candidateNumber;
      break;
    }

    attempts++;
  }

  // Eğer benzersiz numara bulunamazsa, güvenli fallback
  if (!orderNumber) {
    const fallbackKey = `${usedNumbersKey}:fallback`;
    const fallbackCounter = (await db.get(fallbackKey) || 0) + 1;
    await db.set(fallbackKey, fallbackCounter);
    orderNumber = (100 + (fallbackCounter % 900)).toString();
  }

  return `${prefix}-${orderNumber}`;
};

router.post('/create', asyncHandler(async (req: Request, res: Response) => {
  try {
    const payload = await CreateOrderSchema.parseAsync(req.body);

    console.log(payload, "Kontrol 1");

    if (!payload.sequence) {
      payload.sequence = await generateOrderNumber(payload.brandId, payload.dealerId);
    }

    console.log(payload, "Kontrol 2");

    const hasInternet = await checkInternetConnection(5000);

    if (hasInternet) {
      try {
        console.log('İnternet bağlantısı mevcut, API\'ye gönderiliyor...');

        const result = await baseApi.post<{ orderId: string; message: string; estimatedTime?: number }>("/v1/order", payload, {
          headers: {
            "x-device-id": payload.deviceId,
            "Authorization": "Bearer " + getLicenseKey()
          }
        });

        if (result.data) {
          const dailyResult = await dailyOrderService.saveDailyOrder(result.data.orderId, payload, false);

          res.status(201).json(createSuccessResponse({
            ...result.data,
            dailyOrderId: dailyResult.id,
            tableName: dailyResult.tableName
          }));

        } else {
          res.status(400).json(
            createErrorResponse(
              'Sipariş oluşturulamadı',
              FAErrorCode.VALIDATION_ERROR,
              ErrorSeverity.MEDIUM
            )
          );
        }
      } catch (apiError: unknown) {
        const errorMessage = apiError instanceof Error ? apiError.message : 'Bilinmeyen API hatası';
        console.error('API hatası, offline moda geçiliyor:', errorMessage);

        const offlineResult = await offlineOrderService.saveOfflineOrder(payload);

        const dailyResult = await dailyOrderService.saveDailyOrder(offlineResult.orderId, payload, true);

        res.status(202).json(
          createSuccessResponse(
            {
              orderId: offlineResult.orderId,
              isOffline: true,
              message: offlineResult.message,
              dailyOrderId: dailyResult.id,
              tableName: dailyResult.tableName
            },
            { message: 'Sipariş offline olarak kaydedildi' }
          )
        );
      }
    } else {
      console.log('İnternet bağlantısı yok, offline kaydediliyor...');

      const offlineResult = await offlineOrderService.saveOfflineOrder(payload);

      const dailyResult = await dailyOrderService.saveDailyOrder(offlineResult.orderId, payload, true);

      res.status(202).json(
        createSuccessResponse(
          {
            orderId: offlineResult.orderId,
            isOffline: true,
            message: offlineResult.message,
            dailyOrderId: dailyResult.id,
            tableName: dailyResult.tableName
          },
          { message: 'Sipariş offline olarak kaydedildi' }
        )
      );
    }
  } catch (error: unknown) {
    console.error('Sipariş oluşturma hatası:', error);

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      res.status(400).json(
        createErrorResponse(
          'Geçersiz sipariş verisi',
          FAErrorCode.VALIDATION_ERROR,
          ErrorSeverity.MEDIUM,
          'errors' in error ? error.errors : undefined
        )
      );
    } else {
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      res.status(500).json(
        createErrorResponse(
          'Internal server error',
          FAErrorCode.INTERNAL_SERVER_ERROR,
          ErrorSeverity.HIGH,
          errorMessage
        )
      );
    }
  }
}));

router.get('/offline/status', asyncHandler(async (req: Request, res: Response) => {
  try {
    const stats = await offlineOrderService.getOrderStats();
    const hasInternet = await checkInternetConnection(3000);

    res.status(200).json(
      createSuccessResponse(
        {
          ...stats,
          hasInternet,
          lastCheck: new Date().toISOString()
        },
        { message: 'Offline sipariş durumu başarıyla alındı' }
      )
    );
  } catch (error: unknown) {
    console.error('Offline durum kontrolü hatası:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    res.status(500).json(
      createErrorResponse(
        'Offline durum bilgisi alınamadı',
        FAErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.MEDIUM,
        errorMessage
      )
    );
  }
}));

router.post('/offline/sync', asyncHandler(async (req: Request, res: Response) => {
  try {
    const hasInternet = await checkInternetConnection(5000);

    if (!hasInternet) {
      res.status(400).json(
        createErrorResponse(
          'İnternet bağlantısı yok, senkronizasyon yapılamaz',
          FAErrorCode.NETWORK_ERROR,
          ErrorSeverity.MEDIUM
        )
      );
      return;
    }

    console.log('Manuel senkronizasyon başlatılıyor...');
    const syncResult = await offlineOrderService.syncAllPendingOrders();

    res.status(200).json(
      createSuccessResponse(
        syncResult,
        { message: `Senkronizasyon tamamlandı. ${syncResult.synced} başarılı, ${syncResult.failed} başarısız` }
      )
    );
  } catch (error: unknown) {
    console.error('Manuel senkronizasyon hatası:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    res.status(500).json(
      createErrorResponse(
        'Senkronizasyon başlatılamadı',
        FAErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.HIGH,
        errorMessage
      )
    );
  }
}));

router.get('/offline/pending', asyncHandler(async (req: Request, res: Response) => {
  try {
    const pendingOrders = await offlineOrderService.getPendingOrders();

    res.status(200).json(
      createSuccessResponse(
        {
          orders: pendingOrders,
          count: pendingOrders.length
        },
        { message: 'Bekleyen siparişler başarıyla alındı' }
      )
    );
  } catch (error: unknown) {
    console.error('Bekleyen siparişler alınamadı:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    res.status(500).json(
      createErrorResponse(
        'Bekleyen siparişler alınamadı',
        FAErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.MEDIUM,
        errorMessage
      )
    );
  }
}));

router.delete('/offline/cleanup', asyncHandler(async (req: Request, res: Response) => {
  try {
    const cleanedCount = await offlineOrderService.cleanSyncedOrders();

    res.status(200).json(
      createSuccessResponse(
        { cleanedCount },
        { message: `${cleanedCount} senkronize edilmiş sipariş temizlendi` }
      )
    );
  } catch (error: unknown) {
    console.error('Temizleme hatası:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    res.status(500).json(
      createErrorResponse(
        'Temizleme işlemi başarısız',
        FAErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.MEDIUM,
        { error: errorMessage }
      )
    );
  }
}));

router.get('/daily/stats', asyncHandler(async (req: Request, res: Response) => {
  try {
    const dateParam = req.query.date as string;
    const date = dateParam ? new Date(dateParam) : new Date();

    const stats = await dailyOrderService.getDailyStats(date);

    res.status(200).json(
      createSuccessResponse(
        {
          date: date.toISOString().split('T')[0],
          ...stats
        },
        { message: 'Günlük istatistikler başarıyla alındı' }
      )
    );
  } catch (error: unknown) {
    console.error('Günlük istatistik hatası:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    res.status(500).json(
      createErrorResponse(
        'Günlük istatistikler alınamadı',
        FAErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.MEDIUM,
        { error: errorMessage }
      )
    );
  }
}));

router.get('/daily/orders', asyncHandler(async (req: Request, res: Response) => {
  try {
    const dateParam = req.query.date as string;
    const date = dateParam ? new Date(dateParam) : new Date();

    const orders = await dailyOrderService.getDailyOrders(date);

    res.status(200).json(
      createSuccessResponse(
        {
          date: date.toISOString().split('T')[0],
          orders,
          count: orders.length
        },
        { message: 'Günlük siparişler başarıyla alındı' }
      )
    );
  } catch (error: unknown) {
    console.error('Günlük siparişler alınamadı:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    res.status(500).json(
      createErrorResponse(
        'Günlük siparişler alınamadı',
        FAErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.MEDIUM,
        { error: errorMessage }
      )
    );
  }
}));

router.patch('/daily/status/:orderId', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!['pending', 'completed', 'cancelled'].includes(status)) {
      res.status(400).json(
        createErrorResponse(
          'Geçersiz durum değeri',
          FAErrorCode.VALIDATION_ERROR,
          ErrorSeverity.MEDIUM
        )
      );
      return;
    }

    const dateParam = req.query.date as string;
    const date = dateParam ? new Date(dateParam) : new Date();

    const updated = await dailyOrderService.updateOrderStatus(orderId, status, date);

    if (updated) {
      res.status(200).json(
        createSuccessResponse(
          { orderId, status, updated: true },
          { message: 'Sipariş durumu başarıyla güncellendi' }
        )
      );
    } else {
      res.status(404).json(
        createErrorResponse(
          'Sipariş bulunamadı',
          FAErrorCode.NOT_FOUND,
          ErrorSeverity.MEDIUM
        )
      );
    }
  } catch (error: unknown) {
    console.error('Sipariş durumu güncellenemedi:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    res.status(500).json(
      createErrorResponse(
        'Sipariş durumu güncellenemedi',
        FAErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.MEDIUM,
        { error: errorMessage }
      )
    );
  }
}));

router.get('/daily/tables', asyncHandler(async (req: Request, res: Response) => {
  try {
    const startDateParam = req.query.startDate as string;
    const endDateParam = req.query.endDate as string;

    const startDate = startDateParam ? new Date(startDateParam) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 gün önce
    const endDate = endDateParam ? new Date(endDateParam) : new Date();

    const tables = await dailyOrderService.getAvailableTables(startDate, endDate);

    res.status(200).json(
      createSuccessResponse(
        {
          tables,
          count: tables.length,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        },
        { message: 'Mevcut tablolar başarıyla alındı' }
      )
    );
  } catch (error: unknown) {
    console.error('Tablolar alınamadı:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    res.status(500).json(
      createErrorResponse(
        'Tablolar alınamadı',
        FAErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.MEDIUM,
        { error: errorMessage }
      )
    );
  }
}));

router.delete('/daily/cleanup', asyncHandler(async (req: Request, res: Response) => {
  try {
    const daysToKeep = parseInt(req.query.days as string) || 30;

    const cleanedCount = await dailyOrderService.cleanOldTables(daysToKeep);

    res.status(200).json(
      createSuccessResponse(
        { cleanedCount, daysToKeep },
        { message: `${cleanedCount} eski tablo temizlendi` }
      )
    );
  } catch (error: unknown) {
    console.error('Eski tablolar temizlenemedi:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    res.status(500).json(
      createErrorResponse(
        'Eski tablolar temizlenemedi',
        FAErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.MEDIUM,
        { error: errorMessage }
      )
    );
  }
}));



export { router as orderRouter };
