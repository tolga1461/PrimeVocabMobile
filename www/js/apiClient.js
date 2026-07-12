/**
 * PrimeVocab - API İstemcisi (apiClient.js)
 * Hem background.js (Service Worker) hem de sidepanel (panel_settings.js vb.) içinden çağrılabilir.
 */

// Varsayılan Yapılandırma (Build veya Ayarlar panelinden ezilebilir)
var PV_CONFIG = {
  // Canlı GAS Web App URL'nizi buraya yerleştirin
  apiUrl: "https://script.google.com/macros/s/AKfycbxntJIpoQjdyPNI_Z9n6EhvQBCknbwpSg86WZ_qHGww236z73fAHN1ObJahVIV_ziVzmg/exec"
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
    // Güncel API URL'sini yükle
    const config = await getEffectiveConfig();
    if (!config.apiUrl) {
      return { success: false, message: "Google Apps Script API URL'si tanımlanmamış." };
    }

    // Google Auth Access Token'ı sessizce al
    let accessToken = "";
    const getAuthTokenFn = globalThis.getGoogleAuthToken || (typeof getGoogleAuthToken === 'function' ? getGoogleAuthToken : null);
    if (getAuthTokenFn) {
      try {
        accessToken = await getAuthTokenFn(false);
      } catch (err) {
        console.warn("[PV-ApiClient] OAuth Access Token alınamadı (istek:", action, "):", err.message);
      }
    }

    const payload = {
      action: action,
      data: data
    };

    if (accessToken) {
      payload.accessToken = accessToken;
    }

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
    const platform = 'mobile';
    const response = await makeRequest('register', { userId, email, platform });
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
    const platform = 'mobile';
    const response = await makeRequest('check-license', { userId, email, platform });
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
    const platform = 'mobile';
    const response = await makeRequest('sync-usage', { userId, count, platform });
    if (response.success && response.data) {
      await saveLicenseState(response.data);
    }
    return response;
  }

  /**
   * Lisans durumunu yerel storage'a kaydeder.
   */
  async function saveLicenseState(licenseData) {
    const userId = await getOrCreateUserId();
    // Sunucudan isPremium flag'i gelmezse licenseType + status'tan hesapla (geriye dönük uyumluluk)
    const isPremiumFromServer = typeof licenseData.isPremium !== 'undefined'
      ? licenseData.isPremium
      : (licenseData.licenseType !== 'FREE' && licenseData.status === 'ACTIVE');

    const updateData = {
      licenseType:       licenseData.licenseType || 'FREE',
      licenseStatus:     licenseData.status || 'FREE_USER',
      licenseExpiration: licenseData.expirationDate || '',
      dailyUsage:        typeof licenseData.dailyUsage !== 'undefined' ? licenseData.dailyUsage : 0,
      lastLicenseCheck:  Date.now(),
      isPremium:         isPremiumFromServer
    };

    // Güvenli yerel bütünlük imzası oluştur
    const salt = "PV_LOCAL_INTEGRITY_SALT_2026";
    const message = [updateData.isPremium, updateData.licenseType, updateData.licenseStatus, updateData.licenseExpiration, userId].join('|');
    updateData.licenseSignature = await computeHMAC(message, salt);

    return new Promise((resolve) => {
      chrome.storage.local.get({ googleSyncEmail: '', googleSyncEnabled: false }, (currentData) => {
        // Eğer kullanıcı Premium olduysa ve e-postası zaten bağlıysa senkronizasyonu otomatik AKTİF yap
        if (isPremiumFromServer && currentData.googleSyncEmail) {
          updateData.googleSyncEnabled = true;
        }

        chrome.storage.local.set(updateData, resolve);
      });
    });
  }

  /**
   * Yerelde saklanan lisansın imza bütünlüğünü doğrular.
   */
  async function verifyLicenseState() {
    try {
      const userId = await getOrCreateUserId();
      return new Promise((resolve) => {
        chrome.storage.local.get(['isPremium', 'licenseType', 'licenseStatus', 'licenseExpiration', 'licenseSignature'], async (data) => {
          try {
            const isPremium = data.isPremium === true;
            const licenseType = data.licenseType || 'FREE';
            const licenseStatus = data.licenseStatus || 'FREE_USER';
            const licenseExpiration = data.licenseExpiration || '';
            const signature = data.licenseSignature || '';

            // Eğer imza yoksa ama premium özellikleri aktifse bütünlük bozulmuştur (Bypass girişimi).
            if (!signature) {
              if (isPremium || licenseType !== 'FREE') {
                resolve(false);
              } else {
                resolve(true); // Eşleşen bir premium yoksa ve imza boşsa FREE kullanıcı için normaldir.
              }
              return;
            }

            // Bütünlüğü doğrulamak için imzayı yeniden hesapla
            const salt = "PV_LOCAL_INTEGRITY_SALT_2026";
            const message = [isPremium, licenseType, licenseStatus, licenseExpiration, userId].join('|');
            const computed = await computeHMAC(message, salt);

            resolve(computed === signature);
          } catch (innerErr) {
            console.error("[PV-Security] error during verifyLicenseState callback:", innerErr);
            resolve(false); // Fallback to false rather than hanging
          }
        });
      });
    } catch (outerErr) {
      console.error("[PV-Security] error during verifyLicenseState outer execution:", outerErr);
      return false; // Fallback to false rather than throwing/hanging
    }
  }

  /**
   * Lisans bütünlüğü bozulduğunda durumu FREE olarak sıfırlar.
   */
  async function enforceLicenseIntegrity() {
    const isValid = await verifyLicenseState();
    if (!isValid) {
      console.warn("[PV-Security] Yerel lisans bütünlüğü bozuldu! Lisans sıfırlanıyor...");
      await new Promise((resolve) => {
        chrome.storage.local.set({
          isPremium: false,
          licenseType: 'FREE',
          licenseStatus: 'FREE_USER',
          licenseExpiration: '',
          licenseSignature: ''
        }, resolve);
      });
      // Eğer forceLogoutWithoutConfirm tanımlıysa çağır
      if (typeof globalThis.forceLogoutWithoutConfirm === 'function') {
        await globalThis.forceLogoutWithoutConfirm();
      } else if (typeof forceLogoutWithoutConfirm === 'function') {
        await forceLogoutWithoutConfirm();
      }
      return false;
    }
    return true;
  }

  // Dışa açılan metotlar
  return {
    getOrCreateUserId,
    computeHMAC,
    registerUser,
    activateLicense,
    checkLicense,
    syncUsage,
    getEffectiveConfig,
    verifyLicenseState,
    enforceLicenseIntegrity
  };

})();
