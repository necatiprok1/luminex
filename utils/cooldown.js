const { EmbedBuilder } = require('discord.js');

/**
 * ⏱️ Luminex Cooldown Sistemi
 * Komut spam önleme
 */

class CooldownManager {
    constructor() {
        // Map<commandName, Map<userId, expirationTimestamp>>
        this.cooldowns = new Map();

        // Varsayılan cooldown süreleri (saniye)
        this.defaults = {
            // Moderasyon - kısa cooldown
            'ban': 5,
            'kick': 5,
            'timeout': 5,
            'sil': 3,
            'nuke': 10,

            // Eğlence - orta cooldown
            'zar': 3,
            'yazı-tura': 3,
            'espri': 5,
            'fıkra': 5,
            'taş-kağıt-makas': 5,

            // Ekonomi - uzun cooldown
            'günlük': 86400, // 24 saat
            'çalış': 1800,   // 30 dakika
            'transfer': 30,

            // Kullanıcı
            'seviye': 10,
            'sıralama': 15,
            'profil': 10,

            // Bot
            'yardım': 5,
            'istatistik': 10,

            // AI
            'ai': 5,

            // Genel varsayılan
            '_default': 3
        };
    }

    /**
     * Cooldown kontrolü yap
     * @returns {number|null} Kalan süre (ms) veya null (cooldown yok)
     */
    check(commandName, userId) {
        if (!this.cooldowns.has(commandName)) {
            this.cooldowns.set(commandName, new Map());
        }

        const timestamps = this.cooldowns.get(commandName);
        const cooldownAmount = (this.defaults[commandName] || this.defaults._default) * 1000;
        const now = Date.now();

        if (timestamps.has(userId)) {
            const expirationTime = timestamps.get(userId) + cooldownAmount;
            if (now < expirationTime) {
                return expirationTime - now; // Kalan süre (ms)
            }
        }

        // Cooldown başlat
        timestamps.set(userId, now);

        // Temizlik: 5 dakika sonra otomatik sil
        setTimeout(() => timestamps.delete(userId), cooldownAmount + 5000);

        return null; // Cooldown yok, geçebilir
    }

    /**
     * Cooldown embed'i oluştur
     */
    getCooldownEmbed(commandName, remainingMs) {
        const seconds = Math.ceil(remainingMs / 1000);

        let timeText;
        if (seconds >= 3600) {
            const hours = Math.floor(seconds / 3600);
            const mins = Math.floor((seconds % 3600) / 60);
            timeText = `${hours} saat ${mins} dakika`;
        } else if (seconds >= 60) {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            timeText = `${mins} dakika ${secs} saniye`;
        } else {
            timeText = `${seconds} saniye`;
        }

        return new EmbedBuilder()
            .setColor('#FEE75C')
            .setTitle('⏱️ Cooldown!')
            .setDescription(`\`/${commandName}\` komutunu tekrar kullanabilmek için **${timeText}** beklemelisin.`)
            .setFooter({ text: 'Spam önleme sistemi aktif' })
            .setTimestamp();
    }

    /**
     * Belirli komut için cooldown süresini ayarla
     */
    setCooldown(commandName, seconds) {
        this.defaults[commandName] = seconds;
    }

    /**
     * Kullanıcının cooldown'ını sıfırla
     */
    reset(commandName, userId) {
        if (this.cooldowns.has(commandName)) {
            this.cooldowns.get(commandName).delete(userId);
        }
    }
}

module.exports = new CooldownManager();
