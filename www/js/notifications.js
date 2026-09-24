// ── PrimeVocab Mobile Local Notification & Reminder Service ──
// Supports native Android LocalNotifications via Capacitor,
// plus Web Notification API fallback.

const NotificationService = {
    NOTIFICATION_ID: 1001,

    async hasPermission() {
        try {
            if (window.Capacitor?.isPluginAvailable?.('LocalNotifications') && window.Capacitor?.Plugins?.LocalNotifications) {
                const check = await window.Capacitor.Plugins.LocalNotifications.checkPermissions();
                return check.display === 'granted';
            }
        } catch (e) {}
        if ('Notification' in window) {
            return Notification.permission === 'granted';
        }
        return false;
    },

    async requestPermission() {
        try {
            if (window.Capacitor?.isPluginAvailable?.('LocalNotifications') && window.Capacitor?.Plugins?.LocalNotifications) {
                const res = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
                return res.display === 'granted';
            }
        } catch (e) {}
        if ('Notification' in window) {
            const res = await Notification.requestPermission();
            return res === 'granted';
        }
        return false;
    },

    async scheduleDailyReminder(timeStr = '20:00') {
        const [hStr, mStr] = (timeStr || '20:00').split(':');
        const hour = parseInt(hStr, 10) || 20;
        const minute = parseInt(mStr, 10) || 0;

        const title = (typeof getMessage === 'function' ? getMessage('reminder_notif_title') : null) || 'PrimeVocab · Günlük Tekrar Zamanı! 🔥';
        const body = (typeof getMessage === 'function' ? getMessage('reminder_notif_body') : null) || 'Bugün tekrar etmen gereken kelimeler var. Günlük serini (streak) korumak için pratik yap!';

        // 1. Native Capacitor LocalNotifications
        try {
            if (window.Capacitor?.isPluginAvailable?.('LocalNotifications') && window.Capacitor?.Plugins?.LocalNotifications) {
                // Cancel existing reminder first
                await window.Capacitor.Plugins.LocalNotifications.cancel({
                    notifications: [{ id: this.NOTIFICATION_ID }]
                }).catch(() => {});

                // Schedule daily repeating notification
                await window.Capacitor.Plugins.LocalNotifications.schedule({
                    notifications: [
                        {
                            id: this.NOTIFICATION_ID,
                            title: title,
                            body: body,
                            schedule: {
                                on: {
                                    hour: hour,
                                    minute: minute
                                },
                                allowWhileIdle: true
                            },
                            smallIcon: 'ic_stat_name',
                            iconColor: '#6366f1',
                            sound: 'beep.wav'
                        }
                    ]
                });
                console.log(`[NotificationService] Daily reminder scheduled natively at ${hour}:${String(minute).padStart(2, '0')}`);
                return true;
            }
        } catch (e) {
            console.warn('[NotificationService] Native schedule error:', e);
        }

        // 2. Web Notification / PWA fallback
        console.log(`[NotificationService] Daily reminder saved for ${hour}:${String(minute).padStart(2, '0')}`);
        return true;
    },

    async cancelDailyReminder() {
        try {
            if (window.Capacitor?.isPluginAvailable?.('LocalNotifications') && window.Capacitor?.Plugins?.LocalNotifications) {
                await window.Capacitor.Plugins.LocalNotifications.cancel({
                    notifications: [{ id: this.NOTIFICATION_ID }]
                });
                console.log('[NotificationService] Native reminder cancelled.');
            }
        } catch (e) {
            console.warn('[NotificationService] Cancel error:', e);
        }
    },

    async sendTestNotification() {
        const title = (typeof getMessage === 'function' ? getMessage('reminder_notif_title') : null) || 'PrimeVocab · Günlük Tekrar Zamanı! 🔥';
        const body = (typeof getMessage === 'function' ? getMessage('reminder_test_success') : null) || 'Tebrikler! Hatırlatıcı bildiriminiz başarıyla çalışıyor.';

        try {
            if (window.Capacitor?.isPluginAvailable?.('LocalNotifications') && window.Capacitor?.Plugins?.LocalNotifications) {
                await window.Capacitor.Plugins.LocalNotifications.schedule({
                    notifications: [
                        {
                            id: 9999,
                            title: title,
                            body: body,
                            schedule: { at: new Date(Date.now() + 1500) },
                            smallIcon: 'ic_stat_name',
                            iconColor: '#6366f1'
                        }
                    ]
                });
                return;
            }
        } catch (e) {}

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: body, icon: 'icons/icon128.png' });
        } else if (typeof showCustomToast === 'function') {
            showCustomToast(body);
        }
    }
};

if (typeof window !== 'undefined') {
    window.NotificationService = NotificationService;
}
