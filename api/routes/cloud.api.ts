import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import axios from 'axios';
import { QuickDB } from 'quick.db';
import { LicenseManager } from '@/main/services/LicenseManager';

const router = Router();
const db = new QuickDB({
    filePath: 'cloud.db',
    table: 'cloud',
    normalKeys: true
});
const licenseManager = new LicenseManager();

// Lisans anahtarını al
const getLicenseKey = (): string | null => {
    const licenseStatus = licenseManager.getLicenseStatus();
    return licenseStatus.isValid ? licenseStatus.licenseKey || null : null;
};

// İnternet bağlantısını kontrol eden fonksiyon
const checkInternetConnection = async (): Promise<boolean> => {
    try {
        // Google DNS'e ping atarak internet bağlantısını kontrol et
        await axios.get("https://google.com");
        return true;
    } catch (error) {
        return false;
    }
};

// POST /hub/cloud - Genel cloud API proxy
router.post('/', asyncHandler(async (req, res) => {
    const body = req.body;
    const cacheKey = `cloud_${body.method}_${body.url}_${JSON.stringify(body.data || {})}`;

    try {
        // İnternet bağlantısını kontrol et
        const hasInternet = await checkInternetConnection();

        if (hasInternet) {
            const licenseKey = getLicenseKey();
            if (!licenseKey) {
                return res.status(401).json({
                    error: "Geçerli lisans anahtarı bulunamadı",
                    message: "Lütfen lisansınızı kontrol edin"
                });
            }

            const baseURL = "http://localhost:8001/api";
            const config = {
                headers: {
                    ...(body?.headers || {}),
                    "x-api-key": licenseKey,
                },
                timeout: 5000
            };

            let data;
            const method = (body.method || 'GET').toUpperCase();

            switch (method) {
                case 'GET':
                    ({ data } = await axios.get(baseURL + body.url, {
                        ...config,
                        params: body.params
                    }));
                    break;
                case 'POST':
                    ({ data } = await axios.post(baseURL + body.url, body.data, {
                        ...config,
                        params: body.params
                    }));
                    break;
                case 'PUT':
                    ({ data } = await axios.put(baseURL + body.url, body.data, {
                        ...config,
                        params: body.params
                    }));
                    break;
                case 'PATCH':
                    ({ data } = await axios.patch(baseURL + body.url, body.data, {
                        ...config,
                        params: body.params
                    }));
                    break;
                case 'DELETE':
                    ({ data } = await axios.delete(baseURL + body.url, {
                        ...config,
                        params: body.params,
                        data: body.data
                    }));
                    break;
                default:
                    throw new Error(`Desteklenmeyen HTTP method: ${method}`);
            }

            await db.set(cacheKey, {
                data,
                timestamp: new Date().toISOString(),
                source: 'api',
                request: body
            });

            return res.json(data);
        } else {
            // İnternet yoksa veritabanından en son kaydedilen veriyi al
            const cachedData = await db.get(cacheKey);

            if (cachedData) {
                return res.json({
                    ...cachedData.data,
                    _cached: true,
                    _lastUpdate: cachedData.timestamp
                });
            } else {
                return res.status(503).json({
                    error: "İnternet bağlantısı yok ve önbelleğe alınmış veri bulunamadı",
                    message: "Lütfen internet bağlantınızı kontrol edin"
                });
            }
        }
    } catch (error) {
        // API hatası durumunda önbelleğe alınmış veriyi dön
        const cachedData = await db.get(cacheKey);

        if (cachedData) {
            return res.json({
                ...cachedData.data,
                _cached: true,
                _lastUpdate: cachedData.timestamp,
                _error: "API'ye erişim hatası, önbellek verisi döndürüldü"
            });
        } else {
            return res.status(500).json({
                error: "API'ye erişim hatası ve önbelleğe alınmış veri bulunamadı",
                message: error instanceof Error ? error.message : "Bilinmeyen hata",
            });
        }
    }
}));

