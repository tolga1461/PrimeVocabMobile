/**
 * PrimeVocab - Google Apps Script Lisans & Sunucu Altyapısı
 * 
 * Bu scripti Google E-Tablonuzun "Uzantılar > Apps Script" menüsüne yapıştırın.
 * Ardından "Yeni Dağıtım (New Deployment)" > "Web Uygulaması (Web App)" olarak dağıtın:
 * - Yürüten Kişi (Execute as): Kendiniz (E-tablonun sahibi)
 * - Erişimi olanlar (Who has access): Herkes (Anyone)
 */

// GÜVENLİK AYARI: Eklenti tarafındaki SECRET_KEY ile BİREBİR aynı olmalıdır!
var API_SECRET = "PV_SECRET_SECURE_TOKEN_2026";
var MAX_DEVICES = 3; // Bir lisansın kurulabileceği maksimum cihaz sayısı

// WEBHOOK GÜVENLİK TOKENLARI: Ödeme platformu webhook ayarlarında bu değerleri payload'a ekleyin.
var WEBHOOK_SECRET_LS = "PV_LS_WEBHOOK_SECRET_2026";      // Lemon Squeezy webhook secret
var WEBHOOK_SECRET_SHOPIER = "PV_SHOPIER_WEBHOOK_SECRET_2026"; // Shopier webhook secret

// Tablo Yapılandırması
var SHEET_NAME = "Licenses";

/**
 * POST İsteklerini Karşılayan Ana Fonksiyon
 */
function doPost(e) {
    var lock = LockService.getScriptLock();
    try {
        lock.waitLock(30000);

        if (!e || !e.postData || !e.postData.contents) {
            return jsonResponse(false, "Geçersiz istek gövdesi.");
        }

        var requestData = JSON.parse(e.postData.contents);

        // --- Lemon Squeezy Webhook Otomatik Algılama ---
        // LS kendi formatını gönderir (meta.event_name alanı mevcutsa bu bir LS webhookudur)
        if (requestData.meta && requestData.meta.event_name) {
            var sheet = getOrCreateSheet();
            return handleWebhookLemonSqueezy(sheet, requestData, e);
        }

        // --- Normal Eklenti API İsteği ---
        var timestamp = requestData.timestamp;
        var signature = requestData.signature;
        var action = requestData.action;
        var data = requestData.data || {};

        // 1. HMAC Güvenlik Doğrulaması
        var validation = verifySignature(timestamp, data, signature);
        if (!validation.isValid) {
            return jsonResponse(false, "Güvenlik doğrulaması başarısız: " + validation.message);
        }

        // 2. Tabloyu Hazırla
        var sheet = getOrCreateSheet();

        // 3. Eyleme Göre Yönlendir
        switch (action) {
            case "register":
                return handleRegister(sheet, data);
            case "activate-license":
                return handleActivateLicense(sheet, data);
            case "check-license":
                return handleCheckLicense(sheet, data);
            case "sync-usage":
                return handleSyncUsage(sheet, data);
            case "webhook-shopier":
                return handleWebhookShopier(sheet, data);
            default:
                return jsonResponse(false, "Bilinmeyen eylem (action): " + action);
        }

    } catch (err) {
        return jsonResponse(false, "Sunucu hatası: " + err.toString());
    } finally {
        lock.releaseLock();
    }
}

/**
 * GET İsteklerini Karşılayan Fonksiyon (Test Amaçlı)
 */
function doGet(e) {
    return HtmlService.createHtmlOutput("PrimeVocab GAS API Sunucusu Aktif. Lütfen POST istekleri kullanın.");
}

/**
 * HMAC SHA-256 İmza Doğrulama
 */
function verifySignature(timestamp, dataObj, signature) {
    if (!timestamp || !signature) {
        return { isValid: false, message: "Eksik parametreler (timestamp/signature)." };
    }

    // Replay Attack Koruması: İstek zamanı ile sunucu zamanı arasında en fazla 10 dakika olmalıdır.
    var now = new Date().getTime();
    var diff = Math.abs(now - timestamp);
    if (diff > 10 * 60 * 1000) {
        return { isValid: false, message: "Zaman aşımı (Zaman farkı: " + Math.round(diff / 1000) + "s. Lütfen sistem saatinizi kontrol edin)." };
    }

    // Data objesini JSON stringine dönüştür (sıralı/tutarlı şekilde)
    var dataStr = JSON.stringify(dataObj);
    var signatureBase = timestamp + "." + dataStr;

    // HMAC SHA-256 Hesapla
    var signatureBytes = Utilities.computeHmacSha256Signature(signatureBase, API_SECRET);
    var expectedSignature = signatureBytes.map(function (byte) {
        return ('0' + (byte & 0xFF).toString(16)).slice(-2);
    }).join('');

    if (signature !== expectedSignature) {
        return { isValid: false, message: "Geçersiz imza." };
    }

    return { isValid: true };
}

/**
 * JSON formatında standart yanıt döner
 */
function jsonResponse(success, message, data) {
    var response = {
        success: success,
        message: message,
        data: data || {}
    };
    return ContentService.createTextOutput(JSON.stringify(response))
        .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Sayfayı bulur veya yoksa başlıklarıyla oluşturur
 */
function getOrCreateSheet() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    var headers = [
        "KullaniciID",
        "Eposta",
        "LisansAnahtari",
        "LisansTipi",
        "Durum",
        "BitisTarihi",
        "CihazSayisi",
        "CihazUUIDleri",
        "KayitTarihi",
        "SonIstekTarihi",
        "GunlukKullanimSayisi",
        "SonKullanimTarihi",
        "SonAktifPlatform"
    ];
    if (!sheet) {
        sheet = ss.insertSheet(SHEET_NAME);
        sheet.appendRow(headers);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    } else if (sheet.getLastColumn() === 0) {
        sheet.appendRow(headers);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    }
    return sheet;
}

