const { EmbedBuilder } = require('discord.js');
const db = require('./mongodb-helper');

/**
 * 🎂 Luminex Doğum Günü Sistemi
 * Kullanıcıların doğum günlerini takip et ve kutla
 */

class BirthdaySystem {
    constructor() {
        this.BIRTHDAY_EMOJI = '🎂';
    }

    /**
     * Doğum günü kaydet
     */
    async setBirthday(guildId, userId, day, month) {
        const key = `birthday_${guildId}_${userId}`;
        await db.set(key, { day, month, userId });

        // Guild'in tüm doğum günlerini listeye ekle
        const listKey = `birthdays_${guildId}`;
        const list = (await db.fetch(listKey)) || [];
        const existing = list.findIndex(b => b.userId === userId);
        if (existing >= 0) list[existing] = { day, month, userId };
        else list.push({ day, month, userId });
        await db.set(listKey, list);
    }

    /**
     * Doğum gününü sil
     */
    async removeBirthday(guildId, userId) {
        await db.delete(`birthday_${guildId}_${userId}`);
        const listKey = `birthdays_${guildId}`;
        const list = (await db.fetch(listKey)) || [];
        await db.set(listKey, list.filter(b => b.userId !== userId));
    }

    /**
     * Doğum günü kanalı ayarla
     */
    async setChannel(guildId, channelId) {
        await db.set(`birthday_channel_${guildId}`, channelId);
    }

    /**
     * Bugünkü doğum günlerini kontrol et
     */
    async getTodaysBirthdays(guildId) {
        const today = new Date();
        const day = today.getDate();
        const month = today.getMonth() + 1;

        const list = (await db.fetch(`birthdays_${guildId}`)) || [];
        return list.filter(b => b.day === day && b.month === month);
    }

    /**
     * Yaklaşan doğum günleri (30 gün içinde)
     */
    async getUpcoming(guildId) {
        const list = (await db.fetch(`birthdays_${guildId}`)) || [];
        const today = new Date();
        const todayNum = today.getMonth() * 31 + today.getDate();

        return list
            .map(b => {
                const bNum = (b.month - 1) * 31 + b.day;
                let diff = bNum - todayNum;
                if (diff < 0) diff += 365;
                return { ...b, daysUntil: diff };
            })
            .filter(b => b.daysUntil <= 30 && b.daysUntil > 0)
            .sort((a, b) => a.daysUntil - b.daysUntil);
    }

    /**
     * Doğum günü kutlama mesajı gönder
     */
    async celebrate(guild, client) {
        const channelId = await db.fetch(`birthday_channel_${guild.id}`);
        if (!channelId) return;

        const channel = guild.channels.cache.get(channelId);
        if (!channel) return;

        const birthdays = await this.getTodaysBirthdays(guild.id);
        if (birthdays.length === 0) return;

        // Bugün zaten kutlanmış mı?
        const today = new Date().toISOString().split('T')[0];
        const lastCelebration = await db.fetch(`birthday_last_${guild.id}`);
        if (lastCelebration === today) return;

        await db.set(`birthday_last_${guild.id}`, today);

        const mentions = birthdays.map(b => `<@${b.userId}>`).join(', ');

        const messages = [
            `🎉🎂 Mutlu yıllar ${mentions}! 🎂🎉\nBugün senin özel günün! Harika bir yıl geçirmeni diliyoruz! 🥳🎈`,
            `🎊 İyi ki doğdun ${mentions}! 🎊\nYeni yaşın kutlu olsun! Seni çok seviyoruz! 💖🎁`,
            `🥳🎈 Doğum günün kutlu olsun ${mentions}! 🎈🥳\nBu özel gününde tüm dileklerin gerçek olsun! ✨🎂`,
        ];

        const embed = new EmbedBuilder()
            .setTitle('🎂 DOĞUM GÜNÜ KUTLAMASI 🎂')
            .setDescription(messages[Math.floor(Math.random() * messages.length)])
            .setColor('#FF69B4')
            .setImage('https://media.giphy.com/media/WRL7YgP42OKns/giphy.gif')
            .setTimestamp();

        await channel.send({ content: mentions, embeds: [embed] });
    }
}

module.exports = new BirthdaySystem();