// POST /hub/cloud/devices - Cihaz listesini getir
router.post('/device', asyncHandler(async (req, res) => {
    const cacheKey = `cloud_devices_${JSON.stringify(req.body.id || {})}`;

    const deviceId = req.body.id;

    try {
        // İnternet bağlantısını kontrol et
        const hasInternet = await checkInternetConnection();

        if (hasInternet) {
            const { data } = await axios.get("http://localhost:8001/api/v1/devices", {
                headers: {
                    "x-device-id": deviceId,
                },
                timeout: 5000
            });

            await db.set(cacheKey, {
                data,
                timestamp: new Date().toISOString(),
                source: 'api',
                deviceId: deviceId
            });

            return res.json(data);
        } else {
            // İnternet yoksa önbellekten veri al
            const cachedData = await db.get(cacheKey);

            if (cachedData) {
                return res.json({
                    ...cachedData.data,
                    _cached: true,
                    _lastUpdate: cachedData.timestamp
                });
            } else {
                return res.status(503).json({
                    error: "İnternet bağlantısı yok ve önbelleğe alınmış cihaz verisi bulunamadı",
                    message: "Lütfen internet bağlantınızı kontrol edin"
                });
            }
        }
    } catch (error) {
        // API hatası durumunda önbelleğe alınmış veriyi dön
        const cachedData = await db.get(cacheKey);

        if (cachedData) {
            return res.json({
                ...cachedData.data,
                _cached: true,
                _lastUpdate: cachedData.timestamp,
                _error: "API'ye erişim hatası, önbellek verisi döndürüldü"
            });
        } else {
            return res.status(500).json({
                error: "Cihaz API'sine erişim hatası ve önbelleğe alınmış veri bulunamadı",
                message: error instanceof Error ? error.message : "Bilinmeyen hata",
            });
        }
    }
}));

// POST /hub/cloud/menu - Menü listesini getir
router.post('/menu', asyncHandler(async (req, res) => {
    const cacheKey = `cloud_menus_${JSON.stringify(req.body.id || {})}`;

    const deviceId = req.body.id;

    try {
        // İnternet bağlantısını kontrol et
        const hasInternet = await checkInternetConnection();

        if (hasInternet) {
            const licenseKey = getLicenseKey();
            if (!licenseKey) {
                return res.status(401).json({
                    error: "Geçerli lisans anahtarı bulunamadı",
                    message: "Lütfen lisansınızı kontrol edin"
                });
            }

            const { data } = await axios.get("http://localhost:8001/api/v1/menu", {
                headers: {
                    "x-device-id": deviceId,
                },
                timeout: 5000
            });

            await db.set(cacheKey, {
                data,
                timestamp: new Date().toISOString(),
                source: 'api',
                deviceId
            });

            return res.json(data);
        } else {
            // İnternet yoksa önbellekten veri al
            const cachedData = await db.get(cacheKey);

            if (cachedData) {
                return res.json({
                    ...cachedData.data,
                    _cached: true,
                    _lastUpdate: cachedData.timestamp
                });
            } else {
                return res.status(503).json({
                    error: "İnternet bağlantısı yok ve önbelleğe alınmış menü verisi bulunamadı",
                    message: "Lütfen internet bağlantınızı kontrol edin"
                });
            }
        }
    } catch (error) {
        // API hatası durumunda önbelleğe alınmış veriyi dön
        const cachedData = await db.get(cacheKey);

        if (cachedData) {
            return res.json({
                ...cachedData.data,
                _cached: true,
                _lastUpdate: cachedData.timestamp,
                _error: "API'ye erişim hatası, önbellek verisi döndürüldü"
            });
        } else {
            return res.status(500).json({
                error: "Menü API'sine erişim hatası ve önbelleğe alınmış veri bulunamadı",
                message: error instanceof Error ? error.message : "Bilinmeyen hata",
            });
        }
    }
}));

