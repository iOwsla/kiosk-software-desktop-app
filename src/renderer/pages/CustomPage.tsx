import React, { useState, useEffect } from 'react';
import { useOrderData } from '../hooks/useOrderData';

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
      <div className="w-[440px] h-[650px] bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[440px] h-[600px] bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 border-b">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Gün Sonu Raporu</h1>
            <p className="text-xs text-gray-600">{getCurrentDate()}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrintReport}
              disabled={isPrinting}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                isPrinting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800'
              }`}
            >
              {isPrinting ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  <span>Yazdırılıyor...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
                  </svg>
                  <span>Rapor Al</span>
                </div>
              )}
            </button>
            <div className="text-right">
              <p className="text-xs text-gray-500">Saat</p>
              <p className="text-sm font-medium text-gray-900">{getCurrentTime()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Visibility Control */}
      {!isContentVisible && (
        <div className="fixed inset-0 bg-white bg-opacity-95 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center">
            <div className="mb-6">
              <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Gün Sonu Raporu</h2>
               <p className="text-gray-500 mb-6">Bu raporu görüntülemek için PIN kodunuzu girin</p>
            </div>
            <button
              onClick={handleViewContent}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              İçeriği Görüntüle
            </button>
          </div>
        </div>
      )}

      {/* PIN Modal */}
        {showPinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-60 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">PIN Kodu Girin</h3>
                <p className="text-sm text-gray-600">6 haneli PIN kodunuzu girin</p>
              </div>
              
              {/* PIN Display */}
              <div className="mb-6">
                <div className="flex justify-center space-x-2 mb-2">
                  {[...Array(6)].map((_, index) => (
                    <div
                      key={index}
                      className={`w-10 h-10 border-2 rounded-lg flex items-center justify-center ${
                        index < pinInput.length
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      {index < pinInput.length && (
                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  ))}
                </div>
                {pinError && (
                  <p className="text-red-500 text-sm text-center">{pinError}</p>
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
                    className="h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-lg font-semibold text-gray-800 transition-colors"
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
                  className="h-12 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-lg text-lg font-semibold text-gray-800 transition-colors"
                >
                  0
                </button>
                
                {/* Backspace button */}
                <button
                  onClick={() => {
                    setPinInput(prev => prev.slice(0, -1));
                    setPinError('');
                  }}
                  className="h-12 bg-red-100 hover:bg-red-200 active:bg-red-300 rounded-lg flex items-center justify-center text-red-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.707 4.879A3 3 0 018.828 4H15a3 3 0 013 3v6a3 3 0 01-3 3H8.828a3 3 0 01-2.12-.879l-4.415-4.414a1 1 0 010-1.414l4.414-4.414zm4 1.414L9.414 7.586a1 1 0 000 1.414L10.707 10.293a1 1 0 11-1.414 1.414L8 10.414l-1.293 1.293a1 1 0 01-1.414-1.414L6.586 9 5.293 7.707a1 1 0 011.414-1.414L8 7.586l1.293-1.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
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
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={handlePinSubmit}
                  disabled={pinInput.length !== 6}
                  className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium ${
                    pinInput.length === 6
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
          <div className="bg-white rounded-lg shadow p-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Sipariş İstatistikleri</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Toplam</span>
                <span className="text-sm font-semibold text-gray-900">{orderStats.todayOrderCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-600">Online</span>
                <span className="text-sm font-semibold text-blue-600">{orderStats.onlineOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-orange-600">Offline</span>
                <span className="text-sm font-semibold text-orange-600">{orderStats.offlineOrders}</span>
              </div>
            </div>
          </div>

          {/* Sync Status */}
          <div className="bg-white rounded-lg shadow p-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Senkronizasyon</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-600">Başarılı</span>
                </div>
                <span className="text-sm font-semibold text-green-600">{orderStats.syncedOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-600">Bekleyen</span>
                </div>
                <span className="text-sm font-semibold text-yellow-600">{orderStats.pendingSyncOrders}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                  <span className="text-xs text-gray-600">Başarısız</span>
                </div>
                <span className="text-sm font-semibold text-red-600">{orderStats.failedOrders}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods & Revenue - Full Width */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          <div className="bg-white rounded-lg shadow p-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Ödeme Yöntemleri & Günlük Ciro</h2>
            <div className="space-y-2 mb-4">
              {paymentMethods.slice(0, 3).map((method) => (
                <div key={method.type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      method.type === 'cash' ? 'bg-green-500' :
                      method.type === 'credit_card' ? 'bg-blue-500' :
                      method.type === 'meal_card' ? 'bg-orange-500' :
                      'bg-purple-500'
                    }`}></div>
                    <span className="text-xs text-gray-600">{method.name.split(' ')[0]}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-900">{formatPrice(method.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-900">Toplam Ciro</span>
                <span className="text-lg font-bold text-green-600">{formatPrice(orderStats.totalRevenue)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Grid - 3 Columns */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Approved Orders */}
          <div className="bg-white rounded-lg shadow p-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Onaylanan</h2>
            <div className="text-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-xl font-bold text-green-600">{orderStats.todayOrderCount - (orderStats.failedOrders || 0)}</p>
              <p className="text-xs text-gray-500">Sipariş</p>
            </div>
          </div>

          {/* Cancelled Orders */}
          <div className="bg-white rounded-lg shadow p-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">İptal Edilen</h2>
            <div className="text-center">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-xl font-bold text-red-600">{orderStats.failedOrders || 0}</p>
              <p className="text-xs text-gray-500">Sipariş</p>
            </div>
          </div>

          {/* Refunded Orders */}
          <div className="bg-white rounded-lg shadow p-3">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">İade Edilen</h2>
            <div className="text-center">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-xl font-bold text-orange-600">0</p>
              <p className="text-xs text-gray-500">Sipariş</p>
            </div>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow p-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Son Siparişler</h2>
          <div className="space-y-2">
            {orderLoading ? (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500">Yükleniyor...</p>
              </div>
            ) : recentOrders.length > 0 ? (
              recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${order.status === 'online' ? 'bg-blue-500' : 'bg-orange-500'
                      }`}></div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{order.orderId}</p>
                      <p className="text-xs text-gray-500">{order.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-900">{formatPrice(order.amount)}</p>
                    <div className="flex items-center space-x-1">
                      {order.synced ? (
                        <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={`text-xs ${order.synced ? 'text-green-500' : 'text-yellow-500'
                        }`}>
                        {order.synced ? 'Başarılı' : 'Bekliyor'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500">Henüz sipariş bulunmuyor</p>
                <button 
                  onClick={handleRefreshData}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
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