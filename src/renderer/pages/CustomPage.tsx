import React, { useState, useEffect } from 'react';
import { useOrderData } from '../hooks/useOrderData';
import { X, RefreshCw, PrinterIcon, Lock, Eye, EyeOff, Clock, TrendingUp, CheckCircle, XCircle, AlertCircle, ArrowLeft, ShoppingCart, Delete, CreditCard, RotateCcw, History } from 'lucide-react';
import gafYaziLogo from '../logotext.svg';

interface Device {
  id: string;
  name: string;
  type: 'kiosk' | 'pos';
  status: 'online' | 'offline';
  paymentDevice?: 'PAVO' | 'INGENICO' | 'VERIFONE';
  location: string;
}



interface RecentOrder {
  id: string;
  orderId: string;
  amount: number;
  status: 'online' | 'offline';
  synced: boolean;
  time: string;
}

const CustomPage: React.FC = () => {
  // Hook'tan veri ve fonksiyonları al
  const { 
    orders, 
    stats: orderStats, 
    paymentMethods, 
    loading: orderLoading, 
    error: orderError,
    refreshData,
    syncOfflineOrders
  } = useOrderData();


  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const ADMIN_PIN = '123456'; // Mock PIN - gerçek uygulamada güvenli bir şekilde saklanmalı

  // Loading state'ini sadece ilk yüklemede kontrol et
  useEffect(() => {
    if (isInitialLoad && !orderLoading) {
      setLoading(false);
      setIsInitialLoad(false);
    }
  }, [orderLoading, isInitialLoad]);

  // 5 saniyede bir otomatik veri yenileme
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshData]);

  // Recent orders'ı orders'dan oluştur - pending ve synced siparişleri göster
  const recentOrders: RecentOrder[] = orders
    .filter(order => order.status === 'pending' || order.status === 'synced') // Bekleyen ve onaylanan siparişleri göster
    .slice(0, 5)
    .map(order => ({
      id: order.id,
      orderId: order.sequence,
      amount: order.totalAmount,
      status: order.isOffline ? 'offline' : 'online',
      synced: order.status === 'synced', // Status kontrolü
      time: new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    }));

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(price);
  };

  const handleViewContent = () => {
    setShowPinModal(true);
    setPinInput('');
    setPinError('');
  };

  const handlePinSubmit = () => {
    if (pinInput === ADMIN_PIN) {
      setIsContentVisible(true);
      setShowPinModal(false);
      setPinInput('');
      setPinError('');
    } else {
      setPinError('Hatalı PIN kodu!');
      setPinInput('');
    }
  };

  const handleRefreshData = async () => {
    try {
      await refreshData();
      console.log('Veriler yenilendi');
    } catch (error) {
      console.error('Veri yenileme hatası:', error);
    }
  };

  const handlePrintReport = async () => {
    setIsPrinting(true);
    
    // Mock yazıcı işlemi - gerçek API çağrısı sonra eklenecek
    try {
      console.log('Rapor yazdırılıyor...');
      
      // Simüle edilmiş yazıcı gecikmesi
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('Rapor başarıyla yazdırıldı!');
      
      // Burada gerçek yazıcı API'si çağrılacak
      // await window.electronAPI.printDailyReport({
      //   orderStats,
      //   deviceStats,
      //   devices,
      //   paymentMethods,
      //   recentOrders,
      //   date: getCurrentDate(),
      //   time: getCurrentTime()
      // });
      
    } catch (error) {
      console.error('Rapor yazdırma hatası:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-[440px] h-[650px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto mb-2"></div>
          <p className="text-slate-300 text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[440px] h-[650px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden">
      {/* Custom Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-b border-slate-600/30 backdrop-blur-sm" style={{WebkitAppRegion: 'drag'} as React.CSSProperties}>
        <div className="flex items-center space-x-3">
          <div className="bg-white/10 rounded-lg p-1.5 backdrop-blur-sm">
            <img 
              src={gafYaziLogo} 
              alt="GAF Logo" 
              className="h-6 w-auto" 
              style={{
                imageRendering: 'crisp-edges',
                WebkitImageRendering: 'crisp-edges',
                filter: 'brightness(0) invert(1) drop-shadow(0 0 6px rgba(255,255,255,0.3))'
              } as React.CSSProperties}
            />
          </div>
          <div>
            <h1 className="text-white font-semibold text-sm">Gün Sonu Raporu</h1>
            <p className="text-slate-400 text-xs">{getCurrentDate()}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1" style={{WebkitAppRegion: 'no-drag'} as React.CSSProperties}>
          <button
            onClick={handleRefreshData}
            className="p-1.5 hover:bg-slate-600/50 rounded-md transition-colors"
            title="Yenile"
          >
            <RefreshCw className="h-3.5 w-3.5 text-white/70" />
          </button>
          <button 
            onClick={() => {
              if (window.electronAPI?.invoke) {
                window.electronAPI.invoke('window:hide-custom');
              } else {
                window.close();
              }
            }}
            className="p-1.5 hover:bg-red-600/50 rounded-md transition-colors"
            title="Kapat"
          >
            <X className="h-3.5 w-3.5 text-white/70" />
          </button>
        </div>
      </div>

      {/* Header Info */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-800/30 to-slate-700/30 border-b border-slate-600/30">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-slate-300 text-sm font-medium">{getCurrentTime()}</span>
          </div>
          <button
            onClick={handlePrintReport}
            disabled={isPrinting}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isPrinting
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            {isPrinting ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Yazdırılıyor...</span>
              </>
            ) : (
              <>
                <PrinterIcon className="h-3 w-3" />
                <span>Rapor Al</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content Visibility Control */}
      {!isContentVisible && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 p-3 bg-slate-700/50 rounded-full">
                <Lock className="w-full h-full text-slate-300" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Gün Sonu Raporu</h2>
               <p className="text-slate-400 mb-6">Bu raporu görüntülemek için PIN kodunuzu girin</p>
            </div>
            <button
              onClick={handleViewContent}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              İçeriği Görüntüle
            </button>
          </div>
        </div>
      )}

      {/* PIN Modal */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-60 flex items-center justify-center">
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-6 w-96 max-w-md mx-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">PIN Kodu Girin</h3>
                <p className="text-sm text-slate-400">6 haneli PIN kodunuzu girin</p>
              </div>
              
              {/* PIN Display */}
              <div className="mb-6">
                <div className="flex justify-center space-x-2 mb-2">
                  {[...Array(6)].map((_, index) => (
                    <div
                      key={index}
                      className={`w-10 h-10 border-2 rounded-lg flex items-center justify-center ${
                        index < pinInput.length
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-slate-600 bg-slate-700/50'
                      }`}
                    >
                      {index < pinInput.length && (
                        <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
                {pinError && (
                  <p className="text-red-400 text-sm text-center">{pinError}</p>
                )}
              </div>
              
              {/* Number Keypad */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => (
                  <button
                    key={number}
                    onClick={() => {
                      if (pinInput.length < 6) {
                        setPinInput(prev => prev + number.toString());
                        setPinError('');
                      }
                    }}
                    className="h-12 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 border border-slate-600 rounded-lg text-lg font-semibold text-white transition-colors"
                  >
                    {number}
                  </button>
                ))}
                
                {/* Empty space */}
                <div></div>
                
                {/* Zero button */}
                <button
                  onClick={() => {
                    if (pinInput.length < 6) {
                      setPinInput(prev => prev + '0');
                      setPinError('');
                    }
                  }}
                  className="h-12 bg-slate-700 hover:bg-slate-600 active:bg-slate-500 border border-slate-600 rounded-lg text-lg font-semibold text-white transition-colors"
                >
                  0
                </button>
                
                {/* Backspace button */}
                <button
                  onClick={() => {
                    setPinInput(prev => prev.slice(0, -1));
                    setPinError('');
                  }}
                  className="h-12 bg-red-700/50 hover:bg-red-600/50 active:bg-red-500/50 border border-red-600/50 rounded-lg flex items-center justify-center text-red-400 transition-colors"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput('');
                    setPinError('');
                  }}
                  className="flex-1 px-4 py-3 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={handlePinSubmit}
                  disabled={pinInput.length !== 6}
                  className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium ${
                    pinInput.length === 6
                      ? 'bg-purple-600 text-white hover:bg-purple-700'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  Onayla
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Scrollable Content */}
      <div className={`flex-1 overflow-y-auto p-4 ${!isContentVisible ? 'filter blur-sm' : ''}`}>
        {/* Grid Layout for Dashboard Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* Order Statistics */}
          <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg backdrop-blur-sm p-3">
            <div className="flex items-center space-x-2 mb-3">
              <ShoppingCart className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">Sipariş İstatistikleri</h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Toplam</span>
                <span className="text-sm font-semibold text-white">{orderStats.todayOrderCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-400">Online</span>
                <span className="text-sm font-semibold text-blue-400">{orderStats.onlineOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-orange-400">Offline</span>
                <span className="text-sm font-semibold text-orange-400">{orderStats.offlineOrders}</span>
              </div>
            </div>
          </div>

          {/* Sync Status */}
          <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg backdrop-blur-sm p-3">
            <div className="flex items-center space-x-2 mb-3">
              <RefreshCw className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">Senkronizasyon</h2>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                  <span className="text-xs text-slate-400">Başarılı</span>
                </div>
                <span className="text-sm font-semibold text-green-400">{orderStats.syncedOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></div>
                  <span className="text-xs text-slate-400">Bekleyen</span>
                </div>
                <span className="text-sm font-semibold text-yellow-400">{orderStats.pendingSyncOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                  <span className="text-xs text-slate-400">Başarısız</span>
                </div>
                <span className="text-sm font-semibold text-red-400">{orderStats.failedOrders}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods & Revenue - Full Width */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg backdrop-blur-sm p-3">
            <div className="flex items-center space-x-2 mb-3">
              <CreditCard className="h-4 w-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-white">Ödeme Yöntemleri & Günlük Ciro</h2>
            </div>
            <div className="space-y-2 mb-4">
              {paymentMethods.slice(0, 3).map((method) => (
                <div key={method.type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      method.type === 'cash' ? 'bg-green-400' :
                      method.type === 'credit_card' ? 'bg-blue-400' :
                      method.type === 'meal_card' ? 'bg-orange-400' :
                      'bg-purple-400'
                    }`}></div>
                    <span className="text-xs text-slate-400">{method.name.split(' ')[0]}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-white">{formatPrice(method.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-600/30 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-white">Toplam Ciro</span>
                <span className="text-lg font-bold text-green-400">{formatPrice(orderStats.totalRevenue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Grid - 3 Columns */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Approved Orders */}
          <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg backdrop-blur-sm p-3">
            <h2 className="text-sm font-semibold text-white mb-3">Onaylanan</h2>
            <div className="text-center">
              <div className="w-8 h-8 bg-green-400/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-xl font-bold text-green-400">{orderStats.todayOrderCount - (orderStats.failedOrders || 0)}</p>
              <p className="text-xs text-slate-400">Sipariş</p>
            </div>
          </div>

          {/* Cancelled Orders */}
          <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg backdrop-blur-sm p-3">
            <h2 className="text-sm font-semibold text-white mb-3">İptal Edilen</h2>
            <div className="text-center">
              <div className="w-8 h-8 bg-red-400/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
              <p className="text-xl font-bold text-red-400">{orderStats.failedOrders || 0}</p>
              <p className="text-xs text-slate-400">Sipariş</p>
            </div>
          </div>

          {/* Refunded Orders */}
          <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg backdrop-blur-sm p-3">
            <h2 className="text-sm font-semibold text-white mb-3">İade Edilen</h2>
            <div className="text-center">
              <div className="w-8 h-8 bg-orange-400/20 rounded-full flex items-center justify-center mx-auto mb-2">
                <RotateCcw className="w-4 h-4 text-orange-400" />
              </div>
              <p className="text-xl font-bold text-orange-400">0</p>
              <p className="text-xs text-slate-400">Sipariş</p>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-slate-800/50 border border-slate-600/30 rounded-lg backdrop-blur-sm p-3">
          <div className="flex items-center space-x-2 mb-3">
            <History className="h-4 w-4 text-purple-400" />
            <h2 className="text-sm font-semibold text-white">Son Siparişler</h2>
          </div>
          <div className="space-y-2">
            {orderLoading ? (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400">Yükleniyor...</p>
              </div>
            ) : recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-slate-600/30 last:border-b-0">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${order.status === 'online' ? 'bg-blue-400' : 'bg-orange-400'
                      }`}></div>
                    <div>
                      <p className="text-xs font-medium text-white">{order.orderId}</p>
                      <p className="text-xs text-slate-400">{order.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-white">{formatPrice(order.amount)}</p>
                    <div className="flex items-center space-x-1">
                      {order.synced ? (
                        <CheckCircle className="w-3 h-3 text-green-400" />
                      ) : (
                        <Clock className="w-3 h-3 text-yellow-400" />
                      )}
                      <span className={`text-xs ${order.synced ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                        {order.synced ? 'Başarılı' : 'Bekliyor'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-slate-400">Henüz sipariş bulunmuyor</p>
                <button 
                  onClick={handleRefreshData}
                  className="mt-2 text-xs text-purple-400 hover:text-purple-300"
                >
                  Yenile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomPage;