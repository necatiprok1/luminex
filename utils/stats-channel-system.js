const { ChannelType } = require('discord.js');
const db = require('./mongodb-helper');

/**
 * 📊 Luminex Sunucu İstatistik Kanalları
 * Voice kanallarında üye sayısı, online sayısı, boost sayısı göster
 */

class StatsChannelSystem {
    constructor() {
        this.UPDATE_INTERVAL = 600000; // 10 dakika (rate limit koruma)
    }

    async getSettings(guildId) {
        return {
            enabled: (await db.fetch(`stats_enabled_${guildId}`)) || false,
            categoryId: await db.fetch(`stats_category_${guildId}`),
            channels: (await db.fetch(`stats_channels_${guildId}`)) || {},
        };
    }

    /**
     * İstatistik kanallarını oluştur
     */
    async setup(guild) {
        // Kategori oluştur
        const category = await guild.channels.create({
            name: '📊 Sunucu İstatistikleri',
            type: ChannelType.GuildCategory,
        });

        const memberChannel = await guild.channels.create({
            name: `👥 Üyeler: ${guild.memberCount}`,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [{
                id: guild.roles.everyone.id,
                deny: ['Connect'],
            }],
        });

        const onlineChannel = await guild.channels.create({
            name: `🟢 Çevrimiçi: 0`,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [{
                id: guild.roles.everyone.id,
                deny: ['Connect'],
            }],
        });

        const boostChannel = await guild.channels.create({
            name: `💎 Boost: ${guild.premiumSubscriptionCount || 0}`,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [{
                id: guild.roles.everyone.id,
                deny: ['Connect'],
            }],
        });

        const roleChannel = await guild.channels.create({
            name: `🏷️ Roller: ${guild.roles.cache.size}`,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [{
                id: guild.roles.everyone.id,
                deny: ['Connect'],
            }],
        });

        const channelCountCh = await guild.channels.create({
            name: `📁 Kanallar: ${guild.channels.cache.size}`,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [{
                id: guild.roles.everyone.id,
                deny: ['Connect'],
            }],
        });

        const channelIds = {
            members: memberChannel.id,
            online: onlineChannel.id,
            boosts: boostChannel.id,
            roles: roleChannel.id,
            channels: channelCountCh.id,
        };

        await db.set(`stats_enabled_${guild.id}`, true);
        await db.set(`stats_category_${guild.id}`, category.id);
        await db.set(`stats_channels_${guild.id}`, channelIds);

        return channelIds;
    }

    /**
     * İstatistikleri güncelle
     */
    async update(guild) {
        const settings = await this.getSettings(guild.id);
        if (!settings.enabled) return;

        const channels = settings.channels;

        // Online üye sayısını hesapla
        const members = await guild.members.fetch({ withPresences: true }).catch(() => guild.members.cache);
        const onlineCount = members.filter(m => m.presence?.status && m.presence.status !== 'offline').size;

        const updates = {
            [channels.members]: `👥 Üyeler: ${guild.memberCount}`,
            [channels.online]: `🟢 Çevrimiçi: ${onlineCount}`,
            [channels.boosts]: `💎 Boost: ${guild.premiumSubscriptionCount || 0}`,
            [channels.roles]: `🏷️ Roller: ${guild.roles.cache.size}`,
            [channels.channels]: `📁 Kanallar: ${guild.channels.cache.size}`,
        };

        for (const [channelId, newName] of Object.entries(updates)) {
            if (!channelId) continue;
            try {
                const channel = guild.channels.cache.get(channelId);
                if (channel && channel.name !== newName) {
                    await channel.setName(newName).catch(() => {});
                }
            } catch {}
        }
    }

    /**
     * İstatistik kanallarını kaldır
     */
    async remove(guild) {
        const settings = await this.getSettings(guild.id);
        const channels = settings.channels;

        for (const channelId of Object.values(channels)) {
            try {
                const channel = guild.channels.cache.get(channelId);
                if (channel) await channel.delete('[İstatistik] Sistem kaldırıldı');
            } catch {}
        }

        if (settings.categoryId) {
            try {
                const cat = guild.channels.cache.get(settings.categoryId);
                if (cat) await cat.delete('[İstatistik] Sistem kaldırıldı');
            } catch {}
        }

        await db.delete(`stats_enabled_${guild.id}`);
        await db.delete(`stats_category_${guild.id}`);
        await db.delete(`stats_channels_${guild.id}`);
    }
}

module.exports = new StatsChannelSystem();
