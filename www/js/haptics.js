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

    async light() {
        return this.tap();
    },

    async selection() {
        return this.flip();
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
    // Crisp, light positive double-pulse (tık-tık)
    async success() {
        if (!this.isEnabled) return;
        try {
            if (window.Capacitor?.isPluginAvailable?.('Haptics') && window.Capacitor?.Plugins?.Haptics) {
                await window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
                setTimeout(async () => {
                    try {
                        await window.Capacitor.Plugins.Haptics.impact({ style: 'MEDIUM' });
                    } catch (e) {}
                }, 75);
                return;
            }
        } catch (e) {}
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([25, 40, 35]); } catch (e) {}
        }
    },

    // Error / Warning (incorrect answer in game, forgotten card)
    // Heavy, forceful double warning buzz (bzz-bzz)
    async error() {
        if (!this.isEnabled) return;
        try {
            if (window.Capacitor?.isPluginAvailable?.('Haptics') && window.Capacitor?.Plugins?.Haptics) {
                await window.Capacitor.Plugins.Haptics.impact({ style: 'HEAVY' });
                setTimeout(async () => {
                    try {
                        await window.Capacitor.Plugins.Haptics.impact({ style: 'HEAVY' });
                    } catch (e) {}
                }, 90);
                return;
            }
        } catch (e) {}
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([80, 50, 95]); } catch (e) {}
        }
    },

    // Celebration pattern (achievement unlock, perfect score)
    async celebrate() {
        if (!this.isEnabled) return;
        try {
            if (window.Capacitor?.isPluginAvailable?.('Haptics') && window.Capacitor?.Plugins?.Haptics) {
                await window.Capacitor.Plugins.Haptics.impact({ style: 'MEDIUM' });
                setTimeout(async () => {
                    try {
                        await window.Capacitor.Plugins.Haptics.impact({ style: 'LIGHT' });
                        setTimeout(async () => {
                            try {
                                await window.Capacitor.Plugins.Haptics.impact({ style: 'HEAVY' });
                            } catch (e) {}
                        }, 80);
                    } catch (e) {}
                }, 80);
                return;
            }
        } catch (e) {}
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([35, 40, 35, 50, 75]); } catch (e) {}
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
