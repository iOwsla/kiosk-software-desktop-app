import os
import sys
import argparse
import json
import datetime  # Tarih/saat işlemleri için
from flask import Flask, request, jsonify
from flask_cors import CORS  # CORS için Flask-CORS eklentisi
import requests
import ssl
import threading # Eklendi
import logging
import traceback
import time
import subprocess
import signal
import os # Eklendi
from concurrent.futures import ThreadPoolExecutor, as_completed
from flask_socketio import SocketIO, emit

# Windows platformu için minimize başlatma kodları
if sys.platform == "win32":
    try:
        import ctypes
        import win32con
        import win32gui
        
        # Minimize etme fonksiyonu
        def minimize_console_window():
            # Mevcut konsol penceresini bul
            hwnd = win32gui.GetForegroundWindow()
            if hwnd:
                # Pencereyi minimize et
                win32gui.ShowWindow(hwnd, win32con.SW_MINIMIZE)
                
        # Minimize başlatma işaretleyicisi
        if getattr(sys, 'frozen', False):  # PyInstaller tarafından paketlenmiş
            # İşletim sistemi için zaman tanı
            time.sleep(0.5)
            # Pencereyi minimize et
            minimize_console_window()
    except ImportError:
        # win32gui veya win32con modülleri yüklü değilse sessizce devam et
        pass

# Colorama için isteğe bağlı import
try:
    from colorama import init, Fore, Style
    colorama_available = True
    init(autoreset=True)  # Renk formatlamasını otomatik sıfırla
except ImportError:
    colorama_available = False

# Tuş kombinasyonlarını algılama için keyboard kütüphanesi
try:
    import keyboard
    keyboard_available = True
except ImportError:
    keyboard_available = False
    print("Tuş kombinasyonlarını kullanmak için 'keyboard' kütüphanesini yükleyin: pip install keyboard")

# Loglama ayarları
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("PavoAPI")

# Flask uygulaması 
app = Flask(__name__)
# CORS ayarları - tüm domainlere izin ver
CORS(app, resources={r"/*": {"origins": "*"}})

# Global değişkenler - bu değerler PyInstaller build sırasında değiştirilecek
config = {
    'ipAddress': 'IP_ADDRESS_PLACEHOLDER',
    'port': 'PORT_PLACEHOLDER',
    'serialNumber': 'SERIAL_NUMBER_PLACEHOLDER',
    'fingerPrint': 'FINGERPRINT_PLACEHOLDER',
    'kioskSerialNumber': 'KIOSK_SERIAL_NUMBER_PLACEHOLDER'
}

# Tarama durumu için global değişkenler
scan_status = {
    'is_scanning': False,
    'progress': 0,
    'total_ips': 0,
    'scanned_ips': 0,
    'active_ports': [],
    'error': None
}

def launch_kiosk_mode():
    """Belirtilen seri numarası ile Chrome'u kiosk modunda başlatır."""
    print_colored("launch_kiosk_mode fonksiyonu çağrıldı.", prefix="[DEBUG]")
    if sys.platform != "win32":
        print_colored("Kiosk modu yalnızca Windows'ta desteklenmektedir.", prefix="[UYARI]")
        logger.warning("Kiosk modu yalnızca Windows'ta desteklenmektedir.")
        return

    kiosk_serial = config.get("kioskSerialNumber")
    kiosk_url_template = config.get("kioskUrlTemplate", "https://kiosk.gafdigi.com/{serial_number}/welcome")
    print_colored(f"launch_kiosk_mode İÇİNDE - Kiosk Seri Numarası (config.get): '{kiosk_serial}'", prefix="[DEBUG]") # Değişiklik
    print_colored(f"launch_kiosk_mode İÇİNDE - Kiosk URL Şablonu: '{kiosk_url_template}'", prefix="[DEBUG]") # Değişiklik

    # Koşulu, sadece kiosk_serial'in boş olup olmadığını kontrol edecek şekilde düzelt
    if not kiosk_serial: # Eğer kiosk_serial None veya boş string ise bu koşul True olur
        print_colored(f"Kiosk seri numarası belirtilmemiş veya boş ('{kiosk_serial}' alındı). Kiosk modu başlatılamıyor.", prefix="[UYARI]")
        logger.warning(f"Kiosk seri numarası belirtilmemiş veya boş ('{kiosk_serial}' alındı). Kiosk modu başlatılamıyor.")
        return

    kiosk_url = kiosk_url_template.format(serial_number=kiosk_serial)
    print_colored(f"Oluşturulan Kiosk URL: '{kiosk_url}'", prefix="[DEBUG]")

    chrome_paths_to_check = [
        os.path.join(os.environ.get("ProgramFiles", "C:\\Program Files"), "Google\\Chrome\\Application\\chrome.exe"),
        os.path.join(os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)"), "Google\\Chrome\\Application\\chrome.exe")
    ]
    print_colored(f"Aranacak Chrome yolları: {chrome_paths_to_check}", prefix="[DEBUG]")
    
    chrome_exe = None
    for path in chrome_paths_to_check:
        print_colored(f"Chrome yolu kontrol ediliyor: '{path}'", prefix="[DEBUG]")
        if os.path.exists(path):
            chrome_exe = path
            print_colored(f"Chrome bulundu: '{chrome_exe}'", prefix="[DEBUG]")
            logger.info(f"Chrome bulundu: {chrome_exe}")
            break
            
    if not chrome_exe:
        print_colored("HATA: Google Chrome yürütülebilir dosyası bulunamadı. Kiosk modu başlatılamıyor.", prefix="[HATA]")
        logger.error(f"Google Chrome yürütülebilir dosyası bulunamadı. Aranan yollar: {chrome_paths_to_check}")
        return

    command = [
        chrome_exe,
        "--kiosk",
        "--start-fullscreen",
        kiosk_url,
        "--disable-pinch",
        "--overscroll-history-navigation=0"
    ]
    print_colored(f"Chrome başlatma komutu: {command}", prefix="[DEBUG]")
    logger.info(f"Chrome başlatma komutu: {' '.join(command)}")

    try:
        print_colored(f"Chrome kiosk modunda başlatılıyor: {kiosk_url}", prefix="[BILGI]")
        process = subprocess.Popen(command)
        print_colored(f"Chrome kiosk modu başlatma komutu gönderildi (PID: {process.pid}).", prefix="[BAŞARI]")
        logger.info(f"Chrome kiosk modu başlatma komutu gönderildi (PID: {process.pid}). URL: {kiosk_url}")
    except FileNotFoundError:
        print_colored(f"HATA: Chrome yürütülebilir dosyası '{chrome_exe}' bulunamadı veya çalıştırılamadı.", prefix="[HATA]")
        logger.error(f"Chrome yürütülebilir dosyası '{chrome_exe}' bulunamadı (FileNotFoundError). Komut: {' '.join(command)}")
    except PermissionError:
        print_colored(f"HATA: Chrome'u çalıştırma izni yok: '{chrome_exe}'.", prefix="[HATA]")
        logger.error(f"Chrome'u çalıştırma izni yok: '{chrome_exe}' (PermissionError). Komut: {' '.join(command)}")
    except Exception as e:
        print_colored(f"Chrome kiosk modu başlatılırken beklenmedik bir hata oluştu: {str(e)}", prefix="[HATA]")
        logger.error(f"Chrome kiosk modu başlatılırken beklenmedik bir hata oluştu: {str(e)}. Komut: {' '.join(command)}", exc_info=True)

def print_colored(text, color=None, style=None, prefix=None):
    """Renkli çıktı sağlar"""
    if not colorama_available:
        if prefix:
            print(f"{prefix} {text}")
        else:
            print(text)
        return
        
    prefix_color = ""
    if prefix == "[BILGI]":
        prefix_color = Fore.BLUE + Style.BRIGHT
    elif prefix == "[BAŞARI]":
        prefix_color = Fore.GREEN + Style.BRIGHT
    elif prefix == "[HATA]":
        prefix_color = Fore.RED + Style.BRIGHT
    elif prefix == "[UYARI]":
        prefix_color = Fore.YELLOW + Style.BRIGHT
    
    text_color = color if color else ""
    text_style = style if style else ""
    
    if prefix:
        print(f"{prefix_color}{prefix} {text_color}{text_style}{text}")
    else:
        print(f"{text_color}{text_style}{text}")

def make_request(protocol, method, endpoint, meta_data):
    """PavoPay API'sine istek gönderir"""
    try:
        base_url = f"{protocol}://{config['ipAddress']}:{config['port']}"
        url = f"{base_url}/{endpoint}"
        
        # TransactionHandle oluştur - TransactionDate'i doğrudan şu anki tarih olarak ayarla
        transaction_handle = {
            "SerialNumber": config["serialNumber"],
            "TransactionDate": datetime.datetime.now().isoformat(),  # Şu anki zaman, ISO formatında
            "TransactionSequence": 1454 if endpoint != "Pairing" else 1453,
            "Fingerprint": config["fingerPrint"]
        }
        
        # Tüm payload'u oluştur
        payload = {
            "TransactionHandle": transaction_handle
        }
        
        # Meta verileri direkt olarak payload'a ekle
        for key, value in meta_data.items():
            payload[key] = value
        
        logger.info(f"İstek gönderiliyor: {url}")
        logger.debug(f"Payload: {json.dumps(payload, indent=2)}")
        
        if colorama_available:
            print(Fore.CYAN + f"➤ İstek: {method.upper()} {url}")
        
        verify = False if protocol == "https" else None
        
        if method.lower() == "post":
            response = requests.post(url, json=payload, verify=verify, timeout=100)
        else:
            response = requests.get(url, json=payload, verify=verify, timeout=100)
        
        logger.info(f"Yanıt alındı: {response.status_code}")
        logger.debug(f"Yanıt: {json.dumps(response.json(), indent=2)}")
        
        if colorama_available:
            if response.status_code >= 200 and response.status_code < 300:
                print(Fore.GREEN + f"✓ Yanıt: {response.status_code}")
            else:
                print(Fore.RED + f"✗ Yanıt: {response.status_code}")
        
        return {
            "success": not response.json().get("HasError", False),
            "data": response.json(),
            "error": None,
            "meta": {}
        }
    except requests.exceptions.ConnectionError as e:
        error_msg = f"Bağlantı hatası: {config['ipAddress']}:{config['port']} adresine bağlanılamadı. Cihazın açık ve ağa bağlı olduğundan emin olun."
        logger.error(error_msg)
        logger.error(str(e))
        if colorama_available:
            print(Fore.RED + f"✗ {error_msg}")
        return {
            "success": False,
            "data": None,
            "error": error_msg,
            "meta": {}
        }
    except requests.exceptions.Timeout as e:
        error_msg = "İstek zaman aşımına uğradı. Cihazın yanıt verme süresi çok uzun."
        logger.error(error_msg)
        logger.error(str(e))
        if colorama_available:
            print(Fore.RED + f"✗ {error_msg}")
        return {
            "success": False,
            "data": None,
            "error": error_msg,
            "meta": {}
        }
    except Exception as e:
        error_msg = f"İstek hatası: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        if colorama_available:
            print(Fore.RED + f"✗ {error_msg}")
        return {
            "success": False,
            "data": None,
            "error": error_msg,
            "meta": {}
        }

def check_port(ip, port):
    """Belirtilen IP ve portun açık olup olmadığını kontrol eder"""
    try:
        import socket
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)  # 2 saniye timeout
        result = sock.connect_ex((ip, int(port)))
        sock.close()
        return result == 0
    except Exception as e:
        logger.error(f"Port kontrolü sırasında hata: {str(e)}")
        return False

@app.route('/api/v1/pavo', methods=['POST'])
def pavo_endpoint():
    """Ana API endpoint'i"""
    try:
        data = request.json
        logger.info(f"Gelen istek: {json.dumps(data, indent=2)}")
        
        if colorama_available:
            print(Fore.YELLOW + "➤ Yeni API isteği alındı")
        
        # İstek doğrulama
        required_fields = ["protocol", "method", "endPoint", "meta"]
        for field in required_fields:
            if field not in data:
                error_msg = f"Eksik alan: {field}"
                logger.error(error_msg)
                if colorama_available:
                    print(Fore.RED + f"✗ {error_msg}")
                return jsonify({
                    "success": False,
                    "data": None,
                    "error": error_msg,
                    "meta": {}
                }), 400
        
        # Port kontrolü
        if not check_port(config['ipAddress'], 4567):
            error_msg = f"Pavo cihazına bağlanılamıyor: {config['ipAddress']}:4567 portu kapalı veya erişilemez."
            logger.error(error_msg)
            if colorama_available:
                print(Fore.RED + f"✗ {error_msg}")
            return jsonify({
                "success": False,
                "data": None,
                "error": error_msg,
                "meta": {}
            }), 503
        
        # Bilgisayarı kapatma komutu kontrolü
        if data["endPoint"] == "SystemControl" and data["meta"].get("action") == "shutdown":
            # Bilgisayarı kapatma isteği geldi
            logger.warning("Bilgisayarı kapatma komutu alındı!")
            
            if colorama_available:
                print(Fore.RED + "⚠ Bilgisayarı kapatma komutu alındı!")
                
            # İşlemi başlat ama önce yanıt döndür
            def shutdown_computer():
                time.sleep(3)  # 3 saniye bekle ve bilgisayarı kapat
                if sys.platform == "win32":
                    os.system("shutdown /s /t 5 /c \"PavoPay API üzerinden kapatma komutu alındı\"")
                else:
                    os.system("sudo shutdown -h now")
                    
            shutdown_thread = Thread(target=shutdown_computer)
            shutdown_thread.daemon = True
            shutdown_thread.start()
            
            return jsonify({
                "success": True,
                "data": {"message": "Bilgisayar kapatma komutu alındı. 5 saniye içinde kapanacak."},
                "error": None,
                "meta": {}
            })
        
        # İstek gönderme
        result = make_request(
            data["protocol"],
            data["method"],
            data["endPoint"],
            data["meta"]
        )
        
        return jsonify(result)
    except Exception as e:
        error_msg = f"Genel hata: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        if colorama_available:
            print(Fore.RED + f"✗ {error_msg}")
        return jsonify({
            "success": False,
            "data": None,
            "error": error_msg,
            "meta": {}
        }), 500

def scan_network_for_pavo():
    """Yerel ağdaki 4567 portunu dinleyen tüm cihazları tarar"""
    try:
        import socket
        import ipaddress
        import netifaces
        
        # Aktif ağ arayüzlerini bul
        interfaces = netifaces.interfaces()
        active_ips = []
        
        for interface in interfaces:
            try:
                addrs = netifaces.ifaddresses(interface)
                if netifaces.AF_INET in addrs:
                    for addr in addrs[netifaces.AF_INET]:
                        if 'addr' in addr and 'netmask' in addr:
                            active_ips.append((addr['addr'], addr['netmask']))
            except Exception as e:
                logger.error(f"Ağ arayüzü {interface} kontrol edilirken hata: {str(e)}")
                continue
        
        if not active_ips:
            return []
            
        # IP adreslerini oluştur
        all_ips = []
        for ip, netmask in active_ips:
            try:
                network = ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)
                all_ips.extend([str(ip) for ip in network.hosts()])
            except Exception as e:
                logger.error(f"IP ağı oluşturulurken hata: {str(e)}")
                continue
        
        # 4567 portunu kontrol et
        pavo_devices = []
        for ip in all_ips:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.1)  # 100ms timeout
                result = sock.connect_ex((ip, 4567))
                if result == 0:
                    pavo_devices.append(ip)
                sock.close()
            except Exception:
                continue
                
        return pavo_devices
    except Exception as e:
        logger.error(f"Ağ taraması sırasında hata: {str(e)}")
        return []

