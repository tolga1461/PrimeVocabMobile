// ── PrimeVocab Mobile Haptics Service ──
// Provides tactile haptic feedback with native Capacitor Haptics support
// and graceful Web Vibration API fallback.

const HapticsService = {
    isEnabled: true,

    init() {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
                chrome.storage.sync.get({ settings: { hapticsEnabled: true } }, ({ settings }) => {
                    this.isEnabled = (settings && typeof settings.hapticsEnabled !== 'undefined')
                        ? settings.hapticsEnabled
                        : true;
                });
            }
        } catch (e) {
            this.isEnabled = true;
        }
    },

    setEnabled(val) {
        this.isEnabled = !!val;
    },

    // Light tap (e.g. card flip, button click, selection)
    async tap() {
        if (!this.isEnabled) return;
        try {
            if (window.Capacitor?.isPluginAvailable?.('Haptics') && window.Capacitor?.Plugins?.Haptics) {
                await window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
                return;
            }
        } catch (e) {}
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate(12); } catch (e) {}
        }
    },

    // Micro selection tap (card flip, toggle)
    async flip() {
        if (!this.isEnabled) return;
        try {
            if (window.Capacitor?.isPluginAvailable?.('Haptics') && window.Capacitor?.Plugins?.Haptics) {
                await window.Capacitor.Plugins.Haptics.selectionStart();
                await window.Capacitor.Plugins.Haptics.selectionEnd();
                return;
            }
        } catch (e) {}
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate(10); } catch (e) {}
        }
    },

    // Success confirmation (correct answer in game, remembered card)
    async success() {
        if (!this.isEnabled) return;
        try {
            if (window.Capacitor?.isPluginAvailable?.('Haptics') && window.Capacitor?.Plugins?.Haptics) {
                await window.Capacitor.Plugins.Haptics.notification({ type: 'SUCCESS' });
                return;
            }
        } catch (e) {}
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([18, 40, 22]); } catch (e) {}
        }
    },

    // Error / Warning (incorrect answer in game)
    async error() {
        if (!this.isEnabled) return;
        try {
            if (window.Capacitor?.isPluginAvailable?.('Haptics') && window.Capacitor?.Plugins?.Haptics) {
                await window.Capacitor.Plugins.Haptics.notification({ type: 'ERROR' });
                return;
            }
        } catch (e) {}
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([45, 35, 45]); } catch (e) {}
        }
    },

    // Celebration pattern (achievement unlock, perfect score)
    async celebrate() {
        if (!this.isEnabled) return;
        try {
            if (window.Capacitor?.isPluginAvailable?.('Haptics') && window.Capacitor?.Plugins?.Haptics) {
                await window.Capacitor.Plugins.Haptics.notification({ type: 'SUCCESS' });
                setTimeout(() => {
                    try { window.Capacitor.Plugins.Haptics.impact({ style: 'HEAVY' }); } catch(e){}
                }, 140);
                return;
            }
        } catch (e) {}
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([30, 40, 30, 50, 60]); } catch (e) {}
        }
    }
};

if (typeof window !== 'undefined') {
    window.HapticsService = HapticsService;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => HapticsService.init());
    } else {
        HapticsService.init();
    }
}