/**
 * Verilen lisans tipinin tanımlı bir Premium lisans tipi olup olmadığını kontrol eder.
 * Tanımlı Premium Tipler: "MONTHLY", "YEARLY", "LIFETIME"
 * @param {string} licenseType
 * @returns {boolean}
 */
function isPremiumLicenseType(licenseType) {
    if (!licenseType) return false;
    var type = licenseType.toString().toUpperCase().trim();
    return type === "MONTHLY" || type === "YEARLY" || type === "LIFETIME";
}

/**
 * Google Sheets'ten gelen farklı tarih formatlarını güvenli bir şekilde Javascript Date nesnesine dönüştürür.
 * @param {*} val - Tarih hücresinden gelen değer
 * @returns {Date|null}
 */
function parseSheetDate(val) {
    if (!val) return null;

    // 1. Zaten geçerli bir Date nesnesi ise
    if (Object.prototype.toString.call(val) === '[object Date]') {
        if (!isNaN(val.getTime())) {
            return val;
        }
    }

    // 2. Sayı ise (Spreadsheet seri numarası formatı)
    if (typeof val === 'number') {
        var baseDate = new Date(1899, 11, 30);
        return new Date(baseDate.getTime() + val * 24 * 60 * 60 * 1000);
    }

    // 3. String ise temizle ve parse et
    var str = val.toString().trim();
    if (!str) return null;

    var d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d;
    }

    // YYYY-MM-DD veya YYYY-M-D (örn: 2026-07-7T19:29:10.120Z) gibi ISO benzeri ama eksik sıfırlı formatları kontrol et
    var isoLikeRegex = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?)?(?:Z|[+-]\d{2}:?\d{2})?$/;
    var isoMatch = str.match(isoLikeRegex);
    if (isoMatch) {
        var year = parseInt(isoMatch[1], 10);
        var month = parseInt(isoMatch[2], 10) - 1; // JS'de aylar 0-indexed
        var day = parseInt(isoMatch[3], 10);
        var hour = isoMatch[4] ? parseInt(isoMatch[4], 10) : 0;
        var min = isoMatch[5] ? parseInt(isoMatch[5], 10) : 0;
        var sec = isoMatch[6] ? parseInt(isoMatch[6], 10) : 0;
        var ms = isoMatch[7] ? parseInt(isoMatch[7], 10) : 0;

        // Tarayıcı/sunucu saat dilimi uyuşmazlığını önlemek için UTC olarak oluşturabiliriz (sonda Z varsa)
        var parsedDate;
        if (str.endsWith('Z') || str.includes('+') || (str.split('-').length > 3 && str.includes('-'))) {
            parsedDate = new Date(Date.UTC(year, month, day, hour, min, sec, ms));
        } else {
            parsedDate = new Date(year, month, day, hour, min, sec, ms);
        }
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
        }
    }

    // DD.MM.YYYY veya DD/MM/YYYY veya DD-MM-YYYY formatlarını kontrol et (Örn: 05.07.2026 veya 05/07/2026)
    var trDateRegex = /^(\d{1,2})[\.\/-](\d{1,2})[\.\/-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
    var match = str.match(trDateRegex);
    if (match) {
        var day = parseInt(match[1], 10);
        var month = parseInt(match[2], 10) - 1; // JS'de aylar 0'dan başlar
        var year = parseInt(match[3], 10);
        var hour = match[4] ? parseInt(match[4], 10) : 0;
        var min = match[5] ? parseInt(match[5], 10) : 0;
        var sec = match[6] ? parseInt(match[6], 10) : 0;

        var parsedDate = new Date(year, month, day, hour, min, sec);
        if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
        }
    }

    return null;
}

/**
 * Plan tipine göre bitiş tarihini hesaplar
 * @param {string} licenseType - MONTHLY | YEARLY | LIFETIME
 * @returns {string} ISO tarih stringi
 */
function calculateExpirationDate(licenseType) {
    var d = new Date();
    if (licenseType === "MONTHLY") { d.setDate(d.getDate() + 30); return d.toISOString(); }
    if (licenseType === "YEARLY") { d.setDate(d.getDate() + 365); return d.toISOString(); }
    if (licenseType === "LIFETIME") { d.setFullYear(d.getFullYear() + 99); return d.toISOString(); } // 99 yıl (Sınırsız)
    return "";
}

/**
 * E-posta ile Sheets'te satır bul ve güncelle, yoksa yeni satır ekle.
 * Webhook'lardan çağrılır.
 * @param {object} sheet - Google Sheets sheet nesnesi
 * @param {string} email - Müşteri e-postası
 * @param {string} licenseType - MONTHLY | YEARLY | LIFETIME
 * @returns {object} { updated: boolean, expirationDate: string }
 */
function upsertPremiumByEmail(sheet, email, licenseType) {
    var headers = getHeadersMap(sheet);
    var values = sheet.getDataRange().getValues();
    var exp = calculateExpirationDate(licenseType);
    var nowIso = new Date().toISOString();
    var todayStr = nowIso.split("T")[0];

    // Mevcut satır var mı? (e-posta eşleşmesi)
    for (var i = 1; i < values.length; i++) {
        var rowEmail = (values[i][headers.Eposta - 1] || "").toString().toLowerCase().trim();
        if (rowEmail === email.toLowerCase().trim()) {
            sheet.getRange(i + 1, headers.LisansTipi).setValue(licenseType);
            sheet.getRange(i + 1, headers.Durum).setValue("ACTIVE");
            sheet.getRange(i + 1, headers.BitisTarihi).setValue(exp);
            sheet.getRange(i + 1, headers.SonIstekTarihi).setValue(nowIso);
            return { updated: true, expirationDate: exp };
        }
    }

    // Yoksa yeni satır ekle
    var newRow = [];
    newRow[headers.KullaniciID - 1] = "webhook-" + email;
    newRow[headers.Eposta - 1] = email;
    newRow[headers.LisansAnahtari - 1] = "";
    newRow[headers.LisansTipi - 1] = licenseType;
    newRow[headers.Durum - 1] = "ACTIVE";
    newRow[headers.BitisTarihi - 1] = exp;
    newRow[headers.CihazSayisi - 1] = 0;
    newRow[headers.CihazUUIDleri - 1] = "";
    newRow[headers.KayitTarihi - 1] = nowIso;
    newRow[headers.SonIstekTarihi - 1] = nowIso;
    newRow[headers.GunlukKullanimSayisi - 1] = 0;
    newRow[headers.SonKullanimTarihi - 1] = todayStr;
    if (headers.SonAktifPlatform) {
        newRow[headers.SonAktifPlatform - 1] = "webhook";
    }

    var rowData = [];
    for (var k = 0; k < sheet.getLastColumn(); k++) {
        rowData.push(newRow[k] !== undefined ? newRow[k] : "");
    }
    sheet.appendRow(rowData);
    return { updated: false, expirationDate: exp };
}