// POST /hub/cloud/tables - Masa listesini getir
router.post('/tables', asyncHandler(async (req, res) => {
    const cacheKey = `cloud_tables_${JSON.stringify(req.body.id || {})}`;

    const deviceId = req.body.id;

    try {
        // İnternet bağlantısını kontrol et
        const hasInternet = await checkInternetConnection();

        if (hasInternet) {
            const licenseKey = getLicenseKey();
            if (!licenseKey) {
                return res.status(401).json({
                    error: "Geçerli lisans anahtarı bulunamadı",
                    message: "Lütfen lisansınızı kontrol edin"
                });
            }

            const { data } = await axios.get("http://localhost:8001/api/v1/tables", {
                headers: {
                    "x-device-id": deviceId,
                },
                timeout: 5000
            });

            await db.set(cacheKey, {
                data,
                timestamp: new Date().toISOString(),
                source: 'api',
                deviceId
            });

            return res.json(data);
        } else {
            // İnternet yoksa önbellekten veri al
            const cachedData = await db.get(cacheKey);

            if (cachedData) {
                return res.json({
                    ...cachedData.data,
                    _cached: true,
                    _lastUpdate: cachedData.timestamp
                });
            } else {
                return res.status(503).json({
                    error: "İnternet bağlantısı yok ve önbelleğe alınmış masa verisi bulunamadı",
                    message: "Lütfen internet bağlantınızı kontrol edin"
                });
            }
        }
    } catch (error) {
        // API hatası durumunda önbelleğe alınmış veriyi dön
        const cachedData = await db.get(cacheKey);

        if (cachedData) {
            return res.json({
                ...cachedData.data,
                _cached: true,
                _lastUpdate: cachedData.timestamp,
                _error: "API'ye erişim hatası, önbellek verisi döndürüldü"
            });
        } else {
            return res.status(500).json({
                error: "Masa API'sine erişim hatası ve önbelleğe alınmış veri bulunamadı",
                message: error instanceof Error ? error.message : "Bilinmeyen hata"
            });
        }
    }
}));

// POST /hub/cloud/tables/categories - Masa kategorilerini getir
router.post('/tables/categories', asyncHandler(async (req, res) => {
    const cacheKey = `cloud_table_categories_${JSON.stringify(req.body.id || {})}`;

    const deviceId = req.body.id;

    try {
        // İnternet bağlantısını kontrol et
        const hasInternet = await checkInternetConnection();

        if (hasInternet) {
            const licenseKey = getLicenseKey();
            if (!licenseKey) {
                return res.status(401).json({
                    error: "Geçerli lisans anahtarı bulunamadı",
                    message: "Lütfen lisansınızı kontrol edin"
                });
            }

            const { data } = await axios.get("http://localhost:8001/api/v1/tables/categories", {
                headers: {
                    "x-device-id": deviceId,
                },
            });

            await db.set(cacheKey, {
                data,
                timestamp: new Date().toISOString(),
                source: 'api',
                deviceId
            });

            return res.json(data);
        } else {
            // İnternet yoksa önbellekten veri al
            const cachedData = await db.get(cacheKey);

            if (cachedData) {
                return res.json({
                    ...cachedData.data,
                    _cached: true,
                    _lastUpdate: cachedData.timestamp
                });
            } else {
                return res.status(503).json({
                    error: "İnternet bağlantısı yok ve önbelleğe alınmış masa kategorisi verisi bulunamadı",
                    message: "Lütfen internet bağlantınızı kontrol edin"
                });
            }
        }
    } catch (error) {
        // API hatası durumunda önbelleğe alınmış veriyi dön
        const cachedData = await db.get(cacheKey);

        if (cachedData) {
            return res.json({
                ...cachedData.data,
                _cached: true,
                _lastUpdate: cachedData.timestamp,
                _error: "API'ye erişim hatası, önbellek verisi döndürüldü"
            });
        } else {
            return res.status(500).json({
                error: "Masa kategorisi API'sine erişim hatası ve önbelleğe alınmış veri bulunamadı",
                message: error instanceof Error ? error.message : "Bilinmeyen hata",
            });
        }
    }
}));

export { router as cloudApiRouter };