@app.route('/', methods=['GET'])
def index():
    """Test sayfası"""
    # Sadece mevcut IP'yi kontrol et
    port_status = check_port(config['ipAddress'], 4567)
    port_status_text = "AÇIK" if port_status else "KAPALI"
    port_status_color = "#00cc44" if port_status else "#cc0000"
    
    return f"""
    <html>
        <head>
            <title>PavoPay API Sunucusu</title>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: #f5f5f5;
                    color: #333;
                }}
                .container {{
                    max-width: 800px;
                    margin: 0 auto;
                    background-color: white;
                    padding: 20px;
                    border-radius: 5px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }}
                h1 {{
                    color: #0066cc;
                    border-bottom: 2px solid #0066cc;
                    padding-bottom: 10px;
                }}
                ul {{
                    background-color: #f0f8ff;
                    padding: 15px 15px 15px 30px;
                    border-radius: 5px;
                }}
                li {{
                    margin-bottom: 8px;
                }}
                .endpoint {{
                    background-color: #e7f3ff;
                    padding: 15px;
                    border-left: 4px solid #0066cc;
                    margin-top: 20px;
                    font-family: monospace;
                }}
                .cors-info {{
                    background-color: #e6ffe6;
                    padding: 15px;
                    border-left: 4px solid #00cc44;
                    margin-top: 20px;
                }}
                .port-status {{
                    background-color: #fff;
                    padding: 15px;
                    border-left: 4px solid {port_status_color};
                    margin-top: 20px;
                    font-family: monospace;
                }}
                .scan-link {{
                    background-color: #fff3e6;
                    padding: 15px;
                    border-left: 4px solid #ff9900;
                    margin-top: 20px;
                }}
                .footer {{
                    margin-top: 30px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <h1>PavoPay API Sunucusu Çalışıyor</h1>
                <p>API sunucusu başarıyla çalışıyor. Aşağıdaki yapılandırma bilgileriyle PavoPay cihazına bağlanabilirsiniz:</p>
                <ul>
                    <li><strong>IP Adresi:</strong> {config['ipAddress']}</li>
                    <li><strong>Port:</strong> {config['port']}</li>
                    <li><strong>Seri No:</strong> {config['serialNumber']}</li>
                    <li><strong>Parmak İzi:</strong> {config['fingerPrint']}</li>
                </ul>
                
                <div class="port-status">
                    <p><strong>Pavo Cihazı Durumu:</strong></p>
                    <p>Port 4567: <span style="color: {port_status_color}; font-weight: bold;">{port_status_text}</span></p>
                    <p><small>Son kontrol: {datetime.datetime.now().strftime('%d.%m.%Y %H:%M:%S')}</small></p>
                </div>
                
                <div class="scan-link">
                    <p><strong>Ağ Taraması:</strong></p>
                    <p>Tüm ağdaki Pavo cihazlarını taramak için <a href="/scan" target="_blank">buraya tıklayın</a>.</p>
                    <p><small>Not: Tarama işlemi biraz zaman alabilir.</small></p>
                </div>
                
                <div class="endpoint">
                    <p><strong>API Endpoint:</strong> <code>http://localhost:8100/api/v1/pavo</code></p>
                    <p><strong>Metod:</strong> POST</p>
                </div>
                
                <div class="cors-info">
                    <p><strong>CORS:</strong> Tüm domainlerden gelen isteklere izin verilmektedir.</p>
                    <p>Herhangi bir web uygulamasından bu API'ye doğrudan istek gönderebilirsiniz.</p>
                </div>
                
                <div class="footer">
                    PavoPay API Sunucusu © {os.path.basename(sys.executable) if getattr(sys, 'frozen', False) else "Geliştirme Modu"}
                </div>
            </div>
        </body>
    </html>
    """

def parse_arguments():
    """Komut satırı argümanlarını işler"""
    parser = argparse.ArgumentParser(description='PavoPay API Sunucusu')
    parser.add_argument('--ipAddress', type=str, help='PavoPay cihazının IP adresi')
    parser.add_argument('--port', type=str, help='PavoPay cihazının port numarası')
    parser.add_argument('--serialNumber', type=str, help='PavoPay cihazının seri numarası')
    parser.add_argument('--fingerprint', type=str, help='PavoPay cihazının parmak izi')
    parser.add_argument('--outputName', type=str, help='Çıktı dosyasının adı')
    
    return parser.parse_args()

def update_config():
    """Komut satırı argümanlarından yapılandırmayı günceller"""
    args = parse_arguments()
    
    # Argümanları kontrol et ve global config'i güncelle
    if args.ipAddress:
        config["ipAddress"] = args.ipAddress
    if args.port:
        config["port"] = args.port
    if args.serialNumber:
        config["serialNumber"] = args.serialNumber
    if args.fingerprint:
        config["fingerPrint"] = args.fingerprint
    
    return args.outputName if args.outputName else "PavoAPI"

