// PrimeVocab Mobile PWA Configuration (Global scope)
window.CONFIG = {
    // Replace this with your Google OAuth Client ID for Web Applications from Google Cloud Console.
    // E.g., "1234567890-abc123xyz.apps.googleusercontent.com"
    GOOGLE_CLIENT_ID: "", // Let user fill this in for sync
    
    // Authorization Scopes needed for Google Drive appDataFolder access
    GOOGLE_SCOPES: "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
    
    // File name used for sync in Drive appDataFolder
    GD_SYNC_FILE_NAME: "primevocab_sync.json"
};