/**
 * Hücre indekslerini bulmak için yardımcı fonksiyon
 */
function getHeadersMap(sheet) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var map = {};
    for (var i = 0; i < headers.length; i++) {
        map[headers[i]] = i + 1; // 1-indexed for columns
    }
    return map;
}

/**
 * 1. Yeni Kullanıcı Kaydı (/register)
 */
function handleRegister(sheet, data) {
    var userId = data.userId;
    var email = (data.email || "").toLowerCase().trim();

    if (!userId) {
        return jsonResponse(false, "Kullanıcı ID (userId) belirtilmelidir.");
    }

    // E-posta yoksa (Giriş yapmamış GUEST kullanıcı): Tabloya yazma, direkt FREE dön.
    if (!email) {
        return jsonResponse(true, "Misafir kullanıcı (Tabloya yazılmadı).", {
            licenseType: "FREE",
            status: "FREE_USER",
            isPremium: false,
            dailyUsage: 0,
            expirationDate: ""
        });
    }

    var headers = getHeadersMap(sheet);
    var dataRange = sheet.getDataRange();
    var values = dataRange.getValues();
    var nowIso = new Date().toISOString();
    var todayStr = nowIso.split('T')[0];

    // 1. Aşama: Bu e-posta adresine ait bir Premium veya Webhook kaydı var mı?
    var existingEmailRow = -1;
    for (var i = 1; i < values.length; i++) {
        var rowEmail = (values[i][headers.Eposta - 1] || "").toString().toLowerCase().trim();
        if (rowEmail === email) {
            existingEmailRow = i + 1;
            break;
        }
    }

    // 2. Aşama: Cihaz UUID'si (userId) ile kayıtlı bir satır var mı?
    var existingUserRow = -1;
    for (var j = 1; j < values.length; j++) {
        var devicesStr = (values[j][headers.CihazUUIDleri - 1] || "").toString();
        var devices = devicesStr.split(",");
        var rowEmail = (values[j][headers.Eposta - 1] || "").toString().toLowerCase().trim();
        if (devices.indexOf(userId) !== -1 || values[j][headers.KullaniciID - 1] === userId) {
            // Eğer bu satırda zaten başka bir e-posta kayıtlıysa, bu satırı sahiplenme (başka kullanıcının verilerini ezmemek için)
            if (email && rowEmail && rowEmail !== email) {
                continue;
            }
            existingUserRow = j + 1;
            break;
        }
    }

    // --- SENARYO 1: E-posta ile eşleşen bir kayıt zaten var (Örn: Lemon Squeezy webhook ile açıldı) ---
    if (existingEmailRow !== -1) {
        var rowData = values[existingEmailRow - 1];
        var currentDevicesStr = rowData[headers.CihazUUIDleri - 1] || "";
        var currentDevices = currentDevicesStr ? currentDevicesStr.split(",") : [];

        // Cihaz UUID bu kayıtta yoksa ekle
        if (currentDevices.indexOf(userId) === -1) {
            if (currentDevices.length < MAX_DEVICES) {
                currentDevices.push(userId);
                sheet.getRange(existingEmailRow, headers.CihazUUIDleri).setValue(currentDevices.join(","));
                sheet.getRange(existingEmailRow, headers.CihazSayisi).setValue(currentDevices.length);
            }
        }

        // E-posta kaydı KullaniciID'sini de güncelle (Eğer webhook- ile başlıyorsa temizle)
        if (rowData[headers.KullaniciID - 1].indexOf("webhook-") === 0) {
            sheet.getRange(existingEmailRow, headers.KullaniciID).setValue(userId);
        }

        sheet.getRange(existingEmailRow, headers.SonIstekTarihi).setValue(nowIso);
        if (headers.SonAktifPlatform) {
            sheet.getRange(existingEmailRow, headers.SonAktifPlatform).setValue(data.platform || "extension");
        }

        // Eğer eski bir geçici UUID satırı kaldıysa ve bu satırdan farklıysa onu temizle/sil (Çift kayıt olmaması için)
        if (existingUserRow !== -1 && existingUserRow !== existingEmailRow) {
            sheet.deleteRow(existingUserRow);
        }

        var licenseType = rowData[headers.LisansTipi - 1] || "FREE";
        var status = rowData[headers.Durum - 1] || "ACTIVE";
        var expDate = rowData[headers.BitisTarihi - 1];

        // --- OTOMATİK YÜKSELTME: FREE kullanıcının BitisTarihi doldurulmuşsa Premium yap ---
        // Admin tablodan manuel tarih girdiğinde LisansTipi hâlâ FREE kalabilir.
        // Tarih geçerli ve gelecekteyse MONTHLY'e yükselt ve tabloya yaz.
        if (!isPremiumLicenseType(licenseType) && expDate) {
            var parsedExpAuto = parseSheetDate(expDate);
            if (parsedExpAuto && parsedExpAuto.toISOString() > nowIso) {
                sheet.getRange(existingEmailRow, headers.LisansTipi).setValue("MONTHLY");
                sheet.getRange(existingEmailRow, headers.Durum).setValue("ACTIVE");
                licenseType = "MONTHLY";
                status = "ACTIVE";
            }
        }

        // Normalize if not defined
        var normalizedLicenseType = isPremiumLicenseType(licenseType) ? licenseType : "FREE";
        var isPremium = isPremiumLicenseType(licenseType) && status === "ACTIVE";

        var parsedExp = parseSheetDate(expDate);

        return jsonResponse(true, "Giriş yapıldı, lisans birleştirildi.", {
            licenseType: normalizedLicenseType,
            status: isPremium ? status : "FREE_USER",
            isPremium: isPremium,
            isNewRegistration: false,
            dailyUsage: rowData[headers.GunlukKullanimSayisi - 1] || 0,
            expirationDate: (isPremium && parsedExp) ? parsedExp.toISOString() : ""
        });
    }

    // --- SENARYO 2: E-posta kaydı yok ama UUID satırı var (Kullanıcı e-posta bağladı ama henüz ödemesi yok) ---
    if (existingUserRow !== -1) {
        // E-postayı satıra kaydet
        sheet.getRange(existingUserRow, headers.Eposta).setValue(email);
        sheet.getRange(existingUserRow, headers.SonIstekTarihi).setValue(nowIso);
        if (headers.SonAktifPlatform) {
            sheet.getRange(existingUserRow, headers.SonAktifPlatform).setValue(data.platform || "extension");
        }

        var rowData = values[existingUserRow - 1];
        var licenseType = rowData[headers.LisansTipi - 1] || "FREE";
        var status = rowData[headers.Durum - 1] || "ACTIVE";
        var expDate = rowData[headers.BitisTarihi - 1];

        // --- OTOMATİK YÜKSELTME: UUID satırında da BitisTarihi varsa Premium yap ---
        if (!isPremiumLicenseType(licenseType) && expDate) {
            var parsedExpAuto = parseSheetDate(expDate);
            if (parsedExpAuto && parsedExpAuto.toISOString() > nowIso) {
                sheet.getRange(existingUserRow, headers.LisansTipi).setValue("MONTHLY");
                sheet.getRange(existingUserRow, headers.Durum).setValue("ACTIVE");
                licenseType = "MONTHLY";
                status = "ACTIVE";
            }
        }

        // Normalize if not defined
        var normalizedLicenseType = isPremiumLicenseType(licenseType) ? licenseType : "FREE";
        var isPremium = isPremiumLicenseType(licenseType) && status === "ACTIVE";

        var parsedExp = parseSheetDate(expDate);

        return jsonResponse(true, "E-posta bağlandı.", {
            licenseType: normalizedLicenseType,
            status: isPremium ? status : "FREE_USER",
            isPremium: isPremium,
            isNewRegistration: false,
            dailyUsage: rowData[headers.GunlukKullanimSayisi - 1] || 0,
            expirationDate: (isPremium && parsedExp) ? parsedExp.toISOString() : ""
        });
    }

    // --- SENARYO 3: Hem e-posta hem de UUID kaydı yok (Yeni giriş yapan FREE kullanıcı) ---
    var newRow = [];
    newRow[headers.KullaniciID - 1] = userId;
    newRow[headers.Eposta - 1] = email;
    newRow[headers.LisansAnahtari - 1] = "";
    newRow[headers.LisansTipi - 1] = "FREE";
    newRow[headers.Durum - 1] = "ACTIVE";
    newRow[headers.BitisTarihi - 1] = "";
    newRow[headers.CihazSayisi - 1] = 1;
    newRow[headers.CihazUUIDleri - 1] = userId;
    newRow[headers.KayitTarihi - 1] = nowIso;
    newRow[headers.SonIstekTarihi - 1] = nowIso;
    newRow[headers.GunlukKullanimSayisi - 1] = 0;
    newRow[headers.SonKullanimTarihi - 1] = todayStr;
    if (headers.SonAktifPlatform) {
        newRow[headers.SonAktifPlatform - 1] = data.platform || "extension";
    }

    var rowData = [];
    for (var k = 0; k < sheet.getLastColumn(); k++) {
        rowData.push(newRow[k] !== undefined ? newRow[k] : "");
    }
    sheet.appendRow(rowData);

    return jsonResponse(true, "Yeni profil oluşturuldu.", {
        licenseType: "FREE",
        status: "ACTIVE",
        isPremium: false,
        isNewRegistration: true,
        dailyUsage: 0,
        expirationDate: ""
    });
}