def get_local_network():
    """Mevcut ağ arayüzünü tespit eder"""
    try:
        import socket
        
        # Mevcut IP adresini bul
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        
        print(f"➤ Mevcut IP: {local_ip}")
        
        # IP'den ağ adresini çıkar (örn: 192.168.1.100 -> 192.168.1)
        if local_ip.startswith('192.168.'):
            network_base = '.'.join(local_ip.split('.')[:3])
            return network_base
        else:
            # Varsayılan olarak 192.168.1 kullan
            return "192.168.1"
            
    except Exception as e:
        print(f"✗ Ağ tespit hatası: {str(e)}")
        return "192.168.1"  # Varsayılan

def find_active_ips():
    """Sadece mevcut ağdaki aktif IP'leri bulur"""
    try:
        import subprocess
        import platform
        from concurrent.futures import ThreadPoolExecutor, as_completed
        
        global scan_status
        scan_status['progress'] = 5
        
        active_ips = []
        
        # Mevcut ağı tespit et
        network_base = get_local_network()
        print(f"➤ Ağ taranıyor: {network_base}.x")
        
        # Windows için ping komutu (hızlı)
        ping_cmd = "ping -n 1 -w 300" if platform.system().lower() == "windows" else "ping -c 1 -W 1"
        
        def ping_ip(ip):
            try:
                result = subprocess.run(
                    f"{ping_cmd} {ip}".split(),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=1
                )
                return ip if result.returncode == 0 else None
            except:
                return None
        
        # Sadece mevcut ağdaki IP'leri kontrol et (254 IP)
        ip_ranges = []
        for host in range(1, 255):
            ip_ranges.append(f"{network_base}.{host}")
        
        scan_status['total_ips'] = len(ip_ranges)
        scan_status['progress'] = 10
        
        print(f"➤ {len(ip_ranges)} IP adresi kontrol edilecek...")
        
        # Hızlı paralel ping işlemi
        scanned_count = 0
        with ThreadPoolExecutor(max_workers=100) as executor:
            future_to_ip = {executor.submit(ping_ip, ip): ip for ip in ip_ranges}
            
            for future in as_completed(future_to_ip):
                scanned_count += 1
                scan_status['scanned_ips'] = scanned_count
                scan_status['progress'] = 10 + (scanned_count / len(ip_ranges)) * 40  # %10-50 arası
                
                result = future.result()
                if result:
                    active_ips.append(result)
                    print(f"✓ Aktif IP bulundu: {result}")
        
        print(f"➤ Toplam {len(active_ips)} aktif IP bulundu")
        return active_ips
        
    except Exception as e:
        print(f"✗ Aktif IP arama hatası: {str(e)}")
        return []

def check_ports_on_active_ips(active_ips):
    """Aktif IP'lerde 4567 portunu hızlıca kontrol eder"""
    try:
        import socket
        from concurrent.futures import ThreadPoolExecutor
        
        global scan_status
        scan_status['progress'] = 50
        
        print(f"➤ {len(active_ips)} aktif IP'de port 4567 kontrol ediliyor...")
        
        def check_port_fast(ip):
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.3)  # Çok hızlı timeout
                result = sock.connect_ex((ip, 4567))
                sock.close()
                
                if result == 0:
                    scan_status['active_ports'].append(ip)
                    print(f"✓ Port AÇIK: {ip}:4567")
                    return ip
                return None
            except:
                return None
        
        # Hızlı port kontrolü
        scanned_count = 0
        with ThreadPoolExecutor(max_workers=50) as executor:
            for result in executor.map(check_port_fast, active_ips):
                scanned_count += 1
                scan_status['progress'] = 50 + (scanned_count / len(active_ips)) * 45  # %50-95 arası
                
        scan_status['progress'] = 100
        return scan_status['active_ports']
        
    except Exception as e:
        print(f"✗ Port kontrol hatası: {str(e)}")
        return []

def manual_port_check(ip, port=4567):
    """Manual port kontrolü - debug için"""
    try:
        import socket
        print(f"➤ Manual kontrol: {ip}:{port}")
        
        # Hızlı ping testi
        import subprocess
        import platform
        ping_cmd = "ping -n 1 -w 300" if platform.system().lower() == "windows" else "ping -c 1 -W 1"
        result = subprocess.run(
            f"{ping_cmd} {ip}".split(),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=1
        )
        
        if result.returncode == 0:
            print(f"  ✓ Ping başarılı: {ip}")
        else:
            print(f"  ✗ Ping başarısız: {ip}")
            
        # Hızlı port testi
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)  # 1 saniye yeterli
        port_result = sock.connect_ex((ip, port))
        sock.close()
        
        if port_result == 0:
            print(f"  ✓ Port açık: {ip}:{port}")
            return True
        else:
            print(f"  ✗ Port kapalı: {ip}:{port} (hata kodu: {port_result})")
            return False
            
    except Exception as e:
        print(f"  ✗ Manual kontrol hatası: {str(e)}")
        return False

# Debug endpoint'i ekle
@app.route('/debug_port/<ip>')
def debug_port(ip):
    """Belirli bir IP'nin port durumunu detaylı kontrol eder"""
    try:
        result = manual_port_check(ip)
        return jsonify({
            "ip": ip,
            "port": 4567,
            "is_open": result,
            "timestamp": datetime.datetime.now().strftime('%H:%M:%S')
        })
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

