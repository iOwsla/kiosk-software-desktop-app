import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { createSuccessResponse, createErrorResponse, FAErrorCode, ErrorSeverity } from '../api';
import { z } from 'zod';
import baseApi from '../api';
import { checkInternetConnection } from '../utils/networkUtils';
import { OfflineOrderService } from '../services/OfflineOrderService';

import { LicenseManager } from '@/main/services/LicenseManager';

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
// Service instance'ını al
const offlineOrderService = OfflineOrderService.getInstance();

router.post('/create', asyncHandler(async (req: Request, res: Response) => {
  try {
    const payload = await CreateOrderSchema.parseAsync(req.body);

    if (!payload.sequence) {
      payload.sequence = await offlineOrderService.generateOrderNumber(payload.brandId, payload.dealerId);
    }

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
          // Online sipariş başarılı olsa da offline veri oluştur
          const offlineResult = await offlineOrderService.saveOfflineOrder(payload);
          
          res.status(201).json(createSuccessResponse({
            ...result.data,
            offlineOrderId: offlineResult.orderId,
            isOfflineBackupCreated: true
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

        res.status(202).json(
          createSuccessResponse(
            {
              orderId: offlineResult.orderId,
              isOffline: true,
              message: offlineResult.message
            },
            { message: 'Sipariş offline olarak kaydedildi' }
          )
        );
      }
    } else {
      console.log('İnternet bağlantısı yok, offline kaydediliyor...');

      const offlineResult = await offlineOrderService.saveOfflineOrder(payload);

      res.status(202).json(
        createSuccessResponse(
          {
            orderId: offlineResult.orderId,
            isOffline: true,
            message: offlineResult.message
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
    
    const formattedOrders = pendingOrders.map(order => ({
      id: order.id,
      orderId: order.payload?.sequence || order.id,
      sequence: order.payload?.sequence || 'N/A',
      totalAmount: order.payload?.totalAmount || 0,
      status: order.status,
      createdAt: order.createdAt,
      isOffline: true,
      payload: order.payload
    }));

    res.json(createSuccessResponse({
      orders: formattedOrders,
      count: formattedOrders.length
    }));
  } catch (error: any) {
    console.error('Bekleyen siparişler alınamadı:', error);
    res.status(500).json(createErrorResponse(
      'Bekleyen siparişler alınamadı',
      FAErrorCode.INTERNAL_SERVER_ERROR,
      ErrorSeverity.HIGH,
      error.message
    ));
  }
}));

router.get('/offline/all', asyncHandler(async (req: Request, res: Response) => {
  try {
    const allOrders = await offlineOrderService.getAllOrders();
    
    const formattedOrders = allOrders.map(order => ({
      id: order.id,
      orderId: order.payload?.sequence || order.id,
      sequence: order.payload?.sequence || 'N/A',
      totalAmount: order.payload?.totalAmount || 0,
      status: order.status,
      createdAt: order.createdAt,
      isOffline: true,
      payload: order.payload
    }));

    res.json(createSuccessResponse({
      orders: formattedOrders,
      count: formattedOrders.length
    }));
  } catch (error: any) {
    console.error('Tüm siparişler alınamadı:', error);
    res.status(500).json(createErrorResponse(
      'Tüm siparişler alınamadı',
      FAErrorCode.INTERNAL_SERVER_ERROR,
      ErrorSeverity.HIGH,
      error.message
    ));
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

// Günlük siparişleri getir (tüm siparişler - senkronize edilenler dahil)


export { router as orderRouter };