/**
 * 2. Lisans Aktivasyonu (/activate-license)
 */
function handleActivateLicense(sheet, data) {
    var userId = data.userId;
    var licenseKey = data.licenseKey;
    var email = data.email;

    if (!userId || !licenseKey || !email) {
        return jsonResponse(false, "Eksik parametre (userId, licenseKey veya email).");
    }

    var headers = getHeadersMap(sheet);
    var values = sheet.getDataRange().getValues();

    // 1. Adım: Lisans anahtarını bul (E-posta kontrolüyle veya sadece lisans koduyla)
    var licenseRow = -1;
    for (var i = 1; i < values.length; i++) {
        var rowLicense = values[i][headers.LisansAnahtari - 1];
        var rowEmail = values[i][headers.Eposta - 1];
        // Satış panelinden üretilen lisanslar için sadece lisans kodu ve eşleşen e-posta aranır
        if (rowLicense === licenseKey && (rowEmail.toLowerCase() === email.toLowerCase() || rowEmail === "")) {
            licenseRow = i + 1;
            break;
        }
    }

    if (licenseRow === -1) {
        return jsonResponse(false, "Geçersiz lisans anahtarı veya e-posta eşleşmesi bulunamadı.");
    }

    var status = values[licenseRow - 1][headers.Durum - 1] || "ACTIVE";
    var licenseType = values[licenseRow - 1][headers.LisansTipi - 1];
    var expirationDate = values[licenseRow - 1][headers.BitisTarihi - 1];
    var deviceCount = parseInt(values[licenseRow - 1][headers.CihazSayisi - 1] || 0);
    var devicesStr = values[licenseRow - 1][headers.CihazUUIDleri - 1] || "";
    var devices = devicesStr ? devicesStr.split(",") : [];

    if (status === "SUSPENDED") {
        return jsonResponse(false, "Bu lisans askıya alınmıştır.");
    }

    // Lisansın süresi dolmuş mu?
    var now = new Date();
    if (expirationDate) {
        var expTime = parseSheetDate(expirationDate);
        if (expTime && now > expTime) {
            sheet.getRange(licenseRow, headers.Durum).setValue("EXPIRED");
            return jsonResponse(false, "Bu lisansın süresi dolmuştur.");
        }
    }

    // Cihaz UUID'sini ekle (zaten kayıtlı değilse)
    if (devices.indexOf(userId) === -1) {
        if (devices.length >= MAX_DEVICES) {
            return jsonResponse(false, "Bu lisans için maksimum cihaz sınırına (" + MAX_DEVICES + ") ulaşıldı.");
        }
        devices.push(userId);
        deviceCount = devices.length;
        sheet.getRange(licenseRow, headers.CihazSayisi).setValue(deviceCount);
        sheet.getRange(licenseRow, headers.CihazUUIDleri).setValue(devices.join(","));
    }

    // Lisans kaydındaki e-posta boşsa doldur
    if (!values[licenseRow - 1][headers.Eposta - 1]) {
        sheet.getRange(licenseRow, headers.Eposta).setValue(email);
    }

    sheet.getRange(licenseRow, headers.Durum).setValue("ACTIVE");
    sheet.getRange(licenseRow, headers.SonIstekTarihi).setValue(new Date().toISOString());
    if (headers.SonAktifPlatform) {
        sheet.getRange(licenseRow, headers.SonAktifPlatform).setValue(data.platform || "extension");
    }

    // Eğer kullanıcının register kaydı ayrı bir satırsa, o satırı güncelle veya temizle.
    // Basitlik açısından, lisans satırına kullanıcının cihaz UUID'sini ekledik. Eklenti artık bu lisans üzerinden sorgulama yapacak.

    var isPremium = isPremiumLicenseType(licenseType);
    var parsedExp = parseSheetDate(expirationDate);
    return jsonResponse(true, "Lisans başarıyla aktif edildi.", {
        licenseType: isPremium ? licenseType : "FREE",
        status: isPremium ? "ACTIVE" : "FREE_USER",
        isPremium: isPremium,
        expirationDate: (isPremium && parsedExp) ? parsedExp.toISOString() : ""
    });
}