def scan_all_ips():
    """İki aşamalı tarama: önce aktif IP'leri bul, sonra port kontrol et"""
    try:
        global scan_status
        scan_status['is_scanning'] = True
        scan_status['progress'] = 0
        scan_status['total_ips'] = 0
        scan_status['scanned_ips'] = 0
        scan_status['active_ports'] = []
        scan_status['error'] = None
        
        print("➤ İki aşamalı tarama başlatılıyor...")
        print("  1. Aşama: Aktif IP'leri bul")
        print("  2. Aşama: Port kontrolü yap")
        
        # 1. Aşama: Aktif IP'leri bul
        active_ips = find_active_ips()
        
        if not active_ips:
            print("✗ Hiç aktif IP bulunamadı")
            scan_status['is_scanning'] = False
            return []
        
        # 2. Aşama: Port kontrolü
        open_ports = check_ports_on_active_ips(active_ips)
        
        scan_status['is_scanning'] = False
        scan_status['progress'] = 100
        
        print(f"✓ Tarama tamamlandı!")
        print(f"  • Kontrol edilen aktif IP: {len(active_ips)}")
        print(f"  • Açık port bulunan IP: {len(open_ports)}")
        
        return open_ports
        
    except Exception as e:
        error_msg = f"Tarama sırasında hata: {str(e)}"
        print(f"✗ {error_msg}")
        logger.error(error_msg)
        scan_status['error'] = error_msg
        scan_status['is_scanning'] = False
        return []

@app.route('/scan', methods=['GET'])
def scan_endpoint():
    """Tarama sayfasını gösterir"""
    return """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Pavo Port Tarayıcı</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                background-color: white;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .status-box {
                background-color: #f8f9fa;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
            }
            .progress-bar {
                width: 100%;
                height: 20px;
                background-color: #e9ecef;
                border-radius: 10px;
                overflow: hidden;
                margin: 10px 0;
            }
            .progress {
                width: 0%;
                height: 100%;
                background-color: #007bff;
                transition: width 0.3s ease;
            }
            .port-list {
                background-color: #fff;
                padding: 15px;
                border-radius: 5px;
                border: 1px solid #dee2e6;
                max-height: 300px;
                overflow-y: auto;
            }
            .port-item {
                padding: 8px;
                border-bottom: 1px solid #dee2e6;
            }
            .port-item:last-child {
                border-bottom: none;
            }
            .status {
                font-weight: bold;
                margin-bottom: 10px;
            }
            .error {
                color: #dc3545;
                padding: 10px;
                background-color: #f8d7da;
                border-radius: 5px;
                margin-top: 10px;
            }
            .success {
                color: #28a745;
            }
            .info {
                color: #17a2b8;
            }
            .scan-button {
                background-color: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            }
            .scan-button:disabled {
                background-color: #6c757d;
                cursor: not-allowed;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Pavo Port Tarayıcı</h1>
            <div class="status-box">
                <div class="status" id="status">Hazır</div>
                <div class="progress-bar">
                    <div class="progress" id="progress"></div>
                </div>
                <div id="progress-text">0% (0/0)</div>
            </div>
            <button class="scan-button" id="scanButton" onclick="startScan()">Taramayı Başlat</button>
            <div class="port-list" id="portList">
                <div class="port-item">Henüz tarama yapılmadı...</div>
            </div>
        </div>

        <script>
            const scanButton = document.getElementById('scanButton');
            const statusDiv = document.getElementById('status');
            const progressBar = document.getElementById('progress');
            const progressText = document.getElementById('progress-text');
            const portList = document.getElementById('portList');
            let isScanning = false;
            let updateInterval;

            function startScan() {
                if (isScanning) return;
                
                isScanning = true;
                scanButton.disabled = true;
                statusDiv.textContent = 'Tarama başlatılıyor...';
                statusDiv.className = 'status info';
                portList.innerHTML = '';
                progressBar.style.width = '0%';
                progressText.textContent = '0% (0/0)';
                
                fetch('/start_scan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        throw new Error(data.error);
                    }
                    // Tarama durumunu periyodik olarak güncelle
                    updateInterval = setInterval(updateScanStatus, 1000);
                })
                .catch(error => {
                    statusDiv.textContent = 'Hata: ' + error.message;
                    statusDiv.className = 'status error';
                    scanButton.disabled = false;
                    isScanning = false;
                });
            }

            function updateScanStatus() {
                fetch('/scan_status')
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            throw new Error(data.error);
                        }

                        // İlerleme çubuğunu güncelle
                        progressBar.style.width = data.progress + '%';
                        progressText.textContent = `${data.progress.toFixed(1)}% (${data.scanned_ips}/${data.total_ips})`;

                        // Port listesini güncelle
                        if (data.active_ports.length > 0) {
                            portList.innerHTML = data.active_ports.map(ip => 
                                `<div class="port-item">✓ Port açık: ${ip}:4567</div>`
                            ).join('');
                        }

                        // Tarama tamamlandıysa
                        if (!data.is_scanning) {
                            clearInterval(updateInterval);
                            statusDiv.textContent = `Tarama tamamlandı! ${data.active_ports.length} adet açık port bulundu.`;
                            statusDiv.className = 'status success';
                            scanButton.disabled = false;
                            isScanning = false;
                        }
                    })
                    .catch(error => {
                        clearInterval(updateInterval);
                        statusDiv.textContent = 'Hata: ' + error.message;
                        statusDiv.className = 'status error';
                        scanButton.disabled = false;
                        isScanning = false;
                    });
            }
        </script>
    </body>
    </html>
    """

