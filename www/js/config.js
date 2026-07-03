// PrimeVocab Mobile PWA Configuration (Global scope)
window.CONFIG = {
    // Replace this with your Google OAuth Client ID for Web Applications from Google Cloud Console.
    // E.g., "1234567890-abc123xyz.apps.googleusercontent.com"
    GOOGLE_CLIENT_ID: "123876704092-eo19nu69jggubqq158s7mkfi5o4n9rtu.apps.googleusercontent.com",
    
    // Authorization Scopes needed for Google Drive appDataFolder access
    GOOGLE_SCOPES: "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    
    // File name used for sync in Drive appDataFolder
    GD_SYNC_FILE_NAME: "primevocab_sync.json"
};
