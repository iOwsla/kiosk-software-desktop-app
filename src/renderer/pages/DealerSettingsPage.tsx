import React, { useState } from 'react';

const DealerSettingsPage: React.FC = () => {
  // Tab yönetimi
  const [activeTab, setActiveTab] = useState('genel');
  
  const [markaId, setMarkaId] = useState('');
  const [subeId, setSubeId] = useState('');
  const [gunSonuYetkilendirme, setGunSonuYetkilendirme] = useState(true);
  
  // Ödeme cihazları ayarları
  const [odemeCihazlari, setOdemeCihazlari] = useState({
    pos: { aktif: true, ip: '192.168.1.100', port: '8080' },
    kartOkuyucu: { aktif: false, tip: 'manyetik' },
    nakitCekmece: { aktif: true, otomatikAcilim: false }
  });
  
  // Offline yetkilendirme
  const [offlineYetkilendirme, setOfflineYetkilendirme] = useState(true);
  
  // Personel listesi
  const [personelListesi, setPersonelListesi] = useState([
    { id: 1, ad: 'Admin', yetkiler: { nakitOdeme: true, siparisOlustur: true, gunSonu: true, ayarlar: true } }
  ]);
  const [yeniPersonel, setYeniPersonel] = useState({ ad: '', yetkiler: { nakitOdeme: false, siparisOlustur: false, gunSonu: false, ayarlar: false } });

  const [posPrefix, setPosPrefix] = useState('POS');
  const [kioskPrefix, setKioskPrefix] = useState('KIOSK');
  const [masaPrefix, setMasaPrefix] = useState('MASA');
  const [otomatikGunSonu, setOtomatikGunSonu] = useState(false);
  const [gunSonuSaati, setGunSonuSaati] = useState('23:00');

  // Özellik Ayarları
  const [otomatikYazdirma, setOtomatikYazdirma] = useState(true);
  const [sesEfektleri, setSesEfektleri] = useState(false);
  const [dokunmatikMod, setDokunmatikMod] = useState(true);
  const [karanlıkTema, setKaranlıkTema] = useState(false);
  const [otomatikGuncelleme, setOtomatikGuncelleme] = useState(true);
  const [hızlıSiparis, setHızlıSiparis] = useState(false);
  const [stokUyarısı, setStokUyarısı] = useState(true);
  const [fiyatGosterimi, setFiyatGosterimi] = useState(true);
  const [kampanyaGosterimi, setKampanyaGosterimi] = useState(false);
  const [qrKodOkuma, setQrKodOkuma] = useState(true);
  const [barkodOkuma, setBarkodOkuma] = useState(false);
  const [otomatikLogout, setOtomatikLogout] = useState(true);
  const [ekranKoruyucu, setEkranKoruyucu] = useState(false);
  const [animasyonlar, setAnimasyonlar] = useState(true);
  const [bildirimler, setBildirimler] = useState(false);
  const [otomatikYedekleme, setOtomatikYedekleme] = useState(true);
  const [uzakErisim, setUzakErisim] = useState(false);
  const [logKayıtları, setLogKayıtları] = useState(true);
  const [performansIzleme, setPerformansIzleme] = useState(false);
  const [guvenlikModu, setGuvenlikModu] = useState(true);
  const [multiDil, setMultiDil] = useState(false);
  const [otomatikTemizlik, setOtomatikTemizlik] = useState(true);
  const [hataRaporlama, setHataRaporlama] = useState(false);
  const [kullanıcıIzleme, setKullanıcıIzleme] = useState(true);
  const [veriSıkıştırma, setVeriSıkıştırma] = useState(false);
  const [offlineMod, setOfflineMod] = useState(true);
  const [cloudSenkron, setCloudSenkron] = useState(false);
  const [otomatikKapat, setOtomatikKapat] = useState(true);
  const [debugMod, setDebugMod] = useState(false);
  const [testModu, setTestModu] = useState(true);
  const [gelişmiş, setGelişmiş] = useState(false);

  const handleKioskRestart = () => {
    if (window.confirm('Tüm kiosk cihazları yeniden başlatılacak. Emin misiniz?')) {
      // Kiosk yeniden başlatma işlemi
      console.log('Kiosk cihazları yeniden başlatılıyor...');
    }
  };

  const handlePersonelEkle = () => {
    if (yeniPersonel.ad.trim()) {
      const yeniId = Math.max(...personelListesi.map(p => p.id)) + 1;
      setPersonelListesi([...personelListesi, { ...yeniPersonel, id: yeniId }]);
      setYeniPersonel({ ad: '', yetkiler: { nakitOdeme: false, siparisOlustur: false, gunSonu: false, ayarlar: false } });
    }
  };

  const handlePersonelSil = (id: number) => {
    if (id !== 1) { // Admin silinemez
      setPersonelListesi(personelListesi.filter(p => p.id !== id));
    }
  };

  const handleYetkiDegistir = (personelId: number, yetki: string, deger: boolean) => {
    setPersonelListesi(personelListesi.map(p => 
      p.id === personelId 
        ? { ...p, yetkiler: { ...p.yetkiler, [yetki]: deger } }
        : p
    ));
  };

  const handleSaveSettings = () => {
    const settings = {
      markaId,
      subeId,
      gunSonuYetkilendirme,
      posPrefix,
      kioskPrefix,
      masaPrefix,
      otomatikGunSonu,
      gunSonuSaati,
      odemeCihazlari,
      offlineYetkilendirme,
      personelListesi
    };
    console.log('Ayarlar kaydediliyor:', settings);
    alert('Ayarlar başarıyla kaydedildi!');
  };

  return (
    <div className="w-full h-full bg-gray-50 p-3 pb-10 overflow-y-auto" style={{ width: '600px', height: '500px' }}>
      <div className="max-w-full">
        <h1 className="text-lg font-bold text-gray-800 mb-3 text-center">Bayi Ayarları</h1>
        
        {/* Tab Navigation */}
        <div className="flex mb-3 bg-white rounded border">
          <button
            onClick={() => setActiveTab('genel')}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-l ${
              activeTab === 'genel' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Genel Ayarlar
          </button>
          <button
            onClick={() => setActiveTab('odeme')}
            className={`flex-1 py-2 px-3 text-xs font-medium ${
              activeTab === 'odeme' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ödeme Cihazları
          </button>
          <button
            onClick={() => setActiveTab('personel')}
            className={`flex-1 py-2 px-3 text-xs font-medium rounded-r ${
              activeTab === 'personel' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Personel Yönetimi
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'genel' && (
          <div>
            {/* Temel Bilgiler */}
            <div className="bg-white rounded p-3 mb-2 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Temel Bilgiler</h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Marka ID</label>
                  <input
                    type="text"
                    value={markaId}
                    onChange={(e) => setMarkaId(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Marka ID"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Şube ID</label>
                  <input
                    type="text"
                    value={subeId}
                    onChange={(e) => setSubeId(e.target.value)}
                    className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Şube ID"
                  />
                </div>
              </div>
            </div>

            {/* Offline Yetkilendirme */}
            <div className="bg-white rounded p-3 mb-2 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Yetkilendirme</h3>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={offlineYetkilendirme}
                    onChange={(e) => setOfflineYetkilendirme(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-700">Offline Yetkilendirme</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={gunSonuYetkilendirme}
                    onChange={(e) => setGunSonuYetkilendirme(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-700">Gün Sonu Yetkilendirme</span>
                </label>
              </div>
            </div>

        {/* Rapor ve Sipariş Ayarları */}
        <div className="bg-white rounded p-3 mb-2 border">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Rapor ve Sipariş Ayarları</h3>
          
          {/* Prefix Ayarları */}
          <div className="mb-3">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Sipariş Prefix Ayarları</h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">POS Cihazları</label>
                <input
                  type="text"
                  value={posPrefix}
                  onChange={(e) => setPosPrefix(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="POS"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Self Servis Kiosk</label>
                <input
                  type="text"
                  value={kioskPrefix}
                  onChange={(e) => setKioskPrefix(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="KIOSK"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Masa Siparişleri</label>
                <input
                  type="text"
                  value={masaPrefix}
                  onChange={(e) => setMasaPrefix(e.target.value)}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="MASA"
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* Gün Sonu İşlemleri */}
          <div className="border-t pt-2 mb-3">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Gün Sonu İşlemleri</h4>
            <div className="flex items-center space-x-2 mb-2">
              <button
                onClick={() => setGunSonuYetkilendirme(true)}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  gunSonuYetkilendirme
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Yetkilendirme Gerekli
              </button>
              <button
                onClick={() => setGunSonuYetkilendirme(false)}
                className={`px-3 py-1 rounded text-xs font-medium ${
                  !gunSonuYetkilendirme
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Yetkisiz İlerleme
              </button>
            </div>
          </div>
          
          {/* Otomatik Gün Sonu Raporu */}
          <div className="border-t pt-2">
            <label className="flex items-center space-x-2 mb-2">
              <input 
                type="checkbox" 
                checked={otomatikGunSonu} 
                onChange={(e) => setOtomatikGunSonu(e.target.checked)} 
                className="w-3 h-3" 
              />
              <span className="text-xs font-medium text-gray-700">Otomatik Gün Sonu Raporu Al</span>
            </label>
            
            {otomatikGunSonu && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Rapor Alma Saati</label>
                <input
                  type="time"
                  value={gunSonuSaati}
                  onChange={(e) => setGunSonuSaati(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Sistem Özellikleri */}
        <div className="bg-white rounded p-3 mb-2 border">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Sistem Özellikleri</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={otomatikYazdirma} onChange={(e) => setOtomatikYazdirma(e.target.checked)} className="w-3 h-3" />
              <span>Otomatik Yazdırma</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={sesEfektleri} onChange={(e) => setSesEfektleri(e.target.checked)} className="w-3 h-3" />
              <span>Ses Efektleri</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={dokunmatikMod} onChange={(e) => setDokunmatikMod(e.target.checked)} className="w-3 h-3" />
              <span>Dokunmatik Mod</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={karanlıkTema} onChange={(e) => setKaranlıkTema(e.target.checked)} className="w-3 h-3" />
              <span>Karanlık Tema</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={otomatikGuncelleme} onChange={(e) => setOtomatikGuncelleme(e.target.checked)} className="w-3 h-3" />
              <span>Otomatik Güncelleme</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={hızlıSiparis} onChange={(e) => setHızlıSiparis(e.target.checked)} className="w-3 h-3" />
              <span>Hızlı Sipariş</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={stokUyarısı} onChange={(e) => setStokUyarısı(e.target.checked)} className="w-3 h-3" />
              <span>Stok Uyarısı</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={fiyatGosterimi} onChange={(e) => setFiyatGosterimi(e.target.checked)} className="w-3 h-3" />
              <span>Fiyat Gösterimi</span>
            </label>
          </div>
        </div>

        {/* Görsel ve Arayüz */}
        <div className="bg-white rounded p-3 mb-2 border">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Görsel ve Arayüz</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={kampanyaGosterimi} onChange={(e) => setKampanyaGosterimi(e.target.checked)} className="w-3 h-3" />
              <span>Kampanya Gösterimi</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={ekranKoruyucu} onChange={(e) => setEkranKoruyucu(e.target.checked)} className="w-3 h-3" />
              <span>Ekran Koruyucu</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={animasyonlar} onChange={(e) => setAnimasyonlar(e.target.checked)} className="w-3 h-3" />
              <span>Animasyonlar</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={bildirimler} onChange={(e) => setBildirimler(e.target.checked)} className="w-3 h-3" />
              <span>Bildirimler</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={multiDil} onChange={(e) => setMultiDil(e.target.checked)} className="w-3 h-3" />
              <span>Çoklu Dil</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={otomatikLogout} onChange={(e) => setOtomatikLogout(e.target.checked)} className="w-3 h-3" />
              <span>Otomatik Çıkış</span>
            </label>
          </div>
        </div>

        {/* Okuma ve Tarama */}
        <div className="bg-white rounded p-3 mb-2 border">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Okuma ve Tarama</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={qrKodOkuma} onChange={(e) => setQrKodOkuma(e.target.checked)} className="w-3 h-3" />
              <span>QR Kod Okuma</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={barkodOkuma} onChange={(e) => setBarkodOkuma(e.target.checked)} className="w-3 h-3" />
              <span>Barkod Okuma</span>
            </label>
          </div>
        </div>

        {/* Veri ve Güvenlik */}
        <div className="bg-white rounded p-3 mb-2 border">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Veri ve Güvenlik</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={otomatikYedekleme} onChange={(e) => setOtomatikYedekleme(e.target.checked)} className="w-3 h-3" />
              <span>Otomatik Yedekleme</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={uzakErisim} onChange={(e) => setUzakErisim(e.target.checked)} className="w-3 h-3" />
              <span>Uzak Erişim</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={logKayıtları} onChange={(e) => setLogKayıtları(e.target.checked)} className="w-3 h-3" />
              <span>Log Kayıtları</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={guvenlikModu} onChange={(e) => setGuvenlikModu(e.target.checked)} className="w-3 h-3" />
              <span>Güvenlik Modu</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={kullanıcıIzleme} onChange={(e) => setKullanıcıIzleme(e.target.checked)} className="w-3 h-3" />
              <span>Kullanıcı İzleme</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={veriSıkıştırma} onChange={(e) => setVeriSıkıştırma(e.target.checked)} className="w-3 h-3" />
              <span>Veri Sıkıştırma</span>
            </label>
          </div>
        </div>

        {/* Bağlantı ve Senkronizasyon */}
        <div className="bg-white rounded p-3 mb-2 border">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Bağlantı ve Senkronizasyon</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={offlineMod} onChange={(e) => setOfflineMod(e.target.checked)} className="w-3 h-3" />
              <span>Offline Mod</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={cloudSenkron} onChange={(e) => setCloudSenkron(e.target.checked)} className="w-3 h-3" />
              <span>Cloud Senkron</span>
            </label>
          </div>
        </div>

        {/* Gelişmiş Ayarlar */}
        <div className="bg-white rounded p-3 mb-2 border">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Gelişmiş Ayarlar</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={performansIzleme} onChange={(e) => setPerformansIzleme(e.target.checked)} className="w-3 h-3" />
              <span>Performans İzleme</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={otomatikTemizlik} onChange={(e) => setOtomatikTemizlik(e.target.checked)} className="w-3 h-3" />
              <span>Otomatik Temizlik</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={hataRaporlama} onChange={(e) => setHataRaporlama(e.target.checked)} className="w-3 h-3" />
              <span>Hata Raporlama</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={otomatikKapat} onChange={(e) => setOtomatikKapat(e.target.checked)} className="w-3 h-3" />
              <span>Otomatik Kapat</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={debugMod} onChange={(e) => setDebugMod(e.target.checked)} className="w-3 h-3" />
              <span>Debug Modu</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={testModu} onChange={(e) => setTestModu(e.target.checked)} className="w-3 h-3" />
              <span>Test Modu</span>
            </label>
            <label className="flex items-center space-x-1">
              <input type="checkbox" checked={gelişmiş} onChange={(e) => setGelişmiş(e.target.checked)} className="w-3 h-3" />
              <span>Gelişmiş Mod</span>
            </label>
          </div>
        </div>

            {/* Kiosk Yönetimi */}
            <div className="bg-white rounded p-3 mb-2 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Kiosk Yönetimi</h3>
              <button
                onClick={handleKioskRestart}
                className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded text-xs transition-colors"
              >
                Tüm Kiosk Cihazları Yeniden Başlat
              </button>
            </div>
          </div>
        )}

        {/* Ödeme Cihazları Tab */}
        {activeTab === 'odeme' && (
          <div>
            <div className="bg-white rounded p-3 mb-2 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">POS Cihazı Ayarları</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={odemeCihazlari.pos.aktif}
                    onChange={(e) => setOdemeCihazlari({...odemeCihazlari, pos: {...odemeCihazlari.pos, aktif: e.target.checked}})}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-700">POS Cihazı Aktif</span>
                </label>
                {odemeCihazlari.pos.aktif && (
                  <div className="grid grid-cols-2 gap-2 ml-6">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">IP Adresi</label>
                      <input
                        type="text"
                        value={odemeCihazlari.pos.ip}
                        onChange={(e) => setOdemeCihazlari({...odemeCihazlari, pos: {...odemeCihazlari.pos, ip: e.target.value}})}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="192.168.1.100"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Port</label>
                      <input
                        type="text"
                        value={odemeCihazlari.pos.port}
                        onChange={(e) => setOdemeCihazlari({...odemeCihazlari, pos: {...odemeCihazlari.pos, port: e.target.value}})}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="8080"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded p-3 mb-2 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Kart Okuyucu Ayarları</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={odemeCihazlari.kartOkuyucu.aktif}
                    onChange={(e) => setOdemeCihazlari({...odemeCihazlari, kartOkuyucu: {...odemeCihazlari.kartOkuyucu, aktif: e.target.checked}})}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-700">Kart Okuyucu Aktif</span>
                </label>
                {odemeCihazlari.kartOkuyucu.aktif && (
                  <div className="ml-6">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Okuyucu Tipi</label>
                    <select
                      value={odemeCihazlari.kartOkuyucu.tip}
                      onChange={(e) => setOdemeCihazlari({...odemeCihazlari, kartOkuyucu: {...odemeCihazlari.kartOkuyucu, tip: e.target.value}})}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="manyetik">Manyetik Şerit</option>
                      <option value="chip">Chip Okuyucu</option>
                      <option value="temassiz">Temassız</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded p-3 mb-2 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Nakit Çekmece Ayarları</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={odemeCihazlari.nakitCekmece.aktif}
                    onChange={(e) => setOdemeCihazlari({...odemeCihazlari, nakitCekmece: {...odemeCihazlari.nakitCekmece, aktif: e.target.checked}})}
                    className="mr-2"
                  />
                  <span className="text-xs text-gray-700">Nakit Çekmece Aktif</span>
                </label>
                {odemeCihazlari.nakitCekmece.aktif && (
                  <label className="flex items-center ml-6">
                    <input
                      type="checkbox"
                      checked={odemeCihazlari.nakitCekmece.otomatikAcilim}
                      onChange={(e) => setOdemeCihazlari({...odemeCihazlari, nakitCekmece: {...odemeCihazlari.nakitCekmece, otomatikAcilim: e.target.checked}})}
                      className="mr-2"
                    />
                    <span className="text-xs text-gray-700">Otomatik Açılım</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Personel Yönetimi Tab */}
        {activeTab === 'personel' && (
          <div>
            <div className="bg-white rounded p-3 mb-2 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Yeni Personel Ekle</h3>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={yeniPersonel.ad}
                  onChange={(e) => setYeniPersonel({...yeniPersonel, ad: e.target.value})}
                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Personel Adı"
                />
                <button
                  onClick={handlePersonelEkle}
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-1 px-3 rounded text-xs transition-colors"
                >
                  Ekle
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={yeniPersonel.yetkiler.nakitOdeme}
                    onChange={(e) => setYeniPersonel({...yeniPersonel, yetkiler: {...yeniPersonel.yetkiler, nakitOdeme: e.target.checked}})}
                    className="mr-2 w-3 h-3"
                  />
                  <span>Nakit Ödeme</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={yeniPersonel.yetkiler.siparisOlustur}
                    onChange={(e) => setYeniPersonel({...yeniPersonel, yetkiler: {...yeniPersonel.yetkiler, siparisOlustur: e.target.checked}})}
                    className="mr-2 w-3 h-3"
                  />
                  <span>Sipariş Oluştur</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={yeniPersonel.yetkiler.gunSonu}
                    onChange={(e) => setYeniPersonel({...yeniPersonel, yetkiler: {...yeniPersonel.yetkiler, gunSonu: e.target.checked}})}
                    className="mr-2 w-3 h-3"
                  />
                  <span>Gün Sonu</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={yeniPersonel.yetkiler.ayarlar}
                    onChange={(e) => setYeniPersonel({...yeniPersonel, yetkiler: {...yeniPersonel.yetkiler, ayarlar: e.target.checked}})}
                    className="mr-2 w-3 h-3"
                  />
                  <span>Ayarlar</span>
                </label>
              </div>
            </div>

            <div className="bg-white rounded p-3 mb-2 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Personel Listesi</h3>
              <div className="space-y-2">
                {personelListesi.map((personel) => (
                  <div key={personel.id} className="border rounded p-2">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium">{personel.ad}</span>
                      {personel.id !== 1 && (
                        <button
                          onClick={() => handlePersonelSil(personel.id)}
                          className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-2 rounded text-xs transition-colors"
                        >
                          Sil
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={personel.yetkiler.nakitOdeme}
                          onChange={(e) => handleYetkiDegistir(personel.id, 'nakitOdeme', e.target.checked)}
                          className="mr-2 w-3 h-3"
                        />
                        <span>Nakit Ödeme</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={personel.yetkiler.siparisOlustur}
                          onChange={(e) => handleYetkiDegistir(personel.id, 'siparisOlustur', e.target.checked)}
                          className="mr-2 w-3 h-3"
                        />
                        <span>Sipariş Oluştur</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={personel.yetkiler.gunSonu}
                          onChange={(e) => handleYetkiDegistir(personel.id, 'gunSonu', e.target.checked)}
                          className="mr-2 w-3 h-3"
                        />
                        <span>Gün Sonu</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={personel.yetkiler.ayarlar}
                          onChange={(e) => handleYetkiDegistir(personel.id, 'ayarlar', e.target.checked)}
                          className="mr-2 w-3 h-3"
                        />
                        <span>Ayarlar</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Kaydet Butonu */}
        <div className="flex justify-end mt-4">
          <button
            onClick={handleSaveSettings}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded text-xs transition-colors"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
};

export default DealerSettingsPage;