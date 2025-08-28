import axios from 'axios';

/**
 * İnternet bağlantısını kontrol eder
 * @param timeout - Timeout süresi (ms), varsayılan 5000ms
 * @returns Promise<boolean> - İnternet bağlantısı varsa true, yoksa false
 */
export async function checkInternetConnection(timeout: number = 5000): Promise<boolean> {
  try {
    // Google DNS'e ping atarak internet bağlantısını kontrol et
    const response = await axios.get('https://8.8.8.8', {
      timeout,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    return response.status === 200;
  } catch (error) {
    // Alternatif olarak başka bir endpoint dene
    try {
      const response = await axios.get('https://www.google.com', {
        timeout: timeout / 2,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      return response.status === 200;
    } catch (secondError: any) {
      console.log('İnternet bağlantısı yok:', secondError.message);
      return false;
    }
  }
}

/**
 * Basit internet bağlantısı kontrolü (daha hızlı)
 * @returns Promise<boolean>
 */
export async function quickInternetCheck(): Promise<boolean> {
  try {
    const response = await axios.head('https://www.google.com', {
      timeout: 3000
    });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}