/**
 * 3. Lisans Durumu Kontrolü (/check-license)
 */
function handleCheckLicense(sheet, data) {
    var userId = data.userId;
    if (!userId) {
        return jsonResponse(false, "Kullanıcı ID (userId) gereklidir.");
    }

    var headers = getHeadersMap(sheet);
    var values = sheet.getDataRange().getValues();
    var nowIso = new Date().toISOString();

    // Cihaz UUID'leri içinde bu kullanıcının ID'sinin geçtiği aktif bir lisans satırı var mı?
    var foundRow = -1;
    var isPremium = false;
    var email = data.email;

    // 1. Adım: E-posta ile sorgula (Eğer e-posta verilmişse)
    if (email) {
        for (var i = 1; i < values.length; i++) {
            var rowEmail = values[i][headers.Eposta - 1] || "";
            if (rowEmail.toLowerCase() === email.toLowerCase()) {
                var status = values[i][headers.Durum - 1];
                var licenseType = values[i][headers.LisansTipi - 1];
                var expirationDate = values[i][headers.BitisTarihi - 1];

                // Eğer aktif bir premium lisansı varsa öncelikli olarak eşleştir
                if (isPremiumLicenseType(licenseType) && status === "ACTIVE") {
                    if (expirationDate) {
                        var parsedExp = parseSheetDate(expirationDate);
                        if (parsedExp) {
                            var expTime = parsedExp.toISOString();
                            if (nowIso > expTime) {
                                // Süresi dolmuş!
                                sheet.getRange(i + 1, headers.Durum).setValue("EXPIRED");
                                sheet.getRange(i + 1, headers.LisansTipi).setValue("FREE");
                                status = "EXPIRED";
                                licenseType = "FREE";
                            } else {
                                isPremium = true;
                            }
                        }
                    } else {
                        isPremium = true;
                    }

                    if (isPremium) {
                        // Eşleşti! Cihazı otomatik bağla (UUID listesinde yoksa)
                        var devicesStr = values[i][headers.CihazUUIDleri - 1] || "";
                        var devices = devicesStr ? devicesStr.split(",") : [];
                        if (devices.indexOf(userId) === -1) {
                            if (devices.length < MAX_DEVICES) {
                                devices.push(userId);
                                sheet.getRange(i + 1, headers.CihazUUIDleri).setValue(devices.join(","));
                                sheet.getRange(i + 1, headers.CihazSayisi).setValue(devices.length);
                            }
                        }
                        foundRow = i + 1;
                        break;
                    }
                }

                // Premium olmasa bile e-posta eşleştiği için en azından bu satırı bulduk olarak işaretleyelim.
                if (foundRow === -1) {
                    foundRow = i + 1;
                }
            }
        }
    }

    // 2. Adım: E-posta ile eşleşmediyse veya e-posta verilmediyse cihaz UUID'sine göre sorgula
    if (foundRow === -1) {
        for (var i = 1; i < values.length; i++) {
            var devicesStr = values[i][headers.CihazUUIDleri - 1] || "";
            var devices = devicesStr.split(",");

            if (devices.indexOf(userId) !== -1) {
                var rowEmail = (values[i][headers.Eposta - 1] || "").toString().toLowerCase().trim();
                // Eğer istekte e-posta varsa ve bu satırdaki e-posta farklıysa, bu satırı kullanma (farklı kullanıcının lisansını devralmasın)
                if (email && rowEmail && rowEmail !== email.toLowerCase().trim()) {
                    continue;
                }
                var status = values[i][headers.Durum - 1];
                var licenseType = values[i][headers.LisansTipi - 1];
                var expirationDate = values[i][headers.BitisTarihi - 1];

                // Eğer Premium tiplerden biriyse ve aktifse
                if (isPremiumLicenseType(licenseType) && status === "ACTIVE") {
                    if (expirationDate) {
                        var parsedExp = parseSheetDate(expirationDate);
                        if (parsedExp) {
                            var expTime = parsedExp.toISOString();
                            if (nowIso > expTime) {
                                // Süresi dolmuş!
                                sheet.getRange(i + 1, headers.Durum).setValue("EXPIRED");
                                sheet.getRange(i + 1, headers.LisansTipi).setValue("FREE");
                                continue; // Diğer satırlara bak
                            }
                        }
                    }
                    foundRow = i + 1;
                    isPremium = true;
                    break;
                } else if (!isPremiumLicenseType(licenseType)) {
                    foundRow = i + 1;
                }
            }
        }
    }

    if (foundRow !== -1) {
        sheet.getRange(foundRow, headers.SonIstekTarihi).setValue(nowIso);
        if (headers.SonAktifPlatform) {
            sheet.getRange(foundRow, headers.SonAktifPlatform).setValue(data.platform || "extension");
        }
        var rowData = values[foundRow - 1];

        var todayStr = new Date().toISOString().split('T')[0];
        var dailyUsage = rowData[headers.GunlukKullanimSayisi - 1] || 0;
        var lastUsageDate = rowData[headers.SonKullanimTarihi - 1];

        if (lastUsageDate !== todayStr) {
            dailyUsage = 0;
            sheet.getRange(foundRow, headers.GunlukKullanimSayisi).setValue(0);
            sheet.getRange(foundRow, headers.SonKullanimTarihi).setValue(todayStr);
        }

        var rowStatus = rowData[headers.Durum - 1] || "FREE_USER";
        var rowLicenseType = rowData[headers.LisansTipi - 1] || "FREE";
        var currentIsPremium = isPremiumLicenseType(rowLicenseType) && rowStatus === "ACTIVE";

        var parsedExp = parseSheetDate(rowData[headers.BitisTarihi - 1]);
        return jsonResponse(true, "Lisans durumu doğrulandı.", {
            licenseType: currentIsPremium ? rowLicenseType : "FREE",
            status: currentIsPremium ? "ACTIVE" : rowStatus,
            isPremium: currentIsPremium,
            isNewRegistration: false,
            expirationDate: (currentIsPremium && parsedExp) ? parsedExp.toISOString() : "",
            dailyUsage: dailyUsage
        });
    }

    // Hiç kayıt bulunamadı → Tabloya yazma, direkt NOT_FOUND döndür.
    // Kayıt açmak register action'ının işidir, check-license sadece kontrol eder.
    return jsonResponse(true, "Kayıt bulunamadı.", {
        licenseType: "FREE",
        status: "NOT_FOUND",
        isPremium: false,
        isNewRegistration: true,
        expirationDate: "",
        dailyUsage: 0
    });
}

