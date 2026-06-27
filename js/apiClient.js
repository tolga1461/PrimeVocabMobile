/**
 * PrimeVocab - API İstemcisi (apiClient.js)
 * Hem background.js (Service Worker) hem de sidepanel (panel_settings.js vb.) içinden çağrılabilir.
 */

// Varsayılan Yapılandırma (Build veya Ayarlar panelinden ezilebilir)
var PV_CONFIG = {
  // Canlı GAS Web App URL'nizi buraya yerleştirin
  apiUrl: "https://script.google.com/macros/s/AKfycbzyn6Fhxvu57IWwHR5FG-H4_OPCBdQ6APwZvQe669u9pdSkla6Wa-A2DdUyXLkv7axlAw/exec", 
  // Sunucu tarafındaki API_SECRET ile birebir eşleşmelidir
  apiSecret: "PV_SECRET_SECURE_TOKEN_2026" 
};

// Global nesneye tanımla (importScripts için erişilebilir kılmak üzere)
globalThis.PV_ApiClient = (function () {
  
  /**
   * Benzersiz kullanıcı ID (UUID) üretir ve storage'a kaydeder.
   */
  async function getOrCreateUserId() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userId'], function (result) {
        if (result.userId) {
          resolve(result.userId);
        } else {
          // Yeni UUID oluştur
          let newUuid;
          if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            newUuid = crypto.randomUUID();
          } else {
            // Basit UUID v4 fallback
            newUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
              var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
              return v.toString(16);
            });
          }
          chrome.storage.local.set({ userId: newUuid }, function () {
            resolve(newUuid);
          });
        }
      });
    });
  }

  /**
   * Web Crypto API kullanarak HMAC SHA-256 imzası üretir.
   */
  async function computeHMAC(message, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(message);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      messageData
    );
    
    return Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * GAS Web App API'sine imzalı istek gönderir.
   */
  async function makeRequest(action, data) {
    // Güncel API URL ve Secret'ı yükle
    const config = await getEffectiveConfig();
    if (!config.apiUrl) {
      return { success: false, message: "Google Apps Script API URL'si tanımlanmamış." };
    }

    const timestamp = Date.now();
    const dataStr = JSON.stringify(data);
    const signature = await computeHMAC(timestamp + "." + dataStr, config.apiSecret);

    const payload = {
      timestamp: timestamp,
      signature: signature,
      action: action,
      data: data
    };

    try {
      const response = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // GAS Web App CORS sorunlarını önlemek için text/plain önerilir
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP Hata! Durum: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("[PV-ApiClient] İstek hatası:", error);
      return { success: false, message: "Sunucu bağlantı hatası: " + error.message };
    }
  }

  /**
   * Storage ve varsayılan config değerlerini birleştirir
   */
  function getEffectiveConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['customApiUrl', 'customApiSecret'], function (result) {
        resolve({
          apiUrl: result.customApiUrl || PV_CONFIG.apiUrl,
          apiSecret: result.customApiSecret || PV_CONFIG.apiSecret
        });
      });
    });
  }

  /**
   * Yeni ücretsiz kullanıcı kaydı (/register)
   */
  async function registerUser(email = "") {
    const userId = await getOrCreateUserId();
    const response = await makeRequest('register', { userId, email });
    if (response.success && response.data) {
      await saveLicenseState(response.data);
    }
    return response;
  }

  /**
   * Lisans anahtarı aktivasyonu (/activate-license)
   */
  async function activateLicense(licenseKey, email) {
    const userId = await getOrCreateUserId();
    const response = await makeRequest('activate-license', { userId, licenseKey, email });
    if (response.success && response.data) {
      // Aktivasyon sonrası hemen eklenti lisans durumunu güncelle
      await saveLicenseState(response.data);
    }
    return response;
  }

  /**
   * Lisans geçerlilik durumunu sorgular (/check-license)
   */
  async function checkLicense(passedEmail = null) {
    const userId = await getOrCreateUserId();
    let email = passedEmail;
    if (!email) {
      const syncData = await new Promise((r) => chrome.storage.local.get({ googleSyncEmail: "" }, r));
      email = syncData.googleSyncEmail || "";
    }
    const response = await makeRequest('check-license', { userId, email });
    if (response.success && response.data) {
      await saveLicenseState(response.data);
    }
    return response;
  }

  /**
   * Ücretsiz kullanıcının günlük kullanım sayısını senkronize eder (/sync-usage)
   */
  async function syncUsage(count) {
    const userId = await getOrCreateUserId();
    const response = await makeRequest('sync-usage', { userId, count });
    if (response.success && response.data) {
      await saveLicenseState(response.data);
    }
    return response;
  }

  /**
   * Lisans durumunu yerel storage'a kaydeder.
   */
  async function saveLicenseState(licenseData) {
    return new Promise((resolve) => {
      // Sunucudan isPremium flag'i gelmezse licenseType + status'tan hesapla (geriye dönük uyumluluk)
      const isPremiumFromServer = typeof licenseData.isPremium !== 'undefined'
        ? licenseData.isPremium
        : (licenseData.licenseType !== 'FREE' && licenseData.status === 'ACTIVE');

      chrome.storage.local.get({ googleSyncEmail: '', googleSyncEnabled: false }, (currentData) => {
        const updateData = {
          licenseType:       licenseData.licenseType || 'FREE',
          licenseStatus:     licenseData.status || 'FREE_USER',
          licenseExpiration: licenseData.expirationDate || '',
          dailyUsage:        typeof licenseData.dailyUsage !== 'undefined' ? licenseData.dailyUsage : 0,
          lastLicenseCheck:  Date.now(),
          isPremium:         isPremiumFromServer
        };

        // Eğer kullanıcı Premium olduysa ve e-postası zaten bağlıysa senkronizasyonu otomatik AKTİF yap
        if (isPremiumFromServer && currentData.googleSyncEmail) {
          updateData.googleSyncEnabled = true;
        }

        chrome.storage.local.set(updateData, resolve);
      });
    });
  }

  // Dışa açılan metotlar
  return {
    getOrCreateUserId,
    computeHMAC,
    registerUser,
    activateLicense,
    checkLicense,
    syncUsage,
    getEffectiveConfig
  };

})();