@app.route('/start_scan', methods=['POST'])
def start_scan():
    """Tarama işlemini başlatır"""
    try:
        # Eğer zaten tarama yapılıyorsa hata döndür
        if scan_status['is_scanning']:
            return jsonify({
                "success": False,
                "error": "Tarama zaten devam ediyor"
            }), 400

        # Tarama işlemini arka planda başlat
        def run_scan():
            scan_all_ips()
        
        import threading
        thread = threading.Thread(target=run_scan)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "success": True,
            "message": "Tarama başlatıldı"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/scan_status', methods=['GET'])
def get_scan_status():
    """Tarama durumunu döndürür"""
    try:
        return jsonify({
            "is_scanning": scan_status['is_scanning'],
            "progress": scan_status['progress'],
            "total_ips": scan_status['total_ips'],
            "scanned_ips": scan_status['scanned_ips'],
            "active_ports": scan_status['active_ports'],
            "error": scan_status['error']
        })
    except Exception as e:
        return jsonify({
            "error": str(e)
        }), 500

def run_server():
    """API sunucusunu çalıştırır"""
    try:
        # Sunucuyu başlat
        logger.info(f"PavoPay API Sunucusu başlatılıyor: http://localhost:8100")
        logger.info(f"Yapılandırma: {json.dumps(config, indent=2)}")
        
        # ASCII art banner
        if colorama_available:
            print(Fore.CYAN + Style.BRIGHT + """
┌─────────────────────────────────────────┐
│            PavoPay API Sunucu           │
└─────────────────────────────────────────┘
            """)
            
            print(Fore.GREEN + "✓ PavoPay API Sunucusu başlatılıyor...")
            print(Fore.YELLOW + "➤ Yapılandırma:")
            print(Fore.WHITE + f"  • IP Adresi:   {config['ipAddress']}")
            print(Fore.WHITE + f"  • Port:        {config['port']}")
            print(Fore.WHITE + f"  • Seri No:     {config['serialNumber']}")
            print(Fore.WHITE + f"  • Parmak İzi:  {config['fingerPrint']}")
            print(Fore.GREEN + "✓ CORS: Tüm domainlerden gelen isteklere izin veriliyor")
            print(Fore.CYAN + "➤ Tarayıcınızda http://localhost:8100 adresini açarak sunucunun çalıştığını doğrulayabilirsiniz.")
            print(Fore.CYAN + "➤ Port tarayıcı: http://localhost:8100/scan")
            print(Fore.CYAN + "➤ API endpoint: http://localhost:8100/api/v1/pavo")
            print(Fore.RED + "➤ Kapatmak için Ctrl+C tuşlarına basın.")
            print(Fore.YELLOW + "=" * 50)
        else:
            print("PavoPay API Sunucusu başlatılıyor...")
            print(f"Yapılandırma: IP={config['ipAddress']}, Port={config['port']}, SN={config['serialNumber']}")
            print("CORS: Tüm domainlerden gelen isteklere izin veriliyor")
            print("Tarayıcınızda http://localhost:8100 adresini açarak sunucunun çalıştığını doğrulayabilirsiniz.")
            print("Port tarayıcı: http://localhost:8100/scan")
            print("API endpoint: http://localhost:8100/api/v1/pavo")
            print("API çalışıyor... (Kapatmak için Ctrl+C)")
        
        app.run(host='0.0.0.0', port=8100, debug=False, threaded=True)
    except Exception as e:
        error_msg = f"Sunucu başlatılırken hata oluştu: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        
        if colorama_available:
            print(Fore.RED + f"✗ {error_msg}")
        else:
            print(error_msg)
            
        print("Detaylar için pavo_api.log dosyasını kontrol edin.")
        print("Uygulama 5 saniye içinde yeniden başlatılacak...")
        time.sleep(5)
        raise  # Yeniden başlatma mekanizması için hatayı yukarı taşı

def restart_program():
    """Uygulamayı yeniden başlatır"""
    try:
        if getattr(sys, 'frozen', False):
            # PyInstaller ile paketlenmiş uygulama
            app_path = sys.executable
            logger.info(f"Uygulama yeniden başlatılıyor: {app_path}")
            
            if colorama_available:
                print(Fore.YELLOW + "➤ Uygulama yeniden başlatılıyor...")
            else:
                print("Uygulama yeniden başlatılıyor...")
                
            # Mevcut process'i kapatmadan önce yeni process'i başlat
            if sys.platform == "win32":
                subprocess.Popen([app_path] + sys.argv[1:], creationflags=subprocess.CREATE_NEW_CONSOLE)
            else:
                subprocess.Popen([app_path] + sys.argv[1:])
                
            # Çıkış yap - yeni process devam edecek
            sys.exit(0)
        else:
            # Geliştirme modunda script'i tekrar çalıştır
            logger.info("Python script yeniden başlatılıyor")
            
            if colorama_available:
                print(Fore.YELLOW + "➤ Script yeniden başlatılıyor...")
            else:
                print("Script yeniden başlatılıyor...")
                
            python = sys.executable
            os.execl(python, python, *sys.argv)
    except Exception as e:
        logger.error(f"Yeniden başlatma hatası: {str(e)}")
        logger.error(traceback.format_exc())
        if colorama_available:
            print(Fore.RED + f"✗ Yeniden başlatma hatası: {str(e)}")
        else:
            print(f"Yeniden başlatma hatası: {str(e)}")