/**
 * 4. Günlük Kullanım Senkronizasyonu (/sync-usage)
 */
function handleSyncUsage(sheet, data) {
    var userId = data.userId;
    var count = parseInt(data.count || 0); // Eklenen kelime/işlem adedi

    if (!userId) {
        return jsonResponse(false, "Kullanıcı ID (userId) gereklidir.");
    }

    var headers = getHeadersMap(sheet);
    var values = sheet.getDataRange().getValues();
    var todayStr = new Date().toISOString().split('T')[0];
    var nowIso = new Date().toISOString();

    var foundRow = -1;
    for (var i = 1; i < values.length; i++) {
        var devicesStr = values[i][headers.CihazUUIDleri - 1] || "";
        var devices = devicesStr.split(",");
        if (devices.indexOf(userId) !== -1) {
            foundRow = i + 1;
            // Aktif premium lisansa sahipse limiti kontrol etmeye gerek yok
            var licenseType = values[i][headers.LisansTipi - 1];
            var status = values[i][headers.Durum - 1];
            if (isPremiumLicenseType(licenseType) && status === "ACTIVE") {
                if (headers.SonAktifPlatform) {
                    sheet.getRange(foundRow, headers.SonAktifPlatform).setValue(data.platform || "extension");
                }
                return jsonResponse(true, "Premium kullanıcı, limitsiz kullanım.", {
                    licenseType: licenseType,
                    status: status,
                    dailyUsage: 0
                });
            }
        }
    }

    if (foundRow === -1) {
        // Giriş yapmamış misafir kullanıcı: Tabloda kaydı yok.
        // Başarılı dön ve gönderdiği sayacı geri ilet. Eklenti yerel olarak limiti izler.
        return jsonResponse(true, "Misafir kullanıcı senkronizasyonu (Tabloya yazılmadı).", {
            licenseType: "FREE",
            status: "FREE_USER",
            dailyUsage: count
        });
    }

    var currentUsage = parseInt(values[foundRow - 1][headers.GunlukKullanimSayisi - 1] || 0);
    var lastUsageDate = values[foundRow - 1][headers.SonKullanimTarihi - 1];

    var newUsage = count; // İstemcinin gönderdiği güncel toplam sayaç
    if (lastUsageDate !== todayStr) {
        // Gün değişmişse sıfırla
        newUsage = count > 0 ? count : 0;
        sheet.getRange(foundRow, headers.SonKullanimTarihi).setValue(todayStr);
    }

    sheet.getRange(foundRow, headers.GunlukKullanimSayisi).setValue(newUsage);
    sheet.getRange(foundRow, headers.SonIstekTarihi).setValue(nowIso);
    if (headers.SonAktifPlatform) {
        sheet.getRange(foundRow, headers.SonAktifPlatform).setValue(data.platform || "extension");
    }

    return jsonResponse(true, "Kullanım senkronize edildi.", {
        licenseType: "FREE",
        status: "FREE_USER",
        dailyUsage: newUsage
    });
}

