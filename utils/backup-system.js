const { EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const db = require('./mongodb-helper');

/**
 * 💾 Luminex Yedekleme Sistemi
 * Sunucu yapısını (roller, kanallar, ayarlar) yedekle & geri yükle
 */

class BackupSystem {
    /**
     * Yedek oluştur
     */
    async create(guild, creatorId) {
        const backupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

        // Rolleri yedekle
        const roles = guild.roles.cache
            .filter(r => !r.managed && r.id !== guild.roles.everyone.id)
            .sort((a, b) => b.position - a.position)
            .map(r => ({
                name: r.name,
                color: r.hexColor,
                hoist: r.hoist,
                permissions: r.permissions.bitfield.toString(),
                mentionable: r.mentionable,
                position: r.position,
            }));

        // Kanalları yedekle
        const channels = guild.channels.cache
            .filter(c => c.type !== ChannelType.GuildCategory)
            .map(c => ({
                name: c.name,
                type: c.type,
                topic: c.topic || null,
                nsfw: c.nsfw || false,
                rateLimitPerUser: c.rateLimitPerUser || 0,
                parentName: c.parent?.name || null,
                position: c.position,
            }));

        // Kategorileri yedekle
        const categories = guild.channels.cache
            .filter(c => c.type === ChannelType.GuildCategory)
            .map(c => ({
                name: c.name,
                position: c.position,
            }));

        // Emoji yedekle
        const emojis = guild.emojis.cache.map(e => ({
            name: e.name,
            url: e.url,
            animated: e.animated,
        }));

        const backup = {
            id: backupId,
            guildName: guild.name,
            guildIcon: guild.iconURL(),
            createdAt: new Date().toISOString(),
            createdBy: creatorId,
            memberCount: guild.memberCount,
            data: {
                roles,
                channels,
                categories,
                emojis,
                verificationLevel: guild.verificationLevel,
                defaultMessageNotifications: guild.defaultMessageNotifications,
            }
        };

        // Yedekleri kaydet
        await db.set(`backup_${guild.id}_${backupId}`, backup);

        // Yedek listesine ekle
        const list = (await db.fetch(`backup_list_${guild.id}`)) || [];
        list.push({ id: backupId, date: backup.createdAt, creator: creatorId });
        // Maks 5 yedek tut
        if (list.length > 5) list.shift();
        await db.set(`backup_list_${guild.id}`, list);

        return backup;
    }

    /**
     * Yedekleri listele
     */
    async listBackups(guildId) {
        return (await db.fetch(`backup_list_${guildId}`)) || [];
    }

    /**
     * Yedek detaylarını getir
     */
    async getBackup(guildId, backupId) {
        return await db.fetch(`backup_${guildId}_${backupId}`);
    }

    /**
     * Rolleri geri yükle
     */
    async restoreRoles(guild, backup) {
        const restored = [];
        for (const roleData of backup.data.roles.reverse()) {
            try {
                const existing = guild.roles.cache.find(r => r.name === roleData.name);
                if (existing) {
                    restored.push(`♻️ ${roleData.name} (zaten var)`);
                    continue;
                }
                await guild.roles.create({
                    name: roleData.name,
                    color: roleData.color,
                    hoist: roleData.hoist,
                    permissions: BigInt(roleData.permissions),
                    mentionable: roleData.mentionable,
                    reason: '[Yedekleme] Geri yükleme',
                });
                restored.push(`✅ ${roleData.name}`);
            } catch {
                restored.push(`❌ ${roleData.name}`);
            }
        }
        return restored;
    }

    /**
     * Kanalları geri yükle
     */
    async restoreChannels(guild, backup) {
        const restored = [];

        // Önce kategorileri oluştur
        const categoryMap = {};
        for (const catData of backup.data.categories) {
            try {
                const existing = guild.channels.cache.find(c => c.name === catData.name && c.type === ChannelType.GuildCategory);
                if (existing) {
                    categoryMap[catData.name] = existing.id;
                    restored.push(`♻️ 📁 ${catData.name} (zaten var)`);
                    continue;
                }
                const cat = await guild.channels.create({
                    name: catData.name,
                    type: ChannelType.GuildCategory,
                    reason: '[Yedekleme] Geri yükleme',
                });
                categoryMap[catData.name] = cat.id;
                restored.push(`✅ 📁 ${catData.name}`);
            } catch {
                restored.push(`❌ 📁 ${catData.name}`);
            }
        }

        // Sonra kanalları oluştur
        for (const chData of backup.data.channels) {
            try {
                const existing = guild.channels.cache.find(c => c.name === chData.name && c.type === chData.type);
                if (existing) {
                    restored.push(`♻️ #${chData.name} (zaten var)`);
                    continue;
                }
                const options = {
                    name: chData.name,
                    type: chData.type,
                    topic: chData.topic,
                    nsfw: chData.nsfw,
                    rateLimitPerUser: chData.rateLimitPerUser,
                    reason: '[Yedekleme] Geri yükleme',
                };
                if (chData.parentName && categoryMap[chData.parentName]) {
                    options.parent = categoryMap[chData.parentName];
                }
                await guild.channels.create(options);
                restored.push(`✅ #${chData.name}`);
            } catch {
                restored.push(`❌ #${chData.name}`);
            }
        }

        return restored;
    }

    /**
     * Yedek bilgi embed'i
     */
    createBackupEmbed(backup) {
        return new EmbedBuilder()
            .setTitle(`💾 Yedek: ${backup.guildName}`)
            .addFields(
                { name: '🆔 Yedek ID', value: `\`${backup.id}\``, inline: true },
                { name: '📅 Tarih', value: new Date(backup.createdAt).toLocaleString('tr-TR'), inline: true },
                { name: '👥 Üye Sayısı', value: `${backup.memberCount}`, inline: true },
                { name: '🏷️ Roller', value: `${backup.data.roles.length}`, inline: true },
                { name: '📁 Kategoriler', value: `${backup.data.categories.length}`, inline: true },
                { name: '📝 Kanallar', value: `${backup.data.channels.length}`, inline: true },
            )
            .setColor('#2ECC71')
            .setTimestamp();
    }
}

module.exports = new BackupSystem();