def register_hotkeys():
    """Tuş kombinasyonlarını kaydet"""
    if not keyboard_available:
        logger.warning("Keyboard kütüphanesi yüklü değil. Tuş kombinasyonları kullanılamayacak.")
        return
    
    try:
        # Ctrl+Alt+K kombinasyonu ile uygulamayı tamamen kapat
        keyboard.add_hotkey('ctrl+alt+k', force_exit, suppress=True)
        
        if colorama_available:
            print(Fore.CYAN + "➤ Tuş kombinasyonları aktif:")
            print(Fore.WHITE + "  • Ctrl+Alt+K: Uygulamayı tamamen kapat")
        else:
            print("Tuş kombinasyonları aktif:")
            print("  • Ctrl+Alt+K: Uygulamayı tamamen kapat")
            
        logger.info("Tuş kombinasyonları kaydedildi")
    except Exception as e:
        logger.error(f"Tuş kombinasyonları kaydedilirken hata: {str(e)}")
        if colorama_available:
            print(Fore.RED + f"✗ Tuş kombinasyonları kaydedilirken hata: {str(e)}")

def force_exit():
    """Uygulamayı tamamen kapat (tüm alt süreçler dahil)"""
    try:
        logger.info("Ctrl+Alt+K tuş kombinasyonu ile kapatma isteği alındı")
        
        if colorama_available:
            print(Fore.YELLOW + "➤ Ctrl+Alt+K tuş kombinasyonu algılandı")
            print(Fore.YELLOW + "➤ PavoPay API kapatılıyor...")
        else:
            print("Ctrl+Alt+K tuş kombinasyonu algılandı")
            print("PavoPay API kapatılıyor...")
        
        # Kendimizle aynı process group ID'sine sahip tüm process'leri sonlandır
        if sys.platform == "win32":
            # Windows için
            current_pid = os.getpid()
            subprocess.call(['taskkill', '/F', '/T', '/PID', str(current_pid)])
        else:
            # Linux/Unix için
            os.killpg(os.getpgid(0), signal.SIGTERM)
            
        # Ek güvenlik olarak doğrudan çıkış yap
        os._exit(0)
    except Exception as e:
        logger.error(f"Kapatma hatası: {str(e)}")
        os._exit(1)  # Zorla çık

if __name__ == "__main__":
    try:
        if colorama_available:
            print(Fore.CYAN + Style.BRIGHT + "PavoPay API başlatılıyor...")
        else:
            print("PavoPay API başlatılıyor...")
        
        # Komut satırı argümanlarından yapılandırmayı güncelle
        output_name = update_config()
        
        # Kiosk modunu 2 saniye sonra başlat
        def delayed_kiosk_launch():
            time.sleep(2)
            # launch_kiosk_mode çağrılmadan hemen önce config'i logla
            print_colored(f"delayed_kiosk_launch İÇİNDE - Güncel config: {json.dumps(config, indent=2)}", prefix="[DEBUG]")
            logger.info(f"delayed_kiosk_launch İÇİNDE - Güncel config: {json.dumps(config, indent=2)}")
            launch_kiosk_mode()

        kiosk_thread = threading.Thread(target=delayed_kiosk_launch)
        kiosk_thread.daemon = True
        kiosk_thread.start()
        
        # Tuş kombinasyonlarını kaydet
        register_hotkeys()
        
        # API sunucusunu çalıştır
        while True:  # Sürekli yeniden başlatma döngüsü
            try:
                run_server()
            except KeyboardInterrupt:
                # Kullanıcı tarafından durdurma - döngüden çık
                if colorama_available:
                    print(Fore.YELLOW + "\n➤ Sunucu kullanıcı tarafından durduruldu.")
                else:
                    print("\nSunucu kullanıcı tarafından durduruldu.")
                break
            except Exception as e:
                # Genel hata - günlüğe kaydet ve yeniden başlat
                error_msg = f"Ana uygulama hatası: {str(e)}"
                logger.error(error_msg)
                logger.error(traceback.format_exc())
                
                if colorama_available:
                    print(Fore.RED + f"✗ {error_msg}")
                    print(Fore.YELLOW + "➤ Uygulama 5 saniye içinde yeniden başlatılacak...")
                else:
                    print(f"Hata oluştu: {str(e)}")
                    print("Uygulama 5 saniye içinde yeniden başlatılacak...")
                
                print("Detaylar için pavo_api.log dosyasını kontrol edin.")
                time.sleep(5)  # 5 saniye bekle
                # Döngü devam edecek ve yeniden başlatacak
    except Exception as e:
        # Kritik hata - yeniden başlatma mekanizması başarısız olursa
        error_msg = f"Kritik hata: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        
        if colorama_available:
            print(Fore.RED + f"✗ {error_msg}")
        else:
            print(f"Kritik hata: {str(e)}")
            
        print("Detaylar için pavo_api.log dosyasını kontrol edin.")
        input("Devam etmek için bir tuşa basın...")