/**
 * 5. Lemon Squeezy Webhook Handler
 * 
 * Hem tek seferlik satın alma (order_created) hem de
 * AYLIK ABONELİK (subscription_*) event'lerini karşılar.
 * 
 * LS Dashboard Webhook Ayarları:
 *   URL: <GAS_WEB_APP_URL>?secret=PV_LS_WEBHOOK_SECRET_2026
 *   Events: subscription_created, subscription_updated,
 *           subscription_cancelled, subscription_expired, subscription_resumed
 *   (isteğe bağlı: order_created da eklenebilir)
 * 
 * Checkout URL'e eklenen parametreler (eklentiden otomatik eklenir):
 *   checkout[custom][license_type]   = MONTHLY
 *   checkout[email]                  = kullanici@gmail.com
 */
function handleWebhookLemonSqueezy(sheet, lsPayload, e) {
    var meta = lsPayload.meta || {};
    var attributes = (lsPayload.data && lsPayload.data.attributes) || {};
    var customData = meta.custom_data || {};
    var eventName = meta.event_name || "";

    // --- Secret Doğrulaması ---
    // Güvenlik Nedeniyle: Secret sadece Lemon Squeezy panelinde tanımlanan Webhook URL parametresinden (?secret=...) kontrol edilir.
    // Eklenti içindeki JS dosyalarında bu secret tutulmaz, böylece kullanıcılar sahte webhook atamaz.
    var urlSecret = (e && e.parameter && e.parameter.secret) || "";
    if (urlSecret !== WEBHOOK_SECRET_LS) {
        return jsonResponse(false, "Geçersiz webhook secret. Event: " + eventName);
    }

    // --- Müşteri E-postası ---
    var email = (attributes.user_email || attributes.email || "").toLowerCase().trim();
    if (!email) {
        return jsonResponse(false, "Müşteri e-postası bulunamadı. Event: " + eventName);
    }

    // === ABONELİK EVENT'LERİ ===

    // Abonelik başladı, güncellendi, yenilendi veya duraklatmadan geri döndü → Premium yap
    if (eventName === "subscription_created" || eventName === "subscription_updated" || eventName === "subscription_resumed") {
        // Ürün veya Varyant adına göre Lisans Tipini belirle (Aylık / Yıllık / Ömür Boyu)
        var licenseType = determineLicenseType(customData, attributes);

        // renews_at: LS'nin bir sonraki ödeme tarihini verir → bunu bitiş tarihi yap (+3 gün buffer)
        var renewsAt = attributes.renews_at || attributes.trial_ends_at || "";
        var exp;
        if (licenseType === "LIFETIME") {
            // Ömür boyu üyelik için 99 yıl limit
            var lifetimeExp = new Date();
            lifetimeExp.setFullYear(lifetimeExp.getFullYear() + 99);
            exp = lifetimeExp.toISOString();
        } else if (renewsAt) {
            var renewDate = new Date(renewsAt);
            renewDate.setDate(renewDate.getDate() + 3); // 3 günlük buffer (yenileme gecikmelerine karşı)
            exp = renewDate.toISOString();
        } else {
            // Fallback: +32 gün (aylık 31 gün + 1 gün koruma)
            var fallback = new Date();
            fallback.setDate(fallback.getDate() + 32);
            exp = fallback.toISOString();
        }

        var headers = getHeadersMap(sheet);
        var values = sheet.getDataRange().getValues();
        var nowIso = new Date().toISOString();
        var found = false;

        for (var i = 1; i < values.length; i++) {
            var rowEmail = (values[i][headers.Eposta - 1] || "").toString().toLowerCase().trim();
            if (rowEmail === email) {
                sheet.getRange(i + 1, headers.LisansTipi).setValue(licenseType);
                sheet.getRange(i + 1, headers.Durum).setValue("ACTIVE");
                sheet.getRange(i + 1, headers.BitisTarihi).setValue(exp);
                sheet.getRange(i + 1, headers.SonIstekTarihi).setValue(nowIso);
                found = true;
                break;
            }
        }

        if (!found) {
            // Yoksa yeni satır ekle
            var result = upsertPremiumByEmail(sheet, email, licenseType);
            // Bitiş tarihini renews_at ile güncelle
            var values2 = sheet.getDataRange().getValues();
            for (var j = 1; j < values2.length; j++) {
                var re = (values2[j][headers.Eposta - 1] || "").toString().toLowerCase().trim();
                if (re === email) {
                    sheet.getRange(j + 1, headers.BitisTarihi).setValue(exp);
                    break;
                }
            }
        }

        return jsonResponse(true, "Abonelik aktif edildi/yenilendi: " + eventName, {
            isPremium: true,
            email: email,
            licenseType: licenseType,
            expirationDate: exp
        });
    }

    // Abonelik iptal edildi veya sona erdi → EXPIRED yap
    if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
        var headers3 = getHeadersMap(sheet);
        var values3 = sheet.getDataRange().getValues();
        var nowIso3 = new Date().toISOString();

        for (var k = 1; k < values3.length; k++) {
            var rowEmail3 = (values3[k][headers3.Eposta - 1] || "").toString().toLowerCase().trim();
            if (rowEmail3 === email) {
                // İptal durumunda: cari dönem bitmeden erişim devam edebilir.
                // Eğer ends_at varsa onu kullan, yoksa hemen EXPIRED yap.
                var endsAt = attributes.ends_at || "";
                if (endsAt && eventName === "subscription_cancelled") {
                    // Kullanıcı iptal etti ama dönem sonu henüz gelmedi. 3 günlük toleransı koruyoruz.
                    var endDate = new Date(endsAt);
                    endDate.setDate(endDate.getDate() + 3);
                    sheet.getRange(k + 1, headers3.Durum).setValue("ACTIVE"); // Dönem bitene kadar aktif
                    sheet.getRange(k + 1, headers3.BitisTarihi).setValue(endDate.toISOString());
                } else {
                    sheet.getRange(k + 1, headers3.Durum).setValue("EXPIRED");
                    sheet.getRange(k + 1, headers3.LisansTipi).setValue("FREE");
                }
                sheet.getRange(k + 1, headers3.SonIstekTarihi).setValue(nowIso3);
                break;
            }
        }

        return jsonResponse(true, "Abonelik sona erdi: " + eventName, {
            isPremium: false,
            email: email
        });
    }

    // === TEK SEFERLİK SATIN ALMA (order_created) ===
    if (eventName === "order_created") {
        if (attributes.status !== "paid") {
            return jsonResponse(true, "Sipariş henüz tamamlanmadı: " + attributes.status);
        }
        var licenseType = determineLicenseType(customData, attributes);

        var res = upsertPremiumByEmail(sheet, email, licenseType);
        return jsonResponse(true, "Tek seferlik ödeme işlendi.", {
            isPremium: true, email: email, licenseType: licenseType,
            expirationDate: res.expirationDate
        });
    }

    // Diğer event'ler (subscription_paused vb.) — şimdilik yoksay
    return jsonResponse(true, "Event kaydedildi ama işlem yapılmadı: " + eventName);
}

/**
 * Ürün ve Varyant adına göre en doğru lisans tipini belirler.
 * Kullanıcı checkout sayfasında planlar arası geçiş yapabileceği için variant_name/product_name
 * bilgisi custom_data bilgisinden daha önceliklidir.
 */
function determineLicenseType(customData, attributes) {
    var firstItem = attributes.first_order_item || {};
    var variantName = (attributes.variant_name || firstItem.variant_name || "").toString().toUpperCase();
    var productName = (attributes.product_name || firstItem.product_name || "").toString().toUpperCase();

    // 1. Yol: İçerme Kontrolü (Includes)
    if (variantName.indexOf("LIFETIME") !== -1 || variantName.indexOf("ÖMÜR") !== -1 || variantName.indexOf("OMUR") !== -1) return "LIFETIME";
    if (productName.indexOf("LIFETIME") !== -1 || productName.indexOf("ÖMÜR") !== -1 || productName.indexOf("OMUR") !== -1) return "LIFETIME";

    if (variantName.indexOf("YEARLY") !== -1 || variantName.indexOf("YILLIK") !== -1 || variantName.indexOf("ANNUAL") !== -1) return "YEARLY";
    if (productName.indexOf("YEARLY") !== -1 || productName.indexOf("YILLIK") !== -1 || productName.indexOf("ANNUAL") !== -1) return "YEARLY";

    if (variantName.indexOf("MONTHLY") !== -1 || variantName.indexOf("AYLIK") !== -1) return "MONTHLY";
    if (productName.indexOf("MONTHLY") !== -1 || productName.indexOf("AYLIK") !== -1) return "MONTHLY";

    // Fallback: custom_data içindeki kesin plan tipi
    var customType = (customData.license_type || "").toString().toUpperCase().trim();
    if (customType === "MONTHLY" || customType === "YEARLY" || customType === "LIFETIME") {
        return customType;
    }

    return "FREE"; // Tam eşleşme veya anahtar kelime yoksa doğrudan FREE
}

/**
 * 6. Shopier Webhook Handler (/webhook-shopier)
 *
 * Shopier Mağaza Ayarları > Bildirimler bölümüne GAS URL'nizi ekleyin.
 * Shopier'in gönderdiği payload alanları platforma göre değişebilir.
 * Aşağıdaki alan isimleri Shopier'in standart webhook formatına göredir.
 * Ürün ismi üzerinden plan tipi belirlenir; ürün isimlerinizi buna göre ayarlayın.
 * Örnek ürün isimleri: "PrimeVocab 3 Aylık", "PrimeVocab Yıllık"
 */
function handleWebhookShopier(sheet, data) {
    // Secret doğrulama
    if (!data.webhookSecret || data.webhookSecret !== WEBHOOK_SECRET_SHOPIER) {
        return jsonResponse(false, "Geçersiz webhook secret (Shopier).");
    }

    // Shopier farklı alan adları kullanabilir
    var email = (data.buyerEmail || data.buyer_email || data.email || "").toLowerCase().trim();
    if (!email) {
        return jsonResponse(false, "Müşteri e-postası eksik.");
    }

    // Ürün adından plan tipini çıkar
    var productName = (data.productName || data.product_name || data.item_name || "").toLowerCase();
    var licenseType = "MONTHLY"; // Varsayılan
    if (productName.includes("ömür") || productName.includes("omur") || productName.includes("lifetime") || productName.includes("tek")) {
        licenseType = "LIFETIME";
    } else if (productName.includes("yıl") || productName.includes("yil") || productName.includes("annual")) {
        licenseType = "YEARLY";
    }

    var result = upsertPremiumByEmail(sheet, email, licenseType);

    return jsonResponse(true, "Shopier webhook başarıyla işlendi.", {
        isPremium: true,
        email: email,
        licenseType: licenseType,
        expirationDate: result.expirationDate,
        isNewRecord: !result.updated
    });
}
